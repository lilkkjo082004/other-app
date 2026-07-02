// Ambiance packs — gentle ambient soundscapes for The Space. The built-ins are
// synthesized live with the Web Audio API (no files, no network): layered
// stereo noise beds (pink/brown), LFO-driven motion, and randomized one-shot
// events (raindrops, fire crackles, bird calls) so nothing sounds mechanical.
// Users can also upload their OWN sound (any audio the browser plays), stored
// on-device in IndexedDB and looped. Custom keys are `custom:<id>`.
const KEY = 'other_ambiance_v1';

export const AMBIANCES = [
  { key: 'off', label: 'Off', em: '🔇' },
  { key: 'rain', label: 'Rain', em: '🌧️' },
  { key: 'lightrain', label: 'Light rain', em: '🌦️' },
  { key: 'fire', label: 'Fire', em: '🔥' },
  { key: 'waves', label: 'Waves', em: '🌊' },
  { key: 'space', label: 'Deep space', em: '🌌' },
  { key: 'forest', label: 'Forest', em: '🌲' },
];

const VOL_KEY = 'other_ambiance_vol';

export function currentAmbiance() {
  try { return localStorage.getItem(KEY) || 'off'; } catch (e) { return 'off'; }
}
export function setAmbiance(key) {
  try { localStorage.setItem(KEY, key); } catch (e) { /* ignore */ }
}
export function ambianceVolume() {
  try { const v = parseFloat(localStorage.getItem(VOL_KEY)); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.5; }
  catch (e) { return 0.5; }
}
export function setAmbianceVolume(v) {
  const vol = Math.max(0, Math.min(1, v));
  try { localStorage.setItem(VOL_KEY, String(vol)); } catch (e) { /* ignore */ }
  // Apply live to whatever's currently playing (cancel the fade-in if mid-ramp).
  if (master && ctx) {
    try { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setValueAtTime(vol, ctx.currentTime); }
    catch (e) { try { master.gain.value = vol; } catch (e2) { /* ignore */ } }
  }
  if (audioEl) { try { audioEl.volume = vol; } catch (e) { /* ignore */ } }
}
export const isCustom = (key) => typeof key === 'string' && key.startsWith('custom:');

// ── Custom uploaded sounds (IndexedDB) ──────────────────────────────────────
// Audio files can be several MB, so they live in IndexedDB (as Blobs), not
// localStorage. Device-local only — never uploaded anywhere.
const DB = 'other-ambiance', STORE = 'clips';
function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error('no IndexedDB')); return; }
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'id' }); };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
function reqP(req) { return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); }); }

export async function listCustom() {
  try {
    const db = await openDB();
    const all = await reqP(db.transaction(STORE, 'readonly').objectStore(STORE).getAll());
    return (all || []).map((c) => ({ id: c.id, name: c.name })).sort((a, b) => (a.name > b.name ? 1 : -1));
  } catch (e) { return []; }
}
export async function addCustom(file) {
  if (!file || !/^audio\//.test(file.type)) throw new Error('Please choose an audio file.');
  if (file.size > 20 * 1024 * 1024) throw new Error('That file is over 20 MB — please pick a smaller clip.');
  const id = 'c' + Math.abs((file.size * 2654435761) ^ file.name.length).toString(36) + file.name.length;
  const db = await openDB();
  const t = db.transaction(STORE, 'readwrite');
  t.objectStore(STORE).put({ id, name: file.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 40), blob: file });
  await new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); });
  return { id, name: file.name };
}
export async function removeCustom(id) {
  try { const db = await openDB(); const t = db.transaction(STORE, 'readwrite'); t.objectStore(STORE).delete(id); await new Promise((r) => { t.oncomplete = r; t.onerror = r; }); } catch (e) { /* ignore */ }
}
async function getCustomBlob(id) {
  const db = await openDB();
  const rec = await reqP(db.transaction(STORE, 'readonly').objectStore(STORE).get(id));
  return rec?.blob || null;
}

