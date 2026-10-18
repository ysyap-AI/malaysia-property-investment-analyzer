import { writeFileSync } from 'node:fs';
import { verifyTarget, sql } from './phase2a02-local-target.mjs';
const target = verifyTarget();
const catalog = JSON.parse(sql(`BEGIN READ ONLY;
SELECT jsonb_build_object(
 'extensions',(SELECT jsonb_agg(jsonb_build_object('name',e.extname,'version',e.extversion,'schema',n.nspname,'owner',pg_get_userbyid(e.extowner))) FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace),
 'availablePostgis',(SELECT jsonb_agg(to_jsonb(a)) FROM pg_available_extension_versions a WHERE name='postgis'),
 'roles',(SELECT jsonb_agg(jsonb_build_object('name',rolname,'superuser',rolsuper,'bypassrls',rolbypassrls,'createRole',rolcreaterole,'createDb',rolcreatedb,'inherit',rolinherit)) FROM pg_roles),
 'memberships',(SELECT jsonb_agg(jsonb_build_object('role',pg_get_userbyid(roleid),'member',pg_get_userbyid(member),'inherit',inherit_option,'set',set_option,'admin',admin_option)) FROM pg_auth_members),
 'schemaPrivileges',(SELECT jsonb_agg(jsonb_build_array(r.rolname,n.nspname,has_schema_privilege(r.oid,n.oid,'USAGE'),has_schema_privilege(r.oid,n.oid,'CREATE'))) FROM pg_roles r CROSS JOIN pg_namespace n WHERE r.rolname IN ('postgres','anon','authenticated','service_role','authenticator') AND n.nspname IN ('public','auth','extensions')),
 'tables',(SELECT jsonb_agg(jsonb_build_object('name',relname,'owner',pg_get_userbyid(relowner),'rls',relrowsecurity,'force',relforcerowsecurity,'acl',relacl)) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r'),
 'effectivePrivileges',(SELECT jsonb_agg(jsonb_build_array(r.rolname,c.relname,p,has_table_privilege(r.oid,c.oid,p),has_table_privilege(r.oid,c.oid,p||' WITH GRANT OPTION'))) FROM pg_roles r CROSS JOIN pg_class c CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p WHERE r.rolname IN ('anon','authenticated','service_role','authenticator') AND c.relnamespace='public'::regnamespace AND c.relname IN ('property_location_intelligence_state','location_provider_registry')),
 'columnAcls',(SELECT jsonb_agg(jsonb_build_array(c.relname,a.attname,a.attacl)) FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid WHERE c.relnamespace='public'::regnamespace AND a.attacl IS NOT NULL),
 'defaultAcls',(SELECT jsonb_agg(to_jsonb(d)) FROM pg_default_acl d),
 'functions',(SELECT jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'definition',pg_get_functiondef(p.oid),'acl',p.proacl)) FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname IN ('owns_property','guard_property_location_state_row','guard_location_registry_row')),
 'spatialFunctions',(SELECT jsonb_agg(jsonb_build_array(p.oid::regprocedure::text,p.provolatile)) FROM pg_proc p WHERE p.pronamespace='extensions'::regnamespace AND p.proname IN ('st_makepoint','st_setsrid','geography','geometry','st_x','st_y','st_srid','st_isvalid','st_isempty','st_ndims','st_distance','st_dwithin'))
); COMMIT;`));
const present = catalog.extensions.some(e => e.name === 'postgis');
const report = { date: '2026-10-18', target, status: present ? 'PRESENT_REQUIRES_SPATIAL_QUALIFICATION' : 'BLOCKED_POSTGIS_ABSENT', catalog,
  notExecuted: ['Spatial functions, SRID 4326 and generated-column runtime compatibility', 'Spatial schema migration and acceptance tests', 'Extension installation (requires separate approval)'] };
writeFileSync('docs/phase2a02-prerequisite-results.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, target, available: catalog.availablePostgis }));
