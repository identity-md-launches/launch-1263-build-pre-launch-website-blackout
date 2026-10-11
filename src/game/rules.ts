import { config } from '../config';
import { ITEM_TYPES, RARITIES } from './types';
import type { Combo, GameState, Item, ItemType, Rarity, Room, RoomUnlock } from './types';

export const HASHRATE = Object.fromEntries(RARITIES.map(r => [r, config.rarity[r].hash])) as Record<Rarity, number>;
export const DISTRICTS = [...config.city.districts];
export const COSTS = config.costs;
const percent = (value: number) => `${Math.round(value * 100)}%`;
const TAGS = [...new Set(Object.values(config.items).map(item => item.tag))];
export const EVENT_LABELS = { outage: 'Outage', surge: 'Power surge', fire: 'Server fire', theft: 'Cable theft', audit: 'Tax audit', green: 'Green wave', cheap: 'Cheap tariff', calm: 'Calm', supply: 'Supply drop' };
export const EVENT_PROTECTIONS = {
  outage: `Off-grid: Solar Panel + Battery preserves ${percent(config.combos.offGridOutageMultiplier)} of mining.`,
  surge: 'Clean Power: Surge Protector + Power Supply prevents item burn.',
  fire: 'Cold Power: Power Supply + Liquid Cooling is fire immune. Airflow: Fan + Server Rack halves fire damage.',
  theft: 'Locked Rack: Router + Server Rack prevents cable theft.',
  audit: `Only farms above ${config.events.auditHashThreshold} H/s qualify. An audit sends ${percent(config.events.auditTax)} of that epoch’s mining to the reward pool, never player balances. Lobbying lowers bad-event odds.`,
  green: `All active equipment in the affected district mines ${percent(config.events.greenHashBonus)} more.`,
  cheap: 'The affected district pays half its usual electricity tariff.',
  calm: 'No protection needed. This epoch has no additional disruption.',
  supply: 'Pack demand unlocked a supply drop for all eight districts.',
};
export const itemName = (item: Pick<Item, 'type'>): string => item.type;
export const itemHash = (item: Pick<Item, 'type' | 'rarity'>) => HASHRATE[item.rarity] * (config.items[item.type].tag === 'compute' ? 1 : config.mining.nonComputeMultiplier);
export const durabilityOutput = (durability: number) => config.durabilityTiers.find(tier => durability >= tier.minimum)?.output ?? 0;
/** Demo repair quote scales with full-output mining and the fraction of durability lost. */
export const repairCost = (item: Item) => itemHash(item) * config.mining.tokensPerHashPerEpoch * config.mining.repairEpochs * Math.max(0, 1 - item.durability / config.mining.maximumDurability);
export const roomRepairCost = (state: GameState, room: Room) => roomItems(state, room).reduce((sum, item) => sum + repairCost(item), 0);
export const itemDetail = (item: Pick<Item, 'type' | 'rarity'>): string => `${itemHash(item)} hash · ${config.items[item.type].tag}`;
export const equipLevel = (rarity: Rarity) => config.rarity[rarity].level;
export function nextRandom(seed: number): [number, number] {
  let x = seed >>> 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return [(x >>> 0) / 4294967296, x >>> 0];
}
export function rollRarity(n: number, level: number = config.rarity.Mythic.level): Rarity {
  let cumulative = 0;
  for (const rarity of RARITIES) {
    cumulative += config.rarity[rarity].odds;
    if (n < cumulative || rarity === 'Mythic') return rarity === 'Mythic' && level < config.rarity.Mythic.level ? 'Common' : rarity;
  }
  return 'Common';
}
export const rollType = (n: number): ItemType => ITEM_TYPES[Math.min(ITEM_TYPES.length - 1, Math.max(0, Math.floor(n * ITEM_TYPES.length)))];
export const findItem = (state: GameState, id: string | null) => state.inventory.find(i => i.id === id);
export const slotsFor = (_state: GameState, _room: Room) => config.rooms.slots;
export const equippedIds = (state: GameState) => new Set(state.rooms.flatMap(r => r.slots.filter((id): id is string => !!id)));
export const spareItems = (state: GameState) => { const equipped = equippedIds(state); return state.inventory.filter(i => !equipped.has(i.id)); };
export const reservedSlots = (state: GameState) => state.pendingPack?.revealed.filter(revealed => !revealed).length ?? 0;
export const inventoryUsed = (state: GameState) => spareItems(state).length + reservedSlots(state);
export const activeEvent = (state: GameState) => state.events.find(e => e.expiresAt > state.updatedAt);
export const roomItems = (state: GameState, room: Room) => room.slots.map(id => findItem(state, id)).filter((item): item is Item => !!item);
export function roomCombos(state: GameState, room: Room): Combo[] {
  const items = roomItems(state, room).filter(i => durabilityOutput(i.durability) > 0);
  const types = new Set(items.map(i => i.type));
  const tags = new Set(items.map(i => config.items[i.type].tag));
  const combination = (id: string, name: string, required: ItemType[], bonus: number, description: string): Combo => ({ id, name, active: required.every(t => types.has(t)), bonus, description, missing: required.filter(t => !types.has(t)) });
  const combos: Combo[] = [
    combination('duo', 'Compute Duo', ['GPU', 'ASIC'], config.combos.computeDuo, `+${percent(config.combos.computeDuo)} room hash`),
    combination('triple', 'Triple Core', ['GPU', 'ASIC', 'FPGA'], config.combos.tripleCore, `+${percent(config.combos.tripleCore)} room hash · replaces Compute Duo; never stacks`),
    { id: 'stack', name: 'Full Stack', active: tags.size === TAGS.length, bonus: config.combos.fullStack, description: `+${percent(config.combos.fullStack)} room hash · all five tags`, missing: TAGS.filter(t => !tags.has(t)).map(t => `${t} item`) },
    combination('airflow', 'Airflow', ['Fan', 'Server Rack'], config.combos.airflow, `+${percent(config.combos.airflow)} room hash · fire damage halved`),
    combination('cold', 'Cold Power', ['Power Supply', 'Liquid Cooling'], 0, `Electricity tariff −${percent(config.combos.coldPowerElectricity)} · fire immune`),
    combination('offgrid', 'Off-grid', ['Solar Panel', 'Battery'], 0, `Electricity tariff −${percent(config.combos.offGridElectricity)} · retain ${percent(config.combos.offGridOutageMultiplier)} mining in outages`),
    combination('clean', 'Clean Power', ['Surge Protector', 'Power Supply'], 0, 'Power surge immune'),
    combination('locked', 'Locked Rack', ['Router', 'Server Rack'], 0, 'Cable theft immune'),
  ];
  if (config.combos.tripleReplacesDuo && combos.find(c => c.id === 'triple')?.active) {
    const duo = combos.find(c => c.id === 'duo')!;
    duo.active = false; duo.replacedBy = 'Triple Core';
  }
  const counts = RARITIES.filter(rarity => config.rarity[rarity].setBonus > 0).map(rarity => ({ rarity, count: items.filter(i => i.rarity === rarity).length }));
  const sets = counts.filter(s => s.count >= config.combos.raritySetCount);
  const best = sets.sort((a, b) => config.rarity[b.rarity].setBonus - config.rarity[a.rarity].setBonus)[0];
  const closest = [...counts].sort((a, b) => b.count - a.count)[0];
  combos.push({ id: 'rarity', name: best ? `${best.rarity} set` : 'Rarity set', active: !!best, bonus: best ? config.rarity[best.rarity].setBonus : 0, description: `${config.combos.raritySetCount}+ of one rarity: ${counts.map(({rarity}) => `${rarity} +${percent(config.rarity[rarity].setBonus)}`).join(', ')}. Common: no bonus. Only the strongest set applies.`, missing: best ? [] : [`${config.combos.raritySetCount - closest.count} more ${closest.rarity} items`] });
  return combos;
}
export const hasCombo = (state: GameState, room: Room, id: string) => roomCombos(state, room).some(c => c.id === id && c.active);
export const comboBonus = (state: GameState, room: Room) => Math.min(config.combos.hashCap, roomCombos(state, room).reduce((sum, c) => sum + (c.active ? c.bonus : 0), 0));
export function roomHashrate(state: GameState, room: Room): number {
  const base = roomItems(state, room).reduce((sum, item) => sum + itemHash(item) * durabilityOutput(item.durability), 0);
  let rate = base * (1 + comboBonus(state, room)) * (1 + config.overclock.hashPerLevel * room.overclock);
  const event = activeEvent(state);
  if (event?.district === state.district) {
    if (event.type === 'outage') rate *= hasCombo(state, room, 'offgrid') ? config.combos.offGridOutageMultiplier : 0;
    if (event.type === 'theft' && !hasCombo(state, room, 'locked')) rate *= config.events.theftHashMultiplier;
    if (event.type === 'green') rate *= 1 + config.events.greenHashBonus;
  }
  return rate;
}
export const totalHashrate = (state: GameState) => state.rooms.reduce((sum, room) => sum + roomHashrate(state, room), 0);
/** The strict threshold is a beta parameter, independent of balances and rivals. */
export function auditEligibility(state: GameState) {
  const hashrate = totalHashrate(state);
  return { hashrate, threshold: config.events.auditHashThreshold, eligible: hashrate > config.events.auditHashThreshold };
}
export const epochsToSync = (state: GameState) => Math.max(0, state.epoch - state.lastSyncedEpoch);
export const isIdle = (state: GameState) => epochsToSync(state) >= config.sync.idleDays * epochsPerDay();
export const claimable = (state: GameState) => state.unclaimed + state.pendingMining;
/** Greatest capped total T satisfying sum(min(walletScore, 10% * T)) = T.
 * With fewer than ten active wallets there is no positive solution. Demo districts
 * contain twelve wallets; small districts wait for ten active wallets to qualify.
 */
