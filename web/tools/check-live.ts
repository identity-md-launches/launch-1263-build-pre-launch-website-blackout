import {verifyRegistry,read,client,readLog,errorMessage} from '../src/chain';
import {loadHome,loadFarm} from '../src/data';
import {contracts,roles} from '../src/config';
import {writeFileSync,mkdirSync} from 'node:fs';
const wallet='0x83027ad9d0d5374335086c539dadd1db983441b0' as const;
const issues=await verifyRegistry();
if(issues.length)throw Error(issues.join('\n'));
const home=await loadHome();
console.log('Live home',JSON.stringify(home,(_,v)=>typeof v==='bigint'?v.toString():v));
const farm=await loadFarm(wallet);
console.log('Live farm',JSON.stringify({hasFarm:farm.hasFarm,items:farm.items.length,rooms:farm.rooms.length},null,2));
const week=BigInt(Math.max(0,Math.floor((home.timestamp-Number(home.launchTime))/604800)));
await Promise.all([
 read('FarmItems','itemsByOwner',[wallet,0n,100n]),read('PackSale','commits',[1n]),read('PackSale','price'),read('PackSale','quote',[1n]),read('PackSale','paused'),read('PackSale','nextId'),
 read('StarterClaim','claims',[0n]),read('StarterClaim','entropyCaptured',[0n]),read('StarterClaim','freeClaimEnds'),read('StarterClaim','freeClaimedBy',[wallet]),
 read('GridOperator','eventAt',[home.epoch]),read('GridOperator','planAt',[home.epoch+1n]),read('SwarmDesk','lastLetterHash'),
 read('Season','pot',[week]),read('Season','potRemaining',[week]),read('Season','claimDeadline',[week]),read('Season','result',[week]),read('Season','lotteryWon',[week,wallet]),read('Season','lotteryClaimed',[week,wallet]),read('Season','districtClaimed',[week,wallet]),read('Season','bestClaimed',[week]),
 read('Billboards','week'),read('Billboards','refund',[wallet]),read('Economy','locks',[wallet]),read('Economy','lockQuote',[wallet,7n]),
 read('V4Market','quote',[1000000000000000n]),read('Token','allowance',[wallet,contracts.PackSale]),
 ...Array.from({length:8},(_,i)=>[read('Economy','districtStake',[BigInt(i)]),read('Economy','districtTotal',[BigInt(i)]),read('Season','districtScore',[week,BigInt(i)]),read('Billboards','billboard',[week,BigInt(i)])]).flat(),
 ...roles.map(name=>client.getCode({address:contracts[name]}).then(code=>{if(!code||code==='0x')throw Error(`${name} has no bytecode`);})),
]);
const conditionalReads:Record<string,string>={};
const totalFarms=await read<bigint>('FarmCore','count');
const nextItemId=await read<bigint>('FarmItems','nextId');
// With no minted hardware, read the empty data tuple and verify the expected errors.
if(nextItemId===1n) {
 await read('FarmItems','data',[1n]);
 for(const [name,fn] of [['FarmItems','outputTier'],['Economy','repairQuote']] as const) {
  try{await read(name,fn,[1n]);throw Error('Expected nonexistent-item rejection');}
  catch(e){const message=errorMessage(e);if(!message.startsWith('InvalidValue:'))throw e;conditionalReads[`${name}.${fn}`]='Expected InvalidValue: no item exists; populated success path tested with fixtures.';}
 }
} else {
 const item=await read<{holder:string}>('FarmItems','data',[nextItemId-1n]);
 if(BigInt(item.holder)!==0n){await read('FarmItems','outputTier',[nextItemId-1n]);await read('Economy','repairQuote',[nextItemId-1n]);}
}
if(!home.phases[4]) {
 try{await read('Economy','lobbyQuote',[wallet]);throw Error('Expected disabled-feature rejection');}
 catch(e){const message=errorMessage(e);if(!message.startsWith('FeatureDisabled:'))throw e;conditionalReads['Economy.lobbyQuote']='Expected FeatureDisabled while Civic flag 4 is false.';}
}
const report={totalFarms,nextItemId,conditionalReads,checkedAt:new Date().toISOString(),block:home.block.toString(),chainId:await client.getChainId(),registryMismatches:issues,liveHome:home,readMethods:[...readLog].sort(),farmWallet:wallet,hasFarm:farm.hasFarm,itemCount:farm.items.length,limitations:['No wallet keys used. No signed transaction broadcast.','Live inventory is empty; item mutation paths need deterministic interaction fixtures.']};
mkdirSync('reports/live',{recursive:true});writeFileSync('reports/live/live-reads.json',JSON.stringify(report,(_,v)=>typeof v==='bigint'?v.toString():v,2)+'\n');
console.log('PASS',readLog.size,'distinct live methods; all 14 module addresses and both roots matched.');
