# MPIA — Phase 2A-01 implementation checklist

Updated: **17 October 2026 (Asia/Kuala_Lumpur)**. Actual results replace the 13 October PREP-only checklist. The current owner request authorizes the audited baseline, specification 1.1, both guards and bounded disposable local tests with ordinary Docker publication. Production migration/deployment and commits/pushes remain unauthorized.

Authority: [implementation report](PHASE2A_01_IMPLEMENTATION_REPORT.md), [specification 1.1](PHASE2A_01_FOUNDATION_SCHEMA_SPEC.md), [Phase 1 freeze](PHASE1_ARCHITECTURE_FREEZE.md), [Phase 2 plan revision 1.0](PHASE2_ARCHITECTURE_PLAN.md). Earlier readiness/decision/setup reports remain historical; former approval gates are superseded only within the current request's scope.

## 1. Authorization and baseline

- [x] Branch `phase2-location-intelligence` and audited HEAD `934ea702a2ecfdb31c530ea4a33e21a2d55e27d2` verified and retained.
- [x] No unexpected tracked changes at entry; supplied untracked planning/evidence documents recorded.
- [x] Five historical migrations unchanged; hashes recorded in [database evidence](phase2a01-database-results.json).
- [x] Both architecture documents read and unchanged; accepted reconciliations retained.
- [x] Current authorization covers D02/D04/D09/D10/D11/D17 and D07 bounded local setup; no renewed permission required by historical PREP restrictions.
- [x] Financial engines/configuration, application behavior and existing Phase 1 test assertions unchanged.
- [x] No merge/rebase/switch/commit/push/deployment or live-project connection.

## 2. Implementation

- [x] One chronological transactional migration: `20261016000000_phase2a01_foundation.sql`.
- [x] Four empty tables, 53 exact columns, four PKs, three registry unique constraints, one cascade/restrict FK and seven indexes.
- [x] All 61 complete fact tuples bound by literal key in guard and CHECK; exact context labels; no arbitrary key/method/unit/category combinations.
- [x] Provider reviews immutable; new reviews append versions; one-way deprecation cannot rewrite history or activate a successor.
- [x] Two invoker guards, fixed `pg_catalog` path, supported attachment/event checks; no dynamic SQL or other-table writes in guards.
- [x] No state DELETE guard; parent/Auth-user cascades work.
- [x] Optional inert state, database timestamps/revision and overflow protection. Expected-revision predicates remain a caller requirement.
- [x] RLS ENABLED/FORCE and four specified SELECT policies; no authenticated writes or write RPC.
- [x] New-object default grants, MAINTAIN, grant options and unwanted guard EXECUTE revoked; approved effective privileges and column ACLs tested.
- [x] No shared default-ACL, role/schema or Phase 1 permission/function/policy changes.
- [x] No seeds/backfill, provider calls, evidence/scoring/UI, or PostGIS changes.
- [x] Correct external `src/integrations/supabase/types.ts` generated locally; only four table nodes added; original type nodes preserved.

## 3. Local target safety

- [x] Fresh separate project/container/volume `mpia-phase2a01-implementation` / `supabase_db_mpia-phase2a01-implementation`; initial tables/users zero.
- [x] Local Docker endpoint, image, container ID, volume and SQL socket verified before mutation; runner pins inspected container ID.
- [x] Separate unlinked workdir; no copied production credentials or remote/project references; credential overrides filtered.
- [x] Failed `supabase_db_mpia-phase2a01-upgrade` volume never mounted/reused/deleted/replaced.
- [x] Original Phase 1 database never reset/overwritten; unchanged harness used rollback tests after verification and restored zero tables/users.
- [x] PG17.11 versus external/frozen PG17.6 difference disclosed; role semantics and 129 external public columns verified.
- [x] Synthetic fixtures removed/rolled back; final eleven application tables empty, Auth users zero.
- [x] Containers/volumes retained; no destructive cleanup.

## 4. Acceptance results

| ID | Outcome | Evidence |
| --- | --- | --- |
| T01 clean chain | PASS | Five frozen migrations + foundation; eleven tables, zero new rows; rollback |
| T02 populated upgrade | PASS | Seven-table synthetic baseline; metadata and rows preserved |
| T03 two-user isolation | PASS | Own reads; unfiltered and explicit-ID cross-owner exclusion |
| T04 unauthorized writes | PASS | SQL/direct guard denials, service positive controls, effective grants including MAINTAIN/grant options |
| T05 immutable registries | PASS | Append versions, pinned old review, one-way deprecation; forbidden changes denied |
| T06 contracts/constraints | PASS | 61 tuples; every incompatible component and NULL; independent CHECK path; provider/freshness/context negatives |
| T07 state/concurrency | PASS | Database times/revision, stale writer, overflow; two connections yield one winner |
| T08 cascades | PASS | Owner-parent and Auth-user cascades; other-user data protected |
| T09 Phase 1 preservation | PASS | Source/migration bytes and seven-table data/metadata preserved |
| T10 failure/rollback | PASS | Three injected stages; scoped post-install rollback and reinstall |
| T11 frozen Phase 1 DB | PASS | 80 schema + 512 reconciliation + 245 ownership + 349 constraints = 1,186 |
| T12 application/fixtures | PASS | 33 files / 1,073 tests; identical 53 P01–P10 assertion outcomes in both trees |
| T13 TypeScript/build | PASS | Application, fixture, original DB and new foundation type checks; production build |
| T14 bundle security | PASS | Six checks, zero skipped, fresh `.output/public` |
| T15 interactive UI/auth | **NOT EXECUTED** | Full signup/login/logout/account-switch/CRUD/dashboard matrix remains a release gap |

Final foundation suite: **2,340 passed, zero failed**. Separate evidence: [database](phase2a01-database-results.json), [schema](phase2a01-schema-verification.json), [frozen database](phase2a01-phase1-database-results.json), [fixtures](phase2a01-fixture-comparison.json), [types](phase2a01-type-generation.json). Resolved harness failures and reruns are disclosed in the report. Inspection is not reported as behavioral PASS.

## 5. Deferred and unresolved gates

- [ ] Interactive browser T15 against synthetic local accounts — NOT EXECUTED.
- [ ] S07/S08 real-handler actor/session/atomic ownership/location/idempotency tests — DEFERRED until a handler exists.
- [ ] Later fact-result/radius/coverage/pagination/freshness/classifier engines — DEFERRED; registry validation only is implemented now.
- [ ] Fresh production target/catalog/role/membership/default/effective-ACL preflight — NOT EXECUTED; separate authorization required.
- [ ] Production readiness/approval — NOT DECLARED. Platform patch differences and browser gap remain explicit.

Owner/BYPASSRLS authority, guard/DDL limits, release review for secret-free references and caller-supplied expected revisions are documented in the report. No provider/taxonomy/TTL/scoring activation follows from this schema.

## 6. Completion

- [x] Migration, database/security tests, scoped types, implementation report and updated checklist delivered.
- [x] Phase 1 assertions and historical evidence preserved; new evidence uses separate `phase2a01-*` files.
- [x] Production untouched; no commit/push/deployment.
- [x] Stop after these deliverables. Future production actions require separate authorization.
