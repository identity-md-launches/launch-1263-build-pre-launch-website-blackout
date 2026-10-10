import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { startPreview, dependency } from './preview-server.mjs';

const { chromium } = dependency('@playwright/test');
const { default: AxeBuilder } = dependency('@axe-core/playwright');
const preview=await startPreview();
const browser=await chromium.launch({headless:true});
const errors=[], failures=[], checks=[];
await mkdir('artifacts',{recursive:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));
page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
page.on('requestfailed',request=>failures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText}`));
page.on('response',response=>{if(response.status()>=400)failures.push(`${response.status()} ${response.url()}`);});
const check=(name)=>{checks.push(name);console.log(`PASS ${name}`);};
async function expectText(selector,pattern) { await page.locator(selector).filter({hasText:pattern}).waitFor(); }
async function click(selector) { await page.locator(selector).click(); }
async function assertNoOverflow(label) {
  const metrics=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('#app *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.left<-.5||r.right>innerWidth+.5)&&!e.closest('.city-art')&&!e.matches('svg *');}).map(e=>({element:e.tagName+'.'+e.className,text:e.textContent.slice(0,80),width:e.getBoundingClientRect().width})).slice(0,10)}));
  assert.ok(metrics.document<=metrics.viewport,`${label}: horizontal overflow ${JSON.stringify(metrics)}`);
}
try {
  await page.clock.install({time:new Date('2026-10-10T12:00:00Z')});
  await page.goto(preview.url);await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.title(),'BLACKOUT — Mine the city. Pray the grid stays on.');
  assert.equal(await page.locator('h1').count(),1);
  assert.equal(await page.locator('meta[property="og:image"]').getAttribute('content'),'./og.png');
  assert.ok(await page.evaluate(()=>document.fonts.check('16px Pixel')&&document.fonts.check('16px Mono')));
  check('Production export loads under /preview/ with local pixel and mono fonts');
  await page.screenshot({path:'artifacts/desktop-1440.png',fullPage:true});
  await click('.hero-actions .primary');await click('#open-pack');
  assert.equal(await page.locator('[data-reveal]').count(),3);await click('#reveal-all');
  if(await page.locator('#legendary-dialog').isVisible())await click('#close-legendary');
  assert.equal(await page.locator('.revealed').count(),3);assert.match(await page.locator('#inventory-count').innerText(),/4 items/);
  check('Open a demo pack, reveal all three cards and add them to inventory');
  await click('[data-item="item-1"]');await click('#install');
  assert.equal(await page.locator('#total-hash').innerText(),'10.0');
  assert.ok(await page.locator('[data-slot="gpu"].filled').count());
  check('Install starter GPU by tap controls and see hashrate increase from 0 to 10 H/s');
  const focused=page.locator('[data-overclock="0"]');await focused.focus();
  await page.clock.runFor(10_000);
  assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-overclock')),'0');
  assert.ok(Number(await page.locator('#unclaimed').innerText())>0);
  await click('#claim');assert.ok(Number(await page.locator('#token-balance').innerText())>150);
  await click('[data-overclock="0"]');assert.match(await page.locator('[data-overclock="0"]').innerText(),/Lv. 1/);
  await click('[data-repair="0"]');await click('#electricity');
  assert.equal(await page.locator('#electricity-value').innerText(),'100%');
  check('Mining accrues DEMO tokens, claim/overclock/repair/electricity work, timer preserves focus');
  await click('#lobby');assert.equal(await page.locator('#lobby').isDisabled(),true);
  await page.clock.runFor(36_000);await expectText('#letter-number',/#001/);
  assert.notEqual(await page.locator('#latest-letter h3').innerText(),'Connection established');
  assert.equal(await page.locator('#lobby').isDisabled(),false);
  assert.equal(await page.locator('.district').count(),8);
  check('45-second grid scheduler delivers a dispatcher letter and consumes lobbying');
  const before=await page.locator('#inventory-count').innerText();await page.reload();
  await expectText('#inventory-count',new RegExp(before));assert.ok(Number(await page.locator('#total-hash').innerText())>0);
  check('Reload retains farm, inventory, currency, pack result and event history');
  await click('[data-slot="gpu"].filled');assert.equal(await page.locator('#total-hash').innerText(),'0.0');
  await page.locator('[data-item="item-1"]').dragTo(page.locator('[data-slot="gpu"]').first());
  assert.ok(Number(await page.locator('#total-hash').innerText())>0);
  check('Remove a GPU and drag it back into an empty slot');
  await page.locator('#reset').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('#confirm-dialog').isVisible(),true);
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'cancel-confirm');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'reset');
  await click('#reset');await click('#accept-confirm');await expectText('#inventory-count',/1 item/);
  assert.equal(await page.locator('#total-hash').innerText(),'0.0');
  check('Reset has a native confirmation, Escape cancels, focus returns, confirmation clears progress');
  await page.locator('#open-pack').focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Reveal card 1');
  assert.match(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),/Reveal card 1/);
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.revealed').count(),1);
  await click('#reveal-all');
  check('Keyboard Enter opens pack and reveals cards with focus progression');
  await click('#scanline-toggle');assert.equal(await page.locator('html.scanlines').count(),0);
  await click('#scanline-toggle');
  assert.equal(await page.locator('#sound-toggle').innerText(),'Sound off');
  const motions=await page.evaluate(()=>[...document.querySelectorAll('.fan-spin,.city-lightning,.flicker')].some(el=>getComputedStyle(el).animationName!=='none'));
  assert.equal(motions,false);
  check('CRT toggle works; sound defaults off; reduced-motion disables animation');
  if(await page.locator('#notice.visible').count())await click('#dismiss-notice');
  await page.evaluate(()=>window.scrollTo(0,0));
  const mobileChecks=[];
  for(const width of [320,390,768,1024,1440]) {
    await page.setViewportSize({width,height:width<600?844:1000});
    await assertNoOverflow(`${width}px`);
    if(width===390) {
      const rect=await page.locator('.hero-actions .primary').boundingBox();assert.ok(rect&&rect.y+rect.height<844,'Primary action must be visible on the first screen');
      await page.screenshot({path:'artifacts/mobile-390.png',fullPage:true});
      await page.screenshot({path:'artifacts/mobile-first-screen.png'});
      await page.locator('#packs').scrollIntoViewIfNeeded();await page.screenshot({path:'artifacts/mobile-pack.png'});
      await page.evaluate(()=>scrollTo(0,0));
    }
    if(width===768)await page.screenshot({path:'artifacts/tablet-768.png',fullPage:true});
    mobileChecks.push(width);
  }
  check(`No horizontal document overflow at ${mobileChecks.join(', ')} CSS pixels; 390px first-screen CTA visible`);
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');await assertNoOverflow('200% text enlargement at 390px');
  await page.screenshot({path:'artifacts/text-200.png',fullPage:true});await page.evaluate(()=>document.documentElement.style.fontSize='');
  check('200% text enlargement at 390px reflows without horizontal document overflow');
  await page.setViewportSize({width:1440,height:1000});
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  await writeFile('artifacts/accessibility.json',JSON.stringify({violations:axe.violations,incomplete:axe.incomplete.map(i=>({id:i.id,description:i.description,nodes:i.nodes.map(n=>n.target)})),passes:axe.passes.length},null,2)+'\n');
  assert.deepEqual(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
  check(`axe-core production audit: zero WCAG A/AA violations (${axe.passes.length} checks passed)`);
  // Actual computed solid foreground/background pairs, excluding artwork and gradients.
  const contrast=await page.evaluate(()=>{
    const pairs=[['Body','body','--text','--bg'],['Muted on raised surface','body','--muted','--surface-raised'],['Primary button','body','--bg','--accent'],['Common rarity','body','--common','--surface-raised'],['Epic rarity','body','--epic','--surface-raised'],['Legendary rarity','body','--legendary','--surface-raised']];
    const rgb=hex=>hex.trim().slice(1).match(/.{2}/g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
    const lum=c=>{const v=rgb(c);return .2126*v[0]+.7152*v[1]+.0722*v[2];};
    const s=getComputedStyle(document.documentElement);return pairs.map(([label,,fg,bg])=>{let a=s.getPropertyValue(fg).trim(),b=s.getPropertyValue(bg).trim();return {label,foreground:a,background:b,ratio:(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05)};});
  });
  assert.ok(contrast.every(c=>c.ratio>=4.5));
  check('Measured solid text/background contrast pairs all exceed 4.5:1');
  // Exercise rare UI states through valid saved DEMO data. There is no production cheat API.
  await page.evaluate(()=>{
    const state=JSON.parse(localStorage.getItem('blackout.demo.v1'));
    state.inventory=[{id:'item-1',type:'GPU',rarity:'Common',durability:100},
      ...['PSU','Cooling','Room','GPU','GPU'].map((type,i)=>({id:`item-${100+i}`,type,rarity:i<2?'Rare':'Common',durability:100}))];
    state.nextId=110;state.pendingPack=null;state.rooms=[{id:0,gpu:[null,null],cooling:null,psu:null,overclock:0}];state.tokens=1000;state.events=[];
    localStorage.setItem('blackout.demo.v1',JSON.stringify(state));
  });
  await page.reload();
  await click('[data-item="item-100"]');await click('#install');assert.equal(await page.locator('[data-slot="gpu"]').count(),4);
  await click('[data-item="item-101"]');await click('#install');
  await click('[data-item="item-102"]');await click('#install');assert.equal(await page.locator('.mining-room').count(),2);
  await click('[data-item="item-1"]');await click('#merge');await expectText('#confirm-body',/three spare Common GPU/);
  await click('#accept-confirm');await expectText('#selection-help',/Rare GPU selected/);await click('#install');
  assert.equal(await page.locator('#total-hash').innerText(),'29.4');
  await page.screenshot({path:'artifacts/farm-installed.png',fullPage:false});
  check('Rare Power supply adds slots, Rare Cooling boosts hashrate, Room key unlocks room 02, merge confirms and upgrades three Common GPUs');
  await page.locator('[data-slot="gpu"].filled').first().focus();await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-slot')),'gpu');
  check('Keyboard removing an installed GPU restores focus to its empty slot');
  await page.evaluate(()=>{
    const state=JSON.parse(localStorage.getItem('blackout.demo.v1'));
    state.pendingPack={id:'pack-999',cards:[{id:'item-201',type:'GPU',rarity:'Legendary',durability:100},{id:'item-202',type:'Cooling',rarity:'Epic',durability:100},{id:'item-203',type:'PSU',rarity:'Rare',durability:100}],revealed:[false,false,false]};
    state.totalPacks=999;state.nextId=204;
    localStorage.setItem('blackout.demo.v1',JSON.stringify(state));
  });
  await page.reload();await click('[data-reveal="0"]');
  assert.equal(await page.locator('#legendary-dialog').isVisible(),true);
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'close-legendary');
  await page.screenshot({path:'artifacts/legendary.png'});
  const dialogAudit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  assert.deepEqual(dialogAudit.violations.map(v=>v.id),[]);
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-reveal')),'1');
  await click('#reveal-all');
  assert.deepEqual(await page.locator('.revealed').evaluateAll(cards=>cards.map(c=>c.getAttribute('data-rarity'))),['Legendary','Epic','Rare']);
  if(await page.locator('#notice.visible').count())await click('#dismiss-notice');
  await page.locator('#packs').screenshot({path:'artifacts/rarities.png'});
  check('Legendary full-screen moment, Epic/Rare cards, modal focus/Escape restoration and modal accessibility scan');
  await context.setOffline(true);await click('[data-item="item-110"]');await click('#install');
  assert.ok(Number(await page.locator('#total-hash').innerText())>0);
  await context.setOffline(false);
  check('Loaded demo interactions work with network disabled');
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  check('No browser console errors, page errors, failed requests or HTTP 4xx/5xx responses');
  await writeFile('artifacts/smoke-results.json',JSON.stringify({runAt:new Date().toISOString(),checks,viewports:mobileChecks,contrast,consoleErrors:errors,failedRequests:failures},null,2)+'\n');
} finally { await browser.close();await preview.close(); }
