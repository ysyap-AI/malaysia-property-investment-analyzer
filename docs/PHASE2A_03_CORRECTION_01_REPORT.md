# MPIA — Phase 2A-03 CORRECTION-01 report

20 October 2026, Asia/Kuala_Lumpur. **GO for independent acceptance review of corrected dormant I05.** AUDIT-F01 is repaired; AUDIT-G01's directly related fake CAS coverage is strengthened. Owner acceptance remains pending. I06, activation, deployment and the Git checkpoint remain unauthorized and unexecuted.

## Baseline and exact inventory

Repository: `C:/Users/ysyap/AI Projects/malaysia-property-investment-analyzer`. Branch before/after: `phase2-location-intelligence`. HEAD before/after: `e000da794e44619f945597e83b004895e3854a71`. The initial index and tracked working tree had empty diffs. All index entries were captured and remain identical. **360 tracked + 36 nonignored untracked = 396 entry files**, all hashed before editing. No database, real Auth, external provider, remote Git query, dependency installation or deployment was used.

Read repository rules, Phase 1 freeze, Phase 2 plan, all five DESIGN-01 documents, both IMPLEMENT report/checklist/JSON sets, final acceptance report/checklist/JSON, actual connection ports, transaction code, fake and existing transaction/redaction tests. The explicit correction instruction authorizes these three source/test changes; historical proposal-only and stop labels remain unchanged.

Pre-edit historical reconciliation: IMPLEMENT-01's **366 preservation + 15 inventory hashes** match; IMPLEMENT-02's **382 preservation + 10 inventory hashes** match. Final-audit path/hash entries also match (**458 references**, including repetitions). JSON digests: IMPLEMENT-01 `61755965d8122c7421bb4bc857922c1ea639ab31a6978447bec352f07ec2edb5`; IMPLEMENT-02 `4de325490c286976893d70fea739e2b2100cc704b313ad6786e7732aac8a2ab5`; FINAL-AUDIT-01 `151fab9edabf913bcf7b5fed1139ef6c4db39860a17ad69031d96829c6f18439`. These historical files remain byte-identical.

Exact initial nonignored untracked inventory:

- `PHASE2A_02_GIT_CHECKPOINT_REPORT.md`
- `docs/PHASE2A_03_ARCHITECTURE_REVIEW.md`
- `docs/PHASE2A_03_DECISION_REGISTER.md`
- `docs/PHASE2A_03_FOUNDATION_FINAL_ACCEPTANCE_CHECKLIST.md`
- `docs/PHASE2A_03_FOUNDATION_FINAL_ACCEPTANCE_REPORT.md`
- `docs/PHASE2A_03_IMPLEMENTATION_READINESS.md`
- `docs/PHASE2A_03_IMPLEMENT_01_CHECKLIST.md`
- `docs/PHASE2A_03_IMPLEMENT_01_REPORT.md`
- `docs/PHASE2A_03_IMPLEMENT_02_CHECKLIST.md`
- `docs/PHASE2A_03_IMPLEMENT_02_REPORT.md`
- `docs/PHASE2A_03_INTERFACE_PROPOSAL.md`
- `docs/PHASE2A_03_TRANSACTION_DESIGN.md`
- `docs/phase2a03-foundation-final-verification.json`
- `docs/phase2a03-implement01-results.json`
- `docs/phase2a03-implement02-results.json`
- `src/lib/location/canonical.ts`
- `src/lib/location/contracts.ts`
- `src/lib/location/errors.ts`
- `src/lib/location/primitives.ts`
- `src/lib/location/providers.ts`
- `src/lib/location/read-eligibility.ts`
- `src/server/location/command-builder.server.ts`
- `src/server/location/diagnostics.server.ts`
- `src/server/location/ports.server.ts`
- `src/server/location/transaction.server.ts`
- `tests/database-types/phase2a03.ts`
- `tests/database-types/tsconfig.phase2a03-transaction.json`
- `tests/database-types/tsconfig.phase2a03.json`
- `tests/phase2a03/canonical.test.ts`
- `tests/phase2a03/contracts.test.ts`
- `tests/phase2a03/fixtures.ts`
- `tests/phase2a03/primitives.test.ts`
- `tests/phase2a03/read-eligibility.test.ts`
- `tests/phase2a03/redaction.test.ts`
- `tests/phase2a03/transaction-fake.ts`
- `tests/phase2a03/transaction.test.ts`

