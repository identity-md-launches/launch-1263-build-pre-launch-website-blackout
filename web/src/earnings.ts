import type { Farm, Item, Room } from './data';
export const EPOCH_SECONDS=21600;
export type EpochData={start:bigint;end:bigint;raw:bigint;miningSeconds:bigint;mining:bigint;emission:bigint;tariff:bigint;rewardPerHash:bigint;kind:number;district:number};
export type EconomySnapshot={epoch:bigint;epochData:EpochData;previous:EpochData;available:bigint;farms:bigint;activeFarms:bigint;locked:bigint;dripEnd:bigint;timestamp:number;fetchedAt:number};
export type EarningsHistory={mined:bigint;claimed:bigint;claimedGross:bigint;epochs:{epoch:bigint;amount:bigint}[];through:bigint};
export function miningBudget(s:EconomySnapshot,available=s.available,seconds=s.epochData.miningSeconds){return available*s.epochData.emission*seconds/(40000n*BigInt(EPOCH_SECONDS));}
export function netMining(mining:bigint,total:bigint,productive:bigint,power=productive,tariff=1500n,audit=false){
 if(total<=0n||productive<=0n)return 0n;
 const rate=mining*10n**27n/total,gross=rate*productive/10n**27n,after=gross-(audit?gross/10n:0n),electricity=(rate*power/10n**27n)*tariff/10000n;
 return after-(electricity<after?electricity:after);
}
export const baseHash=(item:Pick<Item,'rarity'|'kind'>)=>BigInt([10000,28000,80000,250000,800000][item.rarity])*(item.kind<3?10000n:6000n)/10000n;
// ItemMath.draw: 43% compute, 57% support (60% base hash); mythic falls back to Common below level 10.
export function averagePackHash(mythic=false){return BigInt(Math.round(3*(.7*10000+.22*28000+.067*80000+.01*250000+.003*(mythic?800000:10000))*(.43+.57*.6)));}
export function farmOutput(farm:Farm){return farm.rooms.filter(r=>r.unlocked).reduce((s,r)=>({productive:s.productive+r.stats.productive,power:s.power+r.stats.power,raw:s.raw+r.stats.raw}),{productive:0n,power:0n,raw:0n});}
export function farmEpoch(s:EconomySnapshot,farm:Farm){
 const f=farmOutput(farm);if(!f.raw||!farm.hash)return 0n;
 return netMining(miningBudget(s),s.epochData.raw,f.productive*farm.hash/f.raw,f.power*farm.hash/f.raw,s.epochData.tariff);
}
export function roomEpoch(s:EconomySnapshot,farm:Farm,room:Room){
 const all=farmOutput(farm);if(!all.raw)return 0n;
 return netMining(miningBudget(s),s.epochData.raw,room.stats.productive*farm.hash/all.raw,room.stats.power*farm.hash/all.raw,s.epochData.tariff);
}
export function itemEpoch(s:EconomySnapshot,farm:Farm,item:Item){
 const room=farm.rooms.find(r=>r.slots.includes(item.id));
 if(!room)return netMining(miningBudget(s),s.epochData.raw+baseHash(item),baseHash(item)*item.output/10000n,baseHash(item)*item.output/10000n,s.epochData.tariff);
 const peers=farm.items.filter(i=>room.slots.includes(i.id)),weight=peers.reduce((n,i)=>n+baseHash(i)*i.output/10000n,0n);
 return weight?roomEpoch(s,farm,room)*(baseHash(item)*item.output/10000n)/weight:0n;
}
export function calculatorEpoch(s:EconomySnapshot,hash:bigint){return netMining(miningBudget(s,s.available,BigInt(EPOCH_SECONDS)),s.epochData.raw+hash,hash,hash,s.epochData.tariff);}
export type ProjectionPoint={day:number;low:bigint;current:bigint;high:bigint};
export function project(s:EconomySnapshot,productive:bigint,power:bigint,ownRaw:bigint,days:number):ProjectionPoint[]{
 const points:ProjectionPoint[]=[{day:0,low:0n,current:0n,high:0n}],states=[.05,0,-.01].map(growth=>({growth,pool:s.available,earned:0n,locked:s.locked}));
 const otherFarms=Math.max(0,Number(s.activeFarms)-(ownRaw>0n?1:0)),others=s.epochData.raw>ownRaw?s.epochData.raw-ownRaw:0n;
 const averageOtherHash=otherFarms>0?Number(others)/otherFarms:0;
 const dripLeft=Math.max(0,Number(s.dripEnd)-s.timestamp),drip=dripLeft>0?s.locked*BigInt(EPOCH_SECONDS)/BigInt(dripLeft):0n;
 for(let e=1;e<=days*4;e++){
  states.forEach(state=>{
   const release=state.locked<drip?state.locked:drip;state.pool+=release;state.locked-=release;
   const changingFarms=otherFarms*Math.pow(1+state.growth,e/4);
   // Without competitors there is no observed farm size to grow. Keep the
   // current scenario exact and exclude the player's fixed hash from growth.
   const otherHash=otherFarms>0&&state.growth!==0?BigInt(Math.round(changingFarms*averageOtherHash)):others;
   const total=ownRaw+(otherHash>0n?otherHash:0n),mining=miningBudget(s,state.pool,BigInt(EPOCH_SECONDS));
   state.earned+=netMining(mining,total,productive,power,s.epochData.tariff);
   // Baseline pool depletion after recycling unused budget: net city mining + 1% season allocation.
   const outflow=mining*(10000n-s.epochData.tariff+100n)/10000n;
   state.pool=state.pool>outflow?state.pool-outflow:0n;
  });
  points.push({day:e/4,low:states[0].earned,current:states[1].earned,high:states[2].earned});
 }
 return points;
}
export function payback(s:EconomySnapshot,price:bigint,mythic=false){
 const hash=averagePackHash(mythic),newSnapshot={...s,epochData:{...s.epochData,raw:s.epochData.raw+hash},activeFarms:s.activeFarms+1n};
 const points=project(newSnapshot,hash,hash,hash,365),hit=points.find(p=>p.current>=price);
 return {days:hit?.day??null,hash,daily:calculatorEpoch(s,hash)*4n};
}
export function inventoryCount(farm:Farm){return farm.inventory??BigInt(farm.items.filter(i=>!i.equipped).length);}
export function capacityReason(farm:Farm,needed=1){const used=inventoryCount(farm);return used+BigInt(needed)>farm.capacity?`Inventory ${used>=farm.capacity?'full':'needs space'} (${used}/${farm.capacity}). Scrap an item or expand${needed>1?` to make room for ${needed} items`:''}.`:'';}
