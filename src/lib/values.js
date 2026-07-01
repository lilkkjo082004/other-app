// Values & intentions compass — the user names a few core values and a current
// intention ("north star"). Self-contained in localStorage. Optionally surfaced
// to companions later; for now it's a private reflection tool for the user.
const KEY = 'other_values_v1';

export const VALUE_OPTIONS = [
  'Growth', 'Honesty', 'Kindness', 'Freedom', 'Creativity', 'Connection',
  'Health', 'Adventure', 'Stability', 'Courage', 'Peace', 'Family',
  'Curiosity', 'Justice', 'Playfulness', 'Discipline', 'Gratitude', 'Independence',
];

export function loadValues() {
  try { return JSON.parse(localStorage.getItem(KEY)) || { chosen: [], intention: '' }; }
  catch (e) { return { chosen: [], intention: '' }; }
}
export function saveValues(v) {
  try { localStorage.setItem(KEY, JSON.stringify({ chosen: v.chosen || [], intention: v.intention || '' })); }
  catch (e) { /* ignore */ }
}
