import { config } from './config';
import { presentationFor } from './presentation';
import { game } from './game/adapter';
import { activeEvent, COSTS, DISTRICTS, equippedIds, EVENT_LABELS, findItem, itemDetail, itemName, roomHashrate, totalHashrate } from './game/rules';
import { ITEM_TYPES, RARITIES } from './game/types';
import type { GameState, Item, ItemType, Pack, Room, Slot } from './game/types';
import { itemSprite, sprite } from './sprites';

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const esc = (s: string | number) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const number = (n: number, digits = 1) => n.toLocaleString('en-US', {maximumFractionDigits:digits, minimumFractionDigits:digits});
const presentation = presentationFor(game.mode);
const badge = `<span class="badge mode-badge">${presentation.badge}</span>`;
const xLink = (label = 'Follow on X', cls = '') => `<a class="${cls}" href="${config.xUrl}" target="_blank" rel="noopener noreferrer">${label} <span aria-hidden="true">↗</span></a>`;
let state: GameState = await game.getFarm();
let selectedItem: string | null = null;
let filter: ItemType | 'All' = 'All';
let busy = false;
let currentPack: Pack | null = state.pendingPack;
let sound = false;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let motion = !reducedMotion.matches;
let scanlines = true;
let lastEvent = state.events[0]?.id ?? 0;
let lastRoomMarkup = '';
let lastInventoryMarkup = '';
let legendaryReturn: HTMLElement | null = null;

