import { AI_PROXY, AI_MODEL, aiEnabled } from '../config.js';
import { buildSystemPrompt } from './prompt.js';

const MAX_HISTORY = 24;

// ── Real responses via the Cloudflare Worker proxy ──
async function viaProxy(comp, profile, msgs, allC, mode) {
  const system = buildSystemPrompt(comp, profile, allC, mode);
  const recent = msgs.length > MAX_HISTORY ? msgs.slice(msgs.length - MAX_HISTORY) : msgs;
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

  const res = await fetch(AI_PROXY, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: AI_MODEL, max_tokens: 400, system, messages: apiMsgs }),
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
export async function askCompanion(comp, profile, msgs, allC, mode) {
  const lastUser = [...msgs].reverse().find((m) => m.role === 'user');
  if (aiEnabled()) {
    try {
      return await viaProxy(comp, profile, msgs, allC, mode);
    } catch (e) {
      return placeholder(comp, profile, lastUser?.content);
    }
  }
  await delay(500 + Math.random() * 500);
  return placeholder(comp, profile, lastUser?.content);
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
