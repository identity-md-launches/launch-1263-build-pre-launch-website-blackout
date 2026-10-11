import { describe, expect, it } from 'vitest';
import { DemoAdapter, validState } from '../src/game/DemoAdapter';
import { config } from '../src/config';
import { actualSpend, auditEligibility, cappedDistrict, claimable, districtStandings, epochsToSync, isIdle, comboBonus, electricityTariff, equippedIds, epochsPerDay, hasCombo, inventoryUsed, itemHash, levelFromXp, nextRandom, overclockCost, packPrice, rollRarity, rollType, roomCombos, roomHashrate, seasonEpochs, totalHashrate, repairCost, roomRepairCost, durabilityOutput, withdrawPreview, withdrawTax } from '../src/game/rules';
import { ITEM_TYPES, RARITIES } from '../src/game/types';
import type { EventType, GameState, Item, ItemType, Rarity } from '../src/game/types';

class MemoryStorage {
  data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
}
function session(seed = 1234567, random?: () => number) {
  let time = 100_000;
  const storage = new MemoryStorage();
  const now = () => time;
  let adapter = new DemoAdapter({ storage, now, seed, random });
  return {
    get game() { return adapter; }, storage, now,
    advance(ms: number) { time += ms; },
    reload() { adapter = new DemoAdapter({ storage, now, seed, random }); return adapter; },
    async fixture(edit: (state: GameState) => void) {
      const state = await adapter.getFarm(); edit(state);
      state.gameDays = state.epoch / epochsPerDay(); state.level = levelFromXp(state.xp, state.gameDays);
      state.nextId = Math.max(state.nextId, ...state.inventory.map(i => Number(i.id.slice(5)) + 1), ...(state.pendingPack?.cards.map(i => Number(i.id.slice(5)) + 1) ?? []));
      expect(validState(state), 'test fixture must be valid').toBe(true);
      storage.setItem(config.demo.storageKey, JSON.stringify(state)); adapter = new DemoAdapter({ storage, now, seed, random }); return state;
    },
  };
}
const item = (id: number, type: ItemType = 'GPU', rarity: Rarity = 'Common', durability = 100): Item => ({ id: `item-${id}`, type, rarity, durability });
async function equipment(s: ReturnType<typeof session>, types: ItemType[], rarity: Rarity = 'Common') {
  await s.fixture(state => {
    state.xp = config.xp.levels.at(-1)!; state.epoch = 20; state.gameDays = 5; state.lastSyncedEpoch = 20;
    state.inventory = types.map((type, i) => item(i + 10, type, rarity));
    state.rooms[0].slots = Array.from({ length: config.rooms.slots }, (_, i) => state.inventory[i]?.id ?? null);
  });
}
async function revealAll(game: DemoAdapter, currency: 'eth' | 'tokens' | 'free' = 'eth') {
  const pack = await game.openPack(currency);
  for (let i = 0; i < pack.cards.length; i++) await game.reveal(pack.id, i);
  return pack;
}
function eventSession(type: EventType, district = config.city.startingDistrict) {
  const rolls: Record<EventType, number> = { outage: .05, surge: .18, fire: .3, theft: .42, audit: .52, green: .62, cheap: .74, calm: .9, supply: .9 };
  const values = [rolls[type], (district + .1) / config.city.districts.length, 0, 0];
  return session(123, () => values.shift() ?? .5);
}

describe('rarity and hardware distribution', () => {
  it('matches all five stated rarity weights over 100,000 independent rolls', () => {
    const counts = Object.fromEntries(RARITIES.map(r => [r, 0]));
    const types = Object.fromEntries(ITEM_TYPES.map(t => [t, 0]));
    let seed = 0x12345678;
    for (let n = 0; n < 100_000; n++) {
      let value: number; [value, seed] = nextRandom(seed); counts[rollRarity(value, 10)]++;
      [value, seed] = nextRandom(seed); types[rollType(value)]++;
    }
    for (const r of RARITIES) expect(Math.abs(counts[r] / 100_000 - config.rarity[r].odds)).toBeLessThan(.005);
    for (const type of ITEM_TYPES) expect(Math.abs(types[type] / 100_000 - 1 / ITEM_TYPES.length)).toBeLessThan(.005);
    console.info('100,000 drop samples:', JSON.stringify({ rarity: counts, types }));
  });
  it('uses exact boundaries and redirects locked Mythic drops to Common', () => {
    expect([0, .6999, .70, .9199, .92, .9869, .987, .9969, .997, .9999].map(n => rollRarity(n, 10))).toEqual(['Common', 'Common', 'Rare', 'Rare', 'Epic', 'Epic', 'Legendary', 'Legendary', 'Mythic', 'Mythic']);
    expect(rollRarity(.9999, 9)).toBe('Common'); expect(rollRarity(.9999, 10)).toBe('Mythic');
  });
  it.each(RARITIES)('%s non-compute hardware mines at 60% of compute hash', rarity => {
    expect(itemHash(item(1, 'GPU', rarity))).toBe(config.rarity[rarity].hash);
    expect(itemHash(item(2, 'Battery', rarity))).toBeCloseTo(config.rarity[rarity].hash * .6);
  });
});

