# OTHER — Subscription plan & unit economics (task #20)

Goal: make cloud AI **self-funding** — the user's subscription pays for their own
tokens, so inference is never a net cost to Extratac. Pairs with the Haiku + prompt-caching
work already shipped (cheap baseline) and the daily AI caps (abuse protection).

> Figures are estimates for planning. Replace with real telemetry once we have
> active users. Model prices are mid-2026 (Anthropic standard tiers).

## Recommended tiers

| | **Free** | **Other Plus** (recommended paid tier) |
|---|---|---|
| Price | $0 | **$9.99/mo** or **$69.99/yr** (~$5.83/mo) |
| Model | Haiku 4.5 | Sonnet 4.5 for first ~150 msgs/day, then Haiku (fair-use) |
| Daily messages | ~30/day (soft cap) | Unlimited (fair-use) |
| Companions | 1 | All 3 |
| Natural voice | – | ✓ |
| Memory / continuity | Standard | Standard (everyone keeps full local history) |
| Push customization | Basic | Full (times, frequency) |

Anchoring: Replika charges $19.99/mo ($69.99/yr) for Pro and $29.99/mo for Ultra,
so $9.99/mo sits comfortably below the category leader while covering costs.

Optional later: an **Ultra $19.99/mo** tier = Sonnet unlimited, for power users —
only worth adding once telemetry shows demand.

## Cost per active user / month (our cost, not price)

Assumptions: ~1.5 AI calls per user message (mix of private + group), ~2,000 input
tokens and ~180 output tokens per call, prompt caching on the stable prefix.
Per-call cost ≈ **Haiku $0.0025**, **Sonnet $0.009**, **Llama 3.3 70B $0.0007**.

| Usage | msgs/day | calls/mo | Haiku | Sonnet | Llama 70B |
|---|---|---|---|---|---|
| Light | 10 | ~450 | $1.13 | $4.05 | $0.32 |
| Medium | 30 | ~1,350 | $3.38 | $12.15 | $0.95 |
| Heavy | 80 | ~3,600 | $9.00 | $32.40 | $2.52 |

**Key risk:** a *heavy user on pure Sonnet* costs ~$32/mo — more than a $9.99 sub.
That's why Plus uses **Sonnet up to a daily cap, then falls back to Haiku** (the
server picks the model — see task #21). Blended cost for a typical Plus user lands
~$3–6/mo.

## Margin at $9.99/mo

Net revenue after fees:
- **Web (Stripe direct):** 2.9% + $0.30 → **~$9.40** take-home.
- **Web (RevenueCat Web Billing):** free up to $2.5k/mo MRR, then +1% → ~$9.30.
- **Native via Play/App Store IAP:** 15% (Small Business Program / subs after yr 1) → ~$8.49; else 30% → ~$6.99.

| Plus user | Blended cost | Net @ web $9.40 | Margin |
|---|---|---|---|
| Light | ~$2 | $9.40 | ~79% |
| Medium | ~$4–6 | $9.40 | ~40–57% |
| Heavy (capped) | ~$8–9 | $9.40 | thin but ≥0 |

Healthy on web. Even at the 30% store cut ($6.99 net), light/medium users are
profitable; heavy users are the only thin case, bounded by the Sonnet daily cap.

## Billing stack — recommendation

**RevenueCat as the entitlement source of truth + Stripe for web payments.**

- **Now (PWA / web):** RevenueCat **Web Billing** (Stripe under the hood). Keeps ~97%
  vs ~70% through the stores, and the entitlement is one system across surfaces.
- **Future Android wrapper:** Google Play Billing (15% via Small Business Program)
  **or** an external-payment link to web checkout (now permitted post-Epic). RevenueCat
  unifies Play + web so a user who paid on web is Premium in the app too.
- **iOS (if/when):** must also offer Apple IAP alongside any external link; RevenueCat
  handles StoreKit. Keep mature content web-only regardless.
- **Why RevenueCat:** one entitlement API, webhooks for the backend (task #21),
  restore-purchases, and it abstracts Stripe/Play/Apple so we don't rebuild per store.

Free-tier abuse is already bounded by `AI_DAILY_LIMIT` (per-IP/day) shipped earlier.

## Decisions to confirm
1. **Price:** $9.99/mo + $69.99/yr (default) — adjust if you prefer.
2. **Paid model policy:** Sonnet-with-daily-cap-then-Haiku (recommended) vs Haiku-only
   (simpler, cheaper, slightly lower ceiling).
3. **Single tier (Plus) now**, add Ultra later if demand shows.

Once confirmed, task #21 (server entitlement + webhook + server-side model gating)
and #22 (paywall + UI) are unblocked.
