// Astro-timed guidance — a deterministic daily/weekly "cosmic weather" reading
// for the USER (not companion chat), derived from their sun sign + the date. No
// AI or network: same sign + same day always yields the same reading, so it
// feels stable and trustworthy. Flavor, clearly framed as guidance not fact.
import { ZODIAC, cap } from './zodiac.js';

const DAY = 86400000;
export const dayKey = (ts = Date.now()) => new Date(ts).toISOString().slice(0, 10);

// Element flavor used to colour the day's themes.
const EL_THEME = {
  Fire: { focus: ['momentum', 'courage', 'passion', 'leadership'], color: '#e0686f' },
  Earth: { focus: ['grounding', 'follow-through', 'self-care', 'building'], color: '#7bc47f' },
  Air: { focus: ['connection', 'ideas', 'conversation', 'learning'], color: '#8fb8ff' },
  Water: { focus: ['feeling', 'rest', 'intuition', 'creativity'], color: '#9b8cff' },
};

const MOODS = ['a steady', 'an open', 'a bright', 'a tender', 'a bold', 'a quiet', 'a lucky', 'a reflective'];
const LINES = [
  'A good day to start the thing you keep putting off — small step counts.',
  'Say the honest thing gently; someone needs to hear it from you.',
  'Protect your energy: one “no” today makes room for a better “yes”.',
  'Let yourself rest without earning it first. That is the work today.',
  'Reach out to the person you’ve been meaning to text. Timing is warm.',
  'Trust the first instinct — you already know the answer.',
  'Do the boring, grounding task; future-you will feel lighter.',
  'Make space for a little beauty: a walk, a song, a slow coffee.',
];

// Deterministic hash → number in [0,1) from a string.
function seed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}

// The user's reading for a given day. `sign` is a western sign key (e.g. 'leo').
export function dailyGuidance(sign, ts = Date.now()) {
  const key = `${sign || 'unknown'}-${dayKey(ts)}`;
  const z = ZODIAC[sign] || { el: 'Air', sym: '✦', trait: '' };
  const el = EL_THEME[z.el] || EL_THEME.Air;
  const r = seed(key);
  const rating = 2 + Math.floor(seed(key + 'r') * 4);            // 2..5 stars
  const focus = el.focus[Math.floor(seed(key + 'f') * el.focus.length)];
  const mood = MOODS[Math.floor(seed(key + 'm') * MOODS.length)];
  const line = LINES[Math.floor(r * LINES.length)];
  const lucky = ['a splash of', 'a touch of', 'a little more'][Math.floor(seed(key + 'l') * 3)];
  return {
    sign, sym: z.sym, element: z.el, accent: el.color,
    rating, focus, mood, line,
    luckyColor: `${lucky} ${z.el.toLowerCase()} energy`,
    headline: `${cap(mood.replace(/^a[n]? /, ''))} ${z.el.toLowerCase()} day`,
    date: new Date(ts).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }),
  };
}

// A 7-day outlook (today + next 6) as compact bars for the weekly view.
export function weeklyOutlook(sign, ts = Date.now()) {
  const out = [];
  for (let i = 0; i < 7; i++) {
    const t = ts + i * DAY;
    const g = dailyGuidance(sign, t);
    out.push({ day: new Date(t).toLocaleDateString([], { weekday: 'short' }), rating: g.rating, accent: g.accent, focus: g.focus });
  }
  return out;
}
