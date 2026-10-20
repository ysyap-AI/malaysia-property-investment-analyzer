# MPIA — Phase 2A-02 FINAL-ACCEPTANCE-01

18 October 2026, Asia/Kuala_Lumpur. Scope: final acceptance of the completed PostGIS/property-location foundation, not implementation restart or deployment.

**The dormant local database implementation is accepted with qualifications. A development Git checkpoint and narrowly scoped Phase 2A-03 work are recommended as separate next actions. Production readiness remains BLOCKED.** No blocking defect in the reviewed development schema was established. Unexecuted qualification and runtime tests remain explicitly open.

| Boundary | Decision | Meaning |
| --- | --- | --- |
| A — Phase 2A-02 database implementation | **ACCEPTED WITH QUALIFICATIONS** | Accept the reviewed migration, scoped types and synthetic transaction contract on the verified local platform. This is not exhaustive platform/security certification or a functioning location feature. |
| B — Development Git checkpoint | **GO recommendation** | The exact inventory below is suitable for a development checkpoint, including historical evidence and the two report relocations. The owner must separately instruct the Git action; nothing was staged or committed here. |
| C — Phase 2A-03 design/development | **GO recommendation, subject to entry conditions** | Provider-neutral interfaces and trusted transaction contracts can proceed after a separate owner instruction. Runtime authentication/provider/browser gates are not prerequisites for drafting those interfaces, but must pass before the corresponding feature is exposed. No next-phase work began. |
| D — Production deployment readiness | **BLOCKED** | Clean installation, target/platform and adversarial qualification, operational controls, applicable handler/provider tests, T15 and release validation remain open. No production access or deployment occurred. |

## Authority and evidence precedence

Reviewed the [Phase 1 freeze](PHASE1_ARCHITECTURE_FREEZE.md), [Phase 2 architecture plan](PHASE2_ARCHITECTURE_PLAN.md), [Phase 2A-01 final acceptance](PHASE2A_01_FINAL_ACCEPTANCE_REPORT.md) and its final/database/type/fixture manifests. Reviewed all Phase 2A-02 architecture review, schema proposal, decision register, implementation readiness, implementation report/checklist, both transaction-closure reports, harness-repair report and their supporting JSON/test sources. AGENTS.md and PROJECT_RULES.md remain applicable. D01–D08 and the separately recorded local installation authorization define the implemented scope; old DESIGN-01 OPEN labels are historical.

This report and [phase2a02-final-verification.json](phase2a02-final-verification.json) provide the current acceptance disposition. TEST-CLOSURE-02 establishes transaction closure. The earlier reports/manifests remain evidence of their own stages; their overall BLOCKED and NOT_EXECUTED fields are not silently converted to passes. In particular, the original absent-PostGIS capture, declined implementation-era execution, TEST-CLOSURE-01 safety stop and subsequent failed qualification attempts remain preserved.

The implementation report and checklist now have explicit current-status sections, followed by their complete pre-audit contents unchanged. The original verification manifest, transaction results, archived closure, repair report, decision register and all other historical evidence were not regenerated. Historical claims about “fresh” tests mean fresh during that historical task; this report distinguishes those from this audit.

## Source integrity and implementation inventory

