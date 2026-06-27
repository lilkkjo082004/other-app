// In-memory Store — used by the test suite and as a stand-in for local dev.
// Mirrors the async surface of the D1-backed store exactly.
export function memoryStore() {
  const usersByEmail = new Map();
  const states = new Map();
  const moods = [];
  let seq = 1;

  return {
    async getUserByEmail(email) {
      return usersByEmail.get(email) || null;
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
  };
}
