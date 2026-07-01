import React from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import { CHECKIN_MOODS, moodColor } from '../lib/checkin.js';

// Mood insights — a user-facing view of their own daily check-in history:
// a 30-day trend, best weekday, and an overall breakdown. Purely the user's data.
const SCORE = { great: 5, good: 4, okay: 3, low: 2, anxious: 1 };
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MoodInsights({ checkins, onBack }) {
  const ci = checkins || { streak: 0, history: [] };
  const history = [...(ci.history || [])].filter((h) => SCORE[h.mood]);
  // chronological, last 30
  const chrono = history.slice().sort((a, b) => (a.d < b.d ? -1 : 1)).slice(-30);
  const counts = {}; for (const h of history) counts[h.mood] = (counts[h.mood] || 0) + 1;
  const avg = history.length ? (history.reduce((s, h) => s + SCORE[h.mood], 0) / history.length) : 0;

  // best weekday by average score
  const byWd = {};
  for (const h of history) { const d = new Date(h.d + 'T12:00:00').getDay(); (byWd[d] = byWd[d] || []).push(SCORE[h.mood]); }
  let bestWd = null, bestAvg = -1;
  for (const d of Object.keys(byWd)) { const a = byWd[d].reduce((s, x) => s + x, 0) / byWd[d].length; if (a > bestAvg) { bestAvg = a; bestWd = +d; } }

  return (
    <Shell fill>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}` }}>
        <button aria-label="Back" onClick={onBack} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Mood insights</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 16px 44px' }}>
        {history.length === 0 ? (
          <p style={{ fontSize: 13, color: C.textDim, textAlign: 'center', lineHeight: 1.6, marginTop: 20 }}>Check in with your daily mood a few times and your patterns will appear here.</p>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
              <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '13px', textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: C.glow1 }}>{ci.streak || 0}</div>
                <div style={{ fontSize: 11, color: C.textDim }}>day streak</div>
              </div>
              <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '13px', textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: C.glow3 }}>{avg.toFixed(1)}</div>
                <div style={{ fontSize: 11, color: C.textDim }}>avg mood /5</div>
              </div>
              <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '13px', textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: C.glow2 }}>{history.length}</div>
                <div style={{ fontSize: 11, color: C.textDim }}>check-ins</div>
              </div>
            </div>

            <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Last {chrono.length} days</div>
            <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 90, marginBottom: 20 }}>
              {chrono.map((h, i) => (
                <div key={i} title={`${h.d} · ${h.mood}`} style={{ flex: 1, height: `${(SCORE[h.mood] / 5) * 100}%`, minHeight: 4, borderRadius: 3, background: moodColor(h.mood) }} />
              ))}
            </div>

            {bestWd != null && (
              <div style={{ background: `linear-gradient(160deg, ${C.glow3}18, ${C.surface})`, border: `1px solid ${C.glow3}44`, borderRadius: 14, padding: '13px 15px', marginBottom: 20, fontSize: 13, color: C.text }}>
                ✨ Your brightest days tend to be <strong>{WD[bestWd]}s</strong>.
              </div>
            )}

            <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Overall</div>
            {CHECKIN_MOODS.filter((m) => counts[m.key]).map((m) => (
              <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <span style={{ fontSize: 15 }}>{m.em}</span>
                <span style={{ fontSize: 12.5, color: C.text, width: 68 }}>{m.label}</span>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: C.surfaceUp, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.round((counts[m.key] / history.length) * 100)}%`, height: '100%', background: m.color }} />
                </div>
                <span style={{ fontSize: 11, color: C.textDim, width: 24, textAlign: 'right' }}>{counts[m.key]}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </Shell>
  );
}
