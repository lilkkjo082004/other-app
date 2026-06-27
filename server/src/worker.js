import { handle } from './handlers.js';
import { d1Store } from './store-d1.js';
import { importVapid, sendPush } from './webpush.js';

const CHECKINS = [
  (n) => `${n} was just thinking about you. How's your day going?`,
  (n) => `${n} left the light on for you. Come say hi when you can ✦`,
  (n) => `${n}: "ok I have a story for you but only if you come back."`,
  (n) => `${n} has been wondering how you're holding up.`,
  (n) => `${n} saved a thought for you. No rush — whenever you're ready.`,
];

export default {
  async fetch(request, env) {
    return handle(request, {
      store: d1Store(env.DB),
      SECRET: env.AUTH_SECRET || 'dev-insecure-secret-change-me',
      ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
      ALLOWED_ORIGIN: env.ALLOWED_ORIGIN,
    });
  },

  // Cron trigger — companion-initiated check-ins. Wire the schedule in
  // wrangler.toml ([triggers] crons). No-op until VAPID keys are configured.
  async scheduled(event, env, ctx) {
    if (!env.VAPID_PRIVATE || !env.VAPID_PUBLIC) return;
    const store = d1Store(env.DB);
    const vapid = await importVapid(env.VAPID_PRIVATE, env.VAPID_PUBLIC, env.VAPID_SUBJECT);
    const subs = await store.listPushSubs();
    const now = Date.now();
    const DUE_MS = 20 * 60 * 60 * 1000; // at most ~once/day per device

    for (const s of subs) {
      if (s.last_notified && now - s.last_notified < DUE_MS) continue;
      let line = 'Your companions are thinking about you ✦';
      try {
        const st = await store.getState(s.user_id);
        const comps = (JSON.parse(st?.blob || '{}').companions || []).filter((c) => c.status === 'awake');
        if (comps.length) {
          const c = comps[Math.floor(Math.random() * comps.length)];
          line = CHECKINS[Math.floor(Math.random() * CHECKINS.length)](c.name);
        }
      } catch (e) { /* fall back to the generic line */ }
      try {
        const code = await sendPush(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title: 'Other', body: line, url: env.ALLOWED_ORIGIN || './' }),
          vapid,
        );
        if (code === 404 || code === 410) await store.deletePushSub(s.user_id, s.endpoint);
        else await store.setNotified(s.endpoint, now);
      } catch (e) { /* skip this one */ }
    }
  },
};
