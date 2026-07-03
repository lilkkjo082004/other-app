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

// Subscription billing. Point CHECKOUT_URL at your Stripe/RevenueCat hosted
// checkout; MANAGE_URL at the customer portal. Until CHECKOUT_URL is set, the
// paywall shows but upgrade is disabled (so the app ships without billing wired).
export const CHECKOUT_URL = import.meta.env.VITE_CHECKOUT_URL || '';
export const MANAGE_URL = import.meta.env.VITE_MANAGE_URL || '';
export const PLUS_PRICE = import.meta.env.VITE_PLUS_PRICE || '$9.99/mo';

// Google Calendar OAuth client id (Google Cloud Console -> Credentials ->
// OAuth client, type "Web application", with the app's origin authorized).
// Without it the Calendar section shows a not-configured note.
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
export const billingEnabled = () => CHECKOUT_URL.length > 0;
