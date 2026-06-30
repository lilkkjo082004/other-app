// Gentle goals: the user sets things they're working toward; a companion checks
// in kindly and celebrates progress. Goals live in the session (local + synced).
// Encouraging, never nagging.
const DAY = 86400000;

export function newGoal(text, ts = Date.now()) {
  return { id: Math.random().toString(36).slice(2, 9), text: String(text || '').trim().slice(0, 160), ts, done: false, doneAt: 0, nudgedAt: 0 };
}
export function addGoal(list = [], goal) { return [goal, ...(list || [])].slice(0, 100); }
export function removeGoal(list = [], id) { return (list || []).filter((g) => g.id !== id); }
export function toggleGoal(list = [], id, now = Date.now()) {
  return (list || []).map((g) => (g.id === id ? { ...g, done: !g.done, doneAt: !g.done ? now : 0 } : g));
}
export function markNudged(list = [], id, now = Date.now()) {
  return (list || []).map((g) => (g.id === id ? { ...g, nudgedAt: now } : g));
}
export const activeGoals = (list = []) => (list || []).filter((g) => !g.done);

// A goal worth a gentle check-in: active, set at least a day ago, and not nudged
// in the last 3 days.
export function goalToNudge(list = [], now = Date.now()) {
  return activeGoals(list).find((g) => now - g.ts > DAY && now - (g.nudgedAt || 0) > 3 * DAY) || null;
}
