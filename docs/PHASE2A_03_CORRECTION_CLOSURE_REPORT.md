# MPIA — Phase 2A-03 CORRECTION-CLOSURE-01

20 October 2026, Asia/Kuala_Lumpur. **AUDIT-F01 is closed for the corrected dormant foundation. AUDIT-G01's specific fake CAS omission is closed. GO for consolidated dormant I01–I05 acceptance; CONDITIONAL GO for a later controlled feature-branch checkpoint. I06 and production remain NO-GO.** No application source, accepted test or historical document was edited.

| Boundary | Decision | Scope and condition |
| --- | --- | --- |
| A. AUDIT-F01 closure | **GO** | Invocation-owned atomic claims, owner-only lifecycle, permanent quarantine and unchanged original reproduction independently verified; scoped synthetic regression passes. |
| B. AUDIT-G01 closure | **GO** | Specific fake property-binding omission closed; negative/no-mutation and correct-order positive tests pass. Fake remains explicitly non-PostgreSQL; G02 remains open. |
| C. Consolidated dormant I01-I05 acceptance | **GO** | Corrected accepted bytes and all scoped current-source checks pass. Limited to dormant local development; independent acceptance of this audit is pending. |
| D. Controlled Git feature-branch checkpoint readiness | **CONDITIONAL GO** | Technical inventory and regression gates pass for exact 42 additions. Await independent acceptance and separate RELEASE-01; recheck literal paths, raw hashes, branch/index and staged-byte conversion before any future checkpoint. No checkpoint performed. |
| E. I06 runtime/credential/driver qualification | **NO-GO** | Not authorized or qualified: P05/P06, concrete host/driver/packaging/TLS/target/Auth/pool behavior and G02 mapping remain open. |
| F. Production deployment | **NO-GO** | Runtime/Auth/database/provider/receipt/transport/reconciliation, clean installation/platform/adversarial/T15 and operational/release gates remain open. |

## Baseline, authority and evidence

Repository: `C:/Users/ysyap/AI Projects/malaysia-property-investment-analyzer`. Branch and HEAD remain `phase2-location-intelligence` / `e000da794e44619f945597e83b004895e3854a71`; parent `c9b6c4acc1879a2b84b89d3b39455f2489e4c56a`. Local main remains `72c2b8748d6468747b9784597b8f596e030b0dfb`, separate from the feature branch. Recorded origin/main is `4f587b8a7668df04fbfac52e8f1fb31886ae791f`; recorded origin/feature equals HEAD. These remote-tracking values are not a fresh remote read.

Entry: **360 tracked + 39 nonignored untracked = 399 files**. Initial index/staged diff and tracked working-tree diff were empty. Every entry file was hashed before new evidence was created. All **399 remain byte-identical**. Final: **360 tracked + 42 untracked = 402 files**, with precisely the three authorized closure artifacts added. The Git index entries, branch, HEAD and local main are unchanged. No stage, commit, push, merge, rebase, reset or deployment occurred.

Read repository rules, Phase 1 freeze and Phase 2 plan; Phase 2A-02 acceptance/checkpoint evidence; all five DESIGN-01 documents; IMPLEMENT-01/02, FINAL-AUDIT-01 and CORRECTION-01 report/checklist/JSON sets. Inspected transaction/connection ports, fake, permanent ownership/CAS tests, redaction tests, SQL and migration contract, and source import boundaries. JSON evidence is parsed and reconciled programmatically; this does not claim manual reading of every line of historical logs. Historical proposal, failure and NO-GO labels remain untouched and retain their original meaning. This closure supplies the later disposition for F01/G01 only.

## Independent AUDIT-F01 review

**1. Invocation-owned token.** A fresh Symbol is created in execute; module-wide WeakMap associates a client with that token. No shared actor or command state is introduced.

**2. Foreign active aliases issue no SQL.** The acquire callback rejects reserved.has(client) before assigning connection. Rejected invocation has no owned connection to query or finalize.

**3. Rejected aliases have no lifecycle authority.** Rollback, close and final cleanup require token equality; rejected callbacks never reach those operations on the foreign client.

**4. Atomic check and claim.** check(!reserved.has(client)) and reserved.set(client, owner) are adjacent synchronous statements, with no await or other asynchronous yield.

**5. Late/cancelled acquisition.** The same claim check precedes expired/aborted acquisition disposal. Foreign aliases fail without cleanup; an unowned late arrival is claimed only for bounded discard.

**6. Owner-only cleanup.** owns(client) guards close; catch rollback and final cleanup also check ownership. A normal claim is assigned inside the acquisition callback so cancellation before outer resumption still finds it.

**7. Delayed removal.** forget deletes only when its captured owner token still matches. Active ownership persists through cleanup acknowledgement or its bounded failure; delayed callbacks cannot unconditionally remove a later claim.

