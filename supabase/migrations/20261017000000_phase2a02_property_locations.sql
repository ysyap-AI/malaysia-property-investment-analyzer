-- Phase 2A-02 IMPLEMENTATION-01. Source prepared; spatial execution blocked until
-- separately approved PostGIS provisioning/qualification. No extension installation.
-- Dormant direct service writes require the trusted atomic transaction contract.
BEGIN;

DO $preflight$
DECLARE n text; r record; signature text; fn oid;
BEGIN
  IF current_user <> 'postgres' OR NOT (SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user)
     OR current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999 THEN
    RAISE EXCEPTION 'Requires verified postgres/BYPASSRLS on PostgreSQL 17' USING ERRCODE='55000';
  END IF;
  -- Fail before parsing any spatial DDL; provision separately, never here.
  IF NOT EXISTS (SELECT FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace
      WHERE e.extname='postgis' AND n.nspname='extensions' AND e.extversion='3.3.7'
      AND pg_get_userbyid(e.extowner) IN ('postgres','supabase_admin')) THEN
    RAISE EXCEPTION 'Requires separately qualified PostGIS 3.3.7 in extensions' USING ERRCODE='55000';
  END IF;
  IF to_regclass('public.property_location_versions') IS NOT NULL
     OR to_regtype('public.property_location_versions') IS NOT NULL
     OR EXISTS (SELECT FROM pg_proc WHERE pronamespace='public'::regnamespace
       AND proname IN ('guard_property_location_version','guard_property_location_pointer'))
     OR EXISTS (SELECT FROM pg_attribute WHERE attrelid=to_regclass('public.property_location_intelligence_state')
       AND attname='current_location_version_id' AND NOT attisdropped) THEN
    RAISE EXCEPTION 'Location namespace collision' USING ERRCODE='55000';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_proc WHERE oid=to_regprocedure('public.owns_property(uuid)')
      AND NOT prosecdef AND provolatile='s' AND proconfig=ARRAY['search_path=public']
      AND regexp_replace(prosrc,'\s+','','g')=
        'SELECTEXISTS(SELECT1FROMpublic.propertiespWHEREp.id=_property_idANDp.user_id=auth.uid());') THEN
    RAISE EXCEPTION 'Frozen ownership helper differs' USING ERRCODE='55000';
  END IF;
  FOREACH n IN ARRAY ARRAY['profiles','properties','acquisition_costs','operating_expenses','financing','investment_criteria','scenario_configs',
      'location_provider_registry','location_fact_definitions','location_freshness_policies','property_location_intelligence_state'] LOOP
    IF NOT EXISTS (SELECT FROM pg_class WHERE oid=to_regclass('public.'||n)
       AND relowner='postgres'::regrole AND relrowsecurity
       AND relforcerowsecurity=(n IN ('location_provider_registry','location_fact_definitions','location_freshness_policies','property_location_intelligence_state'))) THEN
      RAISE EXCEPTION 'Baseline ownership/RLS differs: %',n USING ERRCODE='55000';
    END IF;
  END LOOP;
  IF (SELECT count(*) FROM pg_attribute WHERE attrelid='public.property_location_intelligence_state'::regclass AND attnum>0 AND NOT attisdropped)<>7
     OR NOT EXISTS (SELECT FROM pg_trigger WHERE tgrelid='public.property_location_intelligence_state'::regclass
       AND tgfoid=to_regprocedure('public.guard_property_location_state_row()') AND tgenabled='O')
     OR NOT EXISTS (SELECT FROM pg_proc WHERE oid=to_regprocedure('public.guard_property_location_state_row()')
       AND NOT prosecdef AND proconfig=ARRAY['search_path=pg_catalog']) THEN
    RAISE EXCEPTION 'Accepted state prerequisite differs' USING ERRCODE='55000';
  END IF;
  FOREACH n IN ARRAY ARRAY['anon','authenticated','service_role','authenticator'] LOOP
    SELECT * INTO r FROM pg_roles WHERE rolname=n;
    IF NOT FOUND THEN RAISE EXCEPTION 'Missing role %',n USING ERRCODE='55000'; END IF;
    IF r.rolsuper OR r.rolcreaterole OR r.rolcreatedb OR r.rolbypassrls<>(n='service_role')
       OR has_schema_privilege(n,'public','CREATE') OR has_schema_privilege(n,'extensions','CREATE')
       OR has_schema_privilege(n,'auth','CREATE') THEN
      RAISE EXCEPTION 'Unsafe role/schema authority: %',n USING ERRCODE='55000';
    END IF;
    IF n<>'authenticator' AND EXISTS (SELECT FROM pg_roles other WHERE other.rolname<>n
       AND (pg_has_role(n,other.oid,'SET') OR pg_has_role(n,other.oid,'USAGE'))
       AND (other.rolsuper OR other.rolcreaterole OR other.rolcreatedb OR other.rolbypassrls
         OR other.rolname IN ('postgres','pg_write_all_data','pg_maintain')
         OR has_schema_privilege(other.oid,'public','CREATE')
         OR has_schema_privilege(other.oid,'auth','CREATE')
         OR has_schema_privilege(other.oid,'extensions','CREATE'))) THEN
      RAISE EXCEPTION 'Unsafe inherited/SET authority: %',n USING ERRCODE='55000';
    END IF;
    IF EXISTS (SELECT FROM pg_auth_members m WHERE m.admin_option
        AND (m.member=n::regrole OR pg_has_role(n,m.member,'USAGE') OR pg_has_role(n,m.member,'SET'))) THEN
      RAISE EXCEPTION 'Runtime role has reachable membership administration: %',n USING ERRCODE='55000';
    END IF;
  END LOOP;
  FOREACH signature IN ARRAY ARRAY[
    'extensions.st_makepoint(double precision,double precision)',
    'extensions.st_setsrid(extensions.geometry,integer)',
    'extensions.geography(extensions.geometry)', 'extensions.geometry(extensions.geography)',
    'extensions.st_isempty(extensions.geometry)', 'extensions.st_isvalid(extensions.geometry)',
    'extensions.st_srid(extensions.geometry)', 'extensions.st_ndims(extensions.geometry)'] LOOP
    fn:=to_regprocedure(signature);
    IF fn IS NULL OR NOT EXISTS (SELECT FROM pg_proc WHERE oid=fn AND provolatile='i') THEN
      RAISE EXCEPTION 'Missing/volatile spatial signature: %',signature USING ERRCODE='55000';
    END IF;
    FOREACH n IN ARRAY ARRAY['postgres','service_role'] LOOP
      IF NOT has_function_privilege(n,fn,'EXECUTE') THEN
        RAISE EXCEPTION 'Missing spatial execution privilege: % %',n,signature USING ERRCODE='55000';
      END IF;
    END LOOP;
  END LOOP;
  FOREACH n IN ARRAY ARRAY['postgres','authenticated','service_role'] LOOP
    IF NOT has_schema_privilege(n,'extensions','USAGE')
       OR NOT has_type_privilege(n,'extensions.geography','USAGE')
       OR NOT has_type_privilege(n,'extensions.geometry','USAGE') THEN
      RAISE EXCEPTION 'Missing spatial schema/type access: %',n USING ERRCODE='55000';
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT FROM extensions.spatial_ref_sys WHERE srid=4326 AND auth_name='EPSG' AND auth_srid=4326)
     OR NOT EXISTS (SELECT FROM pg_opclass o JOIN pg_am a ON a.oid=o.opcmethod
       WHERE o.opcnamespace='extensions'::regnamespace AND o.opcname='gist_geography_ops' AND a.amname='gist') THEN
    RAISE EXCEPTION 'Missing WGS84 or geography GiST support' USING ERRCODE='55000';
  END IF;
