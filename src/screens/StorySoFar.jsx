import React from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';

// "Story so far" — a keepsake view of everything the relationship has
// accumulated: shared history, inside jokes, and letters from the companions.
export default function StorySoFar({ lore = [], jokes = [], comps = [], onBack }) {
  const fmt = (t) => { try { return new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return ''; } };
  const letters = (comps || [])
    .filter((c) => c.letters?.length)
    .flatMap((c) => c.letters.map((l) => ({ ...l, from: c.name, color: c.color?.primary || C.glow1 })))
    .sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const gifts = (comps || [])
    .filter((c) => c.gifts?.length)
    .flatMap((c) => c.gifts.map((g) => ({ ...g, from: c.name, color: c.color?.primary || C.glow1 })))
    .sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const label = { fontSize: 10, color: C.textDim, letterSpacing: 2, textTransform: 'uppercase', margin: '20px 0 10px' };
  const empty = !lore.length && !jokes.length && !letters.length && !gifts.length;

  return (
    <Shell>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}` }}>
        <button aria-label="Back" onClick={onBack} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Your story so far</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 18px 48px' }}>
        {empty && <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6, marginTop: 24 }}>Nothing here yet — keep talking, and your shared history, inside jokes, and letters will gather here over time.</p>}

        {lore.length > 0 && (
          <>
            <div style={label}>✦ Shared history</div>
            {lore.map((l, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: C.textDim }}>{fmt(l.ts)}</div>
                <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.5 }}>remember when {l.text}</div>
              </div>
            ))}
          </>
        )}

        {jokes.length > 0 && (
          <>
            <div style={label}>😄 Inside jokes</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {jokes.map((j, i) => (
                <span key={i} style={{ padding: '6px 11px', borderRadius: 999, background: C.surface, border: `1px solid ${C.border}`, fontSize: 12.5, color: C.textSoft }}>{j.text}</span>
              ))}
            </div>
          </>
        )}

        {letters.length > 0 && (
          <>
            <div style={label}>✉️ Letters</div>
            {letters.map((l, i) => (
              <div key={i} style={{ borderLeft: `2px solid ${l.color}`, paddingLeft: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: C.textDim, marginBottom: 3 }}>{l.from} · {fmt(l.ts)}</div>
                <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{l.text}</div>
              </div>
            ))}
          </>
        )}

        {gifts.length > 0 && (
          <>
            <div style={label}>🎁 Gifts</div>
            {gifts.map((g, i) => (
              <div key={i} style={{ background: C.surface, border: `1px solid ${g.color}55`, borderRadius: 12, padding: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: C.textDim, marginBottom: 4 }}>{g.kind === 'playlist' ? '🎵 playlist' : g.kind === 'art' ? '🎨 art' : '✦ poem'} · {g.from} · {fmt(g.ts)}</div>
                <div style={{ fontSize: 13, color: C.text, lineHeight: 1.55, whiteSpace: 'pre-wrap', fontFamily: g.kind === 'art' ? 'monospace' : 'inherit' }}>{g.text}</div>
              </div>
            ))}
          </>
        )}
      </div>
    </Shell>
  );
}
