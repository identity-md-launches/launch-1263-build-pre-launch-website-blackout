// Focused production-export regressions. Synthetic wallet/RPC only, no keys.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { encodeErrorResult } from 'viem';
import abi from '../src/abi.json';
import { requireTool } from './deps.mjs';
import { serve } from './serve.mjs';
import { fixture, injected } from './v13-fixture';
const before=process.argv.includes('--before'),engine=process.env.BLACKOUT_TEST_ENGINE||'chromium';
const browser=await requireTool('playwright')[engine].launch({headless:true});
const {server,url}=await serve();
const passed:string[]=[],observations:Record<string,unknown>={},errors:string[]=[];
mkdirSync('test/scratch/gameplay-revision',{recursive:true});
const pass=(message:string)=>{passed.push(message);console.log('PASS',message);};
async function open(f:ReturnType<typeof fixture>,workerMode=''){
 const context=await browser.newContext({viewport:{width:375,height:844},reducedMotion:'reduce',locale:'de-DE'});await injected(context,f);
 if(!before)await context.addInitScript(()=>localStorage.setItem('blackout.public.v11.4663.economy','{}'));
 if(workerMode)await context.addInitScript((mode:string)=>{(window as any).Worker=class{onmessage:any;onerror:any;timer:any;postMessage(){if(mode==='error')this.timer=setTimeout(()=>this.onmessage?.({data:{error:'Fixture search error'}}),100);}terminate(){clearTimeout(this.timer);}};},workerMode);
 const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',(e:any)=>errors.push(e.message));
 await page.goto(url+'#/farm');await page.locator('#connect').click();await page.getByRole('button',{name:'Fixture Wallet',exact:true}).click();await page.locator('#item-1').waitFor();await page.locator('#main [data-repair-all]').filter({hasText:'Repair all ·'}).waitFor();
 return {context,page};
}
function theftFarm(cable=true){
 const f=fixture();f.state.cable=cable;f.state.items=Array.from({length:7},(_,i)=>({id:BigInt(i+1),holder:f.state.wallet,durability:10000,kind:i===6?8:i,rarity:i===6?1:0,overclock:0,starter:false,equipped:i<6}));
 f.state.slots=[1n,2n,3n,4n,5n,6n,...Array(18).fill(0n)];return f;
}
try{
 const f=theftFarm(),{context,page}=await open(f);await page.locator('[data-optimize]').click();await page.getByRole('heading',{name:'Review optimized farm',exact:true}).waitFor();
 const text=await page.locator('#action-body').innerText();observations.theftPreview=text;
 if(before){assert(text.includes('+12.96 H/s'));await page.locator('#confirm-action').click();await page.locator('#action-dialog').waitFor({state:'hidden'});assert.equal(f.state.slots[3],7n);
  // Pinned _accumulate skips the unprotected Router. Triple Core remains 20%.
  const actual=f.state.slots.filter(id=>id!==0n&&id!==7n).reduce((n,id)=>n+(id<=3n?10000n:6000n),0n)*12000n/10000n;
  assert.equal(actual,50400n);observations.authoritativeAfter=String(actual);pass('Reproduced theft ambiguity: promised +12.96 H/s, fixture application loses 7.2 H/s');
 }else{assert(text.includes('+0 H/s'));assert(text.includes('already optimal'));assert.equal(await page.locator('.move-list li').count(),0);assert(f.state.previewThefts.includes(true));assert.equal(f.state.sent.length,0);pass('Active theft with no installed Router preserves the 57.6 H/s optimum; final Engine previews use theft=true');}
 await context.close();
 for(const mode of before?['delay']:['delay','escape','error']){
  const f=fixture();f.state.items=Array.from({length:27},(_,i)=>({id:BigInt(i+1),holder:f.state.wallet,durability:9900,kind:i%12,rarity:i%3,overclock:0,starter:false,equipped:i<12}));f.state.slots=[...Array.from({length:12},(_,i)=>BigInt(i+1)),...Array(12).fill(0n)];f.state.rooms=new Set([0,1,2]);
  const {context,page}=await open(f,mode==='error'?'error':'delay');await page.locator('[data-optimize]').click();if(mode!=='error'){await page.locator('[data-stop-optimizer]').waitFor();assert(await page.locator('#confirm-action').isDisabled());}
  if(mode==='escape')await page.keyboard.press('Escape');else if(mode==='error'){await page.locator('#tx-status').filter({hasText:'Fixture search error'}).waitFor();}else await page.locator('[data-stop-optimizer]').click();
  await page.locator('#action-dialog').waitFor({state:'hidden'});await page.locator('#main [data-claim]').click();await page.getByRole('heading',{name:'Claim mining rewards'}).waitFor();assert.equal(await page.locator('#confirm-action').isDisabled(),before);
  if(!before){f.state.signatureHold=true;await page.locator('#confirm-action').click();await page.waitForFunction(()=>document.querySelector<HTMLButtonElement>('#cancel-action')!.disabled);assert(await page.locator('#confirm-action').isDisabled());f.state.signatureHold=false;await page.locator('#action-dialog').waitFor({state:'hidden'});assert.equal(f.state.pending,0n);
   await page.locator('#main [data-repair-all]').click();await page.getByRole('heading',{name:'Repair all hardware'}).waitFor();assert(!await page.locator('#confirm-action').isDisabled());}
  pass(`${before?'Reproduced disabled Claim after':'Claim and Repair usable after'} optimizer ${mode}; ${before?'no transaction requested':'busy transaction guard retained'}`);await context.close();
 }
 {
  const f=fixture();f.state.cable=false;f.state.items=Array.from({length:4},(_,i)=>({id:BigInt(i+1),holder:f.state.wallet,durability:i===3?1000:9900,kind:i,rarity:0,overclock:0,starter:false,equipped:true}));f.state.slots=[1n,2n,3n,4n,...Array(20).fill(0n)];
  const {context,page}=await open(f);const health=page.locator('#main .today-health').first();await health.waitFor();
  if(before){assert.equal(await health.locator('meter').count(),3);assert.deepEqual(await health.locator('meter').evaluateAll((els:any[])=>els.map(e=>e.value)),[9900,9900,9900]);assert(!await page.locator('#main .today-block').getByText(/Power Supply #4/).count());pass('Reproduced Today omitting the fourth item at 10% health');}
  else{
   assert.equal(await health.locator('meter').first().getAttribute('value'),'1000');
   for(const surface of ['#main .today-block','#hud-today']){if(surface==='#hud-today')await page.locator('#hud-today>summary').click();const block=page.locator(surface);const summary=block.getByText('Show all 4 worn items',{exact:true});await summary.focus();await page.keyboard.press('Enter');assert.equal(await block.locator('meter:visible').count(),4);assert((await block.innerText()).includes('Power Supply #4 · 10%'));}
   await page.locator('#hud-today>summary').click();
   for(const width of [320,375,390,1440]){await page.setViewportSize({width,height:844});await page.evaluate(()=>scrollTo(0,0));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(width===390){const box=await page.locator('[data-optimize]').boundingBox();assert(box&&box.y+box.height<844);observations.firstScreen={width,height:844,optimize:box};}if([375,390,1440].includes(width)){await page.screenshot({path:`test/scratch/gameplay-revision/farm-${width}.png`,fullPage:true});await page.screenshot({path:`test/scratch/gameplay-revision/first-${width}.png`});}}
   const AxeBuilder=requireTool('@axe-core/playwright').default;const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(axe.violations.map((v:any)=>v.id),[]);
   await page.locator('#main [data-repair-all]').click();await page.getByRole('heading',{name:'Repair all hardware'}).waitFor();assert((await page.locator('#action-body').innerText()).includes('Power Supply #4'));pass('Both Today surfaces show critical health first and all four identities via keyboard disclosure; repair review lists hardware; reflow and axe pass');
  }
  const reads=f.state.readFns;observations.rewardViewReads={epoch:reads.filter(n=>n==='FarmRewards.EPOCH').length,precision:reads.filter(n=>n==='FarmRewards.PRECISION').length};assert.equal(reads.includes('FarmRewards.EPOCH'),!before);assert.equal(reads.includes('FarmRewards.PRECISION'),!before);pass(before?'Reproduced missing EPOCH/PRECISION reads in Farm/HUD':'Economy snapshot reads EPOCH and PRECISION for Farm/HUD');await context.close();
 }
 if(!before){
  for(const code of ['FarmCore.sync','FarmCore.repairCable']){const f=theftFarm();f.state.revertRead=code;f.state.revertData=encodeErrorResult({abi:abi.FarmCore as any,errorName:'TooEarly'});const {context,page}=await open(f);await page.locator('[data-optimize]').click();await page.locator('#tx-status').filter({hasText:/Cable status/}).waitFor();assert.equal(await page.getByRole('heading',{name:'Review optimized farm',exact:true}).count(),0);assert.equal(f.state.sent.length,0);await context.close();}pass('Unknown cable status blocks unverified optimization without a transaction');
  const f=theftFarm(false),{context,page}=await open(f);await page.locator('[data-optimize]').click();await page.getByRole('heading',{name:'Review optimized farm',exact:true}).waitFor();assert((await page.locator('#action-body').innerText()).includes('+12.96 H/s'));f.state.cable=true;await page.locator('#confirm-action').click();await page.locator('#action-error').filter({hasText:/cable status changed/}).waitFor();assert.equal(f.state.sent.length,0);await context.close();pass('Healthy cable permits Router gain; cable change before Apply rejects the stale plan');
  {
   const f=theftFarm();f.state.revertRead='FarmCore.repairCable';f.state.revertData=encodeErrorResult({abi:abi.FarmCore as any,errorName:'InsufficientBalance'});
   const {context,page}=await open(f);await page.locator('[data-optimize]').click();await page.getByRole('heading',{name:'Review optimized farm',exact:true}).waitFor();assert((await page.locator('#action-body').innerText()).includes('already optimal'));assert(f.state.previewThefts.includes(true));await context.close();pass('Insufficient repair credits still identify active theft and preserve the optimum');
  }
  {
   const f=theftFarm();f.state.items[3].kind=10;f.state.items[3].rarity=1;f.state.items[6].equipped=true;f.state.items[5].equipped=false;f.state.slots[5]=7n;
   const {context,page}=await open(f);await page.locator('[data-optimize]').click();await page.getByRole('heading',{name:'Review optimized farm',exact:true}).waitFor();assert(f.state.previewThefts.includes(true));assert(!f.state.previewThefts.includes(false));assert.equal(f.state.sent.length,0);await context.close();pass('A protected installed Router does not conceal active theft from candidate scoring');
  }
  {
   const f=fixture();f.state.rewardEpoch=43200n;f.state.rewardPrecision=10n**26n;
   const {context,page}=await open(f);await page.waitForFunction(()=>localStorage.getItem('blackout.public.v11.4663.economy.v2')!==null);
   const snapshot=JSON.parse(await page.evaluate(()=>localStorage.getItem('blackout.public.v11.4663.economy.v2')));
   assert.equal(snapshot.epochSeconds.$bigint,'43200');assert.equal(snapshot.precision.$bigint,(10n**26n).toString());
   const per=Number(await page.locator('[data-number-key="hud-epoch"]').getAttribute('data-number')),daily=Number(await page.locator('[data-number-key="hud-day"]').getAttribute('data-number'));assert.equal(daily,per*2);
   const counts=()=>['FarmRewards.EPOCH','FarmRewards.PRECISION'].map(name=>f.state.readFns.filter(n=>n===name).length),initial=counts();await page.locator('footer [data-refresh]').click();await page.waitForTimeout(1000);assert.deepEqual(counts(),initial);assert(initial.every(n=>n>0));
   observations.alternateRewards={epoch:snapshot.epochSeconds.$bigint,precision:snapshot.precision.$bigint,per,daily,reads:initial};await context.close();pass('Nondefault getters reach the persisted snapshot and HUD daily rate; legacy cache ignored and refresh reuses static reads');
  }
 }
 assert.deepEqual(errors,[]);
}catch(error){errors.push(String(error));console.error(error);process.exitCode=1;}
finally{mkdirSync('artifacts/v13',{recursive:true});writeFileSync(`artifacts/v13/gameplay-revision-${before?'before':engine}.json`,JSON.stringify({checkedAt:new Date().toISOString(),passed,observations,errors,limitations:['Controlled fixture only; no real signatures or chain mutations.']},null,2));await browser.close();server.close();}
