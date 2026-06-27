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
  };
}

export function pickSigns(userSign) {
  return [...COMPAT[userSign]].sort(() => Math.random() - 0.5).slice(0, 3);
}

export const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
