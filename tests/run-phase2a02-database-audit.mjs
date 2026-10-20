// --prepare writes source/inventory only. --rollback-schema needs separately
// qualified PostGIS on the existing EMPTY local baseline; never installs it.
import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { verifyTarget,sql } from './phase2a02-local-target.mjs';
import { locationCases } from './phase2a02-location-cases.mjs';
import { parseChecks } from './phase2a02-sql-helpers.mjs';
const output='.phase2a02-implementation.local';
mkdirSync(output,{recursive:true});
const cases=locationCases();
const digest=text=>createHash('sha256').update(text).digest('hex');
writeFileSync(output+'/location-cases.sql',cases);
const labels=[...cases.matchAll(/SELECT pg_temp\.(?:ok|denied)\('((?:[^']|'')*)'/g)].map(x=>x[1].replaceAll("''","'"));
assert.equal(labels.length,new Set(labels).size,'Exact unique label inventory');
const inventory={date:'2026-10-18',status:'SOURCE_INVENTORY_ONLY',executionEvidence:'docs/phase2a02-database-results.json',sqlSha256:digest(cases),labels,
 rolledBackLabel:'L07 deferred FK independently rejects cross property',
 notCoveredByRollbackSuite:['L01 missing/wrong-schema extension fault injection','L07 actual deferred COMMIT failure (separate installed-cascade runner)',
  'L10 full trusted writer owner/input/expected token checks and rollback','L11 two-writer LOCATION append/pointer races (foundation lock proof is separate)',
  'L12 idempotent/delayed request transactional handler behavior','L16 full field-specific legal review / concurrent withdrawal',
  'L17 runtime serializer/normalizer integration','L19 clean install and populated upgrade','L20 injected migration/transaction failures at every boundary',
  'L21 generated types','L23 real handler/JWT/CSRF tests','T15 interactive browser']};
writeFileSync('docs/phase2a02-test-inventory.json',JSON.stringify(inventory,null,2)+'\n');
if(process.argv.includes('--prepare')) {
 console.log(JSON.stringify({status:inventory.status,labels:labels.length,sqlSha256:inventory.sqlSha256}));
} else {
 assert.ok(process.argv.includes('--rollback-schema'),'Choose --prepare or --rollback-schema');
 const target=verifyTarget();
 assert.equal(target.users,0);
 assert.equal(sql("SELECT count(*) FROM pg_tables WHERE schemaname='public'"),'11');
 assert.equal(sql("SELECT extversion||':'||extnamespace::regnamespace FROM pg_extension WHERE extname='postgis'"),'3.3.7:extensions','BLOCKED: qualify PostGIS separately');
 const migration=readFileSync('supabase/migrations/20261017000000_phase2a02_property_locations.sql','utf8');
 const body=migration.replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,'');
 const result=parseChecks(sql('BEGIN;\n'+body+'\n'+cases+'\nROLLBACK;'));
 const expected=labels.filter(label=>label!==inventory.rolledBackLabel).sort();
 // PostgreSQL locale ordering differs from JS code-unit ordering. Compare the
 // complete inventories under the same ordering, retaining exact membership.
 assert.deepEqual([...result.labels].sort(),expected);
 assert.equal(sql('SELECT count(*) FROM auth.users'),'0');
 assert.equal(sql("SELECT to_regclass('public.property_location_versions') IS NULL"),'t');
 const report={date:'2026-10-18',status:'PASS_ROLLBACK_SUITE_ONLY',target,migrationSha256:digest(migration),sqlSha256:digest(cases),result,notExecuted:inventory.notCoveredByRollbackSuite};
 writeFileSync('docs/phase2a02-database-results.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,passed:result.passed}));
}
