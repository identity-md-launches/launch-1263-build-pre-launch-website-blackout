import { install, repo, toolchain, resolveTool, checkTools } from './deps.mjs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const action=process.argv[2]||'build';
if(action==='install') { await install(); process.exit(0); }
checkTools();
const configPath=join(toolchain,'tsconfig.blackout.json');
const cfg=JSON.parse(readFileSync(join(repo,'web/tsconfig.json'),'utf8'));
cfg.compilerOptions.baseUrl=repo;
cfg.compilerOptions.paths={ 'viem':[join(toolchain,'node_modules/viem')], 'viem/*':[join(toolchain,'node_modules/viem/*')], '@wagmi/core':[join(toolchain,'node_modules/@wagmi/core')], '@wagmi/connectors':[join(toolchain,'node_modules/@wagmi/connectors')] };
cfg.include=[join(repo,'web/src/**/*.ts')];
writeFileSync(configPath,JSON.stringify(cfg));
function check() {const r=spawnSync(process.execPath,[resolveTool('typescript/bin/tsc'),'--project',configPath],{cwd:repo,stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
if(action==='typecheck') {check();process.exit(0);}
if(action==='snapshot') {await import('./snapshot.mjs');process.exit(0);}
if(action==='trees') {await import('./trees.mjs');process.exit(0);}
const esmAliases=Object.fromEntries(['viem','@wagmi/core','@wagmi/connectors'].map(name=>{const p=JSON.parse(readFileSync(join(toolchain,'node_modules',name,'package.json'),'utf8'));return[name,join(toolchain,'node_modules',name,p.exports['.'].import||p.exports['.'].default)];}));
if(action==='check-live'||action==='test') {
 const runtimeCfg={...cfg,compilerOptions:{...cfg.compilerOptions,paths:Object.fromEntries(Object.entries(esmAliases).map(([key,value])=>[key,[value]]))}};
 const runtimePath=join(toolchain,'tsconfig.runtime.json');writeFileSync(runtimePath,JSON.stringify(runtimeCfg));
 const r=spawnSync(process.execPath,[resolveTool('tsx/cli'),join(repo,'web/tools',action==='check-live'?'check-live.ts':'interactions.ts')],{cwd:repo,stdio:'inherit',env:{...process.env,TSX_TSCONFIG_PATH:runtimePath,BLACKOUT_TOOLCHAIN:toolchain}});process.exit(r.status??1);
}
const vite=await import(pathToFileURL(resolveTool('vite')));
const aliases=Object.entries(esmAliases).map(([find,replacement])=>({find:new RegExp('^'+find.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$'),replacement}));
const options={ root:repo,configFile:false,base:'./',resolve:{alias:aliases},build:{outDir:'dist',emptyOutDir:true,target:'es2022',sourcemap:false,assetsInlineLimit:0,chunkSizeWarningLimit:700} };
if(action==='build') { check(); const provenance=JSON.parse(readFileSync(join(repo,'web/data/abi-provenance.json'),'utf8')); assert.equal(createHash('sha256').update(readFileSync(join(repo,'web/src/abi.json'))).digest('hex'),provenance.sha256,'ABI digest differs from the pinned build'); await import('./trees.mjs'); await vite.build(options); }
else if(action==='preview') { const server=await vite.preview({...options,preview:{host:'127.0.0.1',port:4173}});server.printUrls(); }
else if(action==='dev') {const server=await vite.createServer({...options,server:{host:'127.0.0.1',port:5173}});await server.listen();server.printUrls();}
else throw Error(`Unknown action: ${action}`);
