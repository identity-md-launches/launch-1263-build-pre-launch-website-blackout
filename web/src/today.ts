import { type Farm, type Receipt, type Home, chainTime } from './data';
import { read, simulate, contractErrorName } from './chain';
export type Today={receipts:Receipt[]|null;cable:boolean|null;cableCost:bigint;drops:bigint;letter:string;referrer:string};
export async function loadToday(farm:Farm,epoch:bigint):Promise<Today>{
 const [drops,plan,referrer]=await Promise.all([read<bigint>('FarmCore','drops',[farm.wallet]),read<{letter:string;submitted:boolean}>('GridOperator','planAt',[epoch]),read<string>('FarmRewards','referrer',[farm.wallet])]);
 let cable:boolean|null=null;
 try{await simulate('FarmCore','sync',[],farm.wallet);try{await simulate('FarmCore','repairCable',[false],farm.wallet);cable=true;}catch(error){const code=contractErrorName(error);if(code==='InvalidValue')cable=false;else if(code==='InsufficientBalance')cable=true;}}
 catch{/* Eligibility stays unknown until catch-up/read service succeeds. */}
 return {receipts:null,cable,cableCost:farm.daily/4n,drops,letter:plan.submitted?plan.letter:'No swarm letter was submitted for this epoch.',referrer};
}
export function repairPlan(farm:Farm,today:Today){const items=farm.items.filter(i=>i.durability<10000);return {items,cable:today.cable===true,total:items.reduce((n,i)=>n+i.repair,0n)+(today.cable?today.cableCost:0n)};}
export function unopened(today:Today){return today.receipts===null?null:today.receipts.filter(r=>!r.resolved).reduce((n,r)=>n+r.remaining,0n);}
export const notificationSettings={enabled:false};
export class NotificationEvents{
 private seen=new Set<string>();private low=new Set<string>();private rewards=false;
 events(farm:Farm,home:Home){
  const events:{key:string;title:string}[]=[],wallet=farm.wallet.toLowerCase(),seconds=Number(home.epochEnd)-chainTime(home),epochKey=`${wallet}:epoch:${home.epoch}`;
  if(seconds>0&&seconds<=600&&!this.seen.has(epochKey)){this.seen.add(epochKey);events.push({key:epochKey,title:'Epoch ends in 10 min'});}
  if(farm.pending>0n&&farm.claimNet!==null&&!this.rewards)events.push({key:`${wallet}:rewards`,title:'Rewards ready to claim'});this.rewards=farm.pending>0n&&farm.claimNet!==null;
  let healthAlert=false;
  for(const item of farm.items){const key=`${wallet}:health:${item.id}`;if(item.durability<3000){if(!this.low.has(key))healthAlert=true;this.low.add(key);}else this.low.delete(key);}
  if(healthAlert)events.push({key:`${wallet}:health`,title:'Item below 30% health'});
  return events;
 }
}
