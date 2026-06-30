// AI disclosure (Terms §1.2 minors; §13 generally). Two parts:
//  1) A one-time acknowledgment the user must actively click at the very start
//     (after accepting the Terms + Privacy Policy on Welcome).
//  2) A gentle in-chat reminder shown at most once per calendar day thereafter.
// Neither is user-disableable.
export const DISCLOSURE_TEXT =
  'Reminder: your companions are AI, not real people. They can be wrong — please don’t rely on them for medical, legal, financial, or crisis decisions.';

export const BREAK_TEXT =
  'You’ve been here a while. A reminder: your companions are AI, not real people — and it’s good to take a break and check in with the world around you. 💛';

const ACK_KEY = 'other_ai_ack';
const DAY_KEY = 'other_disclosure_day';
const BREAK_KEY = 'other_break_at';
const BREAK_MS = 3 * 60 * 60 * 1000; // 3 hours (California SB 243 minimum for minors)
const today = () => new Date().toDateString();

export function isAcknowledged() {
  try { return localStorage.getItem(ACK_KEY) === '1'; } catch (e) { return false; }
}

// Record the one-time acknowledgment. Also stamps today so the daily reminder
// doesn't fire again the same day the user just acknowledged.
export function acknowledgeDisclosure() {
  try { localStorage.setItem(ACK_KEY, '1'); localStorage.setItem(DAY_KEY, today()); } catch (e) { /* no-op */ }
}

// Returns true at most once per calendar day (and marks today as shown), so the
// in-chat reminder appears just once a day.
export function consumeDailyReminder() {
  try {
    if (localStorage.getItem(DAY_KEY) === today()) return false;
    localStorage.setItem(DAY_KEY, today());
    return true;
  } catch (e) { return false; }
}

// "Take a break" reminder for minors. California SB 243 requires reminding minor
// users at least every 3 hours of continuous use (and that responses are AI).
// First call starts the clock; thereafter returns true once per 3-hour window.
// Callers gate this on the user being a minor.
export function breakReminderDue() {
  try {
    const now = Date.now();
    const last = +localStorage.getItem(BREAK_KEY) || 0;
    if (!last) { localStorage.setItem(BREAK_KEY, String(now)); return false; }
    if (now - last >= BREAK_MS) { localStorage.setItem(BREAK_KEY, String(now)); return true; }
    return false;
  } catch (e) { return false; }
}