describe('inventory, rooms and combinations', () => {
  it('starts with a mining GPU, two spares, six room slots and fifteen inventory slots', async () => {
    const farm = await session().game.getFarm();
    expect(farm.rooms[0].slots).toHaveLength(6); expect(inventoryUsed(farm)).toBe(2);
    expect(farm.inventoryCapacity).toBe(15); expect(totalHashrate(farm)).toBe(10);
  });
  it('allows any unique type and blocks duplicates, occupied slots and level-gated equipment', async () => {
    const s = session();
    await s.fixture(f => f.inventory.push(item(4), item(5, 'Battery', 'Epic')));
    await expect(s.game.place('item-4', 0)).rejects.toThrow('duplicate');
    await expect(s.game.place('item-2', 0, 0)).rejects.toThrow('Remove');
    await expect(s.game.place('item-5', 0)).rejects.toThrow('level 3');
    await s.game.place('item-2', 0); expect(inventoryUsed(await s.game.getFarm())).toBe(3);
    await s.game.unplace(0, 1); expect(inventoryUsed(await s.game.getFarm())).toBe(4);
  });
  it('buys rooms with tokens in order, never automatically, and preserves ownership on reload', async () => {
    const s = session();
    await s.fixture(f => { f.xp = config.xp.levels[9]; f.epoch = 20; f.lastSyncedEpoch = 20; });
    await s.game.nextEpoch(); expect((await s.game.getFarm()).rooms).toHaveLength(1);
    await expect(s.game.buyRoom(2)).rejects.toThrow('previous room');
    const before = await s.game.getFarm(); await s.game.buyRoom(1);
    expect((await s.game.getFarm()).tokens).toBeCloseTo(before.tokens - 150/1.05);
    await expect(s.game.buyRoom(1)).rejects.toThrow('already own');
    await expect(s.game.buyRoom(2)).rejects.toThrow('need');
    expect((await s.game.getFarm()).rooms).toHaveLength(2);
    await s.game.refillDemoFunds(); await s.game.refillDemoFunds(); await s.game.refillDemoFunds();
    await s.game.buyRoom(2); await s.game.buyRoom(3);
    expect((await s.reload().getFarm()).rooms.map(r=>r.id)).toEqual([0,1,2,3]);
    for (const id of [-1, 0, 4, 1.5, NaN]) await expect(s.game.buyRoom(id)).rejects.toThrow('Choose room');
  });
  it('replaces Compute Duo with Triple Core and caps total room hash bonuses at 40%', async () => {
    const s = session(); await equipment(s, ['GPU', 'ASIC', 'FPGA', 'Fan', 'Router', 'Server Rack'], 'Legendary');
    const f = await s.game.getFarm(); const combos = roomCombos(f, f.rooms[0]);
    expect(combos.filter(c => c.active).map(c => c.id)).toEqual(expect.arrayContaining(['triple', 'airflow', 'locked', 'rarity']));
    expect(hasCombo(f, f.rooms[0], 'duo')).toBe(false);
    expect(comboBonus(f, f.rooms[0])).toBe(.4);
    expect(totalHashrate(f)).toBeCloseTo((250 * 3 + 250 * .6 * 3) * 1.4);
    expect(combos.find(c => c.id === 'stack')?.missing).toEqual(['power item']);
  });
  it('activates Full Stack for all five tags and reports missing-combo hints', async () => {
    const s = session(); await equipment(s, ['GPU', 'Power Supply', 'Fan', 'Router', 'Motherboard']);
    const f = await s.game.getFarm(); expect(hasCombo(f, f.rooms[0], 'stack')).toBe(true);
    expect(roomCombos(f, f.rooms[0]).find(c => c.id === 'clean')?.missing).toEqual(['Surge Protector']);
  });
  it('uses the strongest same-rarity set without stacking multiple sets', async () => {
    const s = session(); await equipment(s, ['GPU', 'ASIC', 'FPGA', 'Fan', 'Router', 'Server Rack']);
    await s.fixture(f => f.inventory.slice(3).forEach(i => { i.rarity = 'Epic'; }));
    const f = await s.game.getFarm(); expect(roomCombos(f, f.rooms[0]).find(c => c.id === 'rarity')?.bonus).toBe(.1);
  });
  it('reserves three pack spaces, keeps reveals idempotent and blocks removal into a full inventory', async () => {
    const s = session();
    await s.fixture(f => { f.inventory.push(...Array.from({ length: 10 }, (_, i) => item(10 + i, 'Battery'))); });
    const p = await s.game.openPack(); expect(inventoryUsed(await s.game.getFarm())).toBe(15);
    await s.game.reveal(p.id, 0); await s.game.reveal(p.id, 0); expect(inventoryUsed(await s.game.getFarm())).toBe(15);
    await expect(s.game.unplace(0, 0)).rejects.toThrow('full');
    await s.game.reveal(p.id, 1); await s.game.reveal(p.id, 2);
    await expect(s.game.openPack()).rejects.toThrow('3 free');
    await s.game.expandInventory(); expect((await s.game.getFarm()).inventoryCapacity).toBe(20);
    await expect(s.game.openPack()).resolves.toBeTruthy();
  });
  it('scraps spare items for tiny rarity value and cannot scrap installed hardware', async () => {
    const s = session(); const start = (await s.game.getFarm()).tokens;
    await expect(s.game.scrap('item-1')).rejects.toThrow('spare');
    await s.game.scrap('item-2'); const f = await s.game.getFarm(); expect(f.tokens).toBe(start + 1); expect(f.inventory).toHaveLength(2);
  });
});