Final inventory is precisely these 36 paths plus the three correction artifacts listed below: **39 untracked, 399 total nonignored files**. Three already-untracked source/test files changed bytes; 393 other entry files remain identical. There are no deletions, unexpected additions or tracked/index changes. Ignored scratch/build output is excluded from this inventory.

## Root cause and ownership lifecycle

Before: a module-wide WeakSet marked active objects. The acquired reference was assigned before checking that set. B rejected an active alias before adding a reservation, but its unconditional finalizer discarded/quarantined that reference and deleted A's marker. The reference was mistakenly treated as lifecycle authority. The late-acquisition branch could likewise discard an active foreign object without checking ownership.

After: a module-wide `WeakMap<ReservedConnection, symbol>` maps each claim to a unique invocation token. Immediately after acquire resolves, one synchronous check-and-set claims the object before yielding. A foreign active alias throws before assigning this invocation's connection. Rollback, close and final removal require token equality; removal is conditional in finally. There is no await between checking and claiming. No port/SQL/schema change or pooling framework was needed.

The active claim stays until release/discard acknowledgement or the bounded cleanup failure path completes. Failed release falls back to owner-only discard. Discard quarantines synchronously before invoking asynchronous driver cleanup; that quarantine is permanent for that object even after exceptions/timeouts or delayed release completion. Previously quarantined, currently unowned objects may be claimed solely for disposal, never SQL, preserving the accepted acquire/discard rejection transcript. An acquire failure creates no claim.

Late acquisition first respects foreign ownership. An expired/aborted acquire returning an unowned object claims it only for bounded discard and conditionally removes its own token. That late-disposal reference is kept outside ordinary finalization, preventing concurrent double cleanup. A normally claimed reference is recorded inside the acquisition callback so cancellation before the outer await resumes still reaches owning cleanup. Delayed callbacks cannot delete another token. A bad pool returning an alias receives a controlled failure; it gains no ability to issue SQL, release, discard, quarantine or erase the active owner's marker.

Budgets stay 2s acquire, 5s statement, 8s transaction and 1s per cleanup operation. Rollback uses its independent cleanup signal; release failure may use a second bounded discard budget. No automatic retry was added. These are in-process protocol guarantees, not physical driver/pool eviction or server cancellation proof.

## Reproduce-first evidence and retained failures

The original embedded source/config were materialized/verified at `.phase2a03-final-audit.local/repro.test.ts` and `vitest.config.mts`. Existing identical scratch files were reused without overwriting them or their historical logs/results. Their raw SHA-256 values remain `41f47cef35a9df61f65cf1aa6177b10182b35b77107ffcd7b65c705784156ae4` and `54ad2f58d23bd47a20ab1b8cc8b4d1dfa23f41d5fdd666241017cd4613b72075`. New executions/results use `.phase2a03-correction01.local/` exclusively.

1. **baseline-repro, before any source edit:** original two probes unchanged; one pass / one fail, exit **1**. F01 assertion: expected `["acquire"]`, actual **`["acquire","discard"]`**, exact recorded failure reproduced. G01's observation of the then-broken fake passed.
2. **ownership-repaired-repro:** after the token repair, before strengthening fake CAS, both original probes passed unchanged; **2/0/0, exit 0**. F01 now observes `["acquire"]`.
3. **final-original-f01:** after final formatting and both corrections, unchanged original source/config filtered to AUDIT-F01; **1 pass / 0 fail / 1 filtered skip, exit 0**. No reproduction assertion was edited.
4. **final-original-probes:** both original probes rerun on final source; **1 pass / 1 fail, exit 1**, solely because historical G01 asserts the old bug (`rowCount` **1**). Corrected fake returns **0**. This is an intentionally obsolete observational assertion, retained as evidence, not an unresolved regression. The permanent G01 negative test asserts zero and passes. The historical JSON/report remain untouched.

