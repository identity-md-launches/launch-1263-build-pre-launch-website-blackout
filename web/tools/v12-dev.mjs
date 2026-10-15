// Development server with all generated optimizer state outside the repository.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {repo,toolchain,resolveTool,checkTools} from './deps.mjs';
checkTools();
const vite=await import(pathToFileURL(resolveTool('vite')).href);
const alias=['viem','@wagmi/core','@wagmi/connectors'].map(name=>{const p=JSON.parse(readFileSync(join(toolchain,'node_modules',name,'package.json'),'utf8'));return {find:new RegExp('^'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$'),replacement:join(toolchain,'node_modules',name,p.exports['.'].import||p.exports['.'].default)};});
const server=await vite.createServer({root:repo,configFile:false,base:'./',resolve:{alias},cacheDir:join(toolchain,'v12-vite-cache'),server:{host:'127.0.0.1',port:5173}});
await server.listen();server.printUrls();
console.log('Visual rehearsal: http://127.0.0.1:5173/?pack-lab=1#/packs (DEV only; synthetic items, no transactions).');
