import React, { useState } from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import { loadValues, saveValues, VALUE_OPTIONS } from '../lib/values.js';

// Values & intentions compass — the user picks up to 5 core values and writes a
// current intention ("north star"). A calm reflection screen; saves on device.
const MAX = 5;

export default function Values({ onBack }) {
  const [v, setV] = useState(() => loadValues());
  const [saved, setSaved] = useState(false);
  const toggle = (val) => setV((p) => {
    const chosen = p.chosen.includes(val) ? p.chosen.filter((x) => x !== val) : (p.chosen.length < MAX ? [...p.chosen, val] : p.chosen);
    return { ...p, chosen };
  });
  const save = () => { saveValues(v); setSaved(true); setTimeout(() => setSaved(false), 1600); };

  return (
    <Shell>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button aria-label="Back" onClick={onBack} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 20, cursor: 'pointer' }}>←</button>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Values</span>
        </div>
        <button onClick={save} style={{ background: C.glow1, border: 'none', borderRadius: 20, color: '#fff', fontSize: 13, fontWeight: 600, padding: '7px 16px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>{saved ? 'Saved ✓' : 'Save'}</button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 16px 44px' }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>What matters most to you?</div>
        <p style={{ fontSize: 12.5, color: C.textSoft, marginBottom: 14 }}>Choose up to {MAX}. These are your compass — revisit them when a decision feels hard.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
          {VALUE_OPTIONS.map((val) => {
            const on = v.chosen.includes(val);
            return (
              <button key={val} onClick={() => toggle(val)} style={{ background: on ? `${C.glow1}22` : C.surface, border: `1px solid ${on ? C.glow1 : C.border}`, color: on ? C.glow1 : C.textSoft, borderRadius: 50, padding: '8px 14px', fontSize: 13, fontWeight: on ? 600 : 400, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>{val}</button>
            );
          })}
        </div>

        <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Your north star right now</div>
        <textarea value={v.intention} onChange={(e) => setV((p) => ({ ...p, intention: e.target.value }))} rows={3} placeholder="What are you moving toward these days? One sentence is enough." style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px', fontSize: 14, color: C.text, outline: 'none', resize: 'none', lineHeight: 1.5, fontFamily: "'DM Sans',sans-serif" }} />

        {(v.chosen.length > 0 || v.intention) && (
          <div style={{ marginTop: 22, background: `linear-gradient(160deg, ${C.glow1}18, ${C.surface})`, border: `1px solid ${C.glow1}44`, borderRadius: 16, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>🧭</div>
            {v.chosen.length > 0 && <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.5 }}>{v.chosen.join(' · ')}</div>}
            {v.intention && <div style={{ fontSize: 13, color: C.textSoft, fontStyle: 'italic', marginTop: 8, lineHeight: 1.5 }}>“{v.intention}”</div>}
          </div>
        )}
      </div>
    </Shell>
  );
}
