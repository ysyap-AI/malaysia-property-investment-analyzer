# MPIA — Phase 2A-03 I06 implementation readiness

20 October 2026, Asia/Kuala_Lumpur. **I06-DESIGN-01 only. No adapter, verifier, endpoint or connectivity is implemented.**

**CONDITIONAL GO for a later narrowly scoped dormant qualification implementation after independent review, explicit owner decisions and a separate instruction. NO-GO for connecting now or exposing/deploying a writer.** P05 credential authority, P06 authenticated target consistency and G02 driver/runtime mapping remain OPEN. The accepted RELEASE-01 checkpoint is preserved.

Read the [architecture review](PHASE2A_03_I06_ARCHITECTURE_REVIEW.md) for evidence/candidates and the [security decision register](PHASE2A_03_I06_SECURITY_DECISION_REGISTER.md) for I06-D01–D10. Test cases below are **proposed future work**, not executed results.

## 1. Readiness by boundary

| Boundary | Verdict | Conditions |
| --- | --- | --- |
| Design deliverables | GO for independent review | Three requested documents; no runtime authority implied |
| Private verifier/adapter qualification source | CONDITIONAL GO, not currently authorized | Approve exact credential model, host/driver/version/mode, file/dependency changes, verifier/intent scope and test design; separate implementation instruction |
| Synthetic Auth+SQL execution | NO-GO now | Explicitly authorize exact nonproduction targets, real synthetic users, login/grants, fixture writes/faults/observer and cleanup. Pass preflight before any mutation |
| True least-privilege SQL identity | Design direction only | New role/grants/RLS/core setup and property-lock authority need separate security/schema approval; no disguised service membership |
| Supabase Edge hosting | Conditional alternative | Review automatically available admin credentials and whole-host blast radius; custom DSN alone is insufficient |
| Interactive endpoint / live provider | NO-GO | Separate transport, trusted receipts/field rights, abuse/CSRF/origin/rate limits, real-user isolation and bundle/logging gates |
| Production / main / deployment | NO-GO | All runtime and inherited clean-install/platform/adversarial/T15/operations/release gates; separate authorization |

The preferred first experiment is a private, locally invoked real-driver harness with one reserved client and a fixed approved synthetic Auth+DB pair. Existing I05 SQL can be preserved only under the explicitly approved service-role execution model. For eventual production, qualify an isolated host and a purpose-scoped identity or capability function. No forced driver/host fallback is permitted when qualification fails.

## 2. Staged verification program

Every stage records expected behavior before execution, exact source/core/migration/driver/runtime hashes or versions, target attestation, start/end UTC times, pass/fail/not-executed counts and cleanup outcomes. User-facing dates remain Asia/Kuala_Lumpur. Synthetic protocol tests, real PostgreSQL tests and real Auth tests must be reported separately; repeated/overlapping suites are not added together.

### Stage Q0 — Authorization and offline qualification

Approve I06-D01–D10 applicable to the named slice. Validate branch/HEAD/index and all preserved evidence before editing. Resolve dependency pinning/imports, host APIs, secret boundary and exact port mapping without loading credentials. Use the existing v1 serializers/core; prohibit duplicated Deno serializers and test-only command/actor passthroughs in runtime modules.

Review driver source for command counts/tags, raw microsecond decoding, own SQLSTATE mapping, notice/decoder logging, cancellation, close/reconnect and pool behavior. Type checks and module builds must use a newly approved private test entry, not an HTTP handler. Prove the actual intended bundler includes one authoritative core tree despite extensionless imports. Deno type checking alone does not prove Edge packaging. No production build/host configuration change is inferred.

**Exit:** approved manifest and exact file/dependency scope; offline tests of mapping and closed input/trust boundaries; no credentials or network calls. Unknown physical cancellation/eviction behavior remains explicitly E, not passed.

### Stage Q1 — Explicitly authorized target and privilege preflight

Only after separate authorization, attest primary synthetic Auth+SQL pair and a second wrong-project pair. Do not use the existing production-configured frontend/external target. An installed custom local database alone is not a functioning local Supabase Auth environment. Do not reset it, start another stack or provision users/roles implicitly.

