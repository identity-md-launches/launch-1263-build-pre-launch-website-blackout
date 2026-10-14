// Render the existing SVG city and typography; no generated or replacement artwork.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { serve } from './serve.mjs';
import { requireTool, repo } from './deps.mjs';
const { chromium } = requireTool('playwright');
const { server, url } = await serve();
let browser;
try {
 browser = await chromium.launch({headless:true,...(process.env.BLACKOUT_BROWSER_CONSTRAINED?{args:['--renderer-process-limit=2','--no-zygote','--disable-gpu']}:{}),...(process.env.BLACKOUT_CHROME_PATH?{executablePath:process.env.BLACKOUT_CHROME_PATH}:{})});
 const page = await browser.newPage({viewport:{width:1200,height:630},reducedMotion:'reduce'});
 await page.route('**/*',route=>route.request().url().startsWith(url.replace('/preview/','/'))?route.continue():route.abort());
 await page.goto(url);
 await page.evaluate(()=>document.fonts.ready);
 await page.locator('.hero-launch').evaluate(el=>el.textContent='BLACKOUT on Robinhood Chain');
 await page.addStyleTag({content:`
  body{padding:0!important}.site-header,.chain-strip,#registry-warning,#tx-status,.site-footer{display:none!important}
  #main>*:not(.landing-hero){display:none!important}
  .landing-hero{height:630px;min-height:630px!important;border:0;margin:0}
  .hero-copy{padding:32px 24px 0!important}.hero-copy h1{font-size:64px;margin:24px 0 12px}
  .hero-connection,.hero-actions,.hero-docs,.city-caption,.hero-coordinate{display:none!important}
  .tagline{font-size:20px;margin-top:16px}.hero-description{font-size:16px;margin-top:12px}
  .hero-launch{display:table!important;margin:20px auto 0;padding:8px 16px;font-size:16px;color:var(--accent);border-color:var(--accent);background:var(--bg)}
  .hero-city>.sprite{width:1440px;min-width:1440px;height:630px}
  *,*::before,*::after{animation:none!important;transition:none!important}
 `});
 assert.equal(await page.locator('.hero-launch').innerText(),'BLACKOUT on Robinhood Chain');
 assert.equal(await page.getByText(/Launching soon/).count(),0);
 const png=await page.screenshot();
 const target=join(repo,'public/og.png'),checking=process.argv.includes('--check');
 if(checking) {
  assert.deepEqual(png,readFileSync(target),'OG image differs from current city and live badge. Regenerate it.');
  assert.deepEqual(png,readFileSync(join(repo,'dist/og.png')),'Production OG image is stale. Rebuild.');
 } else writeFileSync(target,png);
 mkdirSync(join(repo,'reports/v9'),{recursive:true});
 writeFileSync(join(repo,'reports/v9/og-validation.json'),JSON.stringify({checkedAt:new Date().toISOString(),mode:checking?'regression-check':'regenerate',badge:'BLACKOUT on Robinhood Chain',dimensions:[1200,630],sha256:createHash('sha256').update(png).digest('hex'),bytes:png.length,artSource:'src/sprites.ts via the current landing SVG city',result:'passed'},null,2)+'\n');
 console.log(`PASS ${checking?'OG regression: current rendered city equals public and dist OG':'Regenerated public/og.png from current city'} (${png.length} bytes).`);
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
