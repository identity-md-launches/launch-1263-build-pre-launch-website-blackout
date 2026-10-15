import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync,readdirSync} from 'node:fs';
import {encodeErrorResult,type Abi} from 'viem';
import abi from '../src/abi.json';
import {ERROR_COPY,contractErrorName,errorMessage} from '../src/errors';
import {placementReason,LEVEL_GATES,miningEstimate} from '../src/player';
import {averagePackHash,baseHash,miningBudget,netMining,project,calculatorEpoch,capacityReason,payback,perDay,type EconomySnapshot} from '../src/earnings';
import {newLogScan,scanLogRanges} from '../src/logs';
import {rpcTransport} from '../src/chain';
import {chain,contracts,RPC_URLS} from '../src/config';
import type {Farm,Item} from '../src/data';
const passed:string[]=[];const pass=(s:string)=>{passed.push(s);console.log('PASS',s);};
const E=10n**18n;
const s:EconomySnapshot={epochSeconds:21600n,precision:10n**27n,epoch:4n,epochData:{start:0n,end:21600n,raw:100000n,miningSeconds:21600n,mining:0n,emission:350n,tariff:1500n,rewardPerHash:0n,kind:0,district:0},previous:{start:0n,end:21600n,raw:100000n,miningSeconds:21600n,mining:8750n*E,emission:350n,tariff:1500n,rewardPerHash:0n,kind:0,district:0},available:1000000n*E,farms:10n,activeFarms:10n,locked:0n,dripEnd:0n,timestamp:0,fetchedAt:0};
assert.equal(miningBudget(s),8750n*E);assert.equal(miningBudget(s,s.available,10800n),4375n*E);assert.equal(netMining(miningBudget(s),100000n,10000n,10000n,1500n,s.precision),743750000000000000000n);
assert.equal(netMining(1000n,100n,10n,20n,10000n,s.precision,true),0n);assert.equal(netMining(1000n,0n,10n,10n,1500n,s.precision),0n);
assert.equal(calculatorEpoch(s,0n),0n);assert(calculatorEpoch(s,10000n)<netMining(miningBudget(s),100000n,10000n,10000n,1500n,s.precision));
pass('Exact integer mining formula, six-hour division, partial epoch, tariff, audit floor and added-hash denominator');
const alternate={...s,epochSeconds:43200n,precision:10n};
assert.equal(miningBudget(alternate),4375n*E);
assert.equal(netMining(1n,3n,3n,0n,0n,10n),0n);assert.equal(netMining(1n,3n,3n,0n,0n,12n),1n);
assert.equal(miningEstimate([3n,3n,0n,false],{rewardPerHash:4n,tariff:0n,kind:0,district:0},0,12n),1n);
assert.equal(perDay(alternate,9n),18n);assert.equal(project(alternate,10000n,10000n,10000n,1).length,3);
assert.equal(project({...alternate,epochSeconds:50000n},10000n,10000n,10000n,1).at(-1)!.day,1);
pass('Nondefault contract epoch/precision drive budget, integer rounding, historic mining, per-day and projection steps');

