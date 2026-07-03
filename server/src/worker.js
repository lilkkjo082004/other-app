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

// True if `now` falls inside the user's quiet-hours window (their local tz).
// Handles windows that wrap past midnight (e.g. 22:00 → 07:00).
export function inQuietHours(sched, now) {
  const qs = sched.quietStart, qe = sched.quietEnd;
  if (!/^\d{2}:\d{2}$/.test(qs || '') || !/^\d{2}:\d{2}$/.test(qe || '') || qs === qe) return false;
  const tz = sched.tz || 'UTC';
  let cur;
  try {
    const m = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit' }).format(new Date(now));
    const [h, mi] = m.replace(/[^\d:]/g, '').split(':').map(Number);
    cur = h * 60 + mi;
  } catch (e) { return false; }
  const toM = (s) => { const [h, mi] = s.split(':').map(Number); return h * 60 + mi; };
  const s = toM(qs), e = toM(qe);
  return s < e ? (cur >= s && cur < e) : (cur >= s || cur < e);
}

// Due if the most recent scheduled instant (today or yesterday, in the user's
// tz) has passed and is newer than the last notification we sent.
export function scheduleDue(sched, lastNotified, now) {
  if (inQuietHours(sched, now)) return false;      // respect do-not-disturb
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

// Find an awake companion sitting on a past event they haven't followed up on
// (mirrors the in-app pendingFollowups logic). Returns {comp, mem} or null.
function pickFollowup(blob, now) {
  const comps = (blob.companions || []).filter((c) => c.status === 'awake');
  const store = blob.memories && !Array.isArray(blob.memories) ? blob.memories : {};
  let best = null;
  for (const c of comps) {
    for (const m of store[c.id] || []) {
      if (m && m.kind === 'event' && m.at && m.at < now && !m.followed) {
        if (!best || (m.at || 0) > (best.mem.at || 0)) best = { comp: c, mem: m };
      }
    }
  }
  return best;
}

// Turn an event memory into a warm check-in line, in the third-person voice of
// the existing CHECKINS. e.g. "Maya has been wondering how your interview went."
function followupLine(name, text) {
  const ev = (text || '').trim().replace(/^[A-Z]/, (ch) => ch.toLowerCase());
  return [
    `${name} has been wondering how ${ev} went.`,
    `${name}: been thinking about you — how did ${ev} go? ✦`,
    `${name} wanted to check in: how did ${ev} go?`,
  ][Math.floor(Math.random() * 3)];
}

// Flip a single event memory's `followed` flag in the user's synced state,
// re-reading immediately before writing so we don't stomp recent client syncs.
async function markFollowedInState(store, userId, compId, memId) {
  try {
    const blob = JSON.parse((await store.getState(userId))?.blob || '{}');
    const list = blob.memories && !Array.isArray(blob.memories) ? blob.memories[compId] : null;
    if (!Array.isArray(list)) return;
    let changed = false;
    for (const m of list) if (m && m.id === memId && !m.followed) { m.followed = true; changed = true; }
    if (changed) await store.putState(userId, JSON.stringify(blob));
  } catch (e) { /* best-effort */ }
}

// Ambient conversation alert — the companions were chatting with each other,
// nudging the user to come catch the moment.
function ambientAlertLine(a, b) {
  const T = [
    `${a} and ${b} were just talking about you ✦`,
    `You're missing it — ${a} and ${b} are deep in conversation.`,
    `${a} & ${b} have been chatting... mostly about you 👀`,
    `${a} and ${b} are having a moment without you. Come say hi?`,
    `${a} and ${b} can't agree on something — come settle it.`,
  ];
  return T[Math.floor(Math.random() * T.length)];
}

// Inner-life check-in — draws on what a companion personally wants or has been
// journaling about, so the ping feels like it comes from their inner world.
const snip = (s) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > 80 ? s.slice(0, 77) + '…' : s; };
function innerLine(name, text) {
  const t = snip(text);
  return [
    `${name} has been turning something over: "${t}"`,
    `${name} can't stop thinking about ${t}`,
    `${name} wanted to share what's on their mind: "${t}"`,
  ][Math.floor(Math.random() * 3)];
}

// --- Event / task reminders ------------------------------------------------
// A companion made a calendar event or reminder ("remind me to call Mom at 6").
// Those live as `action`s on chat messages in the synced state. When one is
// coming up within the lead window, the companion who set it pushes a reminder
// even if the app is closed. Pure + deterministic so it's unit-testable.
const REMIND_LEAD_MS = 65 * 60 * 1000; // fire within ~1h before (cron runs often)

function rslug(s) {
  return String(s || 'reminder').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
}

