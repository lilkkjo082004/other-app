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

export function journalDue(comp, history, now = Date.now()) {
  const last = comp?.journal?.[0]?.ts || 0;
  const userMsgs = (history || []).filter((m) => m.role === 'user').length;
  return userMsgs >= 3 && now - last > 10 * 60 * 60 * 1000; // after some chat, ~10h apart
}
export function addJournal(comp, text, now = Date.now()) {
  return [{ ts: now, text: String(text || '').slice(0, 400) }, ...(comp?.journal || [])].slice(0, 30);
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
  out += `\nRIGHT NOW you feel ${inner.mood}, ${inner.energy} energy, mind half on ${inner.preoccupation}. Let it subtly color your tone and what you bring up — never announce it like a status update.`;
  out += `\nWITH ${who}: ${stage.label}. ${stage.guide}`;
  return out;
}
