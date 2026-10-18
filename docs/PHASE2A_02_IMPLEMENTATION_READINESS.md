# MPIA — Phase 2A-02 implementation readiness

17 October 2026 (Asia/Kuala_Lumpur). **GO for architecture review; BLOCKED for implementation and deployment.** This task delivered documentation and repository verification only.

Read [architecture findings](PHASE2A_02_ARCHITECTURE_REVIEW.md), [the schema proposal](PHASE2A_02_SCHEMA_PROPOSAL.md), and [the decision register](PHASE2A_02_DECISION_REGISTER.md). These four documents contain proposals, not a migration or a completed spatial feature.

## 1. Readiness gates

| Gate | Result | Required next evidence |
| --- | --- | --- |
| Correct branch | PASS: `phase2-location-intelligence` | Recheck before implementation |
| Exact requested checkpoint | DIFFERENT: actual `c9b6c4acc1879a2b84b89d3b39455f2489e4c56a`, documentation-only direct child of `e9b55b024263857aacafbd8d9d9158d749d9261f` | D01 owner acknowledgement; no history repair |
| Clean initial worktree / preserved implementation | PASS | Only the four new review documents should remain as task changes |
| Phase 1 engines / five original migrations | PASS source comparison against `v0.1-phase1` | Retain regression and file comparisons after eventual implementation |
| Foundation preserved | PASS source comparison against accepted checkpoint | Additive migration; do not edit original foundation SQL |
| Design approval | OPEN D02–D07 | Owner-approved schema, semantics, security, spatial and cascade decisions |
| Current local spatial catalog | NOT VERIFIED | Exact-container read-only SQL approval/inspection; later local preparation if required |
| Existing PostGIS evidence | Historical external 3.3.7 / extensions / supabase_admin; historical local absence | Qualify actual local version/schema/function/library and privilege behavior; no production access in this task |
| Spatial/cascade/concurrency behavior | NOT EXECUTED | Approved isolated database implementation tests |
| Real geocoding/backend/UI | NOT IMPLEMENTED / NOT TESTED | Later phase contracts and tests; no live feature inference from SQL grants |
| Production readiness | BLOCKED | Existing browser, current external preflight, operational/platform and explicit deployment gates remain |

## 2. Verification actually performed

| Check | Observed result |
| --- | --- |
| `git branch --show-current`, `git rev-parse HEAD`, `git rev-parse HEAD^`, status/diffs/log | Correct branch, direct-parent checkpoint, eight documentation additions, clean initial tree; no history/index/branch modification |
| Protected source and migration comparison | No protected-engine/config/hook differences from Phase 1; original migrations unchanged; only accepted foundation migration added |
| Type source comparison | +208/-0 from Phase 1, four accepted foundation additions; no change from checkpoint |
| `node node_modules/vitest/vitest.mjs run --reporter=dot` | **PASS: 33 files, 1,073 tests**, zero failures |
| `node node_modules/typescript/bin/tsc --noEmit` | **PASS**, no diagnostics |
| `node node_modules/typescript/bin/tsc -p tests/database-types/tsconfig.phase2a01.json --noEmit` | **PASS**, no diagnostics; includes foundation/Phase 1 type expectations |
| `node --test tests/security.test.mjs` | **PASS: 6 tests, 0 failures, 0 skips**, process-local `SECURITY_AUDIT_BROWSER_ROOT=.output/public`, source-root override cleared |
| Security scan qualification | Existing browser bundle scanned; no fresh build. Pattern tests are not RLS/endpoint penetration tests |
| Docker metadata | Read-only service listing and exact DB container/image/mount inspection passed after sandbox escalation approval |
| Read-only SQL catalog | **NOT EXECUTED**: sandbox denied first attempt; escalated exact-container catalog-only request was rejected by user. No workaround or alternate connection used |
| Fresh production build | NOT RUN; no application code changed. Historical accepted build remains historical evidence |
| SQL/database runners, spatial tests, browser | NOT RUN. Existing runners insert fixtures/disable triggers even in rollback mode; unsuitable for this design-only task |

Public PostgreSQL/PostGIS/Supabase documentation was consulted to verify technical semantics; links appear at the relevant claims in the review/schema. No geocoding/provider API, production Supabase connection, deployment, extension change or Docker setup was performed.

