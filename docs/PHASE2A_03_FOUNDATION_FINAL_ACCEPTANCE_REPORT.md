# MPIA — Phase 2A-03 FINAL-AUDIT-01

20 October 2026, Asia/Kuala_Lumpur. Independent consolidated I01–I05 source, security and transaction-contract audit. **The unchanged standard suites pass, but a new failing audit reproduction prevents blanket I01–I05 acceptance and the proposed accepted-foundation Git checkpoint.** No accepted source or test was changed.

| Boundary | Decision | Evidence and condition |
| --- | --- | --- |
| A. Entire dormant I01–I05 local-development foundation | **NO-GO for consolidated acceptance** | I01–I04 remain GO within their dormant scope. AUDIT-F01 exposes unsafe cleanup in I05's active-reservation rejection path. Correct and independently re-audit that path before claiming complete I05 acceptance. Existing dormant files can remain locally for review. |
| B. Controlled development Git checkpoint of the accepted foundation | **NO-GO at the audited bytes** | Inventory, ancestry, preservation and secret/import checks pass. The candidate inventory is exact, but F01 blocks recommending it as an accepted foundation checkpoint. A separately authorized checkpoint explicitly recording known defects would be a different owner decision. No staging or Git write is performed. |
| C. I06 architecture and runtime qualification | **NO-GO to execute/activate I06** | The design direction remains reviewable. F01, P05 credential authority, P06 Auth/database target identity, exact driver/host/packaging and real pool/result-mapping qualification remain open. This audit selects no credential or driver. |
| D. Production deployment | **NO-GO** | No real Auth/runtime/PostgreSQL integration proof; provider/transport, clean-install/platform, T15 and operational/release gates remain open. |

## Baseline and preservation

Branch before/after: `phase2-location-intelligence`. Exact HEAD: `e000da794e44619f945597e83b004895e3854a71`; parent `c9b6c4acc1879a2b84b89d3b39455f2489e4c56a`. Fresh read-only GitHub query confirms feature HEAD equals local HEAD and GitHub main is separately `4f587b8a7668df04fbfac52e8f1fb31886ae791f`. Local main remains `72c2b8748d6468747b9784597b8f596e030b0dfb`, also the merge base of HEAD and recorded origin/main. No ref was updated. The first sandbox remote query could not connect; the approved read-only elevated query succeeded. No fetch or push occurred.

Initial index and tracked diff are empty, with **33 nonignored untracked files**. All **393 entry nonignored files** retain their raw SHA-256 bytes after checks; zero changed/missing. IMPLEMENT-01's 366 preexisting hashes plus its 15 non-self inventory hashes match; its JSON digest matches the accepted external reference. IMPLEMENT-02's 382 preexisting hashes plus ten non-self inventory hashes match. Its unchanged JSON is separately hashed here. The previous 2A-02 manifest's 67 path actions reconcile to 65 surviving checkpoint files and two historical move-source deletions, with no drift. Existing evidence is retained without relabeling historical database results as new executions.

All seven migration working-file digests match accepted checkpoint references. The original five additionally have empty Git diffs against `v0.1-phase1`. The two Phase 2 migrations and generated Supabase types have empty diffs against HEAD and unchanged accepted hashes. All 22 protected engine/configuration/validation/analysis-hook paths match their baseline; Git diffs against `v0.1-phase1` are empty. The JSON records every migration/protected-file digest and all 393 entry hashes.

The original seven application tables (`profiles`, `properties`, `acquisition_costs`, `operating_expenses`, `financing`, `investment_criteria`, `scenario_configs`) and accepted Phase 2 schema are preserved **as source contracts**. No database was contacted, so this is not fresh live-catalog or data certification. The unchanged browser property APIs, analysis hook, routes, Auth clients and configuration have no incoming dependency on the new location modules. Saving and financial/scenario/scoring/confidence/risk/recommendation behavior remain independent.

