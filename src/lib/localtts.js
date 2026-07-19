// On-device neural TTS — free, no server, private. Runs Kokoro-82M (Apache-2.0)
// entirely in the user's browser via kokoro-js / transformers.js, on WebGPU when
// available and WASM otherwise. Far more human than the built-in speechSynthesis.
//
// The ~80MB model is downloaded once on first use and cached by the browser
// (transformers.js uses the Cache Storage API), so later sessions are instant
// and work offline. It's opt-in (a Settings toggle) because of that first
// download. kokoro-js is dynamically imported so it never bloats the main bundle.
import { cleanForSpeech, chunkForSpeech, voiceGender } from './voicetext.js';

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const PREF_KEY = 'other_local_voice';

// Self-hosting: kokoro-js/transformers fetch the model + voice files from the
// Hugging Face CDN. For a commercial deployment we don't want a hard runtime
// dependency on HF's uptime/terms, so we mirror the weights to our own origin
// (scripts/fetch-kokoro.mjs -> public/models/kokoro) and redirect those exact
// requests there. If a mirrored file is missing we fall back to HF so it still
// works in dev before the mirror is populated.
const HF_PREFIX = `https://huggingface.co/${MODEL_ID}/resolve/main/`;
const SELF_HOST = `${(import.meta.env && import.meta.env.BASE_URL) || './'}models/kokoro/`;

// Map a Hugging Face weight URL to our self-hosted mirror (or null if it isn't
// one of ours). Pure + exported so the rewrite is unit-testable.
export function mirrorUrl(url, baseHref) {
  if (typeof url !== 'string' || !url.startsWith(HF_PREFIX)) return null;
  const rel = `${SELF_HOST}${url.slice(HF_PREFIX.length)}`;
  const base = baseHref || (typeof window !== 'undefined' ? window.location.href : 'http://localhost/');
  return new URL(rel, base).href;
}

let fetchPatched = false;
function installSelfHostRedirect() {
  if (fetchPatched || typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  fetchPatched = true;
  const orig = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const local = mirrorUrl(url);
    if (local) {
      try { const res = await orig(local, init); if (res.ok) return res; } catch (e) { /* fall back to HF */ }
      return orig(input, init);
    }
    return orig(input, init);
  };
}

// Curated Kokoro voices for the picker, gender-tagged for auto-matching.
export const LOCAL_VOICE_PRESETS = [
  { id: 'af_heart', name: 'Heart', vibe: 'warm · expressive', g: 'female' },
  { id: 'af_bella', name: 'Bella', vibe: 'bright · lively', g: 'female' },
  { id: 'af_nicole', name: 'Nicole', vibe: 'soft · intimate', g: 'female' },
  { id: 'af_sarah', name: 'Sarah', vibe: 'calm · clear', g: 'female' },
  { id: 'af_sky', name: 'Sky', vibe: 'light · gentle', g: 'female' },
  { id: 'bf_emma', name: 'Emma', vibe: 'British · warm', g: 'female' },
  { id: 'bf_isabella', name: 'Isabella', vibe: 'British · poised', g: 'female' },
  { id: 'am_michael', name: 'Michael', vibe: 'easy · friendly', g: 'male' },
  { id: 'am_adam', name: 'Adam', vibe: 'deep · steady', g: 'male' },
  { id: 'am_eric', name: 'Eric', vibe: 'crisp · grounded', g: 'male' },
  { id: 'bm_george', name: 'George', vibe: 'British · steady', g: 'male' },
  { id: 'bm_lewis', name: 'Lewis', vibe: 'British · low', g: 'male' },
];
const L_FEMALE = LOCAL_VOICE_PRESETS.filter((v) => v.g === 'female').map((v) => v.id);
const L_MALE = LOCAL_VOICE_PRESETS.filter((v) => v.g === 'male').map((v) => v.id);
const VALID = new Set(LOCAL_VOICE_PRESETS.map((v) => v.id));

// The Kokoro voice id for a companion: explicit local pick, else auto-matched
// from pronouns and varied by voiceIdx.
export function localVoiceId(comp) {
  const v = comp && typeof comp === 'object' ? comp.voice : null;
  if (v && v.kind === 'local' && VALID.has(v.voiceId)) return v.voiceId;
  const g = voiceGender(comp);
  const idx = (typeof comp === 'number' ? comp : (comp && comp.voiceIdx)) || 0;
  const pool = g === 'male' ? L_MALE : g === 'female' ? L_FEMALE : (idx % 2 ? L_MALE : L_FEMALE);
  return pool[idx % pool.length];
}

// Opt-in preference (device-local).
export function localVoiceEnabled() {
  try { return localStorage.getItem(PREF_KEY) === '1'; } catch (e) { return false; }
}
export function setLocalVoiceEnabled(on) {
  try { localStorage.setItem(PREF_KEY, on ? '1' : '0'); } catch (e) { /* ignore */ }
  if (!on) stopLocal();
}
export function supportsLocalTts() {
  return typeof window !== 'undefined' && typeof WebAssembly === 'object';
}

let loadState = 'idle';    // idle | loading | ready | error
let loadPct = 0;
let modelPromise = null;
export function localTtsState() { return { state: loadState, pct: loadPct }; }

