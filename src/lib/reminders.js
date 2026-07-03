// Calendar reminders — decides when a companion should proactively bring up
// something on the user's calendar. Pure + on-device: events come from Google
// (read locally, see gcal.js) and from companion-made actions in the chat, so
// nothing here talks to a server. The UI (Chat) drives the timing; this module
// just answers "is anything worth mentioning right now, and have we already?"

const SOON_MS = 90 * 60 * 1000;    // <= 90 min out -> an urgent "heads up, soon"
const TODAY_MS = 12 * 60 * 60 * 1000; // later today -> a gentle "don't forget"
const KEY = 'other_cal_reminded';  // { key: remindedAtMs } — dedup + prune

// A stable id for an event so we remind about it at most once. Includes the
// start time, so a weekly recurrence (new start) is legitimately remindable
// again — but the same instance never nags twice.
export function reminderKey(ev) {
  const slug = String(ev.title || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
  return `${Math.round((ev.when || 0) / 60000)}-${slug}`;
}

// Given normalized events ([{ title, when: ms, allDay }]), the current time,
// and the set of already-reminded keys, return the single most useful thing to
// mention now — { event, key, urgency: 'soon' | 'today' } — or null.
export function pickReminder(events, now, reminded = {}) {
  const cand = [];
  for (const ev of events || []) {
    if (!ev || !ev.when || ev.when <= now) continue;         // skip past/undated
    const key = reminderKey(ev);
    if (reminded[key]) continue;                              // already mentioned
    const dt = ev.when - now;
    if (ev.allDay) {
      // All-day items: nudge once when the day itself is here (or tomorrow).
      if (dt <= 36 * 60 * 60 * 1000) cand.push({ event: ev, key, urgency: 'today', dt });
    } else if (dt <= SOON_MS) {
      cand.push({ event: ev, key, urgency: 'soon', dt });
    } else if (dt <= TODAY_MS) {
      cand.push({ event: ev, key, urgency: 'today', dt });
    }
  }
  if (!cand.length) return null;
  // Soonest first; "soon" urgency always outranks a "today" heads-up.
  cand.sort((a, b) => (a.urgency === b.urgency ? a.dt - b.dt : a.urgency === 'soon' ? -1 : 1));
  const { event, key, urgency } = cand[0];
  return { event, key, urgency };
}

// A short natural phrase for the reminder time, relative to now.
export function whenPhrase(ev, now) {
  if (ev.allDay) {
    const day = new Date(ev.when); const today = new Date(now);
    const sameDay = day.toDateString() === today.toDateString();
    return sameDay ? 'today' : 'tomorrow';
  }
  const mins = Math.max(1, Math.round((ev.when - now) / 60000));
  if (mins < 60) return `in about ${mins} minute${mins === 1 ? '' : 's'}`;
  const hrs = Math.round(mins / 60);
  if (hrs <= 6) return `in about ${hrs} hour${hrs === 1 ? '' : 's'}`;
  try {
    return `later today, at ${new Date(ev.when).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  } catch (e) { return 'later today'; }
}

export function loadReminded() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
}
export function markReminded(key, now) {
  try {
    const m = loadReminded();
    m[key] = now;
    // Prune anything older than two days so the map can't grow unbounded.
    const cutoff = now - 2 * 86400000;
    for (const k of Object.keys(m)) if (m[k] < cutoff) delete m[k];
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch (e) { /* best-effort */ }
}
