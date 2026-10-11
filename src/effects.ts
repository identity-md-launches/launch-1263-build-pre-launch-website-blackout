/** Presentation-only effects. Never reads or mutates the game adapter. */
import { standaloneItem } from './sprites';
let audioContext:AudioContext|undefined;
let sound=false;
try { sound=localStorage.getItem('blackout.sound')==='on'; } catch { /* In-memory settings work without storage. */ }
export const soundEnabled=()=>sound;
export function toggleSound() {
 sound=!sound;
 try { localStorage.setItem('blackout.sound',sound?'on':'off'); } catch { /* Optional preference. */ }
 if(sound) playSound('reveal');
 return sound;
}
export function playSound(kind:'pack'|'reveal'|'claim'|'event') {
 if(!sound||document.hidden)return;
 try {
  audioContext??=new AudioContext(); void audioContext.resume();
  const notes={pack:[110,82,165],reveal:[330,440,660],claim:[440,660,880,1100],event:[164,123,98]}[kind];
  notes.forEach((frequency,i)=>{const o=audioContext!.createOscillator(),g=audioContext!.createGain(),t=audioContext!.currentTime+i*.075;o.type='square';o.frequency.value=frequency;g.gain.setValueAtTime(.022,t);g.gain.exponentialRampToValueAtTime(.001,t+.1);o.connect(g);g.connect(audioContext!.destination);o.start(t);o.stop(t+.11);});
 } catch { /* Unsupported audio never interrupts a game action. */ }
}
export function bootScreen(motion:boolean) {
 let seen=false; try {seen=sessionStorage.getItem('blackout.boot')==='seen';sessionStorage.setItem('blackout.boot','seen');}catch{ /* Optional session preference. */ }
 if(seen||!motion)return;
 const boot=document.createElement('div');boot.className='boot-screen';boot.innerHTML='<div><span class="boot-symbol" aria-hidden="true">ϟ</span><strong>Grid online</strong><p>Welcome to BLACKOUT.</p><button class="button compact" id="skip-boot">Skip boot →</button></div>';
 document.body.append(boot);boot.querySelector('button')!.onclick=()=>boot.remove();window.setTimeout(()=>boot.remove(),1000);
}
export function initAtmosphere(canAnimate:()=>boolean) {
 let n=0,timer:number,scrollFrame=0;
 const run=()=>{
  const sky=document.querySelector<HTMLElement>('.living-skyline');
  if(sky&&canAnimate()&&!document.hidden){
   const strike=n%3===2,index=strike?4:n%8,district=sky.querySelector(`[data-sky-district="${index}"]`);
   district?.classList.add('blackout-wave');
   if(strike)sky.classList.add('lightning-active');
   window.setTimeout(()=>{district?.classList.remove('blackout-wave');sky.classList.remove('lightning-active');},2200);
   n++;
  }
  timer=window.setTimeout(run,9000+(n%3)*1000);
 };
 timer=window.setTimeout(run,9500);
 window.addEventListener('pagehide',()=>window.clearTimeout(timer));
 window.addEventListener('scroll',()=>{
  if(scrollFrame)return;
  scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;const sky=document.querySelector<HTMLElement>('.hero-city');if(sky)sky.style.setProperty('--parallax',canAnimate()?`${Math.min(scrollY,700)*.12}px`:'0px');});
 },{passive:true});
}
export function claimFeedback(from:number,to:number,motion:boolean) {
 playSound('claim');
 const balance=document.getElementById('balance');
 if(!balance||!motion)return;
 const original=balance.innerHTML,start=performance.now();
 const frame=(now:number)=>{if(!balance.isConnected)return;const t=Math.min((now-start)/650,1),value=from+(to-from)*(1-(1-t)**3);balance.innerHTML=`${value.toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1})} <small>demo</small>`;if(t<1)requestAnimationFrame(frame);else balance.innerHTML=original;};
 requestAnimationFrame(frame);
 const burst=document.createElement('div');burst.className='token-burst';burst.setAttribute('aria-hidden','true');const box=document.getElementById('claim')?.getBoundingClientRect();burst.style.left=`${box?box.left+box.width/2:innerWidth/2}px`;burst.style.top=`${box?box.top+box.height/2:150}px`;burst.innerHTML=Array.from({length:10},(_,i)=>`<i style="--i:${i}">◆</i>`).join('');document.body.append(burst);setTimeout(()=>burst.remove(),900);
}
export function levelFeedback(level:number,motion:boolean) {
 const badge=document.createElement('div');badge.className=`level-up ${motion?'level-animate':''}`;badge.setAttribute('role','status');badge.innerHTML=`<span aria-hidden="true">✦</span> Level ${level} unlocked <button aria-label="Dismiss level up">×</button>`;badge.querySelector('button')!.onclick=()=>badge.remove();document.querySelector('.level-up')?.remove();document.getElementById('feedback-stack')?.prepend(badge);
}
export async function downloadPixelCard(type:string,rarity:string) {
 const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=1200;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Image downloads are unavailable in this browser.');
 const color=({Common:'#bdc8dd',Rare:'#39e6ff',Epic:'#ff3df2',Legendary:'#ffe600',Mythic:'#ff6475'} as Record<string,string>)[rarity]??'#39e6ff';
 ctx.fillStyle='#080d20';ctx.fillRect(0,0,1000,1200);ctx.strokeStyle=color;ctx.lineWidth=8;ctx.strokeRect(30,30,940,1140);ctx.strokeStyle='#263750';ctx.lineWidth=2;
 for(let x=60;x<960;x+=40){ctx.beginPath();ctx.moveTo(x,280);ctx.lineTo(x,900);ctx.stroke();}for(let y=280;y<930;y+=40){ctx.beginPath();ctx.moveTo(60,y);ctx.lineTo(940,y);ctx.stroke();}
 await document.fonts.ready;ctx.textAlign='center';ctx.fillStyle='#39e6ff';ctx.font='56px Pixel, monospace';ctx.fillText('BLACKOUT',500,145);ctx.fillStyle=color;ctx.font='28px Mono, monospace';ctx.fillText(`${rarity} pull`,500,229);
 const url=URL.createObjectURL(new Blob([standaloneItem(type,rarity)],{type:'image/svg+xml'}));
 try{const img=new Image();img.src=url;await img.decode();ctx.imageSmoothingEnabled=false;ctx.drawImage(img,276,343,448,448);}finally{URL.revokeObjectURL(url);}
 ctx.fillStyle='#edf2ff';ctx.font='42px Mono, monospace';ctx.fillText(type,500,870,880);ctx.fillStyle='#aebbd2';ctx.font='26px Mono, monospace';ctx.fillText('Pulled in the BLACKOUT demo',500,956);ctx.fillText('Mine the city. Pray the grid stays on.',500,1004);ctx.fillStyle=color;ctx.font='30px Mono, monospace';ctx.fillText('playblackout.xyz',500,1100);
 const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('Unable to create the card. Please try again.');
 const download=URL.createObjectURL(blob),a=document.createElement('a');a.href=download;a.download=`BLACKOUT-${rarity}-${type.replaceAll(' ','-')}.png`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(download),30000);
}
export function shareIntent(type:string,rarity:string) {
 return `https://twitter.com/intent/tweet?text=${encodeURIComponent(`I just pulled a ${rarity} ${type} in the BLACKOUT demo. Mine the city: playblackout.xyz @IMDBlackout`)}`;
}
