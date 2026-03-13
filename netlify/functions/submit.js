const nodemailer = require('nodemailer');
const { google } = require('googleapis');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { formData, pdfBase64 } = body;

  try {
    // ── 1. Upload PDF to Google Drive (OAuth2 — uses your personal Drive quota) ─
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_DRIVE_CLIENT_ID,
      process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    );
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Service account auth — used only for Google Sheets
    const serviceAccountJson = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const saAuth = new google.auth.GoogleAuth({
      credentials: serviceAccountJson,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth: saAuth });

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const fileName = `FMD_${formData.location || 'Unknown'}_${formData.contractNo || 'NA'}_${formData.inspectionDate || 'NA'}.pdf`
      .replace(/[/\\?%*:|"<>]/g, '-');

    const driveRes = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: 'application/pdf',
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
      },
      media: {
        mimeType: 'application/pdf',
        body: require('stream').Readable.from(pdfBuffer),
      },
      fields: 'id, webViewLink',
    });

    // Make file readable by anyone with the link
    await drive.permissions.create({
      fileId: driveRes.data.id,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    const driveLink = driveRes.data.webViewLink;

    // ── 2. Append row to Google Sheet ──────────────────────────────────────
    const row = [
      new Date().toISOString(),
      formData.inspectionDate || '',
      formData.inspectionTime || '',
      formData.inspectorName || '',
      formData.location || '',
      formData.workNature || '',
      formData.contractNo || '',
      formData.contractor || '',
      formData.nameOfCp || '',
      formData.responsibleManager || '',
      formData.lvBox || '',
      String(formData.noOfFindings || 0),
      driveLink,
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });

    // ── 3. Send email with PDF attached ───────────────────────────────────
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const inspectionDate = formData.inspectionDate || 'N/A';
    const location = formData.location || 'N/A';
    const inspector = formData.inspectorName || 'N/A';
    const contractNo = formData.contractNo || 'N/A';
    const noOfFindings = formData.noOfFindings ?? 0;

    await transporter.sendMail({
      from: `"FMD Inspection System" <${process.env.GMAIL_USER}>`,
      to: 'ron1210@gmail.com',
      subject: `FMD Inspection Record — ${location} ${inspectionDate}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px">
          <div style="background:linear-gradient(135deg,#1a3a6b,#2563eb);padding:24px;border-radius:8px 8px 0 0">
            <h2 style="color:#fff;margin:0">FMD Technical Inspection Record</h2>
            <p style="color:#93c5fd;margin:4px 0 0">設施維修部承辦商合約檢查紀錄</p>
          </div>
          <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:8px;color:#64748b;width:180px">Date of Inspection</td><td style="padding:8px;font-weight:600">${inspectionDate}</td></tr>
              <tr style="background:#f8fafc"><td style="padding:8px;color:#64748b">Inspector</td><td style="padding:8px;font-weight:600">${inspector}</td></tr>
              <tr><td style="padding:8px;color:#64748b">Location</td><td style="padding:8px;font-weight:600">${location}</td></tr>
              <tr style="background:#f8fafc"><td style="padding:8px;color:#64748b">Contract No.</td><td style="padding:8px;font-weight:600">${contractNo}</td></tr>
              <tr><td style="padding:8px;color:#64748b">Work Nature</td><td style="padding:8px;font-weight:600">${formData.workNature || 'N/A'}</td></tr>
              <tr style="background:#f8fafc"><td style="padding:8px;color:#64748b">No. of Findings</td><td style="padding:8px;font-weight:600;color:${noOfFindings > 0 ? '#dc2626' : '#16a34a'}">${noOfFindings}</td></tr>
            </table>
            <div style="margin-top:20px;padding:16px;background:#eff6ff;border-radius:6px;border-left:4px solid #2563eb">
              <p style="margin:0;font-size:13px;color:#1e40af">
                <strong>PDF Report:</strong> Attached to this email<br>
                <strong>Google Drive:</strong> <a href="${driveLink}" style="color:#2563eb">${driveLink}</a>
              </p>
            </div>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: fileName,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, driveLink }),
    };
  } catch (err) {
    console.error('Submit error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
