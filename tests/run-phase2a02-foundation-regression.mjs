// Preserve historical assertions and reports in place. Execute their exact bytes
// from a scoped six-migration export against the verified retained local baseline.
import { mkdirSync,copyFileSync,readFileSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { verifyTarget } from './phase2a02-local-target.mjs';
const target=verifyTarget();
assert.equal(target.users,0);
const dir=resolve('.phase2a02-implementation.local/foundation-regression');
for(const sub of ['tests','docs','supabase/migrations']) mkdirSync(dir+'/'+sub,{recursive:true});
const prior=JSON.parse(readFileSync('docs/phase2a01-database-results.json','utf8'));
const files=['tests/run-phase2a01-database-audit.mjs','tests/phase2a01-foundation.sql',
 'tests/phase2a01-contract-fixtures.mjs','tests/phase2a01-security-cases.mjs','docs/phase2a01-database-results.json',
 ...prior.migrations.map(m=>'supabase/migrations/'+m.file)];
for(const file of files) copyFileSync(file,dir+'/'+file);
const output=execFileSync(process.execPath,['tests/run-phase2a01-database-audit.mjs','--verify-installed'],{cwd:dir,encoding:'utf8',maxBuffer:32*1024*1024});
const result=JSON.parse(readFileSync(dir+'/docs/phase2a01-database-results.json','utf8'));
assert.equal(result.status,'PASS');
const report={date:'2026-10-18',target,status:'PASS',mode:'unchanged --verify-installed (rollback-only)',
 testsThisRun:result.tests.slice(prior.tests.length),behavior:result.behavior,
 qualification:'Historical clean-install/upgrade/concurrency records are not rerun or imported as new passes. This does not run the separate original Phase 1 empty-schema harness.'};
writeFileSync('docs/phase2a02-foundation-regression-results.json',JSON.stringify(report,null,2)+'\n');
console.log(output);
