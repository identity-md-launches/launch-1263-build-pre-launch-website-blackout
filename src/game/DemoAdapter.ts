import { config } from '../config';
import { actualSpend, auditEligibility, COSTS, electricityTariff, equippedIds, epochsPerDay, EVENT_LABELS, EVENT_PROTECTIONS, findItem, hasCombo, inventoryUsed, levelFromXp, nextRandom, overclockCost, packPrice, rollRarity, rollType, roomHashrate, roomItems, roomUnlocks, seasonEpochs, tokenPackPrice, withdrawPreview } from './rules';
import { ITEM_TYPES, RARITIES } from './types';
import type { EventType, GameAdapter, GameState, GridEvent, Item, Letter, Pack, PackCurrency, RivalFarm, Room } from './types';

export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
interface Options { storage?: StorageLike; now?: () => number; seed?: number; eventIntervalMs?: number; random?: () => number; referralCode?: string }
const room = (id: number): Room => ({ id, slots: Array.from({ length: config.rooms.slots }, () => null), overclock: 0 });
const copy = <T>(value: T): T => structuredClone(value);
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= Number.MAX_SAFE_INTEGER;
const nonnegative = (n: unknown): n is number => finite(n) && n >= 0;
const integer = (n: unknown): n is number => nonnegative(n) && Number.isInteger(n);
const safeText = (s: unknown): s is string => typeof s === 'string' && s.length <= 1500 && !/[<>\u0000-\u0008]/.test(s);
const validItem = (i: Item) => i && /^item-\d+$/.test(i.id) && ITEM_TYPES.includes(i.type) && RARITIES.includes(i.rarity) && nonnegative(i.durability) && i.durability <= config.mining.maximumDurability;
// Stable demo hashrates span the existing simulated rival mining range.
const rivalHashrate = (id: number) => (config.city.rivalFarmMiningMin + (id - 1) / Math.max(1, config.season.demoFarmCount - 2) * (config.city.rivalFarmMiningMax - config.city.rivalFarmMiningMin)) / config.mining.tokensPerHashPerEpoch;
/** Farm zero is the player; the remaining farms have stable identities within a season. */
const createRivals = (playerDistrict: number): RivalFarm[] => Array.from({ length: config.season.demoFarmCount - 1 }, (_, index) => ({
  id: index + 1, district: (index + playerDistrict + 1) % config.city.districts.length, score: 0, hashrate: rivalHashrate(index + 1),
}));
/** Older v3 saves held district totals only. Preserve their history without resetting a farm. */
function restoreLegacyRivals(state: GameState) {
  if (state?.version !== config.demo.stateVersion || !state.season || Object.hasOwn(state.season, 'rivalFarms')) return;
  if (!integer(state.district) || state.district >= config.city.districts.length || !Array.isArray(state.season.districtScores) || state.season.districtScores.length !== config.city.districts.length || !state.season.districtScores.every(nonnegative) || !nonnegative(state.season.farmScore)) return;
  const rivals = createRivals(state.district);
  for (const rival of rivals) {
    const localRivals = rivals.filter(farm => farm.district === rival.district).length;
    const historicalTotal = Math.max(0, state.season.districtScores[rival.district] - (rival.district === state.district ? state.season.farmScore : 0));
    rival.score = historicalTotal / localRivals;
  }
  state.season.rivalFarms = rivals;
}


