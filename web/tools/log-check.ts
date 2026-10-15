import assert from 'node:assert/strict';
import { encodeAbiParameters, encodeEventTopics, keccak256, stringToHex } from 'viem';
import { client, ABI, addresses } from '../src/chain';
import { GAME_DEPLOYMENT_BLOCK as deployment } from '../src/config';
import { findReceipts } from '../src/receipts';
import { loadActivity } from '../src/community';
import { isLogRangeError, newLogScan, scanLogRanges } from '../src/logs';

const rangeError={cause:{details:'{"error":{"code":35,"message":"ranges over 10000 blocks are not supported on free plan"}}'}};
const outage=new Error('HTTP request failed: 503 Service Unavailable');
assert(isLogRangeError(rangeError));
assert(isLogRangeError(new Error('Archive requests require a personal token.')));
assert(isLogRangeError({status:403,details:'Forbidden'}));
assert(isLogRangeError({cause:{status:400,details:'Bad Request'}}));
assert(!isLogRangeError({status:429,details:'Too Many Requests'}));
assert(!isLogRangeError(outage));
const scan=newLogScan(),blocks:bigint[]=[],attempts:bigint[]=[];
await scanLogRanges(100n,380n,scan,async range=>{
 const size=range.toBlock-range.fromBlock+1n;attempts.push(size);
 if(size>100n)throw rangeError;
 return range;
},range=>{for(let n=range.fromBlock;n<=range.toBlock;n++)blocks.push(n);});
assert.equal(new Set(blocks).size,281);assert.equal(blocks[0],100n);assert.equal(blocks.at(-1),380n);
assert(attempts.some(n=>n>100n));assert(scan.span<=100n);
const learned=scan.span;await scanLogRanges(381n,700n,scan,async range=>{assert(range.toBlock-range.fromBlock+1n<=learned);return [];},()=>{});
let attemptsOffline=0;
await assert.rejects(scanLogRanges(0n,10000n,newLogScan(),async()=>{attemptsOffline++;throw outage;},()=>{}));
assert.equal(attemptsOffline,1);
await assert.rejects(scanLogRanges(1n,1n,newLogScan(),async()=>{throw rangeError;},()=>{}));
let committed=0;
await assert.rejects(scanLogRanges(1n,20000n,newLogScan(),async()=>[],()=>{committed++;throw outage;}));
assert.equal(committed,1);
console.log('PASS adaptive log ranges: inclusive coverage, learned limits, no split on outage, no single-block skipping, failed commit stops');

// Exercise the real receipt/activity readers; no contract transaction is sent.
const storage=new Map<string,string>();
Object.defineProperty(globalThis,'localStorage',{value:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)}});
const wallet=addresses.GameRegistry,head=deployment+32000n,key=`blackout.receipts.4663.${wallet.toLowerCase()}`;
let failAt:bigint|null=deployment+20000n;
let ranges:{fromBlock:bigint;toBlock:bigint;activity:boolean}[]=[];
client.getBlockNumber=async()=>head;
client.readContract=(async({functionName}:any)=>{
 if(functionName==='commits')return [wallet,1000n,1n,0n,false,false,'0x',true,false];
 throw Error(`Unexpected read: ${functionName}`);
}) as typeof client.readContract;
client.getLogs=(async(q:any)=>{
 ranges.push({...q,activity:Array.isArray(q.address)});
 assert(q.fromBlock>=deployment,'Never scan before verified deployment');
 assert(q.toBlock-q.fromBlock<10000n,'Honor the advertised fallback limit');
 if(failAt!==null&&q.fromBlock>=failAt)throw outage;
 if(q.address===addresses.PackSale&&q.fromBlock<=deployment+10n&&q.toBlock>=deployment+10n)return [{args:{id:7n}}];
 return [];
}) as typeof client.getLogs;
await assert.rejects(findReceipts(wallet));
const checkpoint=JSON.parse(storage.get(key)!);assert.equal(BigInt(checkpoint.cursor),deployment+19999n);assert.deepEqual(checkpoint.ids,[{kind:'paid',id:'7'}]);
ranges=[];failAt=null;
const receipts=await findReceipts(wallet);
assert.equal(receipts.length,1);assert.equal(receipts[0].id,7n);
assert.equal(ranges[0].fromBlock,BigInt(checkpoint.cursor)-16n);
assert.equal(BigInt(JSON.parse(storage.get(key)!).cursor),head);
console.log('PASS receipt discovery: verified deployment start, partial cursor persisted, retry resumes overlap and keeps previously discovered pack');

const eventBlock=deployment+10n;
let removed=false,activityEnd=deployment;
const registered=(block:bigint)=>({address:addresses.PackSale,topics:encodeEventTopics({abi:ABI.PackSale,eventName:'PackCommitted',args:{id:1n,player:wallet}}),data:encodeAbiParameters([{type:'uint256'},{type:'uint256'},{type:'bool'}],[3n,100n,false]),blockNumber:block,logIndex:0,transactionHash:keccak256(stringToHex('log checkpoint fixture'))});
client.getLogs=(async(q:any)=>{
 ranges.push({...q,activity:true});
 if(q.toBlock-q.fromBlock+1n>10000n)throw new Error('block range too large');
 if(failAt!==null&&q.fromBlock>=failAt)throw outage;
 if(q.toBlock>activityEnd)activityEnd=q.toBlock;
 return !removed&&q.fromBlock<=eventBlock&&q.toBlock>=eventBlock?[registered(eventBlock)]:[];
}) as typeof client.getLogs;
ranges=[];failAt=deployment+20000n;
await assert.rejects(loadActivity());
const activityCheckpoint=activityEnd;failAt=null;ranges=[];
const activity=await loadActivity();
assert.equal(ranges[0].fromBlock,activityCheckpoint-16n);
assert.equal(activity.length,1);assert.match(activity[0].text,/bought 3 packs/);
assert.equal((await loadActivity()).length,1,'Overlap must not duplicate events');
// Move the returned head back to the event to model a shallow rollback; its
// replacement range has no event, so the obsolete entry must disappear.
client.getBlockNumber=async()=>eventBlock+5n;removed=true;
assert.equal((await loadActivity()).length,0);
console.log('PASS activity discovery: completed cursor survives outage, event survives resume, overlap deduplicates and removes reorged events');
