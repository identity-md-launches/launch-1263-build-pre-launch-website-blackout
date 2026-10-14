import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { repo, requireTool } from './deps.mjs';
const {keccak256,encodeAbiParameters,concatHex,createPublicClient,http,parseAbi}=requireTool('viem');
export const expected={starter:'0xb7d282d1c46f6062963bf2d134d058aa4de3af4cb7b092c5a0fd12ed74dc0f2c',free:'0xdc0842e9fd0017b08be09e787e877c53cfb446ca52aabdb9770e5c33b49d1325'};
const leaf=(index,holder)=>keccak256(encodeAbiParameters([{type:'uint256'},{type:'address'}],[BigInt(index),holder]));
const pair=(a,b)=>keccak256(concatHex(a<b?[a,b]:[b,a]));
export function build(entries) {
 const leaves=entries.map(e=>leaf(e.tokenId,e.holder));
 assert.equal(new Set(leaves).size,entries.length,'Duplicate leaf');
 const proofs=entries.map(()=>[]);
 let level=leaves.map((hash,index)=>({hash,indices:[index]})).sort((a,b)=>a.hash.localeCompare(b.hash));
 while(level.length>1) {
  const next=[];
  for(let i=0;i<level.length;i+=2) {
   const a=level[i],b=level[i+1];
   if(!b){next.push(a);continue;}
   a.indices.forEach(index=>proofs[index].push(b.hash));b.indices.forEach(index=>proofs[index].push(a.hash));
   next.push({hash:pair(a.hash,b.hash),indices:[...a.indices,...b.indices]});
  }
  level=next;
 }
 const root=level[0].hash;
 const claims=entries.map((e,i)=>({...e,leaf:leaves[i],proof:proofs[i]}));
 for(const c of claims) assert.equal(c.proof.reduce(pair,c.leaf),root,'Invalid generated proof');
 return {root,claims};
}
const snapshot=JSON.parse(readFileSync(join(repo,'web/data/starter-snapshot.json'),'utf8'));
assert.equal(snapshot.snapshotBlock,26182375);assert.equal(snapshot.collection,'0x0000ec93127baa929e58e97dd0095a2bfb38ec1d');
assert.equal(snapshot.latestOwners.length,2000);
const owners=new Map(snapshot.latestOwners.map(e=>[e.tokenId,e.holder.toLowerCase()]));
assert.equal(owners.size,2000);
const transfers=[...snapshot.transfers].sort((a,b)=>b.blockNumber-a.blockNumber||b.transactionIndex-a.transactionIndex||b.logIndex-a.logIndex);
for(const t of transfers) {
 assert(t.blockNumber>snapshot.snapshotBlock&&t.blockNumber<=snapshot.headBlock,'Transfer outside rollback range');
 if(t.tokenId>=2000)continue;
 assert.equal(owners.get(t.tokenId),t.to.toLowerCase(),'Rollback does not match latest owner');
 assert(BigInt(t.from)!==0n,'NFT minted after snapshot');owners.set(t.tokenId,t.from.toLowerCase());
}
const entries=Array.from({length:2000},(_,tokenId)=>{const holder=owners.get(tokenId);assert(holder&&/^0x[0-9a-f]{40}$/.test(holder)&&BigInt(holder)>0n,'Missing snapshot owner');return{tokenId,holder};});
const starter=build(entries);assert.equal(starter.root,expected.starter,'STARTER ROOT MISMATCH: refusing to build');
const freeAddresses=['0x83027ad9d0d5374335086c539dadd1db983441b0','0xc951677461a1971afc117b533428d7c1119f8d7e','0x70e377d17f9bb707dd7ada643b390ceb21d56f36','0x2d8dfce2e61b1edbff0e736688af73a332d762e1','0x982a3b6e484cc7d93b1b8a72a85faa860b10c836','0x7fc45725d99313f16a6fec2b2e2d2890b01b49bb','0xcc242e943cb785794f93acaa835307fabae84bd4','0xb49702b9b8314fd7f0570d0af88c2fa4b391b2ed','0xe30d40b945ae49577ca78178e3909573ad470d70','0x1221e92a685d13ba9cd88217909eb120717f34d6','0x3d6a89c8751a45dd577a4c1f3b34e71c58236193'];
const free=build(freeAddresses.map((holder,tokenId)=>({tokenId,holder})));
assert.equal(free.root,expected.free,'FREE ROOT MISMATCH: refusing to build');
let onchain=false;
if(!process.env.BLACKOUT_OFFLINE) {
 const client=createPublicClient({transport:http('https://rpc.mainnet.chain.robinhood.com',{retryCount:2})});
 const abi=parseAbi(['function root() view returns (bytes32)','function freeRoot() view returns (bytes32)']);
 const address='0xcda5653467843137aadb2729151e5e8042a49b13';
 for(const [fn,value]of [['root',starter.root],['freeRoot',free.root]]) assert.equal((await client.readContract({address,abi,functionName:fn})).toLowerCase(),value,`${fn} disagrees with live StarterClaim`);
 onchain=true;
}
mkdirSync(join(repo,'public'),{recursive:true});
writeFileSync(join(repo,'public/starter-tree.json'),JSON.stringify({chainId:1,collection:snapshot.collection,snapshotBlock:snapshot.snapshotBlock,headBlock:snapshot.headBlock,headHash:snapshot.headHash,reversedTransfers:transfers.length,leafEncoding:'keccak256(abi.encode(uint256 tokenId,address holder))',...starter})+'\n');
writeFileSync(join(repo,'public/free-tree.json'),JSON.stringify({root:free.root,leafEncoding:'keccak256(abi.encode(uint256 index,address wallet))',claims:Object.fromEntries(free.claims.map(c=>[c.holder,{index:c.tokenId,proof:c.proof}]))})+'\n');
mkdirSync(join(repo,'reports/live'),{recursive:true});
writeFileSync(join(repo,'reports/live/merkle-validation.json'),JSON.stringify({starterRoot:starter.root,freeRoot:free.root,starterClaims:2000,freeClaims:11,proofsVerified:2011,snapshotBlock:snapshot.snapshotBlock,headBlock:snapshot.headBlock,headHash:snapshot.headHash,reversedTransfers:transfers.length,onchainRootChecks:onchain,method:'Latest ownerOf at pinned head; descending Transfer rollback; sorted leaves; sorted sibling pairs; unpaired node promoted.'},null,2)+'\n');
console.log(`Merkle checks passed: 2,000 NFT proofs + 11 free proofs; ${transfers.length} transfers reversed. Live roots checked: ${onchain}.`);
