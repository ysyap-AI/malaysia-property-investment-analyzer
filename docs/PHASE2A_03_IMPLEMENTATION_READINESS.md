# MPIA — Phase 2A-03 implementation readiness

20 October 2026, Asia/Kuala_Lumpur. **CONDITIONAL GO for separately authorized dormant foundations after owner design approval. NO-GO for an active authoritative endpoint or production deployment.** DESIGN-01 stops with these five documents; no implementation slice has begun.

Read [architecture evidence](PHASE2A_03_ARCHITECTURE_REVIEW.md), [proposed interfaces](PHASE2A_03_INTERFACE_PROPOSAL.md), [transaction mechanics](PHASE2A_03_TRANSACTION_DESIGN.md) and [decisions P01–P10](PHASE2A_03_DECISION_REGISTER.md). This document is a proposed implementation checklist, not permission to execute commands, install dependencies or access any database.

## 1. Readiness by boundary

| Boundary | Recommendation / remaining precondition |
| --- | --- |
| Architecture artifacts | Complete for owner review; new decisions remain proposed |
| Contracts, serializers and pure read evaluator | CONDITIONAL GO after P01/P02/P03/P07/P09/P10 approval and a separate narrow instruction |
| Dormant transaction core using an injected connection | CONDITIONAL GO after P04 approval; no concrete SQL secret/driver needed |
| Concrete SQL adapter and local real-driver tests | HOLD until P05 credential boundary and P06 runtime/driver/target qualification are explicit; no new grants inferred |
| Real authenticated transport, candidate confirmation, live provider | NO-GO in 2A-03 initial slices; 2A-04 rights/receipt/target/session gates and separate authorization |
| Production | NO-GO: inherited clean-install/platform/T15 gates plus new runtime/security/operational qualification remain open |

The review found no need to alter accepted migrations, generated types, Phase 1 code, current-pointer semantics or approved grants to implement the initial dormant slices. A preference for stronger database-enforced CAS, a restricted login, a privileged RPC or a different serializer requires separate design approval before that affected work proceeds.

## 2. Narrow implementation slices and exact likely paths

All paths below describe **future files**, not files created by this review. Keep existing files untouched for the initial slices. File naming may be consolidated within each boundary, but any expanded scope needs review. Do not wire new modules into existing routes/hooks/property save paths in the foundation task.

| Slice | Files likely to create | Behavior / acceptance boundary |
| --- | --- | --- |
| I01: primitives and errors | `src/lib/location/primitives.ts`, `src/lib/location/errors.ts`, `tests/phase2a03/primitives.test.ts` | Strict finite/pair/UUID/hash/safe-integer/timestamp/string validators and closed errors; reject missing/unknown/generated input |
| I02: domain/provider ports | `src/lib/location/contracts.ts`, `src/lib/location/providers.ts`, `tests/phase2a03/contracts.test.ts`, `tests/database-types/phase2a03.ts`, `tests/database-types/tsconfig.phase2a03.json` | Provider-neutral geocode/Places/routing/map types; command/result and confirmation states. Geocoder fake only; other providers compile-time stubs. No vendor SDK/call |
| I03: identity | `src/lib/location/canonical.ts`, `tests/phase2a03/canonical.test.ts` | Exact v1 arrays plus proposed idempotency identity; fixed golden bytes/digests; no v2 or provider-result fingerprint |
| I04: eligibility | `src/lib/location/read-eligibility.ts`, `tests/phase2a03/read-eligibility.test.ts` | Pure current/historical evaluator over validated coherent snapshots; no new reads/routes/UI wiring or status mutation |
| I05: server core | `src/server/location/ports.server.ts`, `src/server/location/command-builder.server.ts`, `src/server/location/transaction.server.ts`, `src/server/location/diagnostics.server.ts`, `tests/phase2a03/transaction.test.ts`, `tests/phase2a03/redaction.test.ts` | Injected VerifiedActor/verifier and reserved-connection ports, parameterized transaction sequence, explicit commit certainty/retry/cleanup; no HTTP entry point, callable serverFn, admin REST writes or production credentials |
| I06: separately gated driver/auth qualification | `src/server/location/auth.server.ts`, `supabase/functions/_shared/location-postgres.ts`, `supabase/functions/deno.json`, `supabase/functions/deno.lock`, `tests/phase2a03/runtime-security.test.ts`, `tests/run-phase2a03-transactions.mjs`, `tests/phase2a03/README.md` | Only after exact host/driver/credential and synthetic target approval: real Auth verifier and SQL adapter, new bounded integration runner/artifacts. Still no deployable `index.ts` function or externally accessible route |

