import { hashPassword, verifyPassword, signToken, verifyToken } from './crypto.js';
import { importVapid, sendPush } from './webpush.js';

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
  if (!env.SECRET) return null; // fail closed: unconfigured signing secret => no valid tokens
  const h = request.headers.get('authorization') || '';
  const v = await verifyToken(h.replace(/^Bearer\s+/i, ''), env.SECRET);
  return v ? v.uid : null;
}
const emailOk = (e) => typeof e === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
const hostOf = (u) => { try { return new URL(u).host; } catch (e) { return 'invalid'; } };

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
    // Self-heal late-added tables once per isolate so a not-yet-migrated table
    // can't 500 the entitlement (/ai), calendar, or account-deletion paths.
    // Best-effort — never let it break a request.
    try { await env.store.ensureSchema?.(); } catch (e) { /* non-fatal */ }
    // Abuse protection: throttle auth (brute force) and AI (cost) by client IP.
    if ((p === '/auth/signup' || p === '/auth/login') && request.method === 'POST') {
      const limited = await rateLimited(env, `auth:${clientIp(request)}`, numEnv(env.AUTH_RATE_LIMIT, 20), 60_000);
      if (limited) return limited;
    }
    if ((p === '/ai' || p === '/tts') && request.method === 'POST') {
      const ip = clientIp(request);
      // Burst limit (per minute).
      const limited = await rateLimited(env, `ai:${ip}`, numEnv(env.AI_RATE_LIMIT, 30), 60_000);
      if (limited) return limited;
      // Daily caps protect the owner's Anthropic bill on a public, keyless
      // endpoint: a per-IP ceiling and an optional global ceiling across all
      // users (AI_DAILY_TOTAL=0 disables the global one).
      const dayLimited = await rateLimited(env, `ai:day:${ip}`, numEnv(env.AI_DAILY_LIMIT, 200), 86_400_000);
      if (dayLimited) return dayLimited;
      const totalLimited = await rateLimited(env, 'ai:day:all', numEnv(env.AI_DAILY_TOTAL, 0), 86_400_000);
      if (totalLimited) return totalLimited;
    }

    if (p === '/' || p === '/health') return json({ ok: true, service: 'other-api' }, 200, env);
    if (p === '/auth/signup' && request.method === 'POST') return signup(request, env);
    if (p === '/auth/login' && request.method === 'POST') return login(request, env);
    if (p === '/ai' && request.method === 'POST') return ai(request, env);
    if (p === '/tts' && request.method === 'POST') return tts(request, env);
    if (p === '/billing/webhook' && request.method === 'POST') return billingWebhook(request, env);

    // Calendar subscription feed (Apple Calendar / Outlook / Google via URL).
    // enable: mint (or return) this user's tokenized feed URL. The feed itself
    // is public-by-token so calendar apps can poll it without auth headers.
    if (p === '/calendar/enable' && request.method === 'POST') {
      const uid = await authUid(request, env);
      if (!uid) return json({ error: 'unauthorized' }, 401, env);
      if (!env.store.getCalToken) return json({ error: 'not supported' }, 501, env);
      let token = await env.store.getCalToken(uid);
      if (!token) {
        token = [...crypto.getRandomValues(new Uint8Array(18))].map((b) => b.toString(16).padStart(2, '0')).join('');
        await env.store.setCalToken(uid, token);
      }
      const base = new URL(request.url).origin;
      return json({ token, url: `${base}/calendar.ics?t=${token}` }, 200, env);
    }
    if (p === '/calendar.ics' && request.method === 'GET') {
      const token = new URL(request.url).searchParams.get('t') || '';
      const uid = token && env.store.getUserIdByCalToken ? await env.store.getUserIdByCalToken(token) : null;
      if (!uid) return json({ error: 'not found' }, 404, env);
      const r = await env.store.getState(uid);
      let state = null;
      try { state = r ? JSON.parse(r.blob) : null; } catch (e) { /* corrupt blob */ }
      const body = buildCalendarFeed(state || {});
      return new Response(body, { status: 200, headers: { ...cors(env), 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'max-age=900' } });
    }

    if (p === '/entitlement' && request.method === 'GET') {
      const uid = await authUid(request, env);
      if (!uid) return json({ error: 'unauthorized' }, 401, env);
      const { tier } = await tierOf(request, env);
      return json({ tier, active: tier === 'plus', uid }, 200, env);
    }

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

    // Push self-diagnostics. /push/status reports how many subscriptions the
    // server actually holds for this account (catches "browser says subscribed
    // but the POST never landed"); /push/test sends a real push right now and
    // returns each push-service status code (201 = accepted, 401/403 = VAPID
    // mismatch, 404/410 = expired) so delivery can be verified without the cron.
    if (p === '/push/status' && request.method === 'GET') {
      const uid = await authUid(request, env);
      if (!uid) return json({ error: 'unauthorized' }, 401, env);
      const subs = await env.store.listPushSubsForUser(uid);
      return json({
        subscriptions: subs.length,
        vapidConfigured: !!(env.VAPID_PRIVATE && env.VAPID_PUBLIC),
        endpoints: subs.map((s) => ({ host: hostOf(s.endpoint), last_notified: s.last_notified || 0 })),
      }, 200, env);
    }

    if (p === '/push/test' && request.method === 'POST') {
      const uid = await authUid(request, env);
      if (!uid) return json({ error: 'unauthorized' }, 401, env);
      if (!env.VAPID_PRIVATE || !env.VAPID_PUBLIC) return json({ error: 'VAPID keys not configured on the server' }, 503, env);
      const subs = await env.store.listPushSubsForUser(uid);
      if (!subs.length) return json({ error: 'no subscriptions stored for this account', subscriptions: 0 }, 404, env);
      const vapid = await importVapid(env.VAPID_PRIVATE, env.VAPID_PUBLIC, env.VAPID_SUBJECT);
      const payload = JSON.stringify({ title: 'Other', body: 'Test check-in ✦ your companions can reach you.', url: env.ALLOWED_ORIGIN || './' });
      const results = [];
      for (const s of subs) {
        try {
          const status = await sendPush({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, vapid);
          if (status === 404 || status === 410) await env.store.deletePushSub(uid, s.endpoint);
          results.push({ host: hostOf(s.endpoint), status });
        } catch (e) {
          results.push({ host: hostOf(s.endpoint), error: String(e) });
        }
      }
      return json({ subscriptions: subs.length, results }, 200, env);
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
  const valid = (id) => typeof id === 'string' && /^[A-Za-z0-9]+$/.test(id);
  // Prefer a per-companion voice the client picked; else the configured list; else a default.
  const voiceId = valid(b?.voiceId) ? b.voiceId : (voices.length ? voices[(Number(b.voiceIdx) || 0) % voices.length] : '21m00Tcm4TlvDq8ikWAM');
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

// Stream Anthropic's SSE and re-emit only the text deltas as a plain UTF-8
// stream (content-type text/plain). On upstream error, falls back to a JSON
// error the client can detect by content-type.
async function aiStream(payload, env) {
  let upstream;
  try {
    upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': ANTHROPIC_VERSION },
      body: JSON.stringify({ ...payload, stream: true }),
    });
  } catch (e) {
    return json({ error: 'upstream request failed', detail: String(e) }, 502, env);
  }
  if (!upstream.ok || !upstream.body) {
    const d = await upstream.text().catch(() => '');
    return json({ error: 'anthropic error', status: upstream.status, detail: d.slice(0, 200) }, upstream.status || 502, env);
  }
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buf = '';
  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) { controller.close(); return; }
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith('data:')) continue;
        const data = t.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const evt = JSON.parse(data);
          if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta' && evt.delta.text) {
            controller.enqueue(encoder.encode(evt.delta.text));
          }
        } catch (e) { /* keepalive / partial line */ }
      }
    },
    cancel() { try { reader.cancel(); } catch (e) { /* ignore */ } },
  });
  return new Response(stream, { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-cache', ...cors(env) } });
}

async function signup(request, env) {
  if (!env.SECRET) return json({ error: 'auth not configured' }, 503, env);
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
  if (!env.SECRET) return json({ error: 'auth not configured' }, 503, env);
  const b = await body(request);
  const email = (b?.email || '').trim().toLowerCase();
  const password = b?.password || '';
  const user = await env.store.getUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.pw_salt, user.pw_hash))) {
    return json({ error: 'wrong email or password' }, 401, env);
  }
  return json({ token: await signToken(user.id, env.SECRET), email }, 200, env);
}