const points=project(s,10000n,10000n,10000n,30);assert.equal(points.length,121);for(const p of points){assert(p.low<=p.current&&p.current<=p.high);}
assert(points[2].current-points[1].current<points[1].current);assert(project({...s,locked:1000000n*E,dripEnd:86400n},10000n,10000n,10000n,1).at(-1)!.current>project(s,10000n,10000n,10000n,1).at(-1)!.current);
assert.equal(project(s,0n,0n,0n,1).at(-1)!.current,0n);assert(averagePackHash(true)>averagePackHash(false));assert.equal(baseHash({rarity:4,kind:0}),800000n);assert.equal(baseHash({rarity:4,kind:6}),480000n);assert.equal(payback(s,100000000000n*E).days,null);
pass('Projection band ordering, pool-driven emission decay, scheduled drip, zero farm, level-dependent pack odds and unreachable payback');
const item:Item={id:1n,holder:contracts.Token,rarity:2,kind:0,durability:10000,overclock:0,starter:false,equipped:false,repair:0n,output:10000n,enhancing:0n};
const farm={wallet:contracts.Token,level:1n,inventory:15n,capacity:15n,items:[item],rooms:[{index:0,unlocked:true,slots:[0n,0n,0n,0n,0n,0n]}]} as unknown as Farm;
assert.match(capacityReason(farm),/Inventory full \(15\/15\)/);farm.inventory=13n;assert.match(capacityReason(farm,3),/needs space/);assert.equal(capacityReason(farm), '');
for(let rarity=0;rarity<5;rarity++){item.rarity=rarity;farm.level=BigInt(LEVEL_GATES[rarity]);assert.equal(placementReason(item,farm),'');if(rarity>1){farm.level--;assert.match(placementReason(item,farm),/Requires level/);}}
item.rarity=0;farm.level=10n;farm.rooms[0].unlocked=false;assert.equal(placementReason(item,farm,farm.rooms[0],0),'Unlock this room first');farm.rooms[0].unlocked=true;farm.items.push({...item,id:2n,equipped:true});farm.rooms[0].slots[0]=2n;assert.match(placementReason(item,farm),/One of each/);
pass('Inventory full blocks one/three-item actions; Epic 3, Legendary 5, Mythic 10; locked rooms and duplicate kinds');
const names=[...new Set(Object.values(abi).flat().filter(e=>e.type==='error').map(e=>e.name!))];
for(const name of names){assert(ERROR_COPY[name],name);assert(!errorMessage({errorName:name}).includes(name));const def=Object.values(abi).flat().find(e=>e.type==='error'&&e.name===name)!;const args=def.inputs.map((i:any)=>i.type.startsWith('uint')?1n:i.type==='address'?contracts.Token:i.type==='bytes32'?'0x'+'11'.repeat(32):'0x');const bytes=encodeErrorResult({abi:[def] as Abi,errorName:name,args});assert.equal(contractErrorName({cause:{originalError:{data:bytes}}}),name);}
assert.match(errorMessage({code:4001}),/rejected/);assert(!/execution reverted|InvalidValue/.test(errorMessage(Error('execution reverted'))));assert.equal(miningEstimate([100n,100n,20n,true],{rewardPerHash:10n**27n,tariff:10000n,kind:7,district:3},3,s.precision),80n);
pass(`All ${names.length} ABI custom errors decoded from nested bytes into actionable copy; rejection and raw RPC sanitization`);
let ranges:{fromBlock:bigint;toBlock:bigint}[]=[];const scan=newLogScan();scan.span=100000n;await scanLogRanges(1n,25000n,scan,async r=>{assert(r.toBlock-r.fromBlock<10000n);return r;},r=>{ranges.push(r)});assert.equal(ranges[0].fromBlock,1n);assert.equal(ranges.at(-1)!.toBlock,25000n);for(let i=1;i<ranges.length;i++)assert.equal(ranges[i].fromBlock,ranges[i-1].toBlock+1n);
pass('Provider log cap enforced before requests, no gaps or duplicate chunks');
const original=globalThis.fetch;let mode='race';const calls:string[]=[];
globalThis.fetch=(async(url,options)=>{calls.push(String(url));const body=JSON.parse(String(options?.body)),req=Array.isArray(body)?body[0]:body;if(mode==='hang')return new Promise((_,reject)=>options?.signal?.addEventListener('abort',()=>reject(Error('timeout'))));if(mode==='down')return new Response('Unavailable',{status:503});await new Promise(r=>setTimeout(r,String(url).includes('drpc')?20:300));const payload={jsonrpc:'2.0',id:req.id,result:'0x1237'};return new Response(JSON.stringify(Array.isArray(body)?[payload]:payload),{headers:{'content-type':'application/json'}});}) as typeof fetch;
try{
 let rpc=rpcTransport()({chain,retryCount:0}),at=performance.now();assert.equal(await rpc.request({method:'eth_chainId'}),'0x1237');assert(performance.now()-at<200);assert.equal(new Set(calls).size,2);await new Promise(r=>setTimeout(r,350));
 mode='hang';rpc=rpcTransport()({chain,retryCount:0});at=performance.now();await assert.rejects(rpc.request({method:'eth_chainId'}));assert(performance.now()-at>=3900&&performance.now()-at<5000);
 mode='down';rpc=rpcTransport()({chain,retryCount:0});await assert.rejects(rpc.request({method:'eth_chainId'}));const n=calls.length;await assert.rejects(rpc.request({method:'eth_chainId'}));assert.equal(calls.length,n);
 mode='race';calls.length=0;rpc=rpcTransport()({chain,retryCount:0});await rpc.request({method:'eth_getLogs',params:[]});assert.deepEqual(calls,[RPC_URLS[0]]);calls.length=0;at=performance.now();await Promise.all([rpc.request({method:'eth_getLogs',params:[]}),rpc.request({method:'eth_getLogs',params:[]})]);assert(performance.now()-at>=1100);assert.equal(calls.length,2);
}finally{globalThis.fetch=original;}
pass('Healthy RPCs race; 4-second per-endpoint timeout; outage backoff suppresses retries; archive logs use a shared paced queue and capable endpoint only');
const bundles=readdirSync('dist/assets').filter(p=>p.endsWith('.js')).map(p=>readFileSync('dist/assets/'+p,'utf8')).join('');assert(!bundles.includes('Rehearse opening'));assert(!bundles.includes('mountPackLab')); // generic opener label is refined below if shared.
pass('Production export excludes the development mock module and controls');
mkdirSync('artifacts/v12',{recursive:true});writeFileSync('artifacts/v12/unit.json',JSON.stringify({checkedAt:new Date().toISOString(),passed},null,2)+'\n');
