import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {rpcTransport,deniedEndpoint} from '../src/chain';
import {chain,RPC_URLS,POLL_MS} from '../src/config';
import {scanLogRanges,newLogScan,isLogRangeError} from '../src/logs';
import {farmName,isTeam,TEAM_WALLET} from '../src/identity';
import {validInviter,referralCredit,inviteText,personalLink} from '../src/referrals';
const passed:string[]=[],pass=(s:string)=>{passed.push(s);console.log('PASS',s);};
assert.deepEqual(RPC_URLS,['https://rpc.mainnet.chain.robinhood.com']);assert.equal(POLL_MS,15000);
assert(isTeam(TEAM_WALLET.toLowerCase()));assert.equal(farmName(TEAM_WALLET),'Team farm');assert(!isTeam('0x83027ad9d0d5374335086c539dadd1db983441b0'));pass('Only the supported official RPC remains; 15-second poll interval; case-insensitive Team farm identity');
const scan=newLogScan(),reads:{fromBlock:bigint;toBlock:bigint}[]=[],committed:bigint[]=[];
await scanLogRanges(1n,10001n,scan,async range=>{reads.push(range);if(range.toBlock-range.fromBlock+1n>2500n)throw Error('block range limit exceeded');return range;},range=>{for(let n=range.fromBlock;n<=range.toBlock;n++)committed.push(n);});
assert(reads.every(r=>r.toBlock-r.fromBlock+1n<=10000n));assert.equal(scan.span,2500n);assert.equal(committed.length,10001);assert.equal(new Set(committed).size,10001);assert.equal(committed[committed.length-1],10001n);pass('Log queries start at ≤10,000 blocks, shrink to provider limit, and commit every block once without gaps');
const progress:bigint[]=[];await assert.rejects(scanLogRanges(1n,20000n,newLogScan(),async r=>{if(r.fromBlock>=10001n)throw Error('temporarily unavailable');return r;},r=>{progress.push(r.toBlock);}));assert.deepEqual(progress,[10000n]);assert(!isLogRangeError(Error('access denied')));assert(isLogRangeError(Error('query returned more than 10000 results')));pass('Interrupted scans retain only confirmed contiguous progress; auth/outage errors do not split endlessly');
assert(validInviter(TEAM_WALLET));assert(!validInviter('javascript:alert(1)'));assert.equal(referralCredit(201n*10n**18n),1005n*10n**16n);assert.equal(personalLink(TEAM_WALLET),`https://playblackout.xyz/?ref=${TEAM_WALLET}`);assert.equal(inviteText,'Mine the city with me. You keep 100% of your rewards, I get +5% on top.');pass('Referral links/text are exact and credit is 5% on top');
const realFetch=globalThis.fetch,realNow=Date.now;let now=realNow(),count=0,fail=true;const batchSizes:number[]=[];
Date.now=()=>now;
globalThis.fetch=async(_input:any,init:any)=>{count++;const body=JSON.parse(init.body);batchSizes.push(Array.isArray(body)?body.length:1);const reply=(r:any)=>({jsonrpc:'2.0',id:r.id,...(fail?{error:{code:-32005,message:'temporarily unavailable'}}:{result:'0x1237'})});return new Response(JSON.stringify(Array.isArray(body)?body.map(reply):reply(body)),{status:200,headers:{'content-type':'application/json'}});};
try{
 const transport=rpcTransport()({chain,retryCount:0});await assert.rejects(transport.request({method:'eth_chainId'}));const first=count;await assert.rejects(transport.request({method:'eth_chainId'}));assert.equal(count,first);now+=15001;await assert.rejects(transport.request({method:'eth_chainId'}));const second=count;now+=15001;await assert.rejects(transport.request({method:'eth_chainId'}));assert.equal(count,second);now+=15001;fail=false;assert.equal(await transport.request({method:'eth_chainId'}),'0x1237');assert(deniedEndpoint({cause:{status:403}}));await Promise.all(Array.from({length:17},()=>transport.request({method:'eth_chainId'})));assert(batchSizes.every(n=>n<=4));pass('Transient RPC failure backs off 15s then 30s, avoids network calls during cooldown, recovers and caps JSON-RPC batches at 4 calls');
}finally{globalThis.fetch=realFetch;Date.now=realNow;}
mkdirSync('test/scratch/v14',{recursive:true});writeFileSync('test/scratch/v14/unit.json',JSON.stringify({passed},null,2));
