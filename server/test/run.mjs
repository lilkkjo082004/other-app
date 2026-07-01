// Runs the real request handlers against the in-memory store using Node's
// global Web APIs (Request/Response/fetch/crypto). No network or D1 needed.
import { handle } from '../src/handlers.js';
import { memoryStore } from '../src/store-memory.js';
import { inQuietHours, scheduleDue } from '../src/worker.js';

const env = { store: memoryStore(), SECRET: 'test-secret', ALLOWED_ORIGIN: '*' };
let passed = 0, failed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓', msg); } else { failed++; console.log('  ✗', msg); } }

const call = async (method, path, { token, body: b } = {}) => {
  const headers = {};
  if (b) headers['content-type'] = 'application/json';
  if (token) headers.authorization = 'Bearer ' + token;
  const res = await handle(new Request('http://api' + path, { method, headers, body: b ? JSON.stringify(b) : undefined }), env);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
};

console.log('auth');
let r = await call('GET', '/health');
ok(r.status === 200 && r.data.ok, 'health check');

r = await call('POST', '/auth/signup', { body: { email: 'bad', password: 'short' } });
ok(r.status === 400, 'rejects invalid email');

r = await call('POST', '/auth/signup', { body: { email: 'alex@other.app', password: 'hunter2pw' } });
ok(r.status === 200 && r.data.token, 'signup returns a token');
const token = r.data.token;

r = await call('POST', '/auth/signup', { body: { email: 'alex@other.app', password: 'hunter2pw' } });
ok(r.status === 409, 'rejects duplicate email');

r = await call('POST', '/auth/login', { body: { email: 'alex@other.app', password: 'wrong' } });
ok(r.status === 401, 'login rejects wrong password');

r = await call('POST', '/auth/login', { body: { email: 'alex@other.app', password: 'hunter2pw' } });
ok(r.status === 200 && r.data.token, 'login returns a token');

console.log('state sync');
r = await call('GET', '/state');
ok(r.status === 401, 'state requires auth');

r = await call('GET', '/state', { token });
ok(r.status === 200 && r.data.state === null, 'empty state for new user');

const session = { profile: { name: 'Alex' }, companions: [{ id: 'a', name: 'Pearl', purchased: true }], messages: [{ role: 'user', content: 'hi' }], trialStart: null };
r = await call('PUT', '/state', { token, body: { state: session } });
ok(r.status === 200 && r.data.ok, 'put state');

r = await call('GET', '/state', { token });
ok(r.status === 200 && r.data.state?.companions?.[0]?.name === 'Pearl', 'get state round-trips');

// Cross-"device": a second login with the same account sees the same state.
const r2 = await call('POST', '/auth/login', { body: { email: 'alex@other.app', password: 'hunter2pw' } });
const r3 = await call('GET', '/state', { token: r2.data.token });
ok(r3.data.state?.profile?.name === 'Alex', 'state syncs across sessions (cross-device)');

console.log('mood tracking');
r = await call('POST', '/mood', { token, body: { mood: 'stressed', companionId: 'a' } });
ok(r.status === 200, 'log mood 1');
await call('POST', '/mood', { token, body: { mood: 'happy' } });
await call('POST', '/mood', { token, body: { mood: 'stressed' } });
r = await call('GET', '/mood/summary', { token });
const stressed = r.data.counts?.find((c) => c.mood === 'stressed');
ok(stressed?.n === 2 && r.data.recent?.length === 3, 'mood summary aggregates');

console.log('push subscriptions');
const sub = { endpoint: 'https://push.example/abc', keys: { p256dh: 'BPp256dhkey', auth: 'authsecret' } };
r = await call('POST', '/push/subscribe', { body: { subscription: sub } });
ok(r.status === 401, 'push subscribe requires auth');

r = await call('POST', '/push/subscribe', { token, body: { subscription: { endpoint: 'x' } } });
ok(r.status === 400, 'rejects malformed subscription');

r = await call('POST', '/push/subscribe', { token, body: { subscription: sub } });
ok(r.status === 200 && r.data.ok, 'subscribe stores the push subscription');

const stored = await env.store.listPushSubs();
ok(stored.length === 1 && stored[0].p256dh === 'BPp256dhkey', 'subscription is persisted with keys');

r = await call('POST', '/push/unsubscribe', { token });
ok(r.status === 400, 'unsubscribe requires an endpoint');

r = await call('POST', '/push/unsubscribe', { token, body: { endpoint: sub.endpoint } });
ok(r.status === 200 && r.data.ok, 'unsubscribe removes the subscription');
ok((await env.store.listPushSubs()).length === 0, 'subscription is gone after unsubscribe');

