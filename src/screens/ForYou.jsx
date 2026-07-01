import React from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import { dailyGuidance } from '../lib/horoscope.js';

// "For you" — a hub for the user-centric tools (their own wellbeing, reflection,
// and keepsakes), separate from companion chat. Each tile opens a full panel.
const TILES = [
  { key: 'today', em: '🔮', title: 'Today', sub: 'Your cosmic weather' },
  { key: 'mood', em: '📈', title: 'Mood insights', sub: 'Your check-in trends' },
  { key: 'breathe', em: '🌬️', title: 'Breathe', sub: 'Calm in a minute' },
  { key: 'rituals', em: '🔁', title: 'Rituals', sub: 'Small daily practices' },
  { key: 'values', em: '🧭', title: 'Values', sub: 'Your north star' },
  { key: 'vault', em: '🔒', title: 'Private vault', sub: 'Just for you' },
  { key: 'card', em: '🖼️', title: 'Cosmic card', sub: 'Share your chart' },
];

export default function ForYou({ profile, onNav, onBack }) {
  const g = profile?.astrology?.western ? dailyGuidance(profile.astrology.western) : null;
  return (
    <Shell>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}` }}>
        <button aria-label="Back" onClick={onBack} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>For you</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 16px 44px' }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 700 }}>Hi{profile?.name ? `, ${profile.name}` : ''}.</div>
          <div style={{ fontSize: 12.5, color: C.textSoft, marginTop: 2 }}>{g ? `${g.sym} ${g.headline} · focus: ${g.focus}` : 'A little space that’s just about you.'}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {TILES.map((t) => (
            <button key={t.key} onClick={() => onNav(t.key)} style={{ textAlign: 'left', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '14px 14px 16px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", color: C.text }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{t.em}</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{t.title}</div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 1 }}>{t.sub}</div>
            </button>
          ))}
        </div>
      </div>
    </Shell>
  );
}
