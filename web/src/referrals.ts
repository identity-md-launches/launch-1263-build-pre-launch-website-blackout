import { isAddress, parseAbiItem, type Address } from 'viem';
import { read, simulate, client, addresses, contractErrorName } from './chain';
import { cached, remember } from './cache';
import { GAME_DEPLOYMENT_BLOCK } from './config';
import { newLogScan, scanLogRanges } from './logs';
const storageKey='blackout.inviter';
export function validInviter(value:string|null):value is Address{return !!value&&isAddress(value)&&BigInt(value)!==0n;}
export function captureInviter(search=location.search){const value=new URLSearchParams(search).get('ref');if(validInviter(value))try{localStorage.setItem(storageKey,value);}catch{/* Optional storage. */}}
export function savedInviter():Address|null{try{const value=localStorage.getItem(storageKey);return validInviter(value)?value:null;}catch{return null;}}
export function referralPrecheck(player:Address,inviter:Address,hasInviterFarm:boolean,existing:Address){return player.toLowerCase()!==inviter.toLowerCase()&&hasInviterFarm&&BigInt(existing)===0n;}
export async function eligibleReferral(player:Address,inviter:Address){
 if(!validInviter(inviter)||player.toLowerCase()===inviter.toLowerCase())return false;
 const [has,ref]=await Promise.all([read<boolean>('FarmCore','hasFarm',[inviter]),read<Address>('FarmRewards','referrer',[player])]);
 if(!referralPrecheck(player,inviter,has,ref))return false;
 // No public serial/referralClosed getter exists. This call also runs _prepare:
 // an impending first settlement can close the window before setReferrer.
 try{await simulate('FarmCore','setReferrer',[inviter],player);return true;}
 catch(error){if(contractErrorName(error))return false;throw error;}
}
export const referralCredit=(gross:bigint)=>gross*500n/10000n; // FarmRewards._reward; immutable, no Params key.
export const personalLink=(wallet:Address)=>`https://playblackout.xyz/?ref=${wallet}`;
export const inviteText='Build your mining farm with me on BLACKOUT. My invite earns me an extra 5%; you keep all your mining.';
export type InviteData={referrer:Address;referees:{wallet:Address;hash:bigint;earned:bigint}[];earned:bigint};
const referred=parseAbiItem('event ReferrerSet(address indexed player,address indexed referrer)');
const active=parseAbiItem('event Active(address indexed player,uint256 indexed epoch,uint256 gross,uint256 net)');
export async function loadInvites(wallet:Address,epoch:bigint):Promise<InviteData>{
 const referrer=await read<Address>('FarmRewards','referrer',[wallet]),head=await client.getBlockNumber(),key=`referees.${wallet.toLowerCase()}`;
 type Entry={key:string;block:bigint;index:number;wallet:Address};
 const saved=cached<{head:bigint;entries:Entry[]}>(key),entries=new Map((saved?.entries??[]).map(e=>[e.key,e]));
 await scanLogRanges(saved&&saved.head>GAME_DEPLOYMENT_BLOCK+16n?saved.head-16n:GAME_DEPLOYMENT_BLOCK,head,newLogScan(),range=>client.getLogs({address:addresses.FarmRewards,event:referred,args:{referrer:wallet},...range,strict:true}), (logs,range)=>{
  for(const [k,e]of entries)if(e.block>=range.fromBlock&&e.block<=range.toBlock)entries.delete(k);
  for(const l of logs)entries.set(`${l.transactionHash}:${l.logIndex}`,{key:`${l.transactionHash}:${l.logIndex}`,block:l.blockNumber!,index:l.logIndex!,wallet:l.args.player});
  remember(key,{head:range.toBlock,entries:[...entries.values()]});
 });
 const referees:InviteData['referees']=[];
 for(const entry of entries.values()){
  const historyKey=`referral-earned.${wallet.toLowerCase()}.${entry.wallet.toLowerCase()}`;
  type Credit={key:string;block:bigint;earned:bigint};
  const old=cached<{head:bigint;credits:Credit[]}>(historyKey),credits=new Map((old?.credits??[]).map(e=>[e.key,e]));
  await scanLogRanges(old&&old.head>entry.block+16n?old.head-16n:entry.block,head,newLogScan(),range=>client.getLogs({address:addresses.FarmCore,event:active,args:{player:entry.wallet},...range,strict:true}),(logs,range)=>{
   for(const [k,e]of credits)if(e.block>=range.fromBlock&&e.block<=range.toBlock)credits.delete(k);
   for(const l of logs)if(l.blockNumber!>entry.block||l.logIndex!>entry.index){const k=`${l.transactionHash}:${l.logIndex}`;credits.set(k,{key:k,block:l.blockNumber!,earned:referralCredit(l.args.gross)});}
   remember(historyKey,{head:range.toBlock,credits:[...credits.values()]});
  });
  referees.push({wallet:entry.wallet,hash:await read<bigint>('FarmRewards','farmWeight',[entry.wallet,epoch]),earned:[...credits.values()].reduce((n,c)=>n+c.earned,0n)});
 }
 return {referrer,referees,earned:referees.reduce((n,r)=>n+r.earned,0n)};
}
