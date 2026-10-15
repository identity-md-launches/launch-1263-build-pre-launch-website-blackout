import { sprite, itemSprite } from '../../src/sprites';
import { soundEnabled } from '../../src/effects';
import { KINDS, RARITIES, type Item } from './data';
import { baseHash, itemEpoch, calculatorEpoch, type EconomySnapshot } from './earnings';
import type { Farm } from './data';
import { tokens, esc } from './views';
import { LEVEL_GATES } from './player';
let effectTimer:ReturnType<typeof setTimeout>|undefined;
let dialog:HTMLDialogElement|null=null,returnFocus:HTMLElement|null=null,results:Item[]=[],flipped=new Set<string>(),cascade:ReturnType<typeof setTimeout>[]=[];
let readyReceipts:{kind:'paid'|'starter';id:bigint}[]=[];
let onPlace:(ids:bigint[])=>void=()=>{},onScrap:()=>void=()=>{},economy:EconomySnapshot|null=null,farm:Farm|null=null,mock=false;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.body.classList.contains('motion-off');
const sparks=()=>`<div class="pack-sparks" aria-hidden="true">${Array.from({length:16},(_,i)=>`<i style="--i:${i};left:${10+i*37%80}%;top:${10+i*23%80}%"></i>`).join('')}</div>`;
export function packArt(){return `<div class="foil-pack" data-pack-tilt><div class="foil-inner">${sprite('pack')}<span class="foil-sheen"></span><span class="pack-cracks"></span></div>${sparks()}</div>`;}
function modal(){
 if(dialog)return dialog;
 dialog=document.createElement('dialog');dialog.id='opening-dialog';dialog.className='opening-dialog';dialog.setAttribute('aria-labelledby','opening-title');
 document.body.append(dialog);
 dialog.addEventListener('close',()=>{cascade.forEach(clearTimeout);cascade=[];document.body.classList.remove('pack-cinema');(returnFocus?.isConnected?returnFocus:document.querySelector<HTMLElement>('#main'))?.focus({preventScroll:true});});
 dialog.addEventListener('click',event=>{
  const el=(event.target as Element).closest<HTMLElement>('button');if(!el)return;
  if(el.hasAttribute('data-close-opening'))dialog?.close();
  if(el.hasAttribute('data-rip'))rip();
  if(el.dataset.flipCard)flip(el.dataset.flipCard);
  if(el.hasAttribute('data-flip-all'))flipAll();
  if(el.dataset.placePull){dialog?.close();onPlace([BigInt(el.dataset.placePull)]);}
  if(el.hasAttribute('data-place-pulls')){dialog?.close();onPlace(results.map(i=>i.id));}
  if(el.hasAttribute('data-scrap-pulls')){dialog?.close();onScrap();}
  if(el.hasAttribute('data-open-more')){dialog?.close();location.hash='#/packs';}
  if(el.hasAttribute('data-resume-opening')){dialog?.close();document.dispatchEvent(new CustomEvent('openownedpacks',{detail:readyReceipts}));}
 });
 let hold:ReturnType<typeof setTimeout>|undefined;
 dialog.addEventListener('pointerdown',event=>{if((event.target as Element).closest('[data-rip]'))hold=setTimeout(rip,650);});
 for(const name of ['pointerup','pointercancel','pointerleave'])dialog.addEventListener(name,()=>clearTimeout(hold));
 return dialog;
}
function show(){const d=modal();if(!d.open){returnFocus=document.activeElement as HTMLElement;d.showModal();}document.body.classList.add('pack-cinema');return d;}
export function waitingOpening(total:number,done=0,blocks?:bigint){
 const d=show();d.className='opening-dialog opening-wait';
 d.innerHTML=`<div class="opening-top"><span>${mock?'Local visual rehearsal':'On-chain pack opening'}</span><button class="close-button" data-close-opening aria-label="Close pack opening">×</button></div><div class="opening-wait-body"><h2 id="opening-title">The city is rolling the dice</h2><p data-blocks-left>${blocks===undefined?'Confirm the next step in your wallet.':blocks>0n?`${blocks} native blocks until entropy`:'Entropy block reached · waiting for confirmation'}</p>${packArt()}<progress max="${total}" value="${done}" aria-label="Packs opened"></progress><p>${done} of ${total} packs resolved</p><p class="small muted">Your receipt stays on chain if you leave. Results appear only after confirmation.</p></div>`;
 d.style.setProperty('--tremble',blocks!==undefined&&blocks<=1n?'70ms':'180ms');
}
export function updateOpeningWait(detail:string,blocks?:bigint){
 const d=dialog;if(!d?.open||!d.classList.contains('opening-wait'))return;
 const reported=detail.match(/(\d+) native blocks/);if(blocks===undefined&&reported)blocks=BigInt(reported[1]);
 const text=d.querySelector('[data-blocks-left]');if(text)text.textContent=blocks!==undefined&&blocks>0n?`${blocks} native blocks until entropy`:detail;
 d.style.setProperty('--tremble',blocks!==undefined&&blocks<=1n?'70ms':'180ms');
}
export function pauseOpening(message:string){
 if(!dialog?.open)return;
 dialog.className='opening-dialog';dialog.innerHTML=`<div class="opening-top"><h2 id="opening-title">Your packs are safe</h2><button class="close-button" data-close-opening aria-label="Close pack opening">×</button></div><p>${esc(message)}</p><button class="button primary" data-close-opening>Back to packs</button>`;
}
export function readyOpening(total:number,receipts:{kind:'paid'|'starter';id:bigint}[]=[]){readyReceipts=receipts;if(!dialog?.open||total<1)return;dialog.querySelector('.opening-wait-body')?.insertAdjacentHTML('beforeend',`<button class="button primary" data-resume-opening>Open ${total===1?'pack':`all (${total})`}</button>`);}
export function showPulls(items:Item[],options:{economy?:EconomySnapshot|null;farm?:Farm|null;place:(ids:bigint[])=>void;scrap:()=>void;mock?:boolean}){
 if(!items.length)return;
 cascade.forEach(clearTimeout);cascade=[];mock=!!options.mock;economy=options.economy??null;farm=options.farm??null;onPlace=options.place;onScrap=options.scrap;
 results=[...items].sort((a,b)=>a.rarity-b.rarity);flipped=new Set();
 const best=Math.max(...items.map(i=>i.rarity)),d=show();d.className=`opening-dialog opening-ready rarity-${best}`;
 d.innerHTML=`<div class="opening-top"><span>${mock?'Dev only · synthetic results':'Results confirmed on chain'}</span><button class="close-button" data-close-opening aria-label="Close pack opening">×</button></div><div class="rip-stage"><h2 id="opening-title">Something’s humming inside.</h2><p>${items.length} hardware items. All yours.</p><button class="rip-target" data-rip aria-label="Rip open the confirmed pack">${packArt()}</button><button class="button primary" data-rip>Tap or hold to rip</button><p class="small muted">Reveal the hardware. Rarity is already settled.</p></div>`;
}
function rip(){
 const d=dialog;if(!d?.classList.contains('opening-ready'))return;
 const best=Math.max(...results.map(i=>i.rarity));d.className=`opening-dialog opening-cards rarity-${best}`;
 d.innerHTML=`<div class="opening-top"><div><h2 id="opening-title">Fresh from the city.</h2><p>${mock?'Dev only · synthetic results':`${results.length/3} pack${results.length===3?'':'s'} confirmed on chain`}</p></div><button class="close-button" data-close-opening aria-label="Close pack opening">×</button></div><div class="opening-actions"><p id="flip-progress" role="status">0 / ${results.length} hardware revealed</p><button class="button" data-flip-all>Flip all</button></div><div class="pull-grid ${results.length===3?'single-pull':''}">${results.map((item,i)=>{
  const rarity=RARITIES[item.rarity],gate=LEVEL_GATES[item.rarity],hash=baseHash(item),earning=economy?(farm?itemEpoch(economy,farm,item):calculatorEpoch(economy,baseHash(item))):null;
  return `<article class="pull-card ${rarity.toLowerCase()}" data-pull="${item.id}" style="--card-index:${i};--fan:${i-1}"><button class="flip-card" data-flip-card="${item.id}" aria-label="Flip hardware ${i+1}" aria-expanded="false"><span class="flip-inner"><span class="card-back"><span class="back-brand">BLACKOUT</span>${sprite('bolt')}<span class="card-back-grid"></span><span class="back-copy">Power sleeps inside.</span><span>Tap to flip</span></span><span class="card-face" aria-hidden="true">${itemSprite(KINDS[item.kind],rarity)}<strong>${KINDS[item.kind]}</strong><span class="pull-rarity">${rarity}</span><span><b data-pull-hash="${Number(hash)/1000}">0</b> H/s</span><span class="pull-earnings">${earning===null?'+ earnings after live quote':`+${tokens(earning,2)} / epoch`}</span><small>${gate===1?'Any farm level':`Requires level ${gate}`}</small></span></span></button><button class="button place-pull" data-place-pull="${item.id}" disabled>Place in room</button></article>`;
 }).join('')}</div><section class="pull-summary" hidden><div><h3>Total hardware hash</h3><strong>${(Number(results.reduce((n,i)=>n+baseHash(i),0n))/1000).toLocaleString()} H/s</strong><p>Best pull: <span class="best-pull ${RARITIES[best].toLowerCase()}">${RARITIES[best]} ${KINDS[results[results.length-1].kind]}</span></p></div><div class="actions"><button class="button primary" data-place-pulls>Place all in valid slots</button><button class="button" data-scrap-pulls ${results.some(i=>i.rarity===0)?'':'disabled'}>Scrap commons</button><button class="button" data-open-more>Open more</button></div><p class="small muted">Hash is hardware potential. Placement gates, duplicates and room bonuses affect your farm’s actual output.</p></section><div class="rarity-fx" aria-hidden="true"></div>`;
 effect(best,true);
}
function flip(id:string){
 if(flipped.has(id))return;const item=results.find(i=>i.id.toString()===id),card=dialog?.querySelector<HTMLElement>(`[data-pull="${id}"]`);if(!item||!card)return;
 flipped.add(id);card.classList.add('is-flipped');
 const button=card.querySelector<HTMLButtonElement>('[data-flip-card]')!;button.setAttribute('aria-expanded','true');button.setAttribute('aria-label',`${RARITIES[item.rarity]} ${KINDS[item.kind]}, ${Number(baseHash(item))/1000} H/s`);
 card.querySelector('.card-face')?.removeAttribute('aria-hidden');card.querySelector('.card-back')?.setAttribute('aria-hidden','true');card.querySelector<HTMLButtonElement>('[data-place-pull]')!.disabled=false;
 const counter=card.querySelector<HTMLElement>('[data-pull-hash]')!,value=Number(counter.dataset.pullHash),start=performance.now();
 const tick=(t:number)=>{counter.textContent=(value*(reduced()?1:Math.min(1,(t-start)/650))).toLocaleString('en-US',{maximumFractionDigits:2});if(!reduced()&&t-start<650&&counter.isConnected)requestAnimationFrame(tick);};requestAnimationFrame(tick);
 effect(item.rarity);
 const progress=dialog!.querySelector('#flip-progress')!;progress.textContent=`${flipped.size} / ${results.length} hardware revealed`;
 if(flipped.size===results.length){dialog!.querySelector<HTMLElement>('.pull-summary')!.hidden=false;dialog!.querySelector<HTMLButtonElement>('[data-flip-all]')!.disabled=true;}
}
function flipAll(){let delay=0;results.filter(i=>!flipped.has(i.id.toString())).forEach(i=>{cascade.push(setTimeout(()=>flip(i.id.toString()),reduced()?0:delay));delay+=i.rarity===2?650:220;});}
function effect(rarity:number,burst=false){
 if(!reduced()){
  const d=dialog!;clearTimeout(effectTimer);d.classList.toggle('burst-impact',burst);d.dataset.effect=String(rarity);d.classList.remove('rarity-impact');void d.offsetWidth;d.classList.add('rarity-impact');d.style.setProperty('--shake',`${1+rarity*1.5}px`);
  const fx=d.querySelector('.rarity-fx');if(fx)fx.innerHTML=`${rarity===4?'<strong class="mythic-title">MYTHIC</strong>':''}<div class="effect-ring"></div><div class="god-rays"></div>${Array.from({length:burst?24:12},(_,i)=>`<i class="effect-pixel" style="--i:${i};--x:${(i*137%100)-50}vw;--y:${(i*71%100)-50}vh"></i>`).join('')}`;
  effectTimer=setTimeout(()=>{d.classList.remove('rarity-impact','burst-impact');if(fx)fx.innerHTML='';},rarity===4?1100:800);
  navigator.vibrate?.(rarity>=3?[30,40,70]:15);
 }
 if(soundEnabled()){
  try{const audio=new AudioContext(),osc=audio.createOscillator(),gain=audio.createGain();osc.type=rarity>=3?'sine':'triangle';osc.frequency.setValueAtTime(rarity>=3?70:220+rarity*160,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(rarity>=3?35:700,audio.currentTime+.25);gain.gain.setValueAtTime(.15,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.4);osc.connect(gain).connect(audio.destination);osc.start();osc.stop(audio.currentTime+.45);osc.onended=()=>void audio.close();}catch{/* Audio is optional. */}
 }
}
let tiltFrame=0;
document.addEventListener('pointermove',event=>{
 const el=(event.target as Element).closest<HTMLElement>('[data-pack-tilt]');if(!el||reduced()||tiltFrame)return;
 const rect=el.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width-.5,y=(event.clientY-rect.top)/rect.height-.5;
 tiltFrame=requestAnimationFrame(()=>{tiltFrame=0;el.style.setProperty('--tilt-x',`${-y*18}deg`);el.style.setProperty('--tilt-y',`${x*20}deg`);});
},{passive:true});
document.addEventListener('pointerout',event=>{const el=(event.target as Element).closest<HTMLElement>('[data-pack-tilt]');if(el&&!el.contains(event.relatedTarget as Node)){el.style.setProperty('--tilt-x','0deg');el.style.setProperty('--tilt-y','0deg');}});
