// Smoke: Settings → Notifications exposes the two notification-type toggles
// (event/task reminders + companion check-ins) when push is available + authed,
// and toggling one persists into the synced pushSchedule.types.
import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';
const root = '/home/user/other-app/dist';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); let f = join(root, p); if (!existsSync(f) || statSync(f).isDirectory()) f = join(root, 'index.html'); res.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream' }); res.end(readFileSync(f)); });
await new Promise((r) => server.listen(8076, r));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const context = await browser.newContext();
await context.grantPermissions(['notifications']);
const page = await context.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));

// Keep the app fully local: fail any backend call so pull/subscribe degrade.
await page.route('**/*workers.dev/**', (r) => r.abort());

// Make isSubscribed() report true without a real push service, so the
// notification-type toggles (gated on an active subscription) render.
await page.addInitScript(() => {
  try {
    navigator.serviceWorker.getRegistration = async () => ({
      pushManager: { getSubscription: async () => ({ endpoint: 'https://push.example/x' }) },
    });
  } catch (e) { /* ignore */ }
});
await page.addInitScript(() => {
  const comp = { id: 'c1', name: 'Coral', pronouns: 'they/them', zodiac: 'pisces', personality: 'warm', quirk: 'x', color: { primary: '#7c5bf5', glow: '#7c5bf559', name: 'x' }, colorName: 'x', status: 'awake', apparentAge: 'peer', voiceIdx: 0, purchased: true, bornAt: 1750000000000 };
  const astro = { western: 'leo', westernData: { sym: '♌', el: 'Fire', trait: 'x' }, chinese: 'Pig', chineseElement: 'Wood', lifePath: '7', compatible: ['aries'], vedic: { rashi: 'cancer', rashiData: { sym: '♋', el: 'Water', trait: 'x' }, nakshatra: 'Pushya', approximate: true } };
  localStorage.setItem('other_voicenote_at', '9999999999999'); localStorage.setItem('other_seasonal_seen', 'sea-summer-2026');
  localStorage.setItem('other_token', 'tok_authed'); localStorage.setItem('other_email', 'sam@example.com');
  // Pretend push is already subscribed so the type toggles + schedule show.
  localStorage.setItem('other_session_v1', JSON.stringify({
    profile: { name: 'Sam', dob: '1995-08-05', ageGroup: 'adult', ageVerified: true, astrology: astro },
    companions: [comp], chatMode: 'c1', autoSpeak: false,
    pushSchedule: { times: ['09:00'], tz: 'UTC', tone: 'standard', types: {} },
    messages: [{ role: 'assistant', companion: comp, content: 'hey', ts: 1750000000000 }],
  }));
});

await page.goto('http://localhost:8076/');
await page.waitForTimeout(1200);
const chatTile = page.locator('button:has-text("Chat")').first();
if (await chatTile.count()) { await chatTile.click().catch(() => {}); await page.waitForTimeout(400); }
const ack = page.locator('div[role=dialog] button:has-text("I understand")');
if (await ack.count()) { await ack.first().click().catch(() => {}); await page.waitForTimeout(300); }

await page.locator('button[aria-label="Chat options"], button:has-text("☰")').first().click().catch(() => {});
await page.waitForTimeout(200);
await page.locator('button:has-text("Settings")').first().click();
await page.waitForTimeout(500);

const eventsToggle = page.locator('[aria-label="Event & task reminders"]');
const checkinToggle = page.locator('[aria-label="Companion check-ins"][role="switch"]');
console.log('event reminders toggle present:', await eventsToggle.count());
console.log('check-ins toggle present:', await checkinToggle.count());

if (await eventsToggle.count()) {
  await eventsToggle.first().click();
  await page.waitForTimeout(300);
  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('other_session_v1')).pushSchedule.types.events);
  console.log('toggling events persisted (false):', persisted === false);
}

console.log('errors:', errs.slice(0, 4).join(' | ') || 'NONE');
await browser.close(); server.close();