**8. Permanent quarantine.** Discard adds to a module-wide WeakSet synchronously before driver cleanup. There is no delete from quarantine. Failed/timed-out/late cleanup cannot permit later SQL on that object.

**9. COMMIT acknowledgement.** The provisional success object is internal; result is assigned only after awaited COMMITTED acknowledgement. Rejected/rolled-back and unknown completion keep distinct failure/certainty outcomes.

**10. Replacement vulnerability review.** All 20 permanent regressions, all 150 protocol cases and three independent adversarial probes pass. No replacement lifecycle/concurrency defect was found within this synthetic scope.

Budgets remain 2s acquisition, 5s statements, 8s transaction and 1s per cleanup operation. Release failure can fall back to a separate bounded discard. No retries, pool replacement framework, driver or lifecycle API was added. Permanent quarantine intentionally permits reacquisition solely for disposal, never for SQL. Successful core completion depends on the trusted port's COMMITTED acknowledgement; only I06 can prove that acknowledgement maps to an actual server COMMIT tag.

The original reproduction and config retain raw SHA-256 `41f47cef35a9df61f65cf1aa6177b10182b35b77107ffcd7b65c705784156ae4` and `54ad2f58d23bd47a20ab1b8cc8b4d1dfa23f41d5fdd666241017cd4613b72075`. They were executed at their original ignored paths, without altering the assertion or overwriting any historical output. Current F01 transcript is **["acquire"]**, replacing historical **["acquire", "discard"]**. F01 alone: **1 pass / 0 fail / 1 filtered skip**, exit 0.

The unchanged original two-probe run is deliberately retained: **1 pass / 1 fail / 0 skip**, exit 1. Its sole failure is historical G01, which asserts the former faulty fake rowCount 1; current rowCount is 0. This is **SUPERSEDED_ASSERTION**, not an unresolved application regression or a hidden green run. The original assertion remains embedded in historical evidence and in this JSON.

## Permanent cases and separate adversarial probes

All 20 new permanent cases were independently inspected and rerun: **19 ownership/lifecycle cases plus one G01 CAS case**. The focused name-filtered run has **20 pass / 0 fail / 110 filtered skips**; those 110 cases all pass in the unfiltered protocol/application runs. Exact full names and results match CORRECTION-01.

| Case | Exact suffix within the CORRECTION-01 describe | Result |
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

Three additional deterministic probes live only in ignored `.phase2a03-closure.local/` and pass:

1. Eight simultaneous aliases at COMMIT and delayed release, plus eight cancelled late acquisitions resolved after clean reuse of the **same object** by a later owner. No alias SQL/discard; later COMMIT stays pending until its gate opens; exactly one persistent version.
2. UNKNOWN owner with delayed discard failure crossing its cleanup timeout; replacement connection at COMMIT; eight aliases and late completion cannot erase replacement ownership, and the old quarantined object still cannot issue SQL.
3. Wrong-property CAS returns zero rows and leaves both active and persistent snapshots unchanged, including after explicitly committing the rejected update.

Ordering uses deferred barriers and fake timers; no arbitrary sleeps, database or real pool. Probe source/config, hashes, exact results and commands are portable in JSON. Historical scratch evidence is preserved; all new logs/results use a new ignored directory.

## AUDIT-G01 and retained G02

The fake now checks `data.state.property_id` against parameter 0 before mutation, then the expected revision and null-safe pointer. Permanent regression checks `[wrongProperty, versionId, 0, null]` returns zero with unchanged active snapshot, followed by `[propertyId, versionId, 0, null]` returning one row, revision +1 and the correct pointer. Rollback leaves persistent state unchanged. The independent committed-negative probe strengthens that persistent-state observation.

Actual CAS still updates only `$2`, with `property_id = $1`, `state_revision = $3` and `current_location_version_id IS NOT DISTINCT FROM $4`. This matches accepted recorded SQL. Migration hash remains `bebe96e843b5e8198fe6ec4e59d9091aea5bbec71a63e555e717cc645ca23e40`. No production SQL or migration was edited during this audit; accepted corrected source hash matches. Pre-correction whole-server byte-diff qualification is stated below rather than inferred from a digest alone.

The original fake is recoverable exactly by removing only the property predicate and its explanatory comment: recovered SHA-256 `e2f989e77b7662ace3bd6bf1eb247f3b970c97fa21e4a53c1b1684ac493f86ad`. The original transaction-test prefix, with its necessary import reverted, recovers `6fb5fc3177412d94c26bf8c8bfde231214d6ad3c5054a5dc5044f9b9cf693c3c`. This independently preserves all original permanent assertions. The fake still dispatches against imported fixed SQL and models selected semantics; it does not execute or prove PostgreSQL predicates, constraints, RLS, concurrency or driver tags.

