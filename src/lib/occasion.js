// Occasion awareness — grounds companions in real time so they can reference
// the day, season, holidays, the user's birthday, and milestones naturally.
// Mostly a prompt-context block (no AI cost) plus helpers for celebrations.

const MONTH_DAY = (d) => `${d.getMonth() + 1}-${d.getDate()}`;

function season(m) { // northern-hemisphere approximation
  if (m === 12 || m <= 2) return 'winter';
  if (m <= 5) return 'spring';
  if (m <= 8) return 'summer';
  return 'autumn';
}
function timeOfDay(h) {
  if (h < 5) return 'late night';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}

// Nth weekday of a month (for floating US holidays).
function nthWeekday(year, month0, weekday, n) {
  const first = new Date(year, month0, 1).getDay();
  return 1 + ((7 + weekday - first) % 7) + (n - 1) * 7;
}
function detectHoliday(d) {
  const md = MONTH_DAY(d);
  const fixed = {
    '1-1': "New Year's Day", '12-31': "New Year's Eve", '2-14': "Valentine's Day",
    '3-17': "St. Patrick's Day", '7-4': 'Independence Day (US)', '10-31': 'Halloween',
    '12-24': 'Christmas Eve', '12-25': 'Christmas',
  };
  if (fixed[md]) return fixed[md];
  // US Thanksgiving — 4th Thursday of November
  if (d.getMonth() === 10 && d.getDate() === nthWeekday(d.getFullYear(), 10, 4, 4)) return 'Thanksgiving (US)';
  return null;
}

// '' | 'today' | 'soon' for the user's birthday, from a DOB string/date.
export function birthdayStatus(dob, now = new Date()) {
  if (!dob) return '';
  const b = new Date(dob);
  if (isNaN(b)) return '';
  const today = new Date(now);
  if (b.getMonth() === today.getMonth() && b.getDate() === today.getDate()) return 'today';
  // within the next 3 days
  for (let i = 1; i <= 3; i++) {
    const f = new Date(today); f.setDate(today.getDate() + i);
    if (b.getMonth() === f.getMonth() && b.getDate() === f.getDate()) return 'soon';
  }
  return '';
}

export function monthsKnown(comp, now = Date.now()) {
  if (!comp?.bornAt) return 0;
  return Math.floor((now - comp.bornAt) / (30 * 24 * 60 * 60 * 1000));
}

// Prompt block: today's real-world context. Reference it only when it fits.
export function occasionContext(profile, now = Date.now()) {
  const d = new Date(now);
  const dow = d.toLocaleDateString([], { weekday: 'long' });
  const dateStr = d.toLocaleDateString([], { month: 'long', day: 'numeric' });
  let s = `\nTODAY: ${dow}, ${dateStr} — a ${season(d.getMonth() + 1)} ${timeOfDay(d.getHours())}.`;
  const holiday = detectHoliday(d);
  if (holiday) s += ` It's ${holiday}.`;
  const bd = birthdayStatus(profile?.dob, d);
  if (bd === 'today') s += ` IT'S ${profile?.name || 'their'}'S BIRTHDAY today — celebrate them warmly.`;
  else if (bd === 'soon') s += ` ${profile?.name || 'Their'}'s birthday is coming up in the next few days.`;
  return s + ' Reference the day, season, or occasion naturally only when it fits — never force it.';
}
