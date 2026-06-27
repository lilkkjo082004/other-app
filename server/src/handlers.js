import { hashPassword, verifyPassword, signToken, verifyToken } from './crypto.js';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const MAX_TOKENS_CAP = 1024;

function cors(env) {
  return {
    'access-control-allow-origin': env.ALLOWED_ORIGIN || '*',
    'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-max-age': '86400',
  };
}
function json(obj, status, env) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'content-type': 'application/json', ...cors(env) } });
}
async function body(request) {
  try { return await request.json(); } catch (e) { return null; }
}
async function authUid(request, env) {
  const h = request.headers.get('authorization') || '';
  const v = await verifyToken(h.replace(/^Bearer\s+/i, ''), env.SECRET);
  return v ? v.uid : null;
}
const emailOk = (e) => typeof e === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

function clientIp(request) {
  return request.headers.get('cf-connecting-ip')
    || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || 'unknown';
}
const numEnv = (v, d) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d; };

// Returns a 429 Response when the key is over its limit, else null. No-op if the
// store doesn't implement rateLimit (older stores) or the limit is disabled.
async function rateLimited(env, key, limit, windowMs) {
  if (!env.store.rateLimit || !(limit > 0)) return null;
  const r = await env.store.rateLimit(key, limit, windowMs);
  if (r && r.allowed === false) {
    return new Response(JSON.stringify({ error: 'too many requests' }), {
      status: 429,
      headers: { 'content-type': 'application/json', 'retry-after': String(r.retryAfter || 60), ...cors(env) },
    });
  }
  return null;
}

export async function handle(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) });
  const url = new URL(request.url);
  const p = url.pathname.replace(/\/+$/, '') || '/';

  try {
    // Abuse protection: throttle auth (brute force) and AI (cost) by client IP.
    if ((p === '/auth/signup' || p === '/auth/login') && request.method === 'POST') {
      const limited = await rateLimited(env, `auth:${clientIp(request)}`, numEnv(env.AUTH_RATE_LIMIT, 20), 60_000);
      if (limited) return limited;
    }
    if ((p === '/ai' || p === '/tts') && request.method === 'POST') {
      const limited = await rateLimited(env, `ai:${clientIp(request)}`, numEnv(env.AI_RATE_LIMIT, 30), 60_000);
      if (limited) return limited;
    }

    if (p === '/' || p === '/health') return json({ ok: true, service: 'other-api' }, 200, env);
    if (p === '/auth/signup' && request.method === 'POST') return signup(request, env);
    if (p === '/auth/login' && request.method === 'POST') return login(request, env);
    if (p === '/ai' && request.method === 'POST') return ai(request, env);
    if (p === '/tts' && request.method === 'POST') return tts(request, env);

    if (p === '/state') {
      const uid = await authUid(request, env);
      if (!uid) return json({ error: 'unauthorized' }, 401, env);
      if (request.method === 'GET') {
        const r = await env.store.getState(uid);
        return json({ state: r ? JSON.parse(r.blob) : null, updated_at: r?.updated_at || null }, 200, env);
      }
      if (request.method === 'PUT') {
        const b = await body(request);
        if (!b || typeof b.state === 'undefined') return json({ error: 'state required' }, 400, env);
        await env.store.putState(uid, JSON.stringify(b.state));
        return json({ ok: true }, 200, env);
      }
    }

    if (p === '/mood' && request.method === 'POST') {
      const uid = await authUid(request, env);
      if (!uid) return json({ error: 'unauthorized' }, 401, env);
      const b = await body(request);
      if (!b || !b.mood) return json({ error: 'mood required' }, 400, env);
      await env.store.addMood(uid, b.companionId, b.mood, b.score);
      return json({ ok: true }, 200, env);
    }

    if (p === '/mood/summary' && request.method === 'GET') {
      const uid = await authUid(request, env);
      if (!uid) return json({ error: 'unauthorized' }, 401, env);
      return json(await env.store.moodSummary(uid), 200, env);
    }

    if (p === '/push/subscribe' && request.method === 'POST') {
      const uid = await authUid(request, env);
      if (!uid) return json({ error: 'unauthorized' }, 401, env);
      const b = await body(request);
      const sub = b?.subscription;
      if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return json({ error: 'invalid subscription' }, 400, env);
      await env.store.savePushSub(uid, sub);
      return json({ ok: true }, 200, env);
    }

    if (p === '/push/unsubscribe' && request.method === 'POST') {
      const uid = await authUid(request, env);
      if (!uid) return json({ error: 'unauthorized' }, 401, env);
      const b = await body(request);
      if (!b?.endpoint) return json({ error: 'endpoint required' }, 400, env);
      await env.store.deletePushSub(uid, b.endpoint);
      return json({ ok: true }, 200, env);
    }

    // Account deletion (ToS §10.1 / GDPR / CCPA): erase the user and ALL of
    // their server-side data — state, mood history, and push subscriptions.
    if (p === '/account' && request.method === 'DELETE') {
      const uid = await authUid(request, env);
      if (!uid) return json({ error: 'unauthorized' }, 401, env);
      await env.store.deleteAccount(uid);
      return json({ ok: true }, 200, env);
    }

    return json({ error: 'not found' }, 404, env);
  } catch (e) {
    return json({ error: 'server error', detail: String(e) }, 500, env);
  }
}

