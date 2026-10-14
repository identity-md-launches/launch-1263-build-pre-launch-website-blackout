import { type Hex, type Address } from 'viem';
import { revealReceipt } from './upstream-reveal.js';
import { client, addresses, nativeBlock, contractErrorName, errorMessage } from './chain';
import { account, assertWallet, confirmHash, provider, setTx } from './wallet';
import { loadReceipt, type Receipt } from './data';
// Upstream reveal.js owns the wait/re-arm/resolve loop. This bridge adds transaction
// simulation, checked wallet identity, public-RPC reads and cancellation between prompts.
export async function reveal(receipt:Receipt,signal:AbortSignal) {
 const from=assertWallet(), contract=addresses[receipt.kind==='paid'?'PackSale':'StarterClaim'];
 const p=await provider();
 const check=()=>{if(signal.aborted)throw Error('Reveal stopped. Your receipt stays on chain; return to reveal later.');assertWallet(from);};
 const bridge={request:async({method,params=[]}:{method:string;params?:unknown[]}):Promise<unknown>=>{
  check();
  while(document.hidden){await new Promise(resolve=>setTimeout(resolve,1000));check();}
  if(method==='eth_requestAccounts')return[from];
  if(method==='eth_chainId')return '0x1237';
  if(method==='eth_call') {const [call]=params as [{to:Address;data:Hex}];return(await client.call(call)).data;}
  if(method==='eth_blockNumber')return `0x${(await client.getBlockNumber()).toString(16)}`;
  if(method==='eth_getTransactionReceipt') {
   try {const r=await client.getTransactionReceipt({hash:params[0] as Hex});return{...r,status:r.status==='success'?'0x1':'0x0'};}catch{return null;}
  }
  if(method==='eth_sendTransaction') {
   const call=(params as [{to:Address;data:Hex}])[0];
   await client.call({account:from,...call});check();
   setTx({label:'Reveal pack',state:'signature',detail:'Confirm the reveal in your wallet.',account:from});
   const hash=await p.request({method,params}) as Hex;
   // Wait here, so reverted receipts get the same decoded-error handling as other writes.
   await confirmHash(hash,'Reveal pack',from);return hash;
  }
  throw Error(`Unexpected reveal RPC method: ${method}`);
 }};
 const before=await nativeBlock();
 const progress=before>receipt.target+256n&&!receipt.captured?'Re-arming, wait a moment':'Revealing...';
 setTx({label:'Reveal pack',state:'signature',detail:progress,account:from});
 try {
  const outcome=await revealReceipt({provider:bridge,contract,receipt:receipt.id.toString(),starter:receipt.kind==='starter',captured:receipt.captured,count:1,pollMs:15000,onStatus:(detail:string)=>{
   document.dispatchEvent(new CustomEvent('revealprogress',{detail}));
  }});
  if(outcome==='already-opened'){check();return 'already-opened' as const;}
 } catch(error) {
  // Another tab or keeper may have resolved the receipt since our initial read.
  // Only suppress InvalidValue when the chain confirms every pack was opened.
  if(contractErrorName(error)==='InvalidValue') {
   const current=await loadReceipt(receipt.kind,receipt.id);
   if(current.resolved){check();return 'already-opened' as const;}
  }
  throw Error(errorMessage(error,{action:'resolve',contract:receipt.kind==='paid'?'PackSale':'StarterClaim'}));
 }
 check();
 const refreshed=await loadReceipt(receipt.kind,receipt.id);
 if(refreshed.remaining>=receipt.remaining)throw Error('Receipt is still pending. Refresh and reveal after the next target block.');
 if(account().address?.toLowerCase()!==from.toLowerCase())throw Error('Wallet changed. Refresh the inventory for the current account.');
 return 'opened' as const;
}
