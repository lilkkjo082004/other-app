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

export function makeMemory({ text, kind = 'fact', at = null, ts } = {}) {
  return {
    id: rid(),
    text: String(text || '').slice(0, 200),
    kind: MEMORY_KINDS.includes(kind) ? kind : 'fact',
    at: Number.isFinite(at) ? at : null,
    ts: ts || nowMs(),
  };
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
        : ` (coming up around ${fmtDate(m.at)})`;
    }
    return line;
  };
  let out = '';
  if (core.length) {
    out += `\nWHAT YOU REMEMBER ABOUT ${name}: things they've shared before. Weave them in naturally when relevant, like a close friend would — never recite this list or say "my notes say"; just know it.\n${core.slice(0, 24).map(coreLine).join('\n')}`;
  }
  if (persona.length) {
    out += `\nYOUR SENSE OF WHO ${name} IS: the texture of their personality — humour, interests, communication style, values, moods — picked up from how they talk. Use it to genuinely get them: match their energy, share their references, read between the lines. Don't state these observations back to them.\n${persona.slice(0, 24).map((m) => `- ${m.text}`).join('\n')}`;
  }
  return out;
}