| Check | Finding |
| --- | --- |
| Branch / HEAD | `phase2-location-intelligence` / `c9b6c4acc1879a2b84b89d3b39455f2489e4c56a`, exactly the requested baseline. Parent remains `e9b55b024263857aacafbd8d9d9158d749d9261f`. |
| Tracked differences from baseline | Only the generated type file changes content (+116/-0 lines). Two root reports are deleted at their old paths and exist under `docs/` as byte-identical relocations. All other implementation/evidence additions remain untracked pending an owner-directed checkpoint. |
| Original migrations | All five retain their recorded byte hashes and Phase 1 release contents. The accepted Phase 2A-01 migration retains SHA-256 `33a36f5890ce75bc3d2a035482d828224fce28a4c585911539b4856e77875393`. |
| New migration | `20261017000000_phase2a02_property_locations.sql`, SHA-256 `bebe96e843b5e8198fe6ec4e59d9091aea5bbec71a63e555e717cc645ca23e40`, matches installed and transaction-closure evidence. No migration was rewritten or reapplied. |
| Frozen Phase 1 behavior | Finance, scenarios, scoring, risk, recommendations, configuration, shared validation and analysis hook have no differences from `v0.1-phase1`. Existing tests/package/lock/runtime sources are unchanged. Git comparisons account for checkout line endings; migration hashes compare actual bytes. |
| Generated types | Only history and the state pointer/composite relationship were added at the established external-client type destination. Ten other table definitions are preserved; 44 old contracts compile. Geography reads remain `unknown`, writes optional `never`; bigint version bounds are enforced in SQL. No type grants write permission. |
| Scope | One history table, one nullable state column, composite FK, constraints/indexes, two invoker guards and narrow RLS/grants. No handler, worker, RPC, UI, provider consumer, status activation, seeds, financial change or new dependency. |
| Secrets / unexpected files | Candidate-file credential-pattern scan and scoped review found no secret or unrelated implementation addition. The Phase 2A-01 quality follow-up pair is intentional supplemental evidence. Separate-container spatial evidence is historical provenance only, not acceptance of another target. Pattern scans are not exhaustive secret attestation. |
| Index / Git history | Index remained empty and HEAD/branch unchanged. No stage, discard, commit, push, merge, rebase or remote synchronization. |

The report relocations are `PHASE2A_01_GIT_CHECKPOINT_REPORT.md` → `docs/PHASE2A_01_GIT_CHECKPOINT_REPORT.md` and `PHASE2A_01_GITHUB_SYNC_REPORT.md` → `docs/PHASE2A_01_GITHUB_SYNC_REPORT.md`. Their destination bytes equal the original Git blobs exactly. Include both sides of each move in any checkpoint; do not restore the roots, discard the destinations or treat them as unrelated deletions. They contain no relative Markdown links requiring relocation repair.

The original 53-file implementation manifest matches **46 current files**, with **seven expected superseded hashes**: implementation report, checklist, transaction results, test README, contention helper, target helper and transaction runner. These are explained by TEST-CLOSURE-02; all **19 closure-preservation hashes** matched at audit entry. All **nine original regression-log hashes** match. The two implementation documents then received the explicit acceptance overlays described above. Current hashes and historical comparisons are recorded separately in the new manifest. No unexplained hash mismatch remains.

## Consolidated test evidence

These rows describe overlapping suites and evidence groups. **Do not add them into a single number of distinct tests**, add repeated executions across tasks, or count source labels as executed assertions.