Before fixture writes, validate fixed endpoint/TLS/project mapping and read-only catalog identity. Collect role attributes including LOGIN, BYPASSRLS, inheritance/SET/ADMIN reachability, object ownership, grants/default grants/PUBLIC EXECUTE, schema CREATE/USAGE, relevant RLS/guards/constraints and selected route mode. Confirm actual SQL login/session_user/current_user separately. Resolve current schema and accepted PostgreSQL/PostGIS prerequisites; stop on drift rather than running migrations. Catalog queries must not read password hashes, JWT secrets or unrelated Auth/session data.

Enforce an explicit local-test TLS exception only when approved for an isolated loopback/socket target; hosted/proxy verification requires TLS endpoint identity. No disabled certificate checks or plaintext fallback. Connection identities and secrets are never printed as complete DSNs.

**Exit:** target identity and effective privilege ceiling approved; baseline catalog/unrelated-data digest captured; bounded session/concurrency budget known; observer/cleanup capabilities tested without broadening runtime grants. A missing required grant fails preflight; it does not authorize GRANT.

### Stage Q2 — Real authentication and single-connection driver behavior

Create/use only separately authorized synthetic users A/B and sessions. Run T01/T02/T03 and the mapping/TLS/setup portions of T11 before authoritative fixture writes. No mocked claims, decoded-only JWT or SET ROLE actor is counted as real authentication. A driver that logs private decoding errors, loses microseconds, hides completion outcomes or cannot quarantine connections does not advance.

**Exit:** exact verifier matches issuer/audience/project/user/session policy, no forged actor path, target mismatch safely denied, and real driver setup/mapping/teardown behavior demonstrated.

### Stage Q3 — Atomicity, ownership, replay and real contention

Run T04–T08 on synthetic properties with permanent guards enabled. Use independent real connections and a test observer to capture blocking relationships and final persisted state; sleeps alone do not prove concurrency. Exercise both absent and existing/inert state. Auth verification occurs outside locks; ownership/input are checked after the parent lock.

**Exit:** append/CAS/replay behavior, rollback and true commit rejection conform to I05; no state/history leakage or stale rebase. Unknown-outcome experiments use only an authorized fault path.

### Stage Q4 — Cancellation, pool failure, host lifetime and logs

Run T09/T10/T12 using exact selected host/driver/route. Test at least one real forced transport failure and delayed completion; JS Promise races alone are insufficient. Observe actual transaction/session/lock cleanup. Review every permitted log/APM/database sink. Qualify direct/session mode first where possible; transaction-pooler/Hyperdrive behavior is a separate run identity.

**Exit:** no poisoned-client reuse, alias ownership violation, privacy leak, unbounded active transaction or false COMMIT certainty; bounded cleanup under host cancellation/process loss.

### Stage Q5 — Independent acceptance and later exposure gates

Repeat relevant existing regressions/type projects; rebuild/browser-scan in the later authorized implementation scope; verify original sources/evidence remain intact. Independent review evaluates failures and NOT_EXECUTED cells. No single total substitutes for P05/P06/G02 evidence. Release also retains seven-migration clean installation, exact platform/adversarial matrix and all eight T15 browser cases. A private runner passing does not authorize a route or deployment.

## 3. Required qualification test matrix

All T01–T12 are currently **NOT EXECUTED for I06**. Each test uses authorized synthetic data only, records before/after state and asserts cleanup. Expected application failure is a test pass only when absence of unauthorized mutation/leak is also demonstrated.

