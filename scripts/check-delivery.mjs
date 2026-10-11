import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const root=resolve('.');
const excludedRoots=new Set(['.git','.github','.imd','.agents','.aws','.codex','.playwright-mcp']);
const generatedNames=new Set(['node_modules','.vite','.cache','.npm','__pycache__','playwright-report','test-results']);
const files=[];
async function walk(directory) {
  for(const entry of await readdir(directory,{withFileTypes:true})) {
    const path=join(directory,entry.name),name=relative(root,path).replaceAll('\\','/');
    if((directory===root&&(excludedRoots.has(entry.name)||entry.name.startsWith('.env')))||name==='test/scratch')continue;
    if(entry.isSymbolicLink())throw new Error(`Unexpected symlink in submission: ${name}`);
    if(generatedNames.has(entry.name)||/\.(tgz|tar|zip|log)$/.test(entry.name))throw new Error(`Remove generated packaging/dependency data: ${name}`);
    if(entry.isDirectory())await walk(path);else files.push(name);
  }
}
await walk(root);
for(const required of ['dist/index.html','dist/og.png','dist/favicon.svg','package.json','package-lock.json','DESIGN.md','README.md','reports/validation.md', 'reports/tabs-validation.md', 'reports/tabs-results.json', 'docs.md', 'CHANGELOG.md', 'reports/publication.md']) {
  if(!files.includes(required))throw new Error(`Missing required deliverable: ${required}`);
}
const html=await readFile('dist/index.html','utf8');
if(!html.includes('og:title')||!html.includes('og:image')||!html.includes('name="description"'))throw new Error('Missing social metadata');
for(const [,url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  if(url.startsWith('http'))continue;
  if(!url.startsWith('./'))throw new Error(`Export URL is not relative: ${url}`);
  await stat(join('dist',url));
}
const png=await readFile('dist/og.png');
if(png.readUInt32BE(16)!==1200||png.readUInt32BE(20)!==630)throw new Error('OG dimensions must be 1200×630');
const reportPath='reports/bundle-budget.json';
if(!files.includes(reportPath))files.push(reportPath);
let report={};
await writeFile(reportPath,'{}\n');
// Iterate because this accounting file is itself part of the submitted bytes.
for(let i=0;i<5;i++) {
  const entries=await Promise.all(files.map(async path=>({path,bytes:(await stat(path)).size})));
  const total=entries.reduce((sum,f)=>sum+f.bytes,0);
  if(total>=8_388_608)throw new Error(`Submission files exceed 8 MiB: ${total}`);
  const distFiles=entries.filter(f=>f.path.startsWith('dist/'));
  report={limitBytes:8_388_608,deliverableFileCount:entries.length,deliverableBytes:total,headroomBytes:8_388_608-total,distFileCount:distFiles.length,distBytes:distFiles.reduce((sum,f)=>sum+f.bytes,0),excluded:['Protected Git/configuration paths','Pinned .imd inputs','test/scratch','Temporary .playwright-mcp browser files'],notes:'Raw source, export, documentation and evidence bytes, including this report. No Git metadata was touched. This is not a measurement of a worker-created Git bundle.',exportHashes:await Promise.all(distFiles.map(async f=>({path:f.path,sha256:createHash('sha256').update(await readFile(f.path)).digest('hex')})))};
  await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify(report,null,2));
