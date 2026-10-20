# MPIA — Phase 2A-03 IMPLEMENT-02 report

20 October 2026, Asia/Kuala_Lumpur. **GO for independent acceptance of dormant I05 only. Runtime activation/deployment: NO-GO.** I06 has not begun. All changes remain uncommitted.

## Baseline and preservation

Exact branch: `phase2-location-intelligence`. Exact HEAD: `e000da794e44619f945597e83b004895e3854a71`. Initial/final index and tracked diffs are empty. All **382 preexisting nonignored files** match their entry SHA-256 hashes, with no missing file. The 22 preexisting untracked files reconcile exactly with IMPLEMENT-01's expanded post-status. Its 366 preservation hashes, 15 inventory hashes and external final-validation receipt's JSON digest all match. Accepted result JSON SHA-256: `61755965d8122c7421bb4bc857922c1ea639ab31a6978447bec352f07ec2edb5`. No baseline drift was found.

Read AGENTS.md, PROJECT_RULES.md, Phase 1 freeze, approved Phase 2 plan, all five DESIGN-01 documents, IMPLEMENT-01 report/checklist/manifest and preservation receipts. Inspected actual 2A-02 migration, serializer/contract tests, synthetic writer, accepted transaction/rollback/replay/contention tests and new pure contracts/validators. The current user instruction authorizes I05 and supersedes historical proposal-only stop wording for this slice. No accepted source was changed to accommodate tests.

## Implementation and trust boundary

Four dormant server modules implement injected actor verification, server command construction, connection lifecycle/parameterized SQL, reviewed provider-field policy and sanitized diagnostics. There is no configured instance or application consumer. The facade accepts authentication evidence and server intent; it never accepts an actor as proof by cast or structural shape. Only the trusted verifier's output is snapshotted and validated. The separately injected constructor must derive actor confirmation and provenance from authorized server intent/receipts. The core revalidates and deeply freezes the command's nested value objects and actor before hashing/acquisition. No production verifier, receipt implementation or browser passthrough builder is supplied. The test verifier uses a controlled WeakMap of explicitly synthetic identities.

The accepted v1 serializer is imported unchanged. Operation identity remains `(property_id,operation_id)`; payload hash binds the original expected state, actor, seven-field input digest and all 17 semantic fields. A caller retry must retain that envelope. No automatic retry, fresh-ID retry, silent token rebase or historical reconciliation endpoint is implemented. Each invocation re-verifies the actor and repeats ownership/input checks.

Additional files are narrowly justified: `transaction-fake.ts` shares deterministic transcripts/fault injection between transaction and privacy tests; `tsconfig.phase2a03-transaction.json` independently strictly compiles new core/test code without editing the accepted pure-contract project.

## Transaction state machine and SQL sequence

1. Verify actor through the trusted port, construct/validate/freeze command, compute original canonical v1 operation hash. Acquire exactly one reserved connection.
2. Issue `BEGIN ISOLATION LEVEL READ COMMITTED`; fixed `SET LOCAL ROLE service_role`, `search_path = pg_catalog`, lock timeout 3s, statement timeout 5s, idle timeout 10s. No caller SQL identifiers/fragments. All data values use positional parameters.
3. Lock explicit property ID/owner/seven input columns `FOR UPDATE`. Missing property and ownership denial precede history reads. Hash the locked saved inputs in the accepted application serializer. Financial-only changes do not invalidate.
4. Lock existing state `FOR UPDATE OF s` after the parent lock. Validate pointer lineage using the same statement's correlated history check. The parent lock serializes absence; no gap lock is assumed. Read exact immutable operation after the state lock.
5. Duplicate: compare actor/hash, validate returned version/lineage, preserve state and history, prepare original version plus currently observed pointer/revision. Still await confirmed COMMIT. No version allocation, insert, revision increment or repoint.
6. New operation: enforce ABSENT versus EXACT revision and NULL/UUID pointer. For provider-derived fields, read exact eligible registry version with ordinary SELECT and require injected synchronous reviewed field-policy approval. No registry row-lock privilege or external I/O.
7. If needed insert state and require returned revision 0/NULL pointer. Read maximum version, bound version and revision at 9007199254740991, restrict INITIAL_INPUT to empty history, allocate a version UUID and append next version. Generated geography and created/confirmed timestamps are omitted from INSERT.
8. Validate one INSERT RETURNING row, identity/hash/actor, all payload fields, timestamps and expected version/UUID. Exact timestamp instants are compared at microsecond resolution; original lexical provider receipt stays in the frozen hash, never reconstructed from SQL rendering.
9. Update only current pointer with property+revision+`IS NOT DISTINCT FROM` pointer CAS. Require exactly one row and precisely +1 revision, correct pointer/property and valid returned times.
10. Result remains provisional until explicit COMMITTED acknowledgement. REJECTED and aborted-transaction ROLLED_BACK tags fail. Any throw, timeout/cancellation after COMMIT dispatch or UNKNOWN acknowledgement yields COMMIT_OUTCOME_UNKNOWN. Unknown clients are discarded without rollback claims.

