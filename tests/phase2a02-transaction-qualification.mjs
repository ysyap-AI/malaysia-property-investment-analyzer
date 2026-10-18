import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { target, container, image } from './phase2a02-local-target.mjs';
import { dockerAsync } from './phase2a02-transaction-runtime.mjs';
import { baselineSnapshot } from './phase2a02-baseline-snapshot.mjs';
import { catalogQuery } from './phase2a02-catalog-query.mjs';
import { userA, userB, propA, propA2, propB } from './phase2a02-location-cases.mjs';

export const sha = value => createHash('sha256').update(value).digest('hex');
export const canonical = value => JSON.stringify(value, (_, v) => v && !Array.isArray(v) && typeof v === 'object'
 ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
// Only SQL result collections are unordered; preserve tuple/composite-key member order.
const unordered = value => Object.fromEntries(Object.entries(value).map(([key,rows])=>[key,
 Array.isArray(rows) ? [...rows].sort((a,b)=>canonical(a).localeCompare(canonical(b))) : rows]));
const literal = value => "'" + value.replaceAll("'", "''") + "'";
export const users = [userA, userB], properties = [propA, propA2, propB];
const inUsers = users.map(literal).join(','), inProperties = properties.map(literal).join(',');
export async function fixtureCounts(sql) {
 const checks = { authUsers: `auth.users WHERE id IN (${inUsers})`, profiles: `public.profiles WHERE id IN (${inUsers})`,
  properties: `public.properties WHERE id IN (${inProperties})`, locationVersions: `public.property_location_versions WHERE property_id IN (${inProperties})`,
  state: `public.property_location_intelligence_state WHERE property_id IN (${inProperties})` };
 for (const name of ['acquisition_costs','operating_expenses','financing']) checks[name] = `public.${name} WHERE property_id IN (${inProperties})`;
 for (const name of ['investment_criteria','scenario_configs']) checks[name] = `public.${name} WHERE user_id IN (${inUsers})`;
 return JSON.parse(await sql(`SELECT jsonb_build_object(${Object.entries(checks).map(([key,from])=>`${literal(key)},(SELECT count(*) FROM ${from})`).join(',')});`));
}
export async function preservationSnapshot(sql) {
 const baseline = JSON.parse(await sql('BEGIN READ ONLY;' + baselineSnapshot + '; COMMIT;'));
 const catalog = JSON.parse(await sql(catalogQuery));
 // Catalogs include Phase 1, both foundations, Auth and extension objects; exclude statistics.
 const objects = JSON.parse(await sql(`BEGIN READ ONLY; SELECT jsonb_build_object(
 'schemas',(SELECT jsonb_agg(jsonb_build_array(nspname,nspowner,nspacl) ORDER BY nspname) FROM pg_namespace WHERE nspname IN ('public','auth','extensions')),
 'extensions',(SELECT jsonb_agg(to_jsonb(e) ORDER BY extname) FROM pg_extension e),
 'relations',(SELECT jsonb_agg(jsonb_build_array(c.oid,n.nspname,c.relname,c.relkind,c.relowner,c.relacl,c.relrowsecurity,c.relforcerowsecurity,c.reloptions) ORDER BY c.oid) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','auth','extensions')),
 'columns',(SELECT jsonb_agg(to_jsonb(a) ORDER BY a.attrelid,a.attnum) FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','auth','extensions') AND a.attnum>0),
 'constraints',(SELECT jsonb_agg(jsonb_build_array(k.oid,pg_get_constraintdef(k.oid),k.convalidated,k.condeferrable,k.condeferred) ORDER BY k.oid) FROM pg_constraint k JOIN pg_namespace n ON n.oid=k.connamespace WHERE n.nspname IN ('public','auth','extensions')),
 'triggers',(SELECT jsonb_agg(jsonb_build_array(t.oid,pg_get_triggerdef(t.oid),t.tgenabled) ORDER BY t.oid) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','auth','extensions')),
 'procedures',(SELECT jsonb_agg(to_jsonb(p) ORDER BY p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','auth','extensions')),
 'types',(SELECT jsonb_agg(to_jsonb(t) ORDER BY t.oid) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname IN ('public','auth','extensions')),
 'operators',(SELECT jsonb_agg(to_jsonb(o) ORDER BY o.oid) FROM pg_operator o JOIN pg_namespace n ON n.oid=o.oprnamespace WHERE n.nspname IN ('public','auth','extensions')),
 'extensionMembers',(SELECT jsonb_agg(to_jsonb(d) ORDER BY d.classid,d.objid,d.objsubid) FROM pg_depend d WHERE d.refclassid='pg_extension'::regclass AND d.deptype='e'),
 'library',extensions.postgis_full_version(),
 'srids',(SELECT md5(coalesce(string_agg(to_jsonb(s)::text,'' ORDER BY srid),'')) FROM extensions.spatial_ref_sys s)
 ); COMMIT;`));
 const tables = JSON.parse(await sql(`SELECT jsonb_agg(jsonb_build_array(schemaname,tablename) ORDER BY schemaname,tablename) FROM pg_tables WHERE schemaname IN ('public','auth');`));
 const data = {};
 for (const [schema, table] of tables) {
  assert.match(schema, /^[a-z_]+$/); assert.match(table, /^[a-z_]+$/);
  data[`${schema}.${table}`] = JSON.parse(await sql(`BEGIN READ ONLY; SELECT jsonb_build_object('count',count(*),'digest',md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY to_jsonb(t)::text),''))) FROM "${schema}"."${table}" t; COMMIT;`));
 }
 return { baseline, catalog: unordered(catalog), objects, data };
}
export async function qualify(sql) {
 const endpoint = JSON.parse(await dockerAsync(['context','inspect','desktop-linux']))[0].Endpoints.docker.Host;
 assert.equal(endpoint, 'npipe:////./pipe/dockerDesktopLinuxEngine');
 const meta = JSON.parse(await dockerAsync(['inspect',container]))[0];
 assert.equal(meta.Id,container); assert.equal(meta.Name,'/'+target); assert.equal(meta.Image,image); assert.equal(meta.State.Running,true);
 assert.equal(meta.Mounts.length,1);
 assert.deepEqual([meta.Mounts[0].Name,meta.Mounts[0].Type,meta.Mounts[0].Destination],[target,'volume','/var/lib/postgresql/data']);
 const volume = JSON.parse(await dockerAsync(['volume','inspect',target]))[0];
 assert.equal(volume.Name,target); assert.equal(volume.Driver,'local'); assert.equal(volume.CreatedAt,'2026-10-16T14:23:02Z');
 const identity = JSON.parse(await sql(`BEGIN READ ONLY; SELECT jsonb_build_object('database',current_database(),'user',current_user,'socket',inet_server_addr() IS NULL,
 'version',current_setting('server_version'),'postgis',(SELECT jsonb_build_object('version',extversion,'schema',extnamespace::regnamespace::text) FROM pg_extension WHERE extname='postgis'),
 'statementTimeout',current_setting('statement_timeout'),'lockTimeout',current_setting('lock_timeout'),'idleTimeout',current_setting('idle_in_transaction_session_timeout')); COMMIT;`));
 assert.equal(identity.database,'postgres'); assert.equal(identity.user,'postgres'); assert.equal(identity.socket,true); assert.equal(identity.version,'17.11');
 assert.deepEqual(identity.postgis,{version:'3.3.7',schema:'extensions'});
 assert.deepEqual([identity.statementTimeout,identity.lockTimeout,identity.idleTimeout],['12s','10s','15s']);
 const installation = JSON.parse(readFileSync('docs/phase2a02-installation-results.json','utf8'));
 const acceptedBytes = readFileSync('.phase2a02-implementation.local/accepted-baseline-snapshot.json');
 const acceptedHash = sha(JSON.stringify(JSON.parse(acceptedBytes)));
 assert.equal(acceptedHash,installation.baselineSnapshotSha256,'accepted baseline content integrity (installation serialization)');
 assert.equal(sha(readFileSync('supabase/migrations/20261017000000_phase2a02_property_locations.sql')),installation.migrationSha256,'accepted 2A-02 migration bytes');
 const historical = JSON.parse(readFileSync('docs/phase2a02-schema-verification.json','utf8'));
 assert.equal(historical.status,'PASS');
 const before = await preservationSnapshot(sql);
 assert.deepEqual(before.baseline,JSON.parse(acceptedBytes),'accepted Phase 1 / 2A-01 metadata and rows');
 assert.deepEqual(before.catalog,unordered(historical.catalog),'accepted 2A-02 catalog, permissions and PostGIS library');
 assert.equal(before.data['auth.users'].count,historical.target.users,'accepted Auth baseline');
 const attachments=JSON.parse(await sql(`BEGIN READ ONLY; SELECT jsonb_build_object(
  'publicTables',(SELECT jsonb_agg(tablename ORDER BY tablename) FROM pg_tables WHERE schemaname='public'),
  'guards',(SELECT jsonb_agg(jsonb_build_array(c.relname,t.tgname,t.tgenabled,t.tgtype,p.proname,t.tgnargs,t.tgconstraint) ORDER BY c.relname,t.tgname)
   FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_proc p ON p.oid=t.tgfoid WHERE NOT t.tgisinternal
   AND c.oid IN ('public.property_location_versions'::regclass,'public.property_location_intelligence_state'::regclass))
 ); COMMIT;`));
 assert.deepEqual(attachments.publicTables,[...Object.keys(before.baseline.rows),'property_location_versions'].sort(),'exact installed public-table inventory');
 assert.deepEqual(attachments.guards,[
  ['property_location_intelligence_state','property_location_intelligence_state_guard','O',23,'guard_property_location_state_row',0,'0'],
  ['property_location_intelligence_state','property_location_pointer_guard','O',23,'guard_property_location_pointer',0,'0'],
  ['property_location_versions','property_location_versions_guard','O',31,'guard_property_location_version',0,'0'],
 ],'exact enabled guard attachments; no additional triggers');
 const fixtures = await fixtureCounts(sql);
 assert.ok(Object.values(fixtures).every(count=>count===0),'unexpected preexisting fixture IDs');
 const foundationPath = 'supabase/migrations/20261016000000_phase2a01_foundation.sql';
 const start = JSON.parse(readFileSync('.phase2a02-implementation.local/test-closure-02-start.json','utf8'));
 assert.equal(sha(readFileSync(foundationPath)),start.files[foundationPath]);
 const evidence = { status:'PASS',container,image,volume:volume.Name,volumeCreatedAt:volume.CreatedAt,endpoint,...identity,
  baselineSha256:acceptedHash,snapshotSha256:sha(canonical(before)),migrationSha256:installation.migrationSha256,
  foundationSha256:sha(readFileSync(foundationPath)),migrationIdentity:'Accepted source hashes plus exact installed catalog comparison (not migration-ledger inference)',attachments,fixtureCounts:fixtures };
 writeFileSync('.phase2a02-implementation.local/test-closure-02-pretest.json',JSON.stringify(before,null,2)+'\n');
 return { evidence, before };
}