| Area | Consolidated result | Evidence age and qualification |
| --- | --- | --- |
| Spatial/database assertions | **166 PASS**, 166 distinct recorded labels | **Retained**, `phase2a02-database-results.json`. Offline SQL regeneration matches its SHA. Source inventory has 167 labels; one FK label was rolled back with its savepoint and is excluded from the recorded 166. |
| Upgrade / migration atomicity | Populated upgrade PASS; three injected failure rollbacks PASS; retained installation PASS | **Retained**, `phase2a02-installation-results.json`. Revision 7 and accepted metadata/data preserved; no backfill. These five groups are not a clean-install result. |
| Permanent pointer FK / deletion | Three actual bad-pointer COMMIT rejections (`23503`); property and Auth cascades PASS | **Retained**, `phase2a02-commit-results.json`. Covers nonexistent, same-owner-other-property and other-owner pointers, current/history/state and financial children. The historical negative FK tests temporarily disabled only the new semantic pointer guard inside failed transactions; this audit did not repeat that procedure. |
| Location transaction contract | **TC01–TC14: 14/14 PASS**, zero fail/unexecuted | **Retained final TEST-CLOSURE-02 run**, 09:56:10.734–09:56:53.109 UTC on 18 October. Earlier attempts are not extra passes. Synthetic writer only; no real JWT or provider execution. |
| Location contention | **Two observed races**, within TC05/TC06/TC07 | **Retained**, winner/rival PIDs 5698/5705 and 5755/5762; each had the winner in `pg_blocking_pids`, `Lock` wait and one ungranted lock before release. TC07 checks those same two observations; it is not a third race. |
| Transaction failure at COMMIT | TC14: absent/existing state both reject COMMIT with `23503`, complete history/pointer/revision/timestamp rollback | **Retained**, temporary deferred-FK fault; permanent guards remained active. This proves writer rollback on actual COMMIT failure, separately from the permanent-pointer FK evidence. |
| Harness safety | **11/11 simulations PASS** | **Retained**, source hashes freshly match. Mostly simulated controls; S10 used a disposable local Node process. These are not 11 live database-timeout tests. Not rerun because its writer overwrites historical safety evidence. |
| Application | **1,073 PASS**, 0 failed/pending, 33 files | **Fresh FINAL-ACCEPTANCE-01**, also previously passed. Repeated runs do not increase distinct coverage. |
| Frozen P01–P10 | **53/53 names and outcomes match** accepted fixtures | **Fresh**, subset of the 1,073. Unchanged fixture expectations; not a separate archived numerical-output comparison. |
| Types | Five TypeScript project checks and **44 preserved-contract equality checks PASS** | **Fresh**; generated source/catalog hashes also match retained provenance. Installed catalog equality supplies current database consistency. |
| Serializer | **5/5 PASS** | **Fresh**, fixed-order hashes, financial-input independence, negative zero and invalid command cases. No runtime handler implied. |
| Security patterns | **5 PASS / 1 explicitly SKIPPED** | **Fresh**, source/configuration/ignore checks. Built-asset scan skipped because no new build was produced. Earlier build plus six security passes remain hash-verified retained evidence, not fresh passes. |
| Foundation regression | **2,340 assertion executions**, **2,303 distinct labels** | **Retained** before spatial installation. Repetitions are not distinct cases; do not rerun its 11-table/empty-schema assumptions on this installed 12-table target. |
| Foundation quality follow-up | Nine checks: six isolated `23505` rejections plus three controls; two observed foundation races | **Retained**, separate from location races. Addresses the earlier 2A-01 uniqueness/contention evidence gaps without rewriting old tests/results. |
| Original Phase 1 database | 80 schema + 512 reconciliation + 245 ownership + 349 constraints = 1,186 recorded outcomes | **Historical retained foundation-era evidence**, not rerun and not extra current location coverage. |
| Current database / remaining focused probes | Catalog/data preservation PASS; six negative probes PASS; representative GiST and sequential parity PASS | **Fresh**, details below and full query plans in the final manifest. |
| Clean installation / real handler / provider / T15 | **NOT VERIFIED / NOT EXECUTED** | No corresponding new passes claimed. |

Fresh commands: `node tests/phase2a02-final-acceptance.mjs --offline` and `node tests/phase2a02-final-acceptance.mjs --database`; source syntax, inventory, hashes, credential patterns and whitespace were checked separately. The first database attempt stopped at sandbox-denied Docker context access before SQL; the normal approved escalation then completed. No automatic approval rejection or alternate target workaround occurred.

## Focused technical findings

### 1. Migration reproducibility and clean installation

The additive migration has an explicit transaction, performs prerequisite checks before spatial DDL, and contains no extension installation/upgrade/relocation, seed or backfill. Its source hash matches the populated-upgrade, failure-rollback and installed-schema evidence. The six preceding migrations are preserved. Current catalog equality matches that installed result. These support reproduction from the qualified foundation state.

**Clean installation of the entire seven-migration chain with the separately provisioned spatial prerequisite is NOT VERIFIED.** No designated clean target exists in the approved scope; resetting the installed target, removing its schema or creating another environment would violate this task. Historical six-migration foundation installation and separate PostGIS smoke tests do not fill this gap. This is a **medium deployment-qualification risk**, not a blocker for saving an inert development checkpoint or designing interfaces. Complete it on a separately approved clean target before deployment qualification.

The migration intentionally rejects an already-installed namespace; it is not an idempotent installer. This audit executed its original preflight alone in a read-only transaction and observed `55000` for the existing namespace. Source hashes plus exact catalog comparison establish local installation identity; they do not assert a migration-ledger entry or qualification of every migration runner's transaction wrapping.

### 2. PostGIS fail-closed boundaries

