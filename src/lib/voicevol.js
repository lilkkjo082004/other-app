// Master companion-voice volume (0–1) — a single global control that scales
// ALL spoken output (browser TTS, natural/cloud, and on-device neural), on top
// of any per-companion volume trim. Device-local. Kept in its own tiny module so
// both voice.js and localtts.js can read it without an import cycle.
const KEY = 'other_voice_volume';

export function voiceVolume() {
  try {
    const v = parseFloat(localStorage.getItem(KEY));
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1;
  } catch (e) { return 1; }
}

export function setVoiceVolume(v) {
  const vol = Math.max(0, Math.min(1, Number(v)));
  try { localStorage.setItem(KEY, String(vol)); } catch (e) { /* ignore */ }
  return vol;
}
