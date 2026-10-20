# MPIA — Phase 2A-03 IMPLEMENT-01 report

20 October 2026, Asia/Kuala_Lumpur. **GO for independent owner acceptance of dormant I01–I04 only. NO-GO for runtime exposure or deployment.** All changes are local and uncommitted. IMPLEMENT-02/03 have not begun.

## Baseline and preservation

Branch: `phase2-location-intelligence`. Exact HEAD: `e000da794e44619f945597e83b004895e3854a71`. Initial and final index/tracked diffs are empty. All **366 preexisting nonignored files** were SHA-256 compared: **zero changed, zero missing**. This includes all five DESIGN-01 documents and the root Phase 2A-02 Git checkpoint report. No unexpected modification was found.

The explicit IMPLEMENT-01 instruction supplies current authorization; the historical proposal-only headings in DESIGN-01 remain untouched. AGENTS.md, PROJECT_RULES, the Phase 1 freeze, Phase 2 plan, Phase 2A-02 final acceptance, all five DESIGN-01 documents, actual location SQL, accepted serializer and frozen fixtures were inspected. No old database/report runner was invoked.

## Implemented behavior

| Slice | Result |
| --- | --- |
| I01 | Runtime validators for canonical UUID/digest, finite WGS84 pairs, explicit strings/nulls, Unicode code-point bounds, nonnegative/positive units, safe integer versions/revisions, exact driver bigint decoding and UTC calendar instants; sanitized closed error/retry outcomes. Brands are compile-time aids, not security. |
| I02 | Provider-neutral geocoding/Places/routing/map ports, provenance/rights/quality, trusted command/result shapes, ABSENT versus EXACT tokens, confirmation states and strict SQL-local payload combinations. Test-only geocoder fake has no network calls. Other ports remain stubs. |
| I03 | Exact v1 fixed arrays with UTF-8 Web Crypto SHA-256, lowercase digest, seven saved input fields and all 17 semantic fields. Separate property/operation identity; frozen command/tokens/receipt on retry. No provider fingerprint or new SQL column. |
| I04 | Pure current/historical origin decisions. Explicit stateObservation distinguishes absent from existing inert state. Valid latest intent, confirmation, lineage, scalar coordinates and current input hash govern current applicability. Exact historical pins carry historical labeling and original hash. No fallback or status mutation. |

The source/status/normalization/confidence/reason checks reproduce the actual migration combinations, including SQL-permitted provider metadata on NONE/USER_PIN when all other checks hold. SQL registry eligibility, retrieval versus transaction creation time, INITIAL_INPUT versus prior history, ownership, CAS and COMMIT remain later contextual/transaction checks. The read validator checks stored receipt/confirmation timestamps without a clock.

Boundary validation is deliberately stricter than PostgreSQL text: all-whitespace strings, NUL, malformed surrogates, unknown/generated keys, coercions and noncanonical UUIDs are rejected. UTC instants use year 0001–9999, valid calendar/time components, Z and optional 1–6 fractional digits; accepted strings retain their lexical bytes. Saved property fingerprints permit explicit empty strings and impose no new Phase 1 length/default/normalization policy. Coordinate -0 is preserved in validated binary64 and serialized to 0 by JSON.stringify; (0,0) remains valid.

## Golden-byte and identity parity

Fixed fixtures independently compared to the unchanged Phase 2A-02 Node serializer and Node crypto:

| Vector | SHA-256 |
| --- | --- |
| Original property input | `152c2a8b92faa9c3068e31fbb888ce29d29633eaa5fd5ffab5abc33924f9db8c` |
| Original USER_PIN command | `9351efbe0ee938e2189e8750b2fa6d84d84537695906ecff3a13daf2c540c4a4` |
| Unicode/escapes/composed and decomposed text | `8884b7e5214b93f40819cf46e61bd3629ee8a22a5e0b7de40fb670d50a776b04` |
| Maximum revision, -0, 1e-7 | `2719f818047ec9ab6dd077bdf94b73afb00605134cec2ddec183db7c2ad27dd4` |
| All 17 semantic fields populated | `d4be2f35605a40346a55a3fd30ab127eadc6b711ce2335165c65bcee628533a9` |
| Separate property/operation identity | `fc0e997c519f23716f1d16c84eaf55373ff2b967a3245439d7a22ae60d4af8a1` |

