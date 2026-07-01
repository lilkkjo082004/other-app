import React from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import { cap } from '../lib/zodiac.js';
import { dailyGuidance, weeklyOutlook } from '../lib/horoscope.js';

// Astro-timed guidance for the user: today's "cosmic weather" + a 7-day outlook.
// Deterministic from their sun sign + date. Clearly framed as gentle guidance.
function Stars({ n, color }) {
  return <span aria-label={`${n} of 5`} style={{ letterSpacing: 2 }}>{[1, 2, 3, 4, 5].map((i) => <span key={i} style={{ color: i <= n ? color : C.border }}>★</span>)}</span>;
}

export default function Today({ profile, onBack }) {
  const sign = profile?.astrology?.western;
  if (!sign) {
    return (
      <Shell fill>
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}` }}>
          <button aria-label="Back" onClick={onBack} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 20, cursor: 'pointer' }}>←</button>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Today</span>
        </div>
        <p style={{ padding: 24, color: C.textDim, fontSize: 13 }}>Add your birthday in your profile to see your cosmic weather.</p>
      </Shell>
    );
  }
  const g = dailyGuidance(sign);
  const week = weeklyOutlook(sign);
  return (
    <Shell>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}` }}>
        <button aria-label="Back" onClick={onBack} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Today</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 16px 44px' }}>
        <div style={{ background: `linear-gradient(160deg, ${g.accent}22, ${C.surface})`, border: `1px solid ${g.accent}55`, borderRadius: 18, padding: '18px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: C.textDim }}>{g.date}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0 4px' }}>
            <span style={{ fontSize: 26, color: g.accent }}>{g.sym}</span>
            <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 23, fontWeight: 700 }}>{cap(sign)} · {g.headline}</span>
          </div>
          <Stars n={g.rating} color={g.accent} />
          <p style={{ fontSize: 14, color: C.text, lineHeight: 1.55, marginTop: 12 }}>{g.line}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <span style={{ fontSize: 11.5, color: g.accent, background: `${g.accent}1a`, border: `1px solid ${g.accent}44`, borderRadius: 50, padding: '4px 11px' }}>focus · {g.focus}</span>
            <span style={{ fontSize: 11.5, color: C.textSoft, background: C.surfaceUp, border: `1px solid ${C.border}`, borderRadius: 50, padding: '4px 11px' }}>lean into {g.luckyColor}</span>
          </div>
        </div>

        <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>The week ahead</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 96, marginBottom: 10 }}>
          {week.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                <div title={d.focus} style={{ width: '100%', height: `${d.rating * 18}%`, minHeight: 6, borderRadius: 5, background: d.accent, opacity: i === 0 ? 1 : 0.6 }} />
              </div>
              <span style={{ fontSize: 9.5, color: i === 0 ? C.text : C.textDim, fontWeight: i === 0 ? 700 : 400 }}>{d.day}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 10.5, color: C.textDim, lineHeight: 1.5 }}>For reflection and fun, not fortune-telling. You know yourself best.</p>
      </div>
    </Shell>
  );
}
