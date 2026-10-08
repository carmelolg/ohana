// Ottiene il refresh token Gmail (scope gmail.send) con il flusso OAuth "loopback".
// Uso:  GMAIL_CLIENT_ID=… GMAIL_CLIENT_SECRET=… node scripts/gmail-token.mjs
// Prima: Google Cloud Console → Credenziali → ID client OAuth → tipo «App desktop».
import http from 'node:http';
import { exec } from 'node:child_process';

const id = process.env.GMAIL_CLIENT_ID;
const secret = process.env.GMAIL_CLIENT_SECRET;
if (!id || !secret) {
  console.error('Imposta GMAIL_CLIENT_ID e GMAIL_CLIENT_SECRET');
  process.exit(1);
}
const PORT = 8976;
const redirect = `http://127.0.0.1:${PORT}`;
const state = Math.random().toString(36).slice(2);
const url =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({
    client_id: id,
    redirect_uri: redirect,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.send',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, redirect);
  const code = u.searchParams.get('code');
  if (!code || u.searchParams.get('state') !== state) {
    res.writeHead(400).end('Richiesta non valida');
    return;
  }
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: id,
      client_secret: secret,
      redirect_uri: redirect,
      grant_type: 'authorization_code',
    }),
  });
  const j = await r.json();
  res
    .writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
    .end(j.refresh_token ? 'Fatto! Torna al terminale.' : 'Errore: vedi il terminale.');
  if (j.refresh_token) {
    console.log('\nRefresh token (salvalo come segreto, non committarlo):\n\n' + j.refresh_token + '\n');
    console.log('Poi:  npx wrangler secret put GMAIL_REFRESH_TOKEN');
  } else {
    console.error('Risposta di Google:', j);
  }
  server.close();
});
server.listen(PORT, '127.0.0.1', () => {
  console.log('Apro il browser per autorizzare l’invio di email. Se non si apre, vai su:\n' + url + '\n');
  exec(
    `${process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start ""' : 'xdg-open'} "${url}"`,
  );
});
