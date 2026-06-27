import { useState, useRef, useCallback } from 'react';
import { naturalVoiceEnabled, ttsEndpoint } from '../config.js';
import { authHeader } from './api.js';

const VOICE_PROFILES = [
  { pitch: 1.0, rate: 0.95, voiceIdx: 0 },
  { pitch: 1.3, rate: 1.05, voiceIdx: 1 },
  { pitch: 0.8, rate: 0.9, voiceIdx: 2 },
];

function getVoices() {
  return window.speechSynthesis?.getVoices() || [];
}

function speakBrowser(text, profileIdx) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = getVoices();
  const p = VOICE_PROFILES[profileIdx % VOICE_PROFILES.length];
  const eng = voices.filter((v) => v.lang.startsWith('en'));
  if (eng.length > 0) u.voice = eng[p.voiceIdx % eng.length];
  u.pitch = p.pitch;
  u.rate = p.rate;
  window.speechSynthesis.speak(u);
}

let currentAudio = null;
async function speakNatural(text, profileIdx) {
  const res = await fetch(ttsEndpoint(), {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeader() },
    body: JSON.stringify({ text, voiceIdx: profileIdx }),
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

// Speak a message. Uses natural (AI) voices when configured; always falls back
// to the browser's speech synthesis if that's off or fails.
export function speakAs(text, profileIdx = 0) {
  if (naturalVoiceEnabled()) {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    speakNatural(text, profileIdx).catch(() => speakBrowser(text, profileIdx));
    return;
  }
  speakBrowser(text, profileIdx);
}

try {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => getVoices();
    getVoices();
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
