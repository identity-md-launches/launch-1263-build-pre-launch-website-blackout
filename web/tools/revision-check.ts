import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { decodeAbiParameters, decodeFunctionData, deploylessCallViaBytecodeBytecode, encodeAbiParameters, encodeEventTopics, encodeFunctionResult, keccak256, multicall3Abi, stringToHex, type Hex } from 'viem';
import { fixture, injected } from './v12-fixture';
import { requireTool } from './deps.mjs';
import { serve } from './serve.mjs';
import abi from '../src/abi.json';
import { contracts } from '../src/config';
import { project, type EconomySnapshot } from '../src/earnings';

const before = process.argv.includes('--before');
const { chromium, webkit } = requireTool('playwright');
const engine = process.env.BLACKOUT_TEST_ENGINE || 'chromium';
const browser = await (engine === 'webkit' ? webkit : chromium).launch({ headless: true });
const { server, url } = await serve();
const result: any = { mode: before ? 'reproduction' : 'regression', engine, checks: [], observations: {}, errors: [] };
const check = (name: string) => { result.checks.push(name); console.log(before ? 'REPRODUCED' : 'PASS', name); };
mkdirSync('test/scratch/revision', { recursive: true });
mkdirSync('artifacts/v12', { recursive: true });
const E = 10n ** 18n;

// Add a real ABI-encoded paid reveal to the existing deterministic provider.
// The third item was a Mythic Router at mint; latest data is the deleted struct.
function historicalFixture(mode: 'archive' | 'unavailable' | 'zero' = 'archive') {
  const f = fixture(), originalRpc = f.rpc;
  let settledEpochs = 3n;
  const revealBlock = f.state.activityBlock;
  const epochEnd = BigInt(Math.floor(Date.now() / 1000)) + 7199n;
  const hash = keccak256(stringToHex('revision paid reveal'));
  const blockHash = keccak256(stringToHex('revision reveal block'));
  const emptyHolder = '0x0000000000000000000000000000000000000000';
  const pulls = [
    { ...f.state.items[0], id: 101n, kind: 1, rarity: 1 },
    { ...f.state.items[0], id: 102n, kind: 6, rarity: 0 },
    { ...f.state.items[0], id: 103n, kind: 8, rarity: 4 },
  ];
  const reads: { item: string; block: string }[] = [];
  f.state.rooms.add(1); f.state.items[0].kind = 3;
  f.state.receipts.set('paid:1', { target: 1000n, count: 1n, opened: 1n, captured: true, player: f.state.wallet, block: revealBlock });
  const log = (address: string, topics: any, data: Hex, index: number) => ({ address, topics, data, blockNumber: `0x${revealBlock.toString(16)}`, transactionIndex: '0x0', logIndex: `0x${index.toString(16)}`, transactionHash: hash, blockHash, removed: false });
  const event = log(contracts.PackSale, encodeEventTopics({ abi: abi.PackSale as any, eventName: 'PackOpened', args: { id: 1n } }), encodeAbiParameters([{ type: 'uint256' }, { type: 'bool' }], [1n, false]), 3);
  const mintLogs = pulls.map((item, index) => log(contracts.FarmItems, encodeEventTopics({ abi: abi.FarmItems as any, eventName: 'TransferSingle', args: { operator: contracts.PackSale, from: emptyHolder, to: f.state.wallet } }), encodeAbiParameters([{ type: 'uint256' }, { type: 'uint256' }], [item.id, 1n]), index));
  f.rpc = async (req: any): Promise<any> => {
    const ok = (value: unknown) => ({ jsonrpc: '2.0', id: req.id, result: value });
    if (req.method === 'eth_call') {
      // Pruned history is an RPC-level failure, not a reverted inner multicall.
      // This must never put the ordinary read/simulation client into backoff.
      if (mode === 'unavailable' && req.params[1] === `0x${revealBlock.toString(16)}`) return { jsonrpc: '2.0', id: req.id, error: { code: -32000, message: 'Historical state unavailable' } };
      const call = req.params[0];
      if (!call.to) {
        const [, data] = decodeAbiParameters([{ type: 'bytes' }, { type: 'bytes' }], ('0x' + call.data.slice(deploylessCallViaBytecodeBytecode.length)) as Hex);
        const decoded = decodeFunctionData({ abi: multicall3Abi, data });
        const values = await Promise.all((decoded.args as any)[0].map(async (c: any) => {
          const inner = await f.rpc({ ...req, params: [{ to: c.target, data: c.callData }, req.params[1]] });
          return inner.error ? { success: false, returnData: inner.error.data || '0x' } : { success: true, returnData: inner.result };
        }));
        return ok(encodeFunctionResult({ abi: multicall3Abi, functionName: 'aggregate3', result: values }));
      }
      if (call.to.toLowerCase() === contracts.FarmRewards) {
        const decoded = decodeFunctionData({ abi: abi.FarmRewards, data: call.data });
        if (decoded.functionName === 'epochEnd') return ok(encodeFunctionResult({ abi: abi.FarmRewards, functionName: 'epochEnd', result: epochEnd }));
        if (['lastSettled', 'settledEpoch'].includes(decoded.functionName)) return ok(encodeFunctionResult({ abi: abi.FarmRewards as any, functionName: decoded.functionName, result: settledEpochs }));
      }
      if (call.to.toLowerCase() === contracts.FarmItems) {
        const decoded = decodeFunctionData({ abi: abi.FarmItems, data: call.data });
        const item = decoded.functionName === 'data' ? pulls.find(i => i.id === decoded.args?.[0]) : null;
        if (item) {
          const historical = req.params[1] === `0x${revealBlock.toString(16)}`;
          reads.push({ item: String(item.id), block: req.params[1] });
          const destroyed = item.id === 103n && (!historical || mode === 'zero');
          return ok(encodeFunctionResult({ abi: abi.FarmItems as any, functionName: 'data', result: destroyed ? { ...item, holder: emptyHolder, durability: 0, kind: 0, rarity: 0, overclock: 0, starter: false, equipped: false } : item }));
        }
      }
    }
    if (req.method === 'eth_getLogs' && Array.isArray(req.params[0].address) && req.params[0].address.length === 1 && req.params[0].address[0].toLowerCase() === contracts.PackSale) {
      const q = req.params[0]; return ok(BigInt(q.fromBlock) <= revealBlock && BigInt(q.toBlock) >= revealBlock ? [event] : []);
    }
    if (req.method === 'eth_getTransactionReceipt' && req.params[0] === hash) return ok({ transactionHash: hash, transactionIndex: '0x0', blockHash, blockNumber: `0x${revealBlock.toString(16)}`, from: f.state.wallet, to: contracts.PackSale, gasUsed: '0x5208', cumulativeGasUsed: '0x5208', effectiveGasPrice: '0x1', contractAddress: null, logs: [...mintLogs, event], logsBloom: '0x' + '00'.repeat(256), status: '0x1', type: '0x2' });
    return originalRpc(req);
  };
  return { f, reads, revealBlock, setHistorySize: (size: bigint) => { settledEpochs = size; f.state.epoch = size + 1n; } };
}