describe('packs and monetary controls', () => {
  it('prices each purchase dynamically, applies demand, decays to floor and caps at ceiling', async () => {
    const s = session(); let f = await s.game.getFarm(); expect(packPrice(f)).toBe(.010);
    const pack = await revealAll(s.game); f = await s.game.getFarm(); expect(pack.price).toBe(.010); expect(packPrice(f)).toBeCloseTo(.0106);
    await s.fixture(farm => { farm.market.lastPriceEth = config.packs.ceilingEth; farm.ethBalance = 1; });
    await revealAll(s.game); expect(packPrice(await s.game.getFarm())).toBe(config.packs.ceilingEth);
    s.advance(config.demo.eventIntervalMs * 100); expect(packPrice(await s.game.getFarm())).toBe(config.packs.floorEth);
  });
  it('manual epoch advancement decays only the remaining quiet interval without double-counting wall time', async () => {
    const s = session(); await revealAll(s.game); const original = packPrice(await s.game.getFarm());
    s.advance(config.demo.eventIntervalMs / 2);
    expect(packPrice(await s.game.getFarm())).toBeCloseTo(original - config.packs.quietDecayPerEpoch / 2);
    await s.game.nextEpoch(); let f = await s.game.getFarm();
    expect(f.epoch).toBe(1); expect(packPrice(f)).toBeCloseTo(original - config.packs.quietDecayPerEpoch);
    expect(f.updatedAt).toBe(s.now()); expect(f.nextEventAt).toBe(s.now() + config.demo.eventIntervalMs);
    expect(packPrice(await s.reload().getFarm())).toBeCloseTo(packPrice(f));
    s.advance(config.demo.eventIntervalMs); f = await s.game.getFarm();
    expect(f.epoch).toBe(2); expect(packPrice(f)).toBeCloseTo(original - config.packs.quietDecayPerEpoch * 2);
  });
  it('manual game days reduce quotes for every quiet epoch and stop at the price floor', async () => {
    const s = session(); await revealAll(s.game); const original = packPrice(await s.game.getFarm());
    await s.game.advanceDay();
    expect(packPrice(await s.game.getFarm())).toBeCloseTo(original - config.packs.quietDecayPerEpoch * epochsPerDay());
    for (let n = 0; n < 4; n++) await s.game.advanceDay();
    expect(packPrice(await s.game.getFarm())).toBe(config.packs.floorEth);
  });
  it('token packs receive the 10% discount and 5% purchasing bonus without withdrawal tax', async () => {
    const s = session(); const before = await s.game.getFarm(); const p = await s.game.openPack('tokens'); const after = await s.game.getFarm();
    expect(p.price).toBeCloseTo(100 * .9 / 1.05); expect(before.tokens - after.tokens).toBeCloseTo(p.price);
    expect(after.rewardPoolTokens).toBeCloseTo(p.price * .88); expect(after.revenue.teamEth).toBeCloseTo(p.price * .10 / config.packs.tokensPerEth, 10); expect(after.revenue.heartbeatTokens).toBeCloseTo(p.price * .02); expect(after.xp).toBeCloseTo(20 + p.price * .5);
  });
  it('allows replenishing simulated funds, and never charges for an already pending pack', async () => {
    const s = session(); await s.fixture(f => { f.ethBalance = 0; f.tokens = 0; });
    await expect(s.game.openPack()).rejects.toThrow('tokens');
    await s.game.refillDemoFunds(); const p = await s.game.openPack(); const balance = (await s.game.getFarm()).ethBalance;
    expect(await s.game.openPack()).toEqual(p); expect((await s.game.getFarm()).ethBalance).toBe(balance);
  });
  it('previews and applies withdrawal tax declining from 20% to 5% over seven days', async () => {
    const s = session(); let f = await s.game.getFarm(); expect(withdrawTax(f)).toBeCloseTo(.2); expect(withdrawPreview(f, 100).net).toBe(80);
    await s.game.withdraw(100); f = await s.game.getFarm(); expect(f.tokens).toBe(250); expect(f.withdrawn).toBe(80); expect(f.rewardPoolTokens).toBe(17.6); expect(f.revenue.teamEth).toBeCloseTo(2 / config.packs.tokensPerEth, 10); expect(f.revenue.heartbeatTokens).toBe(.4);
    for (let n = 0; n < 7; n++) await s.game.advanceDay();
    expect(withdrawTax(await s.game.getFarm())).toBeCloseTo(.05);
    await expect(s.game.withdraw(NaN)).rejects.toThrow('greater'); await expect(s.game.withdraw(-1)).rejects.toThrow('greater'); await expect(s.game.withdraw(1e8)).rejects.toThrow('exceeds');
  });
  it('repairs every installed type, spends with bonus, and bounds overclock', async () => {
    const s = eventSession('calm'); await s.game.place('item-2', 0); await s.game.nextEpoch();
    let f = await s.game.getFarm(); expect(f.inventory.filter(i => equippedIds(f).has(i.id)).every(i => i.durability === 99.5)).toBe(true);
    const start = f.tokens; const quote = roomRepairCost(f, f.rooms[0]); await s.game.repair(0); await s.game.overclock(0);
    f = await s.game.getFarm(); expect(f.tokens).toBeCloseTo(start - actualSpend(quote + 25)); expect(f.rooms[0].overclock).toBe(1);
    expect(f.inventory.find(i => i.id === 'item-2')?.durability).toBe(100);
    await s.game.refillDemoFunds();
    for (let level = 2; level <= 5; level++) await s.game.overclock(0);
    await expect(s.game.overclock(0)).rejects.toThrow('level 5');
  });
});

