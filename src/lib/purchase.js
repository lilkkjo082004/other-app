// One-time companion unlock.
//
// SIMULATED so the freemium loop is fully playable without a payment backend.
// To ship for real, replace the body with a payment SDK (Stripe / RevenueCat /
// Play Billing) and return whether it succeeded. Nothing else depends on the
// implementation — only the boolean result.
export async function unlockCompanion(/* companion */) {
  // TODO(payments): kick off the real one-time purchase here and await it.
  await new Promise((r) => setTimeout(r, 700));
  return true;
}