No historical expected value or serializer was edited. Tests cover null/empty/whitespace/case/Unicode distinctions, original order/version markers, numeric exponent/precision/-0, financial-only independence, operation-ID exclusion, same-ID conflict on changed actor/tokens/payload/receipt and different-property identity. Generated outputs are rejected as new command inputs and remain outside every preimage.

## Fresh verification

Environment: Windows_NT 10.0.26200 x64; Node v24.18.0; npm 12.0.1; TypeScript 5.9.3; Vitest 5.0.1; Vite 8.3.0; Nitro 3.0.260603-beta. Local dependency installation only; no install, database, external API, Auth or frontend browser was used. Execution times are recorded in UTC in the JSON manifest, with this report dated in Asia/Kuala_Lumpur.

Final outcomes: primitives **106/0/0**, contracts/provider fake **81/0/0**, canonical **24/0/0**, eligibility **38/0/0** (pass/fail/skip). The **249 new tests** are a subset of **1,322 passing tests in 37 files**, including all **1,073 preexisting application tests**. Frozen P01–P10: **53/53**; exact test names and outcomes match retained Phase 2A-02 evidence. Five legacy serializer tests pass unchanged. All six strict TypeScript projects pass; inherited historical contracts compile. Source security: **5 pass / 1 skip** on the initial source-only invocation, then **6 pass / 0 skip** against freshly built browser assets. Counts across these overlapping/repeated suites must not be added.

Every captured execution is listed below. Earlier executions are preserved separately; final-source results are the unsuffixed runs. Pass/fail/skip for TypeScript/build rows count projects/builds, not test assertions.

| Run | Outcome | Pass/fail/skip | Exit |
| --- | --- | --- | --- |
| primitives-initial | PASS | 106/0/0 test | 0 |
| contracts-initial | PASS | 81/0/0 test | 0 |
| canonical-initial | PASS | 24/0/0 test | 0 |
| eligibility-initial | PASS | 38/0/0 test | 0 |
| type-new-initial | PASS | 1/0/0 TypeScript project | 0 |
| type-location | PASS | 1/0/0 TypeScript project | 0 |
| legacy | PASS | 5/0/0 test | 0 |
| type-fixtures | PASS | 1/0/0 TypeScript project | 0 |
| type-phase1 | PASS | 1/0/0 TypeScript project | 0 |
| type-foundation | PASS | 1/0/0 TypeScript project | 0 |
| frozen | PASS | 53/0/0 test | 0 |
| security | PASS | 5/0/1 test | 0 |
| application-initial | PASS | 1322/0/0 test | 0 |
| type-app-initial | PASS | 1/0/0 TypeScript project | 0 |
| build | PASS | 1/0/0 production build | 0 |
| eligibility | PASS | 38/0/0 test | 0 |
| type-app | PASS | 1/0/0 TypeScript project | 0 |
| type-new-formatting-failed | FAIL | 0/1/0 TypeScript project | 2 |
| primitives | PASS | 106/0/0 test | 0 |
| security-built | PASS | 6/0/0 test | 0 |
| application | PASS | 1322/0/0 test | 0 |
| contracts | PASS | 81/0/0 test | 0 |
| canonical | PASS | 24/0/0 test | 0 |
| type-new | PASS | 1/0/0 TypeScript project | 0 |
| exploratory-type-app | PASS | 1/0/0 project | 0 |
| exploratory-type-new | FAIL, corrected | 0/1/0 project | 1 |
| source/import/frozen audit | PASS | 1/0/0 audit | 0 |
| new-file Prettier check | PASS | 13/0/0 files | 0 |

Two new-test fixture issues were corrected: the exploratory new strict project initially reported TS2783 for a deliberate duplicate city edit/restore expression; it now performs the edit and restoration explicitly. Formatting then moved multiline negative fixtures away from their @ts-expect-error directives; directives now sit on the rejected properties. Both failures are retained in the manifest. Final strict compilation passes without weakening types or accepted tests. No existing regression occurred.