// ── Synth engine ─────────────────────────────────────────────────────────────
let ctx = null, nodes = [], timers = [], master = null, generation = 0;
let audioEl = null, audioUrl = null;   // for custom uploaded sounds
let playingKey = null;                 // the ambiance currently sounding, if any
let sharedBurst = null;                // small shared noise buffer for one-shots

export function isAmbiancePlaying() { return !!playingKey; }

// Resume the saved ambiance if one is set and it isn't already sounding. Call
// this from a user gesture (browsers block audio without one) — e.g. the first
// tap inside The Space after a reload.
export function resumeAmbiance() {
  const k = currentAmbiance();
  if (k && k !== 'off' && playingKey !== k) playAmbiance(k);
}

function ac() {
  if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

const rand = (a, b) => a + Math.random() * (b - a);

// Long (4s) STEREO noise loop — independent noise per channel gives natural
// width, and the length hides the loop point. white | pink | brown.
function makeNoise(c, type = 'white', seconds = 4) {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let chn = 0; chn < 2; chn++) {
    const d = buf.getChannelData(chn);
    if (type === 'brown') {
      let last = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    } else if (type === 'pink') {
      // Paul Kellet's pink-noise approximation.
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856; b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    } else {
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
  }
  return buf;
}

// Short shared noise burst reused by every droplet / crackle one-shot.
function burstBuffer(c) {
  if (sharedBurst && sharedBurst.sampleRate === c.sampleRate) return sharedBurst;
  const len = Math.floor(c.sampleRate * 0.2);
  sharedBurst = c.createBuffer(1, len, c.sampleRate);
  const d = sharedBurst.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return sharedBurst;
}

// Cached long noise loops shared by one-shot events (thunder, wave breaks) so
// each event doesn't allocate a fresh multi-second buffer.
let sharedLoops = null;
function loopBuf(c, type) {
  if (!sharedLoops || sharedLoops.rate !== c.sampleRate) sharedLoops = { rate: c.sampleRate };
  if (!sharedLoops[type]) sharedLoops[type] = makeNoise(c, type);
  return sharedLoops[type];
}

// A looping filtered-noise layer. Returns refs so LFOs can move its params.
function voice(c, dest, { type = 'white', bp = 0, hp = 0, lp = 0, q = 1, gain = 0.1 } = {}) {
  const src = c.createBufferSource();
  src.buffer = makeNoise(c, type);
  src.loop = true;
  let node = src;
  const refs = {};
  if (bp) { const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = bp; f.Q.value = q; node.connect(f); node = f; refs.bp = f; }
  if (hp) { const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; node.connect(f); node = f; refs.hp = f; }
  if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; f.Q.value = q; node.connect(f); node = f; refs.lp = f; }
  const g = c.createGain(); g.gain.value = gain; node.connect(g); g.connect(dest);
  src.start();
  const v = { src, g, ...refs };
  nodes.push(v);
  return v;
}

// Slow sine modulation of any AudioParam (smooth motion, unlike interval steps).
function lfo(c, param, rate, depth) {
  const osc = c.createOscillator(); osc.frequency.value = rate;
  const g = c.createGain(); g.gain.value = depth;
  osc.connect(g); g.connect(param); osc.start();
  nodes.push({ osc, g });
}

// Randomized repeating scheduler; dies when the soundscape is stopped.
function every(minMs, maxMs, fn) {
  const gen = generation;
  const loop = () => {
    if (gen !== generation) return;
    fn();
    timers.push(setTimeout(loop, rand(minMs, maxMs)));
  };
  timers.push(setTimeout(loop, rand(minMs, maxMs)));
}
// One-off delayed event that dies with the soundscape (e.g. the first thunder).
function once(minMs, maxMs, fn) {
  const gen = generation;
  timers.push(setTimeout(() => { if (gen === generation) fn(); }, rand(minMs, maxMs)));
}

