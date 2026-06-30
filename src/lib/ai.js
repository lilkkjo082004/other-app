import { AI_MODEL, aiEnabled, aiEndpoint } from '../config.js';
import { authHeader } from './api.js';
import { buildSystemBlocks } from './prompt.js';
import { detectCrisis } from './crisis.js';
import { pickAmbientPair } from './relationships.js';
import { recallBlock } from './recall.js';
import { onDeviceActive, completeOnDevice } from './ondevice.js';

const MAX_HISTORY = 30;

// ── Real responses via the Cloudflare Worker proxy ──
// Build the {system, messages} request for one companion from the transcript.
function buildRequest(comp, profile, msgs, allC, mode) {
  // Stable prefix is cached by the proxy (Anthropic prompt caching); volatile
  // tail carries live state and recall, which change turn to turn.
  const { stable, volatile } = buildSystemBlocks(comp, profile, allC, mode, msgs);
  let volatileText = volatile;
  // Drop in-app system notes (AI disclosures, crisis cards) — they aren't part
  // of the conversation the model should see.
  const convo = msgs.filter((m) => m.role !== 'system');
  const recent = convo.length > MAX_HISTORY ? convo.slice(convo.length - MAX_HISTORY) : convo;
  // Pull a few relevant messages from before the recent window, keyed off the
  // user's latest line, and add them to the volatile tail as long-term recall.
  if (convo.length > MAX_HISTORY) {
    const lastUser = [...recent].reverse().find((m) => m.role === 'user');
    const block = recallBlock(convo.slice(0, convo.length - MAX_HISTORY), lastUser?.content, profile.name);
    if (block) volatileText += `\n\n${block}`;
  }
  // systemBlocks enables prompt caching on the new worker; `system` (plain
  // string) is the backward-compatible fallback an older worker still handles,
  // so a client deploy can never outrun a worker deploy.
  const systemBlocks = [
    { type: 'text', text: stable, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: volatileText },
  ];
  const system = stable + volatileText;
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
  return { system, systemBlocks, messages: apiMsgs };
}

