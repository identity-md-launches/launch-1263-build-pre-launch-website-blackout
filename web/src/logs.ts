export type LogRange = { fromBlock: bigint; toBlock: bigint };
export type LogScan = { span: bigint };
export const newLogScan = (): LogScan => ({ span: 10_000n });

// Providers wrap range limits in JSON-RPC errors or HTTP 400/403 bodies. An
// archive rejection can also be range-dependent: retry a smaller range, but
// never skip a block if even a single-block request is refused.
export function isLogRangeError(error: unknown): boolean {
 const seen = new Set<unknown>();
 for (let current = error; current && typeof current === 'object' && !seen.has(current);) {
  seen.add(current);
  const e = current as { message?: string; details?: string; status?: number; cause?: unknown };
  // viem's HTTP layer may discard a non-2xx JSON body and expose only the
  // status ("Bad Request"/"Forbidden"). These are the fallback providers'
  // range-rejection statuses. Stop at one block; 429/5xx never split.
  if (e.status === 413) return true;
  if (/personal token|forbidden|unauthorized|access denied/i.test(`${e.message || ''} ${e.details || ''}`)) return false;
  if (/ranges? (?:over|too|exceed)|block range|range (?:limit|is too)|too many (?:logs|results)|response (?:size|is too large)|query returned more/i.test(`${e.message || ''} ${e.details || ''}`)) return true;
  current = e.cause;
 }
 return false;
}

// A callback commits each successful contiguous range. After a successful probe,
// read up to four ranges together so viem can batch long fallback scans.
// Network outages escape through the normal fallback/backoff; only explicit
// range rejections shrink the request. Keep the learned size across polls.
export async function scanLogRanges<T>(
 fromBlock: bigint, head: bigint, scan: LogScan,
 readRange: (range: LogRange) => Promise<T>,
 commit: (value: T, range: LogRange) => void | Promise<void>,
) {
 scan.span=scan.span>10_000n?10_000n:scan.span;
 let width=1;
 for (let next = fromBlock; next <= head;) {
  const ranges:LogRange[]=[];
  for(let start=next;ranges.length<width&&start<=head;start+=scan.span){
   const end=start+scan.span-1n;
   ranges.push({fromBlock:start,toBlock:end<head?end:head});
  }
  // Settle all requests before retrying or returning: no background callbacks
  // can advance the cursor after a failed scan has returned to the UI.
  const results=await Promise.allSettled(ranges.map(readRange));
  for(let i=0;i<results.length;i++){
   const result=results[i],range=ranges[i];
   if(result.status==='rejected'){
    const length=range.toBlock-range.fromBlock+1n;
    if(length===1n||!isLogRangeError(result.reason))throw result.reason;
    scan.span=length/2n;width=1;
    break;
   }
   await commit(result.value,range);
   next=range.toBlock+1n;width=4;
  }
 }
}
