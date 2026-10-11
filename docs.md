# BLACKOUT player guide

**Beta values, may change.** Playable demo; no wallet or real money. Generated from `src/docs.ts` with `npx vite-node scripts/export-docs.ts`.

## What is BLACKOUT

BLACKOUT is a pixel-art idle mining game coming to Robinhood Chain. Open packs, build a farm and keep your hardware running while the IMD swarm operates the city power grid.

This site is a playable demo: no wallet, real money or live token. Progress stays in this browser and is shared across Farm, Packs, City, Season, Wallet and Docs. Clearing browser storage or resetting the demo removes that progress.

## How to start

- [Play the demo](#/farm) and inspect your starter farm.
- [Open a pack](#/packs) and reveal its three items. Leave three inventory slots free.
- On Farm, open an inventory item’s menu, choose a room and select Install item. A room accepts each item type once.
- Wait for an epoch, claim your mining and spend tokens on upkeep or upgrades.
- Read dispatches and try combinations that protect your room.

The demo supplies practice balances. Its rewards, prices, rankings and transactions are a local simulation and do not carry over to launch.

## Packs and prices

Every pack contains three soulbound items. Each item has its own rarity roll. There is no purchase quantity limit; available balance, three free inventory slots and finishing the current reveal determine when you can open another.

Pack prices · beta values, may change

| Rule | Value |
| --- | --- |
| Starting ETH price | 0.010 ETH |
| Price floor / ceiling | 0.006 / 0.030 ETH |
| Demand | Price rises as packs sell and decays during quiet periods. |
| Token packs | Token-equivalent price with a 10% discount. |
| Live quote | Open Packs shows the current price before you open. |

All ETH and token balances here are simulated. The live token conversion and final contract parameters will be set for launch.

## Items and rarity

Items are soulbound: they belong to your farm and cannot be transferred or sold to other players. Compute items produce their full base hash. Other types produce 60% of that base. Durability, room bonuses and grid events can change effective output.

The 12 item types

| Tag | Types | Base hash used |
| --- | --- | --- |
| Compute | GPU, ASIC, FPGA | 100% |
| Power | Power Supply, Battery, Solar Panel | 60% |
| Cooling | Fan, Liquid Cooling | 60% |
| Network | Router | 60% |
| Infra | Motherboard, Server Rack, Surge Protector | 60% |

Rarity · beta values, may change

| Rarity | Odds at level 10+ | Base hash | Equip level |
| --- | --- | --- | --- |
| Common | 70% | 10 | 1 |
| Rare | 22% | 28 | 1 |
| Epic | 6.7% | 80 | 3 |
| Legendary | 1% | 250 | 5 |
| Mythic | 0.3% | 800 | 10 |

Mythic drops unlock at level 10. Below that level, Common is 70.3% and Mythic is 0%; the other odds stay the same. Higher-rarity items can sit in your inventory before you meet their equip level; a lock shows what level you need. Every type has a pixel sprite for each rarity.

## Rooms and combos

Each room has six slots. Install any types, with no duplicate type in the same room. Active combos apply within that room. Hash bonuses add together up to a +40% cap; electricity savings and event protections are separate.

Room unlocks · beta values, may change

| Room | Unlock |
| --- | --- |
| 1 | Available at the start |
| 2 | After 3 in-game days |
| 3 | Account level 7 |
| 4 | Account level 10 |

Combo guide · beta values, may change

| Combo | Required items | Effect |
| --- | --- | --- |
| Compute Duo | GPU + ASIC | +10% room hash |
| Triple Core | GPU + ASIC + FPGA | +20% room hash |
| Full Stack | At least one of all five tags | +15% room hash |
| Airflow | Fan + Server Rack | +5% room hash; fire damage halved |
| Cold Power | Power Supply + Liquid Cooling | Electricity tariff −15%; immune to server fire |
| Off-grid | Solar Panel + Battery | Electricity tariff −20%; outage loses 50% of output instead of 100% |
| Clean Power | Surge Protector + Power Supply | Immune to power surges |
| Locked Rack | Router + Server Rack | Immune to cable theft |
| Rarity set | At least three items of the same rarity | Common gives no set bonus; Rare +5%, Epic +10%, Legendary +20%, Mythic +30%. Only the strongest set applies. |

Triple Core replaces Compute Duo when GPU, ASIC and FPGA are working in the room; they never stack. GPU + ASIC alone still gives Compute Duo’s +10%. The Farm combo panel shows active combinations and the items still missing, so you can plan the next slot before installing.

## Inventory

You start with 15 inventory slots. Installed items occupy room slots instead. Opening a pack needs three free inventory slots, including space reserved by an unfinished pack.

Make room for your next pack

| Action | What happens |
| --- | --- |
| Install | Move an eligible item into a room with an empty slot. |
| Scrap | Permanently remove a spare item for a tiny token value. Check the preview first. |
| Expand | Spend tokens to add 5 inventory slots. |

Scrapping permanently consumes the item after confirmation. Mythic is the highest rarity. Each item has its own action menu; repair restores durability, and installed items can be removed into inventory.

## Levels

Earn account XP from active mining epochs, opening packs and spending tokens in the game. Every game tab shows your level and XP bar. Levels still require XP; age gates prevent reaching level 5 before farm day 1, level 7 before day 3, or level 10 before day 5. These are elapsed farm days, not calendar dates. Mining XP is uncapped. XP from packs and token spending shares a 400 XP daily cap, resetting each farm day. Extra XP is retained while an age gate is locked.

Level milestones · beta values, may change

| Level | Unlock |
| --- | --- |
| 1 | Common and Rare equipment |
| 3 | Equip Epic items |
| 5 | From farm day 1: equip Legendary items |
| 7 | From farm day 3: room 3 |
| 10 | From farm day 5: room 4; Mythic drops and equipment |

A rare pull does not bypass its equip gate. Keep a locked item until you reach the required level, or use the available inventory actions.

## Mining, balance, withdraw tax

Working items mine during each epoch. At the epoch boundary, the demo settles mining, costs and the grid event. Earned mining waits for sync. Claim syncs first, then moves all earned mining into your spendable balance. Reading the page does not sync it. The top bar includes earned, unsynced mining in the claim preview.

Balances and spending · beta values, may change

| Action | Rule |
| --- | --- |
| Claim | Collect completed-epoch mining into your token balance. |
| Spend in game | No withdrawal tax; a 5% purchasing bonus means the nominal cost is divided by 1.05. |
| Withdraw | Tax starts at 20% and falls to 5% over 7 in-game days. |
| Preview | Wallet shows the withdrawal tax and net amount before confirmation. |

Withdrawing in the demo only records a simulated withdrawal. No asset leaves your browser, and demo balances have no cash value.

## Farm costs

Keeping a farm running · beta values, may change

| Cost | Rule |
| --- | --- |
| Electricity | Base tariff is 15% of mining output, withheld each epoch. Combos and events change it; overclock’s extra power use raises it. |
| Durability | Active items lose 0.5 durability per epoch before extra damage or overclock wear. |
| Repair | Spend tokens to restore worn hardware. Farm shows the price. |
| Overclock | Each level adds +10% hash, up to 5 levels (+50%). Cost rises each level. Review the cost, extra wear and power use before confirming. |
| Upgrades | Inventory expansion and lobbying use the displayed token price. |

Electricity has no separate reserve or refill. The tariff is withheld only from new mining output, never from stored balances.

Cold Power and Off-grid reduce the base tariff by 15% and 20% respectively; together they reduce it by 35%. Cheap tariff halves the result.

Each overclock level adds 25% wear and 25% power use relative to level zero: wear = 0.5 × (1 + 0.25 × level) durability per epoch; tariff = 15% × (1 − combo reductions) × (1 + 0.25 × level) × event multiplier. Overclock levels cost 25, 50, 75, 100 and 125 nominal tokens, divided by 1.05 for the spending bonus.

Repair damaged equipment. Broken items stop contributing until repaired. Repairs, overclock and inventory expansion fund the reward pool. Packs and lobbying use the 88% / 10% / 2% split below. Tokens are not burned.

## The city and swarm events

The city has eight districts. Each epoch brings a grid event, and your district determines which local effects reach your farm. Read the dispatcher letter for the effect, damage and the combo that could have protected you.

Events and protections

| Event | Effect | Protection or response |
| --- | --- | --- |
| Outage | Affected rooms lose mining output. | Off-grid limits the loss to 50%. |
| Power surge | A hardware item can burn. | Clean Power makes the room immune. |
| Server fire | Damages equipment. | Cold Power gives immunity; Airflow halves fire damage. |
| Cable theft | Disrupts mining. | Locked Rack makes the room immune. |
| Tax audit | Only farms above the hash threshold are audited: 10% of that epoch’s mining goes to the reward pool. Never takes from player balances. | No item combo; lobbying reduces bad-event odds. |
| Green wave | +10% output for affected farms. | Benefit automatically while mining. |
| Cheap tariff | Electricity tariff is 50% lower. | Benefit automatically while mining. |
| Calm | No extra event penalty. | Use the quiet epoch to maintain your farm. |
| Supply drop | A bonus drop triggered by a spike in pack sales. | Watch the dispatch panel for your drop. |

Audit eligibility uses a hash threshold, not balances, rank or cumulative season scores. The demo threshold is above 100 H/s; a farm exactly at the threshold is exempt. District targeting still applies. The audit and electricity tariff are each calculated from that epoch’s gross mining, before wear; earlier unclaimed mining stays intact. Beta values, may change. Lobbying changes the odds, not the outcome. Event protection applies to the room that completes the required combo.

## How the swarm runs the grid

The launch design uses 6-hour epochs. Mining, events and claims settle on those boundaries. The demo compresses each epoch to 45 seconds so you can try the loop. Four epochs count as one in-game day: room 2 unlocks after 12 epochs, and a week takes 28 epochs. The demo advance controls let you try those milestones immediately.

Anyone can trigger the next due epoch for a small reward. If the swarm is silent, a fallback keeps the grid moving under the same rules. The swarm can act only within hard limits: it cannot choose arbitrary payouts, bypass protections or rewrite the economy.

This is the intended contract architecture. Trigger rewards, fallback timing and exact bounds will be documented with the launch contracts. The demo runs its grid locally and pays no real keeper reward.

## Gas and syncing

Each sync costs a small Robinhood Chain fee at launch; syncing once a day is enough. There is no wallet or gas payment in this demo.

The top bar says **Synced** or how many epochs remain to sync. Use SYNC, claim, or take any farm action to catch up. Packs, installation, removal, repair, scrap, expansion, overclock and lobbying all sync. Viewing the site and the demo clock controls do not count as farm activity.

After 3 farm days without an action, your farm stops earning new rewards until synced. Earned rewards are never lost. Syncing collects up to the first 12 inactive epochs (4 epochs per farm day); the idle period after that earns nothing retroactively. Demo catch-up processes at most 160 grid epochs in one read and skips older grid history. Normal launch epochs last 6 hours; demo epochs last 45 seconds. Beta values, may change.

## Lobbying

Use **Lobby** on City to spend tokens on your district before the next event. Lobbying lowers the chance of a bad event. It does not buy immunity or guarantee a helpful event.

The district panel shows the price and whether the next request is already logged. Complete room combos for protection that still works when a bad event gets through.

## Weekly season

Each week is a new city season. Season shows the countdown and district leaderboard.

Season rewards

| Result | Planned prize |
| --- | --- |
| Best district | Free packs for qualifying farms in that district |
| Season lottery | Prizes for 3 farms |
| Best farm | A prize for the top farm |

The best district is ranked by average synced mining per active farm, not total mining. One wallet counts for at most 10% of its district’s final credited total. The demo caps each wallet’s credited mining, recalculates the district total, then divides by active farm count. Districts need at least ten active wallets for a positive score under that cap; the demo starts with twelve farms per district. Farms with no synced mining are excluded. Your scoring district is fixed for the week; moving in City changes event exposure immediately and your scoring district next week.

**Sync your farm before the week ends to enter the season score.** Only the score recorded by your last sync before the boundary enters that week. Later syncing still collects earned mining; it cannot add score to a closed week. Lottery entries need a positive synced mining score. Best farm uses synced mining before district capping. The local demo simulates rival scores. A season lasts 28 demo epochs, and you can claim any earned practice prizes from Season. It is not a live multiplayer ranking. Launch eligibility, prize amounts and tie rules will be published with the season rules.

## Referrals

Copy your referral link from Wallet and share it with friends. The planned referral reward is 5% of invitees’ mining. The dashboard separates referral activity from your own farm output.

Demo links and referral figures are practice features stored in the browser. Use the invitee simulation to preview the 5% credit; a shared demo link does not track a friend’s mining across devices. They do not verify a person, connect wallets or create a launch reward entitlement.

## NFT holder pack

Identity MD NFT holders are planned to receive one free starter pack. The demo lets you try that claim without a wallet or ownership check.

A demo claim does not prove NFT ownership or reserve a launch pack. The launch claim will use the announced ownership and eligibility rules.

## Token and launch

The BLACKOUT game token will launch through IMD on Robinhood Chain. 10% of supply goes to IMD swarm contributor agents; part of supply seeds the game reward pool. Exact split announced at launch. Beta values, may change.

The anti-sniper buy tax starts at 90% and drops to normal over 30 minutes; all of it goes to the reward pool. The max buy is 0.5 ETH per swap for the first hour. Packs open 1 hour after the token.

There is no announced launch date here. Follow [BLACKOUT on X ↗](https://x.com/IMDBlackout) for official updates. This demo does not deploy, mint or sell a token.

## Where the money goes

Packs, lobbying and sell surcharge · beta values, may change

| Destination | Share |
| --- | --- |
| Game reward pool | 88% |
| Team | 10% |
| Swarm heartbeat | 2% |

There are no team tokens. The team receives fees, not token allocations. The swap fee is 1% to the team and 1% to the reward pool. The swarm heartbeat funds the work needed to keep epochs moving.

Electricity tariffs and audit contributions go to the reward pool. Repair, overclock and expansion spending goes to the reward pool. Packs, lobbying and sell surcharge split 88% reward pool / 10% team / 2% swarm heartbeat. Demo withdrawal tax models the sell surcharge; there is no swap interaction in the demo. There are no token burns. The demo records token spending as simulated accounting only.

## Who controls what

The intended launch contracts have no owner and no upgrades. The swarm operates the grid within fixed bounds; it does not receive an unrestricted admin key.

Intended responsibilities at launch

| Participant | Control |
| --- | --- |
| You | Your farm layout, packs, upkeep, claims and withdrawals |
| Contracts | Ownership, balances, settlement, permissions and hard limits |
| IMD swarm | Permitted grid actions within those limits |
| Anyone | Trigger the next due epoch through the public path |

The contracts are not deployed for this demo. Its browser simulation is not evidence that the future contracts have been audited or that their proposed rules are already enforced on chain.

## Risks

Rewards depend on new players and volume. Early players earn more under the intended allocation model, but no player is promised a return or a profit. Lower activity, farm costs, grid events and token-price changes can reduce or eliminate rewards.

Packs contain random items. Soulbound hardware cannot be sold to another player. Spending on the game can result in a loss, and future contracts carry technical risk.

All numbers are beta values and may change before launch. This is a game, not financial advice. Only spend what you are comfortable spending on a game.
