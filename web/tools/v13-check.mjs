// Run checks with the repository's unchanged lockfile and external toolchain.
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {repo,toolchain,resolveTool,checkTools} from './deps.mjs';
checkTools();
const cfg=JSON.parse(readFileSync(join(repo,'web/tsconfig.json'),'utf8'));
cfg.compilerOptions.baseUrl=repo;
cfg.compilerOptions.paths=Object.fromEntries(['viem','@wagmi/core','@wagmi/connectors'].map(name=>{const p=JSON.parse(readFileSync(join(toolchain,'node_modules',name,'package.json'),'utf8'));return[name,[join(toolchain,'node_modules',name,p.exports['.'].import||p.exports['.'].default)]];}));
const path=join(toolchain,'v13-test-tsconfig.json');writeFileSync(path,JSON.stringify(cfg));
const targets={unit:'v13-unit.ts',browser:'v13-browser.ts',live:'v13-live.ts',capture:'v13-capture.ts'};
const target=targets[process.argv[2]||'unit'];if(!target)throw Error('Choose unit, browser, live or capture.');
const r=spawnSync(process.execPath,[resolveTool('tsx/cli'),join(repo,'web/tools',target)],{cwd:repo,stdio:'inherit',env:{...process.env,TSX_TSCONFIG_PATH:path}});process.exit(r.status??1);
