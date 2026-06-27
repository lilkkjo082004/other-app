#!/usr/bin/env bash
# Turnkey provisioning + deploy for the Other backend (Cloudflare Worker + D1).
#
# Prereqs: Node + `wrangler` installed and logged in (`npx wrangler login`).
# Run from the server/ directory: ./deploy.sh
#
# Idempotent: safe to re-run. The only manual step is pasting the D1 database_id
# into wrangler.toml the first time (the script stops and tells you when).
set -euo pipefail
cd "$(dirname "$0")"

WRANGLER="npx wrangler"

echo "==> 1/5  Ensure the D1 database exists"
if grep -q "REPLACE_WITH_D1_DATABASE_ID" wrangler.toml; then
  echo "    Creating D1 database 'other'..."
  $WRANGLER d1 create other || true
  echo
  echo "  ⛔ First-time setup: copy the database_id printed above into"
  echo "     server/wrangler.toml (replace REPLACE_WITH_D1_DATABASE_ID), then"
  echo "     re-run ./deploy.sh."
  exit 1
fi
echo "    database_id already set."

echo "==> 2/5  Apply schema (remote)"
$WRANGLER d1 execute other --remote --file=./schema.sql

echo "==> 3/5  Set secrets (skips any already set; Ctrl-C to skip the rest)"
set_secret () {
  local name="$1" desc="$2"
  if $WRANGLER secret list 2>/dev/null | grep -q "\"$name\""; then
    echo "    $name already set — skipping."
  else
    echo "    Setting $name ($desc). Paste the value when prompted:"
    $WRANGLER secret put "$name" || echo "    (skipped $name)"
  fi
}
set_secret AUTH_SECRET       "long random string for signing tokens"
set_secret ANTHROPIC_API_KEY "sk-ant-... enables POST /ai"
set_secret VAPID_PRIVATE     "VAPID private key — enables push check-ins (optional)"

echo "==> 4/5  Reminder: set vars in wrangler.toml [vars] before deploying:"
echo "    ALLOWED_ORIGIN (your web origin), VAPID_PUBLIC, VAPID_SUBJECT,"
echo "    and optionally AI_RATE_LIMIT / AUTH_RATE_LIMIT."

echo "==> 5/5  Deploy"
$WRANGLER deploy

echo
echo "✅ Deployed. Point the web app at it with VITE_API_BASE=<the printed URL>"
echo "   (and VITE_VAPID_PUBLIC=<your VAPID public key> for push)."
