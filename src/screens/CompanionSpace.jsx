import React, { useState, useRef, useEffect } from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import Avatar from '../components/Avatar.jsx';
import { genAmbient, bumpBond } from '../lib/relationships.js';
import { currentActivity } from '../lib/presence.js';
import { vitality } from '../lib/innerlife.js';

// The "sitting space": awake companions hang out together, drift and mingle on
// their own (leaning toward each other when they talk), and react when you pet
// (tap) or drag them around. Positions persist.
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const FLOATS = ['floatA', 'floatB', 'floatC'];
const SIZE = 78;

function defaultPos(i, n, comp) {
  if (n <= 1) return { x: 0.5, y: 0.46 };
  // Anchor each companion to a consistent personal "corner" seeded by identity.
  let h = 0; const s = comp?.id || comp?.name || String(i);
  for (let k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) >>> 0;
  const ang = (i / n) * Math.PI * 2 - Math.PI / 2 + ((h % 24) - 12) * 0.02;
  const rad = 0.24 + (h % 7) * 0.012;
  return { x: 0.5 + Math.cos(ang) * (rad + 0.03), y: 0.46 + Math.sin(ang) * rad };
}

// Pet reactions vary by personality — derived from the companion's personality,
// quirk, and builder traits. Returns the particles to puff out, a few possible
// reaction words, and how big the burst is.
function petStyle(comp) {
  const t = `${comp.personality || ''} ${comp.quirk || ''} ${comp.builderTraits ? Object.values(comp.builderTraits).flat().join(' ') : ''}`.toLowerCase();
  const has = (...w) => w.some((x) => t.includes(x));
  if (has('playful', 'mischiev', 'witty', 'funny', 'humor', 'goofy', 'teas', 'silly')) return { emojis: ['😄', '✨', '😆', '✦'], words: ['hehe~', 'again!', 'that tickles', 'eee'], burst: 5 };
  if (has('shy', 'reserved', 'quiet', 'gentle', 'soft', 'timid', 'introvert')) return { emojis: ['☺️', '♡', '✿'], words: ['oh—', '*soft smile*', 'hi…', '!'], burst: 2 };
  if (has('warm', 'affection', 'nurtur', 'caring', 'loving', 'sweet', 'tender')) return { emojis: ['💜', '♡', '🥰', '✦'], words: ['mmm♡', 'I needed that', 'cozy', '♡'], burst: 4 };
  if (has('cool', 'dry', 'sarcas', 'aloof', 'stoic', 'calm', 'grounded', 'deadpan')) return { emojis: ['✦', '✧', '·'], words: ['…heh', 'okay, fine', 'noted', 'hm'], burst: 1 };
  if (has('energ', 'bold', 'fiery', 'bubbly', 'excit', 'vivac', 'passion', 'wild')) return { emojis: ['✨', '💥', '⭐', '✦'], words: ['YES', 'more!', 'woo!', 'hi hi hi'], burst: 6 };
  return { emojis: ['♡', '✦', '✨', '💜'], words: ['✨', '♡', 'hi'], burst: 3 };
}
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export default function CompanionSpace({ comps, bonds, positions, onPositions, onBonds, onInteract, lore, onBack, onOpenProfile }) {
  const living = (comps || []).filter((c) => c.status !== 'deleted');
  const containerRef = useRef(null);
  const dragRef = useRef(null);
  const [pos, setPos] = useState(() => {
    const p = { ...(positions || {}) };
    living.forEach((c, i) => { if (!p[c.id]) p[c.id] = defaultPos(i, living.length, c); });
    return p;
  });
  const posRef = useRef(pos);
  useEffect(() => { posRef.current = pos; }, [pos]);
  const bondsRef = useRef(bonds);
  useEffect(() => { bondsRef.current = bonds; }, [bonds]);

  const [dragId, setDragId] = useState(null);
  const [pets, setPets] = useState({});        // id -> bump counter (restarts pop)
  const [hearts, setHearts] = useState([]);    // {key, compId, dx, emoji}
  const [reaction, setReaction] = useState(null); // {compId, word}
  const [bubble, setBubble] = useState(null);  // {compId, text}
  const [approaching, setApproaching] = useState(null); // [idA, idB] currently talking
  const timersRef = useRef([]);

  // Mingling: companions chat with each other on their own. The talking pair
  // leans together and trades lines, then drifts back. Template-generated
  // (no API cost) and it nudges their bond.
  useEffect(() => {
    let alive = true;
    const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };
    const play = () => {
      const awake = living.filter((c) => c.status === 'awake');
      if (awake.length < 2) { setBubble(null); setApproaching(null); return; }
      const res = genAmbient(awake, bondsRef.current);
      if (!res || !res.thread?.length) return;
      setApproaching(res.pair || null);
      const lines = res.thread.slice(0, 4);
      lines.forEach((line, i) => {
        timersRef.current.push(setTimeout(() => { if (alive && line?.from) setBubble({ compId: line.from.id, text: line.text }); }, i * 2300));
      });
      timersRef.current.push(setTimeout(() => {
        if (!alive) return;
        setBubble(null); setApproaching(null);
        if (res.pair && onBonds) onBonds((b) => bumpBond(b, res.pair[0], res.pair[1]));
      }, lines.length * 2300 + 900));
    };
    timersRef.current.push(setTimeout(play, 900));
    const iv = setInterval(() => { clearTimers(); play(); }, 16000);
    return () => { alive = false; clearInterval(iv); clearTimers(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [living.length]);

  function pet(c) {
    const st = petStyle(c);
    onInteract?.(c.id, 'pet');
    setPets((p) => ({ ...p, [c.id]: (p[c.id] || 0) + 1 }));
    const made = Array.from({ length: st.burst + 1 }, (_, k) => ({
      key: `${c.id}-${Date.now()}-${k}`,
      compId: c.id,
      dx: Math.round((Math.random() - 0.5) * 50),
      emoji: pick(st.emojis),
    }));
    setHearts((h) => [...h, ...made]);
    const keys = new Set(made.map((m) => m.key));
    timersRef.current.push(setTimeout(() => setHearts((h) => h.filter((x) => !keys.has(x.key))), 1150));
    const word = pick(st.words);
    setReaction({ compId: c.id, word });
    timersRef.current.push(setTimeout(() => setReaction((r) => (r && r.word === word && r.compId === c.id ? null : r)), 1100));
  }

  function onPointerDown(e, c) {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { id: c.id, moved: false, sx: e.clientX, sy: e.clientY };
  }
  function onPointerMove(e) {
    const d = dragRef.current;
    if (!d) return;
    if (!d.moved && (Math.abs(e.clientX - d.sx) > 4 || Math.abs(e.clientY - d.sy) > 4)) { d.moved = true; setDragId(d.id); }
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

  // Render position: while two companions are talking, each leans ~38% toward
  // the other so they visibly approach, then eases back when the chat ends.
  function leanPos(c, base) {
    if (approaching && (approaching[0] === c.id || approaching[1] === c.id)) {
      const otherId = approaching[0] === c.id ? approaching[1] : approaching[0];
      const ob = pos[otherId];
      if (ob) return { x: base.x + ((base.x + ob.x) / 2 - base.x) * 0.38, y: base.y + ((base.y + ob.y) / 2 - base.y) * 0.38 };
    }
    return base;
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

      <div ref={containerRef} onPointerMove={onPointerMove}
        style={{ flex: 1, position: 'relative', overflow: 'hidden', touchAction: 'none', userSelect: 'none' }}>
        {living.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontSize: 13 }}>No companions here yet.</div>
        )}
        {living.map((c, i) => {
          const base = pos[c.id] || defaultPos(i, living.length, c);
          const p = leanPos(c, base);
          const awake = c.status === 'awake';
          const dragging = dragId === c.id;
          const talking = approaching && (approaching[0] === c.id || approaching[1] === c.id);
          const floatName = FLOATS[i % FLOATS.length];
          const vit = awake ? vitality(c) : 0.3;
          const dur = (6 + (i % 4)) / (0.6 + 0.4 * vit); // lower energy drifts slower
          return (
            <div key={c.id} onPointerDown={(e) => onPointerDown(e, c)} onPointerUp={(e) => onPointerUp(e, c)}
              style={{
                position: 'absolute', left: `${p.x * 100}%`, top: `${p.y * 100}%`,
                marginLeft: -SIZE / 2, marginTop: -SIZE / 2, width: SIZE,
                cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none',
                transition: dragging ? 'none' : 'left 1.1s ease, top 1.1s ease',
                zIndex: dragging ? 20 : (talking ? 10 : 2),
                animation: awake && !dragging ? `${floatName} ${dur}s ease-in-out infinite` : 'none',
                opacity: awake ? 1 : 0.5,
              }}>
              {bubble && bubble.compId === c.id && (
                <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 8, background: C.card, border: `1px solid ${c.color?.primary || C.border}`, color: C.text, fontSize: 11.5, lineHeight: 1.4, padding: '7px 10px', borderRadius: 12, width: 'max-content', maxWidth: 180, textAlign: 'center', animation: 'fadeUp 0.3s both', pointerEvents: 'none', boxShadow: `0 6px 20px ${C.void}` }}>
                  {bubble.text}
                </div>
              )}
              {reaction && reaction.compId === c.id && (
                <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 4, color: c.color?.primary || C.glow1, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', pointerEvents: 'none', animation: 'heartRise 1.1s ease-out forwards' }}>
                  {reaction.word}
                </div>
              )}
              {hearts.filter((h) => h.compId === c.id).map((h) => (
                <span key={h.key} style={{ position: 'absolute', left: '50%', top: 6, marginLeft: h.dx, fontSize: 16, pointerEvents: 'none', animation: 'heartRise 1.1s ease-out forwards' }}>{h.emoji}</span>
              ))}
              <div key={`pop-${pets[c.id] || 0}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', animation: pets[c.id] ? 'petPop 0.5s ease' : 'none', filter: talking ? `drop-shadow(0 0 10px ${c.color?.glow || 'rgba(124,91,245,0.5)'})` : 'none' }}>
                <Avatar comp={c} size={SIZE} glow vitality={vit} />
                <span style={{ fontSize: 11, color: C.textSoft, marginTop: 6, fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>
                  {!awake && <span style={{ fontSize: 9 }}>💤</span>}{c.name}
                </span>
                {!talking && (
                  <span style={{ fontSize: 9, color: C.textDim, fontStyle: 'italic', marginTop: 1, maxWidth: 96, textAlign: 'center', lineHeight: 1.25 }}>{currentActivity(c)}</span>
                )}
                {onOpenProfile && (
                  <button onClick={(e) => { e.stopPropagation(); onOpenProfile(c.id); }} onPointerDown={(e) => e.stopPropagation()}
                    style={{ marginTop: 2, background: 'none', border: 'none', color: C.textDim, fontSize: 9.5, cursor: 'pointer', padding: '2px 4px' }}>profile</button>
                )}
              </div>
            </div>
          );
        })}
        {Array.isArray(lore) && lore.length > 0 && (
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '10px 16px', background: `linear-gradient(transparent, ${C.void})`, pointerEvents: 'none' }}>
            <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 }}>✦ your story together</div>
            <div style={{ fontSize: 11.5, color: C.textSoft, fontStyle: 'italic', lineHeight: 1.4 }}>remember when {lore[0].text}</div>
          </div>
        )}
      </div>
    </Shell>
  );
}
