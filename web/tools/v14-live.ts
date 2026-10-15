// Read-only production-browser validation. Optional contributor RPC override is
// supplied at invocation; the export always names the public endpoint.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {requireTool} from './deps.mjs';
import {serve} from './serve.mjs';
const {chromium}=requireTool('playwright'),sharp=createRequire('/tmp/blackout-validation/package.json')('sharp');
const source='https://rpc.mainnet.chain.robinhood.com',rpc=process.env.BLACKOUT_TEST_RPC||source;
const browser=await chromium.launch({headless:true}),{server,url}=await serve(),context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const batches:{bytes:number;count:number}[]=[],requests:any[]=[],errors:string[]=[],consoleErrors:string[]=[],failed:string[]=[];
mkdirSync('test/scratch/v14',{recursive:true});
if(rpc!==source)await context.route('https://rpc.mainnet.chain.robinhood.com/**',async(route:any)=>{
 const raw=route.request().postData();if(!raw)return route.continue();
 const body=JSON.parse(raw);batches.push({bytes:Buffer.byteLength(raw),count:Array.isArray(body)?body.length:1});for(const r of Array.isArray(body)?body:[body])requests.push({method:r.method,...(r.method==='eth_getLogs'?{span:Number(BigInt(r.params[0].toBlock)-BigInt(r.params[0].fromBlock)+1n)}:{})});
 try{const response=await fetch(rpc,{method:'POST',headers:{'content-type':'application/json'},body:raw,signal:AbortSignal.timeout(12000)});await route.fulfill({status:response.status,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:await response.text()});}catch(error){failed.push(String(error));await route.abort();}
});
const page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',(e:any)=>errors.push(e.message));page.on('console',(m:any)=>{if(m.type()==='error')consoleErrors.push(m.text());});
page.on('response',(r:any)=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
const shots:string[]=[];
async function shot(name:string,width:number){await page.setViewportSize({width,height:width<500?844:1000});await page.waitForTimeout(100);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));const path=`artifacts/screenshots/ux-${name}-${width}.webp`;await sharp(await page.screenshot()).webp({quality:75}).toFile(path);shots.push(path);}
try{
 await page.goto(url);await page.locator('.public-leaders li').first().waitFor();console.log('Live Home stats and farm standings loaded.');
 for(const width of [375,1440]){await page.evaluate(()=>scrollTo(0,0));await shot('home',width);}
 await page.locator('.terminal-list li').first().waitFor();console.log('Live pack feed loaded.');
 for(const width of [375,1440]){await page.setViewportSize({width,height:width<500?844:1000});await page.locator('#home-live').evaluate((el:HTMLElement)=>el.scrollIntoView({block:'start'}));await shot('home-live',width);}
 // Cold history scans are bounded and checkpointed; allow up to three batches.
 for(let attempt=0;attempt<4;attempt++){try{await page.locator('.dispatch-card').nth(3).waitFor({timeout:45000});break;}catch{console.log('Herald history is still scanning.');}}
 assert.equal(await page.locator('.dispatch-card').count(),4);console.log('Current and previous three real Herald events loaded.');
 const dispatch=await page.locator('#grid-dispatch').innerText();
 for(const width of [375,1440]){await page.setViewportSize({width,height:width<500?844:1000});await page.locator('#grid-heading').evaluate((el:HTMLElement)=>el.scrollIntoView({block:'start'}));await shot('dispatch',width);}
 await page.goto(url+'#/leaderboard');await page.locator('.farm-leaderboard li').first().waitFor();const standings=await page.locator('.farm-leaderboard').innerText();assert(standings.includes('Team farm'));
 for(const width of [375,1440]){await page.evaluate(()=>scrollTo(0,0));await shot('leaderboard',width);}
 await page.goto(url+'#/farm');await page.locator('.peek-caption').waitFor();const peek=await page.locator('.peek-caption').innerText();assert(!peek.toLowerCase().includes('0x6d51'));assert(peek.includes('H/s'));
 await page.goto(url);await page.locator('.public-leaders li').first().waitFor();
 for(const width of [320,390,800,900,1024,1440]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow ${width}`);}
 await page.locator('#connection-status').filter({hasText:'City connected'}).waitFor();
 const sourceState=await page.evaluate(()=>({status:document.querySelector('#connection-status')?.textContent,live:document.querySelector('#home-live')?.innerText,fonts:document.fonts.check('14px Pixel')&&document.fonts.check('14px Mono')}));
 assert(requests.filter(r=>r.method==='eth_getLogs').every(r=>r.span<=10000));assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);assert.deepEqual(failed,[]);
 writeFileSync('test/scratch/v14/live.json',JSON.stringify({source,checkedAt:new Date().toISOString(),result:'pass',requests:requests.length,maxRequestBytes:Math.max(...batches.map(b=>b.bytes)),maxBatchCalls:Math.max(...batches.map(b=>b.count)),maxLogSpan:Math.max(...requests.filter(r=>r.span).map(r=>r.span)),errors,consoleErrors,failed,dispatch,standings,peek,sourceState,shots,transport:rpc===source?'Direct public endpoint':'Contributor read-only RPC, browser routing only; public endpoint remains in export.'},null,2));console.log('PASS live export: Home, feed, Herald history, Team farm, non-team peek, installed hardware, six widths, zero console/page/HTTP errors.');
}catch(error){console.error(error);writeFileSync('test/scratch/v14/live-failure.json',JSON.stringify({source,errors,consoleErrors,failed,error:String(error),requests:requests.length,maxRequestBytes:Math.max(...batches.map(b=>b.bytes)),maxBatchCalls:Math.max(...batches.map(b=>b.count))},null,2));process.exitCode=1;}
finally{await browser.close();server.close();}
