import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {read,verifyRegistry,client,readLog,contractErrorName} from '../src/chain';
import {loadHome,loadFarm,loadReceipt} from '../src/data';
import {loadActivity,loadLeaderboard} from '../src/community';
import {loadPublicPrice,loadPublicTotals} from '../src/public';
import {contracts,ROOTS,RPC_URLS} from '../src/config';
import {createPublicClient,http,type Address} from 'viem';
const start=Date.now();
const report:Record<string,unknown>={checkedAt:new Date().toISOString(),signedTransactions:0};
try{
 report.endpoints=await Promise.all(RPC_URLS.map(async url=>{const at=Date.now();try{return {url,chainId:await createPublicClient({transport:http(url,{timeout:4000,retryCount:0})}).getChainId(),ms:Date.now()-at};}catch(e){return {url,error:String(e).split('\n')[0],ms:Date.now()-at};}}));
 assert.deepEqual(await verifyRegistry(),[]);assert.equal(await client.getChainId(),4663);report.registry='All 14 modules, token, market, desk, fee router and both claim roots match';
 const [home,price,totals,activity]=await Promise.all([loadHome(),loadPublicPrice(),loadPublicTotals(),loadActivity()]);
 const board=await loadLeaderboard(home.epoch);report.home=home;report.price=price;report.totals=totals;report.activity=activity;report.leaderboard=board;
 assert(activity.length<=20);assert(activity.every((e,i)=>!i||activity[i-1].block>=e.block));
 const player=totals.farms>0n?await read<Address>('FarmCore','playerAt',[0n]):null;
 if(player){const farm=await loadFarm(player);report.farm={wallet:player,hasFarm:farm.hasFarm,items:farm.items.length,rooms:farm.rooms.length,pending:farm.pending,claimPreview:farm.claimNet};
 report.starter=await Promise.all([read('StarterClaim','root'),read('StarterClaim','freeRoot'),read('StarterClaim','freeClaimedBy',[player]),read('StarterClaim','freeClaimEnds')]);
 const next=await read<bigint>('PackSale','nextId');if(next>1n)report.receipt=await loadReceipt('paid',next-1n);
 await read('Token','allowance',[player,contracts.PackSale]);
 const week=BigInt(Math.max(0,Math.floor((home.timestamp-Number(home.launchTime))/604800)));
 report.secondaryPages=await Promise.all([
  read('GridOperator','planAt',[home.epoch+1n]),read('SwarmDesk','lastLetterHash'),
  read('Season','pot',[week]),read('Season','potRemaining',[week]),read('Season','claimDeadline',[week]),read('Season','result',[week]),read('Season','lotteryWon',[week,player]),read('Season','lotteryClaimed',[week,player]),read('Season','districtClaimed',[week,player]),read('Season','bestClaimed',[week]),
  read('Billboards','week'),read('Billboards','refund',[player]),read('Economy','locks',[player]),read('Economy','lockQuote',[player,7n]),
  read('StarterClaim','claims',[0n]),read('StarterClaim','entropyCaptured',[0n]),read('PackSale','price'),
  ...Array.from({length:8},(_,i)=>[read('Economy','districtStake',[BigInt(i)]),read('Economy','districtTotal',[BigInt(i)]),read('Season','districtScore',[week,BigInt(i)]),read('Billboards','billboard',[week,BigInt(i)])]).flat()
 ]);
 if(!home.phases[4]){try{await read('Economy','lobbyQuote',[player]);throw Error('Expected disabled lobby');}catch(error){assert.equal(contractErrorName(error),'FeatureDisabled');report.disabledLobby='Expected FeatureDisabled from live contract';}}
 }
 assert.equal((await read<string>('StarterClaim','root')).toLowerCase(),ROOTS.starter);assert.equal((await read<string>('StarterClaim','freeRoot')).toLowerCase(),ROOTS.free);
 report.readMethods=[...readLog].sort();report.elapsedMs=Date.now()-start;report.status='passed';
 report.limitations=['Read-only live validation; no private keys or signed transactions. Transaction writes are validated by ABI-preserving browser fixtures. Public provider availability can change.'];
 console.log('PASS live contracts, public totals, price, latest events, standings, populated farm, paid receipt and claim roots',Date.now()-start,'ms');
}catch(error){report.status='failed';report.error=String(error);process.exitCode=1;console.error(error);}
mkdirSync('artifacts/v11',{recursive:true});writeFileSync('artifacts/v11/live-reads.json',JSON.stringify(report,(_,v)=>typeof v==='bigint'?v.toString():v,2)+'\n');
