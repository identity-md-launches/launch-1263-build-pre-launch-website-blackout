import './live.css';
import { isAddress, parseUnits, type Address } from 'viem';
import { landing } from '../../src/landing';
import { sprite, spriteSheet, itemSprite } from '../../src/sprites';
import { initAtmosphere, toggleSound, soundEnabled, playSound } from '../../src/effects';
import { config as legacyConfig } from '../../src/config';
import { verifyRegistry, wiringVerified, mismatches, read, errorMessage, nativeBlock } from './chain';
import { loadHome, loadFarm, loadReceipt, type Farm, type Home, type Receipt, KINDS, RARITIES, scrapQuote, chainTime, entropyState } from './data';
import { account, walletAddress, setupWallet, openWallet, switchNetwork, canWrite, tx, txLink, setTx, send, approve, transact, assertWallet, transactionBusy, refreshTransaction } from './wallet';
import { eligibility } from './proofs';
import { findReceipts } from './receipts';
import { reveal } from './reveal';
import { docsPage } from './docs';
import { esc, tokens, units, duration, homeStats, featureCards, farmPage, packsPage, cityPage, seasonPage, boardsPage, contractsPage, type PackState, type CityState, type SeasonState, type Board, receiptRow } from './views';
const $=<T extends HTMLElement=HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
const route=()=>location.hash.replace(/^#\/?/,'').split('/')[0]||'home';
let home:Home|null=null,farm:Farm|null=null,city:CityState|null=null,season:SeasonState|null=null,boards:Board[]|null=null,boardWeek=0n;
let globalError='',pageError='',generation=0,lastWallet='',refreshing=false,selectedWeek:bigint|null=null;
let pack:PackState={quote:null,count:1,receipts:null,receiptError:'',eligible:null,eligibilityError:'',priceError:'',ethQuote:null,ethQuoteError:''};
let motion=!matchMedia('(prefers-reduced-motion: reduce)').matches;
let revealController:AbortController|null=null;
let chosenAction:(()=>Promise<void>)|null=null;
let returnFocus:HTMLElement|null=null;
let renderedRoute='';
$('#app').innerHTML=`${spriteSheet()}<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header wrap live-header"><a class="brand" href="#/" aria-label="BLACKOUT home">${sprite('mascot')}<span>BLACKOUT</span></a><nav class="game-nav" aria-label="Game pages">${[['farm','Farm','▦'],['packs','Packs','▣'],['city','City','▥'],['season','Season','★'],['docs','Guide','≡'],['contracts','Contracts','⌘']].map(([id,label,symbol])=>`<a href="#/${id}" data-route="${id}"><span class="nav-symbol" aria-hidden="true">${symbol}</span>${label}</a>`).join('')}</nav><div class="header-utils"><a class="header-starter" href="${legacyConfig.freePackUrl}">Free pack ↗</a><button class="button wallet-control" id="connect">Connect</button></div></header>
<div class="chain-strip"><div class="wrap"><span><i class="status-dot" aria-hidden="true"></i>Robinhood Chain · 4663</span><span id="connection-status">Checking contracts…</span><button class="text-button" data-refresh>Refresh data</button></div></div>
<section id="registry-warning" class="wrap warning" role="alert" hidden></section>
<section id="tx-status" class="wrap tx-status" aria-label="Transaction status" aria-live="polite" hidden></section>
<main id="main" tabindex="-1"></main>
<footer class="site-footer wrap"><a class="footer-brand" href="#/">BLACKOUT</a><p>A city worth keeping alive.<br><span class="muted">Live on Robinhood Chain.</span></p><div><a href="#/docs">Field guide</a><a href="#/docs/risks">Risks</a><a href="#/contracts">Contracts</a><a href="${legacyConfig.xUrl}" target="_blank" rel="noopener noreferrer">Follow on X ↗</a><button class="text-button" data-motion-toggle>Pause animation</button><button class="text-button" data-sound>Sound ${soundEnabled()?'on':'off'}</button></div><p class="footer-fine">Real assets. Wallet signatures required. No guaranteed rewards.</p></footer>
<dialog id="wallet-dialog" class="wallet-sheet" aria-labelledby="wallet-title"><div class="sheet-head"><h2 id="wallet-title">Connect a wallet</h2><button data-close-wallet class="close-button" aria-label="Close wallet picker">×</button></div><div id="wallet-rows"></div><p id="wallet-note" class="small" role="status"></p></dialog>
<dialog id="action-dialog" aria-labelledby="action-title"><div class="dialog-inner"><h2 id="action-title"></h2><div id="action-body"></div><p id="action-error" class="field-error" role="alert"></p><div class="actions"><button class="button" id="cancel-action">Cancel</button><button class="button primary" id="confirm-action">Confirm</button></div></div></dialog>
<div id="copy-message" class="sr-only" role="status"></div>`;
function reflectMotion() {
 document.body.classList.toggle('motion-off',!motion);
 document.querySelectorAll<HTMLElement>('[data-motion-toggle]').forEach(el=>{el.textContent=motion?'Pause city':'Resume city';el.setAttribute('aria-pressed',String(motion));});
}
function preserveForms() {
 return Array.from(document.querySelectorAll<HTMLInputElement|HTMLSelectElement>('#main input,#main select')).filter(el=>el.id).map(el=>({id:el.id,value:el.value,focused:document.activeElement===el}));
}
function render(keepForms=false) {
 const formValues=keepForms?preserveForms():[];
 const openDetails=keepForms?Array.from(document.querySelectorAll<HTMLDetailsElement>('#main details[open]')).map(d=>d.id).filter(Boolean):[];
 const current=route();document.body.dataset.page=current;
 document.querySelectorAll<HTMLAnchorElement>('[data-route]').forEach(a=>{a.classList.toggle('active',a.dataset.route===current);if(a.dataset.route===current)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 let html='';
 if(current==='home')html=landing();
 else if(current==='farm'||current==='wallet')html=farmPage(farm,home,pageError);
 else if(current==='packs')html=packsPage(pack,home);
 else if(current==='city')html=cityPage(home,city,pageError);
 else if(current==='season')html=seasonPage(home,season,pageError);
 else if(current==='billboards')html=boardsPage(home,boardWeek,boards,pageError);
 else if(current==='contracts')html=contractsPage(wiringVerified,mismatches);
 else if(current==='docs')html=docsPage();
 else html='<div class="wrap live-page"><h1>Page not found</h1><p>That route is not part of the game.</p><a class="button" href="#/">Go home</a></div>';
 $('#main').innerHTML=html;
 if(current==='home'){ $('#home-live').innerHTML=homeStats(home,globalError);$('#feature-cards').innerHTML=featureCards(home); }
 formValues.forEach(({id,value,focused})=>{const el=document.getElementById(id) as HTMLInputElement|HTMLSelectElement|null;if(el){el.value=value;if(focused)el.focus({preventScroll:true});}});
 openDetails.forEach(id=>{const d=document.getElementById(id) as HTMLDetailsElement|null;if(d)d.open=true;});
 reflectMotion();renderedRoute=current;updateControls();
}
function renderStatus() {
 $('#connection-status').textContent=globalError?'Read unavailable':wiringVerified?'Registry verified':'Checking contracts…';
 const banner=$('#registry-warning');banner.hidden=!globalError&&!mismatches.length;
 if(mismatches.length)banner.innerHTML=`<strong>Contract addresses do not match the registry.</strong><p>Writes are disabled. Review the <a href="#/contracts">contract comparison</a>.</p>${globalError?`<p>Live data unavailable: ${esc(globalError)}</p>`:''}<button class="button" data-refresh>Retry verification</button>`;
 else if(globalError)banner.innerHTML=`<p>Live data unavailable: ${esc(globalError)}</p><button class="button" data-refresh>Retry connection</button>`;
}
function updateControls() {
 const allowed=canWrite();
 const selectors='[data-unplace],[data-install],[data-repair],[data-scrap],[data-buy-room],[data-sync],[data-claim],[data-claim-nft],[data-claim-free],[data-capture],[data-reveal],[data-buy-eth],[data-unlock],[data-lobby],[data-season-claim],[data-board-refund]';
 if(!allowed)document.querySelectorAll<HTMLButtonElement>(selectors).forEach(b=>b.disabled=true);
 if(!allowed)document.querySelectorAll<HTMLButtonElement>('#main button[type="submit"]').forEach(b=>b.disabled=true);
}
function updateTx() {
 const el=$('#tx-status');el.hidden=!tx;if(!tx)return;
 el.dataset.state=tx.state;
 el.innerHTML=`<div><strong>${esc(tx.label)} · ${tx.state==='signature'?'Awaiting wallet':tx.state.charAt(0).toUpperCase()+tx.state.slice(1)}</strong><p>${esc(tx.detail)}</p>${tx.hash?`<a href="${txLink(tx.hash)}" target="_blank" rel="noopener noreferrer">View transaction ↗</a><code>${tx.hash}</code>`:''}${revealController?'<p id="reveal-progress" role="status">Preparing reveal…</p>':''}</div><div>${revealController?'<button class="button" data-stop-reveal>Stop waiting</button>':tx.state==='pending'?'<button class="button" data-check-tx>Check confirmation</button>':'<button class="text-button" data-dismiss-tx>Dismiss</button>'}</div>`;
}
async function refreshHome() {
 if(refreshing)return;refreshing=true;
 const phaseKey=(h:Home|null)=>h?`${h.ready}:${h.paused}:${h.endowed}:${h.phases.join(',')}:${h.timestamp>=Number(h.launchTime)+172800}:${h.timestamp>=Number(h.launchTime)+1382400}:${pack.eligible?h.timestamp>=Number(pack.eligible.ends):false}`:'';
 const previous=phaseKey(home),previousError=globalError;
 try {await verifyRegistry();home=await loadHome();globalError='';}
 catch(e){globalError=errorMessage(e);}
 finally {refreshing=false;renderStatus();if(route()==='home'){ $('#home-live').innerHTML=homeStats(home,globalError);$('#feature-cards').innerHTML=featureCards(home); }else if(route()==='contracts'||previous!==phaseKey(home)||previousError!==globalError)render(true);else updateControls();}
}
async function loadPage(current=route()) {
 const mine=++generation,wallet=walletAddress();pageError='';
 const valid=()=>mine===generation&&route()===current&&walletAddress()===wallet;
 try {
  if(current==='farm'||current==='wallet') {
   if(wallet){const value=await loadFarm(wallet);if(valid())farm=value;}
  } else if(current==='packs') {
   const jobs=[refreshQuote(false)];
   if(wallet){jobs.push(refreshEligibility(wallet),refreshReceipts(wallet));}
   await Promise.allSettled(jobs);
  } else if(current==='city') {
   const currentHome=home||await loadHome();
   const [stakes,totals,event,plan,letter,locks,lockQuote,lobbyQuote]=await Promise.all([
    Promise.all(Array.from({length:8},(_,i)=>read<bigint>('Economy','districtStake',[BigInt(i)]))),
    Promise.all(Array.from({length:8},(_,i)=>read<bigint>('Economy','districtTotal',[BigInt(i)]))),
    read<CityState['event']>('GridOperator','eventAt',[currentHome.epoch]),read<CityState['plan']>('GridOperator','planAt',[currentHome.epoch+1n]),read<string>('SwarmDesk','lastLetterHash'),
    wallet?read<CityState['locks']>('Economy','locks',[wallet]):null,wallet&&currentHome.phases[4]?read<CityState['lockQuote']>('Economy','lockQuote',[wallet,7n]):null,wallet&&currentHome.phases[4]?read<bigint>('Economy','lobbyQuote',[wallet]):null,
   ]);
   if(valid())city={stakes,totals,event,plan,letter,locks,lockQuote,lobbyQuote};
  } else if(current==='season') {
   const currentHome=home||await loadHome();
   const week=selectedWeek??BigInt(Math.max(0,Math.floor((chainTime(currentHome)-Number(currentHome.launchTime))/604800)));
   const [pot,remaining,deadline,result,scores,lotteryWon,lotteryClaimed,districtClaimed,bestClaimed]=await Promise.all([
    read<bigint>('Season','pot',[week]),read<bigint>('Season','potRemaining',[week]),read<bigint>('Season','claimDeadline',[week]),read<SeasonState['result']>('Season','result',[week]),Promise.all(Array.from({length:8},(_,i)=>read<readonly [bigint,bigint]>('Season','districtScore',[week,BigInt(i)]))),wallet?read<boolean>('Season','lotteryWon',[week,wallet]):false,wallet?read<boolean>('Season','lotteryClaimed',[week,wallet]):false,wallet?read<boolean>('Season','districtClaimed',[week,wallet]):false,read<boolean>('Season','bestClaimed',[week]),
   ]);
   if(valid())season={week,pot,remaining,deadline,result,scores,lotteryWon,lotteryClaimed,districtClaimed,bestClaimed};
  } else if(current==='billboards') {
   const week=await read<bigint>('Billboards','week');
   const values=await Promise.all(Array.from({length:8},(_,i)=>read<Board>('Billboards','billboard',[week,BigInt(i)])));
   if(valid()){boards=values;boardWeek=week;}
  }
 }catch(e){if(valid())pageError=errorMessage(e);}
 if(valid())render(true);
}
async function refreshQuote(show=true) {
 const count=pack.count;
 try {const quote=await read<bigint>('PackSale','quote',[BigInt(count)]);if(count!==pack.count)return;pack.quote=quote;pack.priceError='';}
 catch(e){pack.priceError=errorMessage(e);pack.quote=null;}
 if(show&&route()==='packs')render(true);
}
async function refreshEligibility(wallet:Address) {
 try{const result=await eligibility(wallet);if(wallet===walletAddress()){pack.eligible=result;pack.eligibilityError='';}}
 catch(e){if(wallet===walletAddress())pack.eligibilityError=errorMessage(e);}
 if(route()==='packs')render(true);
}
async function refreshReceipts(wallet:Address) {
 try{const receipts=await findReceipts(wallet);if(wallet===walletAddress()){pack.receipts=receipts;pack.receiptError='';}}
 catch(e){if(wallet===walletAddress())pack.receiptError=`Receipt lookup failed: ${errorMessage(e)}. You can look up a known receipt ID below.`;}
 if(route()==='packs')render(true);
}
function confirmAction(title:string,body:string,label:string,action:()=>Promise<void>) {
 returnFocus=document.activeElement as HTMLElement;
 $('#action-title').textContent=title;$('#action-body').innerHTML=body;$('#confirm-action').textContent=label;$('#action-error').textContent='';chosenAction=action;
 $<HTMLDialogElement>('#action-dialog').showModal();$('#cancel-action').focus();
}
function input(id:string) {return $<HTMLInputElement|HTMLSelectElement>(`#${id}`).value.trim();}
function amount(value:string,label:string) {if(!/^\d+(\.\d{1,18})?$/.test(value))throw Error(`Enter ${label} as a positive decimal with at most 18 places.`);const v=parseUnits(value,18);if(v<=0n)throw Error(`${label} must be greater than zero.`);return v;}
function integer(value:string,label:string,min=0,max=Number.MAX_SAFE_INTEGER) {if(!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value))||Number(value)<min||Number(value)>max)throw Error(`Enter ${label} between ${min} and ${max}.`);return BigInt(value);}
function getRecipient() {const value=input('pack-recipient');if(!value)return assertWallet();if(!isAddress(value)||BigInt(value)===0n)throw Error('Enter a valid, nonzero gift recipient address.');return value as Address;}
function actionError(e:unknown,label='Action unavailable') {setTx({label,state:'error',detail:errorMessage(e)});}
function currentItem(id:bigint) {const item=farm?.items.find(i=>i.id===id);if(!item||!farm)throw Error('Item no longer in this wallet. Refresh your farm.');return item;}
function installDialog(id?:bigint,slot?:[number,number]) {
 if(!farm)return;const f=farm;
 const available=f.items.filter(i=>!i.equipped);
 const empty=f.rooms.filter(r=>r.unlocked).flatMap(r=>r.slots.flatMap((value,s)=>value===0n?[{room:r.index,slot:s}]:[]));
 if(!available.length||!empty.length)throw Error('You need an unequipped item and an empty room slot.');
 confirmAction('Place hardware',`<label>Item<select id="install-item">${available.map(i=>`<option value="${i.id}" ${id===i.id?'selected':''}>#${i.id} ${KINDS[i.kind]} · ${RARITIES[i.rarity]}</option>`).join('')}</select></label><label>Room and slot<select id="install-slot">${empty.map(s=>`<option value="${s.room},${s.slot}" ${slot?.[0]===s.room&&slot?.[1]===s.slot?'selected':''}>Room ${s.room+1}, slot ${s.slot+1}</option>`).join('')}</select></label><p class="small">Placement takes effect through the farm’s epoch accounting. Rarity and room gates are checked by the contract.</p>`,'Place item',async()=>{
  const chosen=integer(input('install-item'),'item ID',1),[r,s]=input('install-slot').split(',').map(BigInt);await send('FarmCore','place',[chosen,r,s],'Place hardware');
 });
}
async function beginPack(kind:'tokens'|'eth') {
 const from=assertWallet(),count=integer(input('pack-count'),'pack count',1,8),recipient=getRecipient();
 const quote=await read<bigint>('PackSale','quote',[count]);
 const gift=recipient.toLowerCase()!==from.toLowerCase();
 if(kind==='tokens') {
  confirmAction(gift?'Gift hardware packs':'Open hardware packs',`<p>${count} pack(s) for <strong>${units(quote)} BLACKOUT</strong>, plus gas.</p><p>Recipient: <span class="full-address">${recipient}</span></p><p class="small">First approve this amount, then confirm the purchase. A price increase beyond the allowance reverts. Reveal the receipt after the future target block.</p>`,gift?'Approve & gift packs':'Approve & open packs',async()=>{
   assertWallet(from);await approve('PackSale',quote);assertWallet(from);
   await send('PackSale',gift?'buyPacksFor':'openPack',gift?[recipient,count,quote]:[count],gift?'Gift packs':'Open packs');
  });
 } else {
  const value=amount(input('pack-eth'),'ETH input'),minTokens=amount(input('min-tokens'),'minimum output'),maxCost=amount(input('max-cost'),'maximum pack cost');
  if(maxCost<quote)throw Error('Maximum pack cost is below the current quote. Refresh and review the limit.');
  confirmAction('Buy packs with ETH',`<p>Spend <strong>${units(value)} ETH</strong> plus gas for ${count} pack(s).</p><p>Minimum output: ${units(minTokens)} BLACKOUT.<br>Maximum pack cost: ${units(maxCost)} BLACKOUT.</p><p>Recipient: <span class="full-address">${recipient}</span></p><p class="small">The swap and purchase are atomic. Excess BLACKOUT returns to your wallet. Check the recipient and all amounts.</p>`,'Buy with ETH',async()=>{assertWallet(from);await send('PackSale','buyWithETH',[recipient,count,minTokens,maxCost],'Buy packs with ETH',value);});
 }
}
async function ethEstimate() {
 const p=pack.quote;if(p===null)throw Error('Wait for the pack quote, then retry.');
 const estimate=await read<bigint>('V4Market','quote',[10n**18n]);if(estimate===0n)throw Error('The market returned no quote.');
 let value:bigint;
 if(input('pack-eth'))value=amount(input('pack-eth'),'ETH input');
 else {value=(p*10n**18n*103n+estimate*100n-1n)/(estimate*100n);$<HTMLInputElement>('#pack-eth').value=units(value);}
 const output=await read<bigint>('V4Market','quote',[value]);pack.ethQuote=output;
 $<HTMLInputElement>('#min-tokens').value=units(output*99n/100n>p?output*99n/100n:p);
 $<HTMLInputElement>('#max-cost').value=units(p);
 $('#eth-quote-note').textContent=`TWAP estimate: ${tokens(output)} BLACKOUT. Minimum uses 1% tolerance, at least the current pack cost. This is not a guarantee.`;
}
async function revealPack(kind:Receipt['kind'],id:bigint) {
 const from=assertWallet();const receipt=await loadReceipt(kind,id);
 if(receipt.player.toLowerCase()!==from.toLowerCase())throw Error('This receipt belongs to another wallet.');
 if(receipt.resolved)throw Error('This receipt is already resolved. Refresh your inventory.');
 const before=await read<bigint>('FarmItems','ownedCount',[from]);
 revealController=new AbortController();updateTx();
 try {
  playSound('pack');await reveal(receipt,revealController.signal);playSound('reveal');
  const after=await loadFarm(from);farm=after;
  if(route()==='packs') {
   const added=after.items.slice(Number(before));
   const area=$('#reveal-result');area.innerHTML=`<section class="reveal-result"><h2>Hardware revealed.</h2><p>Your on-chain inventory has been updated.</p><div class="reveal-cards">${added.map(i=>`<article class="reveal-card ${RARITIES[i.rarity].toLowerCase()}">${itemSprite(KINDS[i.kind],RARITIES[i.rarity])}<h3>${KINDS[i.kind]}</h3><p>${RARITIES[i.rarity]} · #${i.id}</p></article>`).join('')}</div><a class="button primary" href="#/farm">Place your hardware →</a></section>`;area.scrollIntoView({behavior:motion?'smooth':'instant',block:'center'});
  }
 }finally{revealController=null;updateTx();}
}
$('#cancel-action').addEventListener('click',()=>$<HTMLDialogElement>('#action-dialog').close());
$<HTMLDialogElement>('#action-dialog').addEventListener('cancel',e=>{if(transactionBusy)e.preventDefault();});
$<HTMLDialogElement>('#action-dialog').addEventListener('close',()=>{chosenAction=null;returnFocus?.focus();});
$('#confirm-action').addEventListener('click',()=>{
 const action=chosenAction;if(!action)return;
 // Read form selections before closing, because the dialog is also the review form.
 void transact(async()=>{try{await action();$<HTMLDialogElement>('#action-dialog').close();}catch(e){$('#action-error').textContent=errorMessage(e);throw e;}});
});
document.addEventListener('click',async e=>{
 const el=(e.target as Element).closest<HTMLElement>('button,a');if(!el)return;
 try {
  if(el.classList.contains('skip-link')){e.preventDefault();$('#main').focus();return;}
  else if(el.hasAttribute('data-hardware-scroll')){$('#hardware-track').scrollBy({left:Number(el.dataset.hardwareScroll)*234,behavior:motion?'smooth':'instant'});}
  else if(el.hasAttribute('data-connect'))openWallet();
  else if(el.hasAttribute('data-switch'))await switchNetwork();
  else if(el.hasAttribute('data-refresh')){await refreshHome();await loadPage();}
  else if(el.hasAttribute('data-refresh-receipts')&&walletAddress())await refreshReceipts(walletAddress()!);
  else if(el.hasAttribute('data-motion-toggle')){motion=!motion;reflectMotion();}
  else if(el.hasAttribute('data-sound')){toggleSound();el.textContent=`Sound ${soundEnabled()?'on':'off'}`;}
  else if(el.hasAttribute('data-copy')){await navigator.clipboard.writeText(el.dataset.copy!);el.textContent='Copied';$('#copy-message').textContent='Contract address copied.';}
  else if(el.hasAttribute('data-dismiss-tx'))$('#tx-status').hidden=true;
  else if(el.hasAttribute('data-check-tx'))await refreshTransaction();
  else if(el.hasAttribute('data-stop-reveal')){revealController?.abort();$('#reveal-progress').textContent='Stopping after the current request. On-chain transactions cannot be cancelled here.';}
  else if(el.dataset.viewItem){const target=$(`#item-${el.dataset.viewItem}`);target.querySelector<HTMLDetailsElement>('details')!.open=true;target.scrollIntoView({block:'center',behavior:motion?'smooth':'instant'});target.querySelector<HTMLElement>('summary')!.focus({preventScroll:true});}
  else if(el.dataset.install)installDialog(BigInt(el.dataset.install));
  else if(el.dataset.slot)installDialog(undefined,el.dataset.slot.split(',').map(Number) as [number,number]);
  else if(el.dataset.unplace){const [r,s]=el.dataset.unplace.split(',').map(BigInt);await transact(async()=>{await send('FarmCore','unplace',[r,s],'Unplace hardware');});}
  else if(el.dataset.repair){const id=BigInt(el.dataset.repair),i=currentItem(id),from=assertWallet();const quote=await read<bigint>('Economy','repairQuote',[id]);confirmAction('Repair hardware',`<p>Restore ${KINDS[i.kind]} #${id} to full durability for <strong>${units(quote)} BLACKOUT</strong>, plus gas.</p><p class="small">Spends wallet tokens. The approval is limited to this quote.</p>`,'Approve & repair',async()=>{assertWallet(from);await approve('FarmCore',quote);assertWallet(from);await send('FarmCore','repair',[id,true],'Repair hardware');});}
  else if(el.dataset.scrap){const id=BigInt(el.dataset.scrap),i=currentItem(id),minimum=scrapQuote(i,farm!),from=assertWallet();confirmAction('Permanently scrap hardware',`<p>Destroy ${KINDS[i.kind]} #${id}. This cannot be undone.</p><p>Minimum payout: <strong>${units(minimum)} BLACKOUT credits</strong>. Claim tax applies when withdrawing credits.${minimum===0n?' The current scrap allowance pays nothing; this discards the item without payment.':''}</p>`,'Permanently scrap',async()=>{assertWallet(from);await send('FarmCore','scrap',[id,minimum],'Scrap hardware');});}
  else if(el.dataset.buyRoom){const index=BigInt(el.dataset.buyRoom),from=assertWallet(),quote=await read<bigint>('Economy','roomQuote',[from,index]);confirmAction('Buy a mining room',`<p>Buy room ${index+1n} for <strong>${units(quote)} BLACKOUT</strong>, plus gas. Includes six empty slots.</p>`,'Approve & buy room',async()=>{assertWallet(from);await approve('FarmCore',quote);assertWallet(from);await send('FarmCore','buyRoom',[index,true],'Buy mining room');});}
  else if(el.hasAttribute('data-sync'))await transact(async()=>{await send('FarmCore','sync',[],'Sync farm');});
  else if(el.hasAttribute('data-claim')&&farm){const f=farm,from=assertWallet();if(f.claimNet===null)throw Error('Refresh the claim-tax preview first.');confirmAction('Claim mining rewards',`<p>Gross: ${units(f.pending)} BLACKOUT.<br>Estimated tax: ${units(f.pending-f.claimNet)}.<br>You receive approximately <strong>${units(f.claimNet)} BLACKOUT</strong>, before gas.</p><p class="small">The final tax is calculated on chain when your transaction is included.</p>`,'Claim rewards',async()=>{assertWallet(from);await send('FarmRewards','claim',[f.pending],'Claim rewards');});}
  else if(el.hasAttribute('data-auto-off'))await transact(async()=>{await send('FarmCore','setAutoRepair',[false,8000],'Disable auto-repair');});
  else if(el.hasAttribute('data-eth-quote'))await ethEstimate();
  else if(el.hasAttribute('data-buy-eth'))await beginPack('eth');
  else if(el.dataset.claimNft){const id=Number(el.dataset.claimNft),claim=pack.eligible?.owned.find(c=>c.tokenId===id),from=assertWallet();if(!claim||claim.holder.toLowerCase()!==from.toLowerCase())throw Error('No verified NFT proof for this wallet.');await transact(async()=>{await send('StarterClaim','claim',[BigInt(id),claim.proof],`Claim Identity MD #${id}`);});}
  else if(el.hasAttribute('data-claim-free')){const claim=pack.eligible?.free;if(!claim)throw Error('This wallet has no free-claim proof.');await transact(async()=>{await send('StarterClaim','claimFree',[BigInt(claim.index),claim.proof],'Claim free starter');});}
  else if(el.dataset.capture){const [kind,id]=el.dataset.capture.split(':');await transact(async()=>{await send(kind==='paid'?'PackSale':'StarterClaim','captureEntropy',[BigInt(id)],'Capture pack entropy');});}
  else if(el.dataset.reveal){const [kind,id]=el.dataset.reveal.split(':');await transact(()=>revealPack(kind as Receipt['kind'],BigInt(id)));}
  else if(el.hasAttribute('data-unlock'))await transact(async()=>{await send('Economy','unlock',[],'Unlock principal');});
  else if(el.hasAttribute('data-lobby')&&city?.lobbyQuote){const q=city.lobbyQuote,from=assertWallet();confirmAction('Lobby for your district',`<p>Spend ${units(q)} BLACKOUT, plus gas. Lobbying improves event odds; it does not guarantee protection.</p>`,'Approve & lobby',async()=>{assertWallet(from);await approve('FarmCore',q);assertWallet(from);await send('FarmCore','lobby',[q,true],'Lobby district');});}
  else if(el.dataset.seasonClaim&&season)await transact(async()=>{await send('Season',el.dataset.seasonClaim!,[season!.week],'Claim season reward');});
  else if(el.hasAttribute('data-board-refund'))await transact(async()=>{await send('Billboards','withdrawRefund',[],'Withdraw billboard refund');});
 }catch(error){actionError(error);}
});
document.addEventListener('submit',async e=>{
 const form=e.target as HTMLFormElement;if(!form.id)return;e.preventDefault();
 try {
  if(form.id==='pack-form')await beginPack('tokens');
  else if(form.id==='auto-repair-form'){const threshold=Number(integer(input('repair-threshold'),'threshold',20,100))*100;confirmAction('Enable auto-repair',`<p>Spend pending mining credits automatically when health falls below ${threshold/100}%. Wallet tokens are not used.</p>`,'Enable auto-repair',async()=>{await send('FarmCore','setAutoRepair',[true,threshold],'Enable auto-repair');});}
  else if(form.id==='receipt-form'){const kind=input('receipt-kind') as Receipt['kind'],id=BigInt(input('receipt-id'));if(id<0n)throw Error('Enter a nonnegative receipt ID.');const r=await loadReceipt(kind,id);if(BigInt(r.player)===0n)throw Error('No receipt exists with this type and ID.');if(!walletAddress()||r.player.toLowerCase()!==walletAddress()!.toLowerCase())throw Error('This receipt belongs to a different wallet.');if(r.resolved)throw Error('This receipt is already resolved.');pack.receipts=[...(pack.receipts??[]).filter(x=>!(x.kind===kind&&x.id===id)),r];pack.receiptError='';render(true);}
  else if(form.id==='season-form'){selectedWeek=integer(input('season-week'),'season week');await loadPage('season');}
  else if(form.id==='lock-form'){const from=assertWallet(),days=integer(input('lock-days'),'lock term',7,30),value=amount(input('lock-amount'),'BLACKOUT amount');if(![7n,14n,30n].includes(days))throw Error('Choose 7, 14 or 30 days.');const [min]=await read<[bigint,bigint]>('Economy','lockQuote',[from,days]);if(value<min)throw Error(`The minimum lock is ${units(min)} BLACKOUT.`);confirmAction('Lock BLACKOUT',`<p>Lock <strong>${units(value)} BLACKOUT</strong> for ${days} days. You cannot withdraw early.</p>`,'Approve & lock',async()=>{assertWallet(from);await approve('Economy',value);assertWallet(from);await send('Economy','lock',[value,days],'Lock BLACKOUT');});}
  else if(form.id==='billboard-form'){const from=assertWallet(),district=integer(input('board-district'),'district',0,7),bid=amount(input('board-bid'),'bid'),text=input('board-text'),handle=input('board-handle');if(!/^[A-Za-z0-9 !_\-]{1,32}$/.test(text)||!/^[A-Za-z0-9_]{1,15}$/.test(handle))throw Error('Use 1–32 permitted message characters and a 1–15 character X handle.');confirmAction('Bid for a billboard',`<p>Bid ${units(bid)} BLACKOUT. Message: ${esc(text)}.</p><p class="small">Winning bids fund the game. An outbid refund is withdrawn separately.</p>`,'Approve & bid',async()=>{assertWallet(from);await approve('Billboards',bid);assertWallet(from);await send('Billboards','bidBillboard',[district,bid,text,handle],'Bid billboard');});}
 }catch(error){actionError(error);}
});
document.addEventListener('change',async e=>{
 const el=e.target as HTMLInputElement|HTMLSelectElement;
 try {
  if(el.id==='pack-count'){pack.count=Number(integer(el.value,'pack count',1,8));pack.quote=null;await refreshQuote();if(pack.quote!==null){$<HTMLInputElement>('#min-tokens').value=units(pack.quote);$<HTMLInputElement>('#max-cost').value=units(pack.quote);}}
  else if(el.id==='inventory-filter')document.querySelectorAll<HTMLElement>('[data-item-equipped]').forEach(row=>row.hidden=el.value==='installed'?row.dataset.itemEquipped!=='true':el.value==='spare'?row.dataset.itemEquipped==='true':false);
  else if(el.id==='lock-days'&&walletAddress()){const [min,boost]=await read<[bigint,bigint]>('Economy','lockQuote',[walletAddress()!,BigInt(el.value)]);$<HTMLInputElement>('#lock-amount').value=units(min);$('#lock-quote-note').textContent=`Minimum: ${tokens(min)} BLACKOUT · +${Number(boost)/100}% hash.`;}
 }catch(error){actionError(error);}
});
window.addEventListener('hashchange',()=>{
 if(location.hash==='#main'){$('#main').focus();return;}
 const current=route();pageError='';render();
 if(current==='docs'){const id=location.hash.split('/')[2];requestAnimationFrame(()=>id?document.getElementById(`doc-${id}`)?.scrollIntoView():window.scrollTo(0,0));}
 else window.scrollTo(0,0);
 $('#main').focus({preventScroll:true});void loadPage(current);
});
document.addEventListener('walletchange',()=>{
 const key=`${walletAddress()||''}:${account().chainId||''}`;if(key===lastWallet)return;lastWallet=key;generation++;
 if(!transactionBusy)$<HTMLDialogElement>('#action-dialog').close();
 farm=null;city=null;pack.eligible=null;pack.receipts=null;pack.eligibilityError='';pack.receiptError='';revealController?.abort();
 if(renderedRoute){render(true);void loadPage();}
});
document.addEventListener('walletbusy',()=>{updateControls();$<HTMLButtonElement>('#confirm-action').disabled=transactionBusy;$<HTMLButtonElement>('#cancel-action').disabled=transactionBusy;});
document.addEventListener('txchange',updateTx);
document.addEventListener('revealprogress',((e:CustomEvent<string>)=>{const status=document.getElementById('reveal-progress');if(status)status.textContent=e.detail;}) as EventListener);
document.addEventListener('transactionend',()=>{
 // Preserve a completed reveal's artwork while receipts refresh in the background.
 if(route()==='packs'&&$('#reveal-result')?.textContent){void refreshHome();if(walletAddress()){const owner=walletAddress()!;void findReceipts(owner).then(r=>{if(walletAddress()!==owner)return;pack.receipts=r;if(route()==='packs')$('#receipt-list').innerHTML=r.length?r.map(item=>receiptRow(item,home)).join(''):'<p>No pending receipts. Your hardware is ready on Farm.</p>';}).catch(e=>{pack.receiptError=errorMessage(e);});}return;}
 void refreshHome().then(()=>loadPage());
});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>{if(e.matches){motion=false;reflectMotion();}});
render();setupWallet();initAtmosphere(()=>motion);
// Enlarged text must be able to grow the header without covering the game.
const syncTextLayout=()=>document.body.classList.toggle('reflow-mode',parseFloat(getComputedStyle(document.documentElement).fontSize)>20||innerWidth<320);
new ResizeObserver(syncTextLayout).observe(document.documentElement);
new MutationObserver(syncTextLayout).observe(document.documentElement,{attributes:true,attributeFilter:['style','class']});
window.addEventListener('resize',syncTextLayout);syncTextLayout();
void refreshHome().then(()=>loadPage()).then(()=>{if(route()==='docs'){const id=location.hash.split('/')[2];if(id)document.getElementById(`doc-${id}`)?.scrollIntoView();}});
setInterval(()=>{
 if(home)document.querySelectorAll<HTMLElement>('[data-countdown]').forEach(el=>el.textContent=duration(Number(el.dataset.countdown)-chainTime(home!)));
},1000);
setInterval(()=>{if(!document.hidden&&!transactionBusy)void refreshHome();},30000);


