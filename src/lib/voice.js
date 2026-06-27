import { useState, useRef, useCallback } from 'react';

const VOICE_PROFILES = [
  { pitch: 1.0, rate: 0.95, voiceIdx: 0 },
  { pitch: 1.3, rate: 1.05, voiceIdx: 1 },
  { pitch: 0.8, rate: 0.9, voiceIdx: 2 },
];

function getVoices() {
  return window.speechSynthesis?.getVoices() || [];
}

export function speakAs(text, profileIdx) {
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
