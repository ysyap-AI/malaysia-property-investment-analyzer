# MPIA — Phase 2A-02 DESIGN-01 architecture review

Review date: **17 October 2026 (Asia/Kuala_Lumpur)**. Status: **design proposal ready for owner review; implementation BLOCKED**. No implementation authority is inferred.

The recommended design adds **one private, immutable location-version table** and one nullable current-location reference on the existing Phase 2 state table. It leaves Phase 1 tables, financial behavior and property saving unchanged. Exact proposed structures are in [the schema proposal](PHASE2A_02_SCHEMA_PROPOSAL.md); approvals are enumerated in [the decision register](PHASE2A_02_DECISION_REGISTER.md); verification and implementation gates are in [readiness](PHASE2A_02_IMPLEMENTATION_READINESS.md).

## 1. Authority and evidence boundaries

Read the [Phase 1 freeze](PHASE1_ARCHITECTURE_FREEZE.md), [Phase 2 plan revision 1.0](PHASE2_ARCHITECTURE_PLAN.md), [foundation specification revision 1.1](PHASE2A_01_FOUNDATION_SCHEMA_SPEC.md), [final acceptance](PHASE2A_01_FINAL_ACCEPTANCE_REPORT.md), [GitHub sync report](PHASE2A_01_GITHUB_SYNC_REPORT.md), [AGENTS.md](../AGENTS.md), and [PROJECT_RULES.md](../PROJECT_RULES.md). The completed foundation migration, generated types, SQL/security tests, runner concurrency logic, compiled owner-supplied catalog and implementation/runtime reports were inspected. Historical planning instructions do not undo the owner's accepted Phase 2A-01 checkpoint; this task authorizes review documents only.

Evidence labels used here:

- **VERIFIED NOW:** local Git/source inspection, selected Docker metadata and the offline tests explicitly listed in readiness.
- **HISTORICAL EVIDENCE:** accepted reports/catalog snapshots, not a new database observation.
- **NOT VERIFIED:** a check not executed or not sufficient to establish the claimed behavior.
- **PROPOSED:** a design recommendation, not an owner-approved requirement or implemented behavior.

## 2. Repository findings

| Check | Finding |
| --- | --- |
| Feature branch | VERIFIED NOW: `phase2-location-intelligence` |
| Requested checkpoint | `e9b55b024263857aacafbd8d9d9158d749d9261f` |
| Actual HEAD | VERIFIED NOW: `c9b6c4acc1879a2b84b89d3b39455f2489e4c56a`, message `PHASE2A_01` |
| Ancestry | Actual HEAD's direct parent is exactly the requested checkpoint |
| Difference | Eight added Markdown reports only: the root checkpoint/sync reports and six `docs/PHASE2A_01_TEST_SETUP_*` reports; 2,048 inserted lines |
| Initial working state | Empty `git status --porcelain=v1`: no staged, tracked or untracked changes |
| Accepted implementation | No differences from requested checkpoint under `src`, `supabase`, `tests`, package/lock and selected build/test configuration paths; entire intervening commit is documentation-only |
| Frozen engines | No differences against `v0.1-phase1` in finance, scenarios, scoring, risk, recommendations, configuration, validation and analysis hook |
| Original five migrations | Unchanged against `v0.1-phase1`; migration-directory diff contains only the accepted foundation addition |
| Generated database types | Compared with Phase 1: 208 added lines, no deletions; four foundation tables. Unchanged since accepted checkpoint |
| Remote GitHub state | NOT VERIFIED now; no network Git operation was performed. Sync report records the earlier remote checkpoint, not current remote HEAD |

The checkpoint mismatch is real but explained, not a code regression. Owner acknowledgement of the documentation-only descendant is required before implementation (D01); no branch switch or history repair is recommended.

The five preserved migrations are `20260919043352_7772cf3d-825c-4ac1-8812-fcd953b116b8.sql`, `20260919043419_c5274c00-7154-486e-ac66-4048fbc8df1b.sql`, `20260921000000_restrict_application_table_privileges.sql`, `20260921010000_reconcile_property_cost_columns.sql`, and `20260924000000_phase1_financing_integrity.sql`. The accepted addition is [20261016000000_phase2a01_foundation.sql](../supabase/migrations/20261016000000_phase2a01_foundation.sql).

