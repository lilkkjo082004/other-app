// Google Calendar integration (browser-side OAuth via Google Identity Services).
// When the owner sets VITE_GOOGLE_CLIENT_ID (a Google Cloud OAuth client of
// type "Web application"), users can connect their Google account to:
//   - add companion-created events/reminders straight to their calendar, and
//   - (optionally) let companions see their next few upcoming events, so chat
//     can reference "your dentist appointment tomorrow" naturally.
// Apple Calendar has no public web API — its path is .ics files + the
// backend's webcal:// subscription feed (see server /calendar.ics).
import { GOOGLE_CLIENT_ID } from '../config.js';
import { actionTitle, actionStart } from './actions.js';

const TOK_KEY = 'other_gcal_tok';       // { token, exp } — short-lived access token
const SHARE_KEY = 'other_gcal_share';   // '1' -> companions may see upcoming events
const SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly';

export const googleCalendarConfigured = () => !!GOOGLE_CLIENT_ID;

function readTok() {
  try { const t = JSON.parse(localStorage.getItem(TOK_KEY)); return t && t.exp > Date.now() ? t : null; }
  catch (e) { return null; }
}
export const googleConnected = () => !!readTok() || (() => { try { return localStorage.getItem(TOK_KEY) != null; } catch (e) { return false; } })();
export const googleTokenFresh = () => !!readTok();

export function shareWithCompanions() {
  try { return localStorage.getItem(SHARE_KEY) !== '0'; } catch (e) { return true; }
}
export function setShareWithCompanions(on) {
  try { localStorage.setItem(SHARE_KEY, on ? '1' : '0'); } catch (e) { /* ignore */ }
}

// Load the GIS script once.
let gisReady = null;
function loadGis() {
  if (gisReady) return gisReady;
  gisReady = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { gisReady = null; reject(new Error('Could not load Google sign-in.')); };
    document.head.appendChild(s);
  });
  return gisReady;
}

// Ask Google for an access token. `silent` tries a promptless refresh (for
// background reads); interactive connect must come from a user tap.
function requestToken({ silent = false } = {}) {
  return loadGis().then(() => new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: (res) => {
        if (res && res.access_token) {
          const rec = { token: res.access_token, exp: Date.now() + Math.max(60, (res.expires_in || 3600) - 60) * 1000 };
          try { localStorage.setItem(TOK_KEY, JSON.stringify(rec)); } catch (e) { /* ignore */ }
          resolve(rec.token);
        } else reject(new Error(res?.error || 'No token'));
      },
      error_callback: (err) => reject(new Error(err?.type || 'popup closed')),
    });
    client.requestAccessToken(silent ? { prompt: '' } : {});
  }));
}

export async function connectGoogle() { return requestToken({ silent: false }); }

export function disconnectGoogle() {
  const t = readTok();
  try { if (t && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(t.token, () => {}); } catch (e) { /* ignore */ }
  try { localStorage.removeItem(TOK_KEY); } catch (e) { /* ignore */ }
}

// A usable token: fresh one from storage, else a silent refresh (works while
// the Google session cookie is alive), else null — callers degrade gracefully.
async function getToken() {
  const t = readTok();
  if (t) return t.token;
  if (!googleConnected()) return null;
  try { return await requestToken({ silent: true }); } catch (e) { return null; }
}

const API = 'https://www.googleapis.com/calendar/v3';

// Insert a companion action (calendar event / reminder) into the user's
// primary Google calendar. Throws on failure so the card can show an error.
export async function insertEvent(a) {
  const token = await getToken();
  if (!token) throw new Error('not connected');
  const start = new Date(actionStart(a));
  const end = a.end ? new Date(a.end) : new Date(start.getTime() + (a.type === 'reminder' ? 30 : 60) * 60000);
  const body = {
    summary: actionTitle(a),
    description: a.notes || 'Added by your companion in Other ✦',
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: a.type === 'reminder' ? 0 : 10 }] },
  };
  if (a.location) body.location = a.location;
  const res = await fetch(`${API}/calendars/primary/events`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Google Calendar ${res.status}`);
  return res.json();
}

// The user's next few events (default: 5 over the coming 7 days), shaped for
// the companion prompt. Returns [] when not connected/allowed/reachable.
export async function listUpcoming(days = 7, max = 5) {
  if (!shareWithCompanions()) return [];
  const token = await getToken();
  if (!token) return [];
  try {
    const now = new Date();
    const p = new URLSearchParams({
      timeMin: now.toISOString(),
      timeMax: new Date(now.getTime() + days * 86400000).toISOString(),
      singleEvents: 'true', orderBy: 'startTime', maxResults: String(max),
    });
    const res = await fetch(`${API}/calendars/primary/events?${p}`, { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((ev) => ({
      title: ev.summary || 'Busy',
      when: ev.start?.dateTime || ev.start?.date || '',
      allDay: !ev.start?.dateTime,
    })).filter((e) => e.when);
  } catch (e) { return []; }
}

// Compact human label for a prompt line ("Tue Jul 7, 3:00 PM" / "Wed Jul 8").
export function upcomingLabel(e) {
  try {
    const d = new Date(e.when);
    return e.allDay
      ? d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
      : d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch (err) { return e.when; }
}