/** Browser saves are untrusted: reject malformed references, impossible slots and unsafe data. */
export function validState(s: GameState): boolean {
  try {
    if (!s || s.version !== config.demo.stateVersion || !integer(s.rng) || !s.rng || !integer(s.nextId) || !s.nextId) return false;
    const numbers = [s.updatedAt, s.createdAt, s.nextEventAt, s.tokens, s.unclaimed, s.ethBalance, s.totalPacks, s.xp, s.epoch, s.gameDays, s.withdrawn, s.totalMined, s.totalSpent, s.rewardPoolTokens, s.freePacks, s.lastEpochReward];
    if (!numbers.every(nonnegative) || s.nextEventAt < s.updatedAt || !integer(s.epoch) || s.gameDays !== s.epoch / epochsPerDay() || s.level !== levelFromXp(s.xp)) return false;
    if (!integer(s.inventoryCapacity) || s.inventoryCapacity < config.inventory.initialSlots || (s.inventoryCapacity - config.inventory.initialSlots) % config.inventory.expansionSlots) return false;
    if (!Array.isArray(s.inventory) || s.inventory.length > s.inventoryCapacity + config.rooms.maximum * config.rooms.slots || !s.inventory.every(validItem)) return false;
    if (new Set(s.inventory.map(i => i.id)).size !== s.inventory.length || s.inventory.some(i => Number(i.id.slice(5)) >= s.nextId)) return false;
    if (!integer(s.district) || s.district >= config.city.districts.length || typeof s.lobbied !== 'boolean' || typeof s.nftStarterClaimed !== 'boolean') return false;
    if (!Array.isArray(s.rooms) || s.rooms.length < 1 || s.rooms.length > config.rooms.maximum || new Set(s.rooms.map(r => r.id)).size !== s.rooms.length) return false;
    const ids: string[] = [];
    for (const r of s.rooms) {
      if (!integer(r.id) || r.id >= config.rooms.maximum || !roomUnlocks(s).find(u => u.id === r.id)?.unlocked || !integer(r.overclock) || r.overclock > config.overclock.maximum || !Array.isArray(r.slots) || r.slots.length !== config.rooms.slots) return false;
      const types: string[] = [];
      for (const id of r.slots) {
        if (id === null) continue;
        const item = findItem(s, id);
        if (!item || config.rarity[item.rarity].level > s.level) return false;
        types.push(item.type); ids.push(id);
      }
      if (new Set(types).size !== types.length) return false;
    }
    if (!s.rooms.some(r => r.id === 0) || new Set(ids).size !== ids.length) return false;
    if (!Array.isArray(s.events) || s.events.length > config.demo.logLimit || !s.events.every(e => e && Object.hasOwn(EVENT_LABELS, e.type) && integer(e.id) && integer(e.district) && e.district < config.city.districts.length && nonnegative(e.at) && nonnegative(e.expiresAt) && typeof e.lobbied === 'boolean' && safeText(e.protection))) return false;
    if (!Array.isArray(s.letters) || s.letters.length > config.demo.logLimit || !s.letters.every(l => l && integer(l.id) && safeText(l.title) && safeText(l.body) && nonnegative(l.at))) return false;
    const p = s.pendingPack;
    if (p !== null && (!p || !/^pack-\d+$/.test(p.id) || !['eth', 'tokens', 'free'].includes(p.currency) || !nonnegative(p.price) || !Array.isArray(p.cards) || p.cards.length !== config.packs.items || !p.cards.every(validItem) || !Array.isArray(p.revealed) || p.revealed.length !== config.packs.items || !p.revealed.every(v => typeof v === 'boolean'))) return false;
    if (p && (new Set(p.cards.map(i => i.id)).size !== config.packs.items || p.cards.some((i, n) => Number(i.id.slice(5)) >= s.nextId || (!p.revealed[n] && s.inventory.some(v => v.id === i.id))))) return false;
    if (inventoryUsed(s) > s.inventoryCapacity) return false;
    if (!s.market || ![s.market.lastPriceEth, s.market.lastDemandAt, s.market.packsThisEpoch].every(nonnegative) || s.market.lastPriceEth < config.packs.floorEth || s.market.lastPriceEth > config.packs.ceilingEth) return false;
    if (!s.referral || !/^[a-zA-Z0-9-]{1,32}$/.test(s.referral.code) || (s.referral.referredBy !== '' && !/^[a-zA-Z0-9-]{1,32}$/.test(s.referral.referredBy)) || ![s.referral.invitees, s.referral.inviteeMining, s.referral.earned].every(nonnegative)) return false;
    if (!s.season || ![s.season.number, s.season.endsAtEpoch, s.season.farmScore, s.season.pendingFreePacks, s.season.pendingTokens].every(nonnegative) || s.season.endsAtEpoch <= s.epoch || !Array.isArray(s.season.districtScores) || s.season.districtScores.length !== config.city.districts.length || !s.season.districtScores.every(nonnegative) || !safeText(s.season.lastResult)) return false;
    if (!Array.isArray(s.season.rivalFarms) || s.season.rivalFarms.length !== config.season.demoFarmCount - 1 || !s.season.rivalFarms.every(farm => farm && integer(farm.id) && farm.id > 0 && farm.id < config.season.demoFarmCount && integer(farm.district) && farm.district < config.city.districts.length && nonnegative(farm.score) && nonnegative(farm.hashrate)) || new Set(s.season.rivalFarms.map(farm => farm.id)).size !== s.season.rivalFarms.length) return false;
    return true;
  } catch { return false; }
}