// Subscription webhook (RevenueCat by default; also accepts a flat shape for
// Stripe relays/tests). Verifies a shared secret, then upserts the user's
// entitlement keyed by app_user_id (which the client sets to our user id).
async function billingWebhook(request, env) {
  const secret = env.BILLING_WEBHOOK_SECRET;
  // Fail closed: without a configured shared secret there is no safe way to
  // trust this webhook, so refuse rather than accept unauthenticated
  // entitlement writes (which would let anyone grant themselves Plus). Set
  // BILLING_WEBHOOK_SECRET to enable billing.
  if (!secret) return json({ error: 'billing not configured' }, 503, env);
  const auth = request.headers.get('authorization') || '';
  if (auth !== secret && auth !== `Bearer ${secret}`) return json({ error: 'unauthorized' }, 401, env);
  if (!env.store.setEntitlement) return json({ error: 'entitlements unsupported' }, 500, env);
  const b = await body(request);
  const ev = b?.event || b || {};
  const uid = ev.app_user_id || ev.uid || ev.user_id;
  if (!uid) return json({ error: 'app_user_id required' }, 400, env);
  const type = String(ev.type || '').toUpperCase();
  const ENDED = ['EXPIRATION', 'BILLING_ISSUE', 'SUBSCRIPTION_PAUSED', 'REFUND'];
  let expires_at = Number(ev.expiration_at_ms) || Number(ev.expires_at) || 0;
  let tier = 'plus';
  if (ENDED.includes(type)) { tier = 'free'; if (!expires_at) expires_at = Date.now(); }
  await env.store.setEntitlement(uid, { tier, status: type || 'updated', expires_at, provider: ev.provider || 'revenuecat' });
  return json({ ok: true }, 200, env);
}

