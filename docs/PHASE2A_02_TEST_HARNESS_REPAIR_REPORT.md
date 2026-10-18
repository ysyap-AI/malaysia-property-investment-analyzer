# Phase 2A-02 TEST-CLOSURE-02 harness repair report

18 October 2026, Asia/Kuala_Lumpur. **H01?H06 repaired; Stage C PASS; TC01?TC14 PASS; cleanup/preservation PASS.** Transaction closure GO; overall final acceptance BLOCKED by the existing gaps listed in the [closure report](PHASE2A_02_TRANSACTION_CLOSURE_REPORT.md).

## Test-only files modified or added

- [tests/run-phase2a02-transactions.mjs](../tests/run-phase2a02-transactions.mjs)
- [tests/phase2a02-local-target.mjs](../tests/phase2a02-local-target.mjs)
- [tests/phase2a02-contention.mjs](../tests/phase2a02-contention.mjs)
- [tests/phase2a02-transaction-runtime.mjs](../tests/phase2a02-transaction-runtime.mjs)
- [tests/phase2a02-transaction-writer.mjs](../tests/phase2a02-transaction-writer.mjs)
- [tests/phase2a02-transaction-qualification.mjs](../tests/phase2a02-transaction-qualification.mjs)
- [tests/phase2a02-catalog-query.mjs](../tests/phase2a02-catalog-query.mjs)
- [tests/phase2a02-harness-safety.test.mjs](../tests/phase2a02-harness-safety.test.mjs)
- [tests/PHASE2A02_README.md](../tests/PHASE2A02_README.md)

The catalog query is copied from the accepted read-only verifier; comparison preserves tuple/composite-key ordering while normalizing unordered top-level query collections. The writer remains a synthetic test utility and has no application imports. The contention helper reuses the repaired session implementation. Other historic database runners were not executed.

## Repair disposition

| Finding | Status | Implemented control |
| --- | --- | --- |
| H01 | PASS | Asynchronous Docker/psql execution, 20-second process deadlines, explicit PostgreSQL 12s statement / 10s lock / 15s idle-transaction limits; timeouts fail. Legacy synchronous helper also has a finite process deadline. |
| H02 | PASS | Exact random run/session application names; scoped cancellation then termination, bounded child exit, backend absence verification; blocked ROLLBACK escalates within 2.5s. No broad backend termination. |
| H03 | PASS | Acquisition, held winner, both writer outcomes and observation covered by one release/join lifetime; all writers and SQL calls tracked; cleanup/reporting in finally. |
| H04 | PASS | Pinned container/image/volume/socket, exact PostgreSQL/PostGIS, accepted baseline fingerprint, installed catalog/grants, exact enabled guard attachments and 12-table inventory, migration source hashes and zero existing fixture IDs checked before writes. |
| H05 | PASS | Targeted Auth cascade cleanup, explicit user/profile/property/history/state/financial counts, no owned backends or transactions, full before/after catalog and public/Auth data fingerprints, Git preservation and partial/failure reports. |
| H06 | PASS | Persisted version/pointer/revision/history and exact retry results asserted; full row/timestamp rollback checks for absent/existing state; fresh deferred-constraint COMMIT rejections with 23503 using only temporary tables. |

## Bounded lifecycle and source review

The active runner has no synchronous subprocess path. Docker/psql commands use asynchronous spawn with a 20s process deadline and SIGKILL of the exact child handle; a failed exit confirmation is reported with its PID. Interactive SQL handshakes are limited to 14s, against server limits of 12s statement, 10s lock and 15s idle transaction. Administrative cancellation/termination SQL uses 3s statement / 1.5s lock / 4s idle-transaction limits and a 5s process deadline. Normal ROLLBACK and child shutdown each have a 2.5s deadline.

Each backend receives an unpredictable run/session application_name before connecting. Cancellation and termination require that exact registered name plus postgres database/user, local socket and client-backend type, excluding the controller PID. Termination requests wait at most 1s server-side. Backend absence is queried independently of Docker process exit. No role-wide, database-wide or wildcard termination exists. Cancellation failure cannot silently pass termination/absence verification.

