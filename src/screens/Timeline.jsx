import React from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import Avatar from '../components/Avatar.jsx';

// Shared memories timeline — a chronological "story of us" auto-built from the
// milestones you've made together: when each companion arrived, shared moments
// (lore), inside jokes, gifts, keepsake letters, and photos you shared.
function buildEvents({ comps = [], lore = [], jokes = [], messages = [] }) {
  const ev = [];
  const byId = {};
  for (const c of comps) {
    byId[c.id] = c;
    if (c.status === 'deleted') continue;
    if (c.bornAt) ev.push({ ts: c.bornAt, em: '✦', comp: c, text: `${c.name} woke up and joined you.` });
    for (const l of (c.letters || [])) ev.push({ ts: l.ts, em: '✉️', comp: c, text: `${c.name} wrote you a letter.` });
    for (const g of (c.gifts || [])) ev.push({ ts: g.ts, em: g.kind === 'playlist' ? '🎵' : g.kind === 'art' ? '🎨' : '🎁', comp: c, text: `${c.name} made you a ${g.kind || 'gift'}.` });
    for (const gr of (c.growth || [])) ev.push({ ts: gr.ts, em: '🌱', comp: c, text: gr.text });
  }
  for (const l of lore) ev.push({ ts: l.ts || l.at || 0, em: '💫', text: `remember when ${l.text}` });
  for (const j of jokes) ev.push({ ts: j.ts || j.at || 0, em: '😄', text: `inside joke: ${j.text}` });
  for (const m of messages) if (m.kind === 'photo' && m.ts) ev.push({ ts: m.ts, em: '📷', text: 'You shared a photo.' });
  return ev.filter((e) => e.ts).sort((a, b) => b.ts - a.ts);
}

const fmt = (ts) => { try { return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return ''; } };

export default function Timeline({ comps, lore, jokes, messages, onBack }) {
  const events = buildEvents({ comps, lore, jokes, messages });
  return (
    <Shell fill>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}` }}>
        <button aria-label="Back" onClick={onBack} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Your story · timeline</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 18px 44px' }}>
        {events.length === 0 && <p style={{ fontSize: 13, color: C.textDim, textAlign: 'center', lineHeight: 1.6, marginTop: 20 }}>Your shared moments will gather here as your story grows together.</p>}
        <div style={{ position: 'relative', paddingLeft: 22 }}>
          {events.length > 0 && <div style={{ position: 'absolute', left: 6, top: 6, bottom: 6, width: 2, background: C.border }} />}
          {events.map((e, i) => (
            <div key={i} style={{ position: 'relative', marginBottom: 16 }}>
              <div style={{ position: 'absolute', left: -22, top: 2, width: 14, height: 14, borderRadius: '50%', background: e.comp?.color?.primary || C.glow2, border: `2px solid ${C.bg}` }} />
              <div style={{ fontSize: 10, color: C.textDim, marginBottom: 3 }}>{fmt(e.ts)}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 12px' }}>
                {e.comp ? <Avatar comp={e.comp} size={22} glow={false} /> : <span style={{ fontSize: 18 }}>{e.em}</span>}
                <div style={{ fontSize: 13, color: C.text, lineHeight: 1.45 }}>{e.comp && <span style={{ marginRight: 4 }}>{e.em}</span>}{e.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
