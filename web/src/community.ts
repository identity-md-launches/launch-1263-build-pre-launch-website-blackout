import { decodeEventLog, type Address, type Hex } from 'viem';
import { ABI, addresses, client, historicalClient, read } from './chain';
import { type Item } from './data';
import { GAME_DEPLOYMENT_BLOCK } from './config';
import { newLogScan, scanLogRanges } from './logs';
import { cached, remember } from './cache';
export type Activity={key:string;block:bigint;index:number;hash:Hex;text:string;kind?:'purchase'|'reveal';rarity?:number;items?:(Pick<Item,'kind'|'rarity'>|null)[]};
// Older snapshots may contain fabricated Common items from deleted records.
export const ACTIVITY_CACHE_KEY='activity-v2';
const EVENT_CACHE_KEY='pack-event-index-v2';
export type Leaderboard={epoch:bigint;farms:{wallet:Address;hash:bigint;district:number;best?:{kind:number;rarity:number}[]}[];districts:bigint[];total:number};
const short=(s:string)=>`${s.slice(0,6)}…${s.slice(-4)}`;
type EventIndex={head:bigint;floor:bigint;events:Activity[]};
const saved=cached<EventIndex>(EVENT_CACHE_KEY);
const decoded=new Map<string,Activity>((saved?.events??[]).map(e=>[e.key,e]));
let floor=saved?.floor??null;
// Keep reveal-block metadata, not mutable latest state. Null preserves an unknown pull.
const metadata=new Map<string,Promise<Pick<Item,'kind'|'rarity'>|null>>();
async function revealedItem(hash:Hex,block:bigint,id:bigint){
 const key=`${hash}:${block}:${id}`;
 if(!metadata.has(key))metadata.set(key,(async()=>{
  let item:Item;
  try{item=await historicalClient.readContract({address:addresses.FarmItems,abi:ABI.FarmItems,functionName:'data',args:[id],blockNumber:block}) as Item;}
  catch{
   // A nonzero current holder still identifies immutable kind/rarity. Retry the
   // historical read next time; an archive outage must not become a cached fact.
   metadata.delete(key);
   try{item=await read<Item>('FarmItems','data',[id]);}catch{return null;}
  }
  if(BigInt(item.holder)===0n){metadata.delete(key);return null;}
  return {kind:item.kind,rarity:item.rarity};
 })());
 return metadata.get(key)!;
}
let cursor:bigint|null=saved?.head??null;
const scan=newLogScan();scan.span=10000n;
let pending:Promise<Activity[]>|null=null;
export function loadActivity():Promise<Activity[]>{
 if(!pending)pending=scanActivity().finally(()=>{pending=null;});
 return pending;
}
async function scanActivity():Promise<Activity[]>{
 const head=await client.getBlockNumber();
 const tail=cursor===null?head-100000n:(cursor>head?head:cursor)-16n;
 const from=tail>GAME_DEPLOYMENT_BLOCK?tail:GAME_DEPLOYMENT_BLOCK;
 const events=Object.values(ABI).flat().filter(e=>e.type==='event'&&['PackCommitted','PackOpened'].includes(e.name));
 const scanWindow=async(start:bigint,end:bigint,forward:boolean)=>scanLogRanges(start,end,scan,
  range=>client.getLogs({address:[addresses.PackSale],events,...range}),
  async(collected,{fromBlock,toBlock})=>{
 const oldTail=[...decoded.entries()].filter(([,v])=>v.block>=fromBlock&&v.block<=toBlock);
 const recent=[...collected].sort((a,b)=>a.blockNumber===b.blockNumber?(b.logIndex??0)-(a.logIndex??0):(a.blockNumber??0n)>(b.blockNumber??0n)?-1:1).filter(log=>log.transactionHash&&log.blockNumber!==null&&log.address.toLowerCase()===addresses.PackSale.toLowerCase()).slice(0,20);
 // Receipt and item calls for independent events share viem's multicall/JSON-RPC batches.
 const parsed=await Promise.all(recent.map(async(log):Promise<Activity|null>=>{
  const hash=log.transactionHash!,block=log.blockNumber!,index=log.logIndex??0,key=`${hash}:${index}`;
  const cached=decoded.get(key);if(cached&&cached.block===block&&(cached.kind==='purchase'||cached.items?.length&&cached.items.every(Boolean)))return {...cached,block,index};
  let event:{eventName:string;args:Record<string,unknown>};
  try{event=decodeEventLog({abi:Object.values(ABI).flat(),data:log.data,topics:log.topics}) as unknown as typeof event;}
  catch{return null;}
  const a=event.args;let text='',rarity:number|undefined;let revealedItems:Activity['items'];
  const kind=event.eventName==='PackCommitted'?'purchase':'reveal';
  if(kind==='purchase')text=`${short(String(a.player))} bought ${a.count} pack${a.count===1n?'':'s'}`;
  else if(event.eventName==='PackOpened'){
   const paid=event.eventName==='PackOpened',id=BigInt(String(paid?a.id:a.tokenId));
   const [receipt,tx]=await Promise.all([read<readonly unknown[]>(paid?'PackSale':'StarterClaim',paid?'commits':'claims',[id]),client.getTransactionReceipt({hash})]);
   const mintedIds:bigint[]=[];
   for(const minted of tx.logs){
    if(minted.address.toLowerCase()!==addresses.FarmItems.toLowerCase())continue;
    try{
     const mint=decodeEventLog({abi:ABI.FarmItems,data:minted.data,topics:minted.topics}) as unknown as {eventName:string;args:{from:Address;id:bigint;ids:bigint[]}};
     if(BigInt(mint.args.from)!==0n)continue;
     mintedIds.push(...(mint.eventName==='TransferSingle'?[mint.args.id]:mint.eventName==='TransferBatch'?mint.args.ids:[]));
    }catch{/* Ignore unrelated event formats; network calls are outside this catch. */}
   }
   revealedItems=await Promise.all(mintedIds.map(itemId=>revealedItem(hash,block,itemId)));
   // A missing detail cannot establish the best rarity of the entire reveal.
   if(revealedItems.length&&revealedItems.every(item=>item!==null))rarity=Math.max(...revealedItems.map(item=>item!.rarity));
   text=`${short(String(receipt[0]))} revealed ${a.count} pack${a.count===1n?'':'s'}`;
  }
  return text?{key,block,index,hash,text,kind,rarity,items:revealedItems}:null;
 }));
 // Commit each decoded range atomically. A later failure retains this progress;
 // retries rescan the overlap, replacing any events removed by a shallow reorg.
 for(const [key]of oldTail)decoded.delete(key);
 for(const entry of parsed)if(entry)decoded.set(entry.key,entry);
 if(forward)cursor=toBlock;
 const retained=activityList();decoded.clear();retained.forEach(e=>decoded.set(e.key,e));
 if((parsed.some(Boolean)||oldTail.length)&&typeof document!=='undefined')document.dispatchEvent(new CustomEvent('publicactivity',{detail:retained}));
 });
 await scanWindow(from,head,true);
 let scanFloor=floor??from;
 while(decoded.size<20&&scanFloor>GAME_DEPLOYMENT_BLOCK){
  const start=scanFloor-100000n>GAME_DEPLOYMENT_BLOCK?scanFloor-100000n:GAME_DEPLOYMENT_BLOCK;
  await scanWindow(start,scanFloor-1n,false);scanFloor=start;
 }
 floor=scanFloor;
 remember(EVENT_CACHE_KEY,{head:cursor,floor,events:activityList()});
 return activityList();
}
function activityList(){return [...decoded.values()].sort((a,b)=>a.block===b.block?b.index-a.index:a.block>b.block?-1:1).slice(0,20);}
export async function loadLeaderboard(epoch:bigint):Promise<Leaderboard>{
 const count=await read<bigint>('FarmCore','count'),farms:Leaderboard['farms']=[];
 for(let offset=0n;offset<count;offset+=50n){
  const players=await Promise.all(Array.from({length:Number(count-offset>50n?50n:count-offset)},(_,i)=>read<Address>('FarmCore','playerAt',[offset+BigInt(i)])));
  farms.push(...await Promise.all(players.map(async wallet=>{const [hash,district]=await Promise.all([read<bigint>('FarmRewards','farmWeight',[wallet,epoch]),read<bigint>('FarmCore','district',[wallet])]);return {wallet,hash,district:Number(district)};})));
 }
 const districts=await Promise.all(Array.from({length:8},(_,i)=>read<bigint>('FarmRewards','districtActiveHash',[BigInt(i)])));
 const leaders=farms.filter(f=>f.hash>0n).sort((a,b)=>a.hash===b.hash?a.wallet.localeCompare(b.wallet):a.hash>b.hash?-1:1).slice(0,20);
 await Promise.all(leaders.map(async farm=>{
  try{const ids=await read<bigint[]>('FarmItems','itemsByOwner',[farm.wallet,0n,100n]);const items=await Promise.all(ids.map(id=>read<Item>('FarmItems','data',[id])));farm.best=items.sort((a,b)=>b.rarity-a.rarity).slice(0,3).map(({kind,rarity})=>({kind,rarity}));}catch{/* A preview is optional; standings remain valid. */}
 }));
 return {epoch,farms:leaders,districts,total:Number(count)};
}