END
$preflight$;

CREATE TABLE public.property_location_versions (
  id uuid NOT NULL DEFAULT pg_catalog.gen_random_uuid(),
  property_id uuid NOT NULL,
  version_number bigint NOT NULL CHECK (version_number BETWEEN 1 AND 9007199254740991),
  operation_id uuid NOT NULL,
  operation_hash text NOT NULL CHECK (operation_hash ~ '^[0-9a-f]{64}$'),
  property_input_hash text NOT NULL CHECK (property_input_hash ~ '^[0-9a-f]{64}$'),
  input_address text CHECK (input_address IS NULL OR (length(btrim(input_address))>0 AND length(input_address)<=4000)),
  normalized_address text CHECK (normalized_address IS NULL OR (length(btrim(normalized_address))>0 AND length(normalized_address)<=4000)),
  normalization_version text CHECK (normalization_version IS NULL OR (length(btrim(normalization_version))>0 AND length(normalization_version)<=160)),
  longitude double precision,
  latitude double precision,
  position extensions.geography(Point,4326) GENERATED ALWAYS AS
    (CASE WHEN longitude IS NOT NULL AND latitude IS NOT NULL THEN
      extensions.st_setsrid(extensions.st_makepoint(longitude,latitude),4326)::extensions.geography(Point,4326)
    ELSE NULL END) STORED,
  coordinate_source text NOT NULL DEFAULT 'NONE' CHECK (coordinate_source IN ('NONE','USER_PIN','GEOCODER')),
  source_crs text,
  provider_version_id uuid,
  provider_candidate_id text CHECK (provider_candidate_id IS NULL OR (length(btrim(provider_candidate_id))>0 AND length(provider_candidate_id)<=1000)),
  retrieved_at timestamptz,
  coordinate_precision text NOT NULL DEFAULT 'UNKNOWN' CHECK (coordinate_precision IN ('UNKNOWN','ROOFTOP','BUILDING','PARCEL','STREET','LOCALITY','REGION','USER_PIN')),
  accuracy_m double precision CHECK (accuracy_m IS NULL OR (accuracy_m>0 AND accuracy_m<'Infinity'::double precision)),
  geocode_confidence text NOT NULL DEFAULT 'UNKNOWN' CHECK (geocode_confidence IN ('UNKNOWN','LOW','MEDIUM','HIGH')),
  confidence_mapping_version text CHECK (confidence_mapping_version IS NULL OR (length(btrim(confidence_mapping_version))>0 AND length(confidence_mapping_version)<=160)),
  confirmation_status text NOT NULL DEFAULT 'UNCONFIRMED' CHECK (confirmation_status IN ('UNCONFIRMED','REVIEW_REQUIRED','CONFIRMED','CLEARED')),
  confirmed_by uuid,
  confirmed_at timestamptz,
  change_reason text NOT NULL CHECK (change_reason IN ('INITIAL_INPUT','ADDRESS_CHANGED','GEOCODE_SELECTED','PIN_CONFIRMED','LOCATION_CORRECTED','METADATA_CORRECTED','LOCATION_CLEARED')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now() CHECK (isfinite(created_at)),
  CONSTRAINT property_location_versions_pkey PRIMARY KEY (id),
  CONSTRAINT property_location_versions_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT property_location_versions_property_id_id_key UNIQUE(property_id,id),
  CONSTRAINT property_location_versions_property_id_version_number_key UNIQUE(property_id,version_number),
  CONSTRAINT property_location_versions_property_id_operation_id_key UNIQUE(property_id,operation_id),
  CONSTRAINT property_location_versions_provider_version_id_fkey FOREIGN KEY(provider_version_id) REFERENCES public.location_provider_registry(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT property_location_versions_coordinates CHECK (
    (longitude IS NULL AND latitude IS NULL) OR
    (longitude IS NOT NULL AND latitude IS NOT NULL AND longitude BETWEEN -180 AND 180 AND latitude BETWEEN -90 AND 90)),
  CONSTRAINT property_location_versions_source CHECK (
    (coordinate_source='NONE' AND longitude IS NULL AND latitude IS NULL AND source_crs IS NULL
      AND coordinate_precision='UNKNOWN' AND accuracy_m IS NULL AND geocode_confidence='UNKNOWN' AND confidence_mapping_version IS NULL)
    OR (coordinate_source IN ('USER_PIN','GEOCODER') AND longitude IS NOT NULL AND latitude IS NOT NULL
      AND source_crs IS NOT NULL AND source_crs='EPSG:4326'
      AND ((coordinate_source='USER_PIN' AND coordinate_precision='USER_PIN' AND geocode_confidence='UNKNOWN' AND confidence_mapping_version IS NULL)
        OR (coordinate_source='GEOCODER' AND coordinate_precision<>'USER_PIN' AND provider_version_id IS NOT NULL)))),
  CONSTRAINT property_location_versions_provider CHECK (
    (provider_version_id IS NULL AND provider_candidate_id IS NULL AND retrieved_at IS NULL
      AND geocode_confidence='UNKNOWN' AND confidence_mapping_version IS NULL)
    OR (provider_version_id IS NOT NULL AND retrieved_at IS NOT NULL AND isfinite(retrieved_at) AND retrieved_at<=created_at)),
  CONSTRAINT property_location_versions_normalization CHECK (
    (normalized_address IS NULL AND normalization_version IS NULL) OR
    (normalized_address IS NOT NULL AND normalization_version IS NOT NULL AND input_address IS NOT NULL)),
  CONSTRAINT property_location_versions_confidence CHECK (
    (geocode_confidence='UNKNOWN' AND confidence_mapping_version IS NULL) OR
    (geocode_confidence<>'UNKNOWN' AND confidence_mapping_version IS NOT NULL)),
  CONSTRAINT property_location_versions_confirmation CHECK (
    (confirmation_status='CONFIRMED' AND longitude IS NOT NULL AND latitude IS NOT NULL
      AND confirmed_by IS NOT NULL AND confirmed_by=created_by AND confirmed_at IS NOT NULL
      AND isfinite(confirmed_at) AND confirmed_at=created_at)
    OR (confirmation_status<>'CONFIRMED' AND confirmed_by IS NULL AND confirmed_at IS NULL)),
  CONSTRAINT property_location_versions_status CHECK (
    (confirmation_status='UNCONFIRMED' AND input_address IS NOT NULL AND coordinate_source='NONE') OR
    (confirmation_status='REVIEW_REQUIRED' AND (input_address IS NOT NULL OR longitude IS NOT NULL)) OR
    (confirmation_status='CONFIRMED' AND longitude IS NOT NULL) OR
    (confirmation_status='CLEARED' AND coordinate_source='NONE' AND input_address IS NULL AND normalized_address IS NULL
      AND normalization_version IS NULL AND provider_version_id IS NULL AND provider_candidate_id IS NULL AND retrieved_at IS NULL)),
  CONSTRAINT property_location_versions_reason CHECK (
    (change_reason='LOCATION_CLEARED')=(confirmation_status='CLEARED')
    AND (change_reason<>'PIN_CONFIRMED' OR (confirmation_status='CONFIRMED' AND coordinate_source='USER_PIN'))
    AND (change_reason<>'GEOCODE_SELECTED' OR (coordinate_source='GEOCODER' AND longitude IS NOT NULL))),
  CONSTRAINT property_location_versions_position CHECK (position IS NULL OR
    (NOT extensions.st_isempty(position::extensions.geometry) AND extensions.st_isvalid(position::extensions.geometry)
      AND extensions.st_srid(position::extensions.geometry)=4326 AND extensions.st_ndims(position::extensions.geometry)=2))
);
CREATE INDEX property_location_versions_provider_version_idx ON public.property_location_versions(provider_version_id) WHERE provider_version_id IS NOT NULL;
CREATE INDEX property_location_versions_position_gist ON public.property_location_versions USING gist(position) WHERE position IS NOT NULL;
ALTER TABLE public.property_location_intelligence_state ADD COLUMN current_location_version_id uuid DEFAULT NULL;
ALTER TABLE public.property_location_intelligence_state ADD CONSTRAINT property_location_intelligence_state_current_location_fkey
  FOREIGN KEY(property_id,current_location_version_id) REFERENCES public.property_location_versions(property_id,id)
  MATCH SIMPLE ON UPDATE RESTRICT ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;

CREATE FUNCTION public.guard_property_location_version() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $guard$
BEGIN
  IF TG_TABLE_SCHEMA<>'public' OR TG_TABLE_NAME<>'property_location_versions' OR TG_WHEN<>'BEFORE'
     OR TG_LEVEL<>'ROW' OR TG_NARGS<>0 OR TG_OP NOT IN ('INSERT','UPDATE','DELETE') THEN
    RAISE EXCEPTION 'Unsupported location guard attachment' USING ERRCODE='23514';
  END IF;
  IF TG_OP='UPDATE' THEN
    RAISE EXCEPTION 'Location history is immutable' USING ERRCODE='23514';
  ELSIF TG_OP='DELETE' THEN
    IF EXISTS(SELECT FROM public.properties WHERE id=OLD.property_id) THEN
      RAISE EXCEPTION 'Location history can only cascade with its parent' USING ERRCODE='23514';
    END IF;
    RETURN OLD;
  END IF;
  -- BEFORE generated geography: do not read NEW.position or allow PostGIS coercion.
  IF (NEW.longitude IS NULL)<>(NEW.latitude IS NULL)
     OR (NEW.longitude IS NOT NULL AND NOT (NEW.longitude BETWEEN -180 AND 180 AND NEW.latitude BETWEEN -90 AND 90))
     OR (NEW.longitude IS NOT NULL AND NEW.source_crs IS DISTINCT FROM 'EPSG:4326') THEN
    RAISE EXCEPTION 'Invalid WGS84 coordinate pair or source CRS' USING ERRCODE='23514';
  END IF;
  NEW.created_at:=transaction_timestamp();
  IF NEW.confirmation_status='CONFIRMED' THEN NEW.confirmed_at:=NEW.created_at; END IF;
  IF NEW.provider_version_id IS NOT NULL AND NOT EXISTS (
    SELECT FROM public.location_provider_registry p WHERE p.id=NEW.provider_version_id
      AND p.deprecated_at IS NULL AND p.approval_state IN ('PROVISIONAL','APPROVED')
      AND p.retention_class='PERMANENT' AND p.reviewed_at IS NOT NULL
      AND p.terms_reference IS NOT NULL AND p.review_reference IS NOT NULL
      AND 'GEOCODING'=ANY(p.capabilities)) THEN
    RAISE EXCEPTION 'Ineligible provider version' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END
$guard$;

CREATE FUNCTION public.guard_property_location_pointer() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $guard$
DECLARE latest uuid;
BEGIN
  IF TG_TABLE_SCHEMA<>'public' OR TG_TABLE_NAME<>'property_location_intelligence_state' OR TG_WHEN<>'BEFORE'
     OR TG_LEVEL<>'ROW' OR TG_NARGS<>0 OR TG_OP NOT IN ('INSERT','UPDATE') THEN
    RAISE EXCEPTION 'Unsupported pointer guard attachment' USING ERRCODE='23514';
  END IF;
  IF TG_OP='UPDATE' THEN
    IF NEW.property_id IS DISTINCT FROM OLD.property_id THEN
      RAISE EXCEPTION 'State parent is immutable' USING ERRCODE='23514';
    END IF;
    IF NEW.current_location_version_id IS NOT DISTINCT FROM OLD.current_location_version_id THEN RETURN NEW; END IF;
    IF NEW.current_location_version_id IS NULL THEN
      RAISE EXCEPTION 'Append CLEARED instead of resetting pointer' USING ERRCODE='23514';
    END IF;
  END IF;
  IF NEW.current_location_version_id IS NULL THEN RETURN NEW; END IF;
  PERFORM 1 FROM public.properties WHERE id=NEW.property_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Missing parent property' USING ERRCODE='23503'; END IF;
  SELECT id INTO latest FROM public.property_location_versions WHERE property_id=NEW.property_id ORDER BY version_number DESC LIMIT 1;
  IF latest IS DISTINCT FROM NEW.current_location_version_id THEN
    RAISE EXCEPTION 'Pointer must target newest version of this property' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END
$guard$;

CREATE TRIGGER property_location_versions_guard BEFORE INSERT OR UPDATE OR DELETE ON public.property_location_versions
  FOR EACH ROW EXECUTE FUNCTION public.guard_property_location_version();
CREATE TRIGGER property_location_pointer_guard BEFORE INSERT OR UPDATE ON public.property_location_intelligence_state
  FOR EACH ROW EXECUTE FUNCTION public.guard_property_location_pointer();
ALTER TABLE public.property_location_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_location_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY property_location_versions_select_own ON public.property_location_versions FOR SELECT TO authenticated
  USING (public.owns_property(property_id));

-- Only these new objects: never change shared defaults, extension or Phase 1 ACLs.
DO $acl$
DECLARE r record;
BEGIN
  FOR r IN SELECT a.grantee FROM pg_class c,
    LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
    WHERE c.oid='public.property_location_versions'::regclass AND a.grantee<>c.relowner LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.property_location_versions FROM %s CASCADE',
      CASE WHEN r.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(r.grantee)) END);
  END LOOP;
  FOR r IN SELECT p.proname,a.grantee FROM pg_proc p,
    LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
    WHERE p.oid IN ('public.guard_property_location_version()'::regprocedure,'public.guard_property_location_pointer()'::regprocedure)
      AND a.grantee<>p.proowner LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON FUNCTION public.%I() FROM %s CASCADE',r.proname,
      CASE WHEN r.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(r.grantee)) END);
  END LOOP;
