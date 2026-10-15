import type { Farm, Item, Room } from './data';
export const LEVEL_GATES=[1,1,3,5,10] as const;
export const XP_LEVELS=[0,100,400,600,800,1200,1600,2000,2400,2800] as const;
export function placementReason(item:Item,farm:Farm,room?:Room,slot?:number):string {
 if(item.holder.toLowerCase()!==farm.wallet.toLowerCase())return 'This hardware belongs to another wallet';
 if(item.equipped)return 'Already installed';
 if(item.enhancing)return 'Upgrade in progress';
 const required=LEVEL_GATES[item.rarity]??10;
 if(farm.level<BigInt(required))return `Requires level ${required} · your farm is level ${farm.level}`;
 if(!room){
  const reasons=farm.rooms.filter(r=>r.unlocked).map(r=>placementReason(item,farm,r));
  return reasons.some(r=>!r)?'':reasons.includes('One of each type per room')?'One of each type per room':'No empty rack slots';
 }
 if(!room.unlocked)return 'Unlock this room first';
 if(slot!==undefined&&room.slots[slot]!==0n)return 'This rack slot is occupied';
 if(room.slots.some(id=>farm.items.find(i=>i.id===id)?.kind===item.kind))return 'One of each type per room';
 if(!room.slots.includes(0n))return 'This room is full';
 return '';
}
export function xpProgress(xp:bigint,level:bigint){
 const n=Number(xp),index=XP_LEVELS.findIndex(x=>x>n),goal=index<0?2800:XP_LEVELS[index];
 const previous=index<=0?0:XP_LEVELS[index-1];
 return {goal,value:index<0?100:Math.min(100,Math.max(0,(n-previous)/(goal-previous)*100)),ageLimited:index>=0&&BigInt(index)>level||index<0&&level<10n};
}
export function claimWindow(launch:bigint,now:number,freeEnds?:bigint){
 const opens=freeEnds?Number(launch):Number(launch)+48*3600,closes=Number(freeEnds??launch+16n*86400n);
 return {opens,closes,state:now<opens?'upcoming':now>=closes?'closed':'open'} as const;
}
export function epochProgress(start:bigint,end:bigint,now:number){return Math.min(1,Math.max(0,(now-Number(start))/Math.max(1,Number(end-start))));}

export function miningTime(seconds:number){const n=Math.max(0,Math.floor(seconds));return `${String(Math.floor(n/3600)).padStart(2,'0')}:${String(Math.floor(n%3600/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}

// Reproduce the deployed mining net, before redistribution/referrals and auto-repair.
export function miningEstimate(share:readonly [bigint,bigint,bigint,boolean],epoch:{rewardPerHash:bigint;tariff:bigint;kind:number;district:number},district:number,precision:bigint){
 const gross=share[1]*epoch.rewardPerHash/precision;
 let electricity=share[2]*epoch.rewardPerHash/precision*epoch.tariff/10000n;
 if(Number(epoch.kind)===7&&Number(epoch.district)===district)electricity/=2n;
 const afterAudit=gross-(share[3]?gross/10n:0n);
 return afterAudit-(electricity<afterAudit?electricity:afterAudit);
}
