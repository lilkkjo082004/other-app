import { handle } from './handlers.js';
import { d1Store } from './store-d1.js';
import { importVapid, sendPush } from './webpush.js';

// --- Timezone-aware check-in scheduling -----------------------------------
// The cron runs in UTC; users pick wall-clock times ("09:00") in their own
// timezone. These helpers map between the two using Intl (available in Workers).

// Offset (ms) such that wallClockAsUTC === instant + offset, for `tz` at `t`.
function tzOffset(t, tz) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const m = {};
  for (const p of dtf.formatToParts(new Date(t))) m[p.type] = p.value;
  const asUTC = Date.UTC(+m.year, +m.month - 1, +m.day, +(m.hour % 24), +m.minute, +m.second);
  return asUTC - t;
}

// The UTC instant for wall-clock Y/M/D H:M in `tz` (DST-safe via one refine).
function wallToInstant(y, mo, d, h, mi, tz) {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let inst = guess - tzOffset(guess, tz);
  inst = guess - tzOffset(inst, tz);
  return inst;
}

// The UTC instant for time "HH:MM" on whatever calendar day `baseMs` falls on
// in `tz`. Used to materialize today's/yesterday's scheduled instants.
function instantForTime(baseMs, hhmm, tz) {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const m = {};
  for (const p of dtf.formatToParts(new Date(baseMs))) m[p.type] = p.value;
  const [h, mi] = hhmm.split(':').map(Number);
  return wallToInstant(+m.year, +m.month, +m.day, h, mi, tz);
}

// Due if the most recent scheduled instant (today or yesterday, in the user's
// tz) has passed and is newer than the last notification we sent.
function scheduleDue(sched, lastNotified, now) {
  const times = (sched.times || []).filter((t) => /^\d{2}:\d{2}$/.test(t));
  if (!times.length) return false;
  const tz = sched.tz || 'UTC';
  let mostRecent = 0;
  try {
    for (let day = 0; day <= 1; day++) {
      const base = now - day * 86400000;
      for (const t of times) {
        const inst = instantForTime(base, t, tz);
        if (inst <= now && inst > mostRecent) mostRecent = inst;
      }
    }
  } catch (e) { return false; } // bad tz string — skip rather than spam
  return mostRecent > 0 && mostRecent > lastNotified;
}

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
      VAPID_PRIVATE: env.VAPID_PRIVATE,
      VAPID_PUBLIC: env.VAPID_PUBLIC,
      VAPID_SUBJECT: env.VAPID_SUBJECT,
    });
  },

  // Cron trigger — companion-initiated check-ins. Wire the schedule in
  // wrangler.toml ([triggers] crons); run it often (e.g. every 15 min) so
  // user-chosen times are honored. No-op until VAPID keys are configured.
  async scheduled(event, env, ctx) {
    if (!env.VAPID_PRIVATE || !env.VAPID_PUBLIC) return;
    const store = d1Store(env.DB);
    const vapid = await importVapid(env.VAPID_PRIVATE, env.VAPID_PUBLIC, env.VAPID_SUBJECT);
    const subs = await store.listPushSubs();
    const now = event?.scheduledTime || Date.now();
    const HOUR = 60 * 60 * 1000;
    // Legacy cadence (for blobs that predate custom times): off | few | daily.
    const dueWindow = (freq) => (freq === 'off' ? Infinity : freq === 'few' ? 68 * HOUR : 20 * HOUR);

    for (const s of subs) {
      let blob = {};
      try { blob = JSON.parse((await store.getState(s.user_id))?.blob || '{}'); } catch (e) { /* empty */ }
      // Preferred path: explicit check-in times in the user's timezone. A
      // check-in is due when a scheduled time has passed that we haven't
      // notified for yet — this naturally supports several times per day.
      const sched = blob.pushSchedule;
      if (sched && Array.isArray(sched.times)) {
        if (!sched.times.length) continue;             // times cleared = off
        if (!scheduleDue(sched, s.last_notified || 0, now)) continue;
      } else {
        const due = dueWindow(blob.pushFrequency || 'daily');
        if (!Number.isFinite(due)) continue;           // notifications off
        if (s.last_notified && now - s.last_notified < due) continue;
      }
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
