import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {rpcTransport,contractErrorName} from '../src/chain';
import {chain,RPC_URLS} from '../src/config';
import {cached,remember} from '../src/cache';
import {encodeErrorResult} from 'viem';
import {ABI} from '../src/chain';
const original=globalThis.fetch;
const calls:{url:string;at:number}[]=[];
let mode:'race'|'timeout'|'revert'='race';
const timings:Record<string,number>={};
const passed:string[]=[];
const pass=(text:string)=>{passed.push(text);console.log('PASS',text);};
globalThis.fetch=(async(url,options)=>{
 const value=String(url),currentMode=mode;calls.push({url:value,at:performance.now()});
 const body=JSON.parse(String(options?.body));
 const request=Array.isArray(body)?body[0]:body;
 if(currentMode==='timeout')return new Promise((_,reject)=>options?.signal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));
 if(currentMode==='race'){
  if(value===RPC_URLS[2])return new Response('Unavailable',{status:503});
  await new Promise(resolve=>setTimeout(resolve,value===RPC_URLS[0]?900:35));
 }
 const payload={jsonrpc:'2.0',id:request.id,...(currentMode==='revert'?{error:{code:3,message:'execution reverted',data:encodeErrorResult({abi:ABI.FarmCore,errorName:'InvalidValue'})}}:{result:'0x1237'})};
 return new Response(JSON.stringify(Array.isArray(body)?[payload]:payload),{headers:{'Content-Type':'application/json'}});
}) as typeof fetch;
try{
 const rpc=rpcTransport()({chain,retryCount:0});
 let start=performance.now();assert.equal(await rpc.request({method:'eth_chainId'}),'0x1237');timings.firstGoodMs=Math.round(performance.now()-start);
 assert(timings.firstGoodMs<500);assert.deepEqual([...new Set(calls.map(c=>c.url))].sort(),[...RPC_URLS].sort());assert(Math.max(...calls.map(c=>c.at))-Math.min(...calls.map(c=>c.at))<100);
 pass('All three endpoints start together; a quick error cannot beat the first valid response; slow primary does not delay reads');
 mode='timeout';start=performance.now();await assert.rejects(rpc.request({method:'eth_chainId'}));timings.allDownMs=Math.round(performance.now()-start);assert(timings.allDownMs>=3900&&timings.allDownMs<5000);
 pass('All hanging endpoints reject in one four-second window, with no serial fallback or retries');
 mode='revert';try{await rpc.request({method:'eth_call',params:[]});assert.fail('Expected revert');}catch(error){assert.equal(contractErrorName(error),'InvalidValue');}
 pass('Contract revert data survives the RPC race for the unchanged transaction error mapper');
 const storage=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)}});
 remember('test',{epoch:5n,amount:123456789012345678901n,events:[{block:33n}]});assert.deepEqual(cached('test'),{epoch:5n,amount:123456789012345678901n,events:[{block:33n}]});
 storage.set('blackout.public.v11.4663.bad','invalid');assert.equal(cached('bad'),null);
 Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('Storage unavailable');}});assert.equal(cached('test'),null);assert.doesNotThrow(()=>remember('test',2n));
 pass('Display snapshots preserve bigint precision; corrupt or disabled storage does not block the app');
}finally{globalThis.fetch=original;}
mkdirSync('artifacts/v11',{recursive:true});writeFileSync('artifacts/v11/reliability.json',JSON.stringify({checkedAt:new Date().toISOString(),passed,timings},null,2)+'\n');
