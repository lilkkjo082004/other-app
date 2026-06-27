// Cloudflare D1-backed Store. Same async surface as the in-memory store.
export function d1Store(DB) {
  return {
    async getUserByEmail(email) {
      return await DB.prepare('SELECT id, email, pw_hash, pw_salt FROM users WHERE email = ?').bind(email).first();
    },
    async createUser(email, hash, salt) {
      const id = 'u_' + crypto.randomUUID();
      await DB.prepare('INSERT INTO users (id, email, pw_hash, pw_salt, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(id, email, hash, salt, Date.now()).run();
      return { id, email };
    },
    async getState(uid) {
      const r = await DB.prepare('SELECT blob, updated_at FROM states WHERE user_id = ?').bind(uid).first();
      return r ? { blob: r.blob, updated_at: r.updated_at } : null;
    },
    async putState(uid, blob) {
      await DB.prepare(
        'INSERT INTO states (user_id, blob, updated_at) VALUES (?, ?, ?) ' +
        'ON CONFLICT(user_id) DO UPDATE SET blob = excluded.blob, updated_at = excluded.updated_at'
      ).bind(uid, blob, Date.now()).run();
    },
    async addMood(uid, companionId, mood, score) {
      await DB.prepare('INSERT INTO mood_events (user_id, companion_id, mood, score, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(uid, companionId || null, mood, score ?? null, Date.now()).run();
    },
    async moodSummary(uid) {
      const counts = (await DB.prepare('SELECT mood, COUNT(*) AS n FROM mood_events WHERE user_id = ? GROUP BY mood').bind(uid).all()).results || [];
      const recent = (await DB.prepare('SELECT mood, created_at FROM mood_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 30').bind(uid).all()).results || [];
      return { counts, recent };
    },
    async savePushSub(uid, sub) {
      await DB.prepare(
        'INSERT INTO push_subscriptions (endpoint, user_id, p256dh, auth, last_notified) VALUES (?, ?, ?, ?, 0) ' +
        'ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth'
      ).bind(sub.endpoint, uid, sub.keys.p256dh, sub.keys.auth).run();
    },
    async deletePushSub(uid, endpoint) {
      await DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?').bind(endpoint, uid).run();
    },
    async listPushSubs() {
      return (await DB.prepare('SELECT user_id, endpoint, p256dh, auth, last_notified FROM push_subscriptions').all()).results || [];
    },
    async setNotified(endpoint, ts) {
      await DB.prepare('UPDATE push_subscriptions SET last_notified = ? WHERE endpoint = ?').bind(ts, endpoint).run();
    },
    async deleteAccount(uid) {
      await DB.batch([
        DB.prepare('DELETE FROM push_subscriptions WHERE user_id = ?').bind(uid),
        DB.prepare('DELETE FROM mood_events WHERE user_id = ?').bind(uid),
        DB.prepare('DELETE FROM states WHERE user_id = ?').bind(uid),
        DB.prepare('DELETE FROM users WHERE id = ?').bind(uid),
      ]);
    },
    // Atomic fixed-window counter (upsert resets the window when it has elapsed).
    async rateLimit(key, limit, windowMs) {
      const now = Date.now();
      const row = await DB.prepare(
        `INSERT INTO rate_limits (key, count, window_start) VALUES (?1, 1, ?2)
         ON CONFLICT(key) DO UPDATE SET
           count = CASE WHEN rate_limits.window_start <= ?2 - ?3 THEN 1 ELSE rate_limits.count + 1 END,
           window_start = CASE WHEN rate_limits.window_start <= ?2 - ?3 THEN ?2 ELSE rate_limits.window_start END
         RETURNING count, window_start`
      ).bind(key, now, windowMs).first();
      const count = row?.count ?? 1;
      const windowStart = row?.window_start ?? now;
      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        retryAfter: Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000)),
      };
    },
  };
}