## Files and architecture reviewed

Read AGENTS.md, PROJECT_RULES.md, the Phase 1 freeze, Phase 2 plan, Phase 2A-02 final acceptance/checklist/JSON and root Git checkpoint report; all five DESIGN-01 documents and both IMPLEMENT report/checklist/JSON sets. Inspected all ten new runtime-source modules, all eight test/helper files and all three type-fixture/config paths in the exact candidate inventory below. Reviewed actual foundation/location migrations, accepted legacy serializer/tests and writer, frozen fixtures, existing security/build/test configuration, and the application import graph. The JSON carries the reviewed-path inventory and source digests. Hash comparison of a file is distinguished from manual review of every line of historical evidence.

DESIGN-01's proposal-only labels remain historical, as requested. Current user instructions establish the accepted development scope, without approving I06 or release. Two deliberate implementation qualifications remain explicit: the original interface prose recommends normalizing negative zero whereas implementation preserves it (both encode to JSON `0`); P07 proposes up to two automatic retries whereas the dormant implementation performs none. These are disclosed in IMPLEMENT evidence, preserve v1 bytes, and confer no retry scheduler/runtime approval. No architecture document was silently rewritten to remove the discrepancy.

## New blocker AUDIT-F01 — cleanup operates on a reservation this invocation never owned

**Severity: medium in this dormant source; potentially high operational impact if a faulty adapter/pool is activated. Blocker for unqualified consolidated I05 acceptance/checkpoint.** Trigger requires the connection port to return the same object while an earlier invocation still owns it; this violates the pool's intended exclusive-reservation contract. It is not a demonstrated browser exploit, working real adapter failure, or PostgreSQL data-corruption result.

Exact source: `src/server/location/transaction.server.ts:323` rejects `reserved.has(connection)`, before this invocation executes `reserved.add`. The catch reaches unconditional final cleanup at lines 513–515. Because the rejected invocation's `clean` is false, it calls `close(connection, true)`, quarantines/discards the first invocation's active connection and deletes that first invocation's reservation marker. Thus the advertised active-client guard rejects reuse while still performing unsafe lifecycle operations on the other borrower.

Reproduction uses unchanged accepted source and test helper, with an isolated ignored Vitest configuration. Pause invocation A in its COMMIT hook, await that hook, invoke B using the same synthetic connection, record B's transcript, then unblock and await A. Expected B transcript: `["acquire"]`; actual: `["acquire","discard"]`. B returns controlled `TRANSACTION_FAILED`, but discards A's client. Audit regression assertion fails with exit **1**. Accepted tests cover previously quarantined-client reuse, but not this simultaneous active reservation case.

Portable reproduction/config source, full failure message, result counts and source hashes are embedded in `phase2a03-foundation-final-verification.json` under `auditReproduction`. Retained local command:

```text
node node_modules/vitest/vitest.mjs run --config .phase2a03-final-audit.local/vitest.config.mts --no-cache --reporter=json --outputFile=.phase2a03-final-audit.local/repro.json
```

Recommended separately authorized correction: track invocation ownership of a successful reservation claim; do not discard/release or remove the reservation owned by another invocation when rejecting its alias. Specify pool quarantine/lease ownership together, including late acquisition and release handoff, so the owner handles its own uncertainty. Add a concurrent active-object rejection regression and qualify actual physical pool eviction/cancellation later. **No correction was applied.** The fake may report a later COMMITTED acknowledgement even after discard erased its active snapshot; that permissiveness is not evidence that a real database acknowledged a vanished commit. Only the observable cross-invocation discard establishes F01.

## SQL and transaction-contract assessment

