import { createConfig, getAccount, getConnectors, connect, disconnect, reconnect, watchAccount, watchConnectors, getConnectorClient } from '@wagmi/core';
import { injected, coinbaseWallet } from '@wagmi/connectors';
import { decodeFunctionData, getAddress, type Address, type Hex } from 'viem';
import { chain, EXPLORER, type ContractName } from './config';
import { ABI, addresses, client, errorMessage, wiringVerified, calldata, read, rpcTransport, contractErrorName } from './chain';
export const walletConfig = createConfig({ chains: [chain], multiInjectedProviderDiscovery: true, connectors: [injected(), coinbaseWallet({preference:'smartWalletOnly',appName:'BLACKOUT',appLogoUrl:'https://playblackout.xyz/app-icon.png'})], transports: {[chain.id]:rpcTransport()} });
export type TxState = { label: string; state: 'signature'|'pending'|'confirmed'|'reverted'|'error'|'complete'; detail: string; hash?: Hex; account?: Address };
export let tx:TxState|null = null;
export let transactionBusy=false;
const txKey='blackout.live.transactions.4663';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export const account=()=>getAccount(walletConfig);
export const walletAddress=()=>account().address;
export const canWrite=()=>account().isConnected&&account().chainId===chain.id&&wiringVerified&&!transactionBusy;
export const short=(value:string)=>`${value.slice(0,6)}…${value.slice(-4)}`;
let trigger:HTMLElement|null=null;
let connecting=false;
const sheet=()=>document.querySelector<HTMLDialogElement>('#wallet-dialog')!;
const icon=(id:string)=>new URL(`./wallets/${id}.svg`,document.baseURI).href;
const coinbaseIcon=icon('coinbase');
const genericIcon=`data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><rect x="3" y="6" width="22" height="18" rx="2" fill="none" stroke="#39e6ff" stroke-width="2"/><path d="M6 6V3h16v3M18 12h7v6h-7z" fill="none" stroke="#39e6ff" stroke-width="2"/></svg>')}`;
export const OPEN_IN=[
 {id:'metamask',name:'MetaMask',href:(url:string)=>`https://link.metamask.io/dapp/${url.replace(/^https?:\/\//,'')}`},
 {id:'coinbase',name:'Coinbase Wallet',href:(url:string)=>`https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}`},
 {id:'rabby',name:'Rabby',href:(url:string)=>`https://go.rabby.io/mobile/?url=${encodeURIComponent(url)}`},
 {id:'phantom',name:'Phantom',href:(url:string)=>`https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(new URL(url).origin)}`},
];
function mobileWithoutProvider() {return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)&&!getConnectors(walletConfig).some(c=>c.type==='injected'&&c.id!=='injected')&&!(window as Window&{ethereum?:unknown}).ethereum;}
function renderWallets() {
 if(connecting)return;
 const connectors=getConnectors(walletConfig),named=connectors.some(c=>c.type==='injected'&&c.id!=='injected'),mobile=mobileWithoutProvider();
 const listed=[...connectors.filter(c=>c.type==='injected'),...connectors.filter(c=>c.type!=='injected')].filter(c=>!(named&&c.id==='injected')).filter(c=>!mobile||c.type!=='injected');
 const current=account();
 const rows=sheet().querySelector('#wallet-rows')!;
 if(current.isConnected) {
  rows.innerHTML=`<p class="full-address">${esc(getAddress(current.address!))}</p><p>Robinhood Chain · 4663</p>${current.chainId!==chain.id?'<button class="button" data-switch>Switch to Robinhood Chain</button>':''}<button class="button" data-disconnect>Disconnect</button>`;
 } else {
  rows.innerHTML=(mobile?OPEN_IN.map(w=>`<a class="wallet-row" href="${esc(w.href(location.href))}"><img src="${icon(w.id)}" width="28" height="28" alt="">Open in ${w.name}<span aria-hidden="true">↗</span></a>`).join(''):'')+listed.map(c=>{
   const label=c.id==='injected'?'Browser wallet':c.id==='coinbaseWalletSDK'?'Coinbase Smart Wallet':c.name;
   const image=c.icon&&/^data:image\//.test(c.icon)?c.icon:c.id==='coinbaseWalletSDK'?coinbaseIcon:genericIcon;
   return `<button class="wallet-row" data-connector="${esc(c.uid)}"><img src="${esc(image)}" width="28" height="28" alt=""><span>${esc(label)}</span></button>`;
  }).join('');
 }
}
function updateHeader() {
 const button=document.querySelector<HTMLButtonElement>('#connect')!;
 const a=account();
 button.textContent=a.isConnected?(a.chainId!==chain.id?'Switch network':short(getAddress(a.address!))):'Connect';
 button.setAttribute('aria-label',a.isConnected&&a.chainId!==chain.id?'Switch to Robinhood Chain':a.isConnected?`Wallet ${a.address}`:'Connect a wallet');
 document.dispatchEvent(new CustomEvent('walletchange'));
 if(sheet().open)renderWallets();
}
export function openWallet() {
 trigger=document.activeElement as HTMLElement;
 renderWallets();sheet().querySelector('#wallet-note')!.textContent='';sheet().showModal();
}
export async function switchNetwork() {
 const p=await provider(), target=`0x${chain.id.toString(16)}`;
 try {await p.request({method:'wallet_switchEthereumChain',params:[{chainId:target}]});}
 catch(error) {
  const e=error as {code?:number;data?:{originalError?:{code?:number}}};
  if(e.code!==4902&&e.data?.originalError?.code!==4902)throw error;
  await p.request({method:'wallet_addEthereumChain',params:[{chainId:target,chainName:chain.name,nativeCurrency:chain.nativeCurrency,rpcUrls:[chain.rpcUrls.default.http[0]],blockExplorerUrls:[EXPLORER]}]});
  // EIP-3085 does not require adding a network to select it.
  await p.request({method:'wallet_switchEthereumChain',params:[{chainId:target}]});
 }
 if(Number(BigInt(await p.request({method:'eth_chainId'}) as string))!==chain.id)throw Error('Robinhood Chain was not selected. Switch networks in your wallet and retry.');
 account().connector?.emitter.emit('change',{chainId:chain.id});updateHeader();
}
export function setupWallet() {
 document.querySelector('#connect')!.addEventListener('click',()=>{if(account().isConnected&&account().chainId!==chain.id){void switchNetwork().catch(e=>setTx({label:'Switch network',state:'error',detail:errorMessage(e)}));}else openWallet();});
 sheet().querySelector('[data-close-wallet]')!.addEventListener('click',()=>sheet().close());
 sheet().addEventListener('click',e=>{if(e.target===sheet()){const r=sheet().getBoundingClientRect();if((e as MouseEvent).clientX<r.left||(e as MouseEvent).clientX>r.right||(e as MouseEvent).clientY<r.top||(e as MouseEvent).clientY>r.bottom)sheet().close();}});
 sheet().addEventListener('close',()=>trigger?.focus());
 sheet().addEventListener('click',async e=>{
  const target=(e.target as Element).closest<HTMLElement>('[data-connector],[data-disconnect],[data-switch]');if(!target||connecting)return;
  connecting=true;sheet().querySelectorAll<HTMLButtonElement>('.wallet-row').forEach(b=>b.disabled=true);
  const note=sheet().querySelector<HTMLElement>('#wallet-note')!;
  try {
   if(target.hasAttribute('data-disconnect')){await disconnect(walletConfig);sheet().close();}
   else if(target.hasAttribute('data-switch')){await switchNetwork();sheet().close();}
   else {const connector=getConnectors(walletConfig).find(c=>c.uid===target.dataset.connector)!;note.textContent=`Opening ${connector.id==='injected'?'browser wallet':connector.name}…`;target.classList.add('is-pending');await connect(walletConfig,{connector});sheet().close();}
  } catch(e){note.textContent=errorMessage(e);}
  finally{connecting=false;renderWallets();updateHeader();}
 });
 watchAccount(walletConfig,{onChange:updateHeader});watchConnectors(walletConfig,{onChange:renderWallets});
 void reconnect(walletConfig).catch(()=>undefined).finally(updateHeader);
 void restoreTransaction();
}
export function setTx(state:TxState) {tx=state;document.dispatchEvent(new CustomEvent('txchange'));if(state.hash){try{localStorage.setItem(txKey,JSON.stringify(state));}catch{/* Storage is optional. */}}}
async function restoreTransaction() {
 try{const saved=JSON.parse(localStorage.getItem(txKey)||'null') as TxState|null;if(!saved?.hash||!/^0x[0-9a-fA-F]{64}$/.test(saved.hash))return;
  setTx(saved);if(saved.state==='pending'){const receipt=await client.getTransactionReceipt({hash:saved.hash});setTx({...saved,state:receipt.status==='success'?'confirmed':'reverted',detail:receipt.status==='success'?'Confirmed on Robinhood Chain. Refresh to update the game.':await revertedDetail(saved.hash,receipt.blockNumber)});}
 }catch{/* Unmined transactions retain their visible hash and can be checked again. */}
}
export async function refreshTransaction() {await restoreTransaction();}
export async function provider() {
 const connector=account().connector;if(!connector)throw Error('Connect a wallet first.');
 return await connector.getProvider() as {request(args:{method:string;params?:unknown[]}):Promise<unknown>};
}
export function assertWallet(expected?:Address) {
 const a=account();if(!a.address||!a.isConnected)throw Error('Connect a wallet first.');
 if(a.chainId!==chain.id)throw Error('Switch to Robinhood Chain before sending.');
 if(!wiringVerified)throw Error('Contract verification is incomplete. Refresh chain data before sending.');
 if(expected&&a.address.toLowerCase()!==expected.toLowerCase())throw Error('Wallet account changed. Review the action again.');
 return a.address;
}
let beforeFarmAction:((from:Address)=>Promise<void>)|null=null;
export function setBeforeFarmAction(fn:(from:Address)=>Promise<void>){beforeFarmAction=fn;}
export async function send(name:ContractName,fn:string,args:readonly unknown[]=[],label=fn,value=0n):Promise<Hex> {
 const from=assertWallet();
 if(beforeFarmAction&&fn!=='setReferrer'&&name!=='Token')await beforeFarmAction(from);
 assertWallet(from);
 setTx({label,state:'signature',detail:'Checking the transaction…',account:from});
 try {
  const simulation=await client.simulateContract({address:addresses[name],abi:ABI[name],functionName:fn,args,account:from,value});
  assertWallet(from);
  setTx({label,state:'signature',detail:'Confirm in your wallet. Review the amount and network.',account:from});
  const signer=await getConnectorClient(walletConfig,{chainId:chain.id});
  // writeContract is exposed by the connector client's action set through the provider.
  const p=await provider();
  if(signer.account.address.toLowerCase()!==from.toLowerCase())throw Error('Wallet account changed. Review again.');
  const hash=await p.request({method:'eth_sendTransaction',params:[{from,to:addresses[name],data:calldata(name,fn,args),...(value?{value:`0x${value.toString(16)}`}:{})}]}) as Hex;
  void simulation;
  await confirmHash(hash,label,from);return hash;
 }catch(error){
  let reason='';
  if(contractErrorName(error)==='TooEarly')try{
   if(name==='PackSale'&&['buyWithETH','openPack'].includes(fn)){
    const [paused,opens,block]=await Promise.all([read<boolean>('PackSale','paused'),read<bigint>('PackSale','opensAt'),client.getBlock()]);
    reason=paused?'Pack purchases are paused by the city. Check back when the sale reopens.':block.timestamp<opens?`Pack purchases open ${new Date(Number(opens)*1000).toLocaleString('en-US')}.`:'Pack purchases are not open right now. Refresh the sale status.';
   }else if(name==='StarterClaim'&&fn==='claim'){
    const [launch,block]=await Promise.all([read<bigint>('GameRegistry','launchTime'),client.getBlock()]);
    reason=block.timestamp>=launch+16n*86400n?'The starter claim window has closed.':`Starter claims open ${new Date(Number(launch+172800n)*1000).toLocaleString('en-US')}, 48 hours after launch.`;
   }
  }catch{/* Keep the decoded action guidance if the explanatory read also fails. */}
  if(tx?.state!=='pending'&&tx?.state!=='reverted')setTx({label,state:'error',detail:errorMessage(error,{action:fn,contract:name,reason}),account:from});throw error;
 }
}
async function revertedDetail(hash:Hex,blockNumber:bigint) {
 let context:{contract?:string;action?:string}={};
 try {
  const original=await client.getTransaction({hash});
  const name=(Object.keys(addresses) as ContractName[]).find(n=>addresses[n].toLowerCase()===original.to?.toLowerCase());
  if(name)try{context={contract:name,action:decodeFunctionData({abi:ABI[name],data:original.input}).functionName};}catch{/* Unknown calldata still receives plain error wording. */}
  await client.call({account:original.from,to:original.to!,data:original.input,value:original.value,blockNumber});
 }catch(e){return errorMessage(e,context);}
 return 'Reverted on chain. Refresh the quote and check the contract requirements.';
}
export async function confirmHash(hash:Hex,label:string,from:Address) {
 setTx({label,state:'pending',detail:'Submitted. Waiting for chain confirmation…',hash,account:from});
 let receipt;
 try{receipt=await client.waitForTransactionReceipt({hash,timeout:120000});}
 catch(error){setTx({label,state:'pending',detail:'Confirmation is taking longer. Your transaction may still be pending; check the explorer before retrying.',hash,account:from});throw error;}
 if(receipt.status==='reverted') {
  const detail=await revertedDetail(hash,receipt.blockNumber);
  setTx({label,state:'reverted',detail,hash,account:from});throw Error(detail);
 }
 setTx({label,state:'confirmed',detail:'Confirmed on Robinhood Chain.',hash,account:from});return receipt;
}
export async function approve(name:ContractName,amount:bigint) {
 const from=assertWallet();
 const allowance=await read<bigint>('Token','allowance',[from,addresses[name]]);
 if(allowance<amount){await send('Token','approve',[addresses[name],amount],`Approve ${name}`);assertWallet(from);}
}
export async function transact(action:()=>Promise<void>) {
 if(transactionBusy)return;
 const previousTx=tx;transactionBusy=true;document.dispatchEvent(new CustomEvent('walletbusy'));
 try{await action();}catch(e){if(tx?.state!=='pending'&&tx?.state!=='reverted')setTx({label:tx?.label||'Transaction',state:'error',detail:tx!==previousTx&&tx?.state==='error'?tx.detail:errorMessage(e)});}
 finally{transactionBusy=false;document.dispatchEvent(new CustomEvent('walletbusy'));document.dispatchEvent(new CustomEvent('transactionend'));}
}
export const txLink=(hash:Hex)=>`${EXPLORER}/tx/${hash}`;