Server core imports pure contracts but pure contracts never import server credentials, adapters, Auth or generated admin clients. Keep hashes portable (UTF-8/Web Crypto interface) and byte-identical with the existing Node fixture. Do not build a second incompatible Deno serializer. A `.server.ts` suffix expresses intent, but bundle/import-boundary checks must prove isolation before exposure.

Packaging precondition for I06: prove the actual Edge bundler can include the single pure/core source tree via the chosen relative/package boundary. A standalone Deno type check is not a deployment packaging test. If that requires packaging or build configuration changes, propose the exact change separately; do not silently duplicate business/serialization code into `functions/`, change the Lovable target or add a full monorepo framework. Initial I01–I05 can remain fully dormant with no Edge entry point.

Expected modifications to existing files for I01–I05: **none**. Existing app `tsconfig.json` includes source and existing Vitest config includes `tests/**/*.test.ts`, so new source/tests fit current tooling. I06 may need a newly pinned Deno dependency manifest/lock and separate test configuration; do not install a Node dependency or edit package/lock files without the driver/host decision explicitly naming it. Existing Supabase configuration, generated middleware and `src/start.ts` remain unchanged. Any eventual token-attacher/client repair or handler registration is a separate 2A-04 transport task after the target mismatch is resolved.

New future test evidence should use new `docs/phase2a03-*` paths or a new approved run directory and identify exact source/Git/target/time. Do not overwrite 2A-01/02 historical JSON, reports or logs. New runners cannot simply invoke the old transaction runner: it pins pre-checkpoint HEAD, writes accepted JSON, commits synthetic fixtures and requires its prior safety-source hashes.

## 3. Prohibited implementation changes

Preserve all seven Phase 1 tables and original five migrations; accepted foundation/location migrations, RLS/grants/guards, scalar/geography/GiST strategy, state revision/current pointer and cascades; existing generated type destination and financial behavior. No fingerprint field additions/removals, NFC normalization, rounding, status activation or retry precedence changes under v1.

No new table, migration, role/membership/grant, SECURITY DEFINER/invoker RPC, production credential, provider seed, live geocode/map/Places/routing API, browser writer, generic SQL endpoint, scheduled worker, queue/cache infrastructure, score/fact/publication engine, alternate origin/CRS transform, frontend UI, Lovable configuration, Docker modification/reset or database migration execution is authorized by the proposed initial scope. Do not merge/rebase/reset/amend/commit/push. An unexpected conflict stops only the affected implementation and is reported for an explicit decision; it does not authorize a workaround in protected code.

## 4. Required test matrix and pass criteria

Tests below are future requirements, not fresh passes. Unit/type success is necessary but insufficient for actual database/Auth security. Every failure/skipped gate must be reported explicitly; no summed count across overlapping suites.

