import { useState, useRef, useCallback } from 'react';
import { naturalVoiceEnabled, ttsEndpoint } from '../config.js';
import { authHeader } from './api.js';
import {
  cleanForSpeech, chunkForSpeech, browserToneFor, pickNaturalVoiceId,
  NATURAL_VOICE_PRESETS, VOICE_TONES, DEFAULT_VOICE_SETTINGS,
} from './voicetext.js';

export { NATURAL_VOICE_PRESETS, VOICE_TONES } from './voicetext.js';

export function listBrowserVoices() {
  const v = (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.getVoices()) || [];
  return v.filter((x) => x.lang && x.lang.toLowerCase().startsWith('en'));
}

// Heuristic gender hints from a device-voice's name/URI, so an auto-matched
// companion gets a same-gender system voice where the platform exposes one.
const FEMALE_HINT = /female|\bwoman\b|samantha|victoria|karen|moira|tessa|fiona|serena|allison|ava|susan|zoe|amelie|anna|kate|nicky|catherine|google uk english female|google us english female/i;
const MALE_HINT = /\bmale\b|\bman\b|daniel|thomas|alex|fred|david|george|james|oliver|arthur|gordon|aaron|nathan|reed|rishi|\btom\b|\blee\b|bruce|google uk english male|google us english male/i;

function deviceVoiceFor(comp, voices, gender) {
  if (!voices.length) return null;
  const idx = (comp && comp.voiceIdx) || 0;
  if (gender !== 'neutral') {
    const want = gender === 'female' ? FEMALE_HINT : MALE_HINT;
    const avoid = gender === 'female' ? MALE_HINT : FEMALE_HINT;
    const matches = voices.filter((v) => want.test(`${v.name} ${v.voiceURI}`) && !avoid.test(`${v.name} ${v.voiceURI}`));
    if (matches.length) return matches[idx % matches.length];
  }
  return voices[idx % voices.length];
}

function browserVoiceFor(comp) {
  const voices = listBrowserVoices();
  const v = comp && typeof comp === 'object' ? comp.voice : null;
  if (v && v.kind === 'browser') {
    const match = voices.find((x) => x.voiceURI === v.voiceURI);
    return { voice: match || (voices.length ? voices[0] : null), pitch: v.pitch ?? 1, rate: v.rate ?? 0.96 };
  }
  // No explicit pick — auto-match by pronouns + personality.
  const tone = browserToneFor(comp);
  const voice = typeof comp === 'number'
    ? (voices[comp % voices.length] || null)
    : deviceVoiceFor(comp, voices, tone.gender);
  return { voice, pitch: tone.pitch, rate: tone.rate };
}

// Chrome silently stops utterances longer than ~15s; a periodic resume() keeps
// long messages going. Runs only while something is speaking.
let keepAlive = null;
function startKeepAlive() {
  stopKeepAlive();
  keepAlive = setInterval(() => {
    try { if (window.speechSynthesis && window.speechSynthesis.speaking) window.speechSynthesis.resume(); } catch (e) { /* no-op */ }
  }, 8000);
}
function stopKeepAlive() { if (keepAlive) { clearInterval(keepAlive); keepAlive = null; } }

// Speak via the browser, one sentence-chunk at a time. `onDone` fires when the
// whole message has finished (used by call mode).
function speakBrowser(text, comp, onDone) {
  if (!window.speechSynthesis) { onDone && onDone(); return; }
  window.speechSynthesis.cancel();
  stopKeepAlive();
  const chunks = chunkForSpeech(cleanForSpeech(text));
  if (!chunks.length) { onDone && onDone(); return; }
  const { voice, pitch, rate } = browserVoiceFor(comp);
  let i = 0;
  const next = () => {
    if (i >= chunks.length) { stopKeepAlive(); onDone && onDone(); return; }
    const u = new SpeechSynthesisUtterance(chunks[i++]);
    if (voice) u.voice = voice;
    u.pitch = pitch;
    u.rate = rate;
    u.onend = next;
    u.onerror = next;
    window.speechSynthesis.speak(u);
  };
  startKeepAlive();
  next();
}

let currentAudio = null;
async function speakNatural(text, comp) {
  const clean = cleanForSpeech(text);
  if (!clean) return;
  const v = comp && typeof comp === 'object' ? comp.voice : null;
  const body = {
    text: clean,
    voiceId: pickNaturalVoiceId(comp),
    voiceIdx: (typeof comp === 'number' ? comp : (comp && comp.voiceIdx)) || 0,
    voice_settings: (v && v.settings) || DEFAULT_VOICE_SETTINGS,
  };
  const res = await fetch(ttsEndpoint(), {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeader() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`tts ${res.status}`);
  const buf = await res.arrayBuffer();
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  const url = URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' }));
  const audio = new Audio(url);
  currentAudio = audio;
  await audio.play();
  // Resolve only once playback finishes, so callers (call mode) can wait.
  await new Promise((resolve) => {
    audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
    audio.onerror = () => resolve();
  });
}

// Like speakAs, but returns a Promise that resolves when speech finishes.
export function speakAsAsync(text, comp) {
  if (naturalVoiceEnabled()) {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    return speakNatural(text, comp).catch(() => new Promise((r) => speakBrowser(text, comp, r)));
  }
  return new Promise((r) => speakBrowser(text, comp, r));
}

// Stop any in-progress speech (browser or natural).
export function stopSpeaking() {
  stopKeepAlive();
  try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* no-op */ }
  try { if (currentAudio) { currentAudio.pause(); currentAudio = null; } } catch (e) { /* no-op */ }
}

// Speak as a companion. `comp` is the companion object (preferred — carries its
// chosen voice) or a legacy numeric voiceIdx. Uses natural (AI) voices when
// configured, always falling back to the browser's speech synthesis.
export function speakAs(text, comp) {
  if (naturalVoiceEnabled()) {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    speakNatural(text, comp).catch(() => speakBrowser(text, comp));
    return;
  }
  speakBrowser(text, comp);
}

try {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => listBrowserVoices();
    listBrowserVoices();
  }
} catch (e) { /* no-op */ }

// Browser speech recognition — "call by name" voice input.
export function useSpeechRec(onResult) {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = false;
    r.interimResults = false;
    r.lang = 'en-US';
    r.onresult = (e) => { onResult(e.results[0]?.[0]?.transcript || ''); setOn(false); };
    r.onerror = () => setOn(false);
    r.onend = () => setOn(false);
    ref.current = r;
    r.start();
    setOn(true);
  }, [onResult]);
  return { listening: on, startListening: start };
}
