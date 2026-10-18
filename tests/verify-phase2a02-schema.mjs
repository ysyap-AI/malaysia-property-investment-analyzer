// Installed-schema catalog qualification. Read-only, pinned local Unix socket.
import assert from 'node:assert/strict';
import { writeFileSync,readFileSync } from 'node:fs';
import { verifyTarget,sql } from './phase2a02-local-target.mjs';
import { baselineSnapshot } from './phase2a02-baseline-snapshot.mjs';
const target=verifyTarget();
assert.equal(target.users,0);
const baseline=JSON.parse(readFileSync('.phase2a02-implementation.local/accepted-baseline-snapshot.json','utf8'));
assert.deepEqual(JSON.parse(sql('BEGIN READ ONLY;'+baselineSnapshot+'; COMMIT;')),baseline);
const catalog=JSON.parse(sql(`BEGIN READ ONLY; SELECT jsonb_build_object(
 'columns',(SELECT jsonb_agg(jsonb_build_object('table',c.relname,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'typeName',t.typname,'nullable',NOT a.attnotnull,'generated',a.attgenerated,'default',pg_get_expr(d.adbin,d.adrelid)) ORDER BY c.relname,a.attname) FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_type t ON t.oid=a.atttypid LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE c.oid IN ('public.property_location_versions'::regclass,'public.property_location_intelligence_state'::regclass) AND a.attnum>0 AND NOT a.attisdropped),
 'relationships',(SELECT jsonb_agg(jsonb_build_object('table',c.relname,'name',k.conname,'columns',(SELECT jsonb_agg(a.attname ORDER BY ord) FROM unnest(k.conkey) WITH ORDINALITY u(num,ord) JOIN pg_attribute a ON a.attrelid=k.conrelid AND a.attnum=u.num),'referencedRelation',f.relname,'referencedColumns',(SELECT jsonb_agg(a.attname ORDER BY ord) FROM unnest(k.confkey) WITH ORDINALITY u(num,ord) JOIN pg_attribute a ON a.attrelid=k.confrelid AND a.attnum=u.num),'isOneToOne',EXISTS(SELECT FROM pg_constraint unique_key WHERE unique_key.conrelid=k.conrelid AND unique_key.contype IN ('p','u') AND unique_key.conkey <@ k.conkey),'definition',pg_get_constraintdef(k.oid),'validated',k.convalidated) ORDER BY c.relname,k.conname) FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_class f ON f.oid=k.confrelid WHERE k.contype='f' AND c.oid IN ('public.property_location_versions'::regclass,'public.property_location_intelligence_state'::regclass)),
 'tables',(SELECT jsonb_agg(jsonb_build_array(relname,pg_get_userbyid(relowner),relrowsecurity,relforcerowsecurity,relacl)) FROM pg_class WHERE oid IN ('public.property_location_versions'::regclass,'public.property_location_intelligence_state'::regclass)),
 'constraints',(SELECT jsonb_agg(jsonb_build_array(conname,contype,convalidated,pg_get_constraintdef(oid)) ORDER BY conname) FROM pg_constraint WHERE conrelid='public.property_location_versions'::regclass),
 'indexes',(SELECT jsonb_agg(to_jsonb(i) ORDER BY indexname) FROM pg_indexes i WHERE schemaname='public' AND tablename='property_location_versions'),
 'policies',(SELECT jsonb_agg(to_jsonb(p) ORDER BY tablename,policyname) FROM pg_policies p WHERE schemaname='public' AND tablename IN ('property_location_versions','property_location_intelligence_state')),
 'roles',(SELECT jsonb_agg(jsonb_build_array(rolname,rolsuper,rolbypassrls,rolcreaterole,rolcreatedb)) FROM pg_roles WHERE rolname IN ('postgres','anon','authenticated','service_role','authenticator')),
 'memberships',(SELECT jsonb_agg(jsonb_build_array(pg_get_userbyid(member),pg_get_userbyid(roleid),inherit_option,set_option,admin_option)) FROM pg_auth_members),
 'effectivePrivileges',(SELECT jsonb_agg(jsonb_build_array(r.rolname,c.relname,p,has_table_privilege(r.oid,c.oid,p),has_table_privilege(r.oid,c.oid,p||' WITH GRANT OPTION'))) FROM pg_roles r CROSS JOIN pg_class c CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p WHERE r.rolname IN ('anon','authenticated','service_role','authenticator') AND c.oid IN ('public.property_location_versions'::regclass,'public.property_location_intelligence_state'::regclass)),
 'guardFunctions',(SELECT jsonb_agg(jsonb_build_object('name',proname,'owner',pg_get_userbyid(proowner),'definer',prosecdef,'config',proconfig,'acl',proacl,'definition',pg_get_functiondef(oid))) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('guard_property_location_version','guard_property_location_pointer')),
 'columnGrants',(SELECT count(*) FROM pg_attribute WHERE attrelid IN ('public.property_location_versions'::regclass,'public.property_location_intelligence_state'::regclass) AND attacl IS NOT NULL),
 'library',extensions.postgis_full_version(),
 'emptyHistory',NOT EXISTS(SELECT FROM public.property_location_versions)
 ); COMMIT;`));
assert.equal(catalog.columns.filter(c=>c.table==='property_location_versions').length,27);
assert.equal(catalog.columns.filter(c=>c.table==='property_location_intelligence_state').length,8);
const pointer=catalog.columns.find(c=>c.name==='current_location_version_id');
assert.equal(pointer.nullable,true); assert.equal(pointer.typeName,'uuid');
const position=catalog.columns.find(c=>c.name==='position');
assert.equal(position.generated,'s'); assert.match(position.type,/geography\(Point,4326\)/);
assert.equal(catalog.indexes.length,6);
assert.equal(catalog.emptyHistory,true);
assert.equal(catalog.columnGrants,0);
for(const [role,table,privilege,actual,grantOption] of catalog.effectivePrivileges) {
 const expected=(role==='authenticated'||role==='service_role')&&privilege==='SELECT'||role==='service_role'&&(privilege==='INSERT'||table==='property_location_intelligence_state'&&privilege==='UPDATE');
 assert.equal(actual,expected,role+' '+table+' '+privilege); assert.equal(grantOption,false);
}
for(const fn of catalog.guardFunctions) { assert.equal(fn.definer,false); assert.deepEqual(fn.config,['search_path=pg_catalog']); assert.equal(fn.owner,'postgres'); }
assert.equal(catalog.guardFunctions.length,2);
assert.ok(catalog.constraints.every(c=>c[2]===true));
const report={date:'2026-10-18',status:'PASS',target,baselinePreserved:true,catalog};
writeFileSync('docs/phase2a02-schema-verification.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:'PASS',historyColumns:27,stateColumns:8,indexes:6,baselinePreserved:true}));
