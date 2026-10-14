import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {encodeErrorResult, type Abi} from 'viem';
import {ERROR_COPY, errorMessage, contractErrorName} from '../src/errors';
import {placementReason, LEVEL_GATES, claimWindow, xpProgress, epochProgress, miningEstimate} from '../src/player';
import {slippageBps,quoteEthPack} from '../src/packs';
import {type Item,type Farm} from '../src/data';
import abi from '../src/abi.json';
import {RPC_URLS,POLL_MS,contracts} from '../src/config';
const passed:string[]=[];const pass=(s:string)=>{passed.push(s);console.log('PASS',s);};
const names=[...new Set(Object.values(abi).flat().filter(a=>a.type==='error').map(a=>a.name!))];
for(const name of names){assert(ERROR_COPY[name],name);assert(!errorMessage({errorName:name}).includes(name),name);}
pass(`All ${names.length} ABI errors map to plain player wording`);
for(const name of ['InvalidValue','TooEarly','InsufficientBalance','FeatureDisabled','NotConfigured','PriceLimitedBuy','PartialFill']){
 const source=Object.values(abi).flat().find(e=>e.type==='error'&&e.name===name)!;
 const args=source.inputs.map((i:any)=>i.type.startsWith('uint')?1n:i.type==='address'?contracts.Token:'0x');
 const data=encodeErrorResult({abi:[source] as Abi,errorName:name,args});
 assert.equal(contractErrorName({cause:{originalError:{data}}}),name);assert(!errorMessage({data}).includes(name));
}
assert.match(errorMessage({errorName:'InvalidValue'},{action:'buyWithETH'}),/price changed/);
assert.match(errorMessage({errorName:'InsufficientBalance'},{action:'resolve'}),/3 items/);
assert.match(errorMessage({errorName:'TooEarly'},{action:'resolve'}),/reveal block/);
assert.match(errorMessage(new Error('HTTP request failed. URL: https://example.test')),/Reconnecting/);
assert.match(errorMessage({code:4001}),/rejected/);pass('Wrapped reverts, action-specific reasons, RPC sanitization and wallet rejection');
const item:Item={id:1n,holder:contracts.Token,durability:10000,kind:0,rarity:1,overclock:0,starter:false,equipped:false,repair:0n,output:10000n,enhancing:0n};
const farm={wallet:contracts.Token,level:1n,items:[item],rooms:[{index:0,unlocked:true,slots:[0n,0n,0n,0n,0n,0n]}]} as unknown as Farm;
for(let rarity=0;rarity<5;rarity++){item.rarity=rarity;farm.level=BigInt(LEVEL_GATES[rarity]);assert.equal(placementReason(item,farm),'');if(rarity>1){farm.level--;assert.match(placementReason(item,farm),/Requires level/);}}
item.rarity=1;farm.level=1n;item.enhancing=4n;assert.match(placementReason(item,farm),/Upgrade/);item.enhancing=0n;
farm.items.push({...item,id:2n,equipped:true});farm.rooms[0].slots[0]=2n;assert.equal(placementReason(item,farm),'One of each type per room');
farm.rooms[0].slots[0]=0n;assert.equal(placementReason(item,farm,farm.rooms[0],0),'');farm.rooms[0].unlocked=false;assert.equal(placementReason(item,farm,farm.rooms[0],0),'Unlock this room first');pass('Rare/Epic/Legendary/Mythic level gates, duplicate types, upgrading, occupancy and locked rooms');
assert.equal(miningEstimate([100n,100n,20n,false],{rewardPerHash:10n**27n,tariff:10000n,kind:0,district:3},3),80n);
assert.equal(miningEstimate([100n,100n,20n,true],{rewardPerHash:10n**27n,tariff:10000n,kind:7,district:3},3),80n);
assert.equal(miningEstimate([100n,100n,200n,true],{rewardPerHash:10n**27n,tariff:10000n,kind:7,district:2},3),0n);pass('Last-epoch mining estimate includes cheap-tariff district, audit and electricity floor');
const launch=1000000n,start=Number(launch)+172800,end=Number(launch)+1382400;
assert.equal(claimWindow(launch,start-1).state,'upcoming');assert.equal(claimWindow(launch,start).state,'open');assert.equal(claimWindow(launch,end-1).state,'open');assert.equal(claimWindow(launch,end).state,'closed');
const freeEnd=launch+30n*86400n;assert.equal(claimWindow(launch,Number(freeEnd)-1,freeEnd).state,'open');assert.equal(claimWindow(launch,Number(freeEnd),freeEnd).state,'closed');pass('Starter 48-hour opening and 16-day closing; free 30-day deadline boundaries');
assert.equal(xpProgress(500n,3n).value,50);assert.equal(xpProgress(2800n,4n).ageLimited,true);assert.equal(epochProgress(100n,200n,150),.5);assert.equal(epochProgress(100n,200n,210),1);pass('XP thresholds, age limit and epoch progress never exceed the end');
assert.equal(slippageBps('3'),300);assert.throws(()=>slippageBps('0'));assert.throws(()=>slippageBps('10.01'));assert.equal(typeof quoteEthPack,'function');
assert.equal(POLL_MS,15000);assert.equal(RPC_URLS.length,3);pass('v9 3% default bounds and v10 transport configuration');
mkdirSync('artifacts/v10',{recursive:true});writeFileSync('artifacts/v10/unit-results.json',JSON.stringify({passed,at:new Date().toISOString()},null,2)+'\n');
