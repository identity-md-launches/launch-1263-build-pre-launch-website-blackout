import { landing } from '../../src/landing';
import { spriteSheet } from '../../src/sprites';
import { header } from './shell';
// Paint the game before downloading the contract and wallet modules. All links
// are real hash links; the live app picks up the route when its module is ready.
const route=location.hash.replace(/^#\/?/,'').split('/')[0]||'home';
document.body.dataset.page=route;
const app=document.querySelector<HTMLElement>('#app')!;
if(route==='home'&&app.querySelector('.landing-hero')){
 app.insertAdjacentHTML('afterbegin',spriteSheet());
 app.querySelector('#main')!.insertAdjacentHTML('beforeend',landing().slice(landing().indexOf(' <section id="home-live"')));
}else app.innerHTML=`${spriteSheet()}${header()}<main id="main" tabindex="-1">${route==='home'?landing():'<div class="wrap live-page"><p role="status">Opening the city…</p></div>'}</main>`;
let connectRequested=false;
let gameStarted=false;
const earlyClick=(event:MouseEvent)=>{
 const element=event.target as Element;
 if(element.closest('#connect')){connectRequested=true;const button=document.querySelector<HTMLButtonElement>('#connect');if(button)button.textContent='Opening…';loadGame();}
 if(element.closest('a[href^="#/"]')){document.body.classList.remove('menu-open');document.querySelector('#menu-toggle')?.setAttribute('aria-expanded','false');loadGame();}
 if(element.closest('#menu-toggle')){const open=document.body.classList.toggle('menu-open');document.querySelector('#menu-toggle')?.setAttribute('aria-expanded',String(open));}
};
document.addEventListener('click',earlyClick);
// Let the small, preloaded hero decode and paint before the full stylesheet
// can compete for the first frame. A user action always starts the game now.
function loadGame(){if(gameStarted)return;gameStarted=true;void import('./main').then(()=>{
 document.removeEventListener('click',earlyClick);
 if(connectRequested)document.querySelector<HTMLButtonElement>('#connect')?.click();
}).catch(()=>{
 document.removeEventListener('click',earlyClick);
 app.insertAdjacentHTML('afterbegin','<div class="wrap read-error" role="alert">The game could not finish loading. <button class="button" id="reload-game">Try again</button></div>');
 document.querySelector('#reload-game')?.addEventListener('click',()=>location.reload());
});}
// A decoded image can still be waiting for paint. Observe the actual hero paint
// before adding the game's stylesheet, with a bounded fallback for browsers
// without paint observations. Real interaction always bypasses this wait.
if(route==='home'&&PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint')){
 let observer:PerformanceObserver;
 const start=()=>{clearTimeout(deadline);observer?.disconnect();requestAnimationFrame(loadGame);};
 const deadline=setTimeout(start,1500);
 observer=new PerformanceObserver(list=>{if(list.getEntries().some(entry=>(entry as PerformanceEntry&{element?:Element}).element?.classList.contains('rooftop-image')))start();});
 observer.observe({type:'largest-contentful-paint',buffered:true});
}else requestAnimationFrame(()=>requestAnimationFrame(loadGame));
