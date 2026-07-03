// Smoke: calendar integration — one-tap Google add on an action card,
// upcoming-events fetch, and the Settings Calendar section (both states).
import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';
const root = '/home/user/other-app/dist';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); let f = join(root, p); if (!existsSync(f) || statSync(f).isDirectory()) f = join(root, 'index.html'); res.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream' }); res.end(readFileSync(f)); });
await new Promise((r) => server.listen(8078, r));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));

// Mock the Google Calendar API; block the real backend.
let inserted = null;
await page.route('**/*workers.dev/**', (r) => r.abort());
await page.route('https://www.googleapis.com/**', async (r) => {
  const req = r.request();
  if (req.method() === 'POST') { inserted = JSON.parse(req.postData() || '{}'); return r.fulfill({ json: { id: 'evt1', status: 'confirmed' } }); }
  return r.fulfill({ json: { items: [
    { summary: 'Dentist', start: { dateTime: new Date(Date.now() + 86400000).toISOString() } },
    { summary: 'Trip', start: { date: '2026-07-06' } },
  ] } });
});

await page.addInitScript(() => {
  const comp = { id: 'c1', name: 'Coral', pronouns: 'they/them', zodiac: 'pisces', personality: 'warm', quirk: 'x', color: { primary: '#7c5bf5', glow: '#7c5bf559', name: 'x' }, colorName: 'x', status: 'awake', apparentAge: 'peer', voiceIdx: 0, purchased: true, bornAt: 1750000000000 };
  const astro = { western: 'leo', westernData: { sym: '♌', el: 'Fire', trait: 'x' }, chinese: 'Pig', chineseElement: 'Wood', lifePath: '7', compatible: ['aries'], vedic: { rashi: 'cancer', rashiData: { sym: '♋', el: 'Water', trait: 'x' }, nakshatra: 'Pushya', approximate: true } };
  localStorage.setItem('other_voicenote_at', '9999999999999'); localStorage.setItem('other_seasonal_seen', 'sea-summer-2026');
  // Simulate a connected Google account: a fresh stored access token.
  localStorage.setItem('other_gcal_tok', JSON.stringify({ token: 'tok_test', exp: Date.now() + 3500 * 1000 }));
  const action = { type: 'calendar', title: 'Coffee with Alex', start: Date.now() + 3 * 3600000 };
  localStorage.setItem('other_session_v1', JSON.stringify({
    profile: { name: 'Sam', dob: '1995-08-05', ageGroup: 'adult', ageVerified: true, astrology: astro },
    companions: [comp], chatMode: 'c1', autoSpeak: false,
    messages: [{ role: 'assistant', companion: comp, content: 'Locked in!', ts: 1750000000000, action }],
  }));
});

await page.goto('http://localhost:8078/');
await page.waitForTimeout(1200);
for (const l of ['I understand', 'Got it', 'Okay']) { const b = page.locator(`div[role=dialog] button:has-text("${l}")`); if (await b.count()) { await b.first().click().catch(() => {}); break; } }
await page.waitForTimeout(400);

// Restored sessions land on Home — enter the chat first.
const chatTile = page.locator('button:has-text("Chat")').first();
if (await chatTile.count()) { await chatTile.click().catch(() => {}); await page.waitForTimeout(500); }
// The AI-disclosure modal shows on entering chat — dismiss it.
const ack = page.locator('div[role=dialog] button:has-text("I understand")');
if (await ack.count()) { await ack.first().click().catch(() => {}); await page.waitForTimeout(300); }

// 1) Action card shows the one-tap Google button (connected state)
const addBtn = page.locator('button:has-text("Add to Google Calendar")');
console.log('one-tap button:', await addBtn.count());
await addBtn.first().click();
await page.waitForTimeout(500);
console.log('added state:', await page.locator('button:has-text("✓ Added to Google")').count());
console.log('insert summary:', inserted?.summary);
console.log('apple secondary:', await page.locator('button:has-text("Apple")').count());

// 2) Settings → Calendar section
await page.locator('button[aria-label="Chat options"], button:has-text("☰")').first().click().catch(() => {});
await page.waitForTimeout(200);
await page.locator('button:has-text("Settings")').first().click();
await page.waitForTimeout(400);
console.log('calendar section:', await page.locator('text=Calendar').count() > 0);
console.log('gcal card (unconfigured hint):', await page.locator('text=/Not available on this build yet/').count());
console.log('apple card:', await page.locator('text=Apple Calendar & others').count());
console.log('ics note:', await page.locator('text=/\\.ics files that open in any calendar app/').count());

console.log('errors:', errs.slice(0, 4).join(' | ') || 'NONE');
await browser.close(); server.close();
