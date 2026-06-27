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
  };
}
