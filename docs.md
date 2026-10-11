# BLACKOUT player guide

**Beta values, may change.** This guide describes the playable demo and the intended launch game. No launch date is announced.

## What is BLACKOUT

BLACKOUT is a pixel-art idle mining game coming to Robinhood Chain. Open packs, build a farm and keep your hardware running while the IMD swarm operates the city power grid.

This site is a playable demo: no wallet, real money or live token. Progress stays in this browser and is shared between Farm and Open Packs. Clearing browser storage or resetting the demo removes that progress.

## How to start

1. Open Farm and inspect your starter farm.
2. Open Packs and reveal the three items in a pack. Leave three inventory slots free.
3. Select an inventory item, then an empty room slot to install it. A room accepts each item type once.
4. Wait for an epoch, claim your mining and spend tokens on upkeep or upgrades.
5. Read dispatches and try combinations that protect your room.

The demo supplies practice balances. Its rewards, prices, rankings and transactions are a local simulation and do not carry over to launch.

## Packs and prices

Every pack contains three soulbound items. Each item has its own rarity roll. There is no purchase quantity limit; available balance, three free inventory slots and finishing the current reveal determine when you can open another.

| Rule | Beta value |
| --- | --- |
| Starting ETH price | 0.010 ETH |
| Price floor / ceiling | 0.006 / 0.030 ETH |
| Demand | Price rises as packs sell and decays during quiet periods. |
| Token packs | Token-equivalent price with a 10% discount. |
| Live quote | Open Packs shows the current price before you open. |

All ETH and token balances here are simulated. The live token conversion and final contract parameters will be set for launch.

## Items and rarity

Items are soulbound: they belong to your farm and cannot be transferred or sold to other players. Compute items produce their full base hash. Other types produce 60% of that base. Durability, room bonuses and grid events can change effective output.

| Tag | Item types | Base hash used |
| --- | --- | --- |
| Compute | GPU, ASIC, FPGA | 100% |
| Power | Power Supply, Battery, Solar Panel | 60% |
| Cooling | Fan, Liquid Cooling | 60% |
| Network | Router | 60% |
| Infra | Motherboard, Server Rack, Surge Protector | 60% |

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

| Room | Beta unlock |
| --- | --- |
| 1 | Available at the start |
| 2 | After 3 in-game days |
| 3 | Account level 7 |
| 4 | Account level 10 |

| Combo | Required items | Beta effect |
| --- | --- | --- |
| Compute Duo | GPU + ASIC | +10% room hash |
| Triple Core | GPU + ASIC + FPGA | +20% room hash |
| Full Stack | At least one of all five tags | +15% room hash |
| Airflow | Fan + Server Rack | +5% room hash; fire damage halved |
| Cold Power | Power Supply + Liquid Cooling | Electricity −15%; immune to server fire |
| Off-grid | Solar Panel + Battery | Electricity −20%; outage loses 50% of output instead of 100% |
| Clean Power | Surge Protector + Power Supply | Immune to power surges |
| Locked Rack | Router + Server Rack | Immune to cable theft |
| Rarity set | At least three items of the same rarity | Common +5%, Rare +10%, Epic +20%, Legendary or Mythic +30%; only the strongest set applies |

Compute Duo and Triple Core can both apply. The Farm combo panel shows active combinations and the items still missing, so you can plan the next slot before installing.

## Inventory

You start with 15 inventory slots. Installed items occupy room slots instead. Opening a pack needs three free inventory slots, including space reserved by an unfinished pack.

| Action | What happens |
| --- | --- |
| Install | Move an eligible item into a room with an empty slot. |
| Scrap | Permanently remove a spare item for a tiny token value. Check the preview first. |
| Merge | Consume three spare items of the same type and rarity to create one item of the next rarity. |
| Expand | Spend tokens to add 5 inventory slots. |

Merge and scrap consume their inputs. Mythic is the highest rarity. The action panel shows the cost and any level requirement before you confirm.

## Levels

Earn account XP from active mining epochs, opening packs and spending tokens in the game. Farm shows your level, current XP and progress to the next level.

| Level | Beta unlock |
| --- | --- |
| 1 | Common and Rare equipment |
| 3 | Equip Epic items |
| 5 | Equip Legendary items |
| 7 | Room 3 |
| 10 | Room 4; Mythic drops and equipment |

A rare pull does not bypass its equip gate. Keep a locked item until you reach the required level, or use the available inventory actions.

## Mining, balance, withdraw tax

Working, powered items mine during each epoch. At the epoch boundary, the demo settles mining, costs and the grid event. Mining first appears as unclaimed tokens. Claim moves it into your spendable balance.

| Action | Beta rule |
| --- | --- |
| Claim | Collect completed-epoch mining into your token balance. |
| Spend in game | No withdrawal tax; a 5% purchasing bonus means the nominal cost is divided by 1.05. |
| Withdraw | Tax starts at 20% and falls to 5% over 7 in-game days. |
| Preview | Farm shows the withdrawal tax and net amount before confirmation. |

