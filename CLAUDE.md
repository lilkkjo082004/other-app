# OTHER — AI Companion App

## Project Overview

"Other" is an AI companion app: autonomous, emotionally intelligent companions
matched to each user through multi-system astrological compatibility. Companions
are NOT servants or chatbots — they have self-chosen names, pronouns, opinions,
moods, and relationships, and they evolve over time. See
`OTHER_App_Project_Instructions.md` for the full product spec and
`OTHER_App_Specs.xlsx` for the feature tracker.

## Tech Stack (current — web)

The app is a **web app**, framework-agnostic by design.

- **Framework**: React 18 + Vite (plain JSX, no TypeScript)
- **Styling**: inline styles + design tokens in `src/theme.js` (dark cosmic look)
- **AI backend**: Claude API via a Cloudflare Worker proxy (`worker/`). Falls
  back to built-in placeholder responses when no proxy is configured.
- **Voice**: browser `speechSynthesis` (TTS) + `SpeechRecognition` (call-by-name)
- **Persistence**: `localStorage` (single-blob session) — the app resumes into chat
- **State**: React hooks (`useState`), screen-routed from `src/App.jsx`
- **PWA**: installable (`public/manifest.webmanifest` + icons) with an offline
  app-shell service worker (`public/sw.js`, registered in `src/main.jsx`)

> The original Flutter implementation is preserved under `legacy_flutter/` for
> reference. It is no longer the active codebase.

## Project Structure

```
index.html, vite.config.js, package.json
src/
├── main.jsx                 # React entry
├── App.jsx                  # screen router + resume-from-storage + reset
├── theme.js                 # design tokens (C), COMP_COLORS, global CSS
├── config.js                # VITE_AI_PROXY / VITE_AI_MODEL
├── components/ui.jsx        # Shell (cosmic bg), Prog, Pills, Checks
├── data/onboarding.js       # STEPS, ACTIVITIES, CUISINES, DIETARY, builder cats
├── components/UnlockSheet.jsx  # one-time unlock modal
├── lib/
│   ├── zodiac.js            # multi-system engine + compatibility
│   ├── companions.js        # name pools, personality seeds, genComp
│   ├── voice.js             # speakAs + useSpeechRec
│   ├── ambient.js           # ambient companion-to-companion threads
│   ├── prompt.js            # per-companion system prompt builder
│   ├── ai.js                # askCompanion / greetCompanion (proxy + placeholder)
│   ├── entitlements.js      # trial/ownership rules (trialDaysLeft, isLimited)
│   ├── purchase.js          # simulated one-time unlock (swap for a real SDK)
│   └── storage.js           # localStorage session save/load/clear
└── screens/
    ├── Welcome.jsx, Onboarding.jsx, ZodiacReveal.jsx,
    ├── CompanionPreference.jsx, WakingUp.jsx, CompanionSelect.jsx, Chat.jsx,
    ├── Settings.jsx, CompanionProfile.jsx
worker/                      # Cloudflare Worker AI proxy (see worker/README.md)
legacy_flutter/              # the old Flutter app + original React prototype
```

## Running it

```bash
npm install
npm run dev        # local dev server
npm run build      # production build -> dist/
npm run preview    # serve the build
```

Wire up real AI by deploying `worker/` (see `worker/README.md`) and creating a
`.env` with `VITE_AI_PROXY=https://other-ai.<you>.workers.dev` (optionally
`VITE_AI_MODEL=claude-sonnet-4-6`). Without it, the app uses placeholder replies.

## Current Status

### Built
- Full 17-step onboarding (multi-select, back nav, pre-populated answers)
- Multi-system astrology (Western, Chinese + element, numerology) + compatibility
- Surprise Me / Guide Me companion generation with optional free text
- Companion "waking up" sequence; selection (1 free, all 3 = trial copy)
- Group + private chat; ambient conversations; sleep / delete with reactions
- Voice: auto-speak, call-by-name, per-message speaker
- Real Claude responses via the worker proxy, with a characterful offline fallback
- Local persistence + resume; full reset (chat menu)
- Age gating (under-18 content filtering) in the system prompt
- Settings screen (voice, sleep/wake all, trial status, reset) + companion-profile screens
- 14-day trial timer, trial degradation (limited badge + dimmed orbs + banner), simulated unlock/purchase
- Summon-a-companion in-app (free if you own none, else one-time unlock; roster capped at 3)

### Needs Building (web)
- Backend + persistent memory (cross-device, evolution, long-term mood tracking)
- Push notifications (PWA install/service-worker foundation is in place)
- Location services
- Real payment integration (replace `lib/purchase.js`)
- Privacy policy / ToS; store packaging (native wrapper for Google Play)

## Business Entity

Extratac LLC (Douglasville, GA). Privacy Officer: Krristen Jones.
