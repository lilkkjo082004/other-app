// Bring-your-own-key (BYOK): let a user run the app fully standalone with their
// own Anthropic API key, with NO dependency on the owner's backend/account.
// The key lives only in this device's localStorage and is sent ONLY to
// api.anthropic.com (never to our servers). When set, it takes precedence over
// the hosted proxy; when cleared, the app falls back to the proxy (if any) or
// offline placeholder replies.
const KEY = 'other_anthropic_key';
const MODEL = 'other_anthropic_model';

export function byokKey() {
  try { return (localStorage.getItem(KEY) || '').trim(); } catch (e) { return ''; }
}
export function hasByok() { return byokKey().length > 0; }

export function setByokKey(k) {
  try {
    const v = (k || '').trim();
    if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY);
  } catch (e) { /* private mode */ }
}

export function byokModel() {
  try { return (localStorage.getItem(MODEL) || '').trim(); } catch (e) { return ''; }
}
export function setByokModel(m) {
  try {
    const v = (m || '').trim();
    if (v) localStorage.setItem(MODEL, v); else localStorage.removeItem(MODEL);
  } catch (e) { /* private mode */ }
}

// Loose sanity check so we can warn on an obviously wrong paste.
export const looksLikeKey = (k) => /^sk-ant-/.test((k || '').trim());
