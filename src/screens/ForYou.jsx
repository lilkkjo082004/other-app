import React from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import Avatar from '../components/Avatar.jsx';
import { dailyGuidance, companionOfDay } from '../lib/horoscope.js';

// "For you" — a hub for the user-centric tools (their own wellbeing, reflection,
// and keepsakes), separate from companion chat. Each tile opens a full panel.
const TILES = [
  { key: 'today', em: '🔮', title: 'Today', sub: 'Your cosmic weather' },
  { key: 'mood', em: '📈', title: 'Mood insights', sub: 'Your check-in trends' },
  { key: 'breathe', em: '🌬️', title: 'Breathe', sub: 'Calm in a minute' },
  { key: 'rituals', em: '🔁', title: 'Rituals', sub: 'Small daily practices' },
  { key: 'values', em: '🧭', title: 'Values', sub: 'Your north star' },
  { key: 'vault', em: '🔒', title: 'Private vault', sub: 'Just for you' },
  { key: 'duo', em: '💫', title: 'Compatibility', sub: 'You & a friend' },
  { key: 'card', em: '🖼️', title: 'Cosmic card', sub: 'Share your chart' },
];

export default function ForYou({ profile, comps = [], onNav, onOpenCompanion, onBack }) {
  const sign = profile?.astrology?.western;
  const g = sign ? dailyGuidance(sign) : null;
  const cod = companionOfDay(comps, sign);
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
        {cod && (
          <button onClick={() => onOpenCompanion?.(cod.comp.id)} style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, background: `linear-gradient(120deg, ${cod.accent}22, ${C.surface})`, border: `1px solid ${cod.accent}55`, borderRadius: 16, padding: '13px 14px', marginBottom: 14, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", color: C.text }}>
            <Avatar comp={cod.comp} size={44} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 1.5, textTransform: 'uppercase' }}>Companion of the day</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 1 }}><span style={{ color: cod.accent }}>{cod.comp.name}</span> {cod.note}</div>
            </div>
            <span style={{ color: cod.accent }}>›</span>
          </button>
        )}
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
