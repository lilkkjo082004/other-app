// Companion voice notes — occasionally a companion "records" a short spoken
// message instead of typing. Rendered as a voice-note bubble with a play button
// and waveform; tapping plays it aloud (natural voice when configured, else
// browser TTS). Gating lives here; the content reuses proactiveCompanion.
const DAY = 86400000;

// True at most once every few days, only sometimes, and only once you've spent a
// little time together. Tracked in localStorage so it never floods.
export function voiceNoteDue(now = Date.now()) {
  let last = 0;
  try { last = +(localStorage.getItem('other_voicenote_at') || 0); } catch (e) { /* ignore */ }
  if (now - last < 3 * DAY) return false;   // at most ~once every 3 days
  return Math.random() < 0.5;               // and only sometimes when eligible
}

export function markVoiceNote(now = Date.now()) {
  try { localStorage.setItem('other_voicenote_at', String(now)); } catch (e) { /* ignore */ }
}

// A deterministic little waveform (bar heights 0..1) seeded by the note text, so
// the same note always draws the same shape.
export function waveform(seed = '', n = 28) {
  let h = 0; const s = String(seed) || 'x';
  for (let k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) >>> 0;
  const rnd = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
  return Array.from({ length: n }, (_, i) => {
    // a gentle envelope so it tapers at the ends like a real clip
    const env = Math.sin((i / (n - 1)) * Math.PI);
    return +(0.22 + (0.35 + rnd() * 0.65) * env).toFixed(3);
  });
}