**AUDIT-G02 remains OPEN for I06.** Command-only rows/counts, bigint/binary64/microsecond UTC mapping and actual COMMIT/ROLLBACK/rejection/transport-ambiguity normalization require real-driver qualification. G01 closure does not close G02.

## Fresh regression and exact parity

Counts overlap: 150 protocol cases (130 transaction + 20 redaction), 249 I01–I04 cases and frozen 53 are subsets of the 1,472 application cases / 39 files. Focused ownership and repeated reproduction runs add no distinct permanent coverage. The three ignored probes are separate audit checks. Type/build rows are executions, not runtime test assertions.

| Execution | Pass / fail / skip, or outcome | Exit |
| --- | --- | --- |
| adversarial | 3 / 0 / 0 | 0 |
| application | 1472 / 0 / 0 | 0 |
| build | PASS (one project/build) | 0 |
| frozen | 53 / 0 / 0 | 0 |
| implement01 | 249 / 0 / 0 | 0 |
| legacy | 5 / 0 / 0 | 0 |
| original-both | 1 / 1 / 0 | 1 |
| original-f01 | 1 / 0 / 1 | 0 |
| ownership | 20 / 0 / 110 | 0 |
| protocol | 150 / 0 / 0 | 0 |
| security-built | 6 / 0 / 0 | 0 |
| security-source | 5 / 0 / 1 | 0 |
| type-app | PASS (one project/build) | 0 |
| type-fixtures | PASS (one project/build) | 0 |
| type-foundation | PASS (one project/build) | 0 |
| type-location | PASS (one project/build) | 0 |
| type-phase1 | PASS (one project/build) | 0 |
| type-pure | PASS (one project/build) | 0 |
| type-transaction | PASS (one project/build) | 0 |

Exact `(relative file, full name, status)` multiset comparison with CORRECTION-01: **application 1472/1472, protocol 150/150, I01–I04 249/249, frozen 53/53 and new cases 20/20**, with zero removed, added or changed permanent outcomes. Original 110 transaction cases are preserved. Legacy serializer has five passes. Source security has five passes and one expected browser-root skip; fresh rebuilt-browser security has six passes and zero skips.

All seven strict no-emit projects pass: application; fixtures; Phase 1 database types; foundation; location; pure Phase 2A-03; transaction Phase 2A-03. Installed Node v24.18.0, TypeScript 5.9.3, Vitest 5.0.1, Vite 8.3.0 and Nitro 3.0.260603-beta were reused on Windows x64. Both package-test components ran directly; `npm test` itself was not invoked. No dependency/configuration change occurred.

Production build passed. Existing nonfatal warnings remain: redundant tsconfig-path plugin, browser chunks >500 kB, inlineDynamicImports/codeSplitting conflict and dependency use-client directives. Ignored worker/config output is a build result, not deployment. No historical database/report runner was invoked, no accepted evidence was overwritten and no actual database/Auth/provider call occurred.

## Preservation and security

Independent reconciliation: IMPLEMENT-01 **381 path/hash references, no mismatches**; IMPLEMENT-02 **392 references, exactly three expected superseded source/test hashes**; FINAL-AUDIT-01 **458 references, six references to those same three expected superseded hashes**. No unexplained mismatch. Repeated references are not distinct files. CORRECTION-01's 396 post-correction entry hashes match; its JSON raw digest matches the separate historical receipt: `ca203fbbbcccc9853804cfdf1a8dcaa5257cf776320c1668ab89165ee5aa5973`.

The historical correction snapshot independently confirms precisely three source/test changes, 393 unchanged earlier files and exactly three correction outcome additions. All 399 closure-entry files remain unchanged now. All 13 I01–I04 source/test/type/config files, five design documents and historical IMPLEMENT/FINAL-AUDIT report/checklist/JSON files retain accepted bytes. All seven migration raw hashes match baseline; original five migrations and 22 protected Phase 1 paths have empty diffs against `v0.1-phase1`. Generated types retain `ffcbec32309a369926843a99ec2b1a65ad8cf0ee500b43eee982ec105ae55347`. All individual protected hashes are in JSON.

| Corrected untracked file (future Git action is ADD) | Verified current raw SHA-256 |
| --- | --- |
| `src/server/location/transaction.server.ts` | `e383293a75c4263697ffbe55fe032882b8f71b8a4dcc9db3d5031343c186ea65` |
| `tests/phase2a03/transaction-fake.ts` | `f9997b3da4ba24c005d4ec85ae45a73bc7a901fff2a34c6c33b3d4a8b76da73a` |
| `tests/phase2a03/transaction.test.ts` | `b4a6e8b3a4f2723fbe49e5b399dc91c6abce21ff545186cd9c65bc519cbc52df` |

