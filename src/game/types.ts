export const RARITIES = ['Common', 'Rare', 'Epic', 'Legendary'] as const;
export const ITEM_TYPES = ['GPU', 'Cooling', 'PSU', 'Room'] as const;
export type Rarity = typeof RARITIES[number];
export type ItemType = typeof ITEM_TYPES[number];
export type EventType = 'surge' | 'heat' | 'blackout' | 'audit' | 'calm';
export interface Item { id: string; type: ItemType; rarity: Rarity; durability: number }
export interface Room { id: number; gpu: (string | null)[]; cooling: string | null; psu: string | null; overclock: number }
export interface Pack { id: string; cards: Item[]; revealed: boolean[] }
export interface GridEvent { id: number; type: EventType; district: number; at: number; expiresAt: number; lobbied: boolean }
export interface Letter { id: number; title: string; body: string; at: number }
export interface GameState {
  version: 1; rng: number; nextId: number; updatedAt: number; nextEventAt: number;
  tokens: number; unclaimed: number; electricity: number; inventory: Item[];
  rooms: Room[]; district: number; lobbied: boolean; pendingPack: Pack | null;
  events: GridEvent[]; letters: Letter[]; totalPacks: number; storageWarning: string;
}
export type Slot = 'gpu' | 'cooling' | 'psu' | 'room';
/** UI boundary. A future ChainAdapter implements this contract and maps chain state here. */
export interface GameAdapter {
  readonly mode: 'demo' | 'chain';
  openPack(): Promise<Pack>;
  reveal(packId: string, card: number): Promise<Item>;
  getFarm(): Promise<GameState>;
  place(itemId: string, roomId: number, slot: Slot, index?: number): Promise<void>;
  unplace(roomId: number, slot: Exclude<Slot, 'room'>, index?: number): Promise<void>;
  claim(): Promise<void>;
  repair(roomId: number): Promise<void>;
  overclock(roomId: number): Promise<void>;
  merge(itemIds: string[]): Promise<Item>;
  lobby(): Promise<void>;
  getGridEvents(): Promise<GridEvent[]>;
  getLetters(): Promise<Letter[]>;
  payElectricity(): Promise<void>;
  reset(): Promise<void>;
}
