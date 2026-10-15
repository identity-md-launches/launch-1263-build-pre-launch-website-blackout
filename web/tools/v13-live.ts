import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
import { read,client,verifyRegistry } from '../src/chain';
import { loadFarm,type RoomStats } from '../src/data';
import { loadRules,sameStats } from '../src/farm-rules';
import { score,roomMath } from '../src/farm-math';
import { optimizeFarm } from '../src/optimizer';
import type { Address } from 'viem';
const results:any[]=[];
try{
 assert.deepEqual(await verifyRegistry(),[]);const count=await read<bigint>('FarmCore','count');assert(count>0n);
 const wallet=await read<Address>('FarmCore','playerAt',[0n]),farm=await loadFarm(wallet),rules=await loadRules(farm);
 console.log('Live farm',wallet,'items',farm.items.length,'level',String(farm.level));
 let seed=781;const random=(n:number)=>{seed=(seed*1664525+1013904223)>>>0;return seed%n;};
 for(let trial=0;trial<18;trial++){
  const ids=Array<bigint>(24).fill(0n),pool=[...farm.items];for(let i=0;i<Math.min(24,pool.length);i++){const at=random(pool.length);ids[i]=pool.splice(at,1)[0].id;}
  const theft=trial%2===0,local=score(ids,farm.items,{...rules,theft});
  const [allocation,...rooms]=await Promise.all([read<bigint>('FarmEngine','allocationHash',[ids,farm.paidPacks>0n]),...farm.rooms.map(r=>read<RoomStats>('FarmEngine','preview',[ids,theft?rules.epoch+1n:0n,BigInt(r.index)]))]);
  assert.equal(local.allocation,allocation);rooms.forEach((room,index)=>assert(sameStats(room,roomMath(farm.items.filter(i=>ids.slice(index*6,index*6+6).includes(i.id)),{...rules,theft}))));
  results.push({trial,theft,allocation,productive:local.productive});
 }
 const plan=optimizeFarm(farm,rules);assert.equal(await read<bigint>('FarmEngine','allocationHash',[plan.ids,farm.paidPacks>0n]),plan.after.allocation);
 const referrer=await read<Address>('FarmRewards','referrer',[wallet]);
 results.push({optimizer:{moves:plan.moves.length,visited:plan.visited,before:plan.before,after:plan.after},referrer});
 mkdirSync('artifacts/v13',{recursive:true});writeFileSync('artifacts/v13/live.json',JSON.stringify({checkedAt:new Date().toISOString(),block:await client.getBlockNumber(),wallet,items:farm.items.length,params:rules,results,limitations:['Read-only calls; no wallet signatures or real-money transactions. Random candidates test engine math independently of placement legality.']},(_,v)=>typeof v==='bigint'?v.toString():v,2));console.log('PASS live engine parity: 18 candidate arrays, 72 room previews, both theft predicates, optimized allocation and registry.');
}catch(error){console.error((error as any).shortMessage??String(error).split('\n')[0]);process.exitCode=1;}
