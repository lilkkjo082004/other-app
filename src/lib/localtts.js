// On-device neural TTS — free, no server, private. Runs Kokoro-82M (Apache-2.0)
// entirely in the user's browser via kokoro-js / transformers.js, on WebGPU when
// available and WASM otherwise. Far more human than the built-in speechSynthesis.
//
// The ~80MB model is downloaded once on first use and cached by the browser
// (transformers.js uses the Cache Storage API), so later sessions are instant
// and work offline. It's opt-in (a Settings toggle) because of that first
// download. kokoro-js is dynamically imported so it never bloats the main bundle.
import { cleanForSpeech, splitSentences, voiceGender } from './voicetext.js';

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

let currentAudio = null;
let speakToken = 0;

function rawToUrl(raw) {
  if (raw && typeof raw.toBlob === 'function') return URL.createObjectURL(raw.toBlob());
  if (raw && typeof raw.toWav === 'function') return URL.createObjectURL(new Blob([raw.toWav()], { type: 'audio/wav' }));
  // Fallback: encode Float32 PCM to a 16-bit WAV.
  const data = raw.audio || raw.data || new Float32Array();
  const sr = raw.sampling_rate || raw.samplingRate || 24000;
  return URL.createObjectURL(new Blob([encodeWav(data, sr)], { type: 'audio/wav' }));
}

function encodeWav(samples, sampleRate) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); w(8, 'WAVE');
  w(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  w(36, 'data'); view.setUint32(40, samples.length * 2, true);
  let o = 44;
  for (let i = 0; i < samples.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buf;
}

function playUrl(url) {
  return new Promise((resolve) => {
    const el = new Audio(url);
    currentAudio = el;
    el.onended = () => { URL.revokeObjectURL(url); resolve(); };
    el.onerror = () => { URL.revokeObjectURL(url); resolve(); };
    el.play().catch(() => resolve());
  });
}

// Speak a companion's line on-device. Synthesizes and plays sentence-by-sentence
// so the first words start sooner. Resolves when playback finishes. Throws if the
// model can't load — callers fall back to browser speech.
export async function speakLocal(text, comp) {
  const clean = cleanForSpeech(text);
  if (!clean) return;
  const model = await warmLocalTts();
  const voice = localVoiceId(comp);
  const token = ++speakToken;
  stopLocal(true);
  for (const sentence of splitSentences(clean)) {
    if (token !== speakToken) return;              // superseded by a newer call
    let raw;
    try { raw = await model.generate(sentence, { voice }); }
    catch (e) { continue; }
    if (token !== speakToken) return;
    await playUrl(rawToUrl(raw));
  }
}

export function stopLocal(keepToken) {
  if (!keepToken) speakToken++;
  if (currentAudio) { try { currentAudio.pause(); currentAudio.src = ''; } catch (e) { /* ignore */ } currentAudio = null; }
}
