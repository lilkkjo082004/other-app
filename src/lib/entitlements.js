// Single source of truth for trial / ownership rules.
//
// Free tier = one companion, free forever. Choosing more than one companion
// starts a 14-day trial; when it lapses, any companion that was never purchased
// becomes "memory limited" — still present, but flagged until unlocked.
export const TRIAL_DAYS = 14;
export const COMPANION_PRICE = '$4.99';

export function trialDaysLeft(trialStart) {
  if (!trialStart) return null;
  const elapsed = Math.floor((Date.now() - new Date(trialStart).getTime()) / 86400000);
  return TRIAL_DAYS - elapsed;
}

export function trialActive(trialStart) {
  const d = trialDaysLeft(trialStart);
  return d != null && d > 0;
}

export function trialExpired(trialStart) {
  const d = trialDaysLeft(trialStart);
  return d != null && d <= 0;
}

// A companion that was never purchased and whose trial has lapsed.
export function isLimited(comp, trialStart) {
  return !comp.purchased && trialExpired(trialStart);
}
