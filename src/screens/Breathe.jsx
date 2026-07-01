import React, { useState, useEffect, useRef } from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';

// Breathing & grounding — a standalone calm tool. Box-breathing with an animated
// orb that expands/holds/contracts, plus a 5-4-3-2-1 grounding exercise. No AI,
// no companion; just for the user. Respects reduced motion via short transitions.
const BOX = [
  { label: 'Breathe in', secs: 4, scale: 1.6 },
  { label: 'Hold', secs: 4, scale: 1.6 },
  { label: 'Breathe out', secs: 4, scale: 0.7 },
  { label: 'Hold', secs: 4, scale: 0.7 },
];
const GROUND = [
  { n: 5, sense: 'things you can see', em: '👀' },
  { n: 4, sense: 'things you can feel', em: '✋' },
  { n: 3, sense: 'things you can hear', em: '👂' },
  { n: 2, sense: 'things you can smell', em: '👃' },
  { n: 1, sense: 'thing you can taste', em: '👅' },
];

function BoxBreathing() {
  const [phase, setPhase] = useState(0);
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(BOX[0].secs);
  const tick = useRef(null);
  useEffect(() => {
    if (!running) return;
    setLeft(BOX[phase].secs);
    let s = BOX[phase].secs;
    tick.current = setInterval(() => {
      s -= 1;
      if (s <= 0) { setPhase((p) => (p + 1) % BOX.length); }
      else setLeft(s);
    }, 1000);
    return () => clearInterval(tick.current);
  }, [phase, running]);
  const cur = BOX[phase];
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, ${C.glow1}, ${C.glow2})`, boxShadow: `0 0 60px ${C.glow1}66`, transform: `scale(${running ? cur.scale : 1})`, transition: `transform ${running ? cur.secs : 0.6}s ease-in-out`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 20 }}>
          {running ? left : '✦'}
        </div>
      </div>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 700, minHeight: 30 }}>{running ? cur.label : 'Box breathing'}</div>
      <div style={{ fontSize: 12.5, color: C.textSoft, margin: '4px 0 18px' }}>{running ? 'Follow the orb — in, hold, out, hold.' : 'Four counts in, hold, out, hold. Repeat.'}</div>
      <button onClick={() => { setRunning((r) => !r); setPhase(0); }} className="bp" style={{ minWidth: 160 }}>{running ? 'Stop' : 'Begin'}</button>
    </div>
  );
}

function Grounding() {
  const [i, setI] = useState(0);
  const done = i >= GROUND.length;
  return (
    <div style={{ textAlign: 'center', paddingTop: 20 }}>
      {done ? (
        <>
          <div style={{ fontSize: 40, marginBottom: 10 }}>💛</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 700 }}>You’re here.</div>
          <p style={{ fontSize: 13, color: C.textSoft, margin: '8px 0 18px', lineHeight: 1.5 }}>Notice how your body feels now. You can do this anytime.</p>
          <button onClick={() => setI(0)} className="bg2">Again</button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 46, marginBottom: 8 }}>{GROUND[i].em}</div>
          <div style={{ fontSize: 54, fontWeight: 800, color: C.glow1, lineHeight: 1 }}>{GROUND[i].n}</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 700, marginTop: 6 }}>{GROUND[i].sense}</div>
          <p style={{ fontSize: 12.5, color: C.textDim, margin: '10px 0 20px' }}>Take your time. Name them to yourself.</p>
          <button onClick={() => setI(i + 1)} className="bp" style={{ minWidth: 160 }}>{i === GROUND.length - 1 ? 'Finish' : 'Next'}</button>
        </>
      )}
    </div>
  );
}

export default function Breathe({ onBack }) {
  const [tab, setTab] = useState('box');
  const tabBtn = (k, label) => (
    <button onClick={() => setTab(k)} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: `1px solid ${tab === k ? C.glow1 : C.border}`, background: tab === k ? `${C.glow1}1f` : 'transparent', color: tab === k ? C.glow1 : C.textSoft, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>{label}</button>
  );
  return (
    <Shell>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}` }}>
        <button aria-label="Back" onClick={onBack} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Breathe</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 18px 44px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>{tabBtn('box', '🌬️ Box breathing')}{tabBtn('ground', '🌿 Grounding')}</div>
        {tab === 'box' ? <BoxBreathing /> : <Grounding />}
      </div>
    </Shell>
  );
}
