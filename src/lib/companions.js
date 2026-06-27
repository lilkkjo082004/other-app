import { ZODIAC } from './zodiac.js';
import { COMP_COLORS } from '../theme.js';

// Self-chosen name pools by zodiac element.
const NP = {
  fire: ['Blaze', 'Phoenix', 'Soleil', 'Kindle', 'Nova', 'Ash', 'Flare', 'Ember'],
  earth: ['Sage', 'Terra', 'Briar', 'Onyx', 'Clay', 'Fern', 'Jasper', 'Moss'],
  air: ['Zephyr', 'Lyra', 'Echo', 'Aero', 'Sky', 'Mist', 'Cirrus', 'Aria'],
  water: ['Tide', 'Luna', 'Coral', 'Rain', 'Brook', 'Pearl', 'Drift', 'Marisol'],
};

const PSEED = [
  { p: 'fiercely loyal with a sharp wit and a soft center', q: 'collects weird facts and drops them at the worst times' },
  { p: 'introspective and quietly funny with an old soul vibe', q: 'rates every sunset out of 10 dead seriously' },
  { p: 'chaotically enthusiastic and infectiously positive', q: 'starts new hobbies weekly and insists each is their calling' },
  { p: 'dry humor, unflinching honesty, secretly deeply caring', q: 'pretends not to remember but remembers everything' },
  { p: "warm, steady, everyone's safe place", q: 'has philosophical opinions about tea' },
  { p: 'playful and provocative, pushes buttons with love', q: 'narrates their own life like a nature documentary' },
  { p: 'creative and dreamy, sees metaphors everywhere', q: 'convinced 3am is the only honest hour' },
  { p: 'bold and opinionated but makes space for others', q: 'ranks everything — restaurants, clouds, laughs' },
  { p: 'gentle and observant, notices what nobody else does', q: 'talks to plants and defends it aggressively' },
];

const PRONOUNS = ['he/him', 'she/her', 'they/them'];

export function genComp(sign, ci, used) {
  const el = ZODIAC[sign].el.toLowerCase();
  const pool = NP[el] || NP.fire;
  const available = pool.filter((n) => !used.includes(n));
  const name = available[Math.floor(Math.random() * available.length)] || pool[0];
  const seed = PSEED[Math.floor(Math.random() * PSEED.length)];
  return {
    id: Math.random().toString(36).slice(2, 8),
    name,
    pronouns: PRONOUNS[Math.floor(Math.random() * PRONOUNS.length)],
    zodiac: sign,
    personality: seed.p,
    quirk: seed.q,
    color: COMP_COLORS[ci % COMP_COLORS.length],
    colorName: COMP_COLORS[ci % COMP_COLORS.length].name,
    status: 'awake',
    builderTraits: null,
    freeText: null,
    voiceIdx: ci,
  };
}