The initial permanent expanded protocol run was **150/0/0**, exit 0; final run matches. No new permanent-test, type, build or security failure required an assertion change. One exploratory metadata read initially used Windows' default GBK decoding on UTF-8 audit JSON and failed with UnicodeDecodeError; it was rerun explicitly as UTF-8 before implementation. A first generic historical hash walker did not recognize map-shaped IMPLEMENT hashes; a separate explicit reconciliation checked all 366/15 and 382/10 entries before source editing. Both scratch receipts are retained; zero-check counts are not used as preservation evidence. During artifact generation a TAP tuple-index error stopped the local generator before writing deliverables; correcting the parser produced the complete records. An optional one-line original-test reconstruction command was rejected by PowerShell quoting; a literal Python validation script replaced it. These were tooling/inspection errors, not product-test failures, and no accepted assertions were changed to resolve them.

## Permanent regression tests

Exactly **20 added cases**, all in `tests/phase2a03/transaction.test.ts`. Existing assertions remain. Concurrency ordering uses explicit deferred barriers/promises; virtual time expires timeout budgets or drains asynchronous continuations, with no arbitrary sleeps.

| Case | Exact case name within CORRECTION-01 describe | Outcome |
| --- | --- | --- |
| 1 | AUDIT-F01: repeated alias rejection preserves A through confirmed COMMIT and clean reuse | PASS |
| 2 | ownership guard applies across separate core factories sharing a connection | PASS |
| 3 | two acquisitions resolving together claim the object atomically before any SQL | PASS |
| 4 | rollback acknowledgement precedes owning release and aliases cannot erase the claim | PASS |
| 5 | release acknowledgement keeps ownership until completion, then a new owner stays protected | PASS |
| 6 | owner COMMIT UNKNOWN retains distinct certainty after foreign alias rejection | PASS |
| 7 | owner COMMIT REJECTED retains distinct certainty after foreign alias rejection | PASS |
| 8 | owner COMMIT COMMITTED retains distinct certainty after foreign alias rejection | PASS |
| 9 | uncertain owner alone discards; failed discard=false never permits reuse | PASS |
| 10 | uncertain owner alone discards; failed discard=true never permits reuse | PASS |
| 11 | release exception falls back to owner-only discard; discard exception=false | PASS |
| 12 | release exception falls back to owner-only discard; discard exception=true | PASS |
| 13 | failed acquisition creates no ownership and cannot disturb an existing owner | PASS |
| 14 | late timeout acquisition of an active alias has no lifecycle authority | PASS |
| 15 | late cancel acquisition of an active alias has no lifecycle authority | PASS |
| 16 | late unowned acquisition claims only for discard and cannot be resurrected after discard failure | PASS |
| 17 | cancelled pending SQL remains quarantined during and after owner discard | PASS |
| 18 | timed-out release and its late completion cannot clear another active connection's ownership | PASS |
| 19 | concurrent independent connections complete and clean up independently | PASS |
| 20 | AUDIT-G01: fake CAS rejects wrong property binding without mutation, then accepts correct SQL order | PASS |

