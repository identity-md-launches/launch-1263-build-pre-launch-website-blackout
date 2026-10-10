import { RARITIES } from './types';
import type { GameState, Item, ItemType, Rarity, Room } from './types';

export const HASHRATE: Record<Rarity, number> = { Common: 10, Rare: 28, Epic: 80, Legendary: 250 };
export const COOLING: Record<Rarity, number> = { Common: .02, Rare: .05, Epic: .1, Legendary: .2 };
export const EXTRA_SLOTS: Record<Rarity, number> = { Common: 1, Rare: 2, Epic: 3, Legendary: 4 };
export const DISTRICTS = ['Neon Row', 'Copper Yard', 'Stack Heights', 'Your district', 'Old Circuit', 'Ghost Market', 'Relay Point', 'The Fringe'];
export const EVENT_LABELS = { surge: 'Bonus surge', heat: 'Heat wave', blackout: 'Blackout', audit: 'Tax audit', calm: 'Calm' };
export const COSTS = { repair: 12, electricity: 15, overclock: 25, merge: 20, lobby: 10 };
export const itemName = (item: Pick<Item, 'type' | 'rarity'>): string => ({ GPU: 'GPU', Cooling: 'Cooling unit', PSU: 'Power supply', Room: 'Room key' })[item.type];
export const itemDetail = (item: Pick<Item, 'type' | 'rarity'>): string => ({ GPU: `${HASHRATE[item.rarity]} H/s`, Cooling: `+${Math.round(COOLING[item.rarity] * 100)}% hashrate`, PSU: `+${EXTRA_SLOTS[item.rarity]} GPU slots`, Room: 'Unlock room 02' })[item.type];
export function nextRandom(seed: number): [number, number] {
  let x = seed >>> 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return [(x >>> 0) / 4294967296, x >>> 0];
}
export const rollRarity = (n: number): Rarity => n < .70 ? 'Common' : n < .92 ? 'Rare' : n < .99 ? 'Epic' : 'Legendary';
export const rollType = (n: number): ItemType => n < .60 ? 'GPU' : n < .80 ? 'Cooling' : n < .92 ? 'PSU' : 'Room';
export const findItem = (state: GameState, id: string | null) => state.inventory.find(i => i.id === id);
export const slotsFor = (state: GameState, room: Room) => 2 + (findItem(state, room.psu) ? EXTRA_SLOTS[findItem(state, room.psu)!.rarity] : 0);
export const equippedIds = (state: GameState) => new Set(state.rooms.flatMap(r => [...r.gpu, r.cooling, r.psu].filter((id): id is string => !!id)));
export const activeEvent = (state: GameState) => state.events.find(e => e.expiresAt > state.updatedAt);
export function roomHashrate(state: GameState, room: Room): number {
  if (state.electricity <= 0) return 0;
  const cooling = findItem(state, room.cooling);
  const base = room.gpu.reduce((sum, id) => {
    const item = findItem(state, id);
    return sum + (item ? HASHRATE[item.rarity] * (item.durability / 100) : 0);
  }, 0);
  let rate = base * (1 + (cooling ? COOLING[cooling.rarity] : 0)) * (1 + .25 * room.overclock);
  const event = activeEvent(state);
  if (event?.district === state.district) {
    if (event.type === 'blackout') rate = 0;
    if (event.type === 'surge') rate *= 1.5;
    if (event.type === 'heat' && (!cooling || RARITIES.indexOf(cooling.rarity) < 1)) rate *= .5;
  }
  return rate;
}
export const totalHashrate = (state: GameState) => state.rooms.reduce((sum, r) => sum + roomHashrate(state, r), 0);
