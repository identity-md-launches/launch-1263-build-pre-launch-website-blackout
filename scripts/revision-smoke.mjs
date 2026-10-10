import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { startPreview, dependency } from './preview-server.mjs';

const { chromium } = dependency('@playwright/test');
const preview = await startPreview();
const browser = await chromium.launch({headless:true});
const results = { checks: [], firstScreen: {}, revealed: {}, glows: {}, chain: {}, errors: [] };
await mkdir('artifacts', {recursive:true});
const check = name => { results.checks.push(name); console.log(`PASS ${name}`); };
const monitor = page => {
  page.on('pageerror', e => results.errors.push(e.message));
  page.on('console', msg => { if(msg.type()==='error')results.errors.push(msg.text()); });
  page.on('requestfailed', r => results.errors.push(`${r.url()}: ${r.failure()?.errorText}`));
  page.on('response', r => { if(r.status()>=400)results.errors.push(`${r.status()} ${r.url()}`); });
};
const bounds = (page, selectors) => page.evaluate(selectors => Object.fromEntries(selectors.map(s=>{
  const r=document.querySelector(s).getBoundingClientRect();
  return [s,{top:r.top,bottom:r.bottom,height:r.height}];
})),selectors);
try {
  for (const motion of ['reduce','no-preference']) {
    const page = await browser.newPage({viewport:{width:390,height:844},reducedMotion:motion});
    monitor(page);
    await page.goto(preview.url);await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.evaluate(()=>scrollY),0);
    const rects=await bounds(page,['.hero','#open-pack-art','#open-pack','.pack-stage','.grid-ticker','.demo-notice']);
    for (const selector of ['#open-pack-art','#open-pack']) {
      assert.ok(rects[selector].top>=0&&rects[selector].bottom<844,`${motion}: playable ${selector} must fit on the first screen: ${JSON.stringify(rects)}`);
    }
    assert.ok(rects['.pack-stage'].bottom<rects['.grid-ticker'].top);
    results.firstScreen[motion]=rects;
    if(motion==='reduce')await page.screenshot({path:'artifacts/revision-first-screen.png'});
    // Real pointer action at scrollY=0, not an anchor or force-click.
    const pack = await page.locator('#open-pack-art').boundingBox();
    // The sprite floats by design. A pointer can click it without waiting for animation to stop.
    await page.mouse.click(pack.x+pack.width/2,pack.y+pack.height/2);
    await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Reveal card 1');
    await page.waitForFunction(()=>{const r=document.querySelector('#cards').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&Math.abs((r.top+r.bottom)/2-innerHeight/2)<20;});
    const revealRects=await bounds(page,['#cards','#notice']);
    assert.equal(await page.locator('#notice').isVisible(),false);
    assert.equal(await page.locator('[data-reveal]').count(),3);
    assert.match(await page.locator('#reveal-help').innerText(),/Pack opened/);
    results.revealed[motion]={...revealRects,focused:await page.evaluate(()=>document.activeElement.getAttribute('aria-label'))};
    if(motion==='reduce')await page.screenshot({path:'artifacts/revision-reveal.png'});
    await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Reveal card 1');
    assert.equal(await page.locator('[data-reveal="0"]').evaluate(e=>getComputedStyle(e).outlineWidth),'3px');
    if(motion==='reduce')await page.screenshot({path:'artifacts/revision-keyboard-reveal.png'});
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelectorAll('.revealed').length===1);
    assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Reveal card 2');
    await page.locator('#reveal-all').click();
    if(await page.locator('#legendary-dialog').isVisible())await page.locator('#close-legendary').click();
    assert.equal(await page.locator('.revealed').count(),3);
    assert.equal(await page.locator('#notice').isVisible(),false);
    await page.locator('[data-item="item-1"]').click();await page.locator('#install').click();
    assert.ok(Number(await page.locator('#total-hash').innerText())>0);
    const led=page.locator('.farm-slot.filled .gpu-led').first();
    assert.equal(await led.evaluate(e=>getComputedStyle(e).animationName),motion==='reduce'?'none':'led-blink');
    if(motion==='no-preference') {
      results.led = await led.evaluate(e=>{
        const animation=e.getAnimations()[0];animation.pause();
        animation.currentTime=0;const lit=getComputedStyle(e).opacity;
        animation.currentTime=1900;const dim=getComputedStyle(e).opacity;
        animation.play();return {lit,dim};
      });
      assert.equal(results.led.lit,'1');assert.equal(results.led.dim,'0.25');
      await page.locator('#motion-toggle').click();assert.equal(await led.evaluate(e=>getComputedStyle(e).animationName),'none');
    }
    check(`390×844 ${motion}: pack visible on arrival; cards visible after opening; keyboard reveal; installed LED respects motion`);
    await page.close();
  }
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});monitor(page);
  await page.goto(preview.url);await page.evaluate(()=>document.fonts.ready);
  assert.match(await page.locator('#farm-title').innerText(),/Your farm/);
  assert.equal(await page.locator('#extras-title').innerText(),'At launch');
  assert.equal(await page.locator('.hero-note').innerText(),'No wallet or real money is used in this demo.');
  assert.equal(await page.locator('#how .section-heading p').count(),0);
  assert.equal(await page.locator('#packs .section-heading p').innerText(),'Open a demo pack to reveal three hardware cards.');
  check('Functional section labels and demo disclosure replace repeated optional slogans');
  const initial=await page.evaluate(()=>JSON.parse(localStorage.getItem('blackout.demo.v1')));
  for (const [index,rarity] of ['Common','Rare','Epic','Legendary'].entries()) {
    await page.evaluate(({initial,rarity})=>{
      initial.nextId=5;initial.totalPacks=1;initial.updatedAt=Date.now();initial.nextEventAt=Date.now()+45000;
      initial.pendingPack={id:'pack-1',cards:[2,3,4].map(n=>({id:`item-${n}`,type:'GPU',rarity,durability:100})),revealed:[false,false,false]};
      localStorage.setItem('blackout.demo.v1',JSON.stringify(initial));
    },{initial,rarity});
    await page.reload();await page.locator('#reveal-all').click();
    if(rarity==='Legendary') { assert.equal(await page.locator('#legendary-dialog').isVisible(),true);await page.locator('#close-legendary').click(); }
    const glow=await page.locator('.revealed').first().evaluate(e=>({
      shadow:getComputedStyle(e).boxShadow,filter:getComputedStyle(e.querySelector('.card-art>.sprite')).filter,particles:e.querySelectorAll('.card-particle').length
    }));
    assert.match(glow.shadow,new RegExp(`/ ${[0.08,0.12,0.18,0.26][index]}\\)`));
    assert.match(glow.filter,new RegExp(`0px 0px ${[7,10,14,20][index]}px\\)`));
    assert.equal(glow.particles,2+index*4);results.glows[rarity]=glow;
  }
  check('All four rarity glows grow in computed blur/opacity; particles and Legendary dialog retained');
  // Public adapter-mode substitution only; this stub is not a chain transaction test.
  const chain=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});monitor(chain);
  let substitutions=0;
  await chain.route('**/assets/*.js',async route=>{
    const response=await route.fetch();const source=await response.text();
    const body=source.replace(/mode="demo"/g,()=>{substitutions++;return 'mode="chain"';});
    await route.fulfill({response,body});
  });
  await chain.goto(preview.url);await chain.evaluate(()=>document.fonts.ready);
  assert.equal(substitutions,1);
  assert.equal(await chain.locator('.mode-label').innerText(),'Chain mode');
  assert.equal(await chain.locator('#open-pack').innerText(),'Open pack →');
  assert.equal(await chain.locator('#claim').innerText(),'Claim tokens');
  assert.deepEqual(await chain.locator('.farm-stats .badge').allTextContents(),['ON-CHAIN','ON-CHAIN']);
  assert.equal(await chain.locator('#reset').isVisible(),false);
  assert.equal(await chain.locator('.odds').isVisible(),false);
  assert.equal(await chain.locator('.type-odds').isVisible(),false);
  const visibleCopy=await chain.locator('body').innerText();
  for(const phrase of ['DEMO','demo','simulation','stay in your browser','no real money','No wallet'])assert.ok(!visibleCopy.includes(phrase),`Chain presentation still contains ${phrase}`);
  await chain.locator('#reset').evaluate(e=>e.click());assert.equal(await chain.locator('#confirm-dialog').isVisible(),false);
  await chain.locator('#open-pack-art').click();await chain.locator('#reveal-all').click();
  if(await chain.locator('#legendary-dialog').isVisible())await chain.locator('#close-legendary').click();
  assert.equal(await chain.locator('#open-pack').innerText(),'Open pack →');
  await chain.locator('[data-item="item-1"]').click();await chain.locator('#install').click();
  await chain.locator('[data-repair="0"]').click();assert.equal(await chain.locator('#notice-text').innerText(),'GPUs repaired. 12 tokens spent.');
  await chain.locator('#dismiss-notice').click();
  results.chain={substitutions,header:await chain.locator('.mode-label').innerText(),disclosure:await chain.locator('.demo-notice>span').innerText(),pack:await chain.locator('#open-pack').innerText(),badges:await chain.locator('.farm-stats .badge').allTextContents(),resetHidden:true};
  await chain.evaluate(()=>scrollTo(0,0));await chain.screenshot({path:'artifacts/revision-chain-presentation.png'});
  check('Same UI renders chain status, storage/value/action copy and hides demo-only odds/reset; action redraws retain mode');
  assert.deepEqual(results.errors,[]);
  await writeFile('artifacts/revision-results.json',JSON.stringify(results,null,2)+'\n');
} finally { await browser.close();await preview.close(); }
