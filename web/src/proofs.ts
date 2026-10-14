import { encodeAbiParameters, keccak256, concatHex, type Address, type Hex } from 'viem';
import { ROOTS } from './config';
import { read } from './chain';
export type StarterProof={tokenId:number;holder:Address;leaf:Hex;proof:Hex[]};
export type FreeProof={index:number;proof:Hex[]};
let starterPromise:Promise<{root:Hex;claims:StarterProof[]}>|undefined;
let freePromise:Promise<{root:Hex;claims:Record<string,FreeProof>}>|undefined;
async function json<T>(path:string):Promise<T> {const r=await fetch(new URL(path,document.baseURI));if(!r.ok)throw Error('Claim proofs could not load. Refresh and retry.');return await r.json() as T;}
export function validProof(index:number,wallet:Address,proof:Hex[],root:Hex) {
 const leaf=keccak256(encodeAbiParameters([{type:'uint256'},{type:'address'}],[BigInt(index),wallet]));
 return proof.reduce((hash,sibling)=>keccak256(concatHex(hash<sibling?[hash,sibling]:[sibling,hash])),leaf).toLowerCase()===root.toLowerCase();
}
export async function eligibility(wallet:Address) {
 starterPromise??=json<{root:Hex;claims:StarterProof[]}>('./starter-tree.json').catch(e=>{starterPromise=undefined;throw e;});
 freePromise??=json<{root:Hex;claims:Record<string,FreeProof>}>('./free-tree.json').catch(e=>{freePromise=undefined;throw e;});
 const [starter,free,root,freeRoot,ends,freeClaimed]=await Promise.all([starterPromise,freePromise,read<Hex>('StarterClaim','root'),read<Hex>('StarterClaim','freeRoot'),read<bigint>('StarterClaim','freeClaimEnds'),read<boolean>('StarterClaim','freeClaimedBy',[wallet])]);
 if(starter.root.toLowerCase()!==ROOTS.starter||root.toLowerCase()!==ROOTS.starter||free.root.toLowerCase()!==ROOTS.free||freeRoot.toLowerCase()!==ROOTS.free)throw Error('Claim root mismatch. Claims are disabled.');
 const owned=starter.claims.filter(c=>c.holder.toLowerCase()===wallet.toLowerCase());
 if(!owned.every(c=>validProof(c.tokenId,wallet,c.proof,root)))throw Error('NFT proof verification failed.');
 const statuses=await Promise.all(owned.map(c=>read<[Address,bigint,boolean]>('StarterClaim','claims',[BigInt(c.tokenId)])));
 const freeProof=free.claims[wallet.toLowerCase()];
 if(freeProof&&!validProof(freeProof.index,wallet,freeProof.proof,freeRoot))throw Error('Free proof verification failed.');
 return {owned:owned.map((c,i)=>({...c,claimed:BigInt(statuses[i][0])!==0n})),free:freeProof,freeClaimed,ends};
}
export type Eligibility=Awaited<ReturnType<typeof eligibility>>;