export function dueEventReminders(blob, now) {
  const out = [];
  const awake = new Set((blob.companions || []).filter((c) => c.status === 'awake').map((c) => c.id));
  for (const m of blob.messages || []) {
    const a = m && m.action;
    if (!a || (a.type !== 'calendar' && a.type !== 'reminder')) continue;
    const raw = a.start || a.at;
    const start = typeof raw === 'number' ? raw : Date.parse(raw);
    if (!start || Number.isNaN(start)) continue;
    const dt = start - now;
    if (dt <= 0 || dt > REMIND_LEAD_MS) continue;        // only the imminent, still-future ones
    // Prefer the companion who set it (if still awake); else any awake one.
    let name = m.companion && m.companion.name;
    if (!name || (m.companion.id && !awake.has(m.companion.id))) {
      const any = (blob.companions || []).find((c) => c.status === 'awake');
      name = any ? any.name : 'Your companion';
    }
    const title = a.title || a.text || 'your reminder';
    const mins = Math.max(1, Math.round(dt / 60000));
    const soon = mins < 60 ? `in ${mins} min` : 'coming up';
    const line = a.type === 'reminder'
      ? `${name}: don't forget — ${title} (${soon}) ✦`
      : `${name}: heads up, ${title} is ${soon}.`;
    out.push({ key: `ev-${Math.round(start / 60000)}-${rslug(title)}`, line, start });
  }
  // Soonest first, and de-dupe identical keys within one blob.
  out.sort((x, y) => x.start - y.start);
  const seen = new Set();
  return out.filter((r) => (seen.has(r.key) ? false : (seen.add(r.key), true)));
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
      AI_DAILY_LIMIT: env.AI_DAILY_LIMIT,
      AI_DAILY_TOTAL: env.AI_DAILY_TOTAL,
      FREE_MODEL: env.FREE_MODEL,
      PLUS_MODEL: env.PLUS_MODEL,
      PLUS_DAILY_PREMIUM: env.PLUS_DAILY_PREMIUM,
      BILLING_WEBHOOK_SECRET: env.BILLING_WEBHOOK_SECRET,
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

    const sendTo = async (s, line) => {
      const code = await sendPush(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: 'Other', body: line, url: env.ALLOWED_ORIGIN || './' }),
        vapid,
      );
      if (code === 404 || code === 410) { await store.deletePushSub(s.user_id, s.endpoint); return false; }
      return true;
    };

    for (const s of subs) {
      let blob = {};
      try { blob = JSON.parse((await store.getState(s.user_id))?.blob || '{}'); } catch (e) { /* empty */ }
      const sched = blob.pushSchedule;
      // Legacy blobs (no pushSchedule) that explicitly chose "off" stay fully
      // muted — don't surprise them with the new reminder channel.
      if (!sched && blob.pushFrequency === 'off') continue;
      // Per-user notification-type switches (all default on). Users can turn off
      // event/task reminders or check-ins independently in Settings.
      const types = (sched && sched.types) || {};
      const wantEvents = types.events !== false;
      const wantCheckins = types.checkins !== false;
      const quiet = sched ? inQuietHours(sched, now) : false;

      // 1) Event / task reminders — companion-made calendar events & reminders
      // coming up soon. Independent of the check-in cadence; deduped per device
      // so each event pings once. Respects quiet hours and the type switch.
      if (wantEvents && !quiet) {
        let subGone = false;
        for (const r of dueEventReminders(blob, now)) {
          if (await store.reminderSent(s.endpoint, r.key)) continue;
          const ok = await sendTo(s, r.line);
          if (!ok) { subGone = true; break; }            // expired endpoint — stop using it
          await store.markReminderSent(s.endpoint, r.key, now);
        }
        if (subGone) continue;
      }

      // 2) Companion check-ins ("thinking about you", follow-ups, ambient).
      if (!wantCheckins) continue;
      // Preferred path: explicit check-in times in the user's timezone. A
      // check-in is due when a scheduled time has passed that we haven't
      // notified for yet — this naturally supports several times per day.
      if (sched && Array.isArray(sched.times)) {
        if (!sched.times.length) continue;             // times cleared = off
        if (!scheduleDue(sched, s.last_notified || 0, now)) continue;
      } else {
        const due = dueWindow(blob.pushFrequency || 'daily');
        if (!Number.isFinite(due)) continue;           // notifications off
        if (s.last_notified && now - s.last_notified < due) continue;
      }
      // Prefer a memory-driven follow-up ("how did your interview go?"); else a
      // generic warm check-in from a random awake companion.
      let line = 'Your companions are thinking about you ✦';
      const followup = pickFollowup(blob, now);
      const comps = (blob.companions || []).filter((c) => c.status === 'awake');
      const ambientOn = blob.ambientAlerts !== false; // default on
      if (followup) {
        line = followupLine(followup.comp.name, followup.mem.text);
      } else if (ambientOn && comps.length >= 2 && Math.random() < 0.4) {
        // Ambient conversation alert: the companions were chatting with each other.
        const a = comps[Math.floor(Math.random() * comps.length)];
        let b = comps[Math.floor(Math.random() * comps.length)];
        if (b.name === a.name) b = comps[(comps.indexOf(a) + 1) % comps.length];
        line = ambientAlertLine(a.name, b.name);
      } else if (comps.length) {
        const c = comps[Math.floor(Math.random() * comps.length)];
        const inner = c.want?.text || c.journal?.[0]?.text;
        line = (inner && Math.random() < 0.5) ? innerLine(c.name, inner) : CHECKINS[Math.floor(Math.random() * CHECKINS.length)](c.name);
      }
      try {
        const code = await sendPush(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title: 'Other', body: line, url: env.ALLOWED_ORIGIN || './' }),
          vapid,
        );
        if (code === 404 || code === 410) { await store.deletePushSub(s.user_id, s.endpoint); continue; }
        await store.setNotified(s.endpoint, now);
        // Mark the followed-up event so neither push nor the app raises it again.
        // Re-read the freshest blob right before writing to minimize clobbering
        // a concurrent client sync.
        if (followup) await markFollowedInState(store, s.user_id, followup.comp.id, followup.mem.id);
      } catch (e) { /* skip this one */ }
    }
  },
};
