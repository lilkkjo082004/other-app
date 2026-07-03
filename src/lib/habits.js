// Habit tracker — daily/recurring habits the user builds for themselves. Each
// has a time-of-day (or a specific clock time), a recurrence (every day, certain
// weekdays, N×/week, weekly, biweekly, monthly) and a completion log that drives
// a gentle streak. Self-contained in localStorage (device-local; no AI).
//
// This supersedes the old "Rituals" feature — initHabits() folds any saved
// rituals in once, preserving them.
const KEY = 'other_habits_v1';
const FOLD_KEY = 'other_habits_folded_rituals';
const RITUALS_KEY = 'other_rituals_v1';
const DAY = 86400000;

export const dayKey = (ts = Date.now()) => new Date(ts).toISOString().slice(0, 10);
const dayTs = (dk) => Date.parse(dk + 'T00:00:00Z');
const utcDayNum = (ts) => Math.floor(ts / DAY);
// Period indexes are contiguous integers (consecutive periods differ by 1), so
// a streak can just walk index-1 backwards. Weeks start on Sunday.
const weekIndex = (ts) => Math.floor((utcDayNum(ts) + 4) / 7);
const biweekIndex = (ts) => Math.floor((utcDayNum(ts) + 4) / 14);
const monthIndex = (ts) => { const d = new Date(ts); return d.getUTCFullYear() * 12 + d.getUTCMonth(); };
const periodIndexer = (type) => (type === 'monthly' ? monthIndex : type === 'biweekly' ? biweekIndex : weekIndex);

// ── Time-of-day slots ────────────────────────────────────────────────────────
export const SLOTS = [
  { id: 'morning', em: '🌅', label: 'Morning' },
  { id: 'afternoon', em: '☀️', label: 'Afternoon' },
  { id: 'evening', em: '🌆', label: 'Evening' },
  { id: 'anytime', em: '✦', label: 'Anytime' },
];
const SLOT_RANK = { morning: 0, afternoon: 1, evening: 2, anytime: 3 };
const SLOT_MINUTES = { morning: 8 * 60, afternoon: 14 * 60, evening: 20 * 60, anytime: 24 * 60 };
export function slotMeta(id) { return SLOTS.find((s) => s.id === id) || SLOTS[3]; }

// ── Recurrence ───────────────────────────────────────────────────────────────
// A freq is { type, days?, n? }. UI offers these choices:
export const FREQ_CHOICES = [
  { key: 'daily', label: 'Every day', build: () => ({ type: 'daily' }) },
  { key: 'weekdays', label: 'Certain days', build: (days) => ({ type: 'weekdays', days: days || [] }) },
  { key: '2pw', label: '2× a week', build: () => ({ type: 'timesPerWeek', n: 2 }) },
  { key: '3pw', label: '3× a week', build: () => ({ type: 'timesPerWeek', n: 3 }) },
  { key: 'weekly', label: 'Weekly', build: () => ({ type: 'weekly' }) },
  { key: 'biweekly', label: 'Every 2 weeks', build: () => ({ type: 'biweekly' }) },
  { key: 'monthly', label: 'Monthly', build: () => ({ type: 'monthly' }) },
];
export const WEEKDAYS = [
  { d: 0, l: 'S', name: 'Sun' }, { d: 1, l: 'M', name: 'Mon' }, { d: 2, l: 'T', name: 'Tue' },
  { d: 3, l: 'W', name: 'Wed' }, { d: 4, l: 'T', name: 'Thu' }, { d: 5, l: 'F', name: 'Fri' }, { d: 6, l: 'S', name: 'Sat' },
];
const DOW_NAME = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── 20 preset habits (folds in the old ritual ideas too) ────────────────────
export const HABIT_IDEAS = [
  { em: '💧', text: 'Drink water', when: 'anytime' },
  { em: '🏃', text: 'Exercise', when: 'morning' },
  { em: '🧘', text: 'Meditate', when: 'morning' },
  { em: '📖', text: 'Read', when: 'evening' },
  { em: '🛏️', text: 'Make the bed', when: 'morning' },
  { em: '🦷', text: 'Brush & floss', when: 'evening' },
  { em: '🥗', text: 'Eat something healthy', when: 'afternoon' },
  { em: '🚶', text: 'Take a walk', when: 'afternoon' },
  { em: '📓', text: 'Journal', when: 'evening' },
  { em: '🙏', text: 'Note a gratitude', when: 'evening' },
  { em: '💊', text: 'Take vitamins / meds', when: 'morning' },
  { em: '🌬️', text: 'A few slow breaths', when: 'anytime' },
  { em: '📵', text: 'Screen-free time', when: 'evening' },
  { em: '😴', text: 'Wind down for bed', when: 'evening' },
  { em: '🎯', text: 'Plan my day', when: 'morning' },
  { em: '💰', text: 'Track spending', when: 'anytime' },
  { em: '📚', text: 'Learn something', when: 'afternoon' },
  { em: '🌅', text: 'Step outside for a minute', when: 'morning' },
  { em: '☎️', text: 'Reach out to someone', when: 'anytime' },
  { em: '🌿', text: 'Tidy up', when: 'evening' },
];

