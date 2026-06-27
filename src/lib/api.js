import { API_BASE, cloudEnabled } from '../config.js';

// Thin client for the Other backend (auth, cloud state sync, mood). When no
// backend is configured (VITE_API_BASE empty) the app stays fully local.
const TOKEN_KEY = 'other_token';

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
}
export function setToken(t) {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (e) { /* no-op */ }
}
export function isAuthed() { return cloudEnabled() && !!getToken(); }
export function authHeader() {
  const t = getToken();
  return t ? { authorization: 'Bearer ' + t } : {};
}

async function call(path, { method = 'GET', body } = {}) {
  const res = await fetch(API_BASE + path, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...authHeader() },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `request failed (${res.status})`);
  return data;
}

export async function signup(email, password) {
  const d = await call('/auth/signup', { method: 'POST', body: { email, password } });
  setToken(d.token);
  return d;
}
export async function login(email, password) {
  const d = await call('/auth/login', { method: 'POST', body: { email, password } });
  setToken(d.token);
  return d;
}
export function logout() { setToken(''); }

export async function pullState() {
  const d = await call('/state');
  return d.state;
}
export async function pushState(state) {
  return call('/state', { method: 'PUT', body: { state } });
}

export async function logMood(mood, { score, companionId } = {}) {
  try { await call('/mood', { method: 'POST', body: { mood, score, companionId } }); } catch (e) { /* best-effort */ }
}
export async function moodSummary() {
  return call('/mood/summary');
}