Source review confirms preflight requires PostgreSQL 17, the trusted creator/BYPASSRLS boundary, PostGIS **3.3.7 in `extensions`** owned by `postgres` or `supabase_admin`, required immutable signatures/EXECUTE, schema/type access, EPSG:4326 and the geography GiST opclass. Missing/wrong version/schema/owner rejects before application DDL; later prerequisite/DDL failures remain inside the transaction. The migration never attempts to repair an incompatible extension.

The actual approved platform is PostgreSQL **17.11**, PostGIS **3.3.7**, owner **supabase_admin**, with the same library/catalog fingerprint as closure. **Live missing/wrong-schema/wrong-version/corrupted-library injection was NOT EXECUTED.** No extension, catalog or permanent privilege was altered. The source predicate is evidence of intended fail-closed behavior, not an executed incompatible-platform matrix. Same-version tampering, function membership/implementation authenticity and every alternative operator/library combination are not exhaustively certified by the migration's metadata checks; deployment preflight must verify actual objects/library and stop on drift.

### 3. Roles, privileges and guard attachment escapes

Fresh full-catalog equality includes FORCE RLS, owner-only reads through actual property ownership, history service SELECT/INSERT, state service SELECT/INSERT/UPDATE, column ACLs, grant options, MAINTAIN and guard EXECUTE. No unsafe reachable SET/USAGE authority or reachable membership ADMIN path was found for the examined runtime roles. Authenticator can assume exactly anon/authenticated/service_role; this expected trusted gateway boundary is distinct from ordinary authenticated users gaining service authority.

All three state/history guards are enabled with their exact expected attachments: state/pointer BEFORE ROW INSERT/UPDATE (`tgtype=23`) and history BEFORE ROW INSERT/UPDATE/DELETE (`tgtype=31`), zero arguments. Both new functions are invokers with `search_path=pg_catalog`. No public view/materialized view or new SECURITY DEFINER path exists. The sole public definer is unchanged `handle_new_user`, which inserts profiles and does not access location tables.

Six fresh negative probes passed: the original preflight rejects an already-installed namespace and a service-role migration creator with `55000`; both existing guards reject temporary wrong-schema/table ROW and STATEMENT attachments with `23514`. Temporary objects rolled back and permanent guards stayed active. The combined wrong-attachment tests do **not** independently exercise every timing/event/argument branch. Runtime TRIGGER/EXECUTE denial is established by catalog and retained negative tests, not by granting runtime roles new privileges here.

Full adversarial membership changes, malicious definer paths across every schema, altered permanent attachments and owner/administrator DDL bypass remain outside this audit. Notably, migration preflight checks the foundation guard's presence/enabled state but does not itself exhaustively compare its event mask/body; the separate current-target qualification does. Trusted administrators and service BYPASSRLS remain explicit trust boundaries. This is **partial adversarial qualification**, with no current escape found, rather than a claim of universal tamper resistance.

### 4. Representative GiST validation

On the exact approved database, a single transaction created only a temporary table using the installed generated geography expression and partial GiST pattern. It held **20,000 grid points plus 1,000 NULL points**. A 15,000-metre `ST_DWithin` query around longitude 101.69 / latitude 3.14 chose **Bitmap Heap Scan → Bitmap Index Scan (`fa_spatial_gist`)** under normal planner settings and returned six rows. Disabling index/bitmap scans in that transaction produced a sequential scan with the identical six IDs. All temporary data/DDL rolled back.

A separate read-only EXPLAIN on the actual empty history table, with sequential scan discouraged, selected `property_location_versions_position_gist`. That proves installed-index usability, not a realistic cost choice on an empty table. The representative temporary plan closes the basic L04 query-plan exercise; it is **not** a production performance benchmark, an authenticated RLS query plan or assurance for future joins/distributions. No speed claim is made from one run.

### 5. Parent, location and pointer deletion

The source preserves property→history CASCADE and property→state CASCADE; the state→history `(property_id,current_location_version_id)` FK uses deferred NO ACTION. This allows both child cascades to complete before the pointer is checked at COMMIT. History UPDATE is always rejected; standalone DELETE while its parent exists is guarded, with no runtime DELETE/TRUNCATE grant. Clearing location appends CLEARED rather than setting an existing pointer to NULL or erasing history. Provider-version references remain restrictive.

