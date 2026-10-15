import { type Address } from 'viem';
import { ABI, addresses, client, read } from './chain';
import type { ContractName } from './config';
import { COMBO_KEYS, type Bonuses, type RuleSet, roomMath, loadout, score } from './farm-math';
import type { Farm, RoomStats } from './data';
import { cableStatus } from './today';
async function ruleRead<T>(block:bigint,name:ContractName,functionName:string,args:readonly unknown[]=[]):Promise<T>{return await client.readContract({address:addresses[name],abi:ABI[name],functionName,args,blockNumber:block}) as T;}
export async function loadRules(farm:Farm):Promise<RuleSet>{
 const block=await client.getBlockNumber({cacheTime:0});
 const [address,epoch,theft]=await Promise.all([ruleRead<Address>(block,'FarmCore','params'),ruleRead<bigint>(block,'FarmRewards','epoch'),cableStatus(farm.wallet,block)]);
 if(theft===null)throw Error('Cable status could not be verified. Refresh and retry. If Today shows a damaged cable, repair it before optimizing.');
 const values=await Promise.all(Object.entries(COMBO_KEYS).map(async([name,key])=>{
  const [current,bounds]=await Promise.all([client.readContract({address,abi:ABI.Params,functionName:'get',args:[key],blockNumber:block}),client.readContract({address,abi:ABI.Params,functionName:'bounds',args:[key],blockNumber:block})]);
  return [name,current,(bounds as [bigint,bigint])[1]] as const;
 }));
 const enhancement:Record<number,bigint>={0:0n};
 await Promise.all([...new Set(farm.items.map(i=>i.overclock))].filter(Boolean).map(async level=>{const table=await ruleRead<readonly [bigint,bigint,bigint,bigint]>(block,'Enhancement','table',[BigInt(level)]);enhancement[level]=table[2];}));
 const rules:RuleSet={current:Object.fromEntries(values.map(([k,v])=>[k,v])) as Bonuses,maximum:Object.fromEntries(values.map(([k,,v])=>[k,v])) as Bonuses,enhancement,epoch,theft,block};
 // No Router (or a protected Router) makes both theft predicates produce the
 // same current roomStats. Use repair eligibility, never that ambiguous match.
 const live=await Promise.all(farm.rooms.map(r=>ruleRead<RoomStats>(block,'FarmCore','roomStats',[farm.wallet,BigInt(r.index)])));
 if(!live.every((s,r)=>sameStats(s,roomMath(farm.items.filter(i=>farm.rooms[r].slots.includes(i.id)),rules))))throw Error('Farm changed while loading rules. Refresh and try again.');
 await verifyLoadout(farm,loadout(farm),rules);
 return rules;
}
export function sameStats(a:RoomStats,b:RoomStats){return Object.keys(b).every(k=>a[k as keyof RoomStats]===b[k as keyof RoomStats]);}
export async function verifyLoadout(farm:Farm,ids:bigint[],rules:RuleSet){
 const local=score(ids,farm.items,rules);
 const [allocation,...rooms]=await Promise.all([
  ruleRead<bigint>(rules.block,'FarmEngine','allocationHash',[ids,farm.paidPacks>0n]),
  ...farm.rooms.map(r=>ruleRead<RoomStats>(rules.block,'FarmEngine','preview',[ids,rules.theft?rules.epoch+1n:0n,BigInt(r.index)]))
 ]);
 if(allocation!==local.allocation||rooms.some((r,index)=>!sameStats(r,roomMath(farm.items.filter(i=>ids.slice(index*6,index*6+6).includes(i.id)),rules))))throw Error('Contract preview differs from this plan. Refresh and optimize again.');
 return local;
}
export type OptimizationEconomy={available:bigint;emission:bigint;tariff:bigint;precision:bigint;competitors:bigint;boost:bigint};
export async function optimizationEconomy(farm:Farm,epoch:bigint):Promise<OptimizationEconomy>{
 const [address,block]=await Promise.all([read<Address>('FarmCore','params'),client.getBlock()]);
 const [available,emission,tariff,precision,nextTotal,expiring,own,boost]=await Promise.all([
  read<bigint>('RewardPool','available'),client.readContract({address,abi:ABI.Params,functionName:'get',args:[0]}),client.readContract({address,abi:ABI.Params,functionName:'get',args:[1]}),read<bigint>('FarmRewards','PRECISION'),read<bigint>('FarmRewards','nextTotalHash'),read<bigint>('FarmRewards','expiring',[epoch+1n]),read<bigint>('FarmRewards','farmWeight',[farm.wallet,epoch+1n]),read<bigint>('Economy','boostAt',[farm.wallet,block.timestamp]),
 ]);
 return {available,emission:emission as bigint,tariff:tariff as bigint,precision,competitors:nextTotal>expiring+own?nextTotal-expiring-own:0n,boost};
}
export function estimateOptimization(s:OptimizationEconomy,before:ReturnType<typeof score>,after:ReturnType<typeof score>){
 // Full epoch: FarmRewards' miningSeconds/EPOCH cancels. Governance emission,
 // tariff, precision and next-epoch competitors are all views, not UI defaults.
 const budget=s.available*s.emission/40000n;
 const net=(value:ReturnType<typeof score>)=>{const scale=(v:bigint)=>v*(10000n+s.boost)/10000n,denominator=s.competitors+scale(value.allocation);if(!denominator)return 0n;const rate=budget*s.precision/denominator,gross=scale(value.productive)*rate/s.precision,power=scale(value.power)*rate/s.precision*s.tariff/10000n;return gross-(power<gross?power:gross);};
 return net(after)-net(before);
}