| ID / stage | Test design | Required observable result |
| --- | --- | --- |
| T01 trusted Auth / Q2 | Valid A/B access tokens; missing/malformed/multiple Bearer, alg none, forged signature, arbitrary sub, wrong issuer/audience/project, expired/future/nbf, anonymous and service/API token classes; key rotation/unknown kid; Auth/JWKS outage | Only verified permitted user sessions yield actor; returned getUser id equals verified sub; explicit policy checks pass. Denials/outages cause no write reservation. No token/header/error leak. Signing legitimate malformed-policy tokens requires separately authorized synthetic signer; absent that, mark those cells NOT_EXECUTED rather than pretending unsigned tokens prove claim-policy enforcement |
| T01R revocation / Q2 | Real sign-out/local/global logout/session removal, refresh revocation, deleted/disabled user, configured lifetime/inactivity, signing-key revocation; reuse old access token. Reverify after long review/acquire delay and before a new attempt | Revoked session known at admission denied. Document actual service semantics and propagation bound. JWT-only success cannot close this case. If online liveness does not enforce required policy, stop P06 and design a narrow oracle separately. Record race with already admitted transaction as residual; do not claim instantaneous cancellation |
| T02 two-user ownership / Q2–Q3 | A/B own separate properties. Reciprocal writes/replay/status reads, random/known IDs, unfiltered browser SELECT, anonymous/direct history/state mutations. Transfer/delete before acquisition and while rival waits; explicit spoofed actor/confirmed_by fields | Trusted actor derived only from verifier; actual locked owner governs. Nonowner sees no version/owner/address. Browser RLS and grants independently enforce read/write policy. New owner cannot replay former actor's operation. No cross-property pointer, including two properties of same owner |
| T03 same/wrong project / Q2 | Project-A bearer + correct A target; A bearer + separately authorized B SQL target; wrong Auth origin/key; swapped pooler project routing/secret/binding; overlapping UUIDs. Bad CA, hostname and forbidden plaintext | Manifest/control-plane mapping and TLS identity reject mismatch before location DML; schema/user UUID/name coincidence never accepts. No probing arbitrary caller DSNs. Both projects explicitly authorized. No host fallback to ambient SUPABASE_DB_URL |
| T04 append-only/CAS / Q3 | First ABSENT, existing inert revision0/null, exact pointer/revision, stale revision/pointer, no-op state UPDATE semantics; maximum revision/version; malformed/generated geography; raw history UPDATE/DELETE/TRUNCATE and forbidden state/property fields | First write version1/revision1; later contiguous version under lock, one exact CAS row, generated times/point validated. Stale/overflow rolls back fully. No update/delete history escape; permanent constraints/guards unchanged. Restrictive role test also measures granted parent-lock column mutation exposure |
| T05 duplicates / Q3 | Identical same-ID retry; changed any semantic field/actor/expected/receipt spelling; old operation after newer pin; changed saved input; same op ID on different property and same payload under new ID | Exact duplicate returns original row and current observed state without append/revision/time/repoint. Conflict denies changed payload; current owner/input precedence retained. Same ID is property-scoped. New ID remains a new command requiring exact current expected state |
| T06 concurrent operations / Q3 | Two first writers; two new writes with same exact state; simultaneous identical-ID replay; conflicting same ID; address edit/financial-only edit/transfer/delete races. Independent properties run concurrently | Observer records real wait/blocking backend relationship before controlled release. One new-operation winner; loser stale/conflict as applicable; same-ID twin returns duplicate without second version. Parent-first order; current fingerprint/ownership after wait. Independent property progress demonstrated; deadlock known-abort handling preserves original command |
| T07 unknown COMMIT / Q3–Q4 | Authorized fault relay or equivalent loses reply after server commit; separate loss before acceptance; connection loss/cancel during commit; process death. Observer establishes actual persisted ground truth. Retry unchanged frozen envelope on a new verified connection | Core returns COMMIT_OUTCOME_UNKNOWN without rollback claim, quarantines old client. Same-ID retry yields DUPLICATE or CREATED correctly; never fresh ID/double append. Known acknowledgement followed by release/log error stays committed. No test invokes a second command until disposition/serialization is understood |
| T07R changed-state reconciliation / Q3 | After unknown commit, change address/newer pin; transfer/delete separately. Private current-owner-authorized read of original property/operation with actor binding on a coherent snapshot | Changed-input execution remains INPUT_CHANGED. Read can identify original historical row without republishing or claiming current eligibility; no invented original revision. Transfer/deletion yields unavailable without leakage. Absence after deletion is not “never committed.” This requires separate private reader scope approval; otherwise leave this gate open |
| T08 rollback/deferred FK / Q3 | Fail after inert state creation, after append and after pointer CAS; genuine deferred FK error at COMMIT for absent/existing state. Aborted transaction followed by COMMIT producing ROLLBACK tag | Full before/after history/state/pointer/revision/timestamps equal on known abort; real server `23503` normalized to REJECTED, explicit ROLLBACK tag to ROLLED_BACK. No provisional success. Permanent pointer/history guards remain enabled |
| T09 query cancellation/timeouts / Q4 | Real blocked parent lock, long query, statement/lock/idle timeout; acquire timeout with late client; client abort at parent/append/CAS/commit; rollback timeout; host process/isolate termination | Actual SQL/session and locks disappear within approved bound, or hard stop/incident if not. Precommit uncertain work discarded; COMMIT-dispatch uncertainty remains UNKNOWN. Cancel never reaches next borrower. No privileged backend termination feature in runtime |
| T10 reservation/quarantine / Q4 | Real pool size1 and size2; concurrent A/B; two wrappers alias one physical client; release failure/timeout and late callback; failed/delayed discard; socket replacement; automatic reconnect attempt; warm-instance reuse | One invocation owns physical generation through cleanup; foreign alias sends no SQL/rollback/release/discard. Quarantined generation never reusable even with new wrapper. Clean reuse resets local role/path/timeouts and user context; new actor isolated. No hidden transaction on reconnected backend |
| T11 result/type mapping / Q2–Q4 | Inspect actual command tag/count for BEGIN, each SET, SELECT 0/1, INSERT/CAS RETURNING 0/1, COMMIT/ROLLBACK/rejection. Bigint bounds, binary64 coordinates, booleans/arrays, null; UTC .000001/.123456, equivalent offsets, dates/infinity limits | Setup normalized exactly empty/0 only on expected successful tags. DML counts cannot be fabricated. Exact safe integers and coordinate values; timestamp microseconds retained before Date; original receipt preimage untouched. Invalid decode is sanitized failure, never null/default. Real tag outcomes include no-success aborted COMMIT |
| T12 diagnostic/log redaction / Q2–Q4 | Inject unique synthetic canaries into SQL binds, constraint detail, decoder errors/notices, Auth HTTP errors, nested/aggregate causes, DSN, headers, pool/acquire/cleanup failures; inspect runtime console/APM, DB/proxy logs, test output and browser bundle | Only diagnosticId/stage/outcome/certainty/cleanup/allowlisted SQLSTATE escape to ordinary diagnostics. No JWT/DSN/address/coordinate/receipt/hash/private IDs/raw query/rows/error in any inspected sink. Sink failure does not change known commit. Uninspectable sink is NOT_VERIFIED and blocks exposure |

