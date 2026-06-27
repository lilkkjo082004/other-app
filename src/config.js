// Runtime config via Vite env (set in a .env file or the shell):
//   VITE_AI_PROXY=https://other-ai.<you>.workers.dev
//   VITE_AI_MODEL=claude-opus-4-8
// When VITE_AI_PROXY is empty the app uses built-in placeholder responses.
export const AI_PROXY = import.meta.env.VITE_AI_PROXY || '';
export const AI_MODEL = import.meta.env.VITE_AI_MODEL || 'claude-opus-4-8';
export const aiEnabled = () => AI_PROXY.length > 0;
