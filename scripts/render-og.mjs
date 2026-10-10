import { mkdir, copyFile } from 'node:fs/promises';
import { startPreview, dependency } from './preview-server.mjs';
const {chromium}=dependency('@playwright/test');
const preview=await startPreview();
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage({viewport:{width:1200,height:630},reducedMotion:'reduce'});
  await page.goto(preview.url);await page.evaluate(()=>document.fonts.ready);
  await page.addStyleTag({content:`.site-header,.grid-ticker,.main-content,footer,.notice{display:none!important}.hero{height:630px;min-height:630px;border:0}.hero-content{padding-top:54px}.hero-content h1{font-size:80px}.hero-state{margin-bottom:32px}.tagline{font-size:24px}.hero-description{font-size:16px}.hero-actions{display:none}.hero-note{margin-top:28px;font-size:16px;color:#ffe600;background:#090e1d;padding:8px 16px}.scene-caption{display:none}.city-lightning{opacity:1!important}.hero-content{gap:0}.hero-description{margin-top:20px}`});
  await page.locator('.hero-note').evaluate(el=>el.textContent='Coming soon on Robinhood Chain');
  await mkdir('artifacts',{recursive:true});await mkdir('public',{recursive:true});
  await page.screenshot({path:'artifacts/og.png'});await copyFile('artifacts/og.png','public/og.png');
  console.log('Rendered artifacts/og.png and public/og.png — 1200 × 630');
} finally {await browser.close();await preview.close();}
