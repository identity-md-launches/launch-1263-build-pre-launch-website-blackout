import { config } from '../config';
import { activeEvent, COSTS, equippedIds, EVENT_LABELS, EXTRA_SLOTS, findItem, nextRandom, rollRarity, rollType, slotsFor, totalHashrate } from './rules';
import { ITEM_TYPES, RARITIES } from './types';
import type { GameAdapter, GameState, GridEvent, Item, Letter, Pack, Room, Slot } from './types';

export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
interface Options { storage?: StorageLike; now?: () => number; seed?: number; eventIntervalMs?: number }
const room = (id: number): Room => ({ id, gpu: [null, null], cooling: null, psu: null, overclock: 0 });
const copy = <T>(value: T): T => structuredClone(value);
const MAX_OFFLINE_MS = 2 * 60 * 60 * 1000;
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const validItem = (i: Item) => i && /^item-\d+$/.test(i.id) && ITEM_TYPES.includes(i.type) && RARITIES.includes(i.rarity) && finite(i.durability) && i.durability >= 0 && i.durability <= 100;

/** Validate browser data before it can enter the simulation or rendered UI. */
function validState(s: GameState): boolean {
  try {
    if (s.version !== 1 || !Number.isInteger(s.rng) || s.rng <= 0 || !Number.isInteger(s.nextId) || s.nextId < 2) return false;
    if (![s.updatedAt, s.nextEventAt, s.tokens, s.unclaimed, s.electricity, s.totalPacks].every(finite)) return false;
    if (s.tokens < 0 || s.unclaimed < 0 || s.electricity < 0 || s.electricity > 100 || s.nextEventAt < s.updatedAt) return false;
    if (!Array.isArray(s.inventory) || s.inventory.length > 240 || !s.inventory.every(validItem)) return false;
    if (new Set(s.inventory.map(i => i.id)).size !== s.inventory.length) return false;
    if (s.district !== 3 || typeof s.lobbied !== 'boolean' || !Array.isArray(s.rooms) || s.rooms.length < 1 || s.rooms.length > 2) return false;
    const ids: string[] = [];
    for (const [index, r] of s.rooms.entries()) {
      if (r.id !== index || !Number.isInteger(r.overclock) || r.overclock < 0 || r.overclock > 3) return false;
      if (!Array.isArray(r.gpu) || r.gpu.length !== slotsFor(s, r)) return false;
      for (const [type, values] of [['GPU', r.gpu], ['Cooling', [r.cooling]], ['PSU', [r.psu]]] as const) {
        for (const id of values) {
          if (id !== null && findItem(s, id)?.type !== type) return false;
          if (id) ids.push(id);
        }
      }
    }
    if (new Set(ids).size !== ids.length) return false;
    if (!Array.isArray(s.events) || s.events.length > 30 || !s.events.every(e => e && e.type in EVENT_LABELS && Number.isInteger(e.id) && Number.isInteger(e.district) && e.district >= 0 && e.district < 8 && finite(e.at) && finite(e.expiresAt))) return false;
    if (!Array.isArray(s.letters) || s.letters.length > 30 || !s.letters.every(l => l && Number.isInteger(l.id) && typeof l.title === 'string' && typeof l.body === 'string' && finite(l.at))) return false;
    const p = s.pendingPack;
    if (p !== null && (!p || !/^pack-\d+$/.test(p.id) || !Array.isArray(p.cards) || p.cards.length !== 3 || !p.cards.every(validItem) || !Array.isArray(p.revealed) || p.revealed.length !== 3 || !p.revealed.every(v => typeof v === 'boolean'))) return false;
    if (p && (new Set(p.cards.map(i => i.id)).size !== 3 || p.cards.some((i, n) => !p.revealed[n] && s.inventory.some(v => v.id === i.id)))) return false;
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

  constructor(options: Options = {}) {
    this.storage = options.storage;
    this.now = options.now ?? Date.now;
    this.interval = Math.max(1000, options.eventIntervalMs ?? config.demo.eventIntervalMs);
    this.seed = (options.seed ?? config.demo.seed) >>> 0 || config.demo.seed;
    this.state = this.initial();
    if (!this.storage) this.state.storageWarning = 'Browser storage is unavailable. You can play, but progress will not survive a reload.';
    try {
      const saved = this.storage?.getItem(config.demo.storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as GameState;
          if (validState(parsed)) this.state = { ...parsed, storageWarning: '' };
          else this.state.storageWarning = 'Your saved demo could not be read. A fresh demo is ready.';
        } catch { this.state.storageWarning = 'Your saved demo could not be read. A fresh demo is ready.'; }
      }
    } catch { this.state.storageWarning = 'Browser storage is unavailable. You can play, but progress may not survive a reload.'; }
    this.advance();
    this.save();
  }

  private initial(): GameState {
    const at = this.now();
    return { version: 1, rng: this.seed, nextId: 2, updatedAt: at, nextEventAt: at + this.interval,
      tokens: 150, unclaimed: 0, electricity: 100, inventory: [{ id: 'item-1', type: 'GPU', rarity: 'Common', durability: 100 }],
      rooms: [room(0)], district: 3, lobbied: false, pendingPack: null, events: [], totalPacks: 0,
      letters: [{ id: 0, title: 'Connection established', body: 'Resident 04. Your meter is registered. A starter GPU is in your inventory. Install it. We prefer productive tenants. — IMD Grid Dispatch', at }], storageWarning: '' };
  }
  private save() {
    try { this.storage?.setItem(config.demo.storageKey, JSON.stringify(this.state)); }
    catch { this.state.storageWarning = 'Progress could not be saved. Free browser storage or keep this tab open.'; }
  }
  private random(): number {
    const [value, next] = nextRandom(this.state.rng); this.state.rng = next; return value;
  }
  private spend(amount: number) {
    if (this.state.tokens + 1e-9 < amount) throw new Error(`You need ${amount} DEMO tokens. Claim your mined tokens or keep mining.`);
    this.state.tokens -= amount;
  }
  private getRoom(id: number): Room {
    const r = this.state.rooms.find(r => r.id === id);
    if (!r) throw new Error('Unlock this room with a Room key first.');
    return r;
  }
  private simulate(seconds: number) {
    const event = activeEvent(this.state);
    if (event?.type === 'blackout' && event.district === this.state.district) return;
    const installed = this.state.rooms.flatMap(r => r.gpu.filter((id): id is string => !!id).map(id => ({ item: findItem(this.state, id)!, level: r.overclock })));
    const draw = installed.reduce((n, v) => n + .012 * (1 + .5 * v.level), 0);
    const runtime = draw ? Math.min(seconds, this.state.electricity / draw) : 0;
    const before = totalHashrate(this.state);
    for (const v of installed) v.item.durability = Math.max(0, v.item.durability - runtime * .006 * (1 + v.level));
    const after = totalHashrate(this.state);
    this.state.unclaimed = Math.min(Number.MAX_SAFE_INTEGER, this.state.unclaimed + ((before + after) / 2) * runtime / 100);
    this.state.electricity = Math.max(0, this.state.electricity - draw * runtime);
  }
  private advance() {
    const now = this.now();
    if (now <= this.state.updatedAt) return;
    const until = Math.min(now, this.state.updatedAt + MAX_OFFLINE_MS);
    while (this.state.updatedAt < until) {
      const expiry = activeEvent(this.state)?.expiresAt ?? Infinity;
      const boundary = Math.min(until, this.state.nextEventAt, expiry);
      this.simulate((boundary - this.state.updatedAt) / 1000);
      this.state.updatedAt = boundary;
      if (boundary === this.state.nextEventAt) {
        this.dispatch(boundary);
        this.state.nextEventAt += this.interval;
      }
    }
    if (now > until) {
      this.state.updatedAt = now;
      this.state.nextEventAt = now + this.interval;
    }
  }
  private dispatch(at: number) {
    const types: GridEvent['type'][] = ['surge', 'heat', 'blackout', 'audit', 'calm'];
    const type = types[Math.floor(this.random() * types.length)];
    const harmful = type === 'heat' || type === 'blackout' || type === 'audit';
    const protectedDistrict = this.state.lobbied && harmful;
    const weights = Array.from({ length: 8 }, (_, n) => protectedDistrict && n === this.state.district ? .5 : 1);
    let roll = this.random() * weights.reduce((a, b) => a + b, 0);
    let district = 7;
    for (let i = 0; i < weights.length; i++) { roll -= weights[i]; if (roll < 0) { district = i; break; } }
    const id = (this.state.events[0]?.id ?? 0) + 1;
    const event: GridEvent = { id, type, district, at, expiresAt: at + Math.min(20_000, this.interval), lobbied: this.state.lobbied };
    const bodies = {
      surge: 'Surplus power routed. A 50% hashrate boost is authorized for 20 seconds. Gratitude is not a metered resource.',
      heat: 'Ambient temperature exceeds specifications. Farms without Rare or better cooling run at half speed for 20 seconds. Sweat is not a coolant.',
      blackout: 'Power suspended for 20 seconds. Mining is paused in the affected district. Please enjoy the absence of fan noise.',
      audit: 'A 10 DEMO token levy has been collected where available. This inspection was entirely routine. They all are.',
      calm: 'All readings within tolerance. No intervention required. Do not mistake this for a promise.'
    };
    const body = `District ${String(district + 1).padStart(2, '0')}. ${bodies[type]}${event.lobbied ? ' Your lobbying request has been processed; outcomes remain uncertain.' : ''} — IMD Grid Dispatch`;
    if (type === 'audit' && district === this.state.district) this.state.tokens = Math.max(0, this.state.tokens - 10);
    this.state.lobbied = false;
    this.state.events.unshift(event); this.state.events = this.state.events.slice(0, 30);
    this.state.letters.unshift({ id, title: EVENT_LABELS[type], body, at }); this.state.letters = this.state.letters.slice(0, 30);
  }
  async getFarm(): Promise<GameState> { this.advance(); this.save(); return copy(this.state); }
  async getGridEvents(): Promise<GridEvent[]> { this.advance(); this.save(); return copy(this.state.events); }
  async getLetters(): Promise<Letter[]> { this.advance(); this.save(); return copy(this.state.letters); }
  async openPack(): Promise<Pack> {
    this.advance();
    if (this.state.pendingPack && !this.state.pendingPack.revealed.every(Boolean)) return copy(this.state.pendingPack);
    if (this.state.inventory.length > 237) throw new Error('Inventory is full. Merge three matching spare items to make space.');
    const cards = Array.from({ length: 3 }, (): Item => ({ id: `item-${this.state.nextId++}`, rarity: rollRarity(this.random()), type: rollType(this.random()), durability: 100 }));
    this.state.totalPacks++;
    this.state.pendingPack = { id: `pack-${this.state.totalPacks}`, cards, revealed: [false, false, false] };
    this.save(); return copy(this.state.pendingPack);
  }
  async reveal(packId: string, index: number): Promise<Item> {
    const p = this.state.pendingPack;
    if (!p || p.id !== packId || !Number.isInteger(index) || index < 0 || index > 2) throw new Error('This card is no longer available. Open another demo pack.');
    if (!p.revealed[index]) { this.state.inventory.push(copy(p.cards[index])); p.revealed[index] = true; this.save(); }
    return copy(p.cards[index]);
  }
  async place(itemId: string, roomId: number, slot: Slot, index = 0) {
    this.advance();
    const item = findItem(this.state, itemId);
    if (!item) throw new Error('Choose an item from your inventory first.');
    if (equippedIds(this.state).has(itemId)) throw new Error('This item is installed. Remove it before moving it.');
    if (slot === 'room') {
      if (item.type !== 'Room') throw new Error('A Room key is needed to unlock room 02.');
      if (this.state.rooms.length === 2) throw new Error('Both rooms are already unlocked.');
      this.state.rooms.push(room(1)); this.state.inventory = this.state.inventory.filter(i => i.id !== itemId);
      // Clear completed pack receipts when a revealed item is consumed.
      if (this.state.pendingPack?.revealed.every(Boolean)) this.state.pendingPack = null;
      this.save(); return;
    }
    const r = this.getRoom(roomId);
    const expected = { gpu: 'GPU', cooling: 'Cooling', psu: 'PSU' }[slot];
    if (item.type !== expected) throw new Error(`Choose a ${expected === 'PSU' ? 'Power supply' : expected} item for this slot.`);
    if (slot === 'gpu') {
      if (!Number.isInteger(index) || index < 0 || index >= slotsFor(this.state, r)) throw new Error('Install a Power supply to unlock more GPU slots.');
      if (r.gpu[index]) throw new Error('Remove the installed GPU before replacing it.');
      r.gpu[index] = itemId;
    } else if (slot === 'psu') {
      const count = 2 + EXTRA_SLOTS[item.rarity];
      if (r.gpu.slice(count).some(Boolean)) throw new Error('Remove GPUs from the extra slots before reducing the power supply.');
      r.psu = itemId; r.gpu = Array.from({ length: count }, (_, i) => r.gpu[i] ?? null);
    } else r.cooling = itemId;
    this.save();
  }
  async unplace(roomId: number, slot: Exclude<Slot, 'room'>, index = 0) {
    this.advance(); const r = this.getRoom(roomId);
    if (slot === 'gpu') {
      if (!Number.isInteger(index) || index < 0 || index >= r.gpu.length) throw new Error('Choose an available GPU slot.');
      r.gpu[index] = null;
    } else if (slot === 'psu') {
      if (r.gpu.slice(2).some(Boolean)) throw new Error('Remove GPUs from the extra slots before removing the power supply.');
      r.psu = null; r.gpu = r.gpu.slice(0, 2);
    } else r.cooling = null;
    this.save();
  }
  async claim() { this.advance(); this.state.tokens += this.state.unclaimed; this.state.unclaimed = 0; this.save(); }
  async repair(roomId: number) {
    this.advance(); const r = this.getRoom(roomId);
    const items = r.gpu.map(id => findItem(this.state, id)).filter((i): i is Item => !!i);
    if (!items.some(i => i.durability < 100)) throw new Error('No repair needed. Installed GPUs are at full durability.');
    this.spend(COSTS.repair); items.forEach(i => { i.durability = 100; }); this.save();
  }
  async overclock(roomId: number) {
    this.advance(); const r = this.getRoom(roomId);
    if (r.overclock >= 3) throw new Error('This room is already at overclock level 3.');
    if (!r.gpu.some(Boolean)) throw new Error('Install a GPU before overclocking this room.');
    this.spend(COSTS.overclock * (r.overclock + 1)); r.overclock++; this.save();
  }
  async merge(itemIds: string[]): Promise<Item> {
    this.advance();
    if (itemIds.length !== 3 || new Set(itemIds).size !== 3) throw new Error('Choose three different, matching spare items to merge.');
    const equipped = equippedIds(this.state);
    const items = itemIds.map(id => findItem(this.state, id));
    if (items.some(i => !i || equipped.has(i.id))) throw new Error('Only spare inventory items can be merged.');
    const first = items[0]!;
    if (items.some(i => i!.type !== first.type || i!.rarity !== first.rarity) || first.rarity === 'Legendary') throw new Error('Merge three items of the same type and rarity, below Legendary.');
    this.spend(COSTS.merge);
    const upgraded: Item = { id: `item-${this.state.nextId++}`, type: first.type, rarity: RARITIES[RARITIES.indexOf(first.rarity) + 1], durability: 100 };
    this.state.inventory = [...this.state.inventory.filter(i => !itemIds.includes(i.id)), upgraded];
    if (this.state.pendingPack?.revealed.every(Boolean)) this.state.pendingPack = null;
    this.save(); return copy(upgraded);
  }
  async lobby() { this.advance(); if (this.state.lobbied) throw new Error('Your district is already lobbied for the next event.'); this.spend(COSTS.lobby); this.state.lobbied = true; this.save(); }
  async payElectricity() { this.advance(); if (this.state.electricity >= 100) throw new Error('Your electricity meter is already full.'); this.spend(COSTS.electricity); this.state.electricity = 100; this.save(); }
  async reset() { this.state = this.initial(); this.save(); }
}