// ── Storage ──────────────────────────────────────────────────────────────────
export function loadHabits() {
  try { const r = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(r) ? r : []; }
  catch (e) { return []; }
}
export function saveHabits(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
}

// Bring an item up to the current shape (freq default, completion log). Handles
// the older { last, streak } habit shape and folded rituals.
function normalize(h) {
  const freq = h && h.freq && typeof h.freq === 'object' ? h.freq : { type: 'daily' };
  let done = Array.isArray(h.done) ? h.done.filter(Boolean) : [];
  if (!done.length && h.last) done = [h.last];
  return {
    id: h.id || ('h' + Math.abs(hash((h.text || '') + (h.last || '')))),
    em: h.em || '✦',
    text: (h.text || '').trim(),
    when: SLOT_RANK[h.when] != null ? h.when : 'anytime',
    time: /^\d{2}:\d{2}$/.test(h.time || '') ? h.time : '',
    freq,
    duration: Math.max(0, Math.round(Number(h.duration) || 0)),
    remind: !!h.remind,
    done,
  };
}

// Load habits, folding any saved rituals in exactly once (preserving streaks).
export function initHabits() {
  let list = loadHabits().map(normalize);
  if (typeof localStorage !== 'undefined' && localStorage.getItem(FOLD_KEY) !== '1') {
    try {
      const r = JSON.parse(localStorage.getItem(RITUALS_KEY));
      if (Array.isArray(r) && r.length) {
        for (const it of r) list.push(normalize({ ...it, id: 'h' + Math.abs(hash((it.text || '') + list.length + 'r')), when: 'anytime', time: '' }));
      }
    } catch (e) { /* ignore */ }
    try { localStorage.setItem(FOLD_KEY, '1'); localStorage.removeItem(RITUALS_KEY); } catch (e) { /* ignore */ }
    saveHabits(list);
  }
  return sortHabits(list);
}

export function addHabit(list, text, opts = {}) {
  const t = (text || '').trim();
  if (!t) return list;
  const when = SLOT_RANK[opts.when] != null ? opts.when : 'anytime';
  const time = /^\d{2}:\d{2}$/.test(opts.time || '') ? opts.time : '';
  const freq = opts.freq && typeof opts.freq === 'object' ? opts.freq : { type: 'daily' };
  const duration = Math.max(0, Math.round(Number(opts.duration) || 0));
  const h = { id: 'h' + Math.abs(hash(t + when + time + JSON.stringify(freq) + list.length + Date.now())), em: opts.em || '✦', text: t, when, time, freq, duration, remind: false, done: [] };
  return sortHabits([...list, h]);
}
export function removeHabit(list, id) { return list.filter((h) => h.id !== id); }

// Turn a companion's gentle reminder for a habit on/off.
export function toggleRemind(list, id) {
  return list.map((h) => (h.id === id ? { ...h, remind: !h.remind } : h));
}

