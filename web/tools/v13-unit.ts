import assert from 'node:assert/strict';
import { estimateOptimization } from '../src/farm-rules';
import { rpcTransport, deniedEndpoint } from '../src/chain';
import { chain, RPC_URLS } from '../src/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { optimizeFarm, minimalMoves } from '../src/optimizer';
import { roomMath, score, loadout, legalLoadout, bestInsertion, type RuleSet } from '../src/farm-math';
import { referralPrecheck, validInviter, referralCredit } from '../src/referrals';
import { repairPlan, unopened, NotificationEvents, type Today } from '../src/today';
import { isLogRangeError, scanLogRanges, newLogScan } from '../src/logs';
import type { Farm, Item, Home } from '../src/data';
const wallet='0x83027ad9d0d5374335086c539dadd1db983441b0',inviter='0x40499cca542b3cd2db0287fa0b6da87002f042e8',zero='0x0000000000000000000000000000000000000000';
// Synthetic test data only; deployed Params are read by production loadRules.
export const rules:RuleSet={current:{FullSetBps:1500n,ComputePairBps:1000n,TripleCoreBps:2000n,AirflowBps:500n,ElectricityPairBps:1500n,OffgridBps:2000n,RareSetBps:500n,EpicSetBps:1000n,LegendarySetBps:2000n,MythicSetBps:3000n,SetCapBps:10000n},maximum:{FullSetBps:1500n,ComputePairBps:1000n,TripleCoreBps:2000n,AirflowBps:500n,ElectricityPairBps:1500n,OffgridBps:2000n,RareSetBps:500n,EpicSetBps:1000n,LegendarySetBps:2000n,MythicSetBps:3000n,SetCapBps:10000n},enhancement:{0:0n,1:300n,16:7000n},epoch:4n,theft:false,block:1n};
export const hardware=(id:number,kind:number,rarity=0,output=10000n):Item=>({id:BigInt(id),kind,rarity,output,holder:wallet,durability:output===10000n?10000:5000,overclock:0,starter:false,equipped:false,enhancing:0n,repair:10n});
export function farmFixture(items:Item[],rooms=1,level=10n,capacity=15n):Farm{return {wallet,items,rooms:Array.from({length:4},(_,index)=>({index,unlocked:index<rooms,eligible:index<rooms,slots:Array(6).fill(0n),price:0n,stats:roomMath([],rules)})),level,capacity,inventory:BigInt(items.length),paidPacks:1n,hash:0n,pending:0n} as Farm;}
const estimate=estimateOptimization({available:1000000n*10n**18n,emission:350n,tariff:1500n,precision:10n**27n,competitors:100000n,boost:0n},{raw:10000n,productive:10000n,power:10000n,allocation:10000n},{raw:20000n,productive:20000n,power:20000n,allocation:20000n});assert(estimate>0n);assert(estimate<1000n*10n**18n);
const passes:string[]=[];const pass=(s:string)=>{passes.push(s);console.log('PASS',s);};
const combo=roomMath([hardware(1,0,1),hardware(2,1,1),hardware(3,2,1)],rules);assert.equal(combo.bonus,2500n);assert.equal(combo.productive,105000n);assert.equal(combo.raw,105000n);
const lowerRules={...rules,current:{...rules.current,ComputePairBps:500n}};assert.equal(roomMath([hardware(1,0),hardware(2,1)],lowerRules).raw,21000n);assert.equal(roomMath([hardware(1,0),hardware(2,1)],lowerRules,true).raw,22000n);
const health=roomMath([{...hardware(1,0,0,6500n),overclock:1},hardware(2,1)],rules);assert.equal(health.raw,22300n);assert.equal(health.productive,18345n);assert.equal(health.power,18345n);
const all=roomMath([hardware(1,0),hardware(2,3),hardware(3,7),hardware(4,8),hardware(5,10),hardware(6,11)],rules);assert.equal(all.bonus,1500n);assert.equal(all.productive,46000n);assert.equal(all.power,39100n);assert(all.cold&&all.clean&&all.locked);
const stolen=roomMath([hardware(1,8),hardware(2,0)],{...rules,theft:true});assert.equal(stolen.productive,10000n);
const deadCombo=roomMath([hardware(1,6,0,0n),hardware(2,10)],rules);assert(deadCombo.airflow);assert.equal(deadCombo.productive,6300n);
const cap=roomMath([{...hardware(1,0,4),overclock:16},{...hardware(2,1,4),overclock:16},{...hardware(3,2,4),overclock:16}],rules);assert.equal(cap.productive,4800000n);pass('Engine integer math: mutually exclusive compute combos, rarity, full tags, health, enhancements, theft, zero-health masks and cap');
let seed=145;const random=(n:number)=>{seed=(seed*1664525+1013904223)>>>0;return seed%n;};
for(let round=0;round<65;round++){
 const f=farmFixture(Array.from({length:4+random(4)},(_,i)=>hardware(i+1,random(12),random(5),[0n,4000n,6500n,8500n,10000n][random(5)])),1+random(2),BigInt(1+random(10)));
 const plan=optimizeFarm(f,rules);assert(legalLoadout(plan.ids,f));let ids=loadout(f),inventory=f.items.length;
 for(const move of plan.moves){const at=move.room*6+move.slot,item=f.items.find(i=>i.id===move.id)!;if(move.kind==='place'){assert.equal(ids[at],0n);assert(!ids.includes(item.id));assert(!ids.slice(move.room*6,move.room*6+6).some(id=>f.items.find(i=>i.id===id)?.kind===item.kind));ids[at]=item.id;inventory--;}else{assert.equal(ids[at],item.id);ids[at]=0n;inventory++;}assert(inventory<=Number(f.capacity));}
 assert.deepEqual(ids,plan.ids);assert.equal(score(ids,f.items,rules).productive,plan.after.productive);
 // Independent exhaustive assignment oracle for these small randomized farms.
 let maximum=0n;const slots=Array<bigint>(24).fill(0n),counts=[0,0,0,0];
 const brute=(i:number)=>{if(i===f.items.length){if(legalLoadout(slots,f)){const value=score(slots,f.items,rules).productive;if(value>maximum)maximum=value;}return;}
  brute(i+1);for(const room of f.rooms.filter(r=>r.unlocked)){if(counts[room.index]>=6)continue;const at=room.index*6+counts[room.index]++;slots[at]=f.items[i].id;brute(i+1);slots[at]=0n;counts[room.index]--;}};
 brute(0);assert.equal(plan.after.productive,maximum);
}
pass('65 seeded exhaustive-oracle farms: exact optimum, gates, unique kinds, ownership, capacity and legal transaction prefixes');
const f=farmFixture([hardware(1,0),hardware(2,1),hardware(3,0,3)],1,2n,1n);f.items[0].equipped=true;f.items[1].equipped=true;f.rooms[0].slots=[1n,2n,0n,0n,0n,0n];assert.equal(bestInsertion(f.items[2],f,rules),null);assert(!legalLoadout([3n,2n,...Array(22).fill(0n)],f));
const swap=farmFixture([hardware(1,0),hardware(2,0)],2,10n,2n);swap.rooms[0].slots[0]=1n;swap.rooms[1].slots[0]=2n;swap.items.forEach(i=>i.equipped=true);const target=loadout(swap);target[0]=2n;target[6]=1n;assert.equal(minimalMoves(swap,target)?.length,4);
const replacements=farmFixture([...Array.from({length:6},(_,i)=>({...hardware(i+1,i),equipped:true})),hardware(7,1,1),hardware(8,0,1)],1,10n,3n);replacements.rooms[0].slots=[1n,2n,3n,4n,5n,6n];const replacementPlan=optimizeFarm(replacements,rules);assert.equal(replacementPlan.ids[0],8n);assert.equal(replacementPlan.ids[1],7n);assert.equal(replacementPlan.moves.length,4);assert(replacementPlan.after.productive>replacementPlan.before.productive);
const temporary=farmFixture([hardware(1,0),hardware(2,1)],1,10n,1n);temporary.items[0].equipped=true;temporary.rooms[0].slots[0]=1n;const destination=loadout(temporary);destination[0]=2n;const moves=minimalMoves(temporary,destination)!;assert.equal(moves.length,6);assert(moves.some(m=>m.temporary));
pass('Minimal moves retain slots, solve one-space swaps, and use the shortest temporary placement with full inventory');
assert.equal(referralCredit(201n),10n);assert.equal(referralCredit(19n),0n);assert(validInviter(inviter));assert(!validInviter(zero));assert(!validInviter('javascript:alert(1)'));assert(!referralPrecheck(wallet,wallet,true,zero));assert(!referralPrecheck(wallet,inviter,false,zero));assert(!referralPrecheck(wallet,inviter,true,inviter));assert(referralPrecheck(wallet,inviter,true,zero));pass('Referral address and view prechecks reject self, zero, malformed, missing farm and existing referrer');
const today={receipts:[{remaining:3n,resolved:false},{remaining:2n,resolved:true}],cable:true,cableCost:25n,drops:0n,letter:'fixture',referrer:zero} as Today;
const repair=repairPlan(farmFixture([hardware(1,0,0,6500n),hardware(2,1)]),today);assert.equal(repair.total,35n);assert.equal(repair.items.length,1);assert.equal(unopened(today),3n);
const events=new NotificationEvents(),nf=farmFixture([{...hardware(1,0,0,0n),durability:2900}]);nf.pending=1n;nf.claimNet=1n;const home={epoch:4n,epochEnd:1500n,timestamp:1000,fetchedAt:Date.now()} as Home;
assert.equal(events.events(nf,home).length,3);assert.equal(events.events(nf,home).length,0);nf.pending=0n;nf.items[0].durability=10000;events.events(nf,home);nf.pending=1n;nf.items[0].durability=2900;assert.equal(events.events(nf,home).length,2);nf.items.push({...hardware(2,1),durability:2000},{...hardware(3,3),durability:1000});assert.equal(events.events(nf,home).length,1);pass('Today sums item+cable quotes, counts unresolved packs and deduplicates threshold notifications');
const ranges:{fromBlock:bigint;toBlock:bigint}[]=[];await scanLogRanges(0n,25000n,newLogScan(),async r=>{if(r.toBlock-r.fromBlock>=3000n)throw Error('block range too large');return r;},r=>{ranges.push(r);});assert.equal(ranges[0].fromBlock,0n);assert.equal(ranges.at(-1)!.toBlock,25000n);ranges.slice(1).forEach((r,i)=>assert.equal(r.fromBlock,ranges[i].toBlock+1n));assert(!isLogRangeError({status:403,message:'Forbidden'}));assert(!isLogRangeError({status:429,message:'Rate limited'}));pass('Logs adapt to provider range limits without gaps; authorization and rate limits do not cause split storms');
assert(!deniedEndpoint(Error('The contract function reverted: Unauthorized()')));
const originalFetch=globalThis.fetch,calls:string[]=[];
globalThis.fetch=(async(url,options)=>{const address=String(url);calls.push(address);if(address===RPC_URLS[0])return new Response('Forbidden',{status:403});const body=JSON.parse(String(options?.body)),requests=Array.isArray(body)?body:[body],result=requests.map((r:any)=>({jsonrpc:'2.0',id:r.id,result:'0x1237'}));return new Response(JSON.stringify(Array.isArray(body)?result:result[0]),{headers:{'content-type':'application/json'}});}) as typeof fetch;
try{const first=rpcTransport()({chain,retryCount:0});assert.equal(await first.request({method:'eth_chainId'}),'0x1237');const denied=calls.filter(url=>url===RPC_URLS[0]).length;const second=rpcTransport()({chain,retryCount:0});assert.equal(await second.request({method:'eth_chainId'}),'0x1237');assert.equal(calls.filter(url=>url===RPC_URLS[0]).length,denied);assert.equal(denied,1);}finally{globalThis.fetch=originalFetch;}
pass('HTTP 403 endpoint is dropped across clients; healthy fallback continues without repeated rejected requests');
mkdirSync('artifacts/v13',{recursive:true});writeFileSync('artifacts/v13/unit.json',JSON.stringify({checkedAt:new Date().toISOString(),passes,randomFarms:65},null,2));
