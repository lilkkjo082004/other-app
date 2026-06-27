# Other — AI Companion Web App

Autonomous, emotionally intelligent AI companions matched to each user through
multi-system astrology. React + Vite, installable as a PWA. See `CLAUDE.md` for
architecture and `OTHER_App_Project_Instructions.md` for the product spec.

## Run locally

```bash
npm install
npm run dev          # dev server
# or
npm run build        # production build -> dist/
npm run preview      # serve the build
```

Without any config the app runs fully, using built-in **placeholder** companion
responses. Onboarding, astrology, chat, voice, persistence, trial/unlock, and
summon all work offline.

## Connect real Claude responses

Companion replies go through a small Cloudflare Worker so your Anthropic API key
never ships in the browser.

1. **Deploy the worker** (one time):
   ```bash
   cd worker
   npm install -g wrangler          # if needed
   wrangler login
   wrangler secret put ANTHROPIC_API_KEY   # paste your sk-ant-... key
   wrangler deploy                  # prints https://other-ai.<you>.workers.dev
   ```
   In production, set `ALLOWED_ORIGIN` in `worker/wrangler.toml` to your web
   app's origin and redeploy. (Full notes in `worker/README.md`.)

2. **Point the app at it** — copy `.env.example` to `.env`:
   ```
   VITE_AI_PROXY=https://other-ai.<you>.workers.dev
   # optional: VITE_AI_MODEL=claude-sonnet-4-6
   ```
   Then `npm run build` (or `npm run dev`). The model defaults to
   `claude-opus-4-8`.

The client → worker contract is `{ model, max_tokens, system, messages }` in,
`{ text }` out; on any error the app falls back to the placeholder voice, so it
never hard-fails.

## Install as an app (PWA)

The build ships a web manifest, icons, and a service worker (offline app shell).
Open the deployed site in a mobile/desktop browser and use "Add to Home Screen"
/ "Install".

### Companion check-ins (push notifications)

With the backend (`server/`) deployed and a VAPID keypair configured, signed-in
users can enable "Companion check-ins" in Settings. A daily cron in the worker
sends a Web Push notification from one of their awake companions. Set
`VITE_VAPID_PUBLIC` in `.env` (matching the worker's `VAPID_PUBLIC`); see
`server/README.md` for the keys and schedule.

## Project layout

- `src/` — the web app (see `CLAUDE.md` for the module map)
- `worker/` — Cloudflare Worker AI proxy
- `public/` — PWA manifest, icons, service worker
- `legacy_flutter/` — the previous Flutter implementation (reference only)
