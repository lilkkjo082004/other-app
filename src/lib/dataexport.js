// Data export & portability — assembles a human-readable copy of the user's
// data (profile, companions, full chat transcript, journals, goals, mood
// history, rituals, values) as Markdown. The PRIVATE VAULT is deliberately
// excluded. Complements the JSON backup (which is for restore); this is for the
// user to read/keep/take with them (GDPR/CCPA portability spirit).
import { loadRituals } from './rituals.js';
import { loadValues } from './values.js';

const fmtDate = (ts) => { try { return new Date(ts).toLocaleString(); } catch (e) { return ''; } };
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function buildReadableExport(session = {}) {
  const p = session.profile || {};
  const a = p.astrology || {};
  const L = [];
  L.push('# My Other data export');
  L.push(`_Exported ${new Date().toLocaleString()}_`, '');

  L.push('## Profile');
  L.push(`- Name: ${p.name || '—'}`);
  if (p.dob) L.push(`- Birthday: ${p.dob}`);
  if (p.occupation) L.push(`- Occupation: ${p.occupation}`);
  if (a.western) L.push(`- Sun sign: ${cap(a.western)}${a.westernData ? ` (${a.westernData.el})` : ''}`);
  if (a.chinese) L.push(`- Chinese zodiac: ${a.chinese}${a.chineseElement ? ` · ${a.chineseElement}` : ''}`);
  if (a.lifePath) L.push(`- Life path: ${a.lifePath}`);
  if (a.vedic?.rashi) L.push(`- Vedic moon: ${cap(a.vedic.rashi)} · ${a.vedic.nakshatra}`);
  L.push('');

  const comps = (session.companions || []).filter((c) => c && c.status !== 'deleted');
  if (comps.length) {
    L.push('## Companions');
    for (const c of comps) L.push(`- **${c.name}** (${c.pronouns || 'they/them'})${c.zodiac ? ` · ${cap(c.zodiac)}` : ''}${c.personality ? ` — ${c.personality}` : ''}`);
    L.push('');
  }

  const values = loadValues();
  if ((values.chosen || []).length || values.intention) {
    L.push('## Values & intention');
    if (values.chosen?.length) L.push(`- Values: ${values.chosen.join(', ')}`);
    if (values.intention) L.push(`- North star: ${values.intention}`);
    L.push('');
  }

  const rituals = loadRituals();
  if (rituals.length) {
    L.push('## Rituals');
    for (const r of rituals) L.push(`- ${r.em || '•'} ${r.text}${r.streak ? ` (streak: ${r.streak})` : ''}`);
    L.push('');
  }

  const goals = session.goals || [];
  if (goals.length) {
    L.push('## Goals');
    for (const g of goals) L.push(`- [${g.done ? 'x' : ' '}] ${g.text}`);
    L.push('');
  }

  const ci = session.checkins;
  if (ci?.history?.length) {
    L.push('## Mood history');
    L.push(`Current streak: ${ci.streak || 0} day(s).`, '');
    for (const h of [...ci.history].sort((x, y) => (x.d < y.d ? -1 : 1))) L.push(`- ${h.d}: ${h.mood}`);
    L.push('');
  }

  const journal = session.journal || [];
  if (journal.length) {
    L.push('## Journal');
    for (const e of journal) { L.push(`### ${fmtDate(e.ts)}`); if (e.prompt) L.push(`_${e.prompt}_`); L.push(e.text || '', ''); }
  }

  const msgs = (session.messages || []).filter((m) => m.role === 'user' || (m.role === 'assistant' && m.content));
  if (msgs.length) {
    L.push('## Conversation transcript', '');
    for (const m of msgs) {
      const who = m.role === 'user' ? (p.name || 'You') : (m.companion?.name || 'Companion');
      const when = m.ts ? ` _(${fmtDate(m.ts)})_` : '';
      const body = m.kind === 'photo' ? '[shared a photo]' : (m.content || '');
      if (body) L.push(`**${who}**${when}: ${body}`, '');
    }
  }

  L.push('---', 'Your private vault is intentionally NOT included in this export.', 'Other · Extratac LLC');
  return L.join('\n');
}

export function downloadReadableExport(session) {
  const md = buildReadableExport(session);
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `other-my-data-${new Date().toISOString().slice(0, 10)}.md`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