console.log('account deletion');
r = await call('DELETE', '/account');
ok(r.status === 401, 'account deletion requires auth');

const del = await call('POST', '/auth/signup', { body: { email: 'del@other.app', password: 'deletemepw' } });
const delTok = del.data.token;
await call('PUT', '/state', { token: delTok, body: { state: { profile: { name: 'Del' }, companions: [] } } });
await call('POST', '/mood', { token: delTok, body: { mood: 'sad' } });
await call('POST', '/push/subscribe', { token: delTok, body: { subscription: { endpoint: 'https://push.example/del', keys: { p256dh: 'k', auth: 'a' } } } });

r = await call('DELETE', '/account', { token: delTok });
ok(r.status === 200 && r.data.ok, 'deletes the account');

r = await call('POST', '/auth/login', { body: { email: 'del@other.app', password: 'deletemepw' } });
ok(r.status === 401, 'deleted account can no longer log in');
r = await call('GET', '/state', { token: delTok });
ok(r.status === 200 && r.data.state === null, 'deleted account has no server state');
ok((await env.store.listPushSubs()).every((s) => s.endpoint !== 'https://push.example/del'), 'push subs purged on deletion');

console.log('rate limiting');
const rlEnv = { store: memoryStore(), SECRET: 'test-secret', ALLOWED_ORIGIN: '*', AUTH_RATE_LIMIT: '2' };
const hit = (ip) => handle(new Request('http://api/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip },
  body: JSON.stringify({ email: 'nobody@other.app', password: 'whatever' }),
}), rlEnv);
const a1 = await hit('9.9.9.9'); const a2 = await hit('9.9.9.9'); const a3 = await hit('9.9.9.9');
ok(a1.status === 401 && a2.status === 401, 'first two attempts pass through (limit 2)');
ok(a3.status === 429, 'third attempt is rate limited');
ok(!!a3.headers.get('retry-after'), 'rate-limit response sets retry-after');
const b1 = await hit('1.1.1.1');
ok(b1.status === 401, 'a different IP has its own bucket');

console.log('tts proxy');
r = await call('POST', '/tts', { body: { text: 'hello' } });
ok(r.status === 503, 'tts is 503 until ELEVENLABS_API_KEY is set');
const ttsEnv = { store: memoryStore(), SECRET: 'test-secret', ALLOWED_ORIGIN: '*', ELEVENLABS_API_KEY: 'k' };
const ttsRes = await handle(new Request('http://api/tts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ voiceIdx: 0 }) }), ttsEnv);
ok(ttsRes.status === 400, 'tts requires text');

r = await call('GET', '/state', { token: 'garbage.token.here' });
ok(r.status === 401, 'rejects tampered token');

console.log('subscriptions');
{
  const subEnv = { store: memoryStore(), SECRET: 'test-secret', ALLOWED_ORIGIN: '*', BILLING_WEBHOOK_SECRET: 'whsec', ANTHROPIC_API_KEY: 'k', PLUS_DAILY_PREMIUM: '2' };
  const subCall = async (method, path, { token, body: b, headers: extra } = {}) => {
    const headers = { ...(extra || {}) };
    if (b) headers['content-type'] = 'application/json';
    if (token) headers.authorization = 'Bearer ' + token;
    const res = await handle(new Request('http://api' + path, { method, headers, body: b ? JSON.stringify(b) : undefined }), subEnv);
    return { status: res.status, data: await res.json().catch(() => ({})) };
  };
  const su = await subCall('POST', '/auth/signup', { body: { email: 'sub@other.app', password: 'hunter2pw' } });
  const subTok = su.data.token;
  const subUser = await subEnv.store.getUserByEmail('sub@other.app');

  let w = await subCall('POST', '/billing/webhook', { body: { event: { type: 'INITIAL_PURCHASE', app_user_id: subUser.id, expiration_at_ms: Date.now() + 86400000 } } });
  ok(w.status === 401, 'billing webhook rejects without the shared secret');
  w = await subCall('POST', '/billing/webhook', { headers: { authorization: 'Bearer whsec' }, body: { event: { type: 'INITIAL_PURCHASE', app_user_id: subUser.id, expiration_at_ms: Date.now() + 86400000 } } });
  ok(w.status === 200 && w.data.ok, 'billing webhook grants plus with the secret');

  let e = await subCall('GET', '/entitlement', { token: subTok });
  ok(e.status === 200 && e.data.tier === 'plus' && e.data.active, 'entitlement reflects active plus');

  const origFetch = globalThis.fetch;
  let lastModel = null;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('api.anthropic.com')) {
      lastModel = JSON.parse(opts.body).model;
      return new Response(JSON.stringify({ content: [{ type: 'text', text: 'hi' }], stop_reason: 'end_turn' }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return origFetch(url, opts);
  };
  await subCall('POST', '/ai', { body: { model: 'spoofed-premium', messages: [{ role: 'user', content: 'hi' }] } });
  ok(lastModel === 'claude-haiku-4-5-20251001', 'anonymous request is served the free model (ignores client model)');
  await subCall('POST', '/ai', { token: subTok, body: { model: 'spoofed', messages: [{ role: 'user', content: 'hi' }] } });
  ok(lastModel === 'claude-sonnet-5', 'plus user is served the premium model');
  await subCall('POST', '/ai', { token: subTok, body: { messages: [{ role: 'user', content: 'hi' }] } }); // 2nd premium call (cap=2)
  await subCall('POST', '/ai', { token: subTok, body: { messages: [{ role: 'user', content: 'hi' }] } }); // 3rd -> over cap
  ok(lastModel === 'claude-haiku-4-5-20251001', 'plus user over the daily premium cap falls back to the free model');

  // Photo moments (vision) are gated to Plus when billing is configured.
  const imgMsg = [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'AAAA' } }, { type: 'text', text: 'react' }] }];
  let reached = false;
  const wrap = globalThis.fetch;
  globalThis.fetch = async (url, opts) => { if (String(url).includes('api.anthropic.com')) reached = true; return wrap(url, opts); };
  const anonPhoto = await subCall('POST', '/ai', { body: { messages: imgMsg, photo: true } });
  ok(anonPhoto.status === 402 && !reached, 'photo from a free/anonymous user is blocked (402) when billing is on');
  reached = false;
  const plusPhoto = await subCall('POST', '/ai', { token: subTok, body: { messages: imgMsg, photo: true } });
  ok(plusPhoto.status === 200 && reached, 'photo from a Plus user is allowed through to the vision model');
  globalThis.fetch = origFetch;

  w = await subCall('POST', '/billing/webhook', { headers: { authorization: 'Bearer whsec' }, body: { event: { type: 'EXPIRATION', app_user_id: subUser.id } } });
  e = await subCall('GET', '/entitlement', { token: subTok });
  ok(e.data.tier === 'free' && !e.data.active, 'expiration webhook downgrades to free');
}

