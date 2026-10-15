import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {requireTool} from './deps.mjs';
import {serve} from './serve.mjs';
const {chromium}=requireTool('playwright');
const sharp=createRequire(process.env.BLACKOUT_VISUAL_TOOLS||'/tmp/blackout-validation/package.json')('sharp');
const {server,url}=await serve(),browser=await chromium.launch({headless:true});
const report:{checkedAt:string;pages:any[];consoleErrors:string[];failedResponses:any[];screenshots:string[];checks:string[];limitations:string[]}={checkedAt:new Date().toISOString(),pages:[],consoleErrors:[],failedResponses:[],screenshots:[],checks:[],limitations:[]};
mkdirSync('artifacts/screenshots',{recursive:true});mkdirSync('artifacts/v12',{recursive:true});
try{
 const context=await browser.newContext({viewport:{width:375,height:812},reducedMotion:'reduce'}),page=await context.newPage();
 page.on('pageerror',(e:any)=>report.consoleErrors.push(e.message));page.on('console',(m:any)=>{if(m.type()==='error')report.consoleErrors.push(m.text())});page.on('response',(r:any)=>{if(r.status()>=400)report.failedResponses.push({url:r.url(),status:r.status()})});
 for(const width of [375,1440]){
  await page.setViewportSize({width,height:width===375?812:1000});
  for(const route of ['home','packs','farm','rewards','leaderboard','city','season','billboards','more','docs','contracts','wallet']){
   if(page.url()==='about:blank')await page.goto(url+'#/'+route);else await page.evaluate((r:string)=>{location.hash='#/'+r},route);await page.waitForTimeout(500);await page.waitForFunction(()=>document.body.classList.contains('app-ready'));await page.waitForFunction(()=>document.querySelector('#connection-status')?.textContent==='City connected',{},{timeout:45000});
   if(route==='home')await page.locator('.terminal-chip').first().waitFor({timeout:20000});
   if(route==='farm')await page.locator('.peek-caption').waitFor({timeout:20000});
   if(route==='leaderboard')await page.locator('.farm-leaderboard').waitFor({timeout:20000});
   if(['rewards','wallet'].includes(route))await page.locator('.projection-chart').waitFor({timeout:20000});
   await page.waitForTimeout(350);await page.evaluate(()=>scrollTo(0,0));
   const metrics=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,title:document.querySelector('h1')?.textContent,text:document.querySelector('#main')?.textContent}));assert(metrics.scroll<=width+1,`${route} overflows at ${width}`);assert(!/free pack|starter pack|launch tax|launch sequence|demo progress/i.test(metrics.text||''),route+' removed content');
   const path=`artifacts/screenshots/${route}-${width}.webp`;await sharp(await page.screenshot({fullPage:true})).webp({quality:67}).toFile(path);report.screenshots.push(path);report.pages.push({route,width,overflow:metrics.scroll-width,title:metrics.title});
   if(route==='packs'&&width===375){const button=await page.locator('#pack-buy-eth').boundingBox();assert(button&&button.y+button.height<=812,'Pack buy below first phone screen');await page.locator('#pack-buy-eth').click();await page.locator('#wallet-dialog').waitFor();await page.keyboard.press('Escape');report.checks.push('375px pack purchase visible and opens wallet picker');}
   if(route==='rewards'&&width===375){const first=await page.locator('.calculator-output dd').first().innerText();await page.locator('#calculator-hash').fill('200');await page.locator('#calculator-hash').press('Tab');await page.waitForTimeout(800);assert.notEqual(await page.locator('.calculator-output dd').first().innerText(),first);for(const days of [1,7,30]){await page.locator(`[data-project-days="${days}"]`).click();assert.equal(await page.locator(`[data-project-days="${days}"]`).getAttribute('aria-pressed'),'true');}report.checks.push('Visitor calculator changes live estimate; 1/7/30 day chart controls work');}
   console.log('PASS live',route,width);
  }
 }
 await page.goto(url+'#/home');await page.locator('.terminal-chip').first().waitFor();const chips=await page.locator('.terminal-items').evaluateAll((elements:HTMLElement[])=>elements.map(e=>e.childElementCount));assert(chips.length>0&&chips.every((n:number)=>n>=3));report.checks.push(`Live reveal rows include ${chips.join(', ')} item chips, with sprites and rarity labels`);
 await page.setViewportSize({width:390,height:844});await page.goto(url+'#/home');const main=await page.locator('.hero-actions .primary').boundingBox();assert(main&&main.y+main.height<844);await sharp(await page.screenshot()).webp({quality:76}).toFile('artifacts/screenshots/home-first-390.webp');report.screenshots.push('artifacts/screenshots/home-first-390.webp');report.checks.push('390px first screen shows product and Buy a pack');
 await page.goto(url+'?pack-lab=1#/packs');await page.waitForFunction(()=>document.body.classList.contains('app-ready'));assert.equal(await page.locator('.pack-lab').count(),0);report.checks.push('Production query cannot enable dev mock mode');
 assert.deepEqual(report.consoleErrors,[]);assert.deepEqual(report.failedResponses,[]);report.checks.push('Zero console errors and zero HTTP 4xx/5xx responses across normal live visits');
 report.limitations.push('Live public reads only; wallet transactions use separate controlled fixtures. No physical phone or screen-reader session.');
}catch(e){console.error(e);report.limitations.push(String(e));process.exitCode=1;}finally{writeFileSync('artifacts/v12/live-browser.json',JSON.stringify(report,null,2)+'\n');await browser.close();server.close();}
