import React from 'react';

// Generative companion avatar: a deterministic "cosmic sigil" — a constellation
// of stars + a tilted orbital ring over the companion's colour gradient. Seeded
// by the companion's identity so it's stable and unique. Pure SVG: no uploads,
// no network, no image-AI cost. Recolours instantly when the companion does.

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
const clamp = (n) => Math.max(0, Math.min(255, n));
function hexToRgb(h) {
  h = (h || '#7c5bf5').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const toHex = (r, g, b) => '#' + [r, g, b].map((x) => clamp(Math.round(x)).toString(16).padStart(2, '0')).join('');
function lighten(hex, amt = 0.45) { const [r, g, b] = hexToRgb(hex); return toHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt); }
function darken(hex, amt = 0.6) { const [r, g, b] = hexToRgb(hex); return toHex(r * (1 - amt), g * (1 - amt), b * (1 - amt)); }

export default function Avatar({ comp, size = 40, glow = true, style }) {
  const color = comp?.color?.primary || '#7c5bf5';
  const glowC = comp?.color?.glow || `${color}66`;
  // Seed by identity only (not colour) so recolouring re-tints the same sigil.
  const seed = hashStr(comp?.id || comp?.name || 'x');
  const rnd = mulberry32(seed);

  const cx = 50, cy = 50;
  const N = 4 + Math.floor(rnd() * 4); // 4–7 stars
  const stars = [];
  for (let i = 0; i < N; i++) {
    const ang = rnd() * Math.PI * 2;
    const rad = 9 + rnd() * 33;
    stars.push({ x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad, r: 0.9 + rnd() * 2.3 });
  }
  const path = stars.map((s, i) => `${i ? 'L' : 'M'}${s.x.toFixed(1)} ${s.y.toFixed(1)}`).join(' ');
  const ringRot = Math.floor(rnd() * 180);
  const ringRy = 9 + rnd() * 15;
  const gid = `av${seed.toString(36)}`;

  return (
    <svg
      width={size} height={size} viewBox="0 0 100 100" aria-hidden="true"
      style={{ borderRadius: '50%', display: 'block', flexShrink: 0, boxShadow: glow ? `0 0 ${Math.round(size * 0.4)}px ${glowC}` : 'none', ...style }}
    >
      <defs>
        <radialGradient id={gid} cx="38%" cy="30%" r="78%">
          <stop offset="0%" stopColor={lighten(color)} />
          <stop offset="55%" stopColor={color} />
          <stop offset="100%" stopColor={darken(color)} />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill={`url(#${gid})`} />
      <g transform={`rotate(${ringRot} 50 50)`}>
        <ellipse cx="50" cy="50" rx="41" ry={ringRy} fill="none" stroke="#ffffff" strokeOpacity="0.32" strokeWidth="0.9" />
      </g>
      <path d={path} fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="0.8" strokeLinejoin="round" strokeLinecap="round" />
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#ffffff" opacity={0.9} />
      ))}
    </svg>
  );
}
