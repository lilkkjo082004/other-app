// Ambiance packs — gentle ambient soundscapes for The Space, synthesized live
// with the Web Audio API (no audio files, no network). Each is a soft loop the
// user can turn on for a calmer, more present feel. The chosen pack persists.
const KEY = 'other_ambiance_v1';

export const AMBIANCES = [
  { key: 'off', label: 'Off', em: '🔇' },
  { key: 'rain', label: 'Rain', em: '🌧️' },
  { key: 'waves', label: 'Waves', em: '🌊' },
  { key: 'space', label: 'Deep space', em: '🌌' },
  { key: 'forest', label: 'Forest', em: '🌲' },
];

export function currentAmbiance() {
  try { return localStorage.getItem(KEY) || 'off'; } catch (e) { return 'off'; }
}
export function setAmbiance(key) {
  try { localStorage.setItem(KEY, key); } catch (e) { /* ignore */ }
}

let ctx = null, nodes = [], timer = null;

function ac() {
  if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// A looping buffer of filtered noise — the base of most soundscapes.
function noiseBuffer(c, seconds = 2) {
  const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;   // brown-ish noise (soft, low)
    d[i] = last * 3.5;
  }
  return buf;
}

function noiseSource(c, { lp = 1000, hp = 0, gain = 0.15 } = {}) {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  src.loop = true;
  let node = src;
  if (hp) { const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; node.connect(f); node = f; }
  const lpf = c.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = lp; node.connect(lpf);
  const g = c.createGain(); g.gain.value = gain; lpf.connect(g); g.connect(c.destination);
  src.start();
  return { src, g, lpf };
}

export function stopAmbiance() {
  if (timer) { clearInterval(timer); timer = null; }
  for (const n of nodes) { try { n.src?.stop?.(); } catch (e) { /* ignore */ } try { n.osc?.stop?.(); } catch (e) { /* ignore */ } }
  nodes = [];
}

// Start (or switch to) a soundscape. Must be called from a user gesture the
// first time so the AudioContext is allowed to run.
export function playAmbiance(key) {
  stopAmbiance();
  if (!key || key === 'off') return;
  const c = ac();
  if (!c) return;

  if (key === 'rain') {
    nodes.push(noiseSource(c, { lp: 3200, hp: 400, gain: 0.10 }));
  } else if (key === 'waves') {
    const n = noiseSource(c, { lp: 900, gain: 0.02 });
    nodes.push(n);
    // Slow swell in and out like surf.
    let up = true;
    timer = setInterval(() => {
      if (!n.g) return;
      const t = c.currentTime;
      n.g.gain.cancelScheduledValues(t);
      n.g.gain.linearRampToValueAtTime(up ? 0.14 : 0.03, t + 3.5);
      up = !up;
    }, 3600);
  } else if (key === 'space') {
    // Low drone: two detuned sine oscillators + a faint noise wash.
    for (const freq of [55, 82.5]) {
      const osc = c.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
      const g = c.createGain(); g.gain.value = 0.05; osc.connect(g); g.connect(c.destination); osc.start();
      nodes.push({ osc, g });
    }
    nodes.push(noiseSource(c, { lp: 500, gain: 0.02 }));
  } else if (key === 'forest') {
    nodes.push(noiseSource(c, { lp: 6000, hp: 2500, gain: 0.015 })); // airy leaves
    // Occasional soft bird-like chirps.
    timer = setInterval(() => {
      if (Math.random() > 0.55) return;
      const osc = c.createOscillator(); osc.type = 'sine';
      const base = 1600 + Math.random() * 1400;
      const g = c.createGain(); g.gain.value = 0.0001;
      osc.connect(g); g.connect(c.destination);
      const t = c.currentTime;
      osc.frequency.setValueAtTime(base, t);
      osc.frequency.linearRampToValueAtTime(base + 300, t + 0.12);
      g.gain.linearRampToValueAtTime(0.06, t + 0.04);
      g.gain.linearRampToValueAtTime(0.0001, t + 0.22);
      osc.start(t); osc.stop(t + 0.3);
    }, 1400);
  }
}
