import React, { useState, useEffect } from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import { loadRituals, saveRituals, addRitual, removeRitual, toggleToday, refreshForToday, RITUAL_IDEAS } from '../lib/rituals.js';

// Personal rituals & routines — small daily practices with a no-pressure streak.
export default function Rituals({ onBack }) {
  const [list, setList] = useState(() => refreshForToday(loadRituals()));
  const [text, setText] = useState('');
  useEffect(() => { saveRituals(list); }, [list]);
  const doneCount = list.filter((r) => r.doneToday).length;

  const add = (t, em) => { setList((p) => addRitual(p, t, em)); setText(''); };

  return (
    <Shell fill>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}` }}>
        <button aria-label="Back" onClick={onBack} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 20, cursor: 'pointer' }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Rituals</div>
          {list.length > 0 && <div style={{ fontSize: 10.5, color: C.textDim }}>{doneCount}/{list.length} done today</div>}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 16px 44px' }}>
        {list.map((r) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 11, background: C.surface, border: `1px solid ${r.doneToday ? C.glow3 : C.border}`, borderRadius: 13, padding: '11px 13px', marginBottom: 9 }}>
            <button aria-label={r.doneToday ? 'Mark not done' : 'Mark done'} onClick={() => setList((p) => toggleToday(p, r.id))} style={{ flexShrink: 0, width: 26, height: 26, borderRadius: '50%', border: `2px solid ${r.doneToday ? C.glow3 : C.border}`, background: r.doneToday ? C.glow3 : 'transparent', color: '#0b0a12', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{r.doneToday ? '✓' : ''}</button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, color: C.text }}>{r.em} {r.text}</div>
              {r.streak > 0 && <div style={{ fontSize: 10.5, color: C.textDim }}>🔥 {r.streak}-day streak</div>}
            </div>
            <button aria-label="Remove ritual" onClick={() => setList((p) => removeRitual(p, r.id))} style={{ background: 'none', border: 'none', color: C.textDim, fontSize: 15, cursor: 'pointer' }}>×</button>
          </div>
        ))}
        {list.length === 0 && <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6, textAlign: 'center', margin: '10px 0 18px' }}>Build a gentle routine. Pick a few to start — no pressure, no guilt.</p>}

        <div style={{ display: 'flex', gap: 7, margin: '14px 0 10px' }}>
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(text); }} placeholder="Add your own ritual…" style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 13, color: C.text, outline: 'none' }} />
          <button onClick={() => add(text)} disabled={!text.trim()} style={{ background: text.trim() ? C.glow1 : C.border, border: 'none', borderRadius: 10, color: '#fff', padding: '0 16px', fontSize: 13, fontWeight: 600, cursor: text.trim() ? 'pointer' : 'default', fontFamily: "'DM Sans',sans-serif" }}>Add</button>
        </div>
        <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, textTransform: 'uppercase', margin: '10px 0 8px' }}>Ideas</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {RITUAL_IDEAS.map((idea) => (
            <button key={idea.text} onClick={() => add(idea.text, idea.em)} style={{ background: C.surfaceUp, border: `1px solid ${C.border}`, borderRadius: 50, padding: '6px 12px', fontSize: 12, color: C.textSoft, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>{idea.em} {idea.text}</button>
          ))}
        </div>
      </div>
    </Shell>
  );
}