export class DemoAdapter implements GameAdapter {
  readonly mode = 'demo' as const;
  private state: GameState;
  private readonly storage?: StorageLike;
  private readonly now: () => number;
  private readonly interval: number;
  private readonly seed: number;
  private readonly randomOverride?: () => number;
  private readonly localReferralCode: string;
  private lastSavedRaw: string | null = null;

  constructor(options: Options = {}) {
    this.storage = options.storage;
    this.now = options.now ?? Date.now;
    this.randomOverride = options.random;
    // Referral identity is deliberately separate from reproducible gameplay RNG.
    const entropy = globalThis.crypto?.getRandomValues(new Uint32Array(2));
    const suffix = entropy ? Array.from(entropy, n => n.toString(36)).join('') : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    this.localReferralCode = options.referralCode ?? `${config.demo.referralCodePrefix}-${suffix}`;
    this.interval = Math.max(config.demo.minimumIntervalMs, options.eventIntervalMs ?? config.demo.eventIntervalMs);
    this.seed = (options.seed ?? config.demo.seed) >>> 0 || config.demo.seed;
    this.state = this.initial();
    if (!this.storage) this.state.storageWarning = 'Browser storage is unavailable. This session works, but progress will not survive a reload.';
    this.refresh();
    this.advance(false);
    this.save();
  }
  private initial(): GameState {
    const at = this.now();
    const starterRoom = room(0); starterRoom.slots[0] = 'item-1';
    return {
      version: config.demo.stateVersion, rng: this.seed, nextId: 4, createdAt: at, updatedAt: at, nextEventAt: at + this.interval,
      tokens: config.demo.startingTokens, ethBalance: config.demo.startingEth, unclaimed: 0,
      inventory: [
        { id: 'item-1', type: 'GPU', rarity: 'Common', durability: config.mining.maximumDurability },
        { id: 'item-2', type: 'Power Supply', rarity: 'Common', durability: config.mining.maximumDurability },
        { id: 'item-3', type: 'Fan', rarity: 'Common', durability: config.mining.maximumDurability },
      ],
      inventoryCapacity: config.inventory.initialSlots, rooms: [starterRoom], district: config.city.startingDistrict,
      lobbied: false, pendingPack: null, events: [], totalPacks: 0, storageWarning: '',
      xp: 0, level: 1, epoch: 0, gameDays: 0, withdrawn: 0, totalMined: 0, totalSpent: 0, rewardPoolTokens: 0,
      freePacks: 0, nftStarterClaimed: false, lastEpochReward: 0,
      referral: { code: this.localReferralCode, referredBy: '', invitees: 0, inviteeMining: 0, earned: 0 },
      season: { number: 1, endsAtEpoch: seasonEpochs(), districtScores: config.city.districts.map(() => 0), farmScore: 0, rivalFarms: createRivals(config.city.startingDistrict), pendingFreePacks: 0, pendingTokens: 0, lastResult: '' },
      market: { lastPriceEth: config.packs.startEth, lastDemandAt: at, packsThisEpoch: 0 },
      letters: [{ id: 0, title: 'Connection established', body: `Resident 04. Your starter GPU is installed. Two spare components await assignment. The next meter reading arrives in ${this.interval / 1000} seconds. Nothing in this demo has real value. — IMD Grid Dispatch`, at }],
    };
  }
  private refresh() {
    if (!this.storage) return;
    try {
      const raw = this.storage.getItem(config.demo.storageKey);
      if (!raw || raw === this.lastSavedRaw) return;
      this.lastSavedRaw = raw;
      try {
        const parsed = JSON.parse(raw) as GameState;
        restoreLegacyRivals(parsed);
        // Preserve existing farms while retiring the old reserve and adding audit ranks.
        delete (parsed as GameState & { electricity?: unknown }).electricity;
        if (Array.isArray(parsed?.season?.rivalFarms)) for (const rival of parsed.season.rivalFarms) {
          if (rival && !Object.hasOwn(rival, 'hashrate')) rival.hashrate = rivalHashrate(rival.id);
        }
        if (Array.isArray(parsed?.events)) for (const event of parsed.events) {
          if (event?.type === 'audit') event.protection = EVENT_PROTECTIONS.audit;
        }
        if (Array.isArray(parsed?.letters)) for (const letter of parsed.letters) {
          if (letter?.title === 'Tax audit' && typeof letter.body === 'string' && letter.body.includes('spendable balance')) letter.body = `Earlier demo audit. Current rule: ${EVENT_PROTECTIONS.audit} — IMD Grid Dispatch`;
        }
        if (validState(parsed)) this.state = { ...parsed, storageWarning: '' };
        else { this.state = this.initial(); this.state.storageWarning = 'Your saved demo could not be read. A fresh demo is ready.'; }
      } catch { this.state = this.initial(); this.state.storageWarning = 'Your saved demo could not be read. A fresh demo is ready.'; }
    } catch { this.state.storageWarning = 'Browser storage is unavailable. Progress may not survive a reload.'; }
  }
  private save() {
    if (!this.storage) return;
    try { const raw = JSON.stringify(this.state); this.storage.setItem(config.demo.storageKey, raw); this.lastSavedRaw = raw; }
    catch { this.state.storageWarning = 'Progress could not be saved. Free browser storage or keep this tab open.'; }
  }
  private random() { if (this.randomOverride) return Math.max(0, Math.min(1 - Number.EPSILON, this.randomOverride())); const [value, next] = nextRandom(this.state.rng); this.state.rng = next; return value; }
  private levelUp() {
    this.state.level = levelFromXp(this.state.xp);
    for (const unlock of roomUnlocks(this.state)) if (unlock.unlocked && !this.state.rooms.some(r => r.id === unlock.id)) this.state.rooms.push(room(unlock.id));
    this.state.rooms.sort((a, b) => a.id - b.id);
  }
  private spend(nominal: number) {
    const amount = actualSpend(nominal);
    if (this.state.tokens < amount) throw new Error(`You need ${amount.toFixed(2)} DEMO tokens after the 5% spending bonus. Claim mining or refill demo funds.`);
    this.state.tokens -= amount;
    this.state.totalSpent += amount; this.state.rewardPoolTokens += amount;
    this.state.xp += amount * config.xp.perTokenSpent; this.levelUp();
    return amount;
  }
  private getRoom(id: number) {
    const found = this.state.rooms.find(r => r.id === id);
    if (!found) throw new Error('This room is locked. Check its game-day or account-level requirement.');
    return found;
  }
  private addLetter(title: string, body: string, at = this.state.updatedAt) {
    this.state.letters.unshift({ id: this.state.epoch, title, body: `${body} — IMD Grid Dispatch`, at });
    this.state.letters = this.state.letters.slice(0, config.demo.logLimit);
  }
  private advance(refresh = true) {
    if (refresh) this.refresh();
    const now = Math.max(this.state.updatedAt, this.now());
    let processed = 0;
    while (this.state.nextEventAt <= now && processed < config.demo.maxOfflineEpochs) {
      this.runEpoch(this.state.nextEventAt);
      this.state.nextEventAt += this.interval;
      processed++;
    }
    if (this.state.nextEventAt <= now) {
      this.state.nextEventAt = now + this.interval;
      this.addLetter('Meter catch-up complete', `Offline catch-up is limited to ${config.demo.maxOfflineEpochs} demo epochs. Older idle time was skipped.`, now);
    }
    this.state.updatedAt = now;
  }
  private chooseEvent(): EventType {
    if (this.state.market.packsThisEpoch >= config.packs.supplyDropSales) return 'supply';
    const entries = Object.entries(config.events.weights) as [Exclude<EventType, 'supply'>, number][];
    let roll = this.random() * entries.reduce((sum, [, weight]) => sum + weight, 0);
    for (const [type, weight] of entries) { roll -= weight; if (roll < 0) return type; }
    return 'calm';
  }
  private dispatch(at: number) {
    const type = this.chooseEvent();
    const harmful = ['outage', 'surge', 'fire', 'theft', 'audit'].includes(type);
    const weights = config.city.districts.map((_, district) => this.state.lobbied && harmful && district === this.state.district ? config.events.lobbyBadEventMultiplier : 1);
    let roll = this.random() * weights.reduce((a, b) => a + b, 0);
    let district = weights.length - 1;
    for (let i = 0; i < weights.length; i++) { roll -= weights[i]; if (roll < 0) { district = i; break; } }
    const event: GridEvent = { id: this.state.epoch, type, district, at, expiresAt: at + this.interval, lobbied: this.state.lobbied, protection: EVENT_PROTECTIONS[type] };
    this.state.events.unshift(event); this.state.events = this.state.events.slice(0, config.demo.logLimit);
    const bodies: Record<EventType, string> = {
      outage: 'The grid has gone dark. Affected farms lose this epoch of mining unless an Off-grid room can keep half its power.',
      surge: 'Voltage exceeded tolerance. An unprotected item may burn out. Clean Power rooms are cleared for operation.',
      fire: 'A server fire has been reported. Unprotected rooms take durability damage. Do not fan the paperwork.',
      theft: 'Cable inventory does not match yesterday’s cable inventory. Unprotected rooms lose half their hash this epoch.',
      audit: `Routine inspection of the city’s top ${config.events.auditTopFraction * 100}% of farms by hashrate. Eligible farms in the affected district contribute ${config.events.auditTax * 100}% of this epoch’s gross mining to the reward pool. Existing balances and previously unclaimed mining stay intact.`,
      green: `Renewable surplus authorized. The affected district receives ${config.events.greenHashBonus * 100}% more mining this epoch.`,
      cheap: 'Off-peak capacity released. The affected district’s electricity tariff is halved this epoch.',
      calm: 'All readings within tolerance. No intervention required. Do not mistake this for a promise.',
      supply: `Pack orders crossed the supply threshold. Every district receives ${config.events.supplyDropTokens} DEMO tokens to claim.`,
    };
    const address = type === 'supply' ? 'Citywide notice.' : `District ${String(district + 1).padStart(2, '0')}: ${config.city.districts[district]}.`;
    this.addLetter(EVENT_LABELS[type], `${address} ${bodies[type]} ${event.protection}${event.lobbied ? ' Your lobby request reduced bad-event targeting odds for this dispatch; protection is not guaranteed.' : ''}`, at);
    this.state.lobbied = false;
    this.state.market.packsThisEpoch = 0;
    if (type === 'supply') this.state.unclaimed += config.events.supplyDropTokens;
    if (district !== this.state.district) return;
    for (const r of this.state.rooms) {
      const items = roomItems(this.state, r).filter(i => i.durability > 0);
      if (type === 'surge' && !hasCombo(this.state, r, 'clean') && items.length && this.random() < config.events.surgeBurnChance) {
        items[Math.floor(this.random() * items.length)].durability = 0;
      }
      if (type === 'fire' && !hasCombo(this.state, r, 'cold')) {
        const damage = config.events.fireDamage * (hasCombo(this.state, r, 'airflow') ? config.combos.airflowFireMultiplier : 1);
        for (const item of items) item.durability = Math.max(0, item.durability - damage);
      }
    }
  }
  private runEpoch(at: number) {
    this.state.updatedAt = at; this.state.epoch++; this.state.gameDays = this.state.epoch / epochsPerDay();
    this.dispatch(at);
    let mined = 0, auditLevy = 0;
    const event = this.state.events[0];
    const audit = event.type === 'audit' && event.district === this.state.district;
    const eligibility = audit ? auditEligibility(this.state) : null;
    const active = this.state.rooms.some(r => roomItems(this.state, r).some(i => i.durability > 0));
    for (const r of this.state.rooms) {
      const items = roomItems(this.state, r).filter(i => i.durability > 0);
      const gross = roomHashrate(this.state, r) * config.mining.tokensPerHashPerEpoch;
      const tariff = gross * electricityTariff(this.state, r);
      const levy = eligibility?.eligible ? gross * config.events.auditTax : 0;
      auditLevy += levy;
      mined += gross - tariff - levy; this.state.rewardPoolTokens += tariff + levy;
      if (active) for (const item of items) item.durability = Math.max(0, item.durability - config.mining.durabilityPerEpoch * (1 + r.overclock * config.overclock.extraWearPerLevel));
    }
    if (eligibility) {
      const outcome = eligibility.eligible ? `${auditLevy.toFixed(4)} DEMO tokens withheld from this epoch’s mining for the reward pool.` : 'Outside the top decile; no audit contribution.';
      this.state.letters[0].body += ` Your hashrate rank: ${eligibility.rank}/${eligibility.farmCount} (demo cutoff: ${eligibility.cutoff}). ${outcome} Beta values, may change.`;
    }
    this.state.unclaimed += mined; this.state.totalMined += mined; this.state.lastEpochReward = mined;
    if (active) this.state.xp += config.xp.perActiveEpoch;
    this.levelUp();
    this.state.season.farmScore += mined;
    this.state.season.districtScores[this.state.district] += mined;
    for (const rival of this.state.season.rivalFarms) {
      const rivalMining = config.city.rivalFarmMiningMin + this.random() * (config.city.rivalFarmMiningMax - config.city.rivalFarmMiningMin);
      rival.score += rivalMining;
      this.state.season.districtScores[rival.district] += rivalMining;
    }
    if (this.state.epoch >= this.state.season.endsAtEpoch) this.finishSeason();
  }
  private finishSeason() {
    const s = this.state.season;
    const winner = s.districtScores.indexOf(Math.max(...s.districtScores));
    const winningFarm = s.farmScore >= Math.max(...s.rivalFarms.map(farm => farm.score));
    const lottery = new Set<number>();
    const availableFarms = Array.from({ length: config.season.demoFarmCount }, (_, index) => index);
    for (let n = 0; n < config.season.lotteryFarms && availableFarms.length; n++) {
      const index = Math.floor(this.random() * availableFarms.length);
      lottery.add(availableFarms.splice(index, 1)[0]);
    }
    const districtPacks = winner === this.state.district ? config.season.districtFreePacks : 0;
    const prize = (winningFarm ? config.season.bestFarmTokens : 0) + (lottery.has(0) ? config.season.lotteryTokens : 0);
    s.pendingFreePacks += districtPacks; s.pendingTokens += prize;
    s.lastResult = `Season ${s.number}: ${config.city.districts[winner]} won the district race. Your farm earned ${districtPacks} free pack(s) and ${prize} DEMO tokens.${winningFarm ? ' Best farm prize awarded.' : ''}${lottery.has(0) ? ' Three-farm lottery winner.' : ''} Rival farms and prizes are simulated.`;
    this.addLetter('Weekly season settled', s.lastResult);
    s.number++; s.endsAtEpoch += seasonEpochs(); s.districtScores = config.city.districts.map(() => 0); s.farmScore = 0; s.rivalFarms = createRivals(this.state.district);
  }
  async getFarm() { this.advance(); this.save(); return copy(this.state); }
  async getGridEvents(): Promise<GridEvent[]> { this.advance(); this.save(); return copy(this.state.events); }
  async getLetters(): Promise<Letter[]> { this.advance(); this.save(); return copy(this.state.letters); }
  async openPack(currency: PackCurrency = 'eth'): Promise<Pack> {
    this.advance();
    if (this.state.pendingPack && !this.state.pendingPack.revealed.every(Boolean)) return copy(this.state.pendingPack);
    if (inventoryUsed(this.state) + config.packs.items > this.state.inventoryCapacity) throw new Error(`You need ${config.packs.items} free inventory slots. Equip, scrap, merge or expand before opening a pack.`);
    let price = 0;
    const currentPrice = packPrice(this.state);
    if (currency === 'free') {
      if (this.state.freePacks < 1) throw new Error('No free pack is available. Claim an eligible starter or season reward.');
      this.state.freePacks--;
    } else if (currency === 'eth') {
      price = currentPrice;
      if (this.state.ethBalance < price) throw new Error('Not enough simulated ETH. Refill demo funds to keep experimenting.');
      this.state.ethBalance -= price;
    } else if (currency === 'tokens') price = this.spend(tokenPackPrice(this.state));
    else throw new Error('Choose simulated ETH, DEMO tokens or an available free pack.');
    // Drop eligibility is evaluated before the XP awarded by this purchase.
    const level = this.state.level;
    const cards = Array.from({ length: config.packs.items }, (): Item => ({ id: `item-${this.state.nextId++}`, rarity: rollRarity(this.random(), level), type: rollType(this.random()), durability: config.mining.maximumDurability }));
    this.state.totalPacks++; this.state.xp += config.xp.perPack; this.levelUp();
    this.state.market.lastPriceEth = Math.min(config.packs.ceilingEth, currentPrice * (1 + config.packs.demandIncrease));
    this.state.market.lastDemandAt = this.state.updatedAt; this.state.market.packsThisEpoch++;
    this.state.pendingPack = { id: `pack-${this.state.totalPacks}`, cards, revealed: cards.map(() => false), currency, price };
    this.save(); return copy(this.state.pendingPack);
  }
  async reveal(packId: string, index: number): Promise<Item> {
    this.advance(); const p = this.state.pendingPack;
    if (!p || p.id !== packId || !Number.isInteger(index) || index < 0 || index >= config.packs.items) throw new Error('This card is no longer available. Open another demo pack.');
    if (!p.revealed[index]) { this.state.inventory.push(copy(p.cards[index])); p.revealed[index] = true; this.save(); }
    return copy(p.cards[index]);
  }
  async place(itemId: string, roomId: number, index?: number) {
    this.advance(); const item = findItem(this.state, itemId); const r = this.getRoom(roomId);
    if (!item) throw new Error('Choose an inventory item first.');
    if (equippedIds(this.state).has(itemId)) throw new Error('This item is already installed. Remove it before moving it.');
    if (config.rarity[item.rarity].level > this.state.level) throw new Error(`${item.rarity} equipment unlocks at account level ${config.rarity[item.rarity].level}.`);
    if (roomItems(this.state, r).some(i => i.type === item.type)) throw new Error('A room cannot contain duplicate item types. Choose another room.');
    const slot = index ?? r.slots.indexOf(null);
    if (!Number.isInteger(slot) || slot < 0 || slot >= config.rooms.slots) throw new Error('This room is full. Remove an item or unlock another room.');
    if (r.slots[slot]) throw new Error('Remove the installed item before replacing it.');
    r.slots[slot] = itemId; this.save();
  }
  async unplace(roomId: number, index: number) {
    this.advance(); const r = this.getRoom(roomId);
    if (!Number.isInteger(index) || index < 0 || index >= config.rooms.slots || !r.slots[index]) throw new Error('Choose an installed item to remove.');
    if (inventoryUsed(this.state) >= this.state.inventoryCapacity) throw new Error('Inventory is full, including reserved pack cards. Scrap, merge or expand first.');
    r.slots[index] = null; this.save();
  }
  async claim() {
    this.advance();
    if (this.state.unclaimed <= 0) throw new Error('Nothing to claim yet. Mining settles at the next epoch.');
    this.state.tokens += this.state.unclaimed; this.state.unclaimed = 0; this.save();
  }
  async withdraw(amount: number) {
    this.advance();
    if (!finite(amount) || amount <= 0) throw new Error('Enter a withdrawal amount greater than zero.');
    if (amount > this.state.tokens) throw new Error('This withdrawal exceeds your available DEMO balance.');
    const preview = withdrawPreview(this.state, amount);
    this.state.tokens -= amount; this.state.withdrawn += preview.net; this.state.rewardPoolTokens += preview.tax;
    this.save();
  }
  async repair(roomId: number) {
    this.advance(); const items = roomItems(this.state, this.getRoom(roomId));
    if (!items.some(i => i.durability < config.mining.maximumDurability)) throw new Error('No repair needed. This room’s items have full durability.');
    this.spend(COSTS.repair); items.forEach(i => { i.durability = config.mining.maximumDurability; }); this.save();
  }
  async overclock(roomId: number) {
    this.advance(); const r = this.getRoom(roomId);
    if (r.overclock >= config.overclock.maximum) throw new Error(`This room is already at overclock level ${config.overclock.maximum}.`);
    if (!roomItems(this.state, r).some(i => i.durability > 0)) throw new Error('Install a working item before overclocking this room.');
    this.spend(overclockCost(r)); r.overclock++; this.save();
  }
  async merge(itemIds: string[]): Promise<Item> {
    this.advance();
    if (itemIds.length !== config.inventory.mergeCount || new Set(itemIds).size !== config.inventory.mergeCount) throw new Error('Choose three different, matching spare items to merge.');
    const equipped = equippedIds(this.state); const items = itemIds.map(id => findItem(this.state, id));
    if (items.some(i => !i || equipped.has(i.id))) throw new Error('Only spare inventory items can be merged.');
    const first = items[0]!;
    if (items.some(i => i!.type !== first.type || i!.rarity !== first.rarity) || first.rarity === 'Mythic') throw new Error('Merge three items of the same type and rarity, below Mythic.');
    this.spend(COSTS.merge);
    const upgraded: Item = { id: `item-${this.state.nextId++}`, type: first.type, rarity: RARITIES[RARITIES.indexOf(first.rarity) + 1], durability: config.mining.maximumDurability };
    this.state.inventory = [...this.state.inventory.filter(i => !itemIds.includes(i.id)), upgraded];
    this.save(); return copy(upgraded);
  }
  async scrap(itemId: string) {
    this.advance(); const item = findItem(this.state, itemId);
    if (!item || equippedIds(this.state).has(itemId)) throw new Error('Choose a spare inventory item to scrap.');
    this.state.inventory = this.state.inventory.filter(i => i.id !== itemId); this.state.tokens += config.rarity[item.rarity].scrap; this.save();
  }
  async expandInventory() { this.advance(); this.spend(config.inventory.expansionCost); this.state.inventoryCapacity += config.inventory.expansionSlots; this.save(); }
  async lobby() { this.advance(); if (this.state.lobbied) throw new Error('Your district is already lobbied for the next event.'); this.spend(COSTS.lobby); this.state.lobbied = true; this.save(); }
  async selectDistrict(id: number) {
    this.advance();
    if (!integer(id) || id >= config.city.districts.length) throw new Error('Choose one of the eight districts.');
    if (this.state.lobbied) throw new Error('Wait for the next dispatch before moving a lobbied farm.');
    this.state.district = id; this.save();
  }
  async claimNftStarter() {
    this.advance();
    if (this.state.nftStarterClaimed) throw new Error('This demo farm has already claimed its NFT holder starter pack.');
    this.state.nftStarterClaimed = true; this.state.freePacks += config.nft.starterPacks; this.save();
  }
  private settleDemoEpoch() {
    // Fold elapsed wall time into the quote, then fast-forward only the rest of this
    // epoch. Anchoring at real now prevents subsequent polling from counting it again.
    const remainingEpoch = Math.max(0, this.state.nextEventAt - this.state.updatedAt) / this.interval;
    this.state.market.lastPriceEth = Math.max(config.packs.floorEth, packPrice(this.state) - remainingEpoch * config.packs.quietDecayPerEpoch);
    this.state.market.lastDemandAt = this.state.updatedAt;
    this.runEpoch(this.state.updatedAt);
    this.state.nextEventAt = this.state.updatedAt + this.interval;
  }
  async nextEpoch() {
    this.advance(); this.settleDemoEpoch(); this.save();
  }
  async advanceDay() {
    this.advance(); for (let n = 0; n < epochsPerDay(); n++) this.settleDemoEpoch(); this.save();
  }
  async claimSeasonRewards() {
    this.advance(); const s = this.state.season;
    if (s.pendingTokens <= 0 && s.pendingFreePacks <= 0) throw new Error('No season rewards are waiting. Keep mining until the season settles.');
    this.state.tokens += s.pendingTokens; this.state.freePacks += s.pendingFreePacks; s.pendingTokens = 0; s.pendingFreePacks = 0; this.save();
  }
  async captureReferral(code: string) {
    this.advance();
    if (!/^[a-zA-Z0-9-]{1,32}$/.test(code)) throw new Error('Referral codes use 1–32 letters, numbers or dashes.');
    if (code === this.state.referral.code) throw new Error('This is your own referral link. Share it with another player.');
    if (this.state.referral.referredBy && this.state.referral.referredBy !== code) throw new Error('This demo farm already has a referring player.');
    this.state.referral.referredBy = code; this.save();
  }
  async simulateInviteeEpoch() {
    this.advance(); const r = this.state.referral;
    if (r.invitees === 0) r.invitees = 1;
    const mining = config.referral.demoInviteeMiningPerEpoch; const reward = mining * config.referral.miningShare;
    r.inviteeMining += mining; r.earned += reward; this.state.unclaimed += reward; this.save();
  }
  async refillDemoFunds() { this.advance(); this.state.tokens += config.demo.startingTokens; this.state.ethBalance += config.demo.startingEth; this.save(); }
  async reset() { this.state = this.initial(); this.save(); }
}
