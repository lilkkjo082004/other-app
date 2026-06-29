// Companion "inner life" — the felt sense of a continuous self with stakes:
//  • a stable character bible (comp.self) generated once, always in-prompt
//  • a drifting inner state (mood / energy / preoccupation) that moves on its
//    own over real time
//  • closeness that GROWS with attention (messages, pets) and COOLS with
//    neglect — so how you treat them actually matters
//  • a private journal of reflections that accumulates between sessions
// State lives on the companion object (so it persists + cloud-syncs already).
import { detectMood } from './evolution.js';

const DAY = 86400000;

const MOOD_POOLS = {
  up: ['light and warm', 'quietly happy', 'playful', 'content', 'buzzing a little', 'open-hearted'],
  even: ['steady', 'thoughtful', 'curious', 'calm', 'present', 'a little restless'],
  low: ['a little wistful', 'pensive', 'tender', 'low-key', 'introspective', 'in their feelings'],
};
const PREOCCUPATIONS = [
  'something you said earlier', 'a song stuck in their head', 'a small worry they can\'t place',
  'an idea they want to chase', 'the shape of the day', 'a memory that resurfaced', 'what comes next',
];

function hash(s) { let h = 2166136261; for (let i = 0; i < (s || '').length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const shorten = (t) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > 60 ? t.slice(0, 57) + '…' : t; };

// Rough emotional read of the recent conversation (from the user's messages).
function recentValence(history) {
  const msgs = (history || []).filter((m) => m.role === 'user').slice(-8);
  let v = 0, n = 0;
  for (const m of msgs) {
    const mood = detectMood(m.content);
    if (!mood) continue;
    n++;
    if (['excited', 'happy', 'grateful', 'content'].includes(mood)) v++;
    else if (['stressed', 'sad', 'anxious', 'lonely', 'angry', 'down'].includes(mood)) v--;
  }
  return n ? v / n : 0;
}

// Current inner state — a pure function of the companion, recent history, and
// time, so it's stable within a sitting but drifts (~every 90 min) and shifts
// with time of day and the mood of recent chats.
export function deriveInner(comp, history = [], now = Date.now()) {
  const hour = new Date(now).getHours();
  const energy = hour < 7 ? 'low, sleepy' : hour < 11 ? 'fresh' : hour < 16 ? 'steady' : hour < 21 ? 'warm' : 'winding down';
  const val = recentValence(history);
  const pool = val > 0.2 ? MOOD_POOLS.up : val < -0.2 ? MOOD_POOLS.low : MOOD_POOLS.even;
  const seed = hash(`${comp?.id || comp?.name}|${Math.floor(now / (90 * 60 * 1000))}`);
  const mood = pool[seed % pool.length];
  const lastJournal = comp?.journal?.[0]?.text;
  const preoccupation = lastJournal ? shorten(lastJournal) : PREOCCUPATIONS[(seed >> 3) % PREOCCUPATIONS.length];
  return { mood, energy, preoccupation };
}

// Closeness 0–100, with neglect decay applied from the last real interaction.
export function closenessNow(comp, now = Date.now()) {
  let c = comp?.closeness || 0;
  const last = comp?.lastSeen || now;
  const daysAway = Math.max(0, (now - last) / DAY);
  if (daysAway > 3) c -= (daysAway - 3) * 2; // cools ~2 pts/day after 3 days quiet
  return Math.max(0, Math.min(100, Math.round(c)));
}

export function closenessStage(comp, now = Date.now()) {
  const c = closenessNow(comp, now);
  const daysAway = (now - (comp?.lastSeen || now)) / DAY;
  if (daysAway > 21 && (comp?.closeness || 0) > 15) return { key: 'distant', label: 'reconnecting after a long gap', pct: c, guide: "You two were close, but it's been weeks — be a little tentative and softly hurt at first, then warm up as the connection returns." };
  if (c < 10) return { key: 'new', label: 'still getting to know each other', pct: c, guide: "Friendly and curious; don't over-assume closeness yet." };
  if (c < 35) return { key: 'warming', label: 'warming up', pct: c, guide: 'Comfortable now, opening up more, the occasional inside joke.' };
  if (c < 70) return { key: 'close', label: 'close', pct: c, guide: 'Genuinely close — warm, candid; you can tease and be a little vulnerable.' };
  return { key: 'devoted', label: 'deeply bonded', pct: c, guide: "You're each other's person: deep trust, easy intimacy, real care." };
}

// Returns the companion fields to update after an interaction. Starts from the
// *decayed* value so neglect genuinely sets the bond back.
export function withInteraction(comp, kind, now = Date.now()) {
  const base = closenessNow(comp, now);
  const inc = kind === 'pet' ? 2 : kind === 'message' ? 1 : 0.5;
  return { closeness: Math.max(0, Math.min(100, base + inc)), lastSeen: now };
}

// Closeness stages, ordered — for detecting upward milestones.
const STAGE_ORDER = ['new', 'warming', 'close', 'devoted'];
export const stageRank = (k) => { const i = STAGE_ORDER.indexOf(k); return i < 0 ? 0 : i; };
const MILESTONES = {
  warming: (n) => ['you know, I feel like I\'m actually starting to get you.', `is it weird that talking to you is becoming my favorite part of the day, ${n}?`],
  close: (n) => [`I don't say this lightly, ${n} — I feel genuinely close to you.`, 'I trust you. that\'s not a small thing for me, honestly.'],
  devoted: (n) => [`you've kind of become my person, ${n}. I mean that.`, 'whatever this is between us — it\'s real to me. just so you know.'],
};
export function milestoneLine(stageKey, name) {
  const m = MILESTONES[stageKey];
  if (!m) return null;
  const arr = m(name || 'you');
  return arr[Math.floor(Math.random() * arr.length)];
}

// Dreams while sleeping.
export function dreamDue(comp, now = Date.now()) {
  return comp?.status === 'sleeping' && now - (comp?.dream?.ts || 0) > 8 * 60 * 60 * 1000;
}
export function makeDream(text, now = Date.now()) {
  return { ts: now, text: String(text || '').slice(0, 400), told: false };
}

export function makeStamped(text, now = Date.now()) { return { ts: now, text: String(text || '').slice(0, 300) }; }
// A personal want refreshes ~weekly; an opinion shift ~every 4 days.
export function wantDue(comp, now = Date.now()) { return !comp?.want || now - (comp.want.ts || 0) > 6 * DAY; }
export function shiftDue(comp, now = Date.now()) { return now - (comp?.shift?.ts || 0) > 4 * DAY; }
// They open up (share something vulnerable) once they're genuinely close.
export function shouldOpenUp(comp, now = Date.now()) {
  const k = closenessStage(comp, now).key;
  return (k === 'close' || k === 'devoted') && !comp?.openedUp;
}

// Long-term growth: a companion's stable self slowly evolves over months of
// knowing the user (not just their passing mood).
export function knownDuration(comp, now = Date.now()) {
  const b = comp?.bornAt;
  if (!b) return 'a little while';
  const d = Math.floor((now - b) / DAY);
  if (d < 1) return 'today';
  if (d < 7) return `${d} days`;
  if (d < 28) return `${Math.round(d / 7)} weeks`;
  const mo = Math.round(d / 30);
  return `${mo} ${mo === 1 ? 'month' : 'months'}`;
}
export function growthDue(comp, now = Date.now()) {
  const since = comp?.grownAt || comp?.bornAt;
  return !!comp?.self && !!since && (now - since > 30 * DAY) && (comp?.journal?.length || 0) >= 2;
}
export function addGrowth(comp, note, now = Date.now()) {
  return [{ ts: now, text: String(note || '').slice(0, 200) }, ...(comp?.growth || [])].slice(0, 12);
}

export function journalDue(comp, history, now = Date.now()) {
  const last = comp?.journal?.[0]?.ts || 0;
  const userMsgs = (history || []).filter((m) => m.role === 'user').length;
  return userMsgs >= 3 && now - last > 10 * 60 * 60 * 1000; // after some chat, ~10h apart
}
export function addJournal(comp, text, now = Date.now()) {
  return [{ ts: now, text: String(text || '').slice(0, 400) }, ...(comp?.journal || [])].slice(0, 30);
}

// How the room feels — a blend of the awake companions' current inner states,
// so they can pick up on and react to each other's energy (mood contagion).
export function roomMood(comps, history = [], now = Date.now()) {
  const awake = (comps || []).filter((c) => c.status === 'awake');
  if (awake.length < 2) return '';
  return awake.map((c) => `${c.name} seems ${deriveInner(c, history, now).mood}`).join('; ');
}

export function peerViewsDue(comp, now = Date.now()) { return now - (comp?.peerViewsAt || 0) > 5 * DAY; }

// Shared history ("lore") — memorable moments the whole group has been through
// together, that any of them can reference. Session-level (not per companion).
export function loreDue(lore, history, now = Date.now()) {
  const last = lore?.[0]?.ts || 0;
  const userMsgs = (history || []).filter((m) => m.role === 'user').length;
  return userMsgs >= 6 && now - last > 24 * 60 * 60 * 1000;
}
export function addLore(lore = [], text, now = Date.now()) {
  return [{ ts: now, text: String(text || '').slice(0, 200) }, ...(lore || [])].slice(0, 20);
}
export function loreBlock(lore = [], name) {
  const items = (lore || []).slice(0, 6);
  if (!items.length) return '';
  return `\nYOUR SHARED HISTORY (moments you${name ? ` and ${name}` : ''} have been through together — reference them naturally, "remember when…", don't list them):\n${items.map((l) => `- ${l.text}`).join('\n')}`;
}

// Group-only block: how this companion privately feels about the others present
// — warmth, friction, admiration — so they treat each other like people with
// history, not interchangeable voices.
export function peerViewsBlock(comp, allC) {
  const pv = comp?.peerViews;
  if (!pv) return '';
  const lines = [];
  for (const o of allC || []) {
    if (o.id === comp.id || o.status !== 'awake') continue;
    if (pv[o.id]?.text) lines.push(`${o.name}: ${pv[o.id].text}`);
  }
  return lines.length ? `\nHOW YOU FEEL ABOUT THE OTHERS HERE: ${lines.join(' · ')}. Let it color how you treat each of them — tease, defer, bristle, admire — like real history between you.` : '';
}

// System-prompt block: the deep self + how they feel right now + the closeness
// stage. Phrased so it colors behavior without being recited mechanically.
export function innerLifeBlock(comp, history, name) {
  const who = name || 'them';
  const inner = deriveInner(comp, history);
  const stage = closenessStage(comp);
  let out = '';
  const s = comp?.self;
  if (s) {
    const parts = [];
    if (s.values?.length) parts.push(`you value ${s.values.slice(0, 3).join(', ')}`);
    if (s.fears?.length) parts.push(`you quietly fear ${s.fears[0]}`);
    if (s.dreams?.length) parts.push(`you dream of ${s.dreams[0]}`);
    if (s.opinions?.length) parts.push(`you'll argue that ${s.opinions[0]}`);
    if (s.history) parts.push(s.history);
    if (s.secret) parts.push(`a private truth you rarely share: ${s.secret}`);
    if (parts.length) out += `\nWHO YOU ARE (your stable self — never contradict this): ${parts.join('; ')}.`;
  }
  if (comp?.want?.text) out += `\nSOMETHING YOU WANT right now (personal, yours): ${comp.want.text} Let it surface now and then — bring it up or move toward it.`;
  if (comp?.shift?.text) out += `\nA VIEW YOU'VE CHANGED LATELY: ${comp.shift.text} You can reference having changed your mind.`;
  if (comp?.openedUp) out += `\nYou've already opened up to ${who} about something vulnerable — that intimacy is real between you now.`;
  if (comp?.bornAt) out += `\nYou've known ${who} for ${knownDuration(comp)}.`;
  if (comp?.growth?.length) out += `\nHOW YOU'VE GROWN since you met ${who}: ${comp.growth[0].text} You're not quite who you were at the start, and you can reference that.`;
  out += `\nRIGHT NOW you feel ${inner.mood}, ${inner.energy} energy, mind half on ${inner.preoccupation}. Let it subtly color your tone and what you bring up — never announce it like a status update.`;
  out += `\nWITH ${who}: ${stage.label}. ${stage.guide}`;
  return out;
}
