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

// Prompt block injected into a companion's system prompt. Shares only the coarse
// area label, never the precise coordinates.
export function locationBlock(name) {
  const l = getLocation();
  if (!l || !l.enabled) return '';
  const who = name || 'The user';
  const where = l.label || (typeof l.lat === 'number' ? `approximately ${Math.round(l.lat)}°, ${Math.round(l.lon)}°` : 'their local area');
  return `\nLOCATION: ${who} is in or near ${where}. When it's genuinely relevant, you may offer location-flavored ideas — local activities, kinds of places to go, things to do nearby. Keep suggestions general, mention once that recommendations are algorithmic and worth verifying, and never claim to know their exact address or to be tracking them.`;
}
