import { parseAbiItem, type Address } from 'viem';
import { addresses, client } from './chain';
import { loadReceipt, type Receipt } from './data';
import { GAME_DEPLOYMENT_BLOCK } from './config';
import { newLogScan, scanLogRanges } from './logs';
const packEvent=parseAbiItem('event PackCommitted(uint256 indexed id,address indexed player,uint256 count,uint256 target,bool guaranteed)');
const starterEvent=parseAbiItem('event StarterCommitted(uint256 indexed tokenId,address indexed holder,uint256 target)');
const cache=new Map<string,{cursor:bigint;ids:{kind:Receipt['kind'];id:string}[]}>();
const scans=new Map<string,ReturnType<typeof newLogScan>>();
const pending=new Map<string,Promise<Receipt[]>>();
export function findReceipts(wallet:Address,onProgress:(message:string)=>void=()=>{}) {
 const key=wallet.toLowerCase();
 if(!pending.has(key))pending.set(key,scanReceipts(wallet,onProgress).finally(()=>pending.delete(key)));
 return pending.get(key)!;
}
async function scanReceipts(wallet:Address,onProgress:(message:string)=>void) {
 const key=`blackout.receipts.4663.${wallet.toLowerCase()}`;
 if(!cache.has(key)) {try {const stored=JSON.parse(localStorage.getItem(key)||'null');if(stored&&stored.ids.length<10000)cache.set(key,{cursor:BigInt(stored.cursor),ids:stored.ids});}catch{/* A fresh scan also works without storage. */}}
 const saved=cache.get(key)||{cursor:GAME_DEPLOYMENT_BLOCK-1n,ids:[]};
 const head=await client.getBlockNumber();
 const overlap=saved.cursor>head?head-16n:saved.cursor-16n;
 const start=overlap>GAME_DEPLOYMENT_BLOCK?overlap:GAME_DEPLOYMENT_BLOCK;
 const all=new Map(saved.ids.map(r=>[`${r.kind}:${r.id}`,r]));
 if(!scans.has(key))scans.set(key,newLogScan());
 await scanLogRanges(start,head,scans.get(key)!,range=>{
  onProgress('Finding your packs…');
  return Promise.all([
   client.getLogs({address:addresses.PackSale,event:packEvent,args:{player:wallet},...range,strict:true}),
   client.getLogs({address:addresses.StarterClaim,event:starterEvent,args:{holder:wallet},...range,strict:true}),
  ]);
 },([paid,starters],{toBlock})=>{
  paid.forEach(l=>all.set(`paid:${l.args.id}`,{kind:'paid',id:String(l.args.id)}));
  starters.forEach(l=>all.set(`starter:${l.args.tokenId}`,{kind:'starter',id:String(l.args.tokenId)}));
  const ids=[...all.values()];cache.set(key,{cursor:toBlock,ids});
  try{localStorage.setItem(key,JSON.stringify({cursor:String(toBlock),ids}));}catch{/* Optional cache only; receipts are on chain. */}
 });
 const ids=[...all.values()];
 const result:Receipt[]=[];
 for(let i=0;i<ids.length;i+=40)result.push(...await Promise.all(ids.slice(i,i+40).map(r=>loadReceipt(r.kind,BigInt(r.id)))));
 return result.filter(r=>!r.resolved&&r.player.toLowerCase()===wallet.toLowerCase());
}
