-- Other backend schema (Cloudflare D1 / SQLite)

CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  email      TEXT UNIQUE NOT NULL,
  pw_hash    TEXT NOT NULL,
  pw_salt    TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Full session blob per user (profile, companions, messages, trial, prefs).
CREATE TABLE IF NOT EXISTS states (
  user_id    TEXT PRIMARY KEY,
  blob       TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Structured, long-term mood history (per companion, over time).
CREATE TABLE IF NOT EXISTS mood_events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      TEXT NOT NULL,
  companion_id TEXT,
  mood         TEXT NOT NULL,
  score        REAL,
  created_at   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mood_user ON mood_events (user_id, created_at);
