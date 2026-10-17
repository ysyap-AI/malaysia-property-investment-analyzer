-- Runs only inside the disposable runner's rollback transaction.
CREATE TEMP TABLE phase2_checks(name text, passed boolean NOT NULL);
CREATE FUNCTION pg_temp.ok(label text, result boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF result IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',label; END IF;
  INSERT INTO phase2_checks VALUES(label,true);
END $$;
CREATE FUNCTION pg_temp.denied(label text, command text, states text[]) RETURNS void LANGUAGE plpgsql AS $$
DECLARE got text;
BEGIN
  BEGIN EXECUTE command;
  EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS got=RETURNED_SQLSTATE; END;
  IF got IS NULL OR NOT got=ANY(states) THEN
    RAISE EXCEPTION 'FAIL: %; expected %, got %',label,states,coalesce(got,'SUCCESS');
  END IF;
  INSERT INTO phase2_checks VALUES(label,true);
END $$;
GRANT SELECT,INSERT ON phase2_checks TO anon,authenticated,service_role;

SELECT pg_temp.ok('four new empty tables',
  (SELECT count(*)=4 AND bool_and(relrowsecurity AND relforcerowsecurity AND relowner='postgres'::regrole)
   FROM pg_class WHERE oid IN ('public.location_provider_registry'::regclass,'public.location_fact_definitions'::regclass,'public.location_freshness_policies'::regclass,'public.property_location_intelligence_state'::regclass))
  AND NOT EXISTS(SELECT FROM public.location_provider_registry)
  AND NOT EXISTS(SELECT FROM public.location_fact_definitions)
  AND NOT EXISTS(SELECT FROM public.location_freshness_policies)
  AND NOT EXISTS(SELECT FROM public.property_location_intelligence_state));
SELECT pg_temp.ok('seven indexes only',(SELECT count(*)=7 FROM pg_indexes WHERE tablename IN ('location_provider_registry','location_fact_definitions','location_freshness_policies','property_location_intelligence_state')));
SELECT pg_temp.ok('four exact select policies',(SELECT count(*)=4 AND bool_and(cmd='SELECT' AND roles=ARRAY['authenticated']::name[] AND permissive='PERMISSIVE' AND with_check IS NULL) FROM pg_policies WHERE tablename IN ('location_provider_registry','location_fact_definitions','location_freshness_policies','property_location_intelligence_state')));
SELECT pg_temp.ok('two invoker guards, fixed path',(SELECT count(*)=2 AND bool_and(NOT prosecdef AND proconfig=ARRAY['search_path=pg_catalog']) FROM pg_proc WHERE oid IN ('public.guard_location_registry_row()'::regprocedure,'public.guard_property_location_state_row()'::regprocedure)));

-- Fixture A/B have no real email addresses or credentials.
INSERT INTO auth.users(id,email) VALUES
 ('a2000000-0000-0000-0000-000000000001','phase2a@example.invalid'),
 ('b2000000-0000-0000-0000-000000000002','phase2b@example.invalid');
INSERT INTO public.properties(id,user_id,project_name) VALUES
 ('a2100000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000001','Synthetic A'),
 ('b2100000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000002','Synthetic B');
INSERT INTO public.acquisition_costs(property_id,purchase_price) SELECT id,0 FROM public.properties WHERE id IN ('a2100000-0000-0000-0000-000000000001','b2100000-0000-0000-0000-000000000002');
INSERT INTO public.operating_expenses(property_id) SELECT id FROM public.properties WHERE id IN ('a2100000-0000-0000-0000-000000000001','b2100000-0000-0000-0000-000000000002');
INSERT INTO public.financing(property_id) SELECT id FROM public.properties WHERE id IN ('a2100000-0000-0000-0000-000000000001','b2100000-0000-0000-0000-000000000002');

SET LOCAL ROLE service_role;
INSERT INTO public.property_location_intelligence_state(property_id,state_revision,created_at,updated_at)
 VALUES ('a2100000-0000-0000-0000-000000000001',500,'infinity','-infinity'),('b2100000-0000-0000-0000-000000000002',NULL,NULL,NULL);
SELECT pg_temp.ok('service insert stamps inert state', (SELECT count(*)=2 AND bool_and(state_revision=0 AND created_at=now() AND updated_at=now() AND processing_status='NOT_STARTED' AND freshness_status='UNKNOWN' AND publication_status='NOT_ASSESSED') FROM public.property_location_intelligence_state));
UPDATE public.property_location_intelligence_state SET state_revision=999,updated_at='infinity' WHERE property_id='a2100000-0000-0000-0000-000000000001' AND state_revision=0;
SELECT pg_temp.ok('service update derives revision/time',(SELECT state_revision=1 AND updated_at=now() FROM public.property_location_intelligence_state WHERE property_id='a2100000-0000-0000-0000-000000000001'));
WITH stale AS (UPDATE public.property_location_intelligence_state SET state_revision=2 WHERE property_id='a2100000-0000-0000-0000-000000000001' AND state_revision=0 RETURNING *) SELECT pg_temp.ok('stale expected revision changes no rows',NOT EXISTS(SELECT FROM stale));
SELECT pg_temp.denied('service state delete','DELETE FROM public.property_location_intelligence_state',ARRAY['42501']);
SELECT pg_temp.denied('missing property FK',$q$INSERT INTO public.property_location_intelligence_state(property_id) VALUES('ffffffff-ffff-ffff-ffff-ffffffffffff')$q$,ARRAY['23503']);
SELECT pg_temp.denied('duplicate property state',$q$INSERT INTO public.property_location_intelligence_state(property_id) VALUES('a2100000-0000-0000-0000-000000000001')$q$,ARRAY['23505']);
SELECT pg_temp.denied('state reparent',$q$UPDATE public.property_location_intelligence_state SET property_id='ffffffff-ffff-ffff-ffff-ffffffffffff'$q$,ARRAY['23514']);
SELECT pg_temp.denied('state created_at immutable',$q$UPDATE public.property_location_intelligence_state SET created_at=now()-interval '1 second'$q$,ARRAY['23514']);
SELECT pg_temp.denied('READY unsupported',$q$UPDATE public.property_location_intelligence_state SET processing_status='READY'$q$,ARRAY['23514']);
SELECT pg_temp.denied('STALE is not processing',$q$UPDATE public.property_location_intelligence_state SET processing_status='STALE'$q$,ARRAY['23514']);
SELECT pg_temp.denied('OFFICIAL unsupported',$q$UPDATE public.property_location_intelligence_state SET publication_status='OFFICIAL'$q$,ARRAY['23514']);
SELECT pg_temp.denied('FRESH unsupported',$q$UPDATE public.property_location_intelligence_state SET freshness_status='FRESH'$q$,ARRAY['23514']);
SELECT pg_temp.denied('NULL status',$q$UPDATE public.property_location_intelligence_state SET freshness_status=NULL$q$,ARRAY['23502']);
SELECT pg_temp.denied('no speculative score column',$q$UPDATE public.property_location_intelligence_state SET location_score=100$q$,ARRAY['42703']);
RESET ROLE;

INSERT INTO public.location_provider_registry(provider_key,provider_version,display_name,capabilities,created_at)
 VALUES ('synthetic',1,'Synthetic',ARRAY['ROUTING','GEOCODING'],'infinity');
SELECT pg_temp.ok('conservative provider defaults and canonical order',(SELECT approval_state='UNREVIEWED' AND retention_class='UNREVIEWED' AND attribution_required AND created_at=now() AND capabilities=ARRAY['GEOCODING','ROUTING'] FROM public.location_provider_registry WHERE provider_key='synthetic'));
INSERT INTO public.location_provider_registry(provider_key,provider_version,display_name,capabilities,approval_state,retention_class,attribution_text,terms_reference,review_reference,reviewed_at)
 VALUES('synthetic',2,'Synthetic reviewed',ARRAY['GEOCODING'],'APPROVED','PERMANENT','Synthetic attribution','synthetic:terms','synthetic:review',now());
SELECT pg_temp.denied('approval cannot rewrite old review',$q$UPDATE public.location_provider_registry SET approval_state='APPROVED' WHERE provider_version=1$q$,ARRAY['23514']);
UPDATE public.location_provider_registry SET deprecated_at='infinity' WHERE provider_key='synthetic' AND provider_version=1;
SELECT pg_temp.ok('one-way database-stamped deprecation',(SELECT deprecated_at=now() AND approval_state='UNREVIEWED' FROM public.location_provider_registry WHERE provider_key='synthetic' AND provider_version=1));
SELECT pg_temp.ok('review version pin retained',(SELECT count(*)=2 FROM public.location_provider_registry WHERE provider_key='synthetic'));

INSERT INTO public.location_freshness_policies(policy_key,policy_version,category,age_basis,fresh_for_seconds,expire_after_seconds,description,approval_reference)
 VALUES ('synthetic',1,'TRANSPORT','OBSERVED_AT',1,9007199254740991,'Synthetic policy','synthetic:review');

-- Inject an otherwise unreachable near-overflow row only in this rolled-back test.
ALTER TABLE public.property_location_intelligence_state DISABLE TRIGGER property_location_intelligence_state_guard;
UPDATE public.property_location_intelligence_state SET state_revision=9007199254740990 WHERE property_id='b2100000-0000-0000-0000-000000000002';
ALTER TABLE public.property_location_intelligence_state ENABLE TRIGGER property_location_intelligence_state_guard;
SET LOCAL ROLE service_role;
UPDATE public.property_location_intelligence_state SET state_revision=0 WHERE property_id='b2100000-0000-0000-0000-000000000002';
SELECT pg_temp.denied('revision overflow atomic','UPDATE public.property_location_intelligence_state SET state_revision=0 WHERE state_revision=9007199254740991',ARRAY['23514']);
SELECT pg_temp.ok('overflow preserves revision',(SELECT state_revision=9007199254740991 FROM public.property_location_intelligence_state WHERE property_id='b2100000-0000-0000-0000-000000000002'));
RESET ROLE;

