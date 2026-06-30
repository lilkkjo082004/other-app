// Deeper long-term recall: given the older portion of a transcript (everything
// before the recent window) and the user's latest line, surface a few on-topic
// older messages so a companion can reference a conversation from weeks or
// months ago — not just the distilled memory. Keyword overlap only; no network
// or embeddings, so it's instant and free. The result is a plain-text block
// appended to the system prompt.

const STOP = new Set('this that with have your they them then than what when where which while there here just like dont cant wont about really very much some yours mine ours their from into over also been being were will would could should because around still even ever'.split(/\s+/));

export function tokens(s) {
  return (s || '').toLowerCase().match(/[a-z][a-z']{3,}/g)?.filter((w) => !STOP.has(w)) || [];
}

export function recallBlock(older = [], queryText = '', name = 'they') {
  if (!older.length) return '';
  const q = new Set(tokens(queryText));
  if (q.size < 2) return '';
  const scored = older
    .filter((m) => m.content && (m.role === 'user' || m.role === 'assistant' || m.companion))
    .map((m) => ({ m, score: tokens(m.content).reduce((n, w) => n + (q.has(w) ? 1 : 0), 0) }))
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .sort((a, b) => (a.m.ts || 0) - (b.m.ts || 0));
  if (!scored.length) return '';
  const when = (ts) => { try { return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' }); } catch (e) { return 'earlier'; } };
  const lines = scored.map(({ m }) => {
    const who = m.role === 'user' ? (name || 'They') : (m.companion?.name || 'You');
    return `- (${when(m.ts)}) ${who}: ${String(m.content).replace(/\s+/g, ' ').slice(0, 160)}`;
  });
  return `Earlier exchanges that may be relevant to what ${name || 'they'} just said (recalled from older history — reference naturally only if it fits):\n${lines.join('\n')}`;
}
