// Personal rituals & routines — small daily/weekly practices the user sets for
// themselves, with a gentle completion streak. Self-contained in localStorage
// (device-local; no companion, no AI). A "no pressure" tool.
const KEY = 'other_rituals_v1';
const DAY = 86400000;
export const dayKey = (ts = Date.now()) => new Date(ts).toISOString().slice(0, 10);

export const RITUAL_IDEAS = [
  { em: '🧘', text: 'A few slow breaths' },
  { em: '💧', text: 'Drink a glass of water' },
  { em: '🌅', text: 'Step outside for a minute' },
  { em: '📓', text: 'Write one line in my journal' },
  { em: '🙏', text: 'Name one thing I’m grateful for' },
  { em: '🚶', text: 'A short walk' },
  { em: '📵', text: 'Ten minutes off my phone' },
  { em: '🌙', text: 'Wind down before bed' },
];

export function loadRituals() {
  try { const r = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(r) ? r : []; }
  catch (e) { return []; }
}
export function saveRituals(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
}

export function addRitual(list, text, em = '✦') {
  const t = (text || '').trim();
  if (!t) return list;
  return [...list, { id: 'r' + Math.abs(hash(t + list.length)), em, text: t, last: '', streak: 0, doneToday: false }];
}
export function removeRitual(list, id) { return list.filter((r) => r.id !== id); }

// Toggle today's completion for a ritual, updating its streak.
export function toggleToday(list, id, now = Date.now()) {
  const today = dayKey(now);
  const yesterday = dayKey(now - DAY);
  return list.map((r) => {
    if (r.id !== id) return r;
    if (r.last === today) {
      // undo today's completion
      const streak = Math.max(0, (r.streak || 1) - 1);
      return { ...r, last: streak > 0 ? yesterday : '', streak, doneToday: false };
    }
    const streak = r.last === yesterday ? (r.streak || 0) + 1 : 1;
    return { ...r, last: today, streak, doneToday: true };
  });
}

// Refresh doneToday flags for a new day (call on load).
export function refreshForToday(list, now = Date.now()) {
  const today = dayKey(now);
  return list.map((r) => ({ ...r, doneToday: r.last === today }));
}

function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
