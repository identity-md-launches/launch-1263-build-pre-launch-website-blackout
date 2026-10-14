import { createPublicClient, fallback, http, type Abi, type Address, type Hex, type Transport, encodeFunctionData, decodeFunctionResult } from 'viem';
import abis from './abi.json';
import { chain, RPC_URLS, POLL_MS, contracts, roles, type ContractName, ROOTS } from './config';
let visiblePage:Promise<void>|null=null;
function waitForVisiblePage(){
 if(typeof document==='undefined'||!document.hidden)return Promise.resolve();
 if(!visiblePage)visiblePage=new Promise<void>(resolve=>{
  const resume=()=>{if(!document.hidden){document.removeEventListener('visibilitychange',resume);visiblePage=null;resolve();}};
  document.addEventListener('visibilitychange',resume);
 });
 return visiblePage;
}
// Each attempt, including receipt monitoring and fallback retries, respects visibility.
// viem doubles retryDelay on each retry of the ordered fallback cycle.
export const rpcTransport = () => fallback(RPC_URLS.map((url):Transport => {
 const endpoint=http(url,{batch:{batchSize:40,wait:20},retryCount:0,timeout:6000});
 return options=>{
  const transport=endpoint(options);
  const request:typeof transport.request=async (args,requestOptions)=>{await waitForVisiblePage();return transport.request(args,requestOptions);};
  return {...transport,request};
 };
}), { rank: false, retryCount: 2, retryDelay: 500 });
// Deployless Multicall3 requires no guessed deployment address or on-chain deployment.
export const client = createPublicClient({ chain, transport: rpcTransport(),
 batch: { multicall: { deployless: true, batchSize: 4096, wait: 20 } }, pollingInterval: POLL_MS });
const staticReads = new Set(['GameRegistry.module','GameRegistry.token','GameRegistry.market','GameRegistry.launchTime','V4Market.desk','V4Market.fees','StarterClaim.root','StarterClaim.freeRoot','StarterClaim.freeClaimEnds','PackSale.opensAt','FarmRewards.EPOCH','FarmRewards.PRECISION']);
const staticCache = new Map<string, Promise<unknown>>();
export function clearStaticReads() { staticCache.clear(); }
export const ABI = abis as Record<keyof typeof abis, Abi>;
export const addresses: Record<ContractName, Address> = { ...contracts };
export let wiringVerified = false;
export let mismatches: string[] = [];
export let lastReadBlock = 0n;
export const readLog = new Set<string>();
export async function read<T = unknown>(name: ContractName, fn: string, args: readonly unknown[] = []): Promise<T> {
  const key = `${name}.${fn}:${JSON.stringify(args,(_,v)=>typeof v==='bigint'?v.toString():v)}`;
  const get = () => client.readContract({ address: addresses[name], abi: ABI[name], functionName: fn, args });
  if (staticReads.has(`${name}.${fn}`)) {
    if (!staticCache.has(key)) staticCache.set(key, get().catch(e=>{staticCache.delete(key);throw e;}));
    readLog.add(`${name}.${fn}`); return await staticCache.get(key) as T;
  }
  const value = await get(); readLog.add(`${name}.${fn}`); return value as T;
}
export async function verifyRegistry() {
  if(wiringVerified)return mismatches;
  try {
  const resolved = await Promise.all(roles.map((_, role) => read<Address>('GameRegistry', 'module', [BigInt(role)])));
  const [token, market, desk, router, starterRoot, freeRoot] = await Promise.all([
    read<Address>('GameRegistry', 'token'), read<Address>('GameRegistry', 'market'), read<Address>('V4Market', 'desk'),
    read<Address>('V4Market', 'fees'), read<Hex>('StarterClaim', 'root'), read<Hex>('StarterClaim', 'freeRoot'),
  ]);
  mismatches = [];
  roles.forEach((name, i) => {
    // Never follow a mismatched registry into a different deployment.
    if (resolved[i].toLowerCase() !== contracts[name]) mismatches.push(`${name}: registry returned ${resolved[i]}, expected ${contracts[name]}`);
  });
  for (const [label, actual, expected] of [['BLACKOUT token',token,contracts.Token],['V4Market',market,contracts.V4Market],['SwarmDesk',desk,contracts.SwarmDesk],['FeeRouter',router,contracts.FeeRouter],['Starter root',starterRoot,ROOTS.starter],['Free root',freeRoot,ROOTS.free]]) {
    if(actual.toLowerCase()!==expected.toLowerCase()) mismatches.push(`${label}: expected ${expected}, received ${actual}`);
  }
  wiringVerified = mismatches.length === 0;
  if(!wiringVerified)clearStaticReads();
  return mismatches;
  } catch (error) { wiringVerified = false; throw error; }
}
// ChainClock.sol uses ArbSys.arbBlockNumber, not eth_blockNumber, for entropy.
export async function nativeBlock() {
  return client.readContract({address:'0x0000000000000000000000000000000000000064',abi:[{type:'function',name:'arbBlockNumber',inputs:[],outputs:[{type:'uint256'}],stateMutability:'view'}],functionName:'arbBlockNumber'});
}
export { errorMessage, contractErrorName } from './errors';
export async function simulate<T>(name: ContractName, fn: string, args: readonly unknown[], account: Address, value = 0n): Promise<T> {
  const result = await client.simulateContract({ account, address: addresses[name], abi: ABI[name], functionName: fn, args, value });
  return result.result as T;
}
// A public-RPC bridge lets the upstream reveal helper read without relying on a wallet RPC.
export function decodeCall<T>(name: ContractName, fn: string, data: Hex): T {
  return decodeFunctionResult({ abi: ABI[name], functionName: fn, data }) as T;
}
export function calldata(name: ContractName, fn: string, args: readonly unknown[] = []) {
  return encodeFunctionData({ abi: ABI[name], functionName: fn, args });
}