| ID / layer | Cases | Required pass evidence / gate |
| --- | --- | --- |
| U01 primitives | WGS84 extremes, (0,0), -0, numeric strings, partial pairs, wrong CRS, NaN/infinities, unsafe integers, bigint/string decoding, null/empty/missing, NUL/surrogates and character limits | Expected exact accept/reject outcomes, no silent coercion or fabricated defaults; I01 |
| U02 state/metadata | All four confirmation states and source combinations; provider/mapping/normalization pairs; confirmed actor; reason and bounds | Parity with actual SQL checks, stricter boundary validation identified separately; I02 |
| U03 serializers | Existing five fixture contracts; Unicode composition, whitespace/case/escapes/newlines, numeric exponent/precision/-0, explicit fields/order, all 17 semantics, timestamp lexical parity, generated outputs excluded, operation ID excluded from payload hash | Golden bytes and fixed SHA-256 expectations, independently check against legacy fixture without editing it; no object/JSONB ambiguity; I03 |
| U04 identity | Same property/op ID same payload; changed payload/actor/expected tokens; same op ID on another property; identical payload/new ID | Existing SQL key scope and typed conflict semantics; no global cross-property leakage; I03 |
| U05 provider normalization | Valid nonempty/empty, timeout, cancellation, 429, quota, auth/config failure, unavailable/invalid response, partial routes, radius/truncation/caps, UNKNOWN quality | NO_RESULTS never conflated with failure/known zero; source method/unit preserved; mocks only, I02 |
| U06 read applicability | ABSENT/inert NULL pointer, unconfirmed/review/cleared, confirmed with same/different hash, all seven input edits including project_name, financial-only edit, invalid pair/lineage, historical origin with newer pin | Pure deterministic output, no provider/database calls or mutation, no fallback to old/new pin, separate state dimensions; I04 |
| U07 transaction protocol | Reserve one connection, parent before state, exact ABSENT/revision/pointer, duplicate before fresh expected checks, server actor/hash fields, one CAS row, commit wait | Fake-driver transcript with injected errors at every stage; no success until actual outer commit completion; I05 |
| U08 commit/cleanup | Explicit COMMIT rejection, disconnect before/during/after acknowledgement, aborted tx ending as ROLLBACK, rollback/release/logging failures, deadlines | Known versus unknown outcome preserved; same-ID retry; clean release or discard, no leaked locks claimed from mock alone; I05/I06 |
| T01 type parity | Original Phase 1/foundation/location type projects, 44 preserved historical contracts, new domain insert/row mapping, generated geography write denial, no public history Update API | Strict compilation plus negative @ts-expect-error fixtures; new API types do not confer DB permissions; I02 |
| P01 real PostgreSQL | First/existing/inert state, append/version/pointer, exact CAS and no-op revision handling, numeric/timestamp round trip, overflow, immutable history, cross-property pointers | Real parameterized adapter on approved installed target, unchanged permanent guards/constraints; new portable evidence; I06 |
| P02 concurrency | Two first writers; two exact-state writers; same-ID duplicate; conflicting ID; parent address/ownership/delete races; independent financial edit | Actual blocking PIDs/lock waits before release, exactly one winner where appropriate, exact persisted history/revision/pointer and cleanup; sleeps alone insufficient; I06 |
| P03 rollback | Failure after state creation/append/pointer and real deferred constraint COMMIT rejection for both absent/existing state | Complete before/after history/state/time equality; true COMMIT failure test may use transaction-local deferred-FK fault, never disable permanent guards; I06 |
| P04 replay | Duplicate after newer pin, changed address, transfer/deletion; operation conflict; ambiguous commit recovery with same ID | No duplicate version/revision/repoint, authorized historical result only, no leaked original result to former/nonowner; I06 |
| S01 actual Auth | Two real synthetic sessions; missing/forged/expired/wrong project/issuer/audience/token class; spoofed actor; Auth outage; token expires while review waits | Approved local Auth+DB target and real verifier/driver, not fabricated claims or SET ROLE actors; before runtime activation |
| S02 authorization | Reciprocal cross-user/unfiltered/UUID reads; nonowner/anonymous/direct table mutation; changed owner; same-owner different-property pointer; privilege/RPC alternatives | Actual RLS/grants and trusted handler checks independently deny tampering; secrets never in browser; before exposure |
| S03 pool/runtime | TLS/identity, per-request actor isolation, two users concurrently, bounded acquisition, timeout/discard, backend affinity, no prepared/pipeline incompatibility | Actual selected Deno/driver/connection mode; no state leakage or orphan transaction; I06 |
| S04 logging/bundle | Addresses/JWTs/keys/DSN/tokens/coordinates/hashes in nested provider/driver/aggregate errors, DB details/APM and cleanup; server import graph | Sanitized output only; source/fresh-built browser scan, no SQL credentials/module in client graph; before exposure |
| G01 stale provider | Captured hash/state/request/owner with later address/pin/financial edit; tampered/replayed/expired receipt, transfer/deletion, edit-away/back | No silent retarget/rebase; pure financial edit does not invalidate; receipt lifecycle limitation honest; 2A-04 |
| G02 rights/failures | Permanent eligible fields, rejected temporary/ID-only/no-persistence data, registry withdrawal and field-policy revocation, provider timeout/quota/no match | No ingestion without review, no failure-as-zero or fabricated point, independent Phase 1 save; 2A-04 |
| R01 Phase 1 | Existing 1,073 cases and P01–P10 fixed expectations, financing/scenarios/scoring/confidence/risk/recommendation; app/fixture/database typechecks | No numerical/behavioral change. New location state/provider outcomes cannot change frozen engine results; every implementation slice |
| R02 build/security | `npm test`, relevant strict type projects, production build and rebuilt-browser security scan in later implementation | All required checks pass; any platform warnings/skips stated; no deployment implied |
| Q01 installation/platform | Entire seven-migration clean installation with separately provisioned PostGIS; incompatible extension/library/schema/role/attachments, actual deployment grants | Separately designated safe target and approval; no reset of accepted DB; 2A-06/deployment gate |
| Q02 cascades/history | Retain existing property/Auth cascade and history-delete denial evidence; rerun appropriate populated cases if new adapter/privilege path warrants | No weakening deferred FK or Phase 1 financial-child cascades; handler acceptance / release |
| B01 T15 | Eight browser cases below | Isolated synthetic frontend/API/Auth configuration and actual interactive results, before release |

