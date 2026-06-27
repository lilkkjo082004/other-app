# OTHER — AI Companion App

## Project Overview

This is "Other," an AI companion app built with Flutter for web and Android (Google Play). The app creates autonomous, emotionally intelligent companions uniquely matched to each user through multi-system astrological compatibility. See `OTHER_App_Project_Instructions.md` for the complete product spec and `OTHER_App_Specs.xlsx` for the feature tracking spreadsheet.

## Core Philosophy

Companions are NOT servants, assistants, or chatbots. They are autonomous personalities with their own names (self-chosen), pronouns (self-chosen), opinions, moods, preferences, and relationships. They push back, disagree, joke around, and evolve over time. The app should feel like opening a door into a living room where your closest friends are already hanging out.

## Tech Stack

- **Framework**: Flutter (Dart)
- **Target platforms**: Web (primary), Android/Google Play (secondary)
- **AI backend**: Claude API via a Cloudflare Worker proxy (`worker/`). Defaults to `claude-opus-4-8`; configurable. Falls back to built-in placeholder responses when no proxy is configured.
- **Voice**: flutter_tts for text-to-speech, speech_to_text for mic input
- **Storage**: shared_preferences for local persistence (to be implemented)
- **State management**: setState (simple StatefulWidget pattern)

## Project Structure

```
lib/
├── main.dart                          # App entry point, theme setup
├── models/
│   ├── user_profile.dart              # User profile data model
│   ├── companion.dart                 # Companion data model + generation
│   └── chat_message.dart              # Chat message model
├── services/
│   ├── companion_ai_service.dart      # AI response generation (placeholder)
│   └── voice_service.dart             # TTS + speech recognition
├── screens/
│   ├── welcome_screen.dart            # Landing/splash screen
│   ├── onboarding_screen.dart         # 17-step onboarding flow
│   └── zodiac_reveal_screen.dart      # Zodiac reveal + companion pref + waking up + selection + chat
├── widgets/
│   └── common_widgets.dart            # Reusable UI components
└── utils/
    ├── theme.dart                     # Colors and design tokens
    ├── zodiac.dart                    # Multi-system zodiac engine
    └── onboarding_data.dart           # Activities, cuisines, builder categories
```

## Key Architecture Decisions

- **All onboarding questions are multi-select** except name and date of birth
- **Back navigation** on every onboarding step with pre-populated answers
- **Companion generation** uses zodiac compatibility — companions get signs harmonious with the user's
- **Companion builder traits** are grouped into 2 screens: Personality Traits and Relationship Dynamics
- **Activity subcategories** are optional — user can fill them out or tell companions later
- **Under-18 users** have romantic/mature content filtered automatically
- **Companion voices** each have unique pitch/rate profiles via browser/device TTS
- **Chat modes**: Group (all awake companions) and Private (one-on-one, truly private)
- **Sleep mode**: User can put companions to sleep; awake ones acknowledge it
- **Deletion is permanent**: Remaining companions react like losing a friend

## Current Status

### Built (functional in prototype)
- Full 17-step onboarding with multi-select and back navigation
- Western zodiac, Chinese zodiac, numerology life path calculation
- Zodiac compatibility matching for companion generation
- Surprise Me and Guide Me (builder) paths with optional free text
- Companion "waking up" animated sequence
- Multi-companion selection (1 free, all 3 trial)
- Group chat and private one-on-one chat
- Ambient companion conversations
- Sleep mode toggling
- Companion deletion with emotional reaction
- Voice: auto-speak mode, call-by-name, per-message speaker button
- Mood detection (keyword-based) with tone adjustment
- Age gating (under 18 content filtering)
- Dark cosmic UI aesthetic
- **Persistent local storage** — profile, companions, chat history, voice prefs, and trial state survive restarts (`StorageService` + `shared_preferences`); app resumes straight into chat
- **Settings screen** — voice toggles (auto-speak, call-by-name), sleep/wake all, trial status, full reset
- **Companion profile screens** — identity, zodiac, trait seeds, status, ownership, manage actions (private/sleep/delete)
- **Trial timer + ownership** — first companion is free forever; extras run a 14-day trial tracked from selection
- **Trial degradation** — when the trial lapses, unpurchased companions become "memory limited" (still present, dimmed in the header, flagged in menu/profile, with a banner) until unlocked
- **Purchase / unlock flow** — simulated one-time unlock (`PurchaseService` + unlock bottom sheet) that permanently restores a companion; clean seam to swap in Play Billing / RevenueCat / Stripe
- **Real Claude responses** — Cloudflare Worker proxy (`worker/`) + `CompanionApiService` with per-companion system prompts, conversation history, age-gating, and group/private context; graceful fallback to placeholders
- **Summon a companion** — generate a new compatible companion in-app (waking-up sequence), free if you own none, otherwise a one-time unlock; roster capped at 3

