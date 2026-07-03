// Habit tracker — daily habits the user builds for themselves, each with a
// time-of-day (or a specific clock time) and a gentle no-pressure streak.
// Self-contained in localStorage (device-local; no companion, no AI), same
// spirit as lib/rituals.js.
const KEY = 'other_habits_v1';
const DAY = 86400000;
export const dayKey = (ts = Date.now()) => new Date(ts).toISOString().slice(0, 10);

// Time-of-day slots. 'anytime' is the default when nothing is chosen.
export const SLOTS = [
  { id: 'morning', em: '🌅', label: 'Morning' },
  { id: 'afternoon', em: '☀️', label: 'Afternoon' },
  { id: 'evening', em: '🌆', label: 'Evening' },
  { id: 'anytime', em: '✦', label: 'Anytime' },
];
const SLOT_RANK = { morning: 0, afternoon: 1, evening: 2, anytime: 3 };
// Fallback minute-of-day used for sorting when a habit has no specific time.
const SLOT_MINUTES = { morning: 8 * 60, afternoon: 14 * 60, evening: 20 * 60, anytime: 24 * 60 };

export function slotMeta(id) {
  return SLOTS.find((s) => s.id === id) || SLOTS[3];
}

// 20 common daily habits to pick from, each with a sensible default slot.
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
  { em: '🌅', text: 'Morning stretch', when: 'morning' },
  { em: '📵', text: 'Screen-free time', when: 'evening' },
  { em: '😴', text: 'Wind down for bed', when: 'evening' },
  { em: '🎯', text: 'Plan my day', when: 'morning' },
  { em: '💰', text: 'Track spending', when: 'anytime' },
  { em: '📚', text: 'Learn something', when: 'afternoon' },
  { em: '🎨', text: 'Creative time', when: 'afternoon' },
  { em: '☎️', text: 'Reach out to someone', when: 'anytime' },
  { em: '🌿', text: 'Tidy up', when: 'evening' },
];

export function loadHabits() {
  try { const r = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(r) ? r : []; }
  catch (e) { return []; }
}
export function saveHabits(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
}

// Add a habit. opts: { em, when ('morning'|'afternoon'|'evening'|'anytime'),
// time ('HH:MM' 24h, optional) }.
export function addHabit(list, text, opts = {}) {
  const t = (text || '').trim();
  if (!t) return list;
  const when = SLOT_RANK[opts.when] != null ? opts.when : 'anytime';
  const time = /^\d{2}:\d{2}$/.test(opts.time || '') ? opts.time : '';
  const h = { id: 'h' + Math.abs(hash(t + when + time + list.length + Date.now())), em: opts.em || '✦', text: t, when, time, last: '', streak: 0, doneToday: false };
  return sortHabits([...list, h]);
}
export function removeHabit(list, id) { return list.filter((h) => h.id !== id); }

// Toggle today's completion for a habit, updating its streak (identical rules
// to rituals: consecutive days build the streak; undo backs it off by one).
export function toggleToday(list, id, now = Date.now()) {
  const today = dayKey(now);
  const yesterday = dayKey(now - DAY);
  return list.map((h) => {
    if (h.id !== id) return h;
    if (h.last === today) {
      const streak = Math.max(0, (h.streak || 1) - 1);
      return { ...h, last: streak > 0 ? yesterday : '', streak, doneToday: false };
    }
    const streak = h.last === yesterday ? (h.streak || 0) + 1 : 1;
    return { ...h, last: today, streak, doneToday: true };
  });
}

// Refresh doneToday flags for a new day (call on load).
export function refreshForToday(list, now = Date.now()) {
  const today = dayKey(now);
  return sortHabits(list.map((h) => ({ ...h, doneToday: h.last === today })));
}

// Minutes-of-day used to order a habit within the day.
function sortMinutes(h) {
  if (/^\d{2}:\d{2}$/.test(h.time || '')) {
    const [hh, mm] = h.time.split(':').map(Number);
    return hh * 60 + mm;
  }
  return SLOT_MINUTES[h.when] ?? SLOT_MINUTES.anytime;
}
export function sortHabits(list) {
  return [...list].sort((a, b) => sortMinutes(a) - sortMinutes(b));
}

// Human label for a habit's schedule: a specific time if set, else its slot.
export function scheduleLabel(h) {
  if (/^\d{2}:\d{2}$/.test(h.time || '')) return `⏰ ${formatTime(h.time)}`;
  const s = slotMeta(h.when);
  return `${s.em} ${s.label}`;
}

// "07:30" -> "7:30 AM"
export function formatTime(t) {
  const m = /^(\d{2}):(\d{2})$/.exec(t || '');
  if (!m) return t || '';
  let h = Number(m[1]);
  const min = m[2];
  const ap = h < 12 ? 'AM' : 'PM';
  h = h % 12 || 12;
  return `${h}:${min} ${ap}`;
}

function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