$('#app').innerHTML = `
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header wrap">
    <a class="brand" href="#" aria-label="BLACKOUT home">${sprite('mascot')}<span>BLACKOUT</span></a>
    <nav aria-label="Main navigation"><a href="#packs">${presentation.navLabel}</a><a href="#farm">Your farm</a><a href="#grid">The grid</a><a href="#how">How it works</a></nav>
    <div class="header-end"><span class="mode-label"><i aria-hidden="true"></i> ${presentation.modeLabel}</span>${xLink('X', 'header-x')}</div>
  </header>
  <main id="main">
    <section class="hero" aria-labelledby="hero-title">
      <div class="city-art">${sprite('city')}</div>
      <div class="hero-content wrap">
        <h1 id="hero-title" aria-label="BLACKOUT">BLACK<span class="flicker">O</span>UT</h1>
        <p class="tagline">Mine the city.<br class="mobile-break"> Pray the grid stays on.</p>
        <p class="hero-description">A pixel-art idle mining game.</p>
        <div class="hero-actions"><a class="button primary" href="#packs">${sprite('bolt')}${presentation.openPackInvitation}<span aria-hidden="true">↗</span></a>${xLink('Follow on X', 'button secondary')}</div>
        <p class="hero-note">${presentation.heroDisclosure}</p>
      </div>
      <div class="scene-caption"><span>Robinhood Chain · Coming soon</span><span>Sector 04 / Swarm territory</span></div>
    </section>
      <section id="packs" class="section wrap" aria-labelledby="pack-title">
        <div class="section-heading"><div><h2 id="pack-title"><span class="section-number">01</span> Your next big pull.</h2><p>${presentation.packDescription}</p></div><span class="section-meta">${presentation.packTerms}</span></div>
        <div class="pack-lab panel">
          <div class="pack-stage">
            <div class="pack-stage-top"><span class="badge">Supply drop / 001</span>${badge}</div>
            <div class="pack-orbit"><div class="orbit-line"></div><span class="spark spark-a">+</span><span class="spark spark-b">+</span><span class="spark spark-c">·</span><button id="open-pack-art" class="pack-sprite-button" aria-label="${presentation.openPackInvitation}">${sprite('pack', 'big-pack')}</button><div class="pack-shadow"></div></div>
            <p class="pack-instruction" id="pack-instruction">Select the pack to break the seal.</p>
            <button class="button primary" id="open-pack">${presentation.openPack} <span aria-hidden="true">→</span></button>
            <span class="muted small">${presentation.inventoryNote}</span>
          </div>
          <div class="reveal-area"><div class="panel-heading"><h3>The reveal</h3><span id="pack-count" class="muted small">Your hardware awaits</span></div><div id="cards" class="cards"></div><div class="reveal-bottom"><p id="reveal-help" role="status">Open a pack, then select each card to reveal it.</p><button id="reveal-all" class="button secondary" disabled>Reveal all</button></div><div class="odds" ${presentation.demo ? '' : 'hidden'}><span>Demo rarity odds</span><div><span class="common">● Common <b>70%</b></span><span class="rare">◆ Rare <b>22%</b></span><span class="epic">✦ Epic <b>7%</b></span><span class="legendary">ϟ Legendary <b>1%</b></span></div></div><details class="type-odds" ${presentation.demo ? '' : 'hidden'}><summary>What’s inside a pack?</summary><p>Each card independently rolls its rarity and type: GPU 60%, Cooling 20%, Power supply 12%, Room 8%. All packs use the same demo odds. Your starter GPU is separate.</p></details></div>
        </div>
      </section>
    <div class="grid-ticker"><div class="wrap"><span><span class="status-dot" aria-hidden="true"></span> Grid status: <strong id="ticker-status">operational</strong></span><span>Operator: <strong>IMD swarm</strong></span><span>Next dispatch: <strong id="ticker-time">00:45</strong></span></div></div>
    <div class="wrap main-content">
      <div class="demo-notice"><span>${badge} ${presentation.storageDisclosure}</span><div class="preferences"><button id="motion-toggle" aria-pressed="${motion}">${motion ? 'Pause' : 'Enable'} motion</button><button id="scanline-toggle" aria-pressed="true">CRT on</button><button id="sound-toggle" aria-pressed="false">Sound off</button></div></div>
      <p id="storage-warning" class="warning" role="status" ${state.storageWarning ? '' : 'hidden'}>${esc(state.storageWarning)}</p>
      <section id="farm" class="section" aria-labelledby="farm-title">
        <div class="section-heading"><div><h2 id="farm-title"><span class="section-number">02</span> Your farm</h2><p>Install your hardware. Let the fans do the work.</p></div><span class="section-meta">District 04 · Your farm</span></div>
        <div class="farm-stats"><div><span>Live hashrate</span><strong class="hash-value"><span id="total-hash">0.0</span> <small>H/s</small></strong></div><div><span>Token balance ${badge}</span><strong id="token-balance">150.0</strong></div><div><span>Mined, unclaimed ${badge}</span><strong id="unclaimed">0.0</strong></div><button class="button secondary" id="claim">${presentation.claim}</button></div>
        <div class="farm-layout"><div class="farm-panel panel"><div class="panel-heading"><h3>Your mining rooms</h3><span class="online-indicator" id="farm-status">Ready to install</span></div><p class="farm-hint">Select an inventory item, then a matching slot. Drag-and-drop works too.</p><div id="rooms"></div><div class="electricity"><div><span>Electricity reserve</span><strong id="electricity-value">100%</strong></div><meter id="electricity-meter" min="0" max="100" value="100" aria-label="Electricity reserve">100%</meter><button class="text-button" id="electricity">Refill meter · 15 ${presentation.currency}</button></div></div>
          <div class="inventory-panel panel"><div class="panel-heading"><h3>Inventory</h3><span id="inventory-count" class="badge">1 item</span></div><div class="inventory-filters" role="group" aria-label="Filter inventory">${(['All',...ITEM_TYPES] as const).map(t=>`<button data-filter="${t}" aria-pressed="${t==='All'}">${t==='PSU'?'Power':t}</button>`).join('')}</div><div id="inventory" class="inventory"></div><div class="inventory-actions"><p id="selection-help">A starter GPU is waiting. Select it to get mining.</p><button class="button secondary" id="install" disabled>Install selected item</button><button class="text-button" id="merge" disabled>Merge 3 matching · 20 ${presentation.currency}</button><p class="small muted">Merge uses three spare items of the same type and rarity to make one of the next rarity.</p></div></div>
        </div>
        <details class="farm-rules"><summary>${presentation.upkeepTitle}</summary><div class="rule-columns"><p><strong>GPUs:</strong> Common 10, Rare 28, Epic 80, Legendary 250 H/s at full durability. Cooling adds 2%, 5%, 10%, or 20% by rarity.</p><p><strong>Rooms:</strong> Two base GPU slots, one Cooling and one Power supply slot. Power supplies add 1, 2, 3, or 4 GPU slots. A Room key unlocks a second room.</p><p><strong>Upkeep:</strong> Electricity and durability fall while mining. Overclock adds 25% speed per level, up to level 3, with more wear and power use. ${presentation.upkeepNote}</p></div></details>
      </section>
      <section id="grid" class="section" aria-labelledby="grid-title">
        <div class="section-heading"><div><h2 id="grid-title"><span class="section-number">03</span> The city has a mood.</h2><p>Eight districts. One power grid. An operator with no favorites.</p></div><span class="section-meta">Dispatch every 45 seconds</span></div>
        <div class="grid-layout"><div class="map-panel panel"><div class="panel-heading"><h3>City power grid</h3><span id="grid-countdown" class="badge">Next: 45s</span></div><div id="districts" class="district-map" role="list" aria-label="Eight city districts"></div><div class="map-legend"><span><i class="legend-online"></i> Online</span><span><i class="legend-farm"></i> Your farm</span><span><i class="legend-dark"></i> Offline</span></div><div class="lobby-row"><div><strong id="lobby-status">A word with dispatch?</strong><p>Lobbying lowers your district’s odds of a harmful event. It guarantees nothing.</p></div><button class="button secondary" id="lobby">Lobby the grid<br><span class="small">10 ${presentation.currency}</span></button></div></div>
        <div class="terminal panel"><div class="terminal-bar"><span><i></i><i></i><i></i></span><span>imd://grid-dispatch</span>${sprite('tower')}</div><div class="terminal-content"><div class="terminal-label">Dispatcher letter <span id="letter-number">#000</span></div><div id="latest-letter" aria-live="polite" aria-atomic="true"></div><div class="terminal-cursor" aria-hidden="true">▌</div><details class="letter-log"><summary>Past dispatches <span id="log-count">(0)</span></summary><div id="letter-log"></div></details><p class="terminal-foot">The swarm sees the grid.<br>The grid sees your meter.</p></div></div></div>
      </section>
      <section id="how" class="section" aria-labelledby="how-title"><div class="section-heading"><div><h2 id="how-title"><span class="section-number">04</span> Keep the lights on.</h2></div></div><div class="how-steps">${[
        ['pack','Open packs','Find GPUs, Cooling, Power supplies and Room keys. Better hardware changes everything.'],
        ['gpu','Build & mine','Install your gear. GPUs mine while your room has power and working hardware.'],
        ['bolt','Pay the meter','Electricity and repairs keep you running. At launch, these costs burn the game token.'],
        ['tower','Survive the swarm','Surges, heat waves, blackouts, tax audits. The grid has its own schedule.'],
        ['merge','Upgrade & merge','Overclock your room or merge three matching items. Upgrade costs burn the token.']
      ].map(([art,title,body],i)=>`<article class="how-step"><div class="step-art">${sprite(art as Parameters<typeof sprite>[0])}<span>0${i+1}</span></div><h3>${title}</h3><p>${body}</p></article>`).join('')}</div><div class="fairness-note">${sprite('tower')}<div><h3>Who controls the blackout?</h3><p>${presentation.gridFairness}</p></div></div></section>
      <section class="extras section" aria-labelledby="extras-title"><div class="section-heading"><div><h2 id="extras-title">At launch</h2><p>On the roadmap for launch.</p></div><span class="badge">Coming later</span></div><div class="extras-grid"><article>${sprite('pack')}<div><h3>IMD holders get a head start.</h3><p>A free starter pack for IMD NFT holders at launch.</p></div></article><article>${sprite('gpu')}<div><h3>Bring your neighbors.</h3><p>Invite friends and earn a share of their mining at launch.</p></div></article><article>${sprite('tower')}<div><h3>Pass the inspection.</h3><p>A weekly swarm inspection. The best farm gets a bonus.</p></div></article></div></section>
      <section class="launch-panel" aria-labelledby="launch-title"><div>${sprite('mascot')}<div><h2 id="launch-title">The city is booting up.</h2><p>Coming soon on Robinhood Chain</p></div></div><div class="launch-action"><span id="launch-countdown">Date TBA</span>${xLink('Follow the launch', 'button primary')}</div></section>
    </div>
  </main>
  <footer class="wrap"><div class="footer-top"><a class="brand" href="#">${sprite('mascot')}<span>BLACKOUT</span></a><span>A city run by the IMD swarm.</span>${xLink()}</div><div class="footer-bottom"><p>This is a game, not an investment. At launch, rewards will depend on new players and trading volume, and early players earn more. Only spend what you would spend on a game. ${presentation.valueDisclosure}</p><button id="reset" class="text-button" ${presentation.canReset ? '' : 'hidden'}>Reset demo progress</button></div><p class="footer-fine">${presentation.footerDisclosure}</p></footer>
  <div id="notice" class="notice" role="status" aria-live="polite"><span id="notice-text"></span><button id="dismiss-notice" aria-label="Dismiss notification">×</button></div>
  <dialog id="confirm-dialog" class="confirm-dialog" aria-labelledby="confirm-title" aria-describedby="confirm-body"><h2 id="confirm-title"></h2><p id="confirm-body"></p><div class="dialog-actions"><button id="cancel-confirm" class="button secondary">Cancel</button><button id="accept-confirm" class="button primary"></button></div></dialog>
  <dialog id="legendary-dialog" class="legendary-dialog" aria-labelledby="legendary-title"><div class="legendary-flash" aria-hidden="true"></div><div class="legendary-content"><span class="badge">An anomaly in the grid</span><h2 id="legendary-title">LEGENDARY</h2><div id="legendary-art"></div><p id="legendary-name"></p><p>The swarm noticed that one.</p><button id="close-legendary" class="button primary">Keep the power</button></div></dialog>
`;