## 3. Existing ownership and location contracts

`public.properties.id` identifies a Subject Property. Its required `user_id` references `auth.users(id) ON DELETE CASCADE`. Authenticated CRUD policies use `auth.uid() = user_id`; UPDATE checks both old and new ownership. Ordinary owners cannot transfer their property to a different user through that policy. Trusted administrative changes still require race protection in future location processing.

The final `public.owns_property(uuid)` definition is SQL, STABLE, SECURITY INVOKER, with `search_path=public`, selecting the parent by ID and `auth.uid()`. Phase 1 child tables inherit ownership through it and cascade on parent deletion. Do not mistake the earlier migration's helper definition for its final definition. Phase 1 RLS is enabled; the foundation does not change Phase 1 to FORCE RLS.

The reconciled property fields include `project_name`, `full_address`, `city`, `district`, `state`, `postcode`, and `country` (existing default `Malaysia`). Earlier `name` and `address` were renamed by the historical reconciliation migration. None of these fields is confirmed canonical geography. Repository migrations/types contain no latitude, longitude, geography/geometry column, location-version table or current-location pointer. No spatial application capability is inferred from external extension objects.

The accepted `property_location_intelligence_state` has seven columns: `property_id`, three separate processing/freshness/publication statuses, `state_revision`, `created_at`, `updated_at`. It is an optional one-to-one child of `properties`, with `ON DELETE CASCADE / ON UPDATE RESTRICT`. Its only current relationship is that property FK. There are no run, snapshot, assessment or location FKs. Its allowed states remain `NOT_STARTED`, `UNKNOWN`, `NOT_ASSESSED`.

Its guard initializes revision 0 and increments each UPDATE, including a no-op, with a safe-integer ceiling of 9007199254740991. **It does not prove that a writer supplied an expected revision.** Service SELECT/INSERT/UPDATE are already accepted dormant capabilities; authenticated users have owner SELECT only. This review retains that contract rather than claiming FORCE RLS restricts the service role.

## 4. Binding requirements versus open details

| Topic / source | Authority | Consequence |
| --- | --- | --- |
| Phase 1 independence; freeze §§3–7, plan §2 / INV-01,13 | FROZEN PRINCIPLE | Save and analyze property without a Phase 2 row or geocoder; no financial writes from location work |
| Subject Property / Subject Location / Analysis Origin; plan §6 | Approved conceptual direction | Property is not a POI; locate the subject, and identify the exact point used for measurement |
| Canonical coordinates belong to a version; material address/coordinate change; §6 | Binding versioning principle | Append history and establish new analytical lineage; no silent replacement |
| User review of ambiguous/low-confidence geocoding; §6 | Approved design direction | No invented coordinates or automatic ambiguous selection |
| Coordinate source, normalized address, candidate/confidence, confirmation, CRS, change reason; §6's “Proposed resolution” | OPEN details | These are recommended metadata; exact columns/vocabularies and confirmation threshold were not among the ten approvals |
| Geography Point 4326 or equivalent; §17 | Approved design direction | Qualify installed extension schema; exact scalar/generated representation remains proposed |
| Immutable location/snapshot/fact/context/profile/engine lineage; §§15–16 / INV-06,12,20 | FROZEN PRINCIPLE | Historical assessments use their own coordinates, not today's pointer |
| Current-location pair FK; foundation §6 | Accepted foundation extension contract | Pair property and version, including under service bypass; no dangling arbitrary IDs |
| Restricted deletion of referenced versions; foundation §6 | Accepted direction with explicit cascade-design gate | Protect history and preserve parent/Auth deletion; exact FK timing conflict needs D05 |
| Private rows authorize against actual property ownership; plan §22 | Binding security principle | No duplicated user_id as authorization source; no public property geography |
| Material-change threshold; entrance vs centroid; confirmation actor; candidate persistence | OPEN DESIGN DECISIONS | Recommendations D03/D04/D07, not assumed approval |
| Separate Analysis Origin table / alternate routing entrance | OPEN / DEFERRED | Recommend current phase uses the confirmed Subject Location as origin; no duplicate table or silently snapped origin |

