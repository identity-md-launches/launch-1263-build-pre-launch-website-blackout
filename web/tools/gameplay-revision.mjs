// Uses the existing locked toolchain; all generated dependencies stay outside Git.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { repo, toolchain, resolveTool, checkTools } from './deps.mjs';
checkTools();
const cfg = JSON.parse(readFileSync(join(repo, 'web/tsconfig.json'), 'utf8'));
cfg.compilerOptions.baseUrl = repo;
cfg.compilerOptions.paths = Object.fromEntries(['viem', '@wagmi/core', '@wagmi/connectors'].map(name => {
  const pkg = JSON.parse(readFileSync(join(toolchain, 'node_modules', name, 'package.json'), 'utf8'));
  return [name, [join(toolchain, 'node_modules', name, pkg.exports['.'].import || pkg.exports['.'].default)]];
}));
const path = join(toolchain, 'gameplay-revision-tsconfig.json');
writeFileSync(path, JSON.stringify(cfg));
const result = spawnSync(process.execPath, [resolveTool('tsx/cli'), join(repo, 'web/tools/gameplay-revision.ts'), ...process.argv.slice(2)], {
  cwd: repo, stdio: 'inherit', env: { ...process.env, TSX_TSCONFIG_PATH: path },
});
process.exit(result.status ?? 1);
