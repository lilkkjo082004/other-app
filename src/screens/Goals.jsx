import React, { useState } from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import { newGoal, addGoal, removeGoal, toggleGoal } from '../lib/goals.js';

// Gentle goals: set things you're working toward; check them off when done.
// A companion will check in kindly now and then (handled in chat).
export default function Goals({ goals = [], onChange, onBack }) {
  const [text, setText] = useState('');
  const list = goals || [];
  const active = list.filter((g) => !g.done);
  const done = list.filter((g) => g.done);
  const fmt = (t) => { try { return new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' }); } catch (e) { return ''; } };

  function add() { const t = text.trim(); if (!t) return; onChange?.(addGoal(list, newGoal(t))); setText(''); }

  const row = (g) => (
    <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '11px 13px', marginBottom: 8 }}>
      <button aria-label={g.done ? 'Mark not done' : 'Mark done'} onClick={() => onChange?.(toggleGoal(list, g.id))} style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${g.done ? C.glow3 : C.border}`, background: g.done ? C.glow3 : 'transparent', color: '#fff', fontSize: 12, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{g.done && '✓'}</button>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, color: g.done ? C.textDim : C.text, textDecoration: g.done ? 'line-through' : 'none', lineHeight: 1.4 }}>{g.text}</div>
        <div style={{ fontSize: 10, color: C.textDim }}>{g.done ? `done ${fmt(g.doneAt)}` : `since ${fmt(g.ts)}`}</div>
      </div>
      <button aria-label="Remove goal" onClick={() => onChange?.(removeGoal(list, g.id))} style={{ background: 'none', border: 'none', color: C.textDim, fontSize: 13, cursor: 'pointer', opacity: 0.6 }}>✕</button>
    </div>
  );

  return (
    <Shell>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}` }}>
        <button aria-label="Back" onClick={onBack} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Goals</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 18px 48px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} placeholder="Something you're working toward…" maxLength={160}
            style={{ flex: 1, boxSizing: 'border-box', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 13, color: C.text, outline: 'none' }} />
          <button onClick={add} disabled={!text.trim()} style={{ background: text.trim() ? C.glow1 : C.border, border: 'none', borderRadius: 10, padding: '0 16px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: text.trim() ? 'pointer' : 'default', fontFamily: "'DM Sans',sans-serif" }}>Add</button>
        </div>
        {list.length === 0 && <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6 }}>Add a goal and your companions will gently cheer you on. No pressure, no nagging.</p>}
        {active.length > 0 && <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Working on</div>}
        {active.map(row)}
        {done.length > 0 && <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, textTransform: 'uppercase', margin: '18px 0 10px' }}>Done ✦</div>}
        {done.map(row)}
      </div>
    </Shell>
  );
}
