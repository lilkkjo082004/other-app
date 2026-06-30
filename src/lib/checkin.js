// Daily check-in: a warm once-a-day "how are you?" that records a mood and
// builds a (no-pressure) streak + a little mood history. Lives in the session.
const DAY = 86400000;
export const dayStr = (ts = Date.now()) => new Date(ts).toISOString().slice(0, 10);

// The mood options offered in the check-in card.
export const CHECKIN_MOODS = [
  { key: 'great', em: '😄', label: 'Great', color: '#5fd39a' },
  { key: 'good', em: '🙂', label: 'Good', color: '#7bc47f' },
  { key: 'okay', em: '😐', label: 'Okay', color: '#c9c267' },
  { key: 'low', em: '😔', label: 'Low', color: '#e0935f' },
  { key: 'anxious', em: '😰', label: 'Anxious', color: '#e0686f' },
];
export const moodColor = (k) => (CHECKIN_MOODS.find((m) => m.key === k)?.color || '#6b6880');

export function checkinDue(ci) { return (ci?.last || '') !== dayStr(); }

export function recordCheckin(ci, mood, now = Date.now()) {
  const today = dayStr(now);
  const yesterday = dayStr(now - DAY);
  const prev = ci?.last || '';
  const streak = prev === today ? (ci?.streak || 1) : prev === yesterday ? (ci?.streak || 0) + 1 : 1;
  const history = [{ d: today, mood }, ...((ci?.history) || []).filter((h) => h.d !== today)].slice(0, 60);
  return { last: today, streak, history };
}
