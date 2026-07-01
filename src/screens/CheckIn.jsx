import React, { useState } from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import { CHECKIN_MOODS, moodColor, checkinDue } from '../lib/checkin.js';

// Daily check-in: pick how you're feeling, optionally add a note, and see your
// streak + mood history. Interactive here (not just in the chat card) so it can
// be reached from Home / the menu and actually filled in.
export default function CheckIn({ checkins, profile, onCheckIn, onBack }) {
  const ci = checkins || { streak: 0, last: '', history: [] };
  const history = ci.history || [];
  const due = checkinDue(ci);
  const [mood, setMood] = useState(null);
  const [note, setNote] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  const counts = {};
  for (const h of history) counts[h.mood] = (counts[h.mood] || 0) + 1;
  const fmt = (d) => { try { return new Date(d + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' }); } catch (e) { return d; } };

  function save() {
    if (!mood) return;
    onCheckIn?.(mood, note);
    setJustSaved(true); setNote(''); setMood(null);
    setTimeout(() => setJustSaved(false), 2200);
  }

  return (
    <Shell fill>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}` }}>
        <button aria-label="Back" onClick={onBack} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Daily check-in</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 18px 48px' }}>

        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 46, fontWeight: 700, color: C.glow1 }}>{ci.streak || 0}</div>
          <div style={{ fontSize: 13, color: C.textSoft }}>{ci.streak === 1 ? 'day' : 'days'} in a row {ci.streak > 0 ? '🔥' : ''}</div>
          <div style={{ fontSize: 11, color: C.textDim, marginTop: 6 }}>No pressure — check in whenever you can.</div>
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginBottom: 22 }}>
          <div style={{ fontSize: 14.5, color: C.text, fontWeight: 600, marginBottom: 12 }}>
            {justSaved ? 'Thanks for checking in 💛' : due ? `How are you feeling today, ${profile?.name || 'you'}?` : `Feeling different, ${profile?.name || 'you'}? Update your check-in.`}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {CHECKIN_MOODS.map((m) => {
              const on = mood === m.key;
              return (
                <button key={m.key} onClick={() => setMood(m.key)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: on ? `${m.color}26` : C.surfaceUp, border: `1px solid ${on ? m.color : C.border}`, borderRadius: 50, padding: '8px 13px', fontSize: 13, color: on ? C.text : C.textSoft, fontWeight: on ? 600 : 400, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                  <span style={{ fontSize: 16 }}>{m.em}</span>{m.label}
                </button>
              );
            })}
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Anything on your mind? (optional)"
            style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '11px 13px', fontSize: 14, color: C.text, outline: 'none', resize: 'none', lineHeight: 1.5, fontFamily: "'DM Sans',sans-serif", marginBottom: 12 }} />
          <button onClick={save} disabled={!mood} style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', cursor: mood ? 'pointer' : 'default', fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 700, background: mood ? C.glow1 : C.border, color: mood ? '#fff' : C.textDim }}>
            {due ? 'Log check-in' : 'Update check-in'}
          </button>
        </div>

        {history.length > 0 && (
          <>
            <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Recent moods</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
              {history.map((h, i) => (
                <div key={i} title={`${fmt(h.d)} · ${h.mood}${h.note ? ' · ' + h.note : ''}`} style={{ width: 20, height: 20, borderRadius: 6, background: moodColor(h.mood) }} />
              ))}
            </div>

            {history.some((h) => h.note) && (
              <>
                <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Notes</div>
                <div style={{ marginBottom: 20 }}>
                  {history.filter((h) => h.note).slice(0, 12).map((h, i) => (
                    <div key={i} style={{ display: 'flex', gap: 9, marginBottom: 9 }}>
                      <span style={{ flexShrink: 0, width: 10, height: 10, borderRadius: 3, background: moodColor(h.mood), marginTop: 4 }} />
                      <div><div style={{ fontSize: 10.5, color: C.textDim }}>{fmt(h.d)}</div><div style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.5 }}>{h.note}</div></div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Overall</div>
            {CHECKIN_MOODS.filter((m) => counts[m.key]).map((m) => (
              <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <span style={{ fontSize: 15 }}>{m.em}</span>
                <span style={{ fontSize: 12.5, color: C.text, width: 70 }}>{m.label}</span>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: C.surfaceUp, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.round((counts[m.key] / history.length) * 100)}%`, height: '100%', background: m.color }} />
                </div>
                <span style={{ fontSize: 11, color: C.textDim, width: 24, textAlign: 'right' }}>{counts[m.key]}</span>
              </div>
            ))}
          </>
        )}
        {history.length === 0 && <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6, textAlign: 'center' }}>Your check-ins will gather here.</p>}
      </div>
    </Shell>
  );
}
