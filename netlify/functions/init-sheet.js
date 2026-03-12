// Run this once to add the header row to your Google Sheet.
// Call: GET /.netlify/functions/init-sheet  (only needed the first time)
const { google } = require('googleapis');

exports.handler = async (event) => {
  try {
    const serviceAccountJson = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountJson,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    const headers = [
      'Submitted At', 'Inspection Date', 'Inspection Time', 'Inspector Name',
      'Location', 'Work Nature', 'Contract No.', 'Contractor',
      'Name of CP', 'Responsible Manager', 'LV', 'No. of Findings', 'Drive Link',
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [headers] },
    });

    return { statusCode: 200, body: JSON.stringify({ success: true, message: 'Sheet headers initialised.' }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
