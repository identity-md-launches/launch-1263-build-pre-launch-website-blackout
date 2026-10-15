// Read-only with respect to this checkout's .git. All Git writes occur in /tmp.
import {execFileSync} from 'node:child_process';
import {mkdtempSync,existsSync,statSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
import {repo} from './deps.mjs';
const sourceGit=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8'});
const paths=[...new Set([...sourceGit('ls-files','-z').split('\0'),...sourceGit('ls-files','--others','--exclude-standard','-z').split('\0'),'.imd-responses.json'])].filter(p=>p&&!/^(?:\.imd\/|test\/scratch\/|\.playwright-mcp\/)/.test(p)&&existsSync(join(repo,p))&&statSync(join(repo,p)).isFile()).sort();
const temp=mkdtempSync(join(tmpdir(),'blackout-bundle-trial-'));
try {
 const metadata=join(temp,'metadata'),bundle=join(temp,'submission.bundle');
 execFileSync('git',['init','--bare','--quiet',metadata],{stdio:'pipe'});
 const env={...process.env,GIT_DIR:metadata,GIT_WORK_TREE:repo,GIT_AUTHOR_NAME:'BLACKOUT size validation',GIT_AUTHOR_EMAIL:'validation@localhost',GIT_COMMITTER_NAME:'BLACKOUT size validation',GIT_COMMITTER_EMAIL:'validation@localhost'};
 const git=(...args)=>execFileSync('git',args,{cwd:repo,env,encoding:'utf8'}).trim();
 // Import the accepted tree into the temporary repository. A bundle containing
 // both trees measures shared objects and deltas once, unlike summing two full
 // packs (which double-counts every unchanged runtime asset and recording).
 const parent=sourceGit('rev-parse','HEAD').trim(),baseTree=sourceGit('rev-parse','HEAD^{tree}').trim();
 const basePack=execFileSync('git',['pack-objects','--stdout','--revs'],{cwd:repo,input:baseTree+'\n',maxBuffer:32*1024*1024});
 execFileSync('git',['index-pack','--stdin'],{cwd:repo,env,input:basePack,stdio:['pipe','pipe','pipe']});
 const baseCommit=git('commit-tree',baseTree,'-m','Temporary accepted-tree snapshot for submission size validation');
 git('read-tree','--empty');
 const list=join(temp,'paths');writeFileSync(list,paths.join('\0')+'\0');
 git('add','--force','--pathspec-from-file='+list,'--pathspec-file-nul');
 const tree=git('write-tree');
 const commit=git('commit-tree',tree,'-p',baseCommit,'-m','Temporary complete-submission size validation; not a project commit');
 git('update-ref','refs/heads/submission-size-trial',commit);
 git('bundle','create',bundle,'--all');
 git('bundle','verify',bundle);
 const size=statSync(bundle).size;assert(size<=8388608,`Current-file submission bundle exceeds 8 MiB: ${size}`);
 const missingHistory=sourceGit('rev-list','--objects','--all','--missing=print').split('\n').filter(line=>line.startsWith('?'));
 const report={missingHistoricalObjects:missingHistory.length,checkedAt:new Date().toISOString(),limitBytes:8388608,bundleBytes:size,remainingBytes:8388608-size,candidateFiles:paths.length,baseCommit:parent,snapshotCommits:2,method:'Import the complete accepted source tree into a temporary bare Git repository, commit a base snapshot, stage every current deliverable file as its child, then create and verify a standalone bundle containing both complete trees. Shared objects and deltas are counted once. The source .git is never modified.',limitation:missingHistory.length?`The supplied checkout lacks ${missingHistory.length} historical objects. This measures both complete accepted and revised trees, not unavailable history or the publisher’s final metadata.`:'Both complete accepted and revised trees are measured; publisher metadata is outside this worker.'};
 writeFileSync(join(repo,'artifacts/v14/bundle-trial.json'),JSON.stringify(report,null,2)+'\n');
 console.log(`PASS complete accepted + revised Git bundle: ${size} bytes (${8388608-size} bytes below 8 MiB).`);
} finally {rmSync(temp,{recursive:true,force:true});}
