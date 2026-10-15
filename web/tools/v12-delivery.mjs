import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync,statSync,lstatSync,readdirSync,mkdirSync} from 'node:fs';
import {join,relative,resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {repo} from './deps.mjs';
const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8'});
const excluded=p=>p.startsWith('.imd/')||p.startsWith('test/scratch/')||p.startsWith('.playwright-mcp/');
const files=[...new Set([...git('ls-files','-z').split('\0'),...git('ls-files','--others','--exclude-standard','-z').split('\0')])].filter(p=>p&&!excluded(p)&&existsSync(join(repo,p))&&statSync(join(repo,p)).isFile()).sort();
assert(files.includes('dist/index.html'));
for(const path of files){
 assert(!/(^|\/)(node_modules|\.npm|\.cache|\.vite|\.playwright-mcp)(\/|$)/.test(path),`Cache/dependencies in submission: ${path}`);
 assert(!/\.(tgz|tar\.gz|deb)$/.test(path),`Unnecessary archive in submission: ${path}`);
 assert(!lstatSync(join(repo,path)).isSymbolicLink(),`Symlink in submission: ${path}`);
}
assert(!git('ls-files','--stage').split('\n').some(line=>line.startsWith('160000 ')),'Submodule found');
const protectedPaths=['foundry.toml','foundry.lock','remappings.txt','.gitmodules','lib','package.json','package-lock.json','yarn.lock','pnpm-lock.yaml','.github','.env','node_modules','vite.config.mjs','vitest.config.mjs','tsconfig.json','web/package.json','web/package-lock.json','web/tsconfig.json','web/src/wallet.ts','web/src/packs.ts','web/src/proofs.ts','web/src/abi.json','public/free-tree.json','public/starter-tree.json','web/data/starter-snapshot.json','web/data/abi-provenance.json'];
assert.equal(git('diff','--name-only','HEAD','--',...protectedPaths).trim(),'','Protected build/dependency paths changed');
assert(existsSync(join(repo,'artifacts/PATH-BUDGET.md')),'Explicit ignore path budget missing');
const artifactBytes=files.filter(p=>p.startsWith('artifacts/')).reduce((n,p)=>n+statSync(join(repo,p)).size,0);
assert(artifactBytes<=4194304,`Artifact budget exceeded: ${artifactBytes}`);
const budgets=[{name:'review documents',limit:35000,test:p=>['artifacts/PATH-BUDGET.md','artifacts/validation.md'].includes(p)},{name:'screenshots',limit:2700000,test:p=>p.startsWith('artifacts/screenshots/')},{name:'recordings',limit:1250000,test:p=>p.startsWith('artifacts/recordings/')},{name:'JSON evidence',limit:209304,test:p=>/^artifacts\/v1[12]\//.test(p)}].map(b=>({name:b.name,limit:b.limit,bytes:files.filter(b.test).reduce((n,p)=>n+statSync(join(repo,p)).size,0)}));
for(const b of budgets)assert(b.bytes<=b.limit,`${b.name} path budget exceeded: ${b.bytes} > ${b.limit}`);
for(const rarity of ['common','rare','epic','legendary','mythic'])for(const mode of ['single','bulk'])assert(files.includes(`artifacts/recordings/${rarity}-${mode}.webm`),`Missing ${rarity} ${mode} recording`);
for(const route of ['home','packs','farm','rewards','leaderboard','city','season','billboards','more','docs','contracts','wallet'])for(const width of [375,1440])assert(files.includes(`artifacts/screenshots/${route}-${width}.webp`),`Missing ${route} screenshot at ${width}`);

for(const path of ['public/starter-tree.json','public/free-tree.json','web/package.json','web/package-lock.json','README.md','DESIGN.md'])assert(files.includes(path),`Missing deliverable ${path}`);
assert(!files.some(p=>/^dist\/freepack(?:\/|\.|$)/.test(p)),'The separate freepack route must not be exported');
const html=readFileSync(join(repo,'dist/index.html'),'utf8');
for(const tag of ['<title>','name="description"','property="og:title"','property="og:image"','rel="icon"'])assert(html.includes(tag),`Missing metadata ${tag}`);
let localReferences=0;
function checkReference(path,reference){
 if(/^(?:data:|https?:|#)/.test(reference))return;
 assert(!reference.startsWith('/'),`Absolute runtime asset URL in ${path}: ${reference}`);
 const file=resolve(dirname(join(repo,path)),reference.split(/[?#]/)[0]);assert(existsSync(file),`Missing asset ${reference} from ${path}`);localReferences++;
}
for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g))checkReference('dist/index.html',m[1]);
for(const m of html.matchAll(/url\(["']?([^)'"\s]+)["']?\)/g))checkReference('dist/index.html',m[1]);
for(const path of files.filter(p=>p.startsWith('dist/')&&p.endsWith('.css'))){for(const m of readFileSync(join(repo,path),'utf8').matchAll(/url\(["']?([^)'"\s]+)["']?\)/g))checkReference(path,m[1]);}
assert.equal(readFileSync(join(repo,'public/starter-tree.json'),'utf8'),readFileSync(join(repo,'dist/starter-tree.json'),'utf8'));
assert.equal(readFileSync(join(repo,'public/free-tree.json'),'utf8'),readFileSync(join(repo,'dist/free-tree.json'),'utf8'));
const byPath=Object.fromEntries(files.map(p=>[p,statSync(join(repo,p)).size]));
const total=Object.values(byPath).reduce((a,b)=>a+b,0);
// Git submission size is measured by bundle-trial; raw duplicated proof files do not set that limit.
const groups={};for(const [p,n]of Object.entries(byPath))groups[p.split('/')[0]]=(groups[p.split('/')[0]]||0)+n;
const distFiles=files.filter(p=>p.startsWith('dist/'));
const hashes=Object.fromEntries(distFiles.map(p=>[p,createHash('sha256').update(readFileSync(join(repo,p))).digest('hex')]));
const report={checkedAt:new Date().toISOString(),limitBytes:8388608,currentFileBytes:total,fileCount:files.length,groups,productionBytes:groups.dist,relativeLocalReferencesChecked:localReferences,protectedPathsUnchanged:true,artifactBytes,artifactBudget:4194304,budgets,submodules:0,dependencyAndCacheDirectoriesIncluded:0,distSha256:hashes,note:'Current tracked and nonignored candidate files; deleted or replaced paths excluded. Complete current-file temporary Git bundle is measured separately in bundle-trial.json. Final publisher metadata is outside this worker.'};
mkdirSync(join(repo,'artifacts/v12'),{recursive:true});writeFileSync(join(repo,'artifacts/v12/delivery.json'),JSON.stringify(report,null,2)+'\n');
console.log(`PASS ${files.length} current files, ${total} raw bytes; dist ${groups.dist} bytes; local assets and protected paths verified.`);
