import { setText } from './dom';
const numbers = new WeakMap<HTMLElement, {value:number; frame:number}>();
export function animateNumbers(){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches||document.body.classList.contains('motion-off');
 document.querySelectorAll<HTMLElement>('[data-number]').forEach(el=>{
  const value=Number(el.dataset.number),digits=Number(el.dataset.digits??2),old=numbers.get(el);
  if(!Number.isFinite(value)||old?.value===value)return;
  if(old?.frame)cancelAnimationFrame(old.frame);
  const state={value,frame:0};numbers.set(el,state);
  const format=(n:number)=>value>0&&value<10**-digits?`<${(10**-digits).toFixed(digits)}`:n.toLocaleString('en-US',{maximumFractionDigits:digits,minimumFractionDigits:el.dataset.fixed==='true'?digits:0});
  // First paint is final. Only a changed, previously rendered value animates.
  if(!old||reduced){setText(el,format(value));return;}
  const start=performance.now(),tick=(time:number)=>{if(!el.isConnected)return;const p=Math.min(1,(time-start)/650);setText(el,format(old.value+(value-old.value)*(1-(1-p)**3)));if(p<1)state.frame=requestAnimationFrame(tick);};
  state.frame=requestAnimationFrame(tick);
 });
}
export function sparkline(values:number[]){if(values.length<2)return '';const min=Math.min(...values),span=Math.max(...values)-min||1;return `<svg class="stat-sparkline" viewBox="0 0 160 30" role="img" aria-label="Reward pool trend from this browser’s last ${values.length} confirmed readings"><polyline points="${values.map((v,i)=>`${i/(values.length-1)*160},${27-(v-min)/span*24}`).join(' ')}" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;}
