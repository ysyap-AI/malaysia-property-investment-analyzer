# Phase 2A-01 — Foundation schema specification

Date: 13 October 2026 (Asia/Kuala_Lumpur). Design revision: proposed 1.1, PREP refinements. **Implementation BLOCKED pending final design approval, isolated test preparation and explicit implementation authorization.** D01 is VERIFIED / CLOSED for the owner-confirmed catalog snapshot, not for behavioral tests. See the [final readiness report](PHASE2A_01_FINAL_READINESS_REPORT.md) and [implementation checklist](PHASE2A_01_IMPLEMENTATION_CHECKLIST.md). Revision 1.1 resolves exact allowlist binding, immutable provider-review lifecycle and PostgreSQL 17 privilege revocation; it also clarifies guard/cascade limits. These are proposed corrections, not an executed migration or a new owner sign-off.

Authority: [Phase 1 architecture freeze](PHASE1_ARCHITECTURE_FREEZE.md), [Phase 2 plan revision 1.0](PHASE2_ARCHITECTURE_PLAN.md), owner-supplied Phase 2A-00 summary, and this task's four-table scope. Read the [verification report](PHASE2A_00B_DATABASE_VERIFICATION_REPORT.md) and [decision register](PHASE2A_00B_DECISION_REGISTER.md). This specification does not override the freeze or imply that open architecture decisions are already accepted.

## 1. Exact proposed implementation boundary

Create exactly four **empty** tables in `public`, with constraints, indexes, RLS, explicit grants, and narrowly scoped database guards on the new tables. No seed provider, fact, freshness or property-state rows. No Phase 1 backfill, trigger, column, function, policy or grant changes. No application endpoint, UI, worker, scheduled job, provider adapter, spatial column, PostGIS installation, score, scoring configuration, evidence acquisition or deployment.

The later implementation deliverables would be one new chronological migration, database tests, a reviewed update of the correct external-project type file and test evidence. Existing migrations remain immutable. For the retained audited baseline `phase2-location-intelligence` at `934ea702a2ecfdb31c530ea4a33e21a2d55e27d2`, the correct external-project destination is `src/integrations/supabase/types.ts`. Main uses `external-types.ts`; that convention must not be imported in isolation. Baseline retention still needs the D04 owner decision. Do not regenerate either during this design task.

Two new trigger functions are proposed support objects, not additional tables: `public.guard_location_registry_row()` and `public.guard_property_location_state_row()`. Both are SECURITY INVOKER with `search_path = pg_catalog`, schema-qualified object references, no dynamic SQL, no network calls and no writes to other tables. Revoke direct EXECUTE from PUBLIC and all API/runtime roles. They execute only as attached new-table triggers and must not alter/reuse Phase 1's `set_updated_at()` implementation. No new SECURITY DEFINER RPC, database role or schema is required for 2A-01. Concrete guard behavior is defined below. These objects require owner approval as part of scope.

Attach row-level BEFORE INSERT/UPDATE/DELETE triggers named `<table_name>_guard` on the three registries, using the registry guard. Attach a row-level BEFORE INSERT/UPDATE trigger named `property_location_intelligence_state_guard` on state, using the state guard. Do not attach guards to existing tables. The registry guard dispatches only the three literal supported table names and fails closed for any other attachment.

## 2. Shared conventions and ownership

All tables are proposed to be owned by the trusted migration role `postgres`, whose non-superuser/BYPASSRLS attributes and existing Phase 1 ownership are verified in the supplied snapshot; never by `anon`, `authenticated` or `service_role`. Actual creator/owner must be rechecked before implementation. Global registry rows are application configuration; they have no user owner and contain no credentials, private property identifiers, request logs or raw provider responses. The state table inherits ownership solely from `public.properties.user_id`.

Types below are exact PostgreSQL types. `NN` means NOT NULL; all unmarked nullable columns explicitly default to NULL. UUID defaults use `pg_catalog.gen_random_uuid()` after confirming PostgreSQL compatibility. Timestamps are `timestamptz`; the database sets audit timestamps using transaction time. Do not accept client-supplied audit times. Text vocabulary uses CHECK constraints, not new PostgreSQL enums, so a later approved additive vocabulary migration is possible without changing Phase 1 types.

Registry semantics are append-versioned. All inserted semantic fields are immutable. A new version has a new UUID. The only permitted UPDATE is one-way `deprecated_at: NULL -> transaction timestamp`; it cannot be undone or repeatedly rewritten. `created_at` and IDs never change. No DELETE/TRUNCATE privilege is granted to API/runtime roles. The registry row guard rejects DELETE and every UPDATE except that deprecation transition; it validates insert invariants, stamps `created_at`, and rejects insertion already deprecated. Administrative owners can bypass/disable guards via DDL, so migration-role access remains an audited operational trust boundary.

On UPDATE, compare every persisted field other than `deprecated_at` with NULL-safe equality before accepting the transition; reject a mixed semantic/deprecation update and a no-op/repeated deprecation. The database supplies the deprecation time. INSERT checks each version independently; it must not reject a valid new UUID/version because an older row has the same logical key. PK/UNIQUE constraints reject duplicate identities/versions. Validate the literal `public` schema, supported table, trigger operation and row timing; fail closed for an unsupported attachment. These row guards do not intercept TRUNCATE or owner DDL. Runtime TRUNCATE/DDL denial comes from privileges; trusted owners remain outside an absolute tamper-proof boundary.

There is no implicit "largest version is active" rule. Future artifacts must pin exact version IDs; selecting new versions requires an explicit approved release/policy activation process. No mutable active pointer or policy activation API is introduced now. Deprecated versions remain readable for historical interpretation; new processing must not select them. A breaking semantic change uses a new key, not a silent new meaning for an old key.

Common checks: required display/description/reference text must be nonblank after trimming; keys have length 1–160 and match their specified ASCII pattern; versions are positive integers. Timestamps must be finite, and `deprecated_at IS NULL OR deprecated_at >= created_at`. Required checks must reject NULL where expressions could otherwise evaluate to unknown. No arbitrary JSONB configuration or executable formulas.

