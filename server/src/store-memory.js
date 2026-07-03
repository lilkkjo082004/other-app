// In-memory Store — used by the test suite and as a stand-in for local dev.
// Mirrors the async surface of the D1-backed store exactly.
export function memoryStore() {
  const usersByEmail = new Map();
  const states = new Map();
  const moods = [];
  const pushSubs = new Map(); // endpoint -> sub
  const rl = new Map(); // rate-limit key -> { count, windowStart }
  const entitlements = new Map(); // uid -> entitlement
  const calTokens = new Map(); // uid -> token
  let seq = 1;

  return {
    async getUserByEmail(email) {
      return usersByEmail.get(email) || null;
    },
    async setCalToken(uid, token) {
      calTokens.set(uid, token);
    },
    async getCalToken(uid) {
      return calTokens.get(uid) || null;
    },
    async getUserIdByCalToken(token) {
      for (const [uid, t] of calTokens) if (t === token) return uid;
      return null;
    },
    async createUser(email, hash, salt) {
      const user = { id: 'u_' + seq++, email, pw_hash: hash, pw_salt: salt };
      usersByEmail.set(email, user);
      return user;
    },
    async getState(uid) {
      return states.get(uid) || null;
    },
    async putState(uid, blob) {
      states.set(uid, { blob, updated_at: Date.now() });
    },
    async addMood(uid, companionId, mood, score) {
      moods.push({ user_id: uid, companion_id: companionId || null, mood, score: score ?? null, created_at: Date.now() });
    },
    async moodSummary(uid) {
      const mine = moods.filter((m) => m.user_id === uid);
      const counts = {};
      for (const m of mine) counts[m.mood] = (counts[m.mood] || 0) + 1;
      return {
        counts: Object.entries(counts).map(([mood, n]) => ({ mood, n })),
        recent: mine.slice(-30).reverse().map((m) => ({ mood: m.mood, created_at: m.created_at })),
      };
    },
    async savePushSub(uid, sub) {
      pushSubs.set(sub.endpoint, { user_id: uid, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, last_notified: 0 });
    },
    async deletePushSub(uid, endpoint) {
      pushSubs.delete(endpoint);
    },
    async listPushSubs() {
      return [...pushSubs.values()];
    },
    async listPushSubsForUser(uid) {
      return [...pushSubs.values()].filter((s) => s.user_id === uid);
    },
    async setNotified(endpoint, ts) {
      const s = pushSubs.get(endpoint);
      if (s) s.last_notified = ts;
    },
    async deleteAccount(uid) {
      for (const [email, u] of usersByEmail) if (u.id === uid) usersByEmail.delete(email);
      states.delete(uid);
      for (let i = moods.length - 1; i >= 0; i--) if (moods[i].user_id === uid) moods.splice(i, 1);
      for (const [ep, s] of pushSubs) if (s.user_id === uid) pushSubs.delete(ep);
      entitlements.delete(uid);
    },
    async getEntitlement(uid) {
      return entitlements.get(uid) || null;
    },
    async setEntitlement(uid, e) {
      entitlements.set(uid, { user_id: uid, tier: e.tier || 'free', status: e.status || null, provider: e.provider || null, expires_at: e.expires_at || 0, updated_at: Date.now() });
    },
    // Fixed-window counter. Returns { allowed, remaining, retryAfter(seconds) }.
    async rateLimit(key, limit, windowMs) {
      const now = Date.now();
      let e = rl.get(key);
      if (!e || now - e.windowStart >= windowMs) { e = { count: 0, windowStart: now }; rl.set(key, e); }
      e.count++;
      return {
        allowed: e.count <= limit,
        remaining: Math.max(0, limit - e.count),
        retryAfter: Math.max(1, Math.ceil((e.windowStart + windowMs - now) / 1000)),
      };
    },
  };
}