| Requirement | Current-source finding |
| --- | --- |
| Trusted actor, pre-persistence validation/freeze | `buildFrozenOperation` uses only the injected verifier result, snapshots actor, revalidates command, freezes nested tokens/payload/fingerprint, computes hash before acquisition. Ports are trusted injection points; there is no real verifier or production intent/receipt builder. A browser actor field cannot directly select the core actor. |
| Connection/BEGIN/local setup | One reserved object per attempt; explicit READ COMMITTED, fixed local role/search path/lock/statement/idle limits before locks. No pool.query/REST transaction substitution. Physical backend affinity remains unverified. F01 qualifies active reuse rejection. |
| Lock and authorization order | Parent FOR UPDATE precedes state FOR UPDATE OF s; actual owner and current seven-field input hash precede operation lookup. Explicit missing/ownership/input failures. Parent lock serializes absent-state creation for compliant writers. |
| Expectations and duplicate | ABSENT is distinct from EXACT revision zero/NULL pointer. Replay compares operation hash and actor, validates prior row and same-property current-pointer lineage, then COMMITs without INSERT/CAS/version allocation/restamp. Changed current input/owner still denies replay. No original state revision is invented. |
| Version and INSERT mapping | MAX(version_number) under the parent lock, bounded safe-integer increment and state-revision capacity. INITIAL_INPUT only at empty history. Explicit 24 columns = seven identity/actor fields + 17 semantics, parameters $1–$24 in matching order. Generated geography, created_at and confirmed_at are excluded; the actual migration's trigger stamps audit times. |
| CAS | Exact property ID + locked revision + `IS NOT DISTINCT FROM` locked pointer; updates only new pointer. Migration's state guard advances revision; pointer guard checks newest same-property history and deferred composite FK remains intact. Exactly one returned row, +1 revision and expected pointer/property are required. |
| Result validation | Row count must be safe nonnegative integer equal to returned rows and within cardinality bound. UUID/hash/actor/input/version/semantic fields and timestamps are validated; INSERT ID/version must equal allocated values. Receipt compares equal instants at microsecond resolution while original lexical bytes remain in operation hash. State timestamps are validated for shape, not comprehensive historical continuity. SQL constraints/guards and future mapper qualification remain necessary. |
| COMMIT certainty | Success only on explicit COMMITTED ack; REJECTED and ROLLED_BACK yield COMMIT_FAILED. Throw, timeout, abort after dispatch or unknown ack gives UNKNOWN and same-ID reconciliation; no rollback claim. No automatic retries. |
| Cleanup/cancellation | Precommit failures attempt bounded independently signaled rollback only when safely idle; uncertain statements/BEGIN/COMMIT and late acquisitions request discard. Known committed results survive release/logging faults. WeakSets do not prove physical eviction. F01 is the failed active-ownership case. |
| Diagnostics | Fresh closed projection: random diagnostic UUID, allowlisted stage/outcome/certainty/cleanup/SQLSTATE only. No raw errors, nested causes, addresses, credentials, request payloads, identifiers, hashes, SQL parameters or provider URLs; sync/async sink errors are swallowed. Real driver/server/APM logging remains unqualified. |

**AUDIT-G01 (test limitation):** `transaction-fake.ts` identifies operations by comparing input SQL to `transactionSql` imported from the production module, then manually simulates behavior. It does not parse SQL, infer parameter types, enforce all WHERE/ACL/FK/trigger semantics or model PostgreSQL command tags. A separate passing probe starts the fake with state for property A, invokes the real CAS SQL with a different property ID and matching revision/NULL pointer, and observes rowCount 1. Real SQL's property predicate should not match that state. The actual production CAS text includes the correct predicate; this probe exposes fake coverage weakness, not a defect in that SQL. The new probe is not added to accepted source tests.

**AUDIT-G02 (I06 mapping gate):** `rows()` requires BEGIN/SET results with `rows:[]` and numeric rowCount 0. A raw driver's absent/null affected-row count is not automatically this contract. The future adapter must explicitly normalize command-only results, preserve binary64 values, decode bigint safely, render UTC timestamps without losing microseconds, and distinguish COMMIT/ROLLBACK completion tags and genuine rejection from ambiguous transport failure. Do not infer compatibility from a type assertion or from this fake. PostgreSQL exposes command status separately from affected tuples, with no tuple count for commands outside its counted set ([PostgreSQL 17 command-result documentation](https://www.postgresql.org/docs/17/libpq-exec.html)). No driver was selected, installed or exercised.