// Load (and cache) the model once. onProgress(0..100) reports the first download.
export async function warmLocalTts(onProgress) {
  if (modelPromise) return modelPromise;
  loadState = 'loading';
  modelPromise = (async () => {
    installSelfHostRedirect();
    const { KokoroTTS } = await import('kokoro-js');
    // WASM + q8 is universal (no WebGPU needed) and a single ~86MB weight file,
    // which keeps the self-hosted mirror simple.
    const model = await KokoroTTS.from_pretrained(MODEL_ID, {
      dtype: 'q8',
      device: 'wasm',
      progress_callback: (p) => {
        if (p && p.status === 'progress' && typeof p.progress === 'number') {
          loadPct = Math.round(p.progress);
          if (onProgress) onProgress(loadPct);
        }
      },
    });
    loadState = 'ready';
    loadPct = 100;
    return model;
  })().catch((e) => { loadState = 'error'; modelPromise = null; throw e; });
  return modelPromise;
}

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const num = (x, d) => (typeof x === 'number' && Number.isFinite(x) ? x : d);

// Kokoro itself only exposes `voice` + `speed`, so the customization sliders are
// realised with Web Audio on top of the generated PCM: playbackRate shifts pitch
// (with a compensating Kokoro `speed` so tempo stays put), a low/high shelf pair
// tilts the timbre (warm/deep ↔ bright), and a gain sets volume. Pure + exported
// so the mapping is unit-testable.
export function localVoiceParams(voice) {
  const v = voice && voice.kind === 'local' ? voice : {};
  const pitch = clamp(num(v.pitch, 1), 0.7, 1.5);
  const rate = clamp(num(v.rate, 1), 0.6, 1.4);
  const warmth = clamp(num(v.warmth, 0), -1, 1);
  const volume = clamp(num(v.volume, 1), 0, 1);
  return {
    playbackRate: pitch,                    // shifts pitch (and tempo)…
    speed: clamp(rate / pitch, 0.5, 2),     // …compensated so net tempo ≈ rate
    low: warmth * 8,                        // dB low-shelf: + = warmer/deeper
    high: -warmth * 6,                      // dB high-shelf: opposite tilt
    volume,
  };
}

let audioCtx = null;
let chain = null;       // { sources: [], onended }
let speakToken = 0;

function getCtx() {
  if (!audioCtx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; audioCtx = new AC(); }
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

function toBuffer(ctx, raw) {
  const data = raw.audio || raw.data;
  const sr = raw.sampling_rate || raw.samplingRate || 24000;
  const buf = ctx.createBuffer(1, data.length, sr);
  buf.getChannelData(0).set(data);
  return buf;
}

// Speak a companion's line on-device. Generates the whole line (chunked only to
// avoid the model's length cap, then concatenated) so there are NO gaps between
// sentences, and plays it through the pitch/timbre/volume chain. Resolves when
// playback finishes; throws if the model can't load (callers fall back to browser
// speech).
export async function speakLocal(text, comp) {
  const clean = cleanForSpeech(text);
  if (!clean) return;
  const model = await warmLocalTts();
  const voice = localVoiceId(comp);
  const p = localVoiceParams(comp && comp.voice);
  const token = ++speakToken;
  stopLocal(true);
  const ctx = getCtx();
  if (!ctx) return;

  // Synthesize chunk-by-chunk (large chunks — usually one) and concatenate the
  // PCM so the whole line plays as one continuous, gapless buffer.
  const parts = [];
  let sr = 24000;
  for (const chunk of chunkForSpeech(clean, 300)) {
    if (token !== speakToken) return;
    let raw;
    try { raw = await model.generate(chunk, { voice, speed: p.speed }); }
    catch (e) { continue; }
    const data = raw.audio || raw.data;
    if (data && data.length) { parts.push(data); sr = raw.sampling_rate || raw.samplingRate || sr; }
  }
  if (token !== speakToken || !parts.length) return;
  const total = parts.reduce((n, a) => n + a.length, 0);
  const merged = new Float32Array(total);
  let off = 0;
  for (const a of parts) { merged.set(a, off); off += a.length; }

  // Build the effect chain: source → lowshelf → highshelf → gain → out.
  const low = ctx.createBiquadFilter(); low.type = 'lowshelf'; low.frequency.value = 320; low.gain.value = p.low;
  const high = ctx.createBiquadFilter(); high.type = 'highshelf'; high.frequency.value = 3400; high.gain.value = p.high;
  const gain = ctx.createGain(); gain.gain.value = p.volume;
  low.connect(high); high.connect(gain); gain.connect(ctx.destination);
  const src = ctx.createBufferSource();
  src.buffer = toBuffer(ctx, { audio: merged, sampling_rate: sr });
  src.playbackRate.value = p.playbackRate;
  src.connect(low);
  chain = { src, nodes: [low, high, gain] };
  await new Promise((resolve) => {
    src.onended = resolve;
    try { src.start(); } catch (e) { resolve(); }
  });
  if (chain && chain.src === src) chain = null;
}

export function stopLocal(keepToken) {
  if (!keepToken) speakToken++;
  if (chain) {
    try { chain.src.onended = null; chain.src.stop(); } catch (e) { /* ignore */ }
    try { chain.src.disconnect(); for (const n of chain.nodes) n.disconnect(); } catch (e) { /* ignore */ }
    chain = null;
  }
}
