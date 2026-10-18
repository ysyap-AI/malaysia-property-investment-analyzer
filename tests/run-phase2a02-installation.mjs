// Populated upgrade, atomic migration faults, then install on verified local DB.
import assert from 'node:assert/strict';
import { readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { verifyTarget,sql } from './phase2a02-local-target.mjs';
import { baselineSnapshot,baselineTables } from './phase2a02-baseline-snapshot.mjs';
import { fixtureSQL,propA } from './phase2a02-location-cases.mjs';
const target=verifyTarget();
assert.equal(target.users,0);
assert.equal(sql("SELECT to_regclass('public.property_location_versions') IS NULL"),'t');
const passed=JSON.parse(readFileSync('docs/phase2a02-database-results.json','utf8'));
assert.equal(passed.status,'PASS_ROLLBACK_SUITE_ONLY');
const migration=readFileSync('supabase/migrations/20261017000000_phase2a02_property_locations.sql','utf8');
const sha=createHash('sha256').update(migration).digest('hex');
assert.equal(sha,passed.migrationSha256);
const body=migration.replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,'');
const baseline=JSON.parse(sql('BEGIN READ ONLY;'+baselineSnapshot+'; COMMIT;'));
for(const t of baselineTables) assert.equal(baseline.rows[t].length,0,'Synthetic empty target '+t);
const results=[];
let fixtures=fixtureSQL+`INSERT INTO public.property_location_intelligence_state(property_id) VALUES('${propA}');`;
for(let i=0;i<7;i++) fixtures+=`UPDATE public.property_location_intelligence_state SET state_revision=0 WHERE property_id='${propA}';`;
const snapshots=sql(`BEGIN; ${fixtures} ${baselineSnapshot}; ${body} ${baselineSnapshot};
 SELECT jsonb_build_object('historyRows',(SELECT count(*) FROM public.property_location_versions),'nullPointer',(SELECT current_location_version_id IS NULL FROM public.property_location_intelligence_state),'revision',(SELECT state_revision FROM public.property_location_intelligence_state)); ROLLBACK;`).split(/\r?\n/).filter(x=>x.startsWith('{')).map(JSON.parse);
assert.equal(snapshots.length,3);
assert.deepEqual(snapshots[1],snapshots[0]);
assert.deepEqual(snapshots[2],{historyRows:0,nullPointer:true,revision:7});
assert.deepEqual(JSON.parse(sql(baselineSnapshot)),baseline);
results.push({case:'populated Phase 1 + foundation upgrade preserves all accepted metadata/data and revision 7; no backfill',status:'PASS'});
for(const [name,marker] of [['after history table','CREATE INDEX property_location_versions_provider_version_idx'],['after guards/policies','-- Only these new objects:'],['after grants','DO $verify$']]) {
 const fault=body.replace(marker,`DO $fault$ BEGIN RAISE EXCEPTION 'injected_phase2a02_fault' USING ERRCODE='P0001'; END $fault$;\n${marker}`);
 assert.notEqual(fault,body);
 let error;
 try { sql('\\set VERBOSITY verbose\nBEGIN;'+fault+'COMMIT;'); } catch(e) { error=String(e.stderr); }
 assert.match(error??'',/P0001.*injected_phase2a02_fault/);
 assert.deepEqual(JSON.parse(sql(baselineSnapshot)),baseline);
 assert.equal(sql("SELECT to_regclass('public.property_location_versions') IS NULL"),'t');
 assert.equal(sql("SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('guard_property_location_version','guard_property_location_pointer')"),'0');
 results.push({case:'failed migration rollback '+name,status:'PASS',sqlstate:'P0001'});
}
sql(migration);
assert.deepEqual(JSON.parse(sql(baselineSnapshot)),baseline);
assert.equal(sql('SELECT count(*) FROM public.property_location_versions'),'0');
assert.equal(sql("SELECT count(*) FROM pg_tables WHERE schemaname='public'"),'12');
results.push({case:'retained local installation preserves baseline and has no seeded location rows',status:'PASS'});
writeFileSync('docs/phase2a02-installation-results.json',JSON.stringify({date:'2026-10-18',target,status:'PASS',migrationSha256:sha,results,baselineSnapshotSha256:createHash('sha256').update(JSON.stringify(baseline)).digest('hex'),cleanInstallation:'NOT_EXECUTED: no separately designated clean database; no new Docker environment created'},null,2)+'\n');
writeFileSync('.phase2a02-implementation.local/accepted-baseline-snapshot.json',JSON.stringify(baseline,null,2)+'\n');
console.log(JSON.stringify(results));