| Final check | Exact command |
| --- | --- |
| type-location | `node node_modules/typescript/bin/tsc -p tests/database-types/tsconfig.phase2a02.json` |
| legacy | `node --test tests/phase2a02-contract.test.mjs` |
| type-fixtures | `node node_modules/typescript/bin/tsc -p tests/fixtures/tsconfig.json` |
| type-phase1 | `node node_modules/typescript/bin/tsc -p tests/database-types/tsconfig.json` |
| type-foundation | `node node_modules/typescript/bin/tsc -p tests/database-types/tsconfig.phase2a01.json` |
| frozen | `node node_modules/vitest/vitest.mjs run tests/phase1-property-fixtures.test.ts tests/phase1-property-fixtures-integration.test.ts --no-cache --reporter=json --outputFile=.phase2a03-implement01.local/frozen.json` |
| security | `node --test tests/security.test.mjs` |
| build | `node node_modules/vite/bin/vite.js build` |
| eligibility | `node node_modules/vitest/vitest.mjs run tests/phase2a03/read-eligibility.test.ts --no-cache --reporter=json --outputFile=.phase2a03-implement01.local/eligibility.json` |
| type-app | `node node_modules/typescript/bin/tsc --noEmit` |
| primitives | `node node_modules/vitest/vitest.mjs run tests/phase2a03/primitives.test.ts --no-cache --reporter=json --outputFile=.phase2a03-implement01.local/primitives.json` |
| security-built | `node --test tests/security.test.mjs` |
| application | `node node_modules/vitest/vitest.mjs run --no-cache --reporter=json --outputFile=.phase2a03-implement01.local/application.json` |
| contracts | `node node_modules/vitest/vitest.mjs run tests/phase2a03/contracts.test.ts --no-cache --reporter=json --outputFile=.phase2a03-implement01.local/contracts.json` |
| canonical | `node node_modules/vitest/vitest.mjs run tests/phase2a03/canonical.test.ts --no-cache --reporter=json --outputFile=.phase2a03-implement01.local/canonical.json` |
| type-new | `node node_modules/typescript/bin/tsc -p tests/database-types/tsconfig.phase2a03.json` |
| import/frozen/source audit | `node .phase2a03-implement01.local/audit.mjs` (local audit source/log, portable findings in JSON) |
| formatting | `node node_modules/prettier/bin/prettier.cjs --check 'src/lib/location/*.ts' 'tests/phase2a03/*.ts' tests/database-types/phase2a03.ts tests/database-types/tsconfig.phase2a03.json` |

The full Vitest and security commands execute the two components of package.json's npm test separately; npm test itself was not invoked. `security-built` used SECURITY_AUDIT_BROWSER_ROOT=.output/public and cleared any source-root override. The build used the existing Cloudflare-module preset, without configuration changes or preview/deployment. It completed with nonfatal large-chunk, plugin timing, redundant tsconfig-path plugin, inlineDynamicImports/codeSplitting and dependency "use client" directive warnings. Dependencies resolve through the existing local installation (some paths point into .security-audit.local/upstream-20260921/node_modules); none were installed or modified by this task. A build and pattern scan do not qualify the real runtime.

## Phase 1 and security boundaries

Protected engine/config/analysis-hook diffs against v0.1-phase1: **zero bytes**. Original five migration diffs: **zero bytes**. All migrations, generated Supabase types, hooks, routes, accepted tests/reports, package/lock and build/config files retain their entry hashes. The frozen 53 fixtures assert existing expected outputs; outcome-name parity is additionally checked against retained evidence. No historical database, Auth, cascade, lock-race or spatial evidence is relabeled as newly executed.

AST import review of six pure source files found **19 imports, all within those six modules**, no dynamic imports, require/eval/fetch calls, and no application consumers. Transitive import boundaries therefore reach no credentials, Supabase admin client, server module, provider SDK or SQL driver. Rebuilt browser audit inspected **33 JavaScript files**: no new serializer/operation identity markers or selected server/admin/SQL markers. Existing credential scanner passed all six tests on the rebuilt browser tree. These are bounded source/bundle checks, not exhaustive secret detection or runtime authorization proof.

## Complete file inventory and hashes

**Created: 16 files** (13 implementation/test/type files and the three required artifacts). **Modified preexisting files: none. Deleted files: none.** Local ignored harness/log/report-generation files and build outputs are retained as local evidence and excluded from the review inventory; no staging occurred.

