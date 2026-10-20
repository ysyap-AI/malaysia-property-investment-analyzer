// Separately attributable follow-up: does not rewrite historical tests/results.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { factFixtures, insert } from './phase2a01-contract-fixtures.mjs';
import { setupChecks, ok, denied, resultChecks, parseChecks } from './phase2a02-sql-helpers.mjs';
import { verifyTarget, sql } from './phase2a02-local-target.mjs';
import { proveContention } from './phase2a02-contention.mjs';

const target = verifyTarget();
assert.equal(target.users, 0, 'Synthetic-only empty retained target required');
const fixtures = [
 ['location_provider_registry', 'provider_version', {provider_key:'quality_followup',provider_version:1,display_name:'Synthetic',capabilities:['GEOCODING']}],
 ['location_fact_definitions', 'definition_version', factFixtures()[0]],
 ['location_freshness_policies', 'policy_version', {policy_key:'quality_followup',policy_version:1,category:'GEOCODING',age_basis:'RETRIEVED_AT',fresh_for_seconds:1,expire_after_seconds:2,description:'Synthetic',approval_reference:'synthetic:review'}],
];
let body = setupChecks;
for (const [i,[table,version,row]] of fixtures.entries()) {
 const id=`f0200000-0000-0000-0000-${String(i+1).padStart(12,'0')}`;
 body += insert(table,{...row,id})+';\n';
 body += ok(table+' valid nondeprecated control',`SELECT deprecated_at IS NULL FROM public.${table} WHERE id='${id}'`);
 // Isolate PK from logical uniqueness by changing the logical version.
 body += denied(table+' duplicate UUID 23505',insert(table,{...row,id,[version]:2}),'23505');
 // Isolate logical-version uniqueness with an independently generated UUID.
 body += denied(table+' duplicate logical version 23505',insert(table,row),'23505');
}
const uniqueness = parseChecks(sql('BEGIN;\n'+body+resultChecks+'\nROLLBACK;'));
assert.equal(uniqueness.passed,9);
const contention = await proveContention();
assert.equal(sql('SELECT count(*) FROM auth.users'), '0');
const report={date:'2026-10-18',target,status:'PASS',uniqueness,contention,
 qualification:'Supplementary tests only; historical mixed-SQLSTATE assertions and historical count claims remain unchanged.'};
writeFileSync('docs/phase2a01-quality-followup-results.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