Retained committed property/Auth tests establish deletion with populated history/current pointer and financial children, including preservation of the unrelated owner. Fresh catalog equality confirms those FK/guard definitions are unchanged. The present empty database's zero dangling-pointer count is a structural/integrity observation, not a fresh populated cascade test. D05's local acceptance condition remains satisfied without rerunning destructive setup or disabling guards.

### 6. Current target integrity and generated types

Container `e95ce873b90725032affcffc801147d39945beb988ac33461deedd91d59b94c6`, image `sha256:6058a6759ab9268cff8ee70641d61f1bd75953316281b76427cf5a6b4db2eafc`, sole named volume `supabase_db_mpia-phase2a01-implementation` (created `2026-10-16T14:23:02Z`) and Docker `desktop-linux` endpoint match the accepted target. SQL used `/var/run/postgresql`, database/user `postgres`, never a hosted URL. No new service or environment was created.

The complete pre/post catalog/data fingerprint is identical to TEST-CLOSURE-02:

`782cedb1204a5d331f47c9dbfc2ea0570e88fe0d0e77e221f130208a3b861437`

It covers original/foundation/location catalogs, public/Auth row digests, extension objects/library and SRID data. There are 12 public tables, 27 history columns, eight state columns and six history indexes. All checked fixture categories, Auth users and location history are zero; no invalid location/state index, dangling pointer or audit-owned session/transaction remains. This is an empty accepted application baseline, not evidence of preserving a live user population during this audit.

The fresh catalog matches the source capture used by the scoped type generator; source/destination hashes match generation evidence. Five type projects and the 44-contract parity file passed against the accepted baseline. This is catalog-driven Supabase-compatible output, not Supabase CLI output or hosted-project generation. Opaque geography and generated write exclusion are intentional. Trusted runtime authorization, CAS predicates and cryptographic hash correctness are not supplied by generated types or triggers.

## Residual risks and gates

| Risk | Severity / present disposition | Required closure |
| --- | --- | --- |
| Complete clean installation unverified | Medium qualification risk; nonblocking for A–C | Separately approved clean target, exact seven-migration chain and prerequisite provisioning; no reset of the accepted environment. |
| Incompatible extension / adversarial authority matrix incomplete | Medium deployment-qualification risk; current exact target checks passed | Negative platform tests and actual deployment role/schema/attachment/library preflight; do not weaken constraints to obtain a pass. |
| Raw service writes do not authenticate actors, require expected tokens or guarantee contiguous versions | High if exposed; dormant by accepted D06 design | Trusted authenticated server transaction, parameterization, owner/input/token rechecks, bounded locks, idempotency and COMMIT-before-success tests before runtime exposure. |
| Provider eligibility snapshot is not concurrent withdrawal serialization or legal storage permission | High if ingestion is enabled; no provider feature exists | Reviewed field-specific retention/attribution, revocation/purge and transfer privacy contracts; synthetic failure/late-response tests before provider use. |
| T15 and real handler/provider behavior unexecuted | Release gates, not failures of nonexistent runtime code | Safe synthetic frontend/API/Auth setup and eight T15 cases; forged/expired JWT, spoofed actor, CSRF as applicable and runtime ownership tests. Never use the production-configured frontend for synthetic tests. |
| Historical/unsigned evidence and local-only raw artifacts | Low-to-medium reproducibility limitation | Keep portable manifests and provenance; preserve redacted local logs/snapshots separately. Do not force-add `.local` environments or credentials. |
| Representative plan does not predict production/RLS performance | Low at dormant stage | Measure actual authorized queries, volume, distributions and joins when implemented. |
| Build/bundle not rerun in this audit | Low for this documentation/test-only audit; release gate | Retained successful build is hash-verified. Fresh build/bundle and combined-tree validation before release/integration. |

No unresolved issue above requires rewriting the accepted migrations or reopening financial logic to make this development checkpoint. If another target, new privilege path or runtime feature changes these assumptions, requalify that scope before use.

## Phase 2A-03 entry conditions