// One-shot filtered noise burst (a raindrop hit, a fire crackle). Self-ending;
// wired to the master so stopping the soundscape silences any tail instantly.
// `at` schedules it a few (sample-accurate) seconds ahead — used for clusters.
function blip(c, dest, { bp = 3000, q = 4, gain = 0.03, decay = 0.03, rate = 1, pan = 0, at = 0 } = {}) {
  const src = c.createBufferSource(); src.buffer = burstBuffer(c); src.playbackRate.value = rate;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = bp; f.Q.value = q;
  const g = c.createGain();
  src.connect(f); f.connect(g);
  if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(dest); }
  else g.connect(dest);
  const t = c.currentTime + at;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  src.start(t); src.stop(t + decay + 0.05);
}

// Rolling thunder: a long noise rumble shaped by a random-walk envelope, so
// each strike rolls and fades differently. The body sits in the 300-800Hz band
// (NOT sub-bass — phone/laptop speakers can't reproduce below ~200Hz, which
// made earlier thunder inaudible), with a deep layer underneath for good
// speakers and an audible "crack!" at the onset of closer strikes.
function rumble(c, dest, { far = false } = {}) {
  const t = c.currentTime + 0.05;
  const dur = rand(4, 8);
  const peak = far ? rand(0.12, 0.2) : rand(0.3, 0.5);
  const pan = rand(-0.6, 0.6);
  // Shared random-walk envelope so both layers roll together.
  const n = 48, env = new Float32Array(n);
  let walk = 1;
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1);
    walk = Math.max(0.35, Math.min(1.6, walk + rand(-0.3, 0.3)));
    env[i] = Math.max(0.0001, Math.min(1, x * 10) * Math.exp(-x * 3) * walk);
  }
  env[0] = 0.0001; env[n - 1] = 0.0001;
  const layer = (type, lpHz, scale) => {
    const src = c.createBufferSource(); src.buffer = loopBuf(c, type); src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lpHz;
    const g = c.createGain();
    src.connect(f); f.connect(g);
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(dest); }
    else g.connect(dest);
    const e = new Float32Array(n);
    for (let i = 0; i < n; i++) e[i] = Math.max(0.0001, env[i] * peak * scale);
    g.gain.setValueCurveAtTime(e, t, dur);
    src.start(t); src.stop(t + dur + 0.1);
  };
  layer('brown', far ? rand(300, 500) : rand(450, 800), 1);   // audible mid body
  layer('brown', 160, 0.8);                                    // depth for real speakers
  if (!far && Math.random() < 0.65) blip(c, dest, { bp: rand(900, 2200), q: 1.2, gain: rand(0.1, 0.2), decay: rand(0.15, 0.35), rate: rand(0.5, 0.8), pan });
}

// A cricket chirp train: a few rapid high pulses, like one insect answering.
function cricketChirp(c, dest, f0, pan) {
  let out = dest;
  if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; p.connect(dest); out = p; }
  let t = c.currentTime + 0.02;
  const pulses = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < pulses; i++) {
    const osc = c.createOscillator(); osc.type = 'sine'; osc.frequency.value = f0 * rand(0.98, 1.02);
    const g = c.createGain(); osc.connect(g); g.connect(out);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(rand(0.005, 0.012), t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + rand(0.018, 0.028));
    osc.start(t); osc.stop(t + 0.04);
    t += rand(0.03, 0.05);
  }
}

// A distant woodpecker: a rapid series of hollow knocks on one tree.
function woodpecker(c, dest) {
  const pan = rand(-0.7, 0.7);
  const knocks = 5 + Math.floor(Math.random() * 6);
  const gap = rand(0.045, 0.07);
  for (let i = 0; i < knocks; i++) {
    blip(c, dest, { bp: rand(700, 1100), q: 2, gain: rand(0.018, 0.038), decay: 0.012, rate: rand(0.6, 0.9), pan, at: i * gap });
  }
}

