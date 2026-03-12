const { google } = require('googleapis');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const serviceAccountJson = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountJson,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A2:M',  // Skip header row
    });

    const rows = res.data.values || [];

    const inspections = rows.map((row, index) => ({
      id: index + 1,
      submittedAt: row[0] || '',
      inspectionDate: row[1] || '',
      inspectionTime: row[2] || '',
      inspectorName: row[3] || '',
      location: row[4] || '',
      workNature: row[5] || '',
      contractNo: row[6] || '',
      contractor: row[7] || '',
      nameOfCp: row[8] || '',
      responsibleManager: row[9] || '',
      lvBox: row[10] || '',
      noOfFindings: parseInt(row[11] || '0', 10),
      driveLink: row[12] || '',
    }));

    // Most recent first
    inspections.reverse();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inspections),
    };
  } catch (err) {
    console.error('Inspections fetch error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
