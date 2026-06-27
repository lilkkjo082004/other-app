import { API_BASE, cloudEnabled } from '../config.js';
import { authHeader } from './api.js';

// Web Push (companion check-ins). Requires a configured backend + VAPID public
// key, and the user must be signed in to receive cross-device check-ins.
const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC || '';

export const pushSupported = () =>
  typeof navigator !== 'undefined' && 'serviceWorker' in navigator &&
  typeof window !== 'undefined' && 'PushManager' in window && 'Notification' in window;

export const pushConfigured = () => cloudEnabled() && VAPID_PUBLIC.length > 0;

function urlB64ToUint8Array(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const s = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(s);
  const a = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) a[i] = raw.charCodeAt(i);
  return a;
}

export async function isSubscribed() {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return !!sub;
}

export async function enablePush() {
  if (!pushConfigured()) throw new Error('Push is not configured');
  if (!pushSupported()) throw new Error('This browser does not support notifications');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notifications were blocked');
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC),
  });
  await fetch(API_BASE + '/push/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeader() },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
  return true;
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    try {
      await fetch(API_BASE + '/push/unsubscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authHeader() },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
    } catch (e) { /* best-effort */ }
    await sub.unsubscribe();
  }
  return true;
}
