// Crisis detection + resource referral. Per the Terms (§11, §13) and applicable
// law (e.g. NY's AI Companion Models Law, California SB 243), the app detects
// expressions of self-harm or suicidal ideation and surfaces crisis resources.
// This is a deliberately conservative keyword pass — it errs toward showing the
// (supportive, non-alarming) resource card rather than missing a real signal.

const SIGNALS = [
  'kill myself', 'killing myself', 'kill me', 'take my own life', 'taking my own life',
  'end my life', 'ending my life', 'end it all', 'want to die', 'wanna die', 'want to be dead',
  "don't want to live", 'do not want to live', "can't go on", 'cannot go on', 'no reason to live',
  'no point in living', 'better off dead', 'suicidal', 'suicide', 'commit suicide',
  'self harm', 'self-harm', 'harm myself', 'hurt myself', 'cut myself', 'cutting myself',
  'overdose', 'want to disappear', 'wish i was dead', 'wish i were dead',
];

export function detectCrisis(text) {
  const m = (text || '').toLowerCase();
  return SIGNALS.some((s) => m.includes(s));
}

// Shown in the crisis resource card. `tel:`/`sms:` deep-links work on mobile.
export const CRISIS_RESOURCES = [
  { name: '988 Suicide & Crisis Lifeline', detail: 'Call or text 988 (US, 24/7)', href: 'tel:988' },
  { name: 'Crisis Text Line', detail: 'Text HOME to 741741', href: 'sms:741741' },
  { name: 'Find a Helpline', detail: 'International directory · findahelpline.com', href: 'https://findahelpline.com' },
];

export const CRISIS_INTRO =
  'It sounds like you’re going through something really heavy. You deserve support from someone who can be there with you right now — please reach out:';
