import React from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import { CHECKIN_MOODS, moodColor } from '../lib/checkin.js';

// A small keepsake view of the daily check-in streak + recent mood history.
export default function CheckIn({ checkins, onBack }) {
  const ci = checkins || { streak: 0, last: '', history: [] };
  const history = ci.history || [];
  const counts = {};
  for (const h of history) counts[h.mood] = (counts[h.mood] || 0) + 1;
  const fmt = (d) => { try { return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' }); } catch (e) { return d; } };

  return (
    <Shell>
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

        {history.length > 0 && (
          <>
            <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Recent moods</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
              {history.map((h, i) => (
                <div key={i} title={`${fmt(h.d)} · ${h.mood}`} style={{ width: 20, height: 20, borderRadius: 6, background: moodColor(h.mood) }} />
              ))}
            </div>
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
        {history.length === 0 && <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6, textAlign: 'center' }}>Your check-ins will gather here. A companion will ask once a day.</p>}
      </div>
    </Shell>
  );
}
