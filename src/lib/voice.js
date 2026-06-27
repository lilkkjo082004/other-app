import { useState, useRef, useCallback } from 'react';
import { naturalVoiceEnabled, ttsEndpoint } from '../config.js';
import { authHeader } from './api.js';

// Fallback browser-voice "tones" by index, used when a companion hasn't picked
// its own voice yet. Each index gets a distinct pitch/rate + device voice.
const VOICE_PROFILES = [
  { pitch: 1.0, rate: 0.96 },
  { pitch: 1.28, rate: 1.05 },
  { pitch: 0.82, rate: 0.9 },
  { pitch: 1.12, rate: 1.0 },
  { pitch: 0.92, rate: 0.88 },
];

// Named tone presets for the browser-voice picker.
export const VOICE_TONES = [
  { key: 'warm', label: 'Warm', pitch: 1.0, rate: 0.95 },
  { key: 'bright', label: 'Bright', pitch: 1.3, rate: 1.06 },
  { key: 'deep', label: 'Deep', pitch: 0.8, rate: 0.9 },
  { key: 'soft', label: 'Soft', pitch: 1.12, rate: 0.86 },
];

// Curated ElevenLabs default voices (available on any account) for the natural-
// voice picker. Users pick the one that fits each companion.
export const NATURAL_VOICE_PRESETS = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', vibe: 'calm · warm' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', vibe: 'soft · gentle' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', vibe: 'bold · confident' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', vibe: 'bright · emotional' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', vibe: 'easy · friendly' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', vibe: 'deep · steady' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', vibe: 'crisp · grounded' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', vibe: 'low · raspy' },
];

export function listBrowserVoices() {
  const v = (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.getVoices()) || [];
  return v.filter((x) => x.lang && x.lang.toLowerCase().startsWith('en'));
}

function browserVoiceFor(comp) {
  const voices = listBrowserVoices();
  const v = comp && typeof comp === 'object' ? comp.voice : null;
  if (v && v.kind === 'browser') {
    const match = voices.find((x) => x.voiceURI === v.voiceURI);
    return { voice: match || (voices.length ? voices[0] : null), pitch: v.pitch ?? 1, rate: v.rate ?? 0.96 };
  }
  const idx = typeof comp === 'number' ? comp : (comp && comp.voiceIdx) || 0;
  const prof = VOICE_PROFILES[idx % VOICE_PROFILES.length];
  return { voice: voices.length ? voices[idx % voices.length] : null, pitch: prof.pitch, rate: prof.rate };
}

function speakBrowser(text, comp) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const { voice, pitch, rate } = browserVoiceFor(comp);
  if (voice) u.voice = voice;
  u.pitch = pitch;
  u.rate = rate;
  window.speechSynthesis.speak(u);
}

let currentAudio = null;
async function speakNatural(text, comp) {
  const v = comp && typeof comp === 'object' ? comp.voice : null;
  const body = { text };
  if (v && v.kind === 'natural' && v.voiceId) body.voiceId = v.voiceId;
  else body.voiceIdx = (typeof comp === 'number' ? comp : (comp && comp.voiceIdx)) || 0;
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
  audio.onended = () => URL.revokeObjectURL(url);
  currentAudio = audio;
  await audio.play();
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
