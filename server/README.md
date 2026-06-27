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
| POST   | `/ai`           | —    | `{model,system,messages}` → `{text}`      |

Auth is a Bearer token (`Authorization: Bearer <token>`) — a stateless
HMAC-signed `uid.exp.sig`. Passwords are hashed with PBKDF2-SHA256.

## Deploy

```bash
cd server
npm install -g wrangler            # if needed
wrangler login

wrangler d1 create other           # paste the printed database_id into wrangler.toml
wrangler d1 execute other --remote --file=./schema.sql

wrangler secret put AUTH_SECRET        # a long random string
wrangler secret put ANTHROPIC_API_KEY  # sk-ant-... (enables /ai)

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