// A soft two-note dove coo, low and far away.
function dovecoo(c, dest) {
  let out = dest;
  if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = rand(-0.7, 0.7); p.connect(dest); out = p; }
  const f0 = rand(420, 540);
  let t = c.currentTime + 0.05;
  for (const [dur, drop] of [[0.16, 0.97], [0.3, 0.88]]) {
    const osc = c.createOscillator(); osc.type = 'sine';
    const g = c.createGain(); osc.connect(g); g.connect(out);
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f0 * drop, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.012, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.start(t); osc.stop(t + dur + 0.02);
    t += dur + 0.12;
  }
}

// One full ocean wave: a low rush that builds, breaks bright, then washes out
// as a long darkening hiss (a lowpass sweeping down over the retreat).
function waveEvent(c, dest) {
  const src = c.createBufferSource(); src.buffer = loopBuf(c, 'white'); src.loop = true;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320;
  const g = c.createGain();
  src.connect(f); f.connect(g);
  if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = rand(-0.4, 0.4); g.connect(p); p.connect(dest); }
  else g.connect(dest);
  const t = c.currentTime;
  const build = rand(1.8, 3.2), crash = rand(0.2, 0.4), wash = rand(3.5, 6.5);
  const peak = rand(0.05, 0.1);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak * 0.25, t + build);
  g.gain.exponentialRampToValueAtTime(peak, t + build + crash);
  g.gain.exponentialRampToValueAtTime(0.0001, t + build + crash + wash);
  f.frequency.setValueAtTime(320, t);
  f.frequency.exponentialRampToValueAtTime(rand(2600, 5200), t + build + crash);
  f.frequency.exponentialRampToValueAtTime(420, t + build + crash + wash);
  src.start(t); src.stop(t + build + crash + wash + 0.2);
}

// A little multi-syllable bird call with pitch contours — sounds like a real
// warble instead of a robotic beep. Random species-ish variation per call.
function birdCall(c, dest) {
  let out = dest;
  if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = rand(-0.8, 0.8); p.connect(dest); out = p; }
  let t = c.currentTime + 0.05;
  const syllables = 2 + Math.floor(Math.random() * 3);
  const f0 = rand(2100, 4300);
  for (let i = 0; i < syllables; i++) {
    const osc = c.createOscillator(); osc.type = 'sine';
    const g = c.createGain();
    osc.connect(g); g.connect(out);
    const dur = rand(0.045, 0.11);
    const up = Math.random() > 0.4;
    osc.frequency.setValueAtTime(f0 * rand(0.92, 1.05), t);
    osc.frequency.exponentialRampToValueAtTime(f0 * (up ? rand(1.1, 1.3) : rand(0.75, 0.92)), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(rand(0.015, 0.035), t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.start(t); osc.stop(t + dur + 0.02);
    t += dur + rand(0.04, 0.14);
  }
}

// A faint tone that swells in and out over several seconds (deep space).
function shimmer(c, dest) {
  const osc = c.createOscillator(); osc.type = 'sine'; osc.frequency.value = rand(700, 2000);
  const g = c.createGain();
  osc.connect(g);
  if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = rand(-0.7, 0.7); g.connect(p); p.connect(dest); }
  else g.connect(dest);
  const t = c.currentTime + 0.1, rise = rand(2, 4), fall = rand(3, 5);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(rand(0.006, 0.014), t + rise);
  g.gain.exponentialRampToValueAtTime(0.0001, t + rise + fall);
  osc.start(t); osc.stop(t + rise + fall + 0.1);
}

export function stopAmbiance() {
  generation++;                          // kills any pending event schedulers
  for (const t of timers) clearTimeout(t);
  timers = [];
  for (const n of nodes) { try { n.src?.stop?.(); } catch (e) { /* ignore */ } try { n.osc?.stop?.(); } catch (e) { /* ignore */ } }
  nodes = [];
  if (master) { try { master.disconnect(); } catch (e) { /* ignore */ } master = null; }
  if (audioEl) { try { audioEl.pause(); audioEl.src = ''; } catch (e) { /* ignore */ } audioEl = null; }
  if (audioUrl) { try { URL.revokeObjectURL(audioUrl); } catch (e) { /* ignore */ } audioUrl = null; }
  playingKey = null;
}