END
$acl$;
GRANT SELECT ON public.property_location_versions TO authenticated,service_role;
GRANT INSERT ON public.property_location_versions TO service_role;

DO $verify$
DECLARE t text; r text; p text; expected boolean;
BEGIN
  FOREACH t IN ARRAY ARRAY['property_location_versions','property_location_intelligence_state','location_provider_registry'] LOOP
    FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role','authenticator'] LOOP
      FOREACH p IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] LOOP
        expected:=(r IN ('authenticated','service_role') AND p='SELECT') OR
          (r='service_role' AND p='INSERT' AND t<>'location_provider_registry') OR
          (r='service_role' AND p='UPDATE' AND t='property_location_intelligence_state');
        IF has_table_privilege(r,'public.'||t,p) IS DISTINCT FROM expected
           OR has_table_privilege(r,'public.'||t,p||' WITH GRANT OPTION') THEN
          RAISE EXCEPTION 'Effective/inherited ACL mismatch: %.% %',r,t,p USING ERRCODE='55000';
        END IF;
      END LOOP;
    END LOOP;
    IF EXISTS(SELECT FROM pg_attribute WHERE attrelid=to_regclass('public.'||t) AND attacl IS NOT NULL) THEN
      RAISE EXCEPTION 'Unexpected column ACL: %',t USING ERRCODE='55000';
    END IF;
  END LOOP;
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role','authenticator'] LOOP
    IF has_function_privilege(r,'public.guard_property_location_version()','EXECUTE')
       OR has_function_privilege(r,'public.guard_property_location_pointer()','EXECUTE') THEN
      RAISE EXCEPTION 'Effective guard EXECUTE remains: %',r USING ERRCODE='55000';
    END IF;
  END LOOP;
END
$verify$;
COMMIT;
