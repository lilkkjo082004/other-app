// Runs the real request handlers against the in-memory store using Node's
// global Web APIs (Request/Response/fetch/crypto). No network or D1 needed.
import { handle } from '../src/handlers.js';
import { memoryStore } from '../src/store-memory.js';

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

r = await call('GET', '/state', { token: 'garbage.token.here' });
ok(r.status === 401, 'rejects tampered token');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
