import { describe, expect, it } from 'vitest';
import { DemoAdapter, validState } from '../src/game/DemoAdapter';
import { config } from '../src/config';
import { actualSpend, comboBonus, electricityTariff, equippedIds, epochsPerDay, hasCombo, inventoryUsed, itemHash, levelFromXp, nextRandom, packPrice, rollRarity, rollType, roomCombos, roomHashrate, seasonEpochs, totalHashrate, withdrawPreview, withdrawTax } from '../src/game/rules';
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
      state.level = levelFromXp(state.xp); state.gameDays = state.epoch / epochsPerDay();
      state.nextId = Math.max(state.nextId, ...state.inventory.map(i => Number(i.id.slice(5)) + 1), ...(state.pendingPack?.cards.map(i => Number(i.id.slice(5)) + 1) ?? []));
      expect(validState(state), 'test fixture must be valid').toBe(true);
      storage.setItem(config.demo.storageKey, JSON.stringify(state)); adapter = new DemoAdapter({ storage, now, seed, random }); return state;
    },
  };
}
const item = (id: number, type: ItemType = 'GPU', rarity: Rarity = 'Common', durability = 100): Item => ({ id: `item-${id}`, type, rarity, durability });
async function equipment(s: ReturnType<typeof session>, types: ItemType[], rarity: Rarity = 'Common') {
  await s.fixture(state => {
    state.xp = config.xp.levels.at(-1)!;
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
  it('unlocks room 2 at three game days, room 3 at level 7 and room 4 at level 10', async () => {
    const s = session(); await s.game.advanceDay(); await s.game.advanceDay();
    expect((await s.game.getFarm()).rooms.some(r => r.id === 1)).toBe(false);
    await s.game.advanceDay(); expect((await s.game.getFarm()).rooms.some(r => r.id === 1)).toBe(true);
    await s.fixture(f => { f.xp = config.xp.levels[6]; }); await s.game.nextEpoch();
    expect((await s.game.getFarm()).rooms.some(r => r.id === 2)).toBe(true);
    await s.fixture(f => { f.xp = config.xp.levels[9]; }); await s.game.nextEpoch();
    expect((await s.game.getFarm()).rooms).toHaveLength(4);
  });
  it('stacks compute combos and caps total room hash bonuses at 40%', async () => {
    const s = session(); await equipment(s, ['GPU', 'ASIC', 'FPGA', 'Fan', 'Router', 'Server Rack'], 'Rare');
    const f = await s.game.getFarm(); const combos = roomCombos(f, f.rooms[0]);
    expect(combos.filter(c => c.active).map(c => c.id)).toEqual(expect.arrayContaining(['duo', 'triple', 'airflow', 'locked', 'rarity']));
    expect(comboBonus(f, f.rooms[0])).toBe(.4);
    expect(totalHashrate(f)).toBeCloseTo((28 * 3 + 28 * .6 * 3) * 1.4);
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
    const f = await s.game.getFarm(); expect(roomCombos(f, f.rooms[0]).find(c => c.id === 'rarity')?.bonus).toBe(.2);
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
  it('merges only three same-type same-rarity spares and supports Legendary to Mythic', async () => {
    const s = session(); await s.fixture(f => { f.inventory.push(item(4), item(5), item(6), item(7, 'ASIC', 'Legendary'), item(8, 'ASIC', 'Legendary'), item(9, 'ASIC', 'Legendary')); });
    await expect(s.game.merge(['item-1', 'item-4', 'item-5'])).rejects.toThrow('spare');
    await expect(s.game.merge(['item-4', 'item-4', 'item-5'])).rejects.toThrow('different');
    const rare = await s.game.merge(['item-4', 'item-5', 'item-6']); expect(rare.rarity).toBe('Rare');
    const mythic = await s.game.merge(['item-7', 'item-8', 'item-9']); expect(mythic.rarity).toBe('Mythic');
    await expect(s.game.place(mythic.id, 0)).rejects.toThrow('level 10');
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
    expect(after.rewardPoolTokens).toBeCloseTo(p.price); expect(after.xp).toBeCloseTo(20 + p.price * .5);
  });
  it('allows replenishing simulated funds, and never charges for an already pending pack', async () => {
    const s = session(); await s.fixture(f => { f.ethBalance = 0; f.tokens = 0; });
    await expect(s.game.openPack()).rejects.toThrow('simulated ETH');
    await s.game.refillDemoFunds(); const p = await s.game.openPack(); const balance = (await s.game.getFarm()).ethBalance;
    expect(await s.game.openPack()).toEqual(p); expect((await s.game.getFarm()).ethBalance).toBe(balance);
  });
  it('previews and applies withdrawal tax declining from 20% to 5% over seven days', async () => {
    const s = session(); let f = await s.game.getFarm(); expect(withdrawTax(f)).toBeCloseTo(.2); expect(withdrawPreview(f, 100).net).toBe(80);
    await s.game.withdraw(100); f = await s.game.getFarm(); expect(f.tokens).toBe(250); expect(f.withdrawn).toBe(80); expect(f.rewardPoolTokens).toBe(20);
    for (let n = 0; n < 7; n++) await s.game.advanceDay();
    expect(withdrawTax(await s.game.getFarm())).toBeCloseTo(.05);
    await expect(s.game.withdraw(NaN)).rejects.toThrow('greater'); await expect(s.game.withdraw(-1)).rejects.toThrow('greater'); await expect(s.game.withdraw(1e8)).rejects.toThrow('exceeds');
  });
  it('repairs every installed type, spends with bonus, and bounds overclock', async () => {
    const s = eventSession('calm'); await s.game.place('item-2', 0); await s.game.nextEpoch();
    let f = await s.game.getFarm(); expect(f.inventory.filter(i => equippedIds(f).has(i.id)).every(i => i.durability === 99.5)).toBe(true);
    const start = f.tokens; await s.game.repair(0); await s.game.payElectricity(); await s.game.overclock(0);
    f = await s.game.getFarm(); expect(f.tokens).toBeCloseTo(start - actualSpend(12 + 15 + 25)); expect(f.electricity).toBe(100); expect(f.rooms[0].overclock).toBe(1);
    expect(f.inventory.find(i => i.id === 'item-2')?.durability).toBe(100);
    await s.game.overclock(0); await s.game.overclock(0); await expect(s.game.overclock(0)).rejects.toThrow('level 3');
  });
});

describe('epoch settlement and dispatcher events', () => {
  it('updates mining, wear, XP and claims only on epoch boundaries', async () => {
    const s = eventSession('calm'); s.advance(44_999); let f = await s.game.getFarm();
    expect(f.unclaimed).toBe(0); expect(f.inventory[0].durability).toBe(100);
    s.advance(1); f = await s.game.getFarm(); expect(f.epoch).toBe(1); expect(f.unclaimed).toBeCloseTo(.85); expect(f.xp).toBe(20); expect(f.inventory[0].durability).toBe(99.5);
    const mined = f.unclaimed; await s.game.claim(); f = await s.game.getFarm(); expect(f.tokens).toBeCloseTo(350 + mined); expect(f.unclaimed).toBe(0);
    expect((await s.reload().getFarm()).epoch).toBe(1); await expect(s.game.claim()).rejects.toThrow('Nothing');
  });
  it('gives no repeatable mining reward or active XP to empty or unpowered farms', async () => {
    const s = eventSession('calm'); await s.game.unplace(0, 0); await s.game.nextEpoch();
    let f = await s.game.getFarm(); expect(f.unclaimed).toBe(0); expect(f.xp).toBe(0);
    await s.game.place('item-1', 0); await s.fixture(state => { state.electricity = 0; }); await s.game.nextEpoch();
    f = await s.game.getFarm(); expect(f.unclaimed).toBe(0); expect(f.xp).toBe(0); expect(f.inventory[0].durability).toBe(100);
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
    expect(f.electricity).toBeCloseTo(100 - 5 * .65);
  });
  it('audits debit spendable balance only in the affected district', async () => {
    const s = eventSession('audit'); await s.game.nextEpoch(); expect((await s.game.getFarm()).tokens).toBe(315);
    const other = eventSession('audit', 0); await other.game.nextEpoch(); expect((await other.game.getFarm()).tokens).toBe(350);
  });
  it('lobbying lowers bad-event targeting odds, is consumed once, and is not immunity', async () => {
    let hits = 0, harmful = 0;
    const s = session();
    for (let n = 0; n < 1200; n++) {
      await s.fixture(f => { f.tokens = 100; }); await s.game.lobby();
      await expect(s.game.lobby()).rejects.toThrow('already');
      await s.game.nextEpoch(); const f = await s.game.getFarm(); expect(f.lobbied).toBe(false); expect(f.events[0].lobbied).toBe(true);
      if (['outage', 'surge', 'fire', 'theft', 'audit'].includes(f.events[0].type)) { harmful++; if (f.events[0].district === f.district) hits++; }
    }
    expect(hits / harmful).toBeGreaterThan(.025); expect(hits / harmful).toBeLessThan(.11);
  });
  it('sales spikes create one citywide supply drop and bounded offline catch-up', async () => {
    const s = session(); await revealAll(s.game); await revealAll(s.game); await revealAll(s.game); await s.game.nextEpoch();
    let f = await s.game.getFarm(); expect(f.events[0].type).toBe('supply'); expect(f.unclaimed).toBeGreaterThanOrEqual(5);
    s.advance(365 * 86400_000); f = await s.game.getFarm(); expect(f.epoch).toBe(1 + config.demo.maxOfflineEpochs); expect(f.events).toHaveLength(30); expect(f.letters).toHaveLength(30); expect(f.nextEventAt).toBe(s.now() + 45_000);
  });
});

describe('season, referral and NFT demo flows', () => {
  it('settles weekly rankings, accumulates prizes and claims rewards once', async () => {
    const s = session(); await s.fixture(f => { f.season.districtScores[f.district] = 1e6; f.season.farmScore = 1e6; });
    for (let n = 0; n < seasonEpochs(); n++) await s.game.nextEpoch();
    let f = await s.game.getFarm(); expect(f.season.number).toBe(2); expect(f.season.lastResult).toContain('Best farm prize'); expect(f.season.pendingFreePacks).toBe(1); expect(f.season.pendingTokens).toBeGreaterThanOrEqual(50);
    await s.game.claimSeasonRewards(); f = await s.game.getFarm(); expect(f.freePacks).toBe(1); expect(f.season.pendingTokens).toBe(0);
    await expect(s.game.claimSeasonRewards()).rejects.toThrow('No season');
  });
  it('builds district totals from individual rival farm scores plus the player contribution', async () => {
    const s = session(); await s.game.nextEpoch(); const f = await s.game.getFarm();
    expect(f.season.rivalFarms).toHaveLength(config.season.demoFarmCount - 1);
    for (let district = 0; district < config.city.districts.length; district++) {
      const rivals = f.season.rivalFarms.filter(farm => farm.district === district);
      expect(rivals).toHaveLength(district === f.district ? 2 : 3);
      expect(f.season.districtScores[district]).toBeCloseTo(rivals.reduce((sum, farm) => sum + farm.score, 0) + (district === f.district ? f.season.farmScore : 0));
    }
  });
  it.each([false, true])('awards best farm only when its score beats each actual rival (winner=%s)', async shouldWin => {
    const s = session(123, () => .9);
    await s.fixture(f => {
      f.season.endsAtEpoch = 1;
      f.season.farmScore = shouldWin ? 1200 : 600;
      f.season.rivalFarms[0].score = 1000;
      f.season.districtScores = config.city.districts.map((_, district) => f.season.rivalFarms.filter(rival => rival.district === district).reduce((sum, rival) => sum + rival.score, 0) + (district === f.district ? f.season.farmScore : 0));
    });
    await s.game.nextEpoch(); const f = await s.game.getFarm();
    expect(f.season.lastResult.includes('Best farm prize awarded')).toBe(shouldWin);
    expect(f.season.pendingTokens).toBe(shouldWin ? config.season.bestFarmTokens : 0);
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
    expect(after.season.rivalFarms.reduce((sum, rival) => sum + rival.score, 0) + after.season.farmScore).toBeCloseTo(before.season.districtScores.reduce((sum, score) => sum + score, 0));
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