T08 method: plan a session-local temporary deferred-FK fault after normal core work and before COMMIT through the **private test adapter wrapper**, so permanent guards remain active and accepted core need not change. Do not disable triggers, replace the permanent FK or create persistent fault objects. TEMP capability and fault insertion require explicit test authorization; if unavailable, stop that cell rather than adding a runtime grant. The test must prove an actual server COMMIT rejection and complete rollback, not simply throw a fake adapter exception. Temporary objects must disappear on rollback/session close.

T07 method: fault injection must distinguish “acknowledgement deliberately hidden” from a genuine broken transport. Include both a deterministic delivery-boundary test and an actual authorized network/process interruption, with independent persisted-state observation. The runtime cannot use the observer's omniscience to classify an otherwise unknown result. Never terminate an unrelated backend or alter a production network.

## 4. Isolation, cleanup and stop conditions

### Target and fixture isolation

Use a new unique run ID/application_name and explicitly scoped synthetic user/property/operation UUID set, bounded fixture counts and fixed test address/pin text. Do not reuse evidence-era hard-coded IDs without collision checks. Keep the mutation allowlist and target fingerprint immutable for the run. Two-user cases require real synthetic Auth sessions; do not relabel SQL-set actors as authenticated users.

An authorized installed target can hold protected baseline data; record digest/counts/catalog before changes. Use disposable transactions when persistence is unnecessary. True COMMIT/replay/concurrency tests need committed synthetic fixtures and explicit later cleanup. A separate observer/fixture controller may have preapproved extra rights, but runtime credentials must never inherit them. Reject unexpected existing fixture IDs before deleting anything.

Existing 2A-01/02 runners are historical evidence sources. They can pin older HEADs, overwrite accepted JSON, require empty schemas or mutate fixtures; do not invoke them as the I06 runner. Any new runner/artifact paths must be separately approved and distinct from accepted reports/manifests. This design task creates no runner or raw log file.

### Cleanup algorithm for later tests

