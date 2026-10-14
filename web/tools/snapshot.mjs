// Fetch a single pinned head, enumerate current owners, then undo every later Transfer.
import { requireTool, repo } from './deps.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const {createPublicClient,http,parseAbi,parseAbiItem}=requireTool('viem');
const {mainnet}=requireTool('viem/chains');
const rpc=process.env.ETHEREUM_RPC_URL||'https://ethereum-rpc.publicnode.com';
const client=createPublicClient({chain:mainnet,transport:http(rpc,{retryCount:4,timeout:45000})});
const collection='0x0000ec93127baa929e58e97dd0095a2bfb38ec1d';
const snapshotBlock=26182375n;
const head=await client.getBlock();
console.log('Ethereum head',String(head.number));
if(head.number<snapshotBlock)throw Error('RPC is behind the required snapshot.');
const abi=parseAbi(['function ownerOf(uint256 tokenId) view returns (address)']);
const latestOwners=[];
for(let start=0;start<2000;start+=200) {
 const results=await client.multicall({contracts:Array.from({length:200},(_,i)=>({address:collection,abi,functionName:'ownerOf',args:[BigInt(start+i)]})),blockNumber:head.number,allowFailure:false,batchSize:0});
 results.forEach((holder,i)=>latestOwners.push({tokenId:start+i,holder:holder.toLowerCase()}));
 console.log('Owners',latestOwners.length);
}
const transfers=[];
for(let start=snapshotBlock+1n;start<=head.number;start+=4000n){
 const end=start+3999n<head.number?start+3999n:head.number;
 const logs=await client.getLogs({address:collection,event:parseAbiItem('event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)'),fromBlock:start,toBlock:end,strict:true});
 transfers.push(...logs.map(l=>({blockNumber:Number(l.blockNumber),transactionIndex:l.transactionIndex,logIndex:l.logIndex,transactionHash:l.transactionHash,blockHash:l.blockHash,from:l.args.from.toLowerCase(),to:l.args.to.toLowerCase(),tokenId:Number(l.args.tokenId)})));
}
const snapshot={chainId:1,collection,snapshotBlock:Number(snapshotBlock),headBlock:Number(head.number),headHash:head.hash,rpc,fetchedAt:new Date().toISOString(),latestOwners,transfers};
writeFileSync(join(repo,'web/data/starter-snapshot.json'),JSON.stringify(snapshot)+'\n');
console.log('Saved owner evidence and',transfers.length,'Transfers. The build rolls them back and checks the root.');
