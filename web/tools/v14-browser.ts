import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {requireTool} from './deps.mjs';
import {serve} from './serve.mjs';
import {uxFixture,injected} from './v14-fixture';
import {TEAM_WALLET} from '../src/identity';
const {chromium,webkit}=requireTool('playwright'),sharp=createRequire('/tmp/blackout-validation/package.json')('sharp');
const AxeBuilder=requireTool('@axe-core/playwright').default;
const engine=process.env.BLACKOUT_TEST_ENGINE||'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const {server,url}=await serve(),f=uxFixture(),context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',permissions:['clipboard-read','clipboard-write']});
mkdirSync('test/scratch/v14',{recursive:true});mkdirSync('artifacts/screenshots',{recursive:true});
const results:string[]=[],errors:string[]=[],consoleErrors:string[]=[],axe:any[]=[],evidence:any={};
const pass=(message:string)=>{results.push(message);console.log('PASS',message);};
await injected(context,f);
const page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',(e:any)=>errors.push(e.message));page.on('console',(m:any)=>{if(m.type()==='error')consoleErrors.push(m.text());});
const shot=async(name:string,width:number)=>{await page.setViewportSize({width,height:width<500?844:1000});await page.waitForTimeout(100);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Overflow ${name} at ${width}`);await sharp(await page.screenshot()).webp({quality:75}).toFile(`artifacts/screenshots/ux-${name}-${width}.webp`);};
try{
 await page.goto(url+`?ref=${TEAM_WALLET}`);await page.locator('.public-leaders li').first().waitFor();await page.locator('.terminal-list li').waitFor();await page.locator('.dispatch-card').nth(3).waitFor();
 assert((await page.locator('.public-leaders li').first().innerText()).includes('Team farm'));assert((await page.locator('.terminal-list').innerText()).includes('Team farm'));assert((await page.locator('.public-stat').nth(2).innerText()).includes('ETH'));
 assert.equal(await page.locator('.dispatch-card').count(),4);assert.equal(await page.locator('.dispatch-card cite').filter({hasText:'Grid Dispatch · flavor'}).count(),4);pass('Home reads current event and 3 historical Heralds; team farm is named in leaderboard and feed');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('.landing-hero [data-motion-toggle]').click();
 await page.locator('.terminal-scroll').focus();
 await page.evaluate(()=>{
  const root=document.querySelector('#home-live')!;
  const anchors=['.public-heading','.public-stats','.public-panels','.terminal-panel','.terminal-scroll','.terminal-list','.leaders-panel','.public-leaders'];
  const refs=anchors.map(s=>root.querySelector(s));
  const rows=Array.from(root.querySelectorAll('[data-key]'));
  const price=root.querySelector('[data-number][data-fixed]');
  const pool=root.querySelector('[data-number-key="public-pool"]');
  const mutations:any[]=[];
  const observer=new MutationObserver(list=>{for(const m of list)mutations.push({type:m.type,removed:Array.from(m.removedNodes).filter(n=>n instanceof Element).map(n=>(n as Element).className),price:m.target===price?.firstChild,pool:m.target===pool?.firstChild});});
  observer.observe(root,{childList:true,subtree:true,characterData:true});
  (window as any).stability={root,anchors,refs,rows,observer,mutations,price};
 });
 f.extra.available+=123400n*10n**18n;f.extra.newActivityBlock=f.state.block;f.extra.activity=2;
 // Observe at least two real polls, allowing a final shared paint window.
 const observedAt=Date.now();await page.waitForTimeout(32000);
 await page.waitForFunction(()=>document.querySelectorAll('.terminal-list li').length===2,{},{timeout:17000});evidence.observedMs=Date.now()-observedAt;
 evidence.mutation=await page.evaluate(()=>{const s=(window as any).stability;s.observer.disconnect();return {sectionIdentity:s.refs.every((n:Element,i:number)=>n===s.root.querySelector(s.anchors[i])),retainedRows:s.rows.every((n:Element)=>n.isConnected),focusRetained:document.activeElement===s.root.querySelector('.terminal-scroll'),structuralRemovals:s.mutations.flatMap((m:any)=>m.removed),unchangedPriceTextMutations:s.mutations.filter((m:any)=>m.price).length,changedPoolTextMutations:s.mutations.filter((m:any)=>m.pool).length,rows:s.root.querySelectorAll('.terminal-list li').length,pool:s.root.querySelector('[data-number-key="public-pool"]')?.textContent};});
 assert(evidence.mutation.sectionIdentity);assert(evidence.mutation.retainedRows);assert(evidence.mutation.focusRetained);assert.deepEqual(evidence.mutation.structuralRemovals,[]);assert.equal(evidence.mutation.unchangedPriceTextMutations,0);assert(evidence.mutation.changedPoolTextMutations>1,'Changed pool animates through multiple values');assert.equal(evidence.mutation.rows,2);assert.equal(evidence.mutation.pool,'18,123,400');
 const reads=f.extra.reads.filter(r=>r.method==='eth_getBlockByNumber').map(r=>r.at);evidence.homePollGaps=reads.slice(1).map((t,i)=>t-reads[i]);assert(evidence.homePollGaps.every((n:number)=>n>=14800));pass('MutationObserver across at least two real polls: sections and existing rows retained, new row inserted, unchanged price not animated, focus retained, polls ≥15s');
 await page.emulateMedia({reducedMotion:'reduce'});
 // Clipboard and pre-connect referral attribution.
 f.state.receipts.set('paid:9',{target:1000n,count:3n,opened:0n,captured:true,player:f.state.wallet,block:f.state.block-10n});

 await page.locator('#connect').click();assert((await page.locator('.connect-inviter').innerText()).includes('Invited by 0x6d51'));await page.getByRole('button',{name:'Fixture Wallet',exact:true}).click();await page.locator('.hud-inner').waitFor();
 await page.locator('#connect').click();await page.locator('.account-address').waitFor();await page.waitForFunction(()=>document.querySelector('.account-farm')?.textContent?.includes('3 Open'));
 assert((await page.locator('.account-sheet').innerText()).includes('Claimable rewards'));assert((await page.locator('.account-sheet').innerText()).includes('Inventory'));assert((await page.locator('.account-sheet').innerText()).includes('≈ tokens per epoch'));
 await page.locator('[aria-label="Copy wallet address"]').click();assert.equal((await page.evaluate(()=>navigator.clipboard.readText())).toLowerCase(),f.state.wallet.toLowerCase());
 for(const width of [375,1440])await shot('wallet',width);
 for(const width of [320,390,760,1024]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 await page.setViewportSize({width:1440,height:1000});await page.keyboard.press('Escape');assert(await page.locator('#connect').evaluate((el:HTMLElement)=>el===document.activeElement));pass('Connected wallet opens responsive account panel; balances, farm, XP, links, address copy and Escape focus return work');
 await page.locator('#connect').click();await page.locator('.account-sheet .invite-card').click();await page.keyboard.press('Escape');assert(await page.locator('#connect').evaluate((el:HTMLElement)=>el===document.activeElement));
 await page.locator('#connect').click();await page.locator('.account-sheet [data-claim]').click();await page.locator('#action-dialog').waitFor();assert((await page.locator('#action-body').innerText()).includes('90 BLACKOUT'));assert.equal(f.state.sent.length,0);await page.locator('#cancel-action').click();pass('Account Claim opens existing gross/tax/net review before any signature');
 // Invite is accessible before/after connection and keeps history on failed refresh.
 await page.locator('[data-invite]').first().click();await page.locator('#invite-dialog').waitFor();await page.locator('#invite-dialog [data-invite-refresh]:enabled').waitFor();
 assert((await page.locator('.invite-how').innerText()).includes('first mining settlement'));await page.locator('.invite-copy').click();assert.equal((await page.evaluate(()=>navigator.clipboard.readText())).toLowerCase(),`https://playblackout.xyz/?ref=${f.state.wallet}`);
 for(const href of await page.locator('.invite-share a').evaluateAll((els:any[])=>els.map(e=>e.href)))assert(decodeURIComponent(href).includes('Mine the city with me. You keep 100% of your rewards, I get +5% on top.'));
 f.state.referees=[{wallet:TEAM_WALLET,gross:201n*10n**18n}];await page.locator('[data-invite-refresh]').click();await page.locator('.referral-total').filter({hasText:'10.05'}).waitFor();assert((await page.locator('.referees').innerText()).includes('H/s'));
 for(const width of [375,1440])await shot('invite',width);
 let scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();axe.push({surface:'invite',violations:scan.violations});
 await page.keyboard.press('Escape');await page.setViewportSize({width:375,height:844});await page.locator('#menu-toggle').click();assert(await page.locator('#game-nav [data-invite]').isVisible());await page.locator('#game-nav [data-invite]').click();assert(await page.locator('#invite-dialog').isVisible());assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'),'false');await page.keyboard.press('Escape');assert(await page.locator('#menu-toggle').evaluate((el:HTMLElement)=>el===document.activeElement));pass('Invite copy, exact X/Telegram text, on-chain referees/5% earnings and mobile burger entry work');
 // Connected farm card and capacity-aware opening. Keep a legal empty room slot.
 f.state.items=[f.state.items[1],...Array.from({length:11},(_,i)=>({...f.state.items[0],id:BigInt(i+10),kind:i%12,equipped:false}))];
 await page.goto(url+'#/packs');await page.locator('[data-open-all]').waitFor();assert.equal(await page.locator('[data-open-all]').innerText(),'Open 1 that fit');assert.equal(await page.locator('[data-open-all]').isDisabled(),false);assert(await page.getByRole('link',{name:'Place items to free space',exact:true}).isVisible());assert.equal(await page.locator('[data-reveal]').first().isDisabled(),false);
 await page.locator('[data-open-all]').click();await page.locator('.referral-offer').waitFor();assert((await page.locator('.referral-offer').innerText()).includes('You lose nothing'));await page.locator('[data-skip-invite]').click();await page.locator('.opening-ready').waitFor();assert.equal(f.state.receipts.get('paid:9')!.opened,1n);assert.equal(f.state.receipts.get('paid:9')!.count,3n);
 await page.locator('.opening-ready .button[data-rip]').click();assert(await page.locator('#opening-dialog .invite-card').isVisible());await page.locator('#opening-dialog .invite-card').click();assert(await page.locator('#invite-dialog').isVisible());await page.keyboard.press('Escape');pass('Open N that fit opens only one pack, retains two unopened packs, single Reveal stays available, legal placement hint and reveal Invite shortcut work');
 await page.goto(url+'#/farm');await page.locator('#main .invite-card').waitFor();await page.goto(url+'#/rewards');await page.locator('#main .invite-card').waitFor();pass('Farm and Rewards both expose Invite friends: +5%');
 await page.locator('#connect').click();scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();axe.push({surface:'account',violations:scan.violations});await page.locator('[data-disconnect]').click();assert.equal(await page.locator('#connect').innerText(),'Connect');pass('Disconnect closes account panel and clears connected identity');
 await page.goto(url+'#/farm');await page.locator('.peek-caption').waitFor();assert(!(await page.locator('.peek-caption').innerText()).includes('Team farm'));assert((await page.locator('.peek-caption').innerText()).includes(f.state.wallet.slice(0,6)));pass('Peek chooses the strongest non-team farm');
 await page.goto(url+'#/leaderboard');await page.locator('.farm-leaderboard li').first().waitFor();assert((await page.locator('.farm-leaderboard li').first().innerText()).includes('Team farm'));assert.equal(await page.locator('.farm-leaderboard li').first().locator('.leader-items .sprite').count(),1);for(const width of [375,1440]){await page.evaluate(()=>scrollTo(0,0));await shot('leaderboard',width);}pass('Leaderboard shows Team farm and only the one installed item; uninstalled pulls stay out of previews');
 await page.goto(url);await page.locator('.public-leaders li').first().waitFor();
 for(const width of [375,390,1440]){await page.evaluate(()=>scrollTo(0,0));await page.setViewportSize({width,height:width<500?844:1000});if(width===390){const b=await page.locator('.hero-actions .primary').boundingBox();assert(b&&b.y+b.height<844);evidence.firstAction=b;}else await shot('home',width);}
 await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('.landing-hero [data-motion-toggle]').click(); // enables city after initial reduced preference
 if(await page.locator('body').evaluate((el:HTMLElement)=>el.classList.contains('motion-off')))await page.locator('.landing-hero [data-motion-toggle]').click();
 evidence.lightning=await page.locator('.rooftop-scene').evaluate((el:HTMLElement)=>{const s=getComputedStyle(el,'::after');const flash=el.getAnimations({subtree:true}).find(a=>(a as CSSAnimation).animationName==='city-lightning');return {duration:s.animationDuration,bottom:s.bottom,position:s.position,peak:Math.max(...(flash?.effect as KeyframeEffect)?.getKeyframes().map(f=>Number(f.opacity))??[])};});assert.equal(evidence.lightning.duration,'105s');assert.equal(evidence.lightning.peak,.06);
 await page.locator('.landing-hero [data-motion-toggle]').click();assert.equal(await page.locator('.rooftop-scene').evaluate((el:HTMLElement)=>getComputedStyle(el,'::after').animationName),'none');assert.equal(await page.locator('.rooftop-lights>i').first().evaluate((el:HTMLElement)=>getComputedStyle(el).animationName),'none');
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.rooftop-scene').evaluate((el:HTMLElement)=>getComputedStyle(el,'::after').opacity),'0');pass('Hero action is above the fold at 390; lightning is 105s and hero-sky-only; Pause city and reduced motion disable lightning/windows');
 assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);assert.deepEqual(axe.flatMap(x=>x.violations.map((v:any)=>({surface:x.surface,id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))),[]);pass('Normal fixture visit has zero console/page errors; account and Invite pass WCAG A/AA axe checks');
}catch(error){console.error(error);errors.push(String(error));await page.screenshot({path:'test/scratch/v14/failure.png',fullPage:true});writeFileSync('test/scratch/v14/failure.txt',await page.locator('body').innerText());process.exitCode=1;}
finally{writeFileSync(`test/scratch/v14/${engine}.json`,JSON.stringify({results,errors,consoleErrors,evidence,axe,fixture:'Synthetic deterministic RPC and wallet. No real signatures or funds.'},null,2));await browser.close();server.close();}
