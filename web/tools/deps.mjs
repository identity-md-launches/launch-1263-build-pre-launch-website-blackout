import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, copyFileSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
export const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const toolchain = process.env.BLACKOUT_TOOLCHAIN || join(tmpdir(), 'blackout-web-toolchain');
export async function install() {
 mkdirSync(toolchain, {recursive:true});
 for(const name of ['package.json','package-lock.json']) copyFileSync(join(repo,'web',name),join(toolchain,name));
 const r=spawnSync('npm',['ci','--prefix',toolchain,'--cache',join(tmpdir(),'blackout-npm-cache'),'--no-audit','--no-fund'],{stdio:'inherit'});
 if(r.status!==0) throw Error('Frontend dependency installation failed.');
}
export const requireTool = createRequire(join(toolchain,'package.json'));
export const resolveTool = name => requireTool.resolve(name);
export function checkTools() { if(!existsSync(join(toolchain,'node_modules/vite'))) throw Error('Run node web/tools/run.mjs install first. Dependencies stay outside the repository.'); }
export const packageData=JSON.parse(readFileSync(join(repo,'web/package.json'),'utf8'));
