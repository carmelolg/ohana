import { buildPushPayload, type PushSubscription } from '@block65/webcrypto-web-push';
import type { Env } from './env';

export interface PushMessage {
  title: string;
  body: string;
  url: string;
  tag?: string;
  data?: { doneUrl?: string; snoozeUrl?: string };
}

export class GoneError extends Error {}

export interface PushTarget {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function sendPush(env: Env, sub: PushTarget, msg: PushMessage): Promise<void> {
  const subscription = { endpoint: sub.endpoint, expirationTime: null, keys: sub.keys } as PushSubscription;
  const payload = await buildPushPayload(
    { data: JSON.stringify(msg), options: { ttl: 3600, urgency: 'high' } },
    subscription,
    { subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY },
  );
  const r = await fetch(sub.endpoint, payload as RequestInit);
  if (r.status === 404 || r.status === 410) {
    throw new GoneError(sub.endpoint);
  }
  if (!r.ok) {
    throw new Error(`Push ${r.status}: ${await r.text()}`);
  }
}
