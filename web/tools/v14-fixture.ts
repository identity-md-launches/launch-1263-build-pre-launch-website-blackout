// Explicitly synthetic browser data, never included in the production export.
import {fixture,injected} from './v13-fixture';
import {decodeAbiParameters,deploylessCallViaBytecodeBytecode,multicall3Abi,decodeFunctionData,encodeFunctionResult,encodeEventTopics,encodeAbiParameters,keccak256,stringToHex,type Hex} from 'viem';
import abi from '../src/abi.json';
import {contracts} from '../src/config';
import {TEAM_WALLET} from '../src/identity';
export {injected};
export function uxFixture(){
 const f=fixture(),original=f.rpc;
 const extra={available:18000000n*10n**18n,activity:1,newActivityBlock:0n,reads:[] as {method:string;at:number}[],heralds:true};
 f.state.cable=false;
 const player=f.state.wallet;
 const third='0x887bA7c734D9AaD6df9D3958dc1Db2eDd427A88C'; // Browser-only second player.
 const result=(req:any,value:any)=>({jsonrpc:'2.0',id:req.id,result:value});
 f.rpc=async(req:any):Promise<any>=>{
  extra.reads.push({method:req.method,at:Date.now()});
  if(req.method==='eth_call'){
   const t=req.params[0];
   if(!t.to){const [,data]=decodeAbiParameters([{type:'bytes'},{type:'bytes'}],('0x'+t.data.slice(deploylessCallViaBytecodeBytecode.length)) as Hex);const decoded=decodeFunctionData({abi:multicall3Abi,data});const values=await Promise.all((decoded.args as any)[0].map(async(c:any)=>{const inner=await f.rpc({id:req.id,method:'eth_call',params:[{to:c.target,data:c.callData},req.params[1]]});return inner.error?{success:false,returnData:inner.error.data||'0x'}:{success:true,returnData:inner.result};}));return result(req,encodeFunctionResult({abi:multicall3Abi,functionName:'aggregate3',result:values}));}
   try{
    const {name,fn,args}=f.identify(t.to,t.data),k=`${name}.${fn}`;
    let value:any;
    if(k==='RewardPool.available')value=extra.available;
    else if(k==='FarmCore.count')value=3n;
    else if(k==='FarmCore.playerAt')value=[TEAM_WALLET,player,third][Number(args[0])];
    else if(k==='FarmRewards.farmWeight')value=String(args[0]).toLowerCase()===TEAM_WALLET.toLowerCase()?110000n:String(args[0]).toLowerCase()===player?80080n:50000n;
    else if(k==='GridOperator.eventAt')value=[3,2500,2,'',true];
    if(value!==undefined)return result(req,encodeFunctionResult({abi:abi[name as keyof typeof abi] as any,functionName:fn,result:value}));
   }catch{}
  }
  if(req.method==='eth_getLogs'){
   const q=req.params[0],from=BigInt(q.fromBlock),to=BigInt(q.toBlock);
   const mk=(name:keyof typeof abi,eventName:string,args:any,data:any[],types:any[],block:bigint,index:number)=>({address:contracts[name as keyof typeof contracts],topics:encodeEventTopics({abi:abi[name] as any,eventName,args}),data:encodeAbiParameters(types,data),blockNumber:'0x'+block.toString(16),transactionIndex:'0x0',logIndex:'0x'+index.toString(16),transactionHash:keccak256(stringToHex(eventName+index)),blockHash:keccak256(stringToHex('fixture block')),removed:false});
   if(typeof q.address==='string'&&q.address.toLowerCase()===contracts.GridOperator&&extra.heralds){
    const logs=[4,3,2,1].map((epoch,i)=>mk('GridOperator','Herald',{epoch:BigInt(epoch)},[i===0?3:i,BigInt(i%8),BigInt(2500+i*100),keccak256(stringToHex('seed')),'Historical letter'],[{type:'uint8'},{type:'uint256'},{type:'uint256'},{type:'uint256'},{type:'bytes32'},{type:'string'}].filter((_,i)=>i!==3),f.state.activityBlock-BigInt(i*10),i));
    return result(req,logs.filter(l=>BigInt(l.blockNumber)>=from&&BigInt(l.blockNumber)<=to));
   }
   if(Array.isArray(q.address)&&q.address.includes(contracts.PackSale)){
    const logs=Array.from({length:extra.activity},(_,i)=>mk('PackSale','PackCommitted',{id:BigInt(i+1),player:i===0?TEAM_WALLET:player},[1n,1000n,false],[{type:'uint256'},{type:'uint256'},{type:'bool'}],i===0?f.state.activityBlock:extra.newActivityBlock||f.state.block,i));
    return result(req,logs.filter(l=>BigInt(l.blockNumber)>=from&&BigInt(l.blockNumber)<=to));
   }
  }
  return original(req);
 };
 return {...f,extra};
}