function notify(message: string) { $('#notice-text').textContent = message; $('#notice').classList.add('visible'); }
function tone(rare = false) {
  if (!sound) return;
  try {
    const ctx = new AudioContext(); const oscillator = ctx.createOscillator(); const gain = ctx.createGain();
    oscillator.type = 'square'; oscillator.frequency.setValueAtTime(rare ? 880 : 330, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(rare ? 1320 : 660, ctx.currentTime + .13);
    gain.gain.setValueAtTime(.025, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .18);
    oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + .2);
    oscillator.onended = () => { void ctx.close(); };
  } catch { sound = false; $('#sound-toggle').textContent = 'Sound off'; $('#sound-toggle').setAttribute('aria-pressed','false'); }
}
function setMotion() { document.documentElement.classList.toggle('motion-paused',!motion); $('#motion-toggle').textContent = `${motion ? 'Pause' : 'Enable'} motion`; $('#motion-toggle').setAttribute('aria-pressed',String(motion)); }
setMotion();
document.documentElement.classList.toggle('scanlines',scanlines);
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) { motion = false; setMotion(); } });

function renderCards() {
  $('#cards').innerHTML = Array.from({length:3},(_,i)=> {
    const revealed = currentPack?.revealed[i];
    const item = currentPack?.cards[i];
    return revealed && item ? `<div class="item-card revealed ${item.rarity.toLowerCase()}" data-rarity="${item.rarity}"><div class="card-rarity">${esc(item.rarity)} <span aria-hidden="true">${['●','◆','✦','ϟ'][RARITIES.indexOf(item.rarity)]}</span></div><div class="card-art">${itemSprite(item.type)}${Array.from({length:2+RARITIES.indexOf(item.rarity)*4},(_,n)=>`<i class="card-particle" style="--i:${n}"></i>`).join('')}</div><h4>${itemName(item)}</h4><p>${itemDetail(item)}</p><span class="card-added">✓ In inventory</span></div>` : `<button class="item-card card-back" data-reveal="${i}" ${currentPack?'':'disabled'} aria-label="Reveal card ${i+1}"><span class="card-corner">0${i+1}</span>${sprite('bolt')}<span>${currentPack?'Reveal card':'Unrevealed'}</span></button>`;
  }).join('');
  const count = currentPack?.revealed.filter(Boolean).length ?? 0;
  $('#pack-count').textContent = currentPack ? `${count} / 3 revealed` : 'Your hardware awaits';
  $('#reveal-all').toggleAttribute('disabled',!currentPack || count === 3 || busy);
  $('#open-pack').textContent = currentPack && count < 3 ? 'Finish revealing your cards' : `${presentation.openPack} →`;
  $('#open-pack').toggleAttribute('disabled',busy || (!!currentPack && count < 3));
  $('#open-pack-art').toggleAttribute('disabled',busy || (!!currentPack && count < 3));
  $('#reveal-help').textContent = count === 3 ? 'All three items are in your inventory. Install them in your farm below.' : currentPack ? `${count ? `${count} of 3 cards revealed.` : 'Pack opened.'} Select a card to reveal it, or reveal all three.` : 'Open a pack, then select each card to reveal it.';
}

