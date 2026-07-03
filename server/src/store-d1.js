// Cloudflare D1-backed Store. Same async surface as the in-memory store.

// Tables added AFTER the original deploy. CI ships worker code but its token
// can't run D1 migrations, so these can be missing in prod until a migration
// runs. Creating them through the D1 *binding* (below) needs no API-token
// permission, so the features that use them self-heal. Idempotent; the module
// flag makes it run at most once per isolate. Must exactly match schema.sql.
let schemaReady = false;
const LATE_TABLES = [
  "CREATE TABLE IF NOT EXISTS entitlements (user_id TEXT PRIMARY KEY, tier TEXT NOT NULL DEFAULT 'free', status TEXT, provider TEXT, expires_at INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL)",
  'CREATE TABLE IF NOT EXISTS cal_tokens (user_id TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS reminder_sends (endpoint TEXT NOT NULL, rkey TEXT NOT NULL, sent_at INTEGER NOT NULL, PRIMARY KEY (endpoint, rkey))',
];

export function d1Store(DB) {
  return {
    // Create the late-added tables if they're missing. Called once per isolate
    // on the request path (handle) and the cron path (scheduled) so a not-yet-
    // migrated table can never silently break entitlements / calendar / reminders.
    async ensureSchema() {
      if (schemaReady || !DB) return;
      for (const ddl of LATE_TABLES) await DB.prepare(ddl).run();
      schemaReady = true;
    },
    async getUserByEmail(email) {
      return await DB.prepare('SELECT id, email, pw_hash, pw_salt FROM users WHERE email = ?').bind(email).first();
    },
    async setCalToken(uid, token) {
      await DB.prepare(
        'INSERT INTO cal_tokens (user_id, token, created_at) VALUES (?, ?, ?) ' +
        'ON CONFLICT(user_id) DO UPDATE SET token = excluded.token'
      ).bind(uid, token, Date.now()).run();
    },
    async getCalToken(uid) {
      const r = await DB.prepare('SELECT token FROM cal_tokens WHERE user_id = ?').bind(uid).first();
      return r ? r.token : null;
    },
    async getUserIdByCalToken(token) {
      const r = await DB.prepare('SELECT user_id FROM cal_tokens WHERE token = ?').bind(token).first();
      return r ? r.user_id : null;
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
    async listPushSubsForUser(uid) {
      return (await DB.prepare('SELECT user_id, endpoint, p256dh, auth, last_notified FROM push_subscriptions WHERE user_id = ?').bind(uid).all()).results || [];
    },
    async setNotified(endpoint, ts) {
      await DB.prepare('UPDATE push_subscriptions SET last_notified = ? WHERE endpoint = ?').bind(ts, endpoint).run();
    },
    async reminderSent(endpoint, key) {
      const r = await DB.prepare('SELECT 1 FROM reminder_sends WHERE endpoint = ? AND rkey = ?').bind(endpoint, key).first();
      return !!r;
    },
    async markReminderSent(endpoint, key, ts) {
      await DB.prepare(
        'INSERT INTO reminder_sends (endpoint, rkey, sent_at) VALUES (?, ?, ?) ' +
        'ON CONFLICT(endpoint, rkey) DO UPDATE SET sent_at = excluded.sent_at',
      ).bind(endpoint, key, ts).run();
    },
    async deleteAccount(uid) {
      await DB.batch([
        DB.prepare('DELETE FROM reminder_sends WHERE endpoint IN (SELECT endpoint FROM push_subscriptions WHERE user_id = ?)').bind(uid),
        DB.prepare('DELETE FROM cal_tokens WHERE user_id = ?').bind(uid),
        DB.prepare('DELETE FROM push_subscriptions WHERE user_id = ?').bind(uid),
        DB.prepare('DELETE FROM mood_events WHERE user_id = ?').bind(uid),
        DB.prepare('DELETE FROM states WHERE user_id = ?').bind(uid),
        DB.prepare('DELETE FROM entitlements WHERE user_id = ?').bind(uid),
        DB.prepare('DELETE FROM users WHERE id = ?').bind(uid),
      ]);
    },
    async getEntitlement(uid) {
      return await DB.prepare('SELECT user_id, tier, status, provider, expires_at FROM entitlements WHERE user_id = ?').bind(uid).first();
    },
    async setEntitlement(uid, e) {
      await DB.prepare(
        'INSERT INTO entitlements (user_id, tier, status, provider, expires_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT(user_id) DO UPDATE SET tier = excluded.tier, status = excluded.status, provider = excluded.provider, expires_at = excluded.expires_at, updated_at = excluded.updated_at'
      ).bind(uid, e.tier || 'free', e.status || null, e.provider || null, e.expires_at || 0, Date.now()).run();
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
