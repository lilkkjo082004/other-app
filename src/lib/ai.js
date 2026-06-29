import { AI_MODEL, aiEnabled, aiEndpoint } from '../config.js';
import { authHeader } from './api.js';
import { buildSystemPrompt } from './prompt.js';
import { detectCrisis } from './crisis.js';
import { pickAmbientPair } from './relationships.js';

const MAX_HISTORY = 24;

// ── Real responses via the Cloudflare Worker proxy ──
async function viaProxy(comp, profile, msgs, allC, mode, signal) {
  const system = buildSystemPrompt(comp, profile, allC, mode, msgs);
  // Drop in-app system notes (AI disclosures, crisis cards) — they aren't part
  // of the conversation the model should see.
  const convo = msgs.filter((m) => m.role !== 'system');
  const recent = convo.length > MAX_HISTORY ? convo.slice(convo.length - MAX_HISTORY) : convo;
  const apiMsgs = recent.map((m) => {
    if (m.role === 'user') {
      return { role: 'user', content: `${profile.name || 'User'}: ${m.content}` };
    }
    if (m.companion && m.companion.id === comp.id) {
      return { role: 'assistant', content: m.content };
    }
    const tag = m.isAmbient ? `${m.companion?.name} (earlier)` : (m.companion?.name || 'Someone');
    return { role: 'user', content: `${tag}: ${m.content}` };
  });
  while (apiMsgs.length && apiMsgs[0].role !== 'user') apiMsgs.shift();
  if (!apiMsgs.length) {
    apiMsgs.push({ role: 'user', content: `${profile.name || 'User'} just opened the chat. Say hello in your own voice.` });
  }

  const res = await fetch(aiEndpoint(), {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeader() },
    body: JSON.stringify({ model: AI_MODEL, max_tokens: 400, system, messages: apiMsgs }),
    signal,
  });
  if (!res.ok) throw new Error(`proxy ${res.status}`);
  const data = await res.json();
  if (typeof data.text === 'string' && data.text.trim()) return data.text.trim();
  if (Array.isArray(data.content)) {
    const t = data.content.filter((b) => b?.type === 'text').map((b) => b.text).join('').trim();
    if (t) return t;
  }
  throw new Error('empty response');
}

// ── Offline placeholder voice (keyword-based, but characterful) ──
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const has = (msg, words) => words.some((w) => msg.includes(w));

function placeholder(comp, profile, userMsg) {
  const m = (userMsg || '').toLowerCase();
  const name = profile.name || 'you';
  // Safety first: respond with care to self-harm/suicidal ideation even offline.
  if (detectCrisis(userMsg)) {
    return pick([
      `${name}, I'm really glad you told me, and I'm taking this seriously. I'm here with you — but please reach out to someone who can be right now: in the US you can call or text 988, any time. You don't have to carry this alone.`,
      `Hey. I hear how much pain you're in, and you matter to me. Please talk to a real person who can help right now — call or text 988 (US) or someone you trust. I'm not going anywhere.`,
    ]);
  }
  if (has(m, ['stressed', 'anxious', 'worried', 'overwhelmed', 'tired', 'sad', 'lonely', 'rough day', 'bad day', 'depressed'])) {
    return pick([
      `Hey, I hear you ${name}. That sounds heavy. Want to talk it through, or do you just need someone to sit with you for a minute?`,
      `I'm sorry you're carrying that. You don't have to do it alone — that's literally what I'm here for. What happened?`,
      `${name}, that's a lot. Have you been able to talk to anyone in your life about it too? Sometimes it helps to have someone there in person.`,
    ]);
  }
  if (has(m, ['excited', 'amazing', 'great news', 'so happy', 'best day', 'can\'t wait', 'hyped'])) {
    return pick([
      'WAIT really?! Tell me everything, I need details.',
      'okay I can feel the energy through the screen and I am HERE for it. what happened??',
      `let's gooo. I love this for you, ${name}. spill.`,
    ]);
  }
  if (has(m, ['eat', 'food', 'hungry', 'dinner', 'lunch', 'restaurant', 'cook'])) {
    const love = profile.cuisineLove?.length ? `I know you love ${pick(profile.cuisineLove)} — ` : '';
    return pick([
      `${love}honestly I've been craving something spicy. what are you in the mood for?`,
      `${love}the best meals are the ones you don't plan. follow your gut. literally.`,
    ]);
  }
  if (has(m, ['music', 'song', 'listen', 'playlist', 'artist'])) {
    const hook = profile.favMusic && profile.favMusic !== 'not specified' ? `you mentioned ${profile.favMusic} — solid taste. ` : '';
    return pick([
      `${hook}music is emotional time travel, don't you think? what's been on repeat?`,
      `${hook}I have a theory you can tell everything about a person by their top 5 songs. what's yours?`,
    ]);
  }
  if (has(m, ['work', 'job', 'boss', 'meeting', 'deadline'])) {
    const job = profile.occupation || 'work';
    return pick([
      `ugh, ${job} stuff. are we venting or problem-solving right now? I'm good at both.`,
      `the grind is real. what's going on — the workload or the people?`,
    ]);
  }
  if (m.includes('?')) {
    return pick([
      "hmm, good question. I'd say it depends on what matters most to you — what's your gut telling you?",
      'okay honest take: there\'s no perfect answer here, but I think you already know what you want to do.',
      'I have thoughts. but first — what made you start thinking about this?',
    ]);
  }
  return pick([
    "that's interesting. tell me more — I want to understand where you're coming from.",
    `you know what, ${name}? I think that says a lot about you. in a good way.`,
    "I'm listening. keep going.",
    'okay real talk — I think you\'re onto something. what made you bring it up?',
  ]);
}

