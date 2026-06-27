// Age verification (ToS §1.1–1.3). The user's date of birth — already collected
// for astrology — is the source of truth, so the age tier can't be freely
// self-selected in a way that contradicts it. Under-13 is blocked entirely;
// 13–17 is locked to friendship-only; 18+ requires an explicit confirmation.

export const MIN_AGE = 13;

export function ageFromDob(dob) {
  if (!dob) return null;
  const b = new Date(dob);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

// 'under13' (blocked) | 'minor' (13–17, friendship-only) | 'adult' (18+)
// Returns null when the DOB is missing/unparseable.
export function ageTier(dob) {
  const a = ageFromDob(dob);
  if (a === null) return null;
  if (a < MIN_AGE) return 'under13';
  if (a < 18) return 'minor';
  return 'adult';
}

export const ageGroupForDob = (dob) => (ageTier(dob) === 'adult' ? '18+' : 'under18');

// Lock a profile's age group to its DOB and mark it verified. Used at the end of
// onboarding and when rehydrating older saved/synced sessions, so a self-claimed
// "18+" can never outrank an under-18 birth date.
export function withAgeVerification(profile) {
  if (!profile) return profile;
  const tier = ageTier(profile.dob);
  if (!tier) return profile; // no usable DOB — leave whatever was declared
  return { ...profile, ageGroup: tier === 'adult' ? '18+' : 'under18', ageVerified: true };
}

// Mature/explicit content is available only to verified adults and, per ToS
// §1.3, only on the web app — never in a native store (Google Play) build.
export function isWebPlatform() {
  return typeof window === 'undefined' ? true : !window.__OTHER_NATIVE__;
}

export function matureContentAllowed(profile) {
  return !!profile?.ageVerified && profile?.ageGroup === '18+' && isWebPlatform();
}
