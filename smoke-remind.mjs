// Smoke: a companion proactively reminds the user about an imminent calendar
// event on opening the chat (Google event ~40 min out, mocked API).
import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';
const root = '/home/user/other-app/dist';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); let f = join(root, p); if (!existsSync(f) || statSync(f).isDirectory()) f = join(root, 'index.html'); res.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream' }); res.end(readFileSync(f)); });
await new Promise((r) => server.listen(8077, r));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));

await page.route('**/*workers.dev/**', (r) => r.abort());
await page.route('https://www.googleapis.com/**', (r) => r.fulfill({ json: { items: [
  { summary: 'Dentist appointment', start: { dateTime: new Date(Date.now() + 40 * 60000).toISOString() } },
] } }));

await page.addInitScript(() => {
  const comp = { id: 'c1', name: 'Coral', pronouns: 'they/them', zodiac: 'pisces', personality: 'warm', quirk: 'x', color: { primary: '#7c5bf5', glow: '#7c5bf559', name: 'x' }, colorName: 'x', status: 'awake', apparentAge: 'peer', voiceIdx: 0, purchased: true, bornAt: 1750000000000 };
  const astro = { western: 'leo', westernData: { sym: '♌', el: 'Fire', trait: 'x' }, chinese: 'Pig', chineseElement: 'Wood', lifePath: '7', compatible: ['aries'], vedic: { rashi: 'cancer', rashiData: { sym: '♋', el: 'Water', trait: 'x' }, nakshatra: 'Pushya', approximate: true } };
  localStorage.setItem('other_voicenote_at', '9999999999999'); localStorage.setItem('other_seasonal_seen', 'sea-summer-2026');
  localStorage.setItem('other_gcal_tok', JSON.stringify({ token: 'tok_test', exp: Date.now() + 3500 * 1000 }));
  localStorage.setItem('other_session_v1', JSON.stringify({
    profile: { name: 'Sam', dob: '1995-08-05', ageGroup: 'adult', ageVerified: true, astrology: astro },
    companions: [comp], chatMode: 'c1', autoSpeak: false,
    messages: [{ role: 'assistant', companion: comp, content: 'hey Sam', ts: 1750000000000 }],
  }));
});

await page.goto('http://localhost:8077/');
await page.waitForTimeout(1200);
const chatTile = page.locator('button:has-text("Chat")').first();
if (await chatTile.count()) { await chatTile.click().catch(() => {}); await page.waitForTimeout(400); }
const ack = page.locator('div[role=dialog] button:has-text("I understand")');
if (await ack.count()) { await ack.first().click().catch(() => {}); await page.waitForTimeout(300); }

// The reminder effect fires ~8s after mount; wait it out.
await page.waitForTimeout(12000);
const dentist = await page.locator('text=/[Dd]entist/').count();
console.log('reminder mentions the event:', dentist > 0);
console.log('errors:', errs.slice(0, 4).join(' | ') || 'NONE');
await browser.close(); server.close();
