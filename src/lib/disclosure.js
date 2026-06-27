import { useEffect, useRef } from 'react';

// AI disclosure reminders. Per the Terms (§1.2 minors; §13 generally), these
// recur during active use and cannot be turned off. We count only foreground
// (visible) time so a backgrounded tab doesn't accrue.
export const DISCLOSURE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour of active use
export const DISCLOSURE_TEXT =
  'Reminder: your companions are AI, not real people. They can be wrong — please don’t rely on them for medical, legal, financial, or crisis decisions.';

// Calls `onRemind` once per `intervalMs` of accumulated foreground time.
export function useDisclosureReminder(onRemind, intervalMs = DISCLOSURE_INTERVAL_MS) {
  const cb = useRef(onRemind);
  cb.current = onRemind;
  const acc = useRef(0);
  useEffect(() => {
    const TICK = 30 * 1000;
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      acc.current += TICK;
      if (acc.current >= intervalMs) { acc.current = 0; cb.current?.(); }
    }, TICK);
    return () => clearInterval(id);
  }, [intervalMs]);
}
