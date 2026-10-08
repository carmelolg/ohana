/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// SPA: ogni navigazione serve la shell (funziona offline)
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/api\//] }));

// --- Emergenza: la pagina deve funzionare senza rete. Il service worker tiene una copia aggiornata dei dati:
//  1) la pagina gli invia lo snapshot a ogni lettura/modifica (messaggio) e lui lo conserva nella Cache API;
//  2) le richieste REST di emergency_info passano da NetworkFirst, quindi offline si serve l'ultima risposta buona.
const EMERGENCY_CACHE = 'ohana-emergency-v1';
const EMERGENCY_REST_CACHE = 'ohana-emergency-rest';
registerRoute(
  ({ url }) => url.pathname.endsWith('/rest/v1/emergency_info'),
  new NetworkFirst({ cacheName: EMERGENCY_REST_CACHE, networkTimeoutSeconds: 3 }),
);
self.addEventListener('message', (event) => {
  const d = event.data as { type?: string; snapshot?: unknown } | undefined;
  if (d?.type === 'emergency-cache') {
    event.waitUntil(
      caches
        .open(EMERGENCY_CACHE)
        .then((c) =>
          c.put(
            '/__emergency.json',
            new Response(JSON.stringify(d.snapshot), { headers: { 'Content-Type': 'application/json' } }),
          ),
        ),
    );
  } else if (d?.type === 'emergency-clear') {
    event.waitUntil(Promise.all([caches.delete(EMERGENCY_CACHE), caches.delete(EMERGENCY_REST_CACHE)]));
  }
});

interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  actions?: { action: string; title: string }[];
  data?: { doneUrl?: string; snoozeUrl?: string };
}

self.addEventListener('push', (event) => {
  const p: PushPayload = event.data ? event.data.json() : { title: 'Ohana' };
  event.waitUntil(
    self.registration.showNotification(p.title, {
      body: p.body,
      tag: p.tag,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: p.url ?? '/oggi', ...p.data },
      actions: p.actions ?? [
        { action: 'done', title: 'Fatto' },
        { action: 'snooze', title: 'Rimanda 1 h' },
      ],
    } as NotificationOptions),
  );
});

self.addEventListener('notificationclick', (event) => {
  const n = event.notification;
  n.close();
  const d = n.data as { url: string; doneUrl?: string; snoozeUrl?: string };
  if (event.action === 'done' && d.doneUrl) {
    event.waitUntil(fetch(d.doneUrl, { method: 'POST' }).catch(() => undefined));
    return;
  }
  if (event.action === 'snooze' && d.snoozeUrl) {
    event.waitUntil(fetch(d.snoozeUrl, { method: 'POST' }).catch(() => undefined));
    return;
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          void c.navigate(d.url);
          return c.focus();
        }
      }
      return self.clients.openWindow(d.url);
    }),
  );
});
