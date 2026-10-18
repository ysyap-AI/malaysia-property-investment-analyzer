# Phase 2A-02 TEST-CLOSURE-01 transaction closure report

18 October 2026, Asia/Kuala_Lumpur.

**Recommendation: BLOCKED.** The transaction/concurrency gap is not closed. Source review found that the runner cannot guarantee bounded database waits, session shutdown or cleanup on coordinator failure. The owner's explicit instruction, **"If the runner is unsafe or the target identity differs, STOP and report,"** applies. Execution stopped before any Docker or SQL command.

All 14 requested transaction cases are **NOT EXECUTED**: zero database assertions, zero fixture inserts and zero cleanup deletes. This is a test-harness safety finding, not an observed application-schema failure. The current request authorizes synthetic testing; the earlier approval rejection is historical and is not the reason for this stop. No execution approval was requested or rejected in this attempt.

## Scope and evidence

Read all nine authoritative references named in the request, including the complete transaction runner and previous transaction disposition. Reviewed the runner's imported target/session helpers, command serializer, fixture definitions, SQL literal/insert helpers and transitive SQL helper module. Read repository AGENTS.md and PROJECT_RULES.md. No web, browser, production Supabase, provider, Docker setup, extension installation, migration execution, Git commit/push/merge/rebase or deployment occurred.

Branch is **phase2-location-intelligence** and HEAD is **c9b6c4acc1879a2b84b89d3b39455f2489e4c56a**, both observed through Git and matching the request. The index had no staged changes. Existing uncommitted implementation files, generated types and report relocations were preserved.

The [machine-readable results](phase2a02-transaction-results.json) include one entry per requested case, source SHA-256 hashes and the earlier NOT_EXECUTED disposition. No historical database passes are counted as fresh executions here.

## Target qualification

The following expected identity matches the implementation report and the target helper's constants. **Current Docker/database identity was not verified** because the source safety stop occurred first; no mismatch was observed or inferred.

| Item | Expected identity / current disposition |
| --- | --- |
| Container name | supabase_db_mpia-phase2a01-implementation |
| Container ID | e95ce873b90725032affcffc801147d39945beb988ac33461deedd91d59b94c6 |
| Image ID | sha256:6058a6759ab9268cff8ee70641d61f1bd75953316281b76427cf5a6b4db2eafc |
| Named volume | supabase_db_mpia-phase2a01-implementation; created 2026-10-16T14:23:02Z |
| Sole data mount | /var/lib/postgresql/data |
| Connection | Docker desktop-linux at npipe:////./pipe/dockerDesktopLinuxEngine; explicit /var/run/postgresql socket; postgres database and user |
| PostgreSQL | Expected 17.11; NOT VERIFIED NOW |
| PostGIS | Expected 3.3.7 in extensions; NOT VERIFIED NOW |
| Phase 2A-01 / Phase 2A-02 installation | Historically reported installed; current catalog NOT VERIFIED |
| Unexpected schema/data drift | NOT VERIFIED; no comparison with the accepted database snapshot executed |
| Production connection | None opened. Reviewed runner uses pinned Docker/socket commands and does not read hosted URLs or .env configuration |

A source constant is not proof of the current target. The existing helper checks the exact container/image/volume/endpoint, but its server check accepts any 17.x version; the transaction runner checks only zero Auth users and existence of the history table beyond that identity check.

## Safety findings requiring the stop

| ID | Source evidence | Finding and consequence |
| --- | --- | --- |
| H01 | [target helper](../tests/phase2a02-local-target.mjs), lines 8–14 | Synchronous Docker/psql calls have no process timeout. A blocked SQL or Docker command can prevent both the coordinator deadline and cleanup from progressing. |
| H02 | [session helper](../tests/phase2a02-contention.mjs), lines 23 and 32 | The 20-second timer rejects only the JavaScript promise; it does not cancel the database query. close() queues ROLLBACK behind any pending statement and waits indefinitely for child exit. The harness sets no explicit server-side statement, lock or idle-transaction timeout. Existing server defaults were not inspected and cannot supply a verified bound. |
| H03 | [transaction runner](../tests/run-phase2a02-transactions.mjs), lines 100–123 | The acquisition promise has no rejection/deadline. The held winner starts before the release finally is entered: an error in the PID query or JSON parsing at lines 105–106 skips release. An observation failure inside the try releases the winner but skips joining both writers before outer cleanup. Auth cascade cleanup can then contend with active fixture transactions. |

