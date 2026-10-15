import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {requireTool} from './deps.mjs';
import {serve} from './serve.mjs';
const {chromium,webkit}=requireTool('playwright');const {server,url}=await serve();
const report={checkedAt:new Date().toISOString(),passed:[],errors:[]};
try{
 for(const [engine,driver]of [['chromium',chromium],['webkit',webkit]]){
  const browser=await driver.launch({headless:true,...(engine==='webkit'&&process.env.BLACKOUT_WEBKIT_PATH?{executablePath:process.env.BLACKOUT_WEBKIT_PATH}:{})});
  try{for(const action of ['menu','connect','buy']){
   const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const page=await context.newPage();
   let release;const gate=new Promise(resolve=>release=resolve);
   try{
    await page.route(/\/assets\/main-[^/]+\.js$/,async route=>{await gate;await route.continue();});
    await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#app>svg'));
    assert.equal(await page.locator('body.app-ready').count(),0);
    if(action==='menu'){await page.locator('#menu-toggle').click();assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'),'true');}
    if(action==='connect'){await page.locator('#connect').click();assert.equal(await page.locator('#connect').textContent(),'Opening…');}
    if(action==='buy'){await page.locator('.hero-actions .primary').click();assert(page.url().endsWith('#/packs'));}
    release();await page.waitForSelector('body.app-ready');
    if(action==='menu'){assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'),'true');assert(await page.locator('#game-nav').isVisible());await page.locator('#game-nav').getByRole('link',{name:'Packs',exact:true}).click();await page.locator('#pack-count').waitFor();assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'),'false');}
    if(action==='connect'){await page.locator('#wallet-dialog').waitFor();await page.keyboard.press('Escape');assert.equal(await page.locator('#wallet-dialog').isVisible(),false);}
    if(action==='buy')await page.locator('#pack-count').waitFor();
    const result=`${engine}: ${action} works while the game module is still downloading and survives initialization`;report.passed.push(result);console.log('PASS',result);
   }finally{release();await context.close();}
  }}finally{await browser.close();}
 }
}catch(error){report.errors.push(String(error));console.error(error);process.exitCode=1;}
finally{server.close();mkdirSync('artifacts/v11',{recursive:true});writeFileSync('artifacts/v11/startup.json',JSON.stringify(report,null,2)+'\n');}