A confirmation is a user's acceptance of a point, not proof of rooftop accuracy. Coordinate storage precision, geocoder confidence and spatial accuracy remain distinct. The proposed design has no numeric confidence score or distance threshold disguised as an accepted requirement.

### All ten accepted reconciliations remain binding

| Reconciliation | Carry-forward into this design |
| --- | --- |
| ARC-01 bounded coverage | A valid origin says nothing about completeness of later searches; no out-of-radius absence inference |
| ARC-02 method-specific rules | Geography metres are not walking/driving time; preserve origin and method in later measurements |
| ARC-03 coverage before renormalization | No scoring/coverage machinery is implemented here; location confirmation cannot satisfy score eligibility |
| ARC-04 draft versus official | No score/publication activation; existing `NOT_ASSESSED` remains |
| ARC-05 lawful replay/retention | Persist provider-derived address/point metadata only with appropriate reviewed rights; confirmation does not erase licensing |
| ARC-06 separate states | Confirmation on the version is separate from processing, freshness and publication on state |
| ARC-08 responsibility-based table count | One new history table, reuse existing coordination table; no artificial overall table cap |
| ARC-09 provisional geocoder | Provider-neutral provenance; no vendor selection, provider call or seeded registry |
| ARC-10 context independence | No context inference from a pin; no classifier or implicit context change |
| ARC-11 undefined metrics withheld | No new fact keys, scoring rules or activation from this work |

ARC-07 and ARC-12 through ARC-18 were not part of those ten approvals. This review does not elevate them wholesale to approved status. Their useful ideas are labelled proposals unless independently required by a frozen invariant or accepted foundation contract.

## 5. PostGIS assessment

| Aspect | Finding / implication |
| --- | --- |
| Accepted external snapshot | HISTORICAL EVIDENCE: PostgreSQL 17.6; Q8 records `postgis 3.3.7`, schema `extensions`, owner `supabase_admin`, nonrelocatable. `postgis_topology 3.3.7` is in `topology`; topology is unnecessary for this feature |
| Historical schema access | Compiled Q7 reports anon/authenticated/service_role USAGE but no CREATE on `extensions`; postgres USAGE/CREATE; these are not fresh effective privilege checks or a full spatial-function ACL audit |
| Current local services | VERIFIED NOW: foundation DB/Auth containers exist; DB image `public.ecr.aws/supabase/postgres:17.11.0.004`, port 56422 published on IPv4/IPv6 wildcard. No foundation REST/gateway listed. No environment changed |
| Exact local identity | Container `e95ce873b90725032affcffc801147d39945beb988ac33461deedd91d59b94c6`; image `sha256:6058a6759ab9268cff8ee70641d61f1bd75953316281b76427cf5a6b4db2eafc`; sole inspected mount is named volume `supabase_db_mpia-phase2a01-implementation` at `/var/lib/postgresql/data`. Matches accepted implementation report |
| Local SQL version and extension state | HISTORICAL EVIDENCE: implementation report says server 17.11 and PostGIS absent. **Current SQL catalog NOT VERIFIED** |
| Why current SQL was not checked | Sandbox denied Docker context access; metadata listings/inspection were approved and completed. The subsequent exact-container `psql -X` catalog query in `BEGIN READ ONLY` was rejected by the user. It was not executed or retried through another route |
| Local binaries available for installation | NOT VERIFIED: `pg_available_extensions` query did not run. An image tag is not proof that an extension is available or enabled |
| Current extension owner/ACLs, spatial_ref_sys 4326, function signatures and library versions | NOT VERIFIED locally; production not accessed |
| Spatial reproducibility | NOT VERIFIED: no spatial functions or spatial tests executed; no extension installed/upgraded/relocated |