The coordinator places winner startup, PID acquisition, JSON/observation work and rival startup inside the same finally-covered lifetime. It releases every hold and joins every started writer, with bounded acquisition/hold/join paths and attached rejection handlers. Active one-shot SQL is tracked too. Session shutdown must be verified before fixture DELETE; if shutdown cannot be verified, cleanup mutations stop and the report identifies the failure. Results are checkpointed after each case and finalized even on qualification/test/cleanup failures.

Reviewed reachable SQL: pinned read-only identity/catalog/baseline inspection; fixed synthetic Auth/property/financial fixtures; service-role parent/state locks and append/CAS pointer publication; fixture-scoped address/owner/deletion scenarios; read-only blocking inspection; the two temporary COMMIT-fault tables; targeted Auth cascade cleanup; exact-name backend cancellation/termination; final catalog/data verification. No permanent DDL, trigger disabling, constraint weakening, extension change, RLS/grant relaxation, database reset or unrelated-row deletion is reachable.

## Stage C fault simulations

| Simulation | Status |
| --- | --- |
| S01 command timeout kills the owned process and explicitly fails | PASS |
| S02 query timeout cancels, terminates and verifies only the exact owned backend | PASS |
| S03 blocked ROLLBACK has a finite shutdown and explicit failure | PASS |
| S04 failure after acquisition before release always releases and joins winner | PASS |
| S05 blocking-observation failure joins both writers before returning | PASS |
| S06 PID acquisition failure is reported without a hanging acquisition promise | PASS |
| S07 missing lock handshake is bounded and the started writer is joined | PASS |
| S08 cleanup failure remains a harness failure in the written partial report | PASS |
| S09 unverified session shutdown stops fixture cleanup but still writes evidence | PASS |
| S10 actual local subprocess timeout leaves the event loop responsive | PASS |
| S11 termination failure cannot be mistaken for a clean session | PASS |

These exercise the production paths of the **test harness**, with fake process/session controls; S10 also launches a disposable local Node subprocess to prove the actual process deadline leaves the event loop responsive. No Docker or database commands run in Stage C. No real database timeout is claimed from these mocks. The runner refuses database execution if the passing safety evidence does not match current source hashes.

## Coverage and execution

Every TC01?TC14 case has its own exact PASS/FAIL/NOT EXECUTED disposition. Persisted versions, pointer, revision, history count and idempotent outcome are asserted, not inferred from successful COMMIT. Failure snapshots include timestamps. Fresh TC14 rejects COMMIT with 23503 through a temporary deferred FK for both absent and existing state; all permanent application guards remain active. The first successful run and the final tightened 14/14 run are independently attributable in the [attempt history](phase2a02-transaction-attempt-history.json).

[Final result JSON](phase2a02-transaction-results.json) contains target checks, all cases, actual race PIDs/locks, cleanup counts, catalog/data fingerprints and session proof. [Regression evidence](phase2a02-test-closure-regression-results.json) records 1,073 application passes, five serializer passes and five security passes with one explicit built-asset skip. No business-code failure occurred. Read-only preflight defects corrected during this task were compact-JSON baseline serialization and PostgreSQL zero-OID JSON typing; neither caused fixture writes. A sandbox Docker-access failure was resolved through the normal execution approval mechanism.

## Preservation and limitations

Both database snapshots have SHA-256 782cedb1204a5d331f47c9dbfc2ea0570e88fe0d0e77e221f130208a3b861437. All ten fixture categories are zero; no owned sessions or transactions remain. Accepted Phase 1, foundation, location and PostGIS catalogs/data are preserved. Exact Git/source hashes are recorded in [preservation evidence](phase2a02-test-closure-git-results.json). Application code, migrations, production configuration and preexisting work remain unchanged by this repair.

The archived [TEST-CLOSURE-01 report](PHASE2A_02_TRANSACTION_CLOSURE_01_REPORT.md) and [JSON](phase2a02-transaction-results-closure-01.json) remain byte-for-byte historical evidence. Overall final acceptance still requires the separately scoped checks in the closure report. This task stops without further implementation, a Git checkpoint, push or deployment.
