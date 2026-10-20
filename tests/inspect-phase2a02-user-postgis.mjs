// Read-only qualification of the separate container supplied by the owner.
// Not a substitute target for the MPIA migration/security acceptance runners.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { docker } from './phase2a02-local-target.mjs';
const container='4f13f96358d4c71a88d8fcd81afcdfca12ec8c1d46630a692e2484818c134439';
const image='sha256:01a6a70e41e6c4467c8f55f6063555ed72db2d6662cd0d571040d42eadaeb6f6';
const volume='ed0af6e9122bb642e276f6b42d0e3376e8e27003329259c6d19dbb1895b26d2d';
const endpoint=JSON.parse(docker(['context','inspect','desktop-linux']))[0].Endpoints.docker.Host;
assert.equal(endpoint,'npipe:////./pipe/dockerDesktopLinuxEngine');
const meta=JSON.parse(docker(['inspect',container]))[0];
assert.equal(meta.Id,container);
assert.equal(meta.Name,'/postgis-container');
assert.equal(meta.Image,image);
assert.equal(meta.State.Running,true);
assert.equal(meta.Mounts.length,1);
assert.equal(meta.Mounts[0].Name,volume);
assert.equal(meta.Mounts[0].Type,'volume');
assert.equal(meta.Mounts[0].Destination,'/var/lib/postgresql/data');
const volumeMeta=JSON.parse(docker(['volume','inspect',volume]))[0];
assert.equal(volumeMeta.Driver,'local');
const imageMeta=JSON.parse(docker(['image','inspect',image]))[0];
assert.equal(imageMeta.Id,image);
const sql=statement=>docker(['exec','-i',container,'psql','-X','-qAt','-h','/var/run/postgresql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],`BEGIN READ ONLY; ${statement} COMMIT;`).trim();
const catalog=JSON.parse(sql(`SELECT jsonb_build_object(
 'database',current_database(),'user',current_user,'socket',inet_server_addr() IS NULL,
 'readOnly',current_setting('transaction_read_only'),'version',current_setting('server_version'),
 'extensions',(SELECT jsonb_agg(jsonb_build_object('name',e.extname,'version',e.extversion,'schema',n.nspname,'owner',pg_get_userbyid(e.extowner))) FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace),
 'publicTables',(SELECT coalesce(jsonb_agg(tablename ORDER BY tablename),'[]'::jsonb) FROM pg_tables WHERE schemaname='public'),
 'authUsers',to_regclass('auth.users'),
 'apiRoles',(SELECT coalesce(jsonb_agg(rolname ORDER BY rolname),'[]'::jsonb) FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role','authenticator'))
);`));
assert.equal(catalog.database,'postgres');
assert.equal(catalog.user,'postgres');
assert.equal(catalog.socket,true);
assert.equal(catalog.readOnly,'on');
const extension=catalog.extensions.find(e=>e.name==='postgis');
assert.ok(extension,'PostGIS must be installed in the supplied database');
assert.ok(['public','extensions'].includes(extension.schema),'Only explicitly allowlisted schema identifiers are interpolated');
const s=extension.schema;
const spatial=JSON.parse(sql(`SELECT jsonb_build_object(
 'library',${s}.postgis_full_version(),
 'srid4326',EXISTS(SELECT FROM ${s}.spatial_ref_sys WHERE srid=4326 AND auth_name='EPSG' AND auth_srid=4326),
 'malaysiaRoundtrip',(SELECT ${s}.st_x(g::${s}.geometry)=101.6869 AND ${s}.st_y(g::${s}.geometry)=3.139 AND ${s}.st_srid(g::${s}.geometry)=4326 FROM (SELECT ${s}.st_setsrid(${s}.st_makepoint(101.6869,3.139),4326)::${s}.geography g) p),
 'globalBoundaries',(SELECT bool_and(${s}.st_x(g::${s}.geometry)=x AND ${s}.st_y(g::${s}.geometry)=y) FROM (SELECT x,y,${s}.st_setsrid(${s}.st_makepoint(x,y),4326)::${s}.geography g FROM (VALUES(-180.0,-90.0),(180.0,90.0),(0.0,0.0)) p(x,y)) points),
 'zeroDistance',${s}.st_distance('SRID=4326;POINT(0 0)'::${s}.geography,'SRID=4326;POINT(0 0)'::${s}.geography)=0,
 'equatorialDistanceMetres',${s}.st_distance('SRID=4326;POINT(0 0)'::${s}.geography,'SRID=4326;POINT(1 0)'::${s}.geography),
 'radiusBoundary',${s}.st_dwithin('SRID=4326;POINT(0 0)'::${s}.geography,'SRID=4326;POINT(1 0)'::${s}.geography,111319.50) AND NOT ${s}.st_dwithin('SRID=4326;POINT(0 0)'::${s}.geography,'SRID=4326;POINT(1 0)'::${s}.geography,111319.48),
 'signatures',(SELECT jsonb_agg(jsonb_build_array(p.oid::regprocedure::text,p.provolatile)) FROM pg_proc p WHERE p.pronamespace='${s}'::regnamespace AND p.proname IN ('st_makepoint','st_setsrid','geography','geometry','st_isvalid','st_isempty','st_ndims','st_srid'))
);`));
for(const key of ['srid4326','malaysiaRoundtrip','globalBoundaries','zeroDistance','radiusBoundary']) assert.equal(spatial[key],true,key);
assert.ok(Math.abs(spatial.equatorialDistanceMetres-111319.49079327357)<0.01);
const report={date:'2026-10-18',status:'SEPARATE_CONTAINER_SPATIAL_SMOKE_PASS_APPLICATION_TARGET_UNCHANGED',
 target:{container,name:meta.Name,image,imageTags:imageMeta.RepoTags,volume,volumeCreatedAt:volumeMeta.CreatedAt,endpoint},catalog,spatial,
 qualification:'Six read-only spatial checks on the owner-created separate container. Not MPIA migration, RLS, cascade, generated-column DDL or concurrency acceptance. No password used or stored; no objects or rows changed.'};
writeFileSync('docs/phase2a02-user-postgis-results.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
