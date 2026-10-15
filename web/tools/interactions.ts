// Browser-only deterministic fixtures. They cannot submit a transaction or provide a key.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { decodeAbiParameters, multicall3Abi, deploylessCallViaBytecodeBytecode, decodeFunctionData, encodeFunctionResult, encodeErrorResult, encodeEventTopics, encodeAbiParameters, keccak256, stringToHex, type Address, type Hex } from 'viem';
import { contracts, roles, ROOTS, GAME_DEPLOYMENT_BLOCK } from '../src/config';
import abiData from '../src/abi.json';
import { serve } from './serve.mjs';
import { requireTool, repo } from './deps.mjs';
const {chromium,webkit}=requireTool('playwright');
const AxeBuilder=requireTool('@axe-core/playwright').default;
const wallet='0x83027ad9d0d5374335086c539dadd1db983441b0';
const E=10n**18n;
const report:{passed:string[];limitations:string[];errors:string[];screenshots:string[];accessibility:unknown[]}= {passed:[],limitations:[],errors:[],screenshots:[],accessibility:[]};
const pass=(label:string)=>{report.passed.push(label);console.log('PASS',label);};
const {server,url}=await serve();
mkdirSync(join(repo,'test/scratch/interaction-shots'),{recursive:true});
mkdirSync(join(repo,'artifacts/v10'),{recursive:true});
function fixture() {
 const now=BigInt(Math.floor(Date.now()/1000));
 const state={wallet,authorized:false,chain:'0x1',added:false,hold:false,signatureHold:false,resolveRace:0n,reject:false,revertNext:false,revertRead:'',revertData:null as Hex|null,mismatch:false,failClaimRead:false,rpcOffline:false,primaryDown:false,secondaryDown:false,rpcUrls:[] as string[],revealRarities:[1,1,1],level:7n,launch:now-3n*86400n,enabled:false,epoch:4n,nonce:0,block:GAME_DEPLOYMENT_BLOCK+2000n,activityBlock:GAME_DEPLOYMENT_BLOCK+1990n,logLimit:10000n,logFailAt:null as bigint|null,logRequests:[] as {url:string;from:bigint;to:bigint;activity:boolean;rejected:boolean}[],native:1100n,freeClaimed:false,nftClaimed:false,allowance:0n,pending:100n*E,items:[{id:1n,holder:wallet,durability:5000,kind:0,rarity:1,overclock:0,starter:false,equipped:false},{id:2n,holder:wallet,durability:10000,kind:3,rarity:1,overclock:0,starter:false,equipped:true}],slots:[2n,...Array(23).fill(0n)],rooms:new Set([0]),receipts:new Map<string,{target:bigint;count:bigint;opened:bigint;captured:boolean;player:string;block:bigint}>(),txs:new Map<string,any>(),sent:[] as any[],rpc:[] as string[],readFns:[] as string[],walletCalls:[] as any[]};
 const encode=(name:string,fn:string,result:unknown)=>encodeFunctionResult({abi:abiData[name as keyof typeof abiData] as any,functionName:fn,result} as any);
 function value(name:string,fn:string,a:any[]):any {
  const k=`${name}.${fn}`;state.readFns.push(k);if(state.failClaimRead&&k==='FarmRewards.claim')throw {code:-32005,message:'Rate limit exceeded'};
  if(state.revertRead===k)throw {code:3,message:'execution reverted',data:state.revertData||encodeErrorResult({abi:abiData.FarmCore as any,errorName:'InvalidValue'})};
  switch(k) {
   case 'GameRegistry.module':return state.mismatch&&Number(a[0])===0?contracts.Economy:contracts[roles[Number(a[0])]];
   case 'GameRegistry.token':return contracts.Token;case 'GameRegistry.market':return contracts.V4Market;
   case 'V4Market.desk':return contracts.SwarmDesk;case 'V4Market.fees':return contracts.FeeRouter;
   case 'StarterClaim.root':return ROOTS.starter;case 'StarterClaim.freeRoot':return ROOTS.free;
   case 'GameRegistry.launchTime':return state.launch;case 'FarmRewards.epoch':return state.epoch;case 'FarmRewards.epochEnd':return now+3600n;case 'FarmRewards.epochStart':return now-18000n;
   case 'RewardPool.endowed':return true;case 'RewardPool.available':return 1000000n*E;case 'RewardPool.lockedEndowment':return 200000000n*E;
   case 'V4Market.spot':return 100000n*E;case 'V4Market.currentBuyTaxBps':return 100n;case 'V4Market.launchTaxTimeLeft':return 0n;
   case 'PackSale.ready':return true;case 'PackSale.paused':return false;case 'PackSale.opensAt':return now-2n*86400n;
   case 'Civic.enabled':return state.enabled;case 'Civic.noticeAt':return 0n;
   case 'GridOperator.gridStability':return 10000n;
   case 'FarmCore.count':return 2n;case 'FarmCore.playerAt':return Number(a[0])===0?wallet:contracts.GameRegistry;case 'FarmCore.maxLevelByAge':return 9n;case 'Enhancement.pending':return 0n;case 'FarmRewards.farmWeight':return a[0].toLowerCase()===wallet?10000n:20000n;case 'FarmRewards.entrySeconds':return 18000n;case 'FarmRewards.configuredWeight':return 10000n;case 'FarmRewards.districtActiveHash':return a[0]===3n?30000n:0n;case 'FarmRewards.shares':return [10000n,10000n,1500n,false];case 'FarmRewards.epochData':{const entry=abiData.FarmRewards.find((x:any)=>x.name==='epochData') as any;return Object.fromEntries(entry.outputs[0].components.map((v:any)=>[v.name,v.type==='bytes32'?'0x'+'00'.repeat(32):v.name==='rewardPerHash'?10n**42n:v.name==='tariff'?10000n:0n]));}
   case 'FarmCore.hasFarm':return true;case 'FarmCore.level':return state.level;case 'FarmCore.xp':return 1700n;case 'FarmCore.district':return 3n;
   case 'Token.balanceOf':return 500000n*E;case 'Token.allowance':return state.allowance;
   case 'FarmRewards.pending':return state.pending;case 'FarmItems.capacity':return 15n;case 'FarmItems.ownedCount':return BigInt(state.items.length);
   case 'FarmItems.itemsByOwner':return state.items.slice(Number(a[1]),Number(a[1]+a[2])).map(i=>i.id);
   case 'FarmItems.data':{const i=state.items.find(i=>i.id===a[0]);if(!i)throw Error('Unknown fixture item');return i;}
   case 'Economy.repairQuote':return 100n*E;case 'FarmItems.outputTier':return state.items.find(i=>i.id===a[0])!.durability<8000?6500n:10000n;
   case 'FarmCore.paidPacks':return 1n;case 'Economy.farmDaily':return 3000n*E;case 'FarmRewards.lastSettled':return 3n;case 'FarmRewards.settledEpoch':return 3n;
   case 'FarmRewards.lastYieldPerHash':return E*E;case 'FarmRewards.scrapAllowance':return 1000000n*E;case 'FarmCore.autoRepairThreshold':return 0;
   case 'FarmCore.roomUnlocked':return state.rooms.has(Number(a[1]));case 'FarmCore.roomEligible':return Number(a[1])<3;
   case 'Economy.roomQuote':return [0n,6000n,15000n,30000n][Number(a[1])]*E;
   case 'FarmCore.roomStats':return {raw:10000n,productive:10000n,power:1500n,bonus:1000n,cooling:false,cold:false,offgrid:false,clean:false,locked:false,airflow:false};
   case 'FarmCore.itemAt':return state.slots[Number(a[1])*6+Number(a[2])];
   case 'FarmRewards.claim':return BigInt(a[0])*9n/10n;
   case 'PackSale.nextId':return BigInt([...state.receipts.keys()].filter(k=>k.startsWith('paid:')).length)+1n;
   case 'PackSale.quote':return 100n*E*a[0];case 'PackSale.price':return 100n*E;
   case 'V4Market.quote':return a[0]*100000n;
   case 'StarterClaim.freeClaimEnds':return now+27n*86400n;case 'StarterClaim.freeClaimedBy':return state.freeClaimed;
   case 'StarterClaim.claims':{const r=state.receipts.get(`starter:${a[0]}`);return r?[r.player,r.target,r.opened===r.count]:['0x0000000000000000000000000000000000000000',0n,false];}
   case 'StarterClaim.entropyCaptured':return state.receipts.get(`starter:${a[0]}`)?.captured??false;
   case 'PackSale.commits':{const r=state.receipts.get(`paid:${a[0]}`);return r?[r.player,r.target,r.count,r.opened,false,false,'0x'+'00'.repeat(32),r.captured,false]:['0x0000000000000000000000000000000000000000',0n,0n,0n,false,false,'0x'+'00'.repeat(32),false,false];}
   case 'PackSale.resolve':{
    const r=state.receipts.get(`paid:${a[0]}`)!;
    if(state.resolveRace===a[0]){r.opened=r.count;state.resolveRace=0n;}
    if(a[1]>r.count-r.opened)throw {code:3,message:'execution reverted',data:encodeErrorResult({abi:abiData.PackSale as any,errorName:'InvalidValue'})};
    return;
   }
   case 'PackSale.openPack':case 'PackSale.buyWithETH':return 1n;
   case 'StarterClaim.claimFree':return (1n<<255n)|a[0];
   case 'Economy.districtStake':case 'Economy.districtTotal':return 0n;
   case 'GridOperator.eventAt':return [0,10000,0,'0x'+'00'.repeat(32),true];
   case 'GridOperator.planAt':return {kind:0,severity:0,number:'0x'+'00'.repeat(32),letter:'',submitted:false};
   case 'SwarmDesk.lastLetterHash':return '0x'+'00'.repeat(32);
   case 'Economy.locks':return [0n,0n,0n,0];case 'Economy.lockQuote':return [15000n*E,500n];case 'Economy.lobbyQuote':return 3000n*E;
   case 'Billboards.week':return 0n;case 'Billboards.refund':return 0n;case 'Billboards.billboard':return {bidder:'0x0000000000000000000000000000000000000000',bid:0n,text:'',handle:'',settled:false};
   case 'Season.pot':case 'Season.potRemaining':return 0n;case 'Season.claimDeadline':return now+30n*86400n;case 'Season.result':return [false,0,'0x0000000000000000000000000000000000000000',0n,'0x'+'00'.repeat(32)];
   case 'Season.districtScore':return [0n,0n];case 'Season.lotteryWon':case 'Season.lotteryClaimed':case 'Season.districtClaimed':case 'Season.bestClaimed':return false;
   default:{const entry=(abiData[name as keyof typeof abiData] as any[]).find(x=>x.type==='function'&&x.name===fn);if(entry?.stateMutability==='nonpayable'||entry?.stateMutability==='payable')return entry.outputs?.length?true:undefined;throw Error(`Unimplemented fixture read ${k}`);}
  }
 }
 function identify(to:string,data:Hex) {const name=Object.keys(contracts).find(n=>contracts[n as keyof typeof contracts].toLowerCase()===to.toLowerCase());if(!name)throw Error(`Unknown contract ${to}`);const decoded=decodeFunctionData({abi:abiData[name as keyof typeof abiData] as any,data});return {name,fn:decoded.functionName,args:(decoded.args??[]) as any[]};}
 function apply(t:any) {
  const {name,fn,args:a}=identify(t.to,t.data);
  if(name==='Token'&&fn==='approve')state.allowance=a[1];
  else if(fn==='place'){state.slots[Number(a[1])*6+Number(a[2])]=a[0];state.items.find(i=>i.id===a[0])!.equipped=true;}
  else if(fn==='unplace'){const at=Number(a[0])*6+Number(a[1]);state.items.find(i=>i.id===state.slots[at])!.equipped=false;state.slots[at]=0n;}
  else if(fn==='repair')state.items.find(i=>i.id===a[0])!.durability=10000;
  else if(fn==='scrap')state.items=state.items.filter(i=>i.id!==a[0]);
  else if(fn==='buyRoom')state.rooms.add(Number(a[0]));
  else if(name==='FarmRewards'&&fn==='claim')state.pending-=a[0];
  else if(name==='PackSale'&&['openPack','buyWithETH'].includes(fn)){const player=fn==='openPack'?wallet:a[0];state.receipts.set('paid:1',{target:1000n,count:fn==='openPack'?a[0]:a[1],opened:0n,captured:false,player,block:state.block});}
  else if(name==='StarterClaim'&&fn==='claim'){state.nftClaimed=true;state.receipts.set(`starter:${a[0]}`,{target:1000n,count:1n,opened:0n,captured:false,player:wallet,block:state.block});}
  else if(fn==='claimFree'){state.freeClaimed=true;state.receipts.set(`starter:${(1n<<255n)|a[0]}`,{target:1000n,count:1n,opened:0n,captured:false,player:wallet,block:state.block});}
  else if(fn==='captureEntropy'){const r=state.receipts.get(`${name==='PackSale'?'paid':'starter'}:${a[0]}`)!;if(state.native>r.target+256n)r.target=state.native+2n;else r.captured=true;}
  else if(fn==='resolve'){const r=state.receipts.get(`${name==='PackSale'?'paid':'starter'}:${a[0]}`)!;if(!r.captured&&state.native>r.target+256n){r.target=state.native+2n;return;}r.captured=true;r.opened++;for(let i=0;i<3;i++){const id=state.items.reduce((m,x)=>x.id>m?x.id:m,0n)+1n;state.items.push({id,holder:wallet,durability:10000,kind:i,rarity:state.revealRarities[i],overclock:0,starter:name==='StarterClaim',equipped:false});}}
 }
 async function rpc(req:any):Promise<any> {
  state.rpc.push(req.method);
  try {
   let result:any;
   if(req.method==='eth_chainId')result='0x1237';
   // Receipt polling watches new block numbers, just as it does on chain.
   else if(req.method==='eth_blockNumber')result=`0x${(++state.block).toString(16)}`;
   else if(req.method==='eth_getBlockByNumber')result={number:`0x${state.block.toString(16)}`,timestamp:`0x${now.toString(16)}`,hash:keccak256(stringToHex('fixture block')),parentHash:keccak256(stringToHex('parent')),transactions:[],gasLimit:'0x1c9c380',gasUsed:'0x0',baseFeePerGas:'0x1'};
   else if(req.method==='eth_getBalance')result=`0x${E.toString(16)}`;
   else if(req.method==='eth_call'){
    const t=req.params[0];
    if(!t.to){const [,data]=decodeAbiParameters([{type:'bytes'},{type:'bytes'}],('0x'+t.data.slice(deploylessCallViaBytecodeBytecode.length)) as Hex);const decoded=decodeFunctionData({abi:multicall3Abi,data});const calls=(decoded.args as any)[0];const values=await Promise.all(calls.map(async(c:any)=>{const inner=await rpc({id:req.id,method:'eth_call',params:[{to:c.target,data:c.callData},req.params[1]]});return inner.error?{success:false,returnData:inner.error.data||'0x'}:{success:true,returnData:inner.result};}));result=encodeFunctionResult({abi:multicall3Abi,functionName:'aggregate3',result:values});}
    else if(t.to.toLowerCase()==='0x0000000000000000000000000000000000000064'){state.native++;result=`0x${state.native.toString(16).padStart(64,'0')}`;}
    else {const {name,fn,args}=identify(t.to,t.data);result=encode(name,fn,value(name,fn,args));}
   } else if(req.method==='eth_getLogs') {
    const q=req.params[0];if(Array.isArray(q.address)){const mk=(name:string,eventName:string,args:any,data:any,types:any,idx:number)=>({address:contracts[name as keyof typeof contracts],topics:encodeEventTopics({abi:abiData[name as keyof typeof abiData] as any,eventName,args} as any),data:encodeAbiParameters(types,data),blockNumber:'0x'+state.activityBlock.toString(16),transactionIndex:'0x0',logIndex:'0x'+idx.toString(16),transactionHash:keccak256(stringToHex(eventName)),blockHash:keccak256(stringToHex('fixture block')),removed:false});return {jsonrpc:'2.0',id:req.id,result:BigInt(q.fromBlock)<=state.activityBlock&&BigInt(q.toBlock)>=state.activityBlock?[mk('FarmCore','Registered',{player:wallet},[3n],[{type:'uint256'}],0),mk('FarmRewards','EpochSettled',{epoch:3n},[100n*E,5n*E],[{type:'uint256'},{type:'uint256'}],1)]:[]};}const name=q.address.toLowerCase()===contracts.PackSale?'PackSale':'StarterClaim';
    result=[];
    for(const [key,r]of state.receipts){const [kind,id]=key.split(':');if((kind==='paid')!==(name==='PackSale')||r.player!==wallet)continue;if(BigInt(q.fromBlock)>r.block||BigInt(q.toBlock)<r.block)continue;
     const eventName=name==='PackSale'?'PackCommitted':'StarterCommitted';
     const topics=encodeEventTopics({abi:abiData[name] as any,eventName,args:name==='PackSale'?{id:BigInt(id),player:wallet}:{tokenId:BigInt(id),holder:wallet}} as any);
     result.push({address:contracts[name],topics,data:encodeAbiParameters(name==='PackSale'?[{type:'uint256'},{type:'uint256'},{type:'bool'}]:[{type:'uint256'}],name==='PackSale'?[r.count,r.target,false]:[r.target] as any),blockNumber:`0x${r.block.toString(16)}`,transactionIndex:'0x0',logIndex:'0x0',transactionHash:keccak256(stringToHex(key)),blockHash:keccak256(stringToHex('fixture block')),removed:false});
    }
   } else if(req.method==='eth_getTransactionReceipt') {
    const t=state.txs.get(req.params[0]);result=!t||state.hold?null:{transactionHash:req.params[0],transactionIndex:'0x0',blockHash:keccak256(stringToHex('fixture block')),blockNumber:`0x${t.block.toString(16)}`,from:wallet,to:t.to,gasUsed:'0x5208',cumulativeGasUsed:'0x5208',effectiveGasPrice:'0x1',contractAddress:null,logs:[],logsBloom:'0x'+'00'.repeat(256),status:t.revert?'0x0':'0x1',type:'0x2'};
   } else if(req.method==='eth_getTransactionByHash') {const t=state.txs.get(req.params[0]);result={...t,block:undefined,hash:req.params[0],from:wallet,input:t.data,value:t.value||'0x0',blockNumber:`0x${t.block.toString(16)}`,type:'0x2',nonce:'0x1',gas:'0x5208',maxFeePerGas:'0x1',maxPriorityFeePerGas:'0x1',chainId:'0x1237'};}
   else throw Error(`Unexpected fixture RPC ${req.method}`);
   return {jsonrpc:'2.0',id:req.id,result};
  }catch(e:any){return {jsonrpc:'2.0',id:req.id,error:{code:e.code||-32000,message:e.message||'fixture error',...(e.data?{data:e.data}:{})}};}
 }
 return {state,rpc,identify,apply};
}
async function injected(context:any,f:ReturnType<typeof fixture>) {
 await context.route('https://cca-lite.coinbase.com/**',async(route:any)=>route.fulfill({status:200,body:'{}'}));
 await context.route('https://api.coinbase.com/**',async(route:any)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:{amount:'2400',base:'ETH',currency:'USD'}})}));
 await context.exposeBinding('fixtureWallet',async(_:unknown,request:any)=>{
  f.state.walletCalls.push(request);
  const {method,params=[]}=request;
  if(method==='eth_accounts')return f.state.authorized?[f.state.wallet]:[];
  if(method==='eth_requestAccounts'){f.state.authorized=true;return [f.state.wallet];}
  if(method==='eth_chainId')return f.state.chain;
  if(method==='wallet_switchEthereumChain'){if(!f.state.added)throw Object.assign(new Error('Unknown chain'),{code:4902});f.state.chain=params[0].chainId;return null;}
  if(method==='wallet_addEthereumChain'){assert.equal(params[0].chainId,'0x1237');assert.deepEqual(params[0].rpcUrls,['https://rpc.mainnet.chain.robinhood.com']);f.state.added=true;return null;}
  if(method==='wallet_getCapabilities')return {};
  if(method==='eth_sendTransaction'){
   while(f.state.signatureHold)await new Promise(resolve=>setTimeout(resolve,50));
   if(f.state.reject){f.state.reject=false;throw Object.assign(new Error('User rejected request'),{code:4001});}
   const t=params[0],decoded=f.identify(t.to,t.data),hash=keccak256(stringToHex(`fixture-tx-${++f.state.nonce}`));
   f.state.sent.push({...t,...decoded,hash});f.state.txs.set(hash,{...t,block:f.state.block,revert:f.state.revertNext});
   if(!f.state.revertNext)f.apply(t);else f.state.revertRead=`${decoded.name}.${decoded.fn}`;f.state.revertNext=false;return hash;
  }
  throw Error(`Unexpected wallet method ${method}`);
 });
 const init=()=>{
  const handlers:Record<string,Array<(...a:any[])=>void>>={};
  const p={on:(name:string,fn:(...a:any[])=>void)=>(handlers[name]??=[]).push(fn),removeListener:(name:string,fn:(...a:any[])=>void)=>{handlers[name]=(handlers[name]||[]).filter(x=>x!==fn);},request:async(args:any)=>{
   try {const value=await (window as any).fixtureWallet(args);if(args.method==='wallet_switchEthereumChain')handlers.chainChanged?.forEach(fn=>fn(args.params[0].chainId));return value;}
   catch(error:any){const message=error.message||String(error);if(message.includes('Unknown chain'))throw Object.assign(Error(message),{code:4902});if(message.includes('rejected'))throw Object.assign(Error(message),{code:4001});throw error;}
  }};
  (window as any).ethereum=p;
  const announce=()=>{for(const [uuid,name,rdns]of [['84ad22c2-4284-41d4-b7af-cb5f427f5a04','Fixture Wallet','com.blackout.fixture'],['e9290af9-14b0-4b36-9fd0-4d3fa6714490','Second Fixture','com.blackout.second']])window.dispatchEvent(new CustomEvent('eip6963:announceProvider',{detail:{info:{uuid,name,rdns,icon:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><circle cx="14" cy="14" r="12" fill="cyan"/></svg>'},provider:p}}));};
  window.addEventListener('eip6963:requestProvider',announce);announce();
 };
 await context.addInitScript({content:'globalThis.__name = (fn) => fn; ('+init.toString()+')();'});
 await context.route(/^https:\/\/(rpc\.mainnet\.chain\.robinhood\.com|robinhood\.drpc\.org|robinhood-rpc\.publicnode\.com)\//,async(route:any)=>{
  const url=route.request().url();f.state.rpcUrls.push(url);if(route.request().method()==='OPTIONS'){await route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type'}});return;}
  if(f.state.rpcOffline||f.state.primaryDown&&url.includes('rpc.mainnet.chain')||f.state.secondaryDown&&url.includes('drpc.org')){await route.fulfill({status:503,contentType:'text/plain',body:'RPC temporarily unavailable',headers:{'access-control-allow-origin':'*','access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type'}});return;}
  const body=route.request().postDataJSON();
  if(url.includes('drpc.org')&&Array.isArray(body)&&body.length>3){
   await route.fulfill({status:500,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(body.map((req:any)=>({jsonrpc:'2.0',id:req.id,error:{code:31,message:'Batch of more than 3 requests are not allowed on free plan'}})))});return;
  }
  const respond=async(req:any)=>{
   if(req.method==='eth_getLogs'){
    const q=req.params[0],from=BigInt(q.fromBlock),to=BigInt(q.toBlock),activity=Array.isArray(q.address);
    const rangeRejected=!url.includes('rpc.mainnet.chain')&&to-from+1n>f.state.logLimit;
    const interrupted=f.state.logFailAt!==null&&from>=f.state.logFailAt;
    f.state.logRequests.push({url,from,to,activity,rejected:rangeRejected||interrupted});
    if(interrupted)return {jsonrpc:'2.0',id:req.id,error:{code:-32005,message:'Temporarily unavailable'}};
    if(rangeRejected)return {jsonrpc:'2.0',id:req.id,error:url.includes('drpc.org')?{code:35,message:'ranges over 10000 blocks are not supported on free plan'}:{code:-32602,message:'Archive requests require a personal token. Get one at: https://www.allnodes.com/publicnode'}};
   }
   return f.rpc(req);
  };
  const result=Array.isArray(body)?await Promise.all(body.map(respond)):await respond(body);
  const responses=Array.isArray(result)?result:[result];
  const status=responses.every((r:any)=>r.error?.code===35)?400:responses.every((r:any)=>r.error?.code===-32602)?403:200;
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(result),headers:{'access-control-allow-origin':'*'}});
 });
}
const waitTx=async(page:any,label?:string)=>{await page.locator('#tx-status').filter({hasText:label||'Confirmed'}).waitFor();await page.waitForFunction(()=>document.querySelector('#tx-status')?.getAttribute('data-state')==='confirmed');await page.waitForTimeout(350);};
const openItem=async(page:any,id=1)=>{if(!await page.locator(`#item-${id} details`).evaluate((e:HTMLDetailsElement)=>e.open))await page.locator(`#item-${id} summary`).click();};
const clickConfirm=async(page:any)=>{await page.locator('#confirm-action').click();await waitTx(page);await page.locator('#action-dialog').waitFor({state:'hidden'});};
async function fixtureSuite(browser:any,engine:string) {
 const f=fixture();const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await injected(context,f);
 const page=await context.newPage();const errors:string[]=[];page.on('pageerror',(e:any)=>{errors.push(e.message);console.error('FIXTURE PAGE ERROR',engine,page.url(),e.message);});
 page.on('requestfailed',(request:any)=>console.warn('FIXTURE REQUEST FAILED',engine,request.method(),request.url(),request.failure()?.errorText));
 await page.goto(url);await page.waitForFunction(()=>document.querySelector('#connection-status')?.textContent==='City connected');
 await page.goto(url+'#/season');await page.locator('#season-week').waitFor();
 assert(await page.getByRole('button',{name:'View week',exact:true}).isEnabled());await page.locator('#season-week').fill('2');await page.getByRole('button',{name:'View week',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#season-week')?.getAttribute('value')==='2');
 assert.equal(f.state.walletCalls.filter(x=>x.method==='eth_requestAccounts').length,0);assert(await page.locator('[data-season-claim]').first().isDisabled());pass(`${engine}: v8 regression — View week reads week 2 without a wallet; claims remain gated`);
 await page.locator('#connect').click();await page.getByRole('button',{name:'Fixture Wallet',exact:true}).waitFor({timeout:5000});assert.equal(await page.getByRole('button',{name:'Browser wallet',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Second Fixture',exact:true}).count(),1);pass(`${engine}: EIP-6963 wallets are named; generic duplicate hidden`);
 await page.getByRole('button',{name:'Fixture Wallet',exact:true}).click();await page.locator('#connect').filter({hasText:'Switch network'}).waitFor();
 await page.locator('#connect').click();await page.waitForTimeout(700);await page.locator('#connect').filter({hasText:'0x8302'}).waitFor({timeout:5000});assert(f.state.walletCalls.some(x=>x.method==='wallet_addEthereumChain'));pass(`${engine}: switch/add chain 4663 with correct RPC`);
 await page.goto(url+'#/farm');await page.locator('[data-install="1"]').waitFor({state:'attached'});
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:join(repo,`test/scratch/interaction-shots/${engine}-farm-390.png`)});
 const farmAxe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();report.accessibility.push({engine,route:'farm fixture',violations:farmAxe.violations});if(farmAxe.violations.length)console.log('Farm axe',JSON.stringify(farmAxe.violations));assert.equal(farmAxe.violations.length,0,`${engine}: populated Farm accessibility`);pass(`${engine}: populated Farm axe WCAG checks`);
 assert.equal(await page.locator('#onboarding').innerText(),'');
 for(const [value,expected] of [['spare',['item-1']],['installed',['item-2']]] as const){
  await page.locator('#inventory-filter').selectOption(value);
  await page.locator('[data-refresh]').first().click();await page.waitForTimeout(1000);
  assert.equal(await page.locator('#inventory-filter').inputValue(),value);
  assert.deepEqual(await page.locator('[data-item-equipped]:visible').evaluateAll((es:HTMLElement[])=>es.map(e=>e.id)),expected);
 }
 await page.locator('#inventory-filter').selectOption('all');
 pass(`${engine}: inventory and installed filters survive a completed refresh`);
 f.state.items[0].rarity=4;await page.locator('[data-refresh]').first().click();await page.locator('#item-1 .item-gate').filter({hasText:'Requires level 10'}).waitFor();assert(await page.locator('[data-select-item="1"]').isDisabled());
 f.state.items[0].rarity=2;f.state.level=1n;await page.locator('[data-refresh]').first().click();await page.locator('#item-1 .item-gate').filter({hasText:'Requires level 3'}).waitFor();
 f.state.items[0].rarity=1;f.state.items[0].kind=3;await page.locator('[data-refresh]').first().click();await page.locator('#item-1 .item-gate').filter({hasText:'One of each type per room'}).waitFor();assert(await page.locator('[data-select-item="1"]').isDisabled());
 f.state.items[0].kind=0;f.state.level=7n;await page.locator('[data-refresh]').first().click();await page.locator('[data-select-item="1"]:enabled').waitFor();await page.locator('[data-select-item="1"]').click();assert(await page.locator('[data-select-item="1"]').getAttribute('aria-pressed')==='true');await page.locator('[data-slot="0,1"]').click();await page.locator('#action-dialog').waitFor();assert.equal(await page.locator('#install-slot').inputValue(),'0,1');await page.locator('#cancel-action').click();
 pass(`${engine}: onboarding hidden for an occupied farm, greyed rarity/duplicate gates, tap item then rack and cancel`);

 await openItem(page);await page.locator('[data-install="1"]').click();await page.locator('#install-slot').selectOption('0,1');await clickConfirm(page);assert.equal(f.state.slots[1],1n);pass(`${engine}: place into selected empty room slot`);
 await openItem(page);await page.locator('[data-unplace="0,1"]').click();await waitTx(page);assert.equal(f.state.slots[1],0n);pass(`${engine}: unplace hardware`);
 await openItem(page);await page.locator('[data-repair="1"]').click();await clickConfirm(page);assert.equal(f.state.items[0].durability,10000);assert(f.state.sent.some(t=>t.fn==='approve'&&t.args[0].toLowerCase()===contracts.FarmCore&&t.args[1]===100n*E));pass(`${engine}: quote, exact approval, repair`);
 await page.locator('[data-buy-room="1"]').click();await clickConfirm(page);assert(f.state.rooms.has(1));pass(`${engine}: room eligibility and purchase`);
 await page.goto(url+'#/rewards');await page.locator('[data-claim]:enabled').waitFor();assert((await page.locator('.reward-card').innerText()).includes('10 BLACKOUT'));await page.locator('[data-claim]').click();assert((await page.locator('#action-body').innerText()).includes('90 BLACKOUT'));await clickConfirm(page);assert.equal(f.state.pending,0n);pass(`${engine}: simulated 10% claim tax, net preview and claim`);await page.goto(url+'#/farm');await page.locator('#item-1').waitFor();
 await openItem(page);await page.locator('[data-scrap="1"]').click();await page.locator('#cancel-action').click();assert.equal(f.state.items.length,2);await page.locator('[data-scrap="1"]').click();await clickConfirm(page);assert.equal(f.state.items.length,1);pass(`${engine}: destructive scrap confirmation, cancellation and minimum payout`);
 await page.screenshot({path:join(repo,`test/scratch/interaction-shots/${engine}-farm-populated.png`),fullPage:true});
 await page.goto(url+'#/packs');await page.locator('[data-claim-nft="1927"]').waitFor();assert.equal(await page.locator('[data-claim-free]').count(),1);pass(`${engine}: verified NFT #1927 and free allowlist visibility`);
 if(await page.locator('[data-dismiss-tx]').isVisible())await page.locator('[data-dismiss-tx]').click();
 // Quantity and primary hierarchy, including the mobile first screen.
 assert.equal(await page.locator('#pack-recipient').count(),0);assert.equal(await page.locator('#pack-count input').count(),0);
 assert(await page.getByRole('button',{name:'Fewer packs'}).isDisabled());
 for(let n=1;n<10;n++){await page.getByRole('button',{name:'More packs'}).click();await page.waitForFunction((count:number)=>document.querySelector('#pack-count')?.textContent===String(count),n+1);await page.locator('[data-buy-eth]:enabled').waitFor();}
 assert.equal(await page.locator('#pack-count').innerText(),'10');assert(await page.getByRole('button',{name:'More packs'}).isDisabled());
 for(let n=10;n>2;n--){await page.getByRole('button',{name:'Fewer packs'}).click();await page.waitForFunction((count:number)=>document.querySelector('#pack-count')?.textContent===String(count),n-1);await page.locator('[data-buy-eth]:enabled').waitFor();}
 await page.locator('[data-buy-eth]:enabled').waitFor();assert((await page.locator('.pack-token-price').innerText()).includes('200'));
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:join(repo,`test/scratch/interaction-shots/${engine}-packs-390.png`)});const buyBox=await page.locator('[data-buy-eth]').boundingBox();assert(buyBox&&buyBox.y+buyBox.height<770);
 await page.screenshot({path:join(repo,`test/scratch/interaction-shots/${engine}-packs-390.png`)});
 assert(!(await page.locator('.pack-purchase').innerText()).includes('Opens at'));assert(!(await page.locator('.pack-purchase').innerText()).includes('Purchases open'));
 pass(`${engine}: stepper 1–10, ETH primary visible at 390, no gift or duplicate sale copy`);
 for(const width of [320,390,768,1440]) {
  await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Packs fixture overflow ${width}`);
  if(width===1440)await page.screenshot({path:join(repo,`test/scratch/interaction-shots/${engine}-packs-1440.png`)});
 }
 await page.setViewportSize({width:390,height:844});
 const packsAxe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();report.accessibility.push({engine,route:'packs fixture',violations:packsAxe.violations});assert.equal(packsAxe.violations.length,0);
 await page.locator('#pack-increase').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('.pack-token-price')?.textContent?.includes('300'));assert.equal(await page.evaluate(()=>document.activeElement?.id),'pack-increase');await page.locator('#pack-decrease').click();await page.waitForFunction(()=>document.querySelector('.pack-token-price')?.textContent?.includes('200'));
 pass(`${engine}: populated Packs reflows at four widths, passes axe and preserves keyboard stepper focus`);
 // Default slippage: both maximum pack cost and minimum swap output are protected.
 let start=f.state.sent.length;
 await page.locator('[data-buy-eth]').click();await page.locator('#action-dialog').waitFor();
 f.state.signatureHold=true;f.state.hold=true;await page.locator('#confirm-action').click();
 await page.locator('#action-tx-status[data-state="signature"]').filter({hasText:'Confirm in your wallet'}).waitFor();
 assert((await page.locator('#action-tx-status').innerText()).includes('Buy pack with ETH'));assert(await page.locator('#confirm-action').isDisabled());
 await page.keyboard.press('Escape');assert(await page.locator('#action-dialog').isVisible());
 const dialogAxe=await new AxeBuilder({page}).include('#action-dialog').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();report.accessibility.push({engine,route:'ETH signature dialog',violations:dialogAxe.violations});assert.equal(dialogAxe.violations.length,0);
 f.state.signatureHold=false;await page.locator('#action-tx-status[data-state="pending"]').waitFor();
 assert((await page.locator('#action-tx-status a').getAttribute('href')).startsWith('https://robinhoodchain.blockscout.com/tx/'));
 await page.screenshot({path:join(repo,`test/scratch/interaction-shots/${engine}-pending-dialog-390.png`)});
 f.state.hold=false;await waitTx(page);await page.locator('#action-dialog').waitFor({state:'hidden'});
 let writes=f.state.sent.slice(start);assert.equal(writes.length,1);const eth=writes[0];assert.equal(eth.fn,'buyWithETH');assert.equal(eth.to.toLowerCase(),contracts.PackSale);assert.equal(eth.args[0].toLowerCase(),wallet);assert.equal(eth.args[1],2n);assert.equal(eth.args[3],206n*E);
 assert.equal(eth.args[2],BigInt(eth.value)*100000n*9700n/10000n);assert(eth.args[2]>=eth.args[3]);assert.equal(BigInt(eth.value),(206n*E*10000n+100000n*9700n-1n)/(100000n*9700n));
 pass(`${engine}: ETH purchase is one buyWithETH transaction, connected recipient, 3% bounds and ETH value`);
 pass(`${engine}: v8 regression — signature, transaction label and pending explorer link stay inside active dialog`);
 await page.locator('#pack-advanced summary').click();await page.locator('#pack-slippage').fill('5');await page.locator('#pack-slippage').blur();await page.locator('[data-buy-eth]:enabled').waitFor();
 start=f.state.sent.length;await page.locator('[data-buy-eth]').click();await clickConfirm(page);writes=f.state.sent.slice(start);assert.equal(writes.length,1);assert.equal(writes[0].args[3],210n*E);assert.equal(writes[0].args[2],BigInt(writes[0].value)*100000n*9500n/10000n);
 pass(`${engine}: Advanced slippage changes minTokens and maxCost together`);
 await page.locator('#pack-slippage').fill('0');await page.locator('#pack-slippage').blur();await page.locator('#slippage-error').filter({hasText:'0.1% to 10%'}).waitFor();assert.equal(await page.locator('#pack-slippage').getAttribute('aria-invalid'),'true');const invalidStart=f.state.sent.length;await page.locator('[data-buy-eth]').click();assert.equal(await page.locator('#action-dialog').isVisible(),false);assert.equal(f.state.sent.length,invalidStart);
 pass(`${engine}: invalid slippage shows a field error and never reaches a wallet prompt`);
 await page.locator('#pack-slippage').fill('3');await page.locator('#pack-slippage').blur();await page.locator('[data-buy-eth]:enabled').waitFor();
 // Token path: never request an approval when equal OR greater allowance exists.
 for(const allowance of [0n,200n*E,900n*E]) {
  f.state.allowance=allowance;start=f.state.sent.length;await page.locator('[data-buy-tokens]').click();await clickConfirm(page);writes=f.state.sent.slice(start);
  assert.deepEqual(writes.map(t=>t.fn),allowance===0n?['approve','openPack']:['openPack']);assert.equal(writes.at(-1).args[0],2n);
  if(allowance===0n){assert.equal(writes[0].args[0].toLowerCase(),contracts.PackSale);assert.equal(writes[0].args[1],200n*E);}
 }
 pass(`${engine}: BLACKOUT approval only for insufficient allowance, skipped for equal and greater allowance`);
 // An error belongs in the dialog too, and can be retried without a reload.
 f.state.reject=true;await page.locator('[data-buy-eth]').click();await page.locator('#confirm-action').click();await page.locator('#action-tx-status[data-state="error"]').filter({hasText:'rejected'}).waitFor();assert(await page.locator('#action-dialog').isVisible());await page.locator('#cancel-action:enabled').click();
 pass(`${engine}: failed signature is visible inside the dialog and cancel restores controls`);
 const receipt=f.state.receipts.get('paid:1')!;receipt.target=f.state.native+100n;
 await page.locator('[data-refresh-receipts]').click();await page.locator('[data-receipt="paid:1"] .receipt-state').filter({hasText:'Revealing...'}).waitFor();assert.equal(await page.locator('[data-reveal="paid:1"]').count(),0);
 f.state.native=receipt.target+1n;await page.locator('[data-reveal="paid:1"]').waitFor({timeout:30000});
 await page.locator('#pack-slippage').focus();f.state.native++;await page.waitForTimeout(3300);assert.equal(await page.evaluate(()=>document.activeElement?.id),'pack-slippage');
 pass(`${engine}: waiting receipt shows Revealing..., becomes Reveal, clock preserves input focus`);
 receipt.target=f.state.native-300n;f.state.hold=true;
 await page.locator('[data-reveal="paid:1"]').click();await page.locator('[data-receipt="paid:1"] .receipt-state').filter({hasText:'Re-arming, wait a moment'}).waitFor();f.state.hold=false;
 await page.getByRole('heading',{name:'Hardware revealed.'}).waitFor({timeout:90000});assert(f.state.sent.filter(t=>t.name==='PackSale'&&t.fn==='resolve').length>=2);
 await page.locator('[data-buy-eth]:enabled').waitFor();await page.locator('[data-buy-tokens]:enabled').waitFor();await page.locator('[data-claim-free]:enabled').waitFor();await page.locator('[data-claim-nft="1927"]:enabled').waitFor();
 assert.equal((await page.locator('#reveal-result .reveal-card').count()),3);assert(await page.locator('#reveal-result .reveal-card').evaluateAll((es:HTMLElement[])=>es.every(e=>getComputedStyle(e).animationName==='none')));pass(`${engine}: all three revealed items remain visible with reduced motion and no animation`);assert((await page.locator('#reveal-result').innerText()).includes('Place your hardware in a room to start mining'));
 assert.equal(await page.locator('[data-receipt="paid:1"] .receipt-state').innerText(),'');assert((await page.locator('[data-receipt="paid:1"]').innerText()).includes('1 pack left'));
 pass(`${engine}: expired window re-arms, reveals hardware and reloads remaining receipts and inventory`);
 pass(`${engine}: v8 regression — buy and eligible claim buttons re-enable immediately after reveal without refresh`);
 await page.locator('[data-reveal="paid:1"]').click();await page.locator('[data-receipt="paid:1"]').waitFor({state:'hidden',timeout:45000});
 assert.equal(receipt.opened,receipt.count);assert.equal(await page.locator('[data-reveal="paid:1"]').count(),0);
 await page.locator('#receipt-lookup summary').click();await page.locator('#receipt-id').fill('1');await page.locator('#receipt-form button[type="submit"]').click();await page.getByRole('heading',{name:'Already opened, see your Farm'}).waitFor();assert.equal(await page.locator('[data-reveal="paid:1"]').count(),0);
 pass(`${engine}: fully opened receipts hide Reveal, including manual receipt lookup`);
 // Stale tab / concurrent keeper: InvalidValue is suppressed only with on-chain completion.
 receipt.opened=0n;await page.locator('[data-refresh-receipts]').click();await page.locator('[data-reveal="paid:1"]').waitFor();f.state.resolveRace=1n;start=f.state.sent.length;
 await page.locator('[data-reveal="paid:1"]').click();await page.locator('#tx-status[data-state="complete"]').filter({hasText:'Already opened, see your Farm'}).waitFor();assert.equal(f.state.sent.length,start);await page.locator('[data-reveal="paid:1"]').waitFor({state:'hidden'});
 pass(`${engine}: concurrent fully opened receipt InvalidValue becomes Already opened, see your Farm`);
 receipt.opened=0n;await page.locator('[data-refresh-receipts]').click();await page.locator('[data-reveal="paid:1"]').waitFor();f.state.revertRead='PackSale.resolve';
 await page.locator('[data-reveal="paid:1"]').click();await page.locator('#tx-status[data-state="error"]').filter({hasText:'not ready to open'}).waitFor();f.state.revertRead='';
 pass(`${engine}: unrelated InvalidValue remains actionable when packs are still unopened`);
 // The newly restored claims actually work, including proof submission.
 await page.locator('[data-claim-nft="1927"]:enabled').click();await waitTx(page);assert(f.state.nftClaimed);const nft=f.state.sent.find(t=>t.fn==='claim'&&t.name==='StarterClaim');assert.equal(nft.args[0],1927n);assert(nft.args[1].length>0);
 await page.locator('[data-claim-free]:enabled').click();await waitTx(page);assert(f.state.freeClaimed);pass(`${engine}: NFT and free proofs submitted to StarterClaim after reveals`);
 const starter=f.state.receipts.get('starter:1927')!;starter.captured=true;starter.target=f.state.native-300n;await page.locator('[data-refresh-receipts]').click();f.state.hold=true;await page.locator('[data-reveal="starter:1927"]').click();await page.locator('#tx-status[data-state="pending"]').waitFor();assert(!(await page.locator('[data-receipt="starter:1927"] .receipt-state').innerText()).includes('Re-arming'));f.state.hold=false;await page.locator('[data-receipt="starter:1927"]').waitFor({state:'hidden',timeout:45000});
 pass(`${engine}: captured starter entropy remains revealable after 256 blocks without re-arming`);
 await page.goto(url+'#/farm');await page.locator('[data-sync]').waitFor();f.state.reject=true;await page.locator('[data-sync]').click();await page.locator('#tx-status').filter({hasText:'rejected'}).waitFor();pass(`${engine}: rejected wallet request remains recoverable`);
 f.state.revertRead='FarmCore.sync';await page.locator('[data-sync]').click();await page.locator('#tx-status').filter({hasText:'cannot'}).waitFor();f.state.revertRead='';pass(`${engine}: custom contract error names decoded before signing`);
 f.state.revertRead='FarmCore.sync';f.state.revertData=encodeErrorResult({abi:abiData.Token as any,errorName:'ERC20InsufficientBalance',args:[wallet,0n,E]});await page.locator('[data-sync]').click();await page.locator('#tx-status').filter({hasText:'BLACKOUT balance is too low'}).waitFor();f.state.revertRead='';f.state.revertData=null;pass(`${engine}: bubbled ERC-6093 token error decoded`);
 f.state.revertNext=true;await page.locator('[data-sync]').click();await page.locator('#tx-status[data-state="reverted"]').filter({hasText:'cannot be updated'}).waitFor();f.state.revertRead='';pass(`${engine}: mined revert retains hash and decodes InvalidValue`);
 f.state.hold=true;await page.locator('[data-sync]').click();await page.locator('#tx-status[data-state="pending"]').waitFor();assert(await page.locator('#tx-status a').getAttribute('href').then((h:string)=>h.startsWith('https://robinhoodchain.blockscout.com/tx/')));f.state.hold=false;await waitTx(page);pass(`${engine}: pending transaction and explorer link become confirmed`);
 await page.goto(url+'#/city');await page.waitForTimeout(700);await page.getByText('District stakes are coming soon.').waitFor({timeout:5000});await page.goto(url+'#/season');await page.getByText('Season rewards are coming soon.').waitFor();await page.goto(url+'#/billboards');await page.getByText('Week 0 · Billboards are coming soon.').waitFor();pass(`${engine}: disabled Civic phases stay Coming soon`);
 await page.goto(url+'#/contracts');await page.getByText('Registry wiring and claim roots verified.').waitFor();assert.equal(await page.locator('.contract-address').count(),18);pass(`${engine}: all 18 contract links and launch numbers`);
 f.state.launch=BigInt(Math.floor(Date.now()/1000));await page.goto(url+'#/packs');await page.reload();await page.locator('[data-claim-nft="1927"]').waitFor();await page.getByText('Opens in',{exact:false}).first().waitFor();assert(await page.locator('[data-claim-nft="1927"]').isDisabled());
 f.state.launch=BigInt(Math.floor(Date.now()/1000))-17n*86400n;await page.reload();await page.locator('.pack-claims').filter({hasText:'Closed'}).waitFor();assert(await page.locator('[data-claim-nft="1927"]').isDisabled());
 f.state.launch=BigInt(Math.floor(Date.now()/1000))-3n*86400n;pass(`${engine}: starter countdown before 48h and Closed after 16 days`);
 f.state.mismatch=true;await page.reload();await page.locator('#registry-warning').filter({hasText:'do not match'}).waitFor();await page.goto(url+'#/packs');assert(await page.locator('#pack-form button[type="submit"]').isDisabled());pass(`${engine}: registry mismatch warns and disables writes`);
 f.state.mismatch=false;await page.goto(url+'#/farm');await page.reload();await page.locator('#registry-warning').waitFor({state:'hidden'});await page.locator('[data-sync]:enabled').waitFor();pass(`${engine}: verification recovery restores actions`);
 await page.locator('#connect').click();await page.locator('[data-disconnect]').click();f.state.wallet=contracts.GameRegistry;await page.locator('#connect').click();await page.getByRole('button',{name:'Fixture Wallet',exact:true}).click();await page.goto(url+'#/packs');await page.getByText('Your wallet is not on the free pack list').waitFor();assert.equal(await page.locator('[data-claim-free]').count(),0);pass(`${engine}: unlisted wallet has no free-claim button`);
 f.state.rpcOffline=true;await page.reload();await page.locator('#connection-status').filter({hasText:'Reconnecting'}).waitFor({timeout:65000});assert(!(await page.locator('body').innerText()).includes('HTTP request failed'));f.state.rpcOffline=false;await page.locator('[data-refresh]').first().click();await page.waitForFunction(()=>document.querySelector('#connection-status')?.textContent==='City connected');pass(`${engine}: RPC outage is visible and retry recovers`);
 await page.goto(url+'#/leaderboard');await page.locator('.farm-leaderboard li').first().waitFor();assert.equal(await page.locator('.farm-leaderboard li').count(),2);assert((await page.locator('.leader-summary').innerText()).includes('Dockside'));assert.equal(await page.locator('#city-activity').count(),0);pass(`${engine}: leaderboard sorts chain hash and reads the best district; global activity bar removed`);
 f.state.primaryDown=true;await page.locator('[data-refresh]').first().click();await page.waitForTimeout(1500);assert(f.state.rpcUrls.some(u=>u.includes('drpc.org')));assert.equal(await page.locator('.farm-leaderboard li').count(),2);pass(`${engine}: primary RPC down falls back to dRPC`);
 f.state.secondaryDown=true;await page.locator('[data-refresh]').first().click();await page.waitForTimeout(1500);assert(f.state.rpcUrls.some(u=>u.includes('publicnode.com')));pass(`${engine}: primary and secondary down reach PublicNode`);
 f.state.rpcOffline=true;await page.locator('[data-refresh]').first().click();await page.locator('#connection-status').filter({hasText:'Reconnecting'}).waitFor({timeout:65000});assert.equal(await page.locator('.farm-leaderboard li').count(),2);assert(!(await page.locator('body').innerText()).includes('HTTP request failed'));pass(`${engine}: all RPCs down retain last-good standings and show a small reconnecting badge`);
 f.state.rpcOffline=false;f.state.primaryDown=false;f.state.secondaryDown=false;await page.locator('[data-refresh]').first().click();await page.locator('#connection-status').filter({hasText:'City connected'}).waitFor({timeout:65000});
 await page.goto(url+'#/docs');await page.waitForTimeout(1200);const calls=f.state.rpcUrls.length;await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:true}));await page.waitForTimeout(16000);assert.equal(f.state.rpcUrls.length,calls);await page.evaluate(()=>delete (document as any).hidden);
 const at=f.state.readFns.length;await page.waitForTimeout(16000);assert(!f.state.readFns.slice(at).includes('FarmItems.itemsByOwner'));assert(!f.state.readFns.slice(at).includes('FarmCore.playerAt'));pass(`${engine}: hidden tabs stop polling; Docs does not poll Farm inventory or Leaderboard`);
 const nativeErrors=errors.filter(message=>/^\/(rpc\.mainnet\.chain\.robinhood\.com|robinhood\.drpc\.org|robinhood-rpc\.publicnode\.com|127\.0\.0\.1:\d+\/preview)\/ due to access control checks\.$/.test(message));if(nativeErrors.length)report.limitations.push(`${engine}: ${nativeErrors.length} browser-native request cancellation/access-control diagnostics during fixture reload/outage tests. RPCs are intercepted; all recovery assertions above must still pass. ${[...new Set(nativeErrors)].join(' ')}`);assert.deepEqual(errors.filter(e=>!nativeErrors.includes(e)),[]);pass(`${engine}: no application script errors; native request diagnostics are recorded`);
 await context.close();
}
async function revisionSuite(browser:any,engine:string){
 for(const limit of [10000n,100n]){
  const f=fixture();f.state.primaryDown=true;f.state.chain='0x1237';f.state.added=true;f.state.logLimit=limit;
  f.state.block=GAME_DEPLOYMENT_BLOCK+(limit===10000n?32000n:2000n);
  if(limit===10000n)f.state.logFailAt=GAME_DEPLOYMENT_BLOCK+20000n;
  f.state.receipts.set('paid:7',{target:1000n,count:1n,opened:0n,captured:true,player:wallet,block:GAME_DEPLOYMENT_BLOCK+10n});
  f.state.receipts.set('starter:1927',{target:1000n,count:1n,opened:0n,captured:true,player:wallet,block:GAME_DEPLOYMENT_BLOCK+1800n});
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await injected(context,f);const page=await context.newPage();
  const errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));
  await page.goto(url+'#/packs');await page.locator('#connect').click();await page.getByRole('button',{name:'Fixture Wallet',exact:true}).click();
  if(limit===10000n){
   await page.locator('#receipt-list .reconnect-note').waitFor({timeout:45000});
   const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'null'),`blackout.receipts.4663.${wallet}`);
   assert.equal(saved.cursor,String(GAME_DEPLOYMENT_BLOCK+19999n));
   assert.equal(saved.ids.length,2);
   const before=f.state.logRequests.length;f.state.logFailAt=null;
   await page.locator('[data-refresh]').first().click();
   await page.locator('[data-receipt="paid:7"]').waitFor({timeout:45000});
   const resumed=f.state.logRequests.slice(before);assert(resumed.length>0);
   assert(resumed.every(r=>r.from>=GAME_DEPLOYMENT_BLOCK+19999n-16n));
   assert(resumed.some(r=>r.activity)&&resumed.some(r=>!r.activity));
   pass(`${engine}: primary-down receipt and activity scans checkpoint successful ranges and resume after a mid-scan outage`);
  }
  await page.locator('[data-receipt="paid:7"]').waitFor({timeout:60000});await page.locator('[data-receipt="starter:1927"]').waitFor();
  await page.locator('#connection-status').filter({hasText:'City connected'}).waitFor({timeout:60000});
  assert((await page.locator('#city-activity').innerText()).includes('100 BLACKOUT paid'));
  assert(f.state.logRequests.every(r=>r.from>=GAME_DEPLOYMENT_BLOCK));
  assert(f.state.logRequests.filter(r=>!r.rejected).every(r=>r.to-r.from+1n<=limit));
  if(limit===100n){assert(f.state.logRequests.some(r=>r.rejected&&r.activity));assert(f.state.logRequests.some(r=>r.rejected&&!r.activity));}
  pass(`${engine}: primary down, ${limit}-block fallback limit: historical paid/starter packs, ETH quote and activity recover`);
  const beforeOutage=f.state.logRequests.length;f.state.rpcOffline=true;
  await page.locator('[data-refresh]').first().click();await page.locator('#connection-status').filter({hasText:'Reconnecting'}).waitFor({timeout:45000});
  assert.equal(await page.locator('[data-receipt]').count(),2);assert((await page.locator('#city-activity').innerText()).includes('100 BLACKOUT paid'));
  assert(!(await page.locator('body').innerText()).includes('HTTP request failed'));
  assert.equal(f.state.logRequests.length,beforeOutage,'All-down failure must not recursively split ranges');
  f.state.rpcOffline=false;await page.locator('[data-refresh]').first().click();await page.locator('#connection-status').filter({hasText:'City connected'}).waitFor({timeout:45000});
  pass(`${engine}: all-down keeps packs and activity; retry restores connection without a range-splitting storm`);
  if(limit===10000n){
   await page.goto(url+'#/farm');await page.locator('#item-2').waitFor();
   for(const [value,expected]of [['spare',['item-1']],['installed',['item-2']]] as const){
    await page.locator('#inventory-filter').selectOption(value);await page.locator('#inventory-filter').focus();
    await page.locator('[data-refresh]').first().click();await page.waitForTimeout(1000);
    assert.equal(await page.locator('#inventory-filter').inputValue(),value);
    assert.deepEqual(await page.locator('[data-item-equipped]:visible').evaluateAll((es:HTMLElement[])=>es.map(e=>e.id)),expected);
   }
   await page.locator('#inventory-filter').selectOption('spare');await page.locator('#inventory-filter').focus();
   await page.waitForTimeout(16500);
   assert.equal(await page.locator('#inventory-filter').inputValue(),'spare');assert.equal(await page.evaluate(()=>document.activeElement?.id),'inventory-filter');
   assert.deepEqual(await page.locator('[data-item-equipped]:visible').evaluateAll((es:HTMLElement[])=>es.map(e=>e.id)),['item-1']);
   pass(`${engine}: both hardware filters survive Refresh; In inventory and keyboard focus survive a 15-second poll`);
   await page.locator('#connect').click();await page.locator('[data-disconnect]').click();
   for(const [route,text]of [['packs','Connect to check your eligible Identity MD NFTs.'],['city','The city will choose the next event automatically.'],['season','Season rewards are coming soon.'],['billboards','Billboards are coming soon.']]){
    await page.goto(url+'#/'+route);await page.getByText(text,{exact:false}).waitFor();
    const copy=await page.locator('#main').innerText();assert(!/Civic|free allowlist|26182375|token IDs|autonomous fallback/.test(copy));
    if(route==='packs'){
     const box=await page.locator('.pack-claims').boundingBox();assert(box);console.log('Starter claims panel height',box.height);
     await page.screenshot({path:join(repo,`test/scratch/interaction-shots/${engine}-revision-packs-390.png`),fullPage:true});
    }
    for(const width of [320,390,1440]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${route} overflow ${width}`);}
    await page.setViewportSize({width:390,height:844});
   }
   await page.goto(url+'#/docs/starter');assert((await page.locator('#doc-starter').innerText()).includes('26182375'));assert((await page.locator('#doc-starter').innerText()).includes('proof'));
   pass(`${engine}: plain starter/City/Season/Billboards guidance, technical eligibility retained in Docs, no overflow at 320/390/1440`);
  }
  assert.equal(f.state.sent.length,0);assert.deepEqual(errors,[]);await context.close();
 }
}
async function juicySuite(browser:any,engine:string){
 const f=fixture();f.state.chain='0x1237';f.state.added=true;f.state.revealRarities=[0,2,4];
 f.state.receipts.set('paid:1',{target:1000n,count:1n,opened:0n,captured:true,player:wallet,block:GAME_DEPLOYMENT_BLOCK+1990n});
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});await injected(context,f);const page=await context.newPage();
 await page.goto(url+'#/packs');await page.locator('#connect').click();await page.getByRole('button',{name:'Fixture Wallet',exact:true}).click();await page.locator('[data-reveal="paid:1"]:enabled').waitFor();
 assert((await page.locator('.pack-sound').innerText()).includes('off'));await page.locator('[data-reveal="paid:1"]').click();await page.getByRole('heading',{name:'Hardware revealed.'}).waitFor({timeout:45000});
 assert.equal(await page.locator('.reveal-card').count(),3);assert.equal(await page.locator('.reveal-card.common').count(),1);assert.equal(await page.locator('.reveal-card.epic').count(),1);assert.equal(await page.locator('.reveal-card.mythic').count(),1);
 await page.waitForFunction(()=>{const card=document.querySelector('.reveal-card');return !!card&&getComputedStyle(card).animationName==='card-launch';},undefined,{timeout:5000});
 assert.equal(await page.locator('.reveal-particles i').count(),36);await page.waitForTimeout(1100);await page.screenshot({path:join(repo,`test/scratch/interaction-shots/${engine}-pack-moment-390.png`)});
 if(engine==='chromium'){await page.waitForFunction(()=>{const c=document.querySelector('.reveal-card.mythic');return c&&getComputedStyle(c).opacity==='1'&&getComputedStyle(c).transform==='none';});await page.setViewportSize({width:390,height:1200});mkdirSync(join(repo,'artifacts/screenshots'),{recursive:true});execFileSync('convert',['png:-','-quality','76',join(repo,'artifacts/screenshots/pack-reveal-fixture-390.webp')],{input:await (async()=>{await page.evaluate(()=>window.scrollTo(0,document.querySelector('.reveal-result')!.getBoundingClientRect().top+scrollY-100));return await page.screenshot();})()});await page.setViewportSize({width:390,height:844});}
 await page.locator('.pack-sound').click();assert((await page.locator('.pack-sound').innerText()).includes('on'));await page.locator('.pack-sound').click();assert((await page.locator('.pack-sound').innerText()).includes('off'));
 await page.emulateMedia({reducedMotion:'reduce'});assert(await page.locator('.reveal-card').evaluateAll((es:HTMLElement[])=>es.every(e=>getComputedStyle(e).animationName==='none')));
 await page.goto(url+'#/farm');await page.locator('[data-mining-clock]').waitFor();await page.bringToFront();const before=await page.locator('[data-mining-clock]').innerText();await page.waitForFunction(value=>document.querySelector('[data-mining-clock]')?.textContent!==value,before,{timeout:7000,polling:100});
 if(engine==='chromium'){for(const width of [375,1440]){await page.setViewportSize({width,height:width===375?812:1000});await page.locator('.live-rooms').scrollIntoViewIfNeeded();await page.evaluate(()=>window.scrollTo(0,document.querySelector('.live-rooms')!.getBoundingClientRect().top+scrollY-104));await page.waitForTimeout(100);execFileSync('convert',['png:-','-quality','76',join(repo,`artifacts/screenshots/farm-connected-fixture-${width}.webp`)],{input:await page.screenshot()});}}
 await page.setViewportSize({width:1440,height:1000});await page.locator('[data-select-item="1"]:enabled').waitFor();const handle=page.locator('[data-drag-item="1"]');await page.evaluate(()=>document.querySelector('[data-drag-item="1"]')?.scrollIntoView({block:'center'}));const box=await handle.boundingBox();assert(box);await page.mouse.move(box.x+20,box.y+20);await page.mouse.down();await page.mouse.move(box.x+40,box.y+25,{steps:6});await page.evaluate(()=>{(window as any).__dragNode=document.querySelector('[data-drag-item="1"]');document.querySelector('[data-refresh]')?.dispatchEvent(new MouseEvent('click',{bubbles:true}));});await page.waitForTimeout(1000);assert(await page.evaluate(()=>(window as any).__dragNode?.isConnected));const target=page.locator('[data-drop-slot="0,1"]');await page.evaluate(()=>document.querySelector('[data-drop-slot="0,1"]')?.scrollIntoView({block:'center'}));const rack=await target.boundingBox();assert(rack);await page.mouse.move(rack.x+rack.width/2,rack.y+rack.height/2,{steps:12});await page.mouse.move(rack.x+rack.width/2+1,rack.y+rack.height/2);await page.mouse.up();await page.locator('#action-dialog').waitFor();await page.locator('#cancel-action').click();
 await page.setViewportSize({width:390,height:844});await page.goto(url+'#/rewards');await page.locator('.reward-card').waitFor();await page.locator('[data-claim]').evaluate((el:HTMLElement)=>el.scrollIntoView({block:'center',behavior:'instant'}));const claimBox=await page.locator('[data-claim]').boundingBox(),headerBox=await page.locator('.site-header').boundingBox();assert(claimBox&&headerBox&&claimBox.y>=headerBox.y+headerBox.height&&claimBox.y+claimBox.height<=844,'Claim action must be reachable below public data without header overlap');await page.screenshot({path:join(repo,`test/scratch/interaction-shots/${engine}-rewards-390.png`)});
 const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();report.accessibility.push({engine,route:'rewards fixture',violations:scan.violations});assert.equal(scan.violations.length,0);
 pass(`${engine}: shake/flip/particles, Common/Epic/Mythic colors, mute, reduced-motion switch, second-ticking mining, drag placement across a refresh, visible mobile Claim and Rewards axe`);
 f.state.failClaimRead=true;await page.locator('[data-refresh]').first().click();await page.locator('#connection-status').filter({hasText:'Reconnecting'}).waitFor({timeout:65000});assert((await page.locator('.reward-breakdown').innerText()).includes('90 BLACKOUT'));f.state.failClaimRead=false;await page.locator('[data-refresh]').first().click();await page.locator('#connection-status').filter({hasText:'City connected'}).waitFor({timeout:65000});
 await page.goto(url+'#/packs');await page.locator('[data-claim-nft="1927"]:enabled').waitFor();f.state.rpcOffline=true;await page.locator('[data-refresh]').first().click();await page.locator('#connection-status').filter({hasText:'Reconnecting'}).waitFor({timeout:65000});assert.equal(await page.locator('[data-claim-nft="1927"]').count(),1);assert.equal(await page.locator('[data-claim-free]').count(),1);assert((await page.locator('.pack-claims').innerText()).includes('keeping your last eligibility'));assert(!(await page.locator('body').innerText()).includes('HTTP request failed'));pass(`${engine}: claim-preview failure retains last net; RPC outage retains starter eligibility and free claim display`);
 f.state.rpcOffline=false;await page.goto(url+'#/leaderboard');await page.locator('.farm-leaderboard li').first().waitFor();const leaders=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();report.accessibility.push({engine,route:'leaderboard fixture',violations:leaders.violations});assert.equal(leaders.violations.length,0);await page.goto(url+'#/more');await page.locator('.activity-history').waitFor();const more=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();report.accessibility.push({engine,route:'more fixture',violations:more.violations});assert.equal(more.violations.length,0);pass(`${engine}: Leaderboard and More pass axe; activity history is available`);
 await page.goto(url+'#/farm');await page.locator('[data-sync]:enabled').waitFor();await page.locator('[data-refresh]').first().click();await page.locator('#connection-status').filter({hasText:'City connected'}).waitFor();if(await page.locator('[data-dismiss-tx]').isVisible())await page.locator('[data-dismiss-tx]').click();await page.locator('[data-pick-hardware]').evaluate((el:HTMLElement)=>el.scrollIntoView({block:'center',behavior:'instant'}));const pickBox=await page.locator('[data-pick-hardware]').boundingBox(),farmHeader=await page.locator('.site-header').boundingBox();assert(pickBox&&farmHeader&&pickBox.y>=farmHeader.y+farmHeader.height&&pickBox.y+pickBox.height<=844,'Select hardware must be reachable without header overlap');await page.screenshot({path:join(repo,`test/scratch/interaction-shots/${engine}-farm-action-390.png`)});f.state.hold=true;await page.locator('[data-sync]').click();await page.locator('#tx-status[data-state="pending"]').waitFor();await page.waitForTimeout(1200);await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:true}));const pendingCalls=f.state.rpcUrls.length;await page.waitForTimeout(16000);assert.equal(f.state.rpcUrls.length,pendingCalls);f.state.hold=false;await page.evaluate(()=>{delete (document as any).hidden;document.dispatchEvent(new Event('visibilitychange'));});await page.locator('#tx-status[data-state="confirmed"]').waitFor({timeout:45000});pass(`${engine}: mobile Select hardware is visible; stale Packs errors do not mark recovered Farm as reconnecting; hidden pending transactions make no RPC calls and confirmation resumes when visible`);



 await context.close();
}
async function liveVisualSuite(browser:any,engine:string) {
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));
 for(const width of [320,390,768,1440]) {
  await page.setViewportSize({width,height:width>1000?1000:844});await page.goto(url);await page.waitForFunction(()=>['City connected','Reconnecting'].includes(document.querySelector('#connection-status')?.textContent||''),undefined,{timeout:65000});if(await page.locator('#connection-status').innerText()==='Reconnecting'){const rpcFailure=await page.locator('#connection-status').innerText();console.warn('LIVE RPC RETRY',engine,rpcFailure);await page.locator('[data-refresh]').first().click();try {
    await page.waitForFunction(()=>document.querySelector('#connection-status')?.textContent==='City connected',undefined,{timeout:65000});report.limitations.push(`${engine}: transient live RPC failure; Retry recovered: ${rpcFailure}`);
   }catch{report.limitations.push(`${engine}: live RPC did not recover on Retry at ${width}px. Visual checks cover the rendered unavailable state; contract behavior is validated separately with RPC reads and browser fixtures.`);}}
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(width===390&&await page.locator('#connection-status').innerText()==='City connected'){const b=await page.locator('.hero-actions .primary').boundingBox();assert(b&&b.y+b.height<844);pass(`${engine}: product and main action visible at 390`);}
  for(const path of ['farm','packs','city','season','billboards','contracts','docs/risks']) {
   await page.goto(url+'#/'+path);await page.waitForTimeout(500);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${path} overflows ${width}`);
  }
  await page.goto(url);await page.waitForTimeout(200);const path=`test/scratch/interaction-shots/${engine}-home-${width}.png`;await page.screenshot({path:join(repo,path)});report.screenshots.push(path);
 }
 pass(`${engine}: live routes have no horizontal overflow at 320, 390, 768, 1440`);
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 for(const path of ['','farm','packs','city','season','contracts','docs']){await page.goto(url+'#/'+path);await page.waitForTimeout(200);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${engine}: enlarged text overflow on ${path}`);}
 await page.evaluate(()=>document.documentElement.style.fontSize='');pass(`${engine}: 200% root text reflows at 390 on all primary routes`);
 await page.setViewportSize({width:390,height:844});await page.goto(url+'#/packs');await page.locator('#connect').click();await page.locator('#wallet-dialog').waitFor();await page.keyboard.press('Escape');assert.equal(await page.locator('#wallet-dialog').isVisible(),false);assert.equal(await page.evaluate(()=>document.activeElement?.id),'connect');pass(`${engine}: modal Escape and focus restoration`);
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();report.accessibility.push({engine,route:'packs',violations:axe.violations.map((v:any)=>({id:v.id,impact:v.impact,nodes:v.nodes.map((n:any)=>n.target)}))});
 assert.equal(axe.violations.length,0,`${engine}: accessibility violations on Packs`);pass(`${engine}: axe WCAG A/AA checks on Packs`);
 await page.goto(url);const before=await page.locator('#hardware-track').evaluate((e:HTMLElement)=>e.scrollLeft);await page.locator('[data-hardware-scroll="1"]').click();await page.waitForTimeout(300);assert(await page.locator('#hardware-track').evaluate((e:HTMLElement)=>e.scrollLeft)>before);pass(`${engine}: preserved hardware carousel advances`);
 const rpcErrors=errors.filter(message=>/^\/(rpc\.mainnet\.chain\.robinhood\.com|robinhood\.drpc\.org|robinhood-rpc\.publicnode\.com)\/ due to access control checks\.$/.test(message));
 if(rpcErrors.length)report.limitations.push(`${engine}: ${rpcErrors.length} public-RPC access-control errors reported by the browser: ${rpcErrors[0]} These external provider failures were captured separately; connection state and recovery are tested above. A connected state requires successful registry and home reads.`);
 assert.deepEqual(errors.filter(message=>!rpcErrors.includes(message)),[]);pass(`${engine}: live export has no application script errors; any RPC access-control failures are recorded separately`);
 await context.close();
 const phone=await browser.newContext({viewport:{width:390,height:844},userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});const p=await phone.newPage();await p.goto(url);await p.locator('#connect').click();for(const name of ['MetaMask','Coinbase Wallet','Rabby','Phantom'])assert.equal(await p.getByRole('link',{name:`Open in ${name}`,exact:false}).count(),1);await p.getByRole('button',{name:'Coinbase Smart Wallet',exact:true}).waitFor();pass(`${engine}: phone wallet deep links and Coinbase Smart Wallet row`);await phone.close();
}
let browsers:any[]=[];
try {
 for(const [engine,driver,executable] of [['chromium',chromium,process.env.BLACKOUT_CHROME_PATH],['webkit',webkit,process.env.BLACKOUT_WEBKIT_PATH]] as const){
  if(process.env.BLACKOUT_TEST_ENGINE&&process.env.BLACKOUT_TEST_ENGINE!==engine)continue;
  let browser;
  try{browser=await driver.launch({headless:true,...(engine==='chromium'&&process.env.BLACKOUT_BROWSER_CONSTRAINED?{args:['--renderer-process-limit=2','--no-zygote','--disable-gpu']}:{}),...(executable?{executablePath:executable}:{})});}
  catch(e:any){if(engine==='chromium')throw e;report.limitations.push(`WebKit launch unavailable: ${e.message}`);continue;}
  browsers.push(browser);
  if(process.env.REVISION_ONLY)await revisionSuite(browser,engine);
  else if(!process.env.FIXTURE_ONLY)await liveVisualSuite(browser,engine);
  if(!process.env.VISUAL_ONLY&&!process.env.REVISION_ONLY){if(!process.env.JUICY_ONLY)await fixtureSuite(browser,engine);if(!process.env.FLOW_ONLY)await juicySuite(browser,engine);}
  await browser.close();
 }
} catch(e:any){report.errors.push(e.stack||e.message);console.error(e);process.exitCode=1;}
finally {for(const browser of browsers)await browser.close();server.close();writeFileSync(join(repo,'artifacts/v10',process.env.REVISION_ONLY?'revision-validation.json':process.env.JUICY_ONLY?'juicy-validation.json':process.env.FLOW_ONLY?'flow-validation.json':process.env.FIXTURE_ONLY?'fixture-validation.json':process.env.VISUAL_ONLY?'visual-validation.json':'interaction-validation.json'),JSON.stringify({checkedAt:new Date().toISOString(),fixtureWritesOnly:true,browserVersions:browsers.map(b=>b.version()),...report},null,2)+'\n');}