T15-01 protected-route guard; T15-02 read-only dashboard; T15-03 missing/error states; T15-04 reciprocal cross-user reads; T15-05 signup/login/recovery/logout; T15-06 account switching/cache isolation; T15-07 property/financial CRUD/cascades; T15-08 desktop/mobile layout/navigation. All eight remain open from earlier acceptance. No synthetic test may launch the production-configured frontend against production Auth/data.

New tests must test behavior and failure boundaries, not merely mirror implementation or count source labels. SQL fixtures must be uniquely scoped, safety-preflighted, bounded and cleaned in finally; assert zero owned sessions/transactions and before/after catalog/data preservation. Do not run old empty-schema foundation/install workflows on the accepted installed 12-table database.

## 5. Current DESIGN-01 verification actually executed

| Check | Fresh result / qualification |
| --- | --- |
| Local Git branch, SHA, index/tree and checkpoint ancestry | Exact expected branch/HEAD, clean tracked tree/index; only original root report untracked at entry |
| Fresh GitHub branch read | Expected feature/main SHAs confirmed through approved read-only `git ls-remote`; no fetch/push |
| Phase 1 protected-source/original-migration comparison | Empty Git diffs against `v0.1-phase1` on protected paths |
| Foundation/location migration and generated-type hashes | Match checkpoint values recorded in architecture |
| `node node_modules/vitest/vitest.mjs run --no-cache` | **33 files / 1,073 PASS**, exit 0; normal existing app suite, no new proposed code tested |
| `node --test tests/phase2a02-contract.test.mjs tests/security.test.mjs` | Serializer **5 PASS**; source security **5 PASS**, built browser scan **1 SKIP**, exit 0; no rebuilt assets requested |
| `node node_modules/typescript/bin/tsc --noEmit` | PASS, no diagnostics |
| `node node_modules/typescript/bin/tsc -p tests/database-types/tsconfig.phase2a02.json` | PASS, no diagnostics; not a rerun of all five projects or all 44 historical equality checks |
| Database/real Auth/provider/browser/build | **NOT EXECUTED in DESIGN-01**; no schema/credentials/production/Docker access or mutation |

No existing report generator or database runner was invoked. Earlier 166 spatial assertions, TC01–TC14, cascade/COMMIT results, two observed location races, 44 type-contract parity checks and installation evidence remain **retained historical evidence**, not new passes. Their limitations and partial adversarial/clean-install coverage are unchanged. A successful source test does not establish production security or execution of document pseudocode.

## 6. Preconditions and blockers before implementation/exposure