// Toggle today's completion (adds/removes today's dayKey in the log).
export function toggleToday(list, id, now = Date.now()) {
  const tk = dayKey(now);
  return list.map((h) => {
    if (h.id !== id) return h;
    const set = new Set(h.done || []);
    if (set.has(tk)) set.delete(tk); else set.add(tk);
    return { ...h, done: [...set].sort().slice(-180) }; // keep ~6 months
  });
}

export function doneToday(h, now = Date.now()) { return (h.done || []).includes(dayKey(now)); }

// Is this habit scheduled to be done today (and not yet done)?
export function dueToday(h, now = Date.now()) {
  const f = h.freq || { type: 'daily' };
  if (doneToday(h, now)) return false;
  if (f.type === 'daily') return true;
  if (f.type === 'weekdays') {
    const days = (f.days && f.days.length) ? f.days : [0, 1, 2, 3, 4, 5, 6];
    return days.includes(new Date(dayTs(dayKey(now))).getUTCDay());
  }
  if (f.type === 'timesPerWeek') return weekProgress(h, now) < (f.n || 2);
  // weekly / biweekly / monthly: due if nothing completed in the current period
  const idx = periodIndexer(f.type);
  const cur = idx(now);
  return !(h.done || []).some((dk) => idx(dayTs(dk)) === cur);
}

// Completions in the current (Sunday-start) week — for N×/week progress.
export function weekProgress(h, now = Date.now()) {
  const cur = weekIndex(now);
  return (h.done || []).filter((dk) => weekIndex(dayTs(dk)) === cur).length;
}

// Consecutive completed periods, counting the current period only once already
// satisfied (an in-progress current period doesn't break the streak).
export function streakOf(h, now = Date.now()) {
  const done = new Set((h.done || []).filter(Boolean));
  if (!done.size) return 0;
  const f = h.freq || { type: 'daily' };
  if (f.type === 'daily') return dayStreak(done, now, () => true);
  if (f.type === 'weekdays') {
    const days = (f.days && f.days.length) ? f.days : [0, 1, 2, 3, 4, 5, 6];
    return dayStreak(done, now, (dk) => days.includes(new Date(dayTs(dk)).getUTCDay()));
  }
  const target = f.type === 'timesPerWeek' ? (f.n || 2) : 1;
  const idx = periodIndexer(f.type);
  const counts = {};
  for (const dk of done) { const i = idx(dayTs(dk)); counts[i] = (counts[i] || 0) + 1; }
  const cur = idx(now);
  let streak = (counts[cur] || 0) >= target ? 1 : 0;
  for (let i = cur - 1; (counts[i] || 0) >= target; i--) streak++;
  return streak;
}

// Walk back over scheduled days from today, counting consecutive completions.
// Today, if scheduled but not yet done, is treated as in-progress (not a break).
function dayStreak(done, now, isScheduled) {
  let streak = 0;
  const tk = dayKey(now);
  if (isScheduled(tk) && done.has(tk)) streak++;
  let cursor = now - DAY;
  for (let n = 0; n < 420; n++) {
    const k = dayKey(cursor);
    if (isScheduled(k)) { if (done.has(k)) streak++; else break; }
    cursor -= DAY;
  }
  return streak;
}

// ── Labels ───────────────────────────────────────────────────────────────────
export function scheduleLabel(h) {
  if (/^\d{2}:\d{2}$/.test(h.time || '')) return `⏰ ${formatTime(h.time)}`;
  const s = slotMeta(h.when);
  return `${s.em} ${s.label}`;
}
export function freqLabel(h) {
  const f = h.freq || { type: 'daily' };
  if (f.type === 'daily') return 'Every day';
  if (f.type === 'weekdays') return (f.days && f.days.length) ? f.days.slice().sort((a, b) => a - b).map((d) => DOW_NAME[d]).join(' · ') : 'Certain days';
  if (f.type === 'timesPerWeek') return `${f.n || 2}× a week`;
  if (f.type === 'weekly') return 'Weekly';
  if (f.type === 'biweekly') return 'Every 2 weeks';
  if (f.type === 'monthly') return 'Monthly';
  return 'Every day';
}
// Minutes -> "40 min" / "1 hr" / "1 hr 30 min". '' when unset.
export function formatDuration(m) {
  m = Math.max(0, Math.round(Number(m) || 0));
  if (!m) return '';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), mm = m % 60;
  return mm ? `${h} hr ${mm} min` : `${h} hr`;
}

