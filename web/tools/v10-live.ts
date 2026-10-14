import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {verifyRegistry,read,client,contractErrorName} from '../src/chain';
import {loadHome,loadFarm} from '../src/data';
import {loadLeaderboard,loadActivity} from '../src/community';
import {RPC_URLS,contracts} from '../src/config';
import {createPublicClient,http} from 'viem';
const results:Record<string,unknown>={checkedAt:new Date().toISOString()};
for(const url of RPC_URLS){try{const c=createPublicClient({transport:http(url,{timeout:6000,retryCount:0})});results[url]={chain:await c.getChainId()};}catch(e){results[url]={error:String(e).split('\n')[0]};}}
try{
 const mismatches=await verifyRegistry();assert.deepEqual(mismatches,[]);results.registry='All module addresses and both roots match';
 const h=await loadHome();results.home=h;
 results.farm=await loadFarm('0x83027ad9d0d5374335086c539dadd1db983441b0');
 results.leaderboard=await loadLeaderboard(h.epoch);results.activity=await loadActivity();results.chainId=await client.getChainId();
 try{await read('FarmItems','outputTier',[0n]);}catch(e){results.emptyItemError=contractErrorName(e);}
 assert.equal((await read<string>('GameRegistry','token')).toLowerCase(),contracts.Token);
 results.status='passed';
}catch(e){results.status='failed';results.error=String(e).split('\n')[0];process.exitCode=1;}
mkdirSync('artifacts/v10',{recursive:true});writeFileSync('artifacts/v10/live-reads.json',JSON.stringify(results,(_,v)=>typeof v==='bigint'?v.toString():v,2)+'\n');console.log(JSON.stringify(results,(_,v)=>typeof v==='bigint'?v.toString():v,2));
