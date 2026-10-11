import { config } from './config';
import { game } from './game/adapter';
import { activeEvent, actualSpend, auditEligibility, claimable, districtStandings, epochsToSync, isIdle, COSTS, DISTRICTS, electricityTariff, equippedIds, EVENT_LABELS, findItem, hasCombo, inventoryUsed, itemDetail, overclockCost, packPrice, roomCombos, roomHashrate, roomItems, roomUnlocks, repairCost, roomRepairCost, durabilityOutput, tokenPackPrice, totalHashrate, withdrawTax } from './game/rules';
import { RARITIES } from './game/types';
import type { GameState, Item, PackCurrency, Room } from './game/types';
import { itemSprite, sprite, spriteSheet, districtSprite, districtArt } from './sprites';
import { landing } from './landing';
import { bootScreen, initAtmosphere, claimFeedback, levelFeedback, soundEnabled, toggleSound, playSound, downloadPixelCard, shareIntent } from './effects';
import { renderDocs } from './docs';

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const esc = (s: string | number) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const num = (n: number, digits = 1) => n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
const pct = (n: number) => `${num(n * 100, n * 100 % 1 ? 1 : 0)}%`;
const tariffPct = (n: number) => `${(n * 100).toLocaleString('en-US', { maximumFractionDigits: 5 })}%`;
const xLink = (label = 'Follow on X', cls = '') => `<a class="${cls}" href="${config.xUrl}" target="_blank" rel="noopener noreferrer">${label} <span aria-hidden="true">↗</span></a>`;
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
let state: GameState = await game.getFarm();
let selectedItem: string | null = null;
let guide = { step: 0, dismissed: false, waitEpoch: -1 };
try { const saved = JSON.parse(localStorage.getItem('blackout.guide.v1') || 'null'); if (saved && Number.isInteger(saved.step) && saved.step >= 0 && saved.step < 4 && typeof saved.dismissed === 'boolean' && Number.isInteger(saved.waitEpoch)) guide = saved; } catch { /* Guide works in memory too. */ }
const saveGuide = () => { try { localStorage.setItem('blackout.guide.v1', JSON.stringify(guide)); } catch { /* Optional preference. */ } };
let filter = 'All';
let pendingFix: string | null = null;
let lastWarning = '';
const dismissedWarnings = new Set<string>();
let warningKey = '';
let lastLevel = state.level;
let lastEvent = state.events[0]?.id;
let claimStart: number | null = null;
let currency: PackCurrency = 'tokens';
let busy = false;
let opening = false;
let newlyRevealed: string | null = null;
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let motion = !motionPreference.matches;
let confirmAction: (() => Promise<unknown>) | null = null;
let confirmReturn: HTMLElement | null = null;
const isDemo = game.mode === 'demo';
const route = () => location.hash.replace(/^#\/?/, '').split('/')[0] || 'home';
const lock = (item: Item) => state.level < config.rarity[item.rarity].level;
const cost = (n: number) => num(actualSpend(n), 2);
const capacity = () => state.inventoryCapacity - inventoryUsed(state);

$('#app').innerHTML = `${spriteSheet()}
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header wrap">
  <a class="brand" href="#/" aria-label="BLACKOUT home">${sprite('mascot')}<span>BLACKOUT</span></a>
  <nav class="game-nav" aria-label="Game tabs">${['farm','packs','city','season','wallet','docs'].map((name, i) => `<a href="#/${name}" data-route="${name}"><span class="nav-symbol" aria-hidden="true">${['▦','▣','▥','★','◈','≡'][i]}</span>${name.charAt(0).toUpperCase()+name.slice(1)}</a>`).join('')}</nav>
  <a class="header-starter" href="${config.freePackUrl}">Free starter pack <span aria-hidden="true">↗</span></a>
  <button class="sound-toggle" id="sound-toggle" aria-label="Sound: ${soundEnabled() ? 'on' : 'off'}" aria-pressed="${soundEnabled()}"><span aria-hidden="true">♪</span><span class="sound-label">Sound ${soundEnabled() ? 'on' : 'off'}</span></button><span class="mode-label"><i aria-hidden="true"></i>${isDemo ? 'Demo mode' : 'Chain mode'}</span>
</header>
<div class="demo-strip"><div class="wrap">${isDemo ? 'No wallet. No real money.' : 'Farm state is provided by the connected game adapter.'}<span>Beta values, may change</span></div></div>
<div id="storage-warning" class="wrap warning" hidden></div>
<main id="main" tabindex="-1"></main>
<footer class="site-footer wrap"><a class="footer-brand" href="#/">BLACKOUT</a><p>A city worth keeping alive.<br><span class="muted">Launching soon on Robinhood Chain.</span></p><div><a href="#/docs">Read the docs</a><a href="#/docs/risks">Risks</a>${xLink()}<button class="text-button" id="motion-toggle" ${motionPreference.matches ? 'disabled' : ''} aria-pressed="${motion}">Animation: ${motion ? 'on' : 'off'}</button></div><p class="footer-fine">Demo items and tokens have no real value. Contract addresses: TBA at launch.</p></footer>
<div class="feedback-stack" id="feedback-stack"><div class="notice" id="notice" hidden><p id="notice-text"></p><button id="dismiss-notice" aria-label="Dismiss message">×</button></div></div>
<dialog id="confirm-dialog" aria-labelledby="confirm-title" aria-describedby="confirm-body"><div class="dialog-inner"><h2 id="confirm-title"></h2><p id="confirm-body"></p><div class="actions"><button class="button" id="cancel-confirm">Cancel</button><button class="button primary" id="accept-confirm">Confirm</button></div></div></dialog>
<p id="live-status" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></p>
<p id="live-alert" class="sr-only" role="alert" aria-atomic="true"></p><p id="mining-status" class="sr-only" role="status" aria-live="polite"></p>
<div class="mythic-flash" aria-hidden="true"></div>`;

// The header can wrap at intermediate widths or with enlarged text.
const header = document.querySelector<HTMLElement>('.site-header')!;
const updateChromeOffsets = () => {
  const reflow = innerWidth < 320 || parseFloat(getComputedStyle(document.documentElement).fontSize) > 20;
  document.body.classList.toggle('reflow-mode', reflow);
  const height = header.getBoundingClientRect().height;
  const nav = document.querySelector('.game-nav')!;
  document.documentElement.style.setProperty('--nav-offset', getComputedStyle(nav).position === 'fixed' ? `${nav.getBoundingClientRect().height}px` : '0px');
  document.documentElement.style.setProperty('--header-offset', `${height}px`);
  document.documentElement.style.setProperty('--chrome-offset', `${reflow ? 0 : height + (document.querySelector('.game-hud')?.getBoundingClientRect().height ?? 0)}px`);
};

const chromeObserver = new ResizeObserver(updateChromeOffsets);
chromeObserver.observe(header);
chromeObserver.observe(document.querySelector('.game-nav')!);
window.addEventListener('resize', updateChromeOffsets);
let observedHud: Element | null = null;

function notify(message: string, error = false) {
  $('#notice').hidden = false;
  $('#notice').classList.toggle('error', error);
  $('#notice-text').textContent = message;
  $(error ? '#live-alert' : '#live-status').textContent = message;
}
function confirm(title: string, body: string, label: string, action: () => Promise<unknown>) {
  confirmReturn = document.activeElement as HTMLElement;
  $('#confirm-title').textContent = title;
  $('#confirm-body').textContent = body;
  $('#accept-confirm').textContent = label;
  confirmAction = action;
  $('#confirm-dialog').classList.remove('working');
  $<HTMLDialogElement>('#confirm-dialog').showModal();
  $('#cancel-confirm').focus();
}
function closeConfirm() {
  $<HTMLDialogElement>('#confirm-dialog').close();
  confirmAction = null;
  confirmReturn?.focus();
}
async function act(action: () => Promise<unknown>, message?: string, renderAfter = true) {
  if (busy) return;
  busy = true;
  try {
    await action(); if (renderAfter) { state = await game.getFarm(); render(); }
    if (message) notify(message);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update the farm. Reload and try again.';
    if (renderAfter) { try { state = await game.getFarm(); render(); } catch { /* Preserve the original actionable error. */ } }
    notify(message, true);
  }
  finally { busy = false; }
}
function pageHeading(title: string, description: string, aside = '') {
  return `<div class="page-heading"><div><h1>${title}</h1>${description ? `<p>${description}</p>` : ''}</div>${aside}</div>`;
}
function comboList(room: Room, all = false) {
  const combos = roomCombos(state, room);
  return `<div class="combo-list">${combos.filter(c => all || c.active).map(c => `<div class="combo ${c.active ? 'active' : ''}"><span aria-hidden="true">${c.active ? '✓' : '+'}</span><div><strong>${esc(c.name)}</strong><span>${esc(c.description)}</span>${c.replacedBy ? `<small>Replaced by ${esc(c.replacedBy)}</small>` : !c.active ? `<small>Needs: ${esc(c.missing.join(' + '))}</small>` : ''}</div><span class="combo-state">${c.active ? 'Active' : c.replacedBy ? 'Replaced' : 'Missing'}</span></div>`).join('') || '<p class="muted small">No combos yet. Add compatible hardware to start one.</p>'}</div>`;
}
function roomPanel(room: Room) {
  const combos = roomCombos(state, room).filter(c => c.active);
  return `<article class="mining-room"><div class="room-title"><h2 id="room-heading-${room.id}" tabindex="-1">Room ${String(room.id + 1).padStart(2, '0')}</h2><span>${num(roomHashrate(state, room))} H/s</span></div><div class="room-scene"><div class="room-pipes" aria-hidden="true"></div><div class="room-slots">${room.slots.map((id, index) => {
    const item = findItem(state, id);
    return item ? `<details class="farm-slot filled ${item.rarity.toLowerCase()} item-menu" id="installed-${item.id}"><summary id="slot-${room.id}-${index}" aria-label="${esc(item.type)} actions, room ${room.id + 1}, slot ${index + 1}">${itemSprite(item.type, item.rarity, '', item.durability)}<strong>${esc(item.type)}</strong><span>${esc(item.rarity)}</span><meter min="0" max="100" value="${item.durability}" aria-label="Durability ${num(item.durability)} percent"></meter><small>${num(item.durability)}% durability <span aria-hidden="true">▾</span></small><small class="output-label">${durabilityOutput(item.durability) ? `${pct(durabilityOutput(item.durability))} output` : 'Overheated · off'}</small></summary><div class="item-actions"><button class="button compact" data-unplace="${room.id},${index}" id="remove-${item.id}">Remove</button><button class="button compact" data-repair-item="${item.id}" id="repair-${item.id}" ${item.durability === 100 ? 'disabled' : ''}>Repair · ${cost(repairCost(item))} tokens</button></div></details>` : `<button id="slot-${room.id}-${index}" class="farm-slot" data-place="${room.id},${index}" aria-label="Choose an item for room ${room.id + 1}, slot ${index + 1}"><span class="slot-plus" aria-hidden="true">+</span><strong>Slot ${index + 1}</strong><small>Install hardware</small></button>`;
  }).join('')}</div></div><div class="room-combos"><div class="combo-chips" aria-label="Active room combos">${combos.length ? combos.map(c => `<span class="combo-chip">✓ ${esc(c.name)}${c.bonus ? ` +${pct(c.bonus)}` : ''}</span>`).join('') : '<span class="muted small">No combos yet. Try Power Supply + Liquid Cooling.</span>'}</div><details id="combos-${room.id}"><summary>Combo guide &amp; room settings</summary>${comboList(room, true)}<div class="room-controls"><button id="repair-room-${room.id}" class="text-button" data-repair="${room.id}" ${roomRepairCost(state, room) === 0 ? 'disabled' : ''}>Repair room · ${cost(roomRepairCost(state, room))} tokens</button><button id="overclock-${room.id}" class="button compact" data-overclock="${room.id}" ${room.overclock >= config.overclock.maximum ? 'disabled' : ''}>${room.overclock >= config.overclock.maximum ? 'Overclock at max' : `Overclock · ${cost(overclockCost(room))}`}</button></div><p class="small muted">Overclock ${room.overclock}/${config.overclock.maximum}. Preview hash, extra wear and power before paying. Combo hash bonus cap: ${pct(config.combos.hashCap)}.</p></details><p class="room-tariff small muted">Electricity: ${tariffPct(electricityTariff(state, room))} of this room’s mining · withheld each epoch.</p></div></article>`;
}
function inventoryPanel() {
  const equipped = equippedIds(state);
  const spares = state.inventory.filter(i => !equipped.has(i.id));
  const shown = spares.filter(i => filter === 'All' || config.items[i.type].tag === filter);
  return `<aside class="panel inventory-panel" aria-labelledby="inventory-title"><div class="section-heading"><h2 id="inventory-title" tabindex="-1">Inventory</h2><span>${inventoryUsed(state)} / ${state.inventoryCapacity} slots</span></div><p class="muted small">Open an item’s menu to install, repair or scrap.</p><label class="filter-label" for="inventory-filter">Show items <select id="inventory-filter">${['All', 'compute', 'power', 'cooling', 'network', 'infra'].map(t => `<option ${t === filter ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <div class="inventory">${shown.map(i => `<details id="spare-${i.id}" class="inventory-item item-menu ${i.rarity.toLowerCase()}"><summary id="item-${i.id}" aria-label="${esc(i.type)} actions, ${i.rarity}">${itemSprite(i.type, i.rarity, '', i.durability)}<strong>${esc(i.type)}</strong><span>${esc(i.rarity)}</span><small>${lock(i) ? `Level ${config.rarity[i.rarity].level} required` : `${itemDetail(i).split(' · ')[0]}`} <span aria-hidden="true">▾</span></small></summary><div class="item-actions">${lock(i) ? `<p class="small warning">Equip at level ${config.rarity[i.rarity].level}. You are level ${state.level}.</p>` : `<label for="install-room-${i.id}">Install in room</label><select id="install-room-${i.id}">${state.rooms.map(r => `<option value="${r.id}">Room ${r.id + 1}</option>`).join('')}</select><button id="install-${i.id}" data-install-item="${i.id}" class="button compact">Install item</button>`}<button data-repair-item="${i.id}" id="repair-spare-${i.id}" class="button compact" ${i.durability === 100 ? 'disabled' : ''}>Repair · ${cost(repairCost(i))} tokens</button><button data-scrap-item="${i.id}" id="scrap-${i.id}" class="text-button danger">Scrap · +${config.rarity[i.rarity].scrap}</button></div></details>`).join('')}</div>
    ${!shown.length ? '<p class="empty-state">No spare items here. Choose another filter or open a pack.</p>' : ''}
    ${state.pendingPack && !state.pendingPack.revealed.every(Boolean) ? '<p class="small warning">Space reserved for your pack. <a href="#/packs">Reveal the remaining cards.</a></p>' : ''}
    <details id="inventory-space"><summary>${capacity()} spaces free · expand inventory</summary><button class="button full" id="expand">Add ${config.inventory.expansionSlots} slots · ${cost(config.inventory.expansionCost)} tokens</button></details><a class="text-link" href="#/packs">Open another pack →</a>
  </aside>`;
}
function cityPanel() {
  const event = activeEvent(state);
  const latest = state.letters[0];
  return `<section class="city-section" aria-labelledby="city-title"><div class="section-heading"><h2 id="city-title">City grid</h2><span>Next event in <strong id="city-timer"></strong></span></div><div class="city-layout"><div class="panel map-panel"><div class="section-heading"><h3>District status</h3><span class="badge">${esc(DISTRICTS[state.district])}</span></div><div class="district-map">${DISTRICTS.map((name, i) => `<div style="--district:${districtArt[i].color}" class="district ${i === state.district ? 'your-district' : ''} ${(event?.type === 'supply' || event?.district === i) ? 'district-affected' : ''}"><div><span>${String(i + 1).padStart(2, '0')}</span><span>${i === state.district ? 'Your farm' : 'Grid'}</span></div>${districtSprite(i, (event?.type === 'supply' || event?.district === i) ? event.type : 'calm')}<strong>${name}</strong><span class="district-landmark">${districtArt[i].landmark}</span><small>${(event?.type === 'supply' || event?.district === i) ? EVENT_LABELS[event.type] : 'Online'}</small></div>`).join('')}</div><div class="lobby-row"><div><h3>${state.lobbied ? 'Lobbying filed' : 'Lobby your district'}</h3><p class="muted small">Lower the odds of a bad event targeting your district next epoch. No guaranteed protection.</p></div><button class="button compact" id="lobby" ${state.lobbied ? 'disabled' : ''}>Lobby · ${cost(COSTS.lobby)}</button></div><details id="district-choice"><summary>Move demo district</summary><label for="district-select">Choose district</label><select id="district-select">${DISTRICTS.map((name, i) => `<option value="${i}" ${i === state.district ? 'selected' : ''}>${name}</option>`).join('')}</select><button class="button compact" id="move-district">Move farm</button></details></div>
    <div class="panel terminal"><div class="terminal-bar"><span><i></i><i></i><i></i></span><span>Grid dispatch / incoming</span>${sprite('dispatcher')}</div><div class="terminal-content"><div class="subheading"><span>Current event</span><span>${event ? event.type === 'supply' ? 'Citywide' : `District ${event.district + 1}` : 'Standing by'}</span></div><h3 class="event-title">${event ? EVENT_LABELS[event.type] : 'Calm'}</h3><p class="event-protection">${esc(event?.protection || 'Build room combos before the next event arrives.')}</p><article id="latest-letter"><h3>${esc(latest?.title || 'Connection established')}</h3><p>${esc(latest?.body || 'Resident. Your meter is ready. Keep the grid productive. — IMD Grid Dispatch')}</p></article><details id="letter-history"><summary>Dispatcher letters (${state.letters.length})</summary><div class="letter-log">${state.letters.slice(1).map(l => `<article><strong>${esc(l.title)}</strong><p>${esc(l.body)}</p></article>`).join('') || '<p class="muted small">New letters arrive every epoch.</p>'}</div></details><a href="#/docs/city-and-swarm-events">Read the event protections →</a></div></div></div></section>`;
}
function seasonPanel() {
  const remaining = Math.max(0, state.season.endsAtEpoch - state.epoch);
  const rows = districtStandings(state);
  return `<div class="season-layout"><section class="panel season-panel"><div class="section-heading"><h2>District leaderboard</h2><span>Season ${state.season.number}</span></div><p class="muted small">Average mining per active farm. One wallet contributes at most ${pct(config.season.walletShareCap)} of its district’s score.</p><ol class="leaderboard">${rows.map(r => `<li class="${r.id === state.season.scoringDistrict ? 'is-you' : ''}"><span>${esc(r.name)}${r.id === state.season.scoringDistrict ? ' · You' : ''}<small>${r.active} active farms</small></span><strong>${num(r.score, 2)}</strong></li>`).join('')}</ol><p class="small muted">Synced mining only. Local simulation with ${config.season.demoFarmCount - 1} rival farms. Beta values, may change.</p></section><div class="season-prizes"><section class="panel"><h2>The week ends in</h2><div class="season-timer"><span id="season-countdown"></span><small>${remaining} epochs · demo time</small></div><p class="deadline">Sync your farm before the week ends to enter the season score.</p><div class="mini-stats"><div><span>Entered score</span><strong>${num(state.season.submittedScore, 2)}</strong></div><div><span>Not yet synced</span><strong>${num(Math.max(0,state.season.farmScore-state.season.submittedScore),2)}</strong></div></div><button class="button full" data-sync>Sync farm &amp; enter score</button></section><section class="panel"><h2>Weekly prizes</h2><dl class="prize-list"><div><dt>Best district</dt><dd>${config.season.districtFreePacks} free pack per qualifying farm</dd></div><div><dt>Lottery</dt><dd>${config.season.lotteryFarms} winners get an Epic or Legendary item<br><span class="small">${state.season.submittedScore > 0 ? 'Your farm is entered.' : 'Sync earned mining to enter.'}</span></dd></div></dl><p class="small muted">${esc(state.season.lastResult || 'Prizes settle at the week’s end. Your first synced mining score enters you.')}</p>${state.season.pendingItems.length ? `<ul class="season-items">${state.season.pendingItems.map(item=>`<li>${itemSprite(item.type,item.rarity)}<span>${item.rarity} ${item.type}</span></li>`).join('')}</ul>` : ''}<button id="season-claim" class="button full" ${!state.season.pendingFreePacks && !state.season.pendingItems.length ? 'disabled' : ''}>Claim rewards · ${state.season.pendingFreePacks} packs / ${state.season.pendingItems.length} items</button></section></div></div>`;
}
function referralPanel() {
  const url = new URL(location.href); url.hash = '/farm'; url.searchParams.set('ref', state.referral.code);
  return `<div class="side-extras"><section class="panel"><h2>Referrals</h2><p class="muted">Referrals earn ${pct(config.referral.miningShare)} of invitees’ mining.</p><label for="referral-link">Your referral link</label><div class="copy-row"><input id="referral-link" value="${esc(url.href)}" readonly><button id="copy-referral" class="button compact">Copy link</button></div><dl class="mini-stats"><div><dt>Invitees</dt><dd>${state.referral.invitees}</dd></div><div><dt>Mining</dt><dd>${num(state.referral.inviteeMining)}</dd></div><div><dt>You earned</dt><dd>${num(state.referral.earned)}</dd></div></dl><p class="small muted">${state.referral.referredBy ? `Referred by ${esc(state.referral.referredBy)}.` : 'Demo referrals stay in this browser; there is no shared backend.'}</p></section><section class="panel nft-panel">${sprite('pack')}<div><h2>Identity MD holder?</h2><p>One free starter pack at launch.</p><p class="small muted">Try the holder benefit locally. No NFT or wallet check is made in demo.</p><button class="button compact" id="nft-starter" ${state.nftStarterClaimed ? 'disabled' : ''}>${state.nftStarterClaimed ? 'Demo holder pack claimed' : 'Try free holder pack'}</button></div></section></div>`;
}
function farm() {
  return `<div class="wrap inner-page">
  <div class="farm-layout"><section class="farm-rooms" aria-labelledby="rooms-title"><div class="section-heading"><h1 id="rooms-title">Mining rooms</h1><span>${state.rooms.length} / ${config.rooms.maximum} owned</span></div><p class="muted small">Six slots. One of each item type.</p>${state.rooms.map(roomPanel).join('')}<section class="room-shop" aria-labelledby="room-shop-title"><h2 id="room-shop-title">Expand your farm</h2><p class="small muted">Buy rooms 2–4 with tokens. Six slots each. Prices below are for this demo.</p>${roomUnlocks(state).filter(r => !r.unlocked).map(r => `<article class="locked-room">${sprite('room')}<div><h3>Room ${r.id + 1}</h3><span>${cost(r.price)} demo tokens</span><button class="button compact" id="buy-room-${r.id}" data-buy-room="${r.id}" ${state.rooms.some(room=>room.id===r.id-1) ? '' : 'disabled'}>${state.rooms.some(room=>room.id===r.id-1) ? `Buy room ${r.id+1}` : `Buy room ${r.id} first`}</button></div></article>`).join('') || '<p>All four rooms are yours.</p>'}<p class="small muted">Includes the demo spending bonus.</p></section><details class="durability-guide" id="durability-guide"><summary>Durability, output &amp; repair</summary><dl>${config.durabilityTiers.map((tier,i)=>`<div><dt>${i===0 ? '80–100%' : i===4 ? 'Below 20%' : `${tier.minimum}–under ${config.durabilityTiers[i-1].minimum}%`}</dt><dd>${tier.output ? `${pct(tier.output)} output` : 'Overheated · off'}</dd></div>`).join('')}</dl><p class="small muted">Repair cost scales with the item’s full-output mining and lost durability. Higher-output items cost more to repair. <a href="#/docs/farm-costs">See the demo formula →</a></p></details></section>${inventoryPanel()}</div></div>`;
}
function wallet() {
  return `<div class="wrap inner-page">${pageHeading('Demo wallet.', 'Your tokens, rewards and invitations. No wallet connection needed.')}<div class="wallet-layout"><section class="panel withdraw-panel"><div class="section-heading"><h2>Balance</h2><span>${num(state.tokens,2)} demo tokens</span></div><p class="small muted">${num(claimable(state),2)} ready to claim in the top bar. ${num(state.ethBalance,3)} simulated ETH for packs.</p><h2>Withdraw</h2><p class="small muted">Tax falls from ${pct(config.economy.withdrawStartTax)} to ${pct(config.economy.withdrawEndTax)} over ${config.economy.withdrawDecayDays} farm days. In-game spending has no withdrawal tax and ${pct(config.economy.spendBonus)} extra buying power.</p><form id="withdraw-form"><label for="withdraw-amount">Amount in demo tokens</label><div class="withdraw-row"><input type="number" inputmode="decimal" id="withdraw-amount" aria-describedby="withdraw-preview" min="0.01" step="0.01" placeholder="10.00" required><button class="button" type="submit">Preview withdrawal</button></div><p class="withdraw-preview" id="withdraw-preview">Enter an amount to see what you receive after tax.</p></form><p class="small muted">Simulated withdrawn: ${num(state.withdrawn)} tokens. No transfer is made.</p><details id="money-accounting"><summary>Where demo fees go</summary><p class="small">Packs, lobbying and the sell surcharge: ${pct(config.allocations.packRewardPool)} reward pool / ${pct(config.allocations.packTeam)} team / ${pct(config.allocations.packHeartbeat)} swarm heartbeat. Demo withdrawals model the sell surcharge. Swap fee at launch: ${pct(config.swap.teamFee)} team + ${pct(config.swap.rewardPoolFee)} reward pool. No team tokens. The team earns ETH from fees. No burns.</p><dl class="tariff-list"><div><dt>Reward pool</dt><dd>${num(state.rewardPoolTokens,2)} tokens</dd></div><div><dt>Team</dt><dd>${num(state.revenue.teamEth,6)} ETH</dd></div><div><dt>Heartbeat</dt><dd>${num(state.revenue.heartbeatTokens,2)} tokens</dd></div></dl><p class="small muted">Repair, overclock and expansion costs, electricity and audit levies fund the reward pool. Token fee shares for the team are converted to simulated ETH at the demo exchange rate. All figures are simulated; beta values, may change.</p></details></section>${referralPanel()}</div></div>`;
}
function demoTools() {
  return `<div class="wrap"><details class="demo-tools" id="demo-tools"><summary>Demo tools</summary><p class="small muted">Fast-forward the city clock or top up practice funds. Preview wear lowers installed items to the next output tier. Clock tools do not sync your farm.</p><div class="actions"><button class="button compact" id="next-epoch">Next epoch</button><button class="button compact" id="advance-day">Advance day</button><button class="button compact" id="preview-wear">Preview next wear tier</button><button class="button compact" id="refill-demo">Refill demo funds</button><button class="button compact" id="simulate-referral">Simulate invitee</button><button class="text-button danger" id="reset">Reset demo</button></div></details></div>`;
}
function gameTopbar() {
  const nextXp = config.xp.levels[state.level] ?? state.xp;
  const ageGate = Object.entries(config.xp.dayGates).find(([level,day]) => Number(level) === state.level + 1 && state.gameDays < day);
  const xpHint = ageGate && state.xp >= nextXp ? `unlocks day ${ageGate[1]}` : `farm day ${Math.floor(state.gameDays)}`;
  const pending = epochsToSync(state);
  return `<div class="game-hud"><div class="game-topbar wrap"><div class="hud-stat"><span>Hashrate</span><strong id="total-hash">${num(isIdle(state) ? 0 : totalHashrate(state))} <small>H/s</small></strong></div><div class="hud-stat"><span>Balance</span><strong id="balance">${num(state.tokens)} <small>demo</small></strong></div><button id="claim" class="button primary claim-button" ${claimable(state) <= 0 ? 'disabled' : ''}>Claim <strong id="unclaimed">${num(claimable(state),2)}</strong></button><div class="epoch-box" id="epoch-clock"><span>Epoch ${state.epoch} <strong id="epoch-timer"></strong></span><small>45s in demo</small></div><div class="level-box"><strong>Level ${state.level}</strong><progress value="${Math.min(state.xp,nextXp)}" max="${Math.max(nextXp,1)}" aria-label="Level XP progress"></progress><span>${num(state.xp,0)} XP · ${xpHint}</span></div><button class="hud-sync" id="sync" data-sync><span class="sync-dot" aria-hidden="true"></span><span id="sync-status">${pending ? `Sync ${pending} epoch${pending === 1 ? '' : 's'}` : 'Synced'}</span><span aria-hidden="true">↻</span></button></div></div>`;
}
function focusFix(kind: string) {
  const damaged = state.inventory.find(i => equippedIds(state).has(i.id) && i.durability >= 20 && i.durability < 80);
  const overheated = state.inventory.find(i => equippedIds(state).has(i.id) && i.durability < 20);
  const el = kind === 'broken' && overheated ? document.getElementById(`slot-${state.rooms.find(r=>r.slots.includes(overheated.id))!.id}-${state.rooms.find(r=>r.slots.includes(overheated.id))!.slots.indexOf(overheated.id)}`) : kind === 'damaged' && damaged ? document.getElementById(`installed-${damaged.id}`)?.querySelector<HTMLElement>('summary') : document.querySelector<HTMLElement>('#inventory-title');
  el?.scrollIntoView({block:'center'}); el?.focus({preventScroll:true});
}
function miningWarnings() {
  const warnings: string[] = [];
  const banner = (text: string, action: string) => `<div class="mining-warning"><p>${text}</p>${action}</div>`;
  if (isIdle(state)) warnings.push(banner('Mining paused: no farm action for 3 days. Earned rewards are safe.', '<button class="button compact" data-sync>Sync &amp; resume</button>'));
  const broken = state.inventory.filter(i => equippedIds(state).has(i.id) && i.durability < 20);
  if (broken.length) warnings.push(banner(`${broken.length} overheated item${broken.length === 1 ? '' : 's'} stopped mining. Repair or remove the hardware.`, '<a class="button compact" href="#/farm" data-fix="broken">Repair overheated items</a>'));
  if (!equippedIds(state).size) warnings.push(banner('Nothing is installed, so your farm cannot mine.', '<a class="button compact" href="#/farm" data-fix="inventory">Install hardware</a>'));
  const event = activeEvent(state);
  if (state.inventory.some(i => equippedIds(state).has(i.id) && i.durability >= 20 && i.durability < 80)) {
    const fireDamage = event?.district === state.district && event.type === 'fire' && state.rooms.some(r => !hasCombo(state,r,'cold') && roomItems(state,r).some(i => i.durability >= 20 && i.durability < 80));
    warnings.push(banner(fireDamage ? 'Server fire damaged your hardware and reduced its mining. Repair the affected items.' : 'Worn hardware is reducing mining. Repair your items to restore output.', '<a class="button compact" href="#/farm" data-fix="damaged">Repair hardware</a>'));
  }
  if (event?.district === state.district) {
    const working = state.rooms.filter(r => roomItems(state,r).some(i => durabilityOutput(i.durability) > 0));
    if (event.type === 'outage' && working.length) warnings.push(banner('Outage: your district is dark this epoch. Off-grid rooms keep half their mining; other rooms stop.', '<a class="button compact" href="#/city">View outage protection</a>'));
    if (event.type === 'theft' && working.some(r => !hasCombo(state,r,'locked'))) warnings.push(banner('Cable theft: unprotected rooms mine at half speed this epoch. Router + Server Rack protects a room.', '<a class="button compact" href="#/farm" data-fix="inventory">Build protection</a>'));
    if (event.type === 'audit' && auditEligibility(state).eligible) warnings.push(banner('Tax audit: 10% of this epoch’s mining goes to the reward pool. Stored balances stay yours.', '<a class="button compact" href="#/city">Lobby the next event</a>'));
  }
  const repairs = state.inventory.filter(i=>i.durability < 100).map(i=>actualSpend(repairCost(i)));
  if (repairs.length && state.tokens < Math.min(...repairs)) warnings.push(banner('Low balance: claim mining or refill demo funds to repair your hardware.', `<button class="button compact" data-fix-funds>${claimable(state) > 0 ? 'Claim mining' : 'Open Demo tools'}</button>`));
  warningKey = warnings.find(w => !dismissedWarnings.has(w)) || '';
  return warningKey ? `<section class="mining-warnings wrap" aria-label="Mining warning">${warningKey}<button id="dismiss-warning" aria-label="Dismiss this warning">×</button></section>` : '';
}
function onboarding() {
  if (guide.dismissed) return '';
  const steps = [
    ['Open a pack', 'Three cards. Your practice funds are ready.'],
    ['Install an item', 'Open an inventory item, choose a room, then select Install item.'],
    ['Wait for the epoch', 'Your hardware mines every 45 seconds. This timer tracks the next epoch.'],
    ['Claim your mining', 'Collect earned mining and add it to your demo balance.']
  ];
  const current = steps[guide.step];
  return `<aside class="coach-mark" id="coach-mark" aria-label="First farm guide"><div class="coach-title"><strong><span>${guide.step+1}/4</span> ${current[0]}</strong><button id="skip-guide" aria-label="Dismiss guide">×</button></div><p>${current[1]}</p><button class="text-button" id="guide-next">${guide.step===3?'Finish guide':'Next tip'} →</button><i class="coach-pointer" aria-hidden="true"></i></aside>`;
}
function highlightGuide() {
  document.querySelectorAll('.guide-highlight').forEach(el => el.classList.remove('guide-highlight'));
  if (guide.dismissed) return;
  const pending = state.pendingPack && !state.pendingPack.revealed.every(Boolean);
  const selector = guide.step === 0 ? route() === 'packs' ? pending ? '[data-reveal]:not(:disabled)' : '#open-pack' : '[data-route="packs"]' : guide.step === 1 ? route() === 'farm' ? '.inventory-item summary' : '[data-route="farm"]' : guide.step === 2 ? '#epoch-clock' : '#claim';
  const target = document.querySelector<HTMLElement>(selector);
  const mark = document.getElementById('coach-mark');
  if (!target || !mark) return;
  // The purchase buttons explain themselves; keep the quote unobscured.
  if (guide.step === 0 && route() === 'packs' && !pending) { mark.hidden = true; return; }
  target.classList.add('guide-highlight');
  const rect = target.getBoundingClientRect();
  const nav = target.closest('.game-nav');
  const below = !(nav && innerWidth <= 600) && rect.bottom + mark.offsetHeight + 20 < innerHeight - (innerWidth <= 600 ? 78 : 16);
  const top = below ? rect.bottom + 10 : rect.top - mark.offsetHeight - 10;
  mark.hidden = rect.bottom < (nav ? 0 : 60) || rect.top > innerHeight || top < 0;
  const left = Math.max(16,Math.min(rect.left,innerWidth - mark.offsetWidth - 16));
  mark.style.left = `${left}px`; mark.style.top = `${top}px`;
  mark.classList.toggle('coach-above', !below);
  mark.style.setProperty('--pointer-x', `${Math.max(16,Math.min(rect.left + rect.width/2 - left, mark.offsetWidth - 20))}px`);
}
function packCards() {
  const pack = state.pendingPack;
  return `<div class="cards" id="cards">${Array.from({length:config.packs.items}, (_, i) => {
    const item = pack?.cards[i]; const revealed = !!pack?.revealed[i];
    if (item && revealed) return `<article class="item-card revealed ${item.rarity.toLowerCase()} ${newlyRevealed === item.id ? 'just-revealed' : ''}"><div class="card-rarity"><span>${item.rarity}</span><span>${String(i + 1).padStart(2, '0')}</span></div><div class="card-art">${itemSprite(item.type, item.rarity, '', item.durability)}${Array.from({length:2 + RARITIES.indexOf(item.rarity) * 3}, (_, k) => `<i class="card-particle" style="--i:${k}" aria-hidden="true"></i>`).join('')}</div><h3>${item.type}</h3><p>${itemDetail(item)}</p><span class="card-added">${lock(item) ? `🔒 Equip at level ${config.rarity[item.rarity].level}` : 'Added to inventory'}</span>${RARITIES.indexOf(item.rarity) >= 2 ? `<div class="share-actions"><a class="button compact" href="${shareIntent(item.type,item.rarity)}" target="_blank" rel="noopener noreferrer">Share on X ↗</a><button class="text-button" data-download-card="${item.id}">Download pixel card ↓</button></div>` : ''}</article>`;
    const next = pack && i === pack.revealed.findIndex(r => !r);
    return `<button class="item-card card-back" id="reveal-${i}" data-reveal="${i}" ${!pack || !next || opening ? 'disabled' : ''} aria-label="Reveal card ${i + 1}"><span class="card-corner">${String(i + 1).padStart(2, '0')}</span>${sprite('bolt')}<span>${pack ? next ? 'Reveal card' : 'Up next' : 'Unknown hardware'}</span></button>`;
  }).join('')}</div>`;
}
function packs() {
  const pending = state.pendingPack && !state.pendingPack.revealed.every(Boolean);
  const full = capacity() < config.packs.items;
  if (currency === 'free' && !state.freePacks) currency = 'tokens';
  return `<div class="wrap inner-page">${pageHeading('Open packs.', 'Three pieces of hardware. A whole new plan.')}
  <div class="pack-lab panel"><div class="pack-stage ${opening ? 'opening' : ''}"><div class="subheading"><span>Hardware pack</span><span class="badge">3 soulbound items</span></div><div class="pack-orbit"><div class="orbit-line"></div><span class="spark spark-a">+</span><span class="spark spark-b">+</span><div class="pack-sprite" id="pack-art">${sprite('pack', 'big-pack')}<div class="pack-seal" aria-hidden="true"></div></div><div class="light-burst" aria-hidden="true"></div></div>
  <div class="live-price"><span>Demo pack price <i aria-hidden="true"></i></span><strong><span id="pack-price">${cost(tokenPackPrice(state))}</span> <small>tokens</small></strong><span class="small muted">Token discount and spending bonus included</span></div>
  <button id="open-pack" class="button primary full" ${pending || full || opening ? 'disabled' : ''}>${opening ? 'Breaking the seal…' : pending ? 'Reveal your cards below' : full ? 'Make inventory space' : 'Buy with tokens →'}</button>
  <button id="buy-pack-eth" class="button full" ${pending || full || opening ? 'disabled' : ''}>Buy with ETH · <span id="eth-pack-price">${num(packPrice(state),5)}</span></button>
  ${state.freePacks ? `<button id="open-free-pack" class="button full" ${pending || full || opening ? 'disabled' : ''}>Use free demo pack (${state.freePacks})</button>` : ''}
  <p id="pack-payment" class="small muted">${paymentText()}</p><p class="small muted">${num(state.tokens)} demo tokens · ${num(state.ethBalance, 3)} demo ETH<br>${capacity()} inventory slots free</p>${full && !pending ? '<a href="#/farm" class="warning small">Install, scrap or expand inventory to open a pack.</a>' : ''}</div>
  <div class="reveal-area"><div class="section-heading"><h2>Break the seal.</h2><span>Pack ${String(state.pendingPack ? state.totalPacks : state.totalPacks + 1).padStart(3, '0')}</span></div><p id="reveal-help" class="muted">${pending ? 'Your pack is ready. Reveal each card or reveal them all.' : state.pendingPack ? 'Hardware secured. Install it, combine it, make it work.' : 'Open a pack, then reveal your hardware one card at a time.'}</p>${packCards()}<div class="reveal-bottom"><p class="small muted">${pending ? 'Your cards are saved if you leave this page.' : 'Items mine better together. Find a combo.'}</p>${pending ? `<button class="button compact" id="reveal-all" ${opening ? 'disabled' : ''}>Reveal all</button>` : '<a class="button compact" href="#/farm">Build your farm →</a>'}</div><div class="odds"><h3>Know your odds.</h3><div>${RARITIES.map(r => `<span class="${r.toLowerCase()}"><b>${r}</b> ${pct(config.rarity[r].odds)}</span>`).join('')}</div><p class="small muted">Mythic drops begin at level ${config.rarity.Mythic.level}. Before then, Mythic rolls become Common (${pct(config.rarity.Common.odds + config.rarity.Mythic.odds)}). Each item type has equal odds.</p></div></div></div>
  <div class="pack-explainer"><section class="panel"><h2>Pack pricing</h2><p>Packs are bought with the game token. Buy with ETH handles the purchase in one click; here it uses simulated ETH. Demand pushes the price up. Quiet epochs bring it down. Token packs cost ${pct(config.packs.tokenDiscount)} less, with another ${pct(config.economy.spendBonus)} in-game buying bonus.</p><p class="muted small">No purchase quantity limit. Each pack needs ${config.packs.items} free inventory slots. Prices and balances here are simulated.</p></section><section class="panel"><h2>Build a combo.</h2><p>Hardware gets stronger in the right company. Six slots. No duplicate types. Up to +${pct(config.combos.hashCap)} room hash.</p><details id="pack-combo-guide"><summary>Open the combo guide</summary>${comboList({id:0,slots:[],overclock:0}, true)}</details><a href="#/docs/items-and-rarity">Explore all 12 item types →</a></section></div></div>`;
}
function paymentText() {
  return currency === 'tokens' ? `${cost(tokenPackPrice(state))} demo tokens · or use Buy with ETH. No real payment.` : currency === 'free' ? 'Uses one free pack credit. No funds charged.' : `${num(packPrice(state), 5)} simulated ETH. No real payment.`;
}
function timerText(seconds: number) {
  const n = Math.max(0, Math.ceil(seconds)); return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
}
function updateLive() {
  const remaining = Math.max(0, state.nextEventAt - Date.now());
  document.querySelectorAll('#epoch-timer, #city-timer').forEach(timer => { timer.textContent = timerText(remaining / 1000); });
  const season = document.querySelector('#season-countdown'); if (season) season.textContent = timerText(((state.season.endsAtEpoch - state.epoch - 1) * config.demo.eventIntervalMs + remaining) / 1000);
  const price = document.querySelector('#pack-price'); if (price) price.textContent = cost(tokenPackPrice({...state, updatedAt:Date.now()}));
  const ethPrice = document.querySelector('#eth-pack-price'); if (ethPrice) ethPrice.textContent = num(packPrice({...state, updatedAt:Date.now()}),5);
  const payment = document.querySelector('#pack-payment'); if (payment) payment.textContent = paymentText();
  $('#storage-warning').hidden = !state.storageWarning; $('#storage-warning').textContent = state.storageWarning;
}
function render(focusPage = false) {
  const focused = document.activeElement?.id;
  const installedSelection = selectedItem ? state.rooms.find(room => room.slots.includes(selectedItem)) : undefined;
  const installedSlot = installedSelection ? `slot-${installedSelection.id}-${installedSelection.slots.indexOf(selectedItem)}` : null;
  if (selectedItem && (installedSelection || !findItem(state, selectedItem))) selectedItem = null;
  const opened = [...document.querySelectorAll<HTMLDetailsElement>('main details[open]')].map(d => d.id);
  const preservedInputs = [...document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('main input[id], main select[id]')].map(el => ({id:el.id,value:el.value}));
  const page = route();
  if (!guide.dismissed && guide.step === 2 && guide.waitEpoch >= 0 && state.epoch > guide.waitEpoch) { guide.step = 3; saveGuide(); }
  document.body.dataset.page = page;
  document.body.classList.toggle('motion-off', !motion);
  document.querySelectorAll('[data-route]').forEach(a => a.getAttribute('data-route') === page ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  const content = page === 'home' ? landing() : page === 'farm' ? farm() : page === 'packs' ? packs() : page === 'city' ? `<div class="wrap inner-page">${pageHeading('The city.', 'Eight districts. One unpredictable power grid.')}${cityPanel()}</div>` : page === 'season' ? `<div class="wrap inner-page">${pageHeading('This week.', 'Keep mining. Give your district a chance.')}${seasonPanel()}</div>` : page === 'wallet' ? wallet() : page === 'docs' ? `<div class="wrap inner-page docs-page">${renderDocs()}</div>` : `<div class="wrap inner-page">${pageHeading('This district is off-grid.', 'That page does not exist.')}<a class="button primary" href="#/">Back to BLACKOUT</a></div>`;
  const gamePage = ['farm','packs','city','season','wallet','docs'].includes(page);
  $('#main').innerHTML = (gamePage ? gameTopbar() + miningWarnings() + (page === 'docs' ? '' : onboarding()) : '') + content + (gamePage ? demoTools() : '');
  if (observedHud) chromeObserver.unobserve(observedHud);
  observedHud = document.querySelector('.game-hud');
  if (observedHud) chromeObserver.observe(observedHud);
  updateChromeOffsets();
  newlyRevealed = null;
  document.title = page === 'home' ? 'BLACKOUT — Open packs. Mine the city.' : `${page.charAt(0).toUpperCase()+page.slice(1)} — BLACKOUT`;
  document.querySelectorAll<HTMLElement>('main details[id] > summary').forEach(el => { if (!el.id) el.id = `${el.parentElement!.id}-summary`; });
  opened.forEach(id => { const d = document.getElementById(id) as HTMLDetailsElement; if (d) d.open = true; });
  preservedInputs.forEach(({id,value}) => { const el = document.getElementById(id) as HTMLInputElement | null; if (el && value !== undefined) el.value = value; });
  if (document.querySelector('#withdraw-amount')) previewWithdrawal();
  if (focusPage) { $('#main').focus({preventScroll:true}); window.scrollTo(0,0); }
  else if (focused) {
    const previous = document.getElementById(focused);
    const inventoryAction = /^(install|scrap|remove|repair|item)-/.test(focused);
    const replacement = installedSlot ? document.getElementById(installedSlot) : selectedItem ? document.getElementById(`item-${selectedItem}`) : document.getElementById('inventory-filter');
    const target = previous && !(previous instanceof HTMLButtonElement && previous.disabled) ? previous : inventoryAction ? replacement : focused.startsWith('buy-room-') ? document.getElementById(focused.replace('buy-room-', 'room-heading-')) : focused.startsWith('overclock-') ? document.getElementById(focused.replace('overclock-', 'repair-room-')) : null;
    target?.focus({preventScroll:true});
  }
  const warning = [...document.querySelectorAll('.mining-warning p')].map(el => el.textContent).join(' ');
  if (warning !== lastWarning) { $('#mining-status').textContent = warning; lastWarning = warning; }
  updateLive(); highlightGuide();
  syncMotionControls();
  if (state.level > lastLevel) levelFeedback(state.level, motion);
  lastLevel = state.level;
  if (lastEvent !== undefined && state.events[0]?.id !== lastEvent) playSound('event');
  lastEvent = state.events[0]?.id;
  if (claimStart !== null) { claimFeedback(claimStart, state.tokens, motion); claimStart = null; }
  if (pendingFix && page === 'farm') { focusFix(pendingFix); pendingFix = null; }
}
function previewWithdrawal() {
  const field = $<HTMLInputElement>('#withdraw-amount');
  field.removeAttribute('aria-invalid');
  const n = Number(field.value); const tax = withdrawTax(state);
  $('#withdraw-preview').textContent = n > 0 && Number.isFinite(n) ? `Tax ${num(n * tax, 2)} (${pct(tax)}) · You receive ${num(n * (1 - tax), 2)} demo tokens.` : 'Enter an amount to see what you receive after tax.';
}
async function reveal(index: number) {
  const pack = state.pendingPack; if (!pack) return;
  const item = await game.reveal(pack.id, index); state = await game.getFarm(); newlyRevealed = item.id; render();
  playSound('reveal');
  if ((item.rarity === 'Mythic' || item.rarity === 'Legendary') && motion) { document.body.classList.remove('mythic-pull'); void document.body.offsetWidth; document.body.classList.add('mythic-pull'); }
  notify(`${item.rarity} ${item.type} added to your inventory.${lock(item) ? ` Equip at level ${config.rarity[item.rarity].level}.` : ''}`);
  const next = state.pendingPack?.revealed.findIndex(r => !r) ?? -1;
  if (next >= 0) document.getElementById(`reveal-${next}`)?.focus({preventScroll:true});
  else { if (!guide.dismissed && guide.step === 0) { guide.step = 1; saveGuide(); render(); } document.querySelector<HTMLElement>('#guide-action')?.focus({preventScroll:true}); }
}
async function openPack() {
  if (busy) return; busy = true;
  try {
    await game.openPack(currency); playSound('pack'); state = await game.getFarm(); opening = motion; render();
    if (opening) await delay(850);
    opening = false; render();
    if (route() === 'packs') { $('#cards').scrollIntoView({behavior:motion ? 'smooth' : 'instant',block:'center'}); $('#reveal-0').focus({preventScroll:true}); }
    notify('Seal broken. Three cards are ready to reveal.');
  } catch (error) { opening = false; notify(error instanceof Error ? error.message : 'Unable to open pack. Try again.', true); }
  finally { busy = false; }
}

document.addEventListener('click', event => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('button, a'); if (!target) return;
  if (target.classList.contains('skip-link')) { event.preventDefault(); $('#main').focus(); $('#main').scrollIntoView(); return; }
  if (target.classList.contains('docs-back') && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
    event.preventDefault();
    if (location.hash !== '#/docs') history.pushState(null, '', '#/docs');
    $('#docs-contents-title').focus({preventScroll:true});
    $('.docs-contents').scrollIntoView({block:'start',behavior:motion ? 'smooth' : 'instant'});
    return;
  }
  if (target.id === 'dismiss-notice') { $('#notice').hidden = true; return; }
  if (target.id === 'cancel-confirm') { closeConfirm(); return; }
  if (target.id === 'accept-confirm') { const action = confirmAction; closeConfirm(); if (action) void act(action); return; }
  if (target.id === 'motion-toggle' || target.hasAttribute('data-motion-toggle')) { if (motionPreference.matches) return; motion = !motion; syncMotionControls(); return; }
  if (target.id === 'sound-toggle') { const enabled=toggleSound(); target.setAttribute('aria-pressed',String(enabled));target.setAttribute('aria-label',`Sound: ${enabled?'on':'off'}`);target.querySelector('.sound-label')!.textContent=`Sound ${enabled?'on':'off'}`;return; }
  if (target.dataset.hardwareScroll) { document.getElementById('hardware-track')?.scrollBy({left:Number(target.dataset.hardwareScroll)*264,behavior:motion?'smooth':'instant'}); return; }
  if (target.id === 'dismiss-warning') { dismissedWarnings.add(warningKey); render(); return; }
  if (target.dataset.downloadCard) { const item=state.pendingPack?.cards.find(i=>i.id===target.dataset.downloadCard);if(item)void downloadPixelCard(item.type,item.rarity).then(()=>notify('Pixel card downloaded.'),()=>notify('Unable to download the card. Please try again.',true));return; }
  if (busy) return;
  if (target.dataset.sync !== undefined) { void act(() => game.sync(), 'Farm synced. Mining resumed and season score entered.'); return; }
  if (target.id === 'skip-guide') { guide.dismissed = true; saveGuide(); render(); return; }
  if (target.id === 'replay-guide') { guide = { step: 0, dismissed: false, waitEpoch: -1 }; saveGuide(); location.hash = '/packs'; render(); return; }
  if (target.id === 'guide-next') { if (guide.step === 3) guide.dismissed = true; else { guide.step++; if (guide.step === 2) guide.waitEpoch = state.epoch; } saveGuide(); render(); $('#guide-next')?.focus(); return; }
  if (target.id === 'guide-action' && guide.step === 0 && route() === 'packs') { event.preventDefault(); if (state.pendingPack && !state.pendingPack.revealed.every(Boolean)) $('#reveal-all').click(); else void openPack(); return; }
  if (target.id === 'guide-action' && guide.step === 1 && route() === 'farm') { event.preventDefault(); focusFix('inventory'); return; }
  if (target.id === 'guide-action' && guide.step >= 2) { event.preventDefault(); const el = $(guide.step === 2 ? '#epoch-clock' : '#claim'); el.scrollIntoView({block:'center'}); if (guide.step === 3) el.focus(); return; }
  if (target.dataset.fix !== undefined) {
    if (route() === 'farm') { event.preventDefault(); focusFix(target.dataset.fix); }
    else pendingFix = target.dataset.fix;
    return;
  }
  if (target.hasAttribute('data-fix-funds')) { if (claimable(state) > 0) void act(() => game.claim(), 'Mining claimed.'); else { $<HTMLDetailsElement>('#demo-tools').open = true; $('#refill-demo').scrollIntoView({block:'center'}); $('#refill-demo').focus(); } return; }
  if (target.dataset.installItem) {
    selectedItem = target.dataset.installItem;
    const room = Number($<HTMLSelectElement>(`#install-room-${selectedItem}`).value);
    void act(async () => { await game.place(selectedItem!,room); if (!guide.dismissed && guide.step === 1) { guide.step = 2; guide.waitEpoch = state.epoch; saveGuide(); } }, 'Hardware installed. Room combos updated.'); return;
  }
  if (target.dataset.place) { $('#inventory-title').scrollIntoView({block:'center'}); $('#inventory-title').focus({preventScroll:true}); notify('Open a spare item’s menu and choose Install item.'); return; }
  if (target.dataset.unplace) { const [r,i] = target.dataset.unplace.split(',').map(Number); selectedItem = state.rooms.find(room => room.id === r)?.slots[i] ?? null; void act(() => game.unplace(r,i),'Hardware returned to inventory.'); return; }
  if (target.dataset.buyRoom) {
    const id = Number(target.dataset.buyRoom);
    confirm(`Buy room ${id + 1}?`, `Spend ${cost(config.rooms.prices[id])} demo tokens for six more slots. This is an illustrative demo price.`, `Buy room ${id + 1}`, async () => { await game.buyRoom(id); notify(`Room ${id + 1} is ready for hardware.`); }); return;
  }
  if (target.dataset.repairItem) { selectedItem = target.dataset.repairItem; void act(() => game.repairItem(target.dataset.repairItem!),'Hardware repaired.'); return; }
  if (target.dataset.scrapItem) {
    const item = findItem(state,target.dataset.scrapItem); if (!item) return;
    confirm('Scrap this item?',`Permanently remove ${item.rarity} ${item.type} for ${config.rarity[item.rarity].scrap} demo tokens. Beta values, may change.`, 'Scrap item', async () => { await game.scrap(item.id); selectedItem = null; notify('Item scrapped. Tokens added to your balance.'); }); return;
  }
  if (target.dataset.repair) { void act(() => game.repair(Number(target.dataset.repair)),'Room hardware repaired.'); return; }
  if (target.dataset.overclock) {
    const room = state.rooms.find(r => r.id === Number(target.dataset.overclock));
    if (!room || room.overclock >= config.overclock.maximum) return;
    const level = room.overclock + 1;
    const next = { ...room, overclock: level };
    confirm(`Overclock room ${room.id + 1}?`,
      `Level ${room.overclock} → ${level} of ${config.overclock.maximum}. Cost: ${cost(overclockCost(room))} demo tokens, including the ${pct(config.economy.spendBonus)} spending bonus. Cost rises each level.\n\nHash bonus: +${pct(room.overclock * config.overclock.hashPerLevel)} → +${pct(level * config.overclock.hashPerLevel)}.\nWear per item per epoch: ${num(config.mining.durabilityPerEpoch * (1 + room.overclock * config.overclock.extraWearPerLevel), 3)} → ${num(config.mining.durabilityPerEpoch * (1 + level * config.overclock.extraWearPerLevel), 3)} durability.\nExtra power use: +${pct(room.overclock * config.overclock.extraPowerPerLevel)} → +${pct(level * config.overclock.extraPowerPerLevel)}.\nCurrent electricity tariff: ${tariffPct(electricityTariff(state, room))} → ${tariffPct(electricityTariff(state, next))} of mining. Combos and events can change this rate.\n\nBeta values, may change.`,
      `Overclock to level ${level}`, async () => {
        const latest = await game.getFarm();
        if (latest.rooms.find(r => r.id === room.id)?.overclock !== room.overclock) throw new Error('This room changed in another tab. Open the overclock preview again.');
        await game.overclock(room.id); notify('Overclock enabled. Room hash, wear and electricity tariff increased.');
      });
    return;
  }
  if (target.dataset.reveal) { void act(() => reveal(Number(target.dataset.reveal)), undefined, false); return; }
  switch (target.id) {
    case 'claim': void act(async () => { const before = state.tokens; await game.claim(); claimStart = before; if (!guide.dismissed && guide.step === 3) { guide.dismissed = true; saveGuide(); } },'Mining claimed. Your farm is synced.'); break;
    case 'lobby': void act(() => game.lobby(),'Lobbying filed for the next epoch.'); break;
    case 'move-district': void act(() => game.selectDistrict(Number($<HTMLSelectElement>('#district-select').value)),'Demo farm moved.'); break;
    case 'expand': void act(() => game.expandInventory(),`Inventory expanded by ${config.inventory.expansionSlots} slots.`); break;
    case 'next-epoch': void act(() => game.nextEpoch(),'Epoch settled. Read the latest dispatcher letter.'); break;
    case 'advance-day': void act(() => game.advanceDay(),'Advanced one game day: four epochs settled.'); break;
    case 'preview-wear': void act(() => game.previewWear(),'Demo wear applied. Check each item’s output and repair quote on Farm.'); break;
    case 'refill-demo': void act(() => game.refillDemoFunds(),'Demo funds refilled. No real funds added.'); break;
    case 'season-claim': void act(() => game.claimSeasonRewards(),'Season rewards collected.'); break;
    case 'nft-starter': void act(() => game.claimNftStarter(),'Free demo holder pack added. Use free demo pack on the Packs page.'); break;
    case 'simulate-referral': void act(() => game.simulateInviteeEpoch(),'One invitee mining epoch simulated. Referral reward added.'); break;
    case 'copy-referral': {
      const field = $<HTMLInputElement>('#referral-link');
      const fallback = () => { field.focus(); field.select(); notify('Select and copy the referral link from the field.'); };
      if (navigator.clipboard?.writeText) void navigator.clipboard.writeText(field.value).then(() => notify('Referral link copied.'), fallback); else fallback();
      break;
    }
    case 'open-pack': currency = 'tokens'; void openPack(); break;
    case 'buy-pack-eth': currency = 'eth'; void openPack(); break;
    case 'open-free-pack': currency = 'free'; void openPack(); break;
    case 'reveal-all': void act(async () => { for (let i = 0; i < config.packs.items; i++) { if (!state.pendingPack?.revealed[i]) { await reveal(i); if (motion) await delay(400); } } if (route() === 'packs') $('#cards').scrollIntoView({block:'center',behavior:motion ? 'smooth' : 'instant'}); }, undefined, false); break;
    case 'reset': confirm('Reset your demo?', 'Delete this browser’s farm, items, balance and progress, then start with a fresh farm. This cannot be undone.', 'Reset demo', async () => { await game.reset(); selectedItem = null; notify('A fresh farm is ready.'); }); break;
  }
});
document.addEventListener('change', event => {
  const el = event.target as HTMLInputElement;
  if (el.id === 'inventory-filter') { filter = el.value; render(); }
});
document.addEventListener('input', event => { if ((event.target as HTMLElement).id === 'withdraw-amount') previewWithdrawal(); });
document.addEventListener('submit', event => {
  if ((event.target as HTMLElement).id !== 'withdraw-form') return;
  event.preventDefault(); const n = Number($<HTMLInputElement>('#withdraw-amount').value);
  if (!Number.isFinite(n) || n <= 0 || n > state.tokens) { const message = `Enter an amount from 0.01 to ${num(state.tokens,2)} demo tokens.`; notify(message,true); $('#withdraw-amount').setAttribute('aria-invalid','true'); $('#withdraw-preview').textContent = message; $('#withdraw-amount').focus(); return; }
  const tax = withdrawTax(state);
  confirm('Withdraw demo tokens?',`Withdraw ${num(n,2)} tokens. Tax: ${num(n * tax,2)}. You receive ${num(n * (1-tax),2)} demo tokens in the simulated withdrawal counter. No transfer is made.`, 'Withdraw in demo', async () => {
    const latest = await game.getFarm();
    if (withdrawTax(latest) !== tax) throw new Error('The withdrawal tax changed as the farm aged. Preview the withdrawal again.');
    await game.withdraw(n); notify('Demo withdrawal recorded. No real transfer was made.');
  });
});
$<HTMLDialogElement>('#confirm-dialog').addEventListener('cancel', () => { confirmAction = null; });
$<HTMLDialogElement>('#confirm-dialog').addEventListener('close', () => { confirmReturn?.focus(); });
window.addEventListener('hashchange', () => {
  if (location.hash === '#main') { $('#main').focus(); return; }
  render(true);
  if (motion) { $('#main').classList.remove('tab-transition');void $('#main').offsetWidth;$('#main').classList.add('tab-transition'); }
  const section = location.hash.split('/')[2];
  if (route() === 'docs' && section) { const el = document.getElementById(`docs-${section}`); el?.scrollIntoView(); el?.setAttribute('tabindex','-1'); el?.focus({preventScroll:true}); }
});
function syncMotionControls() {
  document.body.classList.toggle('motion-off',!motion);
  const toggle=$<HTMLButtonElement>('#motion-toggle');toggle.disabled=motionPreference.matches;toggle.setAttribute('aria-pressed',String(motion));toggle.textContent=`Animation: ${motion?'on':'off'}`;
  document.querySelectorAll<HTMLButtonElement>('[data-motion-toggle]').forEach(button=>{button.disabled=motionPreference.matches;button.setAttribute('aria-pressed',String(motion));button.innerHTML=`${motion?'Pause city':'City paused'} <span aria-hidden="true">${motion?'Ⅱ':'▷'}</span>`;});
}
motionPreference.addEventListener('change',()=>{motion=!motionPreference.matches;syncMotionControls();});
window.addEventListener('resize',highlightGuide);
window.addEventListener('scroll',highlightGuide,{passive:true});
const ref = new URL(location.href).searchParams.get('ref'); if (ref) { try { await game.captureReferral(ref); state = await game.getFarm(); } catch { /* Invalid referral links never block the demo. */ } }
render();
bootScreen(motion);
initAtmosphere(()=>motion);
if (route() === 'docs' && location.hash.split('/')[2]) document.getElementById(`docs-${location.hash.split('/')[2]}`)?.scrollIntoView();
setInterval(async () => {
  if (busy || $<HTMLDialogElement>('#confirm-dialog').open) return;
  try { const next = await game.getFarm(); const changed = JSON.stringify({...next,updatedAt:0}) !== JSON.stringify({...state,updatedAt:0}); state = next; if (changed && route() !== 'home') render(); updateLive(); }
  catch { /* Actions expose a recoverable error; do not repeat notices every clock tick. */ }
}, 1000);
