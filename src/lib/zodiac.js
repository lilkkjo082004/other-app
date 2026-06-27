// Multi-system astrology engine: Western sun sign, Chinese zodiac + element,
// numerology life path, and Western compatibility for companion matching.
export const ZODIAC = {
  aries: { sym: '♈', el: 'Fire', trait: 'Bold & driven' },
  taurus: { sym: '♉', el: 'Earth', trait: 'Grounded & loyal' },
  gemini: { sym: '♊', el: 'Air', trait: 'Curious & expressive' },
  cancer: { sym: '♋', el: 'Water', trait: 'Intuitive & nurturing' },
  leo: { sym: '♌', el: 'Fire', trait: 'Radiant & generous' },
  virgo: { sym: '♍', el: 'Earth', trait: 'Analytical & kind' },
  libra: { sym: '♎', el: 'Air', trait: 'Harmonious & fair' },
  scorpio: { sym: '♏', el: 'Water', trait: 'Intense & perceptive' },
  sagittarius: { sym: '♐', el: 'Fire', trait: 'Adventurous & free' },
  capricorn: { sym: '♑', el: 'Earth', trait: 'Ambitious & steady' },
  aquarius: { sym: '♒', el: 'Air', trait: 'Visionary & independent' },
  pisces: { sym: '♓', el: 'Water', trait: 'Dreamy & empathetic' },
};

export const COMPAT = {
  aries: ['leo', 'sagittarius', 'gemini', 'aquarius'],
  taurus: ['virgo', 'capricorn', 'cancer', 'pisces'],
  gemini: ['libra', 'aquarius', 'aries', 'leo'],
  cancer: ['scorpio', 'pisces', 'taurus', 'virgo'],
  leo: ['aries', 'sagittarius', 'gemini', 'libra'],
  virgo: ['taurus', 'capricorn', 'cancer', 'scorpio'],
  libra: ['gemini', 'aquarius', 'leo', 'sagittarius'],
  scorpio: ['cancer', 'pisces', 'virgo', 'capricorn'],
  sagittarius: ['aries', 'leo', 'libra', 'aquarius'],
  capricorn: ['taurus', 'virgo', 'scorpio', 'pisces'],
  aquarius: ['gemini', 'libra', 'aries', 'sagittarius'],
  pisces: ['cancer', 'scorpio', 'taurus', 'capricorn'],
};

const CNA = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];
const CNE = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];

// Vedic / sidereal: the 12 rashis (sign keys, Aries-first) and 27 nakshatras.
const SIGN_KEYS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha',
  'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];
const SIDEREAL_MONTH = 27.321661; // days for one sidereal lunar orbit

// Approximate Vedic moon sign (rashi) + nakshatra from the date alone. A precise
// reading needs birth time and place; this is a deterministic mean-moon estimate
// for flavor, surfaced as "approximate" in the UI.
export function getVedic(dob) {
  const t = Date.parse(dob + 'T12:00:00Z');
  if (Number.isNaN(t)) return null;
  const days = (t - Date.parse('2000-01-01T12:00:00Z')) / 86400000;
  // Mean sidereal moon longitude (epoch offset chosen so 2000-01-01 ≈ 211.7°).
  let lon = (211.7 + (days / SIDEREAL_MONTH) * 360) % 360;
  if (lon < 0) lon += 360;
  const rashi = SIGN_KEYS[Math.floor(lon / 30) % 12];
  const nakshatra = NAKSHATRAS[Math.floor(lon / (360 / 27)) % 27];
  return { rashi, rashiData: ZODIAC[rashi], nakshatra, approximate: true };
}

export function getWZ(m, d) {
  if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return 'aries';
  if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return 'taurus';
  if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return 'gemini';
  if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return 'cancer';
  if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return 'leo';
  if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return 'virgo';
  if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return 'libra';
  if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return 'scorpio';
  if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return 'sagittarius';
  if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return 'capricorn';
  if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return 'aquarius';
  return 'pisces';
}

export function getUserAstro(dob) {
  const [y, m, d] = dob.split('-').map(Number);
  const w = getWZ(m, d);
  const lifePath = (() => {
    let s = String(m) + String(d) + String(y);
    while (s.length > 1 && s !== '11' && s !== '22') {
      s = String([...s].reduce((a, c) => a + parseInt(c, 10), 0));
    }
    return s;
  })();
  return {
    western: w,
    westernData: ZODIAC[w],
    chinese: CNA[(y - 4) % 12],
    chineseElement: CNE[Math.floor(((y - 4) % 10) / 2)],
    lifePath,
    compatible: COMPAT[w],
    vedic: getVedic(dob),
  };
}

export function pickSigns(userSign) {
  return [...COMPAT[userSign]].sort(() => Math.random() - 0.5).slice(0, 3);
}

export const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
