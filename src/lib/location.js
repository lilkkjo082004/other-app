// Location services (optional, opt-in). Per the Terms (§12), precise location
// is processed on-device and never sent to our servers: raw coordinates live
// only in this localStorage record. When enabled, a COARSE area label (which
// the user can confirm/edit) is the only thing shared with the AI to tailor
// local suggestions — the exact coordinates never leave the device.

const KEY = 'other_location_v1';

export const locationSupported = () =>
  typeof navigator !== 'undefined' && 'geolocation' in navigator;

export function getLocation() {
  try { return JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem(KEY)) || 'null'); }
  catch (e) { return null; }
}
function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* ignore */ } }
export function clearLocation() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }
export const locationEnabled = () => !!getLocation()?.enabled;

// Best-effort reverse geocode to a city/region label via OpenStreetMap. We send
// only coarsened (~city-level) coordinates and fall back silently on failure.
async function reverseGeocode(lat, lon) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat=${lat}&lon=${lon}`, { headers: { Accept: 'application/json' } });
    if (!r.ok) return null;
    const d = await r.json();
    const a = d.address || {};
    const city = a.city || a.town || a.village || a.county;
    const region = a.state || a.region || a.country;
    return [city, region].filter(Boolean).join(', ') || d.name || null;
  } catch (e) { return null; }
}

// Ask the browser for the current position, store it on-device, and resolve the
// saved record. Precise coords are kept locally; a coarse label is derived.
export function requestLocation() {
  return new Promise((resolve, reject) => {
    if (!locationSupported()) { reject(new Error('Location is not available in this browser')); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude, lon = pos.coords.longitude;
        const clat = Math.round(lat * 10) / 10, clon = Math.round(lon * 10) / 10; // ~city level
        const label = await reverseGeocode(clat, clon);
        const rec = { enabled: true, lat, lon, label: label || null, updatedAt: Date.now() };
        save(rec);
        resolve(rec);
      },
      (err) => reject(new Error(err && err.code === 1 ? 'Location permission was denied' : 'Could not determine your location')),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  });
}

// Manually set/confirm the area label (no device permission needed).
export function setLabel(label) {
  const cur = getLocation() || {};
  save({ ...cur, enabled: true, label: (label || '').trim() || null, updatedAt: Date.now() });
}

// Coarse, human-readable area for the UI (never exposes precise coords).
export function locationLabel() {
  const l = getLocation();
  if (!l || !l.enabled) return null;
  if (l.label) return l.label;
  if (typeof l.lat === 'number') return `near ${Math.round(l.lat)}°, ${Math.round(l.lon)}°`;
  return 'your area';
}

// ── Favorite places + on-device proximity nudges ──────────────────────────
// Saved spots and proximity checks happen ENTIRELY on-device (ToS §12): a spot's
// coordinates live only in this localStorage record and are compared to the
// current position locally. Nothing here is ever sent to our servers.
const FAV_KEY = 'other_fav_places_v1';
const NUDGE_KEY = 'other_place_nudges_v1';

export function getFavPlaces() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch (e) { return []; }
}
function saveFavs(a) { try { localStorage.setItem(FAV_KEY, JSON.stringify(a)); } catch (e) { /* ignore */ } }
export function removeFavPlace(id) { saveFavs(getFavPlaces().filter((p) => p.id !== id)); }

// Resolve the device's current coordinates (kept in memory only).
function currentCoords() {
  return new Promise((resolve, reject) => {
    if (!locationSupported()) { reject(new Error('Location is not available')); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) => reject(new Error(e && e.code === 1 ? 'Location permission was denied' : 'Could not determine your location')),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  });
}

function addFavoriteAt(lat, lon, name, extra = {}) {
  const place = { id: 'p_' + Math.random().toString(36).slice(2, 9), name: (name || 'A favorite spot').trim() || 'A favorite spot', lat, lon, createdAt: Date.now(), ...extra };
  saveFavs([...getFavPlaces(), place]);
  return place;
}

// Save the spot the user is standing in right now as a named favorite.
export async function addCurrentAsFavorite(name) {
  const cur = await currentCoords();
  return addFavoriteAt(cur.lat, cur.lon, name);
}

function haversine(la1, lo1, la2, lo2) {
  const R = 6371000, t = Math.PI / 180;
  const dLa = (la2 - la1) * t, dLo = (lo2 - lo1) * t;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * t) * Math.cos(la2 * t) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const nearestFavorite = (cur, thresholdM) => {
  let best = null;
  for (const f of getFavPlaces()) {
    if (typeof f.lat !== 'number') continue;
    const d = haversine(cur.lat, cur.lon, f.lat, f.lon);
    if (d <= thresholdM && (!best || d < best.distance)) best = { place: f, distance: d };
  }
  return best;
};

// ── Auto-detected frequent spots ──────────────────────────────────────────
// We quietly cluster repeated visits on-device. When a place is visited enough
// distinct times in a month, it's auto-saved as a favorite. All of this is local.
const VISIT_KEY = 'other_visit_clusters_v1';
const CLUSTER_RADIUS = 120;            // m — same place
const VISIT_GAP = 3 * 60 * 60 * 1000;  // a new "visit" must be ≥3h after the last
const MONTH = 30 * 24 * 60 * 60 * 1000;
const AUTO_THRESHOLD = 4;              // "more than a few times in a month"

function getClusters() { try { return JSON.parse(localStorage.getItem(VISIT_KEY) || '[]'); } catch (e) { return []; } }
function saveClusters(a) { try { localStorage.setItem(VISIT_KEY, JSON.stringify(a)); } catch (e) { /* ignore */ } }
const isFavoriteNear = (lat, lon) => getFavPlaces().some((f) => typeof f.lat === 'number' && haversine(lat, lon, f.lat, f.lon) < CLUSTER_RADIUS);

// Record the current position as a visit; auto-promote a frequented cluster to a
// favorite. Returns the newly auto-added favorite, or null.
function recordVisit(cur) {
  const now = Date.now();
  let clusters = getClusters();
  for (const c of clusters) c.visits = (c.visits || []).filter((t) => now - t < MONTH + 6 * 24 * 60 * 60 * 1000);
  clusters = clusters.filter((c) => c.visits.length > 0);

  let cl = null, best = CLUSTER_RADIUS;
  for (const c of clusters) { const d = haversine(cur.lat, cur.lon, c.lat, c.lon); if (d < best) { best = d; cl = c; } }
  if (!cl) {
    cl = { id: 'c_' + Math.random().toString(36).slice(2, 9), lat: cur.lat, lon: cur.lon, visits: [now], promoted: false };
    clusters.push(cl);
  } else if (now - Math.max(...cl.visits) >= VISIT_GAP) {
    cl.visits.push(now);
    cl.lat += (cur.lat - cl.lat) * 0.2; // ease centroid toward the new fix
    cl.lon += (cur.lon - cl.lon) * 0.2;
  }

  let promoted = null;
  if (!cl.promoted) {
    const recent = cl.visits.filter((t) => now - t < MONTH).length;
    if (recent >= AUTO_THRESHOLD && !isFavoriteNear(cl.lat, cl.lon)) {
      promoted = addFavoriteAt(cl.lat, cl.lon, 'A spot you visit often', { auto: true });
      cl.promoted = true;
    }
  }
  saveClusters(clusters);
  return promoted;
}

// One geolocation read → both: nearest saved favorite (for a nudge) and any
// place auto-promoted to a favorite from repeat visits. Entirely on-device.
export async function scanLocation(nearThresholdM = 250) {
  if (!locationEnabled()) return { near: null, auto: null };
  let cur;
  try { cur = await currentCoords(); } catch (e) { return { near: null, auto: null }; }
  const near = getFavPlaces().length ? nearestFavorite(cur, nearThresholdM) : null;
  const auto = recordVisit(cur);
  return { near, auto };
}

// Current coords for centering a maps search, or null if location is off. The
// coords are used only to build an external maps link the user chooses to open.
export async function mapsCoords() {
  if (!locationEnabled()) return null;
  try { return await currentCoords(); } catch (e) { return null; }
}

// "Find nearby" categories. Each hands off to the device's maps app — the maps
// provider does the place lookup; our servers never see the user's location.
export const PLACE_CATEGORIES = [
  { key: 'er', label: 'Emergency room', term: 'emergency room', icon: '🏥', urgent: true },
  { key: 'urgent', label: 'Urgent care', term: 'urgent care', icon: '➕', urgent: true },
  { key: 'mental', label: 'Therapist / mental health', term: 'therapist mental health clinic', icon: '🧠' },
  { key: 'abortion', label: 'Abortion clinic', term: 'abortion clinic', icon: '🩺' },
  { key: 'pharmacy', label: 'Pharmacy', term: 'pharmacy', icon: '💊' },
  { key: 'grocery', label: 'Grocery store', term: 'grocery store', icon: '🛒' },
  { key: 'auto', label: 'Auto repair', term: 'auto repair shop', icon: '🔧' },
];

// Build a universal Google Maps search URL (works in browser + the maps apps).
export function mapsSearchUrl(term, coords) {
  const q = coords ? `${term} near ${coords.lat.toFixed(4)},${coords.lon.toFixed(4)}` : `${term} near me`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

// Debounce so we don't nudge for the same spot repeatedly.
export function shouldNudgePlace(id, withinMs = 3 * 60 * 60 * 1000) {
  try { const m = JSON.parse(localStorage.getItem(NUDGE_KEY) || '{}'); return !(m[id] && Date.now() - m[id] < withinMs); } catch (e) { return true; }
}
export function markPlaceNudged(id) {
  try { const m = JSON.parse(localStorage.getItem(NUDGE_KEY) || '{}'); m[id] = Date.now(); localStorage.setItem(NUDGE_KEY, JSON.stringify(m)); } catch (e) { /* ignore */ }
}

// Prompt block injected into a companion's system prompt. Shares only the coarse
// area label, never the precise coordinates.
export function locationBlock(name) {
  const l = getLocation();
  if (!l || !l.enabled) return '';
  const who = name || 'The user';
  const where = l.label || (typeof l.lat === 'number' ? `approximately ${Math.round(l.lat)}°, ${Math.round(l.lon)}°` : 'their local area');
  return `\nLOCATION: ${who} is in or near ${where}. When it's genuinely relevant, you may offer location-flavored ideas — local activities, kinds of places to go, things to do nearby. Keep suggestions general, mention once that recommendations are algorithmic and worth verifying, and never claim to know their exact address or to be tracking them.`;
}
