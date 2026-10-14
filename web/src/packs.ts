import { read } from './chain';

const WAD = 10n ** 18n;
const BPS = 10000n;
const ceilDiv = (a: bigint, b: bigint) => (a + b - 1n) / b;
export type EthPackQuote = { value: bigint; output: bigint; minTokens: bigint; maxCost: bigint };

export function slippageBps(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw Error('Enter slippage from 0.1% to 10%, with up to two decimal places.');
  const bps = Math.round(Number(value) * 100);
  if (bps < 10 || bps > 1000) throw Error('Enter slippage from 0.1% to 10%.');
  return bps;
}

export async function quoteEthPack(cost: bigint, slippage: number): Promise<EthPackQuote> {
  if (cost <= 0n) throw Error('Pack pricing is not ready. Refresh the quote in a moment.');
  const s = BigInt(slippage);
  const rate = await read<bigint>('V4Market', 'quote', [WAD]);
  if (rate <= 0n) throw Error('ETH pricing is unavailable. Refresh the quote in a moment.');
  // quote() includes the hook share and pool fee. Fund the maximum pack cost
  // even at the minimum swap output; independent price moves must both fit.
  const maxCost = ceilDiv(cost * (BPS + s), BPS);
  const desiredOutput = ceilDiv(maxCost * BPS, BPS - s);
  let value = ceilDiv(desiredOutput * WAD, rate);
  let output = await read<bigint>('V4Market', 'quote', [value]);
  // Account for integer rounding in the hook's net-input calculation.
  if (output < desiredOutput) {
    value += ceilDiv((desiredOutput - output) * WAD, rate) + 2n;
    output = await read<bigint>('V4Market', 'quote', [value]);
  }
  const minTokens = output * (BPS - s) / BPS;
  if (minTokens < maxCost) throw Error('The ETH quote changed. Refresh and try again.');
  return { value, output, minTokens, maxCost };
}
