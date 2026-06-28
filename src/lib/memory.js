// Long-term memory: durable, salient facts about the user, extracted from
// conversation, persisted with the session (local + cloud), and injected into
// every companion's system prompt so they remember and follow up naturally —
// like a friend who actually remembers your life, not a chatbot with amnesia.

export const MEMORY_KINDS = ['fact', 'preference', 'event', 'relationship', 'goal', 'emotion'];
const MAX_MEMORIES = 40;

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
  return [...byKey.values()].sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, MAX_MEMORIES);
}

export function removeMemory(list = [], id) {
  return list.filter((m) => m.id !== id);
}

const KIND_LABEL = { fact: 'About you', preference: 'Likes/dislikes', event: 'Events', relationship: 'People', goal: 'Goals', emotion: 'How you\'ve felt' };
export const memoryKindLabel = (k) => KIND_LABEL[k] || 'About you';

// System-prompt block. Concise; flags past-dated events for natural follow-up.
// Never tells the model to recite it — companions should just *know* these.
export function memoryBlock(memories = [], name = 'them', now = nowMs()) {
  const ms = (memories || []).filter((m) => m && m.text);
  if (!ms.length) return '';
  const fmtDate = (t) => { try { return new Date(t).toLocaleDateString(); } catch (e) { return ''; } };
  const lines = ms.slice(0, 24).map((m) => {
    let line = `- ${m.text}`;
    if (m.kind === 'event' && m.at) {
      line += m.at < now
        ? ` (this was around ${fmtDate(m.at)} — if it fits, naturally ask how it went)`
        : ` (coming up around ${fmtDate(m.at)})`;
    }
    return line;
  });
  return `\nWHAT YOU REMEMBER ABOUT ${name}: things they've shared with you before. Weave them in naturally when relevant, the way a close friend would — never recite this list, never say "my notes say" or "I remember that you told me"; just know it.\n${lines.join('\n')}`;
}
