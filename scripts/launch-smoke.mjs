import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { startPreview, dependency } from './preview-server.mjs';
const { chromium, expect } = dependency('@playwright/test');
const { default: AxeBuilder } = dependency('@axe-core/playwright');
const preview = await startPreview();
const key = 'blackout.demo.v3';
const out = 'reports/launch';
const report = { runAt: new Date().toISOString(), export: 'dist/', subpath: '/preview/', checks: [], failures: [], consoleErrors: [], failedRequests: [], viewports: [], accessibility: [], screenshots: [], contrast: [], performance: [] };
let browser;
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const goto = async (page, route = '') => { await page.goto(preview.url + '#/' + route); await page.locator('main h1').waitFor(); await page.evaluate(() => document.fonts.ready); };
const dismiss = async page => { if (await page.locator('#dismiss-notice').isVisible()) await page.locator('#dismiss-notice').click(); };
const skip = async page => { if (await page.locator('#skip-guide').isVisible()) { await page.locator('#skip-guide').click(); await expect(page.locator('.guide-highlight')).toHaveCount(0); } };
const nav = async (page, name) => { await dismiss(page); await page.locator(`[data-route="${name}"]`).click(); await expect(page.locator(`[data-route="${name}"]`)).toHaveAttribute('aria-current', 'page'); };
const demoTools = async page => { await dismiss(page); if (await page.locator('#demo-tools').getAttribute('open') === null) await page.locator('#demo-tools > summary').click(); };
const fixture = async (page, change) => { const state = await saved(page); change(state); await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key, state }); await page.reload(); await expect(page.locator('#storage-warning')).toBeHidden(); };
const shot = async (page, name, fullPage = false) => { const path = `${out}/screenshots/${name}.png`; await page.screenshot({ path, fullPage }); report.screenshots.push(path); };
const noOverflow = async page => { const sizes = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth })); assert(sizes.scroll <= sizes.width, JSON.stringify(sizes)); };
async function scenario(name, callback, viewport = { width: 390, height: 844 }, reducedMotion = 'reduce', controlledClock = true) {
 const context = await browser.newContext({ viewport, reducedMotion }); const page = await context.newPage(); page.setDefaultTimeout(6000);
 page.on('pageerror', e => report.consoleErrors.push({ name, message: e.message }));
 page.on('console', m => { if (m.type() === 'error') report.consoleErrors.push({ name, message: m.text() }); });
 page.on('requestfailed', r => report.failedRequests.push({ name, url: r.url(), error: r.failure()?.errorText }));
 page.on('response', r => { if (r.status() >= 400) report.failedRequests.push({ name, url: r.url(), status: r.status() }); });
 let timeout;
 try {
  if (controlledClock) { await page.clock.install({ time: new Date('2026-10-11T17:00:00Z') }); await page.clock.pauseAt(new Date('2026-10-11T17:00:01Z')); }
  await Promise.race([callback(page, context), new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('90s scenario budget exceeded')),90000);})]); report.checks.push(name); console.log('PASS ' + name);
 } catch (e) { report.failures.push({ name, message: e.message }); console.error('FAIL ' + name + ': ' + e.message.slice(0,1500)); await page.screenshot({ path: `/tmp/blackout-launch-failure-${report.failures.length}.png` }).catch(() => {}); }
 finally { clearTimeout(timeout); await context.close(); }
}
try {
 await mkdir(`${out}/screenshots`, { recursive: true }); browser = await chromium.launch({ headless: true });
 await scenario('390px first screen, launch terms, teaser scope and social metadata', async page => {
  await goto(page);
  for (const sel of ['#hero-title', '.hero-description', '.hero-actions .primary', '.hero-actions .starter-link', '.header-starter']) {
   const box = await page.locator(sel).boundingBox(); assert(box && box.y >= 0 && box.y + box.height <= 844, `${sel} outside first screen`);
  }
  await expect(page.locator('.header-starter')).toHaveAttribute('href', 'https://playblackout.xyz/freepack');
  await expect(page.locator('.hero-actions .starter-link')).toHaveAttribute('href', 'https://playblackout.xyz/freepack');
  await expect(page.locator('.how-steps > li')).toHaveCount(3);
  assert.deepEqual(await page.locator('.how-steps h3').allTextContents(), ['Open packs.', 'Build your farm.', 'Survive the grid.']);
  assert.deepEqual(await page.locator('.tax-steps li').allTextContents(), ['0–10 minutes90%', '10–20 minutes50%', '20–30 minutes25%', 'After 30 minutesNormal fees']);
  await expect(page.locator('.launch-section')).toContainText('No max buy limit.');
  await expect(page.locator('.launch-section')).toContainText('All launch tax goes to the reward pool.');
  await expect(page.locator('.launch-section')).toContainText('one hour after token launch');
  assert.deepEqual(await page.locator('.coming-card h3').allTextContents(), ['Enhancement','Grid stake','Billboards','Season pot']);
  assert(!/\d/.test(await page.locator('.coming-section').innerText()));
  assert(!/0\.5 ETH|20 tokens|50 tokens|Best farm/.test(await page.locator('main').innerText()));
  for (const name of ['description','og:title','og:image']) assert(await page.locator(`meta[${name.includes(':') ? 'property' : 'name'}="${name}"]`).getAttribute('content'));
  await expect(page).toHaveTitle('BLACKOUT — Open packs. Mine the city.');
  const favicon = await page.locator('link[rel=icon]').getAttribute('href'); assert(favicon.startsWith('./'));
  assert(await page.evaluate(() => document.fonts.check('16px Pixel') && document.fonts.check('16px Mono')));
  await noOverflow(page); await shot(page, 'landing-390'); await shot(page, 'landing-full-390', true);
  await page.locator('#faq-1 summary').click(); await expect(page.locator('#faq-1 p')).toBeVisible();
  await page.locator('.hero-actions .primary').click(); await expect(page.locator('[data-route=farm]')).toHaveAttribute('aria-current','page');
 });
 await scenario('Token purchase, saved reveals, one-click ETH and free demo pack', async page => {
  await goto(page, 'packs');
  const priceBox=await page.locator('.live-price').boundingBox(), buyBox=await page.locator('#open-pack').boundingBox(), tabBox=await page.locator('.game-nav').boundingBox();
  assert(buyBox.y+buyBox.height<tabBox.y); assert(priceBox.y+priceBox.height<buyBox.y); await expect(page.locator('#coach-mark')).toBeHidden();
  await shot(page, 'packs-390');
  const before = await saved(page); await page.locator('#open-pack').click();
  const bought = await saved(page); assert(bought.tokens<before.tokens); assert.equal(bought.ethBalance,before.ethBalance); assert.equal(bought.pendingPack.currency,'tokens');
  await expect(page.locator('#open-pack')).toBeDisabled(); await expect(page.locator('#buy-pack-eth')).toBeDisabled();
  await page.locator('#reveal-0').click(); await page.reload(); await expect(page.locator('.item-card.revealed')).toHaveCount(1);
  await page.locator('#reveal-all').click(); await expect(page.locator('.item-card.revealed')).toHaveCount(3); await dismiss(page); await skip(page);
  const mid=await saved(page); await page.locator('#buy-pack-eth').click(); const after=await saved(page);
  assert.equal(after.tokens,mid.tokens); assert(after.ethBalance<mid.ethBalance); assert.equal(after.pendingPack.currency,'eth');
  await page.locator('#reveal-all').click(); await nav(page,'wallet'); await page.locator('#nft-starter').click(); await nav(page,'packs');
  const freeBefore=await saved(page); await page.locator('#open-free-pack').click(); const freeAfter=await saved(page);
  assert.equal(freeAfter.freePacks,0); assert.equal(freeAfter.tokens,freeBefore.tokens); assert.equal(freeAfter.ethBalance,freeBefore.ethBalance); assert.equal(freeAfter.pendingPack.currency,'free');
 });
 await scenario('Room token purchases, confirmations, insufficient funds and persistence', async page => {
  await goto(page,'farm'); await skip(page); await expect(page.locator('#buy-room-2')).toBeDisabled();
  await page.locator('#buy-room-1').click(); await expect(page.locator('#cancel-confirm')).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.locator('#confirm-dialog')).not.toBeVisible(); await expect(page.locator('#buy-room-1')).toBeFocused();
  const before=await saved(page); await page.locator('#buy-room-1').click(); await page.locator('#accept-confirm').click();
  await expect(page.locator('.mining-room')).toHaveCount(2); await expect(page.locator('#room-heading-1')).toBeFocused();
  assert(Math.abs((await saved(page)).tokens-(before.tokens-150/1.05))<1e-7);
  await dismiss(page); await page.locator('#buy-room-2').click(); await page.locator('#accept-confirm').click(); await expect(page.locator('#notice-text')).toContainText('need');
  assert.equal((await saved(page)).rooms.length,2);
  await demoTools(page); await page.locator('#refill-demo').click(); await dismiss(page); await page.locator('#refill-demo').click(); await dismiss(page); await page.locator('#refill-demo').click();
  await dismiss(page); await page.locator('#buy-room-2').click(); await page.locator('#accept-confirm').click(); await dismiss(page); await page.locator('#buy-room-3').click(); await page.locator('#accept-confirm').click();
  await page.reload(); await expect(page.locator('.mining-room')).toHaveCount(4); await expect(page.locator('.room-shop')).toContainText('All four rooms are yours.');
 });
 await scenario('Wear tiers, off state, scaled repair, installation and epoch claims', async page => {
  await goto(page,'farm'); await skip(page); await demoTools(page);
  for(const [output,hash] of [['85%',8.5],['65%',6.5],['40%',4],['Overheated',0]]) {
   await dismiss(page); await page.locator('#preview-wear').click(); await expect(page.locator('#installed-item-1 .output-label')).toContainText(output); assert.equal(parseFloat(await page.locator('#total-hash').innerText()),hash);
  }
  await dismiss(page); await page.locator('[data-fix=broken]').click(); await expect(page.locator('#slot-0-0')).toBeFocused();
  await page.locator('#slot-0-0').click(); await expect(page.locator('#repair-item-1')).toContainText('9.26 tokens');
  await shot(page,'overheated-390'); const before=await saved(page); await page.locator('#repair-item-1').click();
  await expect(page.locator('#installed-item-1 .output-label')).toContainText('100% output'); assert(Math.abs(before.tokens-(await saved(page)).tokens-9.72/1.05)<1e-7);
  await dismiss(page); await page.locator('#item-item-2').click(); await page.locator('#install-item-2').click(); await expect(page.locator('#installed-item-2')).toBeVisible();
  await demoTools(page); await page.locator('#next-epoch').click(); await dismiss(page); await page.locator('#claim').click(); assert.equal((await saved(page)).pendingMining,0); assert.equal((await saved(page)).unclaimed,0);
  await page.locator('#inventory-filter').selectOption('compute'); await expect(page.locator('.empty-state')).toContainText('No spare items'); await page.locator('#inventory-filter').selectOption('All');
  await page.locator('#durability-guide > summary').click(); await expect(page.locator('#durability-guide')).toContainText('Below 20%'); await noOverflow(page);
 });
 await scenario('Season item rewards, reserved inventory capacity and claim exactly once', async page => {
  await goto(page,'season'); await skip(page);
  await expect(page.locator('.prize-list')).toContainText('3 winners get an Epic or Legendary item'); assert(!/Best farm|20 tokens|50 tokens/.test(await page.locator('.season-prizes').innerText()));
  await fixture(page,s=>{s.season.pendingItems=[{id:`item-${s.nextId++}`,type:'GPU',rarity:'Legendary',durability:100}];s.season.pendingFreePacks=1;});
  const before=await saved(page); await shot(page,'season-item-390'); await page.locator('#season-claim').click(); const after=await saved(page);
  assert.equal(after.tokens,before.tokens); assert.equal(after.freePacks,1); assert.equal(after.season.pendingItems.length,0); assert.equal(after.inventory.filter(i=>i.rarity==='Legendary').length,1);
  await expect(page.locator('#season-claim')).toBeDisabled(); await page.reload(); await expect(page.locator('#season-claim')).toBeDisabled();
  await fixture(page,s=>{s.season.pendingItems=[{id:`item-${s.nextId++}`,type:'ASIC',rarity:'Epic',durability:100}];while(s.inventory.length<16)s.inventory.push({id:`item-${s.nextId++}`,type:'GPU',rarity:'Common',durability:100});});
  await page.locator('#season-claim').click(); await expect(page.locator('#notice-text')).toContainText('inventory slot'); assert.equal((await saved(page)).season.pendingItems.length,1);
 });
 await scenario('City navigation, withdrawal preview and team ETH accounting', async page => {
  await goto(page,'city'); await skip(page); await expect(page.locator('.district')).toHaveCount(8);
  await page.locator('#district-choice > summary').click(); await page.locator('#district-select').selectOption('1'); await page.locator('#move-district').click(); assert.equal((await saved(page)).district,1);
  await dismiss(page); await page.locator('#lobby').click(); await expect(page.locator('#lobby')).toBeDisabled();
  await nav(page,'wallet'); await page.locator('#withdraw-amount').fill('10'); await page.locator('#withdraw-form button').click(); await expect(page.locator('#confirm-body')).toContainText('You receive 8.00'); await page.locator('#accept-confirm').click();
  await dismiss(page); await page.locator('#money-accounting > summary').click(); await expect(page.locator('#money-accounting')).toContainText('team earns ETH from fees');
  const team=page.locator('.tariff-list > div').filter({has:page.locator('dt',{hasText:'Team'})}); await expect(team).toContainText('ETH');
  await page.locator('#withdraw-amount').fill('99999'); await page.locator('#withdraw-form button').click(); await expect(page.locator('#withdraw-amount')).toHaveAttribute('aria-invalid','true'); await expect(page.locator('#withdraw-amount')).toBeFocused();
 });
 await scenario('Guide navigation, risk statements and single address block', async page => {
  await goto(page,'docs'); await page.locator('.docs-contents a[href="#/docs/token-and-launch"]').click(); await expect(page.locator('#docs-token-and-launch')).toBeFocused();
  const heading = await page.locator('#docs-heading-token-and-launch').boundingBox(), hud=await page.locator('.game-hud').boundingBox(); assert(heading.y>=hud.y+hud.height,'Guide heading must clear sticky controls');
  await expect(page.locator('#docs-token-and-launch')).toContainText('no max buy limit');
  await page.locator('#docs-token-and-launch .docs-back').click(); await expect(page.locator('#docs-contents-title')).toBeFocused();
  await page.locator('.docs-contents a[href="#/docs/risks"]').click(); await expect(page.locator('#docs-risks')).toBeFocused(); await expect(page.locator('#docs-risks')).toContainText('No guaranteed returns');
  await expect(page.locator('#docs-risks')).toContainText('Rewards depend on players and volume'); await expect(page.locator('#docs-risks')).toContainText('Smart contract risk'); await shot(page,'risks-390');
  await goto(page,'docs/contract-addresses'); await expect(page.locator('#docs-contract-addresses tbody tr')).toHaveCount(5); await expect(page.locator('#docs-contract-addresses')).toContainText('TBA at launch');
 });
 await scenario('Keyboard purchase, disclosure and visible focus', async page => {
  await goto(page); await page.keyboard.press('Tab'); await expect(page.locator('.skip-link')).toBeFocused(); await page.keyboard.press('Enter'); await expect(page.locator('main')).toBeFocused();
  await goto(page,'packs'); await page.locator('#open-pack').focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  const ring=await page.locator('#open-pack').evaluate(el=>({style:getComputedStyle(el).outlineStyle,width:getComputedStyle(el).outlineWidth,color:getComputedStyle(el).outlineColor})); assert.equal(ring.style,'solid'); assert.equal(ring.width,'3px');
  await shot(page,'keyboard-focus-390'); await page.keyboard.press('Enter'); await expect(page.locator('#reveal-0')).toBeFocused();
  for(let i=0;i<3;i++)await page.keyboard.press('Enter'); await expect(page.locator('.item-card.revealed')).toHaveCount(3);
  await nav(page,'farm'); await skip(page); await page.locator('#slot-0-0').focus(); await page.keyboard.press('Enter'); await expect(page.locator('#remove-item-1')).toBeVisible();
 });
 await scenario('Seven routes reflow at 320, 390, 768, 1100 and 1440px; enlarged text', async page => {
  for(const width of [320,390,768,1100,1440]) {
   await page.setViewportSize({width,height:1000});
   for(const route of ['', 'farm','packs','city','season','wallet','docs']) {
    await goto(page,route); await skip(page); await noOverflow(page);
    await expect(page.locator('main h1')).toHaveCount(1); await expect(page.locator('main')).toHaveCount(1);
    report.viewports.push({width,route:route||'home',overflow:false});
    if(route==='farm') { await page.evaluate(()=>window.scrollTo(0,600)); const header=await page.locator('.site-header').boundingBox(),hud=await page.locator('.game-hud').boundingBox(); assert(hud.y>=header.y+header.height-1, `HUD overlaps header at ${width}: ${JSON.stringify({header,hud})}`); }
   }
  }
  await page.setViewportSize({width:1440,height:1000}); await goto(page); await shot(page,'landing-1440'); await page.locator('.launch-section').scrollIntoViewIfNeeded(); await shot(page,'launch-1440');
  await goto(page,'farm'); await skip(page); await shot(page,'farm-1440');
  await page.setViewportSize({width:390,height:844});
  for(const route of ['', 'farm','packs','docs']) { await goto(page,route); await skip(page); await page.evaluate(()=>document.documentElement.style.fontSize='200%'); await noOverflow(page);
   if(route==='packs') { await expect(page.locator('body')).toHaveClass(/reflow-mode/); const names=await page.locator('.game-nav a').evaluateAll(els=>els.map(el=>({width:el.clientWidth,scroll:el.scrollWidth})));assert(names.every(n=>n.scroll<=n.width)); await shot(page,'packs-text-200-percent'); } }
 });
 await scenario('Accessibility audit and measured opaque contrast pairs', async page => {
  await page.clock.resume();
  for(const route of ['', 'farm','packs','city','season','wallet','docs']) {
   await goto(page,route); await skip(page); const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
   report.accessibility.push({route:route||'home',violations:result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:result.incomplete.map(v=>({id:v.id,count:v.nodes.length}))});
   assert.equal(result.violations.length,0,`${route}: ${result.violations.map(v=>v.id).join(', ')}`);
  }
  await goto(page); const pairs=await page.evaluate(()=>['.hero-actions .primary','.hero-actions .starter-link','.header-starter'].map(sel=>{const el=document.querySelector(sel),style=getComputedStyle(el);let parent=el;while(parent&&getComputedStyle(parent).backgroundColor==='rgba(0, 0, 0, 0)')parent=parent.parentElement;return {selector:sel,foreground:style.color,background:getComputedStyle(parent).backgroundColor};}));
  const luminance=rgb=>{const c=rgb.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*c[0]+.7152*c[1]+.0722*c[2];};
  for(const pair of pairs){const a=luminance(pair.foreground),b=luminance(pair.background),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert(ratio>=4.5);report.contrast.push({...pair,ratio});}
 });
 await scenario('Reduced motion, pause controls and offline game after initial load', async (page,context) => {
  await goto(page); assert(await page.evaluate(()=>document.getAnimations().length===0)); await expect(page.locator('[data-motion-toggle]')).toBeDisabled();
  await page.emulateMedia({reducedMotion:'no-preference'}); await expect(page.locator('[data-motion-toggle]')).toBeEnabled();
  await page.locator('[data-motion-toggle]').click(); await expect(page.locator('[data-motion-toggle]')).toHaveAttribute('aria-pressed','false'); assert(await page.evaluate(()=>document.getAnimations().length===0));
  await context.setOffline(true); await page.locator('.hero-actions .primary').click(); await skip(page); await nav(page,'packs'); await page.locator('#open-pack').click(); await page.locator('#reveal-all').click(); await expect(page.locator('.item-card.revealed')).toHaveCount(3); await context.setOffline(false);
 });
 await scenario('Local loading metrics: request bytes, no remote runtime dependencies and layout shift', async page => {
  await page.addInitScript(()=>{window.__cls=0;new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!entry.hadRecentInput)window.__cls+=entry.value;}).observe({type:'layout-shift',buffered:true});});
  await goto(page); await page.waitForTimeout(1200);
  const metrics=await page.evaluate(()=>({cls:window.__cls,resources:performance.getEntriesByType('resource').map(r=>({name:new URL(r.name).pathname,origin:new URL(r.name).origin,bytes:r.encodedBodySize})),navigation:performance.getEntriesByType('navigation').map(n=>({domContentLoadedMs:n.domContentLoadedEventEnd,responseEndMs:n.responseEnd}))}));
  assert(metrics.resources.length>=5, 'Resource timing must contain real loads'); assert(metrics.navigation.length===1); assert(metrics.resources.every(r=>r.origin===new URL(preview.url).origin)); report.performance.push({viewport:390,...metrics});
 }, {width:390,height:844}, 'reduce', false);
} finally {
 if(browser)await browser.close(); await preview.close();
 await writeFile(`${out}/interaction-results.json`,JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({passed:report.checks.length,failures:report.failures.length,consoleErrors:report.consoleErrors.length,failedRequests:report.failedRequests.length}));
if(report.failures.length||report.consoleErrors.length||report.failedRequests.length)process.exitCode=1;