1. Stop admitting cases on the first unsafe condition; retain in-memory outcome/identities and sanitize diagnostics. Give each owned connection its independent bounded cleanup budget; quarantine uncertain generations before close.
2. Await rollback on usable precommit sessions; discard uncertain/in-flight/failed cleanup clients. For acknowledged COMMIT, preserve committed outcome and then close. Observer checks no run-owned active or idle-in-transaction session/lock remains. A diagnosticId does not by itself prove backend ownership.
3. Resolve or record every unknown commit before fixture deletion so cleanup cannot erase reconciliation evidence. Use an authorized current-owner read/observer; no unauthorized access after transfer. If certainty cannot be established, report UNKNOWN and stop dependent mutation.
4. Delete only recorded run-owned parent properties through the approved cleanup identity; rely on accepted cascades for history/state and financial children. Do not directly delete immutable history or disable guards. Remove synthetic Auth users/sessions only when created by this run and authorized; reverse only explicitly recorded transfers.
5. Ensure temporary fault objects disappear, run-owned sessions are zero and all catalog/role/policy/guard/extension/unrelated-data digests match baseline. If a separately approved role/provisioning experiment changed catalog, compare against its explicitly approved delta and revoke/drain that test identity under operator authority; never normalize unexplained drift into a new baseline.
6. Verify no private values reached outputs; retain authorized sanitized evidence with source/target identity and before/after preservation results. Cleanup failure is a failed gate, not a warning hidden behind successful functional cases.

Backend termination, credential revocation and fixture deletion require the previously approved operator scope. If cleanup cannot finish with that scope, stop, disable the test writer and report exact owned resources for operator handling. Do not obtain new privileges or broaden deletion predicates automatically.

### Hard stops

- Wrong branch/HEAD or unexpected existing-file/index drift; target/project/TLS mismatch; unexpected non-synthetic data/fixture collision.
- Unapproved credentials/role, reachable admin authority beyond selected ceiling, unexpected RLS/grant/guard/schema/platform change, or a missing required permission.
- Forged/expired/revoked/wrong-project acceptance, cross-user disclosure/mutation or caller-selected actor/provenance reaching the trusted builder.
- Success before acknowledged COMMIT, unknown converted to rollback/success without evidence, extra history/revision/repoint, stale-token rebase or fresh-ID recovery.
- Private logging, lossy integer/timestamp/coordinate mapping, unsupported result/tag normalization or protocol multi-result ambiguity.
- Unbounded SQL/cleanup, orphan transaction/lock, physical alias reuse, late cancellation affecting another borrower, failed quarantine/eviction or unexpected automatic reconnect.
- Need to install/provision/deploy/change SQL/roles/RLS beyond the named approval. Preserve evidence; report the affected gate. No workaround through postgres, disabled TLS, disabled guards or broader grants.

A fail-closed negative result expected by a case is not a hard stop if all preservation/cleanup assertions pass. An unexplained acceptance, leak or cleanup failure is. A runtime candidate can fail while the accepted dormant core remains intact.

## 5. Proposed implementation slices and file boundaries

Paths here are **future proposals**, not files created now. Existing source/SQL/tests remain byte-identical in this review. A future instruction must explicitly name permitted modifications and dependency manifests; historical DESIGN-01 file suggestions do not supply installation authority.

| Slice | Proposed scope / files | Entry and acceptance |
| --- | --- | --- |
| I06-A: private target/verifier | New `src/server/location/auth.server.ts`, optionally `target.server.ts`; new private auth/target tests | D03–D05/D10, exact SDK/dependency scope. Fixed target, explicit claims/liveness, no configured live writer or route; never modify current generated Auth files |
| I06-B: real driver boundary | New selected adapter, e.g. `src/server/location/postgres.server.ts` for Node or `supabase/functions/_shared/location-postgres.ts` for Deno; exact approved new test/runtime manifests/locks | D01/D03/D06/D07/D09. Implement existing ReservedConnection contract without changing I05 SQL. New dependencies only under separate approval; no `index.ts`, route or deploy |
| I06-C: private manual-intent qualification builder | New test-harness builder and boundary tests, outside app/browser graph | D08. Real verified actor, captured expected/input binding, allowlisted synthetic manual intent, provider denied; no production receipt workflow |
| I06-D: bounded integration runner | New `tests/run-phase2a03-transactions.mjs` or approved runtime-specific runner, `tests/phase2a03/README.md`, new distinct evidence paths | D05/D09/D10 and explicit Auth/DB/fixture/fault permission. Q1–Q4/T01–T12, real connections, independent cleanup evidence |
| I06-E: private reconciliation observation | New server-private reader plus tests, only if explicitly included | D08. Current-owner/coherent snapshot, original actor/hash binding, historical-only output and transfer/delete denial. No endpoint, repoint or persisted response ledger |
| Separate security slice: least privilege/function | Additive migration/provisioning plan and narrowly named SQL/core/test changes | D02 plus dedicated security approval; not folded into B/D when a grant is missing. Preserve historical migrations and v1 semantics |
| Separate host/transport work | Future Worker binding/packaging or Edge deployment entry and auth transport | Exact platform/secret/endpoint approval and applicable security gates. No assumption current Lovable host supports TCP or a new handler inherits CSRF |