Precommit failure attempts bounded rollback only when no statement is still uncertain, then releases only after acknowledged cleanup; otherwise quarantines/discards. Failed BEGIN is discarded. Acquisition timeout discards a late arriving connection. Module-wide WeakSets reject reuse of active/uncertain connection objects. Postcommit release/discard/logging failure never changes a committed result into a rollback claim. Real adapters must enforce physical ownership and synchronous pool quarantine; the fake proves only the core's requested lifecycle.

## Retry and COMMIT certainty matrix

| Condition | Certainty | Cleanup | Next action |
| --- | --- | --- | --- |
| Validation/Auth/ownership/input/expected/operation/provider rejection | NOT_COMMITTED | No reservation or acknowledged rollback/release; otherwise discard | Follow closed error advice; no automatic retry or new ID |
| 40001/40P01 before COMMIT with acknowledged rollback | NOT_COMMITTED | Release only after rollback acknowledgement | SAME_ID_AFTER_BACKOFF; no automatic retry |
| Pool/lock/statement/application timeout or cancellation before COMMIT | NOT_COMMITTED | No connection, rollback if safely idle, or quarantine/discard in-flight work | Stage-aware controlled failure; same frozen ID only, no automatic retry |
| Other statement/constraint or lifecycle error | NOT_COMMITTED | Rollback acknowledgement or discard | TRANSACTION_FAILED / INTEGRITY_FAILURE; no blind constraint retry |
| Explicit COMMIT REJECTED or ROLLED_BACK acknowledgement | NOT_COMMITTED | Bounded rollback for rejection; already-idle ROLLED_BACK can release | COMMIT_FAILED / DO_NOT_RETRY |
| COMMIT throw, UNKNOWN response, cancellation/deadline after dispatch | UNKNOWN | Quarantine/discard; never assert rollback | COMMIT_OUTCOME_UNKNOWN / RECONCILE_SAME_ID |
| Actual COMMITTED acknowledgement for created/duplicate result | COMMITTED | Release, or discard after release fault | COMMITTED CREATED/DUPLICATE; cleanup/logging cannot undo success |

No automatic retries occur. Same-ID replay after an unknown outcome can return CREATED or DUPLICATE, as fake-tested for both possible storage outcomes. A replay after changed input still returns INPUT_CHANGED; transfer/deletion can deny it. Historical result discovery after these changes remains a separate future authorized read. No original response revision is invented.

## Fake-driver evidence

**110 transaction tests and 20 diagnostics tests pass.** The fake records every statement, bound parameters and acquire/BEGIN/COMMIT/rollback/release/discard lifecycle on the one reserved object. Cases include absent versus inert state, exact pointer/revision, first/existing append, all four confirmation intents, duplicate after newer pin, same-ID payload/expected/actor conflict, synthetic transfer/two-user denial, parent deletion, all seven input edits, financial-only edit, original provider receipt, registry withdrawal/field-policy denial, both overflow limits and duplicate at ceiling.

Failures are injected at acquisition, BEGIN, every setup statement, parent/state/prior reads, state creation, max-version read, INSERT and CAS. Tests validate malformed affected-row counts/RETURNING values/lineage, known COMMIT rejection/ROLLBACK completion, unknown or thrown COMMIT response with applied/unapplied history, same-ID recovery, rollback/release/discard failures, late acquisition, cancellation, statement/cleanup/overall deadlines, quarantined client reuse and delayed COMMIT acknowledgement. There is no successful response while COMMIT is pending.

These are **not evidence of actual PostgreSQL concurrency, RLS, authenticated user security or deferred-FK COMMIT behavior**. Historical PostgreSQL results are retained and were not rerun or relabeled.

## Fresh regression and security verification

