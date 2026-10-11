import { startPreview, dependency } from './preview-server.mjs';
import { writeFile } from 'node:fs/promises';
const { chromium }=dependency('@playwright/test');
const preview=await startPreview();
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:1200,height:630},reducedMotion:'reduce'});
 await page.goto(preview.url);await page.evaluate(()=>document.fonts.ready);
 await page.addStyleTag({content:`
 .site-header,.demo-strip,.site-footer,.boot-screen,.hero-connection,.hero-actions,.city-caption{display:none!important}
 .landing-hero{height:630px;min-height:630px;border:0}
 .hero-copy{padding:24px 0 0;width:1200px}
 .hero-copy h1{font-size:64px;margin:18px 0 12px}
 .tagline{font-size:20px;margin:0}
 .hero-description{font-size:14px;margin-top:12px}
 .hero-launch{margin-top:20px;font-size:14px}
 .hero-city>.sprite{width:1200px;min-width:1200px;height:525px}
 .hero-city::after{background:linear-gradient(180deg,#090e25 0%,#090e2566 27%,transparent 65%)}
 `});
 await page.screenshot({path:'public/og.png'});
 const icon=await page.locator('.brand svg').evaluate(el=>{const clone=el.cloneNode(true);clone.removeAttribute('class');clone.removeAttribute('aria-hidden');clone.removeAttribute('focusable');clone.setAttribute('style','color:#39e6ff');clone.innerHTML='<rect width="64" height="64" fill="#05060f"/>'+clone.innerHTML;return clone.outerHTML;});
 await writeFile('public/favicon.svg',icon+'\n');
 await page.setViewportSize({width:512,height:512});
 await page.setContent(`<html><body style="margin:0;background:#05060f">${icon.replace('viewBox="0 0 64 64"','viewBox="0 0 64 64" width="512" height="512"')}</body></html>`);
 await page.screenshot({path:'public/app-icon.png'});
 console.log('Rendered public/og.png (1200×630) and public/app-icon.png (512×512). Rebuild to include them in dist/.');
} finally {await browser.close();await preview.close();}
