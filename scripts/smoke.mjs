import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { startPreview, dependency } from './preview-server.mjs';

const { chromium, expect } = dependency('@playwright/test');
const { default: AxeBuilder } = dependency('@axe-core/playwright');
const storageKey = 'blackout.demo.v3';
const preview = await startPreview();
let browser;
const results = {
  runAt: new Date().toISOString(), export: 'dist/', hostingPath: '/preview/',
  checks: [], failures: [], consoleErrors: [], failedRequests: [], firstScreen: {}, overflow: [], accessibility: [],
  setup: ['Fresh browser context for each scenario.', 'The browser clock is paused; epoch/day controls and a controlled 45-second clock advance exercise time without waiting.', 'Full-inventory, late-season prize and rarity-animation scenarios use valid localStorage fixtures, then exercise production UI controls.'],
  limitations: ['Chromium emulation only; no physical mobile device, real screen-reader session or browser-native zoom test.', 'The game, referrals, NFT eligibility and season competition are local simulations. No chain or wallet transactions are tested.', 'axe checks and DOM geometry are automated evidence, not a complete accessibility or visual review.'],
};
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
const near = (actual, expected, tolerance = 0.000001) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
const click = (page, selector) => page.locator(selector).click();
const goto = async (page, route = '') => {
  await page.goto(`${preview.url}#/${route}`);
  await page.locator('main h1').waitFor();
  await page.evaluate(() => document.fonts.ready);
};
const route = async (page, name) => {
  await page.locator(`[data-route="${name}"]`).click();
  await expect(page.locator(`[data-route="${name}"]`)).toHaveAttribute('aria-current', 'page');
};
const dismiss = async page => { if (await page.locator('#notice').isVisible()) await click(page, '#dismiss-notice'); };
const seed = async (page, change) => {
  const state = await saved(page); change(state);
  await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key: storageKey, state });
  await page.reload();
  await expect(page.locator('#storage-warning')).toBeHidden();
};
const demoTools = async page => { if (!await page.locator('#demo-tools').getAttribute('open')) await page.locator('#demo-tools summary').click(); };
async function scenario(name, callback, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', error => results.consoleErrors.push({ scenario: name, message: error.message }));
  page.on('console', message => { if (message.type() === 'error') results.consoleErrors.push({ scenario: name, message: message.text() }); });
  page.on('requestfailed', request => results.failedRequests.push({ scenario: name, url: request.url(), error: request.failure()?.errorText }));
  page.on('response', response => { if (response.status() >= 400) results.failedRequests.push({ scenario: name, url: response.url(), status: response.status() }); });
  let timeout;
  try {
    await page.clock.install({ time: new Date('2026-10-11T12:00:00Z') });
    await page.clock.pauseAt(new Date('2026-10-11T12:00:01Z'));
    await Promise.race([callback(page, context), new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Scenario exceeded its 90-second budget')), 90_000); })]);
    results.checks.push(name); console.log(`PASS ${name}`);
  } catch (error) {
    results.failures.push({ scenario: name, message: error.message });
    console.error(`FAIL ${name}: ${error.message.slice(0, 2200)}`);
    await mkdir('test/scratch/browser', { recursive: true });
    await page.screenshot({ path: `test/scratch/browser/smoke-failure-${results.failures.length}.png`, fullPage: false }).catch(() => {});
  } finally { clearTimeout(timeout); await context.close(); }
}

try {
  browser = await chromium.launch({ headless: true });
  await scenario('Landing metadata, local assets and primary action in the 390px first viewport', async page => {
    await goto(page);
    assert.match(await page.title(), /BLACKOUT/);
    assert.equal(await page.locator('h1').count(), 1);
    for (const selector of ['meta[name="description"]', 'meta[property="og:title"]', 'meta[property="og:image"]']) assert.ok(await page.locator(selector).getAttribute('content'));
    assert.equal(await page.locator('link[rel="icon"]').count(), 1);
    assert.ok(await page.evaluate(() => document.fonts.check('16px Pixel') && document.fonts.check('16px Mono')));
    for (const selector of ['#hero-title', '.hero-description', '.hero-actions .primary']) {
      const box = await page.locator(selector).boundingBox();
      results.firstScreen[selector] = box;
      assert.ok(box && box.y >= 0 && box.y + box.height <= 844, `${selector} is outside the first 844px viewport: ${JSON.stringify(box)}`);
    }
    assert.match(await page.locator('.launch-badge').innerText(), /Launching soon on Robinhood Chain/);
    await click(page, '.hero-actions .primary');
    await expect(page.locator('main h1')).toContainText('Your farm');
  }, { viewport: { width: 390, height: 844 } });

  await scenario('Static hash routes load directly and reload with shared localStorage progress', async (page, context) => {
    for (const [name, heading] of [['farm', 'Your farm'], ['packs', 'Open packs.'], ['docs', 'Player guide']]) {
      await goto(page, name); await expect(page.locator('main h1')).toContainText(heading);
      await page.reload(); await expect(page.locator('main h1')).toContainText(heading);
      await expect(page.locator(`[data-route="${name}"]`)).toHaveAttribute('aria-current', 'page');
    }
    await route(page, 'farm');
    const secondTab = await context.newPage();
    await secondTab.clock.install({ time: new Date('2026-10-11T12:00:00Z') });
    await secondTab.clock.pauseAt(new Date('2026-10-11T12:00:01Z'));
    await goto(secondTab, 'packs');
    await click(page, '#nft-starter');
    await expect(page.locator('#nft-starter')).toBeDisabled();
    await secondTab.clock.runFor(1100);
    await expect(secondTab.locator('[name="currency"][value="free"]')).toBeVisible();
    await secondTab.close();
    await route(page, 'packs'); await expect(page.locator('[name="currency"][value="free"]')).toBeVisible();
    await page.reload(); assert.equal((await saved(page)).freePacks, 1);
    assert.equal(new URL(page.url()).pathname, '/preview/');
  });

  await scenario('Install/remove hardware, active/missing combos, upkeep, claims and epoch dispatch', async page => {
    await goto(page, 'farm');
    assert.equal(await page.locator('.farm-slot.filled').count(), 1);
    await click(page, '[data-unplace="0,0"]'); await expect(page.locator('.farm-slot.filled')).toHaveCount(0);
    await click(page, '[data-item="item-1"]'); await click(page, '[data-place="0,0"]');
    await expect(page.locator('[data-unplace="0,0"]')).toBeVisible();
    for (const id of ['item-2', 'item-3']) { await click(page, `[data-item="${id}"]`); await click(page, '#install'); }
    await expect(page.locator('.farm-slot.filled')).toHaveCount(3);
    assert.equal(await page.locator('.farm-slot.compatible').count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'slot-0-2');
    await expect(page.locator('.combo.active').first()).toContainText('Common set');
    await page.locator('#combos-0 summary').click(); await expect(page.locator('#combos-0')).toContainText('Needs: ASIC');
    await demoTools(page); const before = await saved(page);
    await click(page, '#next-epoch'); await expect.poll(async () => (await saved(page)).epoch).toBe(before.epoch + 1);
    assert.ok((await saved(page)).unclaimed > 0); assert.ok((await saved(page)).inventory.some(item => item.durability < 100));
    await click(page, '#claim'); await expect(page.locator('#claim')).toBeDisabled();
    assert.equal((await saved(page)).unclaimed, 0);
    await click(page, '[data-repair="0"]'); assert.ok((await saved(page)).inventory.every(item => item.durability === 100));
    await click(page, '[data-overclock="0"]'); await expect(page.locator('[data-overclock="0"]')).toContainText('1/3');
    await click(page, '#electricity'); await expect(page.locator('#electricity')).toBeDisabled(); assert.equal((await saved(page)).electricity, 100);
    await click(page, '#lobby'); await expect(page.locator('#lobby')).toBeDisabled();
    const epoch = (await saved(page)).epoch; await click(page, '#next-epoch');
    await expect.poll(async () => (await saved(page)).epoch).toBe(epoch + 1);
    await expect(page.locator('#lobby')).toBeEnabled();
    assert.equal(await page.locator('.district').count(), 8);
    assert.notEqual(await page.locator('#latest-letter h3').innerText(), 'Connection established');
    await page.locator('[data-overclock="0"]').focus(); await page.clock.runFor(1000);
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-overclock')), '0');
    const state = await saved(page); await page.reload(); assert.deepEqual((await saved(page)).rooms, state.rooms);
  });

  await scenario('A timed 45-second epoch mines and delivers a dispatcher letter without real-time waiting', async page => {
    await goto(page, 'farm'); await page.locator('[data-overclock="0"]').focus();
    await page.clock.runFor(45_100);
    await expect.poll(async () => (await saved(page)).epoch).toBe(1);
    assert.ok((await saved(page)).unclaimed > 0);
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-overclock')), '0');
    await expect(page.locator('#latest-letter h3')).not.toHaveText('Connection established');
  });

  await scenario('ETH/token packs, dynamic prices, ordered reveals and unfinished-pack persistence', async page => {
    await goto(page, 'packs');
    const before = await saved(page); const oldPrice = Number(await page.locator('#pack-price').innerText());
    await click(page, '#open-pack'); await expect(page.locator('#reveal-0')).toBeEnabled();
    await expect(page.locator('#reveal-1')).toBeDisabled(); await expect(page.locator('#reveal-2')).toBeDisabled();
    near((await saved(page)).ethBalance, before.ethBalance - oldPrice);
    assert.ok(Number(await page.locator('#pack-price').innerText()) > oldPrice);
    await page.keyboard.press('Enter'); await expect(page.locator('.revealed')).toHaveCount(1);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'reveal-1');
    const pending = (await saved(page)).pendingPack; await page.reload();
    assert.deepEqual((await saved(page)).pendingPack, pending);
    await expect(page.locator('.revealed')).toHaveCount(1); await expect(page.locator('#reveal-1')).toBeEnabled();
    await click(page, '#reveal-all'); await expect(page.locator('.revealed')).toHaveCount(3);
    await page.locator('[name="currency"][value="tokens"]').check();
    const beforeTokens = (await saved(page)).tokens;
    const quoted = Number((await page.locator('#pack-payment').innerText()).match(/[\d,.]+/)[0].replaceAll(',', ''));
    await click(page, '#open-pack'); await expect(page.locator('#reveal-0')).toBeEnabled();
    const afterTokens = await saved(page); assert.equal(afterTokens.pendingPack.currency, 'tokens');
    near(beforeTokens - afterTokens.tokens, quoted, .011);
    await click(page, '#reveal-all'); await expect(page.locator('.revealed')).toHaveCount(3);
    const demandedPrice = Number(await page.locator('#pack-price').innerText());
    await route(page, 'farm'); assert.equal((await saved(page)).inventory.length, 9);
    await page.locator('#inventory-filter').selectOption('compute');
    assert.ok((await page.locator('.inventory-item strong').allTextContents()).every(type => ['GPU', 'ASIC', 'FPGA'].includes(type)));
    await demoTools(page); await click(page, '#advance-day');
    await route(page, 'packs');
    const quietPrice = Number(await page.locator('#pack-price').innerText());
    assert.ok(quietPrice < demandedPrice, 'A quiet demo day must lower the displayed pack quote');
    await page.reload(); near(Number(await page.locator('#pack-price').innerText()), quietPrice);
  });

  await scenario('Full inventory recovery, equip lock, expansion, merge and scrap confirmation', async page => {
    await goto(page, 'farm');
    await seed(page, state => {
      state.tokens = 1000; state.pendingPack = null; state.nextId = 200;
      state.inventory = [state.inventory[0], ...Array.from({ length: 15 }, (_, i) => ({ id: `item-${100 + i}`, type: i < 3 ? 'ASIC' : 'Router', rarity: i === 14 ? 'Epic' : 'Common', durability: 100 }))];
    });
    await route(page, 'packs'); await expect(page.locator('#open-pack')).toBeDisabled();
    await expect(page.locator('.pack-stage')).toContainText('Scrap, merge or expand');
    await route(page, 'farm'); await click(page, '[data-item="item-114"]');
    await expect(page.locator('#item-selection')).toContainText('Equip at level 3'); await expect(page.locator('#install')).toHaveCount(0);
    await click(page, '#expand'); await expect.poll(async () => (await saved(page)).inventoryCapacity).toBe(20);
    await click(page, '[data-item="item-100"]'); await click(page, '#merge');
    await expect(page.locator('#confirm-dialog')).toBeVisible(); await expect(page.locator('#confirm-body')).toContainText('Consume 3 Common ASIC');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'cancel-confirm');
    await page.keyboard.press('Escape'); await expect(page.locator('#confirm-dialog')).toBeHidden();
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'merge');
    await click(page, '#merge'); await click(page, '#accept-confirm');
    await expect(page.locator('#item-selection h3')).toHaveText('Rare ASIC');
    assert.equal((await saved(page)).inventory.filter(item => item.type === 'ASIC').length, 1);
    const rare = (await saved(page)).inventory.find(item => item.type === 'ASIC');
    await click(page, '#scrap'); await expect(page.locator('#confirm-body')).toContainText('Permanently remove Rare ASIC');
    await click(page, '#accept-confirm'); assert.ok(!(await saved(page)).inventory.some(item => item.id === rare.id));
    await route(page, 'packs'); await expect(page.locator('#open-pack')).toBeEnabled();
  });

  await scenario('Withdraw preview, invalid input recovery and explicit confirmation', async page => {
    await goto(page, 'farm');
    await page.locator('#withdraw-amount').fill('10');
    await expect(page.locator('#withdraw-preview')).toContainText('You receive 8.00');
    await page.locator('#withdraw-form button').click(); await expect(page.locator('#confirm-body')).toContainText('No transfer is made.');
    await click(page, '#cancel-confirm'); assert.equal((await saved(page)).withdrawn, 0);
    await page.locator('#withdraw-form button').click(); await click(page, '#accept-confirm');
    near((await saved(page)).withdrawn, 8); near((await saved(page)).tokens, 340);
    await page.locator('#withdraw-amount').fill('999999'); await page.locator('#withdraw-form button').click();
    await expect(page.locator('#notice-text')).toContainText('Enter an amount from');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'withdraw-amount');
    await expect(page.locator('#confirm-dialog')).toBeHidden();
  });

  await scenario('NFT practice credit, free pack, referral dashboard and clipboard fallback', async page => {
    await goto(page, 'farm'); await click(page, '#nft-starter'); await expect(page.locator('#nft-starter')).toBeDisabled();
    assert.equal((await saved(page)).freePacks, 1);
    await click(page, '#simulate-referral'); const referralState = await saved(page);
    assert.equal(referralState.referral.invitees, 1); near(referralState.referral.earned, .6); near(referralState.unclaimed, .6);
    assert.equal(new URL(await page.locator('#referral-link').inputValue()).searchParams.get('ref'), referralState.referral.code);
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }));
    await click(page, '#copy-referral'); await expect(page.locator('#notice-text')).toContainText('Select and copy');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'referral-link');
    await route(page, 'packs'); await page.locator('[name="currency"][value="free"]').check();
    const before = await saved(page); await click(page, '#open-pack'); await expect(page.locator('#reveal-0')).toBeEnabled();
    const after = await saved(page); assert.equal(after.freePacks, 0); near(after.tokens, before.tokens); near(after.ethBalance, before.ethBalance);
    await click(page, '#reveal-all'); await expect(page.locator('.revealed')).toHaveCount(3);
  });

  await scenario('Game-day unlocks, seven-day withdrawal floor, season settlement and reward claim', async page => {
    await goto(page, 'farm');
    await seed(page, state => { state.season.farmScore = 10000; state.season.districtScores[state.district] = 10000; });
    await demoTools(page);
    for (let day = 1; day <= 7; day++) {
      await click(page, '#advance-day'); await expect.poll(async () => (await saved(page)).gameDays).toBe(day);
      if (day === 3) assert.ok((await saved(page)).rooms.some(room => room.id === 1));
    }
    assert.equal((await saved(page)).epoch, 28); assert.equal((await saved(page)).season.number, 2);
    await expect(page.locator('#tax-rate')).toHaveText(/5(?:\.0)?% tax/);
    await expect(page.locator('#season-claim')).toBeEnabled();
    const before = await saved(page); await click(page, '#season-claim');
    const after = await saved(page); near(after.tokens - before.tokens, before.season.pendingTokens);
    assert.equal(after.freePacks - before.freePacks, before.season.pendingFreePacks);
    await expect(page.locator('#season-claim')).toBeDisabled();
  });

  await scenario('Docs contents, all required chapters, contextual deep links and keyboard navigation', async page => {
    await goto(page, 'docs'); assert.equal(await page.locator('.docs-section').count(), 19);
    await page.locator('.docs-contents a[href="#/docs/rooms-and-combos"]').click();
    await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('docs-rooms-and-combos');
    await expect(page.locator('#docs-rooms-and-combos')).toContainText('Cold Power');
    await page.locator('#docs-rooms-and-combos .docs-back').click(); assert.equal(new URL(page.url()).hash, '#/docs');
    await route(page, 'farm'); await page.locator('a[href="#/docs/city-and-swarm-events"]').click();
    await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('docs-city-and-swarm-events');
    await page.locator('.skip-link').focus(); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'main');
  });

  await scenario('Responsive reflow on all pages at 320, 390, 768 and 1440 CSS pixels', async page => {
    const issues = [];
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
      for (const name of ['', 'farm', 'packs', 'docs']) {
        await goto(page, name); await dismiss(page);
        const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, offenders: [...document.querySelectorAll('#app *')].filter(element => { const box = element.getBoundingClientRect(); return box.width > 0 && (box.right > innerWidth + 1 || box.left < -1) && !element.closest('.hero-city, .docs-table') && !element.matches('svg, svg *'); }).slice(0, 8).map(element => ({ element: element.tagName, class: typeof element.className === 'string' ? element.className : '', text: element.textContent.slice(0, 60) })) }));
        results.overflow.push({ route: name || 'home', width, ...dimensions });
        if (dimensions.document > width + 1) issues.push({ route: name || 'home', width, ...dimensions });
      }
    }
    await page.setViewportSize({ width: 390, height: 844 }); await goto(page, 'docs');
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    const enlarged = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    results.overflow.push({ route: 'docs', width: 390, textEnlargement: '200%', ...enlarged });
    if (enlarged.document > 391) issues.push({ textEnlargement: '200%', ...enlarged });
    assert.deepEqual(issues, []);
  });

  await scenario('Automated WCAG A/AA audit of landing, farm, packs, docs and confirmation', async page => {
    // axe schedules work through browser timers; resume after the deterministic gameplay cases.
    await page.clock.resume();
    for (const name of ['', 'farm', 'packs', 'docs', 'confirmation']) {
      await goto(page, name === 'confirmation' ? 'farm' : name);
      if (name === 'confirmation') { await page.locator('#withdraw-amount').fill('10'); await page.locator('#withdraw-form button').click(); }
      const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      results.accessibility.push({ route: name || 'home', passes: audit.passes.length, violations: audit.violations.map(item => ({ id: item.id, impact: item.impact, description: item.description, nodes: item.nodes.map(node => ({ target: node.target, failureSummary: node.failureSummary })) })), incomplete: audit.incomplete.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })) });
    }
    assert.deepEqual(results.accessibility.flatMap(audit => audit.violations.map(item => ({ route: audit.route, id: item.id, impact: item.impact, targets: item.nodes.map(node => node.target) }))), []);
  });

  await scenario('Reduced motion, normal pack animation, Mythic flash and offline loaded interactions', async (page, context) => {
    await goto(page, 'packs');
    assert.equal(await page.locator('#pack-art').evaluate(element => getComputedStyle(element).animationName), 'none');
    await context.setOffline(true); await click(page, '#open-pack'); await expect(page.locator('#reveal-0')).toBeEnabled();
    await click(page, '#reveal-all'); await expect(page.locator('.revealed')).toHaveCount(3); await context.setOffline(false);
    await seed(page, state => {
      state.pendingPack = { id: 'pack-99', currency: 'free', price: 0, cards: ['Mythic', 'Epic', 'Legendary'].map((rarity, i) => ({ id: `item-${300 + i}`, type: ['GPU', 'Liquid Cooling', 'Server Rack'][i], rarity, durability: 100 })), revealed: [false, false, false] };
      state.nextId = 400;
    });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(page.locator('#motion-toggle')).toHaveText('Animation: on');
    assert.equal(await page.locator('#pack-art').evaluate(element => getComputedStyle(element).animationName), 'pack-float');
    await click(page, '#reveal-0'); await expect(page.locator('.revealed.mythic')).toHaveCount(1);
    assert.equal(await page.locator('.mythic-flash').evaluate(element => getComputedStyle(element).animationName), 'screen-flash');
    assert.equal(await page.locator('.revealed.mythic').evaluate(element => getComputedStyle(element).animationName), 'card-flip');
    await click(page, '#reveal-1'); await expect(page.locator('.revealed.epic')).toHaveCount(1);
    assert.equal(await page.locator('.revealed.mythic').evaluate(element => getComputedStyle(element).animationName), 'none');
    assert.equal(await page.locator('.revealed.epic').evaluate(element => getComputedStyle(element).animationName), 'card-flip');
    await click(page, '#motion-toggle'); assert.equal(await page.locator('.mythic-flash').evaluate(element => getComputedStyle(element).animationName), 'none');
    await click(page, '#reveal-all'); await expect(page.locator('.revealed')).toHaveCount(3);
    await click(page, '#motion-toggle');
    await click(page, '#open-pack'); await expect(page.locator('.pack-stage.opening')).toBeVisible();
    assert.equal(await page.locator('#pack-art').evaluate(element => getComputedStyle(element).animationName), 'pack-shake');
    assert.equal(await page.locator('.pack-seal').evaluate(element => getComputedStyle(element).animationName), 'seal-break');
    assert.equal(await page.locator('.light-burst').evaluate(element => getComputedStyle(element).animationName), 'burst');
    await page.clock.runFor(900); await expect(page.locator('#reveal-0')).toBeEnabled();
  });

  if (results.consoleErrors.length || results.failedRequests.length) results.failures.push({ scenario: 'Browser errors and resources', message: JSON.stringify({ consoleErrors: results.consoleErrors, failedRequests: results.failedRequests }) });
  else results.checks.push('No console errors, page errors, failed requests or HTTP 4xx/5xx responses');
} finally {
  await mkdir('reports', { recursive: true });
  results.status = results.failures.length ? 'failed' : 'passed';
  await writeFile('reports/interaction-results.json', JSON.stringify(results, null, 2) + '\n');
  await browser?.close(); await preview.close();
}
console.log(`${results.checks.length} checks passed; ${results.failures.length} failed. Report: reports/interaction-results.json`);
if (results.failures.length) process.exitCode = 1;