Sequence: independent design decision → offline A/B/C preparation → explicitly approved Q1/Q2 → Q3/Q4 → independent acceptance. Stop between slices when an unapproved dependency/host/SQL change becomes necessary. P05/P06/G02 may be closed only to the specific proven credential/host/driver/route/target version; production changes require requalification.

## 6. Fresh verification performed in I06-DESIGN-01

Read-only local inspection and current official documentation research were performed. No database/Auth/provider endpoint was contacted, no Docker command was run, no secret/environment file was read, and no dependency was installed. The following offline existing suites ran against unchanged source using existing binaries:

| Command / check | Fresh result |
| --- | --- |
| `node node_modules/vitest/vitest.mjs run --no-cache` | Exit 0; **39 files, 1,472 passed**, zero failed/skipped |
| `node --test tests/phase2a02-contract.test.mjs tests/security.test.mjs` | Exit 0; **10 passed, 1 skipped**: five serializer and five source-security passes; built-browser scan skipped without designated rebuilt root |
| `node node_modules/typescript/bin/tsc --noEmit` | Exit 0; no diagnostics |
| Git branch/HEAD/tracked/index inspection | Exact expected feature branch/HEAD; empty tracked and staged diffs |
| Existing-file SHA-256 preservation | 405 existing files match retained closure/checkpoint/RELEASE-01 raw hashes; zero mismatches or missing files |

These are regression/source checks, not P05/P06/G02 closure. Full seven type projects, production rebuild/browser assets, real PostgreSQL/Auth/concurrency/cancellation/pool/TLS/log-sink tests, Edge/Worker packaging and T15 were **not executed in this review**. Building would generate additional artifacts; this documentation-only task retains RELEASE-01's build evidence without relabeling it fresh. No old database/report generator was invoked and no historical results were overwritten.

The initial exploratory search mentioned a nonexistent root `server` directory; actual source is `src/server`. One evidence read used a nonexistent `tests/phase2a02-transaction-results.json`; the correct existing `docs/` evidence was then inspected. Both were read-only path misses and changed no files. They are not runtime test failures or hidden database attempts.

## 7. Final artifact and stop record

Created only:

- `docs/PHASE2A_03_I06_ARCHITECTURE_REVIEW.md`
- `docs/PHASE2A_03_I06_SECURITY_DECISION_REGISTER.md`
- `docs/PHASE2A_03_I06_IMPLEMENTATION_READINESS.md`

No existing file is changed. The three preexisting RELEASE-01 artifacts remain untracked and unchanged. Final verification independently combined the closure preservation hashes, RELEASE-01's 42-file checkpoint hashes and its existing local `final-validation.json` artifact receipt: **405 existing files checked, zero mismatches, zero missing**. The closure manifest matches the receipt's external digest anchor. These are retained local evidence anchors, not cryptographically signed external attestations. This check does not depend on retaining an in-memory entry snapshot across the resumed conversation.

Exactly the three I06 documents are new nonignored paths. All local Markdown link targets exist, fences pair and trailing-whitespace checks pass. Tracked/index diffs remain empty; branch/HEAD and local main remain at their baseline values. No remote ref query or Git write was performed. Ignored dependency/build/scratch directories are not certified as an exhaustive host snapshot.

RELEASE-01 artifact hashes remain:

| Preserved artifact | SHA-256 |
| --- | --- |
| Checkpoint report | `967977db69c3c58b91fc244519c968f876a2eb7b840b3769b4307b1f36bd40dd` |
| Checkpoint checklist | `3cab692e0f54a4baf5a9ba801e8154949a9405817198e26adfe6cf2ddaa8845a` |
| Git results JSON | `5494458e4dc7ab8894838372eeaefe2488eb64530c3d6627108482e0ddecb077` |

**Stop after these documents. Await independent review and explicit owner approval/instruction before real connectivity or implementation.** No stage, commit, push, merge, rebase, main update, migration, credential provisioning, role/grant/RLS change, endpoint, deployment or application/test modification is performed.
