import React, { useState, useEffect, useRef } from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import SquishyBlob from '../components/SquishyBlob.jsx';
import { AMBIANCES, currentAmbiance, setAmbiance, playAmbiance, stopAmbiance, listCustom, ambianceVolume, setAmbianceVolume } from '../lib/ambiance.js';
import { pomoNext } from '../lib/cowork.js';

// Cowork station — a calm space to work alongside one or all of your companions
// (body-doubling), with a relaxing animated backdrop and ambient sound. Two
// modes: a single session (25/50/open), or Pomodoro focus/break cycles that
// alternate automatically. Nudges elsewhere stay quiet via onFocus.
const DURATIONS = [
  { m: 25, label: '25 min' },
  { m: 50, label: '50 min' },
  { m: 0, label: 'Open' },
];
const POMOS = [
  { work: 25, brk: 5, label: '25 / 5' },
  { work: 50, brk: 10, label: '50 / 10' },
];
const ENCOURAGE = [
  'settle in — I’m right here with you.',
  'one thing at a time. you’ve got this.',
  'no rush. I’m not going anywhere.',
  'deep breath. keep going. ✦',
  'proud of you for showing up.',
  'whatever you get done is enough.',
];
const BREAK_TIPS = ['stretch your shoulders', 'sip some water', 'look out a window', 'rest your eyes a moment', 'roll your neck', 'stand up and wander a bit'];

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export default function Cowork({ comps, profile, onFocus, onEndFocus, onSay, onBack }) {
  const awake = (comps || []).filter((c) => c.status === 'awake');
  const [selected, setSelected] = useState(() => new Set(awake.map((c) => c.id)));
  const [mode, setMode] = useState('single');     // 'single' | 'pomo'
  const [dur, setDur] = useState(25);             // single length (0 = open)
  const [pomo, setPomo] = useState(POMOS[0]);     // { work, brk }
  const [phase, setPhase] = useState('setup');     // setup | working | done
  const [seg, setSeg] = useState('focus');         // focus | break (pomo)
  const [round, setRound] = useState(1);
  const [left, setLeft] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [amb, setAmb] = useState(() => { const a = currentAmbiance(); return a === 'off' ? 'rain' : a; });
  const [vol, setVol] = useState(ambianceVolume());
  const [custom, setCustom] = useState([]);
  const [encIdx, setEncIdx] = useState(0);
  const tick = useRef(null);
  const leftRef = useRef(0);
  const sessRef = useRef(null);

  useEffect(() => { listCustom().then(setCustom).catch(() => {}); }, []);
  useEffect(() => {
    if (phase !== 'working') return;
    const iv = setInterval(() => setEncIdx((i) => i + 1), 20000);
    return () => clearInterval(iv);
  }, [phase]);

  const party = awake.filter((c) => selected.has(c.id));
  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const quietFor = (mins) => onFocus?.(mins, party[0]);

  function begin() {
    if (!party.length) return;
    sessRef.current = { mode, dur, work: pomo.work, brk: pomo.brk, seg: 'focus', round: 1 };
    setPhase('working'); setSeg('focus'); setRound(1); setElapsed(0); setEncIdx(0);
    const firstMin = mode === 'pomo' ? pomo.work : dur;
    leftRef.current = firstMin > 0 ? firstMin * 60 : 0;
    setLeft(leftRef.current);
    if (amb && amb !== 'off') { setAmbiance(amb); playAmbiance(amb); }
    quietFor(mode === 'pomo' ? pomo.work + pomo.brk + 2 : (dur > 0 ? dur : 120) + 10);
    const who = party.length > 1 ? `${party.slice(0, -1).map((c) => c.name).join(', ')} and ${party[party.length - 1].name}` : party[0].name;
    onSay?.(party[0], `Setting up our cowork station${profile?.name ? `, ${profile.name}` : ''} — ${who} settling in beside you. Let’s get into it. ✦`);
    tick.current = setInterval(step, 1000);
  }

  function step() {
    const s = sessRef.current; if (!s) return;
    setElapsed((e) => e + 1);
    if (s.mode === 'single' && s.dur === 0) return;   // open session: count up only
    leftRef.current -= 1;
    if (leftRef.current > 0) { setLeft(leftRef.current); return; }
    // Current segment ended.
    if (s.mode === 'single') { finish(); return; }
    // Pomodoro: alternate focus <-> break.
    const wasFocus = s.seg === 'focus';
    const nx = pomoNext(s.seg, s.round, s.work, s.brk);
    s.seg = nx.seg; s.round = nx.round; leftRef.current = nx.secs;
    setSeg(nx.seg); setRound(nx.round); setLeft(nx.secs);
    if (wasFocus) {
      onSay?.(party[0], `Nice round. Take ${s.brk} — ${pick(BREAK_TIPS)}. I’ll be right here. ♡`);
    } else {
      quietFor(s.work + s.brk + 2);   // keep the app quiet through the next cycle
      onSay?.(party[0], `Break’s over — let’s ease back in. Round ${s.round}. ✦`);
    }
  }

  function finish() {
    if (tick.current) { clearInterval(tick.current); tick.current = null; }
    sessRef.current = null;
    setPhase('done');
    stopAmbiance();
    onEndFocus?.();
    if (party[0]) onSay?.(party[0], 'That’s our session. You showed up and stayed with it — proud of you. ♡');
  }
  function stop() { finish(); }

  const endRef = useRef(onEndFocus);
  useEffect(() => { endRef.current = onEndFocus; }, [onEndFocus]);
  useEffect(() => () => { if (tick.current) clearInterval(tick.current); stopAmbiance(); endRef.current?.(); }, []);

  const chooseAmb = (k) => { setAmb(k); setAmbiance(k); if (phase === 'working') { if (k === 'off') stopAmbiance(); else playAmbiance(k); } };

  const onBreak = mode === 'pomo' && seg === 'break';

  const Backdrop = () => (
    <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', top: '-12%', left: '-14%', background: `radial-gradient(circle, ${(onBreak ? C.glow3 : C.glow1) || C.glow1}44, transparent 66%)`, filter: 'blur(30px)', animation: 'drift1 26s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: 380, height: 380, borderRadius: '50%', bottom: '-10%', right: '-12%', background: `radial-gradient(circle, ${C.glow2}3a, transparent 66%)`, filter: 'blur(30px)', animation: 'drift2 32s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', top: '35%', left: '40%', background: `radial-gradient(circle, ${(C.glow3 || C.glow1)}30, transparent 66%)`, filter: 'blur(34px)', animation: 'drift1 38s ease-in-out infinite reverse' }} />
    </div>
  );

  const ambChips = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center' }}>
      {AMBIANCES.map((a) => { const on = amb === a.key; return <button key={a.key} onClick={() => chooseAmb(a.key)} style={{ background: on ? `${C.glow1}22` : C.surfaceUp, border: `1px solid ${on ? C.glow1 : C.border}`, color: on ? C.glow1 : C.textSoft, borderRadius: 50, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>{a.em} {a.label}</button>; })}
      {custom.map((s) => { const k = `custom:${s.id}`; const on = amb === k; return <button key={s.id} onClick={() => chooseAmb(k)} style={{ background: on ? `${C.glow1}22` : C.surfaceUp, border: `1px solid ${on ? C.glow1 : C.border}`, color: on ? C.glow1 : C.textSoft, borderRadius: 50, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🎵 {s.name}</button>; })}
    </div>
  );
  const volRow = amb !== 'off' && (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 320, margin: '14px auto 0' }}>
      <span aria-hidden style={{ fontSize: 13 }}>🔈</span>
      <input type="range" min="0" max="1" step="0.05" value={vol} aria-label="Ambiance volume" onChange={(e) => { const v = parseFloat(e.target.value); setVol(v); setAmbianceVolume(v); }} style={{ flex: 1, accentColor: C.glow1, cursor: 'pointer' }} />
      <span aria-hidden style={{ fontSize: 13 }}>🔊</span>
    </div>
  );
  const modeBtn = (k, label) => <button onClick={() => setMode(k)} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: `1px solid ${mode === k ? C.glow1 : C.border}`, background: mode === k ? `${C.glow1}1f` : 'transparent', color: mode === k ? C.glow1 : C.textSoft, fontSize: 13, fontWeight: mode === k ? 700 : 500, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>{label}</button>;

  return (
    <Shell fill>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}`, position: 'relative', zIndex: 3 }}>
        <button aria-label="Back" onClick={onBack} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Cowork</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: 'relative', overflowY: 'auto' }}>
        <Backdrop />
        <div style={{ position: 'relative', zIndex: 2, padding: '20px 18px 44px', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', minHeight: 120, alignItems: 'center', marginBottom: 8 }}>
            {(phase === 'setup' ? awake : party).map((c, i) => {
              const on = selected.has(c.id);
              const dim = phase === 'setup' && !on;
              return (
                <button key={c.id} onClick={phase === 'setup' ? () => toggle(c.id) : undefined} disabled={phase !== 'setup'}
                  style={{ background: 'none', border: 'none', cursor: phase === 'setup' ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, opacity: dim ? 0.4 : 1, animation: phase === 'working' ? `${['floatA', 'floatB', 'floatC'][i % 3]} ${7 + i}s ease-in-out infinite` : 'none' }}>
                  <SquishyBlob comp={c} size={72} glow vitality={onBreak ? 0.6 : 0.9} />
                  <span style={{ fontSize: 12, color: C.textSoft, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {phase === 'setup' && <span style={{ width: 13, height: 13, borderRadius: 4, border: `1px solid ${on ? C.glow1 : C.border}`, background: on ? C.glow1 : 'transparent', color: '#0b0a12', fontSize: 10, lineHeight: '12px', textAlign: 'center' }}>{on ? '✓' : ''}</span>}
                    {c.name}
                  </span>
                </button>
              );
            })}
            {awake.length === 0 && <p style={{ fontSize: 13, color: C.textDim }}>Wake a companion to cowork together.</p>}
          </div>

          {phase === 'setup' && (
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 700 }}>Cowork together</div>
              <p style={{ fontSize: 12.5, color: C.textSoft, margin: '6px auto 18px', maxWidth: 300, lineHeight: 1.5 }}>Pick who keeps you company{profile?.name ? `, ${profile.name}` : ''}, choose how you’ll work, and settle in.</p>

              <div style={{ display: 'flex', gap: 8, maxWidth: 300, margin: '0 auto 14px' }}>{modeBtn('single', 'Single session')}{modeBtn('pomo', 'Pomodoro')}</div>

              {mode === 'single' ? (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 18 }}>
                  {DURATIONS.map((d) => <button key={d.m} onClick={() => setDur(d.m)} style={{ padding: '9px 16px', borderRadius: 10, border: `1px solid ${dur === d.m ? C.glow1 : C.border}`, background: dur === d.m ? `${C.glow1}1f` : 'transparent', color: dur === d.m ? C.glow1 : C.textSoft, fontSize: 13, fontWeight: dur === d.m ? 700 : 500, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>{d.label}</button>)}
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 6 }}>
                    {POMOS.map((pp) => { const on = pomo.work === pp.work && pomo.brk === pp.brk; return <button key={pp.label} onClick={() => setPomo(pp)} style={{ padding: '9px 16px', borderRadius: 10, border: `1px solid ${on ? C.glow1 : C.border}`, background: on ? `${C.glow1}1f` : 'transparent', color: on ? C.glow1 : C.textSoft, fontSize: 13, fontWeight: on ? 700 : 500, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>{pp.label}</button>; })}
                  </div>
                  <div style={{ fontSize: 11, color: C.textDim, marginBottom: 18 }}>Focus / break minutes, repeating until you end.</div>
                </>
              )}

              <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Background vibes</div>
              {ambChips}
              {volRow}
              <button onClick={begin} disabled={!party.length} className="bp" style={{ marginTop: 24, minWidth: 200, opacity: party.length ? 1 : 0.5 }}>Start coworking</button>
            </div>
          )}

          {phase === 'working' && (
            <div style={{ textAlign: 'center', marginTop: 4, flex: 1, display: 'flex', flexDirection: 'column' }}>
              {mode === 'pomo' && (
                <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: onBreak ? (C.glow3 || C.glow1) : C.glow1, fontWeight: 700, marginBottom: 4 }}>{onBreak ? '☕ Break' : `Focus · round ${round}`}</div>
              )}
              <div style={{ fontSize: (mode === 'single' && dur === 0) ? 40 : 60, fontWeight: 800, color: C.text, lineHeight: 1.1, letterSpacing: 1 }}>{(mode === 'single' && dur === 0) ? fmt(elapsed) : fmt(left)}</div>
              <div style={{ fontSize: 12, color: C.textDim, marginBottom: 18 }}>{(mode === 'single' && dur === 0) ? 'elapsed · open session' : (onBreak ? 'break — step away a moment' : 'stay with it')}</div>
              <div style={{ background: `${C.surface}cc`, border: `1px solid ${(onBreak ? (C.glow3 || C.glow1) : party[0]?.color?.primary) || C.border}`, borderRadius: 14, padding: '12px 16px', maxWidth: 320, margin: '0 auto', fontSize: 13.5, color: C.text, lineHeight: 1.5, fontStyle: 'italic' }}>
                <span style={{ color: onBreak ? (C.glow3 || C.glow1) : party[0]?.color?.primary, fontStyle: 'normal', fontWeight: 600 }}>{onBreak ? 'Rest' : (party.length > 1 ? 'We’re' : `${party[0]?.name} is`)}{onBreak ? '' : ' here'}</span> — {onBreak ? `${pick(BREAK_TIPS)}.` : ENCOURAGE[encIdx % ENCOURAGE.length]}
              </div>
              <div style={{ marginTop: 'auto', paddingTop: 26 }}>
                <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Background vibes</div>
                {ambChips}
                {volRow}
                <button onClick={stop} className="bg2" style={{ marginTop: 22 }}>End session</button>
              </div>
            </div>
          )}

          {phase === 'done' && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>✦</div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 700 }}>Nice work.</div>
              <p style={{ fontSize: 13.5, color: C.textSoft, margin: '8px auto 4px', maxWidth: 300, lineHeight: 1.5 }}>You focused for {fmt(elapsed)}{mode === 'pomo' ? ` across ${round} round${round === 1 ? '' : 's'}` : ''} alongside {party.map((c) => c.name).join(', ')}. Showing up is the whole thing.</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 22 }}>
                <button onClick={() => setPhase('setup')} className="bp">Another session</button>
                <button onClick={onBack} className="bg2">Done</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
