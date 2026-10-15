import '../../src/style.css';
import './live.css';
import './premium.css';
import './polish.css';
import './gameplay.css';
import { setupGameplay, refreshGameplay, resetGameplay, hudToday } from './gameplay';
import { cached, remember } from './cache';
import { loadPublicPrice, loadPublicTotals, type PublicPrice, type PublicTotals } from './public';
import { publicDashboard } from './public-views';
import { parseUnits, decodeEventLog, type Hex, type Address } from 'viem';
import { landing } from '../../src/landing';
import { initAtmosphere, toggleSound, soundEnabled } from '../../src/effects';
import { config as legacyConfig } from '../../src/config';
import { verifyRegistry, wiringVerified, mismatches, read, errorMessage, client, ABI, addresses } from './chain';
import { loadHome, loadFarm, loadReceipt, type Farm, type Home, type Receipt, KINDS, RARITIES, EVENTS, DISTRICTS, scrapQuote, chainTime } from './data';
import { account, walletAddress, setupWallet, openWallet, switchNetwork, canWrite, tx, txLink, setTx, send, approve, transact, assertWallet, transactionBusy, refreshTransaction } from './wallet';
import { findReceipts } from './receipts';
import { reveal } from './reveal';
import { quoteEthPack, slippageBps } from './packs';
import { docsPage } from './docs';
import { esc, tokens, units, epochCountdown, featureCards, farmPage, packsPage, cityPage, seasonPage, boardsPage, contractsPage, type PackState, type CityState, type SeasonState, type Board } from './views';
import { POLL_MS } from './config';
import { loadActivity, loadLeaderboard, ACTIVITY_CACHE_KEY, LEADERBOARD_CACHE_KEY, type Activity, type Leaderboard } from './community';
import { onboarding, morePage, leaderboardPage, type Progress } from './player-views';
import { placementReason, epochProgress, miningTime, LEVEL_GATES } from './player';
import { refreshUsd, setSpot } from './money';
import { loadEconomy, loadEarningsHistory } from './earnings-data';
import { capacityReason, type EconomySnapshot, type EarningsHistory } from './earnings';
import { miningHud, rewardsView, paybackView } from './rewards-view';
import { waitingOpening, showPulls, updateOpeningWait, pauseOpening, readyOpening } from './pack-opening';
import { animateNumbers } from './juice';
let economy:EconomySnapshot|null=cached<EconomySnapshot>('economy.v2'),history:EarningsHistory|null=null,peek:Farm|null=null,projectionDays=7,calculatorHash=100;
let playerLoading:Promise<void>|null=null;

