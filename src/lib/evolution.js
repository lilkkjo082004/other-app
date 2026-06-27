// Lightweight relationship/personality evolution derived from the (persisted,
// cloud-synced) conversation history — no extra storage needed. Feeds the
// companion system prompt so real-AI responses adapt over time, and powers the
// "bond" readout on the profile screen.

const MOODS = [
  ['stressed', ['stressed', 'overwhelmed', 'too much', 'pressure', "can't cope", 'swamped']],
  ['anxious', ['anxious', 'nervous', 'scared', 'afraid', 'dread', 'worried', 'panic']],
  ['sad', ['sad', 'down', 'depressed', 'unhappy', 'crying', 'cry', 'miserable', 'hopeless', 'empty', 'heartbroken']],
  ['tired', ['tired', 'exhausted', 'drained', 'burnt out', 'burned out', 'no energy', 'sleepy']],
  ['lonely', ['lonely', 'alone', 'isolated', 'nobody', 'no one']],
  ['angry', ['angry', 'furious', 'pissed', 'annoyed', 'frustrated', 'mad', 'irritated']],
  ['grateful', ['grateful', 'thankful', 'appreciate', 'blessed']],
  ['excited', ['excited', 'amazing', 'awesome', 'thrilled', 'hyped', "can't wait", 'stoked', 'pumped', 'best day']],
  ['happy', ['happy', 'good', 'great', 'glad', 'content', 'calm', 'peaceful', 'relaxed', 'wonderful']],
];

export function detectMood(text) {
  const m = (text || '').toLowerCase();
  for (const [mood, words] of MOODS) {
    if (words.some((w) => m.includes(w))) return mood;
  }
  return null;
}

export function familiarity(count) {
  if (count <= 3) return { stage: 'new', label: 'just met', guidance: "It's still early — be warm and curious; don't assume shared history you don't have." };
  if (count <= 15) return { stage: 'learning', label: 'getting to know each other', guidance: "You're learning who they are; reference small things they've told you." };
  if (count <= 50) return { stage: 'comfortable', label: 'comfortable together', guidance: 'You have real rapport — be candid and playful, and call back to earlier conversations.' };
  return { stage: 'close', label: 'close', guidance: 'You know each other well — be direct and affectionate in your own way, and unafraid to push back.' };
}

export function userMessageCount(history) {
  return (history || []).filter((m) => m.role === 'user').length;
}

// Dominant mood across recent user messages (needs >= 2 to count as a pattern).
export function dominantMood(history) {
  const users = (history || []).filter((m) => m.role === 'user').slice(-20);
  const counts = {};
  for (const u of users) {
    const md = detectMood(u.content);
    if (md) counts[md] = (counts[md] || 0) + 1;
  }
  let top = null, n = 0;
  for (const [k, v] of Object.entries(counts)) if (v > n) { top = k; n = v; }
  return n >= 2 ? top : null;
}

// Bundle for the profile "bond" card.
export function bondInfo(history) {
  const messages = userMessageCount(history);
  return { messages, ...familiarity(messages), recentMood: dominantMood(history) };
}

// Text block appended to the companion system prompt.
export function evolutionBlock(profile, history) {
  const n = userMessageCount(history);
  if (n === 0) return '';
  const f = familiarity(n);
  const dm = dominantMood(history);
  const name = profile.name || 'they';
  let s = `\n\nRELATIONSHIP & PATTERNS\nYou and ${name} have exchanged about ${n} message${n === 1 ? '' : 's'} — ${f.label}. ${f.guidance}`;
  if (dm) s += ` Lately ${name} has often seemed ${dm}; be attuned to that without naming it outright.`;
  return s;
}
