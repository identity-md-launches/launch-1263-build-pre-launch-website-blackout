/** Code-native pixel artwork. One shared 64×64 symbol atlas supplies every item. */
const C = { ink:'#05060f', metal:'#283952', edge:'#58718d', light:'#aac5d8', cyan:'#39E6FF', yellow:'#FFE600', magenta:'#FF3DF2' };
const r = (x:number,y:number,w:number,h:number,c:string,attr='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}" ${attr}/>`;
const p = (d:string,c:string,attr='') => `<path d="${d}" fill="${c}" ${attr}/>`;
const stroke = (d:string,c:string,w=1,attr='') => p(d,'none',`stroke="${c}" stroke-width="${w}" ${attr}`);
const dots = (x:number,y:number,n:number,c:string,step=4) => Array.from({length:n},(_,i)=>r(x+i*step,y,2,3,c)).join('');
const vents = (x:number,y:number,n:number,h:number) => Array.from({length:n},(_,i)=>r(x+i*3,y,1,h,'#0a1120')).join('');
const screws = (x:number,y:number,w:number,h:number) => [[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([a,b])=>r(a,b,2,2,C.light)).join('');
const fan = (x:number,y:number,size=1) => `<g transform="translate(${x} ${y}) scale(${size})">${p('M-8 -11H8V-8H11V8H8V11H-8V8H-11V-8H-8Z',C.edge)}${p('M-7 -9H7V-7H9V7H7V9H-7V7H-9V-7H-7Z','#091321')}${p('M-2 -7H3V-3H7V2H3V7H-2V2H-7V-3H-2Z','#7293ac')}${r(-3,-3,6,6,C.metal)}${r(-1,-1,2,2,'currentColor')}</g>`;
const trim='currentColor';
const itemArt:Record<string,string> = {
  GPU: r(4,19,54,27,C.edge)+r(6,21,50,21,'#121d30')+r(2,17,3,34,C.light)+r(58,22,3,28,C.edge)+fan(19,32)+fan(43,32)+r(7,18,46,2,trim)+r(10,44,40,3,'#172e41')+dots(12,48,10,'#d7b45a')+r(51,16,5,3,trim)+vents(8,42,15,2)+screws(7,22,47,18),
  ASIC: p('M10 20L20 12H53V42L44 51H10Z','#4d627b')+p('M11 21H44V49H11Z','#25374c')+p('M44 22L53 15V42L44 49Z','#192436')+fan(27,35,1.05)+vents(46,24,2,17)+r(14,18,28,2,trim)+r(14,49,26,3,trim)+r(13,53,6,3,C.edge)+r(35,53,6,3,C.edge)+dots(27,14,4,C.cyan)+screws(13,23,27,24),
  FPGA: r(10,9,43,43,'#4a876a')+r(12,11,39,39,'#183d35')+stroke('M16 13V23H22M15 39H24V45H46M46 14V22H40M14 30H22M42 30H49M16 47V43M31 11V19M31 41V49','#c49b4c',2)+r(23,20,18,20,C.edge)+r(26,23,12,14,'#091720')+r(28,26,8,8,'#334a51')+dots(21,17,6,C.light)+dots(21,41,6,C.light)+dots(13,53,10,'#d7b45a')+r(12,10,38,2,trim)+screws(13,13,35,34)+r(15,33,5,4,'#bcc4a1')+r(44,35,4,7,'#65756d'),
  'Power Supply': p('M9 16H43L53 23V48H19L9 40Z',C.edge)+r(11,19,32,24,'#1a2b41')+fan(27,31)+p('M44 24H51V45H44Z','#172131')+r(45,27,4,7,'#bac4ad')+r(13,17,27,2,trim)+r(19,45,29,3,C.metal)+stroke('M51 35H56V53H62M51 40H54V57H60','#ee9b4d',2)+stroke('M51 38H59V48H62',trim,2)+screws(12,20,27,20),
  Battery: r(16,8,9,5,C.light)+r(39,8,9,5,C.light)+p('M13 13H51V17H54V51H50V56H14V51H10V18H13Z',C.edge)+r(14,18,36,32,'#18293e')+r(14,19,7,30,'#39516b')+r(23,19,7,30,'#39516b')+r(32,19,7,30,'#39516b')+r(41,19,7,30,'#39516b')+r(12,14,40,3,trim)+r(14,46,36,4,trim)+r(24,25,17,14,'#081421')+dots(27,28,3,'#88fcb1',4)+r(27,33,10,2,C.light)+r(18,10,4,1,'#fff0aa'),
  'Solar Panel': p('M17 9H57L48 42H7Z',C.edge)+p('M20 12H53L46 38H12Z','#102b55')+[0,1,2].map(y=>[0,1,2,3].map(x=>p(`M${20+x*8-y*2} ${14+y*8}H${26+x*8-y*2}L${24+x*8-y*2} ${20+y*8}H${18+x*8-y*2}Z`,x%2?'#315db2':'#447ac8')).join('')).join('')+stroke('M20 12H53L46 38H12',trim)+p('M26 42H31V53H42V56H17V53H26Z',C.edge)+r(8,40,40,3,trim)+r(33,18,5,2,'#89c5ef'),
  Fan: p('M14 8H49V12H53V49H49V54H13V49H9V13H14Z',C.edge)+r(14,14,34,34,'#152539')+fan(31,31,1.45)+screws(13,12,35,35)+r(17,9,29,2,trim)+r(12,49,37,3,trim)+stroke('M47 53V58H56','#b09964',2),
  'Liquid Cooling': r(6,9,24,43,C.edge)+r(8,12,20,37,'#12243b')+vents(10,13,6,34)+fan(18,24,.6)+fan(18,39,.6)+stroke('M30 19H40V9H53V30',trim,4)+stroke('M30 43H38V55H54V43',trim,4)+stroke('M30 18H40V8H53V30','#92f4ff')+r(46,28,14,18,C.edge)+r(48,30,10,14,'#133e51')+r(49,35,8,8,'#29a9c6')+r(49,31,2,9,'#a7eeed')+r(46,26,14,3,C.light)+r(46,44,14,3,C.light)+r(6,10,2,40,trim)+screws(7,10,20,39),
  Router: r(12,13,3,23,C.edge)+r(46,13,3,23,C.edge)+r(11,11,5,7,trim)+r(45,11,5,7,trim)+p('M12 32H49L56 39V50H7V39Z',C.edge)+r(9,39,45,9,'#13283d')+vents(20,34,8,3)+dots(13,42,4,C.cyan)+r(41,42,8,4,'#072035')+r(9,49,45,2,trim)+r(13,51,5,3,C.light)+r(45,51,5,3,C.light)+stroke('M24 12V9H39V12M28 16V13H35V16',trim,2,'class="signal-pulse"'),
  Motherboard: r(10,7,42,49,'#3b715c')+r(13,10,36,43,'#1a3c35')+r(20,18,19,20,'#97a89d')+r(23,21,13,14,'#273c46')+r(25,23,9,10,'#627d83')+r(41,14,3,29,trim)+r(46,14,3,29,'#d3b76c')+r(18,43,20,3,'#b7bcc1')+r(18,49,28,3,'#335b8d')+dots(18,12,5,'#b8bd9b')+stroke('M16 21V40H35M16 11V16H37M36 39V42H46','#b7a363')+r(6,13,5,12,C.light)+r(6,29,5,15,C.edge)+screws(12,9,36,42)+r(10,8,2,45,trim),
  'Server Rack': r(16,4,32,55,C.edge)+r(19,7,26,47,'#0a1424')+[0,1,2,3].map(i=>r(21,9+i*11,22,9,'#31445f')+r(23,11+i*11,3,3,i===2?'#ffe600':trim)+vents(29,11+i*11,4,4)+r(22,17+i*11,19,1,'#8aa0b1')).join('')+r(16,6,2,48,trim)+r(14,58,9,3,C.light)+r(41,58,9,3,C.light)+screws(17,5,28,49),
  'Surge Protector': stroke('M14 24H8V13H18V8',C.edge,3)+p('M15 20H49V24H54V46H49V50H15V46H11V24H15Z',C.edge)+r(15,25,34,19,'#c6d0cc')+[0,1,2].map(i=>r(18+i*10,29,7,9,'#526170')+r(19+i*10,31,1,3,'#080e17')+r(23+i*10,31,1,3,'#080e17')).join('')+r(17,21,13,2,trim)+p('M38 36H58V47L48 57L38 47Z','#163747')+stroke('M39 37H57V46L48 55L39 46Z',trim,2)+p('M48 39L43 47H48L46 52L53 44H48L51 39Z',trim),
};
const slug=(s:string)=>s.toLowerCase().replaceAll(' ','-');
export function spriteSheet() {
  return `<svg class="sprite-sheet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="0" height="0"><defs>${Object.entries(itemArt).map(([name,art])=>`<symbol id="hardware-${slug(name)}" viewBox="0 0 64 64">${art}</symbol>`).join('')}</defs></svg>`;
}
export function itemSprite(type:string,rarity='Common',cls='',durability=100):string {
  if(type==='Room') return sprite('room',cls);
  const name=type==='Cooling'?'Fan':type==='PSU'?'Power Supply':type;
  const tier=['Common','Rare','Epic','Legendary','Mythic'].includes(rarity)?rarity:'Common';
  const safe=cls.replace(/["<>&]/g,'');
  return `<svg class="sprite item-sprite ${tier.toLowerCase()} ${durability<100?'damaged':''} ${durability<50?'badly-damaged':''} ${safe}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-hidden="true" focusable="false"><g class="item-aura">${stroke('M8 12L3 24L8 30L3 42L10 53M54 6L60 16L55 23L62 34L57 42L60 54','#ff5268',2)}${r(7,8,2,2,'#ff5268')}${r(57,58,3,3,'#ff5268')}</g><use href="#hardware-${slug(Object.hasOwn(itemArt,name)?name:'GPU')}"/><g class="item-sparks">${p('M7 7H9V10H12V12H9V15H7V12H4V10H7ZM54 48H56V52H60V54H56V58H54V54H50V52H54Z',trim)}</g><g class="item-shimmer">${p('M44 3H46V8H51V10H46V15H44V10H39V8H44ZM10 44H12V47H15V49H12V52H10V49H7V47H10Z','#fff7c8')}</g>${durability<100?`<g class="damage-cracks">${stroke('M27 21L31 29L26 34L33 38L29 43','#030611',2)}${stroke('M29 30L35 29L38 24','#95a9b5')}</g><g class="damage-smoke">${r(29,4,7,5,'#65717e')}${r(25,10,10,6,'#47596a')}${r(29,17,6,4,'#5a626c')}</g>`:''}</svg>`;
}
export const districtArt = [
  {name:'Neon Row',color:'#ff3df2',landmark:'Hologram arcade',kind:'neon'},
  {name:'Copper Yard',color:'#ffa452',landmark:'Smelter stacks',kind:'copper'},
  {name:'Stack Heights',color:'#39e6ff',landmark:'Glass spires',kind:'stack'},
  {name:'Dockside',color:'#4ff5ce',landmark:'Harbor crane',kind:'dock'},
  {name:'Old Circuit',color:'#ffc16a',landmark:'The wire exchange',kind:'old'},
  {name:'Ghost Quarter',color:'#b6f7b0',landmark:'Abandoned cinema',kind:'ghost'},
  {name:'Relay Point',color:'#82aaff',landmark:'Radio array',kind:'relay'},
  {name:'Solar Hill',color:'#ffe600',landmark:'Turbine gardens',kind:'solar'},
] as const;
function building(x:number,y:number,w:number,h:number,c:string,kind='plain',seed=0) {
  let out=r(x,y,w,h,'#17213b')+r(x,y,2,h,'#384562')+r(x+2,y+2,w-4,3,'#323853')+r(x+w-4,y+5,4,h-5,'#0e1630');
  for(let row=0;row<Math.floor((h-10)/9);row++) for(let col=0;col<Math.floor((w-8)/7);col++) {
    const v=(row*13+col*7+seed*11)%17;
    out+=r(x+5+col*7,y+10+row*9,3,4,v>4?c:'#29344b',v>4?`class="window-cell ${v%5===0?'window-flicker':''}" style="--window-delay:${(col*.09+row*.025).toFixed(3)}s;--flicker-delay:-${v}s" opacity="${v>12?.95:.55}"`:'');
  }
  if(kind==='brick') for(let j=8;j<h;j+=8) out+=stroke(`M${x+3} ${y+j}H${x+w-5}`,'#4c343e')+r(x+5+(j%3)*5,y+j-4,1,4,'#513944');
  out+=r(x+5,y-5,w/3,5,'#2d3650')+r(x+w-9,y-13,1,13,'#656282')+r(x+w-10,y-15,3,2,'#e65f81');
  return out;
}
function landmark(kind:string,c:string) {
  let out='';
  if(kind==='neon') out=building(6,41,29,52,c,'plain',1)+building(40,22,34,71,c,'plain',2)+building(78,52,22,41,c)+r(7,45,2,47,c)+r(72,26,2,68,c)+stroke('M39 37H28V22H48V17H65V37H39',c,2,'class="hologram"')+r(12,57,13,15,'#321750')+stroke('M14 59H23V70H14Z',c,2,'class="hologram"');
  if(kind==='copper') out=building(5,59,83,34,c)+r(11,22,9,40,'#774959')+r(42,13,11,49,'#774959')+r(70,30,9,34,'#774959')+r(9,21,13,4,c)+r(40,12,15,4,c)+r(69,28,12,4,c)+p('M0 62L17 50V62L34 50V62L51 50V62Z','#384051')+`<g class="stack-smoke">${r(39,2,17,7,'#726184')}${r(34,0,12,5,'#45425f')}${r(9,10,14,7,'#635673')}</g>`;
  if(kind==='stack') out=building(6,38,22,55,c)+building(32,12,32,81,c)+building(67,29,25,64,c)+p('M32 12L48 2L64 12Z','#336072')+r(33,16,2,72,c)+r(53,17,6,71,'#2d6c8855')+r(68,31,2,60,c)+r(6,41,2,50,c)+`<g class="glass-shine">${r(44,18,2,64,'#a2efff66')}</g>`;
  if(kind==='old') out=building(6,46,32,47,c,'brick',5)+building(42,36,34,57,c,'brick',6)+r(14,39,7,9,'#6b4a4d')+r(68,29,7,9,'#6b4a4d')+r(88,27,3,65,'#76616b')+r(79,28,20,3,'#8e6d71')+stroke('M0 35Q22 60 44 33Q60 54 89 29M2 40Q34 70 89 34','#0a101e',2)+r(46,75,17,18,'#1e121e')+r(28,22,3,71,'#a67b53')+r(20,26,18,2,'#a67b53');
  if(kind==='ghost') out=building(10,24,27,69,c,'plain',7)+building(42,48,46,45,c,'plain',8)+p('M10 24L14 16H22V24H27V20H37V30Z','#2c3848')+r(46,45,41,12,'#506261')+r(48,47,37,8,'#1e3038')+dots(52,49,7,c)+stroke('M22 29L18 48L27 59L20 75','#090f1c',2)+p('M50 72H79V94H50Z','#080f1c')+r(45,68,39,3,c,'class="ghost-light"');
  if(kind==='relay') out=building(7,65,73,28,c)+stroke('M24 14L10 92M24 14L39 92M18 41H29M14 63H34M12 84H37M19 38L33 65L13 83M29 39L15 63L36 83',C.edge,2)+r(23,7,2,12,c)+r(22,4,4,4,'#ff5c73')+stroke('M63 33V75',C.edge,3)+p('M49 32H76L70 44H57Z','#b5bdc9')+stroke('M52 31L63 23L69 29',c,2)+`<g class="signal-pulse">${stroke('M11 20V8H17M32 8H38V20M5 24V3H15M34 3H45V24',c)}</g>`;
  if(kind==='dock') out=r(0,85,100,10,'#153d50')+stroke('M0 92H16M25 89H42M58 93H86',c,2,'class="water-ripple"')+r(6,64,28,19,'#325965')+r(38,65,26,18,'#815356')+r(24,45,30,18,'#375378')+vents(9,67,8,13)+vents(40,68,7,12)+r(68,25,4,60,'#b2a371')+r(27,22,63,4,'#b2a371')+stroke('M30 21L68 3L88 21M70 3V82M36 23V45','#82745d',2)+r(32,43,8,3,c)+r(67,25,6,3,c)+r(77,74,15,11,'#1d2c43');
  if(kind==='solar') out=p('M0 89L20 68L51 72L75 57L100 74V96H0Z','#2d3b46')+building(4,65,33,27,c)+building(42,60,25,33,c)+p('M7 50H38L31 64H0ZM42 45H68L61 59H35Z','#355e90')+stroke('M10 52H35M6 58H33M20 50L13 63M28 50L21 63M45 48H64M42 53H62',c)+r(80,24,3,62,'#a8b7b5')+`<g class="wind-turbine" style="transform-origin:81px 24px">${p('M79 23L75 3H80L84 21L99 32L96 36L82 28L67 40L64 36Z','#c5d9d4')}${r(79,22,5,5,c)}</g>`;
  return out;
}
export function districtSprite(index:number,event='calm',cls='') {
  const d=districtArt[index]??districtArt[0];
  return `<svg class="sprite district-art event-${event} ${cls}" viewBox="0 0 104 100" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-hidden="true" focusable="false" style="--district:${d.color}">${landmark(d.kind,d.color)}<g class="event-fire">${p('M18 93L12 78L22 81L26 64L32 75L39 71L36 88L42 94Z','#ff6844')}${p('M21 93L22 84L27 87L30 76L34 92Z','#ffe600')}</g><g class="event-sparks">${p('M58 56L49 73H57L53 86L68 65H60L65 56Z','#ffe600')}${r(46,65,3,3,'#fff')}${r(67,79,3,3,'#fff')}</g><g class="event-green">${stroke('M0 96H100M2 98H98','#88ffa9',3)}${r(3,68,2,14,'#88ffa9')}${r(88,55,2,20,'#88ffa9')}</g><g class="event-cable">${stroke('M42 78L49 82M57 85L67 90','#ff8aa1',3)}${p('M48 75L53 79L49 86M58 78L53 85L57 92','none','stroke="#ff8aa1" stroke-width="2"')}</g></svg>`;
}
function dispatcher() {
  return r(4,16,120,100,'#0b132a')+stroke('M9 25H32M96 25H119M9 103H24M104 103H119','#34506b')+p('M42 19H86V25H95V37H101V55H108V95H117V124H11V103H19V69H25V42H31V29H42Z','#323755')+p('M44 24H83V30H91V42H97V84H104V122H24V90H29V53H34V35H44Z','#191c35')+p('M46 30H81V36H87V44H92V75L79 91H51L37 75V48H40V37H46Z','#536080')+p('M47 37H79V43H85V50H89V69L75 81H54L43 69V50H47Z','#040b18')+r(51,53,11,4,C.cyan)+r(70,53,11,4,C.cyan)+r(51,53,30,4,C.cyan,'opacity=".18"')+r(55,67,22,3,'#254153')+p('M38 81L57 94L47 108L32 96ZM92 81L74 94L82 108L101 96Z','#3d4a67')+stroke('M26 100L48 113M103 100L82 113','#566586',2)+r(57,97,16,10,'#122435')+r(63,99,4,6,C.cyan)+r(49,116,32,9,'#222f46')+r(54,119,22,3,C.cyan)+r(15,89,8,17,'#506682')+r(108,82,6,21,'#506682');
}
function pack() {
 return p('M14 5H62V9H67V86H62V91H14V87H9V10H14Z',C.edge)+r(13,10,50,77,'#152640')+r(17,15,42,67,'#0a1428')+r(13,11,3,72,C.cyan)+r(61,12,2,71,C.magenta)+r(13,12,49,3,C.cyan)+r(13,82,49,3,C.cyan)+dots(15,5,12,C.light)+dots(15,88,12,C.light)+p('M41 25L24 49H36L30 68L51 42H39L47 25Z',C.yellow)+stroke('M20 20H27M51 20H57M20 77H27M51 77H57',C.magenta,2)+r(23,71,29,2,C.edge);
}
function controlTower() {
 return p('M42 4H58V28H69V36H76V57H70V121H30V57H24V36H31V28H42Z','#22243f')+r(46,0,7,13,'#4e455f')+r(48,0,3,3,'#ff5c73')+r(32,57,4,65,'#4b3b5b')+r(63,57,4,65,'#332c4e')+r(27,37,46,17,'#070e20')+r(30,39,40,2,'#74536e')+`<g class="dispatcher-eye">${r(44,42,13,5,'#ff4264')}${r(48,41,5,7,'#ffc0c0')}${r(38,41,25,8,'#ff3043','opacity=".14"')}</g>`+[65,78,91,104].map(y=>r(39,y,20,2,'#5b4563')+r(46,y+3,7,3,'#253750')).join('')+r(20,118,60,10,'#11182b');
}
function city() {
 let seed=128; const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 let out=`<defs><linearGradient id="sky-night" x2="0" y2="1"><stop stop-color="#090e25"/><stop offset=".6" stop-color="#25173e"/><stop offset="1" stop-color="#513450"/></linearGradient><linearGradient id="city-floor" x2="0" y2="1"><stop stop-color="#1a2240"/><stop offset="1" stop-color="#080d1d"/></linearGradient></defs>${r(0,0,960,420,'url(#sky-night)')}`;
 for(let i=0;i<115;i++) out+=r(Math.floor(random()*960),Math.floor(random()*260),i%9===0?2:1,1,i%3===0?'#b3abcc':'#686684');
 out+=p('M736 55H757V58H763V62H766V78H761V85H753V88H737V84H731V78H728V64H731V58H736Z','#a4b4cf','opacity=".6"')+r(739,61,8,5,'#8a8fac')+r(754,74,5,5,'#8a8fac');
 out+='<g class="skyline-layer far-layer">';
 for(let x=-25;x<990;x+=18+Math.floor(random()*17)) { const h=25+Math.floor(random()*95),w=18+Math.floor(random()*21); out+=r(x,280-h,w,h,'#252340')+r(x+4,277-h,w-8,3,'#36304d'); if(h>75)out+=r(x+w/2,257-h,2,24,'#332b46'); for(let y=290-h;y<275;y+=10) if(random()>.6)out+=r(x+5,y,3,4,'#586280'); }
 out+='</g><g class="skyline-layer mid-layer">';
 const offsets=[0,116,229,356,496,610,727,846];
 const heights=[165,211,137,216,179,209,144,223];
 districtArt.forEach((d,i)=>{
   const x=offsets[i];
   out+=`<g class="sky-district" data-sky-district="${i}" style="--district:${d.color}">`;
   out+=building(x+2,heights[i],24,320-heights[i],d.color,'plain',i+5)+building(x+40,heights[i]+22,31,298-heights[i],d.color,'plain',i+2)+building(x+76,heights[i]+47,28,273-heights[i],d.color,'plain',i);
   out+=`<g transform="translate(${x+3} ${heights[i]-65}) scale(.95)">${landmark(d.kind,d.color)}</g>`;
   out+=r(x+67,306,21,16,'#34465b')+r(x+70,310,15,10,'#111e31')+dots(x+70,303,4,C.edge)+`<g class="substation-sparks">${stroke(`M${x+73} 296L${x+70} 307H${x+77}L${x+75} 318`,C.yellow,2)}${r(x+63,307,2,2,'#fff')}${r(x+88,308,3,2,C.cyan)}</g></g>`;
 });
 out+=`<g transform="translate(430 116) scale(1.15)">${controlTower()}</g>`;
 out+=stroke('M0 296Q150 338 271 294Q397 343 489 291Q608 336 756 289Q880 331 960 292','#090e20',2);
 out+='</g><g class="skyline-layer near-layer">';
 out+=p('M0 327H148V344H241V335H378V353H551V338H691V330H822V344H960V420H0Z','url(#city-floor)');
 out+=stroke('M0 327H148V344H241V335H378V353H551V338H691V330H822V344H960','#52617b',3)+stroke('M0 332H144M244 340H374M553 343H686M826 349H960','#212d47',2);
 for(let x=0;x<960;x+=28) out+=r(x,364,25,1,'#283249')+r(x+14,365,1,9,'#202b42')+r(x+8,383,25,1,'#1c2940');
 for(const [x,y] of [[22,306],[592,317],[855,324]])out+=r(x,y,43,22,'#33465d')+r(x+4,y-3,34,4,'#6d7584')+r(x+4,y+5,25,12,'#17283c')+vents(x+6,y+5,8,12)+r(x+33,y+6,6,9,'#233245')+r(x+34,y+8,3,2,C.cyan);
 for(const [x,y] of [[85,310],[291,319],[735,313]])out+=r(x,y,43,18,'#18283d')+r(x+3,y+3,35,12,'#30425b')+dots(x+5,y+5,8,C.cyan)+dots(x+5,y+10,8,C.magenta)+r(x-2,y-2,46,2,C.cyan)+r(x-2,y+18,46,2,'#0e1424');
 out+=r(191,298,3,46,'#6a647b')+r(176,302,30,2,'#6a647b')+stroke('M179 297L203 307M179 307L203 297','#64708b')+p('M412 353V330H420V314H429V333H420V353Z','#425571')+r(870,277,3,45,'#7c6c83')+stroke('M856 284H889M860 294H884','#7c6c83',2);
 out+=`<g class="roof-smoke">${r(410,300,12,8,'#80718b','opacity=".5"')}${r(414,286,17,9,'#80718b','opacity=".25"')}${r(421,272,20,9,'#80718b','opacity=".15"')}</g></g>`;
 out+=`<g class="city-drone" style="--drone-y:0px">${r(191,143,17,5,'#6d7894')}${r(196,148,7,4,C.cyan)}${r(187,139,9,2,C.cyan)}${r(204,139,9,2,C.cyan)}</g><g class="city-drone second-drone">${r(678,101,12,4,'#747491')}${r(683,105,3,2,C.magenta)}${r(674,98,9,1,C.magenta)}${r(688,98,7,1,C.magenta)}</g>`;
 out+=`<g class="city-rain">${Array.from({length:65},(_,i)=>{const x=Math.floor(random()*980),y=Math.floor(random()*420);return stroke(`M${x} ${y}l-3 9`,'#abc4e0',1,`opacity="${i%3===0?.15:.07}"`);}).join('')}</g><g class="sky-lightning">${stroke('M666 0L639 51H661L625 109H647L607 164H630L578 311','#fff1e7',3)}${stroke('M640 110L682 132L673 149','#b6c9ff',2)}</g>${r(0,0,960,420,'#e6edff','class="lightning-flash"')}`;
 return out;
}
const registry:Record<string,{w:number;h:number;draw:()=>string}>={
 city:{w:960,h:420,draw:city},tower:{w:100,h:128,draw:controlTower},dispatcher:{w:128,h:128,draw:dispatcher},pack:{w:76,h:96,draw:pack},
 bolt:{w:64,h:64,draw:()=>p('M35 2L11 35H29L22 62L55 25H37L46 2Z',C.magenta)+p('M35 5L16 32H34L27 53L50 28H33L42 5Z',C.yellow)},
 mascot:{w:64,h:64,draw:()=>itemArt.GPU+p('M36 2L17 32H32L27 58L52 25H37L46 2Z',C.yellow)},
 room:{w:64,h:64,draw:()=>r(9,5,46,52,'#454269')+r(14,10,36,47,'#0f1a30')+r(18,14,28,39,'#25394e')+r(21,18,22,31,'#070f24')+r(38,31,3,4,C.yellow)+r(6,56,52,4,C.cyan)+r(11,10,2,45,C.magenta)},
 coin:{w:64,h:64,draw:()=>p('M21 7H43V12H50V19H55V45H49V52H42V57H21V52H14V46H9V20H14V12H21Z','#b09230')+p('M23 12H41V17H47V23H50V43H44V48H39V52H24V47H18V42H14V24H19V18H23Z',C.yellow)+p('M32 19L23 34H31L27 45L42 28H34L39 19Z','#75601e')},
};
const artCache=new Map<string,string>();
export function sprite(name:string,cls=''):string {
 if(name==='gpu'||name==='psu'||name==='cooling')return itemSprite(name==='gpu'?'GPU':name==='psu'?'Power Supply':'Fan','Rare',cls);
 if(name==='district')return districtSprite(0,'calm',cls);
 const spec=registry[name]??registry.bolt;
 if(!artCache.has(name))artCache.set(name,spec.draw());
 return `<svg class="sprite ${cls}" viewBox="0 0 ${spec.w} ${spec.h}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${artCache.get(name)}</svg>`;
}
/** Standalone markup for canvas PNG sharing; does not depend on document symbols. */
export function standaloneItem(type:string,rarity:string):string {
 const colors:Record<string,string>={Common:'#bdc8dd',Rare:C.cyan,Epic:C.magenta,Legendary:C.yellow,Mythic:'#ff6475'};
 return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" shape-rendering="crispEdges" style="color:${colors[rarity]??colors.Common}">${itemArt[type]??itemArt.GPU}</svg>`;
}
