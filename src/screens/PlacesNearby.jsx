import React, { useState, useEffect } from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import { PLACE_CATEGORIES, mapsSearchUrl, mapsCoords, locationEnabled } from '../lib/location.js';

// "Find nearby" — hands off to the device's maps app for real listings and
// directions. If on-device location is enabled, the search is centered on the
// user's coordinates; either way nothing about their location reaches our
// servers (the maps provider handles it).
export default function PlacesNearby({ onBack }) {
  const [coords, setCoords] = useState(null);
  const [located, setLocated] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => { const c = await mapsCoords(); if (alive) { setCoords(c); setLocated(!!c); } })();
    return () => { alive = false; };
  }, []);

  const open = (term) => {
    try { window.open(mapsSearchUrl(term, coords), '_blank', 'noopener,noreferrer'); } catch (e) { /* ignore */ }
  };

  const urgent = PLACE_CATEGORIES.filter((c) => c.urgent);
  const rest = PLACE_CATEGORIES.filter((c) => !c.urgent);

  const Btn = ({ cat, danger }) => (
    <button onClick={() => open(cat.term)} aria-label={`Find ${cat.label} nearby`}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', marginBottom: 8, borderRadius: 12, cursor: 'pointer', textAlign: 'left',
        background: danger ? `${C.danger}14` : C.surface, border: `1px solid ${danger ? `${C.danger}55` : C.border}`, color: C.text, fontFamily: "'DM Sans',sans-serif" }}>
      <span style={{ fontSize: 20 }}>{cat.icon}</span>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: danger ? C.danger : C.text }}>{cat.label}</span>
      <span style={{ fontSize: 12, color: C.textDim }}>Open maps ↗</span>
    </button>
  );

  return (
    <Shell>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}` }}>
        <button aria-label="Back" onClick={onBack} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Find nearby</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 18px 40px' }}>
        <p style={{ fontSize: 12.5, color: C.textSoft, lineHeight: 1.55, margin: '0 0 4px' }}>
          Opens your maps app with real listings and directions.
        </p>
        <p style={{ fontSize: 11, color: C.textDim, lineHeight: 1.5, margin: '0 0 18px' }}>
          {located ? 'Centered on your location. ' : ''}Your location is shared only with the map provider when you tap — never with us.
        </p>

        <div style={{ fontSize: 10, color: C.danger, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Urgent</div>
        {urgent.map((c) => <Btn key={c.key} cat={c} danger />)}
        <div style={{ fontSize: 11, color: C.textDim, margin: '2px 0 16px', lineHeight: 1.5 }}>
          If this is a life-threatening emergency, call your local emergency number. In the US, the Suicide &amp; Crisis Lifeline is <strong style={{ color: C.text }}>988</strong>.
        </div>

        <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Everyday</div>
        {rest.map((c) => <Btn key={c.key} cat={c} />)}
      </div>
    </Shell>
  );
}
