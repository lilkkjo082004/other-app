// Companion "actions": calendar events, reminders, and focus sessions. The AI
// appends a machine directive ([[ACTION:{...}]]) to its reply when the user asks
// for one; we parse it out here and turn it into a real, universal artifact —
// a downloadable .ics (works with Apple/Google/Outlook) + a Google Calendar
// link, or an in-app focus timer. No OAuth, no third-party account, no server.

const RE = /\[\[ACTION:(\{[\s\S]*?\})\]\]/;
const TYPES = new Set(['calendar', 'reminder', 'focus']);

// Split a companion reply into its visible text and any embedded action.
export function parseAction(text) {
  const m = (text || '').match(RE);
  let action = null;
  if (m) {
    try { const o = JSON.parse(m[1]); if (o && TYPES.has(o.type)) action = o; } catch (e) { /* malformed */ }
  }
  const clean = (text || '').replace(RE, '').replace(/\n{3,}/g, '\n\n').trim();
  return { clean, action };
}

// Hide a partially-streamed directive so the user never sees the raw syntax.
export function stripActionPartial(text) {
  const i = (text || '').indexOf('[[ACTION');
  return i >= 0 ? text.slice(0, i).trimEnd() : text;
}

const pad = (n) => String(n).padStart(2, '0');
function toICS(dt) {
  const d = new Date(dt);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}
const esc = (s) => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');

export function actionTitle(a) { return a.title || a.text || 'Reminder'; }
export function actionStart(a) { return a.start || a.at; }
function actionEnd(a) {
  const start = new Date(actionStart(a));
  if (a.end) return new Date(a.end);
  return new Date(start.getTime() + (a.type === 'reminder' ? 30 : 60) * 60000);
}

// RFC 5545 calendar event, with a display alarm (at the time for reminders,
// 10 min before for events).
export function buildICS(a) {
  const start = new Date(actionStart(a));
  const end = actionEnd(a);
  const uid = 'other-' + Math.random().toString(36).slice(2) + '@other.app';
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Other//Companion//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', 'UID:' + uid, 'DTSTAMP:' + toICS(Date.now()),
    'DTSTART:' + toICS(start), 'DTEND:' + toICS(end), 'SUMMARY:' + esc(actionTitle(a)),
  ];
  if (a.notes) lines.push('DESCRIPTION:' + esc(a.notes));
  if (a.location) lines.push('LOCATION:' + esc(a.location));
  lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(actionTitle(a)),
    'TRIGGER:' + (a.type === 'reminder' ? 'PT0M' : '-PT10M'), 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

export function googleCalUrl(a) {
  const p = new URLSearchParams({ action: 'TEMPLATE', text: actionTitle(a), dates: `${toICS(actionStart(a))}/${toICS(actionEnd(a))}` });
  if (a.notes) p.set('details', a.notes);
  if (a.location) p.set('location', a.location);
  return 'https://calendar.google.com/calendar/render?' + p.toString();
}

export function downloadICS(a) {
  try {
    const blob = new Blob([buildICS(a)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = (actionTitle(a) || 'event').replace(/[^a-z0-9]+/gi, '-').slice(0, 40) + '.ics';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) { /* ignore */ }
}

// Pretty local datetime for the action card.
export function formatWhen(a) {
  try {
    return new Date(actionStart(a)).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch (e) { return ''; }
}