function itemTile(item: Item, equipped: Set<string>) {
  const used=equipped.has(item.id);
  return `<button class="inventory-item ${item.rarity.toLowerCase()} ${selectedItem===item.id?'selected':''}" data-item="${item.id}" draggable="${!used}" aria-pressed="${selectedItem===item.id}" aria-label="${item.rarity} ${itemName(item)}, ${itemDetail(item)}${used?', installed':''}">${itemSprite(item.type)}<span><strong>${itemName(item)}</strong><span class="rarity-name">${item.rarity}</span><small>${itemDetail(item)}</small></span><span class="item-state">${used?'Installed':selectedItem===item.id?'Selected':'+'}</span></button>`;
}
function renderInventory() {
  const equipped = equippedIds(state);
  const visible = state.inventory.filter(i => filter==='All'||i.type===filter);
  const markup = visible.length ? visible.map(i=>itemTile(i,equipped)).join('') : `<p class="empty-state">No items of this type yet.<br>${presentation.emptyInventory}</p>`;
  if (markup !== lastInventoryMarkup) { $('#inventory').innerHTML = markup; lastInventoryMarkup=markup; }
  $('#inventory-count').textContent = `${state.inventory.length} item${state.inventory.length===1?'':'s'}`;
  document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));
  const selected = findItem(state,selectedItem);
  const installed = !!selected && equipped.has(selected.id);
  $('#selection-help').textContent = selected ? `${selected.rarity} ${itemName(selected)} selected.${installed?' Remove it from its slot to move it.':' Select a matching slot or use Install.'}` : 'Select a spare item to install it in your farm.';
  $('#install').toggleAttribute('disabled',!selected||installed);
  const matches = selected ? state.inventory.filter(i=>i.type===selected.type&&i.rarity===selected.rarity&&!equipped.has(i.id)) : [];
  $('#merge').toggleAttribute('disabled',!selected || selected.rarity==='Legendary' || matches.length<3);
  $('#merge').textContent = selected ? `Merge 3 matching (${matches.length} spare) · 20 ${presentation.currency}` : `Merge 3 matching · 20 ${presentation.currency}`;
}
function slotMarkup(r: Room, slot: Exclude<Slot,'room'>, index = 0) {
  const id = slot==='gpu' ? r.gpu[index] : r[slot];
  const item = findItem(state,id);
  const label = slot==='gpu' ? `GPU ${index+1}` : slot==='psu'?'Power supply':'Cooling';
  const selected = findItem(state,selectedItem);
  const compatible = selected && selected.type === ({gpu:'GPU',cooling:'Cooling',psu:'PSU'}[slot]);
  return `<button class="farm-slot ${item?'filled '+item.rarity.toLowerCase():''} ${!item&&compatible?'compatible':''}" data-slot="${slot}" data-room="${r.id}" data-index="${index}" aria-label="${item?`Remove ${item.rarity} ${itemName(item)} from`:'Install in'} room ${r.id+1} ${label}">${item?itemSprite(item.type):`<span class="slot-plus" aria-hidden="true">+</span>`}<span>${item?`${item.rarity} ${label}`:label}</span>${item&&slot==='gpu'?`<meter min="0" max="100" value="${item.durability}" data-durability="${item.id}" aria-label="${item.rarity} GPU durability">${Math.round(item.durability)}%</meter><span class="slot-action">Remove</span>`:item?'<span class="slot-action">Remove</span>':'<span class="slot-action">Empty slot</span>'}</button>`;
}
function renderRooms() {
  const markup = state.rooms.map(r=>`<div class="mining-room"><div class="room-title"><span>Room 0${r.id+1}</span><span><span data-room-hash="${r.id}">${number(roomHashrate(state,r))}</span> H/s</span></div><div class="room-scene"><div class="room-pipes" aria-hidden="true"></div><div class="gpu-slots">${r.gpu.map((_,i)=>slotMarkup(r,'gpu',i)).join('')}</div><div class="utility-slots">${slotMarkup(r,'cooling')}${slotMarkup(r,'psu')}</div></div><div class="room-controls"><button class="text-button" data-repair="${r.id}">Repair GPUs · 12 ${presentation.currency}</button><button class="text-button" data-overclock="${r.id}" ${r.overclock>=3?'disabled':''}>${r.overclock>=3?'Overclock maxed · Lv. 3':`Overclock · Lv. ${r.overclock} → ${r.overclock+1} · ${COSTS.overclock*(r.overclock+1)} ${presentation.currency}`}</button></div></div>`).join('') + (state.rooms.length===1?`<button class="locked-room" data-slot="room" data-room="1" data-index="0">${sprite('room')}<span><strong>Room 02 is locked</strong><span>Select a Room key to unlock it.</span></span><span aria-hidden="true">+</span></button>`:'');
  // Rebuild only after actions; the one-second loop updates numbers in place to preserve focus.
  if (markup!==lastRoomMarkup) { $('#rooms').innerHTML=markup; lastRoomMarkup=markup; }
}
function renderGrid() {
  const event = activeEvent(state);
  $('#districts').innerHTML = DISTRICTS.map((d,i)=> {
    const affected = event?.district===i;
    const offline = affected&&event.type==='blackout';
    return `<div class="district ${i===state.district?'your-district':''} ${offline?'district-offline':''} ${affected?'district-affected':''}" role="listitem"><div><span>0${i+1}</span><span class="district-state">${offline?'Offline':affected?EVENT_LABELS[event.type]:'Online'}</span></div><div class="district-buildings" aria-hidden="true">${sprite('district')}</div><strong>${d}</strong>${i===state.district?`<span class="farm-pin">${state.lobbied?'✓ Lobbied':'⌂ Your farm'}</span>`:''}</div>`;
  }).join('');
  $('#lobby-status').textContent = state.lobbied?'Request logged for the next event.':'A word with dispatch?';
  $('#lobby').toggleAttribute('disabled',state.lobbied);
  $('#lobby').innerHTML = state.lobbied ? 'District lobbied ✓' : `Lobby the grid<br><span class="small">10 ${presentation.currency}</span>`;
  const letter=state.letters[0];
  $('#letter-number').textContent = `#${String(letter.id).padStart(3,'0')}`;
  $('#latest-letter').innerHTML = `<h3>${esc(letter.title)}</h3><p>${esc(letter.body)}</p><time datetime="${new Date(letter.at).toISOString()}">${new Date(letter.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})} · Local grid time</time>`;
  $('#log-count').textContent = `(${Math.max(0,state.letters.length-1)})`;
  $('#letter-log').innerHTML = state.letters.slice(1).map(l=>`<article><strong>#${String(l.id).padStart(3,'0')} · ${esc(l.title)}</strong><p>${esc(l.body)}</p></article>`).join('') || '<p>No earlier letters. Dispatch arrives every 45 seconds.</p>';
}
function updateCounters() {
  const rate=totalHashrate(state);
  $('#total-hash').textContent=number(rate);
  $('#token-balance').textContent=number(state.tokens);
  $('#unclaimed').textContent=number(state.unclaimed);
  $('#claim').toggleAttribute('disabled',state.unclaimed<.01);
  $('#electricity-value').textContent=`${number(state.electricity,0)}%`;
  $('#electricity-meter').setAttribute('value',String(state.electricity));
  $('#electricity').toggleAttribute('disabled',state.electricity>=100);
  $('#farm-status').textContent = rate>0?'● Mining':equippedIds(state).size?'○ Mining paused':'Ready to install';
  const secs = Math.max(0,Math.ceil((state.nextEventAt-Date.now())/1000));
  $('#grid-countdown').textContent=`Next: ${secs}s`;
  $('#ticker-time').textContent=`00:${String(secs).padStart(2,'0')}`;
  const event=activeEvent(state);
  $('#ticker-status').textContent=event?`${EVENT_LABELS[event.type].toLowerCase()} / district ${String(event.district+1).padStart(2,'0')}`:'operational';
  state.rooms.forEach(r=> { const el=document.querySelector(`[data-room-hash="${r.id}"]`); if(el)el.textContent=number(roomHashrate(state,r)); });
  state.inventory.forEach(i=>document.querySelector(`[data-durability="${i.id}"]`)?.setAttribute('value',String(i.durability)));
  const date: string = config.launchDate;
  if(date) {
    const timestamp = Date.parse(date);
    const seconds = Math.max(0,Math.floor((timestamp-Date.now())/1000));
    $('#launch-countdown').textContent = Number.isFinite(timestamp) ? seconds ? `${Math.floor(seconds/86400)}d ${Math.floor(seconds/3600)%24}h ${Math.floor(seconds/60)%60}m ${seconds%60}s` : 'Launch window reached · Follow X for status' : 'Date TBA';
  }
  $('#storage-warning').hidden=!state.storageWarning;
  $('#storage-warning').textContent=state.storageWarning;
}
async function refresh(full = true) {
  const previous=activeEvent(state)?.id;
  state=await game.getFarm();
  if(selectedItem&&!findItem(state,selectedItem)) selectedItem=null;
  if(full) { renderRooms(); renderInventory(); renderGrid(); }
  else if(previous!==activeEvent(state)?.id || lastEvent!==(state.events[0]?.id??0)) renderGrid();
  if(lastEvent!==(state.events[0]?.id??0)) {
    lastEvent=state.events[0]?.id??0;
    if(state.events[0]) notify(`New dispatcher letter: ${EVENT_LABELS[state.events[0].type]}. District ${state.events[0].district+1}.`);
  }
  updateCounters();
}
async function action(fn: () => Promise<unknown>, message?: string) {
  if(busy)return;
  const previousPack = currentPack;
  const trigger = document.activeElement as HTMLElement;
  const attributes = ['data-slot','data-room','data-index','data-repair','data-overclock','data-item'];
  const focusSelector = trigger.id ? `#${trigger.id}` : attributes.filter(a=>trigger.hasAttribute(a)).map(a=>`[${a}="${trigger.getAttribute(a)}"]`).join('');
  busy=true;
  try { await fn(); await refresh(); if(message)notify(message); }
  catch(error) { notify(error instanceof Error?error.message:'Something went wrong. Try the action again.'); }
  finally {
    busy=false;
    if(previousPack!==currentPack)renderCards();
    if(!trigger.isConnected && focusSelector) (document.querySelector<HTMLElement>(focusSelector)??$('#rooms button')).focus({preventScroll:true});
  }
}
async function openPack() {
  if(busy||(currentPack&&!currentPack.revealed.every(Boolean)))return;
  let opened = false;
  busy=true;
  $('#open-pack-art').classList.add('shaking');
  $('#open-pack').textContent='Breaking the seal…';
  $('#open-pack').setAttribute('disabled',''); $('#open-pack-art').setAttribute('disabled','');
  try {
    currentPack=await game.openPack();
    if(motion&&!reducedMotion.matches) await new Promise(resolve=>setTimeout(resolve,550));
    tone();
    $('.pack-orbit').classList.add('bursting');
    setTimeout(()=>$('.pack-orbit').classList.remove('bursting'),700);
    opened = true;
    $('#notice').classList.remove('visible');
  } catch(e) { notify(e instanceof Error?e.message:'Unable to open this pack. Try again.'); }
  finally {
    busy=false; $('#open-pack-art').classList.remove('shaking'); renderCards();
    if(opened) {
      $('#cards').scrollIntoView({block:'center',behavior:motion&&!reducedMotion.matches?'smooth':'instant'});
      document.querySelector<HTMLButtonElement>('[data-reveal]')?.focus({preventScroll:true});
    }
  }
}
function showLegendary(item: Item) {
  legendaryReturn=document.querySelector<HTMLElement>('[data-reveal]')??$('#open-pack');
  $('#legendary-art').innerHTML=itemSprite(item.type);
  $('#legendary-name').textContent=`${itemName(item)} · ${itemDetail(item)}`;
  $('#legendary-dialog').classList.toggle('no-flash',!motion||reducedMotion.matches);
  if(!$<HTMLDialogElement>('#legendary-dialog').open)$<HTMLDialogElement>('#legendary-dialog').showModal();
  tone(true);
}
async function reveal(indices: number[]) {
  if(!currentPack||busy)return;
  busy=true;
  let legendary: Item|undefined;
  try {
    for(const index of indices) {
      if(currentPack.revealed[index])continue;
      const item=await game.reveal(currentPack.id,index);
      currentPack.revealed[index]=true;
      if(item.rarity==='Legendary')legendary=item;
    }
    tone(); await refresh();
  } catch(e) { notify(e instanceof Error?e.message:'Unable to reveal this card. Try again.'); }
  finally {
    busy=false; renderCards();
    if(legendary)showLegendary(legendary);
    else (document.querySelector<HTMLButtonElement>('[data-reveal]') ?? $<HTMLButtonElement>('#open-pack')).focus({preventScroll:true});
  }
}
async function installSelected() {
  const item=findItem(state,selectedItem);
  if(!item) { notify('Select an inventory item first.'); return; }
  if(item.type==='Room') { await game.place(item.id,1,'room'); return; }
  const slot = ({GPU:'gpu',Cooling:'cooling',PSU:'psu'} as const)[item.type];
  const available=state.rooms.find(r=>slot==='gpu'?r.gpu.some(id=>!id):!r[slot]);
  if(!available)throw new Error('No empty matching slot. Remove an installed item or add a Power supply or Room first.');
  await game.place(item.id,available.id,slot,slot==='gpu'?available.gpu.indexOf(null):0);
}
let confirmAction: (()=>Promise<unknown>)|null = null;
let confirmReturn: HTMLElement|null=null;
function confirm(title:string,body:string,label:string,fn:()=>Promise<unknown>) {
  confirmAction=fn; confirmReturn=document.activeElement as HTMLElement;
  $('#confirm-title').textContent=title; $('#confirm-body').textContent=body; $('#accept-confirm').textContent=label;
  $<HTMLDialogElement>('#confirm-dialog').showModal(); $('#cancel-confirm').focus();
}

