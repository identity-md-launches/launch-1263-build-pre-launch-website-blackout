import type { GameAdapter } from './game/types';

/** Mode-specific claims live at the UI boundary, independent of the adapter implementation. */
export function presentationFor(mode: GameAdapter['mode']) {
  const demo = mode === 'demo';
  return {
    demo,
    canReset: demo,
    modeLabel: demo ? 'Demo mode' : 'Chain mode',
    navLabel: demo ? 'Demo lab' : 'Pack lab',
    badge: demo ? 'DEMO' : 'ON-CHAIN',
    currency: demo ? 'DEMO' : 'tokens',
    openPack: demo ? 'Open demo pack' : 'Open pack',
    openPackInvitation: demo ? 'Open a demo pack' : 'Open a pack',
    packDescription: demo ? 'Open a demo pack to reveal three hardware cards.' : 'Open a pack to reveal three hardware cards.',
    packTerms: demo ? 'Free & unlimited in demo' : 'Pack availability is confirmed on-chain',
    inventoryNote: demo ? '3 items · Added to your demo inventory' : '3 items · Added to your inventory',
    emptyInventory: demo ? 'Open another free demo pack.' : 'Open a pack to find more hardware.',
    heroDisclosure: demo ? 'No wallet or real money is used in this demo.' : 'Items and tokens are tracked on Robinhood Chain.',
    storageDisclosure: demo ? 'This city is a simulation. All items and tokens stay in your browser.' : 'Your farm is stored on Robinhood Chain. Actions may require confirmation.',
    claim: demo ? 'Claim demo tokens' : 'Claim tokens',
    claimed: demo ? 'Mined DEMO tokens added to your balance.' : 'Mined tokens added to your balance.',
    upkeepTitle: demo ? 'Hardware specs & demo upkeep' : 'Hardware specs & upkeep',
    upkeepNote: demo ? 'Repairs, electricity, overclocking, merging and lobbying spend DEMO tokens.' : 'Repairs, electricity, overclocking, merging and lobbying spend game tokens.',
    gridFairness: demo
      ? 'At launch, the IMD swarm will choose the event type. A future block hash will choose the district, so neither the swarm nor players can target anyone. This is the planned contract design; contracts are not deployed. The demo simulates it with seeded randomness.'
      : 'The IMD swarm chooses the event type. A future block hash chooses the district, so neither the swarm nor players can target anyone.',
    valueDisclosure: demo ? 'This demo uses no real money; DEMO tokens have no real value.' : 'Game tokens are used for mining and upkeep.',
    footerDisclosure: demo ? 'Contracts are not deployed. No wallet, no trackers, no real transactions.' : 'Farm state and actions are recorded on Robinhood Chain. No trackers.',
    updateError: demo ? 'Unable to update the demo. Reload to try again.' : 'Unable to update your farm. Check your connection and reload to try again.'
  };
}