## 3. `location_provider_registry`

Purpose: identify a versioned, nonsecret provider capability and reviewed persistence contract. Globally managed by release administrators. An entry is not a provider-selection decision or permission to call the provider. Future requests and observations reference its exact version.

| Column | Type / nullability / default | Meaning |
|---|---|---|
| `id` | `uuid NN`, generated | PK for this provider configuration version |
| `provider_key` | `text NN`, no default | Stable lowercase snake_case identifier, `^[a-z][a-z0-9_]*$` |
| `provider_version` | `integer NN`, no default | Positive contract/configuration version |
| `display_name` | `text NN` | Neutral provider name |
| `capabilities` | `text[] NN` | Nonempty subset of `GEOCODING`, `PLACES`, `ROUTING`, `MAP_RENDERING` |
| `approval_state` | `text NN DEFAULT 'UNREVIEWED'` | `UNREVIEWED`, `PROVISIONAL`, `APPROVED`, `DISABLED` |
| `retention_class` | `text NN DEFAULT 'UNREVIEWED'` | `UNREVIEWED`, `PERMANENT`, `TEMPORARY_30_DAY`, `ID_ONLY_PERMANENT`, `NO_PERSISTENCE` |
| `retention_limit_seconds` | `bigint`, NULL | Enforceable maximum for temporary retained payloads, not cache freshness |
| `attribution_required` | `boolean NN DEFAULT true` | Conservative default pending review |
| `attribution_text` | `text`, NULL | Approved public display text; required nonblank if reviewed and attribution required |
| `terms_reference` | `text`, NULL | Public terms URL or controlled document reference; no tokens or credentials |
| `review_reference` | `text`, NULL | Traceable internal approval/document ID; not private reviewer details |
| `reviewed_at` | `timestamptz`, NULL | Recorded review time, finite and no later than creation |
| `created_at` | `timestamptz NN DEFAULT now()` | Database-stamped |
| `deprecated_at` | `timestamptz`, NULL | One-way withdrawal from new work |

Keys: PK `(id)`; UNIQUE `(provider_key, provider_version)`. No foreign keys yet. Both constraints supply B-tree indexes; no speculative GIN capability index is needed for a small registry.

Checks/guard: capabilities must be one-dimensional, nonempty, contain no NULLs/duplicates and contain only the listed values; the registry guard enforces array uniqueness and canonical sorted order. `UNREVIEWED` requires an unreviewed retention class and NULL review fields. `PROVISIONAL`/`APPROVED` require reviewed retention class, `terms_reference`, `review_reference` and `reviewed_at`; `DISABLED` may retain prior reviewed metadata, but review fields are all populated or all NULL. A known retention class always requires complete review metadata. `TEMPORARY_30_DAY` requires `0 < retention_limit_seconds <= 2592000`; all other classes require NULL. This upper bound encodes the named policy category, not a claim about any vendor's terms. Supporting another temporary limit needs a separately approved class/version. Attribution and reference lengths are at most 4,000 and 1,000 characters respectively; reject blank strings and secret-bearing references through release review.

Writes: migration/release identity only, inserting reviewed versions or deprecating them. No runtime provider registry writes; `service_role` has SELECT only. No vendor row is seeded. Runtime systems must reject unreviewed, disabled or deprecated records and check operation-specific legal permission. `ID_ONLY_PERMANENT` does not authorize keeping payloads; a label alone never certifies historical replay. Actual permitted fields and terms must be reviewed before a later adapter uses a row.

Review lifecycle is append-only too: an UNREVIEWED or PROVISIONAL version is never updated to APPROVED. Insert a new UUID with a greater `provider_version` for the same key and complete new review metadata, then explicitly select that version in a separately approved release. The release process serializes version allocation; uniqueness prevents duplicate version numbers, but does not by itself enforce increasing release order. Any change to approval state, retention, capabilities, terms, attribution, review reference or review time requires a new immutable version. To withdraw an old version, use its one-way deprecation; if a DISABLED review record is required, append it as a new version. Existing references stay pinned to the old review and never acquire the new permission retroactively. This records permission history, not permission to retain evidence after a later legal prohibition.

RLS/grants: global configuration policy and grant matrix in section 7 apply. Lifecycle: insert version, pin by explicit configuration, optionally deprecate; preserve referenced versions. Future observation/request tables use FK to `id` with ON UPDATE/DELETE RESTRICT. 2A-02 may reference it for geocode provenance; no such FK is precreated here.

Required tests: G01–G08 plus provider capability validation, conservative defaults, invalid review/retention combinations, attempted secret-bearing seed rejection in review, exact version pinning and denied runtime modifications. Do not test vendors by calling their APIs.

## 4. `location_fact_definitions`

Purpose: define neutral, typed, provider-independent facts. Global developer-governed semantic registry; this is neither a fact-result table nor a scoring model. No scores, weights, threshold bands, financial assumptions, vendor payloads or user-created keys belong here.