Withdrawing in the demo only records a simulated withdrawal. No asset leaves your browser, and demo balances have no cash value.

## Farm costs

| Cost | Beta rule |
| --- | --- |
| Electricity | Base tariff is 15% of mining output, withheld each epoch. Combos and grid events can reduce it. |
| Durability | Active items lose 0.5 durability per epoch before extra damage or overclock wear. |
| Repair | Spend tokens to restore worn hardware. Farm shows the price. |
| Overclock | Spend tokens for more room hash, with higher wear and power use. Inspect the shown effect and cost. |
| Upgrades | Merge, inventory expansion and lobbying use the displayed token price. |

The electricity reserve also drains while hardware runs; refill it with tokens. Keep electricity funded and repair damaged equipment. Broken items stop contributing until repaired. All in-game token spending returns to the reward pool at launch; tokens are not burned.

## The city and swarm events

The city has eight districts. Each epoch brings a grid event, and your district determines which local effects reach your farm. Read the dispatcher letter for the effect, damage and the combo that could have protected you.

| Event | Effect | Protection or response |
| --- | --- | --- |
| Outage | Affected rooms lose mining output. | Off-grid limits the loss to 50%. |
| Power surge | A hardware item can burn. | Clean Power makes the room immune. |
| Server fire | Damages equipment. | Cold Power gives immunity; Airflow halves fire damage. |
| Cable theft | Disrupts mining. | Locked Rack makes the room immune. |
| Tax audit | Takes 10% of the affected farm’s spendable balance. | No item combo; lobbying reduces bad-event odds. |
| Green wave | +10% output for affected farms. | Benefit automatically while mining. |
| Cheap tariff | Electricity tariff is 50% lower. | Benefit automatically while mining. |
| Calm | No extra event penalty. | Use the quiet epoch to maintain your farm. |
| Supply drop | A bonus drop triggered by a spike in pack sales. | Watch the dispatch panel for your drop. |

Lobbying changes the odds, not the outcome. Event protection applies to the room that completes the required combo.

## How the swarm runs the grid

The launch design uses 6-hour epochs. Mining, events and claims settle on those boundaries. The demo compresses each epoch to 45 seconds so you can try the loop. Four epochs count as one in-game day: room 2 unlocks after 12 epochs, and a week takes 28 epochs. The demo advance controls let you try those milestones immediately.

Anyone can trigger the next due epoch for a small reward. If the swarm is silent, a fallback keeps the grid moving under the same rules. The swarm can act only within hard limits: it cannot choose arbitrary payouts, bypass protections or rewrite the economy.

This is the intended contract architecture. Trigger rewards, fallback timing and exact bounds will be documented with the launch contracts. The demo runs its grid locally and pays no real keeper reward.

## Lobbying

Use **Lobby** on Farm to spend tokens on your district before the next event. Lobbying lowers the chance of a bad event. It does not buy immunity or guarantee a helpful event.

The district panel shows the price and whether the next request is already logged. Complete room combos for protection that still works when a bad event gets through.

## Weekly season

Each week is a new city season. Farm shows the season countdown and district leaderboard.

| Result | Planned prize |
| --- | --- |
| Best district | Free packs for qualifying farms in that district |
| Season lottery | Prizes for 3 farms |
| Best farm | A prize for the top farm |

The local demo simulates rival scores. A season lasts 28 demo epochs, and you can claim any earned practice prizes from Farm. It is not a live multiplayer ranking. Launch eligibility, prize amounts and tie rules will be published with the season rules.

## Referrals

Copy your referral link from Farm and share it with friends. The planned referral reward is 5% of invitees’ mining. The dashboard separates referral activity from your own farm output.

Demo links and referral figures are practice features stored in the browser. Use the invitee simulation to preview the 5% credit; a shared demo link does not track a friend’s mining across devices. They do not verify a person, connect wallets or create a launch reward entitlement.

## NFT holder pack

Identity MD NFT holders are planned to receive one free starter pack. The demo lets you try that claim without a wallet or ownership check.

A demo claim does not prove NFT ownership or reserve a launch pack. The launch claim will use the announced ownership and eligibility rules.

## Token and launch

IMD is planned to launch on Robinhood Chain. 10% of the token supply is allocated to IMD swarm contributors, and part of the supply seeds the game reward pool. The exact supply split will be announced at launch.

There is no announced launch date here. Follow [BLACKOUT on X](https://x.com/IMDBlackout) for official updates. This demo does not deploy, mint or sell a token.

## Where the money goes

| Destination | Planned pack revenue share (beta) |
| --- | --- |
| Game reward pool | 85% |
| Team | 13% |
| Swarm heartbeat | 2% |

There are no team tokens. The team’s stated share comes from pack revenue. The swarm heartbeat funds the work needed to keep epochs moving.

All in-game token spends go back to the reward pool, including electricity, repairs, upgrades and lobbying. There are no token burns. The demo records token spending as simulated accounting only.

## Who controls what

The intended launch contracts have no owner and no upgrades. The swarm operates the grid within fixed bounds; it does not receive an unrestricted admin key.

| Participant | Intended control at launch |
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