try {
  const s: EconomySnapshot = { epochSeconds: 21600n, precision: 10n**27n, epoch: 4n, epochData: { start: 0n, end: 21600n, raw: 1020000n, miningSeconds: 21600n, mining: 0n, emission: 350n, tariff: 1500n, rewardPerHash: 0n, kind: 0, district: 0 }, previous: {} as any, available: 1000000n * E, farms: 3n, activeFarms: 3n, locked: 0n, dripEnd: 0n, timestamp: 0, fetchedAt: 0 };
  const end = project(s, 1000000n, 1000000n, 1000000n, 30).at(-1)!;
  const totals = [end.low, end.current, end.high].map(n => Number(n) / 1e18);
  result.observations.projection = totals;
  const expected = before ? [378613.5344676749, 577548.4564179512, 588323.380325081] : [566082.5971731704, 577548.4564179512, 578892.8834960184];
  totals.forEach((n, i) => assert(Math.abs(n - expected[i]) < 0.000001, `${n} vs ${expected[i]}`));
  if (!before) {
    const alone = project({ ...s, activeFarms: 1n, epochData: { ...s.epochData, raw: 1000000n } }, 1000000n, 1000000n, 1000000n, 30);
    for (const p of alone) { assert.equal(p.low, p.current); assert.equal(p.current, p.high); }
  }
  check('Projection: large player with two small competitors; zero-competitor case');

  const { f, reads, revealBlock, setHistorySize } = historicalFixture();
  const context = await browser.newContext({ viewport: { width: 375, height: 844 }, reducedMotion: 'reduce' });
  await injected(context, f);
  if (!before) await context.addInitScript(({ block, head, hash, wallet }) => {
    const row = { key: `${hash}:3`, block: { $bigint: block }, index: 3, hash, text: `${wallet.slice(0, 6)} revealed 1 pack`, kind: 'reveal', rarity: 0, items: [{ kind: 0, rarity: 0 }] };
    localStorage.setItem('blackout.public.v11.4663.activity', JSON.stringify([row]));
    localStorage.setItem('blackout.public.v11.4663.pack-event-index', JSON.stringify({ head: { $bigint: head }, floor: { $bigint: block }, events: [row] }));
  }, { block: String(revealBlock), head: String(f.state.block), hash: keccak256(stringToHex('revision paid reveal')), wallet: f.state.wallet });
  const page = await context.newPage(); page.setDefaultTimeout(20000);
  page.on('pageerror', (e: Error) => result.errors.push(e.message));
  page.on('console', (m: any) => { if (m.type() === 'error') result.errors.push(m.text()); });
  await page.goto(url + '#/home');
  await page.locator('.terminal-chip').first().waitFor();
  const chips = await page.locator('.terminal-chip').allTextContents();
  result.observations.reveal = { chips, reads, row: await page.locator('.terminal-list li').first().getAttribute('class') };
  assert.equal(chips.length, 3);
  assert.match(chips[2], before ? /GPU.*Common/ : /Router.*Mythic/);
  if (!before) { assert.equal(await page.locator('.epic-activity').count(), 1); assert(reads.every(r => r.block === `0x${revealBlock.toString(16)}`)); }
  check('Reveal history reads original Mythic Router after destruction');

  const clock = page.locator('.public-stats [data-countdown]');
  const t1 = await clock.innerText();
  if (before) await page.waitForTimeout(1100);
  else await page.waitForFunction(previous => document.querySelector('.public-stats [data-countdown]')?.textContent !== previous, t1, { timeout: 2500 });
  const t2 = await clock.innerText();
  result.observations.publicCountdown = [t1, t2];
  if (before) { assert.equal(t1, t2); assert.match(t1, /h .*m/); }
  else { assert.match(t1, /^\d{2}:\d{2}:\d{2}$/); assert.notEqual(t1, t2); }
  check('Public epoch countdown changes every second above one hour');
  if (!before) {
    await clock.evaluate((el: HTMLElement) => { el.dataset.countdown = '1'; });
    await page.waitForFunction(() => document.querySelector('.public-stats [data-countdown]')?.textContent === 'Due now');
    check('Elapsed public epoch preserves the Due now state');
  }

  await page.locator('#connect').click(); await page.getByRole('button', { name: 'Fixture Wallet', exact: true }).click();
  await page.locator('.hud-inner').waitFor(); await page.goto(url + '#/rewards'); await page.locator('.epoch-bar').first().waitFor();
  const widths = await page.locator('.epoch-bar').evaluateAll((bars: Element[]) => bars.map(b => b.getBoundingClientRect().width));
  result.observations.historyWidths = widths;
  assert(widths.every((w: number) => before ? w < 24 : w >= 24));
  await page.locator('.epoch-bar').last().focus(); await page.keyboard.press('Enter');
  assert.match(await page.locator('#epoch-detail').innerText(), /Epoch 3:/);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: `test/scratch/revision/${engine}-${before ? 'before' : 'after'}-rewards.png`, fullPage: true });
  check('Epoch history touch widths, keyboard payout detail and mobile reflow');
  if (!before) {
    setHistorySize(20n); await page.locator('footer [data-refresh]').click(); await page.locator('.epoch-bar').nth(19).waitFor();
    const bars = page.locator('.epoch-bar');
    const sizes = await bars.evaluateAll((nodes: Element[]) => nodes.map(b => ({ width: b.getBoundingClientRect().width, height: b.getBoundingClientRect().height })));
    result.observations.fullHistoryTargets = sizes;
    assert(sizes.every((b: any) => b.width >= 44 && b.height >= 44));
    await bars.first().focus(); await page.keyboard.press('Enter'); assert.match(await page.locator('#epoch-detail').innerText(), /Epoch 1:/);
    await bars.last().focus(); await page.keyboard.press('Enter'); assert.match(await page.locator('#epoch-detail').innerText(), /Epoch 20:/);
    assert(await page.locator('.epoch-bars').evaluate((el: Element) => el.scrollLeft > 0));
    for (const width of [320, 375, 390, 1440]) { await page.setViewportSize({ width, height: 900 }); assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `20 epochs overflow at ${width}`); }
    await page.setViewportSize({ width: 375, height: 844 });
    await page.locator('.earned-panel').screenshot({ path: `test/scratch/revision/${engine}-20-epochs.png` });
    check('All 20 epochs have 44px targets; first/last keyboard selection scrolls locally with no page overflow');
  }

  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto(url + '#/farm');
  await page.locator('[data-drag-item="1"] h3').filter({ hasText: 'Power Supply' }).waitFor();
  await page.locator('[data-drop-slot="1,0"]').waitFor();
  const drag = await page.evaluateHandle(() => new DataTransfer());
  const source = page.locator('[data-drag-item="1"]'); const sourceNode = await source.elementHandle();
  await source.dispatchEvent('dragstart', { dataTransfer: drag });
  const invalid = page.locator('[data-drop-slot="0,1"]'), valid = page.locator('[data-drop-slot="1,0"]');
  result.observations.drag = { disabled: await invalid.isDisabled(), reason: await invalid.innerText(), validDisabled: await valid.isDisabled() };
  assert.equal(await invalid.isDisabled(), !before); assert(!await valid.isDisabled());
  assert.match(await invalid.innerText(), before ? /Choose hardware/ : /One of each type per room/);
  assert(await sourceNode!.evaluate((node: Element) => node.isConnected), 'Drag source must stay in DOM');
  await page.screenshot({ path: `test/scratch/revision/${engine}-${before ? 'before' : 'after'}-drag.png`, fullPage: true });
  if (!before) await page.locator('.live-rooms').screenshot({ path: `test/scratch/revision/${engine}-drag-rooms.png` });
  await source.dispatchEvent('dragend', { dataTransfer: drag });
  if (!before) { assert(!await invalid.isDisabled()); assert.match(await invalid.innerText(), /Choose hardware/); }
  const farmClock = page.locator('.mining-panel [data-countdown]');
  if (!before) assert.match(await farmClock.innerText(), /^\d{2}:\d{2}:\d{2}$/);
  check('Drag previews duplicate-kind restriction without replacing the source; cancellation restores slots');
  if (!before) {
    await source.dispatchEvent('dragstart', { dataTransfer: drag }); await valid.dispatchEvent('drop', { dataTransfer: drag });
    await source.dispatchEvent('dragend', { dataTransfer: drag }); await page.locator('#action-dialog').waitFor();
    assert.equal(await page.locator('#install-slot').inputValue(), '1,0');
    assert.equal(f.state.sent.length, 0); await page.locator('#cancel-action').click();
    check('Valid drop retains the chosen item and slot in the existing transaction review');
    await page.goto(url + '#/home'); await page.locator('.terminal-chip').first().waitFor();
    await page.reload(); await page.locator('.terminal-chip').first().waitFor();
    assert.match((await page.locator('.terminal-chip').allTextContents())[2], /Router.*Mythic/);
    check('Historical reveal metadata survives a page reload');
  }
  await context.close();

  if (!before) for (const mode of ['unavailable', 'zero'] as const) {
    const fallback = historicalFixture(mode), c = await browser.newContext({ viewport: { width: 375, height: 844 }, reducedMotion: 'reduce' });
    await injected(c, fallback.f); const p = await c.newPage(); await p.goto(url + '#/home');
    await p.locator('.terminal-chip').first().waitFor();
    const text = await p.locator('.terminal-list').innerText();
    assert.match(text, /Hardware details unavailable/); assert(!text.includes('GPU')); assert.equal(await p.locator('.rarity-tag').count(), 0);
    result.observations[mode] = await p.locator('.terminal-chip').allTextContents();
    await p.waitForFunction(() => document.querySelector('#connection-status')?.textContent === 'City connected');
    await p.goto(url + '#/packs'); await p.waitForFunction(() => /^≈ .*ETH$/.test(document.querySelector('.pack-quote')?.textContent || ''));
    assert(!await p.locator('.field-error').first().isVisible(), 'Archive failure must not break current pack quotes');
    result.observations[`${mode}CurrentQuote`] = await p.locator('.pack-quote').innerText();
    await c.close(); check(`Reveal fallback ${mode}: explicit unknown hardware, no fabricated rarity; current reads stay healthy`);
  }
  assert.deepEqual(result.errors, []);
} catch (error) { result.errors.push(String(error)); console.error(error); process.exitCode = 1; }
finally {
  writeFileSync(`artifacts/v12/revision-${before ? 'before' : engine}.json`, JSON.stringify(result, null, 2) + '\n');
  await browser.close(); server.close();
}
