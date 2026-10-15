// Runs TypeScript validation with the existing, locked external toolchain.
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {repo,toolchain,resolveTool,checkTools} from './deps.mjs';
checkTools();
const cfg=JSON.parse(readFileSync(join(repo,'web/tsconfig.json'),'utf8'));
cfg.compilerOptions.baseUrl=repo;
cfg.compilerOptions.paths=Object.fromEntries(['viem','@wagmi/core','@wagmi/connectors'].map(name=>{const p=JSON.parse(readFileSync(join(toolchain,'node_modules',name,'package.json'),'utf8'));return[name,[join(toolchain,'node_modules',name,p.exports['.'].import||p.exports['.'].default)]];}));
const path=join(toolchain,'v11-test-tsconfig.json');writeFileSync(path,JSON.stringify(cfg));
const targets={reliability:'v11-reliability.ts',live:'v11-live.ts',prerender:'v11-prerender.ts'};
const target=targets[process.argv[2]||'reliability'];if(!target)throw Error('Choose reliability, live or prerender.');
const r=spawnSync(process.execPath,[resolveTool('tsx/cli'),join(repo,'web/tools',target)],{cwd:repo,stdio:'inherit',env:{...process.env,TSX_TSCONFIG_PATH:path}});process.exit(r.status??1);