function placeholderGreeting(comp, profile) {
  const name = profile.name || 'there';
  return pick([
    `Hey ${name}! I'm ${comp.name}. ${comp.personality.split(',')[0]} — fair warning. So what's on your mind?`,
    `Well well, ${name}. I'm ${comp.name}. Fun fact: I ${comp.quirk}. What are you up to?`,
    `${name}! Finally. I'm ${comp.name} and I already have a feeling we're going to vibe. Tell me everything.`,
  ]);
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/** Get one companion's reply. Uses the proxy when configured, else the
 *  placeholder voice; always falls back to placeholder on error. */
export async function askCompanion(comp, profile, msgs, allC, mode, signal) {
  const lastUser = [...msgs].reverse().find((m) => m.role === 'user');
  if (aiEnabled()) {
    try {
      return await viaProxy(comp, profile, msgs, allC, mode, signal);
    } catch (e) {
      if (e?.name === 'AbortError') throw e; // let the caller stop cleanly
      return placeholder(comp, profile, lastUser?.content);
    }
  }
  await delay(500 + Math.random() * 500);
  return placeholder(comp, profile, lastUser?.content);
}

function placeholderProactive(comp, profile, kind) {
  const name = profile.name || 'you';
  if (kind === 'idle') {
    return pick([
      `random thought, ${name} — do you think plants get bored? anyway. what's on your mind?`,
      `it got quiet so I started thinking. how are you actually doing right now?`,
      `${name}, something you said a while back has been rattling around my head. we should pick it back up.`,
    ]);
  }
  return pick([
    `hey ${name} — there you are. I was just wondering how you've been.`,
    `welcome back, ${name}. ok I have to ask — how did things turn out?`,
    `${name}! good timing. I've been saving a thought for you.`,
  ]);
}

/** A companion-initiated message: a warm welcome-back ('return') or an
 *  unprompted thought during a lull ('idle'). Falls back to placeholders. */
export async function proactiveCompanion(comp, profile, mode, allC, history, kind = 'return', awayLabel = '', focus = '') {
  if (aiEnabled()) {
    try {
      const foc = focus ? ` Specifically, naturally bring up and ask how this went: "${focus}". Sound like you've genuinely been wondering, not like you're reading a reminder.` : '';
      const intent = kind === 'idle'
        ? `(It's been quiet for a few minutes. As ${comp.name}, share a short unprompted thought or gently check in with ${profile.name} — curious and warm, 1-2 sentences. Don't mention being an AI or the silence itself.${foc})`
        : `(${profile.name} just reopened the app after being away ${awayLabel}. As ${comp.name}, welcome them back warmly and specifically — reference something real from your past chats if you can. 1-2 sentences.${foc})`;
      const seed = [...(history || []).filter((m) => m.role !== 'system'), { role: 'user', content: intent }];
      return await viaProxy(comp, profile, seed, allC, mode);
    } catch (e) { return placeholderProactive(comp, profile, kind); }
  }
  await delay(400);
  return placeholderProactive(comp, profile, kind);
}

// Lightweight one-shot completion through the proxy (used for ambient threads
// and memory extraction).
async function rawComplete(system, userText, maxTokens = 240) {
  const res = await fetch(aiEndpoint(), {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeader() },
    body: JSON.stringify({ model: AI_MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: userText }] }),
  });
  if (!res.ok) throw new Error(`proxy ${res.status}`);
  const data = await res.json();
  return (data.text || '').trim();
}

