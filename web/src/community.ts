import { formatUnits, decodeEventLog, type Address, type Hex } from 'viem';
import { ABI, addresses, client, read, contractErrorName } from './chain';
import { KINDS, RARITIES, type Item } from './data';
import { GAME_DEPLOYMENT_BLOCK } from './config';
import { newLogScan, scanLogRanges } from './logs';
export type Activity={key:string;block:bigint;index:number;hash:Hex;text:string};
export type Leaderboard={epoch:bigint;farms:{wallet:Address;hash:bigint;district:number}[];districts:bigint[];total:number};
const short=(s:string)=>`${s.slice(0,6)}…${s.slice(-4)}`;
const decoded=new Map<string,Activity>();
// Kind and rarity are immutable; durability/overclock are not cached here. Burned items omit their detail.
const metadata=new Map<string,Promise<Pick<Item,'kind'|'rarity'>|null>>();
let cursor:bigint|null=null;
const scan=newLogScan();
let pending:Promise<Activity[]>|null=null;
export function loadActivity():Promise<Activity[]>{
 if(!pending)pending=scanActivity().finally(()=>{pending=null;});
 return pending;
}
async function scanActivity():Promise<Activity[]>{
 const head=await client.getBlockNumber();
 const tail=cursor===null?head-216000n:(cursor>head?head:cursor)-16n;
 const from=tail>GAME_DEPLOYMENT_BLOCK?tail:GAME_DEPLOYMENT_BLOCK;
 const events=Object.values(ABI).flat().filter(e=>e.type==='event'&&['PackOpened','StarterResolved','Registered','EpochSettled'].includes(e.name));
 await scanLogRanges(from,head,scan,
  range=>client.getLogs({address:[addresses.PackSale,addresses.StarterClaim,addresses.FarmCore,addresses.FarmRewards],events,...range}),
  async(collected,{fromBlock,toBlock})=>{
 const oldTail=[...decoded.entries()].filter(([,v])=>v.block>=fromBlock&&v.block<=toBlock);
 const recent=[...collected].sort((a,b)=>a.blockNumber===b.blockNumber?(b.logIndex??0)-(a.logIndex??0):(a.blockNumber??0n)>(b.blockNumber??0n)?-1:1).filter(log=>log.transactionHash&&log.blockNumber!==null).slice(0,12);
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
 // Commit each decoded range atomically. A later failure retains this progress;
 // retries rescan the overlap, replacing any events removed by a shallow reorg.
 for(const [key]of oldTail)decoded.delete(key);
 for(const entry of parsed)if(entry)decoded.set(entry.key,entry);
 cursor=toBlock;
 const retained=activityList();decoded.clear();retained.forEach(e=>decoded.set(e.key,e));
 });
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
 return {epoch,farms:farms.filter(f=>f.hash>0n).sort((a,b)=>a.hash===b.hash?a.wallet.localeCompare(b.wallet):a.hash>b.hash?-1:1).slice(0,20),districts,total:Number(count)};
}
