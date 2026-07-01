// Cowork Pomodoro cycle math — kept pure so it can be unit-tested without a
// 25-minute wall clock. Given the current segment, returns the next one.
export function pomoNext(seg, round, workMin, breakMin) {
  if (seg === 'focus') return { seg: 'break', round, secs: Math.max(1, breakMin) * 60 };
  return { seg: 'focus', round: round + 1, secs: Math.max(1, workMin) * 60 };
}