// Text-to-speech proxy — natural companion voices via ElevenLabs. Keeps the
// API key server-side; streams audio/mpeg back. No-op (503) until configured.
async function tts(request, env) {
  if (!env.ELEVENLABS_API_KEY) return json({ error: 'tts not configured' }, 503, env);
  const b = await body(request);
  const text = (b?.text || '').toString().slice(0, 800);
  if (!text.trim()) return json({ error: 'text required' }, 400, env);
  const voices = (env.ELEVEN_VOICE_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const voiceId = voices.length ? voices[(Number(b.voiceIdx) || 0) % voices.length] : '21m00Tcm4TlvDq8ikWAM';
  let up;
  try {
    up = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: env.ELEVEN_MODEL || 'eleven_turbo_v2_5' }),
    });
  } catch (e) {
    return json({ error: 'tts upstream failed', detail: String(e) }, 502, env);
  }
  if (!up.ok) {
    const d = await up.text().catch(() => '');
    return json({ error: 'tts error', status: up.status, detail: d.slice(0, 200) }, up.status || 502, env);
  }
  return new Response(up.body, { status: 200, headers: { 'content-type': 'audio/mpeg', ...cors(env) } });
}

async function signup(request, env) {
  const b = await body(request);
  const email = (b?.email || '').trim().toLowerCase();
  const password = b?.password || '';
  if (!emailOk(email)) return json({ error: 'valid email required' }, 400, env);
  if (typeof password !== 'string' || password.length < 8) return json({ error: 'password must be at least 8 characters' }, 400, env);
  if (await env.store.getUserByEmail(email)) return json({ error: 'an account with that email already exists' }, 409, env);
  const { hash, salt } = await hashPassword(password);
  const user = await env.store.createUser(email, hash, salt);
  return json({ token: await signToken(user.id, env.SECRET), email }, 200, env);
}

async function login(request, env) {
  const b = await body(request);
  const email = (b?.email || '').trim().toLowerCase();
  const password = b?.password || '';
  const user = await env.store.getUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.pw_salt, user.pw_hash))) {
    return json({ error: 'wrong email or password' }, 401, env);
  }
  return json({ token: await signToken(user.id, env.SECRET), email }, 200, env);
}

// Claude proxy — same contract as worker/ ({model,max_tokens,system,messages} -> {text}).
async function ai(request, env) {
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'server missing ANTHROPIC_API_KEY' }, 500, env);
  const b = await body(request);
  if (!b?.model || !Array.isArray(b.messages) || !b.messages.length) {
    return json({ error: 'model and messages required' }, 400, env);
  }
  const payload = {
    model: b.model,
    max_tokens: Math.min(MAX_TOKENS_CAP, Math.max(1, Number(b.max_tokens) || 400)),
    messages: b.messages,
  };
  if (typeof b.system === 'string' && b.system) payload.system = b.system;

  let upstream;
  try {
    upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': ANTHROPIC_VERSION },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return json({ error: 'upstream request failed', detail: String(e) }, 502, env);
  }
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok || !data) return json({ error: 'anthropic error', status: upstream.status, detail: data }, upstream.status || 502, env);
  let text = '';
  if (Array.isArray(data.content)) for (const blk of data.content) if (blk?.type === 'text' && typeof blk.text === 'string') text += blk.text;
  return json({ text: text.trim(), stop_reason: data.stop_reason }, 200, env);
}
