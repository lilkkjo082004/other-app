// Local-first persistence. The whole session is one JSON blob in localStorage,
// so the app resumes straight into chat on the next visit.
const KEY = 'other_session_v1';

export function saveSession(session) {
  try { localStorage.setItem(KEY, JSON.stringify(session)); } catch (e) { /* quota / private mode */ }
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function clearSession() {
  try { localStorage.removeItem(KEY); } catch (e) { /* no-op */ }
}

export function hasSession() {
  try { return localStorage.getItem(KEY) != null; } catch (e) { return false; }
}
