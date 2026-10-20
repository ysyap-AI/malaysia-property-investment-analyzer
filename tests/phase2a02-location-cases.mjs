// Prepared acceptance source. Execute only after local PostGIS/schema qualification.
import { insert,literal as l } from './phase2a01-contract-fixtures.mjs';
import { setupChecks,ok,denied,resultChecks } from './phase2a02-sql-helpers.mjs';
export const id=n=>'f3020000-0000-0000-0000-'+String(n).padStart(12,'0');
export const userA=id(1),userB=id(2),propA=id(11),propA2=id(12),propB=id(13);
const history='property_location_versions',state='property_location_intelligence_state';
export const base={property_id:propA,version_number:1,operation_id:id(101),operation_hash:'a'.repeat(64),property_input_hash:'b'.repeat(64),input_address:'Synthetic Kuala Lumpur',created_by:userA,change_reason:'INITIAL_INPUT'};
const pin={...base,longitude:101.6869,latitude:3.139,coordinate_source:'USER_PIN',source_crs:'EPSG:4326',coordinate_precision:'USER_PIN',confirmation_status:'REVIEW_REQUIRED'};
export const fixtureSQL=`INSERT INTO auth.users(id,email) VALUES('${userA}','location-a@example.invalid'),('${userB}','location-b@example.invalid');
INSERT INTO public.properties(id,user_id,project_name) VALUES('${propA}','${userA}','Synthetic A'),('${propA2}','${userA}','Synthetic A2'),('${propB}','${userB}','Synthetic B');
INSERT INTO public.acquisition_costs(property_id,purchase_price) SELECT id,100000 FROM public.properties WHERE id IN ('${propA}','${propA2}','${propB}');
INSERT INTO public.operating_expenses(property_id) SELECT id FROM public.properties WHERE id IN ('${propA}','${propA2}','${propB}');
INSERT INTO public.financing(property_id) SELECT id FROM public.properties WHERE id IN ('${propA}','${propA2}','${propB}');
`;
export function locationCases() {
 let sql=setupChecks+fixtureSQL;
 sql+=ok('L01 PostGIS version/schema',`SELECT extversion='3.3.7' AND extnamespace='extensions'::regnamespace FROM pg_extension WHERE extname='postgis'`);
 sql+=ok('L04 generated column and GiST valid',`SELECT attgenerated='s' FROM pg_attribute WHERE attrelid='public.${history}'::regclass AND attname='position'`);
 sql+=ok('L04 GiST index valid',`SELECT indisvalid AND indisready FROM pg_index WHERE indexrelid='public.property_location_versions_position_gist'::regclass`);
 sql+=ok('L07 deferred composite containment',`SELECT condeferrable AND condeferred AND confdeltype='a' AND array_length(conkey,1)=2 FROM pg_constraint WHERE conrelid='public.${state}'::regclass AND conname='property_location_intelligence_state_current_location_fkey'`);
 let number=0;
 const add=row=>insert(history,{...row,change_reason:number>0&&row.change_reason==='INITIAL_INPUT'?'LOCATION_CORRECTED':row.change_reason,id:id(1000+(++number)),version_number:number,operation_id:id(2000+number)})+';\n';
 sql+='SET LOCAL ROLE service_role;\n';
 for(const [longitude,latitude] of [[101.6869,3.139],[103.7618,1.4854],[100.3327,5.4164],[-180,-90],[180,90],[0,0]]) {
  sql+=add({...pin,longitude,latitude});
  sql+=ok(`L02 roundtrip ${longitude},${latitude}`,`SELECT longitude=${longitude} AND latitude=${latitude} AND extensions.st_x(position::extensions.geometry)=${longitude} AND extensions.st_y(position::extensions.geometry)=${latitude} AND extensions.st_srid(position::extensions.geometry)=4326 FROM public.${history} WHERE property_id='${propA}' AND version_number=${number}`);
 }
 // Independent WGS84 equatorial one-degree distance, metres; 1 cm tolerance.
 sql+=ok('L02 independent equatorial distance metres',`abs(extensions.st_distance('SRID=4326;POINT(0 0)'::extensions.geography,'SRID=4326;POINT(1 0)'::extensions.geography)-111319.49079327357)<0.01`);
 sql+=ok('L02 zero distance and radius boundary',`extensions.st_distance('SRID=4326;POINT(0 0)'::extensions.geography,'SRID=4326;POINT(0 0)'::extensions.geography)=0 AND extensions.st_dwithin('SRID=4326;POINT(0 0)'::extensions.geography,'SRID=4326;POINT(1 0)'::extensions.geography,111319.50) AND NOT extensions.st_dwithin('SRID=4326;POINT(0 0)'::extensions.geography,'SRID=4326;POINT(1 0)'::extensions.geography,111319.48)`);
 const invalidCoordinates=[{longitude:null},{latitude:null},{longitude:180.000001},{latitude:-90.000001},{longitude:'NaN'},{latitude:'NaN'},{longitude:'Infinity'},{longitude:'-Infinity'},{latitude:'Infinity'},{latitude:'-Infinity'},{source_crs:'EPSG:3857'},{source_crs:null}];
 for(const [i,patch] of invalidCoordinates.entries()) sql+=denied('L03 invalid coordinates '+i,insert(history,{...pin,version_number:999,operation_id:id(999),...patch}));
 sql+=denied('L04 independent position write',insert(history,{...pin,position:'SRID=4326;POINT(0 0)'}),'428C9');
 // Valid independent rows isolate each unique key.
 const original={...pin,id:id(1001),version_number:1,operation_id:id(2001)};
 sql+=denied('L05 UUID uniqueness',insert(history,{...original,version_number:999,operation_id:id(999)}),'23505');
 sql+=denied('L05 version uniqueness',insert(history,{...pin,version_number:1,operation_id:id(999)}),'23505');
 sql+=denied('L05 operation uniqueness',insert(history,{...pin,version_number:999,operation_id:id(2001)}),'23505');
 sql+='RESET ROLE;\n';
 const columns=['id','property_id','version_number','operation_id','operation_hash','property_input_hash','input_address','normalized_address','normalization_version','longitude','latitude','coordinate_source','source_crs','provider_version_id','provider_candidate_id','retrieved_at','coordinate_precision','accuracy_m','geocode_confidence','confidence_mapping_version','confirmation_status','confirmed_by','confirmed_at','change_reason','created_by','created_at'];
 for(const column of columns) sql+=denied('L06 immutable '+column,`UPDATE public.${history} SET ${column}=${column} WHERE id='${id(1001)}'`);
 sql+=denied('L06 direct owner history deletion',`DELETE FROM public.${history} WHERE id='${id(1001)}'`);
 sql+=denied('L06 upsert update immutable',insert(history,original)+` ON CONFLICT(id) DO UPDATE SET longitude=excluded.longitude`);
 sql+='SET LOCAL ROLE service_role;\n';
 for(const [p,u] of [[propA2,userA],[propB,userB]]) sql+=insert(history,{...base,id:p===propA2?id(301):id(302),property_id:p,created_by:u})+';\n';
 const newest=id(1000+number);
 sql+=`INSERT INTO public.${state}(property_id,current_location_version_id) VALUES('${propA}','${newest}'),('${propA2}','${id(301)}'),('${propB}','${id(302)}');\n`;
 sql+=ok('L07 valid service pointer',`SELECT current_location_version_id='${newest}' AND state_revision=0 FROM public.${state} WHERE property_id='${propA}'`);
 for(const [label,target] of [['same owner cross property',id(301)],['other owner cross property',id(302)],['nonexistent',id(9999)],['backwards',id(1001)]]) sql+=denied('L07 '+label,`UPDATE public.${state} SET current_location_version_id='${target}' WHERE property_id='${propA}'`);
 sql+=denied('L07 cannot reset pointer',`UPDATE public.${state} SET current_location_version_id=NULL WHERE property_id='${propA}'`);
 sql+=`UPDATE public.${state} SET current_location_version_id=current_location_version_id WHERE property_id='${propA}';\n`;
 sql+=ok('L10 one revision per update',`SELECT state_revision=1 FROM public.${state} WHERE property_id='${propA}'`);
 sql+=`WITH changed AS(UPDATE public.${state} SET current_location_version_id=current_location_version_id WHERE property_id='${propA}' AND state_revision=0 RETURNING *) SELECT pg_temp.ok('L10 stale update returns zero',NOT EXISTS(SELECT FROM changed));\n`;
 sql+='RESET ROLE;\n';
 for(const role of ['anon','authenticated','service_role']) {
  sql+=`SET LOCAL ROLE ${role};\n`;
  for(const privilege of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) {
   const expected=(role!=='anon'&&privilege==='SELECT')||(role==='service_role'&&privilege==='INSERT');
   sql+=ok(`L08 ${role} effective ${privilege}`,`has_table_privilege(current_user,'public.${history}','${privilege}')=${expected} AND NOT has_table_privilege(current_user,'public.${history}','${privilege} WITH GRANT OPTION')`);
  }
  if(role==='anon') sql+=denied('L08 anon read',`SELECT * FROM public.${history}`,'42501');
  if(role!=='service_role') sql+=denied('L08 '+role+' insert',insert(history,pin),'42501');
  for(const command of ['UPDATE public.'+history+' SET latitude=latitude','DELETE FROM public.'+history,'TRUNCATE public.'+history]) sql+=denied('L08 '+role+' '+command,command,'42501');
  for(const fn of ['guard_property_location_version','guard_property_location_pointer']) sql+=denied('L09 '+role+' guard '+fn,`SELECT public.${fn}()`,'42501');
  sql+='RESET ROLE;\n';
 }
 for(const [user,own,other,count] of [[userA,propA,propB,number+1],[userB,propB,propA,1]]) {
  sql+=`SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${user}',true);\n`;
  sql+=ok('L08 own positive '+user,`SELECT count(*)>0 FROM public.${history} WHERE property_id='${own}'`);
  sql+=ok('L08 reciprocal other hidden '+user,`NOT EXISTS(SELECT FROM public.${history} WHERE property_id='${other}')`);
  sql+=ok('L08 unfiltered isolation '+user,`SELECT count(*)=${count} FROM public.${history}`);
  for(const p of [own,other]) {
   sql+=denied('L08 owner I '+user+p,insert(history,{...base,property_id:p}),'42501');
   sql+=denied('L08 owner U '+user+p,`UPDATE public.${history} SET input_address='changed' WHERE property_id='${p}'`,'42501');
   sql+=denied('L08 owner D '+user+p,`DELETE FROM public.${history} WHERE property_id='${p}'`,'42501');
  }
  sql+=`WITH removed AS (DELETE FROM public.properties WHERE id='${other}' RETURNING *) SELECT pg_temp.ok('L13 nonowner parent denial ${user}',NOT EXISTS(SELECT FROM removed)); RESET ROLE;\n`;
 }
 sql+=ok('L09 FORCE RLS and exact policy',`SELECT relrowsecurity AND relforcerowsecurity AND relowner='postgres'::regrole FROM pg_class WHERE oid='public.${history}'::regclass`);
 sql+=ok('L09 only owner select policy',`SELECT count(*)=1 AND bool_and(cmd='SELECT' AND roles=ARRAY['authenticated']::name[]) FROM pg_policies WHERE schemaname='public' AND tablename='${history}'`);
 sql+=ok('L09 no column grants',`NOT EXISTS(SELECT FROM pg_attribute WHERE attrelid='public.${history}'::regclass AND attacl IS NOT NULL)`);
 sql+=ok('L09 two invoker guards',`SELECT count(*)=2 AND bool_and(NOT prosecdef AND proconfig=ARRAY['search_path=pg_catalog']) FROM pg_proc WHERE oid IN ('public.guard_property_location_version()'::regprocedure,'public.guard_property_location_pointer()'::regprocedure)`);
 sql+='SET LOCAL ROLE service_role;\n';
 const badRows=[{...base,input_address:null},{...base,normalized_address:'Normalized'},{...base,normalization_version:'v1'},
  {...base,confirmation_status:'CONFIRMED',confirmed_by:userA},{...pin,confirmation_status:'CONFIRMED',confirmed_by:userB},
  {...pin,confirmation_status:'UNCONFIRMED'},{...base,confirmation_status:'REVIEW_REQUIRED',input_address:null},
  {...base,confirmation_status:'CLEARED',change_reason:'LOCATION_CLEARED'}, {...base,change_reason:'LOCATION_CLEARED'},
  {...pin,accuracy_m:0},{...pin,accuracy_m:'NaN'},{...pin,accuracy_m:'Infinity'},
  {...pin,coordinate_precision:'ROOFTOP'},{...pin,geocode_confidence:'HIGH'},
  {...base,confirmed_at:'2000-01-01'},{...base,confirmed_by:userA},
  {...base,property_input_hash:'ABC'},{...base,operation_hash:'z'.repeat(64)},
  {...base,version_number:0},{...base,version_number:'9007199254740992'}];
 for(const [i,row] of badRows.entries()) sql+=denied('L15 invalid combination '+i,insert(history,{...row,operation_id:id(999),version_number:row.version_number===1?999:row.version_number}));
 sql+=add({...pin,input_address:null,confirmation_status:'CONFIRMED',confirmed_by:userA,change_reason:'PIN_CONFIRMED',created_at:'infinity',confirmed_at:'-infinity'});
 sql+=ok('L15 explicit pin confirmation stamps time, accuracy unknown',`SELECT confirmed_at=created_at AND created_at=transaction_timestamp() AND accuracy_m IS NULL AND geocode_confidence='UNKNOWN' FROM public.${history} WHERE property_id='${propA}' AND version_number=${number}`);
 sql+=add({...base,confirmation_status:'REVIEW_REQUIRED',change_reason:'ADDRESS_CHANGED'});
 sql+=add({...base,input_address:null,confirmation_status:'CLEARED',change_reason:'LOCATION_CLEARED'});
 sql+=`UPDATE public.${state} SET current_location_version_id='${id(1000+number)}' WHERE property_id='${propA}';\n`;
 sql+=ok('L15 latest cleared intent remains no origin',`SELECT v.confirmation_status='CLEARED' AND v.position IS NULL FROM public.${state} s JOIN public.${history} v ON v.id=s.current_location_version_id WHERE s.property_id='${propA}'`);
 sql+='RESET ROLE;\n';
 const provider={provider_key:'synthetic_location',provider_version:1,display_name:'Synthetic fixture only',capabilities:['GEOCODING'],approval_state:'APPROVED',retention_class:'PERMANENT',attribution_text:'Synthetic',terms_reference:'synthetic:terms',review_reference:'synthetic:fields',reviewed_at:'2000-01-01'};
 const geo={...pin,coordinate_source:'GEOCODER',coordinate_precision:'LOCALITY',geocode_confidence:'HIGH',confidence_mapping_version:'synthetic-v1',provider_version_id:id(501),provider_candidate_id:'synthetic-candidate',retrieved_at:'2001-01-01',change_reason:'GEOCODE_SELECTED'};
 sql+=insert('location_provider_registry',{...provider,id:id(501)})+';\n';
 sql+='SET LOCAL ROLE service_role;\n'+add(geo);
 sql+=ok('L16 high confidence never auto confirms',`SELECT confirmation_status='REVIEW_REQUIRED' AND confirmed_at IS NULL FROM public.${history} WHERE property_id='${propA}' AND version_number=${number}`);
 sql+=add({...geo,confirmation_status:'CONFIRMED',confirmed_by:userA});
 sql+=ok('L16 confirmation preserves approximate provenance',`SELECT coordinate_source='GEOCODER' AND coordinate_precision='LOCALITY' AND provider_version_id='${id(501)}' AND provider_candidate_id='synthetic-candidate' AND accuracy_m IS NULL FROM public.${history} WHERE property_id='${propA}' AND version_number=${number}`);
 sql+='RESET ROLE;\n';
 for(const [i,patch] of [{approval_state:'DISABLED'},{capabilities:['ROUTING']},{retention_class:'NO_PERSISTENCE'},{retention_class:'ID_ONLY_PERMANENT'},{retention_class:'TEMPORARY_30_DAY',retention_limit_seconds:30}].entries()) {
  sql+=insert('location_provider_registry',{...provider,...patch,id:id(510+i),provider_version:10+i})+';\n';
  sql+='SET LOCAL ROLE service_role;\n'+denied('L16 ineligible provider '+i,insert(history,{...geo,version_number:999,operation_id:id(999),provider_version_id:id(510+i)}))+'RESET ROLE;\n';
 }
 sql+=`UPDATE public.location_provider_registry SET deprecated_at=now() WHERE id='${id(501)}'; SET LOCAL ROLE service_role;\n`;
 sql+=denied('L16 deprecated provider',insert(history,{...geo,version_number:999,operation_id:id(999)}));
 sql+=denied('L16 missing provider',insert(history,{...geo,version_number:999,operation_id:id(999),provider_version_id:id(599)}));
 sql+='RESET ROLE;\n';
 sql+=ok('L18 historical pair still resolves original point',`SELECT longitude=101.6869 AND latitude=3.139 FROM public.${history} WHERE property_id='${propA}' AND id='${id(1001)}'`);
 // Rollback-only fixture independently exercises the FK, with the new pointer
 // guard temporarily disabled. No Phase 1 trigger is changed.
 sql+=`SET CONSTRAINTS ALL IMMEDIATE; SET CONSTRAINTS ALL DEFERRED;
 SAVEPOINT fk_fixture; ALTER TABLE public.${state} DISABLE TRIGGER property_location_pointer_guard;
 UPDATE public.${state} SET current_location_version_id='${id(302)}' WHERE property_id='${propA}';\n`;
 sql+=denied('L07 deferred FK independently rejects cross property','SET CONSTRAINTS public.property_location_intelligence_state_current_location_fkey IMMEDIATE','23503');
 sql+=`ROLLBACK TO fk_fixture;\n`; // the check above is rolled back too; runner captures actual COMMIT tests separately.
 sql+=`SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${userA}',true); DELETE FROM public.properties WHERE id='${propA}'; RESET ROLE; SET CONSTRAINTS ALL IMMEDIATE;\n`;
 sql+=ok('L13 property cascade history/state/financial and B positive',`NOT EXISTS(SELECT FROM public.${history} WHERE property_id='${propA}') AND NOT EXISTS(SELECT FROM public.${state} WHERE property_id='${propA}') AND NOT EXISTS(SELECT FROM public.acquisition_costs WHERE property_id='${propA}') AND NOT EXISTS(SELECT FROM public.operating_expenses WHERE property_id='${propA}') AND NOT EXISTS(SELECT FROM public.financing WHERE property_id='${propA}') AND EXISTS(SELECT FROM public.${history} WHERE property_id='${propB}') AND EXISTS(SELECT FROM public.financing WHERE property_id='${propB}')`);
 sql+=`UPDATE public.properties SET user_id='${userA}' WHERE id='${propB}'; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${userB}',true);\n`;
 sql+=ok('L14 former owner loses history',`NOT EXISTS(SELECT FROM public.${history})`);
 sql+=`RESET ROLE; DELETE FROM auth.users WHERE id='${userB}';\n`;
 sql+=ok('L14 old actor deletion does not erase transferred history',`EXISTS(SELECT FROM public.${history} WHERE property_id='${propB}' AND created_by='${userB}')`);
 sql+=`DELETE FROM auth.users WHERE id='${userA}'; SET CONSTRAINTS ALL IMMEDIATE;\n`;
 sql+=ok('L14 Auth cascades all owned private children',`NOT EXISTS(SELECT FROM public.${history}) AND NOT EXISTS(SELECT FROM public.${state}) AND NOT EXISTS(SELECT FROM public.properties) AND NOT EXISTS(SELECT FROM public.financing) AND NOT EXISTS(SELECT FROM public.acquisition_costs) AND NOT EXISTS(SELECT FROM public.operating_expenses)`);
 return sql+resultChecks;
}
