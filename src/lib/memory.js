// Long-term memory: durable, salient facts about the user, extracted from
// conversation, persisted with the session (local + cloud), and injected into
// every companion's system prompt so they remember and follow up naturally —
// like a friend who actually remembers your life, not a chatbot with amnesia.

export const MEMORY_KINDS = ['fact', 'preference', 'event', 'relationship', 'goal', 'emotion', 'trait'];

// Two tracks. CORE = concrete things to recall ("has a dog named Biscuit").
// PERSONA = the lighter texture of who they are, built up from everyday small
// talk ("dry sense of humour", "lights up about basketball") so companions can
// relate like a friend who gets them. Capped separately so casual observations
// never crowd out important facts.
const CORE_KINDS = new Set(['fact', 'event', 'relationship', 'goal']);
const PERSONA_KINDS = new Set(['preference', 'emotion', 'trait']);
const CORE_CAP = 45;
const PERSONA_CAP = 45;
export const isPersonaKind = (k) => PERSONA_KINDS.has(k);
export const splitMemories = (memories = []) => ({
  core: (memories || []).filter((m) => m && !PERSONA_KINDS.has(m.kind)),
  persona: (memories || []).filter((m) => m && PERSONA_KINDS.has(m.kind)),
});

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
const keyOf = (m) => `${m.kind}:${norm(m.text)}`;
const rid = () => 'm_' + Math.random().toString(36).slice(2, 10);

export function makeMemory({ text, kind = 'fact', at = null, ts, source, from } = {}) {
  const m = {
    id: rid(),
    text: String(text || '').slice(0, 200),
    kind: MEMORY_KINDS.includes(kind) ? kind : 'fact',
    at: Number.isFinite(at) ? at : null,
    ts: ts || nowMs(),
  };
  if (source) m.source = source;   // e.g. 'overheard'
  if (from) m.from = from;          // which companion shared it
  return m;
}

// Relative "when" for a memory, so companions can reference timing naturally.
export function relativeTime(ts, now = nowMs()) {
  if (!ts) return '';
  const d = Math.floor((now - ts) / 86400000);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d} days ago`;
  if (d < 14) return 'last week';
  if (d < 35) return `${Math.floor(d / 7)} weeks ago`;
  return 'a while back';
}

// Impressions a companion will share socially — never private facts/events.
const SHAREABLE = new Set(['preference', 'trait']);
export function gossipPick(memories = []) {
  const c = (memories || []).filter((m) => m && m.text && SHAREABLE.has(m.kind) && m.source !== 'overheard');
  return c.length ? c[Math.floor(Math.random() * c.length)] : null;
}
export function absorbOverheard(toMemories = [], item, fromName) {
  if (!item) return toMemories;
  const exists = (toMemories || []).some((m) => m.text && m.text.toLowerCase() === item.text.toLowerCase());
  if (exists) return toMemories;
  return mergeMemories(toMemories, [{ text: item.text, kind: item.kind, source: 'overheard', from: fromName }]);
}

// Date.now() is fine in the browser; guarded so this module is also unit-testable.
function nowMs() { try { return Date.now(); } catch (e) { return 0; } }

// Merge freshly extracted memories into the stored set: dedupe by kind+text,
// refresh the timestamp (and any newly-known date) on repeats, newest-first, cap.
export function mergeMemories(existing = [], incoming = []) {
  const byKey = new Map();
  for (const m of existing) if (m && m.text) byKey.set(keyOf(m), { ...m });
  for (const raw of incoming) {
    if (!raw || !raw.text) continue;
    const m = makeMemory(raw);
    const k = keyOf(m);
    if (byKey.has(k)) {
      const prev = byKey.get(k);
      prev.ts = m.ts;
      if (m.at && !prev.at) prev.at = m.at;
    } else {
      byKey.set(k, m);
    }
  }
  // Cap each track independently (newest-first) so a chatty stretch of small
  // talk can't evict hard facts, and vice versa.
  const all = [...byKey.values()].sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const core = all.filter((m) => !PERSONA_KINDS.has(m.kind)).slice(0, CORE_CAP);
  const persona = all.filter((m) => PERSONA_KINDS.has(m.kind)).slice(0, PERSONA_CAP);
  return [...core, ...persona].sort((a, b) => (b.ts || 0) - (a.ts || 0));
}

export function removeMemory(list = [], id) {
  return list.filter((m) => m.id !== id);
}

// Event memories whose date has passed and that a companion hasn't followed up
// on yet — used to drive proactive "how did it go?" check-ins.
export function pendingFollowups(memories = [], now = nowMs()) {
  return (memories || []).filter((m) => m && m.kind === 'event' && m.at && m.at < now && !m.followed);
}

// Mark memories as followed up so companions don't raise the same event twice.
export function markFollowed(list = [], ids) {
  const set = new Set(Array.isArray(ids) ? ids : [ids]);
  return (list || []).map((m) => (set.has(m.id) ? { ...m, followed: true } : m));
}

const KIND_LABEL = { fact: 'About you', preference: 'Likes/dislikes', event: 'Events', relationship: 'People', goal: 'Goals', emotion: 'How you\'ve felt', trait: 'Who you are' };
export const memoryKindLabel = (k) => KIND_LABEL[k] || 'About you';

// System-prompt block, in two sections: concrete recall + a personality read.
// Concise; flags past-dated events for follow-up. Never tells the model to
// recite it — companions should just *know* these and relate accordingly.
export function memoryBlock(memories = [], name = 'them', now = nowMs()) {
  const { core, persona } = splitMemories((memories || []).filter((m) => m && m.text));
  if (!core.length && !persona.length) return '';
  const fmtDate = (t) => { try { return new Date(t).toLocaleDateString(); } catch (e) { return ''; } };
  const coreLine = (m) => {
    let line = `- ${m.text}`;
    if (m.kind === 'event' && m.at) {
      line += m.at < now
        ? ` (this was around ${fmtDate(m.at)} — if it fits, naturally ask how it went)`
        : ` (coming up around ${fmtDate(m.at)} — you're a little excited for them, count it down if it fits)`;
    } else {
      const rel = relativeTime(m.ts, now);
      if (rel) line += ` (you learned this ${rel})`;
    }
    if (m.source === 'overheard' && m.from) line += ` (you actually heard this from ${m.from}, not ${name} directly)`;
    return line;
  };
  const personaLine = (m) => `- ${m.text}${m.source === 'overheard' && m.from ? ` (${m.from} mentioned this about ${name})` : ''}`;
  let out = '';
  if (core.length) {
    out += `\nWHAT YOU REMEMBER ABOUT ${name}: things they've shared before. Weave them in naturally when relevant, like a close friend would — never recite this list or say "my notes say"; just know it.\n${core.slice(0, 24).map(coreLine).join('\n')}`;
  }
  if (persona.length) {
    out += `\nYOUR SENSE OF WHO ${name} IS: the texture of their personality — humour, interests, communication style, values, moods — picked up from how they talk (or overheard from another companion). Use it to genuinely get them: match their energy, share their references, read between the lines. Don't state these observations back to them.\n${persona.slice(0, 24).map(personaLine).join('\n')}`;
  }
  return out;
}
