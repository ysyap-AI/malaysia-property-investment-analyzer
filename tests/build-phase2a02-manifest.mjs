// Offline evidence assembly only. Does not connect to Docker or any database.
import { readFileSync,writeFileSync,readdirSync,existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
assert.equal(git('branch','--show-current'),'phase2-location-intelligence');
assert.equal(git('rev-parse','HEAD'),'c9b6c4acc1879a2b84b89d3b39455f2489e4c56a');
assert.equal(git('rev-parse','HEAD^'),'e9b55b024263857aacafbd8d9d9158d749d9261f');
const relocatedReports=['PHASE2A_01_GIT_CHECKPOINT_REPORT.md','PHASE2A_01_GITHUB_SYNC_REPORT.md'];
assert.deepEqual(git('diff','--name-only','HEAD','--').split(/\r?\n/).sort(),[...relocatedReports,'src/integrations/supabase/types.ts'].sort());
for(const name of relocatedReports) {
 assert.equal(existsSync(name),false,'Owner-requested report relocation');
 assert.equal(readFileSync('docs/'+name,'utf8').replaceAll('\r\n','\n').trim(),git('show','HEAD:'+name),'Relocated historical report content preserved');
}
git('diff','--cached','--exit-code');
git('diff','--exit-code','v0.1-phase1','--','src/lib/finance','src/lib/scenarios','src/lib/scoring','src/lib/risk','src/lib/recommendations','src/config','src/lib/phase1-validation.ts','src/hooks/use-property-analysis.ts');
const migrations=git('ls-tree','-r','--name-only','HEAD','supabase/migrations').split(/\r?\n/);
assert.equal(migrations.length,6);
const accepted=JSON.parse(readFileSync('docs/phase2a01-database-results.json','utf8'));
for(const [i,path] of migrations.entries()) {
 assert.equal(sha(readFileSync(path)),accepted.migrations[i].sha256,'Accepted migration byte hash '+path);
 if(i<5) assert.equal(readFileSync(path,'utf8').replaceAll('\r\n','\n').trim(),git('show','v0.1-phase1:'+path),'Frozen Phase 1 migration '+path);
}
const source=[...readdirSync('tests').filter(f=>(f.includes('phase2a02')||f==='phase2a01-quality-followup.mjs')&&f.endsWith('.mjs')).map(f=>'tests/'+f)];
for(const path of source) execFileSync(process.execPath,['--check',path],{stdio:'pipe'});
execFileSync(process.execPath,['tests/run-phase2a02-database-audit.mjs','--prepare'],{stdio:'pipe'});
const regressions=JSON.parse(readFileSync('docs/phase2a02-regression-results.json','utf8'));
assert.equal(regressions.status,'PASS');
for(const check of regressions.checks) assert.equal(sha(readFileSync(check.log)),check.sha256);
const fixtureReference=JSON.parse(readFileSync('docs/phase2a01-fixture-comparison.json','utf8'));
const currentFixtures=regressions.propertyFixtures.outcomes.map(({name,status})=>({title:name,status})).sort((a,b)=>a.title.localeCompare(b.title));
assert.deepEqual(currentFixtures,[...fixtureReference.identicalAssertions].sort((a,b)=>a.title.localeCompare(b.title)));
writeFileSync('docs/phase2a02-fixture-comparison.json',JSON.stringify({date:'2026-10-18',status:'PASS',reference:'docs/phase2a01-fixture-comparison.json',before:53,after:currentFixtures.length,identicalAssertions:currentFixtures},null,2)+'\n');
const verified=Object.fromEntries(['database-results','installation-results','commit-results','schema-verification','type-generation'].map(name=>{
 const path='docs/phase2a02-'+name+'.json';
 const result=JSON.parse(readFileSync(path,'utf8'));
 assert.match(result.status,/^PASS/);
 return [name,{status:result.status,path}];
}));
const types=JSON.parse(readFileSync('docs/phase2a02-type-generation.json','utf8'));
assert.equal(types.destinationSha256,sha(readFileSync(types.destination)));
assert.equal(types.sourceSha256,sha(readFileSync(types.source)));
const installed=JSON.parse(readFileSync('docs/phase2a02-installation-results.json','utf8'));
assert.equal(installed.migrationSha256,sha(readFileSync('supabase/migrations/20261017000000_phase2a02_property_locations.sql')));
const files=[...source,...migrations,...relocatedReports.map(name=>'docs/'+name),'supabase/migrations/20261017000000_phase2a02_property_locations.sql',
 'src/integrations/supabase/types.ts','tests/PHASE2A02_README.md','tests/database-types/phase2a02.ts','tests/database-types/tsconfig.phase2a02.json',
 ...readdirSync('docs').filter(f=>/^(?:PHASE2A_02_|phase2a02-|phase2a01-quality-followup)/.test(f)&&f!=='phase2a02-verification-manifest.json').map(f=>'docs/'+f)];
const report={date:'2026-10-18',timezone:'Asia/Kuala_Lumpur',status:'LOCAL_SCHEMA_VERIFIED_ACCEPTANCE_INCOMPLETE',
 baseline:{branch:git('branch','--show-current'),head:git('rev-parse','HEAD'),parent:git('rev-parse','HEAD^'),onlyModifiedTrackedContent:'src/integrations/supabase/types.ts',relocatedReports:relocatedReports.map(name=>({from:name,to:'docs/'+name,contentPreserved:true})),preservedTypeContracts:44,indexUnchanged:true,frozenEnginesUnchanged:true,originalFiveMigrationsUnchanged:true,acceptedSixMigrationByteHashesMatch:true},
 syntaxChecks:{status:'PASS',files:source},
 regressionSummary:{application:regressions.application,typescript:5,commandContracts:5,security:{passed:6,failed:0,skipped:0},build:'PASS',propertyFixtures:53,foundationAssertionExecutions:2340,foundationQualityAssertions:9,observedFoundationLockRaces:2},
 spatialDatabaseTests:verified,
 locationTransactionTests:{status:'NOT_EXECUTED',reason:'Local test command rejected by approval prompt after resume; no retry or alternate execution path'},
 separateOwnerContainerChecks:existsSync('docs/phase2a02-user-postgis-results.json')?{status:'PASS_READ_ONLY_SMOKE_ONLY',checks:6,evidence:'docs/phase2a02-user-postgis-results.json',notApplicationAcceptance:true}:null,
 generatedTypes:'PASS_SCOPED_VERIFIED_LOCAL_CATALOG',browserT15:'OPEN_NOT_EXECUTED',
 files:[...new Set(files)].sort().map(path=>({path,sha256:sha(readFileSync(path))})),
 logs:regressions.checks.map(({name,log,sha256,exitCode})=>({name,path:log,sha256,exitCode})),
 limitations:['Unsigned local evidence; no independent execution attestation','Synthetic location writer/concurrency suite not executed: execution approval rejected','No separately designated clean-install database; populated upgrade passed','Full adversarial preflight/attachment qualification remains open','Browser T15 and real future-handler security remain open','No production access, commit, push or deployment']};
writeFileSync('docs/phase2a02-verification-manifest.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,syntaxFiles:source.length,hashedFiles:report.files.length,trackedPreservation:'PASS'}));
