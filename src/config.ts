export const config = {
  siteLabel: 'blackout',
  launchDate: '', // ISO 8601 timestamp with a timezone; empty means Date TBA.
  xUrl: 'https://x.com/IMDBlackout',
  chainId: 4663,
  contracts: { token: '', packs: '', farm: '', grid: '' },
  demo: { eventIntervalMs: 45_000, storageKey: 'blackout.demo.v1', seed: 0xb1ac007 }
} as const;
