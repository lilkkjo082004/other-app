// Private vault — a PIN-gated space for the user's most private notes and
// letters-to-self. Device-local only: never synced to the server and never sent
// to the AI. The PIN is stored only as a salted SHA-256 hash; entries are kept
// under a separate localStorage key from the main session.
const PIN_KEY = 'other_vault_pin_v1';   // { salt, hash }
const DATA_KEY = 'other_vault_entries_v1';
const SALT_PREFIX = 'other-vault::';

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function vaultExists() {
  try { return !!localStorage.getItem(PIN_KEY); } catch (e) { return false; }
}

export async function setPin(pin) {
  const salt = SALT_PREFIX + Math.floor(performance.now()).toString(36) + (pin.length);
  const hash = await sha256(salt + pin);
  try { localStorage.setItem(PIN_KEY, JSON.stringify({ salt, hash })); } catch (e) { /* ignore */ }
}

export async function verifyPin(pin) {
  let rec = null;
  try { rec = JSON.parse(localStorage.getItem(PIN_KEY)); } catch (e) { /* ignore */ }
  if (!rec) return false;
  return (await sha256(rec.salt + pin)) === rec.hash;
}

export function loadEntries() {
  try { const r = JSON.parse(localStorage.getItem(DATA_KEY)); return Array.isArray(r) ? r : []; }
  catch (e) { return []; }
}
function save(list) { try { localStorage.setItem(DATA_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ } }

export function addEntry(list, text, ts) {
  const t = (text || '').trim();
  if (!t) return list;
  const next = [{ id: 'v' + (ts || 0).toString(36) + list.length, text: t, ts: ts || 0 }, ...list];
  save(next);
  return next;
}
export function removeEntry(list, id) { const next = list.filter((e) => e.id !== id); save(next); return next; }

// Full reset (used if the user forgets their PIN — clears the vault entirely).
export function resetVault() {
  try { localStorage.removeItem(PIN_KEY); localStorage.removeItem(DATA_KEY); } catch (e) { /* ignore */ }
}
