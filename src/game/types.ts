export const RARITIES = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'] as const;
export const ITEM_TYPES = ['GPU', 'ASIC', 'FPGA', 'Power Supply', 'Battery', 'Solar Panel', 'Fan', 'Liquid Cooling', 'Router', 'Motherboard', 'Server Rack', 'Surge Protector'] as const;
export type Rarity = typeof RARITIES[number];
export type ItemType = typeof ITEM_TYPES[number];
export type ItemTag = 'compute' | 'power' | 'cooling' | 'network' | 'infra';
export type EventType = 'outage' | 'surge' | 'fire' | 'theft' | 'audit' | 'green' | 'cheap' | 'calm' | 'supply';
export type PackCurrency = 'eth' | 'tokens' | 'free';
export interface Item { id: string; type: ItemType; rarity: Rarity; durability: number }
export interface Room { id: number; slots: (string | null)[]; overclock: number }
export interface Pack { id: string; cards: Item[]; revealed: boolean[]; currency: PackCurrency; price: number }
export interface GridEvent { id: number; type: EventType; district: number; at: number; expiresAt: number; lobbied: boolean; protection: string }
export interface Letter { id: number; title: string; body: string; at: number }
export interface Combo {
  id: string; name: string; active: boolean; bonus: number; description: string; missing: string[];
}
export interface RoomUnlock { id: number; unlocked: boolean; requirement: string }
export interface ReferralState { code: string; referredBy: string; invitees: number; inviteeMining: number; earned: number }
export interface RivalFarm { id: number; district: number; score: number }
export interface SeasonState {
  number: number; endsAtEpoch: number; districtScores: number[]; farmScore: number; rivalFarms: RivalFarm[];
  pendingFreePacks: number; pendingTokens: number; lastResult: string;
}
export interface GameState {
  version: 3; rng: number; nextId: number; updatedAt: number; createdAt: number; nextEventAt: number;
  tokens: number; unclaimed: number; electricity: number; ethBalance: number;
  inventory: Item[]; inventoryCapacity: number; rooms: Room[];
  district: number; lobbied: boolean; pendingPack: Pack | null;
  events: GridEvent[]; letters: Letter[]; totalPacks: number; storageWarning: string;
  xp: number; level: number; epoch: number; gameDays: number; withdrawn: number; totalMined: number;
  totalSpent: number; rewardPoolTokens: number; freePacks: number; nftStarterClaimed: boolean;
  referral: ReferralState; season: SeasonState; lastEpochReward: number;
  market: { lastPriceEth: number; lastDemandAt: number; packsThisEpoch: number };
}
/** This UI boundary is implemented by DemoAdapter today and a future ChainAdapter. */
export interface GameAdapter {
  readonly mode: 'demo' | 'chain';
  openPack(currency?: PackCurrency): Promise<Pack>;
  reveal(packId: string, card: number): Promise<Item>;
  getFarm(): Promise<GameState>;
  place(itemId: string, roomId: number, index?: number): Promise<void>;
  unplace(roomId: number, index: number): Promise<void>;
  claim(): Promise<void>;
  withdraw(amount: number): Promise<void>;
  repair(roomId: number): Promise<void>;
  overclock(roomId: number): Promise<void>;
  merge(itemIds: string[]): Promise<Item>;
  scrap(itemId: string): Promise<void>;
  expandInventory(): Promise<void>;
  lobby(): Promise<void>;
  selectDistrict(id: number): Promise<void>;
  getGridEvents(): Promise<GridEvent[]>;
  getLetters(): Promise<Letter[]>;
  payElectricity(): Promise<void>;
  claimNftStarter(): Promise<void>;
  nextEpoch(): Promise<void>;
  advanceDay(): Promise<void>;
  claimSeasonRewards(): Promise<void>;
  captureReferral(code: string): Promise<void>;
  simulateInviteeEpoch(): Promise<void>;
  refillDemoFunds(): Promise<void>;
  reset(): Promise<void>;
}