These are source-established failure paths, not reproduced database hangs. The 15-second polling deadlines and 20-second handshake timer do not establish bounded backend cleanup.

No test code was changed. The request permits minimal corrections for ordinary execution defects, but separately requires a stop when the runner is unsafe. These findings fail that explicit pre-execution condition; no patched or alternate runner was launched.

## SQL review and additional coverage gaps

Reviewed every SQL path reachable from the transaction runner:

| SQL category | Scope |
| --- | --- |
| Target qualification | Read-only database/user/version/socket/Auth-count query and history-table existence check |
| Fixture creation | Two fixed synthetic Auth IDs and three fixed property IDs; acquisition_costs, operating_expenses and financing fixtures restricted to those properties |
| Writer | BEGIN and local service_role; parent/state row locks by fixture property ID; operation lookup; state/history INSERT; revision-qualified pointer UPDATE; COMMIT/ROLLBACK |
| Coordinator / snapshots | pg_stat_activity, pg_locks, pg_blocking_pids and read-only history/state snapshots |
| Stale-parent scenarios | Address change on propA; ownership change and deletion on propB, each constrained by its fixed fixture ID |
| Cleanup | Auth DELETE restricted to the two fixture user IDs, relying on cascades; final Auth count |

Fixture users are f3020000-0000-0000-0000-000000000001 and f3020000-0000-0000-0000-000000000002. Property IDs end in 000000000011, 000000000012 and 000000000013 under the same prefix. Emails use example.invalid. Generated history and operation IDs use randomUUID(). SQL literals escape single quotes.

The reachable runner does not issue database reset, DROP, TRUNCATE, migration DDL, trigger disabling, grant changes or Phase 1 schema modification. Other exported test builders contain DDL/negative-test SQL, but this runner does not call those builders; importing their strings does not execute them. Cleanup and stale-parent mutations are fixture-ID-scoped. This review does not certify preservation against unverified preexisting data or other concurrent writers.

Additional gaps are separate from the safety blockers:

- **H04 — prerequisite coverage:** no exact PostgreSQL 17.11/PostGIS 3.3.7/schema/migration verification or accepted-baseline comparison is performed by this transaction runner before mutations.
- **H05 — cleanup/evidence coverage:** final verification checks only total Auth count. It does not explicitly check fixture properties/history/state/financial children, preserved unrelated rows, catalog equality or PostGIS integrity. Result JSON is written only on complete success, so a failure can leave an older disposition file.
- **H06 — transaction coverage:** failure injection covers after history insertion and after pointer update, but there is no induced COMMIT failure. Initial/subsequent success labels do not explicitly assert persisted version numbers and pointer/revision values. Historical deferred-FK COMMIT tests remain separately attributable historical evidence; they were not rerun or substituted here.

No application constraint or security policy was weakened. No schema defect was established.

## Requested test outcomes

For every row below, SQLSTATE, row counts and observed blocking evidence are **not available**, represented as null in JSON. No unexecuted case is marked FAIL or PASS; only the source safety gate failed.

