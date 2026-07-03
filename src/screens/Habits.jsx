import React, { useState, useEffect } from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import {
  initHabits, saveHabits, addHabit, removeHabit, toggleToday, toggleRemind,
  doneToday, dueToday, streakOf, weekProgress, scheduleLabel, freqLabel, formatDuration,
  HABIT_IDEAS, SLOTS, FREQ_CHOICES, WEEKDAYS,
} from '../lib/habits.js';

// Habit tracker — add daily/recurring habits (type your own or pick from 20),
// give each a time of day (or specific time) and a recurrence, then check them
// off for a gentle streak. Folds in the former "Rituals" tool.
export default function Habits({ onBack, onChange }) {
  const [list, setList] = useState(() => initHabits());
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const [when, setWhen] = useState('anytime');
  const [time, setTime] = useState('');
  const [freqKey, setFreqKey] = useState('daily');
  const [days, setDays] = useState([]); // for 'weekdays'
  const [duration, setDuration] = useState(0); // minutes; 0 = none
  // Save locally, and let the app resync so reminder-enabled habits reach the
  // backend cron (for closed-app push).
  useEffect(() => { saveHabits(list); onChange?.(); }, [list]);

  const now = Date.now();
  const open = adding || list.length === 0;
  const today = list.filter((h) => dueToday(h, now) || doneToday(h, now));
  const doneCount = today.filter((h) => doneToday(h, now)).length;

  const buildFreq = () => (FREQ_CHOICES.find((f) => f.key === freqKey) || FREQ_CHOICES[0]).build(days);
  const add = (t, em) => {
    if (!(t || '').trim()) return;
    setList((p) => addHabit(p, t, { em, when, time, freq: buildFreq(), duration }));
    setText('');
  };
  const toggleDay = (d) => setDays((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]));

  return (
    <Shell fill>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}` }}>
        <button aria-label="Back" onClick={onBack} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 20, cursor: 'pointer' }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Habits</div>
          {today.length > 0 && <div style={{ fontSize: 10.5, color: C.textDim }}>{doneCount}/{today.length} done today</div>}
        </div>
        <button
          aria-label={open ? 'Close add habit' : 'Add a habit'}
          onClick={() => setAdding((v) => !v)}
          style={{ flexShrink: 0, width: 32, height: 32, borderRadius: '50%', border: 'none', background: open ? C.surfaceUp : C.glow1, color: open ? C.textSoft : '#fff', fontSize: 20, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: open ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}
        >+</button>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 16px 44px' }}>
        {list.map((h) => {
          const done = doneToday(h, now);
          const active = done || dueToday(h, now);
          const streak = streakOf(h, now);
          const parts = [scheduleLabel(h), freqLabel(h)];
          if (h.duration > 0) parts.push(`⏳ ${formatDuration(h.duration)}`);
          if ((h.freq || {}).type === 'timesPerWeek') parts.push(`${weekProgress(h, now)}/${h.freq.n || 2} this week`);
          if (streak > 0) parts.push(`🔥 ${streak}`);
          return (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 11, background: C.surface, border: `1px solid ${done ? C.glow3 : C.border}`, borderRadius: 13, padding: '11px 13px', marginBottom: 9, opacity: active ? 1 : 0.55 }}>
              <button aria-label={done ? 'Mark not done' : 'Mark done'} onClick={() => setList((p) => toggleToday(p, h.id))} style={{ flexShrink: 0, width: 26, height: 26, borderRadius: '50%', border: `2px solid ${done ? C.glow3 : C.border}`, background: done ? C.glow3 : 'transparent', color: '#0b0a12', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{done ? '✓' : ''}</button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.em} {h.text}</div>
                <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{parts.join(' · ')}</div>
              </div>
              <button aria-label={h.remind ? 'Turn off companion reminder' : 'Have a companion remind me'} aria-pressed={!!h.remind} title={h.remind ? 'A companion will nudge you' : 'Remind me'} onClick={() => setList((p) => toggleRemind(p, h.id))} style={{ flexShrink: 0, background: 'none', border: 'none', color: h.remind ? C.glow1 : C.textDim, fontSize: 15, cursor: 'pointer', opacity: h.remind ? 1 : 0.6 }}>{h.remind ? '🔔' : '🔕'}</button>
              <button aria-label="Remove habit" onClick={() => setList((p) => removeHabit(p, h.id))} style={{ flexShrink: 0, background: 'none', border: 'none', color: C.textDim, fontSize: 15, cursor: 'pointer' }}>×</button>
            </div>
          );
        })}

        {list.length === 0 && !adding && (
          <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6, textAlign: 'center', margin: '10px 0 18px' }}>
            Build your daily habits. Tap <b style={{ color: C.textSoft }}>+</b> to add one — type your own or pick from the list.
          </p>
        )}

        {open && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 13, marginTop: list.length ? 6 : 2 }}>
            {/* Time of day */}
            <Label>When</Label>
            <Row>
              {SLOTS.map((s) => (
                <Chip key={s.id} on={when === s.id && !time} onClick={() => { setWhen(s.id); setTime(''); }}>{s.em} {s.label}</Chip>
              ))}
            </Row>

            {/* Specific time */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '11px 0 4px' }}>
              <span style={{ fontSize: 12, color: C.textSoft }}>⏰ Specific time</span>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Specific time (optional)"
                style={{ background: C.bg, border: `1px solid ${time ? C.glow1 : C.border}`, borderRadius: 9, padding: '7px 10px', fontSize: 13, color: C.text, outline: 'none', colorScheme: 'dark', fontFamily: "'DM Sans',sans-serif" }} />
              {time && <button onClick={() => setTime('')} aria-label="Clear time" style={{ background: 'none', border: 'none', color: C.textDim, fontSize: 15, cursor: 'pointer' }}>×</button>}
            </div>

            {/* Duration (time allowed) */}
            <Label>How long <span style={{ textTransform: 'none', letterSpacing: 0, color: C.textDim }}>(optional)</span></Label>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 11 }}>
              <input
                type="number" min="0" step="5" inputMode="numeric" value={duration || ''}
                onChange={(e) => setDuration(Math.max(0, parseInt(e.target.value, 10) || 0))}
                placeholder="min" aria-label="Duration in minutes"
                style={{ width: 66, background: C.bg, border: `1px solid ${duration ? C.glow1 : C.border}`, borderRadius: 9, padding: '7px 9px', fontSize: 13, color: C.text, outline: 'none', fontFamily: "'DM Sans',sans-serif" }}
              />
              <span style={{ fontSize: 12, color: C.textDim, marginRight: 2 }}>min</span>
              {[15, 30, 45, 60, 90].map((m) => (
                <Chip key={m} on={duration === m} onClick={() => setDuration(m)}>{m >= 60 ? (m % 60 ? `${Math.floor(m / 60)}h${m % 60}` : `${m / 60}h`) : `${m}m`}</Chip>
              ))}
              {duration > 0 && <button onClick={() => setDuration(0)} aria-label="Clear duration" style={{ background: 'none', border: 'none', color: C.textDim, fontSize: 15, cursor: 'pointer' }}>×</button>}
            </div>

            {/* Recurrence */}
            <Label>Repeats</Label>
            <Row>
              {FREQ_CHOICES.map((f) => (
                <Chip key={f.key} on={freqKey === f.key} onClick={() => setFreqKey(f.key)}>{f.label}</Chip>
              ))}
            </Row>
            {freqKey === 'weekdays' && (
              <div style={{ display: 'flex', gap: 6, marginTop: 9 }}>
                {WEEKDAYS.map((w) => {
                  const on = days.includes(w.d);
                  return (
                    <button key={w.d} onClick={() => toggleDay(w.d)} aria-label={w.name} aria-pressed={on}
                      style={{ flex: 1, minWidth: 0, padding: '8px 0', borderRadius: 9, border: `1px solid ${on ? C.glow1 : C.border}`, background: on ? C.glow1 : C.surfaceUp, color: on ? '#fff' : C.textSoft, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>{w.l}</button>
                  );
                })}
              </div>
            )}

            {/* Type your own */}
            <div style={{ display: 'flex', gap: 7, margin: '13px 0' }}>
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(text); }} placeholder="Type a habit…"
                style={{ flex: 1, minWidth: 0, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 13, color: C.text, outline: 'none' }} />
              <button onClick={() => add(text)} disabled={!text.trim()} style={{ flexShrink: 0, background: text.trim() ? C.glow1 : C.border, border: 'none', borderRadius: 10, color: '#fff', padding: '0 16px', fontSize: 13, fontWeight: 600, cursor: text.trim() ? 'pointer' : 'default', fontFamily: "'DM Sans',sans-serif" }}>Add</button>
            </div>

            {/* Pick from 20 */}
            <Label>Popular habits</Label>
            <Row>
              {HABIT_IDEAS.map((idea) => (
                <Chip key={idea.text} onClick={() => add(idea.text, idea.em)}>{idea.em} {idea.text}</Chip>
              ))}
            </Row>
          </div>
        )}
      </div>
    </Shell>
  );
}

const Label = ({ children }) => (
  <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, textTransform: 'uppercase', margin: '2px 0 7px' }}>{children}</div>
);
const Row = ({ children }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{children}</div>
);
const Chip = ({ on, onClick, children }) => (
  <button onClick={onClick} style={{ background: on ? C.glow1 : C.surfaceUp, border: `1px solid ${on ? C.glow1 : C.border}`, borderRadius: 50, padding: '6px 12px', fontSize: 12, color: on ? '#fff' : C.textSoft, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>{children}</button>
);
