// Requires an already installed, separately verified spatial schema. Synthetic
// commits are deliberate: a rollback-only test cannot establish D05 COMMIT behavior.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { verifyTarget,sql } from './phase2a02-local-target.mjs';
import { fixtureSQL,base,id,userA,userB,propA,propA2,propB } from './phase2a02-location-cases.mjs';
import { insert } from './phase2a01-contract-fixtures.mjs';
const target=verifyTarget();
assert.equal(target.users,0);
assert.equal(sql("SELECT to_regclass('public.property_location_versions') IS NOT NULL"),'t','BLOCKED: no verified installed location schema');
assert.equal(sql("SELECT extversion||':'||extnamespace::regnamespace FROM pg_extension WHERE extname='postgis'"),'3.3.7:extensions');
const results=[];
try {
 let setup=fixtureSQL;
 for(const [property,user] of [[propA,userA],[propA2,userA],[propB,userB]]) {
  setup+=insert('property_location_versions',{...base,id:property,property_id:property,created_by:user})+';\n';
  setup+=insert('property_location_versions',{...base,id:property===propA?id(801):property===propA2?id(802):id(803),property_id:property,created_by:user,version_number:2,operation_id:id(899),change_reason:'METADATA_CORRECTED'})+';\n';
  setup+=`INSERT INTO public.property_location_intelligence_state(property_id,current_location_version_id) SELECT '${property}',id FROM public.property_location_versions WHERE property_id='${property}' AND version_number=2;\n`;
 }
 sql('BEGIN;'+setup+'COMMIT;');
 // Disable only our new semantic guard within a transaction that MUST fail at
 // COMMIT. The composite FK remains enabled. PostgreSQL rolls back the DDL too.
 for(const pointer of [id(9999),propB,propA2]) {
  let error;
  try { sql(`\\set VERBOSITY verbose
   BEGIN; ALTER TABLE public.property_location_intelligence_state DISABLE TRIGGER property_location_pointer_guard;
   UPDATE public.property_location_intelligence_state SET current_location_version_id='${pointer}' WHERE property_id='${propA}'; COMMIT;`); }
  catch(e) { error=String(e.stderr); }
  assert.match(error??'',/23503/,'Deferred FK must reject at COMMIT');
  assert.equal(sql(`SELECT current_location_version_id='${id(801)}' FROM public.property_location_intelligence_state WHERE property_id='${propA}'`),'t');
  assert.equal(sql("SELECT tgenabled FROM pg_trigger WHERE tgname='property_location_pointer_guard'"),'O');
  results.push({case:'bad pointer commit '+pointer,sqlstate:'23503',rollbackVerified:true});
 }
 sql(`BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${userA}',true); DELETE FROM public.properties WHERE id='${propA}'; COMMIT;`);
 for(const table of ['property_location_versions','property_location_intelligence_state','acquisition_costs','operating_expenses','financing']) {
  assert.equal(sql(`SELECT count(*) FROM public.${table} WHERE property_id='${propA}'`),'0');
  assert.notEqual(sql(`SELECT count(*) FROM public.${table} WHERE property_id='${propB}'`),'0');
 }
 results.push({case:'authenticated property delete commits with history/current/state/financial cascades and B preserved',status:'PASS'});
 sql(`BEGIN; DELETE FROM auth.users WHERE id='${userB}'; COMMIT;`);
 for(const table of ['property_location_versions','property_location_intelligence_state','acquisition_costs','operating_expenses','financing']) assert.equal(sql(`SELECT count(*) FROM public.${table} WHERE property_id='${propB}'`),'0');
 results.push({case:'Auth user deletion commits with private and financial cascades',status:'PASS'});
} finally {
 // Never weaken constraints/guards on failure. Cleanup uses normal Auth cascade.
 sql(`DELETE FROM auth.users WHERE id IN ('${userA}','${userB}');`);
}
assert.equal(sql('SELECT count(*) FROM auth.users'),'0');
writeFileSync('docs/phase2a02-commit-results.json',JSON.stringify({date:'2026-10-18',target,status:'PASS',results},null,2)+'\n');
console.log(JSON.stringify(results));