describe('epoch settlement and dispatcher events', () => {
  it('updates mining, wear, XP and claims only on epoch boundaries', async () => {
    const s = eventSession('calm'); s.advance(44_999); let f = await s.game.getFarm();
    expect(f.unclaimed).toBe(0); expect(f.inventory[0].durability).toBe(100);
    s.advance(1); f = await s.game.getFarm(); expect(f.epoch).toBe(1); expect(f.pendingMining).toBeCloseTo(.85); expect(f.unclaimed).toBe(0); expect(f.xp).toBe(20); expect(f.inventory[0].durability).toBe(99.5);
    const mined = claimable(f); await s.game.claim(); f = await s.game.getFarm(); expect(f.tokens).toBeCloseTo(350 + mined); expect(f.unclaimed).toBe(0);
    expect((await s.reload().getFarm()).epoch).toBe(1); await expect(s.game.claim()).rejects.toThrow('Nothing');
  });
  it('gives no repeatable mining reward or active XP to empty or broken farms', async () => {
    const s = eventSession('calm'); await s.game.unplace(0, 0); await s.game.nextEpoch();
    let f = await s.game.getFarm(); expect(f.unclaimed).toBe(0); expect(f.xp).toBe(0);
    await s.game.place('item-1', 0); await s.fixture(state => { state.inventory[0].durability = 0; }); await s.game.nextEpoch();
    f = await s.game.getFarm(); expect(f.unclaimed).toBe(0); expect(f.xp).toBe(0); expect(f.inventory[0].durability).toBe(0);
  });
  it('outages stop unprotected rooms and Off-grid preserves half mining', async () => {
    const bare = eventSession('outage'); await bare.game.nextEpoch(); expect((await bare.game.getFarm()).lastEpochReward).toBe(0);
    const s = eventSession('outage'); await equipment(s, ['GPU', 'Solar Panel', 'Battery']); const before = await s.game.getFarm();
    await s.game.nextEpoch(); const f = await s.game.getFarm();
    expect(f.lastEpochReward).toBeCloseTo(totalHashrate(before) * .5 * .1 * (1 - .15 * .8));
    expect(f.events[0].protection).toContain('Off-grid'); expect(f.letters[0].body).toContain('District 04');
  });
  it('Clean Power prevents a surge burn; an unprotected surge can burn hardware', async () => {
    const bare = eventSession('surge'); await bare.game.nextEpoch(); expect((await bare.game.getFarm()).inventory[0].durability).toBe(0);
    const s = eventSession('surge'); await equipment(s, ['GPU', 'Surge Protector', 'Power Supply']); await s.game.nextEpoch();
    expect((await s.game.getFarm()).inventory.every(i => i.durability === 99.5)).toBe(true);
  });
  it('Cold Power prevents fire, Airflow halves damage and bare rooms take full damage', async () => {
    const bare = eventSession('fire'); await bare.game.nextEpoch(); expect((await bare.game.getFarm()).inventory[0].durability).toBe(79.5);
    const airflow = eventSession('fire'); await equipment(airflow, ['GPU', 'Fan', 'Server Rack']); await airflow.game.nextEpoch();
    expect((await airflow.game.getFarm()).inventory[0].durability).toBe(89.5);
    const cold = eventSession('fire'); await equipment(cold, ['GPU', 'Power Supply', 'Liquid Cooling']); await cold.game.nextEpoch();
    expect((await cold.game.getFarm()).inventory[0].durability).toBe(99.5);
  });
  it('Locked Rack prevents theft while green and cheap events apply their positive multipliers', async () => {
    const bare = eventSession('theft'); await bare.game.nextEpoch(); expect((await bare.game.getFarm()).lastEpochReward).toBeCloseTo(.425);
    const locked = eventSession('theft'); await equipment(locked, ['GPU', 'Router', 'Server Rack']); const prior = await locked.game.getFarm(); await locked.game.nextEpoch();
    expect((await locked.game.getFarm()).lastEpochReward).toBeCloseTo(totalHashrate(prior) * .1 * .85);
    const green = eventSession('green'); await green.game.nextEpoch(); expect((await green.game.getFarm()).lastEpochReward).toBeCloseTo(.935);
    const cheap = eventSession('cheap'); await cheap.game.nextEpoch(); expect((await cheap.game.getFarm()).lastEpochReward).toBeCloseTo(.925);
  });
  it('Cold Power and Off-grid electricity discounts stack, with the cheap tariff applied afterward', async () => {
    const s = eventSession('cheap'); await equipment(s, ['GPU', 'Power Supply', 'Liquid Cooling', 'Solar Panel', 'Battery']); await s.game.nextEpoch();
    const f = await s.game.getFarm(); expect(electricityTariff(f, f.rooms[0])).toBeCloseTo(.15 * .65 * .5);
    expect(f).not.toHaveProperty('electricity');
  });
  it('audits only farms above the hash threshold in the affected district without debiting balances', async () => {
    const small = eventSession('audit');
    await small.fixture(f => { f.tokens = 1_000_000; f.unclaimed = 50; });
    await small.game.nextEpoch();
    const exempt = await small.game.getFarm();
    expect(exempt.tokens).toBe(1_000_000); expect(exempt.unclaimed).toBe(50); expect(exempt.pendingMining).toBeCloseTo(.85);
    expect(exempt.rewardPoolTokens).toBeCloseTo(.15);
    expect(exempt.letters[0].body).toContain('At or below the hash threshold');
    for (const district of [config.city.startingDistrict, 0]) {
      const s = eventSession('audit', district);
      await equipment(s, ['GPU'], 'Mythic');
      await s.fixture(f => { f.tokens = 0; f.unclaimed = 50; });
      expect(auditEligibility(await s.game.getFarm()).eligible).toBe(true);
      await s.game.nextEpoch(); const f = await s.game.getFarm();
      const audited = district === config.city.startingDistrict;
      expect(f.tokens).toBe(0); expect(f.unclaimed).toBe(50); expect(f.pendingMining).toBeCloseTo(80 * (audited ? .75 : .85));
      expect(f.rewardPoolTokens).toBeCloseTo(80 * (audited ? .25 : .15));
      expect(f.lastEpochReward + f.rewardPoolTokens).toBeCloseTo(80);
      expect((await s.reload().getFarm()).unclaimed).toBeCloseTo(f.unclaimed);
    }
  });
  it('lobbying lowers bad-event targeting odds, is consumed once, and is not immunity', async () => {
    let hits = 0, harmful = 0;
    const s = session();
    for (let n = 0; n < 500; n++) {
      await s.fixture(f => { f.tokens = 100; }); await s.game.lobby();
      await expect(s.game.lobby()).rejects.toThrow('already');
      await s.game.nextEpoch(); const f = await s.game.getFarm(); expect(f.lobbied).toBe(false); expect(f.events[0].lobbied).toBe(true);
      if (['outage', 'surge', 'fire', 'theft', 'audit'].includes(f.events[0].type)) { harmful++; if (f.events[0].district === f.district) hits++; }
    }
    expect(hits / harmful).toBeGreaterThan(.025); expect(hits / harmful).toBeLessThan(.11);
  }, 15000);
  it('sales spikes create one citywide supply drop and bounded offline catch-up', async () => {
    const s = session(); await revealAll(s.game); await revealAll(s.game); await revealAll(s.game); await s.game.nextEpoch();
    let f = await s.game.getFarm(); expect(f.events[0].type).toBe('supply'); expect(claimable(f)).toBeGreaterThanOrEqual(5);
    s.advance(365 * 86400_000); f = await s.game.getFarm(); expect(f.epoch).toBe(1 + config.demo.maxOfflineEpochs); expect(f.events).toHaveLength(30); expect(f.letters).toHaveLength(30); expect(f.nextEventAt).toBe(s.now() + 45_000);
  });
});