Pass/fail/skip counts below overlap: the 130 I05 cases and 249 IMPLEMENT-01 cases are subsets of 1,452 application cases. Frozen 53 are also included. Do not add these suite totals. Seven TypeScript projects include app, Phase 1/foundation/location/pure/transaction contracts and frozen fixtures. Full previous IMPLEMENT-01 application test-name/outcome parity is confirmed for all 1,322 cases, including 1,073 preexisting Phase 1 cases. Frozen 53 names/outcomes match retained IMPLEMENT-01 evidence exactly. Protected engine/config/hook and original five migration diffs against v0.1-phase1 are zero bytes.

| Check | Pass/fail/skip or outcome | Exit | Exact command after node |
| --- | --- | --- | --- |
| protocol | 130/0/0 | 0 | `node_modules/vitest/vitest.mjs run tests/phase2a03/transaction.test.ts tests/phase2a03/redaction.test.ts --no-cache --reporter=json --outputFile=.phase2a03-implement02.local/protocol.json` |
| implement01 | 249/0/0 | 0 | `node_modules/vitest/vitest.mjs run tests/phase2a03/primitives.test.ts tests/phase2a03/contracts.test.ts tests/phase2a03/canonical.test.ts tests/phase2a03/read-eligibility.test.ts --no-cache --reporter=json --outputFile=.phase2a03-implement02.local/implement01.json` |
| application | 1452/0/0 | 0 | `node_modules/vitest/vitest.mjs run --no-cache --reporter=json --outputFile=.phase2a03-implement02.local/application.json` |
| frozen | 53/0/0 | 0 | `node_modules/vitest/vitest.mjs run tests/phase1-property-fixtures.test.ts tests/phase1-property-fixtures-integration.test.ts --no-cache --reporter=json --outputFile=.phase2a03-implement02.local/frozen.json` |
| legacy | 5/0/0 | 0 | `--test tests/phase2a02-contract.test.mjs` |
| security-source | 5/0/1 | 0 | `--test tests/security.test.mjs` |
| type-app | PASS | 0 | `node_modules/typescript/bin/tsc --noEmit` |
| type-0 | PASS | 0 | `node_modules/typescript/bin/tsc -p tests/database-types/tsconfig.json` |
| type-1 | PASS | 0 | `node_modules/typescript/bin/tsc -p tests/database-types/tsconfig.phase2a01.json` |
| type-2 | PASS | 0 | `node_modules/typescript/bin/tsc -p tests/database-types/tsconfig.phase2a02.json` |
| type-3 | PASS | 0 | `node_modules/typescript/bin/tsc -p tests/database-types/tsconfig.phase2a03.json` |
| type-4 | PASS | 0 | `node_modules/typescript/bin/tsc -p tests/database-types/tsconfig.phase2a03-transaction.json` |
| type-fixtures | PASS | 0 | `node_modules/typescript/bin/tsc -p tests/fixtures/tsconfig.json` |
| build | PASS | 0 | `node_modules/vite/bin/vite.js build` |
| security-built | 6/0/0 | 0 | `--test tests/security.test.mjs` |

The full Vitest and security commands execute both package.json test components separately; `npm test` itself was not invoked. Source security initially has one expected browser skip because no browser root is requested; rebuilt scan uses freshly built `.output/public` and has six passes/zero skips. Final-source formatting passed for all eight new source/test/config files.

Earlier executions are preserved locally: initial new tests **114 pass/3 fail**, then **117 pass/0 fail**; expanded pre-final **129 pass/1 fail**, final **130 pass/0 fail**. Three initial failures were new-test assertion errors (spreading an asymmetric matcher and inspecting the transcript before awaiting completion). The expanded failure assumed cancellation inside a pending CAS could safely rollback; the core correctly discarded, and the test now specifically proves caller cancellation cannot cancel an independent already-started rollback. Strict compilation initially reported TS2367 on stage/certainty assignments made inside awaited callbacks; explicit snapshots of those runtime unions corrected the compiler control-flow issue. All final strict projects pass. No accepted test regressed. A local evidence parser initially assumed Node's TAP reporter and recorded zero counts for spec-reporter runs; this report/JSON use the retained raw logs' actual five legacy passes and source-security five passes/one skip. Original logs/execution records remain intact.

Build passed with existing nonfatal warnings: redundant tsconfig-path plugin, >500 kB chunk, inlineDynamicImports/codeSplitting conflict and dependency use-client directive semantics. Existing Cloudflare/Nitro configuration was unchanged; generated ignored build/worker output is not a deployment. Local existing dependencies were reused, some through the retained .security-audit.local installation.

