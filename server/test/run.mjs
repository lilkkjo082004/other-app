// Runs the real request handlers against the in-memory store using Node's
// global Web APIs (Request/Response/fetch/crypto). No network or D1 needed.
import { handle } from '../src/handlers.js';
import { memoryStore } from '../src/store-memory.js';
import { inQuietHours, scheduleDue, dueEventReminders, dueHabitReminders } from '../src/worker.js';

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

console.log('calendar feed');
{
  const env2 = { store: (await import('../src/store-memory.js')).memoryStore(), SECRET: 'test-secret', ALLOWED_ORIGIN: '*' };
  const call2 = async (method, path, { token, body: b } = {}) => {
    const headers = {};
    if (b) headers['content-type'] = 'application/json';
    if (token) headers.authorization = 'Bearer ' + token;
    const res = await handle(new Request('http://api' + path, { method, headers, body: b ? JSON.stringify(b) : undefined }), env2);
    return res;
  };
  const su = await (await call2('POST', '/auth/signup', { body: { email: 'cal@other.app', password: 'hunter2pw' } })).json();
  // seed a state with an action, a dob, and a companion
  const future = new Date(Date.now() + 3 * 86400000).toISOString();
  await call2('PUT', '/state', { token: su.token, body: { state: {
    profile: { name: 'Sam', dob: '1995-08-05' },
    companions: [{ id: 'c1', name: 'Coral', status: 'awake', bornAt: Date.parse('2026-05-01') }],
    messages: [{ role: 'assistant', content: 'ok!', action: { type: 'calendar', title: 'Dentist', start: future } }],
  } } });
  const en = await (await call2('POST', '/calendar/enable', { token: su.token })).json();
  ok(!!en.token && en.url.includes('/calendar.ics?t='), 'enable returns a tokenized feed URL');
  const en2 = await (await call2('POST', '/calendar/enable', { token: su.token })).json();
  ok(en2.token === en.token, 'enable is idempotent (same token)');
  const feedRes = await call2('GET', '/calendar.ics?t=' + en.token, {});
  const feed = await feedRes.text();
  ok(feedRes.status === 200 && feedRes.headers.get('content-type').includes('text/calendar'), 'feed serves text/calendar');
  ok(feed.includes('BEGIN:VCALENDAR') && feed.includes('END:VCALENDAR'), 'feed is a VCALENDAR');
  ok(feed.includes('SUMMARY:Dentist'), 'feed contains the companion-created event');
  ok(feed.includes("Sam's birthday") && feed.includes('RRULE:FREQ=YEARLY'), 'feed contains the yearly birthday');
  ok(feed.includes('Anniversary with Coral'), 'feed contains the companion anniversary');
  const bad = await call2('GET', '/calendar.ics?t=wrongtoken', {});
  ok(bad.status === 404, 'wrong token is 404');
  const noauth = await call2('POST', '/calendar/enable', {});
  ok(noauth.status === 401, 'enable requires auth');
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

console.log('event reminders (closed-app push)');
{
  const now = Date.parse('2026-07-01T12:00:00Z');
  const coral = { id: 'c1', name: 'Coral', status: 'awake' };
  const mk = (over) => ({ role: 'assistant', companion: coral, action: { type: 'reminder', title: 'Call Mom', start: now + 30 * 60000, ...over } });
  const blob = { companions: [coral], messages: [mk()] };

  const due = dueEventReminders(blob, now);
  ok(due.length === 1 && /Call Mom/.test(due[0].line) && /Coral/.test(due[0].line), 'imminent companion reminder produces a voiced push line');
  ok(/ev-\d+-call-mom/.test(due[0].key), 'reminder key is stable/sluggy');

  ok(dueEventReminders({ companions: [coral], messages: [mk({ start: now + 5 * 3600000 })] }, now).length === 0, 'events beyond the lead window are not pushed yet');
  ok(dueEventReminders({ companions: [coral], messages: [mk({ start: now - 60000 })] }, now).length === 0, 'past events are never pushed');
  ok(dueEventReminders({ companions: [coral], messages: [{ role: 'assistant', content: 'hi' }] }, now).length === 0, 'messages without an action produce nothing');

  // A calendar-type action reads as a heads-up; falls back to any awake companion.
  const cal = { companions: [coral], messages: [{ role: 'assistant', action: { type: 'calendar', title: 'Dentist', start: now + 20 * 60000 } }] };
  const dcal = dueEventReminders(cal, now);
  ok(dcal.length === 1 && /Dentist/.test(dcal[0].line) && /Coral/.test(dcal[0].line), 'calendar action falls back to an awake companion voice');

  // Dedup within a blob: two identical actions collapse to one.
  const dup = dueEventReminders({ companions: [coral], messages: [mk(), mk()] }, now);
  ok(dup.length === 1, 'identical reminders collapse to a single push');
}

console.log('habit reminders (closed-app push)');
{
  const now = Date.UTC(2023, 5, 14, 9, 30); // Wed 09:30 UTC
  const coral = { id: 'c1', name: 'Coral', status: 'awake' };
  const H = (over) => ({ id: 'h1', text: 'Meditate', em: '🧘', when: 'morning', time: '', freq: { type: 'daily' }, lastDone: '', ...over });
  const blob = (h) => ({ companions: [coral], habitReminders: [h] });

  const d = dueHabitReminders(blob(H()), now, 'UTC');
  ok(d.length === 1 && /Meditate/.test(d[0].line) && /Coral/.test(d[0].line), 'a due daily habit produces a voiced nudge');
  ok(d[0].key === 'hb-2023-06-14-h1', 'habit reminder key is per-day-per-habit');
  ok(dueHabitReminders(blob(H({ lastDone: '2023-06-14' })), now, 'UTC').length === 0, 'already done today => no nudge');
  ok(dueHabitReminders(blob(H({ when: 'evening' })), now, 'UTC').length === 0, 'not nudged before the time-of-day arrives');
  ok(dueHabitReminders(blob(H({ time: '05:00' })), now, 'UTC').length === 0, 'not nudged hours after the time passed');

  const wd = H({ freq: { type: 'weekdays', days: [1, 3, 5] } });
  ok(dueHabitReminders(blob(wd), now, 'UTC').length === 1, 'weekday habit is due on a scheduled weekday (Wed)');
  ok(dueHabitReminders(blob(wd), Date.UTC(2023, 5, 13, 9, 30), 'UTC').length === 0, 'weekday habit is not pushed on an off day (Tue)');

  ok(dueHabitReminders(blob(H({ freq: { type: 'weekly' } })), now, 'UTC').length === 0, 'weekly habits are in-app only, not pushed');
  ok(dueHabitReminders(blob(H({ freq: { type: 'timesPerWeek', n: 2 } })), now, 'UTC').length === 0, 'N-per-week habits are in-app only, not pushed');
  ok(dueHabitReminders({ companions: [coral] }, now, 'UTC').length === 0, 'no reminded habits => nothing');
  ok(/Your companion/.test(dueHabitReminders({ companions: [], habitReminders: [H()] }, now, 'UTC')[0].line), 'falls back to a generic voice with no awake companion');
}

console.log('reminder-send dedup store');
{
  const store = memoryStore();
  ok((await store.reminderSent('ep1', 'k1')) === false, 'unsent reminder key reads false');
  await store.markReminderSent('ep1', 'k1', Date.now());
  ok((await store.reminderSent('ep1', 'k1')) === true, 'marked reminder key reads true');
  ok((await store.reminderSent('ep2', 'k1')) === false, 'dedup is per-device (endpoint)');
}

console.log('security: fail closed on missing secrets');
{
  // Auth signing secret absent => issuance and verification both refuse, rather
  // than silently signing/accepting forgeable tokens.
  const noSecret = { store: memoryStore(), ALLOWED_ORIGIN: '*' }; // no SECRET
  const nsCall = async (method, path, { token, body: b } = {}) => {
    const headers = {};
    if (b) headers['content-type'] = 'application/json';
    if (token) headers.authorization = 'Bearer ' + token;
    const res = await handle(new Request('http://api' + path, { method, headers, body: b ? JSON.stringify(b) : undefined }), noSecret);
    return { status: res.status, data: await res.json().catch(() => ({})) };
  };
  let s = await nsCall('POST', '/auth/signup', { body: { email: 'x@other.app', password: 'hunter2pw' } });
  ok(s.status === 503, 'signup fails closed with no AUTH_SECRET');
  s = await nsCall('POST', '/auth/login', { body: { email: 'x@other.app', password: 'hunter2pw' } });
  ok(s.status === 503, 'login fails closed with no AUTH_SECRET');
  s = await nsCall('GET', '/state', { token: 'anything.9999999999.sig' });
  ok(s.status === 401, 'protected route rejects any token with no AUTH_SECRET');

  // Billing webhook without a shared secret must refuse, not accept
  // unauthenticated entitlement writes.
  const noBilling = { store: memoryStore(), SECRET: 'test-secret', ALLOWED_ORIGIN: '*' }; // no BILLING_WEBHOOK_SECRET
  const res = await handle(new Request('http://api/billing/webhook', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ event: { type: 'INITIAL_PURCHASE', app_user_id: 'u_forged', expiration_at_ms: Date.now() + 86400000 } }),
  }), noBilling);
  ok(res.status === 503, 'billing webhook fails closed with no BILLING_WEBHOOK_SECRET');
  ok((await noBilling.store.getEntitlement('u_forged')) == null, 'no entitlement written when billing unconfigured');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
