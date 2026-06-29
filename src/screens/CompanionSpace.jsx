import React, { useState, useRef, useEffect } from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import Avatar from '../components/Avatar.jsx';
import { genAmbient, bumpBond } from '../lib/relationships.js';

// The "sitting space": awake companions hang out together, drift and mingle on
// their own, and react when you pet (tap) or drag them around. Positions persist.
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const FLOATS = ['floatA', 'floatB', 'floatC'];
const PET_EMOJI = ['♡', '✦', '✨', '💜', '🩷'];
const SIZE = 78;

function defaultPos(i, n) {
  if (n <= 1) return { x: 0.5, y: 0.46 };
  const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
  return { x: 0.5 + Math.cos(ang) * 0.27, y: 0.46 + Math.sin(ang) * 0.24 };
}

export default function CompanionSpace({ comps, bonds, positions, onPositions, onBonds, onBack, onOpenProfile }) {
  const living = (comps || []).filter((c) => c.status !== 'deleted');
  const containerRef = useRef(null);
  const dragRef = useRef(null);
  const [pos, setPos] = useState(() => {
    const p = { ...(positions || {}) };
    living.forEach((c, i) => { if (!p[c.id]) p[c.id] = defaultPos(i, living.length); });
    return p;
  });
  const posRef = useRef(pos);
  useEffect(() => { posRef.current = pos; }, [pos]);
  const [dragId, setDragId] = useState(null);
  const [pets, setPets] = useState({});       // id -> bump counter (restarts pop)
  const [hearts, setHearts] = useState([]);   // {key, compId, dx, emoji}
  const [bubble, setBubble] = useState(null); // {compId, text}

  // Mingling: companions chat with each other on their own. Template-generated
  // (no API cost), refreshed periodically, and it nudges their bond.
  useEffect(() => {
    let alive = true;
    const tick = () => {
      const awake = living.filter((c) => c.status === 'awake');
      if (awake.length < 2) { setBubble(null); return; }
      const res = genAmbient(awake, bonds);
      if (res && res.thread?.length) {
        const line = res.thread[Math.floor(Math.random() * res.thread.length)];
        if (line?.from) {
          setBubble({ compId: line.from.id, text: line.text });
          if (res.pair && onBonds) onBonds((b) => bumpBond(b, res.pair[0], res.pair[1]));
          setTimeout(() => { if (alive) setBubble((cur) => (cur && cur.text === line.text ? null : cur)); }, 5200);
        }
      }
    };
    const first = setTimeout(tick, 900);
    const iv = setInterval(tick, 13000);
    return () => { alive = false; clearTimeout(first); clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [living.length, bonds]);

  function pet(c) {
    setPets((p) => ({ ...p, [c.id]: (p[c.id] || 0) + 1 }));
    const burst = 3 + Math.floor(Math.random() * 2);
    const made = Array.from({ length: burst }, (_, k) => ({
      key: `${c.id}-${Date.now()}-${k}`,
      compId: c.id,
      dx: Math.round((Math.random() - 0.5) * 46),
      emoji: PET_EMOJI[Math.floor(Math.random() * PET_EMOJI.length)],
    }));
    setHearts((h) => [...h, ...made]);
    const keys = new Set(made.map((m) => m.key));
    setTimeout(() => setHearts((h) => h.filter((x) => !keys.has(x.key))), 1150);
  }

  function onPointerDown(e, c) {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { id: c.id, moved: false, sx: e.clientX, sy: e.clientY };
  }
  function onPointerMove(e) {
    const d = dragRef.current;
    if (!d) return;
    if (!d.moved && (Math.abs(e.clientX - d.sx) > 4 || Math.abs(e.clientY - d.sy) > 4)) {
      d.moved = true; setDragId(d.id);
    }
    if (!d.moved) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clamp((e.clientX - rect.left) / rect.width, 0.07, 0.93);
    const y = clamp((e.clientY - rect.top) / rect.height, 0.09, 0.9);
    setPos((p) => ({ ...p, [d.id]: { x, y } }));
  }
  function onPointerUp(e, c) {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (!d.moved) { pet(c); }
    else { setDragId(null); onPositions?.(posRef.current); }
  }

  return (
    <Shell>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}`, position: 'relative', zIndex: 5 }}>
        <button aria-label="Back" onClick={onBack} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 20, cursor: 'pointer' }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>The Space</div>
          <div style={{ fontSize: 10.5, color: C.textDim }}>Drag to rearrange · tap to pet · they mingle on their own</div>
        </div>
      </div>

      <div
        ref={containerRef}
        onPointerMove={onPointerMove}
        style={{ flex: 1, position: 'relative', overflow: 'hidden', touchAction: 'none', userSelect: 'none' }}
      >
        {living.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontSize: 13 }}>No companions here yet.</div>
        )}
        {living.map((c, i) => {
          const p = pos[c.id] || defaultPos(i, living.length);
          const awake = c.status === 'awake';
          const dragging = dragId === c.id;
          const floatName = FLOATS[i % FLOATS.length];
          const dur = 6 + (i % 4);
          return (
            <div
              key={c.id}
              onPointerDown={(e) => onPointerDown(e, c)}
              onPointerUp={(e) => onPointerUp(e, c)}
              style={{
                position: 'absolute', left: `${p.x * 100}%`, top: `${p.y * 100}%`,
                marginLeft: -SIZE / 2, marginTop: -SIZE / 2, width: SIZE,
                cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none',
                animation: awake && !dragging ? `${floatName} ${dur}s ease-in-out infinite` : 'none',
                zIndex: dragging ? 20 : 2, transition: dragging ? 'none' : 'filter 0.2s',
                opacity: awake ? 1 : 0.5,
              }}
            >
              {/* mingle speech bubble */}
              {bubble && bubble.compId === c.id && (
                <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 8, background: C.card, border: `1px solid ${c.color?.primary || C.border}`, color: C.text, fontSize: 11.5, lineHeight: 1.4, padding: '7px 10px', borderRadius: 12, width: 'max-content', maxWidth: 180, textAlign: 'center', animation: 'fadeUp 0.3s both', pointerEvents: 'none', boxShadow: `0 6px 20px ${C.void}` }}>
                  {bubble.text}
                </div>
              )}
              {/* floating pet hearts */}
              {hearts.filter((h) => h.compId === c.id).map((h) => (
                <span key={h.key} style={{ position: 'absolute', left: '50%', top: 6, marginLeft: h.dx, fontSize: 16, pointerEvents: 'none', animation: 'heartRise 1.1s ease-out forwards' }}>{h.emoji}</span>
              ))}
              {/* avatar (inner wrapper restarts the pet-pop on each tap) */}
              <div key={`pop-${pets[c.id] || 0}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', animation: pets[c.id] ? 'petPop 0.5s ease' : 'none' }}>
                <Avatar comp={c} size={SIZE} glow />
                <span style={{ fontSize: 11, color: C.textSoft, marginTop: 6, fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>
                  {!awake && <span style={{ fontSize: 9 }}>💤</span>}{c.name}
                </span>
                {onOpenProfile && (
                  <button onClick={(e) => { e.stopPropagation(); onOpenProfile(c.id); }} onPointerDown={(e) => e.stopPropagation()}
                    style={{ marginTop: 2, background: 'none', border: 'none', color: C.textDim, fontSize: 9.5, cursor: 'pointer', padding: '2px 4px' }}>profile</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}
