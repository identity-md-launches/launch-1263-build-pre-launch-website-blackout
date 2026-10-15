// Integer translation of the pinned FarmEngine._stats/_accumulate and ItemMath.
// Constants below have no public view/Params key. Mutable values come from RuleSet.
import type { Item, RoomStats, Farm } from './data';
import { LEVEL_GATES } from './player';
export const COMBO_KEYS={FullSetBps:11,ComputePairBps:12,TripleCoreBps:13,AirflowBps:14,ElectricityPairBps:15,OffgridBps:16,RareSetBps:17,EpicSetBps:18,LegendarySetBps:19,MythicSetBps:20,SetCapBps:21} as const;
export type Bonuses=Record<keyof typeof COMBO_KEYS,bigint>;
export type RuleSet={current:Bonuses;maximum:Bonuses;enhancement:Record<number,bigint>;epoch:bigint;theft:boolean;block:bigint};
export const itemBase=(i:Pick<Item,'kind'|'rarity'>)=>[10000n,28000n,80000n,250000n,800000n][i.rarity]*(i.kind<3?10000n:6000n)/10000n;
export const tag=(kind:number)=>kind<3?0:kind<6?1:kind<8?2:kind===8?3:4;
const min=(a:bigint,b:bigint)=>a<b?a:b;
export function roomMath(items:Item[],rules:RuleSet,allocation=false):RoomStats{
 const p=allocation?rules.maximum:rules.current,mask=items.reduce((n,i)=>n|(1<<i.kind),0);
 const s:RoomStats={raw:0n,productive:0n,power:0n,bonus:0n,cooling:!!(mask&192),airflow:!!(mask&64)&&!!(mask&1024),cold:!!(mask&8)&&!!(mask&128),offgrid:!!(mask&16)&&!!(mask&32),clean:!!(mask&2048)&&!!(mask&8),locked:!!(mask&256)&&!!(mask&1024)};
 let base=0n,productive=0n,tags=0;const rarity=[0,0,0,0,0];
 for(const i of items){
  if(!allocation&&rules.theft&&i.kind===8&&!s.locked)continue;
  tags|=1<<tag(i.kind);rarity[i.rarity]++;
  const raw=itemBase(i),tier=allocation?10000n:i.output,enhanced=raw*(10000n+(rules.enhancement[i.overclock]??0n))/10000n;
  base+=raw;productive+=raw*tier/10000n;s.raw+=enhanced;s.productive+=enhanced*tier/10000n;
 }
 if((mask&3)===3)s.bonus+=(mask&7)===7?p.TripleCoreBps:p.ComputePairBps;
 if(tags===31)s.bonus+=p.FullSetBps;
 if(s.airflow)s.bonus+=p.AirflowBps;
 for(let r=4;r>0;r--)if(rarity[r]>=3){s.bonus+=p[(['','RareSetBps','EpicSetBps','LegendarySetBps','MythicSetBps'] as const)[r] as keyof Bonuses];break;}
 s.bonus=min(s.bonus,p.SetCapBps);
 s.raw=min(s.raw+base*s.bonus/10000n,base*(10000n+p.SetCapBps)/10000n);
 s.productive=min(s.productive+productive*s.bonus/10000n,productive*(10000n+p.SetCapBps)/10000n);
 s.power=s.productive*(10000n-(s.cold?p.ElectricityPairBps:0n)-(s.offgrid?p.OffgridBps:0n))/10000n;
 return s;
}
export const loadout=(farm:Farm)=>farm.rooms.flatMap(r=>r.slots);
export function score(ids:bigint[],items:Item[],rules:RuleSet){
 const map=new Map(items.map(i=>[i.id,i]));let productive=0n,power=0n,raw=0n,allocation=0n;
 for(let r=0;r<4;r++){const room=ids.slice(r*6,r*6+6).flatMap(id=>map.has(id)?[map.get(id)!]:[]),s=roomMath(room,rules);productive+=s.productive;power+=s.power;raw+=s.raw;allocation+=roomMath(room,rules,true).raw;}
 return {productive,power,raw,allocation};
}
export function legalLoadout(ids:bigint[],farm:Farm){
 if(ids.length!==24||new Set(ids.filter(Boolean)).size!==ids.filter(Boolean).length)return false;
 const map=new Map(farm.items.map(i=>[i.id,i]));
 for(const r of farm.rooms){const room=ids.slice(r.index*6,r.index*6+6),kinds=new Set<number>();for(const id of room){if(id===0n)continue;const i=map.get(id);if(!i||!r.unlocked||i.holder.toLowerCase()!==farm.wallet.toLowerCase()||i.enhancing||farm.level<BigInt(LEVEL_GATES[i.rarity])||kinds.has(i.kind))return false;kinds.add(i.kind);}}
 return BigInt(farm.items.length-ids.filter(Boolean).length)<=farm.capacity;
}
export function bestInsertion(item:Item,farm:Farm,rules:RuleSet){
 const ids=loadout(farm),before=score(ids,farm.items,rules).productive;let best:bigint|null=null;
 if(item.equipped||item.enhancing||farm.level<BigInt(LEVEL_GATES[item.rarity]))return null;
 for(const r of farm.rooms.filter(r=>r.unlocked))for(let s=0;s<6;s++){if(ids[r.index*6+s]!==0n)continue;const candidate=[...ids];candidate[r.index*6+s]=item.id;if(legalLoadout(candidate,farm)){const gain=score(candidate,farm.items,rules).productive-before;if(best===null||gain>best)best=gain;}}
 return best;
}