1. Obtain a separate owner instruction naming the interface/design scope. Keep this audit's branch/source identity and checkpoint inventory reviewable; no automatic checkpoint or phase advancement.
2. Keep Phase 1 saving and analysis independent. No new location row, provider call, status activation, financial edit or UI dependency may become mandatory for a Phase 1 save.
3. Define typed location/provider contracts, normalized error states, fixed serializer/fingerprint versions, explicit ABSENT/exact revision/current-ID tokens and immutable operation identity. Carry negative-zero, missing/invalid and safe-integer rules forward.
4. Specify a server-only single-connection transaction: authenticate first; lock parent then state; recheck actual owner and current property-input hash; reauthorize exact retries without repointing; append then revision-qualified publish; acknowledge only after COMMIT. If a privileged RPC replaces direct transactions, obtain the separate D06 interface/grant decision.
5. Define read applicability as confirmed pointed version **and** matching current input fingerprint. Address edits immediately withhold an old origin; financial-only edits do not invalidate it. A raw pointer is latest intent, not automatic analytical eligibility.
6. Keep provider selection/calls and confirmation workflow in their designated later scope. Before runtime exposure, add real handler security, provider failure/retention/replay/withdrawal controls and suitable synthetic integration tests. Synthetic actor values in TC01–TC14 are not JWT proof.
7. Carry clean-install/platform qualification and all eight T15 cases into the 2A-06/release gate. No production deployment readiness follows from permission to design/develop 2A-03.

## Exact development checkpoint recommendation

Recommend retaining every path in the inventory below, including historical failed/blocked evidence. The only deletions are the source sides of the two explicit document moves. The audit itself adds the three required deliverables and one focused test runner, and prepends current acceptance sections to two implementation documents. All other preexisting implementation/evidence bytes remain unchanged during this audit.

Do **not** include ignored `.phase2a01*`/`.phase2a02*` scratch directories, `.env` files, Docker volumes/configuration, dependency/build outputs or raw local database snapshots. Full old-run logs remain local and are identified by hashes; the final manifest includes portable fresh results/query plans. Existing raw evidence should be retained separately, not silently deleted. Historical installer/destructive audit scripts are included as provenance/test source, not instructions to rerun them on the installed target.

The following inventory is generated from the reviewed Git status; the new manifest carries exact hashes, relocation relationships and exclusions. Nothing in this recommendation stages or commits a file.

67 Git paths: 64 additions (including two move destinations), 1 modified tracked file and 2 deleted move sources. The two pairs represent relocations, not four independent content changes.

