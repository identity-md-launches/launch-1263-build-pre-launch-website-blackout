import { config } from './config';
import { game } from './game/adapter';
import { activeEvent, actualSpend, COSTS, DISTRICTS, equippedIds, EVENT_LABELS, findItem, inventoryUsed, itemDetail, packPrice, roomCombos, roomHashrate, roomUnlocks, tokenPackPrice, totalHashrate, withdrawTax } from './game/rules';
import { RARITIES } from './game/types';
import type { GameState, Item, PackCurrency, Room } from './game/types';
import { itemSprite, sprite } from './sprites';
import { renderDocs } from './docs';

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const esc = (s: string | number) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const num = (n: number, digits = 1) => n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
const pct = (n: number) => `${num(n * 100, n * 100 % 1 ? 1 : 0)}%`;
const xLink = (label = 'Follow on X', cls = '') => `<a class="${cls}" href="${config.xUrl}" target="_blank" rel="noopener noreferrer">${label} <span aria-hidden="true">↗</span></a>`;
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
let state: GameState = await game.getFarm();
let selectedItem: string | null = null;
let filter = 'All';
let currency: PackCurrency = 'eth';
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

$('#app').innerHTML = `
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header wrap">
  <a class="brand" href="#/" aria-label="BLACKOUT home">${sprite('mascot')}<span>BLACKOUT</span></a>
  <nav aria-label="Main navigation"><a href="#/farm" data-route="farm">Farm</a><a href="#/packs" data-route="packs">Open packs</a><a href="#/docs" data-route="docs">Docs</a></nav>
  <span class="mode-label"><i aria-hidden="true"></i>${isDemo ? 'DEMO MODE' : 'CHAIN MODE'}</span>
</header>
<div class="demo-strip"><div class="wrap">${isDemo ? 'No wallet. No real money. Progress saved in this browser.' : 'Farm state is provided by the connected game adapter.'}<span>Beta values, may change</span></div></div>
<div id="storage-warning" class="wrap warning" hidden></div>
<main id="main" tabindex="-1"></main>
<footer class="site-footer wrap"><a class="footer-brand" href="#/">BLACKOUT</a><p>A city worth keeping alive.<br><span class="muted">Launching soon on Robinhood Chain.</span></p><div><a href="#/docs">Read the docs</a>${xLink()}<button class="text-button" id="motion-toggle" ${motionPreference.matches ? 'disabled' : ''} aria-pressed="${motion}">Animation: ${motion ? 'on' : 'off'}</button></div><p class="footer-fine">Demo items and tokens have no real value. Launch contracts are not deployed.</p></footer>
<div class="notice" id="notice" hidden><p id="notice-text"></p><button id="dismiss-notice" aria-label="Dismiss message">×</button></div>
<dialog id="confirm-dialog" aria-labelledby="confirm-title" aria-describedby="confirm-body"><div class="dialog-inner"><h2 id="confirm-title"></h2><p id="confirm-body"></p><div class="actions"><button class="button" id="cancel-confirm">Cancel</button><button class="button primary" id="accept-confirm">Confirm</button></div></div></dialog>
<p id="live-status" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></p>
<div class="mythic-flash" aria-hidden="true"></div>`;