document.addEventListener('click',event=> {
  const target=(event.target as Element).closest<HTMLElement>('button');
  if(!target||target.hasAttribute('disabled'))return;
  const data=target.dataset;
  if(data.reveal!==undefined) { void reveal([Number(data.reveal)]); return; }
  if(data.filter) { filter=data.filter as typeof filter; renderInventory(); return; }
  if(data.item) { selectedItem=data.item; renderInventory(); renderRooms(); document.querySelector<HTMLButtonElement>(`[data-item="${data.item}"]`)?.focus({preventScroll:true}); return; }
  if(data.slot) {
    const slot=data.slot as Slot, r=state.rooms[Number(data.room)], index=Number(data.index);
    const occupied=slot!=='room'&&(slot==='gpu'?r.gpu[index]:r[slot]);
    void action(()=>occupied?game.unplace(r.id,slot as Exclude<Slot,'room'>,index):game.place(selectedItem??'',Number(data.room),slot,index),occupied?'Item returned to inventory.':'Hardware installed.'); return;
  }
  if(data.repair) { void action(()=>game.repair(Number(data.repair)),`GPUs repaired. 12 ${presentation.currency} spent.`); return; }
  if(data.overclock) { void action(()=>game.overclock(Number(data.overclock)),'Overclock upgraded. Speed, power use and wear increased.'); return; }
  const handlers: Record<string,()=>void> = {
    'open-pack':()=>void openPack(), 'open-pack-art':()=>void openPack(), 'reveal-all':()=>void reveal([0,1,2]),
    install:()=>void action(installSelected,'Item installed in your farm.'), claim:()=>void action(()=>game.claim(),presentation.claimed),
    electricity:()=>void action(()=>game.payElectricity(),`Electricity refilled. 15 ${presentation.currency} spent.`), lobby:()=>void action(()=>game.lobby(),'District lobbied for the next event. No outcome is guaranteed.'),
    'motion-toggle':()=>{motion=!motion;setMotion();}, 'scanline-toggle':()=>{scanlines=!scanlines;document.documentElement.classList.toggle('scanlines',scanlines);target.textContent=`CRT ${scanlines?'on':'off'}`;target.setAttribute('aria-pressed',String(scanlines));},
    'sound-toggle':()=>{sound=!sound;target.textContent=`Sound ${sound?'on':'off'}`;target.setAttribute('aria-pressed',String(sound));tone();},
    'dismiss-notice':()=>$('#notice').classList.remove('visible'),
    reset:()=>{ if(presentation.canReset) confirm('Reset your demo?','This removes all packs, inventory and farm progress saved in this browser. You’ll start again with a starter GPU and 150 DEMO tokens.','Reset demo',async()=>{await game.reset();currentPack=null;selectedItem=null;filter='All';lastEvent=0;notify('Demo reset. Your starter GPU is ready.');}); },
    merge:()=> {
      const item=findItem(state,selectedItem); if(!item)return;
      const equipped=equippedIds(state);
      const ids=state.inventory.filter(i=>i.type===item.type&&i.rarity===item.rarity&&!equipped.has(i.id)).slice(0,3).map(i=>i.id);
      confirm('Merge your hardware?',`Spend 20 ${presentation.currency} and consume three spare ${item.rarity} ${itemName(item)} items to receive one ${RARITIES[RARITIES.indexOf(item.rarity)+1]} item of the same type.`,'Merge 3 items',async()=>{const upgraded=await game.merge(ids);selectedItem=upgraded.id;notify(`Merged into a ${upgraded.rarity} ${itemName(upgraded)}.`);});
    },
    'cancel-confirm':()=>$<HTMLDialogElement>('#confirm-dialog').close(),
    'accept-confirm':()=>{const fn=confirmAction;$<HTMLDialogElement>('#confirm-dialog').close();if(fn)void action(fn);},
    'close-legendary':()=>$<HTMLDialogElement>('#legendary-dialog').close()
  };
  handlers[target.id]?.();
});
$<HTMLDialogElement>('#confirm-dialog').addEventListener('close',()=>confirmReturn?.focus({preventScroll:true}));
$<HTMLDialogElement>('#legendary-dialog').addEventListener('close',()=>{ const destination=legendaryReturn?.isConnected?legendaryReturn:$('#open-pack');destination.focus({preventScroll:true}); });
document.addEventListener('dragstart',event=> {
  const item=(event.target as Element).closest<HTMLElement>('[data-item]');
  if(item&&event.dataTransfer) { event.dataTransfer.setData('text/plain',item.dataset.item!);event.dataTransfer.effectAllowed='move'; }
});
document.addEventListener('dragover',event=> { if((event.target as Element).closest('[data-slot]')) { event.preventDefault(); if(event.dataTransfer)event.dataTransfer.dropEffect='move'; } });
document.addEventListener('drop',event=> {
  const slot=(event.target as Element).closest<HTMLElement>('[data-slot]');
  if(!slot||!event.dataTransfer)return;
  event.preventDefault(); const itemId=event.dataTransfer.getData('text/plain');
  void action(()=>game.place(itemId,Number(slot.dataset.room),slot.dataset.slot as Slot,Number(slot.dataset.index)),'Hardware installed.');
});
renderCards();renderRooms();renderInventory();renderGrid();updateCounters();
setInterval(()=>{if(!busy)void refresh(false).catch(()=>notify(presentation.updateError));},1000);
