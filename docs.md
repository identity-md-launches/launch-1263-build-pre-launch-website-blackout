# BLACKOUT field guide

BLACKOUT is live on Robinhood Chain (4663). Reading the city requires no wallet. Playing uses real BLACKOUT and ETH for gas. The full in-app guide is `#/docs`; contract addresses and explorer links are at `#/contracts`. The separate free-pack service remains https://playblackout.xyz/freepack.

## Start playing

1. Connect a browser wallet, or open the site in a phone wallet's own browser. Switch/add Robinhood Chain when prompted.
2. On Packs, buy hardware with BLACKOUT, buy atomically with ETH, or claim a verified starter entitlement. The sale's opening time and readiness are read from chain.
3. Capture/reveal the resulting receipt. Each pack contains three soulbound hardware items. Place them in a farm room and sync completed epochs to settle mining.

Contract funding and feature status are authoritative. At this revision's verification, the reward pool was not endowed, paid sales were not ready, epoch was zero and every Civic feature flag was false. The app reflects these values instead of substituting demo progress.

## Buying and launch

Use the ETH/BLACKOUT v4 pool: hook `0x3c9599670893546a3def98608259a8e6582790cc`, fee **12500 (1.25%)**, tick spacing **60**. Buys must be **exact input**, have a minimum output, and use **`sqrtPriceLimitX96 = 4295128740`**, the router default for this direction. Other limits revert `PriceLimitedBuy`; partial buys revert `PartialFill`. Express slippage tolerance through minimum output.

Normal buys pay the 1.25% pool fee plus a 1% rewards share. Sells pay a 1% hook share plus a surcharge capped at **15% total hook fees**, in addition to the pool fee. Initial buy taxes are 90% for 0–10 minutes, 50% for 10–20, 25% for 20–30, then 1%; launch tax goes to rewards. There is no max-buy limit. Pack opening starts one hour after launch, subject to readiness and the contract's bounded pause.

A token pack purchase first approves exactly the current quote, then calls `openPack`. A gift uses `buyPacksFor(recipient,count,maxCost)` and belongs to its recipient. An increased price beyond allowance/cost limits reverts. ETH purchases call `buyWithETH(recipient,count,minTokens,maxCost)` with the entered ETH value. The swap and pack purchase are atomic; excess BLACKOUT returns to the payer. The TWAP estimate does not guarantee execution.

## Receipts and randomness

The purchase or starter claim emits a receipt targeting a future native block. After that target, capture entropy within **256 native blocks** or resolve directly. Captured entropy has no expiry. An expired uncaptured receipt re-arms to a future target and remains claimable. The Reveal action uses the contract source's `ui/reveal.js` loop, and may require more than one signed transaction.

Native entropy blocks use `ArbSys.arbBlockNumber`, matching the deployed `ChainClock`. A paid receipt can reveal one pack at a time. Keep at least three free inventory spaces; capture remains possible while inventory is full. Stop waiting cancels further prompts, not a transaction already submitted. Pending receipts are recovered from chain events and can also be looked up by ID.

## Starter packs

Identity MD eligibility uses collection `0x0000ec93127baa929e58e97dd0095a2bfb38ec1d` on Ethereum, token IDs 0–1999 at block **26182375**. Use the wallet that held the NFT at that snapshot. A later transfer does not transfer the snapshot entitlement. The app shows that wallet's eligible IDs and calls `StarterClaim.claim(tokenId,proof)`.

NFT claims open at `launchTime() + 48 hours` and close at `launchTime() + 16 days`. The separate 11-wallet free allowlist calls `claimFree(index,proof)` until `freeClaimEnds()` (launch +30 days). Only listed wallets see that button. Both claim types create receipts to reveal.

The production build reconstructs snapshot ownership by reversing every later Transfer from captured latest-owner evidence. It verifies all proofs and refuses any root other than:

- NFT: `0xb7d282d1c46f6062963bf2d134d058aa4de3af4cb7b092c5a0fd12ed74dc0f2c`
- Free: `0xdc0842e9fd0017b08be09e787e877c53cfb446ca52aabdb9770e5c33b49d1325`

Leaves are single keccak256 hashes of ABI-encoded uint256/address pairs. Leaves and sibling pairs are sorted; an unpaired node is promoted. Proofs are shipped as static JSON and checked against live roots again in the browser.

## Rooms, hardware and rewards

Each room has six slots. Room 1 is free. Room 2 requires a three-day-old farm and costs two farm-yield days; room 3 requires level 7 and costs five days; room 4 requires level 10 and costs ten days. The app reads exact eligibility and quotes from the contracts. District, level, XP and inventory also come from chain.

Durability output tiers use the higher tier at each boundary: at least 80% health gives 100% output, 60% gives 85%, 40% gives 65%, 20% gives 40%, and below 20% gives zero. Repair restores durability using the current Economy quote. This app's repair and room purchases spend wallet tokens. Optional auto-repair spends pending mining credits instead.

Scrapping permanently destroys an unequipped item. The app shows the minimum expected payout, bounded by remaining scrap allowance. Payout enters pending credits and is taxed on withdrawal. Starter items require a paid pack before scrapping; items in an unsettled snapshot or pending enhancement may be locked.

Sync accounts for completed epochs and may need repeated transactions when a farm is far behind. Claim tax starts at 20% on fresh credits and decays to 5% over seven days. Credits are consumed oldest first. The app simulates the pending claim to show gross, estimated tax and net; the final amount is determined when the transaction executes. The reward pool, durability, grid events and other players affect earnings. No return is guaranteed.

## The city, seasons and future phases

City reads eight stability values, the current event, the next submitted plan, dispatcher letter text when present and the last letter hash. A hash alone is not letter content. Stability affects event odds, not immunity. Hardware combinations affect cooling, protection and output.

Civic flags are displayed on the home page. Disabled features stay Coming soon. Announcements have a 48-hour activation delay. When enabled, district locks have 7/14/30-day terms with no early withdrawal; quotes come from Economy. Season views show token pot, remaining funds, results, and counted token-spend scores. Award claims are simulated for eligibility. Billboards display current messages and, when enabled, accept bids for the following week. Losing bidders withdraw refunds separately.

## Transaction states and recovery

The interface checks chain 4663 and verifies the registry before writes. Every action is simulated before asking the wallet to sign. Approvals and purchases are separate transactions. Pending transactions retain a hash and explorer link. Reverted transactions show a decoded error name when the RPC supplies revert data. Read failures offer Retry. Review the explorer before retrying a transaction whose confirmation is delayed.

No keys or custody exist in this static app. Optional local storage holds transaction/receipt caches only; receipts and ownership remain on chain. Changing accounts invalidates loaded eligibility and inventory. Earlier browser demo progress has no on-chain value.

## Risks

You can lose money. Token price, liquidity and rewards can fall. Approvals, gas and failed transactions cost real assets. Inspect amounts, recipient and contract addresses in every wallet prompt. Future blockhash randomness is sequencer-influenced and is not a verifiable randomness oracle. Missed capture windows, full inventories and delayed settlement can require further transactions.

The deployed source has accepted implementation risks, including documented lock-boost and season-prize behavior. Review [the pinned source and risk records](https://github.com/identity-md-launches/launch-1729-blackout-l4-job-b/tree/77c962e6fce9652ee93dff2037b1a09e7a66bd04/docs). Public RPCs, wallets and the chain can become unavailable. This interface does not remove those dependencies or promise earnings.

Source provenance, installation and reproducible checks are in [README.md](README.md). Current verification evidence is in [reports/live/validation.md](reports/live/validation.md).