// Resolve the caller's subscription tier. Anonymous/keyless => free.
async function tierOf(request, env) {
  const uid = await authUid(request, env);
  if (!uid || !env.store.getEntitlement) return { uid: null, tier: 'free' };
  try {
    const ent = await env.store.getEntitlement(uid);
    const active = !!(ent && ent.tier === 'plus' && (!ent.expires_at || ent.expires_at > Date.now()));
    return { uid, tier: active ? 'plus' : 'free' };
  } catch (e) {
    // Entitlements table not migrated yet (or transient) — never break /ai.
    return { uid, tier: 'free' };
  }
}

// The model is chosen SERVER-SIDE by tier so a client can't self-upgrade by
// changing the requested model. Free => Haiku. Plus => the premium model up to
// a daily cap, then it gracefully falls back to Haiku (cost protection).
async function modelForRequest(request, env) {
  const free = env.FREE_MODEL || 'claude-haiku-4-5-20251001';
  const plus = env.PLUS_MODEL || 'claude-sonnet-5';
  const { uid, tier } = await tierOf(request, env);
  if (tier !== 'plus') return free;
  const cap = numEnv(env.PLUS_DAILY_PREMIUM, 150);
  if (env.store.rateLimit && cap > 0) {
    const r = await env.store.rateLimit(`aiplus:day:${uid}`, cap, 86_400_000);
    if (r && r.allowed === false) return free;
  }
  return plus;
}

