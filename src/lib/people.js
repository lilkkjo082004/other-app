// Lightweight "support network" mapping: scans the user's own messages for the
// real people they mention (relationships, optionally a name) so companions can
// gently encourage reaching out to them — not just to the app. Purely derived
// from history; nothing stored.

const REL = 'best friend|friend|sister|brother|mom|mum|mother|dad|father|parents|partner|boyfriend|girlfriend|wife|husband|spouse|roommate|coworker|co-worker|colleague|therapist|counselor|cousin|aunt|uncle|grandma|grandmother|grandpa|grandfather|son|daughter|sibling|family|bestie';
const RE = new RegExp(`\\bmy\\s+(${REL})\\b(?:\\s+(?:named\\s+)?([A-Z][a-z]+))?`, 'g');

// Returns a short, de-duped list like ["sister", "friend Sam", "mom"].
export function extractPeople(history) {
  const found = new Map(); // key -> label
  for (const m of history || []) {
    if (m.role !== 'user' || !m.content) continue;
    let mm;
    RE.lastIndex = 0;
    while ((mm = RE.exec(m.content)) !== null) {
      const rel = mm[1].toLowerCase();
      const name = mm[2];
      const key = name ? `${rel}:${name.toLowerCase()}` : rel;
      if (!found.has(key)) found.set(key, name ? `${rel} ${name}` : rel);
      if (found.size >= 6) break;
    }
    if (found.size >= 6) break;
  }
  return [...found.values()];
}

// Prompt block listing the people the user has mentioned.
export function supportNetworkBlock(history, name) {
  const people = extractPeople(history);
  if (!people.length) return '';
  const who = name || 'they';
  return `\nSUPPORT NETWORK: ${who} has mentioned these real people in their life: ${people.join(', ')}. When it fits — especially if they're low, lonely, or going through something — warmly encourage them to lean on a specific real person here by name, alongside (not instead of) you.`;
}