The Docker identity checked was container `e95ce873b90725032affcffc801147d39945beb988ac33461deedd91d59b94c6`, image digest `sha256:6058a6759ab9268cff8ee70641d61f1bd75953316281b76427cf5a6b4db2eafc`, named volume `supabase_db_mpia-phase2a01-implementation`. Current metadata matches the accepted implementation report. It does not establish today's SQL data/role/extension state.

## 3. Future read-only qualification checklist

After separate approval, use only the verified local container ID, `psql -X`, its local Unix socket, database/user `postgres`, and an enforced read-only transaction. Reinspect ID/image/mount first; never read project secrets or choose a hosted URL. Capture bounded schema metadata, not private rows.

1. Confirm `current_database`, `current_user`, `server_version_num`, socket identity, intended schema/table state and installed migration baseline.
2. Inspect `pg_extension` version/schema/owner/nonrelocatable attributes and `pg_available_extensions`; distinguish installed SQL extension from available binaries. If absent, record that result and stop spatial calls until a separately authorized prerequisite installation.
3. If installed, inspect `extensions.PostGIS_Full_Version()`, geometry/geography type namespaces, required constructor/cast/accessor/validation/distance function signatures and volatility, GiST operator class, `spatial_ref_sys` SRID 4326, and schema/function/type effective grants.
4. Verify PostgreSQL 17 role attributes, object owner, BYPASSRLS, recursive membership/SET/INHERIT/ADMIN authority, schema USAGE/CREATE, effective table/column grants including MAINTAIN, default grants, function EXECUTE and search paths. Verify frozen owns_property body and Phase 1/Foundation RLS again. Do not repair shared grants to fit the proposal.
5. Run read-only scalar/spatial expressions only after presence/permission checks: synthetic known point, axes, SRID, geometry-to-geography, zero/self-distance, independent known-distance reference and radius boundaries. Record exact platform/library identity and tolerances. These checks do not replace DML/index/cascade tests.

An installed PostGIS 3.3.7 is not inherently incompatible with PostgreSQL 17; its release notes include support. The proposed migration should reject an unqualified schema/version/runtime combination, not automatically upgrade it. If local installation is needed, choose and approve its exact version, owner and `extensions` schema separately. Topology/raster/geocoder extensions are unnecessary.

## 4. Future migration and test sequence

Everything in this section is a plan for a separately authorized implementation task.

1. Resolve D01–D08; confirm the intended baseline, test target and permitted operations. Complete prerequisite spatial qualification/preparation. Preserve accepted Phase 1 and foundation fingerprints. Do not reset existing volumes to obtain a clean-install target.
2. Prepare one new chronological application migration after `20261016000000_phase2a01_foundation.sql`. Assert expected foundation/ownership/extension catalog, no name collisions, correct trusted creator and compatible function signatures. Keep extension provisioning separate; do not use unqualified `CREATE EXTENSION IF NOT EXISTS` as a compatibility check.
3. In one transaction create the empty location table, checks/keys/indexes and new invoker guards; add nullable state pointer and composite FK; enable/force RLS; remove materialized new-object default grants; apply exact permissions/policy; attach guards; validate privileges and dependencies. Do not widen status vocabularies, seed/backfill, change existing foundation guard semantics or add Phase 1 application triggers.
4. On an explicitly approved clean local database, apply the original five migrations, accepted foundation, then new migration. Independently test a populated Phase 1 + foundation upgrade, including properties with no state and state rows with nonzero revisions. Adding the nullable pointer must not synthesize coordinates or increment existing revisions/timestamps. If no approved clean target exists, mark clean-install validation blocked rather than creating a Docker environment by implication.
5. Exercise the acceptance matrix below using synthetic users/properties and real database constraints/roles. Capture expected SQLSTATEs/row outcomes, run IDs, server/library versions and exact label inventory. Assert rollback/cleanup. Test the pointer FK at COMMIT as well as statement time.
6. Generate types from the approved local database into a review artifact, then update the established destination `src/integrations/supabase/types.ts` only after diff review. Preserve all Phase 1 and foundation contracts; do not switch to a different main-branch type convention. Verify nullable pointer, two-column relationship, history Row/Insert/Update shape and generated spatial-column behavior. Generated Update types are not a permission grant. Keep extension serialization behind typed scalar interfaces; do not pretend an opaque geography encoding is a latitude/longitude object.
7. Run application/type/security/build regressions and unchanged P01–P10 expectations, then approved database regressions. Existing Phase 1 empty-schema harness must use its original five-migration export/approved target; do not point it at this expanded installed database or weaken its assertions. Foundation's original four-table/seven-index catalog assertions need a separately reviewed successor expectation, not silent alteration of historical results.
8. Review migration rollback/fault injection, generated types, exact ACLs and cascade/concurrency evidence. Publish an implementation report distinguishing passed, failed, deferred and NOT VERIFIED tests. No commit, push, deployment or next-phase endpoint is implied by this sequence.

