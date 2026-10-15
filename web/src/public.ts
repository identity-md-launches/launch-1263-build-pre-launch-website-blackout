import { read, client, ABI, addresses } from './chain';
import { GAME_DEPLOYMENT_BLOCK } from './config';
import { newLogScan, scanLogRanges } from './logs';
import { quoteEthPack } from './packs';
import { cached, remember } from './cache';
import type { Address } from 'viem';

export type PublicTotals={farms:bigint;opened:bigint;fetchedAt:number};
export type PublicPrice={tokens:bigint;eth:bigint;fetchedAt:number};
type Commit=readonly [Address,bigint,bigint,bigint,boolean,boolean,string,boolean,boolean];
// A completed receipt cannot open again. Only unfinished and newly created
// receipts need refreshing; nextId is not incorrectly presented as packs opened.
const completed=new Map<string,bigint>(cached<[string,bigint][]>('completed-packs')??[]);
export async function loadPublicTotals():Promise<PublicTotals>{
 const [farms,next]=await Promise.all([read<bigint>('FarmCore','count'),read<bigint>('PackSale','nextId')]);
 let opened=await starterCount();
 for(let start=1n;start<next;start+=60n){
  const values=await Promise.all(Array.from({length:Number(next-start>60n?60n:next-start)},async(_,offset)=>{
   const id=start+BigInt(offset),key=id.toString();
   if(completed.has(key))return completed.get(key)!;
   const receipt=await read<Commit>('PackSale','commits',[id]);
   if(receipt[2]>0n&&receipt[2]===receipt[3])completed.set(key,receipt[3]);
   return receipt[3];
  }));
  opened+=values.reduce((sum,n)=>sum+n,0n);
 }
 remember('completed-packs',[...completed]);
 return {farms,opened,fetchedAt:Date.now()};
}
export async function loadPublicPrice():Promise<PublicPrice>{
 const tokens=await read<bigint>('PackSale','quote',[1n]);
 const quote=await quoteEthPack(tokens,300);
 return {tokens,eth:quote.value,fetchedAt:Date.now()};
}

// Starter/free packs are resolved outside PackSale. Count their actual events,
// retaining only block/key pairs so burns and later item changes cannot distort totals.
const starterIndex=cached<{head:bigint;entries:[string,bigint][]}>('starter-count');
let starterHead=starterIndex?.head??null;
const starterEntries=new Map<string,bigint>(starterIndex?.entries??[]);
const starterScan=newLogScan();starterScan.span=10000n;
async function starterCount(){
 const head=await client.getBlockNumber();
 const start=starterHead===null?GAME_DEPLOYMENT_BLOCK:starterHead-16n>GAME_DEPLOYMENT_BLOCK?starterHead-16n:GAME_DEPLOYMENT_BLOCK;
 await scanLogRanges(start,head,starterScan,
  range=>client.getLogs({address:addresses.StarterClaim,events:ABI.StarterClaim.filter(e=>e.type==='event'&&e.name==='StarterResolved'),...range}),
  (logs,range)=>{
   for(const [key,block]of starterEntries)if(block>=range.fromBlock&&block<=range.toBlock)starterEntries.delete(key);
   for(const log of logs)if(log.blockNumber!==null&&log.transactionHash)starterEntries.set(`${log.transactionHash}:${log.logIndex}`,log.blockNumber);
   starterHead=range.toBlock;remember('starter-count',{head:starterHead,entries:[...starterEntries]});
  });
 return BigInt(starterEntries.size);
}