export function cappedDistrict(scores: number[]) {
  const active = scores.filter(s => s > 0).sort((a, b) => a - b);
  const share = config.season.walletShareCap;
  if (active.length < Math.ceil(1 / share)) return { score: 0, total: 0, cap: 0, active: active.length };
  let total = active.reduce((a, b) => a + b, 0), prefix = 0;
  for (let k = 1; k <= active.length; k++) {
    prefix += active[k - 1];
    const denominator = 1 - (active.length - k) * share;
    if (denominator <= 0) continue;
    const candidate = prefix / denominator, cap = candidate * share;
    if (cap + 1e-9 >= active[k - 1] && (k === active.length || cap <= active[k] + 1e-9)) { total = candidate; break; }
  }
  return { score: total / active.length, total, cap: total * share, active: active.length };
}
export function districtStandings(state: GameState) {
  return DISTRICTS.map((name, id) => {
    const scores = state.season.rivalFarms.filter(f => f.district === id).map(f => f.score);
    if (state.season.scoringDistrict === id && state.season.submittedScore > 0) scores.push(state.season.submittedScore);
    return { id, name, ...cappedDistrict(scores) };
  }).sort((a, b) => b.score - a.score || a.id - b.id);
}
export const electricityReduction = (state: GameState, room: Room) => (hasCombo(state, room, 'cold') ? config.combos.coldPowerElectricity : 0) + (hasCombo(state, room, 'offgrid') ? config.combos.offGridElectricity : 0);
export function electricityTariff(state: GameState, room: Room) {
  const event = activeEvent(state);
  return config.electricity.tariff * (1 - electricityReduction(state, room)) * (1 + room.overclock * config.overclock.extraPowerPerLevel) * (event?.district === state.district && event.type === 'cheap' ? config.electricity.cheapMultiplier : 1);
}
export const overclockCost = (room: Room) => COSTS.overclock * (room.overclock + 1);
export const actualSpend = (nominal: number) => nominal / (1 + config.economy.spendBonus);
export const levelFromXp = (xp: number, gameDays = Number.POSITIVE_INFINITY): number => {
  const earned = config.xp.levels.filter(threshold => xp >= threshold).length;
  const gate = Object.entries(config.xp.dayGates).find(([, day]) => gameDays < day);
  return Math.min(earned, gate ? Number(gate[0]) - 1 : config.xp.levels.length);
};
export const epochsPerDay = () => config.epoch.dayHours / config.epoch.hours;
export const seasonEpochs = () => config.season.days * epochsPerDay();
export const roomUnlocks = (state: GameState): RoomUnlock[] => config.rooms.prices.map((price, id) => ({ id, price, unlocked: state.rooms.some(room => room.id === id) }));
export function packPrice(state: GameState) {
  const quietEpochs = Math.max(0, state.updatedAt - state.market.lastDemandAt) / config.demo.eventIntervalMs;
  return Math.max(config.packs.floorEth, Math.min(config.packs.ceilingEth, state.market.lastPriceEth - quietEpochs * config.packs.quietDecayPerEpoch));
}
export const tokenPackPrice = (state: GameState) => packPrice(state) * config.packs.tokensPerEth * (1 - config.packs.tokenDiscount);
export const withdrawTax = (state: GameState) => config.economy.withdrawStartTax - Math.min(1, state.gameDays / config.economy.withdrawDecayDays) * (config.economy.withdrawStartTax - config.economy.withdrawEndTax);
export const withdrawPreview = (state: GameState, amount: number) => ({ gross: amount, taxRate: withdrawTax(state), tax: amount * withdrawTax(state), net: amount * (1 - withdrawTax(state)) });
export const secondsToEpoch = (state: GameState, now = Date.now()) => Math.max(0, Math.ceil((state.nextEventAt - now) / 1000));
