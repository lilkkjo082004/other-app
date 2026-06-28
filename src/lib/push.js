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

// Fire a notification directly from the page via the service worker — no push
// network involved. Isolates "can this browser/OS display a notification at
// all" from "did the push get delivered." Returns true if it was dispatched.
export async function localNotify() {
  if (!pushSupported()) return false;
  if (Notification.permission !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification('Other', {
      body: 'Local test ✦ shown directly by your browser',
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: 'other-local-test',
      data: { url: './' },
    });
    return true;
  } catch (e) { return false; }
}

// Self-diagnostic: ask the server how many subscriptions it holds for this
// account, then fire a real test push. Returns a plain-language verdict so the
// user can confirm check-ins work (and pinpoint the break) without DevTools.
export async function testPush() {
  if (!pushConfigured()) return { ok: false, message: 'Push is not configured.' };
  const headers = { 'content-type': 'application/json', ...authHeader() };
  let status;
  try {
    status = await (await fetch(API_BASE + '/push/status', { headers })).json();
  } catch (e) {
    return { ok: false, message: "Couldn't reach the server. Check your connection and try again." };
  }
  if (!status?.vapidConfigured) return { ok: false, message: 'The server is missing its notification keys. (VAPID not configured.)' };
  if (!status.subscriptions) {
    return { ok: false, message: 'This device isn’t registered for check-ins yet. Turn the toggle off and on again while signed in, then retry.' };
  }
  let res;
  try {
    res = await (await fetch(API_BASE + '/push/test', { method: 'POST', headers })).json();
  } catch (e) {
    return { ok: false, message: "Couldn't reach the server to send the test." };
  }
  const codes = (res?.results || []).map((r) => r.status);
  if (codes.includes(201)) {
    return { ok: true, message: 'Sent! A check-in should appear in a moment. If nothing shows, allow notifications for this site in your browser/OS settings.' };
  }
  if (codes.some((c) => c === 401 || c === 403)) {
    return { ok: false, message: 'The notification keys don’t match (push rejected with ' + codes.join(', ') + '). The VAPID key pair needs to be regenerated.' };
  }
  if (codes.some((c) => c === 404 || c === 410)) {
    return { ok: false, message: 'This subscription expired. Turn check-ins off and on again to re-register.' };
  }
  return { ok: false, message: 'Push service returned ' + (codes.join(', ') || 'no status') + '. Try again shortly.' };
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