PostGIS 3.3.7's release notes explicitly include PostgreSQL 17 support. There is no basis for declaring that combination inherently incompatible or ordering an upgrade merely from the major version. Exact packaged-library compatibility still requires local validation. [PostGIS 3.3.7 release changes](https://postgis.net/2024/09/PostGIS-3.3.7/)

Recommend `extensions.geography(Point,4326)` derived from validated longitude/latitude, with a partial GiST index. WGS84 input uses longitude as X and latitude as Y. `ST_SetSRID` labels a coordinate system; it does not transform coordinates. [ST_MakePoint](https://postgis.net/docs/ST_MakePoint.html), [ST_SetSRID](https://postgis.net/docs/ST_SetSRID.html)

Use geography `ST_DWithin` for later metre-based radius predicates, explicitly retaining spheroid/method semantics; it supports index-assisted filtering. This is straight-line geography, not route accessibility. No POI queries are introduced now. [ST_DWithin](https://postgis.net/docs/ST_DWithin.html)

**Installation conclusion:** no extension installation is justified for the historical external target, where it already exists. If the local catalog still confirms absence, a separately approved local prerequisite installation will be necessary before spatial testing. If unavailable binaries require a different environment, stop for a separate setup decision; this task creates no Docker environment. The application migration should assert a compatible existing extension in the expected schema and fail closed, rather than hide installation, upgrade or relocation. Schema-qualified use follows [Supabase's PostGIS guidance](https://supabase.com/docs/guides/database/extensions/postgis).

## 6. Phase boundary and alternatives

| Phase | Responsibility |
| --- | --- |
| 2A-02 | Approved location table/pointer, geometry constraints/index, immutable-history guards, baseline RLS/grants, synthetic spatial/version/concurrency/cascade tests, generated types; no active endpoint |
| 2A-03 | Typed location/provider interfaces and trusted transaction interface; expected-revision, owner, input-fingerprint and request contracts; no provider selection |
| 2A-04 | Provisional geocoding, transient candidate review, confirmation workflow, timeouts/errors/cost/retention enforcement, stale-response protection; expand operational status vocabulary with supporting behavior |
| 2A-05 | Comprehensive endpoint/role/JWT/CSRF/rate-limit and alternate-path security audit. Basic new-table security cannot be postponed until this phase |
| 2A-06 | Combined audit, browser regression, database/platform qualification and release evidence |
| 2B+ | Evidence acquisition and provider benchmark, canonical places, snapshots, typed facts, contexts, assessments and scores in their approved subphases; no speculative tables now |

The broader plan mentions canonical-place foundations during 2A. They are not needed to store a Subject Property's location and are not smuggled into 2A-02; schedule them explicitly when their own ownership/use case is reviewed.

| Alternative | Trade-off / decision |
| --- | --- |
| Add coordinates/current pointer directly to `properties` | Smaller join cost but mixes mutable Phase 1 identity with canonical history; rejected without compelling need |
| Mutable location row with `is_current` flags | Encourages history edits and needs per-property uniqueness/race handling; rejected |
| Separate current-location table | Duplicates the accepted state responsibility; no need with its existing revision and PK |
| Candidate/job/origin tables now | Persist review options and jobs but add privacy/retention/lifecycle work before providers exist; defer |
| Geometry only | Useful for projected operations but 4326 geometry distances use degrees; geography is clearer for metre radii |
| Two independently writable spatial/scalar representations | Risks disagreement; proposed stored generated geography removes that ambiguity |
| Direct browser writes | Simpler CRUD but cannot safely author provenance and atomic current publication; rejected |
| Service-only transactional RPC now | Could centralize expected-revision enforcement; deferred unless implementation review cannot provide a trusted direct transaction. Never expose a generic privileged write RPC |

No resolved registry, fact vocabulary, freshness or Phase 1 financial decision is reopened. The only proposed departure from foundation guidance is D05's specific current-pointer FK deletion action/timing, with the cascade conflict made explicit. Stop after these four documents; owner review precedes any implementation.