const $=<T extends HTMLElement=HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
const route=()=>location.hash.replace(/^#\/?/,'').split('/')[0]||'home';
let home:Home|null=cached<Home>('home'),farm:Farm|null=null,city:CityState|null=null,season:SeasonState|null=null,boards:Board[]|null=null,boardWeek=0n;
let revealAnimationUntil=0;
let selectedItem:bigint|null=null,progress:Progress|null=null,activities:Activity[]|null=cached<Activity[]>(ACTIVITY_CACHE_KEY),activityError=false,leaderboard:Leaderboard|null=cached<Leaderboard>(LEADERBOARD_CACHE_KEY);
let publicPrice=cached<PublicPrice>('price'),publicTotals=cached<PublicTotals>('totals');
let publicError=false,homeFresh=false;
let poolTrail:number[]=cached<number[]>('pool-trail')??[];
let globalError='',pageError='',generation=0,lastWallet='',refreshing=false,selectedWeek:bigint|null=null;
const savedPack=cached<Pick<PackState,'quote'|'ethQuote'>>('pack-quote');
let pack:PackState={quote:savedPack?.quote??null,count:1,receipts:null,receiptError:'',eligible:null,eligibilityError:'',priceError:'',ethQuote:savedPack?.ethQuote??null,ethQuoteError:'',slippage:300,result:null,activeReceipt:null};
let motion=!matchMedia('(prefers-reduced-motion: reduce)').matches;
let revealController:AbortController|null=null;
let chosenAction:(()=>Promise<void>)|null=null;
let returnFocus:HTMLElement|null=null;
let renderedRoute='';
let draggingHardware=false,deferredRender=false;
$('.site-header').insertAdjacentHTML('afterend','<aside id="mining-hud" class="mining-hud" aria-label="Mining HUD" hidden></aside>');
$('#main').insertAdjacentHTML('beforebegin',`<section id="registry-warning" class="wrap warning" role="alert" hidden></section>
<section id="tx-status" class="wrap tx-status" aria-label="Transaction status" aria-live="polite" hidden></section>
`);
$('#app').insertAdjacentHTML('afterbegin','<a class="skip-link" href="#main">Skip to content</a>');
$('#app').insertAdjacentHTML('beforeend',`<footer class="site-footer wrap"><a class="footer-brand" href="#/">BLACKOUT</a><p>A city worth keeping alive.<br><span class="muted">Live on Robinhood Chain.</span></p><div><a href="#/more">Explore the city</a><a href="#/docs">Field guide</a><a href="#/docs/risks">Risks</a><a href="#/contracts">Contracts</a><a href="${legacyConfig.xUrl}" target="_blank" rel="noopener noreferrer">Follow on X ↗</a><button class="text-button" data-motion-toggle>Pause animation</button><button class="text-button" data-sound>Sound ${soundEnabled()?'on':'off'}</button></div><p class="footer-connection"><i id="connection-dot" class="status-dot" aria-hidden="true"></i><span id="connection-status" role="status">Reading the city</span><button class="text-button" data-refresh>Refresh</button></p><p class="footer-fine">Real assets. Wallet signatures required. No guaranteed rewards.</p></footer>
<dialog id="wallet-dialog" class="wallet-sheet" aria-labelledby="wallet-title"><div class="sheet-head"><h2 id="wallet-title">Connect a wallet</h2><button data-close-wallet class="close-button" aria-label="Close wallet picker">×</button></div><div id="wallet-rows"></div><p id="wallet-note" class="small" role="status"></p></dialog>
<dialog id="action-dialog" aria-labelledby="action-title"><div class="dialog-inner"><h2 id="action-title"></h2><div id="action-body"></div><section id="action-tx-status" class="dialog-tx-status" aria-label="Transaction progress" aria-live="polite" hidden></section><p id="action-error" class="field-error" role="alert"></p><div class="actions"><button class="button" id="cancel-action">Cancel</button><button class="button primary" id="confirm-action">Confirm</button></div></div></dialog>
<div id="copy-message" class="sr-only" role="status"></div>`);
function reflectMotion() {
 document.body.classList.toggle('motion-off',!motion);
 document.querySelectorAll<HTMLElement>('[data-motion-toggle]').forEach(el=>{el.textContent=motion?'Pause city':'Resume city';el.setAttribute('aria-pressed',String(motion));});
}
function preserveForms() {
 return Array.from(document.querySelectorAll<HTMLInputElement|HTMLSelectElement>('#main input,#main select')).filter(el=>el.id).map(el=>({id:el.id,value:el.value,focused:document.activeElement===el}));
}
function applyInventoryFilter() {
 const value=document.querySelector<HTMLSelectElement>('#inventory-filter')?.value;
 document.querySelectorAll<HTMLElement>('[data-item-equipped]').forEach(row=>row.hidden=value==='installed'?row.dataset.itemEquipped!=='true':value==='spare'?row.dataset.itemEquipped==='true':false);
}
function render(keepForms=false) {
 if(keepForms&&draggingHardware){deferredRender=true;return;}
 const focusId=keepForms?(document.activeElement as HTMLElement|null)?.id:undefined;
 const formValues=keepForms?preserveForms():[];
 const openDetails=keepForms?Array.from(document.querySelectorAll<HTMLDetailsElement>('#main details[open]')).map(d=>d.id).filter(Boolean):[];
 const current=route();document.body.dataset.page=current;
 document.querySelectorAll<HTMLAnchorElement>('[data-route]').forEach(a=>{a.classList.toggle('active',a.dataset.route===current);if(a.dataset.route===current)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 let html='';
 if(current==='home')html=landing();
 else if(current==='farm')html=farmPage(farm,home,pageError,selectedItem&&farm?.items.some(i=>i.id===selectedItem)?selectedItem:null,economy,peek);
 else if(current==='rewards'||current==='wallet')html=rewardsView(farm,home,economy,history,pageError,projectionDays,calculatorHash);
 else if(current==='more')html=morePage(activities,activityError);
 else if(current==='leaderboard')html=leaderboardPage(leaderboard,pageError);
 else if(current==='packs')html=packsPage(pack,home,farm);
 else if(current==='city')html=cityPage(home,city,pageError);
 else if(current==='season')html=seasonPage(home,season,pageError,farm);
 else if(current==='billboards')html=boardsPage(home,boardWeek,boards,pageError);
 else if(current==='contracts')html=contractsPage(wiringVerified,mismatches);
 else if(current==='docs')html=docsPage();
 else html='<div class="wrap live-page"><h1>Page not found</h1><p>That route is not part of the game.</p><a class="button" href="#/">Go home</a></div>';
 if(!(current==='home'&&document.querySelector('#main>.landing-hero')))$('#main').innerHTML=html;
 if(pack.result&&Date.now()>revealAnimationUntil)document.querySelector('.reveal-result')?.classList.add('reveal-seen');
 if(current==='home'&&document.getElementById('feature-cards'))$('#feature-cards').innerHTML=featureCards(home);
 renderPublic();
 formValues.forEach(({id,value,focused})=>{const el=document.getElementById(id) as HTMLInputElement|HTMLSelectElement|null;if(el){el.value=value;if(focused)el.focus({preventScroll:true});}});
 applyInventoryFilter();
 const slippageField=document.querySelector<HTMLInputElement>('#pack-slippage');if(slippageField){try{slippageBps(slippageField.value);}catch(error){slippageField.setAttribute('aria-invalid','true');$('#slippage-error').hidden=false;$('#slippage-error').textContent=errorMessage(error);}}
 openDetails.forEach(id=>{const d=document.getElementById(id) as HTMLDetailsElement|null;if(d)d.open=true;});
 if(focusId)document.getElementById(focusId)?.focus({preventScroll:true});
 const steps=document.getElementById('onboarding');if(steps)steps.innerHTML=account().isConnected&&farm&&!farm.items.some(i=>i.equipped)?onboarding(progress):'';
 reflectMotion();reflectGrid();renderedRoute=current;updateControls();renderStatus();renderEarnings();animateNumbers();
}
function renderEarnings(){
 const hud=$('#mining-hud');hud.hidden=!account().isConnected;const openDetails=Array.from(hud.querySelectorAll<HTMLDetailsElement>('details[open]')).map(d=>d.id);hud.innerHTML=miningHud(farm,home,economy)+hudToday();openDetails.forEach(id=>document.getElementById(id)?.setAttribute('open',''));
 document.body.classList.toggle('has-mining-hud',!hud.hidden);
 document.documentElement.style.setProperty('--hud-height',`${hud.hidden?0:hud.getBoundingClientRect().height}px`);
 const payback=document.getElementById('pack-payback');if(payback&&economy&&publicPrice)payback.innerHTML=paybackView(economy,publicPrice.tokens,farm?.level);
 animateNumbers();
}
async function refreshPlayer(){
 if(playerLoading)return playerLoading;
 const wallet=walletAddress();if(!wallet)return;
 playerLoading=(async()=>{try{
  const value=await loadFarm(wallet);if(wallet!==walletAddress())return;farm=value;remember(`farm.${wallet.toLowerCase()}`,value);
  progress={hasPack:value.paidPacks>0n||value.items.length>0,placed:value.items.some(i=>i.equipped),mining:value.hash>0n&&!!home&&chainTime(home)<Number(home.epochEnd)};
  if(['rewards','wallet'].includes(route())){try{const h=await loadEarningsHistory(value);if(wallet===walletAddress())history=h;}catch{pageError='Your earnings history is reconnecting. Try Refresh.';}}
  void refreshGameplay(value,home);renderEarnings();
 }catch(e){pageError=errorMessage(e);}finally{playerLoading=null;}})();return playerLoading;
}
function renderPublic(){
 const target=document.getElementById(route()==='home'?'home-live':'public-dashboard');
 if(target){const terminal=target.querySelector<HTMLElement>('.terminal-scroll'),scroll=terminal?.scrollTop??0,focused=terminal===document.activeElement;target.innerHTML=publicDashboard(home,publicPrice,publicTotals,activities,leaderboard,{homeFresh,error:!!globalError||publicError||activityError,poolTrail});const next=target.querySelector<HTMLElement>('.terminal-scroll');if(next){next.scrollTop=scroll;if(focused)next.focus({preventScroll:true});}animateNumbers();}
}
function renderStatus() {
 const packReadFailed=route()==='packs'&&(!!pack.priceError||!!pack.ethQuoteError||!!pack.receiptError);
 const reconnecting=!!globalError||!!pageError||activityError||publicError||packReadFailed;
 $('#connection-status').textContent=reconnecting?'Reconnecting · last data kept':homeFresh?'City connected':home?'Saved city data · refreshing':'Reading the city';
 $('#connection-dot').classList.toggle('reconnecting',reconnecting);
 $('#connection-dot').classList.toggle('is-live',homeFresh&&!reconnecting);
 const banner=$('#registry-warning');banner.hidden=!mismatches.length;
 if(mismatches.length)banner.innerHTML='<strong>Contract addresses do not match the registry.</strong><p>Writes are disabled. Review the <a href="#/contracts">contract comparison</a>.</p><button class="button" data-refresh>Retry verification</button>';
}
function reflectGrid(){
 const caption=document.querySelector('.city-caption>span');if(caption&&home?.event[4])caption.textContent=`${EVENTS[home.event[0]]} · ${DISTRICTS[home.event[2]]}`;
 document.querySelectorAll('[data-sky-district]').forEach(el=>el.classList.remove('chain-outage'));
 if(home?.event[4]&&[1,2,3].includes(home.event[0]))document.querySelector(`[data-sky-district="${home.event[2]}"]`)?.classList.add('chain-outage');
}
function updateControls() {
 const allowed=canWrite();
 document.querySelectorAll<HTMLButtonElement>('#main [data-write]').forEach(b=>b.disabled=!allowed||b.dataset.unavailable==='true');
}
function txContent() {
 if(!tx)return '';
 return `<strong>${esc(tx.label)} · ${tx.state==='signature'?'Awaiting wallet':tx.state.charAt(0).toUpperCase()+tx.state.slice(1)}</strong><p>${esc(tx.detail)}</p>${tx.state==='error'||tx.state==='reverted'?'<div class="actions"><button class="button" data-refresh>Refresh & retry</button><a class="button" href="#/farm" data-manage-farm>Manage farm</a></div>':''}${tx.hash?`<a href="${txLink(tx.hash)}" target="_blank" rel="noopener noreferrer">View transaction ↗</a><code>${tx.hash}</code>`:''}`;
}
function updateTx() {
 const el=$('#tx-status');el.hidden=!tx;if(!tx)return;
 el.dataset.state=tx.state;
 el.innerHTML=`<div>${txContent()}${revealController?'<p id="reveal-progress" role="status">Revealing...</p>':''}</div><div>${revealController?'<button class="button" data-stop-reveal>Stop waiting</button>':tx.state==='pending'?'<button class="button" data-check-tx>Check confirmation</button>':'<button class="text-button" data-dismiss-tx>Dismiss</button>'}</div>`;
 if($<HTMLDialogElement>('#action-dialog').open) {
  const status=$('#action-tx-status');status.hidden=false;status.dataset.state=tx.state;status.innerHTML=txContent();
 }
}
async function refreshHome() {
 if(refreshing)return;refreshing=true;
 const phaseKey=(h:Home|null)=>h?`${h.ready}:${h.paused}:${h.endowed}:${h.phases.join(',')}:${h.timestamp>=Number(h.launchTime)+172800}:${h.timestamp>=Number(h.launchTime)+1382400}:${pack.eligible?h.timestamp>=Number(pack.eligible.ends):false}`:'';
 const previous=phaseKey(home),previousError=globalError;
 try {home=await loadHome();remember('home',home);poolTrail=[...poolTrail,Number(home.available)/1e18].slice(-20);remember('pool-trail',poolTrail);homeFresh=true;setSpot(home.spot);globalError='';reflectGrid();try{economy=await loadEconomy(home);remember('economy.v2',economy);}catch{globalError='Earnings signal reconnecting';}renderEarnings();}
 catch(e){globalError=errorMessage(e);}
 finally {refreshing=false;renderStatus();renderPublic();if(route()==='home'){$('#feature-cards').innerHTML=featureCards(home);}else if(route()==='contracts'||previous!==phaseKey(home)||previousError!==globalError)render(true);else updateControls();}
}
async function loadPage(current=route()) {
 const mine=++generation,wallet=walletAddress();pageError='';
 if(current==='city'&&!city)city=cached<CityState>(`city.${wallet??'public'}`);
 if(current==='season'&&!season)season=cached<SeasonState>(`season.${wallet??'public'}`);
 if(current==='billboards'&&!boards){const saved=cached<{boards:Board[];week:bigint}>('boards');if(saved){boards=saved.boards;boardWeek=saved.week;}}
 const valid=()=>mine===generation&&route()===current&&walletAddress()===wallet;
 try {
  if(current==='farm'||current==='wallet'||current==='rewards') {
   if(wallet){if(!farm){farm=cached<Farm>(`farm.${wallet.toLowerCase()}`);history=cached<EarningsHistory>(`earned.${wallet.toLowerCase()}`);if(farm)render(true);}await refreshPlayer();}
   else if(current==='farm'){
    const h=home||await loadHome();const board=await loadLeaderboard(h.epoch);if(board.farms[0]){const top=await loadFarm(board.farms[0].wallet);if(valid())peek=top;}else if(valid())pageError='No active farms on the grid yet.';
   }
  } else if(current==='packs') {
   const jobs=[refreshQuote(false)];
   if(wallet){jobs.push(refreshReceipts(wallet),refreshPlayer());}
   await Promise.allSettled(jobs);
  } else if(current==='leaderboard'){const h=home||await loadHome();const value=await loadLeaderboard(h.epoch);if(valid())leaderboard=value;
  } else if(current==='city') {
   const currentHome=home||await loadHome();
   const [stakes,totals,event,plan,letter,locks,lockQuote,lobbyQuote]=await Promise.all([
    Promise.all(Array.from({length:8},(_,i)=>read<bigint>('Economy','districtStake',[BigInt(i)]))),
    Promise.all(Array.from({length:8},(_,i)=>read<bigint>('Economy','districtTotal',[BigInt(i)]))),
    read<CityState['event']>('GridOperator','eventAt',[currentHome.epoch]),read<CityState['plan']>('GridOperator','planAt',[currentHome.epoch+1n]),read<string>('SwarmDesk','lastLetterHash'),
    wallet?read<CityState['locks']>('Economy','locks',[wallet]):null,wallet&&currentHome.phases[4]?read<CityState['lockQuote']>('Economy','lockQuote',[wallet,7n]):null,wallet&&currentHome.phases[4]?read<bigint>('Economy','lobbyQuote',[wallet]):null,
   ]);
   if(valid()){city={stakes,totals,event,plan,letter,locks,lockQuote,lobbyQuote};remember(`city.${wallet??'public'}`,city);}
  } else if(current==='season') {
   const currentHome=home||await loadHome();
   const week=selectedWeek??BigInt(Math.max(0,Math.floor((chainTime(currentHome)-Number(currentHome.launchTime))/604800)));
   const [pot,remaining,deadline,result,scores,lotteryWon,lotteryClaimed,districtClaimed,bestClaimed]=await Promise.all([
    read<bigint>('Season','pot',[week]),read<bigint>('Season','potRemaining',[week]),read<bigint>('Season','claimDeadline',[week]),read<SeasonState['result']>('Season','result',[week]),Promise.all(Array.from({length:8},(_,i)=>read<readonly [bigint,bigint]>('Season','districtScore',[week,BigInt(i)]))),wallet?read<boolean>('Season','lotteryWon',[week,wallet]):false,wallet?read<boolean>('Season','lotteryClaimed',[week,wallet]):false,wallet?read<boolean>('Season','districtClaimed',[week,wallet]):false,read<boolean>('Season','bestClaimed',[week]),
   ]);
   if(valid()){season={week,pot,remaining,deadline,result,scores,lotteryWon,lotteryClaimed,districtClaimed,bestClaimed};remember(`season.${wallet??'public'}`,season);}
  } else if(current==='billboards') {
   const week=await read<bigint>('Billboards','week');
   const values=await Promise.all(Array.from({length:8},(_,i)=>read<Board>('Billboards','billboard',[week,BigInt(i)])));
   if(valid()){boards=values;boardWeek=week;remember('boards',{boards,week});}
  }
 }catch(e){if(valid())pageError=errorMessage(e);}
 if(valid())render(true);
}
let quoteRequest=0;
async function refreshQuote(show=true) {
 const request=++quoteRequest,count=pack.count,slippage=pack.slippage;
 pack.ethQuoteError='';
 try {
  const quote=await read<bigint>('PackSale','quote',[BigInt(count)]);
  if(request!==quoteRequest)return;
  pack.quote=quote;pack.priceError='';
  try {const estimate=await quoteEthPack(quote,slippage);if(request===quoteRequest){pack.ethQuote=estimate;if(count===1&&slippage===300)remember('pack-quote',{quote,ethQuote:estimate});}}
  catch(e){if(request===quoteRequest)pack.ethQuoteError=errorMessage(e);}
 } catch(e){if(request===quoteRequest){pack.priceError=errorMessage(e);}}
 if(request===quoteRequest&&show&&route()==='packs')render(true);
}
async function refreshReceipts(wallet:Address) {
 try{const receipts=await findReceipts(wallet);if(wallet===walletAddress()){pack.receipts=receipts;pack.receiptError='';}}
 catch(e){if(wallet===walletAddress())pack.receiptError=`Reconnecting to your packs. Your last update is still here.`;}
 if(route()==='packs')render(true);
}
function confirmAction(title:string,body:string,label:string,action:()=>Promise<void>,trigger?:HTMLElement|null) {
 if(!$<HTMLDialogElement>('#action-dialog').open)returnFocus=trigger??document.activeElement as HTMLElement;
 $('#action-tx-status').hidden=true;$('#action-tx-status').innerHTML='';$('#action-title').textContent=title;$('#action-body').innerHTML=body;$('#confirm-action').textContent=label;$<HTMLButtonElement>('#confirm-action').disabled=transactionBusy;$<HTMLButtonElement>('#cancel-action').disabled=transactionBusy;$('#action-error').textContent='';chosenAction=action;
 $<HTMLDialogElement>('#action-dialog').showModal();$('#cancel-action').focus();
}
function input(id:string) {return $<HTMLInputElement|HTMLSelectElement>(`#${id}`).value.trim();}
function amount(value:string,label:string) {if(!/^\d+(\.\d{1,18})?$/.test(value))throw Error(`Enter ${label} as a positive decimal with at most 18 places.`);const v=parseUnits(value,18);if(v<=0n)throw Error(`${label} must be greater than zero.`);return v;}
function integer(value:string,label:string,min=0,max=Number.MAX_SAFE_INTEGER) {if(!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value))||Number(value)<min||Number(value)>max)throw Error(`Enter ${label} between ${min} and ${max}.`);return BigInt(value);}
function actionError(e:unknown,label='Action unavailable') {setTx({label,state:'error',detail:errorMessage(e)});}
function currentItem(id:bigint) {const item=farm?.items.find(i=>i.id===id);if(!item||!farm)throw Error('Item no longer in this wallet. Refresh your farm.');return item;}
function slotOptions(item:ReturnType<typeof currentItem>,f:Farm,selected?:[number,number]){
 return f.rooms.flatMap(r=>r.slots.map((_,i)=>{const reason=placementReason(item,f,r,i);return `<option value="${r.index},${i}" ${reason?'disabled':''} ${selected?.[0]===r.index&&selected?.[1]===i?'selected':''}>Room ${r.index+1}, slot ${i+1}${reason?` — ${esc(reason)}`:''}</option>`;})).join('');
}
async function requireInventorySpace(from:Address){const fresh=await loadFarm(from);assertWallet(from);farm=fresh;const reason=capacityReason(fresh);if(reason){render(true);throw Error(reason);}}
function installDialog(id?:bigint,slot?:[number,number]) {
 if(!farm)return;const f=farm;
 const available=f.items.filter(i=>!placementReason(i,f));
 const chosenItem=id?available.find(i=>i.id===id):available[0];
 if(!chosenItem)throw Error(id?placementReason(currentItem(id),f):'No hardware can be placed yet. Check the level and room requirements shown on each item.');
 const empty=f.rooms.filter(r=>r.unlocked).flatMap(r=>r.slots.flatMap((value,s)=>value===0n&&!placementReason(chosenItem,f,r,s)?[{room:r.index,slot:s}]:[]));
 if(!empty.length)throw Error('One of each type per room. Choose another room or remove the matching hardware.');
 if(slot&&!empty.some(e=>e.room===slot[0]&&e.slot===slot[1]))throw Error(placementReason(chosenItem,f,f.rooms[slot[0]],slot[1]));
 confirmAction('Place hardware',`<label>Item<select id="install-item">${available.map(i=>`<option value="${i.id}" ${chosenItem.id===i.id?'selected':''}>#${i.id} ${KINDS[i.kind]} · ${RARITIES[i.rarity]} · level ${LEVEL_GATES[i.rarity]}</option>`).join('')}</select></label><label>Room and slot<select id="install-slot">${slotOptions(chosenItem,f,slot??[empty[0].room,empty[0].slot])}</select></label><p class="small">One of each type per room. Changes to an active farm apply next epoch.</p>`,'Place item',async()=>{
  const chosen=integer(input('install-item'),'item ID',1),[r,s]=input('install-slot').split(',').map(Number),from=assertWallet();
  const fresh=await loadFarm(from),item=fresh.items.find(i=>i.id===chosen);assertWallet(from);
  if(!item)throw Error('This hardware is no longer in your wallet. Refresh your farm.');
  const reason=placementReason(item,fresh,fresh.rooms[r],s);if(reason)throw Error(reason);
  await send('FarmCore','place',[chosen,BigInt(r),BigInt(s)],'Place hardware');selectedItem=null;
 });
}

