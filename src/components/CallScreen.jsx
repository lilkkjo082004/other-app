import React from 'react';
import { C } from '../theme.js';
import SquishyBlob from './SquishyBlob.jsx';

// Full-screen "phone call" UI for a hands-free voice conversation with one
// companion or all of them (group call). Purely presentational — the call loop
// (listen → reply → speak → repeat) lives in Chat; this shows the current state,
// who's speaking, and the controls.
const STATE_LABEL = {
  listening: 'Listening…',
  thinking: 'Thinking…',
  speaking: 'Speaking…',
  error: 'Voice isn’t available on this browser',
};

export default function CallScreen({ comps = [], group = false, state = 'listening', transcript = '', muted = false, speakingId = null, onToggleMute, onEnd }) {
  const lead = comps[0] || {};
  const col = lead?.color?.primary || C.glow1;
  const names = comps.map((c) => c.name).join(', ');
  const multi = comps.length > 1;
  const size = multi ? 110 : 180;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: C.void, backgroundImage: `radial-gradient(circle at 50% 35%, ${col}22, transparent 70%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '48px 24px 40px', animation: 'fadeIn 0.25s' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: C.textDim, letterSpacing: 2, textTransform: 'uppercase' }}>{group ? 'Group call' : 'On a call with'}</div>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: multi ? 24 : 30, fontWeight: 700, marginTop: 4 }}>{names}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
        <div style={{ display: 'flex', gap: multi ? 14 : 0, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          {comps.map((c) => {
            const isSpeaking = speakingId === c.id && state === 'speaking';
            const active = !multi || speakingId == null || speakingId === c.id;
            return (
              <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: active ? 1 : 0.45, transition: 'opacity 0.4s' }}>
                <div style={{ filter: `drop-shadow(0 0 ${isSpeaking ? 38 : 16}px ${(c.color?.primary || col)}aa)`, transition: 'filter 0.5s', animation: isSpeaking ? 'pulse 1.4s ease-in-out infinite' : 'none' }}>
                  <SquishyBlob comp={c} size={size} glow vitality={1} />
                </div>
                {multi && <span style={{ fontSize: 11, color: C.textSoft, fontWeight: 600 }}>{c.name}</span>}
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 15, color: C.textSoft, minHeight: 22 }}>
          {state === 'speaking' && multi && speakingId ? `${comps.find((c) => c.id === speakingId)?.name || ''} is speaking…` : (STATE_LABEL[state] || '')}
        </div>
        {transcript && state !== 'error' && (
          <div style={{ maxWidth: 320, textAlign: 'center', fontSize: 13, color: C.textDim, fontStyle: 'italic', lineHeight: 1.5 }}>“{transcript}”</div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        <button aria-label={muted ? 'Unmute' : 'Mute'} onClick={onToggleMute} style={{ width: 60, height: 60, borderRadius: '50%', border: `1px solid ${C.border}`, background: muted ? `${C.glow2}22` : C.surfaceUp, color: muted ? C.glow2 : C.textSoft, fontSize: 22, cursor: 'pointer' }}>{muted ? '🔇' : '🎤'}</button>
        <button aria-label="End call" onClick={onEnd} style={{ width: 68, height: 68, borderRadius: '50%', border: 'none', background: C.danger, color: '#fff', fontSize: 26, cursor: 'pointer', boxShadow: `0 8px 28px ${C.danger}66` }}>✕</button>
      </div>
    </div>
  );
}