Independent AST review: **132 source files, ten location modules, 44 confined import/export edges**, zero incoming application consumers, external dependencies or selected network/eval/require/dynamic-import calls in the dormant modules. **33 rebuilt browser JS files** contain none of seven selected serializer/core/SQL markers. No runtime provider, SQL driver, credential, route, function/role/grant, migration, frontend/Lovable or deployment configuration change was introduced.

Candidate credential-pattern review has one classified finding: `tests/phase2a03/redaction.test.ts:7` intentionally contains a synthetic database URL on a reserved `.invalid` hostname. Its purpose is to prove redaction, and its accepted hash is unchanged. It is **REVIEWED_SYNTHETIC_FIXTURE**, not a live credential and not silently suppressed. No live secret was identified in candidate files. Environment/credential files were not opened or hashed; ignored scratch/dependencies/build outputs are excluded.

One new inspection script initially treated CORRECTION-01's created-artifact objects as strings and raised TypeError before producing evidence. The scratch parser was corrected to use their path fields; all 396/399 preservation assertions then passed. Early default PowerShell decoding displayed mojibake; evidence parsing and document reads use explicit UTF-8. Optional old-server reverse reconstruction did not match and is not used as proof. These are inspection qualifications, not failed product tests; original outputs/accepted files were untouched.

## Refreshed controlled checkpoint manifest

The final Git inventory was determined from actual expanded untracked status: **42 candidate additions**, reconciled as historical 36 + CORRECTION-01's three + this audit's three. Category totals: **ten source, eleven test/helper/type/config, 21 report/design/evidence files**. The historical 36-path manifest is preserved as evidence and **superseded for staging**; its three old correction hashes and historical hold decision must not be used to stage current bytes.

[JSON evidence](phase2a03-correction-closure-results.json) provides every exact relative path, specific purpose, origin/correction provenance, expected ADD action, inclusion recommendation, security disposition and category. It embeds 41 raw file hashes; its own row explicitly records the unavoidable self-hash exception. Its final raw SHA-256 and all 42 hashes are in the separate ignored `.phase2a03-closure.local/final-validation.json` receipt; the JSON digest is also supplied in the delivery response. No partial-file hash is represented as a whole-file digest.

Recommend inclusion only after independent acceptance and a separate RELEASE-01 instruction. Recheck branch/HEAD, empty index/tracked diff, exact 42 literal paths and every raw hash against the external receipt. Verify any later staged blob conversion preserves approved bytes; this task changes no Git config/index. Do not use wildcard staging, `git add .`, force-add, or include ignored files. No staging command was executed.

Excluded observed ignored directories/files and the explicit credential exclusion policy are recorded in JSON. Historical and new scratch scripts/logs/probes/receipts, dependency trees, `.output`, `.wrangler`, `.tanstack`, Supabase local caches and logs remain excluded. No private environment file is a candidate. No existing file was deleted.

## Remaining limitations and stop point

- Synthetic object-ownership/protocol evidence is not real PostgreSQL concurrency, RLS, authenticated security, server cancellation, lock release or physical pool eviction proof.
- G02 remains an I06 gate: normalize BEGIN/SET empty rows/counts, bigint, binary64, UTC microseconds, and actual COMMIT/ROLLBACK/rejection versus transport ambiguity.
- P05 elevated bootstrap authority and P06 shared Auth/SQL target identity, real two-user verification, exact runtime/driver/pool/TLS/packaging and driver/server/APM redaction remain unqualified.
- Provider field rights, candidate receipts, withdrawal/purge/transfer privacy, reconciliation and transport security remain deferred; no live provider or handler exists.
- Full seven-migration clean installation, supported-platform/adversarial matrix, all eight T15 interactive browser cases and production operational/release approval remain open.
- Existing local dependencies were reused; no clean install was attempted. Static source/credential/marker scans are bounded and not exhaustive secret attestation.
- No fresh remote query was made. origin refs are recorded local metadata, not current GitHub verification; a later authorized release must verify its remote preconditions.
- No independent saved pre-correction server source body was available. Current SQL was checked against recorded accepted SQL/contract and the accepted CORRECTION-01 digest. An optional reverse-reconstruction did not match the old whole-server hash and is not used as byte-diff evidence. Original test assertions and the fake were successfully reverse-reconstructed to their historical raw hashes.

Only these new nonignored artifacts were created:

- `docs/PHASE2A_03_CORRECTION_CLOSURE_REPORT.md`
- `docs/PHASE2A_03_CORRECTION_CLOSURE_CHECKLIST.md`
- `docs/phase2a03-correction-closure-results.json`

**Stop for independent acceptance and a separate RELEASE-01 instruction. The checkpoint has not been performed.** No I06 implementation, database connection, migration execution, credential provisioning, stage/commit/push/history change, main modification or deployment occurred.
