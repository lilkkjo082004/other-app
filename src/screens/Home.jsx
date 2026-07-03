import React from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import Avatar from '../components/Avatar.jsx';
import { dailyGuidance, companionOfDay } from '../lib/horoscope.js';
import { checkinDue } from '../lib/checkin.js';

// Home — the app's landing screen: a warm launcher that surfaces everything
// (chat, cowork, the space, the "for you" tools) instead of burying them in a
// menu. Everything routes back into the Chat screen's panels.
export default function Home({ profile, comps, checkins, lastMsg, onOpenChat, onNav }) {
  const awake = (comps || []).filter((c) => c.status === 'awake');
  const sign = profile?.astrology?.western;
  const g = sign ? dailyGuidance(sign) : null;
  const cod = companionOfDay(comps, sign);
  const dueCheckin = checkinDue(checkins);

  const tiles = [
    { key: 'chat', em: '💬', title: 'Chat', sub: lastMsg ? `${lastMsg.who}: ${lastMsg.text}` : (awake.length ? `${awake.map((c) => c.name).join(', ')}` : 'Your companions'), accent: C.glow1, onClick: onOpenChat },
    { key: 'cowork', em: '🧑‍💻', title: 'Cowork', sub: 'Focus together', accent: C.glow3 || C.glow1, onClick: () => onNav('cowork') },
    { key: 'space', em: '✦', title: 'The Space', sub: 'Where they hang out', accent: C.glow2, onClick: () => onNav('space') },
    { key: 'you', em: '🧭', title: 'For you', sub: 'Mood, breathe, rituals', accent: C.glow3 || C.glow1, onClick: () => onNav('you') },
    { key: 'timeline', em: '🕰️', title: 'Timeline', sub: 'Your story together', accent: C.glow1, onClick: () => onNav('timeline') },
    { key: 'settings', em: '⚙', title: 'Settings', sub: 'Voice, plan, more', accent: C.textSoft, onClick: () => onNav('settings') },
  ];

  const hour = (() => { try { return new Date().getHours(); } catch (e) { return 12; } })();
  const greet = hour < 5 ? 'Late night' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night';

  return (
    <Shell fill>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '26px 18px 40px' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12.5, color: C.textSoft }}>{greet}{profile?.name ? ',' : ''}</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 30, fontWeight: 700, lineHeight: 1.1 }}>{profile?.name || 'Welcome back'}</div>
          {g && <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>{g.sym} {g.headline} · focus: {g.focus}</div>}
        </div>

        {cod && (
          <button onClick={() => onNav({ profile: cod.comp.id })} style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, background: `linear-gradient(120deg, ${cod.accent}22, ${C.surface})`, border: `1px solid ${cod.accent}55`, borderRadius: 16, padding: '13px 14px', marginBottom: 8, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", color: C.text }}>
            <Avatar comp={cod.comp} size={44} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 1.5, textTransform: 'uppercase' }}>Companion of the day</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 1 }}><span style={{ color: cod.accent }}>{cod.comp.name}</span> {cod.note}</div>
            </div>
            <span style={{ color: cod.accent }}>›</span>
          </button>
        )}

        {dueCheckin && (
          <button onClick={() => onNav('checkin')} style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, background: C.surface, border: `1px solid ${C.glow3 || C.glow1}55`, borderRadius: 14, padding: '11px 14px', marginBottom: 14, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", color: C.text }}>
            <span style={{ fontSize: 18 }}>🌤️</span>
            <div style={{ flex: 1, fontSize: 13 }}>How are you feeling today? <span style={{ color: C.textDim }}>Daily check-in</span></div>
            <span style={{ color: C.textDim }}>›</span>
          </button>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {tiles.map((t) => (
            <button key={t.key} onClick={t.onClick} style={{ textAlign: 'left', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '15px 14px 16px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", color: C.text }}>
              <div style={{ fontSize: 25, marginBottom: 9, color: t.accent }}>{t.em}</div>
              <div style={{ fontSize: 14.5, fontWeight: 600 }}>{t.title}</div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.sub}</div>
            </button>
          ))}
        </div>

        <button onClick={onOpenChat} className="bp" style={{ width: '100%', marginTop: 18 }}>Open chat</button>
      </div>
    </Shell>
  );
}
