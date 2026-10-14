import { parseAbiItem, type Address } from 'viem';
import { addresses, client } from './chain';
import { loadReceipt, type Receipt } from './data';
const packEvent=parseAbiItem('event PackCommitted(uint256 indexed id,address indexed player,uint256 count,uint256 target,bool guaranteed)');
const starterEvent=parseAbiItem('event StarterCommitted(uint256 indexed tokenId,address indexed holder,uint256 target)');
const cache=new Map<string,{cursor:bigint;ids:{kind:Receipt['kind'];id:string}[]}>();
export async function findReceipts(wallet:Address,onProgress:(message:string)=>void=()=>{}) {
 const key=`blackout.receipts.4663.${wallet.toLowerCase()}`;
 if(!cache.has(key)) {try {const stored=JSON.parse(localStorage.getItem(key)||'null');if(stored&&stored.ids.length<10000)cache.set(key,{cursor:BigInt(stored.cursor),ids:stored.ids});}catch{/* A fresh scan also works without storage. */}}
 const saved=cache.get(key)||{cursor:0n,ids:[]};
 const head=await client.getBlockNumber();
 const start=saved.cursor>16n?saved.cursor-16n:0n;
 const all=new Map(saved.ids.map(r=>[`${r.kind}:${r.id}`,r]));
 for(let fromBlock=start;fromBlock<=head;fromBlock+=9_999_999n) {
  const toBlock=fromBlock+9_999_998n<head?fromBlock+9_999_998n:head;
  onProgress('Looking up your on-chain pack receipts…');
  const [paid,starters]=await Promise.all([
   client.getLogs({address:addresses.PackSale,event:packEvent,args:{player:wallet},fromBlock,toBlock,strict:true}),
   client.getLogs({address:addresses.StarterClaim,event:starterEvent,args:{holder:wallet},fromBlock,toBlock,strict:true}),
  ]);
  paid.forEach(l=>all.set(`paid:${l.args.id}`,{kind:'paid',id:String(l.args.id)}));
  starters.forEach(l=>all.set(`starter:${l.args.tokenId}`,{kind:'starter',id:String(l.args.tokenId)}));
 }
 const ids=[...all.values()];cache.set(key,{cursor:head,ids});
 try{localStorage.setItem(key,JSON.stringify({cursor:String(head),ids}));}catch{/* Optional cache only; receipts are on chain. */}
 const result:Receipt[]=[];
 for(let i=0;i<ids.length;i+=40)result.push(...await Promise.all(ids.slice(i,i+40).map(r=>loadReceipt(r.kind,BigInt(r.id)))));
 return result.filter(r=>!r.resolved&&r.player.toLowerCase()===wallet.toLowerCase());
}