describe('season, referral and NFT demo flows', () => {
  it('requires sync before the season deadline, preserves rewards and claims a prize once', async () => {
    const s = session(123, () => .9);
    await s.fixture(f => { f.season.farmScore = 1e6; });
    await s.game.sync();
    for (let n = 0; n < seasonEpochs(); n++) await s.game.nextEpoch();
    let f = await s.game.getFarm(); expect(f.season.number).toBe(2); expect(f.season.lastResult).toContain('won the district race'); expect(f.season.pendingFreePacks).toBe(1);
    const earned = claimable(f);
    await s.game.claimSeasonRewards(); f = await s.game.getFarm(); expect(f.season.pendingItems).toHaveLength(0); expect(claimable(f)).toBe(earned);
    await expect(s.game.claimSeasonRewards()).rejects.toThrow('No season');
    const late = session(123, () => .9);
    await late.fixture(f => { f.season.farmScore = 1e6; f.season.endsAtEpoch = 1; });
    await late.game.nextEpoch(); await late.game.sync();
    const missed = await late.game.getFarm(); expect(missed.season.pendingItems).toHaveLength(0); expect(missed.season.pendingFreePacks).toBe(0);
    expect(missed.season.lastResult).toContain('No synced mining score'); expect(claimable(missed)).toBeGreaterThan(0);
  });
  it('ranks districts by capped average per active farm with no wallet above 10% of final score', async () => {
    for (const scores of [Array(12).fill(10), [...Array(11).fill(10), 1e9], [1,2,3,4,5,6,7,8,9,10,100,5000]]) {
      const result = cappedDistrict(scores);
      const credited = scores.map(score => Math.min(score,result.cap));
      expect(credited.reduce((a,b)=>a+b,0)).toBeCloseTo(result.total);
      for (const score of credited) expect(score/result.total).toBeLessThanOrEqual(.1+1e-10);
      expect(result.score).toBeCloseTo(result.total / scores.length);
    }
    expect(cappedDistrict([10,20]).score).toBe(0);
    const s = session(); await s.game.nextEpoch(); await s.game.sync();
    const f = await s.game.getFarm(); const rows = districtStandings(f);
    expect(f.season.rivalFarms).toHaveLength(95);
    for (const row of rows) { expect(row.active).toBe(12); expect(f.season.districtScores[row.id]).toBeCloseTo(row.score); }
  });
  it.each(['Epic', 'Legendary'] as const)('awards a %s lottery item, persists it and claims it exactly once', async rarity => {
    let rolls: number[] = [];
    const s = session(123, () => rolls.length ? rolls.shift()! : .9);
    await s.fixture(f => { f.season.endsAtEpoch = 1; f.season.farmScore = 10; });
    await s.game.sync();
    // Calm, district, 95 rivals, three distinct lottery draws, item type, rarity.
    rolls = [.9, .9, ...Array(95).fill(.9), 0, 0, 0, .1, rarity === 'Epic' ? .1 : .9];
    await s.game.nextEpoch(); let f = await s.reload().getFarm();
    expect(f.season.pendingItems).toHaveLength(1); expect(f.season.pendingItems[0].rarity).toBe(rarity);
    const prize = f.season.pendingItems[0]; const balance = f.tokens;
    expect(f.inventory.some(i=>i.id===prize.id)).toBe(false);
    await s.game.claimSeasonRewards(); f = await s.game.getFarm();
    expect(f.inventory.filter(i=>i.id===prize.id)).toEqual([prize]); expect(f.tokens).toBe(balance);
    await expect(s.game.claimSeasonRewards()).rejects.toThrow('No season');
    expect(f.season.rivalFarms.every(rival => rival.score === 0)).toBe(true);
  });
  it('settles a season with a constant injected random source without an unbounded lottery loop', async () => {
    const s = session(123, () => .5);
    for (let n = 0; n < seasonEpochs(); n++) await s.game.nextEpoch();
    expect((await s.game.getFarm()).season.number).toBe(2);
  });
  it('gives separate browser farms unique referral codes and accepts a shared link', async () => {
    const first = session(); const second = session();
    const a = await first.game.getFarm(); const b = await second.game.getFarm();
    expect(a.referral.code).not.toBe(b.referral.code);
    await second.game.captureReferral(a.referral.code);
    expect((await second.game.getFarm()).referral.referredBy).toBe(a.referral.code);
  });
  it('records referrals safely and demonstrates exactly 5% of invitee mining', async () => {
    const s = session(); await s.game.captureReferral('NEON-7'); await s.game.simulateInviteeEpoch(); const f = await s.game.getFarm();
    expect(f.referral.referredBy).toBe('NEON-7'); expect(f.referral.invitees).toBe(1); expect(f.referral.earned).toBeCloseTo(f.referral.inviteeMining * .05); expect(f.unclaimed).toBeCloseTo(.6);
    await expect(s.game.captureReferral('OTHER')).rejects.toThrow('already'); await expect(s.game.captureReferral('<script>')).rejects.toThrow('letters');
    await expect(s.game.captureReferral(f.referral.code)).rejects.toThrow('own');
  });
  it('grants exactly one self-attested NFT starter pack and consumes it without a charge', async () => {
    const s = session(); await s.game.claimNftStarter(); const before = await s.game.getFarm(); const pack = await s.game.openPack('free');
    expect(pack.price).toBe(0); const after = await s.game.getFarm(); expect(after.ethBalance).toBe(before.ethBalance); expect(after.freePacks).toBe(0);
    await expect(s.game.claimNftStarter()).rejects.toThrow('already');
    await revealAll(s.game); await expect(s.game.openPack('free')).rejects.toThrow('No free');
  });
});