console.log('photo moments (billing off)');
{
  // With no BILLING_WEBHOOK_SECRET configured (keyless/dev), photos stay open.
  const env = { store: memoryStore(), SECRET: 'test-secret', ALLOWED_ORIGIN: '*', ANTHROPIC_API_KEY: 'k' };
  const origFetch = globalThis.fetch;
  let reached = false;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('api.anthropic.com')) { reached = true; return new Response(JSON.stringify({ content: [{ type: 'text', text: 'hi' }], stop_reason: 'end_turn' }), { status: 200, headers: { 'content-type': 'application/json' } }); }
    return origFetch(url, opts);
  };
  const imgMsg = [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'AAAA' } }, { type: 'text', text: 'react' }] }];
  const res = await handle(new Request('http://api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: imgMsg, photo: true }) }), env);
  ok(res.status === 200 && reached, 'photo is allowed for everyone when billing is not configured');
  globalThis.fetch = origFetch;
}

console.log('quiet hours (check-in scheduling)');
{
  // 2026-07-01 06:00 UTC. A window 22:00→07:00 (UTC) should be quiet at 06:00.
  const now = Date.parse('2026-07-01T06:00:00Z');
  ok(inQuietHours({ tz: 'UTC', quietStart: '22:00', quietEnd: '07:00' }, now) === true, 'inside a midnight-wrapping quiet window is quiet');
  ok(inQuietHours({ tz: 'UTC', quietStart: '08:00', quietEnd: '09:00' }, now) === false, 'outside the quiet window is not quiet');
  ok(inQuietHours({ tz: 'UTC' }, now) === false, 'no quiet window set → never quiet');
  // scheduleDue must respect quiet hours: a 05:00 time already passed by 06:00,
  // but 22:00→07:00 quiet should suppress it.
  ok(scheduleDue({ tz: 'UTC', times: ['05:00'] }, 0, now) === true, 'a passed time is due when not in quiet hours');
  ok(scheduleDue({ tz: 'UTC', times: ['05:00'], quietStart: '22:00', quietEnd: '07:00' }, 0, now) === false, 'quiet hours suppress an otherwise-due check-in');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
