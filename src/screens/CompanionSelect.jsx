import React, { useState } from 'react';
import { C } from '../theme.js';
import { ZODIAC, cap } from '../lib/zodiac.js';
import { Shell } from '../components/ui.jsx';

export default function CompanionSelect({ comps, onSelect }) {
  const [sel, setSel] = useState(new Set());
  const tog = (id) => {
    const s = new Set(sel);
    s.has(id) ? s.delete(id) : s.add(id);
    setSel(s);
  };
  return (
    <Shell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 22 }}>
        <div style={{ textAlign: 'center', marginBottom: 18, marginTop: 14 }}>
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: C.glow1, marginBottom: 4 }}>Choose Your Companions</p>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Who's coming with you?</h2>
          <p style={{ color: C.textSoft, fontSize: 12 }}>Pick one free. All three = 2-week trial.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          {comps.map((c, i) => {
            const s = sel.has(c.id);
            return (
              <button key={c.id} onClick={() => tog(c.id)} style={{ background: s ? `${c.color.primary}10` : C.surface, border: `1.5px solid ${s ? c.color.primary : C.border}`, borderRadius: 14, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.3s', fontFamily: "'DM Sans',sans-serif", boxShadow: s ? `0 0 18px ${c.color.glow}` : 'none', animation: `fadeUp 0.5s ${0.1 + i * 0.1}s both` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: `radial-gradient(circle,${c.color.primary},${c.color.primary}44)`, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>{c.name}</span>
                      <span style={{ fontSize: 11, color: C.textSoft }}>{c.pronouns}</span>
                    </div>
                    <div style={{ fontSize: 11, color: c.color.primary, fontWeight: 500, marginBottom: 2 }}>{ZODIAC[c.zodiac].sym} {cap(c.zodiac)} · {ZODIAC[c.zodiac].el}</div>
                    <div style={{ fontSize: 11, color: C.textSoft, fontStyle: 'italic' }}>"{c.personality}"</div>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${s ? c.color.primary : C.border}`, background: s ? c.color.primary : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', flexShrink: 0 }}>{s && '✓'}</div>
                </div>
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          {sel.size > 1 && <p style={{ fontSize: 10, color: C.glow2, marginBottom: 6 }}>✨ 2-week free trial</p>}
          <button className="bp" disabled={!sel.size} onClick={() => onSelect(comps.filter((c) => sel.has(c.id)))} style={{ width: '100%' }}>
            {!sel.size ? 'Select at least one' : sel.size === 1 ? 'Start with this companion' : `Start with all ${sel.size}`}
          </button>
        </div>
      </div>
    </Shell>
  );
}