function notify(message: string, error = false) {
  $('#notice').hidden = false;
  $('#notice').classList.toggle('error', error);
  $('#notice-text').textContent = message;
  $('#live-status').textContent = message;
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
  } catch (error) { notify(error instanceof Error ? error.message : 'Unable to update the farm. Reload and try again.', true); }
  finally { busy = false; }
}
function hero() {
  return `<section class="landing-hero" aria-labelledby="hero-title"><div class="hero-city">${sprite('city')}</div><div class="hero-copy wrap">
    <h1 id="hero-title">BLACK<span>O</span>UT</h1><p class="tagline">Open packs. Mine the city.<br>Pray the grid stays on.</p><p class="hero-description">A pixel-art idle mining game.</p>
    <div class="hero-actions"><a class="button primary" href="#/farm">Play demo <span aria-hidden="true">→</span></a><a class="button" href="#/docs">Read docs</a>${xLink('Follow on X', 'button quiet')}</div>
    <span class="launch-badge">${sprite('bolt')} Launching soon on Robinhood Chain</span>
  </div><div class="city-caption wrap"><span>Eight districts. One unreliable grid.</span><span>Operated by the IMD swarm</span></div></section>
  <section class="landing-steps wrap" aria-label="How to play"><div>${sprite('pack')}<p><strong>Crack a pack.</strong><br>Find hardware. Chase rare pulls.</p></div><div>${sprite('gpu')}<p><strong>Build your farm.</strong><br>Mix six items. Find your combos.</p></div><div>${sprite('tower')}<p><strong>Weather the swarm.</strong><br>The city changes every epoch.</p></div></section>
  <div class="landing-note wrap"><p>The power is temporary. Your next move is yours.</p><a href="#/docs/what-is-blackout">Meet BLACKOUT <span aria-hidden="true">↗</span></a></div>`;
}
function pageHeading(title: string, description: string, aside = '') {
  return `<div class="page-heading"><div><h1>${title}</h1><p>${description}</p></div>${aside}</div>`;
}
function comboList(room: Room, all = false) {
  const combos = roomCombos(state, room);
  return `<div class="combo-list">${combos.filter(c => all || c.active).map(c => `<div class="combo ${c.active ? 'active' : ''}"><span aria-hidden="true">${c.active ? '✓' : '+'}</span><div><strong>${esc(c.name)}</strong><span>${esc(c.description)}</span>${!c.active ? `<small>Needs: ${esc(c.missing.join(' + '))}</small>` : ''}</div><span class="combo-state">${c.active ? 'Active' : 'Missing'}</span></div>`).join('') || '<p class="muted small">No combos yet. Add compatible hardware to start one.</p>'}</div>`;
}
function roomPanel(room: Room) {
  const combos = roomCombos(state, room).filter(c => c.active);
  const bonus = Math.min(config.combos.hashCap, combos.reduce((sum, c) => sum + c.bonus, 0));
  return `<article class="mining-room"><div class="room-title"><h3>Room ${String(room.id + 1).padStart(2, '0')}</h3><span>${num(roomHashrate(state, room))} H/s</span></div><div class="room-scene"><div class="room-pipes" aria-hidden="true"></div><div class="room-slots">${room.slots.map((id, index) => {
    const item = findItem(state, id);
    return item ? `<button id="slot-${room.id}-${index}" class="farm-slot filled ${item.rarity.toLowerCase()}" data-unplace="${room.id},${index}" aria-label="Remove ${esc(item.rarity)} ${esc(item.type)} from room ${room.id + 1}, slot ${index + 1}">${itemSprite(item.type, item.rarity)}<strong>${esc(item.type)}</strong><span>${esc(item.rarity)}</span><meter min="0" max="100" value="${item.durability}" aria-label="Durability ${num(item.durability)} percent"></meter><small>${num(item.durability)}% · Remove</small></button>` : `<button id="slot-${room.id}-${index}" class="farm-slot ${selectedItem ? 'compatible' : ''}" data-place="${room.id},${index}" aria-label="${selectedItem ? 'Install selected item in' : 'Choose an item for'} room ${room.id + 1}, slot ${index + 1}"><span class="slot-plus" aria-hidden="true">+</span><strong>Slot ${index + 1}</strong><small>${selectedItem ? 'Install item' : 'Empty'}</small></button>`;
  }).join('')}</div></div><div class="room-controls"><button id="repair-${room.id}" class="text-button" data-repair="${room.id}">Repair · ${cost(COSTS.repair)}</button><button id="overclock-${room.id}" class="text-button" data-overclock="${room.id}" ${room.overclock >= config.overclock.maximum ? 'disabled' : ''}>Overclock ${room.overclock}/${config.overclock.maximum} · ${cost(COSTS.overclock * (room.overclock + 1))}</button></div><p class="overclock-hint">Each overclock level: +${pct(config.overclock.hashPerLevel)} hash, +${pct(config.overclock.extraWearPerLevel)} wear and power use.</p><div class="room-combos"><div class="subheading"><strong>Room combos</strong><span>+${num(bonus * 100, 0)}% hash / ${pct(config.combos.hashCap)} cap</span></div>${comboList(room)}<details id="combos-${room.id}"><summary>Find missing combos</summary>${comboList(room, true)}</details></div></article>`;
}
function inventoryPanel() {
  const equipped = equippedIds(state);
  const spares = state.inventory.filter(i => !equipped.has(i.id));
  const shown = spares.filter(i => filter === 'All' || config.items[i.type].tag === filter);
  const selected = state.inventory.find(i => i.id === selectedItem && !equipped.has(i.id));
  if (!selected) selectedItem = null;
  const emptySlots = Math.max(0, state.inventoryCapacity - inventoryUsed(state));
  const matching = selected ? spares.filter(i => i.type === selected.type && i.rarity === selected.rarity) : [];
  return `<aside class="panel inventory-panel" aria-labelledby="inventory-title"><div class="section-heading"><h2 id="inventory-title">Inventory</h2><span>${inventoryUsed(state)} / ${state.inventoryCapacity}</span></div><p class="muted small">Select an item, then an empty room slot.</p><label class="filter-label" for="inventory-filter">Show items <select id="inventory-filter">${['All', 'compute', 'power', 'cooling', 'network', 'infra'].map(t => `<option ${t === filter ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <div class="inventory">${shown.map(i => `<button id="item-${i.id}" class="inventory-item ${i.rarity.toLowerCase()} ${selectedItem === i.id ? 'selected' : ''}" data-item="${i.id}" aria-pressed="${selectedItem === i.id}">${itemSprite(i.type, i.rarity)}<strong>${esc(i.type)}</strong><span>${esc(i.rarity)}</span><small>${lock(i) ? `🔒 Level ${config.rarity[i.rarity].level}` : itemDetail(i)}</small></button>`).join('')}${filter === 'All' ? Array.from({length:emptySlots}, (_, i) => `<div class="inventory-empty" aria-hidden="true"><span>+</span><small>${String(spares.length + i + 1).padStart(2, '0')}</small></div>`).join('') : ''}</div>
    ${!shown.length && filter !== 'All' ? '<p class="empty-state">No items with this tag. Choose All or open a pack.</p>' : ''}
    ${state.pendingPack && !state.pendingPack.revealed.every(Boolean) ? '<p class="small warning">Slots reserved for your unopened cards. <a href="#/packs">Finish revealing the pack.</a></p>' : ''}
    <div class="inventory-selection" id="item-selection">${selected ? `<h3>${esc(selected.rarity)} ${esc(selected.type)}</h3><p class="small muted">${itemDetail(selected)} · ${num(selected.durability)}% durability · ${config.items[selected.type].tag}</p>${lock(selected) ? `<p class="warning small">🔒 Equip at level ${config.rarity[selected.rarity].level}. You are level ${state.level}.</p>` : `<div class="install-row"><label for="install-room">Room</label><select id="install-room">${state.rooms.map(r => `<option value="${r.id}">${String(r.id + 1).padStart(2, '0')}</option>`).join('')}</select><button id="install" class="button primary compact">Install item</button></div>`}<div class="actions"><button id="merge" class="button compact" ${matching.length < config.inventory.mergeCount || selected.rarity === 'Mythic' ? 'disabled' : ''}>Merge ${config.inventory.mergeCount} · ${cost(COSTS.merge)}</button><button id="scrap" class="text-button">Scrap · +${config.rarity[selected.rarity].scrap}</button></div><p class="small muted">Merge needs ${config.inventory.mergeCount} spare items of the same type and rarity. ${matching.length} available.</p>` : '<p class="muted small">Select hardware to install, merge or scrap it. All items are soulbound.</p>'}</div>
    <button class="button full" id="expand">Expand +${config.inventory.expansionSlots} slots · ${cost(config.inventory.expansionCost)} tokens</button><p class="small muted">Costs include the ${pct(config.economy.spendBonus)} in-game spending bonus. No spend tax.</p><a class="text-link" href="#/packs">Find more hardware →</a>
  </aside>`;
}
function cityPanel() {
  const event = activeEvent(state);
  const latest = state.letters[0];
  return `<section class="city-section" aria-labelledby="city-title"><div class="section-heading"><h2 id="city-title">The city never sleeps.</h2><span>8 districts / one grid</span></div><div class="city-layout"><div class="panel map-panel"><div class="section-heading"><h3>District status</h3><span class="badge">${esc(DISTRICTS[state.district])}</span></div><div class="district-map">${DISTRICTS.map((name, i) => `<div class="district ${i === state.district ? 'your-district' : ''} ${(event?.type === 'supply' || event?.district === i) ? 'district-affected' : ''}"><div><span>${String(i + 1).padStart(2, '0')}</span><span>${i === state.district ? 'Your farm' : 'Grid'}</span></div>${sprite('district')}<strong>${name}</strong><small>${(event?.type === 'supply' || event?.district === i) ? EVENT_LABELS[event.type] : 'Online'}</small></div>`).join('')}</div><div class="lobby-row"><div><h3>${state.lobbied ? 'Lobbying filed' : 'Give your district a voice.'}</h3><p class="muted small">Lower the odds of a bad event targeting your district next epoch. No guaranteed protection.</p></div><button class="button compact" id="lobby" ${state.lobbied ? 'disabled' : ''}>Lobby · ${cost(COSTS.lobby)}</button></div><details id="district-choice"><summary>Move demo district</summary><label for="district-select">Choose district</label><select id="district-select">${DISTRICTS.map((name, i) => `<option value="${i}" ${i === state.district ? 'selected' : ''}>${name}</option>`).join('')}</select><button class="button compact" id="move-district">Move farm</button></details></div>
    <div class="panel terminal"><div class="terminal-bar"><span><i></i><i></i><i></i></span><span>Grid dispatch / incoming</span>${sprite('tower')}</div><div class="terminal-content"><div class="subheading"><span>Current event</span><span>${event ? event.type === 'supply' ? 'Citywide' : `District ${event.district + 1}` : 'Standing by'}</span></div><h3 class="event-title">${event ? EVENT_LABELS[event.type] : 'Calm'}</h3><p class="event-protection">${esc(event?.protection || 'Build room combos before the next event arrives.')}</p><article id="latest-letter"><h3>${esc(latest?.title || 'Connection established')}</h3><p>${esc(latest?.body || 'Resident. Your meter is ready. Keep the grid productive. — IMD Grid Dispatch')}</p></article><details id="letter-history"><summary>Dispatcher letters (${state.letters.length})</summary><div class="letter-log">${state.letters.slice(1).map(l => `<article><strong>${esc(l.title)}</strong><p>${esc(l.body)}</p></article>`).join('') || '<p class="muted small">New letters arrive every epoch.</p>'}</div></details><a href="#/docs/city-and-swarm-events">Read the event protections →</a></div></div></div></section>`;
}
function seasonPanel() {
  const remaining = Math.max(0, state.season.endsAtEpoch - state.epoch);
  const rows = state.season.districtScores.map((score, id) => ({score, id})).sort((a, b) => b.score - a.score);
  return `<section class="panel season-panel"><div class="section-heading"><h2>Weekly season</h2><span>Season ${state.season.number}</span></div><p class="muted small">${remaining} epochs left · ${num(remaining * config.epoch.hours / config.epoch.dayHours, 1)} game days</p><div class="season-timer"><span id="season-countdown"></span><small>demo time remaining</small></div><p class="small">Best district: free packs. Lottery: ${config.season.lotteryFarms} farms. Best farm: a token prize.</p><p class="small muted">Local simulation with computer-controlled farms.</p><ol class="leaderboard">${rows.map(r => `<li class="${r.id === state.district ? 'is-you' : ''}"><span>${esc(DISTRICTS[r.id])}${r.id === state.district ? ' · You' : ''}</span><strong>${num(r.score, 0)}</strong></li>`).join('')}</ol><p class="small muted">${esc(state.season.lastResult || 'Keep your farm active to climb the district standings.')}</p><button id="season-claim" class="button full" ${!state.season.pendingFreePacks && !state.season.pendingTokens ? 'disabled' : ''}>Claim season rewards · ${state.season.pendingFreePacks} packs / ${num(state.season.pendingTokens, 0)} tokens</button></section>`;
}
function referralPanel() {
  const url = new URL(location.href); url.hash = '/farm'; url.searchParams.set('ref', state.referral.code);
  return `<div class="side-extras"><section class="panel"><h2>Bring your neighbors.</h2><p class="muted">Referrals earn ${pct(config.referral.miningShare)} of invitees’ mining.</p><label for="referral-link">Your referral link</label><div class="copy-row"><input id="referral-link" value="${esc(url.href)}" readonly><button id="copy-referral" class="button compact">Copy link</button></div><dl class="mini-stats"><div><dt>Invitees</dt><dd>${state.referral.invitees}</dd></div><div><dt>Mining</dt><dd>${num(state.referral.inviteeMining)}</dd></div><div><dt>You earned</dt><dd>${num(state.referral.earned)}</dd></div></dl><p class="small muted">${state.referral.referredBy ? `Referred by ${esc(state.referral.referredBy)}.` : 'Demo referrals stay in this browser; there is no shared backend.'}</p><button id="simulate-referral" class="text-button">Simulate an invitee epoch</button></section><section class="panel nft-panel">${sprite('pack')}<div><h2>Identity MD holder?</h2><p>One free starter pack at launch.</p><p class="small muted">Try the holder benefit locally. No NFT or wallet check is made in demo.</p><button class="button compact" id="nft-starter" ${state.nftStarterClaimed ? 'disabled' : ''}>${state.nftStarterClaimed ? 'Demo holder pack claimed' : 'Try free holder pack'}</button></div></section></div>`;
}
function farm() {
  const nextXp = config.xp.levels[state.level] ?? state.xp;
  return `<div class="wrap inner-page">${pageHeading('Your farm.', 'Keep the rigs running. Give the grid a reason to stay on.', `<a class="button primary" href="#/packs">Open packs <span aria-hidden="true">→</span></a>`)}
  <div class="farm-topline"><div class="level-box"><strong>Level ${state.level}</strong><progress value="${state.xp}" max="${Math.max(nextXp, state.xp, 1)}" aria-label="Account XP"></progress><span>${num(state.xp, 0)}${state.level < config.xp.levels.length ? ` / ${nextXp}` : ''} XP</span></div><div class="epoch-box"><span>Epoch ${state.epoch}</span><strong id="epoch-timer"></strong><span>6h live / 45s demo</span></div></div>
  <div class="farm-stats"><div><span>Farm hashrate</span><strong class="accent" id="total-hash">${num(totalHashrate(state))} <small>H/s</small></strong></div><div><span>Available balance</span><strong id="balance">${num(state.tokens)} <small>DEMO</small></strong></div><div><span>Ready to claim</span><strong id="unclaimed">${num(state.unclaimed)}</strong></div><button id="claim" class="button" ${state.unclaimed <= 0 ? 'disabled' : ''}>Claim tokens →</button></div>
  <div class="farm-layout"><section class="farm-rooms" aria-labelledby="rooms-title"><div class="section-heading"><h2 id="rooms-title">Mining rooms</h2><span>${state.rooms.length} / ${config.rooms.maximum} unlocked</span></div><p class="muted small">Six slots. Any hardware. One of each type per room. Select installed hardware to remove it.</p>${state.rooms.map(roomPanel).join('')}<div class="locked-rooms">${roomUnlocks(state).filter(r => !r.unlocked).map(r => `<div class="locked-room">${sprite('room')}<div><strong>Room ${String(r.id + 1).padStart(2, '0')} · Locked</strong><span>${esc(r.requirement)}</span></div><span aria-hidden="true">🔒</span></div>`).join('')}</div>
  <div class="panel electricity-panel"><div class="section-heading"><h3>Electricity</h3><strong>${num(state.electricity, 0)}%</strong></div><meter min="0" max="${config.electricity.maximum}" value="${state.electricity}" aria-label="Electricity reserve"></meter><div class="lobby-row"><p class="small muted">${pct(config.electricity.tariff)} of mining pays the base tariff. Combos can lower it. Empty reserves stop mining.</p><button id="electricity" class="button compact" ${state.electricity >= config.electricity.maximum ? 'disabled' : ''}>Refill · ${cost(COSTS.electricity)}</button></div></div>
  <section class="panel withdraw-panel"><div class="section-heading"><h2>Withdraw</h2><span id="tax-rate">${pct(withdrawTax(state))} tax</span></div><p class="small muted">Tax falls from ${pct(config.economy.withdrawStartTax)} to ${pct(config.economy.withdrawEndTax)} over ${config.economy.withdrawDecayDays} game days. In-game spending has no tax and ${pct(config.economy.spendBonus)} extra buying power.</p><form id="withdraw-form"><label for="withdraw-amount">Amount in DEMO tokens</label><div class="withdraw-row"><input type="number" inputmode="decimal" id="withdraw-amount" aria-describedby="withdraw-preview" min="0.01" step="0.01" placeholder="10.00" required><button class="button" type="submit">Preview withdrawal</button></div><p class="withdraw-preview" id="withdraw-preview">Enter an amount to see what you receive after tax.</p></form><p class="small muted">Simulated withdrawn: ${num(state.withdrawn)} tokens. No transfer is made.</p></section>
  </section>${inventoryPanel()}</div>${cityPanel()}<div class="community-layout">${seasonPanel()}${referralPanel()}</div>
  <details class="panel demo-tools" id="demo-tools"><summary>Demo controls</summary><p class="small muted">Advance the local clock to explore unlocks, events and seasons. These controls only affect this browser.</p><div class="actions"><button class="button compact" id="next-epoch">Run next epoch</button><button class="button compact" id="advance-day">Advance one game day</button><button class="button compact" id="refill-demo">Refill demo funds</button><button class="text-button danger" id="reset">Reset demo</button></div></details></div>`;
}
function packCards() {
  const pack = state.pendingPack;
  return `<div class="cards" id="cards">${Array.from({length:config.packs.items}, (_, i) => {
    const item = pack?.cards[i]; const revealed = !!pack?.revealed[i];
    if (item && revealed) return `<article class="item-card revealed ${item.rarity.toLowerCase()} ${newlyRevealed === item.id ? 'just-revealed' : ''}"><div class="card-rarity"><span>${item.rarity}</span><span>${String(i + 1).padStart(2, '0')}</span></div><div class="card-art">${itemSprite(item.type, item.rarity)}${Array.from({length:2 + RARITIES.indexOf(item.rarity) * 3}, (_, k) => `<i class="card-particle" style="--i:${k}" aria-hidden="true"></i>`).join('')}</div><h3>${item.type}</h3><p>${itemDetail(item)}</p><span class="card-added">${lock(item) ? `🔒 Equip at level ${config.rarity[item.rarity].level}` : 'Added to inventory'}</span></article>`;
    const next = pack && i === pack.revealed.findIndex(r => !r);
    return `<button class="item-card card-back" id="reveal-${i}" data-reveal="${i}" ${!pack || !next || opening ? 'disabled' : ''} aria-label="Reveal card ${i + 1}"><span class="card-corner">${String(i + 1).padStart(2, '0')}</span>${sprite('bolt')}<span>${pack ? next ? 'Reveal card' : 'Up next' : 'Unknown hardware'}</span></button>`;
  }).join('')}</div>`;
}
function packs() {
  const pending = state.pendingPack && !state.pendingPack.revealed.every(Boolean);
  const full = capacity() < config.packs.items;
  if (currency === 'free' && !state.freePacks) currency = 'eth';
  return `<div class="wrap inner-page">${pageHeading('Open packs.', 'Three pieces of hardware. A whole new plan.')}
  <div class="pack-lab panel"><div class="pack-stage ${opening ? 'opening' : ''}"><div class="subheading"><span>Hardware pack</span><span class="badge">3 soulbound items</span></div><div class="pack-orbit"><div class="orbit-line"></div><span class="spark spark-a">+</span><span class="spark spark-b">+</span><div class="pack-sprite" id="pack-art">${sprite('pack', 'big-pack')}<div class="pack-seal" aria-hidden="true"></div></div><div class="light-burst" aria-hidden="true"></div></div>
  <div class="live-price"><span>Live pack price <i aria-hidden="true"></i></span><strong><span id="pack-price">${num(packPrice(state), 5)}</span> <small>ETH</small></strong><span class="small muted">Simulated · ${num(config.packs.floorEth, 3)} floor / ${num(config.packs.ceilingEth, 3)} ceiling</span></div>
  <fieldset class="currency-picker"><legend>Pay with demo funds</legend><label><input name="currency" type="radio" value="eth" ${currency === 'eth' ? 'checked' : ''}> ETH</label><label><input name="currency" type="radio" value="tokens" ${currency === 'tokens' ? 'checked' : ''}> Tokens · −${pct(config.packs.tokenDiscount)}</label>${state.freePacks ? `<label><input name="currency" type="radio" value="free" ${currency === 'free' ? 'checked' : ''}> Free (${state.freePacks})</label>` : ''}</fieldset>
  <button id="open-pack" class="button primary full" ${pending || full || opening ? 'disabled' : ''}>${opening ? 'Breaking the seal…' : pending ? 'Reveal your cards →' : full ? 'Make inventory space' : 'Open demo pack →'}</button><p id="pack-payment" class="small muted">${paymentText()}</p><p class="small muted">${num(state.ethBalance, 3)} demo ETH · ${num(state.tokens)} tokens<br>${capacity()} inventory slots free · ${state.freePacks} free packs</p>${full && !pending ? '<a href="#/farm" class="warning small">Scrap, merge or expand inventory to open a pack.</a>' : ''}</div>
  <div class="reveal-area"><div class="section-heading"><h2>Break the seal.</h2><span>Pack ${String(state.pendingPack ? state.totalPacks : state.totalPacks + 1).padStart(3, '0')}</span></div><p id="reveal-help" class="muted">${pending ? 'Your pack is ready. Reveal each card or reveal them all.' : state.pendingPack ? 'Hardware secured. Install it, combine it, make it work.' : 'Open a pack, then reveal your hardware one card at a time.'}</p>${packCards()}<div class="reveal-bottom"><p class="small muted">${pending ? 'Your cards are saved if you leave this page.' : 'Items mine better together. Find a combo.'}</p>${pending ? `<button class="button compact" id="reveal-all" ${opening ? 'disabled' : ''}>Reveal all</button>` : '<a class="button compact" href="#/farm">Build your farm →</a>'}</div><div class="odds"><h3>Know your odds.</h3><div>${RARITIES.map(r => `<span class="${r.toLowerCase()}"><b>${r}</b> ${pct(config.rarity[r].odds)}</span>`).join('')}</div><p class="small muted">Mythic drops begin at level ${config.rarity.Mythic.level}. Before then, Mythic rolls become Common (${pct(config.rarity.Common.odds + config.rarity.Mythic.odds)}). Each item type has equal odds.</p></div></div></div>
  <div class="pack-explainer"><section class="panel"><h2>A living price.</h2><p>Demand pushes the price up. Quiet epochs bring it down. Token packs cost ${pct(config.packs.tokenDiscount)} less, with another ${pct(config.economy.spendBonus)} in-game buying bonus.</p><p class="muted small">No purchase quantity limit. Each pack needs ${config.packs.items} free inventory slots. Prices and balances here are simulated.</p><button class="text-button" id="refill-demo">Refill demo funds</button></section><section class="panel"><h2>Build a combo.</h2><p>Hardware gets stronger in the right company. Six slots. No duplicate types. Up to +${pct(config.combos.hashCap)} room hash.</p><details id="pack-combo-guide"><summary>Open the combo guide</summary>${comboList({id:0,slots:[],overclock:0}, true)}</details><a href="#/docs/items-and-rarity">Explore all 12 item types →</a></section></div></div>`;
}
function paymentText() {
  return currency === 'tokens' ? `${cost(tokenPackPrice(state))} DEMO tokens charged · includes 5% spending bonus` : currency === 'free' ? 'Uses one free pack credit. No funds charged.' : `${num(packPrice(state), 5)} simulated ETH. No real payment.`;
}
function timerText(seconds: number) {
  const n = Math.max(0, Math.ceil(seconds)); return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
}
function updateLive() {
  const remaining = Math.max(0, state.nextEventAt - Date.now());
  const timer = document.querySelector('#epoch-timer'); if (timer) timer.textContent = timerText(remaining / 1000);
  const season = document.querySelector('#season-countdown'); if (season) season.textContent = timerText(((state.season.endsAtEpoch - state.epoch - 1) * config.demo.eventIntervalMs + remaining) / 1000);
  const price = document.querySelector('#pack-price'); if (price) price.textContent = num(packPrice({...state, updatedAt:Date.now()}), 5);
  const payment = document.querySelector('#pack-payment'); if (payment) payment.textContent = paymentText();
  $('#storage-warning').hidden = !state.storageWarning; $('#storage-warning').textContent = state.storageWarning;
}
function render(focusPage = false) {
  const focused = document.activeElement?.id;
  const installedSelection = selectedItem ? state.rooms.find(room => room.slots.includes(selectedItem)) : undefined;
  const installedSlot = installedSelection ? `slot-${installedSelection.id}-${installedSelection.slots.indexOf(selectedItem)}` : null;
  if (selectedItem && (installedSelection || !findItem(state, selectedItem))) selectedItem = null;
  const opened = [...document.querySelectorAll<HTMLDetailsElement>('main details[open]')].map(d => d.id);
  const preservedInputs = ['withdraw-amount','install-room','district-select'].map(id => ({id,value:(document.getElementById(id) as HTMLInputElement | null)?.value}));
  const page = route();
  document.body.dataset.page = page;
  document.body.classList.toggle('motion-off', !motion);
  document.querySelectorAll('[data-route]').forEach(a => a.getAttribute('data-route') === page ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  $('#main').innerHTML = page === 'home' ? hero() : page === 'farm' ? farm() : page === 'packs' ? packs() : page === 'docs' ? `<div class="wrap inner-page docs-page">${renderDocs()}</div>` : `<div class="wrap inner-page">${pageHeading('This district is off-grid.', 'That page does not exist.')}<a class="button primary" href="#/">Back to BLACKOUT</a></div>`;
  newlyRevealed = null;
  document.title = `${page === 'home' ? 'BLACKOUT — Open packs. Mine the city.' : `${page === 'farm' ? 'Farm' : page === 'packs' ? 'Open packs' : 'Player guide'} — BLACKOUT`}`;
  document.querySelectorAll<HTMLElement>('main details[id] > summary').forEach(el => { el.id = `${el.parentElement!.id}-summary`; });
  opened.forEach(id => { const d = document.getElementById(id) as HTMLDetailsElement; if (d) d.open = true; });
  preservedInputs.forEach(({id,value}) => { const el = document.getElementById(id) as HTMLInputElement | null; if (el && value !== undefined) el.value = value; });
  if (document.querySelector('#withdraw-amount')) previewWithdrawal();
  if (focusPage) { $('#main').focus({preventScroll:true}); window.scrollTo(0,0); }
  else if (focused) {
    const previous = document.getElementById(focused);
    const inventoryAction = ['install','scrap','merge'].includes(focused) || focused.startsWith('item-');
    const replacement = installedSlot ? document.getElementById(installedSlot) : selectedItem ? document.getElementById(`item-${selectedItem}`) : document.getElementById('inventory-filter');
    const target = previous && !(previous instanceof HTMLButtonElement && previous.disabled) ? previous : inventoryAction ? replacement : null;
    target?.focus({preventScroll:true});
  }
  updateLive();
}
function previewWithdrawal() {
  const field = $<HTMLInputElement>('#withdraw-amount');
  field.removeAttribute('aria-invalid');
  const n = Number(field.value); const tax = withdrawTax(state);
  $('#withdraw-preview').textContent = n > 0 && Number.isFinite(n) ? `Tax ${num(n * tax, 2)} (${pct(tax)}) · You receive ${num(n * (1 - tax), 2)} DEMO tokens.` : 'Enter an amount to see what you receive after tax.';
}
async function reveal(index: number) {
  const pack = state.pendingPack; if (!pack) return;
  const item = await game.reveal(pack.id, index); state = await game.getFarm(); newlyRevealed = item.id; render();
  if (item.rarity === 'Mythic' && motion) { document.body.classList.remove('mythic-pull'); void document.body.offsetWidth; document.body.classList.add('mythic-pull'); }
  notify(`${item.rarity} ${item.type} added to your inventory.${lock(item) ? ` Equip at level ${config.rarity[item.rarity].level}.` : ''}`);
  const next = state.pendingPack?.revealed.findIndex(r => !r) ?? -1;
  if (next >= 0) document.getElementById(`reveal-${next}`)?.focus({preventScroll:true});
  else document.querySelector<HTMLElement>('#open-pack')?.focus({preventScroll:true});
}
async function openPack() {
  if (busy) return; busy = true;
  try {
    await game.openPack(currency); state = await game.getFarm(); opening = motion; render();
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
  if (target.id === 'dismiss-notice') { $('#notice').hidden = true; return; }
  if (target.id === 'cancel-confirm') { closeConfirm(); return; }
  if (target.id === 'accept-confirm') { const action = confirmAction; closeConfirm(); if (action) void act(action); return; }
  if (target.id === 'motion-toggle') { if (motionPreference.matches) return; motion = !motion; target.setAttribute('aria-pressed',String(motion)); target.textContent = `Animation: ${motion ? 'on' : 'off'}`; document.body.classList.toggle('motion-off',!motion); return; }
  if (busy) return;
  if (target.dataset.item) { selectedItem = target.dataset.item; render(); return; }
  if (target.dataset.place) {
    if (!selectedItem) { notify('Select a spare item in your inventory first.'); $('#inventory-title').scrollIntoView({block:'center',behavior:motion ? 'smooth' : 'instant'}); return; }
    const [r, i] = target.dataset.place.split(',').map(Number); void act(() => game.place(selectedItem!,r,i), 'Hardware installed. Room combos updated.'); return;
  }
  if (target.dataset.unplace) { const [r,i] = target.dataset.unplace.split(',').map(Number); void act(() => game.unplace(r,i),'Hardware returned to inventory.'); return; }
  if (target.dataset.repair) { void act(() => game.repair(Number(target.dataset.repair)),'Room hardware repaired.'); return; }
  if (target.dataset.overclock) { void act(() => game.overclock(Number(target.dataset.overclock)),'Overclock enabled. More hash, electricity use and wear.'); return; }
  if (target.dataset.reveal) { void act(() => reveal(Number(target.dataset.reveal)), undefined, false); return; }
  switch (target.id) {
    case 'claim': void act(() => game.claim(),'Mined tokens added to your available balance.'); break;
    case 'install': void act(() => game.place(selectedItem!,Number($<HTMLSelectElement>('#install-room').value)),'Hardware installed. Room combos updated.'); break;
    case 'electricity': void act(() => game.payElectricity(),'Electricity reserve refilled.'); break;
    case 'lobby': void act(() => game.lobby(),'Lobbying filed for the next epoch.'); break;
    case 'move-district': void act(() => game.selectDistrict(Number($<HTMLSelectElement>('#district-select').value)),'Demo farm moved.'); break;
    case 'expand': void act(() => game.expandInventory(),`Inventory expanded by ${config.inventory.expansionSlots} slots.`); break;
    case 'next-epoch': void act(() => game.nextEpoch(),'Epoch settled. Read the latest dispatcher letter.'); break;
    case 'advance-day': void act(() => game.advanceDay(),'Advanced one game day: four epochs settled.'); break;
    case 'refill-demo': void act(() => game.refillDemoFunds(),'Demo funds refilled. No real funds added.'); break;
    case 'season-claim': void act(() => game.claimSeasonRewards(),'Season rewards collected.'); break;
    case 'nft-starter': void act(() => game.claimNftStarter(),'Free demo holder pack added. Use Free on the Open packs page.'); break;
    case 'simulate-referral': void act(() => game.simulateInviteeEpoch(),'One invitee mining epoch simulated. Referral reward added.'); break;
    case 'copy-referral': {
      const field = $<HTMLInputElement>('#referral-link');
      const fallback = () => { field.focus(); field.select(); notify('Select and copy the referral link from the field.'); };
      if (navigator.clipboard?.writeText) void navigator.clipboard.writeText(field.value).then(() => notify('Referral link copied.'), fallback); else fallback();
      break;
    }
    case 'open-pack': void openPack(); break;
    case 'reveal-all': void act(async () => { for (let i = 0; i < config.packs.items; i++) { if (!state.pendingPack?.revealed[i]) { await reveal(i); if (motion) await delay(400); } } if (route() === 'packs') $('#cards').scrollIntoView({block:'center',behavior:motion ? 'smooth' : 'instant'}); }, undefined, false); break;
    case 'merge': {
      const selected = findItem(state,selectedItem); if (!selected) break;
      const ids = state.inventory.filter(i => !equippedIds(state).has(i.id) && i.type === selected.type && i.rarity === selected.rarity).slice(0,config.inventory.mergeCount).map(i => i.id);
      confirm('Merge this hardware?',`Consume ${config.inventory.mergeCount} ${selected.rarity} ${selected.type} items and ${cost(COSTS.merge)} DEMO tokens for one item of the next rarity. This cannot be undone.`, 'Merge items', async () => { const item = await game.merge(ids); selectedItem = item.id; notify(`${item.rarity} ${item.type} created.`); }); break;
    }
    case 'scrap': {
      const item = findItem(state,selectedItem); if (!item) break;
      confirm('Scrap this item?',`Permanently remove ${item.rarity} ${item.type} for ${config.rarity[item.rarity].scrap} DEMO tokens.`, 'Scrap item', async () => { await game.scrap(item.id); selectedItem = null; notify('Item scrapped. Tokens added to your balance.'); }); break;
    }
    case 'reset': confirm('Reset your demo?', 'Delete this browser’s farm, items, balance and progress, then start with a fresh farm. This cannot be undone.', 'Reset demo', async () => { await game.reset(); selectedItem = null; notify('A fresh farm is ready.'); }); break;
  }
});
document.addEventListener('change', event => {
  const el = event.target as HTMLInputElement;
  if (el.id === 'inventory-filter') { filter = el.value; render(); }
  if (el.name === 'currency') { currency = el.value as PackCurrency; render(); }
});
document.addEventListener('input', event => { if ((event.target as HTMLElement).id === 'withdraw-amount') previewWithdrawal(); });
document.addEventListener('submit', event => {
  if ((event.target as HTMLElement).id !== 'withdraw-form') return;
  event.preventDefault(); const n = Number($<HTMLInputElement>('#withdraw-amount').value);
  if (!Number.isFinite(n) || n <= 0 || n > state.tokens) { const message = `Enter an amount from 0.01 to ${num(state.tokens,2)} DEMO tokens.`; notify(message,true); $('#withdraw-amount').setAttribute('aria-invalid','true'); $('#withdraw-preview').textContent = message; $('#withdraw-amount').focus(); return; }
  confirm('Withdraw demo tokens?',`Withdraw ${num(n,2)} tokens. Tax: ${num(n * withdrawTax(state),2)}. You receive ${num(n * (1-withdrawTax(state)),2)} DEMO tokens in the simulated withdrawal counter. No transfer is made.`, 'Withdraw in demo', async () => { await game.withdraw(n); notify('Demo withdrawal recorded. No real transfer was made.'); });
});
$<HTMLDialogElement>('#confirm-dialog').addEventListener('cancel', () => { confirmAction = null; });
$<HTMLDialogElement>('#confirm-dialog').addEventListener('close', () => { confirmReturn?.focus(); });
window.addEventListener('hashchange', () => {
  if (location.hash === '#main') { $('#main').focus(); return; }
  render(true);
  const section = location.hash.split('/')[2];
  if (route() === 'docs' && section) { const el = document.getElementById(`docs-${section}`); el?.scrollIntoView(); el?.setAttribute('tabindex','-1'); el?.focus({preventScroll:true}); }
});
motionPreference.addEventListener('change', () => { motion = !motionPreference.matches; $<HTMLButtonElement>('#motion-toggle').disabled = motionPreference.matches; $('#motion-toggle').setAttribute('aria-pressed',String(motion)); $('#motion-toggle').textContent = `Animation: ${motion ? 'on' : 'off'}`; document.body.classList.toggle('motion-off',!motion); });
const ref = new URL(location.href).searchParams.get('ref'); if (ref) { try { await game.captureReferral(ref); state = await game.getFarm(); } catch { /* Invalid referral links never block the demo. */ } }
render();
if (route() === 'docs' && location.hash.split('/')[2]) document.getElementById(`docs-${location.hash.split('/')[2]}`)?.scrollIntoView();
setInterval(async () => {
  if (busy || $<HTMLDialogElement>('#confirm-dialog').open) return;
  try { const next = await game.getFarm(); const changed = JSON.stringify({...next,updatedAt:0}) !== JSON.stringify({...state,updatedAt:0}); state = next; if (changed && (route() === 'farm' || route() === 'packs')) render(); updateLive(); }
  catch { /* Actions expose a recoverable error; do not repeat notices every clock tick. */ }
}, 1000);
