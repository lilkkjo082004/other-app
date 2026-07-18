// Pure helpers for companion speech: text cleaning, chunking, and voice
// matching. Deliberately free of any DOM / config / network imports so it can
// be unit-tested in Node and reused by both the browser-TTS and natural-voice
// paths in voice.js.

// Curated ElevenLabs default voices (available on any account), gender-balanced
// so auto-matching by pronouns has real choices. Users pick per companion.
export const NATURAL_VOICE_PRESETS = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', vibe: 'calm · warm', g: 'female' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', vibe: 'soft · gentle', g: 'female' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', vibe: 'bold · confident', g: 'female' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', vibe: 'bright · emotional', g: 'female' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', vibe: 'smooth · easy', g: 'female' },
  { id: 'ThT5KcBeYPX3keUQqHPh', name: 'Dorothy', vibe: 'pleasant · clear', g: 'female' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', vibe: 'easy · friendly', g: 'male' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', vibe: 'deep · steady', g: 'male' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', vibe: 'crisp · grounded', g: 'male' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', vibe: 'low · raspy', g: 'male' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', vibe: 'warm · narrator', g: 'male' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', vibe: 'calm · assured', g: 'male' },
];

const NAT_FEMALE = NATURAL_VOICE_PRESETS.filter((p) => p.g === 'female').map((p) => p.id);
const NAT_MALE = NATURAL_VOICE_PRESETS.filter((p) => p.g === 'male').map((p) => p.id);

// Named tone presets for the browser-voice picker (pitch/rate pairs).
export const VOICE_TONES = [
  { key: 'warm', label: 'Warm', pitch: 1.0, rate: 0.95 },
  { key: 'bright', label: 'Bright', pitch: 1.3, rate: 1.06 },
  { key: 'deep', label: 'Deep', pitch: 0.8, rate: 0.9 },
  { key: 'soft', label: 'Soft', pitch: 1.12, rate: 0.86 },
];

// Warm, expressive defaults for ElevenLabs — a touch of instability + style
// reads more human than the flat, over-stable default.
export const DEFAULT_VOICE_SETTINGS = { stability: 0.4, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true };

// Strip everything that reads badly aloud — action directives, markdown,
// links/URLs, and decorative symbols/emoji — while KEEPING punctuation that
// shapes natural pauses (em dashes, commas, ellipses, quotes).
export function cleanForSpeech(text) {
  if (!text) return '';
  let s = String(text);
  s = s.replace(/\[\[ACTION:[\s\S]*?\]\]/g, ' ');        // machine action directives
  s = s.replace(/```[\s\S]*?```/g, ' ');                 // fenced code
  s = s.replace(/`([^`]*)`/g, '$1');                     // inline code
  s = s.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1');       // [label](url) / ![alt](src) -> label
  s = s.replace(/\bhttps?:\/\/\S+/gi, ' ');              // bare URLs
  s = s.replace(/\bwww\.\S+/gi, ' ');
  s = s.replace(/[*_~>#|]+/g, ' ');                      // md emphasis / heading / table marks
  // Decorative glyphs + emoji. Explicit symbol ranges cover the app's ✦ ♡ ✧ ◈
  // ❖ etc.; Extended_Pictographic covers 🔥🌆😄 and friends. Punctuation in
  // U+2000–U+206F (em dash, curly quotes, ellipsis) is intentionally untouched.
  s = s.replace(/[←-⇿⌀-⏿①-⓿■-◿☀-➿⤴⤵⬀-⯿️‍⃣]/g, ' ');
  try { s = s.replace(/\p{Extended_Pictographic}/gu, ' '); } catch (e) { /* older engine: symbol ranges above still help */ }
  s = s.replace(/\s+([,.!?…;:])/g, '$1');                // no space before punctuation
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// Break long text into sentence-aligned chunks (~max chars). Speaking these as
// separate utterances avoids Chrome's ~15s cutoff and lets the keep-alive tick.
export function chunkForSpeech(text, max = 220) {
  const s = String(text || '').trim();
  if (!s) return [];
  const parts = s.match(/[^.!?…]+[.!?…]*(?:\s+|$)/g) || [s];
  const out = [];
  let cur = '';
  for (const p of parts) {
    if (cur && (cur + p).length > max) { out.push(cur.trim()); cur = p; }
    else cur += p;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// Voice gender inferred from a companion's chosen pronouns (never from a name).
export function voiceGender(comp) {
  const p = (typeof comp === 'string' ? comp : (comp && comp.pronouns) || '').toLowerCase();
  if (/\bshe\b|\bher\b|\bhers\b/.test(p)) return 'female';
  if (/\bhe\b|\bhim\b|\bhis\b/.test(p)) return 'male';
  return 'neutral';
}

// Subtle pitch/rate nudges from a companion's personality so a "calm" one
// speaks a touch slower, a "playful" one a touch quicker/brighter, etc.
export function personalityDelta(comp) {
  const t = (((comp && comp.personality) || '') + ' ' + ((comp && comp.quirk) || '')).toLowerCase();
  let dp = 0, dr = 0;
  if (/\b(calm|gentle|soft|serene|steady|grounded|mellow|tender|quiet)\b/.test(t)) dr -= 0.06;
  if (/\b(playful|witty|bright|bubbly|chaotic|spontaneous|energetic|lively|giddy)\b/.test(t)) { dr += 0.06; dp += 0.03; }
  if (/\b(deep|serious|somber|dark|brooding|stoic|dry)\b/.test(t)) dp -= 0.05;
  if (/\b(warm|nurturing|kind|sweet|caring)\b/.test(t)) dr -= 0.02;
  return { dp, dr };
}

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// Default browser tone (pitch/rate) for a companion that hasn't had a voice
// picked — pronoun-based base, personality nudge, and a small per-companion
// variation so two same-pronoun companions still differ. Device-voice selection
// lives in voice.js (needs the browser's voice list).
export function browserToneFor(comp) {
  const gender = voiceGender(comp);
  const base = gender === 'female' ? { pitch: 1.16, rate: 0.98 }
    : gender === 'male' ? { pitch: 0.86, rate: 0.95 }
      : { pitch: 1.0, rate: 0.96 };
  const { dp, dr } = personalityDelta(comp);
  const idx = typeof comp === 'number' ? comp : (comp && comp.voiceIdx) || 0;
  const vary = ((idx % 3) - 1) * 0.05;
  return { gender, pitch: clamp(base.pitch + dp + vary, 0.6, 1.6), rate: clamp(base.rate + dr, 0.7, 1.2) };
}

// The natural (ElevenLabs) voice id for a companion: an explicit pick if the
// user chose one, otherwise auto-matched from pronouns + varied by voiceIdx.
export function pickNaturalVoiceId(comp) {
  const v = comp && typeof comp === 'object' ? comp.voice : null;
  if (v && v.kind === 'natural' && v.voiceId) return v.voiceId;
  const g = voiceGender(comp);
  const idx = (typeof comp === 'number' ? comp : (comp && comp.voiceIdx)) || 0;
  const pool = g === 'male' ? NAT_MALE : g === 'female' ? NAT_FEMALE : (idx % 2 ? NAT_MALE : NAT_FEMALE);
  return pool[idx % pool.length];
}
