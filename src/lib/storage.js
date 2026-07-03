// Local-first persistence. The whole session is one JSON blob in localStorage,
// so the app resumes straight into chat on the next visit.
const KEY = 'other_session_v1';

// Most browsers cap localStorage near ~5M UTF-16 chars per origin. We warn well
// before that so a long history is never silently lost.
export const STORAGE_SOFT_LIMIT = 4_000_000;

// Long histories: once the transcript passes this many messages, the oldest
// overflow is moved into an IndexedDB archive (effectively unlimited) and the
// localStorage blob keeps only the recent window — so the ~5MB localStorage
// ceiling can never be hit by chat history. Archived messages remain on-device
// and are readable via loadArchivedMessages() (export/timeline use).
export const ARCHIVE_THRESHOLD = 600;
export const KEEP_RECENT = 400;

const ADB = 'other-archive', ASTORE = 'messages';
function openArchive() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no idb')); return; }
    const r = indexedDB.open(ADB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(ASTORE)) r.result.createObjectStore(ASTORE, { autoIncrement: true }); };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
// Fire-and-forget append of trimmed-off messages to the archive.
function archiveMessages(msgs) {
  openArchive().then((db) => {
    const t = db.transaction(ASTORE, 'readwrite');
    const st = t.objectStore(ASTORE);
    for (const m of msgs) st.add(m);
  }).catch(() => { /* best-effort — worst case the overflow is simply dropped */ });
}
export async function loadArchivedMessages() {
  try {
    const db = await openArchive();
    return await new Promise((res, rej) => {
      const rq = db.transaction(ASTORE, 'readonly').objectStore(ASTORE).getAll();
      rq.onsuccess = () => res(rq.result || []);
      rq.onerror = () => rej(rq.error);
    });
  } catch (e) { return []; }
}
export async function archivedCount() {
  try {
    const db = await openArchive();
    return await new Promise((res) => {
      const rq = db.transaction(ASTORE, 'readonly').objectStore(ASTORE).count();
      rq.onsuccess = () => res(rq.result || 0);
      rq.onerror = () => res(0);
    });
  } catch (e) { return 0; }
}

// Returns { ok, bytes }. ok:false means the write failed (quota / private mode),
// so callers can warn the user to export a backup before anything is lost.
export function saveSession(session) {
  try {
    let toStore = session;
    const msgs = session?.messages;
    if (Array.isArray(msgs) && msgs.length > ARCHIVE_THRESHOLD) {
      const overflow = msgs.slice(0, msgs.length - KEEP_RECENT);
      archiveMessages(overflow);
      toStore = { ...session, messages: msgs.slice(msgs.length - KEEP_RECENT) };
    }
    const s = JSON.stringify(toStore);
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