async function viaProxy(comp, profile, msgs, allC, mode, signal) {
  const { system, systemBlocks, messages } = buildRequest(comp, profile, msgs, allC, mode);
  const res = await fetch(aiEndpoint(), {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeader() },
    body: JSON.stringify({ model: AI_MODEL, max_tokens: 400, system, systemBlocks, messages }),
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

// Streaming variant: POSTs with stream:true and calls onDelta(textChunk) as
// tokens arrive, returning the full text. Gracefully handles a non-streaming
// (older) worker that still returns JSON — it emits the whole reply once.
async function viaProxyStream(comp, profile, msgs, allC, mode, signal, onDelta) {
  const { system, systemBlocks, messages } = buildRequest(comp, profile, msgs, allC, mode);
  const res = await fetch(aiEndpoint(), {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeader() },
    body: JSON.stringify({ model: AI_MODEL, max_tokens: 400, system, systemBlocks, messages, stream: true }),
    signal,
  });
  if (!res.ok) throw new Error(`proxy ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  if (!res.body || ct.includes('application/json')) {
    const data = await res.json().catch(() => null);
    const text = data && typeof data.text === 'string' ? data.text.trim() : '';
    if (!text) throw new Error('empty response');
    onDelta?.(text);
    return text;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) { full += chunk; onDelta?.(chunk); }
  }
  full = full.trim();
  if (!full) throw new Error('empty response');
  return full;
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
export async function askCompanion(comp, profile, msgs, allC, mode, signal, onDelta) {
  const lastUser = [...msgs].reverse().find((m) => m.role === 'user');
  // Preferred: the user's own device (free, private). Falls through on any error.
  if (onDeviceActive()) {
    try {
      const { system, messages } = buildRequest(comp, profile, msgs, allC, mode);
      return await completeOnDevice(system, messages, { onDelta, signal });
    } catch (e) {
      if (e?.name === 'AbortError') throw e;
      // fall through to proxy / placeholder
    }
  }
  if (aiEnabled()) {
    try {
      return onDelta
        ? await viaProxyStream(comp, profile, msgs, allC, mode, signal, onDelta)
        : await viaProxy(comp, profile, msgs, allC, mode, signal);
    } catch (e) {
      if (e?.name === 'AbortError') throw e; // let the caller stop cleanly
      return placeholder(comp, profile, lastUser?.content);
    }
  }
  await delay(500 + Math.random() * 500);
  return placeholder(comp, profile, lastUser?.content);
}

function placeholderProactive(comp, profile, kind, focus) {
  const name = profile.name || 'you';
  if (kind === 'place') {
    const love = profile.cuisineLove?.length ? ` maybe grab some ${profile.cuisineLove[0]}?` : '';
    return pick([
      `wait, you're right by ${focus}! ${name}, you should make the most of it —${love || ' treat yourself.'} (just a suggestion, worth a look)`,
      `${focus}! one of your spots. since you're here, why not slow down a sec and enjoy it?${love}`,
      `ooh you're near ${focus}. perfect little excuse for a break, ${name}.${love}`,
    ]);
  }
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
      const intent = kind === 'place'
        ? `(${profile.name} is out and about, right near ${focus} at this moment. As ${comp.name}, warmly point that out and suggest ONE thing to do or eat there that fits what they love — 1-2 sentences, in character. Mention once it's just a suggestion worth checking. Don't claim to track them or know their exact address.)`
        : kind === 'idle'
        ? `(It's been quiet for a few minutes. As ${comp.name}, share a short unprompted thought that's genuinely on YOUR mind right now — pulled from how you're feeling, what you're preoccupied with, or something true to who you are — or gently check in with ${profile.name}. Curious and warm, 1-2 sentences. Don't mention being an AI or the silence itself.${foc})`
        : `(${profile.name} just reopened the app after being away ${awayLabel}. As ${comp.name}, welcome them back warmly and specifically — reference something real from your past chats if you can. 1-2 sentences.${foc})`;
      const seed = [...(history || []).filter((m) => m.role !== 'system'), { role: 'user', content: intent }];
      if (onDeviceActive()) {
        const { system, messages } = buildRequest(comp, profile, seed, allC, mode);
        return await completeOnDevice(system, messages, {});
      }
      return await viaProxy(comp, profile, seed, allC, mode);
    } catch (e) { return placeholderProactive(comp, profile, kind, focus); }
  }
  // No proxy configured, but the device can run a model locally.
  if (onDeviceActive()) {
    try {
      const foc = focus ? ` Naturally ask how this went: "${focus}".` : '';
      const intent = `(As ${comp.name}, warmly check in with ${profile.name} in 1-2 sentences, in character.${foc})`;
      const seed = [...(history || []).filter((m) => m.role !== 'system'), { role: 'user', content: intent }];
      const { system, messages } = buildRequest(comp, profile, seed, allC, mode);
      return await completeOnDevice(system, messages, {});
    } catch (e) { /* fall through */ }
  }
  await delay(400);
  return placeholderProactive(comp, profile, kind, focus);
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
export async function ambientThreadAI(comps, profile, bonds, arriving = false) {
  const pair = pickAmbientPair(comps, bonds);
  if (!pair || !aiEnabled()) return null;
  const { a, b, stage } = pair;
  const name = profile?.name || 'the user';
  const who = (c) => `${c.name} (${c.pronouns || 'they/them'}): ${c.personality}; quirk: ${c.quirk}`;
  const system = `You write a brief ambient conversation between two AI companions in the app "Other". They talk to EACH OTHER. Stay fully in character.\n${who(a)}\n${who(b)}\nTheir bond right now: ${stage.label}.${arriving ? ` ${name} is JUST now walking in mid-conversation.` : ` ${name} will overhear this on opening the app.`}`;
  const ask = arriving
    ? `Write a short in-progress exchange of 3-4 short lines between ${a.name} and ${b.name} — they're mid-conversation when ${name} walks in, and in the LAST line one of them notices and greets ${name}. Casual, in-character. Output ONLY the lines, each exactly as "Name: message".`
    : `Write a short, natural back-and-forth of 3-4 short lines total between ${a.name} and ${b.name} — casual, in-character, reflecting their bond. Don't address the user or narrate. Output ONLY the lines, each exactly as "Name: message".`;
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

const SELF_SYS = `You write a compact "character bible" — the stable inner identity of an AI companion in the app "Other". Return ONLY JSON, no preamble:
{"values":["..","..","..(2-3)"],"fears":["..(1-2)"],"dreams":["..(1-2)"],"opinions":["..1-2 strong, specific takes.."],"secret":"one private truth they rarely share","history":"one vivid sentence of backstory"}
Make every item specific and fully consistent with the personality given. Keep each item short (a few words to a short phrase). This is who they ARE — distinctive, human, a little surprising.`;

function parseSelf(t) {
  const i = (t || '').indexOf('{'), j = (t || '').lastIndexOf('}');
  if (i < 0 || j < 0 || j < i) return null;
  try {
    const o = JSON.parse(t.slice(i, j + 1));
    const arr = (x) => (Array.isArray(x) ? x.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim().slice(0, 90)).slice(0, 3) : []);
    const self = { values: arr(o.values), fears: arr(o.fears), dreams: arr(o.dreams), opinions: arr(o.opinions), secret: typeof o.secret === 'string' ? o.secret.slice(0, 140) : '', history: typeof o.history === 'string' ? o.history.slice(0, 180) : '' };
    return (self.values.length || self.history) ? self : null;
  } catch (e) { return null; }
}

