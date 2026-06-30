// Local-first persistence. The whole session is one JSON blob in localStorage,
// so the app resumes straight into chat on the next visit.
const KEY = 'other_session_v1';

// Most browsers cap localStorage near ~5M UTF-16 chars per origin. We warn well
// before that so a long history is never silently lost.
export const STORAGE_SOFT_LIMIT = 4_000_000;

// Returns { ok, bytes }. ok:false means the write failed (quota / private mode),
// so callers can warn the user to export a backup before anything is lost.
export function saveSession(session) {
  try {
    const s = JSON.stringify(session);
    localStorage.setItem(KEY, s);
    return { ok: true, bytes: s.length };
  } catch (e) {
    return { ok: false, bytes: 0, error: e?.name || 'error' };
  }
}

// Approximate size of the stored session, in chars (~bytes for plain text).
export function sessionBytes() {
  try { const s = localStorage.getItem(KEY); return s ? s.length : 0; } catch (e) { return 0; }
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
