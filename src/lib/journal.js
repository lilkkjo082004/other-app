// The user's own private journal (distinct from companions' journals). Entries
// live in the session blob (local + synced) and are NEVER sent to the AI — this
// is the user's private space. Companions only ever offer a gentle prompt.

export const JOURNAL_PROMPTS = [
  'What’s one thing that stayed on your mind today?',
  'What felt good today — even a small thing?',
  'What’s something you’re looking forward to?',
  'What drained you today, and what gave you energy?',
  'What would you tell a friend going through what you are?',
  'What are you proud of lately, even quietly?',
  'What’s something you need but haven’t asked for?',
  'When did you feel most like yourself today?',
  'What’s weighing on you that you could set down?',
  'What’s a small kindness you noticed — given or received?',
  'What do you want more of in your days?',
  'What’s true for you right now, in this moment?',
];

// A stable prompt for a given day, so it doesn't change on every render.
export function promptForDay(now = Date.now()) {
  const day = Math.floor(now / 86400000);
  return JOURNAL_PROMPTS[day % JOURNAL_PROMPTS.length];
}

export function newEntry(text, prompt, ts = Date.now()) {
  return { id: Math.random().toString(36).slice(2, 9), text: String(text || '').trim(), prompt: prompt || '', ts };
}
export function addEntry(list = [], entry) {
  return [entry, ...(list || [])].slice(0, 1000);
}
export function removeEntry(list = [], id) {
  return (list || []).filter((e) => e.id !== id);
}
