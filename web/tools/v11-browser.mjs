import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {requireTool} from './deps.mjs';
import {serve} from './serve.mjs';
const {chromium,webkit}=requireTool('playwright');
const AxeBuilder=requireTool('@axe-core/playwright').default;
const {server,url}=await serve();
const report={checkedAt:new Date().toISOString(),passed:[],limitations:[],screenshots:[],accessibility:[],errors:[]};
const pass=s=>{report.passed.push(s);console.log('PASS',s);};
mkdirSync('artifacts/screenshots',{recursive:true});mkdirSync('artifacts/v11',{recursive:true});
const browsers=[];
try{
 for(const [engine,driver] of [['chromium',chromium],['webkit',webkit]]){
  if(process.env.BLACKOUT_TEST_ENGINE&&process.env.BLACKOUT_TEST_ENGINE!==engine)continue;
  const browser=await driver.launch({headless:true,...(engine==='webkit'&&process.env.BLACKOUT_WEBKIT_PATH?{executablePath:process.env.BLACKOUT_WEBKIT_PATH}:{})});browsers.push(browser);
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const page=await context.newPage();
  const errors=[];const localFailures=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(url)&&r.status()>=400)localFailures.push({url:r.url(),status:r.status()});});
  await page.goto(url);await page.waitForFunction(()=>document.body.classList.contains('app-ready'));
  await page.locator('.hero-actions .primary').waitFor();const buy=await page.locator('.hero-actions .primary').boundingBox();assert(buy&&buy.y+buy.height<844);assert(await page.locator('.hero-actions .starter-link').isVisible());assert.equal(await page.locator('.hero-actions .starter-link').getAttribute('href'),'https://playblackout.xyz/freepack');
  assert.equal(await page.locator('.chain-strip,#city-activity').count(),0);assert.equal(await page.locator('#onboarding').count(),0);pass(`${engine}: 390px first screen shows BLACKOUT, Buy a pack and Claim free pack; global bars absent`);
  await page.locator('#menu-toggle').click();await page.getByRole('navigation',{name:'Game pages'}).getByRole('link',{name:'Packs',exact:true}).click();await page.locator('#pack-increase').waitFor();assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'),'false');
  await page.locator('#pack-increase').click();assert.equal(await page.locator('#pack-count').textContent(),'2');await page.locator('#pack-decrease').click();assert.equal(await page.locator('#pack-count').textContent(),'1');
  await page.locator('#pack-advanced summary').click();await page.locator('#pack-slippage').fill('11');await page.locator('#pack-slippage').press('Tab');await page.locator('#slippage-error').waitFor();assert.equal(await page.locator('#pack-slippage').getAttribute('aria-invalid'),'true');await page.locator('#pack-slippage').fill('3');await page.locator('#pack-slippage').press('Tab');await page.locator('#pack-advanced summary').click();
  assert(await page.locator('[data-buy-eth]').isDisabled());pass(`${engine}: burger navigation, pack quantity and slippage validation work before wallet connection; purchase remains gated`);
  await page.locator('#connect').click();await page.locator('#wallet-dialog').waitFor();await page.keyboard.press('Escape');assert.equal(await page.locator('#wallet-dialog').isVisible(),false);assert.equal(await page.evaluate(()=>document.activeElement.id),'connect');pass(`${engine}: wallet sheet opens, Escape closes it and focus returns`);
  for(const width of [320,375,390,768,1440]){
   await page.setViewportSize({width,height:width>1000?1000:844});
   for(const route of ['home','packs','farm','rewards','city','season','billboards','leaderboard','contracts','docs/risks']){
    await page.goto(url+'#/'+route);await page.waitForTimeout(80);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${engine} ${route} overflows at ${width}`);
   }
  }
  pass(`${engine}: all retained routes reflow at 320, 375, 390, 768 and 1440px`);
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  for(const route of ['home','packs','farm','rewards','docs']){await page.goto(url+'#/'+route);await page.waitForFunction(()=>document.body.classList.contains('reflow-mode')&&document.documentElement.scrollWidth<=innerWidth+1,undefined,{timeout:5000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${engine} 200% text ${route}`);}
  await page.evaluate(()=>document.documentElement.style.fontSize='');pass(`${engine}: 200% root-text enlargement reflows on the five primary pages`);
  for(const route of ['home','packs','farm','rewards']){
   await page.goto(url+'#/'+route);await page.waitForTimeout(200);
   const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();report.accessibility.push({engine,route,violations:axe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}))});assert.equal(axe.violations.length,0,`${engine} axe ${route}`);
  }
  pass(`${engine}: Home, Packs, disconnected Farm and public Rewards pass axe A/AA checks`);
  await page.goto(url+'#/home');await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running'&&a.effect?.getTiming().iterations===Infinity).length),0);pass(`${engine}: reduced motion stops all continuous animation`);
  if(engine==='chromium'){
   try{await page.waitForFunction(()=>document.querySelectorAll('.terminal-list li').length===20&&document.querySelector('.public-stat dd')?.textContent!=='—',undefined,{timeout:20000});}
   catch{report.limitations.push('Screenshot capture saw an incomplete public RPC refresh; last known values and explicit status remain visible. Live contract reads are also recorded separately.');}
   for(const width of [375,1440]){
    await page.setViewportSize({width,height:width===375?812:1000});
    for(const route of ['home','packs','farm','rewards']){
     await page.goto(url+'#/'+route);await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(300);await page.evaluate(()=>document.fonts.ready);
     const path=`artifacts/screenshots/${route}-${width}.webp`;execFileSync('convert',['png:-','-quality','76',path],{input:await page.screenshot({type:'png'})});report.screenshots.push(path);
    }
   }
   await page.goto(url+'#/home');await page.locator('#home-live').scrollIntoViewIfNeeded();await page.evaluate(()=>window.scrollTo(0,document.querySelector('#home-live').getBoundingClientRect().top+scrollY-88));await page.waitForTimeout(150);
   const path='artifacts/screenshots/home-public-1440.webp';execFileSync('convert',['png:-','-quality','76',path],{input:await page.screenshot({type:'png'})});report.screenshots.push(path);
  }
  // Reload against an outage: actual successful values from this browser must
  // appear synchronously from localStorage, without a fabricated fixture.
  await page.goto(url+'#/rewards');const previous=await page.locator('.public-stat dd').first().textContent();
  if(previous!=='—'){
   await context.route(/^https:\/\/(rpc\.mainnet\.chain\.robinhood\.com|robinhood\.drpc\.org|robinhood-rpc\.publicnode\.com)\//,r=>r.fulfill({status:503,body:'Offline validation',headers:{'access-control-allow-origin':'*'}}));
   await page.reload();await page.locator('#public-dashboard .public-stat dd').first().waitFor();assert.equal(await page.locator('.public-stat dd').first().textContent(),previous);await page.locator('#connection-status').filter({hasText:'Reconnecting'}).waitFor();
   await page.locator('#connect').click();assert(await page.locator('#wallet-dialog').isVisible());await page.keyboard.press('Escape');pass(`${engine}: cached real public data survives an offline reload; wallet UI remains responsive`);
  }else report.limitations.push(`${engine}: no successful snapshot available for offline reload check`);
  assert.deepEqual(localFailures,[]);const native=errors.filter(e=>/due to access control checks/.test(e));assert.deepEqual(errors.filter(e=>!native.includes(e)),[]);if(native.length)report.limitations.push(`${engine}: ${native.length} browser-native access-control messages from live RPCs or the deliberate outage, no application errors`);
  const phone=await browser.newContext({viewport:{width:390,height:844},userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});const pp=await phone.newPage();await pp.goto(url);await pp.waitForFunction(()=>document.body.classList.contains('app-ready'));await pp.locator('#connect').click();for(const name of ['MetaMask','Coinbase Wallet','Rabby','Phantom'])assert.equal(await pp.getByRole('link',{name:`Open in ${name}`,exact:false}).count(),1);assert.equal(await pp.getByRole('button',{name:'Coinbase Smart Wallet',exact:true}).count(),1);await phone.close();pass(`${engine}: phone wallet links and Coinbase Smart Wallet remain available`);
  await context.close();
 }
}catch(e){report.errors.push(String(e));process.exitCode=1;console.error(e);}
finally{for(const b of browsers)await b.close();server.close();writeFileSync('artifacts/v11/browser.json',JSON.stringify(report,null,2)+'\n');}