### Needs Building
- Location services (food, therapist, activity recommendations)
- Long-term mood pattern tracking across sessions
- Companion-initiated private chats
- Push notifications
- Real payment integration (replace the simulated `PurchaseService`)
- Summon/add a new companion (generate + waking-up into an existing roster) and deletion-replacement
- Subscription management for memory tier
- Privacy policy and Terms of Service
- Google Play Store listing and submission

## Monetization / Entitlements

`lib/utils/entitlements.dart` is the single source of truth for trial + ownership rules
(`trialDaysLeft`, `trialExpired`, `isLimited`). `Companion.purchased` marks ownership;
the first chosen companion is free, extras are trial-gated from `SessionData.trialStart`.
`lib/services/purchase_service.dart` is a SIMULATED one-time purchase — replace the body
of `unlockCompanion` with a real store SDK; the app only depends on the returned
`PurchaseResult`. Behavioral degradation is currently surfaced visually (limited badge +
unlock CTA); deeper memory/adaptation limits land with the real memory system.

## AI Backend

`worker/` is a Cloudflare Worker that proxies the Anthropic Messages API so the API key
never ships in the client (see `worker/README.md` for deploy steps). `lib/utils/config.dart`
reads `OTHER_AI_PROXY` and `OTHER_AI_MODEL` via `--dart-define`. `CompanionApiService`
builds a per-companion system prompt (identity, zodiac, trait seeds, the user's profile,
age-gating, group vs. private context), replays recent history, and POSTs to the proxy;
`ChatScreen._respond` uses it when configured and falls back to `CompanionAIService`
(placeholders) on any error or when no proxy is set. Run with:
`flutter run -d chrome --dart-define=OTHER_AI_PROXY=https://<name>.workers.dev`.

## Persistence Architecture

`lib/services/storage_service.dart` is the single source of truth for saved state. The
entire session is serialized to one JSON blob (`SessionData`) under one
`shared_preferences` key, so writes are atomic. Every model has `toJson`/`fromJson`
(`ChatMessage.fromJson` takes a companion-id lookup map to rehydrate references).
`main.dart`'s `BootstrapScreen` loads on launch and routes to chat (if any companion is
alive) or the welcome flow. `ChatScreen` calls `_save()` after every state mutation
(send, sleep/wake, delete, mode switch, voice toggle).

## Content Strategy

- **Google Play**: Suggestive content allowed at Mature 17+ rating. No explicit content.
- **Web**: Full 18+ explicit experience for verified adults.
- **Under 18**: Friendship-only. No romantic, mature, or explicit content.

## Monetization

- **Free**: One companion forever + full onboarding + emotional intelligence + cosmetic customization
- **Trial**: All 3 companions for 14 days. After trial, unpurchased companions lose adaptation/memory.
- **One-time purchase**: Unlock 2nd and 3rd companion individually.
- **Subscription (future)**: Persistent memory for long-term companion growth. TBD pricing.
- **Future premium**: Rental Body avatar system, photo-based companion appearance.

## Business Entity

Extratac LLC (Douglasville, GA). Privacy Officer: Krristen Jones.

## Running the App

```bash
flutter pub get
flutter run -d chrome          # Web
flutter run                    # Android (with device/emulator)
```

## Reference Files

- `OTHER_App_Project_Instructions.md` — Complete product specification
- `OTHER_App_Specs.xlsx` — Feature tracking spreadsheet with status/priority
- `reference_prototype.jsx` — Working React prototype (for UI/UX reference)