| Column | Type / nullability / default | Meaning |
|---|---|---|
| `id` | `uuid NN`, generated | Definition-version PK |
| `fact_key` | `text NN` | Canonical dotted key in section 8 |
| `definition_version` | `integer NN` | Positive version, explicitly pinned |
| `display_name` | `text NN` | Neutral human-readable name |
| `semantic_definition` | `text NN` | Precisely defined entity/operation/limitations |
| `category` | `text NN` | `TRANSPORT`, `ROAD`, `DAILY_CONVENIENCE`, `EDUCATION`, `HEALTHCARE`, `EMPLOYMENT`, `RETAIL`, `CONTEXT` |
| `value_type` | `text NN` | `INTEGER`, `DECIMAL`, `BOOLEAN`, `CATEGORY` |
| `unit` | `text NN` | `count`, `m`, `s`, `ratio`, `boolean`, `category` |
| `measurement_method` | `text NN` | Exactly one supported method from section 8 |
| `aggregation_scope` | `text NN` | `NEAREST_ELIGIBLE`, `WITHIN_RADIUS`, `WITHIN_DURATION`, `CATEGORY_COVERAGE`, `AREA_CONTEXT` |
| `entity_taxonomy_key` | `text NN` | Controlled subject category, not provider taxonomy |
| `taxonomy_version` | `integer NN` | Positive MPIA taxonomy version |
| `coverage_requirement` | `text NN` | `COMPLETE_RADIUS`, `COMPLETE_CANDIDATE_SET`, `COMPLETE_CATEGORY_SET`, `COMPLETE_AREA_FEATURES` |
| `radius_required` | `boolean NN` | Result must supply positive explicit `scope_radius_m` |
| `duration_required` | `boolean NN` | Result must supply positive explicit `scope_duration_s` |
| `zero_semantics` | `text NN` | `PROVEN_EMPTY_SCOPE`, `MEASURED_ZERO`, `NOT_ALLOWED` |
| `allowed_category_values` | `text[]`, NULL | Nonempty controlled labels only for CATEGORY facts |
| `contract_reference` | `text NN` | Version-controlled semantic approval document/reference |
| `created_at` | `timestamptz NN DEFAULT now()` | Database-stamped |
| `deprecated_at` | `timestamptz`, NULL | One-way withdrawal from new work |

Keys: PK `(id)`; UNIQUE `(fact_key, definition_version)`. No FKs in 2A-01. Indexes: those supplied by these constraints only. Future `normalized_location_facts` references `id` ON UPDATE/DELETE RESTRICT; it also needs a typed value and a fact-set FK, not duplicated free-form keys.

Checks: `fact_key` matches `^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$`. Enforce the exact type/unit/method/scope combinations in section 8 as a finite disjunction, with database guard validation of controlled keys and taxonomies. `allowed_category_values` is NULL for all non-CATEGORY values; CATEGORY requires a one-dimensional, nonempty, duplicate/NULL-free array of registered labels. `semantic_definition` length 1–8,000; display name 1–200; contract reference 1–1,000. `WITHIN_RADIUS` requires radius and forbids duration. `WITHIN_DURATION` requires duration and forbids radius as a metric parameter (acquisition radius remains separate provenance). `CATEGORY_COVERAGE` requires radius and forbids duration. Nearest facts have no metric radius/duration parameter but still require acquisition coverage metadata. No scalar geographic radius, travel-time band, score eligibility percentage or count saturation is stored here.

The controlled-key database guard must reject arbitrary strings even if the regex matches; the finite expansion in section 8 defines its allowlist. Validate registered taxonomy/category/method associations and zero semantics there as well. Adding a new family requires reviewed contract/code changes, not just an admin-entered string. The four tables remain empty: a later approved semantic registry release must supply actual descriptions and version references, not draft metric labels disguised as ready facts.

Writes: migration/release identity only; service runtime SELECT only. Shared RLS/grants in section 7. No semantic UPDATE or deletion; corrections append versions. A definition's version number is not a scoring version. Required tests: G01–G08 and F01–F10; compatibility with typed future facts is a contract test now, with persistence tests when fact tables exist.

## 5. `location_freshness_policies`

Purpose: immutable category-specific age rules, separate from provider retention and evidence quality. Global release-owned configuration, independent of user preferences and scoring thresholds.

| Column | Type / nullability / default | Meaning |
|---|---|---|
| `id` | `uuid NN`, generated | Version PK |
| `policy_key` | `text NN` | Stable snake_case identifier |
| `policy_version` | `integer NN` | Positive version |
| `category` | `text NN` | `GEOCODING`, `TRANSPORT`, `ROAD`, `DAILY_CONVENIENCE`, `EDUCATION`, `HEALTHCARE`, `EMPLOYMENT`, `RETAIL`, `CONTEXT`, `ROUTING` |
| `age_basis` | `text NN` | `OBSERVED_AT` or `RETRIEVED_AT`, explicitly chosen |
| `fresh_for_seconds` | `bigint NN` | Positive age before STALE |
| `expire_after_seconds` | `bigint NN` | Must be greater than `fresh_for_seconds` |
| `description` | `text NN` | Neutral explanation of applicability |
| `approval_reference` | `text NN` | Reviewed release/policy reference |
| `created_at` | `timestamptz NN DEFAULT now()` | Database-stamped |
| `deprecated_at` | `timestamptz`, NULL | One-way withdrawal |

Keys: PK `(id)`, UNIQUE `(policy_key, policy_version)`; no FKs yet. These supply all required indexes. Multiple policies for one category are allowed, but selection must pin an exact policy ID. No unique category or "latest automatically wins" behavior. Duration checks: `0 < fresh_for_seconds < expire_after_seconds <= 9007199254740991` (safe integer transport bound, not an approved operational duration). Consumer date arithmetic must also reject timestamp overflow. `policy_key` pattern as provider key; description max 4,000 and reference max 1,000 characters.

At evaluation time, with required timestamp `t` and explicit evaluation instant `as_of`: FRESH if `as_of < t + fresh_for_seconds`; STALE if between that boundary inclusive and expiry exclusive; EXPIRED at/after expiry. Missing required observation time produces UNKNOWN, never silently substitutes retrieval time. Future-dated evidence beyond separately approved clock tolerance is unavailable for current use, not perpetually fresh. No `now()`-dependent CHECK constraint; freshness changes with time without rewriting evidence. Later replay pins the policy version and evaluation instant.

Provider legal retention can expire before a freshness policy. Eligibility is bounded by both; this table cannot extend licensed retention or erase historical lineage. No TTL numbers are seeded, no automatic refresh/delete job is introduced, and stale evidence does not imply provider permission to retain it.

Writes: release identity only, shared RLS/grants. Future observations/snapshots/fact sets pin `id` with RESTRICT; 2A-02 can pin a geocoding policy if its later scope requires it. Required tests: G01–G08, finite/bounded ordered durations, exact boundary evaluation, absent observation time, policy pinning and retention precedence; no dependence on wall clock for deterministic fixtures.

