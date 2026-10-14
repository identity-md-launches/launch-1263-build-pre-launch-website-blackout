// Negative checks use temporary copies only; shipped snapshot/proofs are never changed.
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {repo,toolchain} from './deps.mjs';
const temp=mkdtempSync(join(tmpdir(),'blackout-proof-guard-'));
try {
 for(const dir of ['web/tools','web/data'])mkdirSync(join(temp,dir),{recursive:true});
 for(const file of ['web/tools/trees.mjs','web/tools/deps.mjs','web/package.json','web/data/starter-snapshot.json'])copyFileSync(join(repo,file),join(temp,file));
 const run=()=>spawnSync(process.execPath,[join(temp,'web/tools/trees.mjs')],{env:{...process.env,BLACKOUT_TOOLCHAIN:toolchain,BLACKOUT_OFFLINE:'1'},encoding:'utf8'});
 let result=run();assert.equal(result.status,0,result.stderr);
 const snapshotPath=join(temp,'web/data/starter-snapshot.json'),original=readFileSync(snapshotPath,'utf8');
 const snapshot=JSON.parse(original);const a='0x83027ad9d0d5374335086c539dadd1db983441b0',b='0xc951677461a1971afc117b533428d7c1119f8d7e';
 const owner=snapshot.latestOwners.find(x=>!snapshot.transfers.some(t=>t.tokenId===x.tokenId));owner.holder=owner.holder===a?b:a;writeFileSync(snapshotPath,JSON.stringify(snapshot));
 result=run();assert.notEqual(result.status,0);assert.match(result.stderr,/STARTER ROOT MISMATCH/);
 writeFileSync(snapshotPath,original);
 const script=join(temp,'web/tools/trees.mjs');writeFileSync(script,readFileSync(script,'utf8').replace(`['${a}','${b}'`,`['${b}','${a}'`));
 result=run();assert.notEqual(result.status,0);assert.match(result.stderr,/FREE ROOT MISMATCH/);
 const report={checkedAt:new Date().toISOString(),baseline:true,changedSnapshotOwnerRejected:true,reorderedFreeWalletsRejected:true,method:'Run the real production tree builder on temporary copies; exact STARTER ROOT MISMATCH and FREE ROOT MISMATCH assertions required. All shipped proof files remain untouched.'};
 writeFileSync(join(repo,'reports/live/build-guards.json'),JSON.stringify(report,null,2)+'\n');console.log('PASS baseline proof build and both negative root guards.');
} finally {rmSync(temp,{recursive:true,force:true});}
