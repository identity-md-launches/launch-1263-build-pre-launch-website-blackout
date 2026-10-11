import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { startPreview, dependency } from './preview-server.mjs';
const { chromium, expect } = dependency('@playwright/test');
const { default: AxeBuilder } = dependency('@axe-core/playwright');
const preview = await startPreview();
const key='blackout.demo.v3';
const report={runAt:new Date().toISOString(),export:'dist/',subpath:'/preview/',checks:[],failures:[],consoleErrors:[],failedRequests:[],viewports:[],accessibility:[],screenshots:[],contrast:[]};
let browser;
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
const goto=async(page,route='')=>{await page.goto(preview.url+'#/'+route);await page.locator('main h1').waitFor();await page.evaluate(()=>document.fonts.ready);};
const skip=async page=>{if(await page.locator('#skip-guide').count())await page.locator('#skip-guide').click();};
const tools=async page=>{await page.locator('#demo-tools').evaluate(el=>el.open=true);};
const dismiss=async page=>{if(await page.locator('#dismiss-notice').isVisible())await page.locator('#dismiss-notice').click();};
const seed=async(page,change)=>{const state=await saved(page);change(state);await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key,state});await page.reload();await expect(page.locator('#storage-warning')).toBeHidden();};
const shot=async(page,name)=>{const path=`reports/screenshots/tabs/${name}.png`;await page.screenshot({path,fullPage:false});report.screenshots.push(path);};
const nav=async(page,name)=>{await page.locator(`[data-route="${name}"]`).click();await expect(page.locator(`[data-route="${name}"]`)).toHaveAttribute('aria-current','page');};
async function scenario(name,callback,viewport={width:1440,height:1000}){
 const context=await browser.newContext({viewport,reducedMotion:'reduce'});const page=await context.newPage();page.setDefaultTimeout(7000);
 page.on('pageerror',e=>report.consoleErrors.push({name,message:e.message}));page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push({name,message:m.text()});});
 page.on('requestfailed',r=>report.failedRequests.push({name,url:r.url(),message:r.failure()?.errorText}));page.on('response',r=>{if(r.status()>=400)report.failedRequests.push({name,url:r.url(),status:r.status()});});
 let timeout;
 try{await page.clock.install({time:new Date('2026-10-11T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-11T12:00:01Z'));await Promise.race([callback(page,context),new Promise((_,reject)=>timeout=setTimeout(()=>reject(new Error('90s scenario budget exceeded')),90_000))]);report.checks.push(name);console.log('PASS '+name);}
 catch(e){report.failures.push({name,message:e.message});console.error('FAIL '+name+': '+e.message.slice(0,1600));await page.screenshot({path:`test/scratch/failure-${report.failures.length}.png`}).catch(()=>{});}
 finally{clearTimeout(timeout);await context.close();}
}
try{
 await mkdir('reports/screenshots/tabs',{recursive:true});await mkdir('test/scratch',{recursive:true});browser=await chromium.launch({headless:true});
 await scenario('390px landing: product, main action, beta label and metadata',async page=>{
  await goto(page);for(const selector of ['#hero-title','.hero-description','.hero-actions .primary','.demo-strip span']){const box=await page.locator(selector).boundingBox();assert(box.y>=0&&box.y+box.height<=844,`${selector} outside first screen`);}
  for(const name of ['description','og:title','og:image'])assert(await page.locator(`meta[${name.includes(':')?'property':'name'}="${name}"]`).getAttribute('content'));
  assert(await page.locator('link[rel=icon]').getAttribute('href'));assert(await page.evaluate(()=>document.fonts.check('16px Pixel') && document.fonts.check('16px Mono')));await shot(page,'landing-390');
 },{width:390,height:844});
 await scenario('Mobile onboarding: open, reveal, install, epoch, claim; skip persists and docs replay works',async page=>{
  await goto(page,'farm');await expect(page.locator('.onboarding')).toContainText('1 / 4');await shot(page,'onboarding-390');
  await page.locator('#guide-action').click();await expect(page.locator('#open-pack')).toHaveClass(/guide-highlight/);await shot(page,'packs-390');await page.locator('#guide-action').click();await page.locator('#guide-action').click();await expect(page.locator('.onboarding')).toContainText('2 / 4');
  await dismiss(page);await page.locator('#guide-action').click();await page.locator('#item-item-2').click();await shot(page,'inventory-menu-390');await page.locator('#install-item-2').click();await expect(page.locator('.onboarding')).toContainText('3 / 4');
  await tools(page);await page.locator('#next-epoch').click();await expect(page.locator('.onboarding')).toContainText('4 / 4');await page.locator('#claim').click();await expect(page.locator('.onboarding')).toHaveCount(0);assert.equal((await saved(page)).unclaimed,0);
  await nav(page,'docs');await page.locator('#replay-guide').click();await expect(page.locator('.onboarding')).toContainText('1 / 4');await page.locator('#skip-guide').click();await page.reload();await expect(page.locator('.onboarding')).toHaveCount(0);
 },{width:390,height:844});
 await scenario('Six focused routes share the HUD and keep demo controls collapsed',async page=>{
  await goto(page,'farm');await skip(page);
  const expected={farm:['.mining-room','.inventory'],packs:['#open-pack','#cards'],city:['.district-map','#lobby','#letter-history'],season:['.leaderboard','#season-claim','.deadline'],wallet:['#withdraw-form','#referral-link','#nft-starter'],docs:['.docs-body','#replay-guide']};
  for(const [route,selectors] of Object.entries(expected)){await nav(page,route);for(const selector of selectors)await expect(page.locator(selector).first()).toBeVisible();for(const selector of ['#claim','#balance','#total-hash','#sync','#epoch-timer','.level-box'])await expect(page.locator(selector)).toBeVisible();assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('#demo-tools').getAttribute('open'),null);if(route!=='farm')assert.equal(await page.locator('.mining-room').count(),0);if(route!=='wallet')assert.equal(await page.locator('#withdraw-form').count(),0);}
 });
 await scenario('Item menus: install/remove, repair, scrap confirmation and capacity recovery',async page=>{
  await goto(page,'farm');await skip(page);await page.locator('#item-item-2').click();await page.locator('#install-item-2').click();await expect(page.locator('#slot-0-1')).toContainText('Power Supply');
  await page.locator('#slot-0-1').click();await page.locator('#remove-item-2').click();await expect(page.locator('#item-item-2')).toBeVisible();await page.locator('#item-item-3').click();await page.locator('#scrap-item-3').click();await page.locator('#cancel-confirm').click();assert((await saved(page)).inventory.some(i=>i.id==='item-3'));
  await page.locator('#scrap-item-3').click();await page.locator('#accept-confirm').click();assert(!(await saved(page)).inventory.some(i=>i.id==='item-3'));
  await seed(page,f=>{f.inventory[0].durability=0;});await expect(page.locator('.mining-warnings')).toContainText('broken item');await page.locator('[data-fix="broken"]').click();await expect(page.locator('#slot-0-0')).toBeFocused();await page.keyboard.press('Enter');await page.locator('#repair-item-1').click();assert.equal((await saved(page)).inventory[0].durability,100);await expect(page.locator('.mining-warnings')).toHaveCount(0);
  await page.locator('#inventory-space summary').click();const before=await saved(page);await page.locator('#expand').click();assert.equal((await saved(page)).inventoryCapacity,before.inventoryCapacity+5);
 });
 await scenario('Overclock previews all five levels, rising costs, wear and power; keyboard escape returns focus',async page=>{
  await goto(page,'farm');await skip(page);await tools(page);await page.locator('#refill-demo').click();await page.locator('#combos-0 summary').click();await page.locator('#overclock-0').click();await expect(page.locator('#confirm-body')).toContainText('Extra power use: +0% → +25%');await expect(page.locator('#confirm-body')).toContainText('Wear per item per epoch: 0.500 → 0.625');await page.keyboard.press('Escape');await expect(page.locator('#overclock-0')).toBeFocused();
  for(let level=1;level<=5;level++){const before=await saved(page);await page.locator('#overclock-0').click();await expect(page.locator('#confirm-body')).toContainText(`Level ${level-1} → ${level}`);if(level===1)await shot(page,'overclock-390');await page.locator('#accept-confirm').click();const after=await saved(page);assert.equal(after.rooms[0].overclock,level);assert(Math.abs(before.tokens-after.tokens-25*level/1.05)<1e-8);}
  await expect(page.locator('#overclock-0')).toBeDisabled();
 },{width:390,height:844});
 await scenario('Polling does not sync; idle pauses new rewards, sync preserves accrued rewards and resumes mining',async page=>{
  await goto(page,'farm');await skip(page);await page.clock.fastForward(12*45_000);let state=await saved(page);assert.equal(state.lastSyncedEpoch,0);assert.equal(state.epoch,12);const earned=state.pendingMining;assert(earned>0);await expect(page.locator('.mining-warnings')).toContainText('Mining paused');
  await page.clock.fastForward(4*45_000);assert.equal((await saved(page)).pendingMining,earned);await page.locator('#sync').click();state=await saved(page);assert.equal(state.unclaimed,earned);assert.equal(state.lastSyncedEpoch,16);await expect(page.locator('#sync-status')).toHaveText('Synced');await page.locator('#claim').click();assert.equal((await saved(page)).unclaimed,0);
 });
 await scenario('Low balance warning offers a working refill path; costs remain a tariff, with no reserve',async page=>{
  await goto(page,'farm');await skip(page);await seed(page,f=>{f.tokens=0;});await expect(page.locator('.mining-warnings')).toContainText('low balance alone does not stop it');await page.locator('[data-fix-funds]').click();await expect(page.locator('#refill-demo')).toBeVisible();await page.locator('#refill-demo').click();assert.equal((await saved(page)).tokens,350);assert(!Object.hasOwn(await saved(page),'electricity'));await expect(page.locator('.room-tariff')).toContainText('15%');
 });
 await scenario('City map, current event, lobby accounting, district movement and dispatch history',async page=>{
  await goto(page,'city');await skip(page);assert.equal(await page.locator('.district').count(),8);await expect(page.locator('#city-timer')).toHaveText(/\d\d:\d\d/);const before=await saved(page);await page.locator('#lobby').click();const lobbied=await saved(page);assert(lobbied.lobbied);assert(Math.abs(lobbied.revenue.teamTokens-10/1.05*.1)<1e-8);assert(lobbied.tokens<before.tokens);
  await tools(page);await page.locator('#next-epoch').click();await expect(page.locator('#latest-letter h3')).not.toHaveText('Connection established');await page.locator('#district-choice summary').click();await page.locator('#district-select').selectOption('1');await page.locator('#move-district').click();assert.equal((await saved(page)).district,1);await dismiss(page);await page.evaluate(()=>scrollTo(0,0));await shot(page,'city-desktop');
 });
 await scenario('Wallet withdrawal tax preview and confirmation, referrals, NFT pack and free pack use',async page=>{
  await goto(page,'wallet');await skip(page);await page.locator('#withdraw-amount').fill('10');await expect(page.locator('#withdraw-preview')).toContainText('You receive 8.00');await page.locator('#withdraw-form button').click();await expect(page.locator('#confirm-body')).toContainText('Tax: 2.00');await page.locator('#accept-confirm').click();let state=await saved(page);assert.equal(state.tokens,340);assert.equal(state.withdrawn,8);
  assert((await page.locator('#referral-link').inputValue()).includes('?ref=GRID-'));await tools(page);await page.locator('#simulate-referral').click();state=await saved(page);assert.equal(state.referral.invitees,1);assert(Math.abs(state.referral.earned-.6)<1e-10);await page.locator('#nft-starter').click();await expect(page.locator('#nft-starter')).toBeDisabled();await nav(page,'packs');await page.locator('#currency-free').check();await page.locator('#open-pack').click();assert.equal((await saved(page)).pendingPack.price,0);
 });
 await scenario('Season synced score, capped leaderboard, deadline and one-time reward claim',async page=>{
  await goto(page,'season');await skip(page);await expect(page.locator('.deadline')).toContainText('Sync your farm before the week ends');await seed(page,f=>{f.season.farmScore=1_000_000;f.season.endsAtEpoch=1;});await page.locator('#sync').click();await expect(page.locator('.mini-stats')).toContainText('1,000,000.00');await tools(page);await page.locator('#next-epoch').click();await expect(page.locator('#season-claim')).toBeEnabled();const before=await saved(page);assert(before.season.lastResult.includes('Best farm prize awarded'));await page.locator('#season-claim').click();assert.equal((await saved(page)).season.pendingTokens,0);await expect(page.locator('#season-claim')).toBeDisabled();await dismiss(page);await page.evaluate(()=>scrollTo(0,0));await shot(page,'season-desktop');
 });
 await scenario('Event banners give fixes; audits use the hash threshold; XP shows day gates',async page=>{
  await goto(page,'farm');await skip(page);
  await seed(page,f=>{f.events=[{id:0,type:'outage',district:f.district,at:f.updatedAt,expiresAt:f.nextEventAt,lobbied:false,protection:'Off-grid rooms retain half of mining.'}];});
  await expect(page.locator('.mining-warnings')).toContainText('Outage:');await page.getByRole('link',{name:'View outage protection'}).click();await expect(page.locator('.event-protection')).toContainText('Off-grid');
  await seed(page,f=>{f.events[0].type='audit';f.events[0].protection='Above 100 H/s: 10% of epoch mining goes to the reward pool.';});await expect(page.locator('.mining-warnings')).toHaveCount(0);
  await seed(page,f=>{f.inventory[0].rarity='Legendary';f.epoch=4;f.lastSyncedEpoch=4;f.gameDays=1;f.xp=350;f.level=5;});await expect(page.locator('.mining-warnings')).toContainText('Stored balances stay yours');
  await seed(page,f=>{f.inventory[0].rarity='Common';f.events=[];f.epoch=0;f.lastSyncedEpoch=0;f.gameDays=0;f.xp=400;f.level=4;});await expect(page.locator('.level-box')).toContainText('unlocks day 1');await tools(page);await page.locator('#advance-day').click();await expect(page.locator('.level-box')).toContainText('Level 5');
 });
 await scenario('Changed withdrawal tax cannot silently bypass its confirmation preview',async page=>{
  await goto(page,'wallet');await skip(page);await page.locator('#withdraw-amount').fill('10');await page.locator('#withdraw-form button').click();
  await page.evaluate(key=>{const f=JSON.parse(localStorage.getItem(key));f.epoch=4;f.gameDays=1;localStorage.setItem(key,JSON.stringify(f));},key);
  await page.locator('#accept-confirm').click();await expect(page.locator('#notice-text')).toContainText('Preview the withdrawal again');assert.equal((await saved(page)).tokens,350);assert.equal((await saved(page)).withdrawn,0);await expect(page.locator('#withdraw-preview')).toContainText('17.9%');await page.locator('#withdraw-form button').click();await page.locator('#accept-confirm').click();assert.equal((await saved(page)).tokens,340);
 });
 await scenario('Docs match live rules, replay onboarding, relative assets work offline after loading',async(page,context)=>{
  await goto(page,'docs/gas-and-syncing');await expect(page.locator('#docs-gas-and-syncing')).toContainText('syncing once a day is enough');assert(!/merge|top 10%|85%|13%/i.test(await page.locator('.docs-body').innerText()));await expect(page.locator('#docs-where-money-goes')).toContainText('88%');await context.setOffline(true);await nav(page,'farm');await skip(page);await page.locator('#item-item-2').click();await page.locator('#install-item-2').click();assert((await saved(page)).rooms[0].slots.includes('item-2'));await context.setOffline(false);
 });
 await scenario('Responsive reflow, bottom tabs, semantic accessibility and contrast across routes',async page=>{
  await goto(page,'farm');await skip(page);
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:width<700?844:1000});for(const name of ['', 'farm','packs','city','season','wallet','docs']){await goto(page,name);await skip(page);const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));assert(size.scroll<=size.viewport,`${name||'home'} overflows at ${width}: ${size.scroll}`);report.viewports.push({route:name||'home',width,overflow:false});if(width===390&&name==='farm'){await shot(page,'farm-390');const navbox=await page.locator('.game-nav').boundingBox();assert(navbox.y>740);const claimbox=await page.locator('#claim').boundingBox();assert(claimbox.y+claimbox.height<844);}if(width===1440&&name==='farm')await shot(page,'farm-desktop');}}
  await page.clock.resume();
  for(const name of ['farm','packs','city','season','wallet','docs']){await goto(page,name);const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();report.accessibility.push({route:name,violations:result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)})),incomplete:result.incomplete.map(v=>v.id)});assert.equal(result.violations.length,0,`${name}: ${result.violations.map(v=>v.id).join(',')}`);}
  await goto(page,'farm');await page.locator('#combos-0 summary').click();await page.locator('#overclock-0').click();const dialog=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();report.accessibility.push({route:'overclock dialog',violations:dialog.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),incomplete:dialog.incomplete.map(v=>v.id)});assert.equal(dialog.violations.length,0);
  await page.keyboard.press('Escape');await seed(page,f=>{f.pendingMining=1;f.tokens=0;});await page.locator('#sync').focus();await shot(page,'keyboard-focus');
  report.contrast=await page.evaluate(()=>{
   const rgb=c=>c.match(/[\d.]+/g).slice(0,3).map(Number);const lum=c=>rgb(c).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
   return [['HUD label','.hud-stat>span','.game-topbar'],['HUD value','#total-hash','.game-topbar'],['Primary text','#claim','#claim'],['Body','body','html'],['Warning','.mining-warning','.mining-warning']].map(([name,fg,bg])=>{const color=getComputedStyle(document.querySelector(fg)).color,background=getComputedStyle(document.querySelector(bg)).backgroundColor;const a=lum(color),b=lum(background);return {name,color,background,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};});
  });
 });
 await scenario('Keyboard-only pack, install and claim flow',async page=>{
  await goto(page,'farm');
  const keyboardTo=async selector=>{for(let n=0;n<180;n++){if(await page.evaluate(selector=>document.activeElement?.matches(selector),selector)){await page.keyboard.press('Enter');return;}await page.keyboard.press('Tab');}throw new Error('Unreachable by keyboard: '+selector);};
  await keyboardTo('#skip-guide');await keyboardTo('[data-route="packs"]');await keyboardTo('#open-pack');await keyboardTo('#reveal-all');await expect(page.locator('.item-card.revealed')).toHaveCount(3);
  await keyboardTo('[data-route="farm"]');await keyboardTo('#item-item-2');await keyboardTo('#install-item-2');assert((await saved(page)).rooms[0].slots.includes('item-2'));
  await keyboardTo('#demo-tools-summary');await keyboardTo('#next-epoch');await keyboardTo('#claim');assert.equal((await saved(page)).unclaimed,0);assert((await saved(page)).tokens>350);
 });
 await scenario('Text enlargement and storage failure keep actions accessible',async(page,context)=>{
  await goto(page,'farm');await skip(page);await page.setViewportSize({width:390,height:844});await page.addStyleTag({content:'html{font-size:200%}'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('#sync').click();
  const another=await context.newPage();await another.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('unavailable');}});});await goto(another,'farm');await expect(another.locator('#storage-warning')).toBeVisible();await another.locator('#skip-guide').click();await another.locator('#item-item-2').click();await another.locator('#install-item-2').click();await expect(another.locator('#slot-0-1')).toContainText('Power Supply');await another.close();
 });
 assert.equal(report.consoleErrors.length,0,'Console errors');assert.equal(report.failedRequests.length,0,'Failed resources');
}finally{await browser?.close();await preview.close();await writeFile('reports/tabs-results.json',JSON.stringify(report,null,2)+'\n');}
console.log(`${report.checks.length} passed; ${report.failures.length} failed; ${report.consoleErrors.length} console errors; ${report.failedRequests.length} failed requests`);
if(report.failures.length)process.exitCode=1;
