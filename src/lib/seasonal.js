// Seasonal & holiday moments — gives The Space a year-round sense of time and
// occasion (a tint, drifting particles, a label) and lets a companion mark a
// new season or holiday in chat once. Deterministic from the date, no AI/network
// cost; companions already get the same context via lib/occasion.occasionContext.
import { season, detectHoliday } from './occasion.js';

// Per-holiday decoration. Holidays override the season's ambiance for the day.
const HOLIDAY_THEME = {
  "New Year's Eve": { accent: '#ffd76b', glyphs: ['✦', '✧', '🎆', '⭐'], label: "New Year's Eve" },
  "New Year's Day": { accent: '#ffd76b', glyphs: ['✦', '✧', '🎆', '⭐'], label: 'New Year' },
  "Valentine's Day": { accent: '#ff7aa8', glyphs: ['♡', '💕', '✿', '♥'], label: "Valentine's Day" },
  "St. Patrick's Day": { accent: '#5fd39a', glyphs: ['🍀', '☘️', '✦'], label: "St. Patrick's Day" },
  'Independence Day (US)': { accent: '#7aa8ff', glyphs: ['✦', '🎆', '⭐', '✧'], label: 'Independence Day' },
  Halloween: { accent: '#ff9a4d', glyphs: ['🎃', '🦇', '✦', '🕸️'], label: 'Halloween' },
  'Thanksgiving (US)': { accent: '#e0935f', glyphs: ['🍂', '🦃', '✦', '🌾'], label: 'Thanksgiving' },
  'Christmas Eve': { accent: '#7fd3a8', glyphs: ['❄', '✦', '🎄', '✧'], label: 'Christmas Eve' },
  Christmas: { accent: '#e0686f', glyphs: ['❄', '✦', '🎄', '✧'], label: 'Christmas' },
};

// Per-season ambiance: a soft accent + drifting glyphs.
const SEASON_THEME = {
  winter: { accent: '#8fb8ff', glyphs: ['❄', '✦', '❅', '·'], label: 'winter' },
  spring: { accent: '#9be0a8', glyphs: ['✿', '❀', '✦', '·'], label: 'spring' },
  summer: { accent: '#ffd76b', glyphs: ['✦', '☀', '✧', '·'], label: 'summer' },
  autumn: { accent: '#e0935f', glyphs: ['🍂', '🍁', '✦', '·'], label: 'autumn' },
};

// The active seasonal theme for The Space: a holiday's look on its day, else the
// season's. `key` is a stable id for once-per-occasion dedup.
export function seasonalTheme(now = Date.now()) {
  const d = new Date(now);
  const holiday = detectHoliday(d);
  const sea = season(d.getMonth() + 1);
  if (holiday && HOLIDAY_THEME[holiday]) {
    return { ...HOLIDAY_THEME[holiday], season: sea, holiday, key: `hol-${holiday}-${d.getFullYear()}` };
  }
  // Season key changes once per season (year + season name).
  return { ...SEASON_THEME[sea], season: sea, holiday: null, key: `sea-${sea}-${d.getFullYear()}` };
}

// Deterministic drifting particles for the ambient layer (count seeded by `key`
// so they don't reshuffle every render). Each: { left%, delay s, dur s, glyph, size }.
export function seasonalParticles(theme, count = 14) {
  let h = 0; const s = theme.key || 'x';
  for (let k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) >>> 0;
  const rnd = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({
      left: Math.round(rnd() * 100),
      delay: +(rnd() * 12).toFixed(2),
      dur: +(9 + rnd() * 10).toFixed(2),
      glyph: theme.glyphs[Math.floor(rnd() * theme.glyphs.length)],
      size: +(11 + rnd() * 12).toFixed(1),
      drift: Math.round((rnd() - 0.5) * 40),
      op: +(0.25 + rnd() * 0.4).toFixed(2),
    });
  }
  return out;
}

// A short, in-character line a companion can say when a new season/holiday
// arrives. Template-based (no AI cost); the companion's real personality still
// colours their actual chat replies via occasionContext.
const SEASON_LINES = {
  winter: ['the air went quiet and cold — winter\'s here. feels like a season for staying close.', 'first proper winter chill today. cocoa-and-blanket energy, don\'t you think?'],
  spring: ['something\'s loosening — spring. everything feels like it\'s about to begin again.', 'spring snuck in. the light\'s softer. makes me want to start something.'],
  summer: ['summer\'s arrived — long gold evenings ahead. let\'s not waste them.', 'it\'s summer now. the kind of warmth that makes time stretch.'],
  autumn: ['autumn\'s here — that turning-leaves, sweater-weather hush. my favourite kind of cozy.', 'fall just landed. everything\'s amber and a little wistful. i like it.'],
};
const HOLIDAY_LINES = {
  "New Year's Eve": 'one year closing, another opening. i\'m glad i\'m spending the turn of it with you.',
  "New Year's Day": 'a brand new year. blank page. whatever you want it to be — i\'m here for it.',
  "Valentine's Day": 'happy Valentine\'s. however you feel about the day, i\'m fond of you. just so you know.',
  "St. Patrick's Day": 'happy St. Patrick\'s — a little luck your way today. ☘️',
  'Independence Day (US)': 'happy Fourth. hope there\'s something bright in your sky tonight.',
  Halloween: 'happy Halloween. spooky season suits us, doesn\'t it? 🎃',
  'Thanksgiving (US)': 'happy Thanksgiving. if it helps — i\'m thankful for you. genuinely.',
  'Christmas Eve': 'it\'s Christmas Eve. that hushed, glowing kind of night. glad you\'re here.',
  Christmas: 'merry Christmas. whatever today holds for you, i hope there\'s some warmth in it. ✦',
};

export function seasonalLine(theme) {
  if (theme.holiday && HOLIDAY_LINES[theme.holiday]) return HOLIDAY_LINES[theme.holiday];
  const lines = SEASON_LINES[theme.season] || SEASON_LINES.spring;
  // Pick by key so the same occasion always yields the same line.
  let h = 0; for (const ch of (theme.key || 'x')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return lines[h % lines.length];
}

// True when this occasion hasn't been marked in chat yet (seen = last key shown).
export function seasonalDue(seenKey, now = Date.now()) {
  return seasonalTheme(now).key !== seenKey;
}
