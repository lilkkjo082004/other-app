import React, { useState, useEffect } from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import {
  loadHabits, saveHabits, addHabit, removeHabit, toggleToday, refreshForToday,
  HABIT_IDEAS, SLOTS, scheduleLabel,
} from '../lib/habits.js';

// Habit tracker — add daily habits (type your own or pick from 20), give each a
// time of day or a specific time, then check them off for a gentle streak.
export default function Habits({ onBack }) {
  const [list, setList] = useState(() => refreshForToday(loadHabits()));
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const [when, setWhen] = useState('anytime');
  const [time, setTime] = useState('');
  useEffect(() => { saveHabits(list); }, [list]);

  const doneCount = list.filter((h) => h.doneToday).length;
  const open = adding || list.length === 0; // composer is shown for first-run too

  const add = (t, em) => {
    if (!(t || '').trim()) return;
    setList((p) => addHabit(p, t, { em, when, time }));
    setText('');
  };

  return (
    <Shell fill>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}` }}>
        <button aria-label="Back" onClick={onBack} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 20, cursor: 'pointer' }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Habits</div>
          {list.length > 0 && <div style={{ fontSize: 10.5, color: C.textDim }}>{doneCount}/{list.length} done today</div>}
        </div>
        <button
          aria-label={open ? 'Close add habit' : 'Add a habit'}
          onClick={() => setAdding((v) => !v)}
          style={{ flexShrink: 0, width: 32, height: 32, borderRadius: '50%', border: 'none', background: open ? C.surfaceUp : C.glow1, color: open ? C.textSoft : '#fff', fontSize: 20, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: open ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}
        >+</button>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 16px 44px' }}>
        {/* Today's habits */}
        {list.map((h) => (
          <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 11, background: C.surface, border: `1px solid ${h.doneToday ? C.glow3 : C.border}`, borderRadius: 13, padding: '11px 13px', marginBottom: 9 }}>
            <button aria-label={h.doneToday ? 'Mark not done' : 'Mark done'} onClick={() => setList((p) => toggleToday(p, h.id))} style={{ flexShrink: 0, width: 26, height: 26, borderRadius: '50%', border: `2px solid ${h.doneToday ? C.glow3 : C.border}`, background: h.doneToday ? C.glow3 : 'transparent', color: '#0b0a12', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{h.doneToday ? '✓' : ''}</button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.em} {h.text}</div>
              <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 1 }}>
                {scheduleLabel(h)}{h.streak > 0 ? ` · 🔥 ${h.streak}-day streak` : ''}
              </div>
            </div>
            <button aria-label="Remove habit" onClick={() => setList((p) => removeHabit(p, h.id))} style={{ flexShrink: 0, background: 'none', border: 'none', color: C.textDim, fontSize: 15, cursor: 'pointer' }}>×</button>
          </div>
        ))}

        {list.length === 0 && !adding && (
          <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6, textAlign: 'center', margin: '10px 0 18px' }}>
            Build your daily habits. Tap <b style={{ color: C.textSoft }}>+</b> to add one — type your own or pick from the list.
          </p>
        )}

        {/* Composer */}
        {open && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 13, marginTop: list.length ? 6 : 2 }}>
            {/* Time of day */}
            <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 7 }}>When</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 11 }}>
              {SLOTS.map((s) => {
                const on = when === s.id && !time;
                return (
                  <button key={s.id} onClick={() => { setWhen(s.id); setTime(''); }} style={{ background: on ? C.glow1 : C.surfaceUp, border: `1px solid ${on ? C.glow1 : C.border}`, borderRadius: 50, padding: '6px 12px', fontSize: 12, color: on ? '#fff' : C.textSoft, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>{s.em} {s.label}</button>
                );
              })}
            </div>

            {/* Specific time (optional) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: C.textSoft }}>⏰ Specific time</span>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                aria-label="Specific time (optional)"
                style={{ background: C.bg, border: `1px solid ${time ? C.glow1 : C.border}`, borderRadius: 9, padding: '7px 10px', fontSize: 13, color: C.text, outline: 'none', colorScheme: 'dark', fontFamily: "'DM Sans',sans-serif" }}
              />
              {time && <button onClick={() => setTime('')} aria-label="Clear time" style={{ background: 'none', border: 'none', color: C.textDim, fontSize: 15, cursor: 'pointer' }}>×</button>}
            </div>

            {/* Type your own */}
            <div style={{ display: 'flex', gap: 7, marginBottom: 13 }}>
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(text); }} placeholder="Type a habit…" style={{ flex: 1, minWidth: 0, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 13, color: C.text, outline: 'none' }} />
              <button onClick={() => add(text)} disabled={!text.trim()} style={{ flexShrink: 0, background: text.trim() ? C.glow1 : C.border, border: 'none', borderRadius: 10, color: '#fff', padding: '0 16px', fontSize: 13, fontWeight: 600, cursor: text.trim() ? 'pointer' : 'default', fontFamily: "'DM Sans',sans-serif" }}>Add</button>
            </div>

            {/* Pick from 20 */}
            <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, textTransform: 'uppercase', margin: '4px 0 8px' }}>Popular habits</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {HABIT_IDEAS.map((idea) => (
                <button key={idea.text} onClick={() => add(idea.text, idea.em)} style={{ background: C.surfaceUp, border: `1px solid ${C.border}`, borderRadius: 50, padding: '6px 12px', fontSize: 12, color: C.textSoft, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>{idea.em} {idea.text}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
