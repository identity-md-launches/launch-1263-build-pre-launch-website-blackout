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
  return `${rect(3, 16, 73, 35, '#071320')}${rect(6, 13, 68, 37, '#35475e')}${rect(8, 16, 64, 30, '#0d1829')}${rect(8, 18, 3, 25, C.cyan)}${rect(73, 19, 5, 33, C.edge)}${rect(75, 23, 2, 12, '#071320')}${rect(13, 49, 45, 5, '#151c29')}${Array.from({length:10},(_,i)=>rect(15+i*4,51,2,5,'#d7bd5a')).join('')}${fan(28, 31)}${fan(56, 31)}${rect(11, 43, 55, 2, C.cyan)}${rect(61, 12, 9, 2, C.cyan, 'class="gpu-led"')}${rect(8, 16, 2, 2, '#c5f2ff')}${rect(69, 43, 2, 2, '#c5f2ff')}`;
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
/** Item sprites have distinct silhouettes and five hand-drawn pixel treatments.
 * They stay code-native SVG: all sixty variations ship without image downloads.
 * Rarity is also written beside the art in the UI; color is never its only label.
 */
const itemPalettes = {
  Common: { light: '#a7bdcc', dark: '#26384a', shine: '#e0e9ed', rank: 0 },
  Rare: { light: '#39E6FF', dark: '#154c63', shine: '#d5faff', rank: 1 },
  Epic: { light: '#FF3DF2', dark: '#53214f', shine: '#ffcefb', rank: 2 },
  Legendary: { light: '#FFE600', dark: '#554c20', shine: '#fff7b3', rank: 3 },
  Mythic: { light: '#FF5268', dark: '#592435', shine: '#ffd1d7', rank: 4 },
} as const;
type ItemPalette = (typeof itemPalettes)[keyof typeof itemPalettes];
const pins = (x: number, y: number, count: number, step = 4) => Array.from({ length: count }, (_, i) => rect(x + i * step, y, 2, 5, '#c2ab65')).join('');
const vents = (x: number, y: number, count: number, height: number, step = 5) => Array.from({ length: count }, (_, i) => rect(x + i * step, y, 2, height, '#070e1c')).join('');
const screws = (x: number, y: number, w: number, h: number) => [[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([px,py])=>rect(px,py,2,2,'#9cabb8')).join('');
const chip = (x: number, y: number, size: number, p: ItemPalette) =>
  rect(x-2,y-2,size+4,size+4,p.dark)+rect(x,y,size,size,'#080e1c')+rect(x+2,y+2,size-4,size-4,p.light)+rect(x+4,y+4,size-8,size-8,p.dark);
const itemDrawers: Record<string, (p: ItemPalette) => string> = {
  GPU: p => rect(5,16,68,33,'#3d5063')+rect(8,19,62,26,'#111c2b')+rect(3,14,3,37,p.light)+rect(72,21,5,30,'#657589')+
    fan(26,32,p.light)+fan(55,32,p.light)+rect(11,47,48,4,p.dark)+pins(14,51,11)+rect(10,17,53,2,p.light)+rect(64,13,6,4,p.shine)+
    (p.rank>1?rect(14,44,48,2,p.light):'')+(p.rank>2?rect(39,19,3,26,p.light):'')+(p.rank>3?path('M40 21H45L41 29H46L38 42L40 32H35Z',p.shine):''),
  ASIC: p => path('M13 17H56V12H67V47H57V53H13Z','#35495e')+rect(16,20,42,29,p.dark)+rect(59,17,6,28,'#111b2a')+
    fan(34,34,p.light)+vents(60,22,2,17,3)+rect(16,47,40,3,p.light)+rect(18,54,7,4,'#61738a')+rect(48,54,7,4,'#61738a')+
    rect(19,15,4,4,p.shine)+rect(26,15,4,4,p.rank?'#39e6ff':p.light)+rect(57,10,3,5,p.light)+
    (p.rank>0?rect(51,23,4,4,p.light):'')+(p.rank>1?rect(51,29,4,4,p.light):'')+(p.rank>2?rect(51,35,4,4,p.light):'')+(p.rank>3?rect(51,41,4,4,p.shine):''),
  FPGA: p => path('M12 12H64V18H69V48H62V53H12Z','#27494d')+rect(15,15,48,34,'#142b31')+
    path('M17 24H26V20H49V24H59M17 40H26V44H49V40H59M22 16V48M55 16V48','none',`stroke="${p.light}" stroke-width="2"`)+
    chip(29,22,20,p)+pins(18,53,10)+rect(64,22,6,19,'#677586')+screws(15,15,44,31)+
    (p.rank>0?rect(18,28,6,8,p.dark)+rect(20,30,2,4,p.light):'')+(p.rank>1?rect(54,28,6,8,p.dark)+rect(56,30,2,4,p.light):'')+
    (p.rank>2?rect(34,16,10,3,p.shine):'')+(p.rank>3?rect(36,28,6,8,p.shine):''),
  'Power Supply': p => path('M11 17H58L69 25V53H20L11 46Z','#3c4a5c')+rect(15,20,42,26,'#101c2b')+
    fan(33,33,p.light)+rect(59,28,7,17,p.dark)+rect(61,32,3,9,p.shine)+rect(19,49,44,3,p.light)+
    path('M66 45H72V56H77V60H69V49H66Z',p.light)+rect(17,15,37,3,'#718394')+
    (p.rank>0?rect(48,24,6,3,p.light):'')+(p.rank>1?rect(48,30,6,3,p.light):'')+(p.rank>2?rect(48,36,6,3,p.light):'')+(p.rank>3?rect(25,12,26,3,p.shine):''),
  Battery: p => rect(24,7,9,5,'#7a8e9e')+rect(48,7,9,5,'#7a8e9e')+path('M21 12H60V17H64V53H59V57H21V53H17V17H21Z','#3e5263')+
    rect(21,17,39,35,p.dark)+rect(21,17,3,35,p.light)+rect(57,17,3,35,p.light)+path('M40 22H48L42 32H49L33 48L37 36H30Z',p.light)+
    rect(25,20,8,2,p.shine)+rect(28,17,2,8,p.shine)+rect(49,20,7,2,p.shine)+rect(25,54,31,3,p.light)+
    (p.rank>0?rect(20,10,13,2,p.light):'')+(p.rank>1?rect(46,10,13,2,p.light):'')+(p.rank>2?rect(29,47,24,2,p.shine):'')+(p.rank>3?rect(14,23,3,23,p.light)+rect(64,23,3,23,p.light):''),
  'Solar Panel': p => path('M20 8H69L60 44H11Z','#5b6d84')+path('M23 11H65L58 40H15Z',p.dark)+
    [0,1,2].map(row=>[0,1,2,3].map(col=>path(`M${24+col*10-row*2} ${13+row*9}H${31+col*10-row*2}L${29+col*10-row*2} ${20+row*9}H${22+col*10-row*2}Z`,p.light,`opacity="${.42+row*.18}"`)).join('')).join('')+
    path('M33 44H39V53H52V57H21V53H33Z','#697b8d')+rect(11,43,49,3,p.light)+
    (p.rank>0?rect(10,10,3,3,p.light):'')+(p.rank>1?rect(6,15,3,3,p.shine):'')+(p.rank>2?rect(68,48,3,3,p.light)+rect(71,44,3,3,p.light):'')+
    (p.rank>3?rect(70,8,3,16,p.shine)+rect(65,14,13,3,p.shine):''),
  Fan: p => path('M18 9H62V13H66V51H62V55H18V51H14V13H18Z','#52667a')+rect(19,14,42,36,p.dark)+
    `<g transform="translate(40 32) scale(1.35)">${fan(0,0,p.light)}</g>`+screws(18,13,42,36)+rect(20,53,39,3,p.light)+
    (p.rank>0?rect(14,19,3,25,p.light):'')+(p.rank>1?rect(63,19,3,25,p.light):'')+(p.rank>2?rect(23,8,33,3,p.shine):'')+
    (p.rank>3?rect(9,23,3,17,p.light)+rect(68,23,3,17,p.light):''),
  'Liquid Cooling': p => rect(8,11,26,41,'#456077')+rect(11,14,20,35,p.dark)+vents(13,17,4,28,5)+
    path('M32 20H45V14H67V40H63V19H50V25H32Z',p.light)+path('M32 43H45V52H67V39H63V48H49V39H32Z',p.light)+
    path('M50 26H65V30H70V42H65V46H50V42H46V30H50Z','#4c6179')+rect(50,30,15,12,p.dark)+rect(54,33,7,6,p.light)+
    rect(8,12,3,37,p.light)+screws(12,13,16,35)+(p.rank>0?rect(35,18,7,2,p.shine):'')+(p.rank>1?rect(35,43,7,2,p.shine):'')+
    (p.rank>2?rect(55,25,6,3,p.shine):'')+(p.rank>3?rect(52,31,11,2,p.shine)+rect(55,37,6,4,p.shine):''),
  Router: p => rect(18,9,3,27,'#697d91')+rect(59,9,3,27,'#697d91')+rect(17,7,5,7,p.light)+rect(58,7,5,7,p.light)+
    path('M14 32H63L70 40V52H10V39Z','#3c536d')+rect(14,40,52,9,'#0c172a')+rect(17,43,4,3,p.light)+rect(25,43,4,3,p.shine)+
    rect(33,43,4,3,p.light)+rect(50,42,11,5,p.dark)+rect(17,51,6,4,'#75889a')+rect(56,51,6,4,'#75889a')+vents(27,32,6,4,5)+
    (p.rank>0?path('M10 16H7V26H10M71 16H74V26H71','none',`stroke="${p.light}" stroke-width="2"`):'')+
    (p.rank>1?rect(38,25,3,7,p.light):'')+(p.rank>2?rect(36,21,7,4,p.shine):'')+(p.rank>3?rect(3,20,2,4,p.shine)+rect(76,20,2,4,p.shine):''),
  Motherboard: p => rect(15,7,50,51,'#34605d')+rect(18,10,44,45,'#122e32')+chip(25,20,22,p)+
    rect(50,15,3,24,p.light)+rect(56,15,3,24,p.light)+rect(24,47,33,3,p.dark)+rect(24,52,33,2,p.light)+
    path('M21 12V42H47V44H61M21 17H46V12H60','none',`stroke="${p.light}" stroke-width="1"`)+
    rect(10,14,6,11,'#81949f')+rect(10,29,6,16,'#718390')+screws(18,10,42,43)+rect(24,12,7,4,p.shine)+
    (p.rank>0?rect(47,41,12,3,p.light):'')+(p.rank>1?rect(20,47,2,7,p.shine):'')+(p.rank>2?rect(32,27,8,8,p.shine):'')+(p.rank>3?rect(65,18,3,28,p.light):''),
  'Server Rack': p => rect(22,5,37,53,'#506378')+rect(26,9,29,45,'#091421')+
    [0,1,2,3].map(i=>rect(28,11+i*10,25,8,p.dark)+rect(30,13+i*10,3,3,p.light)+vents(37,13+i*10,4,4,4)).join('')+
    rect(20,57,8,4,'#6d7f92')+rect(53,57,8,4,'#6d7f92')+rect(23,9,2,45,p.light)+screws(24,6,30,48)+
    (p.rank>0?rect(56,12,2,8,p.light):'')+(p.rank>1?rect(56,23,2,8,p.light):'')+(p.rank>2?rect(56,34,2,8,p.light):'')+(p.rank>3?rect(28,4,24,3,p.shine)+rect(56,45,2,8,p.shine):''),
  'Surge Protector': p => path('M11 24H61V20H66V28H69V43H64V47H12V43H8V28H11Z','#506078')+
    rect(12,28,51,14,p.dark)+[0,1,2].map(i=>rect(17+i*13,30,9,10,'#0a1423')+rect(19+i*13,32,2,3,p.light)+rect(23+i*13,32,2,3,p.light)+rect(21+i*13,37,2,2,'#8195a8')).join('')+
    rect(57,30,4,9,p.light)+path('M65 34H74V19H65V15H78V38H69Z',p.light)+rect(59,11,8,9,'#718294')+rect(59,6,2,7,'#b1bec9')+rect(64,6,2,7,'#b1bec9')+
    (p.rank>0?rect(14,24,39,2,p.light):'')+(p.rank>1?rect(15,44,43,2,p.light):'')+(p.rank>2?path('M7 8H13L10 14H15L6 24L8 17H3Z',p.light):'')+
    (p.rank>3?rect(15,15,3,3,p.shine)+rect(1,29,3,3,p.shine):''),
};
function itemTreatment(p: ItemPalette): string {
  // Pixel halos and rank pips survive tiny inventory thumbnails without filters.
  let out = p.rank ? rect(8,8,64,48,p.light,'opacity=".055"')+rect(14,4,52,56,p.light,'opacity=".035"') : '';
  if(p.rank>1) out+=rect(5,13,2,5,p.light)+rect(73,48,2,5,p.light);
  if(p.rank>2) out+=path('M5 5H11V7H7V11H5ZM69 5H75V11H73V7H69Z',p.light);
  if(p.rank>3) out+=path('M3 49H5V55H11V57H3ZM69 57H77V49H75V55H69Z',p.shine)+rect(2,35,2,3,p.light)+rect(75,28,2,3,p.light);
  return out;
}
const itemCache = new Map<string, string>();
export function itemSprite(type: string, rarity = 'Common', cls = ''): string {
  if(type === 'Room') return sprite('room', cls);
  const normalized = type === 'Cooling' ? 'Fan' : type === 'PSU' ? 'Power Supply' : type;
  const rarityName = Object.prototype.hasOwnProperty.call(itemPalettes, rarity) ? rarity as keyof typeof itemPalettes : 'Common';
  const p = itemPalettes[rarityName];
  const kind = Object.prototype.hasOwnProperty.call(itemDrawers, normalized) ? normalized : 'GPU';
  const key = `${kind}:${rarityName}`;
  if(!itemCache.has(key)) {
    const rankPips = Array.from({length:p.rank+1},(_,i)=>rect(35-p.rank*3+i*6,61,4,2,p.light)).join('');
    itemCache.set(key,itemTreatment(p)+itemDrawers[kind](p)+rankPips);
  }
  const safeClass = cls.replace(/["<>&]/g,'');
  return `<svg class="sprite item-sprite ${rarityName.toLowerCase()} ${safeClass}" viewBox="0 0 80 64" fill="none" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${itemCache.get(key)}</svg>`;
}
