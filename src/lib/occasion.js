// Occasion awareness — grounds companions in real time so they can reference
// the day, season, holidays, the user's birthday, and milestones naturally.
// Mostly a prompt-context block (no AI cost) plus helpers for celebrations.

const MONTH_DAY = (d) => `${d.getMonth() + 1}-${d.getDate()}`;

export function season(m) { // northern-hemisphere approximation
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
export function detectHoliday(d) {
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

export function monthsLabel(m) {
  if (m >= 12) { const y = Math.floor(m / 12); return y === 1 ? 'a year' : `${y} years`; }
  return m === 1 ? 'a month' : `${m} months`;
}

const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const milestoneMonth = (m) => m === 1 || m === 3 || m === 6 || (m >= 12 && m % 12 === 0);

// Real-life milestones worth a warm, in-chat celebration TODAY: the user's
// birthday, companion "we met" anniversaries (1/3/6 months, then yearly), and
// dated events the user mentioned (memories carrying an `at` timestamp). Each
// has a stable key so it's celebrated at most once. `memOf(id)` -> memories.
export function pendingMilestones(comps = [], profile, memOf = () => [], now = Date.now()) {
  const d = new Date(now);
  const out = [];
  if (birthdayStatus(profile?.dob, d) === 'today') out.push({ key: `bday-${d.getFullYear()}`, kind: 'birthday' });
  for (const c of comps) {
    if (!c || c.status === 'deleted' || !c.bornAt) continue;
    const b = new Date(c.bornAt);
    const months = monthsKnown(c, now);
    if (d.getDate() === b.getDate() && milestoneMonth(months)) {
      out.push({ key: `anniv-${c.id}-${months}`, kind: 'anniversary', compId: c.id, months });
    }
  }
  for (const c of comps) {
    if (!c || c.status === 'deleted') continue;
    for (const m of (memOf(c.id) || [])) {
      if (!m?.at || !m.id) continue;
      if (sameDay(new Date(m.at), d)) out.push({ key: `event-${m.id}`, kind: 'event', compId: c.id, text: m.text });
    }
  }
  return out;
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