## Sanitization and browser isolation

Diagnostics contain only validated random diagnostic UUID, closed stage/outcome/COMMIT certainty/cleanup enums and an allowlisted SQLSTATE. No user/property/operation IDs, hashes, address/coordinates, payloads, receipt/provider URLs/tokens, SQL parameters, DSNs, JWTs, raw database errors, details or nested causes/aggregates are emitted. Own-data SQLSTATE inspection skips getters/prototypes and safely handles throwing proxies. Unexpected SQLSTATEs are discarded; no message text drives stale/ownership/conflict classification. Synchronous/asynchronous sink failure is swallowed without a raw fallback and cannot change success or mask the primary failure. Driver/server/APM logs remain a later separate qualification.

AST review of **132 source files** found **25 import/export edges** in the four new modules, all confined to the accepted pure location modules and the core; no external driver, Supabase admin, network/eval/require/dynamic import, or incoming application dependency. **33 rebuilt browser JavaScript files** contain none of seven core/SQL/serializer markers. The existing rebuilt credential scan passes. These bounded source/marker checks prove current dormancy, not exhaustive secret detection or future runtime authorization.

## Inventory and SHA-256

**Created: 11 files. Modified preexisting files: none. Deleted: none.** Eight source/test/config files plus the three required outcome artifacts. Ignored local harness/logs and generated build outputs are retained separately, not staged/review-source additions.

| New source/test/config file | SHA-256 |
| --- | --- |
| `src/server/location/ports.server.ts` | `1bcfdcac19f3e5e95764f98d11a618f7b429775a4d81eb037aa40580db0e66bb` |
| `src/server/location/command-builder.server.ts` | `0a892b7a19f02f1ee9cc1ab675b5c452a1536f645290ffba289b21cad9c939be` |
| `src/server/location/transaction.server.ts` | `8fab08beecd0fe29edc70dd2b2dacf84aa692fa60afbd6dd01ef4e6417a21ad7` |
| `src/server/location/diagnostics.server.ts` | `1d750a3b5966ebbf5b50196442bd1cb65073b43d7a19f14223cea09f5a507959` |
| `tests/phase2a03/transaction-fake.ts` | `e2f989e77b7662ace3bd6bf1eb247f3b970c97fa21e4a53c1b1684ac493f86ad` |
| `tests/phase2a03/transaction.test.ts` | `6fb5fc3177412d94c26bf8c8bfde231214d6ad3c5054a5dc5044f9b9cf693c3c` |
| `tests/phase2a03/redaction.test.ts` | `42225b0ef9ddee07b114c4cc34b3c90edef0e1dd5dfc1259ffebb2c4038bc851` |
| `tests/database-types/tsconfig.phase2a03-transaction.json` | `fa29a160361d1236d64f081ebed5d6757ab8e1598730acceb4a3bd8f34e8b000` |

The [JSON manifest](phase2a03-implement02-results.json) inventories all 11 paths and hashes these eight files, this report and the checklist. Its own digest is recorded in `.phase2a03-implement02.local/final-validation.json` to avoid circular hashing. Complete entry hashes, pre/post status, commands/times/exit codes, final test-case outcomes, retry matrix and qualifications are included in JSON.

## Git status

Before (expanded nonignored paths):

```text
?? PHASE2A_02_GIT_CHECKPOINT_REPORT.md
?? docs/PHASE2A_03_ARCHITECTURE_REVIEW.md
?? docs/PHASE2A_03_DECISION_REGISTER.md
?? docs/PHASE2A_03_IMPLEMENTATION_READINESS.md
?? docs/PHASE2A_03_IMPLEMENT_01_CHECKLIST.md
?? docs/PHASE2A_03_IMPLEMENT_01_REPORT.md
?? docs/PHASE2A_03_INTERFACE_PROPOSAL.md
?? docs/PHASE2A_03_TRANSACTION_DESIGN.md
?? docs/phase2a03-implement01-results.json
?? src/lib/location/canonical.ts
?? src/lib/location/contracts.ts
?? src/lib/location/errors.ts
?? src/lib/location/primitives.ts
?? src/lib/location/providers.ts
?? src/lib/location/read-eligibility.ts
?? tests/database-types/phase2a03.ts
?? tests/database-types/tsconfig.phase2a03.json
?? tests/phase2a03/canonical.test.ts
?? tests/phase2a03/contracts.test.ts
?? tests/phase2a03/fixtures.ts
?? tests/phase2a03/primitives.test.ts
?? tests/phase2a03/read-eligibility.test.ts
```

