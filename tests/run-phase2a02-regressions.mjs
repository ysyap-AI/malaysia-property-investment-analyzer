import { spawnSync } from 'node:child_process';
import { mkdirSync,writeFileSync,readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const output='.phase2a02-implementation.local';
mkdirSync(output,{recursive:true});
const commands=[
 ['application',['node_modules/vitest/vitest.mjs','run','--reporter=json','--outputFile='+output+'/application-tests.json']],
 ['typescript-app',['node_modules/typescript/bin/tsc','--noEmit']],
 ['typescript-fixtures',['node_modules/typescript/bin/tsc','-p','tests/fixtures/tsconfig.json','--noEmit']],
 ['typescript-phase1',['node_modules/typescript/bin/tsc','-p','tests/database-types/tsconfig.json','--noEmit']],
 ['typescript-foundation',['node_modules/typescript/bin/tsc','-p','tests/database-types/tsconfig.phase2a01.json','--noEmit']],
 ['typescript-location',['node_modules/typescript/bin/tsc','-p','tests/database-types/tsconfig.phase2a02.json','--noEmit']],
 ['command-contract',['--test','tests/phase2a02-contract.test.mjs']],
 ['production-build',['node_modules/vite/bin/vite.js','build']],
 ['security',['--test','tests/security.test.mjs']],
];
const checks=[];
for(const [name,args] of commands) {
 const env={...process.env};
 delete env.SECURITY_AUDIT_SOURCE_ROOT;
 if(name==='security') env.SECURITY_AUDIT_BROWSER_ROOT='.output/public';
 const result=spawnSync(process.execPath,args,{encoding:'utf8',env,maxBuffer:32*1024*1024});
 const log=(result.stdout??'')+(result.stderr??'')+(result.error?.stack??'');
 writeFileSync(output+'/'+name+'.log',log);
 checks.push({name,args,exitCode:result.status,status:result.status===0?'PASS':'FAIL',log:output+'/'+name+'.log',sha256:createHash('sha256').update(log).digest('hex')});
 console.log(name+': '+checks.at(-1).status);
}
const app=JSON.parse(readFileSync(output+'/application-tests.json','utf8'));
const fixtures=app.testResults.filter(r=>/phase1-property-fixtures(?:-integration)?\.test\.ts$/.test(r.name)).flatMap(r=>r.assertionResults.map(a=>({name:a.fullName,status:a.status})));
const report={date:'2026-10-18',status:checks.every(c=>c.status==='PASS')?'PASS':'FAIL',checks,
 application:{total:app.numTotalTests,passed:app.numPassedTests,failed:app.numFailedTests,pending:app.numPendingTests},
 propertyFixtures:{count:fixtures.length,outcomes:fixtures},
 notExecuted:['Interactive browser T15','Original Phase 1 empty-schema DB runner'],
 separateEvidence:['phase2a02-database-results.json','phase2a02-commit-results.json','phase2a02-schema-verification.json','phase2a02-type-generation.json']};
writeFileSync('docs/phase2a02-regression-results.json',JSON.stringify(report,null,2)+'\n');
if(report.status!=='PASS') process.exitCode=1;