let preparingPack=false;
async function beginPack(kind:'tokens'|'eth') {
 if(preparingPack||transactionBusy)return;
 if(!account().isConnected){openWallet();return;}
 if(account().chainId!==4663){await switchNetwork();return;}
 const from=assertWallet(),count=BigInt(pack.count),slippage=kind==='eth'?slippageBps(input('pack-slippage')):pack.slippage;
 preparingPack=true;
 try {
  const quote=await read<bigint>('PackSale','quote',[count]);
  assertWallet(from);
  if(kind==='tokens') {
   confirmAction('Pay with BLACKOUT',`<p>${count} pack${count===1n?'':'s'} for <strong>${units(quote)} BLACKOUT</strong>, plus gas.</p><p class="small">Approve if needed, then open your packs. The final price is set when the purchase confirms.</p>`,'Pay with BLACKOUT',async()=>{
    assertWallet(from);await approve('PackSale',quote);assertWallet(from);
    const hash=await send('PackSale','openPack',[count],'Open packs with BLACKOUT');await purchaseMoment(from,hash);
   });
  } else {
   const estimate=await quoteEthPack(quote,slippage);assertWallet(from);
   confirmAction('Buy pack with ETH',`<p>Spend <strong>${units(estimate.value)} ETH</strong> plus gas for ${count} pack${count===1n?'':'s'}.</p><p class="small">One transaction buys BLACKOUT and opens your pack${count===1n?'':'s'}. Extra BLACKOUT stays in your wallet.</p><p class="small">Slippage: ${slippage/100}%.<br>Minimum swap output: ${units(estimate.minTokens)} BLACKOUT.<br>Maximum pack cost: ${units(estimate.maxCost)} BLACKOUT.</p>`,'Buy pack with ETH',async()=>{
    assertWallet(from);const hash=await send('PackSale','buyWithETH',[from,count,estimate.minTokens,estimate.maxCost],'Buy pack with ETH',estimate.value);await purchaseMoment(from,hash);
   });
  }
 } finally {preparingPack=false;}
}
async function purchaseMoment(from:Address,hash:Hex){
 waitingOpening(pack.count);
 // The confirmed transaction is authoritative even if a provider's log index lags behind its receipt.
 const transaction=await client.getTransactionReceipt({hash}),fresh:Receipt[]=[];
 for(const log of transaction.logs){if(log.address.toLowerCase()!==addresses.PackSale.toLowerCase())continue;
  try{const decoded=decodeEventLog({abi:ABI.PackSale,data:log.data,topics:log.topics}) as unknown as {eventName:string;args:{id:bigint;player:Address}};
   if(decoded.eventName==='PackCommitted'&&decoded.args.player.toLowerCase()===from.toLowerCase())fresh.push(await loadReceipt('paid',decoded.args.id));
  }catch{/* Other receipt events do not describe purchased packs. */}
 }
 assertWallet(from);
 if(fresh.length)pack.receipts=[...(pack.receipts??[]).filter(r=>!fresh.some(f=>f.kind===r.kind&&f.id===r.id)),...fresh];
 else await refreshReceipts(from);
 await refreshPlayer();const owned=fresh.length?fresh:pack.receipts??[];
 const receipt=owned[0];if(receipt&&home)updateOpeningWait('Your receipt is ready. Open it when you’re ready.',receipt.target>=home.native?receipt.target-home.native+1n:0n);
 readyOpening(Number(owned.reduce((n,r)=>n+r.remaining,0n)),owned.map(({kind,id})=>({kind,id})));
}
function revealOptions(){return {economy,farm,place:(ids:bigint[])=>{if(ids.length===1){selectedItem=ids[0];location.hash='#/farm';requestAnimationFrame(()=>{try{installDialog(ids[0]);}catch(e){actionError(e);}});}else void placeAll(ids).catch(actionError);},scrap:()=>void scrapCommons().catch(actionError)};}
async function revealPack(kind:Receipt['kind'],id:bigint){await openOwned([{kind,id}],false);}
async function openOwned(only?:{kind:Receipt['kind'];id:bigint}[],bulk=true){
 const from=assertWallet();if(revealController)return;
 await refreshReceipts(from);const candidates=only??pack.receipts??[],receipts:Receipt[]=[];
 for(const candidate of candidates){const receipt=await loadReceipt(candidate.kind,candidate.id);assertWallet(from);if(receipt.player.toLowerCase()!==from.toLowerCase())throw Error('This receipt belongs to another wallet.');if(!receipt.resolved)receipts.push(receipt);}
 if(!receipts.length){pack.result={items:[],alreadyOpened:true};render(true);return;}
 const before=await loadFarm(from);assertWallet(from);farm=before;
 const total=bulk?Number(receipts.reduce((n,r)=>n+r.remaining,0n)):1,reason=capacityReason(before,total*3);
 if(reason){render(true);throw Error(reason);}
 pack.result=null;let done=0;revealController=new AbortController();const signal=revealController.signal;
 waitingOpening(total,done,home&&receipts[0].target>=home.native?receipts[0].target-home.native+1n:0n);
 const existing=new Set(before.items.map(i=>i.id));
 try{
  for(const original of receipts){
   let receipt=await loadReceipt(original.kind,original.id);
   while(!receipt.resolved&&receipt.remaining>0n&&done<total){
    if(signal.aborted)throw Error('Opening paused. Your unopened packs stay on chain.');
    const current=await loadFarm(from);assertWallet(from);const amount=bulk?Math.min(8,Number(receipt.remaining),total-done):1;
    const full=capacityReason(current,amount*3);if(full)throw Error(full);
    pack.activeReceipt={key:`${receipt.kind}:${receipt.id}`,message:'The city is rolling the dice'};
    waitingOpening(total,done,home&&receipt.target>=home.native?receipt.target-home.native+1n:0n);
    const outcome=await reveal(receipt,signal,amount);if(outcome==='opened')done+=amount;
    receipt=await loadReceipt(receipt.kind,receipt.id);if(!bulk)break;
   }
  }
  const after=await loadFarm(from);assertWallet(from);farm=after;
  const items=after.items.filter(i=>!existing.has(i.id));pack.result={items,alreadyOpened:!items.length};
  await refreshReceipts(from);render(true);if(items.length)showPulls(items,revealOptions());else pauseOpening('These packs were already opened. Your hardware is on Farm.');
 }catch(error){
  pauseOpening(errorMessage(error));await refreshReceipts(from);throw error;
 }finally{revealController=null;pack.activeReceipt=null;updateTx();if(route()==='packs')render(true);}
}
async function placeAll(ids:bigint[]){
 const from=assertWallet(),fresh=await loadFarm(from);assertWallet(from);farm=fresh;
 const virtual={...fresh,items:fresh.items.map(i=>({...i})),rooms:fresh.rooms.map(r=>({...r,slots:[...r.slots]}))};
 const placements:{id:bigint;room:number;slot:number}[]=[],skipped:string[]=[];
 for(const id of ids){const item=virtual.items.find(i=>i.id===id);if(!item)continue;let placed=false;
  for(const room of virtual.rooms){const slot=room.slots.findIndex((_,n)=>!placementReason(item,virtual,room,n));if(slot>=0){placements.push({id,room:room.index,slot});room.slots[slot]=id;item.equipped=true;placed=true;break;}}
  if(!placed)skipped.push(`${KINDS[item.kind]} #${id}: ${placementReason(item,virtual)}`);
 }
 confirmAction('Place hardware in valid slots',`<p>${placements.length} items can be placed. Each placement needs one wallet transaction; gas is separate.</p><ol>${placements.map(p=>`<li>#${p.id} → room ${p.room+1}, slot ${p.slot+1}</li>`).join('')}</ol>${skipped.length?`<p>Staying in inventory:</p><ul>${skipped.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`:''}<progress id="place-queue" max="${placements.length||1}" value="0" aria-label="Items placed"></progress>`,placements.length?'Place all':'Done',async()=>{
  for(let i=0;i<placements.length;i++){const p=placements[i],current=await loadFarm(from);assertWallet(from);const item=current.items.find(x=>x.id===p.id);if(!item)throw Error('Hardware changed. Refresh your farm.');const reason=placementReason(item,current,current.rooms[p.room],p.slot);if(reason)throw Error(reason);await send('FarmCore','place',[p.id,BigInt(p.room),BigInt(p.slot)],`Place hardware ${i+1}/${placements.length}`);const bar=document.querySelector<HTMLProgressElement>('#place-queue');if(bar)bar.value=i+1;}
 });
}
async function scrapCommons(){
 const from=assertWallet(),fresh=await loadFarm(from);assertWallet(from);farm=fresh;
 const items=fresh.items.filter(i=>i.rarity===0&&!i.equipped&&(!i.starter||fresh.paidPacks>0n));
 if(!items.length)throw Error('No unequipped commons can be scrapped. Remove a common from a room first.');
 confirmAction('Permanently scrap commons',`<p>Destroy ${items.length} unequipped Common items. This cannot be undone. One wallet transaction per item; gas is separate.</p><ul>${items.map(i=>`<li>${KINDS[i.kind]} #${i.id} · up to ${tokens(scrapQuote(i,fresh),2)} credits</li>`).join('')}</ul><p>Payouts are rechecked before each transaction. Claim tax applies to credits.</p>`,'Permanently scrap commons',async()=>{
  for(const item of items){const current=await loadFarm(from);assertWallet(from);const actual=current.items.find(i=>i.id===item.id);if(!actual||actual.equipped)throw Error('Hardware changed. Refresh before scrapping.');await send('FarmCore','scrap',[actual.id,scrapQuote(actual,current)],'Scrap Common hardware');}
 });
}
$('#cancel-action').addEventListener('click',()=>$<HTMLDialogElement>('#action-dialog').close());
$<HTMLDialogElement>('#action-dialog').addEventListener('cancel',e=>{if(transactionBusy)e.preventDefault();});
$<HTMLDialogElement>('#action-dialog').addEventListener('close',()=>{
 chosenAction=null;
 requestAnimationFrame(()=>{const target=returnFocus?.isConnected?returnFocus:returnFocus?.id?document.getElementById(returnFocus.id):$('#main');target?.focus({preventScroll:true});});
});
$('#confirm-action').addEventListener('click',()=>{
 const action=chosenAction,previousTx=tx;if(!action)return;$('#action-error').textContent='';
 // Read form selections before closing, because the dialog is also the review form.
 void transact(async()=>{try{await action();$<HTMLDialogElement>('#action-dialog').close();}catch(e){$('#action-error').textContent=tx!==previousTx&&tx?.state==='error'?tx.detail:errorMessage(e);throw e;}});
});
document.addEventListener('click',async e=>{
 const el=(e.target as Element).closest<HTMLElement>('button,a');if(!el)return;
 try {
  if(el.classList.contains('skip-link')){e.preventDefault();$('#main').focus();return;}
  else if(el.hasAttribute('data-hardware-scroll')){$('#hardware-track').scrollBy({left:Number(el.dataset.hardwareScroll)*234,behavior:motion?'smooth':'instant'});}
  else if(el.hasAttribute('data-connect'))openWallet();
  else if(el.hasAttribute('data-switch'))await switchNetwork();
  else if(el.hasAttribute('data-refresh')){if(el.closest('#action-dialog'))$<HTMLDialogElement>('#action-dialog').close();await refreshAll();}
  else if(el.hasAttribute('data-manage-farm')){$<HTMLDialogElement>('#action-dialog').close();location.hash='#/farm';}
  else if(el.hasAttribute('data-refresh-receipts')&&walletAddress())await refreshReceipts(walletAddress()!);
  else if(el.hasAttribute('data-motion-toggle')){motion=!motion;reflectMotion();}
  else if(el.hasAttribute('data-sound')){toggleSound();document.querySelectorAll<HTMLElement>('[data-sound]').forEach(b=>{b.textContent=`Sound ${soundEnabled()?'on':'off'}`;b.setAttribute('aria-pressed',String(soundEnabled()));});}
  else if(el.hasAttribute('data-copy')){await navigator.clipboard.writeText(el.dataset.copy!);el.textContent='Copied';$('#copy-message').textContent='Copied to clipboard.';}
  else if(el.hasAttribute('data-dismiss-tx'))$('#tx-status').hidden=true;
  else if(el.hasAttribute('data-check-tx'))await refreshTransaction();
  else if(el.hasAttribute('data-stop-reveal')){revealController?.abort();$('#reveal-progress').textContent='Stopping after the current request. On-chain transactions cannot be cancelled here.';}
  else if(el.dataset.viewItem){const target=$(`#item-${el.dataset.viewItem}`);target.querySelector<HTMLDetailsElement>('details')!.open=true;target.scrollIntoView({block:'center',behavior:motion?'smooth':'instant'});target.querySelector<HTMLElement>('summary')!.focus({preventScroll:true});}
  else if(el.hasAttribute('data-pick-hardware')){e.preventDefault();$('#inventory-heading').scrollIntoView({block:'start',behavior:motion?'smooth':'instant'});}
  else if(el.dataset.selectItem){selectedItem=BigInt(el.dataset.selectItem);render(true);$('#placement-guide').scrollIntoView({block:'start',behavior:motion?'smooth':'instant'});}
  else if(el.hasAttribute('data-clear-selection')){selectedItem=null;render(true);}
  else if(el.dataset.install)installDialog(BigInt(el.dataset.install));
  else if(el.dataset.slot)installDialog(selectedItem??undefined,el.dataset.slot.split(',').map(Number) as [number,number]);
  else if(el.dataset.unplace){if(farm&&capacityReason(farm))throw Error(capacityReason(farm));const [r,s]=el.dataset.unplace.split(',').map(BigInt);await transact(async()=>{await requireInventorySpace(assertWallet());await send('FarmCore','unplace',[r,s],'Unplace hardware');});}
  else if(el.dataset.repair){const id=BigInt(el.dataset.repair),i=currentItem(id),from=assertWallet();const quote=await read<bigint>('Economy','repairQuote',[id]);confirmAction('Repair hardware',`<p>Restore ${KINDS[i.kind]} #${id} to full durability for <strong>${units(quote)} BLACKOUT</strong>, plus gas.</p><p class="small">Spends wallet tokens. The approval is limited to this quote.</p>`,'Approve & repair',async()=>{assertWallet(from);await approve('FarmCore',quote);assertWallet(from);await send('FarmCore','repair',[id,true],'Repair hardware');});}
  else if(el.dataset.scrap){const id=BigInt(el.dataset.scrap),i=currentItem(id),minimum=scrapQuote(i,farm!),from=assertWallet();confirmAction('Permanently scrap hardware',`<p>Destroy ${KINDS[i.kind]} #${id}. This cannot be undone.</p><p>Minimum payout: <strong>${units(minimum)} BLACKOUT credits</strong>. Claim tax applies when withdrawing credits.${minimum===0n?' The current scrap allowance pays nothing; this discards the item without payment.':''}</p>`,'Permanently scrap',async()=>{assertWallet(from);await send('FarmCore','scrap',[id,minimum],'Scrap hardware');});}
  else if(el.dataset.buyRoom){const index=BigInt(el.dataset.buyRoom),from=assertWallet(),quote=await read<bigint>('Economy','roomQuote',[from,index]);confirmAction('Buy a mining room',`<p>Buy room ${index+1n} for <strong>${units(quote)} BLACKOUT</strong>, plus gas. Includes six empty slots.</p>`,'Approve & buy room',async()=>{assertWallet(from);await approve('FarmCore',quote);assertWallet(from);await send('FarmCore','buyRoom',[index,true],'Buy mining room');});}
  else if(el.hasAttribute('data-sync'))await transact(async()=>{await send('FarmCore','sync',[],'Sync farm');});
  else if(el.hasAttribute('data-claim')&&farm){const f=farm,from=assertWallet();if(f.claimNet===null)throw Error('Refresh the claim-tax preview first.');confirmAction('Claim mining rewards',`<p>Gross: ${units(f.pending)} BLACKOUT.<br>Estimated tax: ${units(f.pending-f.claimNet)}.<br>You receive approximately <strong>${units(f.claimNet)} BLACKOUT</strong>, before gas.</p><p class="small">The final tax is calculated on chain when your transaction is included.</p>`,'Claim rewards',async()=>{assertWallet(from);await send('FarmRewards','claim',[f.pending],'Claim rewards');});}
  else if(el.hasAttribute('data-auto-off'))await transact(async()=>{await send('FarmCore','setAutoRepair',[false,8000],'Disable auto-repair');});
  else if(el.hasAttribute('data-refresh-quote'))await refreshQuote();
  else if(el.hasAttribute('data-pack-step')) {
   const next=Math.max(1,Math.min(10,pack.count+Number(el.dataset.packStep)));
   if(next!==pack.count){pack.count=next;pack.quote=null;pack.ethQuote=null;render(true);document.querySelector<HTMLElement>(`[data-pack-step="${el.dataset.packStep}"]`)?.focus({preventScroll:true});await refreshQuote();}
  }
  else if(el.hasAttribute('data-buy-tokens'))await beginPack('tokens');
  else if(el.hasAttribute('data-open-all'))await transact(()=>openOwned());
  else if(el.hasAttribute('data-expand')&&farm){const from=assertWallet(),fresh=await loadFarm(from);assertWallet(from);const price=fresh.expansionPrice;confirmAction('Expand inventory',`<p>Add 5 inventory spaces for <strong>${units(price)} BLACKOUT</strong>, plus gas. Capacity: ${fresh.capacity} → ${fresh.capacity+5n}.</p>`,'Approve & expand',async()=>{assertWallet(from);await approve('FarmCore',price);assertWallet(from);await send('FarmCore','expand',[true],'Expand inventory');});}
  else if(el.hasAttribute('data-show-scrap')){location.hash='#/farm';setTimeout(()=>{document.querySelector('#inventory-heading')?.scrollIntoView({block:'start'});document.querySelectorAll<HTMLDetailsElement>('[id^="item-actions-"]').forEach(d=>d.open=true);},100);}
  else if(el.dataset.projectDays){projectionDays=Number(el.dataset.projectDays);render(true);}
  else if(el.dataset.epochDetail){const detail=document.getElementById('epoch-detail');if(detail)detail.textContent=el.dataset.epochDetail;}
  else if(el.dataset.capture){const [kind,id]=el.dataset.capture.split(':');await transact(async()=>{await send(kind==='paid'?'PackSale':'StarterClaim','captureEntropy',[BigInt(id)],'Capture pack entropy');});}
  else if(el.dataset.reveal){const [kind,id]=el.dataset.reveal.split(':');await transact(()=>revealPack(kind as Receipt['kind'],BigInt(id)));}
  else if(el.hasAttribute('data-unlock'))await transact(async()=>{await send('Economy','unlock',[],'Unlock principal');});
  else if(el.hasAttribute('data-lobby')&&city?.lobbyQuote){const q=city.lobbyQuote,from=assertWallet();confirmAction('Lobby for your district',`<p>Spend ${units(q)} BLACKOUT, plus gas. Lobbying improves event odds; it does not guarantee protection.</p>`,'Approve & lobby',async()=>{assertWallet(from);await approve('FarmCore',q);assertWallet(from);await send('FarmCore','lobby',[q,true],'Lobby district');});}
  else if(el.dataset.seasonClaim&&season)await transact(async()=>{await requireInventorySpace(assertWallet());await send('Season',el.dataset.seasonClaim!,[season!.week],'Claim season reward');});
  else if(el.hasAttribute('data-board-refund'))await transact(async()=>{await send('Billboards','withdrawRefund',[],'Withdraw billboard refund');});
 }catch(error){actionError(error);}
});
document.addEventListener('submit',async e=>{
 const form=e.target as HTMLFormElement;if(!form.id)return;e.preventDefault();
 try {
  if(form.id==='pack-form')await beginPack('eth');
  else if(form.id==='auto-repair-form'){const threshold=Number(integer(input('repair-threshold'),'threshold',20,100))*100;confirmAction('Enable auto-repair',`<p>Spend pending mining credits automatically when health falls below ${threshold/100}%. Wallet tokens are not used.</p>`,'Enable auto-repair',async()=>{await send('FarmCore','setAutoRepair',[true,threshold],'Enable auto-repair');});}
  else if(form.id==='receipt-form'){const kind=input('receipt-kind') as Receipt['kind'],id=BigInt(input('receipt-id'));if(id<0n)throw Error('Enter a nonnegative receipt ID.');const r=await loadReceipt(kind,id);if(BigInt(r.player)===0n)throw Error('No receipt exists with this type and ID.');if(!walletAddress()||r.player.toLowerCase()!==walletAddress()!.toLowerCase())throw Error('This receipt belongs to a different wallet.');if(r.resolved)pack.result={items:[],alreadyOpened:true};pack.receipts=[...(pack.receipts??[]).filter(x=>!(x.kind===kind&&x.id===id)),r];pack.receiptError='';render(true);}
  else if(form.id==='season-form'){selectedWeek=integer(input('season-week'),'season week');await loadPage('season');}
  else if(form.id==='lock-form'){const from=assertWallet(),days=integer(input('lock-days'),'lock term',7,30),value=amount(input('lock-amount'),'BLACKOUT amount');if(![7n,14n,30n].includes(days))throw Error('Choose 7, 14 or 30 days.');const [min]=await read<[bigint,bigint]>('Economy','lockQuote',[from,days]);if(value<min)throw Error(`The minimum lock is ${units(min)} BLACKOUT.`);confirmAction('Lock BLACKOUT',`<p>Lock <strong>${units(value)} BLACKOUT</strong> for ${days} days. You cannot withdraw early.</p>`,'Approve & lock',async()=>{assertWallet(from);await approve('Economy',value);assertWallet(from);await send('Economy','lock',[value,days],'Lock BLACKOUT');});}
  else if(form.id==='billboard-form'){const from=assertWallet(),district=integer(input('board-district'),'district',0,7),bid=amount(input('board-bid'),'bid'),text=input('board-text'),handle=input('board-handle');if(!/^[A-Za-z0-9 !_\-]{1,32}$/.test(text)||!/^[A-Za-z0-9_]{1,15}$/.test(handle))throw Error('Use 1–32 permitted message characters and a 1–15 character X handle.');confirmAction('Bid for a billboard',`<p>Bid ${units(bid)} BLACKOUT. Message: ${esc(text)}.</p><p class="small">Winning bids fund the game. An outbid refund is withdrawn separately.</p>`,'Approve & bid',async()=>{assertWallet(from);await approve('Billboards',bid);assertWallet(from);await send('Billboards','bidBillboard',[district,bid,text,handle],'Bid billboard');});}
 }catch(error){actionError(error);}
});
document.addEventListener('change',async e=>{
 const el=e.target as HTMLInputElement|HTMLSelectElement;
 try {
  if(el.id==='pack-slippage'){
   try{pack.slippage=slippageBps(el.value);el.removeAttribute('aria-invalid');$('#slippage-error').hidden=true;await refreshQuote();}
   catch(error){el.setAttribute('aria-invalid','true');$('#slippage-error').hidden=false;$('#slippage-error').textContent=errorMessage(error);}
  }
  else if(el.id==='install-item'&&farm){const item=currentItem(BigInt(el.value));$('#install-slot').innerHTML=slotOptions(item,farm);}
  else if(el.id==='calculator-hash'){
   const value=Number(el.value);if(!Number.isFinite(value)||value<0||value>1e12||!el.value){el.setAttribute('aria-invalid','true');$('#calculator-error').textContent='Enter a hashrate from 0 to 1 trillion H/s.';return;}calculatorHash=value;render(true);
  }
  else if(el.id==='inventory-filter')applyInventoryFilter();
  else if(el.id==='lock-days'&&walletAddress()){const [min,boost]=await read<[bigint,bigint]>('Economy','lockQuote',[walletAddress()!,BigInt(el.value)]);$<HTMLInputElement>('#lock-amount').value=units(min);$('#lock-quote-note').textContent=`Minimum: ${tokens(min)} BLACKOUT · +${Number(boost)/100}% hash.`;}
 }catch(error){actionError(error);}
});
const menu=$('#menu-toggle');
function closeMenu(){document.body.classList.remove('menu-open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open menu');}
menu.addEventListener('click',()=>{const open=document.body.classList.toggle('menu-open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close menu':'Open menu');});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('menu-open')){closeMenu();menu.focus();}});
document.addEventListener('click',e=>{const el=e.target as Element;if(el.closest('[data-scroll-live]')){e.preventDefault();document.getElementById('home-live')?.scrollIntoView({behavior:motion?'smooth':'instant'});}if(document.body.classList.contains('menu-open')&&!el.closest('.site-header'))closeMenu();});
window.addEventListener('scroll',()=>document.body.classList.toggle('is-scrolled',scrollY>24),{passive:true});
window.addEventListener('hashchange',()=>{
 closeMenu();
 if(location.hash==='#main'){$('#main').focus();return;}
 const current=route();pageError='';render();
 if(current==='docs'){const id=location.hash.split('/')[2];requestAnimationFrame(()=>id?document.getElementById(`doc-${id}`)?.scrollIntoView():window.scrollTo(0,0));}
 else window.scrollTo(0,0);
 $('#main').focus({preventScroll:true});void loadPage(current);if(['home','rewards','wallet','leaderboard','more'].includes(current))void refreshCommunity();
});
document.addEventListener('walletchange',()=>{
 const key=`${walletAddress()||''}:${account().chainId||''}`;if(key===lastWallet)return;lastWallet=key;generation++;
 if(!transactionBusy)$<HTMLDialogElement>('#action-dialog').close();
 resetGameplay();farm=null;history=null;city=null;season=null;progress=null;selectedItem=null;pack.eligible=null;pack.receipts=null;pack.eligibilityError='';pack.receiptError='';pack.result=null;pack.activeReceipt=null;revealController?.abort();
 if(renderedRoute){render(true);void refreshPlayer().then(()=>loadPage());}
});
document.addEventListener('walletbusy',()=>{updateControls();$<HTMLButtonElement>('#confirm-action').disabled=transactionBusy;$<HTMLButtonElement>('#cancel-action').disabled=transactionBusy;});
document.addEventListener('txchange',updateTx);
document.addEventListener('publicactivity',((event:CustomEvent<Activity[]>)=>{activities=event.detail;renderPublic();}) as EventListener);
document.addEventListener('revealprogress',((e:CustomEvent<string>)=>{
 updateOpeningWait(e.detail);
 const status=document.getElementById('reveal-progress');if(status)status.textContent=e.detail;
 if(pack.activeReceipt){pack.activeReceipt.message=e.detail;const row=document.querySelector(`[data-receipt="${pack.activeReceipt.key}"] .receipt-state`);if(row)row.textContent=e.detail;}
}) as EventListener);
document.addEventListener('openownedpacks',((event:CustomEvent<{kind:Receipt['kind'];id:bigint}[]>)=>{void transact(()=>openOwned(event.detail?.length?event.detail:undefined));}) as EventListener);
document.addEventListener('transactionend',()=>{updateControls();void refreshAll();});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>{if(e.matches){motion=false;reflectMotion();}});
setupGameplay({farm:()=>farm,home:()=>home,economy:()=>economy,confirm:confirmAction,render:()=>render(true),refresh:refreshAll,open:async()=>{await transact(()=>openOwned());}});
render();document.body.classList.add('app-ready');setupWallet();initAtmosphere(()=>motion,()=>home?.event);
// Enlarged text must be able to grow the header without covering the game.
const syncTextLayout=()=>document.body.classList.toggle('reflow-mode',parseFloat(getComputedStyle(document.documentElement).fontSize)>20||innerWidth<320);
const syncChrome=()=>{const value=`${$('.site-header').getBoundingClientRect().height}px`;if(document.documentElement.style.getPropertyValue('--top-chrome')!==value)document.documentElement.style.setProperty('--top-chrome',value);};
let layoutFrame=0;
const scheduleLayout=()=>{if(layoutFrame)return;layoutFrame=requestAnimationFrame(()=>{layoutFrame=0;syncTextLayout();syncChrome();});};
new ResizeObserver(scheduleLayout).observe($('.site-header'));
window.addEventListener('resize',scheduleLayout);syncTextLayout();syncChrome();
let pollBusy=false,communityBusy=false;
async function refreshCommunity(){
 if(communityBusy)return;communityBusy=true;
 try{
  await Promise.allSettled([
   (async()=>{try{activities=await loadActivity();remember(ACTIVITY_CACHE_KEY,activities);activityError=false;}catch{activityError=true;}renderPublic();})(),
   (async()=>{try{publicTotals=await loadPublicTotals();remember('totals',publicTotals);}catch{publicError=true;}renderPublic();})(),
   (async()=>{if(!home)return;try{leaderboard=await loadLeaderboard(home.epoch);remember(LEADERBOARD_CACHE_KEY,leaderboard);}catch{publicError=true;}renderPublic();})(),
  ]);
 }finally{communityBusy=false;renderStatus();}
}
async function refreshAll(){
 if(document.hidden||pollBusy)return;pollBusy=true;
 publicError=false;
 try{
  await Promise.allSettled([
   refreshHome(),
   verifyRegistry().catch(e=>{globalError=errorMessage(e);}),
   refreshUsd(),
   loadPage(),
   ...(!['farm','packs','rewards','wallet'].includes(route())?[refreshPlayer()]:[]),
   (async()=>{try{publicPrice=await loadPublicPrice();remember('price',publicPrice);}catch{publicError=true;}renderPublic();})(),
  ]);
  if(['home','rewards','wallet','leaderboard','more'].includes(route()))void refreshCommunity();
 }finally{pollBusy=false;renderStatus();updateControls();renderPublic();renderEarnings();}
}
void refreshAll().then(()=>{if(route()==='docs'){const id=location.hash.split('/')[2];if(id)document.getElementById(`doc-${id}`)?.scrollIntoView();}});
setInterval(()=>{
 if(document.hidden||!home)return;
 const now=chainTime(home);
 document.querySelectorAll<HTMLElement>('[data-epoch-clock]').forEach(el=>el.textContent=now>=Number(el.dataset.epochClock)?'Settling…':miningTime(Number(el.dataset.epochClock)-now));
 document.querySelectorAll<HTMLElement>('[data-countdown]').forEach(el=>el.textContent=epochCountdown(Number(el.dataset.countdown)-now));
 document.querySelectorAll<HTMLProgressElement>('[data-epoch-progress]').forEach(el=>el.value=epochProgress(home!.epochStart,home!.epochEnd,now));
 const counter=document.querySelector('[data-mining-clock]');if(counter&&farm?.hash&&farm.hash>0n)counter.textContent=now>=Number(home.epochEnd)?'Waiting for next epoch':miningTime(now-Number(farm.entrySeconds>0n?home.epochEnd-farm.entrySeconds:home.epochStart));
},1000);
setInterval(()=>{if(!document.hidden&&!transactionBusy)void refreshAll();},POLL_MS);
// A drag is just another way to choose hardware; keyboard and touch use the same gate.
let selectionBeforeDrag:bigint|null=null;
function updateSlotPreview(){
 if(!farm)return;const f=farm,item=f.items.find(i=>i.id===selectedItem);
 document.querySelectorAll<HTMLButtonElement>('[data-drop-slot]').forEach(el=>{
  const [room,slot]=el.dataset.dropSlot!.split(',').map(Number),r=f.rooms.find(r=>r.index===room);
  const reason=item&&r?placementReason(item,f,r,slot):'';
  const unavailable=item?!!reason:f.items.every(i=>i.equipped);
  el.dataset.unavailable=String(unavailable);el.disabled=!canWrite()||unavailable;
  const label=el.querySelector('small');if(label)label.textContent=item?reason||'Place here':'Choose hardware';
 });
}
document.addEventListener('dragstart',e=>{const el=(e.target as Element).closest<HTMLElement>('[data-drag-item]');if(!el||!farm)return;const id=BigInt(el.dataset.dragItem!),item=currentItem(id);if(placementReason(item,farm)){e.preventDefault();return;}draggingHardware=true;selectionBeforeDrag=selectedItem;selectedItem=id;updateSlotPreview();e.dataTransfer?.setData('text/plain',String(id));if(e.dataTransfer)e.dataTransfer.effectAllowed='move';});
document.addEventListener('dragover',e=>{const slot=(e.target as Element).closest<HTMLButtonElement>('[data-drop-slot]');if(slot){e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect=slot.disabled?'none':'move';}});
document.addEventListener('drop',e=>{const el=(e.target as Element).closest<HTMLElement>('[data-drop-slot]');if(!el)return;e.preventDefault();try{const id=e.dataTransfer?.getData('text/plain');if(id&&/^\d+$/.test(id))installDialog(BigInt(id),el.dataset.dropSlot!.split(',').map(Number) as [number,number]);}catch(error){actionError(error);}});

document.addEventListener('dragend',()=>{if(!draggingHardware)return;draggingHardware=false;selectedItem=selectionBeforeDrag;selectionBeforeDrag=null;if(deferredRender){deferredRender=false;render(true);}else updateSlotPreview();});

if(import.meta.env.DEV&&new URLSearchParams(location.search).has('pack-lab'))void import('./pack-lab').then(m=>m.mountPackLab());
