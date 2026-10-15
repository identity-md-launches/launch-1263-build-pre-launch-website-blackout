// Vite removes this module and its import from the production dependency graph.
// Local visual rehearsal only: no provider, wallet, key, RPC or transaction.
import { waitingOpening, showPulls, updateOpeningWait } from './pack-opening';
import { contracts } from './config';
import type { EconomySnapshot } from './earnings';
import { RARITIES, type Item } from './data';
export function mountPackLab(){
 const lab=document.createElement('section');lab.className='pack-lab';lab.setAttribute('aria-label','Development pack rehearsal');
 lab.innerHTML=`<strong>Dev only · visual rehearsal · no real assets</strong><div><label>Best rarity <select id="lab-rarity">${RARITIES.map((r,i)=>`<option value="${i}">${r}</option>`).join('')}</select></label><label>Packs <select id="lab-count"><option value="1">Single pack</option><option value="3">Bulk · 3 packs</option></select></label></div><div class="actions"><button class="button primary" id="lab-open">Rehearse opening</button><span id="lab-note" role="status"></span></div>`;
 document.querySelector('#main')!.insertAdjacentElement('beforebegin',lab);
 lab.querySelector('#lab-open')!.addEventListener('click',()=>{
  const rarity=Number(lab.querySelector<HTMLSelectElement>('#lab-rarity')!.value),count=Number(lab.querySelector<HTMLSelectElement>('#lab-count')!.value);
  waitingOpening(count,0,3n);setTimeout(()=>updateOpeningWait('The city is rolling the dice',2n),300);setTimeout(()=>updateOpeningWait('The city is rolling the dice',1n),600);
  setTimeout(()=>{const items:Item[]=Array.from({length:count*3},(_,i)=>({id:BigInt(i+1),holder:contracts.FarmCore,durability:10000,kind:i%12,rarity:i===count*3-1?rarity:Math.min(rarity,i%2),overclock:0,starter:false,equipped:false,repair:0n,output:10000n,enhancing:0n}));
   const epochData={start:0n,end:21600n,raw:1000000n,miningSeconds:21600n,mining:0n,emission:350n,tariff:1500n,rewardPerHash:0n,kind:0,district:0};const economy:EconomySnapshot={epoch:1n,epochData,previous:epochData,available:1000000n*10n**18n,farms:10n,activeFarms:10n,locked:0n,dripEnd:0n,timestamp:0,fetchedAt:0};
   showPulls(items,{mock:true,economy,place:()=>{lab.querySelector('#lab-note')!.textContent='Placement preview only. No transaction sent.';},scrap:()=>{lab.querySelector('#lab-note')!.textContent='Scrap preview only. No transaction sent.';}});
  },1000);
 });
}