describe('persistence, validation and recoverability', () => {
  it('persists pending reveals, resumes seeded RNG, and returns detached objects', async () => {
    const s = session(); const p = await s.game.openPack(); await s.game.reveal(p.id, 0);
    expect((await s.reload().getFarm()).pendingPack?.revealed).toEqual([true, false, false]);
    await s.game.reveal(p.id, 1); await s.game.reveal(p.id, 2); const saved = await s.game.getFarm();
    const next = await s.game.openPack(); s.storage.setItem(config.demo.storageKey, JSON.stringify(saved)); expect(await s.reload().openPack()).toEqual(next);
    const detached = await s.game.getFarm(); detached.tokens = -1; expect((await s.game.getFarm()).tokens).toBeGreaterThan(0);
  });
  it('synchronizes localStorage between independently opened page adapters', async () => {
    const s = session(); const second = new DemoAdapter({ storage: s.storage, now: s.now });
    await s.game.place('item-2', 0); expect((await second.getFarm()).rooms[0].slots[1]).toBe('item-2');
    await second.scrap('item-3'); expect((await s.game.getFarm()).inventory.some(i => i.id === 'item-3')).toBe(false);
  });
  it('recovers malformed, outdated and inconsistent saves without rendering supplied text', async () => {
    const s = session();
    for (const raw of ['{broken', JSON.stringify({ version: 1 }), JSON.stringify({ ...(await s.game.getFarm()), tokens: -2 })]) {
      s.storage.setItem(config.demo.storageKey, raw); const f = await s.reload().getFarm(); expect(f.storageWarning).toContain('could not be read'); expect(f.tokens).toBe(350);
    }
    const state = await s.game.getFarm(); state.letters[0].body = '<script>alert(1)</script>'; expect(validState(state)).toBe(false);
    state.letters[0].body = 'safe'; state.rooms[0].slots[1] = 'item-1'; expect(validState(state)).toBe(false);
  });
  it('migrates existing v3 aggregate-only seasons without resetting a farm', async () => {
    const s = session(); await s.game.nextEpoch(); await s.game.place('item-2', 0);
    const before = await s.game.getFarm();
    const legacy = structuredClone(before) as Omit<GameState, 'season'> & { season: Omit<GameState['season'], 'rivalFarms'> & { rivalFarms?: GameState['season']['rivalFarms'] } };
    delete legacy.season.rivalFarms;
    s.storage.setItem(config.demo.storageKey, JSON.stringify(legacy));
    const after = await s.reload().getFarm();
    expect(after.storageWarning).toBe(''); expect(after.rooms).toEqual(before.rooms); expect(after.tokens).toBe(before.tokens); expect(after.epoch).toBe(before.epoch);
    expect(after.season.rivalFarms).toHaveLength(config.season.demoFarmCount - 1);
    expect(validState(after)).toBe(true);
  });
  it('remains playable when storage access or writes fail', async () => {
    const game = new DemoAdapter({ storage: { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } } });
    expect((await game.openPack()).cards).toHaveLength(3); expect((await game.getFarm()).storageWarning).toContain('could not be saved');
  });
  it('resets all demo progress and restores deterministic opening sequence', async () => {
    const s = session(); const first = await s.game.openPack(); await s.game.reveal(first.id, 0); await s.game.nextEpoch(); await s.game.reset();
    const f = await s.game.getFarm(); expect(f.epoch).toBe(0); expect(f.level).toBe(1); expect(f.inventory).toHaveLength(3); expect(await s.game.openPack()).toEqual(first);
  });
});


describe('game-design corrections', () => {
  it.each([['Common', 0], ['Rare', .05], ['Epic', .10], ['Legendary', .20], ['Mythic', .30]] as const)('applies exactly the %s rarity bonus for three working items', async (rarity, bonus) => {
    const s = session(); await equipment(s, ['GPU', 'Battery', 'Fan'], rarity);
    let f = await s.game.getFarm();
    expect(comboBonus(f, f.rooms[0])).toBeCloseTo(bonus);
    expect(hasCombo(f, f.rooms[0], 'rarity')).toBe(bonus > 0);
    await s.fixture(f => { f.inventory[2].durability = 0; });
    f = await s.game.getFarm(); expect(comboBonus(f, f.rooms[0])).toBe(0);
  });
  it('selects Epic over a simultaneous Rare set without adding the weaker set', async () => {
    const s = session(); await equipment(s, ['GPU', 'ASIC', 'FPGA', 'Fan', 'Router', 'Server Rack'], 'Rare');
    await s.fixture(f => f.inventory.slice(3).forEach(i => { i.rarity = 'Epic'; }));
    const f = await s.game.getFarm();
    expect(roomCombos(f, f.rooms[0]).find(c => c.id === 'rarity')).toMatchObject({ name: 'Epic set', bonus: .10, active: true });
    expect(comboBonus(f, f.rooms[0])).toBeCloseTo(.35);
  });
  it('switches Duo to Triple and back as FPGA is installed, broken or removed', async () => {
    const s = session(); await equipment(s, ['GPU', 'ASIC', 'FPGA']);
    let f = await s.game.getFarm(); expect(totalHashrate(f)).toBeCloseTo(36);
    expect(hasCombo(f, f.rooms[0], 'duo')).toBe(false);
    expect(roomCombos(f, f.rooms[0]).find(c => c.id === 'duo')?.replacedBy).toBe('Triple Core');
    await s.fixture(f => { f.inventory[2].durability = 0; });
    f = await s.game.getFarm(); expect(totalHashrate(f)).toBeCloseTo(22);
    expect(hasCombo(f, f.rooms[0], 'duo')).toBe(true); expect(hasCombo(f, f.rooms[0], 'triple')).toBe(false);
    await s.game.repair(0); await s.game.unplace(0, 2);
    expect(totalHashrate(await s.game.getFarm())).toBeCloseTo(22);
    await s.game.place('item-12', 0); expect(totalHashrate(await s.game.getFarm())).toBeCloseTo(36);
  });
  it('charges increasing overclock prices, adds ten percent hash per level, and caps at five', async () => {
    const s = session(); await s.fixture(f => { f.tokens = 1000; });
    for (let level = 1; level <= 5; level++) {
      const before = await s.game.getFarm(); expect(overclockCost(before.rooms[0])).toBe(25 * level);
      await s.game.overclock(0); const after = await s.game.getFarm();
      expect(after.tokens).toBeCloseTo(before.tokens - 25 * level / 1.05);
      expect(totalHashrate(after)).toBeCloseTo(10 * (1 + .1 * level));
      expect(electricityTariff(after, after.rooms[0])).toBeCloseTo(.15 * (1 + .25 * level));
      expect((await s.reload().getFarm()).rooms[0].overclock).toBe(level);
    }
    const before = await s.game.getFarm(); await expect(s.game.overclock(0)).rejects.toThrow('level 5');
    expect((await s.game.getFarm()).tokens).toBe(before.tokens);
  });
  it('settles extra wear and power through the tariff alone and conserves mining output', async () => {
    const s = eventSession('cheap'); await equipment(s, ['GPU', 'Power Supply', 'Liquid Cooling', 'Solar Panel', 'Battery']);
    await s.fixture(f => { f.rooms[0].overclock = 5; f.tokens = 0; f.unclaimed = 50; });
    const before = await s.game.getFarm(); const gross = totalHashrate(before) * .1;
    await s.game.nextEpoch(); const f = await s.game.getFarm();
    const tariff = .15 * .65 * 2.25 * .5;
    expect(f.lastEpochReward).toBeCloseTo(gross * (1 - tariff));
    expect(f.rewardPoolTokens).toBeCloseTo(gross * tariff);
    expect(f.unclaimed).toBe(50); expect(f.pendingMining).toBeCloseTo(f.lastEpochReward); expect(f.tokens).toBe(0);
    expect(f.inventory.every(i => i.durability === 98.875)).toBe(true);
    expect(f).not.toHaveProperty('electricity'); expect(s.game).not.toHaveProperty('payElectricity');
  });
  it('rejects unaffordable and empty-room overclock upgrades without changing a room', async () => {
    const s = session(); await s.fixture(f => { f.tokens = 0; });
    await expect(s.game.overclock(0)).rejects.toThrow('need');
    expect((await s.game.getFarm()).rooms[0].overclock).toBe(0);
    await s.game.refillDemoFunds(); await s.game.unplace(0, 0);
    await expect(s.game.overclock(0)).rejects.toThrow('working item');
    expect((await s.game.getFarm()).tokens).toBe(350);
  });
  it('audits strictly above the configured hash threshold, independent of balances and rival ranks', async () => {
    const s = session();
    await equipment(s, ['GPU']);
    await s.fixture(f => { f.season.farmScore = 999999; f.tokens = 999999; f.inventory[0].rarity = 'Legendary'; f.inventory[0].durability = 20; });
    expect(auditEligibility(await s.game.getFarm())).toMatchObject({ hashrate: 100, threshold: 100, eligible: false });
    await s.fixture(f => { f.inventory[0].durability = 40; });
    expect(auditEligibility(await s.game.getFarm()).eligible).toBe(true);
    await s.game.unplace(0,0); expect(auditEligibility(await s.game.getFarm()).eligible).toBe(false);
  });
  it('migrates old depleted-reserve saves without resetting funds, hardware or overclock', async () => {
    const s = session(); await s.game.overclock(0); await revealAll(s.game);
    const before = await s.game.getFarm();
    const legacy = { ...before, electricity: 0, season: { ...before.season, rivalFarms: before.season.rivalFarms.map(({hashrate: _hashrate, ...farm}) => farm) } };
    s.storage.setItem(config.demo.storageKey, JSON.stringify(legacy));
    const after = await s.reload().getFarm();
    expect(after.storageWarning).toBe(''); expect(after.tokens).toBe(before.tokens);
    expect(after.inventory).toEqual(before.inventory); expect(after.pendingPack).toEqual(before.pendingPack);
    expect(after.rooms).toEqual(before.rooms); expect(after).not.toHaveProperty('electricity');
    expect(totalHashrate(after)).toBeCloseTo(11); expect(validState(after)).toBe(true);
    expect(JSON.parse(s.storage.getItem(config.demo.storageKey)!)).not.toHaveProperty('electricity');
  });
});


