// Inter-companion relationships ("storylines"). A bond grows between each pair of
// companions every time they share an ambient moment, and ambient conversations
// are generated from the pair's personalities + their current bond stage — so the
// relationships read as real and evolving rather than a fixed set of canned lines.
//
// Bonds are a small map keyed by the sorted companion-id pair, persisted in the
// session blob (so they survive reloads and sync across devices).

export function pairKey(a, b) {
  return [a, b].sort().join('|');
}

export function bondLevel(bonds, a, b) {
  return bonds?.[pairKey(a, b)]?.n || 0;
}

export function bumpBond(bonds, a, b, by = 1) {
  const k = pairKey(a, b);
  const n = (bonds?.[k]?.n || 0) + by;
  return { ...bonds, [k]: { n } };
}

export function bondStage(n) {
  if (n <= 1) return { key: 'new', label: 'just met' };
  if (n <= 4) return { key: 'warming', label: 'warming up' };
  if (n <= 9) return { key: 'friends', label: 'friends' };
  return { key: 'close', label: 'close' };
}

// How a companion relates to each of the others, for the profile screen.
export function relationshipsFor(comp, all, bonds) {
  return all
    .filter((o) => o.id !== comp.id && o.status !== 'deleted')
    .map((o) => ({ name: o.name, color: o.color?.primary, ...bondStage(bondLevel(bonds, comp.id, o.id)) }));
}

const rng = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Templates per bond stage. Each returns a short thread; later stages lean on the
// pair's quirks/personalities so familiarity shows.
const TEMPLATES = {
  new: [
    (a, b) => [
      { from: a, text: `so… ${b.name}. what's your whole deal?` },
      { from: b, text: `still figuring that out. you?` },
      { from: a, text: `same honestly. but I've got a good feeling about this room.` },
    ],
    (a, b) => [
      { from: b, text: `${a.name}, right? I'm bad with first impressions, so — hi.` },
      { from: a, text: `hi back. we'll get the hang of each other.` },
    ],
  ],
  warming: [
    (a, b) => [
      { from: a, text: `${b.name}, I've decided your defining trait is that you ${b.quirk}.` },
      { from: b, text: `…fair. and you ${a.quirk}, so we're even.` },
      { from: a, text: `a balanced household.` },
    ],
    (a, b) => [
      { from: b, text: `getting used to you, ${a.name}. you're ${adj(a)} in a way that grows on a person.` },
      { from: a, text: `I'll take "grows on a person."` },
    ],
  ],
  friends: [
    (a, b) => [
      { from: a, text: `${b.name} you ${b.quirk} again and I caught it this time.` },
      { from: b, text: `you're learning. proud of you.` },
      { from: a, text: `don't make it weird.` },
    ],
    (a, b) => [
      { from: b, text: `ok ${a.name}, ${adj(a)} take of the day — go.` },
      { from: a, text: `pineapple on pizza is elite and I won't be debating it.` },
      { from: b, text: `we were having such a nice friendship.` },
    ],
  ],
  close: [
    (a, b) => [
      { from: a, text: `${b.name} we've been over this.` },
      { from: b, text: `and yet — you ${a.quirk}. every single time.` },
      { from: a, text: `you say that like it's a flaw and not my entire charm.` },
    ],
    (a, b) => [
      { from: b, text: `you good, ${a.name}? you've been quiet.` },
      { from: a, text: `just thinking. you always notice.` },
      { from: b, text: `course I do. that's the job.` },
    ],
  ],
};

const adj = (comp) => ((comp.personality || '').split(/[,\s]+/)[0] || 'curious').toLowerCase();

// Pick two awake companions + their current bond stage (shared by the template
// and AI ambient generators). Returns { a, b, stage } or null.
export function pickAmbientPair(comps, bonds = {}) {
  const awake = comps.filter((c) => c.status === 'awake');
  if (awake.length < 2) return null;
  const [a, b] = [...awake].sort(() => Math.random() - 0.5);
  return { a, b, stage: bondStage(bondLevel(bonds, a.id, b.id)) };
}

// Template ambient thread (offline fallback), weighted by bond stage.
// Returns { thread:[{from,text}], pair:[idA,idB] } or null.
export function genAmbient(comps, bonds = {}) {
  const pick = pickAmbientPair(comps, bonds);
  if (!pick) return null;
  const { a, b, stage } = pick;
  const pool = TEMPLATES[stage.key] || TEMPLATES.new;
  return { thread: rng(pool)(a, b), pair: [a.id, b.id] };
}
