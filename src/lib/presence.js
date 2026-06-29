// Companion "presence": a light, personality-flavored sense of what a companion
// is doing right now when you're not actively chatting — so they feel like they
// have lives of their own. Deterministic per companion + time bucket (changes
// roughly every 40 min), so it's stable within a sitting and free (no API).

const GENERIC = [
  'drifting through a daydream', 'watching the stars', 'lost in thought',
  'humming to themselves', 'somewhere quiet', 'people-watching the cosmos',
  'sketching shapes in the dark', 'turning an idea over', 'just vibing',
];
const BY_TRAIT = {
  creative: ['chasing a melody', 'reworking a poem in their head', 'imagining new colours', 'doodling constellations'],
  calm: ['breathing slow somewhere still', 'watching light move', 'in a quiet meditation', 'tending a little plant'],
  energetic: ['bouncing between ideas', 'itching to do something', 'replaying a hype song', 'pacing with excitement'],
  playful: ['plotting a harmless prank', 'giggling at a private joke', 'inventing a silly game', 'teasing no one in particular'],
  curious: ['reading something strange', 'asking the universe questions', 'down a rabbit hole', 'taking an idea apart'],
  warm: ['thinking about you', 'keeping a thought warm for you', 'wondering how you are', 'saving a story for you'],
};

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function traitOf(comp) {
  const t = `${comp.personality || ''} ${comp.quirk || ''} ${comp.builderTraits ? Object.values(comp.builderTraits).flat().join(' ') : ''}`.toLowerCase();
  const has = (...w) => w.some((x) => t.includes(x));
  if (has('creativ', 'artist', 'dreamy', 'poet', 'imaginat', 'musical')) return 'creative';
  if (has('calm', 'grounded', 'serene', 'gentle', 'quiet', 'stoic', 'patient')) return 'calm';
  if (has('energ', 'bold', 'fiery', 'bubbly', 'excit', 'vivac', 'wild')) return 'energetic';
  if (has('playful', 'mischiev', 'witty', 'funny', 'goofy', 'teas', 'silly')) return 'playful';
  if (has('curious', 'clever', 'analy', 'inquis', 'thinker', 'nerd')) return 'curious';
  if (has('warm', 'affection', 'nurtur', 'caring', 'loving', 'sweet', 'tender')) return 'warm';
  return null;
}

// Sleeping companions read as resting; otherwise pick from the companion's
// trait pool blended with generic + an occasional "thinking about you".
export function currentActivity(comp, now = Date.now()) {
  if (!comp) return '';
  if (comp.status === 'sleeping') return 'resting';
  const bucket = Math.floor(now / (40 * 60 * 1000));
  const pool = [...GENERIC, ...(BY_TRAIT[traitOf(comp)] || []), ...BY_TRAIT.warm.slice(0, 2)];
  const idx = hashStr(`${comp.id || comp.name}|${bucket}`) % pool.length;
  return pool[idx];
}
