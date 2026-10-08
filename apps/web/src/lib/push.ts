import { supabase } from './supabase';

const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
export const isStandalone = () =>
  matchMedia('(display-mode: standalone)').matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;
export const pushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function b64ToBytes(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function currentEndpoint(): Promise<string | null> {
  if (!pushSupported()) {
    return null;
  }
  const reg = await navigator.serviceWorker.ready;
  return (await reg.pushManager.getSubscription())?.endpoint ?? null;
}

export async function enablePush(userId: string): Promise<void> {
  if (!vapid) {
    throw new Error('Chiave VAPID mancante (VITE_VAPID_PUBLIC_KEY)');
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    throw new Error('Permesso notifiche negato');
  }
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(vapid) }));
  const json = sub.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      keys: json.keys,
      user_agent: navigator.userAgent.slice(0, 200),
    },
    { onConflict: 'endpoint' },
  );
  if (error) {
    throw error;
  }
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) {
    return;
  }
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}
