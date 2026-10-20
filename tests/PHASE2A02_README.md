# Phase 2A-02 location foundation tests

18 October 2026. **PostGIS 3.3.7 and the location schema are installed and verified on the existing local MPIA target. Acceptance remains incomplete.**

All database runners pin the existing container, image, volume, Docker endpoint and explicit Unix socket through `phase2a02-local-target.mjs`. They do not accept hosted URLs. Do not substitute the older Phase 1 stack or production. Run database suites sequentially: their zero-user guards deliberately reject another suite's active fixtures.

## Completed database sequence

1. `inspect-phase2a02-prerequisites.mjs`: read-only original pre-installation catalog; retained historical result records PostGIS absence.
2. `prepare-phase2a02-postgis.mjs`: separately owner-approved installation of packaged 3.3.7 in `extensions` on the exact existing target. **Already executed; do not rerun.** Application migrations never install extensions.
3. `run-phase2a02-database-audit.mjs --rollback-schema`: 166 passing SQL assertions with all DDL/fixtures rolled back. Requires the former empty 11-table baseline; **do not rerun against the installed 12-table schema**.
4. `run-phase2a02-installation.mjs`: populated upgrade preservation, three injected migration rollback cases, then retained installation. **Already installed; do not rerun.**
5. `run-phase2a02-commit-cascades.mjs`: three actual bad-pointer COMMIT failures with exact SQLSTATE 23503 and rollback verification; property/Auth deletion with history/state and financial cascades; fixture cleanup.
6. `verify-phase2a02-schema.mjs`: read-only catalog, grants, generated fields, relationships, original baseline and zero-user/history verification. Passed after cascade cleanup.

The rollback inventory has 167 unique source labels. One FK assertion lives inside a rolled-back savepoint; the final result has exactly 166 labels. Isolating FK behavior temporarily disables only the new pointer guard, after flushing valid pending constraints; the FK remains enabled and rollback restores the guard. Commit tests likewise restore the guard through failed-transaction rollback. Any mandatory cascade failure stops affected work; never weaken constraints or change Phase 1 triggers to work around it.

## Repaired and executed transaction suite ? TEST-CLOSURE-02

Run the offline safety gate first, then the database suite sequentially:

```text
node --test tests/phase2a02-harness-safety.test.mjs tests/phase2a02-contract.test.mjs
node tests/run-phase2a02-transactions.mjs
```

The suite refuses execution unless Stage C passes and its source hashes match. It verifies the exact installed target, accepted baseline/catalog, enabled guards, privileges and fixture absence before writes. It uses bounded asynchronous Docker/PostgreSQL operations, exact-run session cancellation/termination, guaranteed held-writer release/join and targeted cleanup. No hosted URL is accepted.

**Latest result: 11 safety simulations and TC01?TC14 all PASS.** Both races recorded actual blocking PIDs, Lock waits and ungranted locks before release. TC14 uses only temporary deferred-FK tables to produce genuine COMMIT rejection and verifies complete location/state rollback; permanent guards remain enabled. Full post-cleanup data/catalog comparison passed, with zero fixture rows and owned sessions. Synthetic actor inputs do not prove JWT verification.

See [closure report](../docs/PHASE2A_02_TRANSACTION_CLOSURE_REPORT.md), [repair report](../docs/PHASE2A_02_TEST_HARNESS_REPAIR_REPORT.md), [results](../docs/phase2a02-transaction-results.json) and [historical unexecuted disposition](../docs/phase2a02-transaction-results-closure-01.json). The earlier rejection/source-safety stop remains historical evidence.

The separate foundation quality follow-up already passed nine uniqueness checks and two observed foundation races. It does not prove location concurrency. The unchanged foundation suite passed 2,340 assertion executions before installation; its 11-table assumptions mean it must not be rerun against the expanded schema. Historical test sources/assertions remain unchanged.

## Offline generation and regression

```text
node tests/generate-phase2a02-types.mjs
node tests/run-phase2a02-regressions.mjs
node tests/build-phase2a02-manifest.mjs
```

Generation uses the successful verified local catalog capture, not the Supabase CLI or an external database. It changes only the two approved table nodes, proves 44 old contracts unchanged, and refuses unrelated type edits. It requires passing rollback, installation, committed-cascade and catalog evidence. Generated geography is opaque on reads and excluded from writes. Types confer no permissions.

The regression runner executes 1,073 application cases, five TypeScript checks (including strict location contracts), five serializer contracts, the build and six source/fresh-bundle security checks. Manifest assembly checks exact historical migration hashes, protected engines, fixture outcome parity, evidence hashes and unchanged index/branch/HEAD.

`run-phase2a02-database-audit.mjs --prepare` only regenerates SQL/inventory offline; it does not execute SQL. Serializer/writer code is test-only and not imported by the application.

## Open acceptance coverage

A separately designated clean installation, complete incompatible-extension/role/guard-attachment fault coverage, and a representative GiST query plan remain outstanding. The synthetic transaction/concurrency gap is closed by TEST-CLOSURE-02. Future-handler security and T15 remain open. Do not launch the production-configured frontend against synthetic users, reset a volume, create another environment, or interpret evidence generation as a database test pass. See the implementation report for current suite-by-suite results and resolved harness failures.