describe('sync, progression and allocations', () => {
  it('reads never sync, idle starts after three days, earned mining survives and actions resume it', async () => {
    const s = session(123, () => .9);
    for (let n=0;n<12;n++) await s.game.nextEpoch();
    let f = await s.game.getFarm(); const earned = f.pendingMining;
    expect(epochsToSync(f)).toBe(12); expect(isIdle(f)).toBe(true); expect(earned).toBeGreaterThan(0); expect(f.unclaimed).toBe(0);
    for (let n=0;n<4;n++) await s.game.nextEpoch();
    f = await s.reload().getFarm(); expect(f.pendingMining).toBe(earned); expect(f.lastEpochReward).toBe(0);
    await s.game.place('item-2',0); f=await s.game.getFarm(); expect(epochsToSync(f)).toBe(0); expect(f.unclaimed).toBe(earned);
    await s.game.nextEpoch(); expect((await s.game.getFarm()).pendingMining).toBeGreaterThan(0);
    await s.game.claim(); f=await s.game.getFarm(); expect(f.tokens).toBeGreaterThan(350+earned); expect(claimable(f)).toBe(0);
  });
  it('caps packs and spending XP together at 400 per farm day, with mining XP separate', async () => {
    const s = session(123, () => .9);
    await s.fixture(f => { f.tokens = 100000; });
    for(let n=0;n<20;n++) await s.game.expandInventory();
    await revealAll(s.game);
    let f = await s.game.getFarm(); expect(f.xp).toBe(400); expect(f.purchaseXp.earned).toBe(400); expect(f.level).toBe(4);
    await s.game.advanceDay(); await s.game.expandInventory(); f = await s.game.getFarm();
    expect(f.purchaseXp.day).toBe(1); expect(f.purchaseXp.earned).toBeCloseTo(actualSpend(60)*.5); expect(f.xp).toBeCloseTo(480+actualSpend(60)*.5); expect(f.level).toBe(5);
  });
  it('enforces elapsed-day gates even with enough XP for level ten', async () => {
    expect([0,.99,1,2.99,3,4.99,5].map(day=>levelFromXp(9999,day))).toEqual([4,4,6,6,9,9,10]);
    const s = session(); await s.fixture(f=>{ f.xp=9999; });
    expect((await s.reload().getFarm()).level).toBe(4);
    for(let n=0;n<5;n++) await s.game.advanceDay();
    const f=await s.reload().getFarm(); expect(f.level).toBe(10); expect(f.rooms).toHaveLength(1);
  });
  it('splits ETH packs, lobbying and sell surcharge 88/10/2 without burns', async () => {
    const s = session(); await s.game.openPack('eth'); await s.game.lobby(); await s.game.withdraw(100);
    const f=await s.game.getFarm(); const fees=actualSpend(config.costs.lobby)+20;
    expect(f.revenue.rewardPoolEth).toBeCloseTo(.0088); expect(f.revenue.teamEth).toBeCloseTo(.001 + fees*.10/config.packs.tokensPerEth, 10); expect(f.revenue.heartbeatEth).toBeCloseTo(.0002);
    expect(f.rewardPoolTokens).toBeCloseTo(fees*.88); expect(f.revenue).not.toHaveProperty('teamTokens'); expect(f.revenue.heartbeatTokens).toBeCloseTo(fees*.02);
    expect(f.rewardPoolTokens+(f.revenue.teamEth-.001)*config.packs.tokensPerEth+f.revenue.heartbeatTokens).toBeCloseTo(fees);
  });
  it('repairs exactly the selected item and supports repair of spares', async () => {
    const s = session(); await s.fixture(f=>{f.inventory[0].durability=0; f.inventory[1].durability=30;});
    await s.game.repairItem('item-1'); let f=await s.game.getFarm(); expect(f.inventory[0].durability).toBe(100); expect(f.inventory[1].durability).toBe(30);
    await s.game.repairItem('item-2'); f=await s.game.getFarm(); expect(f.inventory[1].durability).toBe(100);
  });
  it('migrates a previous release save without losing items, balances or unlocked rooms', async () => {
    const s=session(); await equipment(s,['GPU','FPGA','ASIC'],'Mythic'); const before=await s.game.getFarm();
    const legacy=JSON.parse(JSON.stringify(before));
    delete legacy.lastSyncedEpoch; delete legacy.pendingMining; delete legacy.purchaseXp; delete legacy.revenue;
    delete legacy.season.submittedScore; delete legacy.season.scoringDistrict; legacy.season.rivalFarms=legacy.season.rivalFarms.slice(0,23);
    s.storage.setItem(config.demo.storageKey,JSON.stringify(legacy)); const after=await s.reload().getFarm();
    expect(after.storageWarning).toBe(''); expect(after.tokens).toBe(before.tokens); expect(after.inventory).toEqual(before.inventory); expect(after.rooms).toEqual(before.rooms); expect(after.season.rivalFarms).toHaveLength(95); expect(epochsToSync(after)).toBe(0);
  });
});