Abort/failure behavior: an error inside the application migration leaves no new table, pointer column, guard, grant or index. A separate prerequisite extension installation, if approved later, is a distinct operation and must not be falsely claimed rolled back by the application migration. After synthetic installation, reverse only new dependencies in a disposable approved test target and verify Phase 1/foundation equality. After real location history exists, do not prescribe DROP/CASCADE rollback; disable new writers and use a reviewed forward repair/retention procedure.

## 5. Required acceptance matrix — all new cases NOT EXECUTED

| ID | Test and decisive expected result |
| --- | --- |
| L01 spatial presence/schema | Installed extension is in approved schema/version; required signatures/operator class and effective grants valid. Missing/wrong-schema/unsupported extension fails preflight without modification |
| L02 valid points | Synthetic Malaysian and global boundary points round-trip longitude/X, latitude/Y and SRID 4326; geography uses metres. Independent expected distances with explicit tolerance, not a formula repeated from implementation |
| L03 invalid coordinates | NULL pair allowed only for permitted statuses; one NULL, NaN, ±infinity and values beyond ±90/±180 rejected before coercion. Unsupported CRS, raw geometry input, Z/M/empty/nonpoint inputs cannot bypass the typed boundary; `(0,0)` never means missing |
| L04 generated geometry/index | Position cannot be supplied independently; scalar/point equality, dimension, SRID and nonempty validation hold. GiST is valid; explain a representative bounded synthetic query without requiring the planner to choose an index on a tiny fixture |
| L05 version identity | First and subsequent commands append; UUID, pair, version and operation uniqueness reject duplicates using valid rows and the expected constraint/SQLSTATE. No no-op UPDATE/upsert may mutate history |
| L06 immutability | Attempt each persisted semantic field, property ID, audit time and confirmation change, as permitted test authorities; guard rejects. Direct runtime U/D/TRUNCATE and guard EXECUTE denied; positive insert/read controls succeed |
| L07 pointer containment | Valid own-property pointer succeeds. Nonexistent UUID, other property of same owner, and property of another owner fail under service bypass too. Commit cannot retain dangling reference; backward/reset-to-NULL pointer denied; append CLEARED succeeds |
| L08 permission matrix | anon no reads/writes; A/B reciprocal own/history reads and unfiltered isolation; authenticated own/other I/U/D/upsert denial. Service history S/I, state S/I/U positive controls, all prohibited privileges and grant options absent |
| L09 role escape | Recursive memberships, column grants, MAINTAIN, SET ROLE, definer/view/RPC paths cannot reopen writes; FORCE RLS true on new table. Service bypass is explicitly observed, not counted as owner authorization |
| L10 stale revisions | Missing/wrong expected token fails trusted transaction; stale conditional UPDATE returns zero and rolls back appended version. Same UUID/revision with changed property-input hash rejected; overflow rejected |
| L11 actual contention | Two sessions plus coordinator handshake: hold first parent/state transaction; observe second blocked via pg_locks/pg_stat_activity and blocking PID before releasing first; exactly one winner. Cover simultaneous first state creation and competing pointer updates. Timing/sleep alone is insufficient |
| L12 delayed/duplicate responses | Old request with earlier owner/input/version/revision cannot publish. Exact operation retry returns recorded outcome without repointing history; changed payload under same operation ID conflicts; deleted parent never recreated |
| L13 property cascade | Authenticated A deletes A parent with current and historical versions and state: all A private children gone, B unchanged. Nonowner delete denied. Test pointer initially present and deferred constraint at COMMIT; do not rely on object creation order |
| L14 Auth cascade/transfer | Delete Auth user and all owned properties cascade, including histories and financial rows. Simulate trusted ownership change: former owner loses history access; stale former-owner job fails; provenance UUIDs do not block account deletion |
| L15 incomplete/review | No location/state, address-only, multiple matches, approximate candidate, pin without address, clear and correction all remain honest. High confidence without confirmation is not eligible. Bad status/field combinations fail, including NULL loopholes |
| L16 provider provenance | Exact reviewed version pinned; missing/deprecated/disabled/unreviewed/wrong-capability/retention-ineligible provider rejected at guard snapshot. Service positive inserts work with registry SELECT only. Later use rechecks withdrawal; do not claim serialization against concurrent administrative deprecation. Confirmation cannot strip provider attribution or improve accuracy |
| L17 normalization/materiality | Captured raw/normalized address, normalizer version and hashes stable; changed source/metadata appends; financial edit leaves input hash unchanged. Independently saved address change immediately withholds old origin in later read contract without provider calls |
| L18 history/lineage | New current version leaves prior immutable version readable to current owner. Synthetic future-consumer contract pins old pair and retrieves old point; real evidence/snapshot/assessment integration remains deferred until those tables exist |
| L19 install/upgrade | Clean approved local installation and populated seven-table + foundation upgrade succeed; existing values/ownership/rows/statuses/revisions/timestamps unchanged; no backfill/seed or required Phase 2 row for Phase 1 save |
| L20 atomic failure | Inject failure after history insert, before/after pointer update and at deferred constraint commit: no partial version publication, no revision drift or acknowledged failed command; accepted baseline intact after failed migration |
| L21 types | Generated pointer nullability, composite relationships, generated column exclusion/representation and safe bigint handling compile; existing Phase 1/foundation contracts and tests unchanged in meaning |
| L22 Phase 1 regression | Frozen 1,073 application cases/P01–P10 and appropriate original database fixtures pass; missing geocoder, provider timeout/denial and absent location never roll back Phase 1 saving or change financial outputs |
| L23 later handler security | Before 2A-03/04 runtime: valid/expired/forged JWT, spoofed actor, same-owner different-property swap, CSRF where applicable, replay, owner transfer and actual transactional write boundaries. SQL tests alone cannot establish these |

