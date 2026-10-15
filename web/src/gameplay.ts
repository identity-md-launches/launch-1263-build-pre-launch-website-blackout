import type { Address } from 'viem';
import type { Farm, Home } from './data';
import { loadFarm, KINDS } from './data';
import { findReceipts } from './receipts';
import { assertWallet, send, approve, setTx, tx, setBeforeFarmAction, transactionBusy } from './wallet';
import { errorMessage, read } from './chain';
import { gameplay, todayView, hashText } from './gameplay-views';
import { loadRules, verifyLoadout, optimizationEconomy, estimateOptimization } from './farm-rules';
import { loadout, legalLoadout } from './farm-math';
import type { Plan } from './optimizer';
import { loadToday, repairPlan, NotificationEvents, notificationSettings } from './today';
import { captureInviter, savedInviter, eligibleReferral, loadInvites } from './referrals';
import { esc, tokens, units } from './views';
import { type EconomySnapshot } from './earnings';
type Host={farm:()=>Farm|null;home:()=>Home|null;economy:()=>EconomySnapshot|null;confirm:(title:string,body:string,label:string,action:()=>Promise<void>,trigger?:HTMLElement|null)=>void;render:()=>void;refresh:()=>Promise<void>;open:()=>Promise<void>};
let host:Host,worker:Worker|null=null,noticeState=new NotificationEvents(),lastWallet='',pendingFor='',receiptLoadingFor='',inviteLoading=false;
const fingerprint=(farm:Farm)=>JSON.stringify({wallet:farm.wallet,level:farm.level,capacity:farm.capacity,unlocked:farm.rooms.map(r=>r.unlocked),lastSettled:farm.lastSettled,settledEpoch:farm.settledEpoch,slots:loadout(farm),items:farm.items.map(i=>[i.id,i.durability,i.overclock,i.enhancing])},(_,v)=>typeof v==='bigint'?v.toString():v);
function sequenceProgress(done:number,total:number,label:string){const node=document.getElementById('sequence-progress');if(node)node.innerHTML=`<label>${esc(label)} · ${done}/${total}<progress value="${done}" max="${total}" aria-label="Transaction sequence progress"></progress></label>`;}
const sequenceMarkup='<div id="sequence-progress" role="status" aria-live="polite"></div>';
export async function refreshGameplay(farm:Farm,home:Home|null){
 const identity=farm.wallet;if(pendingFor===identity)return;pendingFor=identity;
 if(lastWallet!==identity){gameplay.rules=null;gameplay.today=null;gameplay.invites=null;noticeState=new NotificationEvents();lastWallet=identity;}
 const results=await Promise.allSettled([loadRules(farm),loadToday(farm,home?.epoch??await read<bigint>('FarmRewards','epoch'))]);
 if(host.farm()?.wallet===identity){
  if(results[0].status==='fulfilled')gameplay.rules=results[0].value;
  if(results[1].status==='fulfilled')gameplay.today={...results[1].value,receipts:gameplay.today?.receipts??null};
  gameplay.error=results.some(r=>r.status==='rejected')?'Some gameplay data is reconnecting. Confirmed values are kept.':'';
  host.render();notifyToday();
 }
 if(pendingFor===identity)pendingFor='';
 if(receiptLoadingFor!==identity){receiptLoadingFor=identity;void findReceipts(farm.wallet).then(receipts=>{if(host.farm()?.wallet===identity&&gameplay.today){gameplay.today.receipts=receipts;host.render();}}).catch(()=>{if(host.farm()?.wallet===identity){gameplay.error='Pack history is reconnecting. Your other actions are available.';host.render();}}).finally(()=>{if(receiptLoadingFor===identity)receiptLoadingFor='';});}

}
export function resetGameplay(){gameplay.rules=null;gameplay.today=null;gameplay.invites=null;gameplay.error='';lastWallet='';pendingFor='';receiptLoadingFor='';}
function notifyToday(){const farm=host.farm(),home=host.home();if(!notificationSettings.enabled||!farm||!home||typeof Notification==='undefined'||Notification.permission!=='granted')return;for(const e of noticeState.events(farm,home))try{new Notification(e.title,{tag:e.key,icon:new URL('./app-icon.png',document.baseURI).href});}catch{/* Browser may require a native notification surface unavailable here. */}}
function resetSequenceError(error:unknown,done:number,total:number){sequenceProgress(done,total,'Stopped; confirmed steps are saved');const detail=`${done}/${total} steps confirmed. ${tx?.state==='reverted'||tx?.state==='error'?tx.detail:errorMessage(error)} Refresh and review a new plan before retrying.`;setTx({...tx,label:tx?.label??'Farm sequence',state:tx?.state==='reverted'?'reverted':'error',detail});throw Error(detail);}
export async function optimizeDialog(){
 if(worker)return;const from=assertWallet(),button=document.querySelector<HTMLButtonElement>('[data-optimize]');if(button){button.disabled=true;button.textContent='Reading farm…';}
 try{
  const fresh=await loadFarm(from);assertWallet(from);
  if(fresh.lastSettled<fresh.settledEpoch){host.confirm('Sync before optimizing','<p>Completed epochs can change item health and your level. Sync your farm, then choose Optimize farm again for an accurate plan.</p>','Sync farm',async()=>{assertWallet(from);await send('FarmCore','sync',[],'Sync before optimizing');},button);return;}
  const rules=await loadRules(fresh);assertWallet(from);
  host.confirm('Optimize farm',`<p>Searching every legal arrangement for the highest productive hashrate. Large inventories can take longer.</p><p id="optimizer-status" role="status">Starting exact search…</p><button class="button" data-stop-optimizer>Stop search</button>`,'Searching…',async()=>{},button);
  const confirm=document.querySelector<HTMLButtonElement>('#confirm-action')!;confirm.disabled=true;
  worker=new Worker(new URL('./optimizer-worker.ts',import.meta.url),{type:'module'});
  const plan=await new Promise<Plan>((resolve,reject)=>{
   const dialog=document.querySelector<HTMLDialogElement>('#action-dialog')!;
   const stop=()=>{worker?.terminate();worker=null;reject(Error('Search stopped. No farm changes were sent.'));};
   dialog.addEventListener('close',stop,{once:true});
   worker!.onerror=e=>{dialog.removeEventListener('close',stop);reject(Error(e.message));};
   worker!.onmessage=({data})=>{if(data.error){dialog.removeEventListener('close',stop);reject(Error(data.error));}else if(data.plan){dialog.removeEventListener('close',stop);resolve(data.plan);}else{const status=document.getElementById('optimizer-status');if(status)status.textContent=`${Number(data.visited).toLocaleString('en-US')} arrangements checked · best ${hashText(data.best)} H/s`;}};
   worker!.postMessage({farm:fresh,rules});
  });
  worker?.terminate();worker=null;assertWallet(from);await verifyLoadout(fresh,plan.ids,rules);
  const gain=plan.after.productive-plan.before.productive,pct=plan.before.productive?`${(Number(gain)*100/Number(plan.before.productive)).toFixed(2)}%`:'new mining';
  const delta=estimateOptimization(await optimizationEconomy(fresh,rules.epoch),plan.before,plan.after);
  const body=`<p class="optimizer-gain">+${hashText(gain)} H/s (${pct})</p><p>≈ ${delta===null?'unavailable':`${delta>=0n?'+':''}${tokens(delta,2)}`} BLACKOUT / epoch</p><p class="small muted">Current health, Params and stake boost; before claim tax, grid events and gas. Active farms apply placement changes next epoch. Maximum hash can have a different token yield.</p>${plan.moves.length?`<ol class="move-list">${plan.moves.map(m=>`<li>${m.kind==='place'?'Place':'Remove'} #${m.id} ${fresh.items.find(i=>i.id===m.id)?esc(['GPU','ASIC','FPGA','Power Supply','Battery','Solar Panel','Fan','Liquid Cooling','Router','Motherboard','Server Rack','Surge Protector'][fresh.items.find(i=>i.id===m.id)!.kind]):''} ${m.kind==='place'?'into':'from'} room ${m.room+1}, slot ${m.slot+1}${m.temporary?' (temporary)':''}</li>`).join('')}</ol><p>${plan.moves.length} wallet transactions. Each step is simulated and confirmed before the next.</p>`:'<p>Your current placement is already optimal.</p>'}${sequenceMarkup}<p class="small muted">Productive hash and allocation hash verified against FarmEngine with eth_call.</p>`;
  host.confirm('Review optimized farm',body,plan.moves.length?'Apply placement':'Done',async()=>{
   if(!plan.moves.length)return;
   await beforeFarmAction(from);const current=await loadFarm(from);assertWallet(from);
   if(fingerprint(current)!==fingerprint(fresh))throw Error('Your farm changed. Close this preview and optimize again.');
   const latest=await loadRules(current);await verifyLoadout(current,plan.ids,latest);
   if(JSON.stringify(latest.current,(_,v)=>typeof v==='bigint'?v.toString():v)!==JSON.stringify(rules.current,(_,v)=>typeof v==='bigint'?v.toString():v)||latest.theft!==rules.theft||latest.epoch!==rules.epoch)throw Error('Combo parameters or cable status changed. Optimize again.');
   if(!legalLoadout(plan.ids,current))throw Error('The plan is no longer legal. Refresh and optimize again.');
   let done=0;const expected=loadout(current);
   try{for(const m of plan.moves){
    assertWallet(from);const check=await loadFarm(from);if(loadout(check).some((id,i)=>id!==expected[i]))throw Error('Your placement changed in another session.');
    sequenceProgress(done,plan.moves.length,m.kind==='place'?`Place #${m.id}`:`Remove #${m.id}`);
    await send('FarmCore',m.kind,m.kind==='place'?[m.id,BigInt(m.room),BigInt(m.slot)]:[BigInt(m.room),BigInt(m.slot)],`Optimize farm · ${done+1}/${plan.moves.length}`);
    expected[m.room*6+m.slot]=m.kind==='place'?m.id:0n;done++;sequenceProgress(done,plan.moves.length,'Confirmed');
   }}catch(error){resetSequenceError(error,done,plan.moves.length);}
  });
 }catch(error){const dialog=document.querySelector<HTMLDialogElement>('#action-dialog');if(dialog?.querySelector('[data-stop-optimizer]'))dialog.close();throw error;}
 finally{worker?.terminate();worker=null;const confirm=document.querySelector<HTMLButtonElement>('#confirm-action');if(confirm)confirm.disabled=transactionBusy;if(button){button.disabled=transactionBusy;button.textContent='Optimize farm';}}
}
export async function repairAllDialog(){
 const from=assertWallet(),farm=await loadFarm(from);assertWallet(from);
 if(farm.lastSettled<farm.settledEpoch){host.confirm('Sync before repairing','<p>Completed epochs can change health and repair costs. Sync, then choose Repair all again to review the current total.</p>','Sync farm',async()=>{assertWallet(from);await send('FarmCore','sync',[],'Sync before repairing');});return;}
 const today=await loadToday(farm,host.home()?.epoch??await read<bigint>('FarmRewards','epoch')),plan=repairPlan(farm,today);assertWallet(from);
 if(!plan.items.length&&!plan.cable)throw Error('No repairs are currently available.');
 host.confirm('Repair all hardware',`<p>Restore ${plan.items.length} worn items${plan.cable?' and the stolen cable':''} for <strong>${units(plan.total)} BLACKOUT</strong> plus gas, from your wallet.</p><ul class="move-list repair-list">${plan.items.map(i=>`<li>${KINDS[i.kind]} #${i.id} · ${i.durability/100}% health · ${units(i.repair)} BLACKOUT</li>`).join('')}${plan.cable?`<li>Cable · ${units(today.cableCost)} BLACKOUT</li>`:''}</ul><p>One repair per transaction; an exact token approval is requested if needed. If any quote increases, the sequence stops for review.</p>${sequenceMarkup}`,'Approve & repair all',async()=>{
  assertWallet(from);await beforeFarmAction(from);const settled=await read<bigint>('FarmRewards','settledEpoch');if(settled>farm.lastSettled)throw Error('A new epoch settled. Sync and review repair costs again.');await approve('FarmCore',plan.total);let done=0,total=plan.items.length+Number(plan.cable);
  try{for(const item of plan.items){assertWallet(from);if(await read<bigint>('FarmRewards','settledEpoch')>farm.lastSettled)throw Error('A new epoch settled. Sync and review remaining repairs.');const quote=await read<bigint>('Economy','repairQuote',[item.id]);if(quote>item.repair)throw Error('Repair price increased. Review the total again.');sequenceProgress(done,total,`Repair #${item.id}`);await send('FarmCore','repair',[item.id,true],`Repair all · ${done+1}/${total}`);done++;}
   if(plan.cable){assertWallet(from);if(await read<bigint>('FarmRewards','settledEpoch')>farm.lastSettled)throw Error('A new epoch settled. Sync and review cable repair.');if(await read<bigint>('Economy','farmDaily',[from])/4n>today.cableCost)throw Error('Cable repair price increased.');sequenceProgress(done,total,'Repair cable');await send('FarmCore','repairCable',[true],'Repair cable');done++;}
   sequenceProgress(done,total,'Confirmed');
  }catch(error){resetSequenceError(error,done,total);}
 });
}
async function beforeFarmAction(from:Address){
 const inviter=savedInviter();if(!inviter)return;const key=`blackout.invite-dismissed.${from.toLowerCase()}`;try{if(sessionStorage.getItem(key))return;}catch{}
 if(!await eligibleReferral(from,inviter))return;assertWallet(from);
 const dialog=document.createElement('dialog');dialog.className='referral-offer';dialog.setAttribute('aria-labelledby','referral-title');dialog.innerHTML=`<div class="dialog-inner"><h2 id="referral-title">Join with your inviter’s bonus</h2><p>Your inviter earns +5% on top of your mining. You lose nothing.</p><p class="full-address">${esc(inviter)}</p><p class="small muted">One inviter, forever. This must happen before your first mining settlement; only an older farm qualifies.</p><p class="field-error" role="alert"></p><div class="actions"><button class="button" data-skip-invite>Continue without invite</button><button class="button primary" data-accept-invite>Join with inviter</button></div></div>`;document.body.append(dialog);dialog.showModal();
 try{await new Promise<void>((resolve,reject)=>{
  const skip=()=>{try{sessionStorage.setItem(key,'1');}catch{}resolve();};
  dialog.addEventListener('cancel',e=>{e.preventDefault();skip();});dialog.querySelector('[data-skip-invite]')!.addEventListener('click',skip);
  dialog.querySelector('[data-accept-invite]')!.addEventListener('click',()=>{dialog.querySelectorAll('button').forEach(b=>b.disabled=true);void (async()=>{assertWallet(from);if(!await eligibleReferral(from,inviter))throw Error('Referral window closed. Refresh your farm.');await send('FarmCore','setReferrer',[inviter],'Join with inviter');try{sessionStorage.setItem(key,'1');}catch{}resolve();})().catch(reject);});
 });}finally{dialog.close();dialog.remove();}
}
export function setupGameplay(value:Host){
 host=value;captureInviter();setBeforeFarmAction(beforeFarmAction);
 document.addEventListener('click',e=>{const el=(e.target as Element).closest<HTMLElement>('button');if(!el)return;
 const action=async()=>{
  if(el.hasAttribute('data-optimize'))await optimizeDialog();
  else if(el.hasAttribute('data-stop-optimizer'))document.querySelector<HTMLDialogElement>('#action-dialog')?.close();
  else if(el.hasAttribute('data-repair-all'))await repairAllDialog();
  else if(el.hasAttribute('data-notifications')){
   if(typeof Notification==='undefined'){el.textContent='Notifications unavailable';return;}
   if(notificationSettings.enabled){notificationSettings.enabled=false;el.setAttribute('aria-pressed','false');el.textContent='Enable notifications';return;}
   const result=await Notification.requestPermission();notificationSettings.enabled=result==='granted';el.setAttribute('aria-pressed',String(notificationSettings.enabled));el.textContent=notificationSettings.enabled?'Notifications on · turn off':result==='denied'?'Notifications blocked in browser':'Enable notifications';notifyToday();
  }
  else if(el.hasAttribute('data-load-invites')){const farm=host.farm(),home=host.home();if(!farm||!home||inviteLoading)return;inviteLoading=true;el.textContent='Reading history…';el.setAttribute('disabled','');try{const data=await loadInvites(farm.wallet,home.epoch);if(host.farm()?.wallet===farm.wallet)gameplay.invites=data;host.render();}finally{inviteLoading=false;el.removeAttribute('disabled');}}
  else if(el.hasAttribute('data-today-open'))await host.open();
  else if(el.hasAttribute('data-claim-drops')){const from=assertWallet(),count=await read<bigint>('FarmCore','drops',[from]);host.confirm('Collect supply drops',`<p>Collect ${count} supply drops. Each needs one free inventory slot and one wallet transaction.</p>${sequenceMarkup}`,'Collect drops',async()=>{for(let i=0n;i<count;i++){assertWallet(from);const farm=await loadFarm(from);if(farm.inventory>=farm.capacity)throw Error('Inventory is full. Expand or place hardware, then collect the remaining drops.');sequenceProgress(Number(i),Number(count),'Collecting');await send('FarmCore','claimDrop',[],'Collect supply drop');}});}
 };void action().catch(error=>setTx({label:'Gameplay',state:'error',detail:errorMessage(error)}));
 });
 setInterval(notifyToday,1000);
}
export function hudToday(){const farm=host?.farm();return farm?todayView(farm,host.home(),true):'';}