export function formatTime(t) {
  const m = /^(\d{2}):(\d{2})$/.exec(t || '');
  if (!m) return t || '';
  let h = Number(m[1]);
  const ap = h < 12 ? 'AM' : 'PM';
  h = h % 12 || 12;
  return `${h}:${m[2]} ${ap}`;
}

// ── Sort: earliest-in-the-day first ─────────────────────────────────────────
function sortMinutes(h) {
  if (/^\d{2}:\d{2}$/.test(h.time || '')) { const [hh, mm] = h.time.split(':').map(Number); return hh * 60 + mm; }
  return SLOT_MINUTES[h.when] ?? SLOT_MINUTES.anytime;
}
export function sortHabits(list) { return [...list].sort((a, b) => sortMinutes(a) - sortMinutes(b)); }

// ── Companion reminders (opt-in per habit) ───────────────────────────────────
// A device-local, once-per-day-per-habit dedup so a companion nudges at most
// once for a given habit each day.
const REMIND_KEY = 'other_habit_reminded';
export const remindKey = (h, now = Date.now()) => `${dayKey(now)}:${h.id}`;
export function loadHabitReminded() {
  try { return JSON.parse(localStorage.getItem(REMIND_KEY)) || {}; } catch (e) { return {}; }
}
export function markHabitReminded(key, now = Date.now()) {
  try {
    const m = loadHabitReminded();
    m[key] = now;
    const cut = now - 2 * DAY;
    for (const k of Object.keys(m)) if (m[k] < cut) delete m[k]; // prune
    localStorage.setItem(REMIND_KEY, JSON.stringify(m));
  } catch (e) { /* ignore */ }
}

// Has the habit's time arrived today? Specific time wins; else a per-slot start
// (local wall-clock, so it matches how the user set it).
function pastScheduledTime(h, now) {
  const d = new Date(now);
  const mins = d.getHours() * 60 + d.getMinutes();
  if (/^\d{2}:\d{2}$/.test(h.time || '')) { const [hh, mm] = h.time.split(':').map(Number); return mins >= hh * 60 + mm; }
  const start = { morning: 6 * 60, afternoon: 12 * 60, evening: 18 * 60, anytime: 9 * 60 };
  return mins >= (start[h.when] ?? 9 * 60);
}

// A compact snapshot of reminder-enabled habits to ride along in the synced
// session blob, so the backend cron can send closed-app push reminders. Only
// habits with the bell on leave the device; lastDone lets the server skip ones
// already done today.
export function habitPushSpec() {
  const out = [];
  for (const raw of loadHabits()) {
    if (!raw || !raw.remind) continue;
    const done = Array.isArray(raw.done) ? raw.done : (raw.last ? [raw.last] : []);
    out.push({
      id: raw.id,
      text: (raw.text || '').trim(),
      em: raw.em || '✦',
      when: raw.when || 'anytime',
      time: /^\d{2}:\d{2}$/.test(raw.time || '') ? raw.time : '',
      freq: raw.freq || { type: 'daily' },
      duration: Math.max(0, Math.round(Number(raw.duration) || 0)),
      lastDone: done.length ? done[done.length - 1] : '',
    });
  }
  return out;
}

// The first habit worth a companion nudge right now: reminders on, scheduled
// today and not yet done, its time has arrived, and not already nudged today.
export function habitToRemind(list, now = Date.now()) {
  const reminded = loadHabitReminded();
  for (const h of list || []) {
    if (!h.remind) continue;
    if (!dueToday(h, now)) continue;
    if (!pastScheduledTime(h, now)) continue;
    if (reminded[remindKey(h, now)]) continue;
    return h;
  }
  return null;
}

function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
