# Other — Backend API (Cloudflare Worker + D1)

Accounts, cross-device cloud sync of the session, long-term mood tracking, and
the Claude AI proxy — one Worker over a D1 (SQLite) database. Supersedes the
AI-only `../worker/` when you want a full backend.

## Endpoints

| Method | Path            | Auth | Purpose                                   |
|--------|-----------------|------|-------------------------------------------|
| GET    | `/health`       | —    | Liveness check                            |
| POST   | `/auth/signup`  | —    | `{email,password}` → `{token}`            |
| POST   | `/auth/login`   | —    | `{email,password}` → `{token}`            |
| GET    | `/state`        | ✓    | Returns the saved session `{state}`       |
| PUT    | `/state`        | ✓    | `{state}` — save the session blob         |
| POST   | `/mood`         | ✓    | `{mood,score?,companionId?}` — log a mood |
| GET    | `/mood/summary` | ✓    | Aggregated mood counts + recent history   |
| POST   | `/push/subscribe`   | ✓ | `{subscription}` — store a Web Push sub |
| POST   | `/push/unsubscribe` | ✓ | `{endpoint}` — remove a Web Push sub    |
| DELETE | `/account`      | ✓    | Erase the user + all server data (ToS §10.1) |
| POST   | `/ai`           | —    | `{model,system,messages}` → `{text}`      |

Auth is a Bearer token (`Authorization: Bearer <token>`) — a stateless
HMAC-signed `uid.exp.sig`. Passwords are hashed with PBKDF2-SHA256.

## Companion check-ins (Web Push)

A `scheduled()` cron handler fans out companion-initiated check-in
notifications to subscribed devices (RFC 8291 `aes128gcm` payload encryption,
RFC 8292 VAPID auth — all via Web Crypto, no dependencies). It picks an awake
companion from each user's synced state and rate-limits to ~once per device per
day. The schedule lives in `wrangler.toml` (`[triggers] crons`); it is a no-op
until VAPID keys are configured.

Generate a VAPID keypair (e.g. `npx web-push generate-vapid-keys`), then:

```bash
wrangler secret put VAPID_PRIVATE   # the private key
```

and in `wrangler.toml` `[vars]` set `VAPID_PUBLIC` (the public key) and
`VAPID_SUBJECT` (`mailto:you@example.com`). The same public key goes in the web
app's `.env` as `VITE_VAPID_PUBLIC`.

## Deploy

```bash
cd server
npm install -g wrangler            # if needed
wrangler login

wrangler d1 create other           # paste the printed database_id into wrangler.toml
wrangler d1 execute other --remote --file=./schema.sql

wrangler secret put AUTH_SECRET        # a long random string
wrangler secret put ANTHROPIC_API_KEY  # sk-ant-... (enables /ai)
wrangler secret put VAPID_PRIVATE      # optional — enables push check-ins

wrangler deploy                    # prints https://other-api.<you>.workers.dev
```

Set `ALLOWED_ORIGIN` in `wrangler.toml` to your web app's origin for production
CORS, then redeploy.

## Point the app at it

In the web app's `.env`:

```
VITE_API_BASE=https://other-api.<you>.workers.dev
```

The client (`src/lib/api.js`) then uses the backend for auth, state sync, mood,
and AI. With `VITE_API_BASE` unset the app stays fully local (localStorage +
placeholder responses).

## Test

```bash
cd server
npm test    # runs the handlers against an in-memory store (no network/D1 needed)
```

## Local dev

```bash
wrangler dev    # local Worker + local D1 (miniflare)
```
