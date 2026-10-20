-- Phase 2A-01, foundation specification revision 1.1. No seeds or Phase 1 changes.
-- PostgreSQL 17; execute as the verified trusted postgres migration identity.
BEGIN;

DO $preflight$
DECLARE n text; r record;
BEGIN
  IF current_user <> 'postgres' OR NOT (SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user)
     OR current_setting('server_version_num')::integer < 170000 THEN
    RAISE EXCEPTION 'Requires verified postgres/BYPASSRLS on PostgreSQL 17+';
  END IF;
  FOREACH n IN ARRAY ARRAY['location_provider_registry', 'location_fact_definitions', 'location_freshness_policies', 'property_location_intelligence_state'] LOOP
    IF to_regclass('public.'||n) IS NOT NULL OR to_regtype('public.'||n) IS NOT NULL THEN
      RAISE EXCEPTION 'Foundation namespace collision: %', n;
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname IN ('guard_location_registry_row','guard_property_location_state_row')) THEN
    RAISE EXCEPTION 'Foundation function namespace collision';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.owns_property(uuid)')
      AND NOT prosecdef AND provolatile='s' AND proconfig=ARRAY['search_path=public']
      AND regexp_replace(prosrc, '\s+', '', 'g') =
          'SELECTEXISTS(SELECT1FROMpublic.propertiespWHEREp.id=_property_idANDp.user_id=auth.uid());') THEN
    RAISE EXCEPTION 'Frozen invoker ownership helper differs';
  END IF;
  FOREACH n IN ARRAY ARRAY['profiles','properties','acquisition_costs','operating_expenses','financing','investment_criteria','scenario_configs'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid=to_regclass('public.'||n)
       AND relowner='postgres'::regrole AND relrowsecurity AND NOT relforcerowsecurity) THEN
      RAISE EXCEPTION 'Phase 1 ownership/RLS prerequisite differs: %',n;
    END IF;
  END LOOP;
  FOREACH n IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    SELECT * INTO r FROM pg_roles WHERE rolname=n;
    IF NOT FOUND THEN RAISE EXCEPTION 'Missing API role %', n; END IF;
    IF r.rolsuper OR r.rolcreaterole OR r.rolcreatedb OR r.rolbypassrls <> (n='service_role')
       OR has_schema_privilege(n,'public','CREATE') OR NOT has_schema_privilege(n,'public','USAGE')
       OR has_schema_privilege(n,'auth','CREATE') OR has_schema_privilege(n,'extensions','CREATE') THEN
      RAISE EXCEPTION 'Unsafe API role/schema prerequisites: %',n;
    END IF;
  END LOOP;
END
$preflight$;

CREATE TABLE public.location_provider_registry (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  provider_key text NOT NULL CHECK (length(provider_key) BETWEEN 1 AND 160 AND provider_key ~ '^[a-z][a-z0-9_]*$'),
  provider_version integer NOT NULL CHECK (provider_version > 0),
  display_name text NOT NULL CHECK (length(btrim(display_name)) > 0),
  capabilities text[] NOT NULL CHECK (array_ndims(capabilities)=1 AND cardinality(capabilities)>0
    AND array_position(capabilities,NULL) IS NULL
    AND capabilities <@ ARRAY['GEOCODING','PLACES','ROUTING','MAP_RENDERING']::text[]),
  approval_state text NOT NULL DEFAULT 'UNREVIEWED' CHECK (approval_state IN ('UNREVIEWED','PROVISIONAL','APPROVED','DISABLED')),
  retention_class text NOT NULL DEFAULT 'UNREVIEWED' CHECK (retention_class IN ('UNREVIEWED','PERMANENT','TEMPORARY_30_DAY','ID_ONLY_PERMANENT','NO_PERSISTENCE')),
  retention_limit_seconds bigint DEFAULT NULL,
  attribution_required boolean NOT NULL DEFAULT true,
  attribution_text text DEFAULT NULL CHECK (attribution_text IS NULL OR (length(btrim(attribution_text))>0 AND length(attribution_text)<=4000)),
  terms_reference text DEFAULT NULL CHECK (terms_reference IS NULL OR (length(btrim(terms_reference))>0 AND length(terms_reference)<=1000)),
  review_reference text DEFAULT NULL CHECK (review_reference IS NULL OR (length(btrim(review_reference))>0 AND length(review_reference)<=1000)),
  reviewed_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deprecated_at timestamptz DEFAULT NULL,
  CHECK (isfinite(created_at)),
  CHECK (deprecated_at IS NULL OR (isfinite(deprecated_at) AND deprecated_at >= created_at)),
  UNIQUE(provider_key,provider_version),
  CHECK (reviewed_at IS NULL OR (isfinite(reviewed_at) AND reviewed_at<=created_at)),
  CHECK ((terms_reference IS NULL AND review_reference IS NULL AND reviewed_at IS NULL)
      OR (terms_reference IS NOT NULL AND review_reference IS NOT NULL AND reviewed_at IS NOT NULL)),
  CHECK (approval_state<>'UNREVIEWED' OR (retention_class='UNREVIEWED' AND reviewed_at IS NULL)),
  CHECK (approval_state NOT IN ('PROVISIONAL','APPROVED') OR (retention_class<>'UNREVIEWED' AND reviewed_at IS NOT NULL)),
  CHECK (retention_class='UNREVIEWED' OR reviewed_at IS NOT NULL),
  CHECK (reviewed_at IS NULL OR NOT attribution_required OR attribution_text IS NOT NULL),
  CHECK ((retention_class='TEMPORARY_30_DAY' AND retention_limit_seconds IS NOT NULL AND retention_limit_seconds BETWEEN 1 AND 2592000)
      OR (retention_class<>'TEMPORARY_30_DAY' AND retention_limit_seconds IS NULL))
);

