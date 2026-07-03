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

-- Web Push subscriptions (one row per browser/device).
CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint      TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  p256dh        TEXT NOT NULL,
  auth          TEXT NOT NULL,
  last_notified INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions (user_id);

-- Fixed-window rate limiting (per IP / per route). Rows self-heal as windows
-- roll over; an occasional sweep of stale rows is optional.
CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT PRIMARY KEY,
  count        INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);

-- Subscription entitlements (one row per user). tier 'free' | 'plus'. Written
-- by the billing webhook; read on /ai to pick the model server-side.
CREATE TABLE IF NOT EXISTS entitlements (
  user_id    TEXT PRIMARY KEY,
  tier       TEXT NOT NULL DEFAULT 'free',
  status     TEXT,
  provider   TEXT,
  expires_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

-- Calendar subscription feed tokens (one per user). The token gates the public
-- /calendar.ics feed URL that Apple/Google/Outlook subscribe to (webcal://).
CREATE TABLE IF NOT EXISTS cal_tokens (
  user_id    TEXT PRIMARY KEY,
  token      TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cal_token ON cal_tokens (token);

-- Push reminder dedup — one row per (device endpoint, reminder key) so the cron
-- never pushes the same calendar event / task reminder to a device twice.
CREATE TABLE IF NOT EXISTS reminder_sends (
  endpoint TEXT NOT NULL,
  rkey     TEXT NOT NULL,
  sent_at  INTEGER NOT NULL,
  PRIMARY KEY (endpoint, rkey)
);
CREATE INDEX IF NOT EXISTS idx_reminder_sent_at ON reminder_sends (sent_at);
