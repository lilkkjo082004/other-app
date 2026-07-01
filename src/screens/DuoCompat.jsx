import React, { useState } from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import { getUserAstro, ZODIAC, COMPAT, cap } from '../lib/zodiac.js';

// Invite-a-friend / duo compatibility — a fun reading between the user and
// someone they enter (friendship or romantic), from the same astrology engine.
// A shareable, viral little moment. No account or network needed.
const ELEMENT_PAIRS = {
  Fire: { Fire: 82, Air: 90, Earth: 55, Water: 58 },
  Air: { Fire: 90, Air: 80, Earth: 60, Water: 63 },
  Earth: { Earth: 84, Water: 88, Fire: 55, Air: 60 },
  Water: { Water: 82, Earth: 88, Fire: 58, Air: 63 },
};

function reading(meSign, themSign) {
  const me = ZODIAC[meSign], them = ZODIAC[themSign];
  if (!me || !them) return null;
  let score = ELEMENT_PAIRS[me.el]?.[them.el] ?? 65;
  if (meSign === themSign) score = Math.max(score, 85);
  if ((COMPAT[meSign] || []).includes(themSign)) score = Math.min(99, score + 8);
  score = Math.max(40, Math.min(99, score));
  const line = score >= 85 ? 'A rare, easy resonance — you just get each other.'
    : score >= 72 ? 'Strong chemistry with room to grow. This one has legs.'
    : score >= 60 ? 'Different rhythms, but the contrast can be magnetic.'
    : 'You’ll challenge each other — worth it if you both stay curious.';
  const elLine = me.el === them.el ? `Two ${me.el} souls — you move at the same pace.`
    : `${me.el} meets ${them.el}: ${me.el === 'Fire' || them.el === 'Fire' ? 'spark' : 'balance'} when you lean into the difference.`;
  return { score, line, elLine, me, them };
}

export default function DuoCompat({ profile, onBack }) {
  const meSign = profile?.astrology?.western;
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [res, setRes] = useState(null);

  function calc() {
    if (!dob || !meSign) return;
    const a = getUserAstro(dob);
    const r = reading(meSign, a.western);
    if (r) setRes({ ...r, name: name.trim() || 'Them', themSign: a.western });
  }

  return (
    <Shell fill>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}` }}>
        <button aria-label="Back" onClick={onBack} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Compatibility</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 16px 44px' }}>
        {!meSign && <p style={{ color: C.textDim, fontSize: 13 }}>Add your birthday in your profile first.</p>}
        {meSign && (
          <>
            <p style={{ fontSize: 12.5, color: C.textSoft, marginBottom: 14 }}>See how you and a friend, crush, or family member click — cosmically speaking. ✦</p>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Their name</div>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="A friend’s name" style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '11px 13px', fontSize: 14, color: C.text, outline: 'none', marginBottom: 12 }} />
              <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Their birthday</div>
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '11px 13px', fontSize: 14, color: C.text, outline: 'none', colorScheme: 'dark' }} />
            </div>
            <button onClick={calc} disabled={!dob} className="bp" style={{ width: '100%', opacity: dob ? 1 : 0.5 }}>Reveal our compatibility</button>

            {res && (
              <div style={{ marginTop: 18, background: `linear-gradient(160deg, ${C.glow1}1e, ${C.surface})`, border: `1px solid ${C.glow1}44`, borderRadius: 18, padding: '20px 16px', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: 30 }}>{res.me.sym}</span>
                  <span style={{ fontSize: 16, color: C.textDim }}>+</span>
                  <span style={{ fontSize: 30 }}>{res.them.sym}</span>
                </div>
                <div style={{ fontSize: 44, fontWeight: 800, color: C.glow1, lineHeight: 1 }}>{res.score}%</div>
                <div style={{ fontSize: 12, color: C.textDim, margin: '2px 0 12px' }}>{cap(meSign)} & {cap(res.themSign)} · you & {res.name}</div>
                <p style={{ fontSize: 14, color: C.text, lineHeight: 1.55, marginBottom: 8 }}>{res.line}</p>
                <p style={{ fontSize: 12.5, color: C.textSoft, lineHeight: 1.5 }}>{res.elLine}</p>
                <p style={{ fontSize: 10.5, color: C.textDim, marginTop: 14 }}>For fun and curiosity ✦ share it with {res.name}!</p>
              </div>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
