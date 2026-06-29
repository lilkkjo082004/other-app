// Design tokens — the visual identity of OTHER. Keep these stable; the whole
// app's look derives from them.
export const C = {
  void: '#06060c', bg: '#0b0b14', surface: '#111119', surfaceUp: '#17171f',
  card: '#141420', border: '#222236', borderLit: '#3d3d6a',
  glow1: '#7c5bf5', glow2: '#e84393', glow3: '#00cec9',
  text: '#eae8f4', textSoft: '#9590b0', textDim: '#716d96',
  white: '#fff', danger: '#ff6b6b',
};

export const COMP_COLORS = [
  { primary: '#7c5bf5', glow: 'rgba(124,91,245,0.35)', name: 'Violet Nebula' },
  { primary: '#e84393', glow: 'rgba(232,67,147,0.35)', name: 'Rose Nova' },
  { primary: '#00cec9', glow: 'rgba(0,206,201,0.35)', name: 'Teal Drift' },
  { primary: '#f5a623', glow: 'rgba(245,166,35,0.35)', name: 'Amber Flare' },
  { primary: '#2ecc71', glow: 'rgba(46,204,113,0.35)', name: 'Emerald Mist' },
  { primary: '#4f9dff', glow: 'rgba(79,157,255,0.35)', name: 'Azure Pulse' },
  { primary: '#ff7a59', glow: 'rgba(255,122,89,0.35)', name: 'Coral Ember' },
  { primary: '#b388ff', glow: 'rgba(179,136,255,0.35)', name: 'Lavender Haze' },
];

export const CSS = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Cormorant+Garamond:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}body{margin:0;background:${C.void};font-family:'DM Sans',sans-serif;color:${C.text};overflow-x:hidden}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:${C.border};border-radius:4px}
input,textarea,select{font-family:'DM Sans',sans-serif}input::placeholder,textarea::placeholder{color:${C.textDim}}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
@keyframes drift1{0%,100%{transform:translate(0,0)}50%{transform:translate(-30px,20px)}}
@keyframes drift2{0%,100%{transform:translate(0,0)}50%{transform:translate(20px,-30px)}}
@keyframes typewriter{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-4px)}}
@keyframes wakeGlow{0%{box-shadow:0 0 0 rgba(124,91,245,0)}50%{box-shadow:0 0 80px rgba(124,91,245,0.5)}100%{box-shadow:0 0 30px rgba(124,91,245,0.2)}}
@keyframes micPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,107,107,0.4)}50%{box-shadow:0 0 0 12px rgba(255,107,107,0)}}
@keyframes floatA{0%,100%{transform:translate(0,0)}50%{transform:translate(10px,-14px)}}
@keyframes floatB{0%,100%{transform:translate(0,0)}50%{transform:translate(-12px,-9px)}}
@keyframes floatC{0%,100%{transform:translate(0,0)}33%{transform:translate(9px,8px)}66%{transform:translate(-8px,-11px)}}
@keyframes petPop{0%{transform:scale(1)}30%{transform:scale(1.18)}55%{transform:scale(0.96)}100%{transform:scale(1)}}
@keyframes heartRise{0%{opacity:0;transform:translateY(0) scale(0.6)}20%{opacity:1}100%{opacity:0;transform:translateY(-46px) scale(1.1)}}
.bp{background:linear-gradient(135deg,${C.glow1},#9b59f5);color:#fff;border:none;border-radius:50px;padding:14px 40px;font-size:15px;font-weight:600;cursor:pointer;transition:all 0.3s;font-family:'DM Sans',sans-serif}
.bp:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(124,91,245,0.4)}.bp:disabled{opacity:0.4;cursor:default;transform:none;box-shadow:none}
.bg2{background:transparent;border:1px solid ${C.border};color:${C.text};border-radius:50px;padding:12px 28px;font-size:14px;font-weight:500;cursor:pointer;transition:all 0.3s;font-family:'DM Sans',sans-serif}
.bg2:hover{border-color:${C.borderLit};background:${C.surfaceUp}}
:focus-visible{outline:2px solid ${C.glow1};outline-offset:2px;border-radius:4px}
@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation-duration:0.001ms !important;animation-iteration-count:1 !important;transition-duration:0.001ms !important;scroll-behavior:auto !important}}`;
