import React, { useState, useEffect, useRef } from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import SquishyBlob from '../components/SquishyBlob.jsx';
import { AMBIANCES, currentAmbiance, setAmbiance, playAmbiance, stopAmbiance, isCustom, listCustom, ambianceVolume, setAmbianceVolume } from '../lib/ambiance.js';

// Cowork station — a calm space to work alongside one or all of your companions
// (body-doubling), with a relaxing animated backdrop and ambient sound. Pick who
// keeps you company, a length, and a soundscape; a soft timer + gentle check-ins
// keep you company without pulling focus. Nudges elsewhere stay quiet via onFocus.
const DURATIONS = [
  { m: 25, label: '25 min' },
  { m: 50, label: '50 min' },
  { m: 0, label: 'Open' },   // no countdown
];
const ENCOURAGE = [
  'settle in — I’m right here with you.',
  'one thing at a time. you’ve got this.',
  'no rush. I’m not going anywhere.',
  'deep breath. keep going. ✦',
  'proud of you for showing up.',
  'whatever you get done is enough.',
  'I’ll keep you company — take your time.',
];

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function Cowork({ comps, profile, onFocus, onEndFocus, onSay, onBack }) {
  const awake = (comps || []).filter((c) => c.status === 'awake');
  const [selected, setSelected] = useState(() => new Set(awake.map((c) => c.id)));
  const [dur, setDur] = useState(25);
  const [phase, setPhase] = useState('setup');   // setup | working | done
  const [left, setLeft] = useState(0);            // seconds remaining (0 = open-ended)
  const [elapsed, setElapsed] = useState(0);
  const [amb, setAmb] = useState(() => { const a = currentAmbiance(); return a === 'off' ? 'rain' : a; });
  const [vol, setVol] = useState(ambianceVolume());
  const [custom, setCustom] = useState([]);
  const [encIdx, setEncIdx] = useState(0);
  const tick = useRef(null);

  useEffect(() => { listCustom().then(setCustom).catch(() => {}); }, []);
  // Rotate the gentle encouragement line every ~20s while working.
  useEffect(() => {
    if (phase !== 'working') return;
    const iv = setInterval(() => setEncIdx((i) => (i + 1) % ENCOURAGE.length), 20000);
    return () => clearInterval(iv);
  }, [phase]);

  const party = awake.filter((c) => selected.has(c.id));
  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  function begin() {
    if (!party.length) return;
    const secs = dur * 60;
    setLeft(secs); setElapsed(0); setPhase('working');
    if (amb && amb !== 'off') { setAmbiance(amb); playAmbiance(amb); }
    // Quiet the rest of the app for a little longer than the session (so its own
    // focus timer never ends the session out from under us); Cowork owns the end.
    onFocus?.((dur > 0 ? dur : 120) + 10, party[0]);
    const who = party.length > 1 ? `${party.slice(0, -1).map((c) => c.name).join(', ')} and ${party[party.length - 1].name}` : party[0].name;
    onSay?.(party[0], `Setting up our cowork station${profile?.name ? `, ${profile.name}` : ''} — ${who} settling in beside you. Let’s get into it. ✦`);
    tick.current = setInterval(() => {
      setElapsed((e) => e + 1);
      if (dur > 0) setLeft((l) => { if (l <= 1) { finish(); return 0; } return l - 1; });
    }, 1000);
  }
  function finish() {
    if (tick.current) { clearInterval(tick.current); tick.current = null; }
    setPhase('done');
    stopAmbiance();
    onEndFocus?.();
    if (party[0]) onSay?.(party[0], 'That’s our session. You showed up and stayed with it — proud of you. ♡');
  }
  function stop() { finish(); }
  // Leaving mid-session (Back): stop sound and lift the app-wide quiet mode.
  const endRef = useRef(onEndFocus);
  useEffect(() => { endRef.current = onEndFocus; }, [onEndFocus]);
  useEffect(() => () => { if (tick.current) clearInterval(tick.current); stopAmbiance(); endRef.current?.(); }, []);

  const chooseAmb = (k) => { setAmb(k); setAmbiance(k); if (phase === 'working') { if (k === 'off') stopAmbiance(); else playAmbiance(k); } };

  // ── Relaxing animated backdrop (soft drifting aurora blobs) ──
  const Backdrop = () => (
    <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', top: '-12%', left: '-14%', background: `radial-gradient(circle, ${C.glow1}44, transparent 66%)`, filter: 'blur(30px)', animation: 'drift1 26s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: 380, height: 380, borderRadius: '50%', bottom: '-10%', right: '-12%', background: `radial-gradient(circle, ${C.glow2}3a, transparent 66%)`, filter: 'blur(30px)', animation: 'drift2 32s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', top: '35%', left: '40%', background: `radial-gradient(circle, ${C.glow3 || C.glow1}30, transparent 66%)`, filter: 'blur(34px)', animation: 'drift1 38s ease-in-out infinite reverse' }} />
    </div>
  );

  const header = (
    <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}`, position: 'relative', zIndex: 3 }}>
      <button aria-label="Back" onClick={onBack} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 20, cursor: 'pointer' }}>←</button>
      <span style={{ fontSize: 15, fontWeight: 600 }}>Cowork</span>
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

  return (
    <Shell>
      {header}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', overflowY: 'auto' }}>
        <Backdrop />
        <div style={{ position: 'relative', zIndex: 2, padding: '20px 18px 44px', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>

          {/* Companions present */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', minHeight: 120, alignItems: 'center', marginBottom: 8 }}>
            {(phase === 'setup' ? awake : party).map((c, i) => {
              const on = selected.has(c.id);
              const dim = phase === 'setup' && !on;
              return (
                <button key={c.id} onClick={phase === 'setup' ? () => toggle(c.id) : undefined} disabled={phase !== 'setup'}
                  style={{ background: 'none', border: 'none', cursor: phase === 'setup' ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, opacity: dim ? 0.4 : 1, animation: phase === 'working' ? `${['floatA', 'floatB', 'floatC'][i % 3]} ${7 + i}s ease-in-out infinite` : 'none' }}>
                  <SquishyBlob comp={c} size={72} glow vitality={0.9} />
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
              <p style={{ fontSize: 12.5, color: C.textSoft, margin: '6px auto 18px', maxWidth: 300, lineHeight: 1.5 }}>Pick who keeps you company{profile?.name ? `, ${profile.name}` : ''}, set a length, and settle in. They’ll stay beside you while you work.</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 18 }}>
                {DURATIONS.map((d) => <button key={d.m} onClick={() => setDur(d.m)} style={{ padding: '9px 16px', borderRadius: 10, border: `1px solid ${dur === d.m ? C.glow1 : C.border}`, background: dur === d.m ? `${C.glow1}1f` : 'transparent', color: dur === d.m ? C.glow1 : C.textSoft, fontSize: 13, fontWeight: dur === d.m ? 700 : 500, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>{d.label}</button>)}
              </div>
              <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Background vibes</div>
              {ambChips}
              {volRow}
              <button onClick={begin} disabled={!party.length} className="bp" style={{ marginTop: 24, minWidth: 200, opacity: party.length ? 1 : 0.5 }}>Start coworking</button>
            </div>
          )}

          {phase === 'working' && (
            <div style={{ textAlign: 'center', marginTop: 4, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: dur > 0 ? 60 : 40, fontWeight: 800, color: C.text, lineHeight: 1.1, letterSpacing: 1 }}>{dur > 0 ? fmt(left) : fmt(elapsed)}</div>
              <div style={{ fontSize: 12, color: C.textDim, marginBottom: 18 }}>{dur > 0 ? 'remaining' : 'elapsed · open session'}</div>
              <div style={{ background: `${C.surface}cc`, border: `1px solid ${party[0]?.color?.primary || C.border}`, borderRadius: 14, padding: '12px 16px', maxWidth: 320, margin: '0 auto', fontSize: 13.5, color: C.text, lineHeight: 1.5, fontStyle: 'italic' }}>
                <span style={{ color: party[0]?.color?.primary, fontStyle: 'normal', fontWeight: 600 }}>{party.length > 1 ? 'We’re' : `${party[0]?.name} is`} here</span> — {ENCOURAGE[encIdx]}
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
              <p style={{ fontSize: 13.5, color: C.textSoft, margin: '8px auto 4px', maxWidth: 300, lineHeight: 1.5 }}>You focused for {fmt(elapsed)} alongside {party.map((c) => c.name).join(', ')}. Showing up is the whole thing. Stretch a little?</p>
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
