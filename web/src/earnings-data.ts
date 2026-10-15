import { parseAbiItem } from 'viem';
import { read, client, addresses } from './chain';
import { GAME_DEPLOYMENT_BLOCK } from './config';
import { newLogScan, scanLogRanges } from './logs';
import { cached, remember } from './cache';
import type { Farm, Home } from './data';
import { miningEstimate } from './player';
import type { EarningsHistory, EconomySnapshot, EpochData } from './earnings';
export async function loadEconomy(home:Home):Promise<EconomySnapshot>{
 const [epochData,previous,farms,activeFarms,dripStart,dripPeriod,epochSeconds,precision]=await Promise.all([
  read<EpochData>('FarmRewards','epochData',[home.epoch]),read<EpochData>('FarmRewards','epochData',[home.epoch>0n?home.epoch-1n:0n]),read<bigint>('FarmCore','count'),read<bigint>('FarmRewards','activeFarmCount',[home.epoch]),read<bigint>('RewardPool','dripStart'),read<bigint>('RewardPool','dripPeriod'),read<bigint>('FarmRewards','EPOCH'),read<bigint>('FarmRewards','PRECISION'),
 ]);
 if(epochSeconds<=0n||precision<=0n)throw Error('Rewards constants unavailable. Refresh and retry.');
 return {epochSeconds,precision,epoch:home.epoch,epochData,previous,farms,activeFarms,dripEnd:dripStart+dripPeriod,locked:home.lockedEndowment,available:home.available,timestamp:home.timestamp,fetchedAt:Date.now()};
}
const claimedEvent=parseAbiItem('event Claimed(address indexed player,uint256 amount,uint256 tax)');
export async function loadEarningsHistory(farm:Farm):Promise<EarningsHistory>{
 const precision=await read<bigint>('FarmRewards','PRECISION');
 const key=`earned.${farm.wallet.toLowerCase()}`,old=cached<EarningsHistory>(key),epochs=old?.epochs??[];
 let mined=old?.mined??0n;
 for(let start=(old?.through??0n)+1n;start<=farm.lastSettled;start+=30n){
  const rows=await Promise.all(Array.from({length:Number(farm.lastSettled-start+1n>30n?30n:farm.lastSettled-start+1n)},async(_,i)=>{
   const epoch=start+BigInt(i),[data,share]=await Promise.all([read<EpochData>('FarmRewards','epochData',[epoch]),read<readonly [bigint,bigint,bigint,boolean]>('FarmRewards','shares',[epoch,farm.wallet])]);
   return {epoch,amount:miningEstimate(share,data,Number(farm.district),precision)};
  }));
  rows.forEach(row=>{mined+=row.amount;epochs.push(row);});
 }
 const logKey=`claims.${farm.wallet.toLowerCase()}`,stored=cached<{head:bigint;logs:{key:string;block:bigint;amount:bigint;tax:bigint}[]}>(logKey),head=await client.getBlockNumber();
 const logs=new Map((stored?.logs??[]).map(v=>[v.key,v]));
 await scanLogRanges(stored&&stored.head>GAME_DEPLOYMENT_BLOCK+16n?stored.head-16n:GAME_DEPLOYMENT_BLOCK,head,newLogScan(),range=>client.getLogs({address:addresses.FarmRewards,event:claimedEvent,args:{player:farm.wallet},...range,strict:true}), (batch,range)=>{
  for(const [key,value]of logs)if(value.block>=range.fromBlock&&value.block<=range.toBlock)logs.delete(key);
  batch.forEach(l=>logs.set(`${l.transactionHash}:${l.logIndex}`,{key:`${l.transactionHash}:${l.logIndex}`,block:l.blockNumber!,amount:l.args.amount,tax:l.args.tax}));
  remember(logKey,{head:range.toBlock,logs:[...logs.values()]});
 });
 const history={mined,claimed:[...logs.values()].reduce((n,l)=>n+l.amount-l.tax,0n),claimedGross:[...logs.values()].reduce((n,l)=>n+l.amount,0n),epochs:epochs.slice(-20),through:farm.lastSettled};
 remember(key,history);return history;
}
