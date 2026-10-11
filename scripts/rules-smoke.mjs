import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { startPreview, dependency } from './preview-server.mjs';

const { chromium, expect } = dependency('@playwright/test');
const { default: AxeBuilder } = dependency('@axe-core/playwright');
const preview = await startPreview();
let browser;
const key = 'blackout.demo.v3';
const report = { runAt: new Date().toISOString(), export: 'dist/', hostingPath: '/preview/', checks: [], failures: [], errors: [], screenshots: [], audit: [], overclock: [], contrast: [], accessibility: [], limitations: ['Chromium emulation using the Ubuntu 24.04 fallback build on Ubuntu 26.04. The assigned browser connector could not launch because Google Chrome is absent.', 'Valid localStorage fixtures and a paused clock exercise rare combinations and audit boundaries through production controls; no chain data or live ranks.', 'No screen reader, physical device, Firefox/Safari, browser-native zoom, or external live publication verification. Contrast measures named opaque pairs only.'] };
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const load = async (page, route = 'farm') => {
  await page.goto(`${preview.url}#/${route}`);
  await page.locator('main h1').waitFor();
  await page.evaluate(() => document.fonts.ready);
};
const seed = async (page, edit) => {
  const state = await saved(page); edit(state);
  await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key, state });
  await page.reload(); await expect(page.locator('#storage-warning')).toBeHidden();
};
const equipment = (state, types, rarities = ['Common']) => {
  state.xp = 1560; state.level = 10;
  state.inventory = types.map((type, i) => ({id: `item-${i + 10}`, type, rarity: rarities[i] ?? rarities[0], durability: 100}));
  state.nextId = 100;
  state.rooms = [{ id: 0, overclock: 0, slots: Array.from({length: 6}, (_, i) => state.inventory[i]?.id ?? null) }];
  state.events = []; state.pendingPack = null;
};
const dismiss = async page => { if (await page.locator('#notice').isVisible()) await page.locator('#dismiss-notice').click(); };
const epoch = async page => {
  await dismiss(page);
  if (!await page.locator('#demo-tools').getAttribute('open')) await page.locator('#demo-tools summary').click();
  await page.locator('#next-epoch').click();
};
const shot = async (page, name) => {
  const path = `reports/screenshots/rules/${name}.png`;
  await page.screenshot({path}); report.screenshots.push(path);
};
const noOverflow = async page => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal page overflow');
// Locate a seed for a real dispatched event; do not replace production event code.
const rand = seed => { let x = seed >>> 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return [x >>> 0, (x >>> 0) / 4294967296]; };
const eventSeed = (min, max, district) => {
  for (let seed = 1; seed < 1_000_000; seed++) {
    const [next, roll] = rand(seed); const [, districtRoll] = rand(next);
    if (roll >= min && roll < max && Math.floor(districtRoll * 8) === district) return seed;
  }
  throw new Error('No event fixture seed');
};
async function scenario(name, width, callback) {
  const context = await browser.newContext({viewport: {width, height: 844}, reducedMotion: 'reduce'});
  const page = await context.newPage(); page.setDefaultTimeout(8000);
  page.on('pageerror', e => report.errors.push(`${name}: ${e.message}`));
  page.on('console', e => { if (e.type() === 'error') report.errors.push(`${name}: ${e.text()}`); });
  page.on('requestfailed', r => report.errors.push(`${r.url()}: ${r.failure()?.errorText}`));
  page.on('response', r => { if (r.status() >= 400) report.errors.push(`${r.status()} ${r.url()}`); });
  try {
    await page.clock.install({time: new Date('2026-10-11T12:00:00Z')});
    await page.clock.pauseAt(new Date('2026-10-11T12:00:01Z'));
    await callback(page); await noOverflow(page);
    report.checks.push(name); console.log(`PASS ${name}`);
  } catch (error) {
    report.failures.push({ name, message: error.message }); console.error(`FAIL ${name}: ${error.message}`);
    await shot(page, `failure-${report.failures.length}`).catch(() => {});
  } finally { await context.close(); }
}
try {
  browser = await chromium.launch();
  await mkdir('reports/screenshots/rules', {recursive: true});
  await scenario('Current landing first screen at 390px keeps product, Play demo and beta qualification visible', 390, async page => {
    await load(page, '');
    for (const selector of ['#hero-title', '.hero-description', '.hero-actions .primary', '.demo-strip span']) {
      const box = await page.locator(selector).boundingBox();
      assert.ok(box && box.y >= 0 && box.y + box.height <= 844);
    }
    await shot(page, 'landing-390');
    await page.locator('.hero-actions .primary').click(); await expect(page.locator('main h1')).toContainText('Your farm');
  });
  await scenario('All rarity bonuses and strongest-set selection match the Farm panel', 390, async page => {
    await load(page);
    for (const [rarity, bonus, base] of [['Common', 0, 10], ['Rare', 5, 28], ['Epic', 10, 80], ['Legendary', 20, 250], ['Mythic', 30, 800]]) {
      await seed(page, state => equipment(state, ['GPU', 'Battery', 'Fan'], [rarity]));
      const room = page.locator('.mining-room').first();
      await expect(room.locator('.subheading')).toContainText(`+${bonus}% hash`);
      await expect(room.locator('.room-combos > .combo-list .combo.active')).toHaveCount(bonus ? 1 : 0);
      const expected = (base * 2.2 * (1 + bonus / 100)).toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1});
      await expect(page.locator('#total-hash')).toContainText(expected);
    }
    await seed(page, state => equipment(state, ['GPU', 'ASIC', 'FPGA', 'Fan', 'Router', 'Server Rack'], ['Rare', 'Rare', 'Rare', 'Epic', 'Epic', 'Epic']));
    await expect(page.locator('.room-combos > .combo-list')).toContainText('Epic set');
    await expect(page.locator('.room-combos > .subheading')).toContainText('+35% hash');
    await page.locator('#combos-0 summary').click();
    await expect(page.locator('#combos-0')).toContainText('Common: no bonus');
    await expect(page.locator('#combos-0')).toContainText('Replaced by Triple Core');
    await page.locator('.room-combos').scrollIntoViewIfNeeded(); await shot(page, 'combos-390');
  });
  await scenario('Compute Duo switches to Triple Core without stacking, then returns after removal', 1440, async page => {
    await load(page); await seed(page, state => { equipment(state, ['GPU', 'ASIC', 'FPGA']); state.rooms[0].slots[2] = null; });
    await expect(page.locator('#total-hash')).toContainText('22.0');
    await expect(page.locator('.room-combos > .combo-list')).toContainText('Compute Duo');
    await page.locator('[data-item="item-12"]').click(); await page.locator('#install').click();
    await expect(page.locator('#total-hash')).toContainText('36.0');
    await expect(page.locator('.room-combos > .combo-list .combo.active strong')).not.toContainText('Compute Duo');
    await expect(page.locator('.room-combos > .combo-list .combo.active strong')).toHaveText('Triple Core');
    await page.locator('[data-unplace="0,2"]').click();
    await expect(page.locator('#total-hash')).toContainText('22.0');
  });
  for (const width of [320, 390, 768, 1440]) await scenario(`Overclock preview, keyboard cancel, confirmed cost and tariff at ${width}px`, width, async page => {
    await load(page); const before = await saved(page);
    await page.locator('#overclock-0').focus(); await page.keyboard.press('Enter');
    await expect(page.locator('#confirm-dialog')).toBeVisible();
    const body = await page.locator('#confirm-body').innerText();
    for (const text of ['23.81 DEMO', '+0% → +10%', '0.500 → 0.625', '+0% → +25%', '15% → 18.75%', 'Beta values, may change']) assert.ok(body.includes(text), `Missing preview: ${text}`);
    await expect(page.locator('#cancel-confirm')).toBeFocused();
    await page.locator('#repair-0').evaluate(el => el.focus());
    await expect(page.locator('#cancel-confirm')).toBeFocused();
    await page.keyboard.press('Tab'); await expect(page.locator('#accept-confirm')).toBeFocused();
    await page.keyboard.press('Shift+Tab'); await expect(page.locator('#cancel-confirm')).toBeFocused();
    await shot(page, `overclock-${width}`);
    const dialog = await page.locator('#confirm-dialog').evaluate(el => ({width: el.clientWidth, scrollWidth: el.scrollWidth, scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, height: el.clientHeight}));
    assert.ok(dialog.scrollWidth <= dialog.width); report.overclock.push({width, body, dialog});
    await page.keyboard.press('Escape'); await expect(page.locator('#overclock-0')).toBeFocused();
    assert.equal((await saved(page)).tokens, before.tokens);
    await page.keyboard.press('Enter'); await page.locator('#accept-confirm').click();
    await expect(page.locator('#overclock-0')).toContainText('1/5');
    near((await saved(page)).tokens, before.tokens - 25 / 1.05);
    await expect(page.locator('.tariff-list')).toContainText('18.75%');
    await expect(page.locator('#electricity')).toHaveCount(0);
    await page.reload(); await expect(page.locator('#overclock-0')).toContainText('1/5');
  });
  await scenario('Overclock costs rise through five levels; maximum and insufficient-funds states work', 390, async page => {
    await load(page); await seed(page, state => { state.tokens = 1000; });
    for (let level = 1; level <= 5; level++) {
      const before = await saved(page);
      await page.locator('#overclock-0').click();
      await expect(page.locator('#confirm-body')).toContainText(`Cost: ${(25 * level / 1.05).toFixed(2)}`);
      await page.locator('#accept-confirm').click();
      await expect(page.locator('#overclock-0')).toContainText(`${level}/5`);
      near((await saved(page)).tokens, before.tokens - 25 * level / 1.05);
      if (level === 5) await expect(page.locator('#repair-0')).toBeFocused();
      await dismiss(page);
    }
    await expect(page.locator('#overclock-0')).toBeDisabled();
    await expect(page.locator('#overclock-0')).toContainText('Max level');
    await seed(page, state => { state.rooms[0].overclock = 0; state.tokens = 0; });
    await page.locator('#overclock-0').click(); await page.locator('#accept-confirm').click();
    await expect(page.locator('#notice')).toContainText('Claim mining or refill demo funds');
    assert.equal((await saved(page)).rooms[0].overclock, 0);
  });
  await scenario('A changed overclock level requires a new preview without spending twice', 390, async page => {
    await load(page); const before = await saved(page);
    await page.locator('#overclock-0').click();
    await page.evaluate(key => {
      const state = JSON.parse(localStorage.getItem(key));
      state.rooms[0].overclock = 1;
      localStorage.setItem(key, JSON.stringify(state));
    }, key);
    await page.locator('#accept-confirm').click();
    await expect(page.locator('#notice')).toContainText('Open the overclock preview again');
    assert.equal((await saved(page)).tokens, before.tokens); assert.equal((await saved(page)).rooms[0].overclock, 1);
  });
  await scenario('Old empty electricity reserve is removed while saved progress keeps mining', 390, async page => {
    await load(page); const before = await saved(page);
    await seed(page, state => {
      state.electricity = 0; state.rooms[0].overclock = 3;
      state.season.rivalFarms.forEach(r => { delete r.hashrate; });
    });
    const migrated = await saved(page);
    assert.ok(!Object.hasOwn(migrated, 'electricity')); assert.equal(migrated.tokens, before.tokens);
    assert.deepEqual(migrated.inventory, before.inventory);
    await expect(page.locator('#total-hash')).toContainText('13.0');
    await expect(page.locator('.electricity-panel meter')).toHaveCount(0);
    await epoch(page); assert.ok((await saved(page)).lastEpochReward > 0);
    await dismiss(page); await page.locator('.electricity-panel').scrollIntoViewIfNeeded(); await shot(page, 'tariff-390');
  });
  await scenario('Audit eligibility follows hashrate rank and preserves all existing balances', 1440, async page => {
    await load(page);
    for (const [higher, district, audit] of [[2, 3, true], [3, 3, false], [2, 0, false]]) {
      await seed(page, state => {
        equipment(state, ['GPU']); state.rng = eventSeed(.48, .56, district);
        state.tokens = 350; state.unclaimed = 33; state.rewardPoolTokens = 0; state.season.farmScore = 999999;
        state.season.rivalFarms.forEach((r, i) => { r.hashrate = i < higher ? 20 : 1; });
      });
      await epoch(page); const after = await saved(page);
      assert.equal(after.events[0].type, 'audit'); assert.equal(after.events[0].district, district);
      assert.equal(after.tokens, 350); near(after.unclaimed, 33 + (audit ? .75 : .85));
      near(after.rewardPoolTokens, audit ? .25 : .15);
      await expect(page.locator('#latest-letter')).toContainText('top 10%');
      await expect(page.locator('#latest-letter')).toContainText('Existing balances and previously unclaimed mining stay intact');
      report.audit.push({higher, district, audit, tokens: after.tokens, unclaimed: after.unclaimed, pool: after.rewardPoolTokens});
    }
    await dismiss(page); await page.locator('.terminal').scrollIntoViewIfNeeded(); await shot(page, 'audit-desktop');
  });
  await scenario('Tariff combines Cold Power, Off-grid, five overclocks and a cheap epoch', 390, async page => {
    await load(page); await seed(page, state => {
      equipment(state, ['GPU', 'Power Supply', 'Liquid Cooling', 'Solar Panel', 'Battery']);
      state.rooms[0].overclock = 5; state.rng = eventSeed(.68, .80, 3);
      state.tokens = 0; state.unclaimed = 0; state.rewardPoolTokens = 0;
    });
    await epoch(page); const state = await saved(page);
    assert.equal(state.events[0].type, 'cheap'); near(state.lastEpochReward, 5.1 * (1 - .1096875));
    near(state.rewardPoolTokens, 5.1 * .1096875); assert.equal(state.tokens, 0);
    await expect(page.locator('.tariff-list')).toContainText('10.96875%');
    assert.ok(state.inventory.every(item => item.durability === 98.875));
  });
  await scenario('Docs and Packs combo guide display corrected rules and beta labels', 390, async page => {
    await load(page, 'docs');
    await expect(page.locator('#docs-token-and-launch')).toContainText('BLACKOUT game token will launch through IMD on Robinhood Chain');
    await expect(page.locator('#docs-token-and-launch')).toContainText('10% of supply goes to IMD swarm contributor agents');
    await expect(page.locator('#docs-rooms-and-combos')).toContainText('Common gives no set bonus; Rare +5%, Epic +10%, Legendary +20%, Mythic +30%');
    await expect(page.locator('#docs-rooms-and-combos')).toContainText('they never stack');
    await expect(page.locator('#docs-farm-costs')).toContainText('Each level adds +10% hash, up to 5 levels');
    await expect(page.locator('#docs-city-and-swarm-events')).toContainText('Never takes from player balances');
    await page.locator('#docs-token-and-launch').scrollIntoViewIfNeeded(); await shot(page, 'launch-docs-390');
    await load(page, 'packs'); await page.locator('#pack-combo-guide summary').click();
    await expect(page.locator('#pack-combo-guide')).toContainText('Rare +5%, Epic +10%, Legendary +20%, Mythic +30%');
    await expect(page.locator('#pack-combo-guide')).toContainText('replaces Compute Duo; never stacks');
    await expect(page.locator('.demo-strip')).toContainText('Beta values, may change');
  });
  await scenario('Overclock dialog accessibility and actual opaque text contrast', 390, async page => {
    await load(page); await page.locator('#overclock-0').click();
    // Axe uses timers, so resume only for this bounded accessibility pass.
    await page.clock.resume();
    const audit = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    report.accessibility.push({state: 'Overclock confirmation', violations: audit.violations, incomplete: audit.incomplete.map(v => ({id: v.id, targets: v.nodes.map(n => n.target)}))});
    assert.deepEqual(audit.violations, []);
    const colors = await page.evaluate(() => {
      const style = s => getComputedStyle(document.querySelector(s));
      return [['Preview text', style('#confirm-body').color, style('dialog').backgroundColor], ['Confirm action', style('#accept-confirm').color, style('#accept-confirm').backgroundColor]];
    });
    const lum = rgb => rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(n => { const s = n / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; }).reduce((v, c, i) => v + c * [.2126, .7152, .0722][i], 0);
    for (const [name, fg, bg] of colors) {
      const ratio = (Math.max(lum(fg), lum(bg)) + .05) / (Math.min(lum(fg), lum(bg)) + .05);
      assert.ok(ratio >= 4.5); report.contrast.push({name, foreground: fg, background: bg, ratio});
    }
  });
  assert.deepEqual(report.errors, []);
} finally {
  report.status = report.failures.length || report.errors.length ? 'failed' : 'passed';
  await writeFile('reports/rules-results.json', JSON.stringify(report, null, 2) + '\n');
  await browser?.close(); await preview.close();
}
console.log(`${report.checks.length} checks passed; ${report.failures.length} failed. Report: reports/rules-results.json`);
if (report.status !== 'passed') process.exitCode = 1;
