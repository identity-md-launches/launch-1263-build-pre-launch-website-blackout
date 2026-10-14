import { defineChain } from 'viem';
export const SITE_LABEL = 'blackout-mine-the-city-pray-the';
export const RPC = 'https://rpc.mainnet.chain.robinhood.com';
export const RPC_URLS = [RPC, 'https://robinhood.drpc.org', 'https://robinhood-rpc.publicnode.com'] as const;
export const POLL_MS = 15000;
export const EXPLORER = 'https://robinhoodchain.blockscout.com';
export const chain = defineChain({ id: 4663, name: 'Robinhood Chain', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [...RPC_URLS] } }, blockExplorers: { default: { name: 'Blockscout', url: EXPLORER } } });
export const contracts = {
  GameRegistry: '0x1b41fc9723df25eec7e91d947072dccc2483285f',
  Token: '0x38b05971c79e738f64452be83c78ec3d66535b7a',
  V4Market: '0x3c9599670893546a3def98608259a8e6582790cc',
  SwarmDesk: '0x5cb0686a4475d1f8a6c6e5240579080a4a05b609',
  RewardPool: '0x90e138670b28a1f7c2d4ff6f6c25423e1b6f9b9d',
  FarmRewards: '0x83c9afdf145ea32f1b6cda1c88150b6af9553237',
  FarmCore: '0x40499cca542b3cd2db0287fa0b6da87002f042e8',
  FarmItems: '0xdda6387bf0244fc82eb3dbda168acc4d9eed56a3',
  PackSale: '0xf28d8d409e471f7ceff7a029dcc56328e167c3d5',
  StarterClaim: '0xcda5653467843137aadb2729151e5e8042a49b13',
  FeeRouter: '0x67812d353b9d957fbe8011d986669f53c239593d',
  GridOperator: '0x11c0970644d6f3e7ad2a03c142adb8105a2fffe4',
  Season: '0x384f20703cee82da2ee55a2b98a095d21b1e959b',
  FarmEngine: '0x9d8cd4a606f8c14f8bd93e612fa0f2b9efc6d83a',
  Economy: '0xaeb15271068c42cee1887001aae2039a1d3226af',
  Enhancement: '0x59268939b3bb2b6c9b1a88c474401b9db3702394',
  Civic: '0x387e0cb61d5fb99916631c6a9f70f6a657f23ad0',
  Billboards: '0x223cb0939293ca684955e6d1487b2fdd585dd3b4',
} as const;
export type ContractName = keyof typeof contracts;
export const roles = ['RewardPool','FarmRewards','FarmCore','FarmItems','PackSale','StarterClaim','FeeRouter','GridOperator','Season','FarmEngine','Economy','Enhancement','Civic','Billboards'] as const;
export const ROOTS = { starter: '0xb7d282d1c46f6062963bf2d134d058aa4de3af4cb7b092c5a0fd12ed74dc0f2c', free: '0xdc0842e9fd0017b08be09e787e877c53cfb446ca52aabdb9770e5c33b49d1325' } as const;
export const COLLECTION = '0x0000ec93127baa929e58e97dd0095a2bfb38ec1d';
export const SNAPSHOT_BLOCK = 26182375;
export const SOURCE_COMMIT = '77c962e6fce9652ee93dff2037b1a09e7a66bd04';
export const pool = { fee: 12500, tickSpacing: 60, buyPriceLimit: 4295128740n } as const;
export const features = [
  { id: 0, name: 'District war', art: 'Surge Protector', rarity: 'Epic', route: 'city' },
  { id: 1, name: 'Grid collapse', art: 'Power Supply', rarity: 'Rare', route: 'city' },
  { id: 2, name: 'Weekly lots', art: 'ASIC', rarity: 'Legendary', route: 'season' },
  { id: 3, name: 'Enhancement', art: 'GPU', rarity: 'Epic', route: 'farm' },
  { id: 4, name: 'District stakes', art: 'Battery', rarity: 'Rare', route: 'city' },
  { id: 5, name: 'Billboards', art: 'Router', rarity: 'Legendary', route: 'billboards' },
  { id: 6, name: 'Season pot', art: 'Server Rack', rarity: 'Epic', route: 'season' },
  { id: 7, name: 'Reserved events', art: 'Fan', rarity: 'Rare', route: 'city' },
] as const;
