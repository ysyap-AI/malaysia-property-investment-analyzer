# Phase 2A-02 TEST-CLOSURE-02 transaction closure report

18 October 2026, Asia/Kuala_Lumpur. Final run: 2026-10-18T09:56:10.734Z to 2026-10-18T09:56:53.109Z (UTC).

**Transaction closure: GO ? all 14 cases PASS, zero FAIL, zero NOT EXECUTED. Overall Phase 2A-02 final acceptance: BLOCKED by the separately recorded remaining gaps below.** H01?H06 are repaired. Fixture cleanup, session cleanup and complete pre/post preservation checks passed. No application-schema failure was observed.

## Historical evidence

The previous source-only stop remains intact in [TEST-CLOSURE-01 report](PHASE2A_02_TRANSACTION_CLOSURE_01_REPORT.md) and [original JSON](phase2a02-transaction-results-closure-01.json): all 14 were NOT_EXECUTED then. These new passes are fresh executions, not retrospective relabeling. [Earlier attempts during this repair](phase2a02-transaction-attempt-history.json) preserve sandbox denial, two test-comparison defects and the first complete passing execution. The final result is [transaction-results.json](phase2a02-transaction-results.json).

The sandbox denied Docker context-file access on the first attempt. Authorized elevated execution then reached read-only qualification. A raw-file versus compact-JSON baseline hash comparison stopped before writes; it was corrected to match the accepted installation code. After the first 14/14 pass, final review added explicit enabled-trigger and table-inventory checks. A numeric/string zero-OID comparison stopped that qualification before writes; the expected PostgreSQL JSON representation was corrected. Stage C was rerun after each source correction. The final tightened suite again passed 14/14. These were harness/qualification failures, not failed application transaction assertions. No approval rejection occurred in this repair task.

## Exact target qualification

| Item | Verified value |
| --- | --- |
| Container | supabase_db_mpia-phase2a01-implementation |
| Container ID | e95ce873b90725032affcffc801147d39945beb988ac33461deedd91d59b94c6 |
| Image | sha256:6058a6759ab9268cff8ee70641d61f1bd75953316281b76427cf5a6b4db2eafc |
| Sole named volume | supabase_db_mpia-phase2a01-implementation; created 2026-10-16T14:23:02Z; /var/lib/postgresql/data |
| Docker endpoint | npipe:////./pipe/dockerDesktopLinuxEngine |
| SQL connection | Explicit /var/run/postgresql Unix socket; postgres database/user; inet_server_addr() IS NULL |
| PostgreSQL / PostGIS | 17.11 / 3.3.7 in extensions |
| Accepted baseline SHA-256 | 9fab0a7352f241a5fe507a35f63e7bf1c6b2a83f31309d6ba877db634c9df17e |
| Phase 2A-01 migration SHA-256 | 33a36f5890ce75bc3d2a035482d828224fce28a4c585911539b4856e77875393 |
| Phase 2A-02 migration SHA-256 | bebe96e843b5e8198fe6ec4e59d9091aea5bbec71a63e555e717cc645ca23e40 |
| Catalog / privileges | Accepted Phase 1/foundation snapshot and accepted installed location catalog match; 12 public tables; all three state/history guards enabled at their exact attachments; effective grants/roles/RLS unchanged |
| Fixture collision check | All ten explicitly checked categories zero before writes; accepted Auth-user baseline zero |

Installed migration identity is demonstrated by accepted source hashes plus live catalog comparison, not an assumed migration-ledger entry. No hosted URL or environment configuration is read by this runner.

## H01?H06 repairs

| Finding | Status | Repair |
| --- | --- | --- |
| H01 | PASS | Asynchronous Docker/psql execution, 20-second process deadlines, explicit PostgreSQL 12s statement / 10s lock / 15s idle-transaction limits; timeouts fail. Legacy synchronous helper also has a finite process deadline. |
| H02 | PASS | Exact random run/session application names; scoped cancellation then termination, bounded child exit, backend absence verification; blocked ROLLBACK escalates within 2.5s. No broad backend termination. |
| H03 | PASS | Acquisition, held winner, both writer outcomes and observation covered by one release/join lifetime; all writers and SQL calls tracked; cleanup/reporting in finally. |
| H04 | PASS | Pinned container/image/volume/socket, exact PostgreSQL/PostGIS, accepted baseline fingerprint, installed catalog/grants, exact enabled guard attachments and 12-table inventory, migration source hashes and zero existing fixture IDs checked before writes. |
| H05 | PASS | Targeted Auth cascade cleanup, explicit user/profile/property/history/state/financial counts, no owned backends or transactions, full before/after catalog and public/Auth data fingerprints, Git preservation and partial/failure reports. |
| H06 | PASS | Persisted version/pointer/revision/history and exact retry results asserted; full row/timestamp rollback checks for absent/existing state; fresh deferred-constraint COMMIT rejections with 23503 using only temporary tables. |

See the [repair report](PHASE2A_02_TEST_HARNESS_REPAIR_REPORT.md) for files, deadlines and fault simulations.

## TC01?TC14 outcomes