// Claude proxy — same contract as worker/ ({model,max_tokens,system,messages} -> {text}).
// ── Calendar feed (RFC 5545) ────────────────────────────────────────────────
// Built from the user's synced session: companion-created events/reminders
// (message actions), plus yearly recurrences for the user's birthday and each
// companion's "we met" anniversary. Companion chatter never leaves the blob —
// only titles/times of things the user explicitly asked to schedule.
function icsEsc(v) { return String(v || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n'); }
function icsDate(ts) {
  const d = new Date(ts); const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
}
function buildCalendarFeed(state) {
  const now = Date.now();
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Other//Companions//EN', 'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Other — with your companions', 'X-WR-CALDESC:Events and reminders made with your companions in Other'];
  const push = (uid, startTs, endTs, summary, extra = []) => {
    lines.push('BEGIN:VEVENT', `UID:${uid}@other.app`, `DTSTAMP:${icsDate(now)}`, `DTSTART:${icsDate(startTs)}`, `DTEND:${icsDate(endTs)}`, `SUMMARY:${icsEsc(summary)}`, ...extra, 'END:VEVENT');
  };
  // Companion-created actions (past 30 days .. any future)
  const seen = new Set();
  for (const m of (state.messages || [])) {
    const a = m && m.action;
    if (!a || (a.type !== 'calendar' && a.type !== 'reminder')) continue;
    const start = Date.parse(a.start || a.at || '');
    if (!Number.isFinite(start) || start < now - 30 * 86400000) continue;
    const uid = 'act-' + start + '-' + (a.title || a.text || '').slice(0, 20).replace(/\W+/g, '');
    if (seen.has(uid)) continue;
    seen.add(uid);
    const end = a.end ? Date.parse(a.end) : start + (a.type === 'reminder' ? 30 : 60) * 60000;
    push(uid, start, end, a.title || a.text || 'Reminder', a.notes ? [`DESCRIPTION:${icsEsc(a.notes)}`] : []);
  }
  // Birthday (all-day yearly)
  const dob = state.profile && state.profile.dob;
  if (dob && /^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    const [, mm, dd] = dob.split('-');
    const year = new Date().getUTCFullYear();
    lines.push('BEGIN:VEVENT', 'UID:bday@other.app', `DTSTAMP:${icsDate(now)}`,
      `DTSTART;VALUE=DATE:${year}${mm}${dd}`, 'RRULE:FREQ=YEARLY',
      `SUMMARY:${icsEsc((state.profile.name || 'Your') + "'s birthday ✦")}`, 'END:VEVENT');
  }
  // Companion anniversaries (yearly, from bornAt)
  for (const c of (state.companions || [])) {
    if (!c || c.status === 'deleted' || !c.bornAt) continue;
    const b = new Date(c.bornAt); const pad = (n) => String(n).padStart(2, '0');
    lines.push('BEGIN:VEVENT', `UID:anniv-${c.id}@other.app`, `DTSTAMP:${icsDate(now)}`,
      `DTSTART;VALUE=DATE:${b.getUTCFullYear()}${pad(b.getUTCMonth() + 1)}${pad(b.getUTCDate())}`, 'RRULE:FREQ=YEARLY',
      `SUMMARY:${icsEsc('Anniversary with ' + c.name + ' ♡')}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function hasImageContent(messages) {
  for (const m of messages || []) {
    if (Array.isArray(m?.content) && m.content.some((blk) => blk?.type === 'image')) return true;
  }
  return false;
}

async function ai(request, env) {
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'server missing ANTHROPIC_API_KEY' }, 500, env);
  const model = await modelForRequest(request, env);
  const b = await body(request);
  if (!Array.isArray(b?.messages) || !b.messages.length) {
    return json({ error: 'messages required' }, 400, env);
  }
  // Photo moments are a Plus perk (vision adds real cost). Enforce server-side
  // so the gate is real — but only once billing is configured, so keyless/dev
  // deployments (with no subscriptions) keep working. Daily caps still apply.
  if (b.photo || hasImageContent(b.messages)) {
    if (env.BILLING_WEBHOOK_SECRET) {
      const { tier } = await tierOf(request, env);
      if (tier !== 'plus') return json({ error: 'plus_required', feature: 'photo' }, 402, env);
    }
  }
  const payload = {
    model, // server-decided by tier, not the client's requested model
    max_tokens: Math.min(MAX_TOKENS_CAP, Math.max(1, Number(b.max_tokens) || 400)),
    messages: b.messages,
  };
  // Prefer systemBlocks (Anthropic content blocks with cache_control, so the
  // stable prefix is prompt-cached); fall back to a plain string system. The
  // client always sends both, so an older client/worker still works.
  if (Array.isArray(b.systemBlocks) && b.systemBlocks.length) payload.system = b.systemBlocks;
  else if (typeof b.system === 'string' && b.system) payload.system = b.system;
  else if (Array.isArray(b.system) && b.system.length) payload.system = b.system;

  // Streaming path: ask Anthropic to stream and re-emit just the text deltas as
  // a plain-text stream the client can append token-by-token.
  if (b.stream) return aiStream(payload, env);

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
