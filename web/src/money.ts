import { formatUnits } from 'viem';
let rate:number|null=null,rateAt=0,attemptAt=0,inflight:Promise<void>|null=null;
let spot=0n;
export function setSpot(value:bigint){spot=value;}
export function usd(value:bigint,asset:'ETH'|'BLACKOUT'='BLACKOUT'){
 if(rate===null||asset==='BLACKOUT'&&spot===0n)return '$ unavailable';
 const amount=Number(formatUnits(value,18))*(asset==='ETH'?1:1/Number(formatUnits(spot,18)))*rate;
 const price=amount>0&&amount<.01?'<$0.01':amount.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2});
 return `≈ ${price}${Date.now()-rateAt>120000?' · last price':''}`;
}
export function refreshUsd(){
 if(inflight||Date.now()-attemptAt<60000||document.hidden)return inflight??Promise.resolve();attemptAt=Date.now();
 inflight=(async()=>{try{
  const res=await fetch('https://api.coinbase.com/v2/prices/ETH-USD/spot',{signal:AbortSignal.timeout(6000)});
  if(!res.ok)throw Error('Price unavailable');const data=await res.json();const value=Number(data?.data?.amount);
  if(!Number.isFinite(value)||value<=0||data?.data?.currency!=='USD')throw Error('Price unavailable');rate=value;rateAt=Date.now();
 }catch{/* Keep the last actual price; never invent a dollar value. */}finally{inflight=null;}})();return inflight;
}