describe('launch economy regressions', () => {
  it.each([[100,1],[80,1],[79.99,.85],[60,.85],[59.99,.65],[40,.65],[39.99,.4],[20,.4],[19.99,0],[0,0]])('at %s durability uses %s output and settles that tier', async (durability, output) => {
    const s = eventSession('calm'); await s.fixture(f=>{f.inventory[0].durability=durability;});
    expect(durabilityOutput(durability)).toBe(output);
    expect(totalHashrate(await s.game.getFarm())).toBeCloseTo(10*output);
    await s.game.nextEpoch(); const f = await s.game.getFarm();
    expect(f.lastEpochReward).toBeCloseTo(output*.85);
    if (!output) expect(f.xp).toBe(0);
  });
  it('excludes overheated items from combos and restores output with a scaled repair', async () => {
    const s = session(); await equipment(s, ['GPU','ASIC']);
    await s.fixture(f=>{f.inventory[1].durability=19;});
    let f=await s.game.getFarm(); expect(hasCombo(f,f.rooms[0],'duo')).toBe(false);
    const amount=repairCost(f.inventory[1])/1.05, balance=f.tokens;
    await s.game.repairItem(f.inventory[1].id); f=await s.game.getFarm();
    expect(f.tokens).toBeCloseTo(balance-amount); expect(hasCombo(f,f.rooms[0],'duo')).toBe(true);
  });
  it('charges more for stronger items and heavier wear, without charging full items', async () => {
    const common=item(1,'GPU','Common',50), epic=item(2,'GPU','Epic',50);
    expect(repairCost(epic)/repairCost(common)).toBe(8);
    expect(repairCost({...common,durability:0})).toBe(repairCost(common)*2);
    expect(repairCost({...common,durability:100})).toBe(0);
    const s=session(); await expect(s.game.repairItem('item-1')).rejects.toThrow('full durability');
    await s.fixture(f=>{f.inventory[0].durability=19;f.tokens=0;});
    await expect(s.game.repairItem('item-1')).rejects.toThrow('need');
    expect((await s.game.getFarm()).inventory[0].durability).toBe(19);
  });
  it('makes every output tier reachable with demo tools, without charging practice funds', async () => {
    const s=session(); const balance=(await s.game.getFarm()).tokens;
    for(const expected of [79,59,39,19,19]) {await s.game.previewWear();expect((await s.game.getFarm()).inventory[0].durability).toBe(expected);}
    expect((await s.game.getFarm()).tokens).toBe(balance);
    await s.game.unplace(0,0);await expect(s.game.previewWear()).rejects.toThrow('Install an item');
  });
  it('uses tokens by default and ETH as a single-action alternative',async()=>{
    const s=session();const before=await s.game.getFarm();const pack=await s.game.openPack();
    expect(pack.currency).toBe('tokens');expect((await s.game.getFarm()).ethBalance).toBe(before.ethBalance);
    await revealAll(s.game);const mid=await s.game.getFarm();await s.game.openPack('eth');const after=await s.game.getFarm();
    expect(after.tokens).toBe(mid.tokens);expect(after.ethBalance).toBeLessThan(mid.ethBalance);
  });
  it('keeps season items safe when inventory is full, including reserved pack slots',async()=>{
    const s=session();await s.fixture(f=>{f.season.pendingItems=[item(100,'GPU','Epic')];f.nextId=101;f.inventory.push(...Array.from({length:10},(_,i)=>item(i+10,'Battery')));});
    await s.game.openPack();const before=await s.game.getFarm();
    await expect(s.game.claimSeasonRewards()).rejects.toThrow('inventory slot');
    expect((await s.reload().getFarm()).season.pendingItems).toEqual(before.season.pendingItems);
    await s.game.expandInventory();await s.game.claimSeasonRewards();expect((await s.game.getFarm()).inventory.some(i=>i.id==='item-100')).toBe(true);
  });
  it('migrates legacy prizes, team accounting and owned rooms once without resetting a farm',async()=>{
    const s=session();const f=await s.game.getFarm();const legacy=JSON.parse(JSON.stringify(f));
    delete legacy.season.pendingItems;legacy.season.pendingTokens=70;legacy.revenue.teamTokens=10;
    legacy.rooms.push({id:1,slots:Array(6).fill(null),overclock:0});
    s.storage.setItem(config.demo.storageKey,JSON.stringify(legacy));let restored=await s.reload().getFarm();
    expect(restored.storageWarning).toBe('');expect(restored.tokens).toBe(f.tokens+70);expect(restored.rooms).toHaveLength(2);
    expect(restored.season.pendingItems).toEqual([]);expect(restored.revenue.teamEth).toBeCloseTo(.001,10);
    restored=await s.reload().getFarm();expect(restored.tokens).toBe(f.tokens+70);expect(restored.season).not.toHaveProperty('pendingTokens');
  });
});
