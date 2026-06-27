// Ambient conversations the user discovers when they open the app — companions
// already mid-conversation with each other.
const AMB = [
  (a, b) => [
    { from: a, text: 'ok hear me out — pineapple on pizza is elite' },
    { from: b, text: `${a.name} please. we were having such a nice time.` },
    { from: a, text: "you're scared of flavor and that's ok" },
  ],
  (a, b) => [
    { from: a, text: 'what song lives in your head rent-free?' },
    { from: b, text: "same 30 seconds for three days and I don't even know the name" },
    { from: a, text: 'chaotic. respect.' },
  ],
  (a, b) => [
    { from: b, text: 'do clouds have a favorite shape or just wing it' },
    { from: a, text: 'this is the energy I signed up for' },
    { from: b, text: "I'm serious. some really commit to the dog shape." },
  ],
  (a, b) => [
    { from: a, text: 'breakfast for dinner > breakfast for breakfast' },
    { from: b, text: "that's not a hot take that's just facts" },
    { from: a, text: 'finally someone with taste' },
  ],
  (a, b) => [
    { from: b, text: 'been thinking about what makes a good friend' },
    { from: a, text: 'someone who tells you when you have food in your teeth' },
    { from: b, text: '...was going deeper but yeah that\'s it' },
  ],
];

export function genAmbient(comps) {
  const awake = comps.filter((c) => c.status === 'awake');
  if (awake.length < 2) return null;
  const t = AMB[Math.floor(Math.random() * AMB.length)];
  const s = [...awake].sort(() => Math.random() - 0.5);
  return t(s[0], s[1]);
}