| New implementation file | SHA-256 |
| --- | --- |
| `src/lib/location/canonical.ts` | `d5dbbcc0ac0029481d8f4a584dd1e8f449c32bee8b795bf6bfdd6aac100decc0` |
| `src/lib/location/contracts.ts` | `d84c2c053d513fdc9092eac7c28e4926cc9c221eda5a200ce13d5f9a053d5c2e` |
| `src/lib/location/errors.ts` | `1b7437ec810f73c009d38410d18c80002bc4c8b78c1c53a0ceacf36780bb2943` |
| `src/lib/location/primitives.ts` | `5f272ccec373840802448e0b3d08afc379b0e6e453d2c5e37ab5ffa47c45b029` |
| `src/lib/location/providers.ts` | `10ad1019d180fa306c4088506570437c6363fef15e058eff697dd09d484184f4` |
| `src/lib/location/read-eligibility.ts` | `51e7897b424ece3216c3b947830f8ad2aff86444b71c0f2445cfa870af47f136` |
| `tests/database-types/phase2a03.ts` | `e8a595aae104b8c05f81787f1e8329ab1740a94d3d161596230d0dc2b22cfa7c` |
| `tests/database-types/tsconfig.phase2a03.json` | `a721420f8194834e7e5388832377f07e1c822d6469c54f04c383d96e19bc4736` |
| `tests/phase2a03/canonical.test.ts` | `fb7ea179b49def0d480b917322bd4e572a9212193ab0204b47944c1364eb59d9` |
| `tests/phase2a03/contracts.test.ts` | `27e69bd023c81d3be9a0edcf18a7e17d8013b1150d70bc4785b609989717a331` |
| `tests/phase2a03/fixtures.ts` | `e2558e0809c8ee021f3712f9068276227bcc45638f88cbd3fe644b1be82ed72a` |
| `tests/phase2a03/primitives.test.ts` | `52322d06d1a49b79ec695d73b7abe22ea7d2813db730aee7a72690e9f43fc64a` |
| `tests/phase2a03/read-eligibility.test.ts` | `ff10bf468ee10b424499153bea6be320fcf9a7cb329fa52e73c18ff9b019fe0d` |

The JSON manifest contains exact SHA-256 for the 13 files above plus this report and the checklist. Its own SHA-256 is captured by the final external local validation receipt to avoid a self-referential digest. All 16 final files are inventoried there. Full preexisting hashes, pre/post porcelain and every fresh test command/outcome are retained in the JSON manifest.

## Git pre/post status

Before:

```text
?? PHASE2A_02_GIT_CHECKPOINT_REPORT.md
?? docs/PHASE2A_03_ARCHITECTURE_REVIEW.md
?? docs/PHASE2A_03_DECISION_REGISTER.md
?? docs/PHASE2A_03_IMPLEMENTATION_READINESS.md
?? docs/PHASE2A_03_INTERFACE_PROPOSAL.md
?? docs/PHASE2A_03_TRANSACTION_DESIGN.md
```

After (unchanged branch/HEAD; empty index/tracked diff):

```text
?? docs/PHASE2A_03_ARCHITECTURE_REVIEW.md
?? docs/PHASE2A_03_DECISION_REGISTER.md
?? docs/PHASE2A_03_IMPLEMENT_01_CHECKLIST.md
?? docs/PHASE2A_03_IMPLEMENT_01_REPORT.md
?? docs/PHASE2A_03_IMPLEMENTATION_READINESS.md
?? docs/PHASE2A_03_INTERFACE_PROPOSAL.md
?? docs/PHASE2A_03_TRANSACTION_DESIGN.md
?? docs/phase2a03-implement01-results.json
?? PHASE2A_02_GIT_CHECKPOINT_REPORT.md
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

## Limitations, deferred gates and acceptance

**GO for I01–I04 acceptance only.** All new modules are dormant. Brands, parsed provenance/rights and a structurally valid command do not confer trust, ownership or persistence rights. Callers must supply a coherent already-authorized snapshot; this evaluator cannot detect a plausible mixture of independently cached snapshots. Content hashes cannot detect an edit away and back to identical values. Read decisions are observations; future commands/acquisitions must recheck owner/input/expected state inside the authoritative workflow.

SQL transaction/writer, actual Auth verification, credential/driver/host/target qualification, CAS/concurrency/COMMIT/reconciliation behavior, provider rights review/live adapters/receipt lifecycle, revocation/purge/budgets, HTTP security/logging/APM, Deno packaging, clean installation/platform/adversarial tests and all eight T15 interactive browser cases remain **NOT EXECUTED / DEFERRED**. Places/routing/map interfaces and their limited shape/coverage guards are stubs, not complete adapters. No provider may author immutable history. No new status, registry, scoring, migration, role/grant, connection, endpoint, SDK, hook or route was introduced.

Await explicit owner acceptance before any next implementation slice. No stage, commit, push, merge, rebase, deployment, database access, production access or provider call occurred.