After (same branch/HEAD; empty index and tracked diff):

```text
?? PHASE2A_02_GIT_CHECKPOINT_REPORT.md
?? docs/PHASE2A_03_ARCHITECTURE_REVIEW.md
?? docs/PHASE2A_03_DECISION_REGISTER.md
?? docs/PHASE2A_03_IMPLEMENTATION_READINESS.md
?? docs/PHASE2A_03_IMPLEMENT_01_CHECKLIST.md
?? docs/PHASE2A_03_IMPLEMENT_01_REPORT.md
?? docs/PHASE2A_03_IMPLEMENT_02_CHECKLIST.md
?? docs/PHASE2A_03_IMPLEMENT_02_REPORT.md
?? docs/PHASE2A_03_INTERFACE_PROPOSAL.md
?? docs/PHASE2A_03_TRANSACTION_DESIGN.md
?? docs/phase2a03-implement01-results.json
?? docs/phase2a03-implement02-results.json
?? src/lib/location/canonical.ts
?? src/lib/location/contracts.ts
?? src/lib/location/errors.ts
?? src/lib/location/primitives.ts
?? src/lib/location/providers.ts
?? src/lib/location/read-eligibility.ts
?? src/server/location/command-builder.server.ts
?? src/server/location/diagnostics.server.ts
?? src/server/location/ports.server.ts
?? src/server/location/transaction.server.ts
?? tests/database-types/phase2a03.ts
?? tests/database-types/tsconfig.phase2a03-transaction.json
?? tests/database-types/tsconfig.phase2a03.json
?? tests/phase2a03/canonical.test.ts
?? tests/phase2a03/contracts.test.ts
?? tests/phase2a03/fixtures.ts
?? tests/phase2a03/primitives.test.ts
?? tests/phase2a03/read-eligibility.test.ts
?? tests/phase2a03/redaction.test.ts
?? tests/phase2a03/transaction-fake.ts
?? tests/phase2a03/transaction.test.ts
```

## Unverified conditions and acceptance

- No real PostgreSQL or database access, driver, Auth integration, live provider, endpoint or deployment. Fake tests are protocol evidence only.
- Real locking/concurrency, RLS/grants, actual authenticated two-user security, deferred FK rejection and exact driver COMMIT/ROLLBACK tags remain unverified in I06.
- Adapter must prove parameter and binary64/microsecond mapping, target identity/TLS, bootstrap/SET authority, backend affinity and no pipelining/prepared-statement incompatibility.
- Timeouts are provisional. AbortSignal racing and WeakSet quarantine do not prove server-side cancellation/lock release, pool eviction, or process-loss cleanup. discard must synchronously quarantine before async close, including late acquisition/release.
- No automatic retry scheduler or reconciliation endpoint is supplied. Caller must preserve original command/actor/receipt/operation identity across calls. Re-verification occurs per invocation; new actor/expected tokens/payload produce conflict.
- A retry after current address/input changes, ownership transfer or parent deletion can be denied even after an unknown successful COMMIT. Separate historical reconciliation is deferred; absence after deletion proves no historical certainty.
- Provider registry snapshot plus synchronous injected reviewed-field policy is required for new ingestion; no policy implementation, receipt construction, live terms review, withdrawal serialization, revocation/purge or candidate persistence is included.
- Diagnostics use a closed validated projection and never expose raw errors; driver/server/APM logging configuration remains unqualified.
- Extensionless import/Deno packaging, exact runtime/driver qualification, clean installation/platform matrix and all eight inherited T15 browser cases remain deferred.
- Existing local dependencies were reused (some resolve through the retained .security-audit.local installation); no dependency install, package/lock or configuration edit occurred.

**GO for independent acceptance review of dormant I05; NO-GO for activation/deployment.** No new real-driver/Auth qualification was attempted and I06 has not begun. No database connection/operation, migration/schema execution, role/grant/function/RPC, password/service secret, real provider/Auth call, public endpoint, financial engine/type generation/configuration change, Git write action or deployment occurred. Git was used only for read-only status/diff/hash/baseline inspection. No stage, commit, push, merge, rebase or history rewrite. Stop here for independent review.