Requirement coverage: cases 1–3 protect A against repeated B aliases and simultaneous acquisition; 4–5 hold ownership across rollback/release acknowledgement and subsequent leases; 6–8 preserve UNKNOWN/REJECTED/COMMITTED certainty; 9–12 cover discard/release exceptions, quarantine and owner-only cleanup; 13 proves failed acquisition creates no ownership; 14–16 cover delayed/cancelled acquisitions, active aliases and failed late disposal; 17 covers pending-operation cancellation; 18 covers cleanup timeout/late completion and separate active ownership; 19 proves independent connections; 20 checks wrong-property CAS without mutation plus correct parameter order. Existing 110 transaction and 20 redaction cases, including idempotency/duplicates/CAS/rollback and delayed COMMIT acknowledgement, all retain their exact names/outcomes.

## AUDIT-G01 disposition and certainty regression

Only the fake's explicit CAS branch adds `state.property_id === parameters[0]`. Actual production SQL remains `SET current_location_version_id = $2 WHERE property_id = $1 AND state_revision = $3 AND current_location_version_id IS NOT DISTINCT FROM $4`. The new test uses `[wrongProperty, versionId, 0, null]`, requires zero rows and unchanged active snapshot, then `[propertyId, versionId, 0, null]` with one returned row, +1 revision and expected pointer. Rollback leaves persistent store unchanged. No production SQL/data model changed. This fake recognizes fixed statement text and models selected bindings; it does not execute PostgreSQL or enforce every SQL/database constraint.

| Completion | Result / certainty | Owning cleanup |
| --- | --- | --- |
| COMMITTED ack | COMMITTED / COMMITTED | Release; failed release/discard does not undo success |
| REJECTED ack | COMMIT_FAILED / NOT_COMMITTED | Await independent rollback acknowledgement, then release; uncertain cleanup discards |
| ROLLED_BACK ack | COMMIT_FAILED / NOT_COMMITTED | Already-clean release |
| UNKNOWN/throw/loss/cancel after dispatch | COMMIT_OUTCOME_UNKNOWN / UNKNOWN | Quarantine/discard, no rollback claim |
| Safe precommit failure | Original failure / NOT_COMMITTED | Acknowledged rollback before release, otherwise discard |

No success is returned before owning COMMIT confirmation. New alias-interleaving cases confirm these outcomes; all earlier certainty/cancellation/replay tests still pass.

## Full verification and exact case parity

Pass/fail/skip counts overlap. 150 protocol cases comprise **130 transaction + 20 redaction**; 20 are new transaction cases. All are within **1,472 application cases / 39 files**. I01–I04's 249 and frozen 53 are also subsets. Type/build rows count executions/projects, not test cases. Source security has its expected browser-root skip; rebuilt-browser security has no skips.

| Execution | Pass/fail/skip or outcome | Exit |
| --- | --- | --- |
| baseline-repro | 1/1/0 | 1 |
| ownership-repaired-repro | 2/0/0 | 0 |
| protocol-initial | 150/0/0 | 0 |
| final-original-f01 | 1/0/1 | 0 |
| final-original-probes | 1/1/0 | 1 |
| application | 1472/0/0 | 0 |
| legacy | 5/0/0 | 0 |
| security-source | 5/0/1 | 0 |
| type-phase1 | PASS | 0 |
| implement01 | 249/0/0 | 0 |
| type-foundation | PASS | 0 |
| protocol | 150/0/0 | 0 |
| type-location | PASS | 0 |
| frozen | 53/0/0 | 0 |
| type-pure | PASS | 0 |
| type-transaction | PASS | 0 |
| type-fixtures | PASS | 0 |
| type-app | PASS | 0 |
| build | PASS | 0 |
| security-built | 6/0/0 | 0 |
| formatting | PASS | 0 |
| boundary | PASS | 0 |

Exact `(file, full case name, status)` comparison against embedded FINAL-AUDIT-01 evidence: application **1,452 retained + 20 added**, protocol **130 retained + 20 added**, IMPLEMENT-01 **249 identical**, frozen **53 identical**; **zero removed or changed outcomes**. Retained IMPLEMENT-01 application evidence has all **1,322** cases unchanged, and IMPLEMENT-02 has all **1,452** unchanged. All five Phase 2A-02 serializer tests pass. Full application/security components were invoked directly through installed local binaries, equivalent to both package test components; `npm test` itself was not invoked.