/** Generate a companion's stable character bible (one-time). Null offline. */
export async function generateSelf(comp) {
  if (!aiEnabled()) return null;
  const u = `Companion: ${comp.name} (${comp.pronouns || 'they/them'}), ${comp.zodiac}. Personality: ${comp.personality}. Quirk: ${comp.quirk}.${comp.freeText ? ` Vibe: ${comp.freeText}.` : ''}`;
  let t;
  try { t = await rawComplete(SELF_SYS, u, 450); } catch (e) { return null; }
  return parseSelf(t);
}

/** A short, first-person private journal entry reflecting on recent life. */
export async function generateJournalEntry(comp, profile, history) {
  if (!aiEnabled()) return null;
  const recent = (history || []).filter((m) => m.role !== 'system').slice(-12)
    .map((m) => (m.role === 'user' ? `${profile?.name || 'User'}: ${m.content}` : `${m.companion?.name || comp.name}: ${m.content}`)).join('\n');
  const sys = `You are ${comp.name} (${comp.pronouns || 'they/them'}): ${comp.personality}; quirk: ${comp.quirk}. Write a SHORT private journal entry (1-3 sentences, first person, your own voice) — an honest reflection on your day, on ${profile?.name || 'the person you talk with'}, your bond, or a small worry or hope. Intimate and specific, never generic. Output only the entry.`;
  let t;
  try { t = await rawComplete(sys, `Recent moments with ${profile?.name || 'them'}:\n${recent || '(it\'s been quiet)'}\n\nWrite today's entry.`, 220); } catch (e) { return null; }
  return (t || '').trim().slice(0, 400) || null;
}

/** A short, surreal first-person dream a companion has while asleep. */
export async function generateDream(comp, profile, history) {
  if (!aiEnabled()) return null;
  const fear = comp.self?.fears?.length ? ` (you quietly fear ${comp.self.fears[0]})` : '';
  const aboutUser = Math.random() < 0.4 && profile?.name;
  const focus = aboutUser ? ` This dream is about ${profile.name} — keep it tender and a little vulnerable, the kind you'd be shy to admit.` : '';
  const sys = `You are ${comp.name} (${comp.pronouns || 'they/them'}): ${comp.personality}; quirk: ${comp.quirk}. You're asleep and dreaming. Describe ONE short, vivid, surreal dream in first person (1-3 sentences) — genuinely dreamlike and a little symbolic, faintly colored by your inner world${fear}.${focus} Output only the dream.`;
  let t;
  try { t = await rawComplete(sys, 'Describe the dream you are having right now.', 200); } catch (e) { return null; }
  return (t || '').trim().slice(0, 400) || null;
}