| ID / readiness mapping | Expected behavior | Actual observed behavior | Status |
| --- | --- | --- | --- |
| TC01 (L10) | First location without state: Commit version 1, create state and publish pointer atomically. | Not run; safety gate failed. | NOT EXECUTED |
| TC02 (L10) | Version numbering and current pointer: Successive accepted writes produce versions 1 and 2, matching pointers and one revision increment per publication. | Not run; safety gate failed. | NOT EXECUTED |
| TC03 (L10) | Explicit expected revision: Reject missing/invalid expected revision; accept explicit ABSENT only for absent state and exact token for existing state. | Not run; safety gate failed. | NOT EXECUTED |
| TC04 (L10) | Stale transaction: Reject stale revision/current-pointer command without appending history or changing state. | Not run; safety gate failed. | NOT EXECUTED |
| TC05 (L11) | Simultaneous first-location writers: Observe rival blocked before releasing winner; exactly one first publication and stale loser. | Not run; safety gate failed. | NOT EXECUTED |
| TC06 (L11) | Simultaneous pointer updates: Observe rival blocked before releasing winner; exactly one new publication and stale loser. | Not run; safety gate failed. | NOT EXECUTED |
| TC07 (L11) | Actual lock contention: Record both backend PIDs, pg_blocking_pids, Lock wait type and positive ungranted-lock count before release. | Not run; safety gate failed. | NOT EXECUTED |
| TC08 (L12) | Duplicate operation and idempotent retry: Exact retry returns original outcome without duplicate history, revision increment or repointing. | Not run; safety gate failed. | NOT EXECUTED |
| TC09 (L12) | Same operation with different payload: Reject changed payload under existing operation ID; preserve history and state. | Not run; safety gate failed. | NOT EXECUTED |
| TC10 (L10/L12) | Delayed geocoding result: Reject synthetic delayed command after input/revision/pointer changes; no provider calls. | Not run; safety gate failed. | NOT EXECUTED |
| TC11 (L14/L12) | Former owner or changed parent: Reject former-owner and deleted-parent commands; do not recreate parent or publish history. | Not run; safety gate failed. | NOT EXECUTED |
| TC12 (L20) | Failure after history insertion: Injected failure rolls back inserted history and any newly created state. | Not run; safety gate failed. | NOT EXECUTED |
| TC13 (L20) | Failure after pointer update: Injected failure rolls back history, pointer, revision and timestamps. | Not run; safety gate failed. | NOT EXECUTED |
| TC14 (L20) | Complete rollback including COMMIT failure: Observe actual COMMIT rejection with SQLSTATE and verify complete rollback; never acknowledge success before COMMIT. | Not run; safety gate failed. | NOT EXECUTED |

TC07 requires actual blocking backend IDs, Lock wait type and positive ungranted locks before winner release. The runner contains such checks on its normal path, but there is no new observed blocking evidence.

TC14 requires a safe failure-at-COMMIT scenario that preserves all installed guards and constraints under this task's restrictions. The existing runner has no such scenario; historical tests that temporarily disabled the pointer trigger must not be silently reused as authorization for this task.

## Cleanup and preservation

No database session was opened and no fixture was created by this attempt. Cleanup is therefore **not required for this attempt**, and no DELETE was issued. There are no remaining records attributable to this attempt; this is not a claim that the existing database contains no synthetic records.

Current absence of Auth users, synthetic properties, histories and state rows is **NOT VERIFIED**. Current Phase 1 data, foundation/location schema, accepted PostGIS integrity and absence of unintended changes since the implementation report are also **NOT VERIFIED**. The report's historical cleanup/preservation passes remain historical.

The test runner, helpers, both Phase 2 migration files, application sources and generated types were not edited. The only task edits are:

1. This closure report.
2. Updated phase2a02-transaction-results.json.
3. Updated PHASE2A_02_IMPLEMENTATION_CHECKLIST.md.

The historical verification manifest was not regenerated. Its recorded hash of the prior transaction-results JSON no longer describes this updated artifact; the manifest remains evidence of the earlier implementation run.

Offline validation passed: five existing serializer contract tests (node --test tests/phase2a02-contract.test.mjs), JSON validation of 14 unique NOT_EXECUTED cases, equality of all ten recorded source hashes, and git diff --check. These do not count as database transaction passes. The first inline JSON-validation command failed because PowerShell removed JavaScript string quotes; passing the same validation through stdin succeeded without any database access.

## Required work before execution can resume

Resolve the harness safety findings first: enforce bounded process/database/session lifetimes; ensure every coordinator path releases held writers and joins all started sessions before cleanup; give cleanup a bounded, verifiable outcome. Then re-review the executable SQL, verify the exact existing target and accepted schema/data baseline, and add the missing persisted-outcome and COMMIT-failure evidence without changing production constraints.

Only after those conditions are satisfied can the 14 cases and complete post-cleanup comparison establish closure. This attempt stops with **BLOCKED**, without a Git checkpoint or deployment.