Exact fresh commands (all start/end timestamps, output hashes and outcomes are in JSON):

- `node node_modules/vitest/vitest.mjs run --config .phase2a03-final-audit.local/vitest.config.mts --no-cache --reporter=json --outputFile=.phase2a03-correction01.local/baseline-repro.json`
- `node node_modules/vitest/vitest.mjs run --config .phase2a03-final-audit.local/vitest.config.mts --no-cache --reporter=json --outputFile=.phase2a03-correction01.local/ownership-repaired-repro.json`
- `node node_modules/vitest/vitest.mjs run tests/phase2a03/transaction.test.ts tests/phase2a03/redaction.test.ts --no-cache --reporter=json --outputFile=.phase2a03-correction01.local/protocol-initial.json`
- `node node_modules/vitest/vitest.mjs run --config .phase2a03-final-audit.local/vitest.config.mts --testNamePattern AUDIT-F01 --no-cache --reporter=json --outputFile=.phase2a03-correction01.local/final-original-f01.json`
- `node node_modules/vitest/vitest.mjs run --config .phase2a03-final-audit.local/vitest.config.mts --no-cache --reporter=json --outputFile=.phase2a03-correction01.local/final-original-probes.json`
- `node node_modules/vitest/vitest.mjs run --no-cache --reporter=json --outputFile=.phase2a03-correction01.local/application.json`
- `node --test --test-reporter=tap tests/phase2a02-contract.test.mjs`
- `node --test --test-reporter=tap tests/security.test.mjs`
- `node node_modules/typescript/bin/tsc -p tests/database-types/tsconfig.json`
- `node node_modules/vitest/vitest.mjs run tests/phase2a03/primitives.test.ts tests/phase2a03/contracts.test.ts tests/phase2a03/canonical.test.ts tests/phase2a03/read-eligibility.test.ts --no-cache --reporter=json --outputFile=.phase2a03-correction01.local/implement01.json`
- `node node_modules/typescript/bin/tsc -p tests/database-types/tsconfig.phase2a01.json`
- `node node_modules/vitest/vitest.mjs run tests/phase2a03/transaction.test.ts tests/phase2a03/redaction.test.ts --no-cache --reporter=json --outputFile=.phase2a03-correction01.local/protocol.json`
- `node node_modules/typescript/bin/tsc -p tests/database-types/tsconfig.phase2a02.json`
- `node node_modules/vitest/vitest.mjs run tests/phase1-property-fixtures.test.ts tests/phase1-property-fixtures-integration.test.ts --no-cache --reporter=json --outputFile=.phase2a03-correction01.local/frozen.json`
- `node node_modules/typescript/bin/tsc -p tests/database-types/tsconfig.phase2a03.json`
- `node node_modules/typescript/bin/tsc -p tests/database-types/tsconfig.phase2a03-transaction.json`
- `node node_modules/typescript/bin/tsc -p tests/fixtures/tsconfig.json`
- `node node_modules/typescript/bin/tsc --noEmit`
- `node node_modules/vite/bin/vite.js build`
- `node --test --test-reporter=tap tests/security.test.mjs` with `SECURITY_AUDIT_BROWSER_ROOT=.output/public`
- `node node_modules/prettier/bin/prettier.cjs --check src/server/location/transaction.server.ts tests/phase2a03/transaction.test.ts tests/phase2a03/transaction-fake.ts`
- `node .phase2a03-correction01.local/inspect.mjs`

Build uses unchanged production configuration and existing dependencies. Nonfatal existing warnings include redundant tsconfig-path plugin, >500 kB chunk, inlineDynamicImports/codeSplitting conflict and dependency use-client directives. Generated ignored worker/config output is a build result, not deployment. No package/lock/config changes or installs occurred.