// Loop a user-uploaded clip via an <audio> element (handles any format the
// browser supports, including long files, without decoding it all into memory).
async function playCustom(id) {
  try {
    const blob = await getCustomBlob(id);
    if (!blob) return;
    // A newer selection may have superseded this one while we were loading.
    if (currentAmbiance() !== `custom:${id}`) return;
    audioUrl = URL.createObjectURL(blob);
    audioEl = new Audio(audioUrl);
    audioEl.loop = true;
    audioEl.volume = ambianceVolume();
    await audioEl.play().catch(() => {});
  } catch (e) { /* ignore */ }
}

// Start (or switch to) a soundscape. Must be called from a user gesture the
// first time so audio is allowed to play.
export function playAmbiance(key) {
  stopAmbiance();
  if (!key || key === 'off') return;
  playingKey = key;
  if (isCustom(key)) { playCustom(key.slice(7)); return; }
  const c = ac();
  if (!c) return;
  // Everything routes through a master gain: the volume slider controls the
  // whole soundscape, and it eases in over ~0.8s so starting never clicks.
  master = c.createGain();
  master.gain.setValueAtTime(0.0001, c.currentTime);
  master.gain.linearRampToValueAtTime(ambianceVolume(), c.currentTime + 0.8);
  master.connect(c.destination);
  const dest = master;

  if (key === 'rain' || key === 'lightrain') {
    const light = key === 'lightrain';
    // Steady patter bed + distant low rumble of the rain mass…
    const bed = voice(c, dest, { type: 'pink', hp: light ? 500 : 380, lp: light ? 4200 : 6000, gain: light ? 0.035 : 0.07 });
    lfo(c, bed.g.gain, 0.06, light ? 0.006 : 0.012);   // intensity drifts slowly
    voice(c, dest, { type: 'brown', lp: 700, gain: light ? 0.012 : 0.028 });
    // …individual droplet hits, randomly pitched and panned…
    every(light ? 160 : 55, light ? 520 : 170, () =>
      blip(c, dest, { bp: rand(2200, 8000), q: rand(2.5, 6), gain: rand(0.008, light ? 0.03 : 0.05), decay: rand(0.012, 0.04), rate: rand(0.7, 1.4), pan: rand(-0.8, 0.8) }));
    // …and rolling thunder — one early strike, then regularly. Light rain
    // keeps it rarer and further away.
    once(3000, 8000, () => rumble(c, dest, { far: light }));
    every(light ? 25000 : 12000, light ? 60000 : 35000, () => { if (Math.random() < 0.85) rumble(c, dest, { far: light }); });
  } else if (key === 'fire') {
    // The crackle IS the fire — the bed underneath stays soft and airy so it
    // never reads as a thunder-like rumble (small speakers only get the ticks).
    const roar = voice(c, dest, { type: 'brown', lp: 240, gain: 0.03 });    // soft ember glow
    lfo(c, roar.g.gain, 5.3, 0.007);
    lfo(c, roar.g.gain, 0.17, 0.008);
    const flame = voice(c, dest, { type: 'pink', hp: 250, lp: 1600, gain: 0.012 });  // flame movement
    lfo(c, flame.g.gain, 7.1, 0.005);
    voice(c, dest, { type: 'white', hp: 6000, gain: 0.003 });               // faint hiss
    // Dense, prominent wood crackle: sharp snaps, splitting clusters, and
    // deep pop-and-settle events as logs shift. Gains here look large because a
    // narrow bandpass passes only ~15-30% of the burst's energy — after that
    // attenuation the crackle peaks land well ABOVE the soft bed, as they should.
    const snap = (at = 0, pan = rand(-0.6, 0.6)) =>
      blip(c, dest, { bp: rand(2500, 8000), q: rand(3, 7), gain: rand(0.15, 0.4), decay: rand(0.005, 0.018), rate: rand(0.9, 1.8), pan, at });
    every(25, 150, () => {
      const r = Math.random();
      if (r < 0.12) {
        // log pop: a low knock followed by a burst of rapid splitting ticks
        const pan = rand(-0.5, 0.5);
        blip(c, dest, { bp: rand(350, 800), q: 2.5, gain: rand(0.25, 0.45), decay: rand(0.05, 0.12), rate: rand(0.5, 0.9), pan });
        const ticks = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < ticks; i++) snap(rand(0.015, 0.18), pan + rand(-0.15, 0.15));
      } else if (r < 0.45) {
        // double-tick: wood splitting twice in quick succession
        const pan = rand(-0.6, 0.6);
        snap(0, pan); snap(rand(0.02, 0.05), pan);
      } else {
        snap();
      }
    });
  } else if (key === 'waves') {
    // A quiet distant-surf bed so it's never silent between waves…
    const bedW = voice(c, dest, { type: 'brown', lp: 450, gain: 0.018 });
    lfo(c, bedW.g.gain, 0.05, 0.008);
    const foam = voice(c, dest, { type: 'white', hp: 1500, lp: 7000, gain: 0.004 });
    lfo(c, foam.g.gain, 0.073, 0.003);
    // …with actual wave events: build → break → long darkening wash. One rolls
    // in right away, then they keep coming at their own pace (tails overlap).
    waveEvent(c, dest);
    every(5500, 12000, () => waveEvent(c, dest));
  } else if (key === 'space') {
    // Sub-bass felt more than heard + a slowly-beating drone chord…
    const sub = c.createOscillator(); sub.type = 'sine'; sub.frequency.value = 36;
    const sg = c.createGain(); sg.gain.value = 0.022; sub.connect(sg); sg.connect(dest); sub.start();
    nodes.push({ osc: sub, g: sg });
    for (const [f, gn, rate] of [[55, 0.018, 0.05], [82.4, 0.013, 0.033], [110.3, 0.01, 0.021]]) {
      const osc = c.createOscillator(); osc.type = 'sine'; osc.frequency.value = f;
      const g = c.createGain(); g.gain.value = gn; osc.connect(g); g.connect(dest); osc.start();
      nodes.push({ osc, g });
      lfo(c, g.gain, rate, gn * 0.45);   // each partial breathes at its own pace
    }
    // …a resonant solar-wind wash, and the occasional distant shimmer.
    const wind = voice(c, dest, { type: 'brown', lp: 300, q: 3.2, gain: 0.02 });
    lfo(c, wind.lp.frequency, 0.02, 170);
    every(7000, 16000, () => shimmer(c, dest));
  } else if (key === 'forest') {
    // Leaves rustling in gusts (band-swept noise) over low still air…
    const leaves = voice(c, dest, { type: 'white', bp: 4200, q: 0.7, gain: 0.014 });
    lfo(c, leaves.g.gain, 0.09, 0.01);
    lfo(c, leaves.bp.frequency, 0.06, 900);
    voice(c, dest, { type: 'brown', lp: 350, gain: 0.012 });
    // …and a properly-populated wood: frequent varied birdsong, a cricket
    // chorus (two individuals trading chirps from either side), a distant
    // woodpecker now and then, and the occasional soft dove.
    every(1500, 5000, () => { if (Math.random() < 0.85) birdCall(c, dest); });
    const crickets = [{ f: 4300, pan: -0.55 }, { f: 4750, pan: 0.6 }];
    every(500, 1500, () => { const cr = crickets[Math.floor(Math.random() * crickets.length)]; cricketChirp(c, dest, cr.f, cr.pan + rand(-0.1, 0.1)); });
    every(12000, 30000, () => { if (Math.random() < 0.6) woodpecker(c, dest); });
    every(15000, 40000, () => { if (Math.random() < 0.55) dovecoo(c, dest); });
    once(3000, 8000, () => woodpecker(c, dest));   // let the wood introduce itself
  }
}
