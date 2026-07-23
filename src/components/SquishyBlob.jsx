import React, { useRef, useEffect, useMemo } from 'react';

// A companion rendered as a squishy blob of "goop": a soft gel body you can
// poke, drag and smear with a thumb or an Apple Pencil. The surface is a ring
// of spring-loaded points with neighbour cohesion, so deformation spreads and
// wobbles like jelly instead of spiking. Pointer Events cover touch + pen
// (pressure deepens the pull). Pure SVG + one requestAnimationFrame loop; the
// path is updated imperatively so React never re-renders per frame.
//
// Identity + colour come from the companion, so it stays unique and recolours
// instantly. Bounciness is personality-derived and can be overridden (profile).

const VB = 120;          // viewBox units
const CX = 60, CY = 60;  // centre
const R = 38;            // rest radius
const N = 22;            // surface points (more = smoother tendrils when pulled)
const EYE_DX = 8.5, EYE_Y = -4.5, EYE_RX = 4.0, MOUTH_Y = 9; // face layout (viewBox units)

function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const cl = (n) => Math.max(0, Math.min(255, n));
function hexToRgb(h) {
  h = (h || '#7c5bf5').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const toHex = (r, g, b) => '#' + [r, g, b].map((x) => cl(Math.round(x)).toString(16).padStart(2, '0')).join('');
const lighten = (hex, a = 0.5) => { const [r, g, b] = hexToRgb(hex); return toHex(r + (255 - r) * a, g + (255 - g) * a, b + (255 - b) * a); };
const darken = (hex, a = 0.55) => { const [r, g, b] = hexToRgb(hex); return toHex(r * (1 - a), g * (1 - a), b * (1 - a)); };

// Face expression specs. eyeRy = eye openness; arc = eyelid curve (>0 happy
// squint / <0 wide); mouthW/mouthCurve shape the smile (curve>0 = smile in SVG's
// y-down space); droop lowers the eyes a touch (soft/sleepy); brow tilts inner
// brows (concerned). Grab/poke overrides these live with a delighted "o".
const EXPR_SPECS = {
  content: { eyeRy: 5.0, arc: 0.1, mouthW: 7, mouthCurve: 3, droop: 0, brow: 0 },
  happy: { eyeRy: 5.0, arc: 0.35, mouthW: 8.5, mouthCurve: 5, droop: 0, brow: 0.1 },
  excited: { eyeRy: 6.2, arc: 0.1, mouthW: 8, mouthCurve: 7, open: 3.2, droop: 0, brow: 0.25 },
  soft: { eyeRy: 4.4, arc: 0.2, mouthW: 6, mouthCurve: 2.5, droop: 1.6, brow: -0.15 },
  concerned: { eyeRy: 4.8, arc: -0.1, mouthW: 6, mouthCurve: -1.5, droop: 0.6, brow: -0.5 },
  sleepy: { eyeRy: 1.4, arc: 0.5, mouthW: 4, mouthCurve: 1.5, droop: 2.4, brow: 0 },
};
function mouthD(cx, cy, w, curve, open) {
  if (open > 0.6) { const rx = Math.max(2.5, w * 0.6), ry = open; return `M ${(cx - rx).toFixed(2)} ${cy.toFixed(2)} A ${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 0 ${(cx + rx).toFixed(2)} ${cy.toFixed(2)} A ${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 0 ${(cx - rx).toFixed(2)} ${cy.toFixed(2)} Z`; }
  return `M ${(cx - w).toFixed(2)} ${cy.toFixed(2)} Q ${cx.toFixed(2)} ${(cy + curve).toFixed(2)} ${(cx + w).toFixed(2)} ${cy.toFixed(2)}`;
}

// How bouncy a companion's goop is, 0 (firm, calm) .. 1 (loose, lively).
function personalityBounce(comp) {
  const t = `${comp?.personality || ''} ${comp?.quirk || ''} ${comp?.builderTraits ? Object.values(comp.builderTraits).flat().join(' ') : ''}`.toLowerCase();
  const has = (...w) => w.some((x) => t.includes(x));
  if (has('energ', 'bold', 'fiery', 'bubbly', 'excit', 'vivac', 'passion', 'wild', 'playful', 'goofy', 'silly')) return 0.92;
  if (has('warm', 'affection', 'nurtur', 'caring', 'loving', 'sweet', 'tender')) return 0.6;
  if (has('shy', 'reserved', 'quiet', 'gentle', 'soft', 'timid')) return 0.45;
  if (has('cool', 'dry', 'sarcas', 'aloof', 'stoic', 'calm', 'grounded', 'deadpan')) return 0.22;
  return 0.55;
}

export default function SquishyBlob({ comp, size = 110, interactive = false, poke = null, pokes = null, bump = 0, grabbed = false, softness = null, vitality = 1, mood = null, face = true, glow = true, sigil = true, style }) {
  const color = comp?.color?.primary || '#7c5bf5';
  const glowC = comp?.color?.glow || `${color}66`;
  const seed = useMemo(() => hashStr(comp?.id || comp?.name || 'x'), [comp?.id, comp?.name]);
  const gid = `blob${seed.toString(36)}`;

  // Resting surface (a circle, slightly irregular per identity so each blob has
  // its own lopsided character) + the constellation that marks who they are.
  const rest = useMemo(() => {
    const rnd = mulberry32(seed);
    const bx = new Array(N), by = new Array(N);
    for (let i = 0; i < N; i++) {
      const ang = (i / N) * Math.PI * 2;
      const rr = R * (0.92 + rnd() * 0.16);   // gentle lopsidedness
      bx[i] = Math.cos(ang) * rr; by[i] = Math.sin(ang) * rr;
    }
    const stars = [];
    const ns = 4 + Math.floor(rnd() * 3);
    for (let i = 0; i < ns; i++) {
      const a = rnd() * Math.PI * 2, rad = rnd() * R * 0.42;
      stars.push({ x: CX + Math.cos(a) * rad, y: CY + Math.sin(a) * rad, r: 0.8 + rnd() * 1.8 });
    }
    return { bx, by, stars };
  }, [seed]);

  let bounce = softness != null ? Math.max(0, Math.min(1, softness)) : personalityBounce(comp);
  // Mood nudges bounciness: a lit-up companion jiggles a touch more, a low or
  // sleepy one settles calmer — without touching the user's chosen colour.
  if (mood && typeof mood.energy === 'number') bounce = Math.max(0, Math.min(1, bounce + (mood.energy - 0.5) * 0.3));

  const pathRef = useRef(null);
  const simRef = useRef(null);
  const pokesRef = useRef(new Map());  // pointerId -> {x,y,pressure} in viewBox units (multi-touch, own handlers)
  const propPokeRef = useRef(null);    // single external poke (legacy)
  const propPokesRef = useRef(null);   // external multi-touch array (e.g. The Space)
  const bumpRef = useRef(bump);
  const paramsRef = useRef({});
  const svgRef = useRef(null);
  // Face elements (updated imperatively each frame — blink, gaze, expression).
  const faceGRef = useRef(null);
  const eyeLRef = useRef(null), eyeRRef = useRef(null);
  const hlLRef = useRef(null), hlRRef = useRef(null);
  const mouthRef = useRef(null), browLRef = useRef(null), browRRef = useRef(null);
  const moodRef = useRef(null);
  const blinkRef = useRef({ next: 1.2 + (seed % 100) / 40, closing: 0 });
  useEffect(() => { moodRef.current = mood; }, [mood]);

  // Keep live params/poke for the rAF loop without restarting it.
  useEffect(() => {
    paramsRef.current = {
      k: 0.15 - 0.07 * bounce,          // spring stiffness (looser = bouncier/gooier)
      damp: 0.84 - 0.16 * bounce,       // velocity retention per frame
      coupling: 0.16,                    // neighbour cohesion (goop, not spikes)
      pull: 0.85,                        // adhesion — grabbed patch clings to the finger
      reach: R * 1.15,                   // LOCAL grab radius, so pulling stretches a
                                         // patch into a tendril instead of flattening
                                         // the whole body toward the fingers
      maxStretch: R * 1.9,               // how far the surface can be pulled (tendrils)
      wobble: R * 0.028 * (0.45 + 0.55 * vitality),
      grabbed,
    };
  }, [bounce, vitality, grabbed]);
  useEffect(() => { propPokeRef.current = poke; }, [poke]);
  useEffect(() => { propPokesRef.current = pokes; }, [pokes]);

  // A pet/tap "boing": kick every point outward, then it jiggles back.
  useEffect(() => {
    if (bump === bumpRef.current) return;
    bumpRef.current = bump;
    const s = simRef.current; if (!s) return;
    for (let i = 0; i < N; i++) {
      const len = Math.hypot(rest.bx[i], rest.by[i]) || 1;
      s.vx[i] += (rest.bx[i] / len) * R * 0.5;
      s.vy[i] += (rest.by[i] / len) * R * 0.5;
    }
  }, [bump, rest]);

  useEffect(() => {
    simRef.current = { dx: new Float64Array(N), dy: new Float64Array(N), vx: new Float64Array(N), vy: new Float64Array(N) };
    const s = simRef.current;
    let raf, t = 0, mounted = true;

    const frame = () => {
      if (!mounted) return;
      t += 0.016;
      const P = paramsRef.current;
      // All fingers currently on this blob (multi-touch): own touches when
      // interactive, else a single external poke (e.g. dragging in The Space).
      const actives = interactive
        ? Array.from(pokesRef.current.values())
        : (propPokesRef.current && propPokesRef.current.length ? propPokesRef.current
          : (propPokeRef.current ? [propPokeRef.current] : []));
      const grabbed = interactive ? actives.length > 0 : (P.grabbed || actives.length > 0);
      // Springs go softer while held, so pulling feels like gooey slime that
      // stretches, then it firms up to recover once you let go.
      const k = grabbed ? P.k * 0.72 : P.k;
      const reach = P.reach || R * 2, maxStretch = P.maxStretch || R * 2;
      const ndx = new Float64Array(N), ndy = new Float64Array(N);
      const restScale = grabbed ? 0.96 : 1;

      for (let i = 0; i < N; i++) {
        const prev = (i - 1 + N) % N, next = (i + 1) % N;
        // target rest = own base point, breathing in/out a touch
        const len = Math.hypot(rest.bx[i], rest.by[i]) || 1;
        const wob = (P.wobble || 0) * Math.sin(t * 1.6 + i * 0.7);
        const tx = rest.bx[i] * restScale + (rest.bx[i] / len) * wob;
        const ty = rest.by[i] * restScale + (rest.by[i] / len) * wob;

        let ax = -k * (s.dx[i] - (tx - rest.bx[i]));
        let ay = -k * (s.dy[i] - (ty - rest.by[i]));
        // neighbour cohesion — spread deformation smoothly
        ax += P.coupling * ((s.dx[prev] + s.dx[next]) / 2 - s.dx[i]);
        ay += P.coupling * ((s.dy[prev] + s.dy[next]) / 2 - s.dy[i]);

        // finger adhesion: nearby surface clings and stretches toward EACH
        // touch point — two fingers can pull the body apart into tendrils.
        const px = CX + rest.bx[i] + s.dx[i], py = CY + rest.by[i] + s.dy[i];
        for (const a of actives) {
          const dxp = a.x - px, dyp = a.y - py;
          const dist = Math.hypot(dxp, dyp);
          const w = Math.max(0, 1 - dist / reach);
          if (w > 0) {
            const f = P.pull * w * w * (0.55 + (a.pressure || 0.5));
            ax += dxp * f; ay += dyp * f;
          }
        }

        s.vx[i] = (s.vx[i] + ax) * P.damp;
        s.vy[i] = (s.vy[i] + ay) * P.damp;
        ndx[i] = s.dx[i] + s.vx[i];
        ndy[i] = s.dy[i] + s.vy[i];
        const m = Math.hypot(ndx[i], ndy[i]);
        if (m > maxStretch) { ndx[i] *= maxStretch / m; ndy[i] *= maxStretch / m; }
      }
      s.dx.set(ndx); s.dy.set(ndy);

      // smooth closed path through the deformed points (midpoint quadratics)
      const X = new Array(N), Y = new Array(N);
      for (let i = 0; i < N; i++) { X[i] = CX + rest.bx[i] + s.dx[i]; Y[i] = CY + rest.by[i] + s.dy[i]; }
      const mx = (a, b) => (X[a] + X[b]) / 2, my = (a, b) => (Y[a] + Y[b]) / 2;
      let d = `M ${mx(N - 1, 0).toFixed(2)} ${my(N - 1, 0).toFixed(2)}`;
      for (let i = 0; i < N; i++) d += ` Q ${X[i].toFixed(2)} ${Y[i].toFixed(2)} ${mx(i, (i + 1) % N).toFixed(2)} ${my(i, (i + 1) % N).toFixed(2)}`;
      d += ' Z';
      if (pathRef.current) pathRef.current.setAttribute('d', d);

      // ---- face: blink, gaze, expression (imperative, no React re-render) ----
      if (faceGRef.current) {
        // Whole face drifts with the body's overall motion (centroid), so it
        // stays "on" the blob while squishing, but doesn't itself stretch.
        let cdx = 0, cdy = 0;
        for (let i = 0; i < N; i++) { cdx += s.dx[i]; cdy += s.dy[i]; }
        cdx /= N; cdy /= N;
        faceGRef.current.setAttribute('transform', `translate(${cdx.toFixed(2)} ${cdy.toFixed(2)})`);

        // Expression: mood normally, a delighted squished "o" while held.
        const mv = moodRef.current;
        const key = grabbed ? null : ((mv && mv.expression) || (vitality < 0.34 ? 'sleepy' : 'content'));
        const sp = grabbed
          ? { eyeRy: 2.6, mouthW: 6, mouthCurve: 5, open: 3.6, droop: -0.4, brow: 0.2 }
          : (EXPR_SPECS[key] || EXPR_SPECS.content);

        // Blink.
        const bk = blinkRef.current;
        if (t >= bk.next && !bk.closing) bk.closing = t;
        let openF = 1;
        if (bk.closing) {
          const el = t - bk.closing;
          if (el >= 0.15) { bk.closing = 0; bk.next = t + 2.4 + (Math.sin(t * 1.7 + seed) + 1) * 1.6; }
          else openF = Math.abs(el - 0.075) / 0.075; // 1 -> 0 -> 1
        }
        const ry = Math.max(0.3, sp.eyeRy * openF);

        // Gaze: look at the nearest finger, else a slow idle wander.
        let gx = Math.sin(t * 0.41 + seed) * 1.1, gy = Math.cos(t * 0.33 + seed) * 0.8;
        if (actives.length) {
          let best = actives[0], bd = 1e9;
          for (const a of actives) { const dd = Math.hypot(a.x - CX, a.y - CY); if (dd < bd) { bd = dd; best = a; } }
          const ang = Math.atan2(best.y - (CY + EYE_Y), best.x - CX);
          gx = Math.cos(ang) * 2.2; gy = Math.sin(ang) * 1.8;
        }
        const ey = EYE_Y + (sp.droop || 0);
        const setEye = (eye, hl, sign) => {
          if (eye) { eye.setAttribute('cx', (CX + sign * EYE_DX + gx).toFixed(2)); eye.setAttribute('cy', (CY + ey + gy).toFixed(2)); eye.setAttribute('ry', ry.toFixed(2)); }
          if (hl) { hl.setAttribute('cx', (CX + sign * EYE_DX + gx * 1.3 - 1.1).toFixed(2)); hl.setAttribute('cy', (CY + ey + gy * 1.3 - 1.5).toFixed(2)); hl.setAttribute('opacity', (openF > 0.5 ? 0.9 : 0).toFixed(2)); }
        };
        setEye(eyeLRef.current, hlLRef.current, -1);
        setEye(eyeRRef.current, hlRRef.current, 1);
        if (mouthRef.current) mouthRef.current.setAttribute('d', mouthD(CX, CY + MOUTH_Y, sp.mouthW, sp.mouthCurve, sp.open || 0));
        // Brows only really read for concern/excitement; fade them otherwise.
        const brow = sp.brow || 0;
        const setBrow = (b, sign) => {
          if (!b) return;
          const bx = CX + sign * EYE_DX, by = CY + ey - ry - 2.6;
          const inner = by + brow * 2.4, outer = by - brow * 1.2;
          b.setAttribute('d', `M ${(bx + sign * 3).toFixed(2)} ${outer.toFixed(2)} Q ${bx.toFixed(2)} ${(by - 0.6).toFixed(2)} ${(bx - sign * 3).toFixed(2)} ${inner.toFixed(2)}`);
          b.setAttribute('opacity', Math.min(0.8, Math.abs(brow) * 1.6).toFixed(2));
        };
        setBrow(browLRef.current, -1);
        setBrow(browRRef.current, 1);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { mounted = false; cancelAnimationFrame(raf); };
  }, [rest, interactive]);

  const pad = Math.round(size * 0.18); // room for tendrils/glow to spill out

  // --- interactive pointer handling (own deformation, e.g. profile) ---
  // Tracks every active finger/pen by pointerId, so you can poke, drag and
  // stretch the slime with one or two fingers at once.
  const toVB = (e) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return null;
    // Map screen coords into the SVG's ACTUAL viewBox, which is inset by `pad`
    // on every side — otherwise fingers register too close to the centre.
    const vb = VB + pad * 2;
    return {
      x: -pad + (e.clientX - r.left) / r.width * vb,
      y: -pad + (e.clientY - r.top) / r.height * vb,
      pressure: e.pressure > 0 ? e.pressure : 0.5,
    };
  };
  const down = (e) => {
    if (!interactive) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = toVB(e); if (p) pokesRef.current.set(e.pointerId, p);
  };
  const move = (e) => {
    if (!interactive || !pokesRef.current.has(e.pointerId)) return;
    const p = toVB(e); if (p) pokesRef.current.set(e.pointerId, p);
  };
  const up = (e) => {
    if (!interactive) return;
    if (e && e.pointerId != null) pokesRef.current.delete(e.pointerId);
    else pokesRef.current.clear();
  };

  return (
    <svg
      ref={svgRef}
      width={size} height={size}
      viewBox={`${-pad} ${-pad} ${VB + pad * 2} ${VB + pad * 2}`}
      aria-hidden="true"
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      style={{ display: 'block', flexShrink: 0, overflow: 'visible', touchAction: interactive ? 'none' : 'auto', cursor: interactive ? 'grab' : 'inherit', filter: glow ? `drop-shadow(0 0 ${Math.round(size * 0.16 * (0.5 + 0.5 * vitality))}px ${glowC})` : 'none', WebkitTapHighlightColor: 'transparent', ...style }}
    >
      <defs>
        <radialGradient id={gid} cx="36%" cy="28%" r="80%">
          <stop offset="0%" stopColor={lighten(color, 0.6)} />
          <stop offset="55%" stopColor={color} />
          <stop offset="100%" stopColor={darken(color)} />
        </radialGradient>
      </defs>
      <path ref={pathRef} d="" fill={`url(#${gid})`} />
      {/* gel sheen */}
      <ellipse cx={CX - R * 0.34} cy={CY - R * 0.4} rx={R * 0.34} ry={R * 0.22} fill={lighten(color, 0.78)} opacity="0.5" />
      {/* identity constellation (hidden when the companion turns the sigil off) */}
      {sigil && comp?.showSigil !== false && rest.stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={lighten(color, 0.85)} opacity="0.55" />
      ))}
      {/* face — eyes (with highlight), brows and mouth; animated imperatively */}
      {face && (
        <g ref={faceGRef}>
          <path ref={browLRef} d="" stroke={darken(color, 0.66)} strokeWidth="1.3" strokeLinecap="round" fill="none" opacity="0" />
          <path ref={browRRef} d="" stroke={darken(color, 0.66)} strokeWidth="1.3" strokeLinecap="round" fill="none" opacity="0" />
          <ellipse ref={eyeLRef} cx={CX - EYE_DX} cy={CY + EYE_Y} rx={EYE_RX} ry="5" fill={darken(color, 0.68)} />
          <ellipse ref={eyeRRef} cx={CX + EYE_DX} cy={CY + EYE_Y} rx={EYE_RX} ry="5" fill={darken(color, 0.68)} />
          <circle ref={hlLRef} cx={CX - EYE_DX - 1.1} cy={CY + EYE_Y - 1.5} r="1.4" fill="#fff" opacity="0.9" />
          <circle ref={hlRRef} cx={CX + EYE_DX - 1.1} cy={CY + EYE_Y - 1.5} r="1.4" fill="#fff" opacity="0.9" />
          <path ref={mouthRef} d="" stroke={darken(color, 0.66)} strokeWidth="1.8" strokeLinecap="round" fill={darken(color, 0.66)} fillOpacity="0.55" />
        </g>
      )}
    </svg>
  );
}
