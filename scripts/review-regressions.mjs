import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { startPreview, dependency } from './preview-server.mjs';

const { chromium, expect } = dependency('@playwright/test');
const preview = await startPreview();
const browser = await chromium.launch();
const storageKey = 'blackout.demo.v3';
const report = { runAt: new Date().toISOString(), export: 'dist/', hostingPath: '/preview/', checks: [], failures: [], errors: [], beta: [], docs: [], currency: [], inventory: [], cards: [], contrast: [], freshReveal: [], screenshots: [], limitations: ['Chromium emulation; no physical devices, screen reader, Safari/Firefox or native browser zoom.', 'Browser clock paused and valid localStorage fixtures used for the 60 item/rarity combinations; these are demo data, not chain transactions.', 'Contrast checks below cover named opaque pairs only; gradients, illustrations and all possible states remain unverified.'] };
await mkdir('reports/screenshots/revision', { recursive: true });
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
async function load(page, route) {
  await page.goto(`${preview.url}#/${route}`);
  await page.locator('main h1').waitFor();
  await page.evaluate(() => document.fonts.ready);
}
async function scenario(name, width, callback) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage(); page.setDefaultTimeout(8000);
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
  page.on('requestfailed', request => report.errors.push(`${request.url()}: ${request.failure()?.errorText}`));
  page.on('response', response => { if (response.status() >= 400) report.errors.push(`${response.status()} ${response.url()}`); });
  try {
    await page.clock.install({ time: new Date('2026-10-11T12:00:00Z') });
    await page.clock.pauseAt(new Date('2026-10-11T12:00:01Z'));
    await callback(page); report.checks.push(name); console.log(`PASS ${name}`);
  } catch (error) { report.failures.push({ name, error: error.message }); console.error(`FAIL ${name}: ${error.message}`); }
  finally { await context.close(); }
}
const screenshot = async (page, name) => { const path = `reports/screenshots/revision/${name}.png`; await page.screenshot({ path }); report.screenshots.push(path); };
const dismiss = async page => { if (await page.locator('#notice').isVisible()) await page.locator('#dismiss-notice').click(); };
const box = (page, selector) => page.locator(selector).boundingBox();
const inViewport = b => assert.ok(b && b.y >= 0 && b.y + b.height <= 844, `Outside viewport: ${JSON.stringify(b)}`);
const near = (a, b) => assert.ok(Math.abs(a - b) < 0.1, `${a} != ${b}`);
try {
  for (const width of [320, 390, 580, 768, 1440]) await scenario(`Beta qualification visible on Farm and Packs at ${width}px`, width, async page => {
    for (const route of ['farm', 'packs']) {
      await load(page, route); await expect(page.locator('.demo-strip span')).toBeVisible();
      const label = await page.locator('.demo-strip span').evaluate(el => ({ display: getComputedStyle(el).display, text: el.innerText, box: el.getBoundingClientRect().toJSON() }));
      assert.equal(label.text, 'Beta values, may change'); inViewport(label.box); report.beta.push({ width, route, ...label });
    }
  });
  for (const width of [320, 390, 1440]) await scenario(`Docs returns after ordinary scrolling, deep links and keyboard activation at ${width}px`, width, async page => {
    await load(page, 'docs');
    // Test all 19 same-hash links: no contents navigation or hashchange occurs before returning.
    const count = await page.locator('.docs-back').count();
    for (let i = 0; i < count; i++) {
      const back = page.locator('.docs-back').nth(i); await back.scrollIntoViewIfNeeded(); await back.focus();
      const before = await page.evaluate(() => ({ hash: location.hash, scrollY })); await page.keyboard.press('Enter');
      await expect(page.locator('#docs-contents-title')).toBeFocused();
      inViewport(await box(page, '#docs-contents-title'));
      report.docs.push({ width, index: i, before, after: await page.evaluate(() => ({ hash: location.hash, scrollY, focus: document.activeElement.id })) });
    }
    await page.locator('.docs-contents a[href="#/docs/risks"]').click();
    await expect(page.locator('#docs-risks')).toBeFocused(); await page.locator('#docs-risks .docs-back').click();
    await expect(page.locator('#docs-contents-title')).toBeFocused(); assert.equal(new URL(page.url()).hash, '#/docs');
    await page.goBack(); await expect(page.locator('#docs-risks')).toBeFocused();
    await page.locator('#docs-risks .docs-back').click();
    if (width === 390) await screenshot(page, 'docs-return-390');
  });
  for (const width of [320, 390, 1440]) await scenario(`Currency radio arrows retain focus including free credit at ${width}px`, width, async page => {
    await load(page, 'packs'); await page.locator('#currency-eth').focus();
    for (const [key, expected] of [['ArrowRight', 'tokens'], ['ArrowLeft', 'eth']]) {
      await page.keyboard.press(key); await expect(page.locator(`#currency-${expected}`)).toBeFocused(); await expect(page.locator(`#currency-${expected}`)).toBeChecked();
      report.currency.push({ width, key, expected, focus: await page.evaluate(() => document.activeElement.id) });
    }
    await load(page, 'farm'); await page.locator('#nft-starter').click(); await load(page, 'packs');
    await page.locator('#currency-eth').focus();
    for (const [key, expected] of [['ArrowRight', 'tokens'], ['ArrowRight', 'free'], ['ArrowLeft', 'tokens'], ['ArrowLeft', 'eth']]) {
      await page.keyboard.press(key); await expect(page.locator(`#currency-${expected}`)).toBeFocused(); await expect(page.locator(`#currency-${expected}`)).toBeChecked();
    }
    await dismiss(page); await page.locator('#currency-eth').focus(); await page.keyboard.press('ArrowRight');
    if (width === 390) await screenshot(page, 'currency-focus-390');
  });
  for (const width of [320, 390, 768]) await scenario(`Spare selection exposes actions and installs hardware at ${width}px`, width, async page => {
    await load(page, 'farm'); await page.locator('#slot-0-1').click(); await dismiss(page);
    const item = page.locator('[data-item]').filter({ hasText: 'Power Supply' }); await item.click();
    await expect(item).toBeFocused(); inViewport(await box(page, '#item-selection')); inViewport(await box(page, '#install'));
    assert.equal(await page.locator('.inventory').locator(':scope > *').count(), 15);
    const selection = await box(page, '#item-selection'), grid = await box(page, '.inventory'); assert.ok(selection.y + selection.height <= grid.y);
    report.inventory.push({ width, selection, grid, install: await box(page, '#install'), selected: await item.boundingBox() });
    if (width === 390) await screenshot(page, 'inventory-actions-390');
    await page.locator('#install').click(); await expect(page.locator('#slot-0-1')).toContainText('Power Supply');
    await expect(page.locator('#item-selection h3')).toHaveCount(0); await expect(page.locator('#install')).toHaveCount(0);
    assert.ok((await saved(page)).rooms[0].slots[1]);
  });
  await scenario('Task panel names and omitted Farm description', 390, async page => {
    await load(page, 'farm'); assert.equal(await page.locator('.page-heading p').count(), 0);
    await expect(page.locator('#city-title')).toHaveText('City grid'); await expect(page.locator('.lobby-row h3')).toHaveText('Lobby your district');
    await expect(page.locator('.side-extras h2').first()).toHaveText('Referrals'); await screenshot(page, 'farm-top-390');
    await page.locator('#city-title').scrollIntoViewIfNeeded(); await screenshot(page, 'city-grid-390');
    await page.locator('.side-extras').scrollIntoViewIfNeeded(); await screenshot(page, 'referrals-390');
    await page.locator('#lobby').click(); await expect(page.locator('.lobby-row h3')).toHaveText('Lobbying filed');
    await load(page, 'packs'); await expect(page.locator('.pack-explainer h2').first()).toHaveText('Pack pricing');
    await page.locator('.pack-explainer').scrollIntoViewIfNeeded(); await screenshot(page, 'pack-pricing-390');
  });
  for (const width of [320, 390]) await scenario(`Card footprint stays stable for all names and equip locks at ${width}px`, width, async page => {
    await load(page, 'packs'); const initial = await saved(page);
    await page.locator('#open-pack').click(); await page.locator('#reveal-all').waitFor(); await dismiss(page);
    const original = { cards: await box(page, '#cards'), control: await box(page, '#reveal-all'), scrollY: await page.evaluate(() => scrollY) };
    await page.locator('#reveal-0').click(); await expect(page.locator('.revealed')).toHaveCount(1); await dismiss(page);
    const revealed = { cards: await box(page, '#cards'), control: await box(page, '#reveal-all'), scrollY: await page.evaluate(() => scrollY) };
    near(original.cards.height, revealed.cards.height); near(original.control.y, revealed.control.y); near(original.scrollY, revealed.scrollY);
    report.freshReveal.push({ width, before: original, after: revealed }); await screenshot(page, `ordinary-reveal-${width}`);
    for (const rarity of ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic']) for (const type of ['GPU', 'ASIC', 'FPGA', 'Power Supply', 'Battery', 'Solar Panel', 'Fan', 'Liquid Cooling', 'Router', 'Motherboard', 'Server Rack', 'Surge Protector']) {
      const state = structuredClone(initial); state.totalPacks = 1; state.nextId = 54;
      state.pendingPack = { id: 'pack-50', cards: [0, 1, 2].map(i => ({ id: `item-${51 + i}`, type, rarity, durability: 100 })), revealed: [false, false, false], currency: 'eth', price: .01 };
      await page.evaluate(({ state, key }) => localStorage.setItem(key, JSON.stringify(state)), { state, key: storageKey });
      await page.reload(); await page.locator('#reveal-0').waitFor(); await page.evaluate(() => document.fonts.ready);
      const before = { cards: await box(page, '#cards'), control: await box(page, '#reveal-all'), scrollY: await page.evaluate(() => scrollY) };
      await page.locator('#reveal-0').click(); await expect(page.locator('.revealed')).toHaveCount(1); await dismiss(page);
      const after = { cards: await box(page, '#cards'), control: await box(page, '#reveal-all'), scrollY: await page.evaluate(() => scrollY) };
      near(before.cards.height, 288); near(before.cards.height, after.cards.height); near(before.control.y + before.scrollY, after.control.y + after.scrollY);
      await expect(page.locator('.revealed h3')).toHaveText(type);
      const clipping = await page.locator('.revealed').evaluate(card => {
        const bounds = card.getBoundingClientRect();
        return [...card.querySelectorAll('h3,p,.card-added,.card-rarity')].map(el => ({ text: el.textContent, box: el.getBoundingClientRect() })).filter(({ box }) => box.left < bounds.left || box.right > bounds.right || box.top < bounds.top || box.bottom > bounds.bottom).map(({ text }) => text);
      }); assert.deepEqual(clipping, []);
      if (['Epic', 'Legendary', 'Mythic'].includes(rarity)) await expect(page.locator('.card-added')).toContainText('Equip at level');
      report.cards.push({ width, type, rarity, heightBefore: before.cards.height, heightAfter: after.cards.height, controlShift: after.control.y + after.scrollY - before.control.y - before.scrollY, clipping });
      if (type === 'Surge Protector' && rarity === 'Legendary') { await page.locator('#cards').scrollIntoViewIfNeeded(); await screenshot(page, `locked-cards-${width}`); }
      await page.locator('#reveal-all').click(); await expect(page.locator('.revealed')).toHaveCount(3); near((await box(page, '#cards')).height, before.cards.height);
    }
  });
  await scenario('Rendered opaque beta/action/focus color pairs', 390, async page => {
    await load(page, 'farm'); await page.locator('[data-item]').filter({ hasText: 'Power Supply' }).click();
    const pairs = await page.evaluate(() => ['.demo-strip span', '#install', '#inventory-filter'].map(selector => {
      const el = document.querySelector(selector), style = getComputedStyle(el); let parent = el;
      while (parent && getComputedStyle(parent).backgroundColor === 'rgba(0, 0, 0, 0)') parent = parent.parentElement;
      let surrounding = el.parentElement;
      while (surrounding && getComputedStyle(surrounding).backgroundColor === 'rgba(0, 0, 0, 0)') surrounding = surrounding.parentElement;
      return { selector, foreground: style.color, background: getComputedStyle(parent).backgroundColor, surrounding: getComputedStyle(surrounding).backgroundColor, outline: getComputedStyle(document.documentElement).getPropertyValue('--focus').trim() };
    }));
    const rgb = value => value.startsWith('#') ? value.slice(1).match(/../g).map(n => parseInt(n, 16)) : value.match(/[\d.]+/g).slice(0, 3).map(Number);
    const luminance = value => rgb(value).map(n => { const v = n / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((a, n, i) => a + n * [.2126, .7152, .0722][i], 0);
    const ratio = (a, b) => { const values = [luminance(a), luminance(b)].sort((a, b) => b - a); return (values[0] + .05) / (values[1] + .05); };
    for (const pair of pairs) { const textRatio = ratio(pair.foreground, pair.background), focusRatio = ratio(pair.outline, pair.surrounding); assert.ok(textRatio >= 4.5); assert.ok(focusRatio >= 3); report.contrast.push({ ...pair, textRatio, focusRatio }); }
  });
  assert.deepEqual(report.errors, []);
} catch (error) { report.failures.push({ name: 'Runtime/resource audit', error: error.message }); }
finally {
  report.status = report.failures.length ? 'failed' : 'passed';
  await writeFile('reports/revision-results.json', JSON.stringify(report, null, 2) + '\n');
  await browser.close(); await preview.close();
}
console.log(`${report.checks.length} review checks passed; ${report.failures.length} failed. Report: reports/revision-results.json`);
if (report.failures.length) process.exitCode = 1;
