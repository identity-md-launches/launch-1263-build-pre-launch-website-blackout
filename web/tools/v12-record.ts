import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {requireTool,toolchain,repo,resolveTool} from './deps.mjs';
const {chromium}=requireTool('playwright');
const vite=await import(pathToFileURL(resolveTool('vite')).href);
const alias=Object.fromEntries(['viem','@wagmi/core','@wagmi/connectors'].map(name=>{const p=JSON.parse(readFileSync(join(toolchain,'node_modules',name,'package.json'),'utf8'));return [name,join(toolchain,'node_modules',name,p.exports['.'].import||p.exports['.'].default)];}));
const server=await vite.createServer({root:repo,configFile:false,base:'./',resolve:{alias:Object.entries(alias).map(([find,replacement])=>({find:new RegExp('^'+find.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$'),replacement}))},cacheDir:join(toolchain,'v12-vite-cache'),server:{host:'127.0.0.1',port:0,hmr:false,watch:{ignored:['**']}}});await server.listen();const address=server.httpServer.address(),url=`http://127.0.0.1:${address.port}/?pack-lab=1#/packs`;
const browser=await chromium.launch({headless:true});mkdirSync('artifacts/recordings',{recursive:true});mkdirSync('artifacts/v12',{recursive:true});mkdirSync('test/scratch/video-raw',{recursive:true});
const recordings:any[]=[];
try{
 for(const [rarity,name]of ['common','rare','epic','legendary','mythic'].entries())for(const count of [1,3]){
  const context=await browser.newContext({viewport:{width:720,height:900},reducedMotion:'no-preference',recordVideo:{dir:'test/scratch/video-raw',size:{width:720,height:900}}});
  // Rehearsals are self-contained. Chain-dependent chrome stays explicitly unavailable.
  await context.route(/^https:\/\/(rpc\.mainnet\.chain\.robinhood\.com|robinhood\.drpc\.org)\//,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({jsonrpc:'2.0',id:1,error:{code:-32000,message:'Visual rehearsal has no chain connection'}})}));
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.locator('.pack-lab').waitFor({timeout:20000});
  await page.locator('#lab-rarity').selectOption(String(rarity));await page.locator('#lab-count').selectOption(String(count));await page.locator('#lab-open').click();await page.locator('.opening-ready').waitFor();await page.waitForTimeout(700);await page.getByRole('button',{name:'Tap or hold to rip',exact:true}).click();await page.waitForTimeout(800);
  if(count===1){for(let i=0;i<3;i++){await page.locator('[data-flip-card]').nth(i).click();await page.waitForTimeout(i===2?1400:800);}}
  else {await page.locator('[data-flip-all]').click();await page.locator('.pull-summary:not([hidden])').waitFor();await page.waitForTimeout(1400);await page.locator('.pull-summary').scrollIntoViewIfNeeded();await page.waitForTimeout(1000);}
  assert.equal(await page.locator('.is-flipped').count(),count*3);assert.deepEqual(errors,[]);const path=`artifacts/recordings/${name}-${count===1?'single':'bulk'}.webm`,video=page.video();await context.close();const raw=`test/scratch/video-raw/${name}-${count}.webm`;await video.saveAs(raw);execFileSync(process.env.BLACKOUT_FFMPEG||'/tmp/blackout-browsers/ffmpeg-1011/ffmpeg-linux',['-y','-i',raw,'-vf','scale=576:720','-r','20','-c:v','libvpx','-crf','40','-b:v','115k','-an',path],{stdio:'pipe'});recordings.push({rarity:name,packs:count,path,mode:'Vite DEV only; synthetic items and economy; no wallet or chain writes'});console.log('PASS recording',path);
 }
}finally{await browser.close();await server.close();writeFileSync('artifacts/v12/recordings.json',JSON.stringify({checkedAt:new Date().toISOString(),recordings},null,2)+'\n');}