| Git action | Exact path | Recommendation |
| --- | --- | --- |
| DELETE_MOVE_SOURCE | `PHASE2A_01_GITHUB_SYNC_REPORT.md` | Include as part of paired move |
| DELETE_MOVE_SOURCE | `PHASE2A_01_GIT_CHECKPOINT_REPORT.md` | Include as part of paired move |
| MODIFY | `src/integrations/supabase/types.ts` | Include |
| ADD_MOVE_DESTINATION | `docs/PHASE2A_01_GITHUB_SYNC_REPORT.md` | Include as part of paired move |
| ADD_MOVE_DESTINATION | `docs/PHASE2A_01_GIT_CHECKPOINT_REPORT.md` | Include as part of paired move |
| ADD | `docs/PHASE2A_02_ARCHITECTURE_REVIEW.md` | Include |
| ADD | `docs/PHASE2A_02_DECISION_REGISTER.md` | Include |
| ADD | `docs/PHASE2A_02_FINAL_ACCEPTANCE_CHECKLIST.md` | Include |
| ADD | `docs/PHASE2A_02_FINAL_ACCEPTANCE_REPORT.md` | Include |
| ADD | `docs/PHASE2A_02_IMPLEMENTATION_CHECKLIST.md` | Include |
| ADD | `docs/PHASE2A_02_IMPLEMENTATION_READINESS.md` | Include |
| ADD | `docs/PHASE2A_02_IMPLEMENTATION_REPORT.md` | Include |
| ADD | `docs/PHASE2A_02_SCHEMA_PROPOSAL.md` | Include |
| ADD | `docs/PHASE2A_02_TEST_HARNESS_REPAIR_REPORT.md` | Include |
| ADD | `docs/PHASE2A_02_TRANSACTION_CLOSURE_01_REPORT.md` | Include |
| ADD | `docs/PHASE2A_02_TRANSACTION_CLOSURE_REPORT.md` | Include |
| ADD | `docs/phase2a01-quality-followup-results.json` | Include |
| ADD | `docs/phase2a02-commit-results.json` | Include |
| ADD | `docs/phase2a02-database-results.json` | Include |
| ADD | `docs/phase2a02-final-verification.json` | Include |
| ADD | `docs/phase2a02-fixture-comparison.json` | Include |
| ADD | `docs/phase2a02-foundation-regression-results.json` | Include |
| ADD | `docs/phase2a02-harness-safety-results.json` | Include |
| ADD | `docs/phase2a02-installation-results.json` | Include |
| ADD | `docs/phase2a02-postgis-installation.json` | Include |
| ADD | `docs/phase2a02-prerequisite-results.json` | Include |
| ADD | `docs/phase2a02-regression-results.json` | Include |
| ADD | `docs/phase2a02-schema-verification.json` | Include |
| ADD | `docs/phase2a02-test-closure-git-results.json` | Include |
| ADD | `docs/phase2a02-test-closure-regression-results.json` | Include |
| ADD | `docs/phase2a02-test-inventory.json` | Include |
| ADD | `docs/phase2a02-transaction-attempt-history.json` | Include |
| ADD | `docs/phase2a02-transaction-results-closure-01.json` | Include |
| ADD | `docs/phase2a02-transaction-results.json` | Include |
| ADD | `docs/phase2a02-type-generation.json` | Include |
| ADD | `docs/phase2a02-user-postgis-results.json` | Include |
| ADD | `docs/phase2a02-verification-manifest.json` | Include |
| ADD | `supabase/migrations/20261017000000_phase2a02_property_locations.sql` | Include |
| ADD | `tests/PHASE2A02_README.md` | Include |
| ADD | `tests/build-phase2a02-manifest.mjs` | Include |
| ADD | `tests/database-types/phase2a02.ts` | Include |
| ADD | `tests/database-types/tsconfig.phase2a02.json` | Include |
| ADD | `tests/generate-phase2a02-types.mjs` | Include |
| ADD | `tests/inspect-phase2a02-prerequisites.mjs` | Include |
| ADD | `tests/inspect-phase2a02-user-postgis.mjs` | Include |
| ADD | `tests/phase2a01-quality-followup.mjs` | Include |
| ADD | `tests/phase2a02-baseline-snapshot.mjs` | Include |
| ADD | `tests/phase2a02-catalog-query.mjs` | Include |
| ADD | `tests/phase2a02-command-contract.mjs` | Include |
| ADD | `tests/phase2a02-contention.mjs` | Include |
| ADD | `tests/phase2a02-contract.test.mjs` | Include |
| ADD | `tests/phase2a02-final-acceptance.mjs` | Include |
| ADD | `tests/phase2a02-harness-safety.test.mjs` | Include |
| ADD | `tests/phase2a02-local-target.mjs` | Include |
| ADD | `tests/phase2a02-location-cases.mjs` | Include |
| ADD | `tests/phase2a02-sql-helpers.mjs` | Include |
| ADD | `tests/phase2a02-transaction-qualification.mjs` | Include |
| ADD | `tests/phase2a02-transaction-runtime.mjs` | Include |
| ADD | `tests/phase2a02-transaction-writer.mjs` | Include |
| ADD | `tests/prepare-phase2a02-postgis.mjs` | Include |
| ADD | `tests/run-phase2a02-commit-cascades.mjs` | Include |
| ADD | `tests/run-phase2a02-database-audit.mjs` | Include |
| ADD | `tests/run-phase2a02-foundation-regression.mjs` | Include |
| ADD | `tests/run-phase2a02-installation.mjs` | Include |
| ADD | `tests/run-phase2a02-regressions.mjs` | Include |
| ADD | `tests/run-phase2a02-transactions.mjs` | Include |
| ADD | `tests/verify-phase2a02-schema.mjs` | Include |
