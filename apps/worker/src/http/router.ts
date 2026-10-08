import { createDb } from '../db';
import type { Env } from '../env';
import { handleAction } from './action';
import { handleFeed, handleSingleEvent } from './ics';
import { PUBLIC_CORS } from './respond';
import { handleScanParse, scanCors } from './scan-parse';

type Match = RegExpExecArray;
type Handler = (req: Request, env: Env, match: Match) => Promise<Response> | Response;
interface Route {
  method: string | null;
  path: RegExp;
  handle: Handler;
}

// L'ordine conta: `/ics/e/...` deve essere provato prima di `/ics/...`.
const ROUTES: Route[] = [
  { method: 'POST', path: /^\/scan\/parse$/, handle: (req, env) => handleScanParse(req, env, createDb(env)) },
  { method: null, path: /^\/health$/, handle: () => new Response('ok') },
  {
    method: 'GET',
    path: /^\/ics\/e\/([\w.-]+)\.ics$/,
    handle: (_r, env, m) => handleSingleEvent(env, createDb(env), m[1]),
  },
  { method: 'GET', path: /^\/ics\/([\w-]+)\.ics$/, handle: (_r, env, m) => handleFeed(createDb(env), m[1]) },
  {
    method: null,
    path: /^\/azione\/([\w.-]+)$/,
    handle: (req, env, m) => handleAction(req, env, createDb(env), m[1]),
  },
];

/** Smista una richiesta HTTP al gestore giusto. */
export async function route(req: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(req.url);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: pathname === '/scan/parse' ? scanCors(env) : PUBLIC_CORS });
  }
  for (const { method, path, handle } of ROUTES) {
    const match = path.exec(pathname);
    if (match && (method === null || method === req.method)) {
      return handle(req, env, match);
    }
  }
  return new Response('Ohana worker', { status: 200 });
}
