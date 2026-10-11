import assert from 'node:assert/strict';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { startPreview, dependency } from './preview-server.mjs';
const { chromium, expect }=dependency('@playwright/test');
const { default:AxeBuilder }=dependency('@axe-core/playwright');
const preview=await startPreview();const browser=await chromium.launch({headless:true});
const report={runAt:new Date().toISOString(),checks:[],consoleErrors:[],failedRequests:[],performance:[],accessibility:[],limitations:['Headless Chromium only; no listening test, physical device or native screen reader.','Performance observations are local unthrottled measurements, not field Web Vitals.']};
const passed=name=>{report.checks.push(name);console.log('PASS '+name);};
try{
 await mkdir('artifacts/screenshots',{recursive:true});
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
 page.on('pageerror',e=>report.consoleErrors.push(e.message));page.on('requestfailed',r=>report.failedRequests.push(r.url()));
 await page.clock.install({time:new Date('2026-10-11T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-11T12:00:01Z'));
 await page.goto(preview.url);await expect(page.locator('.boot-screen')).toBeVisible();await page.clock.runFor(1001);await expect(page.locator('.boot-screen')).toHaveCount(0);assert.equal(await page.locator('#hero-title').evaluate(el=>getComputedStyle(el).animationDelay),'1s');passed('First visit boot ends after one second; logo flicker starts after boot');
 await page.reload();await expect(page.locator('.boot-screen')).toHaveCount(0);await page.evaluate(()=>sessionStorage.removeItem('blackout.boot'));await page.reload();await expect(page.locator('#skip-boot')).toBeVisible();await page.locator('#skip-boot').click();await expect(page.locator('.boot-screen')).toHaveCount(0);passed('Boot is once per session and can be skipped');
 await page.clock.runFor(9500);await expect(page.locator('.blackout-wave')).toHaveCount(1);
 assert.equal(await page.locator('.blackout-wave').getAttribute('data-sky-district'),'0');await page.screenshot({path:'artifacts/screenshots/after-blackout-wave.png'});
 await page.clock.runFor(2201);await expect(page.locator('.blackout-wave')).toHaveCount(0);
 await page.clock.runFor(7799);await expect(page.locator('.blackout-wave')).toHaveCount(1);assert.equal(await page.locator('.blackout-wave').getAttribute('data-sky-district'),'1');
 await page.clock.runFor(11000);await expect(page.locator('.lightning-active')).toHaveCount(1);assert.equal(await page.locator('.blackout-wave').getAttribute('data-sky-district'),'4');
 await page.clock.runFor(2201);await expect(page.locator('.lightning-active')).toHaveCount(0);passed('9.5s first blackout, 10s/11s subsequent district waves, power restoration and substation lightning');
 await page.evaluate(()=>{scrollTo(0,220);window.dispatchEvent(new Event('scroll'));});await page.clock.runFor(100);
 const transforms=await page.locator('.skyline-layer').evaluateAll(els=>els.map(el=>getComputedStyle(el).transform));assert.equal(new Set(transforms).size,3);passed('Three parallax layers have distinct scroll transforms');
 await page.locator('[data-motion-toggle]').click();await expect(page.locator('body')).toHaveClass(/motion-off/);assert.equal(await page.locator('.dispatcher-eye').evaluate(el=>getComputedStyle(el).animationName),'none');await page.clock.runFor(12000);await expect(page.locator('.blackout-wave')).toHaveCount(0);await page.locator('[data-motion-toggle]').click();passed('City pause freezes loops and suppresses blackout timers');
 await page.locator('[data-route="packs"]').click();await expect(page.locator('#main')).toHaveClass(/tab-transition/);
 if(await page.locator('#skip-guide').isVisible())await page.locator('#skip-guide').click();
 await page.locator('#open-pack').click();await expect(page.locator('.pack-stage')).toHaveClass(/opening/);await expect(page.locator('#open-pack')).toBeDisabled();assert.equal(await page.locator('.pack-seal').evaluate(el=>getComputedStyle(el).animationName),'seal-break');
 await page.clock.runFor(851);await expect(page.locator('#reveal-0')).toBeEnabled();passed('Tab CRT transition and pack shake, seal break and burst use the real pack action');
 await page.evaluate(()=>{const key='blackout.demo.v3',f=JSON.parse(localStorage.getItem(key));f.pendingPack.cards[0].rarity='Legendary';f.pendingPack.cards[0].type='GPU';localStorage.setItem(key,JSON.stringify(f));});await page.reload();
 await page.locator('#reveal-0').click();await expect(page.locator('body')).toHaveClass(/mythic-pull/);await expect(page.locator('.just-revealed')).toHaveCount(1);passed('Legendary reveal flips the card and triggers a full-screen flash');
 await page.locator('#reveal-all').click();await page.clock.runFor(1500);await expect(page.locator('.item-card.revealed')).toHaveCount(3);passed('Reveal all flips three cards in sequence');
 await page.locator('[data-route="farm"]').click();await page.locator('#demo-tools summary').click();await page.locator('#next-epoch').click();const balanceBefore=await page.locator('#balance').innerText();await page.locator('#claim').click();await expect(page.locator('.token-burst')).toHaveCount(1);await page.clock.runFor(950);await expect(page.locator('.token-burst')).toHaveCount(0);assert.notEqual(await page.locator('#balance').innerText(),balanceBefore);passed('Claim runs a balance count-up and removes its token burst');
 await page.evaluate(()=>{const key='blackout.demo.v3',f=JSON.parse(localStorage.getItem(key));f.xp=0;f.level=1;f.lastSyncedEpoch=f.epoch;localStorage.setItem(key,JSON.stringify(f));});await page.reload();await page.locator('#demo-tools summary').click();await page.locator('#next-epoch').click();await page.locator('#next-epoch').click();await expect(page.locator('.level-up')).toBeVisible();await page.locator('.level-up button').click();await expect(page.locator('.level-up')).toHaveCount(0);passed('Earning XP shows a dismissible level-up badge');
 await page.close();
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});const perf=await context.newPage();
  await perf.addInitScript(()=>{window.__layoutShifts=[];window.__longTasks=[];new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__layoutShifts.push(e.value);}).observe({type:'layout-shift',buffered:true});new PerformanceObserver(list=>{for(const e of list.getEntries())window.__longTasks.push(e.duration);}).observe({type:'longtask',buffered:true});});
  await perf.goto(preview.url);await perf.evaluate(()=>document.fonts.ready);await perf.waitForTimeout(300);
  const measures=await perf.evaluate(()=>({cls:window.__layoutShifts.reduce((s,v)=>s+v,0),longTasks:window.__longTasks,resources:performance.getEntriesByType('resource').map(e=>({url:new URL(e.name).pathname,bytes:e.transferSize,durationMs:Math.round(e.duration)})),domNodes:document.querySelectorAll('*').length,fontsLoaded:document.fonts.check('16px Mono')&&document.fonts.check('16px Pixel')}));
  assert(measures.cls<.01,`Landing CLS is ${measures.cls}`);assert(measures.fontsLoaded);report.performance.push({width,...measures});
  const scan=await new AxeBuilder({page:perf}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();report.accessibility.push({route:'landing',width,violations:scan.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),incomplete:scan.incomplete.map(v=>v.id)});assert.equal(scan.violations.length,0);
  await perf.screenshot({path:`artifacts/screenshots/after-landing-full-${width}.png`,fullPage:true});await context.close();
 }
 passed('390px and 1440px landing: CLS below 0.01, local fonts, zero axe violations');
 const og=await readFile('dist/og.png');assert.equal(og.readUInt32BE(16),1200);assert.equal(og.readUInt32BE(20),630);const icon=await readFile('dist/app-icon.png');assert.equal(icon.readUInt32BE(16),512);assert.equal(icon.readUInt32BE(20),512);passed('Production social image is 1200×630; app icon is 512×512');
 assert.equal(report.consoleErrors.length,0);assert.equal(report.failedRequests.length,0);
} catch(e){report.failure=e.message;process.exitCode=1;console.error(e);}finally{await browser.close();await preview.close();await writeFile('artifacts/motion-results.json',JSON.stringify(report,null,2)+'\n');}
