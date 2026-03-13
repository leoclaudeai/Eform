/**
 * Run this ONCE locally to get your Google OAuth2 refresh token.
 *
 * Prerequisites:
 *   1. npm install googleapis
 *   2. In Google Cloud Console (console.cloud.google.com):
 *      - Go to your project "e-form-490015"
 *      - APIs & Services → Credentials → + Create Credentials → OAuth 2.0 Client ID
 *      - Application type: Desktop app
 *      - Download the client secret, copy the Client ID and Client Secret below
 *      - Also make sure Drive API is enabled (APIs & Services → Enable APIs)
 *
 * Usage:
 *   node get-token.js
 *
 * Copy the printed refresh_token into your Netlify environment variables
 * as GOOGLE_DRIVE_REFRESH_TOKEN.
 */

const { google } = require('googleapis');
const http = require('http');

// ── Fill these in ──────────────────────────────────────────────────
const CLIENT_ID     = '316975783650-il6q5s3ldfou00pjttvvj7ckfungndig.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
// ──────────────────────────────────────────────────────────────────

const REDIRECT_URI = 'http://localhost:3001/oauth2callback';
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: SCOPES,
});

console.log('\n=== Google OAuth2 Token Generator ===\n');
console.log('1. Open this URL in your browser:\n');
console.log('   ' + authUrl);
console.log('\n2. Sign in with your Google account and allow access.');
console.log('3. You will be redirected back and the refresh token will be printed here.\n');

// Temporary local server to catch the OAuth callback
const server = http.createServer(async (req, res) => {
  const qs = new URL(req.url, 'http://localhost:3001').searchParams;
  const code = qs.get('code');
  if (!code) { res.end('No code received.'); return; }

  res.end('<h2>Done! You can close this tab and check your terminal.</h2>');
  server.close();

  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n✅ SUCCESS! Add this to Netlify environment variables:\n');
    console.log('GOOGLE_DRIVE_CLIENT_ID     =', CLIENT_ID);
    console.log('GOOGLE_DRIVE_CLIENT_SECRET =', CLIENT_SECRET);
    console.log('GOOGLE_DRIVE_REFRESH_TOKEN =', tokens.refresh_token);
    console.log('\nAlso set GOOGLE_DRIVE_FOLDER_ID to a folder in YOUR Google Drive');
    console.log('(share that folder with anyone or keep it private — it is your own storage).\n');
  } catch (err) {
    console.error('Error getting token:', err.message);
  }
});

server.listen(3001, () => {
  console.log('Waiting for OAuth callback on http://localhost:3001 ...\n');
});
