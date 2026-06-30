// Runtime config via Vite env (set in a .env file or the shell).
//
// Full backend (auth + cloud sync + mood + AI):
//   VITE_API_BASE=https://other-api.<you>.workers.dev
// AI-only proxy (no accounts), if you don't run the full backend:
//   VITE_AI_PROXY=https://other-ai.<you>.workers.dev
//   VITE_AI_MODEL=claude-opus-4-8
//
// With neither set, the app runs fully on placeholder responses + localStorage.
export const API_BASE = import.meta.env.VITE_API_BASE || '';
export const AI_PROXY = import.meta.env.VITE_AI_PROXY || '';
export const AI_MODEL = import.meta.env.VITE_AI_MODEL || 'claude-haiku-4-5-20251001';

export const cloudEnabled = () => API_BASE.length > 0;

// Where companion responses are fetched: the backend's /ai if present, else the
// standalone AI proxy. The hosted endpoint serves everyone with no user key and
// no login required.
export const aiEndpoint = () => (API_BASE ? API_BASE + '/ai' : AI_PROXY);
export const aiEnabled = () => aiEndpoint().length > 0;

// Natural (AI) companion voices via the backend's /tts proxy (ElevenLabs).
// Opt-in with VITE_NATURAL_VOICE=1; requires the backend. Falls back to the
// browser's speech synthesis whenever it's off or the request fails.
const NATURAL_VOICE = ['1', 'true', 'yes'].includes((import.meta.env.VITE_NATURAL_VOICE || '').toLowerCase());
export const ttsEndpoint = () => (API_BASE ? API_BASE + '/tts' : '');
export const naturalVoiceEnabled = () => NATURAL_VOICE && ttsEndpoint().length > 0;
