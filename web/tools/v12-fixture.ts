// Deterministic browser provider fixtures. No keys or real transactions.
import assert from 'node:assert/strict';
import {decodeAbiParameters,multicall3Abi,deploylessCallViaBytecodeBytecode,decodeFunctionData,encodeFunctionResult,encodeErrorResult,encodeEventTopics,encodeAbiParameters,keccak256,stringToHex,type Hex} from 'viem';
import {contracts,roles,ROOTS,GAME_DEPLOYMENT_BLOCK} from '../src/config';
import abiData from '../src/abi.json';
const wallet='0x83027ad9d0d5374335086c539dadd1db983441b0';
const E=10n**18n;
export function fixture() {
 const now=BigInt(Math.floor(Date.now()/1000));
 const state={wallet,authorized:false,chain:'0x1237',added:true,hold:false,signatureHold:false,resolveRace:0n,reject:false,revertNext:false,revertRead:'',revertData:null as Hex|null,mismatch:false,failClaimRead:false,rpcOffline:false,primaryDown:false,secondaryDown:false,rpcUrls:[] as string[],revealRarities:[1,1,1],level:7n,launch:now-3n*86400n,enabled:false,epoch:4n,nonce:0,block:GAME_DEPLOYMENT_BLOCK+2000n,activityBlock:GAME_DEPLOYMENT_BLOCK+1990n,logLimit:10000n,logFailAt:null as bigint|null,logRequests:[] as {url:string;from:bigint;to:bigint;activity:boolean;rejected:boolean}[],native:1100n,freeClaimed:false,nftClaimed:false,allowance:0n,pending:100n*E,expansions:0n,items:[{id:1n,holder:wallet,durability:5000,kind:0,rarity:1,overclock:0,starter:false,equipped:false},{id:2n,holder:wallet,durability:10000,kind:3,rarity:1,overclock:0,starter:false,equipped:true}],slots:[2n,...Array(23).fill(0n)],rooms:new Set([0]),receipts:new Map<string,{target:bigint;count:bigint;opened:bigint;captured:boolean;player:string;block:bigint}>(),txs:new Map<string,any>(),sent:[] as any[],rpc:[] as string[],readFns:[] as string[],walletCalls:[] as any[]};
 const encode=(name:string,fn:string,result:unknown)=>encodeFunctionResult({abi:abiData[name as keyof typeof abiData] as any,functionName:fn,result} as any);
 function value(name:string,fn:string,a:any[]):any {
  const k=`${name}.${fn}`;state.readFns.push(k);if(state.failClaimRead&&k==='FarmRewards.claim')throw {code:-32005,message:'Rate limit exceeded'};
  if(state.revertRead===k)throw {code:3,message:'execution reverted',data:state.revertData||encodeErrorResult({abi:abiData.FarmCore as any,errorName:'InvalidValue'})};
  switch(k) {
   case 'FarmRewards.EPOCH':return 21600n;case 'FarmRewards.PRECISION':return 10n**27n;
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
   case 'RewardPool.dripStart':return state.launch;case 'RewardPool.dripPeriod':return 42n*86400n;case 'FarmRewards.activeFarmCount':return 2n;case 'FarmCore.count':return 2n;case 'FarmCore.playerAt':return Number(a[0])===0?wallet:contracts.GameRegistry;case 'FarmCore.maxLevelByAge':return 9n;case 'Enhancement.pending':return 0n;case 'FarmRewards.farmWeight':return a[0].toLowerCase()===wallet?10000n:20000n;case 'FarmRewards.entrySeconds':return 18000n;case 'FarmRewards.configuredWeight':return 10000n;case 'FarmRewards.districtActiveHash':return a[0]===3n?30000n:0n;case 'FarmRewards.shares':return [10000n,10000n,1500n,false];case 'FarmRewards.epochData':{const entry=abiData.FarmRewards.find((x:any)=>x.name==='epochData') as any;return Object.fromEntries(entry.outputs[0].components.map((v:any)=>[v.name,v.type==='bytes32'?'0x'+'00'.repeat(32):v.name==='rewardPerHash'?10n**42n:v.name==='tariff'?1500n:v.name==='emission'?350n:v.name==='raw'?30000n:v.name==='miningSeconds'?21600n:v.name==='mining'?8750n*E:0n]));}
   case 'FarmCore.hasFarm':return true;case 'FarmCore.level':return state.level;case 'FarmCore.xp':return 1700n;case 'FarmCore.district':return 3n;
   case 'Token.balanceOf':return 500000n*E;case 'Token.allowance':return state.allowance;
   case 'FarmRewards.pending':return state.pending;case 'FarmItems.capacity':return 15n+5n*state.expansions;case 'FarmItems.expansions':return state.expansions;case 'FarmItems.inventory':return BigInt(state.items.filter(i=>!i.equipped).length);case 'FarmItems.ownedCount':return BigInt(state.items.length);
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
  else if(fn==='expand')state.expansions++;
  else if(fn==='buyRoom')state.rooms.add(Number(a[0]));
  else if(name==='FarmRewards'&&fn==='claim')state.pending-=a[0];
  else if(name==='PackSale'&&['openPack','buyWithETH'].includes(fn)){const player=fn==='openPack'?wallet:a[0];state.receipts.set('paid:1',{target:1000n,count:fn==='openPack'?a[0]:a[1],opened:0n,captured:false,player,block:state.block});}
  else if(name==='StarterClaim'&&fn==='claim'){state.nftClaimed=true;state.receipts.set(`starter:${a[0]}`,{target:1000n,count:1n,opened:0n,captured:false,player:wallet,block:state.block});}
  else if(fn==='claimFree'){state.freeClaimed=true;state.receipts.set(`starter:${(1n<<255n)|a[0]}`,{target:1000n,count:1n,opened:0n,captured:false,player:wallet,block:state.block});}
  else if(fn==='captureEntropy'){const r=state.receipts.get(`${name==='PackSale'?'paid':'starter'}:${a[0]}`)!;if(state.native>r.target+256n)r.target=state.native+2n;else r.captured=true;}
  else if(fn==='resolve'){const r=state.receipts.get(`${name==='PackSale'?'paid':'starter'}:${a[0]}`)!;if(!r.captured&&state.native>r.target+256n){r.target=state.native+2n;return;}r.captured=true;const n=name==='PackSale'?Number(a[1]):1;r.opened+=BigInt(n);for(let i=0;i<3*n;i++){const id=state.items.reduce((m,x)=>x.id>m?x.id:m,0n)+1n;state.items.push({id,holder:wallet,durability:10000,kind:i,rarity:state.revealRarities[i%3],overclock:0,starter:name==='StarterClaim',equipped:false});}}
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
    const q=req.params[0];if(typeof q.address==='string'&&q.address.toLowerCase()===contracts.FarmRewards)return {jsonrpc:'2.0',id:req.id,result:[]};if(Array.isArray(q.address)){const mk=(name:string,eventName:string,args:any,data:any,types:any,idx:number)=>({address:contracts[name as keyof typeof contracts],topics:encodeEventTopics({abi:abiData[name as keyof typeof abiData] as any,eventName,args} as any),data:encodeAbiParameters(types,data),blockNumber:'0x'+state.activityBlock.toString(16),transactionIndex:'0x0',logIndex:'0x'+idx.toString(16),transactionHash:keccak256(stringToHex(eventName)),blockHash:keccak256(stringToHex('fixture block')),removed:false});return {jsonrpc:'2.0',id:req.id,result:BigInt(q.fromBlock)<=state.activityBlock&&BigInt(q.toBlock)>=state.activityBlock?[mk('FarmCore','Registered',{player:wallet},[3n],[{type:'uint256'}],0),mk('FarmRewards','EpochSettled',{epoch:3n},[100n*E,5n*E],[{type:'uint256'},{type:'uint256'}],1)]:[]};}const name=q.address.toLowerCase()===contracts.PackSale?'PackSale':'StarterClaim';
    result=[];
    for(const [key,r]of state.receipts){const [kind,id]=key.split(':');if((kind==='paid')!==(name==='PackSale')||r.player.toLowerCase()!==wallet)continue;if(BigInt(q.fromBlock)>r.block||BigInt(q.toBlock)<r.block)continue;
     const eventName=name==='PackSale'?'PackCommitted':'StarterCommitted';
     const topics=encodeEventTopics({abi:abiData[name] as any,eventName,args:name==='PackSale'?{id:BigInt(id),player:wallet}:{tokenId:BigInt(id),holder:wallet}} as any);
     result.push({address:contracts[name],topics,data:encodeAbiParameters(name==='PackSale'?[{type:'uint256'},{type:'uint256'},{type:'bool'}]:[{type:'uint256'}],name==='PackSale'?[r.count,r.target,false]:[r.target] as any),blockNumber:`0x${r.block.toString(16)}`,transactionIndex:'0x0',logIndex:'0x0',transactionHash:keccak256(stringToHex(key)),blockHash:keccak256(stringToHex('fixture block')),removed:false});
    }
   } else if(req.method==='eth_getTransactionReceipt') {
    const t=state.txs.get(req.params[0]);result=!t||state.hold?null:{transactionHash:req.params[0],transactionIndex:'0x0',blockHash:keccak256(stringToHex('fixture block')),blockNumber:`0x${t.block.toString(16)}`,from:wallet,to:t.to,gasUsed:'0x5208',cumulativeGasUsed:'0x5208',effectiveGasPrice:'0x1',contractAddress:null,logs:(()=>{if(!t)return [];const call=identify(t.to,t.data);if(call.name!=='PackSale'||!['buyWithETH','openPack'].includes(call.fn))return [];const r=state.receipts.get('paid:1')!;return [{address:contracts.PackSale,topics:encodeEventTopics({abi:abiData.PackSale as any,eventName:'PackCommitted',args:{id:1n,player:wallet}} as any),data:encodeAbiParameters([{type:'uint256'},{type:'uint256'},{type:'bool'}],[r.count,r.target,false]),blockNumber:'0x'+t.block.toString(16),transactionHash:req.params[0],transactionIndex:'0x0',logIndex:'0x0',blockHash:keccak256(stringToHex('fixture block')),removed:false}];})(),logsBloom:'0x'+'00'.repeat(256),status:t.revert?'0x0':'0x1',type:'0x2'};
   } else if(req.method==='eth_getTransactionByHash') {const t=state.txs.get(req.params[0]);result={...t,block:undefined,hash:req.params[0],from:wallet,input:t.data,value:t.value||'0x0',blockNumber:`0x${t.block.toString(16)}`,type:'0x2',nonce:'0x1',gas:'0x5208',maxFeePerGas:'0x1',maxPriorityFeePerGas:'0x1',chainId:'0x1237'};}
   else throw Error(`Unexpected fixture RPC ${req.method}`);
   return {jsonrpc:'2.0',id:req.id,result};
  }catch(e:any){return {jsonrpc:'2.0',id:req.id,error:{code:e.code||-32000,message:e.message||'fixture error',...(e.data?{data:e.data}:{})}};}
 }
 return {state,rpc,identify,apply};
}
export async function injected(context:any,f:ReturnType<typeof fixture>) {
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