## 6. `property_location_intelligence_state`

Purpose: one optional, private orchestration state row per existing property. It is a mutable coordination record, not an immutable evidence/history store. Absence is the authoritative 2A-01 default: location processing has not started. It must never be required to save or analyze a Phase 1 property.

| Column | Type / nullability / default | Meaning |
|---|---|---|
| `property_id` | `uuid NN`, no default | PK and FK to `public.properties(id)` |
| `processing_status` | `text NN DEFAULT 'NOT_STARTED'` | In 2A-01 constrained to `NOT_STARTED` only |
| `freshness_status` | `text NN DEFAULT 'UNKNOWN'` | In 2A-01 constrained to `UNKNOWN` only |
| `publication_status` | `text NN DEFAULT 'NOT_ASSESSED'` | In 2A-01 constrained to `NOT_ASSESSED` only |
| `state_revision` | `bigint NN DEFAULT 0` | Optimistic concurrency revision, 0–9007199254740991 |
| `created_at` | `timestamptz NN DEFAULT now()` | Database-stamped, immutable |
| `updated_at` | `timestamptz NN DEFAULT now()` | Database-stamped; finite, at least created_at |

Key actions: FK `property_id -> public.properties(id) ON DELETE CASCADE ON UPDATE RESTRICT`; no duplicate user_id, no surrogate ID and no additional UNIQUE constraint. PK index covers owner-specific property lookup and the FK. No status/queue index yet: there is no queue. No backfill and no trigger on `properties`.

The state-row guard rejects changes to `property_id`/`created_at`, stamps audit times, forces initial revision 0 and advances the revision exactly once on a successful UPDATE. The caller uses `WHERE property_id = ... AND state_revision = expected` and must receive one affected row; stale writers are rejected or affect zero rows. Reject revision overflow. Direct DELETE is not exposed; deletion through the parent FK must remain functional. Do not add an indiscriminate DELETE-blocking trigger that breaks Phase 1 property deletion.

An INSERT stamps both timestamps and revision 0; an UPDATE derives revision from OLD, never a caller's proposed revision, including no-op updates. Guard execution alone does not prove use of an expected-revision predicate: an authorized service writer can omit it. Compare-and-swap is a mandatory caller contract and a later handler test, not a claimed database authorization feature. Reject timestamp/revision boundary violations atomically; transaction-time timestamps need not increase strictly. The state guard accepts only BEFORE ROW INSERT/UPDATE on the literal new state table. There is no state DELETE trigger or child DELETE policy requirement for the parent FK action. Test property deletion and auth-user-to-property-to-state cascades; retain the existing parent ownership checks. Later immutable child FKs need a separate cascade/retention review before addition.

Only inert states are allowed in 2A-01 because the location/run/snapshot/assessment objects that would substantiate other states do not exist. This avoids accepting READY/OFFICIAL without lineage. The three independent columns establish ARC-06 separation without implementing processing. The database model will be expanded alongside its supporting tables, not by storing arbitrary future IDs or JSON pointers now.

Future vocabulary (reserved, **not accepted by 2A-01 CHECK constraints**): processing `NOT_STARTED`, `GEOCODING`, `FETCHING_EVIDENCE`, `NORMALIZING`, `ASSESSING`, `READY`, `PARTIAL`, `FAILED`; freshness `UNKNOWN`, `FRESH`, `STALE`, `EXPIRED`; publication `NOT_ASSESSED`, `OFFICIAL`, `INSUFFICIENT_EVIDENCE`, `DEVELOPMENT_ONLY`, `HISTORICAL_OUTDATED`. STALE is never a processing stage. No official scoring before 2F approval.

RLS: enable it and provide one authenticated SELECT policy with `USING (public.owns_property(property_id))`, contingent on live verification that the existing helper remains the frozen invoker ownership check. There are **no authenticated INSERT/UPDATE/DELETE policies** and no browser write grants. Empty results for another user's state are correct; denied writes must not leak whether it exists.

Trusted backend writes: only `service_role` may SELECT/INSERT/UPDATE this table at runtime, with no DELETE, TRUNCATE, REFERENCES, TRIGGER or grant option. This is dormant database capability in 2A-01; no handler uses it yet. Migration identity also has owner authority. Section 7's mandatory verified-actor checks apply before any later runtime use. Property deletion removes the row via FK cascade; no extra broad state-delete privilege is needed. Required tests: S01–S09 and all frozen Phase 1 regressions.

### Relationship to 2A-02 and later tables

2A-02 owns PostGIS reuse/reproducibility and `property_location_versions` (exact later table design still requires review). Add a nullable current-location FK only when that table exists. It must bind both `(property_id, location_version_id)` to a unique parent pair, preventing a pointer to another property's location even if the backend bypasses RLS. Use RESTRICT for deleting referenced immutable locations, and design property deletion/cascade interactions explicitly. A new confirmed location atomically invalidates applicability of old-location results; do not carry an old assessment forward as current.

Evidence runs, snapshots, fact sets, contexts and assessments belong to their later phases. Add `latest_evidence_run_id` and `current_valid_assessment_id` separately when their parent tables exist, with property/location compatibility constraints and atomic publication. A failed refresh changes latest-attempt information while preserving the prior valid assessment for the same location. Multiple logical profiles require a separately keyed current-assessment relation or explicit approved profile scope; this single property row cannot silently represent all profiles. Historical evidence is not stored in this mutable state record.

## 7. Minimum-authority security contract

