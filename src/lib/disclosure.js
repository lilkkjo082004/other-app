// AI disclosure (Terms §1.2 minors; §13 generally). Two parts:
//  1) A one-time acknowledgment the user must actively click at the very start
//     (after accepting the Terms + Privacy Policy on Welcome).
//  2) A gentle in-chat reminder shown at most once per calendar day thereafter.
// Neither is user-disableable.
export const DISCLOSURE_TEXT =
  'Reminder: your companions are AI, not real people. They can be wrong — please don’t rely on them for medical, legal, financial, or crisis decisions.';

const ACK_KEY = 'other_ai_ack';
const DAY_KEY = 'other_disclosure_day';
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
