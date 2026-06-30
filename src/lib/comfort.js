// Comfort / sensory accommodations. Calm Mode is a single low-stimulation
// switch: it stops the drifting cosmic animations, dims the moving background,
// and mutes auto-speak — for users who find motion/sound overwhelming. The flag
// lives in localStorage and is applied as a class on <html> so the global CSS
// (theme.js) can respond; nothing else needs to re-render.
const KEY = 'other_calm';

export function calmEnabled() {
  try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
}

function apply(on) {
  try { document.documentElement.classList.toggle('other-calm', !!on); } catch (e) { /* SSR/no-DOM */ }
}

export function setCalm(on) {
  try { on ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY); } catch (e) { /* private mode */ }
  apply(on);
}

// Call once at startup so a returning user lands straight into Calm Mode.
export function initCalm() { apply(calmEnabled()); }
