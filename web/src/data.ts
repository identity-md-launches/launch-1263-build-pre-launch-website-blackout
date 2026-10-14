import type { Address, Hex } from 'viem';
import { read, client, nativeBlock, simulate, errorMessage, contractErrorName } from './chain';
import { miningEstimate } from './player';
export type Item = { id: bigint; holder: Address; durability: number; kind: number; rarity: number; overclock: number; starter: boolean; equipped: boolean; repair: bigint; output: bigint; enhancing: bigint };
export type RoomStats = { raw: bigint; productive: bigint; power: bigint; bonus: bigint; cooling: boolean; cold: boolean; offgrid: boolean; clean: boolean; locked: boolean; airflow: boolean };
export type Room = { index: number; unlocked: boolean; eligible: boolean; price: bigint; slots: bigint[]; stats: RoomStats };
export type Farm = Awaited<ReturnType<typeof loadFarm>>;
export type Home = Awaited<ReturnType<typeof loadHome>>;
export type Receipt = { kind: 'paid'|'starter'; id: bigint; player: Address; target: bigint; remaining: bigint; captured: boolean; resolved: boolean };
export const KINDS = ['GPU','ASIC','FPGA','Power Supply','Battery','Solar Panel','Fan','Liquid Cooling','Router','Motherboard','Server Rack','Surge Protector'];
export const RARITIES = ['Common','Rare','Epic','Legendary','Mythic'];
export const DISTRICTS = ['Neon Row','Copper Yard','Stack Heights','Dockside','Old Circuit','Ghost Quarter','Relay Point','Solar Hill'];
export const EVENTS = ['Calm','Outage','Surge','Fire','Theft','Audit','Green wave','Cheap tariff','Heatwave','Festival'];
export async function loadHome() {
 const [block, epoch, epochEnd, endowed, available, lockedEndowment, spot, tax, taxLeft, launchTime, ready, paused, opensAt, phases, notices, grid, currentNative, epochStart] = await Promise.all([
  client.getBlock(),read<bigint>('FarmRewards','epoch'),read<bigint>('FarmRewards','epochEnd'),read<boolean>('RewardPool','endowed'),read<bigint>('RewardPool','available'),read<bigint>('RewardPool','lockedEndowment'),
  read<bigint>('V4Market','spot'),read<bigint>('V4Market','currentBuyTaxBps'),read<bigint>('V4Market','launchTaxTimeLeft'),read<bigint>('GameRegistry','launchTime'),read<boolean>('PackSale','ready'),read<boolean>('PackSale','paused'),read<bigint>('PackSale','opensAt'),
  Promise.all(Array.from({length:8},(_,i)=>read<boolean>('Civic','enabled',[BigInt(i)]))),
  Promise.all(Array.from({length:8},(_,i)=>read<bigint>('Civic','noticeAt',[BigInt(i)]))),
  Promise.all(Array.from({length:8},(_,i)=>read<bigint>('GridOperator','gridStability',[BigInt(i)]))),nativeBlock(),read<bigint>('FarmRewards','epochStart'),
 ]);
 const event=await read<readonly [number,number,number,string,boolean]>('GridOperator','eventAt',[epoch]);
 return { epochStart,event,block: block.number, timestamp: Number(block.timestamp), fetchedAt: Date.now(), epoch, epochEnd, endowed, available, lockedEndowment, spot, tax, taxLeft, launchTime, ready, paused, opensAt, phases, notices, grid, native: currentNative };
}
export async function loadFarm(wallet: Address) {
 const [hasFarm,level,xp,district,balance,ethBalance,pending,capacity,ownedCount,paidPacks,daily,lastSettled,settledEpoch,yieldPerHash,scrapAllowance,autoRepair, currentEpoch, ageCap] = await Promise.all([
  read<boolean>('FarmCore','hasFarm',[wallet]),read<bigint>('FarmCore','level',[wallet]),read<bigint>('FarmCore','xp',[wallet]),read<bigint>('FarmCore','district',[wallet]),read<bigint>('Token','balanceOf',[wallet]),client.getBalance({address:wallet}),read<bigint>('FarmRewards','pending',[wallet]),read<bigint>('FarmItems','capacity',[wallet]),read<bigint>('FarmItems','ownedCount',[wallet]),read<bigint>('FarmCore','paidPacks',[wallet]),read<bigint>('Economy','farmDaily',[wallet]),read<bigint>('FarmRewards','lastSettled',[wallet]),read<bigint>('FarmRewards','settledEpoch'),read<bigint>('FarmRewards','lastYieldPerHash'),read<bigint>('FarmRewards','scrapAllowance'),read<number>('FarmCore','autoRepairThreshold',[wallet]),read<bigint>('FarmRewards','epoch'),read<bigint>('FarmCore','maxLevelByAge',[wallet]),
 ]);
 const ids:bigint[]=[];
 for(let offset=0n;offset<ownedCount;offset+=100n) ids.push(...await read<bigint[]>('FarmItems','itemsByOwner',[wallet,offset,100n]));
 const items = await Promise.all(ids.map(async id=>{
  const [data,repair,output,enhancing] = await Promise.all([read<Omit<Item,'id'|'repair'|'output'>>('FarmItems','data',[id]),read<bigint>('Economy','repairQuote',[id]),read<bigint>('FarmItems','outputTier',[id]),read<bigint>('Enhancement','pending',[id])]);
  return {...data,id,repair,output,enhancing};
 }));
 const rooms = await Promise.all(Array.from({length:4},async(_,index):Promise<Room>=>{
  const [unlocked,eligible,price,stats,slots]=await Promise.all([read<boolean>('FarmCore','roomUnlocked',[wallet,BigInt(index)]),read<boolean>('FarmCore','roomEligible',[wallet,BigInt(index)]),index===0?Promise.resolve(0n):read<bigint>('Economy','roomQuote',[wallet,BigInt(index)]),read<RoomStats>('FarmCore','roomStats',[wallet,BigInt(index)]),Promise.all(Array.from({length:6},(_,s)=>read<bigint>('FarmCore','itemAt',[wallet,BigInt(index),BigInt(s)])))]);
  return {index,unlocked,eligible,price,stats,slots};
 }));
 let claimNet:bigint|null=null,claimError='';
 if(pending>0n) {try{claimNet=await simulate<bigint>('FarmRewards','claim',[pending],wallet);}catch(e){if(!contractErrorName(e))throw e;claimError=errorMessage(e,{action:'claim'});}}
 const [hash,lastShare,lastEpoch,entrySeconds]=await Promise.all([
  read<bigint>('FarmRewards','farmWeight',[wallet,currentEpoch]),
  read<readonly [bigint,bigint,bigint,boolean]>('FarmRewards','shares',[lastSettled,wallet]),
  read<{rewardPerHash:bigint;tariff:bigint;kind:number;district:number}>('FarmRewards','epochData',[lastSettled]),read<bigint>('FarmRewards','entrySeconds',[currentEpoch,wallet]),
 ]);
 const lastEarnings=miningEstimate(lastShare,lastEpoch,Number(district));
 return {entrySeconds,hash,lastEarnings,ageCap,wallet,hasFarm,level,xp,district,balance,ethBalance,pending,capacity,ownedCount,paidPacks,daily,lastSettled,settledEpoch,items,rooms,claimNet,claimError,yieldPerHash,scrapAllowance,autoRepair};
}
export async function loadReceipt(kind:Receipt['kind'],id:bigint):Promise<Receipt> {
 if(kind==='paid') {
  const c=await read<readonly [Address,bigint,bigint,bigint,boolean,boolean,Hex,boolean,boolean]>('PackSale','commits',[id]);
  return{kind,id,player:c[0],target:c[1],remaining:c[2]-c[3],captured:c[7],resolved:c[2]===c[3]};
 }
 const [c,captured]=await Promise.all([read<readonly [Address,bigint,boolean]>('StarterClaim','claims',[id]),read<boolean>('StarterClaim','entropyCaptured',[id])]);
 return{kind,id,player:c[0],target:c[1],remaining:c[2]?0n:1n,captured,resolved:c[2]};
}
export function scrapQuote(item:Item,farm:Farm) {
 const hash=BigInt([10,28,80,250,800][item.rarity])*1000n*(item.kind<3?10000n:6000n)/10000n*BigInt(item.durability)/10000n;
 const amount=hash*farm.yieldPerHash/(6n*10n**18n);
 return amount<farm.scrapAllowance?amount:farm.scrapAllowance;
}
export function chainTime(home:Home) {return home.timestamp+Math.floor((Date.now()-home.fetchedAt)/1000);}
export function entropyState(receipt:Receipt,current:bigint) {
 if(receipt.resolved)return 'Resolved';if(receipt.captured)return 'Captured · no expiry';
 if(current<=receipt.target)return `Waiting for native block ${receipt.target+1n}`;
 if(current>receipt.target+256n)return 'Window expired · re-arm to reveal';
 return `${receipt.target+256n-current} blocks left to capture`;
}
