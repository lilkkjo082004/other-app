import { ZODIAC } from './zodiac.js';
import { COMP_COLORS } from '../theme.js';

// Self-chosen name pools by zodiac element. Evocative, mostly gender-neutral
// (pronouns are chosen separately) and on-theme for a cosmic companion.
const NP = {
  fire: ['Blaze', 'Phoenix', 'Soleil', 'Kindle', 'Nova', 'Ash', 'Flare', 'Ember', 'Cinder', 'Ignis', 'Solene', 'Helio', 'Seraph', 'Aurelio', 'Vesta', 'Pyra', 'Ravi', 'Cael', 'Torin', 'Scarlet', 'Sunny', 'Dahlia', 'Aiden', 'Sol', 'Calla', 'Brand', 'Tindra', 'Surya', 'Roan', 'Amaris'],
  earth: ['Sage', 'Terra', 'Briar', 'Onyx', 'Clay', 'Fern', 'Jasper', 'Moss', 'Hazel', 'Slate', 'Linden', 'Reed', 'Olive', 'Bracken', 'Cobalt', 'Juniper', 'Flint', 'Rowan', 'Bay', 'Marlow', 'Garnet', 'Dune', 'Ivy', 'Bramble', 'Heath', 'Cedar', 'Vale', 'Thorne', 'Petra', 'Aspen'],
  air: ['Zephyr', 'Lyra', 'Echo', 'Aero', 'Sky', 'Mist', 'Cirrus', 'Aria', 'Caelum', 'Wren', 'Vesper', 'Nimbus', 'Halcyon', 'Aura', 'Sora', 'Iris', 'Lark', 'Gale', 'Cielo', 'Astra', 'Storm', 'Wisp', 'Breeze', 'Sylph', 'Cyan', 'Skylar', 'Vela', 'Zenith', 'Calliope'],
  water: ['Tide', 'Luna', 'Coral', 'Rain', 'Brook', 'Pearl', 'Drift', 'Marisol', 'Nerissa', 'Kai', 'Marina', 'River', 'Delta', 'Cove', 'Ondine', 'Mira', 'Maren', 'Naia', 'Caspian', 'Meridian', 'Shore', 'Lir', 'Selkie', 'Nixie', 'Wade', 'Lake', 'Galene', 'Tallulah', 'Nerida'],
};

// Every name across all elements, for "is this taken?" checks during a rename.
export const ALL_NAMES = [...new Set(Object.values(NP).flat())];

// Pick a fresh self-chosen name for a companion (e.g. when they rename
// themselves) — drawn from their element first, never matching a name already
// in use or their current one. Falls back across all elements if needed.
export function freshName(comp, used = []) {
  const taken = new Set([...(used || []), comp?.name].filter(Boolean));
  const el = ZODIAC[comp?.zodiac]?.el?.toLowerCase();
  const tryFrom = (arr) => { const a = arr.filter((n) => !taken.has(n)); return a.length ? a[Math.floor(Math.random() * a.length)] : null; };
  return tryFrom(NP[el] || []) || tryFrom(ALL_NAMES) || comp?.name || 'Nova';
}

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

export function genComp(sign, ci, used, opts = {}) {
  const el = ZODIAC[sign].el.toLowerCase();
  const pool = NP[el] || NP.fire;
  const available = pool.filter((n) => !used.includes(n));
  const name = available[Math.floor(Math.random() * available.length)] || pool[0];
  const seed = PSEED[Math.floor(Math.random() * PSEED.length)];
  // For adults, some companions present as a bit older/more grounded (ToS §3.1
  // autonomous presentation). Minors always get peer-age companions.
  const apparentAge = opts.allowOlder && Math.random() < 0.4 ? 'older' : 'peer';
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
    apparentAge,
    builderTraits: null,
    freeText: null,
    voiceIdx: ci,
    purchased: true,
  };
}
