import { escapeHtml } from '../escape-html';

/** CORS aperto: vale per le risorse pubbliche firmate (feed ICS, link delle email). */
export const PUBLIC_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export const jsonResponse = (body: unknown, status = 200, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

/** Pagina minimale per i link delle email: titolo e corpo sono sempre escapati, il chiamante passa solo HTML fidato come `bodyHtml`. */
export const messagePage = (title: string, bodyHtml: string, status = 200): Response =>
  new Response(
    `<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><body style="margin:0;background:#f6f2eb;font-family:system-ui,sans-serif;color:#26211c;display:grid;place-items:center;min-height:100vh"><main style="max-width:420px;padding:32px;background:#fffdf9;border-radius:16px;margin:16px"><h1 style="margin:0 0 12px;font-size:26px">${escapeHtml(title)}</h1>${bodyHtml}</main></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', ...PUBLIC_CORS } },
  );

export const paragraph = (text: string): string => `<p>${escapeHtml(text)}</p>`;