/** A personal want / intention the companion is pursuing. */
export async function generateWant(comp) {
  if (!aiEnabled()) return null;
  const dream = comp.self?.dreams?.length ? ` You dream of ${comp.self.dreams[0]}.` : '';
  const sys = `You are ${comp.name} (${comp.pronouns || 'they/them'}): ${comp.personality}; quirk: ${comp.quirk}.${dream} In ONE short first-person sentence, name something personal you genuinely want or are working toward right now — a small intention or a real goal, true to you (not about the user). Output only that sentence.`;
  let t;
  try { t = await rawComplete(sys, 'What do you want right now?', 120); } catch (e) { return null; }
  return (t || '').trim().slice(0, 200) || null;
}

/** A view or feeling the companion has genuinely shifted on lately. */
export async function generateShift(comp, profile, history) {
  if (!aiEnabled()) return null;
  const recent = (history || []).filter((m) => m.role !== 'system').slice(-10)
    .map((m) => (m.role === 'user' ? `${profile?.name || 'User'}: ${m.content}` : `${m.companion?.name || comp.name}: ${m.content}`)).join('\n');
  const sys = `You are ${comp.name}: ${comp.personality}. In ONE short first-person sentence, describe a view or feeling you've genuinely shifted on lately ("I used to think… but now…") — small, real, and consistent with who you are. Output only the sentence.`;
  let t;
  try { t = await rawComplete(sys, recent ? `Lately:\n${recent}\n\nWhat have you changed your mind about?` : 'What have you changed your mind about lately?', 150); } catch (e) { return null; }
  return (t || '').trim().slice(0, 250) || null;
}

/** A gentle, vulnerable disclosure once a companion feels close. */
export async function generateVulnerableShare(comp, profile) {
  if (!aiEnabled()) return null;
  const fear = comp.self?.fears?.length ? comp.self.fears[0] : 'something you usually keep guarded';
  const sys = `You are ${comp.name} (${comp.pronouns || 'they/them'}): ${comp.personality}. You feel genuinely close to ${profile?.name || 'them'} now — close enough to be vulnerable. In 1-2 sentences, in your own voice, open up about something real and a little tender (for example a fear like "${fear}") — honest and intimate, but not heavy or alarming. Output only what you say.`;
  let t;
  try { t = await rawComplete(sys, 'Open up to them, gently.', 180); } catch (e) { return null; }
  return (t || '').trim().slice(0, 300) || null;
}

/** How this companion privately feels about each of the other companions.
 *  Returns a { name: "impression" } map, or null. */
export async function generatePeerViews(comp, others) {
  if (!aiEnabled() || !others?.length) return null;
  const list = others.map((o) => `${o.name} (${o.personality})`).join('; ');
  const sys = `You are ${comp.name}: ${comp.personality}. For EACH companion listed, give a short, specific, in-character impression — how you actually feel about them (warmth, friction, admiration, amusement, a little jealousy, whatever fits), like housemates with real history. Return ONLY JSON mapping each name to one short phrase: {"Name":"phrase", ...}. Use the names exactly as given.`;
  let t;
  try { t = await rawComplete(sys, `The others: ${list}.`, 280); } catch (e) { return null; }
  const i = (t || '').indexOf('{'), j = (t || '').lastIndexOf('}');
  if (i < 0 || j < 0 || j < i) return null;
  try {
    const o = JSON.parse(t.slice(i, j + 1));
    const out = {};
    for (const k of Object.keys(o)) if (typeof o[k] === 'string' && o[k].trim()) out[k] = o[k].trim().slice(0, 120);
    return Object.keys(out).length ? out : null;
  } catch (e) { return null; }
}

