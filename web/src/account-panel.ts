import type { Farm, Home, Receipt } from './data';
import { DISTRICTS } from './data';
import { xpProgress } from './player';
import { farmEpoch, type EconomySnapshot } from './earnings';
import { esc, tokens, eth, disabled } from './views';
import { isTeam } from './identity';
import { inviteCard } from './invite-panel';
export function accountPanel(farm:Farm|null,home:Home|null,economy:EconomySnapshot|null,receipts:Receipt[]|null,address:string){
 const xp=farm?xpProgress(farm.xp,farm.level):null,estimate=farm&&economy?farmEpoch(economy,farm):null;
 const packs=receipts?.reduce((n,r)=>n+r.remaining,0n);
 const label=`${isTeam(address)?'Team farm · ':''}${address.slice(0,6)}…${address.slice(-4)}`;
 const remaining=farm&&xp?BigInt(xp.goal)>farm.xp?BigInt(xp.goal)-farm.xp:0n:0n;
 const row=(label:string,value:string)=>`<div><dt>${label}</dt><dd>${value}</dd></div>`;
 return `<div class="account-identity"><div><strong class="account-address" title="${esc(address)}">${label}</strong><button class="text-button" data-copy="${esc(address)}" aria-label="Copy wallet address">Copy address</button></div><span class="district-badge district-${farm?.district??0}">${farm?farm.hasFarm?DISTRICTS[Number(farm.district)]:'New farm':'Reading farm…'}</span></div>
 <div class="account-xp"><div><strong>Farm level ${farm?.level??'—'}</strong><span>${farm?`${farm.xp.toLocaleString('en-US')} XP`:'—'}</span></div><progress max="100" value="${xp?.value??0}" aria-label="Farm XP progress"></progress><p>${farm&&xp?farm.level>=10n?'Maximum level':xp.ageLimited?`XP ready · farm age cap ${farm.ageCap}`:`${remaining.toLocaleString('en-US')} XP to level ${farm.level+1n}`:'Reading experience…'}</p></div>
 <section class="account-balances" aria-label="Wallet balances"><dl>${row('ETH',farm?eth(farm.ethBalance):'—')}${row('BLACKOUT in wallet',farm?tokens(farm.balance):'—')}${row('Claimable rewards',farm?`${tokens(farm.pending)} <small>BLACKOUT</small>`:'—')}</dl><button class="button primary" data-claim ${disabled(!farm||farm.pending===0n||farm.claimNet===null)}>Claim</button></section>
 <section class="account-farm" aria-label="Farm overview"><dl>${row('Hashrate',farm?`${(Number(farm.hash)/1000).toLocaleString('en-US',{maximumFractionDigits:2})} <small>H/s</small>`:'—')}${row('≈ tokens per epoch',estimate!==null?tokens(estimate):'—')}${row('Unopened packs',`${packs??'—'} <a href="#/packs" data-close-account>Open ↗</a>`)}${row('Inventory',farm?`${farm.inventory}/${farm.capacity}`:'—')}</dl><p class="small muted">${home?`Epoch ${home.epoch} · `:''}Estimate before claim tax</p></section>
 ${inviteCard()}<nav class="account-links" aria-label="Account pages"><a href="#/farm" data-close-account>My farm ↗</a><a href="#/packs" data-close-account>Packs ↗</a><a href="#/rewards" data-close-account>Rewards ↗</a></nav><button class="text-button account-disconnect" data-disconnect>Disconnect</button>`;
}
