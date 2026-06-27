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
| POST   | `/tts`          | —    | `{text,voiceIdx}` → `audio/mpeg` (ElevenLabs) |

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

Turnkey path — from `server/`, with `wrangler` logged in (`npx wrangler login`):

```bash
./deploy.sh    # creates D1, applies schema, prompts for secrets, deploys
```

It's idempotent and re-runnable; the only manual step is pasting the printed
D1 `database_id` into `wrangler.toml` the first time (the script stops and tells
you). Or run the steps yourself via the npm scripts:

```bash
npm run migrate    # wrangler d1 execute other --remote --file=./schema.sql
npm run deploy     # wrangler deploy
npm run tail       # stream live logs
npm run dev        # local Worker + local D1 (miniflare)
```

Secrets (set with `wrangler secret put`): `AUTH_SECRET` (token signing),
`ANTHROPIC_API_KEY` (enables `/ai`), `VAPID_PRIVATE` (enables push),
`ELEVENLABS_API_KEY` (enables `/tts` natural voices).

`/tts` proxies ElevenLabs and streams `audio/mpeg` back, keeping the key
server-side; it's a no-op (`503`) until `ELEVENLABS_API_KEY` is set. The web app
uses it when `VITE_NATURAL_VOICE=1`, falling back to browser speech synthesis
otherwise. Optional vars: `ELEVEN_VOICE_IDS` (per-companion voices) and
`ELEVEN_MODEL`.

Vars in `wrangler.toml` `[vars]`: `ALLOWED_ORIGIN` (lock CORS to your web
origin), `VAPID_PUBLIC` + `VAPID_SUBJECT` (push), and optional
`AI_RATE_LIMIT` / `AUTH_RATE_LIMIT`.

## Rate limiting

`/ai` and the auth endpoints are throttled per client IP (Cloudflare's
`CF-Connecting-IP`) using a fixed-window counter stored in D1 (`rate_limits`
table) — over-limit requests get `429` with a `Retry-After` header. Defaults are
**30/min** for `/ai` (cost control) and **20/min** for `/auth/*` (brute-force
protection); override with the `AI_RATE_LIMIT` / `AUTH_RATE_LIMIT` vars. The
limiter is part of the `Store` interface, so it runs in the in-memory test
harness too.

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