| ID | Case | Final status |
| --- | --- | --- |
| TC01 | First location without state | **PASS** |
| TC02 | Version numbering and current pointer | **PASS** |
| TC03 | Explicit expected revision | **PASS** |
| TC04 | Stale transaction | **PASS** |
| TC05 | Simultaneous first-location writers | **PASS** |
| TC06 | Simultaneous pointer updates | **PASS** |
| TC07 | Actual lock contention | **PASS** |
| TC08 | Duplicate operation and idempotent retry | **PASS** |
| TC09 | Same operation with different payload | **PASS** |
| TC10 | Delayed geocoding result | **PASS** |
| TC11 | Former owner or changed parent | **PASS** |
| TC12 | Failure after history insertion | **PASS** |
| TC13 | Failure after pointer update | **PASS** |
| TC14 | Complete rollback including COMMIT failure | **PASS** |

TC01 persisted version 1 / revision 1 / one history row and the returned current pointer. TC02 persisted versions 1?2 / revision 2 / two rows and the second pointer. TC08 returned the original version-1 ID without moving the version-2 pointer or changing state/history. Each stale/error case checked complete history/state snapshots, including timestamps. TC12?TC14 each exercised both absent state and existing state.

TC14 produced two fresh actual COMMIT rejections with SQLSTATE **23503**, naming **tc02_deferred_fk**. Each session created a temporary parent and a temporary child with an INITIALLY DEFERRED FK; an orphan INSERT succeeded, then COMMIT failed after the location append and pointer update. The whole transaction rolled back. Temporary tables were transaction-scoped with ON COMMIT DROP. Every permanent constraint, guard and RLS policy remained enabled. This proves writer behavior on genuine deferred COMMIT rejection; the earlier permanent pointer-FK negative tests remain separate historical evidence.

## Observed contention before winner release

| Case | Winner PID | Rival PID | pg_blocking_pids(rival) | Wait type | Ungranted locks | Observation (UTC) |
| --- | --- | --- | --- | --- | --- | --- |
| TC05 | 5698 | 5705 | 5698 | Lock | 1 | 2026-10-18T09:56:42.766432+00:00 |
| TC06 | 5755 | 5762 | 5755 | Lock | 1 | 2026-10-18T09:56:43.943024+00:00 |

Both losers rejected the stale expected revision after winner release. TC05 persisted exactly version 1/revision 1/one row; TC06 exactly versions 1?3/revision 3/three rows. Poll delays were only scheduling aids; actual PostgreSQL blocking evidence was required. TC07 verifies both observations.

## Cleanup and preservation

Auth cleanup targeted only f3020000-0000-0000-0000-000000000001 and f3020000-0000-0000-0000-000000000002 after writers joined. Fixture properties end in 000000000011, 000000000012 and 000000000013 under the same prefix. Post-cleanup counts were zero for Auth users, profiles, properties, history, state, acquisition costs, operating expenses, financing, investment criteria and scenario configurations. No test-owned session or transaction remained; no broad termination or database reset was used.

All public/Auth table row counts and content digests match the pre-test snapshot. Phase 1 objects/constraints, foundation and location objects, grants/RLS/functions/triggers, PostGIS extension metadata/members/types/operators/functions/library and spatial_ref_sys fingerprint are unchanged. The accepted baseline was empty of application users/properties; preservation does not claim a populated unrelated-user exercise.

Pre-test and post-test combined SHA-256: **782cedb1204a5d331f47c9dbfc2ea0570e88fe0d0e77e221f130208a3b861437** (identical). Full local snapshots are retained in ignored .phase2a02-implementation.local/test-closure-02-pretest.json and test-closure-02-posttest.json; portable fingerprints/counts are in the result JSON.

HEAD remains c9b6c4acc1879a2b84b89d3b39455f2489e4c56a on phase2-location-intelligence with unchanged index. Existing generated-type changes and report relocations were preserved. [Git/source preservation evidence](phase2a02-test-closure-git-results.json) compares all preexisting file hashes. No production configuration, application migration, business/financial code, provider, frontend, extension installation, Git history or deployment was changed.

## Validation and remaining acceptance gaps

[Safety simulations](phase2a02-harness-safety-results.json): 11/11 PASS. Existing serializer contracts: 5/5 PASS. [Regression checks](phase2a02-test-closure-regression-results.json): 1,073 application tests PASS; security 5 PASS, 1 built-asset check SKIPPED because no fresh build was produced in this test-only task. Git whitespace checks passed.

Overall final acceptance remains **BLOCKED** for the existing separately designated clean-installation exercise, full incompatible-extension/role/guard-attachment fault qualification, representative GiST plan, and future-handler authentication/T15 browser coverage. Positive attachment checks here do not close the full adversarial matrix. Synthetic actor inputs are not real JWT authentication. No further implementation or Git checkpoint is started.

The historical verification manifest was intentionally not regenerated; its old hashes describe the earlier run. New safety source hashes and Git preservation evidence identify this repair. Recommendation for this transaction closure is **GO**; this does not grant overall Phase 2A-02 acceptance or authorize later work.
