import { handle } from './handlers.js';
import { d1Store } from './store-d1.js';

export default {
  async fetch(request, env) {
    return handle(request, {
      store: d1Store(env.DB),
      SECRET: env.AUTH_SECRET || 'dev-insecure-secret-change-me',
      ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
      ALLOWED_ORIGIN: env.ALLOWED_ORIGIN,
    });
  },
};
