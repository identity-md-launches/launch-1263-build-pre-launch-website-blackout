import type { Farm, Item } from './data';
import { LEVEL_GATES } from './player';
import { itemBase, legalLoadout, loadout, roomMath, score, type RuleSet } from './farm-math';
export type Move={kind:'place'|'unplace';id:bigint;room:number;slot:number;temporary?:boolean};
export type Plan={ids:bigint[];moves:Move[];before:ReturnType<typeof score>;after:ReturnType<typeof score>;visited:number};
// Keep every item staying in its room in its original slot. Slot permutations
// never change engine output; this avoids charging players for cosmetic moves.
export function stableSlots(groups:Item[][],farm:Farm){
 const ids=Array<bigint>(24).fill(0n);
 const items=new Map(farm.items.map(i=>[i.id,i]));
 groups.forEach((group,r)=>{
  const pending=new Set(group.map(i=>i.id));farm.rooms[r].slots.forEach((id,s)=>{if(pending.delete(id))ids[r*6+s]=id;});
  // A replacement uses its old kind's slot. Crossing two replacement slots
  // would unnecessarily require two free inventory spaces instead of one.
  for(const id of pending){const s=farm.rooms[r].slots.findIndex((old,index)=>old!==0n&&ids[r*6+index]===0n&&items.get(old)?.kind===items.get(id)?.kind);if(s>=0){ids[r*6+s]=id;pending.delete(id);}}
  for(const id of pending){let s=farm.rooms[r].slots.findIndex((old,index)=>old===0n&&ids[r*6+index]===0n);if(s<0)s=ids.slice(r*6,r*6+6).indexOf(0n);ids[r*6+s]=id;}
 });return ids;
}
export function minimalMoves(farm:Farm,target:bigint[]):Move[]|null{
 if(!legalLoadout(target,farm))return null;
 const start=loadout(farm),items=new Map(farm.items.map(i=>[i.id,i])),capacity=Number(farm.capacity);
 const lower=(ids:bigint[])=>ids.reduce((n,id,i)=>n+(id!==target[i]?(id?1:0)+(target[i]?1:0):0),0);
 const options=(ids:bigint[],temporary=false):Move[]=>{
  const held=new Set(ids.filter(Boolean)),used=farm.items.length-held.size,result:Move[]=[];
  // Placements first release inventory space without displacing other hardware.
  for(const room of farm.rooms.filter(r=>r.unlocked))for(let s=0;s<6;s++){
   const at=room.index*6+s;if(ids[at])continue;
   const candidates=temporary?farm.items:[items.get(target[at])].filter(Boolean) as Item[];
   for(const item of candidates){if(held.has(item.id)||item.enhancing||farm.level<BigInt(LEVEL_GATES[item.rarity]))continue;
    if(ids.slice(room.index*6,room.index*6+6).some(id=>items.get(id)?.kind===item.kind))continue;
    result.push({kind:'place',id:item.id,room:room.index,slot:s,...(item.id!==target[at]?{temporary:true}:{})});
   }
  }
  if(used<capacity)ids.forEach((id,at)=>{if(id&&(temporary||id!==target[at]))result.push({kind:'unplace',id,room:Math.floor(at/6),slot:at%6,...(id===target[at]?{temporary:true}:{})});});
  return result;
 };
 const apply=(ids:bigint[],m:Move)=>{const next=[...ids];next[m.room*6+m.slot]=m.kind==='place'?m.id:0n;return next;};
 // Usually the lower bound is achievable directly. Search all removal orders,
 // because choosing the wrong one can consume the only free inventory space.
 const directSeen=new Set<string>();
 const direct=(ids:bigint[],path:Move[]):Move[]|null=>{if(!lower(ids))return path;const k=ids.join(',');if(directSeen.has(k))return null;directSeen.add(k);for(const m of options(ids)){const result=direct(apply(ids,m),[...path,m]);if(result)return result;}return null;};
 const immediate=direct(start,[]);if(immediate)return immediate;
 // Full inventory may need a temporary placement in a spare room. Breadth-first
 // A* with an admissible remaining-moves bound proves the shortest sequence.
 type Node={ids:bigint[];path:Move[];bound:number};
 const queue:Node[]=[{ids:start,path:[],bound:lower(start)}],seen=new Map<string,number>();
 while(queue.length){queue.sort((a,b)=>b.bound-a.bound||b.path.length-a.path.length);const node=queue.pop()!,key=node.ids.join(',');if((seen.get(key)??Infinity)<=node.path.length)continue;seen.set(key,node.path.length);if(!lower(node.ids))return node.path;
  for(const m of options(node.ids,true)){const ids=apply(node.ids,m),length=node.path.length+1;if((seen.get(ids.join(','))??Infinity)<=length)continue;queue.push({ids,path:[...node.path,m],bound:length+lower(ids)});}
 }
 return null;
}
export function optimizeFarm(farm:Farm,rules:RuleSet,onProgress?:(visited:number,best:bigint)=>void):Plan{
 const initial=loadout(farm),before=score(initial,farm.items,rules);
 let best:Plan={ids:initial,moves:[],before,after:before,visited:0},visited=0;
 const candidates=farm.items.filter(i=>!i.enhancing&&i.holder.toLowerCase()===farm.wallet.toLowerCase()&&farm.level>=BigInt(LEVEL_GATES[i.rarity]));
 // Strong hardware first improves the incumbent early. All alternatives remain
 // in the exact search; there is no greedy cutoff or fixed search budget.
 candidates.sort((a,b)=>{const x=itemBase(a)*a.output,y=itemBase(b)*b.output;return x===y?Number(a.id-b.id):x>y?-1:1;});
 const groups:Item[][]=farm.rooms.map(()=>[]),unlocked=farm.rooms.filter(r=>r.unlocked).map(r=>r.index),masks=[0,0,0,0];
 const popcount=(n:number)=>{let count=0;for(;n;n&=n-1)count++;return count;};
 const remainingMasks:number[]=Array(candidates.length+1).fill(0),remainingRarity:number[][]=Array.from({length:candidates.length+1},()=>[0,0,0,0,0]);
 for(let i=candidates.length-1;i>=0;i--){remainingMasks[i]=remainingMasks[i+1]|1<<candidates[i].kind;remainingRarity[i]=[...remainingRarity[i+1]];remainingRarity[i][candidates[i].rarity]|=1<<candidates[i].kind;}
 const baseProductive=candidates.map(i=>itemBase(i)*i.output/10000n),enhancedProductive=candidates.map(i=>itemBase(i)*(10000n+(rules.enhancement[i.overclock]??0n))/10000n*i.output/10000n);
 const bases=[0n,0n,0n,0n],enhanced=[0n,0n,0n,0n];
 // Optimistic completion for each room: a bonus is possible only if the
 // remaining distinct kinds/rarities can satisfy it within its free slots.
 // Bonuses may compete for those slots, so this remains an upper bound.
 const roomBound=(r:number,index:number)=>{
  const p=rules.current,free=6-groups[r].length,mask=masks[r],available=remainingMasks[index]&~mask;
  const possible=(required:number)=>{const missing=required&~mask;return !(missing&~available)&&popcount(missing)<=free;};
  let bonus=possible(7)?p.TripleCoreBps:possible(3)?p.ComputePairBps:0n;
  if(possible(64|1024))bonus+=p.AirflowBps;
  let tags=0,possibleTags=0;for(let kind=0;kind<12;kind++){const t=kind<3?0:kind<6?1:kind<8?2:kind===8?3:4;if(mask&1<<kind)tags|=1<<t;if((mask|available)&1<<kind)possibleTags|=1<<t;}
  if(possibleTags===31&&popcount(31&~tags)<=free)bonus+=p.FullSetBps;
  let rarityBonus=0n;for(let rarity=1;rarity<=4;rarity++){const count=groups[r].filter(i=>i.rarity===rarity).length,needed=Math.max(0,3-count),value=[0n,p.RareSetBps,p.EpicSetBps,p.LegendarySetBps,p.MythicSetBps][rarity];if(needed<=free&&popcount(remainingRarity[index][rarity]&~mask)>=needed&&value>rarityBonus)rarityBonus=value;}
  bonus+=rarityBonus;return bonus<p.SetCapBps?bonus:p.SetCapBps;
 };
 const spareChoices=new Map<string,number>();
 const dfs=(index:number,installed:number)=>{
  visited++;if(visited%16384===0)onProgress?.(visited,best.after.productive);
  const empty=unlocked.reduce((n,r)=>n+6-groups[r].length,0),bonuses=groups.map((_,r)=>roomBound(r,index));
  let upper=unlocked.reduce((sum,r)=>sum+enhanced[r]+bases[r]*bonuses[r]/10000n,0n);
  const future:bigint[]=[];for(let i=index;i<candidates.length;i++){let possible:bigint|null=null;for(const r of unlocked)if(groups[r].length<6&&!(masks[r]&1<<candidates[i].kind)){const value=enhancedProductive[i]+baseProductive[i]*bonuses[r]/10000n+1n;if(possible===null||value>possible)possible=value;}if(possible!==null)future.push(possible);}
  upper+=future.sort((a,b)=>a>b?-1:1).slice(0,empty).reduce((a,b)=>a+b,0n);
  if(upper<best.after.productive)return;
  if(index===candidates.length||!empty){
   if(BigInt(farm.items.length-installed)>farm.capacity)return;
   const after=score(stableSlots(groups,farm),farm.items,rules);
   if(after.productive<best.after.productive||after.productive===best.after.productive&&after.power>best.after.power)return;
   // Rooms have identical scoring rules. Search each unordered partition once,
   // then try every room label to retain the cheapest reachable transaction path.
   const layouts:{ids:bigint[];bound:number}[]=[],mapped:Item[][]=farm.rooms.map(()=>[]),used=new Set<number>();
   const label=(at:number)=>{if(at===unlocked.length){const ids=stableSlots(mapped,farm),bound=ids.reduce((n,id,i)=>n+(id!==initial[i]?(id?1:0)+(initial[i]?1:0):0),0);layouts.push({ids,bound});return;}
    for(const from of unlocked){if(used.has(from))continue;used.add(from);mapped[unlocked[at]]=groups[from];label(at+1);used.delete(from);}
   };label(0);layouts.sort((a,b)=>a.bound-b.bound);
   for(const {ids,bound} of layouts){
    if(after.productive===best.after.productive&&after.power===best.after.power&&bound>=best.moves.length)continue;
    const moves=minimalMoves(farm,ids);if(!moves)continue;
    if(after.productive===best.after.productive&&after.power===best.after.power&&moves.length>=best.moves.length)continue;
    best={ids,moves,before,after,visited};
   }return;
  }
  const item=candidates[index],original=farm.rooms.find(r=>r.slots.includes(item.id))?.index;
  const order=[...unlocked].sort((a,b)=>Number(b===original)-Number(a===original));
  const profile=original===undefined?`${item.kind}:${item.rarity}:${item.durability}:${item.output}:${item.overclock}`:null,previous=profile?spareChoices.get(profile):undefined;
  const rememberChoice=(r:number)=>{if(profile)spareChoices.set(profile,r);};
  const restoreChoice=()=>{if(profile){if(previous===undefined)spareChoices.delete(profile);else spareChoices.set(profile,previous);}};
  let emptyTried=false;
  for(const r of order){if(previous!==undefined&&r<previous)continue;if(groups[r].length===0){if(emptyTried)continue;emptyTried=true;}if(groups[r].length===6||(masks[r]&(1<<item.kind)))continue;
   rememberChoice(r);groups[r].push(item);masks[r]|=1<<item.kind;bases[r]+=baseProductive[index];enhanced[r]+=enhancedProductive[index];dfs(index+1,installed+1);bases[r]-=baseProductive[index];enhanced[r]-=enhancedProductive[index];masks[r]&=~(1<<item.kind);groups[r].pop();restoreChoice();
  }
  // Leaving an item in inventory is a legal candidate, even if lower rarity
  // hardware beats it by completing a set or avoiding a duplicate kind.
  if(farm.items.length-installed-(candidates.length-index-1)<=Number(farm.capacity)){rememberChoice(4);dfs(index+1,installed);restoreChoice();}
 };
 dfs(0,0);best.visited=visited;onProgress?.(visited,best.after.productive);return best;
}
export function activeCombos(items:Item[],rules:RuleSet){
 const s=roomMath(items,rules),p=rules.current,mask=items.reduce((n,i)=>n|1<<i.kind,0),tags=items.filter(i=>!(rules.theft&&i.kind===8&&!s.locked)).reduce((n,i)=>n|1<<(i.kind<3?0:i.kind<6?1:i.kind<8?2:i.kind===8?3:4),0),list:{name:string;effect:string}[]=[];
 const hash=(name:string,b:bigint)=>list.push({name,effect:`+${Number(b)/100}% hash`});
 if((mask&3)===3)hash((mask&7)===7?'Triple Core':'Compute Duo',(mask&7)===7?p.TripleCoreBps:p.ComputePairBps);
 if(tags===31)hash('Full Stack',p.FullSetBps);if(s.airflow)hash('Airflow',p.AirflowBps);
 if(s.cold)list.push({name:'Cold Power',effect:`−${Number(p.ElectricityPairBps)/100}% power · fire protection`});
 if(s.offgrid)list.push({name:'Off-grid',effect:`−${Number(p.OffgridBps)/100}% power · half output during outages`});
 if(s.clean)list.push({name:'Clean Power',effect:'Surge protection'});if(s.locked)list.push({name:'Locked Rack',effect:'Theft protection'});
 for(let r=4;r>0;r--)if(items.filter(i=>i.rarity===r&&!(rules.theft&&i.kind===8&&!s.locked)).length>=3){hash(['','Rare set','Epic set','Legendary set','Mythic set'][r],p[(['','RareSetBps','EpicSetBps','LegendarySetBps','MythicSetBps'] as const)[r] as keyof typeof p]);break;}
 return list;
}
