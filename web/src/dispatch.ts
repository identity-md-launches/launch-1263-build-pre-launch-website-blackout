import { parseAbiItem, type Hex } from 'viem';
import { client, addresses } from './chain';
import { GAME_DEPLOYMENT_BLOCK, EXPLORER } from './config';
import { cached, remember } from './cache';
import { newLogScan, scanLogRanges } from './logs';
import { DISTRICTS, EVENTS, type Home } from './data';
import { esc } from './views';
import { districtSprite } from '../../src/sprites';
export type Herald = {key:string;block:bigint;epoch:bigint;kind:number;severity:bigint;district:number;hash:Hex};
const event=parseAbiItem('event Herald(uint256 indexed epoch,uint8 kind,uint256 district,uint256 severity,bytes32 seed,string letter)');
const cacheKey='grid-herald.v1';
let saved=cached<{head:bigint;floor:bigint;events:Herald[]}>(cacheKey);
export let dispatches:Herald[]=saved?.events??[];
let pending:Promise<void>|null=null;
export function loadDispatch(){if(!pending)pending=scan().finally(()=>pending=null);return pending;}
async function scan(){
 const head=await client.getBlockNumber(),found=new Map(dispatches.map(e=>[e.key,e]));
 const scanRange=async(from:bigint,to:bigint)=>scanLogRanges(from,to,newLogScan(),range=>client.getLogs({address:addresses.GridOperator,event,...range,strict:true}),(logs,range)=>{
  for(const [key,e]of found)if(e.block>=range.fromBlock&&e.block<=range.toBlock)found.delete(key);
  for(const log of logs)found.set(`${log.transactionHash}:${log.logIndex}`,{key:`${log.transactionHash}:${log.logIndex}`,block:log.blockNumber,epoch:log.args.epoch,kind:log.args.kind,severity:log.args.severity,district:Number(log.args.district),hash:log.transactionHash});
 });
 const from=saved?saved.head-16n:head-9999n;
 await scanRange(from>GAME_DEPLOYMENT_BLOCK?from:GAME_DEPLOYMENT_BLOCK,head);
 let floor=saved?.floor??(from>GAME_DEPLOYMENT_BLOCK?from:GAME_DEPLOYMENT_BLOCK);
 // Continue a bounded historical search on each poll. Never infer events from a missing log.
 for(let n=0;n<24&&found.size<4&&floor>GAME_DEPLOYMENT_BLOCK;n++){
  const start=floor-10000n>GAME_DEPLOYMENT_BLOCK?floor-10000n:GAME_DEPLOYMENT_BLOCK;
  await scanRange(start,floor-1n);floor=start;
 }
 dispatches=[...found.values()].sort((a,b)=>a.block>b.block?-1:a.block<b.block?1:0).slice(0,12);
 saved={head,floor,events:dispatches};remember(cacheKey,saved);
}
const flavors=[
 'A quiet grid is still a grid worth watching.',
 'Your lights are a privilege. Service will return when we decide.',
 'A little extra voltage. Consider it a test of character.',
 'We noticed the smoke. We filed it under expected behavior.',
 'One missing cable. A whole district of suspects.',
 'The city has counted your watts. The city would like a word.',
 'A surplus has been authorized. Try not to get used to it.',
 'Power is on sale. The meter is still running.',
 'The air is warm. Your cooling has a job to do.',
 'Tonight the city celebrates. Keep a light on for it.',
];
function card(e:{epoch:bigint;kind:number;severity:bigint;district:number;hash?:Hex},current=false){
 const district=e.district===8?'All districts':DISTRICTS[e.district]??`District ${e.district}`;
 const kind=EVENTS[e.kind]??`Event ${e.kind}`,art=[1,2].includes(e.kind)?'outage':e.kind===3?'fire':e.kind===6?'green':'normal';
 return `<article class="dispatch-card" data-key="${current?'current':`herald-${e.epoch}`}"><div class="dispatch-art" aria-hidden="true">${districtSprite(e.district<8?e.district:0,art)}</div><div class="dispatch-body"><p class="dispatch-meta">${current?'Current event':'City event'} · Epoch ${e.epoch}</p><h3>${kind}</h3><p>${district} · Severity ${(Number(e.severity)/100).toLocaleString('en-US',{maximumFractionDigits:2})}%</p><blockquote>“${esc(flavors[e.kind]??flavors[0])}”<cite>Grid Dispatch · flavor</cite></blockquote>${e.hash?`<a class="text-link" href="${EXPLORER}/tx/${e.hash}" target="_blank" rel="noopener noreferrer">Herald record ↗</a>`:'<p class="small muted">Confirmed by GridOperator</p>'}</div></article>`;
}
export function dispatchView(home:Home|null,events:Herald[],error=false){
 const current=home?.event[4]?{epoch:home.epoch,kind:home.event[0],severity:BigInt(home.event[1]),district:home.event[2],hash:events.find(e=>e.epoch===home.epoch)?.hash}:null;
 const previous=events.filter(e=>!home||e.epoch<home.epoch).slice(0,3);
 return `<div class="dispatch-grid">${current?card(current,true):`<article class="dispatch-card" data-key="current"><div class="dispatch-body"><h3>Current event</h3><p>${home?`Epoch ${home.epoch} awaits resolution.`:'Reading the current grid event…'}</p></div></article>`}${previous.map(e=>card(e)).join('')}</div>${previous.length<3?`<p class="small muted dispatch-history-note">${error?'Earlier Herald records are reconnecting. Confirmed events stay visible.':saved?.floor===GAME_DEPLOYMENT_BLOCK?'These are all earlier city events recorded since deployment.':'Reading the last three Herald events…'}</p>`:''}`;
}
