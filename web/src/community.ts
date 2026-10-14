import { formatUnits, decodeEventLog, type Address, type Hex } from 'viem';
import { ABI, addresses, client, read, contractErrorName } from './chain';
import { KINDS, RARITIES, type Item } from './data';
export type Activity={key:string;block:bigint;index:number;hash:Hex;text:string};
export type Leaderboard={epoch:bigint;farms:{wallet:Address;hash:bigint;district:number}[];districts:bigint[];total:number};
const short=(s:string)=>`${s.slice(0,6)}…${s.slice(-4)}`;
const decoded=new Map<string,Activity>();
// Kind and rarity are immutable; durability/overclock are not cached here. Burned items omit their detail.
const metadata=new Map<string,Promise<Pick<Item,'kind'|'rarity'>|null>>();
let cursor:bigint|null=null;
export async function loadActivity():Promise<Activity[]>{
 const head=await client.getBlockNumber();
 const from=cursor===null?(head>216000n?head-216000n:0n):(cursor>16n?cursor-16n:0n);
 const collected:Awaited<ReturnType<typeof client.getLogs>>=[];
 const events=Object.values(ABI).flat().filter(e=>e.type==='event'&&['PackOpened','StarterResolved','Registered','EpochSettled'].includes(e.name));
 // Bounded ranges and three concurrent reads keep initial history responsive without a full archive scan.
 for(let start=from;start<=head;start+=60000n){
  const ranges=Array.from({length:3},(_,i)=>start+BigInt(i)*20000n).filter(n=>n<=head);
  const chunks=await Promise.all(ranges.map(n=>client.getLogs({address:[addresses.PackSale,addresses.StarterClaim,addresses.FarmCore,addresses.FarmRewards],events,fromBlock:n,toBlock:n+19999n<head?n+19999n:head})));
  collected.push(...chunks.flat());
 }
 const oldTail=[...decoded.entries()].filter(([,v])=>v.block>=from);
 const recent=[...collected].reverse().filter(log=>log.transactionHash&&log.blockNumber!==null).slice(0,12);
 // Receipt and item calls for independent events share viem's multicall/JSON-RPC batches.
 const parsed=await Promise.all(recent.map(async(log):Promise<Activity|null>=>{
  const hash=log.transactionHash!,block=log.blockNumber!,index=log.logIndex??0,key=`${hash}:${index}`;
  const cached=decoded.get(key);if(cached)return {...cached,block,index};
  let event:{eventName:string;args:Record<string,unknown>};
  try{event=decodeEventLog({abi:Object.values(ABI).flat(),data:log.data,topics:log.topics}) as unknown as typeof event;}
  catch{return null;}
  const a=event.args;let text='';
  if(event.eventName==='Registered')text=`${short(String(a.player))} · new miner joined`;
  else if(event.eventName==='EpochSettled')text=`Epoch ${a.epoch} closed · ${Number(formatUnits(BigInt(String(a.mining)),18)).toLocaleString('en-US',{maximumFractionDigits:2})} BLACKOUT paid`;
  else if(event.eventName==='PackOpened'||event.eventName==='StarterResolved'){
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
   const items=await Promise.all(mintedIds.map(itemId=>{
    const mk=`${hash}:${itemId}`;
    if(!metadata.has(mk))metadata.set(mk,read<Item>('FarmItems','data',[itemId]).then(({kind,rarity})=>({kind,rarity})).catch(e=>{if(contractErrorName(e)==='InvalidValue')return null;metadata.delete(mk);throw e;}));
    return metadata.get(mk)!;
   }));
   const best=items.filter((item):item is Pick<Item,'kind'|'rarity'>=>item!==null).sort((a,b)=>b.rarity-a.rarity)[0];
   text=`${short(String(receipt[0]))} opened a pack${best?`: ${RARITIES[best.rarity]} ${KINDS[best.kind]}`:''}`;
  }
  return text?{key,block,index,hash,text}:null;
 }));
 // Commit atomically only after successful reads; failures leave the previous feed and cursor intact.
 for(const [key]of oldTail)decoded.delete(key);
 for(const entry of parsed)if(entry)decoded.set(entry.key,entry);
 cursor=head;
 const result=[...decoded.values()].sort((a,b)=>a.block===b.block?b.index-a.index:a.block>b.block?-1:1).slice(0,20);
 decoded.clear();result.forEach(e=>decoded.set(e.key,e));return result;
}
export async function loadLeaderboard(epoch:bigint):Promise<Leaderboard>{
 const count=await read<bigint>('FarmCore','count'),farms:Leaderboard['farms']=[];
 for(let offset=0n;offset<count;offset+=50n){
  const players=await Promise.all(Array.from({length:Number(count-offset>50n?50n:count-offset)},(_,i)=>read<Address>('FarmCore','playerAt',[offset+BigInt(i)])));
  farms.push(...await Promise.all(players.map(async wallet=>{const [hash,district]=await Promise.all([read<bigint>('FarmRewards','farmWeight',[wallet,epoch]),read<bigint>('FarmCore','district',[wallet])]);return {wallet,hash,district:Number(district)};})));
 }
 const districts=await Promise.all(Array.from({length:8},(_,i)=>read<bigint>('FarmRewards','districtActiveHash',[BigInt(i)])));
 return {epoch,farms:farms.filter(f=>f.hash>0n).sort((a,b)=>a.hash===b.hash?a.wallet.localeCompare(b.wallet):a.hash>b.hash?-1:1).slice(0,20),districts,total:Number(count)};
}