// A native block is much shorter than an epoch. Refresh an active capture window
// without re-rendering forms or moving focus; the reveal helper owns its own clock.
let readingReceiptClock=false;
setInterval(async()=>{
 if(readingReceiptClock||document.hidden||transactionBusy||route()!=='packs'||!home||!pack.receipts?.length)return;
 readingReceiptClock=true;
 try {
  const current=await nativeBlock();if(route()!=='packs'||!home)return;home.native=current;
  for(const row of document.querySelectorAll<HTMLElement>('[data-receipt]')) {
   const receipt=pack.receipts?.find(r=>`${r.kind}:${r.id}`===row.dataset.receipt);if(!receipt)continue;
   row.querySelector<HTMLElement>('.receipt-state')!.textContent=entropyState(receipt,current);
   row.querySelector<HTMLElement>('[data-native-block]')!.textContent=String(current);
   row.querySelector<HTMLButtonElement>('[data-capture]')!.disabled=!canWrite()||receipt.captured||receipt.resolved||current<=receipt.target;
  }
  const status=document.getElementById('receipt-clock-status');if(status)status.textContent='';
 } catch {
  const status=document.getElementById('receipt-clock-status');if(status)status.textContent='Native block refresh failed. Refresh data before capturing; your receipt remains on chain.';
 } finally {readingReceiptClock=false;}
},3000);