## Interface and serializer verification

Fixed compact JSON arrays, exact version markers/order, UTF-8 SHA-256 and lower-case digests match the unchanged Phase 2A-02 serializer and independent Node crypto vectors. Property fingerprint is exactly project_name/full_address/city/district/state/postcode/country; operation preimage includes actor, expected revision/pointer, property input digest, operation kind and the original 17 semantic fields. Operation ID remains outside semantic hash and inside `(property_id,operation_id)` identity. Generated row fields never enter authoritative command hashing. Original receipts/tokens/identity remain immutable across same-ID replay.

Null, empty text, whitespace, case and composed/decomposed Unicode stay distinct. Missing, unknown/generated fields, malformed Unicode/NUL, nonfinite numbers, coercions and unsafe revisions reject. No normalization, coordinate rounding, country default or financial-field dependency was introduced. -0 remains binary64 -0 in memory and JSON encodes 0. Provider geocode/Places/routing/map contracts are neutral; only test fakes exist, with explicit failure/empty outcomes and reviewed field-rights predicates. Per-item future Places/routing/map adapters and live policy are deferred. All **249 IMPLEMENT-01 cases** retain exact names/outcomes and source hashes.

| Golden vector | SHA-256 |
| --- | --- |
| Original property | `152c2a8b92faa9c3068e31fbb888ce29d29633eaa5fd5ffab5abc33924f9db8c` |
| Original command | `9351efbe0ee938e2189e8750b2fa6d84d84537695906ecff3a13daf2c540c4a4` |
| Unicode and escapes | `8884b7e5214b93f40819cf46e61bd3629ee8a22a5e0b7de40fb670d50a776b04` |
| Max revision / -0 / exponent | `2719f818047ec9ab6dd077bdf94b73afb00605134cec2ddec183db7c2ad27dd4` |
| All 17 semantic fields | `d4be2f35605a40346a55a3fd30ab127eadc6b711ce2335165c65bcee628533a9` |
| Separate operation identity | `fc0e997c519f23716f1d16c84eaf55373ff2b967a3245439d7a22ae60d4af8a1` |

## Fresh test results

Environment: Windows 10.0.26200 x64; Node v24.18.0; TypeScript 5.9.3; Vitest 5.0.1; Vite 8.3.0; Nitro 3.0.260603-beta. Vitest uses the existing Node environment, cache disabled. Existing installed dependencies only; no real SQL/Auth/provider target.

| Check | Pass / fail / skip | Exit |
| --- | --- | --- |
| legacy | 5 / 0 / 0 | 0 |
| security-source | 5 / 0 / 1 | 0 |
| application | 1452 / 0 / 0 | 0 |
| type-phase1 | PASS (one strict TypeScript project) | 0 |
| implement01 | 249 / 0 / 0 | 0 |
| type-foundation | PASS (one strict TypeScript project) | 0 |
| protocol | 130 / 0 / 0 | 0 |
| frozen | 53 / 0 / 0 | 0 |
| type-location | PASS (one strict TypeScript project) | 0 |
| type-pure | PASS (one strict TypeScript project) | 0 |
| type-transaction | PASS (one strict TypeScript project) | 0 |
| type-fixtures | PASS (one strict TypeScript project) | 0 |
| type-app | PASS (one strict TypeScript project) | 0 |
| build | PASS (one production build) | 0 |
| security-built | 6 / 0 / 0 | 0 |
| audit-reproduction | 1 / 1 / 0 | 1 |