AST audit: **132 source files**, **10 location modules**, **44 confined import/export edges**, no outside application consumers/dependencies and no selected network/eval/require/dynamic-import calls. **33 rebuilt browser JS files** have no seven selected core/SQL/serializer markers. Source credential suite: **5 pass / 1 expected skip**; rebuilt asset suite: **6 pass / 0 skip**. These bounded static tests do not prove exhaustive secret detection or actual authenticated/runtime security.

## Preservation and changed file hashes

All 22 protected Phase 1 engine/config/validation/analysis-hook paths and five original migrations have empty diffs against `v0.1-phase1`; seven migration digests and generated types match the accepted baseline. Both accepted Phase 2 migration hashes remain `33a36f5890ce75bc3d2a035482d828224fce28a4c585911539b4856e77875393` and `bebe96e843b5e8198fe6ec4e59d9091aea5bbec71a63e555e717cc645ca23e40`. Generated types remain `ffcbec32309a369926843a99ec2b1a65ad8cf0ee500b43eee982ec105ae55347`. All I01–I04 source/test/type hashes and five DESIGN-01 documents are identical. All prior acceptance/audit reports/manifests, serializer/provider contracts, auth/routes, migrations, source configs and ports remain unchanged.

| Intentionally modified existing file | Before SHA-256 | After SHA-256 |
| --- | --- | --- |
| `src/server/location/transaction.server.ts` | `8fab08beecd0fe29edc70dd2b2dacf84aa692fa60afbd6dd01ef4e6417a21ad7` | `e383293a75c4263697ffbe55fe032882b8f71b8a4dcc9db3d5031343c186ea65` |
| `tests/phase2a03/transaction-fake.ts` | `e2f989e77b7662ace3bd6bf1eb247f3b970c97fa21e4a53c1b1684ac493f86ad` | `f9997b3da4ba24c005d4ec85ae45a73bc7a901fff2a34c6c33b3d4a8b76da73a` |
| `tests/phase2a03/transaction.test.ts` | `6fb5fc3177412d94c26bf8c8bfde231214d6ad3c5054a5dc5044f9b9cf693c3c` | `b4a6e8b3a4f2723fbe49e5b399dc91c6abce21ff545186cd9c65bc519cbc52df` |

Created nonignored files only:

- `docs/PHASE2A_03_CORRECTION_01_REPORT.md`
- `docs/PHASE2A_03_CORRECTION_01_CHECKLIST.md`
- `docs/phase2a03-correction01-results.json`

The JSON embeds exact entry inventory, before/after hashes, complete current case sets, original portable reproduction/config and failures, accepted hash reconciliation, import evidence and before/after Git status. It hashes this report/checklist; its own raw digest is anchored in the ignored final-validation receipt, avoiding circular self-hashing. Ignored scratch logs/harness/build output are retained locally; no historical failure file was deleted or overwritten.

## Remaining gates and independent review

**GO for independent review/acceptance of corrected dormant I05 only.** AUDIT-F01's source-level defect and related G01 fake predicate gap are resolved within the three authorized files; no unresolved permanent regression remains. This recommendation does not override the historical FINAL-AUDIT-01 decision or independently grant a Git checkpoint.

**I06 and production remain NO-GO/unexecuted.** Real driver/backend affinity, PostgreSQL lock/CAS/deferred-COMMIT concurrency, physical cancellation/pool eviction, actual Auth/two-user/target identity, P05 credential authority, P06 runtime/host/packaging/TLS, row/command-tag/binary64/microsecond mapping and driver/server/APM logging remain unqualified. Provider rights/receipts/reconciliation/transport, clean install/platform/adversarial matrix, T15 interactive browser cases and release gates remain open. Rebuilt-browser tests are static asset security scans, not T15 browser interaction tests.

No database connection, new credential/driver/role/grant/function/migration/endpoint, I06 implementation, stage, commit, push, merge, rebase, reset, main change or deployment occurred. Everything stays local and uncommitted. **Stop for independent owner review.**
