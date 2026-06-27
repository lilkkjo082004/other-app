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
      AI_RATE_LIMIT: env.AI_RATE_LIMIT,
      AUTH_RATE_LIMIT: env.AUTH_RATE_LIMIT,
      ELEVENLABS_API_KEY: env.ELEVENLABS_API_KEY,
      ELEVEN_VOICE_IDS: env.ELEVEN_VOICE_IDS,
      ELEVEN_MODEL: env.ELEVEN_MODEL,
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
    const HOUR = 60 * 60 * 1000;
    // Per-user cadence from their synced setting: off | few (~3 days) | daily.
    const dueWindow = (freq) => (freq === 'off' ? Infinity : freq === 'few' ? 68 * HOUR : 20 * HOUR);

    for (const s of subs) {
      let blob = {};
      try { blob = JSON.parse((await store.getState(s.user_id))?.blob || '{}'); } catch (e) { /* empty */ }
      const due = dueWindow(blob.pushFrequency || 'daily');
      if (!Number.isFinite(due)) continue; // notifications off for this user
      if (s.last_notified && now - s.last_notified < due) continue;
      let line = 'Your companions are thinking about you ✦';
      const comps = (blob.companions || []).filter((c) => c.status === 'awake');
      if (comps.length) {
        const c = comps[Math.floor(Math.random() * comps.length)];
        line = CHECKINS[Math.floor(Math.random() * CHECKINS.length)](c.name);
      }
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
