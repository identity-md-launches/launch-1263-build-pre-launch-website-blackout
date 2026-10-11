import { mkdir } from 'node:fs/promises';
import { startPreview, dependency } from './preview-server.mjs';
const { chromium } = dependency('@playwright/test');
const preview = await startPreview();
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, reducedMotion: 'reduce' });
  await page.goto(preview.url);
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: `
    .site-header,.demo-strip,.landing-steps,.landing-note,.site-footer,.notice{display:none!important}
    .landing-hero{height:630px;min-height:630px;border:0}
    .hero-copy{padding-top:52px;padding-bottom:0}
    .hero-copy h1{font-size:64px}
    .tagline{font-size:20px;margin-top:24px}
    .hero-description{font-size:16px}
    .hero-actions{display:none}
    .launch-badge{margin-top:24px;font-size:14px}
    .hero-city>.sprite{min-width:1200px;width:1200px}
    .city-caption{display:none}
  ` });
  await mkdir('public', { recursive: true });
  await page.screenshot({ path: 'public/og.png' });
  console.log('Rendered public/og.png — 1200 × 630. Run the production build again to copy it into dist/.');
} finally { await browser.close(); await preview.close(); }
