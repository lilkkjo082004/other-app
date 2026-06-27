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
export const AI_MODEL = import.meta.env.VITE_AI_MODEL || 'claude-opus-4-8';

export const cloudEnabled = () => API_BASE.length > 0;

// Where companion responses are fetched: the backend's /ai if present, else the
// standalone AI proxy.
export const aiEndpoint = () => (API_BASE ? API_BASE + '/ai' : AI_PROXY);
export const aiEnabled = () => aiEndpoint().length > 0;
