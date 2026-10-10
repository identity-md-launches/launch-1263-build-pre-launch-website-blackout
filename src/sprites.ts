/** Every illustrated object resolves here. Drop same-named artwork into /assets. */
type SpriteName = 'gpu' | 'cooling' | 'psu' | 'room' | 'pack' | 'mascot' | 'city' | 'tower' | 'bolt' | 'coin' | 'merge' | 'district';
const C = { ink: '#05060F', navy: '#030C39', cyan: '#39E6FF', yellow: '#FFE600', magenta: '#FF3DF2', metal: '#23334a', edge: '#526579' };
const rect = (x: number, y: number, w: number, h: number, fill: string, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const path = (d: string, fill: string, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const line = (x1: number, y1: number, x2: number, y2: number, stroke: string, width = 1) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${stroke}" stroke-width="${width}" fill="none"/>`;
const glyphs: Record<string, string[]> = {
  A: ['01110','11011','11011','11111','11011','11011','11011'], B: ['11110','11011','11011','11110','11011','11011','11110'],
  C: ['01111','11000','11000','11000','11000','11000','01111'], E: ['11111','11000','11000','11110','11000','11000','11111'],
  G: ['01111','11000','11000','11011','11011','11011','01110'], I: ['11111','00100','00100','00100','00100','00100','11111'],
  K: ['11011','11010','11100','11100','11010','11011','11011'], L: ['11000','11000','11000','11000','11000','11000','11111'],
  M: ['11011','11111','11111','10101','11011','11011','11011'], N: ['11011','11111','11111','11011','11011','11011','11011'],
  O: ['01110','11011','11011','11011','11011','11011','01110'], P: ['11110','11011','11011','11110','11000','11000','11000'],
  R: ['11110','11011','11011','11110','11100','11010','11011'], T: ['11111','00100','00100','00100','00100','00100','00100'],
  U: ['11011','11011','11011','11011','11011','11011','01110'], Y: ['11011','11011','01010','00100','00100','00100','00100'],
  D: ['11110','11011','11011','11011','11011','11011','11110'], ' ': ['00000','00000','00000','00000','00000','00000','00000']
};
function pixelText(text: string, x: number, y: number, scale: number, color: string) {
  return [...text].map((letter, i) => (glyphs[letter] ?? glyphs[' ']).map((row, j) => [...row].map((p, k) => p === '1' ? rect(x + (i * 6 + k) * scale, y + j * scale, scale, scale, color) : '').join('')).join('')).join('');
}
function fan(x: number, y: number, color = C.cyan) {
  return `<g transform="translate(${x} ${y})">${path('M-9 -13H9V-9H13V9H9V13H-9V9H-13V-9H-9Z', '#080d1b')}${path('M-8 -11H8V-8H11V8H8V11H-8V8H-11V-8H-8Z', C.edge)}${path('M-6 -9H6V-6H9V6H6V9H-6V6H-9V-6H-6Z', '#0a1523')}<g class="fan-spin">${path('M-2 -8H3V-3H8V2H3V7H-2V2H-7V-3H-2Z', color)}${rect(-3, -3, 6, 6, C.metal)}</g>${rect(-1,-1,2,2,'#b4ecff')}</g>`;
}
function gpu() {
  return `${rect(3, 16, 73, 35, '#071320')}${rect(6, 13, 68, 37, '#35475e')}${rect(8, 16, 64, 30, '#0d1829')}${rect(8, 18, 3, 25, C.cyan)}${rect(73, 19, 5, 33, C.edge)}${rect(75, 23, 2, 12, '#071320')}${rect(13, 49, 45, 5, '#151c29')}${Array.from({length:10},(_,i)=>rect(15+i*4,51,2,5,'#d7bd5a')).join('')}${fan(28, 31)}${fan(56, 31)}${rect(11, 43, 55, 2, C.cyan)}${rect(61, 12, 9, 2, C.cyan)}${rect(8, 16, 2, 2, '#c5f2ff')}${rect(69, 43, 2, 2, '#c5f2ff')}`;
}
const bolt = () => `${path('M43 1L16 35H32L25 63L64 23H45L56 1Z', C.magenta)}${path('M44 3L21 32H37L30 55L58 26H41L51 3Z', C.yellow)}${rect(8,15,3,3,C.yellow)}${rect(66,41,3,3,C.cyan)}${rect(59,54,3,3,C.yellow)}`;
function pack() {
  return `${path('M18 8H76V12H82V109H76V114H18V110H12V12H18Z', '#071728')}${rect(17, 12, 60, 96, '#162642')}${rect(21,17,53,87,'#071322')}${path('M18 12H76V18H18ZM18 104H76V110H18Z', C.cyan)}${rect(18,21,3,80,C.cyan)}${rect(75,21,3,80,C.magenta)}${Array.from({length:12},(_,i)=>rect(19+i*5,8,2,8,'#628198')).join('')}${Array.from({length:12},(_,i)=>rect(19+i*5,109,2,5,'#628198')).join('')}${pixelText('PACK',29,25,1.5,'#b9eaff')}<g transform="translate(9 35)">${gpu()}${bolt()}</g>${rect(29, 99, 4, 2, C.yellow)}${rect(36,99,22,2,'#6d889e')}${rect(61,99,4,2,C.yellow)}${path('M22 20H25V101H22Z','#ffffff10')}`;
}
function cooling() { return `${rect(14,5,51,51,C.edge)}${rect(17,8,45,45,'#102138')}${Array.from({length:7},(_,i)=>rect(19+i*6,8,2,45,'#294e6b')).join('')}<g transform="translate(40 30) scale(1.45)">${fan(0,0)}</g>${rect(19,55,6,6,C.metal)}${rect(54,55,6,6,C.metal)}${rect(67,18,4,28,C.cyan)}`; }
function psu() { return `${rect(11,12,55,41,'#38465d')}${rect(15,16,46,31,'#111e30')}${fan(34,31,'#FFE600')}${rect(52,22,5,12,C.yellow)}${path('M66 27H72V49H77V53H69V32H66Z',C.magenta)}${rect(16,51,45,3,C.cyan)}`; }
function roomArt() { return `${rect(12,6,53,51,'#3c3563')}${rect(17,10,43,47,'#0b1731')}${rect(21,14,36,39,'#142b43')}${rect(25,17,28,30,'#030c20')}${rect(49,29,4,5,C.yellow)}${rect(8,56,61,5,C.cyan)}${rect(18,8,3,46,C.magenta)}${rect(25,19,3,24,C.cyan)}`; }
function tower() { return `${path('M30 6H50V20H57V61H23V20H30Z','#14122e')}${rect(31,2,2,10,C.magenta)}${rect(48,2,2,10,C.cyan)}${rect(25,25,30,10,'#2c2141')}${rect(35,28,11,4,'#ff426d', 'class="tower-eye"')}${rect(38,27,5,6,'#ffa0bb')}${rect(28,42,23,2,'#292550')}${rect(28,48,23,2,'#292550')}`; }
function city() {
  let out = `<defs><linearGradient id="city-sky" x2="0" y2="1"><stop stop-color="#070b24"/><stop offset=".66" stop-color="#241143"/><stop offset="1" stop-color="#35224d"/></linearGradient><linearGradient id="city-haze"><stop stop-color="#39e6ff" stop-opacity=".09"/><stop offset=".6" stop-color="#ff3df2" stop-opacity=".04"/><stop offset="1" stop-color="#ffe600" stop-opacity=".025"/></linearGradient></defs>${rect(0,0,960,360,'url(#city-sky)')}`;
  let seed = 92;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 95; i++) out += rect(Math.floor(rand()*960),Math.floor(rand()*183),i%7===0?2:1,1,i%3?'#78708f':'#c0abc3');
  // Distant silhouette, then midground and foreground: every facade has a pixel grid.
  for (let x = 0; x < 960; x += 19 + Math.floor(rand()*17)) {
    const w=20+Math.floor(rand()*18), h=25+Math.floor(rand()*80);
    out+=rect(x,246-h,w,h,'#131333');
    if (x<530) for(let y=251-h;y<240;y+=8) if(rand()>.35) out+=rect(x+3+Math.floor(rand()*(w-8)),y,2,3,'#334366');
  }
  const buildings = [
    [0,176,45,119],[42,144,46,153],[85,190,36,108],[116,101,55,197],[173,171,45,127],[216,130,48,168],[263,200,43,98],[307,168,48,130],[356,204,43,94],
    [553,204,45,94],[600,174,42,124],[645,147,60,151],[709,204,44,94],[754,123,66,175],[825,189,46,109],[872,149,45,149],[921,192,39,106]
  ];
  buildings.forEach(([x,y,w,h],b) => {
    const alive=x<500;
    out += rect(x,y,w,h,alive?'#101d36':'#0e1025') + rect(x,y,2,h,alive?'#344566':'#28213d') + rect(x+2,y-3,w-2,3,alive?'#5b4677':'#292039');
    out+=rect(x+5,y-8,Math.max(6,w-20),6,'#192641')+line(x+w-8,y-4,x+w-8,y-21,'#4e345c');
    out+=rect(x+w-9,y-23,2,2,b%3===0?'#ff466d':'#3e365b');
    out+=rect(x+w-6,y+4,3,h-7,alive?'#243452':'#17182e');
    for(let wy=y+9;wy<y+h-6;wy+=12) for(let wx=x+7;wx<x+w-9;wx+=9) {
      const lit=alive&&rand()>.26, color=lit?(rand()>.36?C.cyan:'#e7d06a'):'#19253c';
      out+=rect(wx,wy,4,6,color,lit&&b%3===0?`class="${b===3?'city-grid-hit':'city-window'}"`:'');
      if(lit) out+=rect(wx-1,wy-1,6,8,color,'opacity=".075"');
    }
    if(alive) out+=rect(x+4,y+h-30,w-12,2,'#2e3b54');
  });
  // GPU racks visible through a cyan-lit glass front.
  out+=rect(178,211,75,75,'#265171')+rect(183,216,65,64,'#071624');
  for(let r=0;r<4;r++) for(let c=0;c<3;c++) out+=`<g transform="translate(${185+c*20} ${220+r*13}) scale(.23)">${gpu()}</g>`;
  out+=rect(179,210,2,79,C.cyan)+rect(248,210,2,79,C.cyan)+rect(179,210,72,2,C.magenta);
  // Neon signage is made of pixels, not external text or bitmaps.
  out+=rect(22,184,73,18,'#102335')+pixelText('CRYPTO',27,189,1.6,C.cyan);
  out+=rect(123,127,20,69,'#192436')+pixelText('M',128,132,1.5,C.yellow)+pixelText('I',128,147,1.5,C.yellow)+pixelText('N',128,162,1.5,C.yellow)+pixelText('E',128,177,1.5,C.yellow);
  out+=rect(269,225,53,20,'#15223b')+pixelText('GPU',277,230,1.5,C.magenta);
  out+=rect(52,244,62,20,'#15223b')+pixelText('PACK',58,250,1.2,C.yellow);
  out+=rect(182,189,72,16,'#192436')+pixelText('MINING',187,193,1.35,C.cyan);
  // Swarm control tower, just off the main wordmark's axis.
  out+=rect(449,248,54,49,'#14122e')+`<g transform="translate(414 168) scale(1.55)">${tower()}</g>`;
  out+=rect(452,148,2,38,'#2d2850')+rect(450,144,6,4,'#ff466d');
  for(let y=265;y<292;y+=10) out+=rect(457,y,38,2,'#292550');
  // Dark grid, sagging utility wires, substation and a single lightning strike.
  for(const x of [675,788,917]) out+=rect(x,237,5,65,'#070e1c')+rect(x-17,237,37,3,'#42415b')+rect(x-11,233,3,7,'#615271')+rect(x+9,233,3,7,'#615271');
  out+='<path d="M661 238Q722 283 777 238M679 240Q741 271 806 239M797 238Q860 278 928 238" stroke="#080c19" stroke-width="2" fill="none"/>';
  out+=rect(823,269,43,28,'#222336')+rect(828,273,33,18,'#0a1122');
  for(let i=0;i<4;i++) out+=rect(830+i*8,264,3,17,'#4d3a58');
  out+=`<g class="city-lightning">${path('M839 97L814 156H833L811 207H835L823 272L856 199H836L858 146H837L852 97Z',C.magenta)}${path('M840 100L820 152H839L818 203H841L828 261L850 204H830L852 150H831L846 100Z',C.yellow)}${rect(814,278,4,2,C.yellow)}${rect(863,262,3,3,C.yellow)}${rect(844,257,2,4,C.cyan)}</g>`;
  out+=rect(0,246,960,58,'url(#city-haze)');
  // Rooftop foreground: brick ledges, pipes, AC, conduits, and floor tiles.
  out+=rect(0,297,960,63,'#060c18')+rect(0,297,960,4,'#303148')+rect(0,301,960,3,'#10172b');
  for(let x=0;x<960;x+=31) out+=rect(x,308,28,1,'#151c2b')+rect(x+15,310,1,10,'#101b2c');
  for(let x=0;x<960;x+=48) out+=line(480+(x-480)*.75,322,x,360,'#132033');
  out+=line(0,334,960,334,'#142137')+line(0,352,960,352,'#111b2d');
  out+=rect(30,278,62,22,'#2c3d50')+rect(35,274,52,5,'#4d5570')+rect(36,284,33,11,'#111b2b');
  for(let i=0;i<5;i++) out+=rect(39+i*6,284,2,11,'#586177');
  out+=rect(74,282,10,12,'#19293e')+rect(77,285,4,4,C.cyan);
  out+=path('M109 303V285H125V261H135V292H118V303Z','#263b51')+path('M111 302V288H128V262H131V291H114V302Z','#405875');
  out+=rect(886,284,44,19,'#202c40')+rect(891,281,34,3,'#49546a');
  out+=line(747,312,878,312,'#4c2555',2)+line(878,312,878,292,'#4c2555',2);
  return out;
}
const registry: Record<SpriteName, { width: number; height: number; draw: () => string }> = {
  district:{width:80,height:64,draw:()=>[12,28,47,63].map((x,i)=>{const h=[27,44,35,20][i];return rect(x,59-h,14,h,'#162c42')+rect(x,57-h,14,2,'#4c667c')+Array.from({length:Math.floor(h/8)},(_,j)=>rect(x+3,62-h+j*8,3,3,'#39e6ff88')+rect(x+9,62-h+j*8,3,3,'#8ac9da66')).join('');}).join('')},
  gpu: {width:80,height:64,draw:gpu}, cooling:{width:80,height:64,draw:cooling}, psu:{width:80,height:64,draw:psu}, room:{width:80,height:64,draw:roomArt},
  pack:{width:100,height:120,draw:pack}, mascot:{width:80,height:64,draw:()=>gpu()+bolt()}, city:{width:960,height:360,draw:city}, tower:{width:80,height:64,draw:tower}, bolt:{width:80,height:64,draw:bolt},
  coin:{width:80,height:64,draw:()=>path('M26 8H54V14H62V50H54V56H26V50H18V14H26Z','#967e25')+path('M29 12H51V18H57V46H51V52H29V46H23V18H29Z',C.yellow)+path('M39 18H46L36 32H44L33 47L36 35H30Z','#554627')},
  merge:{width:80,height:64,draw:()=>rect(9,18,16,16,C.cyan)+rect(54,18,16,16,C.magenta)+path('M27 35H34V42H45V35H52L40 54Z',C.yellow)}
};
const overrides = import.meta.glob<string>('../assets/*.{svg,png,webp}', {eager:true,query:'?url',import:'default'});
const cache = new Map<SpriteName,string>();
export function sprite(name: SpriteName, className = ''): string {
  const asset = Object.entries(overrides).find(([p]) => p.split('/').pop()?.split('.')[0] === name)?.[1];
  if(asset) return `<img class="sprite ${className}" src="${asset}" alt="" aria-hidden="true" draggable="false" />`;
  const spec=registry[name];
  if(!cache.has(name)) cache.set(name,spec.draw());
  return `<svg class="sprite ${className}" viewBox="0 0 ${spec.width} ${spec.height}" fill="none" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${cache.get(name)}</svg>`;
}
export const itemSprite = (type: string, cls = '') => sprite(({GPU:'gpu',Cooling:'cooling',PSU:'psu',Room:'room'} as Record<string,SpriteName>)[type] ?? 'gpu', cls);
