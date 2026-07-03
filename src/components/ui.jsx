import React from 'react';
import { C, CSS } from '../theme.js';

// Cosmic background frame used by every screen.
// `fill` bounds the shell to the viewport height so an inner `flex:1;
// overflow:auto` region becomes the real scroller instead of growing the whole
// page — used by the chat so it always opens at the latest message. The bound
// comes from the `.shell-fill` CSS class (100vh base, upgraded to dynamic
// 100dvh via @supports) rather than an inline dvh value, because browsers
// without dvh silently drop invalid inline styles — which un-bounded the shell
// and made the *document* the scroller (opening at the top of the chat).
export const Shell = ({ children, fill }) => (
  <div className={`app-root${fill ? ' shell-fill' : ''}`} style={{ background: C.void, minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
    <style>{CSS}</style>
    <div className="cosmic-bg" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, transition: 'opacity 0.4s' }}>
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,91,245,0.08),transparent 70%)', top: '-10%', right: '-8%', filter: 'blur(60px)', animation: 'drift1 25s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(232,67,147,0.06),transparent 70%)', bottom: '-8%', left: '-5%', filter: 'blur(60px)', animation: 'drift2 30s ease-in-out infinite' }} />
    </div>
    <div className="app-col" style={{ position: 'relative', zIndex: 1, maxWidth: 480, margin: '0 auto', ...(fill ? { height: '100%' } : { minHeight: '100vh' }), display: 'flex', flexDirection: 'column' }}>{children}</div>
  </div>
);

export function Prog({ s, t }) {
  return (
    <div style={{ padding: '14px 24px 0', display: 'flex', gap: 3, alignItems: 'center' }}>
      {Array.from({ length: t }).map((_, i) => (
        <div key={i} style={{ flex: 1, height: 2, borderRadius: 2, background: i <= s ? C.glow1 : C.border, transition: 'background 0.4s' }} />
      ))}
      <span style={{ fontSize: 10, color: C.textDim, marginLeft: 6 }}>{s + 1}/{t}</span>
    </div>
  );
}

export function Pills({ opts, sel, onTog }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
      {opts.map((o) => {
        const v = typeof o === 'string' ? o : o.v;
        const l = typeof o === 'string' ? o : o.label;
        const em = typeof o === 'object' ? o.em : null;
        const isOn = sel.includes(v);
        return (
          <button key={v} onClick={() => onTog(v)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: isOn ? `${C.glow1}15` : C.surface, border: `1px solid ${isOn ? C.glow1 : C.border}`, borderRadius: 50, padding: '7px 14px', fontSize: 12, color: isOn ? C.glow1 : C.text, cursor: 'pointer', fontWeight: isOn ? 600 : 400, transition: 'all 0.2s', fontFamily: "'DM Sans',sans-serif" }}>
            {em && <span style={{ fontSize: 14 }}>{em}</span>}{l}
          </button>
        );
      })}
    </div>
  );
}

export function Checks({ opts, sel, onTog }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {opts.map((o) => {
        const v = typeof o === 'string' ? o : o.v;
        const l = typeof o === 'string' ? o : o.label;
        const em = typeof o === 'object' ? o.em : null;
        const isOn = sel.includes(v);
        return (
          <button key={v} onClick={() => onTog(v)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: isOn ? `${C.glow1}12` : C.surface, border: `1px solid ${isOn ? C.glow1 : C.border}`, borderRadius: 12, padding: '11px 14px', fontSize: 13, color: C.text, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', fontFamily: "'DM Sans',sans-serif" }}>
            {em && <span style={{ fontSize: 16 }}>{em}</span>}
            <span style={{ fontWeight: 500, flex: 1 }}>{l}</span>
            <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${isOn ? C.glow1 : C.border}`, background: isOn ? C.glow1 : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', flexShrink: 0 }}>{isOn && '✓'}</div>
          </button>
        );
      })}
    </div>
  );
}
