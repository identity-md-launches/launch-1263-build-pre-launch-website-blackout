import { createPublicClient, createTransport, http, type Abi, type Address, type Hex, type Transport, type EIP1193RequestFn, encodeFunctionData, decodeFunctionResult } from 'viem';
import abis from './abi.json';
import { isLogRangeError } from './logs';
// Session quarantine is shared by regular, archive and wallet read clients.
const rejectedEndpoints=new Set<string>();
export function deniedEndpoint(error:unknown){let e=error as {status?:number;cause?:unknown};const seen=new Set();while(e&&!seen.has(e)){seen.add(e);if(e.status===400||e.status===401||e.status===403)return true;e=e.cause as typeof e;}return /personal token|access denied|forbidden|(?:http|status)[^\n]*401/i.test(String(error));}
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
// Public reads use only the supported endpoint with bounded timeouts/backoff.
// Keep the transport's failure isolation for archive reads and wallet simulations.
// Wallet writes use the player's provider, never this transport.
export const rpcTransport = ():Transport => options => {
 let archiveTurn=Promise.resolve(),nextArchiveRead=0;
 const paceArchive=async()=>{const previous=archiveTurn;let release!:()=>void;archiveTurn=new Promise<void>(resolve=>release=resolve);await previous;const wait=Math.max(0,nextArchiveRead-Date.now());if(wait)await new Promise(resolve=>setTimeout(resolve,wait));nextArchiveRead=Date.now()+600;release();};
 // Deployless calls include bytecode. Keep JSON batches small enough for the
 // provider's request-body limit even when several farms load together.
 const endpoints=RPC_URLS.map(url=>({url,transport:http(url,{batch:{batchSize:4,wait:10},retryCount:0,timeout:4000})(options),failures:0,retryAt:0}));
 return createTransport({key:'blackout-race',name:'Robinhood concurrent RPC',type:'custom',retryCount:0,
  request: (async (args,requestOptions)=>{
   await waitForVisiblePage();
   // Historical scans share a paced queue, so independent indexers cannot burst
   // a provider’s expensive log-method quota. The 4s timeout starts per request.
   if(args.method==='eth_getLogs')await paceArchive();
   try{
    // The configured official endpoint also serves bounded archive log ranges.
    const capable=args.method==='eth_getLogs'?endpoints.slice(0,1):endpoints;
    const ready=capable.filter(e=>!rejectedEndpoints.has(e.url)&&Date.now()>=e.retryAt);
    if(!ready.length)throw new Error('RPC reconnecting; waiting for backoff');
    return await Promise.any(ready.map(async endpoint=>{
     try{const result=await endpoint.transport.request(args,requestOptions);endpoint.failures=0;endpoint.retryAt=0;return result;}
     catch(error){const range=args.method==='eth_getLogs'&&isLogRangeError(error);if(!range&&deniedEndpoint(error))rejectedEndpoints.add(endpoint.url);if(!range&&!/revert/i.test(String(error))){endpoint.failures++;endpoint.retryAt=Date.now()+Math.min(120000,15000*2**(endpoint.failures-1));}throw error;}
    }));
   }
   catch(error){
    // Preserve viem's original contract error (including revert data) for the
    // existing error mapper and transaction simulations.
    const errors=(error as AggregateError).errors??[error];
    throw errors.find(e=>/revert/i.test(String(e)))??errors[0];
   }
  }) as EIP1193RequestFn
 });
};
// Deployless Multicall3 requires no guessed deployment address or on-chain deployment.
const readClient = () => createPublicClient({ chain, transport: rpcTransport(),
 batch: { multicall: { deployless: true, batchSize: 2048, wait: 20 } }, pollingInterval: POLL_MS });
export const client = readClient();
// Providers can serve current state while pruning older state. Historical
// failures back off independently so reveal history cannot block current reads
// or transaction simulations. Endpoints, racing and timeouts are identical.
export const historicalClient = readClient();
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
