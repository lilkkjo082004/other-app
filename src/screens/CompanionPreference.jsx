import React, { useState } from 'react';
import { C } from '../theme.js';
import { Shell, Prog, Pills } from '../components/ui.jsx';
import { B_PERS, B_REL } from '../data/onboarding.js';

// Quick-pick vibes for the "Surprise Me" path. Romantic ones are filtered for minors.
const VIBE_SUGGESTIONS = [
  'Sarcastic humor', 'Protective energy', 'Calm & grounding', 'Adventurous',
  'Deeply loyal', 'Playfully chaotic', 'Intellectual', 'Mysterious',
  'Goofy & fun', 'Creative soul', 'Motivating', 'Gentle & soft',
  'Flirty', 'Romantic',
];
const ROMANTIC_VIBES = ['Flirty', 'Romantic'];

export default function CompanionPreference({ onChoice, ageGroup }) {
  const [mode, setMode] = useState(null);
  const [bStep, setBStep] = useState(0);
  const [bT, setBT] = useState({});
  const [ft, setFt] = useState('');
  const [picks, setPicks] = useState([]);
  const togglePick = (v) => setPicks((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  const combinedFreeText = () => [...picks, ft.trim()].filter(Boolean).join(', ') || null;

  const filterCats = (cats) => (ageGroup === 'under18'
    ? cats.map((c) => (c.id === 'romance' ? { ...c, opts: ['None'] } : c.id === 'archetype' ? { ...c, opts: c.opts.filter((o) => o !== 'Romantic interest') } : c))
    : cats);

  const taStyle = { width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, fontSize: 13, color: C.text, outline: 'none', resize: 'none' };

  if (!mode) {
    return (
      <Shell>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>✦</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 600, marginBottom: 8 }}>How do you want to meet your companions?</h2>
          <p style={{ color: C.textSoft, fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>Either way, they choose their own names and grow into whoever they become.</p>
          {[{ m: 'surprise', i: '✨', t: 'Surprise Me', d: 'Let the stars decide.' }, { m: 'builder', i: '🎨', t: 'Guide Me', d: 'Pick broad traits as seeds.' }].map((o) => (
            <button key={o.m} onClick={() => setMode(o.m)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '18px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', fontFamily: "'DM Sans',sans-serif", marginBottom: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 3 }}>{o.i} {o.t}</div>
              <div style={{ fontSize: 12, color: C.textSoft }}>{o.d}</div>
            </button>
          ))}
        </div>
      </Shell>
    );
  }

  if (mode === 'surprise') {
    return (
      <Shell>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 32, animation: 'fadeUp 0.4s both' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>💫</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Anything else you're drawn to?</h2>
          <p style={{ color: C.textSoft, fontSize: 12, marginBottom: 14 }}>Tap any that fit — and/or add your own below. All optional.</p>
          <div style={{ marginBottom: 14 }}>
            <Pills opts={VIBE_SUGGESTIONS.filter((v) => ageGroup !== 'under18' || !ROMANTIC_VIBES.includes(v))} sel={picks} onTog={togglePick} />
          </div>
          <textarea value={ft} onChange={(e) => setFt(e.target.value)} rows={3} placeholder='Or describe it yourself — "an old soul who loves bad puns"' style={taStyle} />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="bg2" onClick={() => setMode(null)}>Back</button>
            <button className="bp" style={{ flex: 1 }} onClick={() => onChoice({ mode: 'surprise', freeText: combinedFreeText() })}>Generate</button>
          </div>
        </div>
      </Shell>
    );
  }

  const allCats = [...filterCats(B_PERS), ...filterCats(B_REL)];
  const screens = [allCats.slice(0, 5), allCats.slice(5)];
  const labels = ['Personality Traits', 'Relationship Dynamics'];

  if (bStep < 2) {
    return (
      <Shell>
        <Prog s={bStep} t={3} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 22px 22px', overflowY: 'auto', justifyContent: 'center', animation: 'fadeUp 0.3s both' }}>
          <button onClick={() => (bStep > 0 ? setBStep(bStep - 1) : setMode(null))} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: C.textSoft, fontSize: 13, cursor: 'pointer', marginBottom: 8, fontFamily: "'DM Sans',sans-serif" }}>← Back</button>
          <p style={{ fontSize: 11, color: C.glow2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>Trait Seeds</p>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{labels[bStep]}</h2>
          <p style={{ color: C.textSoft, fontSize: 12, marginBottom: 12 }}>Multi-select from each. Companions interpret these their own way.</p>
          {screens[bStep].map((cat) => (
            <div key={cat.id} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.textSoft, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>{cat.label}</div>
              <Pills opts={cat.opts} sel={bT[cat.id] || []} onTog={(v) => { const c = bT[cat.id] || []; setBT({ ...bT, [cat.id]: c.includes(v) ? c.filter((x) => x !== v) : [...c, v] }); }} />
            </div>
          ))}
          <button className="bp" onClick={() => setBStep(bStep + 1)} style={{ marginTop: 6, width: '100%' }}>Continue</button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <Prog s={2} t={3} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 32, animation: 'fadeUp 0.4s both' }}>
        <button onClick={() => setBStep(1)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: C.textSoft, fontSize: 13, cursor: 'pointer', marginBottom: 8, fontFamily: "'DM Sans',sans-serif" }}>← Back</button>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Anything else?</h2>
        <p style={{ color: C.textSoft, fontSize: 12, marginBottom: 14 }}>Optional extra flavor.</p>
        <textarea value={ft} onChange={(e) => setFt(e.target.value)} rows={3} placeholder="Optional..." style={taStyle} />
        <button className="bp" style={{ marginTop: 12 }} onClick={() => onChoice({ mode: 'builder', builderTraits: bT, freeText: ft.trim() || null })}>Generate Companions</button>
      </div>
    </Shell>
  );
}