1. Owner approves exact design decisions and separately authorizes selected slices. No implementation is authorized by completion of DESIGN-01.
2. Recheck branch/HEAD/index/existing file hashes before later work; preserve the preexisting root checkpoint report and every accepted evidence artifact. If code has moved, review drift first.
3. Freeze v1 golden preimages/digests and strict input validators before any real writer. No source-copy drift between Node and Deno; any future serializer version needs explicit storage compatibility.
4. Resolve P05 actual SQL login/credential authority and SET ROLE risk before adapter activation. No service key-as-password assumption or opportunistic grant. Current no-grant scope permits dormant core progress only until this is resolved.
5. Resolve P06 approved Auth/database target identity and generated/external client mismatch, then qualify selected Deno dependency/version/packaging/network/TLS/pool mode. No claim that current config proves a live Edge/PostgREST test service.
6. Prove real authenticated two-user verification, ownership/lock/CAS and commit/cleanup against the actual adapter before exposing a writer. Fake actors/mocked JWTs cannot close this gate.
7. Before live geocoding: explicit field rights, provider/candidate policies, secure receipt lifecycle, stale-result handling, revocation/privacy and budgets. The current registry snapshot guard cannot serialize withdrawal or guarantee contract terms.
8. Before endpoint activation: separately reviewed transport authorization, CSRF/origin/CORS as applicable, body/rate limits, error mapping, replay/receipt binding, secret/import/log/APM safeguards. No existing global TanStack middleware is automatically assumed to cover a new Edge endpoint.
9. Carry full clean-install/platform/adversarial/T15/build/browser-release gates forward. No reset/new Docker environment, migration execution, production access or deployment is inferred.

## 7. Review artifact inventory and preservation

Created working-tree artifacts only:

- `docs/PHASE2A_03_ARCHITECTURE_REVIEW.md`
- `docs/PHASE2A_03_INTERFACE_PROPOSAL.md`
- `docs/PHASE2A_03_TRANSACTION_DESIGN.md`
- `docs/PHASE2A_03_DECISION_REGISTER.md`
- `docs/PHASE2A_03_IMPLEMENTATION_READINESS.md`

Before writing these documents, a temporary external snapshot recorded SHA-256 for **361 preexisting nonignored files** (360 Git-tracked files plus the root untracked checkpoint report). Final comparison is required to match every entry with no missing file. Git-tracked/index diffs must remain empty; new nonignored paths must be precisely these five alongside the original report. Ignored dependency/cache/scratch environments are not staged or certified by that content snapshot.

Expected final porcelain status:

```text
?? PHASE2A_02_GIT_CHECKPOINT_REPORT.md
?? docs/PHASE2A_03_ARCHITECTURE_REVIEW.md
?? docs/PHASE2A_03_DECISION_REGISTER.md
?? docs/PHASE2A_03_IMPLEMENTATION_READINESS.md
?? docs/PHASE2A_03_INTERFACE_PROPOSAL.md
?? docs/PHASE2A_03_TRANSACTION_DESIGN.md
```

Branch/HEAD remain `phase2-location-intelligence` / `e000da794e44619f945597e83b004895e3854a71`. No existing file content is intentionally modified; no staging, migration, Docker change, commit, push or implementation is performed. Final verification results are appended to this newly created document only.

**Stop:** present the five documents for owner architecture review and await explicit approval/instruction. Do not begin 2A-03 implementation.

### DESIGN-01 final verification result

The preexisting-file snapshot comparison completed: **361 checked, zero changed, zero missing**. Final Git porcelain matched the six expected untracked paths above; tracked/index diffs were empty and branch/HEAD unchanged. All five document link-target, fenced-block pairing and trailing-whitespace checks passed. Exact property/operation/identity hash examples were calculated offline for the interface document; no new serializer source was created. No unexpected repository drift was found. The older local main and historical documentation qualifications are explicitly recorded, not altered.

Existing files changed: **none**. New files: **the five Markdown artifacts only**. No code implementation, migration execution, live provider/Auth/database operation, Docker mutation, Git commit or push occurred. The final state remains an architecture proposal awaiting owner review.
