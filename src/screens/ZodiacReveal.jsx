import React, { useState, useEffect } from 'react';
import { C } from '../theme.js';
import { cap } from '../lib/zodiac.js';
import { Shell } from '../components/ui.jsx';

export default function ZodiacReveal({ profile, onContinue }) {
  const [shown, setShown] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShown(true), 200); return () => clearTimeout(t); }, []);
  const a = profile.astrology;
  const items = [
    { l: 'Western Zodiac', v: `${a.westernData.sym} ${cap(a.western)}`, s: `${a.westernData.el} · ${a.westernData.trait}` },
    { l: 'Chinese Zodiac', v: a.chinese, s: `${a.chineseElement} element` },
    { l: 'Life Path', v: `#${a.lifePath}`, s: 'Numerology' },
  ];
  return (
    <Shell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 32, textAlign: 'center', opacity: shown ? 1 : 0, transform: shown ? 'none' : 'scale(0.95)', transition: 'all 0.8s' }}>
        <div style={{ fontSize: 56, marginBottom: 20, animation: 'pulse 3s ease-in-out infinite' }}>{a.westernData.sym}</div>
        <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', color: C.glow1, marginBottom: 8 }}>Your Stars</p>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 30, fontWeight: 700, marginBottom: 28 }}>{profile.name}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 300, marginBottom: 32 }}>
          {items.map((it, i) => (
            <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 18px', textAlign: 'left', animation: `fadeUp 0.5s ${0.2 + i * 0.15}s both` }}>
              <div style={{ fontSize: 10, color: C.textDim, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 3 }}>{it.l}</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{it.v}</div>
              <div style={{ fontSize: 12, color: C.textSoft, marginTop: 2 }}>{it.s}</div>
            </div>
          ))}
        </div>
        <button className="bp" onClick={onContinue}>Meet Your Companions ✦</button>
      </div>
    </Shell>
  );
}