CREATE TABLE public.location_fact_definitions (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  fact_key text NOT NULL CHECK (length(fact_key) BETWEEN 1 AND 160 AND fact_key ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  definition_version integer NOT NULL CHECK (definition_version>0),
  display_name text NOT NULL CHECK (length(btrim(display_name))>0 AND length(display_name)<=200),
  semantic_definition text NOT NULL CHECK (length(btrim(semantic_definition))>0 AND length(semantic_definition)<=8000),
  category text NOT NULL,
  value_type text NOT NULL,
  unit text NOT NULL,
  measurement_method text NOT NULL,
  aggregation_scope text NOT NULL,
  entity_taxonomy_key text NOT NULL,
  taxonomy_version integer NOT NULL CHECK (taxonomy_version>0),
  coverage_requirement text NOT NULL,
  radius_required boolean NOT NULL,
  duration_required boolean NOT NULL,
  zero_semantics text NOT NULL,
  allowed_category_values text[] DEFAULT NULL,
  contract_reference text NOT NULL CHECK (length(btrim(contract_reference))>0 AND length(contract_reference)<=1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  deprecated_at timestamptz DEFAULT NULL,
  CHECK (isfinite(created_at)),
  CHECK (deprecated_at IS NULL OR (isfinite(deprecated_at) AND deprecated_at >= created_at)),
  UNIQUE(fact_key,definition_version),
  CONSTRAINT location_fact_definitions_exact_contract CHECK (CASE fact_key
      WHEN 'transport.rail_station.nearest_straight_line_m' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('TRANSPORT', 'rail_station', 'DECIMAL', 'm', 'STRAIGHT_LINE', 'NEAREST_ELIGIBLE', 'COMPLETE_RADIUS', false, false, 'MEASURED_ZERO')
      WHEN 'transport.rail_station.nearest_walking_route_m' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('TRANSPORT', 'rail_station', 'DECIMAL', 'm', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'transport.rail_station.nearest_walking_route_s' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('TRANSPORT', 'rail_station', 'DECIMAL', 's', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'transport.rail_station.count_within_radius' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('TRANSPORT', 'rail_station', 'INTEGER', 'count', 'STRAIGHT_LINE', 'WITHIN_RADIUS', 'COMPLETE_RADIUS', true, false, 'PROVEN_EMPTY_SCOPE')
      WHEN 'transport.bus_stop.nearest_straight_line_m' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('TRANSPORT', 'bus_stop', 'DECIMAL', 'm', 'STRAIGHT_LINE', 'NEAREST_ELIGIBLE', 'COMPLETE_RADIUS', false, false, 'MEASURED_ZERO')
      WHEN 'transport.bus_stop.nearest_walking_route_m' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('TRANSPORT', 'bus_stop', 'DECIMAL', 'm', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'transport.bus_stop.nearest_walking_route_s' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('TRANSPORT', 'bus_stop', 'DECIMAL', 's', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'transport.bus_stop.count_within_radius' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('TRANSPORT', 'bus_stop', 'INTEGER', 'count', 'STRAIGHT_LINE', 'WITHIN_RADIUS', 'COMPLETE_RADIUS', true, false, 'PROVEN_EMPTY_SCOPE')
      WHEN 'daily_convenience.supermarket.nearest_straight_line_m' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'supermarket', 'DECIMAL', 'm', 'STRAIGHT_LINE', 'NEAREST_ELIGIBLE', 'COMPLETE_RADIUS', false, false, 'MEASURED_ZERO')
      WHEN 'daily_convenience.supermarket.nearest_walking_route_m' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'supermarket', 'DECIMAL', 'm', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'daily_convenience.supermarket.nearest_walking_route_s' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'supermarket', 'DECIMAL', 's', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'daily_convenience.supermarket.count_within_radius' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'supermarket', 'INTEGER', 'count', 'STRAIGHT_LINE', 'WITHIN_RADIUS', 'COMPLETE_RADIUS', true, false, 'PROVEN_EMPTY_SCOPE')
      WHEN 'daily_convenience.pharmacy.nearest_straight_line_m' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'pharmacy', 'DECIMAL', 'm', 'STRAIGHT_LINE', 'NEAREST_ELIGIBLE', 'COMPLETE_RADIUS', false, false, 'MEASURED_ZERO')
      WHEN 'daily_convenience.pharmacy.nearest_walking_route_m' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'pharmacy', 'DECIMAL', 'm', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'daily_convenience.pharmacy.nearest_walking_route_s' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'pharmacy', 'DECIMAL', 's', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'daily_convenience.pharmacy.count_within_radius' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'pharmacy', 'INTEGER', 'count', 'STRAIGHT_LINE', 'WITHIN_RADIUS', 'COMPLETE_RADIUS', true, false, 'PROVEN_EMPTY_SCOPE')
      WHEN 'daily_convenience.convenience_store.nearest_straight_line_m' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'convenience_store', 'DECIMAL', 'm', 'STRAIGHT_LINE', 'NEAREST_ELIGIBLE', 'COMPLETE_RADIUS', false, false, 'MEASURED_ZERO')
      WHEN 'daily_convenience.convenience_store.nearest_walking_route_m' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'convenience_store', 'DECIMAL', 'm', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'daily_convenience.convenience_store.nearest_walking_route_s' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'convenience_store', 'DECIMAL', 's', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'daily_convenience.convenience_store.count_within_radius' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'convenience_store', 'INTEGER', 'count', 'STRAIGHT_LINE', 'WITHIN_RADIUS', 'COMPLETE_RADIUS', true, false, 'PROVEN_EMPTY_SCOPE')
      WHEN 'daily_convenience.bank_atm.nearest_straight_line_m' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'bank_atm', 'DECIMAL', 'm', 'STRAIGHT_LINE', 'NEAREST_ELIGIBLE', 'COMPLETE_RADIUS', false, false, 'MEASURED_ZERO')
      WHEN 'daily_convenience.bank_atm.nearest_walking_route_m' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'bank_atm', 'DECIMAL', 'm', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'daily_convenience.bank_atm.nearest_walking_route_s' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'bank_atm', 'DECIMAL', 's', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'daily_convenience.bank_atm.count_within_radius' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'bank_atm', 'INTEGER', 'count', 'STRAIGHT_LINE', 'WITHIN_RADIUS', 'COMPLETE_RADIUS', true, false, 'PROVEN_EMPTY_SCOPE')
      WHEN 'education.school.nearest_straight_line_m' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('EDUCATION', 'school', 'DECIMAL', 'm', 'STRAIGHT_LINE', 'NEAREST_ELIGIBLE', 'COMPLETE_RADIUS', false, false, 'MEASURED_ZERO')
      WHEN 'education.school.nearest_walking_route_m' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('EDUCATION', 'school', 'DECIMAL', 'm', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'education.school.nearest_walking_route_s' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('EDUCATION', 'school', 'DECIMAL', 's', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'education.school.count_within_radius' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('EDUCATION', 'school', 'INTEGER', 'count', 'STRAIGHT_LINE', 'WITHIN_RADIUS', 'COMPLETE_RADIUS', true, false, 'PROVEN_EMPTY_SCOPE')
      WHEN 'education.university_college.nearest_straight_line_m' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('EDUCATION', 'university_college', 'DECIMAL', 'm', 'STRAIGHT_LINE', 'NEAREST_ELIGIBLE', 'COMPLETE_RADIUS', false, false, 'MEASURED_ZERO')
      WHEN 'education.university_college.nearest_walking_route_m' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('EDUCATION', 'university_college', 'DECIMAL', 'm', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'education.university_college.nearest_walking_route_s' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('EDUCATION', 'university_college', 'DECIMAL', 's', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'education.university_college.count_within_radius' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('EDUCATION', 'university_college', 'INTEGER', 'count', 'STRAIGHT_LINE', 'WITHIN_RADIUS', 'COMPLETE_RADIUS', true, false, 'PROVEN_EMPTY_SCOPE')
      WHEN 'education.international_school.nearest_straight_line_m' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('EDUCATION', 'international_school', 'DECIMAL', 'm', 'STRAIGHT_LINE', 'NEAREST_ELIGIBLE', 'COMPLETE_RADIUS', false, false, 'MEASURED_ZERO')
      WHEN 'education.international_school.nearest_walking_route_m' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('EDUCATION', 'international_school', 'DECIMAL', 'm', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'education.international_school.nearest_walking_route_s' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('EDUCATION', 'international_school', 'DECIMAL', 's', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'education.international_school.count_within_radius' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('EDUCATION', 'international_school', 'INTEGER', 'count', 'STRAIGHT_LINE', 'WITHIN_RADIUS', 'COMPLETE_RADIUS', true, false, 'PROVEN_EMPTY_SCOPE')
      WHEN 'healthcare.hospital_medical_centre.nearest_straight_line_m' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('HEALTHCARE', 'hospital_medical_centre', 'DECIMAL', 'm', 'STRAIGHT_LINE', 'NEAREST_ELIGIBLE', 'COMPLETE_RADIUS', false, false, 'MEASURED_ZERO')
      WHEN 'healthcare.hospital_medical_centre.nearest_walking_route_m' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('HEALTHCARE', 'hospital_medical_centre', 'DECIMAL', 'm', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'healthcare.hospital_medical_centre.nearest_walking_route_s' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('HEALTHCARE', 'hospital_medical_centre', 'DECIMAL', 's', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'healthcare.hospital_medical_centre.count_within_radius' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('HEALTHCARE', 'hospital_medical_centre', 'INTEGER', 'count', 'STRAIGHT_LINE', 'WITHIN_RADIUS', 'COMPLETE_RADIUS', true, false, 'PROVEN_EMPTY_SCOPE')
      WHEN 'healthcare.hospital_medical_centre.nearest_driving_route_m' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('HEALTHCARE', 'hospital_medical_centre', 'DECIMAL', 'm', 'DRIVING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'healthcare.hospital_medical_centre.nearest_driving_route_s' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('HEALTHCARE', 'hospital_medical_centre', 'DECIMAL', 's', 'DRIVING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'healthcare.clinic.nearest_straight_line_m' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('HEALTHCARE', 'clinic', 'DECIMAL', 'm', 'STRAIGHT_LINE', 'NEAREST_ELIGIBLE', 'COMPLETE_RADIUS', false, false, 'MEASURED_ZERO')
      WHEN 'healthcare.clinic.nearest_walking_route_m' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('HEALTHCARE', 'clinic', 'DECIMAL', 'm', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'healthcare.clinic.nearest_walking_route_s' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('HEALTHCARE', 'clinic', 'DECIMAL', 's', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'healthcare.clinic.count_within_radius' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('HEALTHCARE', 'clinic', 'INTEGER', 'count', 'STRAIGHT_LINE', 'WITHIN_RADIUS', 'COMPLETE_RADIUS', true, false, 'PROVEN_EMPTY_SCOPE')
      WHEN 'healthcare.clinic.nearest_driving_route_m' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('HEALTHCARE', 'clinic', 'DECIMAL', 'm', 'DRIVING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'healthcare.clinic.nearest_driving_route_s' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('HEALTHCARE', 'clinic', 'DECIMAL', 's', 'DRIVING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'retail.significant_retail_centre.nearest_straight_line_m' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('RETAIL', 'significant_retail_centre', 'DECIMAL', 'm', 'STRAIGHT_LINE', 'NEAREST_ELIGIBLE', 'COMPLETE_RADIUS', false, false, 'MEASURED_ZERO')
      WHEN 'retail.significant_retail_centre.nearest_driving_route_m' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('RETAIL', 'significant_retail_centre', 'DECIMAL', 'm', 'DRIVING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'retail.significant_retail_centre.nearest_driving_route_s' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('RETAIL', 'significant_retail_centre', 'DECIMAL', 's', 'DRIVING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'retail.significant_retail_centre.count_within_radius' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('RETAIL', 'significant_retail_centre', 'INTEGER', 'count', 'STRAIGHT_LINE', 'WITHIN_RADIUS', 'COMPLETE_RADIUS', true, false, 'PROVEN_EMPTY_SCOPE')
      WHEN 'road.major_road_access.nearest_driving_route_m' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('ROAD', 'major_road_access', 'DECIMAL', 'm', 'DRIVING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'road.major_road_access.nearest_driving_route_s' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('ROAD', 'major_road_access', 'DECIMAL', 's', 'DRIVING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'road.expressway_interchange.nearest_driving_route_m' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('ROAD', 'expressway_interchange', 'DECIMAL', 'm', 'DRIVING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'road.expressway_interchange.nearest_driving_route_s' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('ROAD', 'expressway_interchange', 'DECIMAL', 's', 'DRIVING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'employment.significant_economic_node.nearest_driving_route_m' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('EMPLOYMENT', 'significant_economic_node', 'DECIMAL', 'm', 'DRIVING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'employment.significant_economic_node.nearest_driving_route_s' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('EMPLOYMENT', 'significant_economic_node', 'DECIMAL', 's', 'DRIVING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'employment.significant_economic_node.count_within_driving_duration' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('EMPLOYMENT', 'significant_economic_node', 'INTEGER', 'count', 'DRIVING_ROUTE', 'WITHIN_DURATION', 'COMPLETE_CANDIDATE_SET', false, true, 'PROVEN_EMPTY_SCOPE')
      WHEN 'daily_convenience.essential_categories.coverage_ratio' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'essential_categories', 'DECIMAL', 'ratio', 'CATEGORY_PRESENCE', 'CATEGORY_COVERAGE', 'COMPLETE_CATEGORY_SET', true, false, 'PROVEN_EMPTY_SCOPE')
      WHEN 'context.area.classification' THEN ROW(category, entity_taxonomy_key, value_type, unit, measurement_method, aggregation_scope, coverage_requirement, radius_required, duration_required, zero_semantics) IS NOT DISTINCT FROM ROW('CONTEXT', 'area', 'CATEGORY', 'category', 'DETERMINISTIC_CLASSIFIER', 'AREA_CONTEXT', 'COMPLETE_AREA_FEATURES', false, false, 'NOT_ALLOWED')
      ELSE false END),
  CONSTRAINT location_fact_definitions_exact_labels CHECK (
    (fact_key='context.area.classification' AND allowed_category_values IS NOT DISTINCT FROM ARRAY['REGIONAL_LOW_TRANSIT','SUBURBAN','URBAN_GENERAL','URBAN_TRANSIT']::text[])
    OR (fact_key<>'context.area.classification' AND allowed_category_values IS NULL))
);

CREATE TABLE public.location_freshness_policies (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  policy_key text NOT NULL CHECK (length(policy_key) BETWEEN 1 AND 160 AND policy_key ~ '^[a-z][a-z0-9_]*$'),
  policy_version integer NOT NULL CHECK (policy_version>0),
  category text NOT NULL CHECK (category IN ('GEOCODING','TRANSPORT','ROAD','DAILY_CONVENIENCE','EDUCATION','HEALTHCARE','EMPLOYMENT','RETAIL','CONTEXT','ROUTING')),
  age_basis text NOT NULL CHECK (age_basis IN ('OBSERVED_AT','RETRIEVED_AT')),
  fresh_for_seconds bigint NOT NULL,
  expire_after_seconds bigint NOT NULL,
  description text NOT NULL CHECK (length(btrim(description))>0 AND length(description)<=4000),
  approval_reference text NOT NULL CHECK (length(btrim(approval_reference))>0 AND length(approval_reference)<=1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  deprecated_at timestamptz DEFAULT NULL,
  CHECK (isfinite(created_at)),
  CHECK (deprecated_at IS NULL OR (isfinite(deprecated_at) AND deprecated_at >= created_at)),
  UNIQUE(policy_key,policy_version),
  CHECK (0<fresh_for_seconds AND fresh_for_seconds<expire_after_seconds AND expire_after_seconds<=9007199254740991)
);

CREATE TABLE public.property_location_intelligence_state (
  property_id uuid PRIMARY KEY REFERENCES public.properties(id) ON DELETE CASCADE ON UPDATE RESTRICT,
  processing_status text NOT NULL DEFAULT 'NOT_STARTED' CHECK (processing_status='NOT_STARTED'),
  freshness_status text NOT NULL DEFAULT 'UNKNOWN' CHECK (freshness_status='UNKNOWN'),
  publication_status text NOT NULL DEFAULT 'NOT_ASSESSED' CHECK (publication_status='NOT_ASSESSED'),
  state_revision bigint NOT NULL DEFAULT 0 CHECK (state_revision BETWEEN 0 AND 9007199254740991),
  created_at timestamptz NOT NULL DEFAULT now() CHECK (isfinite(created_at)),
  updated_at timestamptz NOT NULL DEFAULT now() CHECK (isfinite(updated_at) AND updated_at>=created_at)
);

CREATE FUNCTION public.guard_location_registry_row() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $guard$
DECLARE canonical text[];
BEGIN
  IF TG_TABLE_SCHEMA<>'public' OR TG_TABLE_NAME NOT IN
      ('location_provider_registry','location_fact_definitions','location_freshness_policies')
      OR TG_WHEN<>'BEFORE' OR TG_LEVEL<>'ROW' OR TG_NARGS<>0
      OR TG_OP NOT IN ('INSERT','UPDATE','DELETE') THEN
    RAISE EXCEPTION 'Unsupported registry guard attachment' USING ERRCODE='23514';
  END IF;
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'Registry history cannot be deleted' USING ERRCODE='23514';
  ELSIF TG_OP='UPDATE' THEN
    IF (to_jsonb(NEW)-'deprecated_at') IS DISTINCT FROM (to_jsonb(OLD)-'deprecated_at')
       OR OLD.deprecated_at IS NOT NULL OR NEW.deprecated_at IS NULL THEN
      RAISE EXCEPTION 'Only one-way registry deprecation is permitted' USING ERRCODE='23514';
    END IF;
    NEW.deprecated_at := transaction_timestamp();
    RETURN NEW;
  END IF;
  IF NEW.deprecated_at IS NOT NULL THEN
    RAISE EXCEPTION 'New registry versions cannot be deprecated' USING ERRCODE='23514';
  END IF;
  NEW.created_at := transaction_timestamp();
  IF TG_TABLE_NAME='location_provider_registry' THEN
    IF NEW.capabilities IS NULL OR array_ndims(NEW.capabilities) IS DISTINCT FROM 1
       OR cardinality(NEW.capabilities)=0 OR array_position(NEW.capabilities,NULL) IS NOT NULL THEN
      RAISE EXCEPTION 'Invalid capabilities array' USING ERRCODE='23514';
    END IF;
    SELECT array_agg(DISTINCT v COLLATE "C" ORDER BY v COLLATE "C") INTO canonical FROM unnest(NEW.capabilities) v;
    IF cardinality(canonical)<>cardinality(NEW.capabilities) THEN
      RAISE EXCEPTION 'Duplicate capabilities' USING ERRCODE='23514';
    END IF;
    NEW.capabilities := canonical;
  ELSIF TG_TABLE_NAME='location_fact_definitions' THEN
    IF NOT (CASE NEW.fact_key
      WHEN 'transport.rail_station.nearest_straight_line_m' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('TRANSPORT', 'rail_station', 'DECIMAL', 'm', 'STRAIGHT_LINE', 'NEAREST_ELIGIBLE', 'COMPLETE_RADIUS', false, false, 'MEASURED_ZERO')
      WHEN 'transport.rail_station.nearest_walking_route_m' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('TRANSPORT', 'rail_station', 'DECIMAL', 'm', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'transport.rail_station.nearest_walking_route_s' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('TRANSPORT', 'rail_station', 'DECIMAL', 's', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'transport.rail_station.count_within_radius' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('TRANSPORT', 'rail_station', 'INTEGER', 'count', 'STRAIGHT_LINE', 'WITHIN_RADIUS', 'COMPLETE_RADIUS', true, false, 'PROVEN_EMPTY_SCOPE')
      WHEN 'transport.bus_stop.nearest_straight_line_m' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('TRANSPORT', 'bus_stop', 'DECIMAL', 'm', 'STRAIGHT_LINE', 'NEAREST_ELIGIBLE', 'COMPLETE_RADIUS', false, false, 'MEASURED_ZERO')
      WHEN 'transport.bus_stop.nearest_walking_route_m' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('TRANSPORT', 'bus_stop', 'DECIMAL', 'm', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'transport.bus_stop.nearest_walking_route_s' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('TRANSPORT', 'bus_stop', 'DECIMAL', 's', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'transport.bus_stop.count_within_radius' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('TRANSPORT', 'bus_stop', 'INTEGER', 'count', 'STRAIGHT_LINE', 'WITHIN_RADIUS', 'COMPLETE_RADIUS', true, false, 'PROVEN_EMPTY_SCOPE')
      WHEN 'daily_convenience.supermarket.nearest_straight_line_m' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'supermarket', 'DECIMAL', 'm', 'STRAIGHT_LINE', 'NEAREST_ELIGIBLE', 'COMPLETE_RADIUS', false, false, 'MEASURED_ZERO')
      WHEN 'daily_convenience.supermarket.nearest_walking_route_m' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'supermarket', 'DECIMAL', 'm', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'daily_convenience.supermarket.nearest_walking_route_s' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'supermarket', 'DECIMAL', 's', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'daily_convenience.supermarket.count_within_radius' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'supermarket', 'INTEGER', 'count', 'STRAIGHT_LINE', 'WITHIN_RADIUS', 'COMPLETE_RADIUS', true, false, 'PROVEN_EMPTY_SCOPE')
      WHEN 'daily_convenience.pharmacy.nearest_straight_line_m' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'pharmacy', 'DECIMAL', 'm', 'STRAIGHT_LINE', 'NEAREST_ELIGIBLE', 'COMPLETE_RADIUS', false, false, 'MEASURED_ZERO')
      WHEN 'daily_convenience.pharmacy.nearest_walking_route_m' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'pharmacy', 'DECIMAL', 'm', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'daily_convenience.pharmacy.nearest_walking_route_s' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'pharmacy', 'DECIMAL', 's', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'daily_convenience.pharmacy.count_within_radius' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'pharmacy', 'INTEGER', 'count', 'STRAIGHT_LINE', 'WITHIN_RADIUS', 'COMPLETE_RADIUS', true, false, 'PROVEN_EMPTY_SCOPE')
      WHEN 'daily_convenience.convenience_store.nearest_straight_line_m' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'convenience_store', 'DECIMAL', 'm', 'STRAIGHT_LINE', 'NEAREST_ELIGIBLE', 'COMPLETE_RADIUS', false, false, 'MEASURED_ZERO')
      WHEN 'daily_convenience.convenience_store.nearest_walking_route_m' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'convenience_store', 'DECIMAL', 'm', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'daily_convenience.convenience_store.nearest_walking_route_s' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'convenience_store', 'DECIMAL', 's', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'daily_convenience.convenience_store.count_within_radius' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'convenience_store', 'INTEGER', 'count', 'STRAIGHT_LINE', 'WITHIN_RADIUS', 'COMPLETE_RADIUS', true, false, 'PROVEN_EMPTY_SCOPE')
      WHEN 'daily_convenience.bank_atm.nearest_straight_line_m' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'bank_atm', 'DECIMAL', 'm', 'STRAIGHT_LINE', 'NEAREST_ELIGIBLE', 'COMPLETE_RADIUS', false, false, 'MEASURED_ZERO')
      WHEN 'daily_convenience.bank_atm.nearest_walking_route_m' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'bank_atm', 'DECIMAL', 'm', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'daily_convenience.bank_atm.nearest_walking_route_s' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'bank_atm', 'DECIMAL', 's', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'daily_convenience.bank_atm.count_within_radius' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'bank_atm', 'INTEGER', 'count', 'STRAIGHT_LINE', 'WITHIN_RADIUS', 'COMPLETE_RADIUS', true, false, 'PROVEN_EMPTY_SCOPE')
      WHEN 'education.school.nearest_straight_line_m' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('EDUCATION', 'school', 'DECIMAL', 'm', 'STRAIGHT_LINE', 'NEAREST_ELIGIBLE', 'COMPLETE_RADIUS', false, false, 'MEASURED_ZERO')
      WHEN 'education.school.nearest_walking_route_m' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('EDUCATION', 'school', 'DECIMAL', 'm', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'education.school.nearest_walking_route_s' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('EDUCATION', 'school', 'DECIMAL', 's', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'education.school.count_within_radius' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('EDUCATION', 'school', 'INTEGER', 'count', 'STRAIGHT_LINE', 'WITHIN_RADIUS', 'COMPLETE_RADIUS', true, false, 'PROVEN_EMPTY_SCOPE')
      WHEN 'education.university_college.nearest_straight_line_m' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('EDUCATION', 'university_college', 'DECIMAL', 'm', 'STRAIGHT_LINE', 'NEAREST_ELIGIBLE', 'COMPLETE_RADIUS', false, false, 'MEASURED_ZERO')
      WHEN 'education.university_college.nearest_walking_route_m' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('EDUCATION', 'university_college', 'DECIMAL', 'm', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'education.university_college.nearest_walking_route_s' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('EDUCATION', 'university_college', 'DECIMAL', 's', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'education.university_college.count_within_radius' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('EDUCATION', 'university_college', 'INTEGER', 'count', 'STRAIGHT_LINE', 'WITHIN_RADIUS', 'COMPLETE_RADIUS', true, false, 'PROVEN_EMPTY_SCOPE')
      WHEN 'education.international_school.nearest_straight_line_m' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('EDUCATION', 'international_school', 'DECIMAL', 'm', 'STRAIGHT_LINE', 'NEAREST_ELIGIBLE', 'COMPLETE_RADIUS', false, false, 'MEASURED_ZERO')
      WHEN 'education.international_school.nearest_walking_route_m' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('EDUCATION', 'international_school', 'DECIMAL', 'm', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'education.international_school.nearest_walking_route_s' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('EDUCATION', 'international_school', 'DECIMAL', 's', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'education.international_school.count_within_radius' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('EDUCATION', 'international_school', 'INTEGER', 'count', 'STRAIGHT_LINE', 'WITHIN_RADIUS', 'COMPLETE_RADIUS', true, false, 'PROVEN_EMPTY_SCOPE')
      WHEN 'healthcare.hospital_medical_centre.nearest_straight_line_m' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('HEALTHCARE', 'hospital_medical_centre', 'DECIMAL', 'm', 'STRAIGHT_LINE', 'NEAREST_ELIGIBLE', 'COMPLETE_RADIUS', false, false, 'MEASURED_ZERO')
      WHEN 'healthcare.hospital_medical_centre.nearest_walking_route_m' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('HEALTHCARE', 'hospital_medical_centre', 'DECIMAL', 'm', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'healthcare.hospital_medical_centre.nearest_walking_route_s' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('HEALTHCARE', 'hospital_medical_centre', 'DECIMAL', 's', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'healthcare.hospital_medical_centre.count_within_radius' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('HEALTHCARE', 'hospital_medical_centre', 'INTEGER', 'count', 'STRAIGHT_LINE', 'WITHIN_RADIUS', 'COMPLETE_RADIUS', true, false, 'PROVEN_EMPTY_SCOPE')
      WHEN 'healthcare.hospital_medical_centre.nearest_driving_route_m' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('HEALTHCARE', 'hospital_medical_centre', 'DECIMAL', 'm', 'DRIVING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'healthcare.hospital_medical_centre.nearest_driving_route_s' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('HEALTHCARE', 'hospital_medical_centre', 'DECIMAL', 's', 'DRIVING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'healthcare.clinic.nearest_straight_line_m' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('HEALTHCARE', 'clinic', 'DECIMAL', 'm', 'STRAIGHT_LINE', 'NEAREST_ELIGIBLE', 'COMPLETE_RADIUS', false, false, 'MEASURED_ZERO')
      WHEN 'healthcare.clinic.nearest_walking_route_m' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('HEALTHCARE', 'clinic', 'DECIMAL', 'm', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'healthcare.clinic.nearest_walking_route_s' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('HEALTHCARE', 'clinic', 'DECIMAL', 's', 'WALKING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'healthcare.clinic.count_within_radius' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('HEALTHCARE', 'clinic', 'INTEGER', 'count', 'STRAIGHT_LINE', 'WITHIN_RADIUS', 'COMPLETE_RADIUS', true, false, 'PROVEN_EMPTY_SCOPE')
      WHEN 'healthcare.clinic.nearest_driving_route_m' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('HEALTHCARE', 'clinic', 'DECIMAL', 'm', 'DRIVING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'healthcare.clinic.nearest_driving_route_s' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('HEALTHCARE', 'clinic', 'DECIMAL', 's', 'DRIVING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'retail.significant_retail_centre.nearest_straight_line_m' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('RETAIL', 'significant_retail_centre', 'DECIMAL', 'm', 'STRAIGHT_LINE', 'NEAREST_ELIGIBLE', 'COMPLETE_RADIUS', false, false, 'MEASURED_ZERO')
      WHEN 'retail.significant_retail_centre.nearest_driving_route_m' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('RETAIL', 'significant_retail_centre', 'DECIMAL', 'm', 'DRIVING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'retail.significant_retail_centre.nearest_driving_route_s' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('RETAIL', 'significant_retail_centre', 'DECIMAL', 's', 'DRIVING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'retail.significant_retail_centre.count_within_radius' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('RETAIL', 'significant_retail_centre', 'INTEGER', 'count', 'STRAIGHT_LINE', 'WITHIN_RADIUS', 'COMPLETE_RADIUS', true, false, 'PROVEN_EMPTY_SCOPE')
      WHEN 'road.major_road_access.nearest_driving_route_m' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('ROAD', 'major_road_access', 'DECIMAL', 'm', 'DRIVING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'road.major_road_access.nearest_driving_route_s' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('ROAD', 'major_road_access', 'DECIMAL', 's', 'DRIVING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'road.expressway_interchange.nearest_driving_route_m' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('ROAD', 'expressway_interchange', 'DECIMAL', 'm', 'DRIVING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'road.expressway_interchange.nearest_driving_route_s' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('ROAD', 'expressway_interchange', 'DECIMAL', 's', 'DRIVING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'employment.significant_economic_node.nearest_driving_route_m' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('EMPLOYMENT', 'significant_economic_node', 'DECIMAL', 'm', 'DRIVING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'employment.significant_economic_node.nearest_driving_route_s' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('EMPLOYMENT', 'significant_economic_node', 'DECIMAL', 's', 'DRIVING_ROUTE', 'NEAREST_ELIGIBLE', 'COMPLETE_CANDIDATE_SET', false, false, 'MEASURED_ZERO')
      WHEN 'employment.significant_economic_node.count_within_driving_duration' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('EMPLOYMENT', 'significant_economic_node', 'INTEGER', 'count', 'DRIVING_ROUTE', 'WITHIN_DURATION', 'COMPLETE_CANDIDATE_SET', false, true, 'PROVEN_EMPTY_SCOPE')
      WHEN 'daily_convenience.essential_categories.coverage_ratio' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('DAILY_CONVENIENCE', 'essential_categories', 'DECIMAL', 'ratio', 'CATEGORY_PRESENCE', 'CATEGORY_COVERAGE', 'COMPLETE_CATEGORY_SET', true, false, 'PROVEN_EMPTY_SCOPE')
      WHEN 'context.area.classification' THEN ROW(NEW.category, NEW.entity_taxonomy_key, NEW.value_type, NEW.unit, NEW.measurement_method, NEW.aggregation_scope, NEW.coverage_requirement, NEW.radius_required, NEW.duration_required, NEW.zero_semantics) IS NOT DISTINCT FROM ROW('CONTEXT', 'area', 'CATEGORY', 'category', 'DETERMINISTIC_CLASSIFIER', 'AREA_CONTEXT', 'COMPLETE_AREA_FEATURES', false, false, 'NOT_ALLOWED')
      ELSE false END) THEN
      RAISE EXCEPTION 'Unsupported complete fact contract' USING ERRCODE='23514';
    END IF;
    IF NEW.fact_key='context.area.classification' THEN
      IF NEW.allowed_category_values IS DISTINCT FROM ARRAY['REGIONAL_LOW_TRANSIT','SUBURBAN','URBAN_GENERAL','URBAN_TRANSIT']::text[] THEN
        RAISE EXCEPTION 'Context requires the complete canonical label set' USING ERRCODE='23514';
      END IF;
    ELSIF NEW.allowed_category_values IS NOT NULL THEN
      RAISE EXCEPTION 'Non-category facts cannot define labels' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END
$guard$;

CREATE FUNCTION public.guard_property_location_state_row() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $guard$
BEGIN
  IF TG_TABLE_SCHEMA<>'public' OR TG_TABLE_NAME<>'property_location_intelligence_state'
      OR TG_WHEN<>'BEFORE' OR TG_LEVEL<>'ROW' OR TG_NARGS<>0 OR TG_OP NOT IN ('INSERT','UPDATE') THEN
    RAISE EXCEPTION 'Unsupported state guard attachment' USING ERRCODE='23514';
  END IF;
  IF TG_OP='INSERT' THEN
    NEW.created_at := transaction_timestamp();
    NEW.state_revision := 0;
  ELSE
    IF NEW.property_id IS DISTINCT FROM OLD.property_id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'State identity and creation time are immutable' USING ERRCODE='23514';
    END IF;
    IF OLD.state_revision>=9007199254740991 THEN
      RAISE EXCEPTION 'State revision overflow' USING ERRCODE='23514';
    END IF;
    NEW.state_revision := OLD.state_revision+1;
  END IF;
  NEW.updated_at := transaction_timestamp();
  RETURN NEW;
END
$guard$;

ALTER TABLE public.location_provider_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_provider_registry FORCE ROW LEVEL SECURITY;
CREATE POLICY location_provider_registry_select_authenticated
  ON public.location_provider_registry FOR SELECT TO authenticated USING (true);
CREATE TRIGGER location_provider_registry_guard BEFORE INSERT OR UPDATE OR DELETE ON public.location_provider_registry
  FOR EACH ROW EXECUTE FUNCTION public.guard_location_registry_row();

ALTER TABLE public.location_fact_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_fact_definitions FORCE ROW LEVEL SECURITY;
CREATE POLICY location_fact_definitions_select_authenticated
  ON public.location_fact_definitions FOR SELECT TO authenticated USING (true);
CREATE TRIGGER location_fact_definitions_guard BEFORE INSERT OR UPDATE OR DELETE ON public.location_fact_definitions
  FOR EACH ROW EXECUTE FUNCTION public.guard_location_registry_row();

ALTER TABLE public.location_freshness_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_freshness_policies FORCE ROW LEVEL SECURITY;
CREATE POLICY location_freshness_policies_select_authenticated
  ON public.location_freshness_policies FOR SELECT TO authenticated USING (true);
CREATE TRIGGER location_freshness_policies_guard BEFORE INSERT OR UPDATE OR DELETE ON public.location_freshness_policies
  FOR EACH ROW EXECUTE FUNCTION public.guard_location_registry_row();

ALTER TABLE public.property_location_intelligence_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_location_intelligence_state FORCE ROW LEVEL SECURITY;
CREATE POLICY property_location_intelligence_state_select_own
  ON public.property_location_intelligence_state FOR SELECT TO authenticated USING (public.owns_property(property_id));
CREATE TRIGGER property_location_intelligence_state_guard BEFORE INSERT OR UPDATE ON public.property_location_intelligence_state
  FOR EACH ROW EXECUTE FUNCTION public.guard_property_location_state_row();

-- Remove every materialized default grantee, including PUBLIC and grant options.
-- Dynamic identifier quoting is limited to this migration block, never the guards.
DO $acl$
DECLARE r record;
BEGIN
  FOR r IN SELECT c.relname, a.grantee FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace,
      LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
      WHERE n.nspname='public' AND c.relname IN ('location_provider_registry', 'location_fact_definitions', 'location_freshness_policies', 'property_location_intelligence_state') AND a.grantee<>c.relowner
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %s CASCADE',r.relname,
      CASE WHEN r.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(r.grantee)) END);
  END LOOP;
  FOR r IN SELECT p.proname,a.grantee FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace,
      LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
      WHERE n.nspname='public' AND p.proname IN ('guard_location_registry_row','guard_property_location_state_row') AND a.grantee<>p.proowner
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON FUNCTION public.%I() FROM %s CASCADE',r.proname,
      CASE WHEN r.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(r.grantee)) END);
  END LOOP;
END
$acl$;

GRANT SELECT ON public.location_provider_registry TO authenticated,service_role;
GRANT SELECT ON public.location_fact_definitions TO authenticated,service_role;
GRANT SELECT ON public.location_freshness_policies TO authenticated,service_role;
GRANT SELECT ON public.property_location_intelligence_state TO authenticated,service_role;
GRANT INSERT,UPDATE ON public.property_location_intelligence_state TO service_role;

DO $verify$
DECLARE t text; r text; p text; expected boolean;
BEGIN
  FOREACH t IN ARRAY ARRAY['location_provider_registry', 'location_fact_definitions', 'location_freshness_policies', 'property_location_intelligence_state'] LOOP
    FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
      FOREACH p IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] LOOP
        expected := (r IN ('authenticated','service_role') AND p='SELECT') OR
          (r='service_role' AND t='property_location_intelligence_state' AND p IN ('INSERT','UPDATE'));
        IF has_table_privilege(r,'public.'||t,p) IS DISTINCT FROM expected
           OR has_table_privilege(r,'public.'||t,p||' WITH GRANT OPTION') THEN
          RAISE EXCEPTION 'Effective/inherited privilege mismatch: %.% %',r,t,p;
        END IF;
      END LOOP;
    END LOOP;
    IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('public.'||t) AND attacl IS NOT NULL) THEN
      RAISE EXCEPTION 'Unexpected column ACL: %',t;
    END IF;
  END LOOP;
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role','authenticator'] LOOP
    IF has_function_privilege(r,'public.guard_location_registry_row()','EXECUTE')
       OR has_function_privilege(r,'public.guard_property_location_state_row()','EXECUTE') THEN
      RAISE EXCEPTION 'Effective guard EXECUTE remains for %',r;
    END IF;
  END LOOP;
END
$verify$;
COMMIT;
