import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {requireTool} from './deps.mjs';
import {serve} from './serve.mjs';
import {uxFixture,injected} from './v14-fixture';
import {TEAM_WALLET} from '../src/identity';
const {chromium}=requireTool('playwright');const browser=await chromium.launch({headless:true}),{server,url}=await serve();
const passed:string[]=[],pass=(s:string)=>{passed.push(s);console.log('PASS',s);};
const context=await browser.newContext({viewport:{width:390,height:844}}),f=uxFixture();await injected(context,f);const page=await context.newPage();page.setDefaultTimeout(25000);
try{
 await page.goto(url);await page.locator('.public-leaders li').first().waitFor();await page.locator('#game-nav [data-invite]').evaluate((el:HTMLElement)=>el.click());await page.locator('[data-invite-connect]').click();await page.getByRole('button',{name:'Fixture Wallet',exact:true}).click();await page.locator('#invite-dialog').waitFor();assert(await page.locator('.invite-copy[data-copy]').isVisible());await page.keyboard.press('Escape');pass('Visitor Invite → Connect returns to personal invite panel after EIP-6963 connection');
 await page.locator('#connect').click();await page.locator('[data-disconnect]').click();
 const before=await page.locator('#home-live').innerText();await page.evaluate(()=>{(window as any).savedPanels=Array.from(document.querySelectorAll('#home-live>*,.terminal-panel,.leaders-panel'));});
 // JSON-RPC outage is an error result, not a fabricated HTTP failure.
 const original=f.rpc;f.rpc=async(req:any)=>({jsonrpc:'2.0',id:req.id,error:{code:-32005,message:'temporarily unavailable'}});
 await page.locator('#connection-status').filter({hasText:'Reconnecting'}).waitFor({timeout:22000});assert(await page.locator('.public-leaders li').count()>0);assert((await page.locator('#home-live').innerText()).includes('18,000,000'));assert(!(await page.locator('#home-live').innerText()).includes('Listening for pack'));assert(await page.evaluate(()=>(window as any).savedPanels.every((el:Element)=>el.isConnected)));assert(before.includes('18,000,000'));pass('RPC failure retains rendered values, feed and mounted sections; no loading reset');
 f.rpc=original;
 // Check first paint and connected sheet with enlarged text, not native browser zoom.
 await page.evaluate(()=>document.documentElement.style.fontSize='32px');await page.waitForTimeout(100);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.evaluate(()=>document.documentElement.style.fontSize='');pass('Home reflows with 200% CSS root text size at 390px');
 const mobile=await browser.newContext({viewport:{width:375,height:844},isMobile:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'});
 await mobile.route('https://rpc.mainnet.chain.robinhood.com/**',async(route:any)=>{const body=route.request().postDataJSON();await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(Array.isArray(body)?await Promise.all(body.map(f.rpc)):await f.rpc(body))});});
 const phone=await mobile.newPage();await phone.goto(url+`?ref=${TEAM_WALLET}`);await phone.locator('#connect').click();await phone.locator('#wallet-dialog').waitFor();
 for(const name of ['MetaMask','Coinbase Wallet','Rabby','Phantom']){const link=phone.getByRole('link',{name:new RegExp(`Open in ${name}`)});assert(await link.isVisible());const href=await link.getAttribute('href');assert(decodeURIComponent(decodeURIComponent(href)).includes(TEAM_WALLET));}
 assert(await phone.getByRole('button',{name:'Coinbase Smart Wallet',exact:true}).isVisible());assert((await phone.locator('.connect-inviter').innerText()).includes('Invited by'));pass('Phone without an extension shows four wallet-browser links preserving ?ref plus Coinbase Smart Wallet');
 await phone.keyboard.press('Escape');await mobile.close();
}catch(error){console.error(error);process.exitCode=1;}
finally{mkdirSync('test/scratch/v14',{recursive:true});writeFileSync('test/scratch/v14/states.json',JSON.stringify({passed},null,2));await browser.close();server.close();}
