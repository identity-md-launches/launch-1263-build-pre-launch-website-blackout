import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { startPreview, dependency } from './preview-server.mjs';

const { chromium, expect } = dependency('@playwright/test');
const preview = await startPreview();
const key = 'blackout.demo.v3';
const wornMessage = 'Worn hardware is reducing mining. Repair your items to restore output.';
const fireMessage = 'Server fire damaged your hardware and reduced its mining. Repair the affected items.';
const report = {
  runAt: new Date().toISOString(), export: 'dist/', subpath: '/preview/',
  browser: 'Chromium', viewport: { width: 390, height: 844 }, reducedMotion: 'reduce',
  checks: [], failures: [], consoleErrors: [], failedRequests: [],
  firstVisits: [], wear: [], fixtures: [], screenshots: [],
};
let browser;

const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const goto = async (page, route = '') => {
  await page.goto(preview.url + '#/' + route);
  await page.locator('main h1').waitFor();
  await page.evaluate(() => document.fonts.ready);
};
const nav = async (page, route) => {
  await page.locator(`[data-route="${route}"]`).click();
  await expect(page.locator(`[data-route="${route}"]`)).toHaveAttribute('aria-current', 'page');
};
const hash = async page => parseFloat(await page.locator('#total-hash').innerText());
const warningTexts = page => page.locator('.mining-warning p').allTextContents();
const shot = async (page, name) => {
  const path = `reports/screenshots/fidelity/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  report.screenshots.push(path);
};

async function scenario(name, run) {
  const context = await browser.newContext({ viewport: report.viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  page.on('pageerror', error => report.consoleErrors.push({ name, message: error.message }));
  page.on('console', message => {
    if (message.type() === 'error') report.consoleErrors.push({ name, message: message.text() });
  });
  page.on('requestfailed', request => report.failedRequests.push({ name, url: request.url(), message: request.failure()?.errorText }));
  page.on('response', response => {
    if (response.status() >= 400) report.failedRequests.push({ name, url: response.url(), status: response.status() });
  });
  let timeout;
  try {
    await page.clock.install({ time: new Date('2026-10-11T12:00:00Z') });
    await page.clock.pauseAt(new Date('2026-10-11T12:00:01Z'));
    await Promise.race([
      run(page),
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('60s scenario budget exceeded')), 60_000); }),
    ]);
    report.checks.push(name);
    console.log('PASS ' + name);
  } catch (error) {
    report.failures.push({ name, message: error.message });
    console.error('FAIL ' + name + ': ' + error.message);
  } finally {
    clearTimeout(timeout);
    await context.close();
  }
}

async function firstVisit(page, entry) {
  await goto(page, entry === 'direct' ? 'farm' : '');
  if (entry === 'landing') await page.getByRole('link', { name: 'Play demo' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-page', 'farm');
  await expect(page.locator('.onboarding')).toContainText('1 / 4');
  await expect(page.locator('main h1')).toHaveCount(1);
  await expect(page.locator('#rooms-title')).toHaveText('Mining rooms');
  await page.evaluate(() => document.fonts.ready);
  const positions = await page.evaluate(() => {
    const box = selector => {
      const { x, y, width, height, top, bottom } = document.querySelector(selector).getBoundingClientRect();
      return { x, y, width, height, top, bottom };
    };
    return {
      scrollY, scrollWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth,
      room: box('.mining-room'), roomHeader: box('.room-title'),
      hardware: box('#slot-0-0 .sprite'), slot: box('#slot-0-0'),
      guide: box('.onboarding'), guideAction: box('#guide-action'),
      nav: box('.game-nav'), claim: box('#claim'),
      farmPaddingTop: getComputedStyle(document.querySelector('.inner-page')).paddingTop,
    };
  });
  report.firstVisits.push({ entry, ...positions });
  assert.equal(positions.scrollY, 0, 'Fresh Farm must start without scrolling');
  assert(positions.scrollWidth <= positions.viewportWidth, 'Farm must not overflow horizontally');
  for (const name of ['roomHeader', 'hardware', 'guide', 'guideAction', 'claim']) {
    assert(positions[name].top >= 0 && positions[name].bottom <= positions.nav.top,
      `${name} extends behind bottom tabs: ${JSON.stringify(positions[name])}`);
  }
  assert.equal(positions.farmPaddingTop, '16px');
  await shot(page, `${entry}-farm-390`);
}

async function fixture(page, name, mutate) {
  const state = await saved(page);
  state.inventory.forEach(item => { item.durability = 100; });
  state.rooms[0].slots = ['item-1', null, null, null, null, null];
  state.events = [];
  mutate(state);
  await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key, state });
  await page.reload();
  await page.locator('main h1').waitFor();
  await expect(page.locator('#storage-warning')).toBeHidden();
  report.fixtures.push({ name, warnings: await warningTexts(page), hashrate: await hash(page) });
}

try {
  await mkdir('reports/screenshots/fidelity', { recursive: true });
  browser = await chromium.launch({ headless: true });
  await scenario('Fresh landing → Play demo shows hardware above mobile tabs with the guide retained', page => firstVisit(page, 'landing'));
  await scenario('Fresh direct Farm shows hardware above mobile tabs with one h1', page => firstVisit(page, 'direct'));

  await scenario('Normal wear appears across all tabs and the cross-tab repair shortcut restores mining', async page => {
    await goto(page, 'farm');
    await page.locator('#skip-guide').click();
    await expect(page.locator('.mining-warning')).toHaveCount(0);
    assert.equal(await hash(page), 10);
    await page.locator('#demo-tools > summary').click();
    await page.locator('#next-epoch').click();
    await expect(page.locator('#sync-status')).toHaveText('1 epoch to sync');
    await page.locator('#next-epoch').click();
    await expect(page.locator('#sync-status')).toHaveText('2 epochs to sync');
    const worn = await saved(page);
    assert.equal(worn.epoch, 2);
    assert.equal(worn.inventory[0].durability, 99);
    assert.equal(await hash(page), 9.9);
    report.wear.push({ stage: 'two exposed epochs', epoch: worn.epoch, durability: worn.inventory[0].durability, hashrate: await hash(page), events: worn.events.map(({ type, district }) => ({ type, district })) });
    for (const route of ['farm', 'packs', 'city', 'season', 'wallet', 'docs']) {
      await nav(page, route);
      await expect(page.locator('.mining-warning p')).toHaveText(wornMessage);
      await expect(page.locator('#mining-status')).toHaveText(wornMessage);
      await expect(page.getByRole('link', { name: 'Repair hardware' })).toHaveCount(1);
      report.wear.push({ stage: route, warnings: await warningTexts(page), hashrate: await hash(page) });
      if (route === 'city') await shot(page, 'worn-warning-390');
    }
    await page.getByRole('link', { name: 'Repair hardware' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('body')).toHaveAttribute('data-page', 'farm');
    await expect(page.locator('#slot-0-0')).toBeFocused();
    report.wear.push({ stage: 'repair shortcut focus', ...(await page.evaluate(() => {
      const el = document.activeElement;
      const style = getComputedStyle(el);
      return { focused: el.id, outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, outlineColor: style.outlineColor };
    })) });
    await page.keyboard.press('Enter');
    await page.locator('#repair-item-1').click();
    await expect(page.locator('.mining-warning')).toHaveCount(0);
    const repaired = await saved(page);
    assert.equal(repaired.inventory[0].durability, 100);
    assert.equal(await hash(page), 10);
    await expect(page.locator('#mining-status')).toHaveText('');
    report.wear.push({ stage: 'repaired', durability: repaired.inventory[0].durability, hashrate: await hash(page), warnings: await warningTexts(page) });
  });

  await scenario('Warning edge cases distinguish installed wear, broken hardware and active or expired fire', async page => {
    await goto(page, 'farm');
    await page.locator('#skip-guide').click();
    await fixture(page, 'installed wear without any event', state => { state.inventory[0].durability = 75; });
    await expect(page.locator('.mining-warning p')).toHaveText(wornMessage);
    assert.equal(await hash(page), 7.5);

    await fixture(page, 'worn spare only', state => { state.inventory[1].durability = 75; });
    await expect(page.locator('.mining-warning')).toHaveCount(0);
    assert.equal(await hash(page), 10);

    await fixture(page, 'broken installed item only', state => { state.inventory[0].durability = 0; });
    await expect(page.locator('.mining-warning')).toHaveCount(1);
    await expect(page.locator('.mining-warning p')).toContainText('1 broken item stopped mining');
    await expect(page.getByRole('link', { name: 'Repair hardware' })).toHaveCount(0);

    const fire = (state, expired = false) => {
      state.inventory[0].durability = 75;
      state.events = [{ id: 0, type: 'fire', district: state.district, at: state.updatedAt - 1000,
        expiresAt: expired ? state.updatedAt : state.nextEventAt, lobbied: false, protection: 'Cold Power prevents fire damage.' }];
    };
    await fixture(page, 'active local fire with worn installed item', state => fire(state));
    await expect(page.locator('.mining-warning p')).toHaveText(fireMessage);
    await expect(page.getByRole('link', { name: 'Repair hardware' })).toHaveCount(1);
    await fixture(page, 'expired local fire leaves wear warning', state => fire(state, true));
    await expect(page.locator('.mining-warning p')).toHaveText(wornMessage);

    await fixture(page, 'mixed broken and worn installed items', state => {
      state.inventory[0].durability = 0;
      state.inventory[1].durability = 75;
      state.rooms[0].slots[1] = 'item-2';
    });
    await expect(page.locator('.mining-warning')).toHaveCount(2);
    await page.getByRole('link', { name: 'Repair hardware' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#slot-0-1')).toBeFocused();
    await page.getByRole('link', { name: 'Fix broken items' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#slot-0-0')).toBeFocused();
    report.fixtures.push({ name: 'mixed recovery targets', wornFocus: 'slot-0-1', brokenFocus: 'slot-0-0' });
  });
} catch (error) {
  report.failures.push({ name: 'harness', message: error.message });
} finally {
  await browser?.close();
  await preview.close();
  await writeFile('reports/fidelity-results.json', JSON.stringify(report, null, 2) + '\n');
}

console.log(`${report.checks.length} passed; ${report.failures.length} failed; ${report.consoleErrors.length} console errors; ${report.failedRequests.length} failed requests`);
if (report.failures.length || report.consoleErrors.length || report.failedRequests.length) process.exitCode = 1;
