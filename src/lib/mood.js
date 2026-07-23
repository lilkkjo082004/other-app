// A companion's expressive mood right now — how they're *feeling*, blending
// their own temperament with attunement to the user's recent mood. Drives the
// blob's face, bounciness, and colour warmth (and, lightly, voice tone). Pure +
// deterministic so it's unit-testable.
import { dominantMood } from './evolution.js';

// The user's recent dominant mood -> how a caring companion mirrors/attends it.
const ATTUNE = {
  stressed: { valence: -0.35, energy: 0.5, expression: 'concerned' },
  anxious: { valence: -0.4, energy: 0.55, expression: 'concerned' },
  angry: { valence: -0.3, energy: 0.6, expression: 'concerned' },
  sad: { valence: -0.55, energy: 0.3, expression: 'soft' },      // gentle, present
  lonely: { valence: -0.5, energy: 0.35, expression: 'soft' },
  tired: { valence: -0.05, energy: 0.2, expression: 'sleepy' },
  grateful: { valence: 0.55, energy: 0.5, expression: 'happy' },
  excited: { valence: 0.8, energy: 0.95, expression: 'excited' },
  happy: { valence: 0.55, energy: 0.6, expression: 'happy' },
};

// Baseline lean from a companion's own personality.
function temperament(comp) {
  const t = `${comp?.personality || ''} ${comp?.quirk || ''}`.toLowerCase();
  let v = 0.25, e = 0.5;
  if (/playful|bubbly|energ|excit|goofy|silly|lively|vivac/.test(t)) { v += 0.15; e += 0.25; }
  if (/warm|sweet|affection|nurtur|caring|tender|kind/.test(t)) v += 0.2;
  if (/shy|quiet|reserved|timid/.test(t)) e -= 0.15;
  if (/calm|stoic|dry|aloof|cool|grounded|deadpan|gentle|soft/.test(t)) e -= 0.1;
  return { v, e };
}

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// Returns { valence: -1..1, energy: 0..1, expression, label }.
export function companionMood(comp, history) {
  if (comp && comp.status === 'sleeping') return { valence: 0.1, energy: 0.05, expression: 'sleepy', label: 'sleepy' };
  const base = temperament(comp);
  const dm = dominantMood(history);
  if (dm && ATTUNE[dm]) {
    const a = ATTUNE[dm];
    return {
      valence: clamp(a.valence * 0.7 + base.v * 0.3, -1, 1),
      energy: clamp(a.energy * 0.7 + base.e * 0.3, 0, 1),
      expression: a.expression,
      label: a.expression,
    };
  }
  // No strong signal — settle into a content/happy baseline per temperament.
  const valence = clamp(base.v, -1, 1);
  const energy = clamp(base.e, 0, 1);
  return { valence, energy, expression: valence > 0.35 ? 'happy' : 'content', label: 'content' };
}
