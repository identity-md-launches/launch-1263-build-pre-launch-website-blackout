// Read-only with respect to this checkout's .git. All Git writes occur in /tmp.
import {execFileSync} from 'node:child_process';
import {mkdtempSync,existsSync,statSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
import {repo} from './deps.mjs';
const sourceGit=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8'});
const paths=[...new Set([...sourceGit('ls-files','-z').split('\0'),...sourceGit('ls-files','--others','--exclude-standard','-z').split('\0')])].filter(p=>p&&!/^(?:\.imd\/|test\/scratch\/|\.playwright-mcp\/)/.test(p)&&existsSync(join(repo,p))&&statSync(join(repo,p)).isFile()).sort();
const temp=mkdtempSync(join(tmpdir(),'blackout-bundle-trial-'));
try {
 const metadata=join(temp,'metadata'),bundle=join(temp,'submission.bundle');
 execFileSync('git',['init','--bare','--quiet',metadata],{stdio:'pipe'});
 const env={...process.env,GIT_DIR:metadata,GIT_WORK_TREE:repo,GIT_AUTHOR_NAME:'BLACKOUT size validation',GIT_AUTHOR_EMAIL:'validation@localhost',GIT_COMMITTER_NAME:'BLACKOUT size validation',GIT_COMMITTER_EMAIL:'validation@localhost'};
 const git=(...args)=>execFileSync('git',args,{cwd:repo,env,encoding:'utf8'}).trim();
 git('read-tree','--empty');
 const list=join(temp,'paths');writeFileSync(list,paths.join('\0')+'\0');
 git('add','--force','--pathspec-from-file='+list,'--pathspec-file-nul');
 const tree=git('write-tree'),parent=sourceGit('rev-parse','HEAD').trim();
 const commit=git('commit-tree',tree,'-m','Temporary complete-submission size validation; not a project commit');
 git('update-ref','refs/heads/submission-size-trial',commit);
 git('bundle','create',bundle,'--all');
 git('bundle','verify',bundle);
 const size=statSync(bundle).size;assert(size<=8388608,`Current-file submission bundle exceeds 8 MiB: ${size}`);
 const availableBasePackBytes=Number(sourceGit('count-objects','-v').match(/^size-pack: (\d+)$/m)[1])*1024;
 assert(size+availableBasePackBytes<=8388608,'Available base packs plus complete candidate bundle exceed the size budget');
 const missingHistory=sourceGit('rev-list','--objects','--all','--missing=print').split('\n').filter(line=>line.startsWith('?'));
 const report={missingHistoricalObjects:missingHistory.length,availableBasePackBytes,conservativeAvailableBasePlusCandidateBytes:size+availableBasePackBytes,checkedAt:new Date().toISOString(),limitBytes:8388608,bundleBytes:size,remainingBytes:8388608-size,candidateFiles:paths.length,baseCommit:parent,snapshotCommits:1,method:'Create a temporary bare Git repository, stage every current deliverable file, commit there, then create and verify a complete standalone Git bundle. The source .git is never modified.',limitation:missingHistory.length?`The supplied checkout lacks ${missingHistory.length} historical objects. This verifies the complete current-file snapshot and the conservative available-base-plus-candidate size, not unavailable history or the publisher’s final metadata.`:'The complete current-file snapshot and conservative available-base-plus-candidate size are measured; publisher metadata is outside this worker.'};
 writeFileSync(join(repo,'artifacts/v10/bundle-trial.json'),JSON.stringify(report,null,2)+'\n');
 console.log(`PASS complete current-file Git bundle: ${size} bytes (${8388608-size} bytes below 8 MiB).`);
} finally {rmSync(temp,{recursive:true,force:true});}