No full evidence or assessment tables should be created merely to satisfy L18; schema-level relationship fixtures and later integration gates must be labelled separately. Provider/error scenarios use deterministic synthetic adapters; no paid/live provider call is required by this plan.

## 6. Carried-forward unresolved acceptance gaps

**T15 browser regression: NOT EXECUTED.** All eight prior cases remain open: protected-route guard; read-only dashboard; missing/error states; reciprocal cross-user reads; signup/login/recovery/logout; account switching/cache isolation; property/financial CRUD/cascades; desktop/mobile layout/navigation. Existing foundation DB/Auth containers do not supply a browser-facing REST/gateway. The older Phase 1 stack is a different target and is not silently substituted. Prepared synthetic accounts, safe configuration and separately authorized local Auth/CRUD work are required before recording interactive passes.

**Medium — registry uniqueness coverage:** `tests/phase2a01-security-cases.mjs` deprecates rows before duplicate-identity INSERT and accepts either `23514` or `23505`. The deprecation guard can win before uniqueness is exercised. Use valid nondeprecated inputs, independently test duplicate UUID versus logical key/version for provider/fact/freshness, and require `23505` for each. Existing PK/UNIQUE definitions remain present; this is a coverage gap, not an identified missing constraint. **Not fixed here.**

**Medium — contention proof:** the prior runner waits for the first connection's `PgSleep`, but does not prove the second entered lock wait before commit. It establishes two-connection stale-revision behavior, not conclusive lock contention. L11 requires coordinator handshakes and observed blocking. **Not fixed here.**

Earlier low-priority qualifications about aggregate assertion counts and non-exhaustive guard/field mutation cases also remain. New tests should retain exact expected label inventory and positive controls rather than using a minimum-total threshold as a coverage claim.

## 7. Delivery and stop point

Only these four Markdown documents in `docs/` are task deliverables:

1. `PHASE2A_02_ARCHITECTURE_REVIEW.md`
2. `PHASE2A_02_SCHEMA_PROPOSAL.md`
3. `PHASE2A_02_DECISION_REGISTER.md`
4. `PHASE2A_02_IMPLEMENTATION_READINESS.md`

No application code, generated types, tests, migration, database, extension, provider configuration or Git history was modified. No commit/push/merge/rebase/fetch-and-integrate, production access or deployment occurred. Review documents are uncommitted. **Wait for owner review; do not implement Phase 2A-02 automatically.**
