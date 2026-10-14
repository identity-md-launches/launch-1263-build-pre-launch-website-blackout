import { createPublicClient, http, type Abi, type Address, type Hex, decodeErrorResult, BaseError, ContractFunctionRevertedError, encodeFunctionData, decodeFunctionResult } from 'viem';
import abis from './abi.json';
import { chain, RPC, contracts, roles, type ContractName, ROOTS } from './config';
export const client = createPublicClient({ chain, transport: http(RPC, { batch: { batchSize: 40, wait: 20 }, retryCount: 2, timeout: 18000 }), pollingInterval: 2500 });
export const ABI = abis as Record<keyof typeof abis, Abi>;
export const addresses: Record<ContractName, Address> = { ...contracts };
export let wiringVerified = false;
export let mismatches: string[] = [];
export let lastReadBlock = 0n;
export const readLog = new Set<string>();
export async function read<T = unknown>(name: ContractName, fn: string, args: readonly unknown[] = []): Promise<T> {
  const value = await client.readContract({ address: addresses[name], abi: ABI[name], functionName: fn, args });
  readLog.add(`${name}.${fn}`);
  return value as T;
}
export async function verifyRegistry() {
  try {
  const resolved = await Promise.all(roles.map((_, role) => read<Address>('GameRegistry', 'module', [BigInt(role)])));
  const [token, market, desk, router, starterRoot, freeRoot] = await Promise.all([
    read<Address>('GameRegistry', 'token'), read<Address>('GameRegistry', 'market'), read<Address>('V4Market', 'desk'),
    read<Address>('V4Market', 'fees'), read<Hex>('StarterClaim', 'root'), read<Hex>('StarterClaim', 'freeRoot'),
  ]);
  mismatches = [];
  roles.forEach((name, i) => {
    addresses[name] = resolved[i];
    if (resolved[i].toLowerCase() !== contracts[name]) mismatches.push(`${name}: registry returned ${resolved[i]}, expected ${contracts[name]}`);
  });
  for (const [label, actual, expected] of [['BLACKOUT token',token,contracts.Token],['V4Market',market,contracts.V4Market],['SwarmDesk',desk,contracts.SwarmDesk],['FeeRouter',router,contracts.FeeRouter],['Starter root',starterRoot,ROOTS.starter],['Free root',freeRoot,ROOTS.free]]) {
    if(actual.toLowerCase()!==expected.toLowerCase()) mismatches.push(`${label}: expected ${expected}, received ${actual}`);
  }
  wiringVerified = mismatches.length === 0;
  return mismatches;
  } catch (error) { wiringVerified = false; throw error; }
}
// ChainClock.sol uses ArbSys.arbBlockNumber, not eth_blockNumber, for entropy.
export async function nativeBlock() {
  const value = await client.call({ to: '0x0000000000000000000000000000000000000064', data: '0xa3b1b31d' });
  if (!value.data) throw new Error('Native block clock unavailable. Retry the read.');
  return BigInt(value.data);
}
export function errorMessage(error: unknown): string {
  if (error instanceof BaseError) {
    const revert = error.walk(e => e instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError;
    if (revert?.data?.errorName) return `${revert.data.errorName}: ${guidance(revert.data.errorName)}`;
    if (error.walk(e => typeof e === 'object' && e !== null && 'code' in e && e.code === 4001)) return 'Request rejected in wallet. No further transaction was sent.';
  }
  const candidate = error as { message?: string; code?: number };
  // Providers wrap revert bytes differently, especially eth_call after a mined revert.
  const queue:unknown[]=[error], seen=new Set<unknown>();
  for(let depth=0;queue.length&&depth<30;depth++) {
    const item=queue.shift();if(!item||seen.has(item))continue;seen.add(item);
    if(typeof item==='string'&&/^0x[0-9a-fA-F]{8,}$/.test(item)) {
      try {const decoded=decodeErrorResult({abi:Object.values(ABI).flat(),data:item as Hex});return `${decoded.errorName}: ${guidance(decoded.errorName)}`;}catch{/* Not revert data. */}
    } else if(typeof item==='object') {
      const value=item as Record<string,unknown>;
      for(const key of ['data','raw','cause','error','originalError'])if(value[key])queue.push(value[key]);
    }
  }
  if (candidate?.code===4001 || /user rejected|user denied/i.test(candidate?.message??'')) return 'Request rejected in wallet. No further transaction was sent.';
  return (candidate?.message || String(error)).split('\n')[0].slice(0,350);
}
function guidance(name: string) {
  const hints: Record<string,string> = { TooEarly: 'Check the opening time or reveal block, then refresh.', InsufficientBalance: 'Check your balance, pending credits and free inventory space.', InvalidProof: 'The proof does not match this wallet and claim root.', AlreadyDone: 'This action was already completed. Refresh chain data.', InvalidValue: 'Refresh the quote and check item, room and feature eligibility.', NotConfigured: 'The game is not ready for this action. Check live status.', Unauthorized: 'This wallet cannot perform this action.', PriceLimitedBuy: 'Use an exact-input buy with sqrtPriceLimitX96 4295128740.', PartialFill: 'The pool could not fill the entire buy. Reduce the input and retry.', ERC20InsufficientBalance: 'Your BLACKOUT balance is below the required amount.', ERC20InsufficientAllowance: 'Approve the current quote, then retry.', Slippage: 'Refresh the quote and review the minimum output.' };
  return hints[name] || 'The contract rejected the action. Refresh chain data and check its requirements.';
}
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