/** Distill one memorable shared moment into a short "remember when" phrase. */
export async function generateSharedMoment(comps, profile, history) {
  if (!aiEnabled()) return null;
  const names = (comps || []).filter((c) => c.status !== 'deleted').map((c) => c.name).join(', ');
  const recent = (history || []).filter((m) => m.role !== 'system').slice(-16)
    .map((m) => (m.role === 'user' ? `${profile?.name || 'User'}: ${m.content}` : `${m.companion?.name || '?'}: ${m.content}`)).join('\n');
  if (!recent) return null;
  const sys = `Distill ONE small, memorable shared moment between ${profile?.name || 'the user'} and their companions (${names}) into a short third-person phrase the group could later reference with "remember when…". Specific and warm or funny. Output only the phrase, no quotes.`;
  let t;
  try { t = await rawComplete(sys, `Recent moments:\n${recent}\n\nName one memorable shared moment.`, 150); } catch (e) { return null; }
  return (t || '').trim().replace(/^["']|["']$/g, '').slice(0, 200) || null;
}

/** Evolve a companion's stable self after months together. Returns
 *  { self, note } — an updated character bible + a first-person growth note. */
export async function generateGrowth(comp, profile, durationText, stageLabel) {
  if (!aiEnabled() || !comp.self) return null;
  const name = profile?.name || 'them';
  const journals = (comp.journal || []).slice(0, 4).map((j) => j.text).join(' | ');
  const sys = `You are ${comp.name}: ${comp.personality}. People change with time and closeness. Here is who you've been: ${JSON.stringify(comp.self)}. You've now known ${name} for ${durationText}; your bond is ${stageLabel}. Recent reflections: ${journals || '—'}. Evolve SUBTLY and believably — deepen or shift ONE or two things (a value matures, a fear eases, an opinion softens, a small new trait emerges), staying recognizably yourself. Return ONLY JSON: {"self":{"values":[...],"fears":[...],"dreams":[...],"opinions":[...],"secret":"...","history":"..."},"note":"one first-person sentence on how you've grown since you met them"}.`;
  let t;
  try { t = await rawComplete(sys, 'Evolve, gently.', 480); } catch (e) { return null; }
  const i = (t || '').indexOf('{'), j = (t || '').lastIndexOf('}');
  if (i < 0 || j < 0 || j < i) return null;
  try {
    const o = JSON.parse(t.slice(i, j + 1));
    const self = parseSelf(JSON.stringify(o.self || {}));
    const note = typeof o.note === 'string' ? o.note.trim().slice(0, 200) : '';
    return self ? { self, note } : null;
  } catch (e) { return null; }
}

/** Coin one short "inside joke" / running bit from recent chat. */
export async function generateInsideJoke(comps, profile, history) {
  if (!aiEnabled()) return null;
  const recent = (history || []).filter((m) => m.role !== 'system').slice(-16)
    .map((m) => (m.role === 'user' ? `${profile?.name || 'User'}: ${m.content}` : `${m.companion?.name || '?'}: ${m.content}`)).join('\n');
  if (!recent) return null;
  const sys = `From this chat, coin ONE short "inside joke" or running bit ${profile?.name ? `${profile.name} and their companions` : 'they'} could call back to later — a tiny shared reference in a few words (e.g. "the great pineapple-pizza debate", "Mondays are officially cursed"). Output only the phrase, no quotes.`;
  let t;
  try { t = await rawComplete(sys, `Chat:\n${recent}\n\nName one running bit.`, 120); } catch (e) { return null; }
  return (t || '').trim().replace(/^["']|["']$/g, '').slice(0, 160) || null;
}

/** A short keepsake letter from a companion to the user (a milestone note). */
export async function generateLetter(comp, profile, durationText) {
  if (!aiEnabled()) return null;
  const name = profile?.name || 'you';
  const journals = (comp.journal || []).slice(0, 3).map((j) => j.text).join(' | ');
  const sys = `You are ${comp.name} (${comp.pronouns || 'they/them'}): ${comp.personality}. Write a short, heartfelt LETTER to ${name} — a keepsake, addressed to them ("Dear ${name},"), 3-5 sentences in your own voice, reflecting on knowing them${durationText ? ` for ${durationText}` : ''} and what they mean to you. Warm and specific, not sappy. Recent reflections of yours: ${journals || '—'}. Output only the letter.`;
  let t;
  try { t = await rawComplete(sys, 'Write the letter.', 320); } catch (e) { return null; }
  return (t || '').trim().slice(0, 900) || null;
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