All standard reruns exit 0. The separate audit reproduction exits 1 and remains an unresolved finding; it was neither removed nor hidden by accepted-test changes. Totals overlap: 249 I01–I04 and 130 I05 cases are subsets of 1,452 application cases; frozen 53 are also included. The full previous IMPLEMENT-01 1,322 and IMPLEMENT-02 1,452 case names/outcomes match, including all 1,073 preexisting cases. Frozen case-name/outcome parity is 53/53. No fresh PostgreSQL/Auth/browser-interaction case is counted. Type checks denote projects, not runtime assertions. Full Vitest/security components were invoked directly through existing local binaries; `npm test` itself was not invoked.

The JSON records exact command arrays, UTC start/end times, exit codes, pass/fail/skip counts, case outcomes and raw-log/report hashes. Source security's single expected skip is the browser scan without a configured browser root; the later fresh-built scan has six passes and no skips. Build warnings remain nonfatal: redundant tsconfig-path plugin, large browser chunk, inlineDynamicImports/codeSplitting conflict and dependency use-client directives. Existing local dependencies were reused, including links into the retained `.security-audit.local` installation; this is not a clean dependency-install/platform qualification. No install or configuration change occurred. Generated ignored worker/build files do not constitute deployment.

## Security and future gates

AST inspection of **132 source files** finds **44 import/export edges** in the ten location modules, all confined to that module set: no incoming application dependency, outside dependency, SQL driver, provider SDK or dynamic import/network/eval/require call in those modules. **33 rebuilt browser JS files** contain none of seven selected serializer/core/SQL markers. Existing source/built credential tests pass. Candidate documentation/test evidence was reviewed for credentials; hostile redaction/SQL-injection payloads are clearly synthetic tests, not live secrets. These are bounded static checks, not exhaustive secret detection or proof of real authentication.

There is no route, serverFn, HTTP endpoint, Edge Function, worker, configured writer instance, real SQL driver, new credential, privileged RPC or provider call. No new migration/role/membership/grant/database object appears. The Phase 1 browser Auth/data path is byte-preserved. No database, production, Docker or Lovable configuration action was taken.

