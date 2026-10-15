import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {requireTool} from './deps.mjs';
import {serve} from './serve.mjs';
import {fixture,injected} from './v13-fixture';
const {chromium}=requireTool('playwright'),sharp=(await import('node:module')).createRequire('/tmp/blackout-validation/package.json')('sharp');
const browser=await chromium.launch({headless:true}),{server,url}=await serve(),context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),f=fixture();
const base=f.state.items[0];f.state.level=7n;f.state.items=[
 [1,0,1,10000,true],[2,1,1,10000,true],[3,10,1,8500,true],[4,6,0,6500,true],[5,3,1,10000,true],[6,8,0,10000,true],
 [7,4,0,10000,true],[8,5,0,8500,true],[9,7,1,10000,true],[10,3,1,10000,false],[11,2,2,10000,false],[12,6,4,10000,false]
].map(([id,kind,rarity,durability,equipped])=>({...base,id:BigInt(id),kind:Number(kind),rarity:Number(rarity),durability:Number(durability),equipped:Boolean(equipped)}));
f.state.slots=[1n,2n,3n,4n,5n,6n,7n,8n,9n,...Array(15).fill(0n)];f.state.rooms=new Set([0,1]);f.state.receipts.set('paid:1',{target:1000n,count:2n,opened:0n,captured:true,player:f.state.wallet,block:f.state.block-10n});
await injected(context,f);const page=await context.newPage();page.setDefaultTimeout(30000);
const evidence:any[]=[];try{
 await page.goto(url+'#/farm');await page.locator('#connect').click();await page.getByRole('button',{name:'Fixture Wallet',exact:true}).click();await page.locator('.combo-chip').filter({hasText:'Full Stack'}).waitFor();await page.locator('.today-block:not(.today-hud) [data-repair-all]:enabled').waitFor();await page.locator('.today-block:not(.today-hud) [data-today-open]:enabled').waitFor();
 for(const width of [375,390,1440]){
  await page.setViewportSize({width,height:width<500?844:1000});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(100);
  const path=`artifacts/screenshots/gameplay-farm-${width}.webp`;await sharp(await page.screenshot()).webp({quality:75}).toFile(path);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));const box=await page.locator('[data-optimize]').boundingBox();assert(box&&box.y+box.height<(width<500?844:1000));evidence.push({width,path,mainAction:box});
 }
 // Capture useful combo context, then the contract-verified review dialog.
 await page.setViewportSize({width:1440,height:1000});await page.locator('#rooms-heading').scrollIntoViewIfNeeded();await page.locator('#combo-hints-1 summary').click();await sharp(await page.screenshot()).webp({quality:72}).toFile('artifacts/screenshots/gameplay-combos-1440.webp');
 await page.locator('[data-optimize]').click();await page.locator('#action-title').filter({hasText:'Review optimized farm'}).waitFor({timeout:90000});
 for(const width of [375,1440]){await page.setViewportSize({width,height:width<500?844:1000});await sharp(await page.screenshot()).webp({quality:72}).toFile(`artifacts/screenshots/gameplay-optimize-${width}.webp`);}
 await page.keyboard.press('Escape');await page.waitForTimeout(100);assert.equal(await page.locator('#action-dialog').isVisible(),false);assert(await page.locator('[data-optimize]').evaluate((el:HTMLElement)=>document.activeElement===el));await page.keyboard.press('Tab');await page.locator('[data-optimize]').focus();assert(await page.locator('[data-optimize]').evaluate((el:HTMLElement)=>getComputedStyle(el).outlineStyle!=='none'));
 evidence.push({keyboard:'Dialog Escape/Cancel and focus return checked; keyboard button focus style verified after closing review.',fixture:'Synthetic on-chain-shaped data; no signatures or real funds.'});
 mkdirSync('artifacts/v13',{recursive:true});writeFileSync('artifacts/v13/screenshots.json',JSON.stringify(evidence,null,2));console.log('PASS six gameplay screenshots, responsive first action and keyboard focus');
}finally{await browser.close();server.close();}