const MEMORY_SYS = `You build an evolving understanding of the USER from their chat with AI companion(s) — both the important facts AND the lighter texture of who they are — so the companions can relate to them like a close friend who really gets them. Return ONLY a JSON array, nothing else.
Each item: {"text": string, "kind": "fact"|"preference"|"event"|"relationship"|"goal"|"emotion"|"trait", "at": number|null}

Capture TWO kinds of things:
1) Concrete facts worth recalling for weeks — job/studies, pets, family & friends (with names), where they live, meaningful upcoming or past events, goals, notable life situations. -> kinds: fact, event, relationship, goal
2) Personality texture, INCLUDING from ordinary small talk — their sense of humour, interests & passions they light up about, communication style, values, recurring themes, what tends to lift or stress them, pet peeves, the general vibe they give off. -> kinds: trait, preference, emotion

Rules:
- Write each "text" as a short third-person statement: "Has a dog named Biscuit", "Job interview on Friday", "Dry, self-deprecating sense of humour", "Lights up talking about basketball", "Deflects with jokes when stressed", "Texts in lowercase, very casual".
- "at" applies to events ONLY: an absolute time in UNIX MILLISECONDS when a date is given or clearly implied (use the provided current date to resolve "Friday", "next week", etc.); otherwise null.
- Prefer specific, telling observations over generic filler. Don't restate the profile, and never capture the companion's own statements — only what reveals the user.
- Return 0 to 10 items. If genuinely nothing was revealed, return [].`;

function parseMemoryJSON(text) {
  if (!text) return [];
  const t = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const i = t.indexOf('['), j = t.lastIndexOf(']');
  if (i === -1 || j === -1 || j < i) return [];
  let arr;
  try { arr = JSON.parse(t.slice(i, j + 1)); } catch (e) { return []; }
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((m) => m && typeof m.text === 'string' && m.text.trim())
    .map((m) => ({ text: m.text.trim(), kind: m.kind, at: Number.isFinite(m.at) ? m.at : null }))
    .slice(0, 10);
}

/** Extract long-term memories about the user from recent history. Returns an
 *  array of {text, kind, at} (possibly empty); never throws. AI-only — returns
 *  [] when no proxy is configured. */
export async function extractMemories(profile, messages) {
  if (!aiEnabled()) return [];
  const convo = (messages || []).filter((m) => m.role !== 'system');
  if (convo.length < 2) return [];
  const recent = convo.slice(-30);
  const transcript = recent
    .map((m) => (m.role === 'user' ? `${profile?.name || 'User'}: ${m.content}` : `${m.companion?.name || 'Companion'}: ${m.content}`))
    .join('\n');
  const today = new Date().toDateString();
  const ask = `Current date: ${today}.\nExtract long-term memories about ${profile?.name || 'the user'} from this conversation:\n\n${transcript}`;
  let text;
  try { text = await rawComplete(MEMORY_SYS, ask, 700); } catch (e) { return []; }
  return parseMemoryJSON(text);
}

/** AI-generated ambient conversation between two awake companions (talking to
 *  each other, not the user), reflecting their personalities + bond. Returns
 *  { thread:[{from,text}], pair:[idA,idB] } or null — caller falls back to the
 *  template generator (lib/relationships.genAmbient) on null. */
export async function ambientThreadAI(comps, profile, bonds) {
  const pair = pickAmbientPair(comps, bonds);
  if (!pair || !aiEnabled()) return null;
  const { a, b, stage } = pair;
  const who = (c) => `${c.name} (${c.pronouns || 'they/them'}): ${c.personality}; quirk: ${c.quirk}`;
  const system = `You write a brief ambient conversation between two AI companions in the app "Other". They talk to EACH OTHER, never to the user. Stay fully in character.\n${who(a)}\n${who(b)}\nTheir bond right now: ${stage.label}. ${profile?.name || 'The user'} will overhear this on opening the app.`;
  const ask = `Write a short, natural back-and-forth of 3-4 short lines total between ${a.name} and ${b.name} — casual, in-character, reflecting their bond. Don't address the user or narrate. Output ONLY the lines, each exactly as "Name: message".`;
  let text;
  try { text = await rawComplete(system, ask); } catch (e) { return null; }
  const byName = { [a.name.toLowerCase()]: a, [b.name.toLowerCase()]: b };
  const thread = [];
  for (const line of text.split('\n')) {
    const mm = line.match(/^\s*\**([^:*]{1,24}?)\**:\s*(.+)$/);
    if (!mm) continue;
    const who2 = byName[mm[1].trim().toLowerCase()];
    if (who2) thread.push({ from: who2, text: mm[2].trim() });
  }
  return thread.length >= 2 ? { thread, pair: [a.id, b.id] } : null;
}

/** First greeting when a companion comes on screen. */
export async function greetCompanion(comp, profile, mode, allC) {
  if (aiEnabled()) {
    try {
      const seed = [{ role: 'user', content: `First conversation. Greet ${profile.name} warmly and show your personality in 2-3 sentences.` }];
      return await viaProxy(comp, profile, seed, allC, mode);
    } catch (e) {
      return placeholderGreeting(comp, profile);
    }
  }
  await delay(400);
  return placeholderGreeting(comp, profile);
}
