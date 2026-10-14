// Reproduce the checked-in ABI JSON from the pinned public Solidity source.
// All contract toolchain downloads and outputs stay in a temporary directory.
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { repo } from './deps.mjs';
const commit='77c962e6fce9652ee93dff2037b1a09e7a66bd04';
const source=`https://api.github.com/repos/identity-md-launches/launch-1729-blackout-l4-job-b/tarball/${commit}`;
const temp=mkdtempSync(join(tmpdir(),'blackout-abi-'));
function run(cmd,args){const r=spawnSync(cmd,args,{cwd:temp,stdio:'inherit'});if(r.status!==0)throw Error(`${cmd} failed (${r.status})`);}
run('curl',['-fsSL','--max-time','90',source,'-o',join(temp,'source.tgz')]);
run('tar',['-xzf',join(temp,'source.tgz'),'--strip-components=1','-C',temp]);
run('forge',['build','--root',temp,'--skip','test','--skip','script','--quiet']);
const names=['GameRegistry','V4Market','SwarmDesk','RewardPool','FarmRewards','FarmCore','FarmItems','PackSale','StarterClaim','FeeRouter','GridOperator','Season','FarmEngine','Economy','Enhancement','Civic','Billboards','Params'];
const output=Object.fromEntries(names.map(name=>[name,JSON.parse(readFileSync(join(temp,'out',name+'.sol',name+'.json'),'utf8')).abi]));
output.Token=[...JSON.parse(readFileSync(join(temp,'out/IERC20.sol/IERC20.json'),'utf8')).abi,...JSON.parse(readFileSync(join(temp,'out/draft-IERC6093.sol/IERC20Errors.json'),'utf8')).abi];
const text=JSON.stringify(output)+'\n';
writeFileSync(join(repo,'web/src/abi.json'),text);
const provenance={repository:'https://github.com/identity-md-launches/launch-1729-blackout-l4-job-b',commit,solidity:'0.8.26',command:'forge build --skip test --skip script',contracts:[...names,'IERC20 + IERC20Errors (Token)'],sha256:createHash('sha256').update(text).digest('hex')};
writeFileSync(join(repo,'web/data/abi-provenance.json'),JSON.stringify(provenance,null,2)+'\n');
console.log('Built',names.length+1,'ABIs from',commit);
