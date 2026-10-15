const numbers=new Map<string,number>();
const active=new WeakSet<HTMLElement>();
export function animateNumbers(){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches||document.body.classList.contains('motion-off');
 document.querySelectorAll<HTMLElement>('[data-number]').forEach((el,index)=>{
  if(active.has(el))return;active.add(el);
  const value=Number(el.dataset.number),key=el.dataset.numberKey||`${document.body.dataset.page}:${index}`,old=numbers.get(key)??0,digits=Number(el.dataset.digits??2);numbers.set(key,value);
  if(!Number.isFinite(value))return;
  if(old===value)return;
  const start=performance.now(),tick=(time:number)=>{if(!el.isConnected)return;const p=reduced?1:Math.min(1,(time-start)/650),next=old+(value-old)*(1-(1-p)**3);el.textContent=value>0&&value<10**-digits?`<${10**-digits}`:next.toLocaleString('en-US',{maximumFractionDigits:digits});if(p<1)requestAnimationFrame(tick);};
  requestAnimationFrame(tick);
 });
}

export function sparkline(values:number[]){if(values.length<2)return '';const min=Math.min(...values),span=Math.max(...values)-min||1;return `<svg class="stat-sparkline" viewBox="0 0 160 30" role="img" aria-label="Reward pool trend from this browser’s last ${values.length} confirmed readings"><polyline points="${values.map((v,i)=>`${i/(values.length-1)*160},${27-(v-min)/span*24}`).join(' ')}" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;}
