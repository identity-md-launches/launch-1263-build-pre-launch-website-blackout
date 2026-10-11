import { config } from './config';
import { RARITIES } from './game/types';

export interface DocsSection {
  id: string;
  title: string;
  body: string;
}

const table = (caption: string, headings: string[], rows: string[][]) => `
  <div class="docs-table" role="region" aria-label="${caption}" tabindex="0">
    <table><caption>${caption}</caption><thead><tr>${headings.map(heading => `<th scope="col">${heading}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(row => `<tr>${row.map((cell, index) => index === 0 ? `<th scope="row">${cell}</th>` : `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>
  </div>`;

/** Player-facing copy. The demo's configurable mechanics live in game rules. */
export const docsSections: DocsSection[] = [
  {
    id: 'what-is-blackout', title: 'What is BLACKOUT',
    body: `<p>BLACKOUT is a pixel-art idle mining game coming to Robinhood Chain. Open packs, build a farm and keep your hardware running while the IMD swarm operates the city power grid.</p><p>This site is a playable demo: no wallet, real money or live token. Progress stays in this browser and is shared across Farm, Packs, City, Season, Wallet and Docs. Clearing browser storage or resetting the demo removes that progress.</p>`
  },
  {
    id: 'how-to-start', title: 'How to start',
    body: `<ol><li><a href="#/farm">Play the demo</a> and inspect your starter farm.</li><li><a href="#/packs">Open a pack</a> and reveal its three items. Leave three inventory slots free.</li><li>On Farm, open an inventory item’s menu, choose a room and select Install item. A room accepts each item type once.</li><li>Wait for an epoch, claim your mining and spend tokens on upkeep or upgrades.</li><li>Read dispatches and try combinations that protect your room.</li></ol><p>The demo supplies practice balances. Its rewards, prices, rankings and transactions are a local simulation and do not carry over to launch.</p>`
  },
  {
    id: 'packs-and-prices', title: 'Packs and prices',
    body: `<p>Every pack contains three soulbound items. Each item has its own rarity roll. There is no purchase quantity limit; available balance, three free inventory slots and finishing the current reveal determine when you can open another.</p>${table('Pack prices · beta values, may change', ['Rule', 'Value'], [
      ['Starting ETH price', '0.010 ETH'], ['Price floor / ceiling', '0.006 / 0.030 ETH'], ['Demand', 'Price rises as packs sell and decays during quiet periods.'], ['Token packs', 'Token-equivalent price with a 10% discount.'], ['Live quote', 'Open Packs shows the current price before you open.']
    ])}<p>All ETH and token balances here are simulated. The live token conversion and final contract parameters will be set for launch.</p>`
  },
  {
    id: 'items-and-rarity', title: 'Items and rarity',
    body: `<p>Items are soulbound: they belong to your farm and cannot be transferred or sold to other players. Compute items produce their full base hash. Other types produce 60% of that base. Durability, room bonuses and grid events can change effective output.</p>${table('The 12 item types', ['Tag', 'Types', 'Base hash used'], [
      ['Compute', 'GPU, ASIC, FPGA', '100%'], ['Power', 'Power Supply, Battery, Solar Panel', '60%'], ['Cooling', 'Fan, Liquid Cooling', '60%'], ['Network', 'Router', '60%'], ['Infra', 'Motherboard, Server Rack, Surge Protector', '60%']
    ])}${table('Rarity · beta values, may change', ['Rarity', 'Odds at level 10+', 'Base hash', 'Equip level'], [
      ['Common', '70%', '10', '1'], ['Rare', '22%', '28', '1'], ['Epic', '6.7%', '80', '3'], ['Legendary', '1%', '250', '5'], ['Mythic', '0.3%', '800', '10']
    ])}<p>Mythic drops unlock at level 10. Below that level, Common is 70.3% and Mythic is 0%; the other odds stay the same. Higher-rarity items can sit in your inventory before you meet their equip level; a lock shows what level you need. Every type has a pixel sprite for each rarity.</p>`
  },
  {
    id: 'rooms-and-combos', title: 'Rooms and combos',
    body: `<p>Each room has six slots. Install any types, with no duplicate type in the same room. Active combos apply within that room. Hash bonuses add together up to a +40% cap; electricity savings and event protections are separate.</p>${table('Room unlocks · beta values, may change', ['Room', 'Unlock'], [
      ['1', 'Available at the start'], ['2', 'After 3 in-game days'], ['3', 'Account level 7'], ['4', 'Account level 10']
    ])}${table('Combo guide · beta values, may change', ['Combo', 'Required items', 'Effect'], [
      ['Compute Duo', 'GPU + ASIC', '+10% room hash'], ['Triple Core', 'GPU + ASIC + FPGA', '+20% room hash'], ['Full Stack', 'At least one of all five tags', '+15% room hash'], ['Airflow', 'Fan + Server Rack', '+5% room hash; fire damage halved'], ['Cold Power', 'Power Supply + Liquid Cooling', 'Electricity tariff −15%; immune to server fire'], ['Off-grid', 'Solar Panel + Battery', 'Electricity tariff −20%; outage loses 50% of output instead of 100%'], ['Clean Power', 'Surge Protector + Power Supply', 'Immune to power surges'], ['Locked Rack', 'Router + Server Rack', 'Immune to cable theft'], ['Rarity set', 'At least three items of the same rarity', `Common gives no set bonus; ${RARITIES.filter(r => config.rarity[r].setBonus > 0).map(r => `${r} +${config.rarity[r].setBonus * 100}%`).join(', ')}. Only the strongest set applies.`]
    ])}<p>Triple Core replaces Compute Duo when GPU, ASIC and FPGA are working in the room; they never stack. GPU + ASIC alone still gives Compute Duo’s +10%. The Farm combo panel shows active combinations and the items still missing, so you can plan the next slot before installing.</p>`
  },
  {
    id: 'inventory', title: 'Inventory',
    body: `<p>You start with 15 inventory slots. Installed items occupy room slots instead. Opening a pack needs three free inventory slots, including space reserved by an unfinished pack.</p>${table('Make room for your next pack', ['Action', 'What happens'], [
      ['Install', 'Move an eligible item into a room with an empty slot.'], ['Scrap', 'Permanently remove a spare item for a tiny token value. Check the preview first.'], ['Expand', 'Spend tokens to add 5 inventory slots.']
    ])}<p>Scrapping permanently consumes the item after confirmation. Mythic is the highest rarity. Each item has its own action menu; repair restores durability, and installed items can be removed into inventory.</p>`
  },
  {
    id: 'levels', title: 'Levels',
    body: `<p>Earn account XP from active mining epochs, opening packs and spending tokens in the game. Every game tab shows your level and XP bar. Levels still require XP; age gates prevent reaching level 5 before farm day 1, level 7 before day 3, or level 10 before day 5. These are elapsed farm days, not calendar dates. Mining XP is uncapped. XP from packs and token spending shares a 400 XP daily cap, resetting each farm day. Extra XP is retained while an age gate is locked.</p>${table('Level milestones · beta values, may change', ['Level', 'Unlock'], [
      ['1', 'Common and Rare equipment'], ['3', 'Equip Epic items'], ['5', 'From farm day 1: equip Legendary items'], ['7', 'From farm day 3: room 3'], ['10', 'From farm day 5: room 4; Mythic drops and equipment']
    ])}<p>A rare pull does not bypass its equip gate. Keep a locked item until you reach the required level, or use the available inventory actions.</p>`
  },
  {
    id: 'mining-balance-withdraw-tax', title: 'Mining, balance, withdraw tax',
    body: `<p>Working items mine during each epoch. At the epoch boundary, the demo settles mining, costs and the grid event. Earned mining waits for sync. Claim syncs first, then moves all earned mining into your spendable balance. Reading the page does not sync it. The top bar includes earned, unsynced mining in the claim preview.</p>${table('Balances and spending · beta values, may change', ['Action', 'Rule'], [
      ['Claim', 'Collect completed-epoch mining into your token balance.'], ['Spend in game', 'No withdrawal tax; a 5% purchasing bonus means the nominal cost is divided by 1.05.'], ['Withdraw', 'Tax starts at 20% and falls to 5% over 7 in-game days.'], ['Preview', 'Wallet shows the withdrawal tax and net amount before confirmation.']
    ])}<p>Withdrawing in the demo only records a simulated withdrawal. No asset leaves your browser, and demo balances have no cash value.</p>`
  },
  {
    id: 'farm-costs', title: 'Farm costs',
    body: `${table('Keeping a farm running · beta values, may change', ['Cost', 'Rule'], [
      ['Electricity', 'Base tariff is 15% of mining output, withheld each epoch. Combos and events change it; overclock’s extra power use raises it.'], ['Durability', 'Active items lose 0.5 durability per epoch before extra damage or overclock wear.'], ['Repair', 'Spend tokens to restore worn hardware. Farm shows the price.'], ['Overclock', 'Each level adds +10% hash, up to 5 levels (+50%). Cost rises each level. Review the cost, extra wear and power use before confirming.'], ['Upgrades', 'Inventory expansion and lobbying use the displayed token price.']
    ])}<p>Electricity has no separate reserve or refill. The tariff is withheld only from new mining output, never from stored balances.</p><p>Cold Power and Off-grid reduce the base tariff by 15% and 20% respectively; together they reduce it by 35%. Cheap tariff halves the result.</p><p>Each overclock level adds 25% wear and 25% power use relative to level zero: wear = 0.5 × (1 + 0.25 × level) durability per epoch; tariff = 15% × (1 − combo reductions) × (1 + 0.25 × level) × event multiplier. Overclock levels cost 25, 50, 75, 100 and 125 nominal tokens, divided by 1.05 for the spending bonus.</p><p>Repair damaged equipment. Broken items stop contributing until repaired. Repairs, overclock and inventory expansion fund the reward pool. Packs and lobbying use the 88% / 10% / 2% split below. Tokens are not burned.</p>`
  },
  {
    id: 'city-and-swarm-events', title: 'The city and swarm events',
    body: `<p>The city has eight districts. Each epoch brings a grid event, and your district determines which local effects reach your farm. Read the dispatcher letter for the effect, damage and the combo that could have protected you.</p>${table('Events and protections', ['Event', 'Effect', 'Protection or response'], [
      ['Outage', 'Affected rooms lose mining output.', 'Off-grid limits the loss to 50%.'], ['Power surge', 'A hardware item can burn.', 'Clean Power makes the room immune.'], ['Server fire', 'Damages equipment.', 'Cold Power gives immunity; Airflow halves fire damage.'], ['Cable theft', 'Disrupts mining.', 'Locked Rack makes the room immune.'], ['Tax audit', 'Only farms above the hash threshold are audited: 10% of that epoch’s mining goes to the reward pool. Never takes from player balances.', 'No item combo; lobbying reduces bad-event odds.'], ['Green wave', '+10% output for affected farms.', 'Benefit automatically while mining.'], ['Cheap tariff', 'Electricity tariff is 50% lower.', 'Benefit automatically while mining.'], ['Calm', 'No extra event penalty.', 'Use the quiet epoch to maintain your farm.'], ['Supply drop', 'A bonus drop triggered by a spike in pack sales.', 'Watch the dispatch panel for your drop.']
    ])}<p>Audit eligibility uses a hash threshold, not balances, rank or cumulative season scores. The demo threshold is above ${config.events.auditHashThreshold} H/s; a farm exactly at the threshold is exempt. District targeting still applies. The audit and electricity tariff are each calculated from that epoch’s gross mining, before wear; earlier unclaimed mining stays intact. Beta values, may change. Lobbying changes the odds, not the outcome. Event protection applies to the room that completes the required combo.</p>`
  },
  {
    id: 'how-swarm-runs-grid', title: 'How the swarm runs the grid',
    body: `<p>The launch design uses 6-hour epochs. Mining, events and claims settle on those boundaries. The demo compresses each epoch to 45 seconds so you can try the loop. Four epochs count as one in-game day: room 2 unlocks after 12 epochs, and a week takes 28 epochs. The demo advance controls let you try those milestones immediately.</p><p>Anyone can trigger the next due epoch for a small reward. If the swarm is silent, a fallback keeps the grid moving under the same rules. The swarm can act only within hard limits: it cannot choose arbitrary payouts, bypass protections or rewrite the economy.</p><p>This is the intended contract architecture. Trigger rewards, fallback timing and exact bounds will be documented with the launch contracts. The demo runs its grid locally and pays no real keeper reward.</p>`
  },
  {
    id: 'gas-and-syncing', title: 'Gas and syncing',
    body: `<p>Each sync costs a small Robinhood Chain fee at launch; syncing once a day is enough. There is no wallet or gas payment in this demo.</p><p>The top bar says <strong>Synced</strong> or how many epochs remain to sync. Use SYNC, claim, or take any farm action to catch up. Packs, installation, removal, repair, scrap, expansion, overclock and lobbying all sync. Viewing the site and the demo clock controls do not count as farm activity.</p><p>After 3 farm days without an action, your farm stops earning new rewards until synced. Earned rewards are never lost. Syncing collects up to the first 12 inactive epochs (4 epochs per farm day); the idle period after that earns nothing retroactively. Demo catch-up processes at most 160 grid epochs in one read and skips older grid history. Normal launch epochs last 6 hours; demo epochs last 45 seconds. Beta values, may change.</p>`
  },
  {
    id: 'lobbying', title: 'Lobbying',
    body: `<p>Use <strong>Lobby</strong> on City to spend tokens on your district before the next event. Lobbying lowers the chance of a bad event. It does not buy immunity or guarantee a helpful event.</p><p>The district panel shows the price and whether the next request is already logged. Complete room combos for protection that still works when a bad event gets through.</p>`
  },
  {
    id: 'weekly-season', title: 'Weekly season',
    body: `<p>Each week is a new city season. Season shows the countdown and district leaderboard.</p>${table('Season rewards', ['Result', 'Planned prize'], [
      ['Best district', 'Free packs for qualifying farms in that district'], ['Season lottery', 'Prizes for 3 farms'], ['Best farm', 'A prize for the top farm']
    ])}<p>The best district is ranked by average synced mining per active farm, not total mining. One wallet counts for at most 10% of its district’s final credited total. The demo caps each wallet’s credited mining, recalculates the district total, then divides by active farm count. Districts need at least ten active wallets for a positive score under that cap; the demo starts with twelve farms per district. Farms with no synced mining are excluded. Your scoring district is fixed for the week; moving in City changes event exposure immediately and your scoring district next week.</p><p><strong>Sync your farm before the week ends to enter the season score.</strong> Only the score recorded by your last sync before the boundary enters that week. Later syncing still collects earned mining; it cannot add score to a closed week. Lottery entries need a positive synced mining score. Best farm uses synced mining before district capping. The local demo simulates rival scores. A season lasts 28 demo epochs, and you can claim any earned practice prizes from Season. It is not a live multiplayer ranking. Launch eligibility, prize amounts and tie rules will be published with the season rules.</p>`
  },
  {
    id: 'referrals', title: 'Referrals',
    body: `<p>Copy your referral link from Wallet and share it with friends. The planned referral reward is 5% of invitees’ mining. The dashboard separates referral activity from your own farm output.</p><p>Demo links and referral figures are practice features stored in the browser. Use the invitee simulation to preview the 5% credit; a shared demo link does not track a friend’s mining across devices. They do not verify a person, connect wallets or create a launch reward entitlement.</p>`
  },
  {
    id: 'nft-holder-pack', title: 'NFT holder pack',
    body: `<p>Identity MD NFT holders are planned to receive one free starter pack. The demo lets you try that claim without a wallet or ownership check.</p><p>A demo claim does not prove NFT ownership or reserve a launch pack. The launch claim will use the announced ownership and eligibility rules.</p>`
  },
  {
    id: 'token-and-launch', title: 'Token and launch',
    body: `<p>The ${config.launch.token} will launch through ${config.launch.through} on ${config.launch.chain}. ${config.allocations.swarmContributorSupply * 100}% of supply goes to IMD swarm contributor agents; ${config.launch.rewardPoolSeed.toLowerCase()} seeds the game reward pool. ${config.launch.supplySplit}. Beta values, may change.</p><p>There is no announced launch date here. Follow <a href="https://x.com/IMDBlackout" target="_blank" rel="noopener noreferrer">BLACKOUT on X <span aria-hidden="true">↗</span></a> for official updates. This demo does not deploy, mint or sell a token.</p>`
  },
  {
    id: 'where-money-goes', title: 'Where the money goes',
    body: `${table('Packs, lobbying and sell surcharge · beta values, may change', ['Destination', 'Share'], [
      ['Game reward pool', `${config.allocations.packRewardPool * 100}%`], ['Team', `${config.allocations.packTeam * 100}%`], ['Swarm heartbeat', '2%']
    ])}<p>There are no team tokens. The team receives fees, not token allocations. The swap fee is 1% to the team and 1% to the reward pool. The swarm heartbeat funds the work needed to keep epochs moving.</p><p>Electricity tariffs and audit contributions go to the reward pool. Repair, overclock and expansion spending goes to the reward pool. Packs, lobbying and sell surcharge split 88% reward pool / 10% team / 2% swarm heartbeat. Demo withdrawal tax models the sell surcharge; there is no swap interaction in the demo. There are no token burns. The demo records token spending as simulated accounting only.</p>`
  },
  {
    id: 'who-controls-what', title: 'Who controls what',
    body: `<p>The intended launch contracts have no owner and no upgrades. The swarm operates the grid within fixed bounds; it does not receive an unrestricted admin key.</p>${table('Intended responsibilities at launch', ['Participant', 'Control'], [
      ['You', 'Your farm layout, packs, upkeep, claims and withdrawals'], ['Contracts', 'Ownership, balances, settlement, permissions and hard limits'], ['IMD swarm', 'Permitted grid actions within those limits'], ['Anyone', 'Trigger the next due epoch through the public path']
    ])}<p>The contracts are not deployed for this demo. Its browser simulation is not evidence that the future contracts have been audited or that their proposed rules are already enforced on chain.</p>`
  },
  {
    id: 'risks', title: 'Risks',
    body: `<p>Rewards depend on new players and volume. Early players earn more under the intended allocation model, but no player is promised a return or a profit. Lower activity, farm costs, grid events and token-price changes can reduce or eliminate rewards.</p><p>Packs contain random items. Soulbound hardware cannot be sold to another player. Spending on the game can result in a loss, and future contracts carry technical risk.</p><p>All numbers are beta values and may change before launch. This is a game, not financial advice. Only spend what you are comfortable spending on a game.</p>`
  }
];

export function renderDocs(): string {
  return `<header class="page-heading docs-heading"><div><h1>Player guide</h1><p>Build your farm. Learn the grid.</p></div><a class="button primary" href="#/farm">Play demo <span aria-hidden="true">→</span></a></header>
    <button class="button" id="replay-guide">Replay the 4-step guide</button><p class="docs-beta"><strong>Beta values, may change.</strong> Playable demo now; launch rules below describe the intended game.</p>
    <div class="docs-layout"><aside class="docs-contents" aria-labelledby="docs-contents-title"><h2 id="docs-contents-title" tabindex="-1">In this guide</h2><ol>${docsSections.map(section => `<li><a href="#/docs/${section.id}">${section.title}</a></li>`).join('')}</ol></aside>
    <div class="docs-body">${docsSections.map(section => `<section id="docs-${section.id}" class="docs-section" aria-labelledby="docs-heading-${section.id}" tabindex="-1"><h2 id="docs-heading-${section.id}">${section.title}</h2>${section.body}<a class="docs-back" href="#/docs">Back to guide contents <span aria-hidden="true">↑</span></a></section>`).join('')}</div></div>`;
}