**P05 remains a separate owner decision.** An elevated PostgreSQL bootstrap credential retains its underlying session authority after fixed SET LOCAL ROLE service_role; RESET ROLE can restore the session identity. It is not a least-privilege credential boundary. The accepted design already discloses this material risk. Review an explicitly approved credential/authority model before runtime use; do not infer approval of postgres from the synthetic harness or treat a Supabase API key as a SQL password ([PostgreSQL 17 SET ROLE](https://www.postgresql.org/docs/17/sql-set-role.html)). No credential was inspected, selected or provisioned.

I06 prerequisites remain open: resolve F01; approve exact Auth/database target and verified user/token policy; approve credential authority and SET permissions; pin/qualify host, driver, packaging, connection mode and TLS; prove actual row/parameter/command-tag mapping, transaction affinity, cancellation/quarantine/late acquisition/release ownership; run real append/CAS/rollback/deferred-COMMIT/replay and observed contention tests with unchanged guards; prove two real synthetic users and forged/expired/wrong-project denial; qualify driver/server/APM redaction. Use separately authorized synthetic targets and new evidence paths.

Before transport/provider exposure also qualify request/CSRF/origin/CORS/body/rate/budget policies, secure candidate receipt construction/replay/expiry and stale-response handling, permanent field-specific rights/attribution/withdrawal/purge/transfer privacy, and authorized reconciliation after input/ownership/deletion changes. Before production, complete clean seven-migration installation, supported-platform/adversarial authority matrix, backup/recovery/operational limits, all eight inherited T15 browser cases, combined release validation and explicit release authorization. Fake tests close none of those gates.

## Exact candidate checkpoint inventory

**36 candidate additions = 1 preexisting root checkpoint report + 5 DESIGN-01 documents + 16 IMPLEMENT-01 files + 11 IMPLEMENT-02 files + these 3 audit artifacts.** No modified/deleted/staged path exists. Category totals: ten new source modules; eleven new tests/helpers/type fixtures/configs; five architecture documents; six acceptance/checklist Markdown artifacts; three JSON evidence files; one preexisting untracked checkpoint report. Every path is an explicit review candidate with expected action ADD_PENDING_REVIEW, not permission to stage and not a claim F01 is resolved.

| Candidate path | Origin | Category |
| --- | --- | --- |
| `PHASE2A_02_GIT_CHECKPOINT_REPORT.md` | PREEXISTING_PHASE2A_02_CHECKPOINT | PREEXISTING_UNTRACKED_CHECKPOINT_REPORT |
| `docs/PHASE2A_03_ARCHITECTURE_REVIEW.md` | DESIGN-01 | ARCHITECTURE_DOCUMENT |
| `docs/PHASE2A_03_DECISION_REGISTER.md` | DESIGN-01 | ARCHITECTURE_DOCUMENT |
| `docs/PHASE2A_03_FOUNDATION_FINAL_ACCEPTANCE_CHECKLIST.md` | FINAL-AUDIT-01 | ACCEPTANCE_OR_CHECKLIST_REPORT |
| `docs/PHASE2A_03_FOUNDATION_FINAL_ACCEPTANCE_REPORT.md` | FINAL-AUDIT-01 | ACCEPTANCE_OR_CHECKLIST_REPORT |
| `docs/PHASE2A_03_IMPLEMENTATION_READINESS.md` | DESIGN-01 | ARCHITECTURE_DOCUMENT |
| `docs/PHASE2A_03_IMPLEMENT_01_CHECKLIST.md` | IMPLEMENT-01 | ACCEPTANCE_OR_CHECKLIST_REPORT |
| `docs/PHASE2A_03_IMPLEMENT_01_REPORT.md` | IMPLEMENT-01 | ACCEPTANCE_OR_CHECKLIST_REPORT |
| `docs/PHASE2A_03_IMPLEMENT_02_CHECKLIST.md` | IMPLEMENT-02 | ACCEPTANCE_OR_CHECKLIST_REPORT |
| `docs/PHASE2A_03_IMPLEMENT_02_REPORT.md` | IMPLEMENT-02 | ACCEPTANCE_OR_CHECKLIST_REPORT |
| `docs/PHASE2A_03_INTERFACE_PROPOSAL.md` | DESIGN-01 | ARCHITECTURE_DOCUMENT |
| `docs/PHASE2A_03_TRANSACTION_DESIGN.md` | DESIGN-01 | ARCHITECTURE_DOCUMENT |
| `docs/phase2a03-foundation-final-verification.json` | FINAL-AUDIT-01 | JSON_EVIDENCE |
| `docs/phase2a03-implement01-results.json` | IMPLEMENT-01 | JSON_EVIDENCE |
| `docs/phase2a03-implement02-results.json` | IMPLEMENT-02 | JSON_EVIDENCE |
| `src/lib/location/canonical.ts` | IMPLEMENT-01 | NEW_SOURCE |
| `src/lib/location/contracts.ts` | IMPLEMENT-01 | NEW_SOURCE |
| `src/lib/location/errors.ts` | IMPLEMENT-01 | NEW_SOURCE |
| `src/lib/location/primitives.ts` | IMPLEMENT-01 | NEW_SOURCE |
| `src/lib/location/providers.ts` | IMPLEMENT-01 | NEW_SOURCE |
| `src/lib/location/read-eligibility.ts` | IMPLEMENT-01 | NEW_SOURCE |
| `src/server/location/command-builder.server.ts` | IMPLEMENT-02 | NEW_SOURCE |
| `src/server/location/diagnostics.server.ts` | IMPLEMENT-02 | NEW_SOURCE |
| `src/server/location/ports.server.ts` | IMPLEMENT-02 | NEW_SOURCE |
| `src/server/location/transaction.server.ts` | IMPLEMENT-02 | NEW_SOURCE |
| `tests/database-types/phase2a03.ts` | IMPLEMENT-01 | NEW_TEST_OR_TYPE_FIXTURE |
| `tests/database-types/tsconfig.phase2a03-transaction.json` | IMPLEMENT-02 | NEW_TEST_OR_TYPE_FIXTURE |
| `tests/database-types/tsconfig.phase2a03.json` | IMPLEMENT-01 | NEW_TEST_OR_TYPE_FIXTURE |
| `tests/phase2a03/canonical.test.ts` | IMPLEMENT-01 | NEW_TEST_OR_TYPE_FIXTURE |
| `tests/phase2a03/contracts.test.ts` | IMPLEMENT-01 | NEW_TEST_OR_TYPE_FIXTURE |
| `tests/phase2a03/fixtures.ts` | IMPLEMENT-01 | NEW_TEST_OR_TYPE_FIXTURE |
| `tests/phase2a03/primitives.test.ts` | IMPLEMENT-01 | NEW_TEST_OR_TYPE_FIXTURE |
| `tests/phase2a03/read-eligibility.test.ts` | IMPLEMENT-01 | NEW_TEST_OR_TYPE_FIXTURE |
| `tests/phase2a03/redaction.test.ts` | IMPLEMENT-02 | NEW_TEST_OR_TYPE_FIXTURE |
| `tests/phase2a03/transaction-fake.ts` | IMPLEMENT-02 | NEW_TEST_OR_TYPE_FIXTURE |
| `tests/phase2a03/transaction.test.ts` | IMPLEMENT-02 | NEW_TEST_OR_TYPE_FIXTURE |

JSON supplies each path's category, origin, expected action, SHA-256, inclusion rationale and hold status. A byte-for-byte SHA-256 self-reference cannot be embedded in its own final JSON bytes: its own manifest row explicitly records that exception. The final JSON file's raw digest is supplied in the delivery message and retained ignored validation receipt; all other 35 candidate hashes are embedded in JSON. No partial-byte hash is presented as a raw file hash.

Excluded observed ignored paths are listed in JSON: dependency trees, all historical/new `.local` scratch evidence, `.output`, `.wrangler`, Supabase local caches and logs. Environment/credential paths remain ignored and excluded; no secret contents were read or hashed. No force-add, wildcard staging, `git add .`, deletion or old-evidence overwrite occurred. Staging is reproducible only after a future explicit authorization: recheck branch/HEAD/index and exact nonignored path set, verify every raw hash including the externally anchored JSON digest, and use only the manifest's literal paths. A source correction requires a new audit and updated manifest; this manifest must not certify different bytes.

## New artifacts and final Git state

Only three new nonignored artifacts were created:

- `docs/PHASE2A_03_FOUNDATION_FINAL_ACCEPTANCE_REPORT.md`
- `docs/PHASE2A_03_FOUNDATION_FINAL_ACCEPTANCE_CHECKLIST.md`
- `docs/phase2a03-foundation-final-verification.json`

The new ignored scratch directory retains original run logs, entry snapshot, AST/hash/manifest tooling and the separate failed audit reproduction. Portable findings/reproduction are inside JSON; scratch/build/logs remain excluded from checkpoint candidates.

Before: same branch/HEAD, empty index/tracked diff, 33 untracked paths. After: same branch/HEAD, empty index/tracked diff, exactly 36 untracked paths (original 33 plus the three files above), zero changed/missing entry files. Expanded before/after porcelain is embedded in JSON; the table above enumerates every final nonignored path.

**Stop point:** audit and three outcome artifacts only. No I06, accepted-source/test edit, migration/database connection, stage, commit, push, merge, main modification, deployment or published-history rewrite. Await independent review; the accepted-foundation checkpoint recommendation remains NO-GO until AUDIT-F01 is resolved and re-audited.
