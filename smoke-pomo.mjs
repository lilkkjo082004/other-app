import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';
const root='/home/user/other-app/dist';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);let f=join(root,p);if(!existsSync(f)||statSync(f).isDirectory())f=join(root,'index.html');res.writeHead(200,{'content-type':types[extname(f)]||'application/octet-stream'});res.end(readFileSync(f));});
await new Promise(r=>server.listen(8079,r));
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage();
const errs=[];page.on('pageerror',e=>errs.push(e.message));
await page.addInitScript(()=>{
  const comp={id:'c1',name:'Coral',pronouns:'they/them',zodiac:'pisces',personality:'warm',quirk:'x',color:{primary:'#7c5bf5',glow:'#7c5bf559',name:'x'},colorName:'x',status:'awake',apparentAge:'peer',voiceIdx:0,purchased:true,bornAt:1750000000000};
  const astro={western:'leo',westernData:{sym:'♌',el:'Fire',trait:'x'},chinese:'Pig',chineseElement:'Wood',lifePath:'7',compatible:['aries'],vedic:{rashi:'cancer',rashiData:{sym:'♋',el:'Water',trait:'x'},nakshatra:'Pushya',approximate:true}};
  localStorage.setItem('other_voicenote_at','9999999999999');localStorage.setItem('other_seasonal_seen','sea-summer-2026');
  localStorage.setItem('other_session_v1',JSON.stringify({profile:{name:'Sam',dob:'1995-08-05',ageGroup:'adult',ageVerified:true,astrology:astro},companions:[comp],messages:[{role:'assistant',companion:comp,content:'hi',ts:1750000000000}],chatMode:'group',autoSpeak:false}));
});
await page.clock.install();
await page.goto('http://localhost:8079/');
await page.clock.runFor(3000);await page.waitForTimeout(400);
for(const l of['I understand','Got it','Okay']){const b=page.locator(`div[role=dialog] button:has-text("${l}")`);if(await b.count()){await b.first().click().catch(()=>{});break;}}
await page.waitForTimeout(200);
await page.locator('button[aria-label="Chat options"], button:has-text("☰")').first().click().catch(()=>{});await page.waitForTimeout(150);
await page.locator('button:has-text("Cowork station")').first().click();await page.waitForTimeout(200);
await page.locator('button:has-text("Pomodoro")').first().click();await page.waitForTimeout(100);
await page.locator('button:has-text("Start coworking")').first().click();await page.waitForTimeout(200);
console.log('focus round 1:', await page.locator('text=/Focus · round 1/').count());
await page.clock.runFor(25*60*1000+2000);await page.waitForTimeout(300);
console.log('now on Break:', await page.locator('text=/Break/').first().count());
await page.clock.runFor(5*60*1000+2000);await page.waitForTimeout(300);
console.log('focus round 2:', await page.locator('text=/Focus · round 2/').count());
await page.locator('button:has-text("End session")').first().click();await page.waitForTimeout(200);
console.log('done shows rounds:', await page.locator('text=/across 2 rounds/').count());
// verify chat lines
await page.locator('button:has-text("Done")').first().click().catch(()=>{});await page.waitForTimeout(300);
console.log('break line posted:', await page.locator('text=/Take 5/').count());
console.log('back-to-focus line:', await page.locator('text=/Break’s over/').count());
console.log('errors:', errs.slice(0,4).join(' | ')||'NONE');
await browser.close();server.close();
