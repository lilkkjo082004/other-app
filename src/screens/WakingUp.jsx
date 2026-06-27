import React, { useState, useEffect } from 'react';
import { C } from '../theme.js';
import { ZODIAC, cap } from '../lib/zodiac.js';
import { Shell } from '../components/ui.jsx';

export default function WakingUp({ comp, onDone }) {
  const [ph, setPh] = useState(0);
  const col = comp.color.primary;
  const steps = [
    { t: 'A new presence stirs...', d: 0 },
    { t: `Choosing a name... ${comp.name}`, d: 1200 },
    { t: `"${comp.pronouns} feels right."`, d: 2400 },
    { t: `${ZODIAC[comp.zodiac].sym} ${cap(comp.zodiac)} — ${ZODIAC[comp.zodiac].el}`, d: 3400 },
    { t: `"${comp.personality}"`, d: 4400 },
    { t: `${comp.name} is awake.`, d: 5800 },
  ];
  useEffect(() => {
    const ts = steps.map((s, i) => setTimeout(() => setPh(i), s.d));
    const dn = setTimeout(onDone, 7000);
    return () => { ts.forEach(clearTimeout); clearTimeout(dn); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Shell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 32, textAlign: 'center' }}>
        <div style={{ width: 100, height: 100, borderRadius: '50%', background: `radial-gradient(circle,${col},${C.void})`, animation: 'wakeGlow 2s ease-in-out infinite', marginBottom: 40 }} />
        <div style={{ minHeight: 200 }}>
          {steps.map((s, i) => (
            <p key={i} style={{ fontSize: i === 1 || i === 5 ? 20 : 14, fontWeight: i === 1 || i === 5 ? 700 : 400, fontFamily: i === 1 || i === 5 ? "'Cormorant Garamond',serif" : "'DM Sans',sans-serif", color: i <= ph ? (i === 5 ? col : C.text) : 'transparent', transition: 'all 0.6s', margin: '7px 0', fontStyle: i === 2 || i === 4 ? 'italic' : 'normal' }}>{s.t}</p>
          ))}
        </div>
      </div>
    </Shell>
  );
}