RLS filters accessible rows; grants determine whether an operation is available at all. Owners and BYPASSRLS roles require separate scrutiny. These are distinct protections, as documented by [PostgreSQL row security](https://www.postgresql.org/docs/17/ddl-rowsecurity.html) and [privileges](https://www.postgresql.org/docs/17/ddl-priv.html). Supabase service-role authority bypasses RLS, so it does not establish the requesting user's ownership. See [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

### Exact privileges on the four new tables

| Role | Three global registries | Property state |
|---|---|---|
| PUBLIC | None | None |
| `anon` | None | None |
| `authenticated` | SELECT only, all nonsecret versions | SELECT only, owned-property rows |
| `service_role` | SELECT only | SELECT, INSERT, UPDATE only |
| `authenticator` and other non-owner roles | No direct grants on new objects | No direct grants on new objects |
| Trusted migration/release owner | Owner authority, governed by registry guards and reviewed releases | Owner authority |

All four tables: RLS ENABLED and FORCE RLS proposed. Each registry gets only `FOR SELECT TO authenticated USING (true)`. State gets only the owner SELECT policy above. No user write policies. `service_role` uses its verified BYPASSRLS property, not a permissive policy for browsers. If live role attributes differ, stop and revise this design; do not make roles BYPASSRLS to fit it. FORCE RLS does not constrain superusers/BYPASSRLS; verified migration owner must have appropriate administrative ability, while runtime roles must never own the tables.

Policy names are `location_provider_registry_select_authenticated`, `location_fact_definitions_select_authenticated`, `location_freshness_policies_select_authenticated`, and `property_location_intelligence_state_select_own`. They are the only policies on these tables in 2A-01, PERMISSIVE SELECT policies with no WITH CHECK clause (SELECT does not use it). Direct mutation is denied by grants and absence of write policies together.

In the same future migration transaction, revoke all new-table rights (including grant options) inherited from object-creation defaults for PUBLIC, anon, authenticated and service_role, then grant exactly the matrix. Audit/revoke direct grants to any other non-owner default grantee **on these four new tables only**. Validate column ACLs, inherited memberships and PostgreSQL 17 MAINTAIN privilege are also absent unless explicitly needed (none is needed here). UUID keys avoid sequence grants. If an inherited role cannot be constrained without changing existing Phase 1 authority, stop for a separate decision instead of editing shared grants.

For avoidance of doubt, PostgreSQL 17 table `ALL PRIVILEGES` includes SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER and **MAINTAIN** (`m` in ACL text). Revoke the complete set on each new table before applying the narrow grants, and separately assert effective MAINTAIN is false for PUBLIC/API/runtime identities. Revoke default-created EXECUTE on both new guard functions from PUBLIC, anon, authenticated, service_role and any other non-owner default grantee. Inspect column ACLs and grant options as well. Revocation here means removing grants materialized on these six new objects; **do not ALTER DEFAULT PRIVILEGES globally or in the shared public schema**. Defaults for both `postgres` and `supabase_admin` are broad in the supplied snapshot. Table owners retain administrative authority. No sequence is introduced.

The owner-confirmed snapshot verifies `postgres` and `service_role` have BYPASSRLS; FORCE RLS therefore does not restrict either identity. It does subject an otherwise non-bypass table owner to policies. Grants restrict service operations; guards still execute for authorized ordinary DML by bypass roles. A trigger creator needs TRIGGER on the table and EXECUTE on the guard; runtime callers need not receive direct guard EXECUTE. Verify this with a positive service-state write after revocation in isolated tests. Do not use a current-user-equals-postgres exception that bypasses immutability, nor a trigger-depth exception to permit arbitrary deletion. Authenticated owner reads continue through the verified invoker `owns_property(uuid)` body. These are reviewed PostgreSQL semantics, not executed new-object behavior. See [row security](https://www.postgresql.org/docs/17/ddl-rowsecurity.html), [privileges](https://www.postgresql.org/docs/17/ddl-priv.html), and [trigger requirements and FK actions](https://www.postgresql.org/docs/17/sql-createtrigger.html).

Schema USAGE on `public` is required for selected API roles and is an existing prerequisite to verify. No additional schema CREATE, database CREATE, role membership, global default-privilege change or grant on Phase 1 tables. Unexpected ordinary-role CREATE on a searched schema requires security review; do not silently repair it in a foundation migration. If owner/runtime identities lack required existing access, report a blocker. Newly introduced guards get no ordinary EXECUTE; no new write RPC means no browser escape hatch.

### Mandatory future backend write path

1. Validate the user's session with the trusted Auth system (or validate a scheduled job's authenticated service identity and its recorded originating owner). A property ID, decoded-but-unverified JWT, client user_id or possession of a service key is insufficient.
2. Resolve the verified actor and load `properties.id,user_id` through an owner-scoped check. Require actor equals the actual current property owner. Administrators need a separately reviewed, explicit capability; no blanket "admin bypass" is introduced here.
3. Validate the operation and server-computed fields. Ignore/reject client-supplied facts, scores, statuses, timestamps and publication pointers. Do not accept a generic table-update payload.
4. At persistence, recheck/lock the parent in the same transaction as the write, or use an equivalently atomic owner predicate, so deletion/ownership change cannot race a separate preflight check. Persist with the expected revision and eventual location version. If a REST workflow cannot guarantee this, require a later narrowly scoped trusted transactional primitive; 2A-01 does not create that RPC.
5. Use a server-only connection bound to the confirmed external project, explicit field allowlists and parameterized statements. Credential storage is external configuration. Never reuse the generated admin client until its target and session isolation are verified. A service client must not inherit browser session state.
6. Record authorization outcome and request/job identity in a later approved audit facility without secrets/private payloads. Retry with idempotency and current-owner revalidation. A queued job for deleted/transferred property must fail closed.

No runtime writer is implemented by these documents. In 2A-01 tests, synthetic trusted-writer operations may exercise the DB role contract. Before a real handler is enabled, integration tests must prove application-level authorization in addition to RLS. Later evidence/assessment tables need their own equally restrictive grants; state-table SELECT permission never authorizes writing analytics.

## 8. Controlled fact-registry contract

### 8.1 Stable naming and exact allowlist expansion

Canonical keys are lowercase dotted ASCII, structured `domain.entity.operation_method_unit`. They contain no provider name, score judgment, user/property ID or numeric calibration radius. Definition version and runtime scope are separate fields. A consumer pins definition ID plus explicit scope, method and units; a key alone is insufficient.

The following finite expansion is the **proposed vocabulary**, not seeded production facts. Each listed entity is literal; do not infer additional synonyms/categories. A registry release may insert only approved, fully specified members, and never arbitrary combinations outside these rows.

| Domain | Literal entity tokens | Permitted suffixes |
|---|---|---|
| `transport` | `rail_station`, `bus_stop` | `nearest_straight_line_m`, `nearest_walking_route_m`, `nearest_walking_route_s`, `count_within_radius` |
| `daily_convenience` | `supermarket`, `pharmacy`, `convenience_store`, `bank_atm` | Same four suffixes |
| `education` | `school`, `university_college`, `international_school` | Same four suffixes |
| `healthcare` | `hospital_medical_centre`, `clinic` | Same four suffixes, plus `nearest_driving_route_m`, `nearest_driving_route_s` |
| `retail` | `significant_retail_centre` | `nearest_straight_line_m`, `nearest_driving_route_m`, `nearest_driving_route_s`, `count_within_radius` |
| `road` | `major_road_access`, `expressway_interchange` | `nearest_driving_route_m`, `nearest_driving_route_s` |
| `employment` | `significant_economic_node` | `nearest_driving_route_m`, `nearest_driving_route_s`, `count_within_driving_duration` |

Example expansion: `transport.rail_station.nearest_walking_route_s` and `transport.rail_station.count_within_radius` are different facts. `bank_atm` is a deduplicated union category, not a sum that counts a bank and its colocated ATM twice. `university_college` is likewise a defined category union. Exact taxonomy inclusion/exclusion, operating-status treatment, entrance/centroid choice and canonical-entity deduplication rules must accompany the referenced taxonomy version before population.

Two additional literal keys are reserved: `daily_convenience.essential_categories.coverage_ratio` and `context.area.classification`. There are no additional wildcards. The first uses the four category identities supermarket, pharmacy, convenience_store and bank_atm, with each present category counted once and a fixed denominator of four in that taxonomy version. It does not freeze a radius. The context key is a categorical output of a later deterministic classifier and cannot become an input to its own classification. No boolean fact is initially allowlisted; BOOLEAN support is a reserved type requiring a later explicit semantic/key extension.

Road access targets, significant retail/economic nodes, bus/network interpretations, category inclusion rules and context classifier remain subject to ARC-11 and later dataset/contract approval. Reserving a key does not make a metric scoreable. Network/interchange quality, arbitrary office counts, flood/crime, rental-demand and market/yield facts are not added by implication. No finalized v1.0 scoring model is proposed.

### 8.2 Type/method/scope mapping

| Suffix / key | Type and unit | Measurement method | Aggregation / coverage | Zero semantics |
|---|---|---|---|---|
| `nearest_straight_line_m` | DECIMAL / m | `STRAIGHT_LINE` | NEAREST_ELIGIBLE / COMPLETE_RADIUS | MEASURED_ZERO |
| `nearest_walking_route_m` | DECIMAL / m | `WALKING_ROUTE` | NEAREST_ELIGIBLE / COMPLETE_CANDIDATE_SET | MEASURED_ZERO |
| `nearest_walking_route_s` | DECIMAL / s | `WALKING_ROUTE` | NEAREST_ELIGIBLE / COMPLETE_CANDIDATE_SET | MEASURED_ZERO |
| `nearest_driving_route_m` | DECIMAL / m | `DRIVING_ROUTE` | NEAREST_ELIGIBLE / COMPLETE_CANDIDATE_SET | MEASURED_ZERO |
| `nearest_driving_route_s` | DECIMAL / s | `DRIVING_ROUTE` | NEAREST_ELIGIBLE / COMPLETE_CANDIDATE_SET | MEASURED_ZERO |
| `count_within_radius` | INTEGER / count | `STRAIGHT_LINE` | WITHIN_RADIUS / COMPLETE_RADIUS | PROVEN_EMPTY_SCOPE |
| `count_within_driving_duration` | INTEGER / count | `DRIVING_ROUTE` | WITHIN_DURATION / COMPLETE_CANDIDATE_SET | PROVEN_EMPTY_SCOPE |
| `essential_categories.coverage_ratio` | DECIMAL / ratio | `CATEGORY_PRESENCE` | CATEGORY_COVERAGE / COMPLETE_CATEGORY_SET | PROVEN_EMPTY_SCOPE |
| `context.area.classification` | CATEGORY / category | `DETERMINISTIC_CLASSIFIER` | AREA_CONTEXT / COMPLETE_AREA_FEATURES | NOT_ALLOWED |

The enum method list is exactly the five methods in this table. Fact definitions bind one method per key; fallback uses another registered definition, never changes a fact's method in place. Proposed CATEGORY labels are `URBAN_TRANSIT`, `URBAN_GENERAL`, `SUBURBAN`, `REGIONAL_LOW_TRANSIT`. An undetermined classifier returns UNKNOWN with reason `CONTEXT_UNDETERMINED`, not a fabricated valid category. This is an explicit ARC-07 representation proposal requiring approval. Context AREA_CONTEXT requires explicit versioned analysis-area geometry/feature scopes later, so both scalar radius/duration flags are false.

#### Exact tuple validation (revision 1.1)

Section 8.1 expands to exactly **61 literal keys** (8 transport, 16 daily-convenience entity facts, 12 education, 12 healthcare, 4 retail, 4 road, 3 employment and the 2 special keys). Build one closed mapping from each full key to its entire required tuple; do not validate the key and a separately permitted method/unit tuple independently. A regex, substring match, suffix wildcard, or Cartesian product of valid categories/methods/units is insufficient.

For ordinary keys, `category` is the uppercase domain from 8.1 and `entity_taxonomy_key` is exactly the literal entity token. The suffix fixes every field in 8.2, plus flags: nearest = `(radius_required=false, duration_required=false)`, count-within-radius = `(true,false)`, count-within-driving-duration = `(false,true)`. `allowed_category_values` is NULL. Taxonomy versions are positive and must reference a reviewed taxonomy before any population; existence of such a review is a release gate, not proved by a positive integer.

The exact key `daily_convenience.essential_categories.coverage_ratio` binds category DAILY_CONVENIENCE, taxonomy `essential_categories`, DECIMAL/ratio, CATEGORY_PRESENCE, CATEGORY_COVERAGE, COMPLETE_CATEGORY_SET, flags `(true,false)`, PROVEN_EMPTY_SCOPE, and NULL category labels. The exact key `context.area.classification` binds CONTEXT, taxonomy `area`, CATEGORY/category, DETERMINISTIC_CLASSIFIER, AREA_CONTEXT, COMPLETE_AREA_FEATURES, flags `(false,false)`, NOT_ALLOWED and the complete canonical sorted four-label set above (no subset, duplicate or extra label).

Use non-null fields and NULL-safe comparisons so a failed/unknown tuple cannot pass. Every admitted key has exactly one permitted tuple. The registry guard and finite CHECK conditions must agree; no validation lookup in a fifth table or seeded registry is required. Negative fixtures must pair individually valid but incompatible components: rail walking seconds with straight-line metres; road access with radius counts; a retail key with healthcare taxonomy; duration counts with radius flags; swapped zero/coverage rules; boolean facts; context with extra labels. Test all 61 valid mappings using synthetic transaction-local rows, plus each changed tuple component. These test fixtures are not registry seeds and must not remain after tests.

Store canonical distance in metres and elapsed route duration in seconds. UI may display minutes with explicit conversion; later scoring minute bands must be converted to seconds by a reviewed rule contract. Neither units nor route modes are interchangeable. Straight-line distance cannot imply a route duration. Route facts must record route profile and traffic/departure assumptions; live-traffic scoring remains excluded. A fallback affects its own measurement and evidence-quality record, not Phase 1 confidence or a hidden score penalty.

### 8.3 Result semantics for later typed fact tables

This is a compatibility contract for 2C, not extra 2A-01 columns/tables. One result has exactly one typed value when exact: INTEGER uses `bigint` constrained to 0–9007199254740991; DECIMAL uses finite nonnegative PostgreSQL `numeric`, with `ratio` in [0,1]; BOOLEAN uses boolean; CATEGORY uses registered text. Reject NaN/infinities, negative counts/distances/durations, overflow, numeric strings masquerading as typed input, and multiple populated value columns. Preserve decimal values without intermediate score rounding; specify provider-to-canonical precision in the later normalization contract.

Proposed canonical knowledge status: `KNOWN_VALUE`, `KNOWN_ZERO`, `UNKNOWN`, `UNAVAILABLE`. **STALE is a separate freshness attribute**, preserving the original value/knowledge status. This resolves the plan's draft fact-status vocabulary and needs ARC-07 acceptance. `VERIFIED_ZERO` is an ingestion alias normalized to `KNOWN_ZERO`, never a second stored status. BOOLEAN false is a known boolean value, not missing or a numeric zero.

UNKNOWN means no supported exact answer yet; UNAVAILABLE means the requested determination could not be obtained (e.g. provider error, unsupported routing or prohibited retention), with explicit reason. Neither carries an exact value. Bounds may accompany UNKNOWN in dedicated typed lower/upper-bound fields with inclusive/exclusive flags; never a made-up exact scalar. Freshness, coverage, confidence and processing status are separate.

Counts are distinct eligible canonical entities in an explicit boundary: straight-line `distance <= scope_radius_m` or route `duration <= scope_duration_s`. Duplicate provider observations must not inflate counts. Exact zero requires successful, sufficient acquisition over that same scope, complete relevant pagination/categories and deduplication. A timeout, rejected request, missing coordinates, unsupported category or truncated result set is never zero. A returned count from a capped list is at most a lower bound unless completeness is proven.

Nearest distance/duration is the minimum eligible measurement in the declared complete candidate universe. A provider's first result is not necessarily nearest. Spatially selected route candidates do not prove globally shortest travel time; label a bounded candidate minimum or mark the requested nearest fact unknown unless candidate completeness is justified. Zero distance/time requires an actual validated colocated/zero-route observation, never absence of destinations or an unreachable route.

Complete empty search within radius R yields exact count 0 **within R** and an unknown nearest distance with lower bound `> R` under the approved coverage proof. It does not create a nearest distance of 0, R, R+1, infinity, or an invented bad-score band. A found nearest straight-line candidate is exact only if coverage proves no eligible closer candidate was omitted. Circular-radius coverage does not establish travel-time completeness.

Future result provenance must include property/location/origin version, definition/taxonomy version, evidence snapshot, normalization version, provider version, policy version, retrieved/observed times, method, requested/actually covered radius or region, metric scope, pagination/cap/truncation, successful category coverage, candidate-selection proof, source attribution and lawful-retention status. Coverage must account for holes/polygons and category support; one `coverage_complete=true` asserted by a client is not proof. Core values and scope measurements are typed relational fields, not JSONB payload substitutes.

Essential-category ratio is known-present categories / four only when all four categories have adequate search evidence for the explicit metric radius. With missing categories, keep a lower/upper bound and UNKNOWN; do not shrink the denominator. This neutral category ratio is different from geographic search coverage and from configured-weight scoring coverage. Saturation or bounded scoring is allowed later only if every admissible value in the bound gives the same outcome under an approved compatible rule. No such rule is activated here.

### 8.4 Versioning and activation validation

Definition ID/version, taxonomy, scope, normalization, evidence, method and unit travel with every future fact. No inference by display label or automatic upgrade to newest definition. Nonsemantic clarifications still append versions to retain exact historical definitions. Changing unit, value type, method, aggregation, zero meaning or entity identity requires a new key; old keys are never repurposed. Compatible additions do not reinterpret existing fact sets. Deprecation blocks new selection while preserving historical readers; unsupported versions fail explicitly.

Before populating/using definitions: validate the finite key allowlist; all CHECK/guard mappings; approved semantic/taxonomy contract; exact unit and type; zero/coverage requirements; finite bounds; method-specific fallback; no circular dependencies; and consumer compatibility. Before later scoring activation additionally validate all metric-to-fact bindings, unresolved ARC-11 semantics, per-domain and overall configured-weight coverage, and publication approval. No draft thresholds, weights, caps, freshness durations or provider selections become production v1.0 through this schema.

## 9. Required security and regression acceptance tests

These tests are requirements for later implementation, **not executed Phase 2 tests**. They use synthetic fixtures in an isolated target. No production mutations are authorized.

| ID | Required positive and negative outcomes |
|---|---|
| G01 | Four tables exist empty, correct owner/types/defaults/PKs/unique/checks/indexes; no Phase 1 object diff |
| G02 | Anonymous role cannot SELECT or mutate any new table; PUBLIC grants absent |
| G03 | Authenticated A and B can SELECT legitimate nonsecret registry versions; both denied INSERT/UPDATE/DELETE/upsert/TRUNCATE/TRIGGER/REFERENCES/MAINTAIN and grant escalation |
| G04 | Service role can read registries but cannot insert/update/delete/upsert/truncate them; default/inherited/column grants do not reopen writes |
| G05 | Trusted release owner can insert valid config and one-way deprecate; duplicate identity/version, semantic UPDATE, undeprecation and DELETE rejected by guard |
| G06 | RLS enabled/forced, policy role/command exact; no permissive user write policy, public executable write RPC, alternate view or definer path |
| G07 | Invalid arrays, empty strings, enums, NULL bypasses, review combinations, units and numeric bounds rejected; valid boundary values accepted |
| G08 | Exact pinned old versions remain readable after new-version insertion/deprecation; no automatic selection or provider requests |
| S01 | A sees A's state, B sees B's; reciprocal cross-user SELECT returns no rows. Test unfiltered and explicit property-ID requests, not just frontend filtering |
| S02 | A/B cannot INSERT/UPDATE/DELETE/upsert their own or other's state, alter revision/status/time, reparent, or write guessed future score fields |
| S03 | Service identity can insert valid inert state and update using expected revision; no DELETE/TRUNCATE or global-config mutation |
| S04 | FK rejects nonexistent property; PK rejects duplicate; guard rejects reparenting; statuses reject READY/OFFICIAL/STALE-as-processing; wrong types/NULLs rejected |
| S05 | Parent deletion by A cascades A's state and existing financial children; B cannot delete A's property; no Phase 2 dependency prevents Phase 1 saving |
| S06 | Two concurrent expected-revision updates permit one winner; revision overflow rejected; timestamps database-controlled |
| S07 | Later backend tests: valid A request succeeds; A targeting B, spoofed owner, missing/invalid/expired session, replayed stale job and changed/deleted parent fail before privileged persistence |
| S08 | Later backend tests recheck owner and location within write transaction; prove service key alone never substitutes for actor authorization; credentials absent from browser/logs |
| S09 | Absent row means unstarted; Phase 1 works with no Phase 2 state, denied Phase 2 access or later provider failure |
| F01–F03 | Key allowlist/definition-version compatibility; type-unit-method mismatches; measured zero vs proven-empty count vs unknown/unavailable |
| F04–F06 | Search radius boundaries, zero only within covered radius, nearest lower bounds, truncated pagination and capped counts; route candidate completeness; no metres-as-seconds |
| F07–F08 | Ratio denominator remains four with unknown categories; context undetermined and circularity rejected; freshness independent of knowledge |
| F09–F10 | Deprecated definitions remain replayable; immutable semantic guards and no automatic upgrades; no scoring numeric configuration or property assumptions created |

Implement F tests for registry validation in 2A-01; fact-result persistence/engines and S07–S08 real-handler tests are deferred until those components exist, and must not be reported as passed now. SQL role tests need allowed operations as positive controls and denied operations on both own and other-user rows. Testing only as postgres/service_role cannot establish user RLS.

Run the full frozen regression/build/security/database/UI procedure in the verification report after implementation. Preserve existing expectations and report any skipped test as NOT VERIFIED. Explicitly compare P01–P10 outcomes before/after and confirm no Phase 1 files, data or ownership behavior were changed.

## 10. Future migration sequence and stop conditions

After explicit implementation approval only: confirm reviewed live parity and chosen source baseline; prepare one transactional additive migration; create new guards/tables/constraints/indexes; enable/force RLS; revoke default-created privileges and apply exact grants/policies within the same transaction; attach guards; assert empty tables and metadata. Do not blanket-revoke Phase 1/public-schema access, change default ACLs globally, or add PostGIS now. PostgreSQL object-creation privileges should be constrained in the same transaction to avoid an exposure window ([PostgreSQL privileges](https://www.postgresql.org/docs/17/ddl-priv.html)).

Run isolated clean-install and upgrade/isolation/regression tests, then review generated external database types. Deployment remains separately authorized. If table-name collisions, missing ownership protections, unsafe inherited authority, wrong project/type source or function drift appear, stop and report; do not modify Phase 1 or adopt unknown existing objects.

For an aborted transaction, verify none of the four tables/grants/guards persist. For rollback after a test deployment, remove only new dependencies in reverse order in the disposable target and verify Phase 1 preservation. Once real versions/state are referenced, destructive rollback is not safe by default; prefer a reviewed forward repair or disable future entry points. No rollback SQL or migration is created in this task.

PostGIS 3.3.7 in `extensions`, owned by `supabase_admin` and nonrelocatable, is verified in the supplied external-project snapshot. The local empty harness has no PostGIS, which is not a 2A-01 dependency. Reconfirm schema/version and spatial reproducibility before 2A-02; explicitly qualify the extension schema rather than assume public. Supabase documents extension-schema considerations in its [PostGIS guide](https://supabase.com/docs/guides/database/extensions/postgis). Installation, upgrade and relocation remain outside this specification.

Stop after review of this specification and its decision register. No implementation authority is granted by its existence.
