# Launch / Deploy Guide

How to take OTHER from the local preview to a live app with real Claude
responses, accounts + cross-device sync, push check-ins, and **natural
(non-robotic) companion voices**.

There are two pieces:

1. **Backend** (`server/`) — a Cloudflare Worker + D1 database. Holds your API
   keys, serves `/ai` (Claude), `/tts` (ElevenLabs voices), accounts, sync,
   mood, and the push cron.
2. **Web app** (the Vite build in `dist/`) — any static host. It talks to the
   backend via `VITE_API_BASE`.

---

## 0. Prerequisites

- **Node 18+** and **npm**.
- A **Cloudflare account** (free tier is fine) + the `wrangler` CLI
  (`npm i -g wrangler`, then `wrangler login`).
- An **Anthropic API key** (`sk-ant-…`) → real companion responses.
- *(For natural voices)* an **ElevenLabs API key** + account.
- *(For push check-ins)* a **VAPID keypair** (generate with
  `npx web-push generate-vapid-keys`).

---

## 1. Deploy the backend

From `server/`:

```bash
cd server
npm install            # (no deps required, but harmless)
wrangler login
./deploy.sh
```

`deploy.sh` is idempotent. On the **first run** it creates the D1 database and
stops so you can paste the printed `database_id` into `server/wrangler.toml`
(replace `REPLACE_WITH_D1_DATABASE_ID`). Run `./deploy.sh` again and it will:

1. apply `schema.sql` to D1,
2. prompt for secrets (skips any already set),
3. deploy, printing your URL: `https://other-api.<you>.workers.dev`.

### Secrets (set when prompted, or manually)

```bash
wrangler secret put AUTH_SECRET         # any long random string (token signing)
wrangler secret put ANTHROPIC_API_KEY   # sk-ant-…  -> enables /ai
wrangler secret put ELEVENLABS_API_KEY  # -> enables /tts natural voices
wrangler secret put VAPID_PRIVATE       # -> enables push check-ins
```

### Vars (edit `server/wrangler.toml` `[vars]`)

```toml
ALLOWED_ORIGIN = "https://your-web-origin.com"   # lock CORS in production
VAPID_PUBLIC   = "B…"                              # push (matches the web app)
VAPID_SUBJECT  = "mailto:you@example.com"
# Optional:
# ELEVEN_VOICE_IDS = "id1,id2,id3"   # default per-companion voices
# ELEVEN_MODEL     = "eleven_turbo_v2_5"
# AI_RATE_LIMIT = "30"   AUTH_RATE_LIMIT = "20"
```

Re-run `wrangler deploy` (or `./deploy.sh`) after editing vars.

Quick check: `curl https://other-api.<you>.workers.dev/health` → `{"ok":true}`.

---

## 2. Point the web app at the backend

Create a `.env` in the repo root (see `.env.example`):

```bash
VITE_API_BASE=https://other-api.<you>.workers.dev
VITE_NATURAL_VOICE=1            # turn on natural (ElevenLabs) voices
VITE_VAPID_PUBLIC=B…            # same public key as the worker (for push)
# VITE_AI_MODEL=claude-sonnet-4-6   # optional cheaper model
```

Then build:

```bash
npm install
npm run build      # outputs dist/
```

Host `dist/` on any static host — **Cloudflare Pages** pairs nicely:

```bash
npx wrangler pages deploy dist --project-name other-app
```

(Netlify, Vercel static, GitHub Pages, S3, etc. all work too.) After it's up,
set the worker's `ALLOWED_ORIGIN` to that final origin and redeploy the worker.

---

## 3. Turn on natural voices (the "non-robotic" part)

Natural voices need **both** sides:

- Backend: `ELEVENLABS_API_KEY` secret set (step 1).
- Web app: `VITE_NATURAL_VOICE=1` **and** `VITE_API_BASE` set (step 2), rebuilt.

Once both are live, each companion's profile → **Voice** shows the lifelike
preset list (Rachel, Bella, Domi, Elli, Antoni, Josh, Arnold, Sam) instead of
the browser-voice + tone picker. Pick one per companion and hit **▶ Preview**.
The choice is saved on the companion and used for every spoken line. If a `/tts`
call ever fails, the app silently falls back to the browser voice — it never
goes mute.

> Cost note: ElevenLabs bills per character synthesized. Auto-speak + previews
> consume credits; `AI_RATE_LIMIT` also throttles `/tts` per IP.

---

## 4. Launch checklist

- [ ] `wrangler login` done; D1 created and `database_id` in `wrangler.toml`.
- [ ] Secrets set: `AUTH_SECRET`, `ANTHROPIC_API_KEY`, (+ `ELEVENLABS_API_KEY`, `VAPID_PRIVATE`).
- [ ] Vars set: `ALLOWED_ORIGIN`, (+ `VAPID_PUBLIC`, `VAPID_SUBJECT`).
- [ ] Worker deployed; `/health` returns ok.
- [ ] Web `.env` has `VITE_API_BASE` (+ `VITE_NATURAL_VOICE`, `VITE_VAPID_PUBLIC`).
- [ ] `npm run build`; `dist/` hosted; `ALLOWED_ORIGIN` matches that origin.
- [ ] Sign up in the app → companion replies are real (Claude), voices are natural.
- [ ] **Privacy Policy + Disclaimer** added to `src/data/legal.js` (still pending).
- [ ] *(Store)* Google Play wrapper built with `window.__OTHER_NATIVE__` set so
      mature content stays web-only.

---

## Still outstanding (not deploy-related)

- **Privacy Policy + Disclaimer** documents — drop the markdown into
  `src/data/legal.js`; the Terms already reference both.
- **Payments** — `src/lib/purchase.js` is simulated; swap for a real SDK when
  ready (on hold).
- **Store packaging** — a TWA/Capacitor wrapper for Google Play.
