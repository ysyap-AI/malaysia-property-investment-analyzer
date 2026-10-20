# MPIA — I06 decision and approval matrix

20 October 2026, Asia/Kuala_Lumpur. **PROPOSED / AWAITING OWNER REVIEW for every I06-D01–D10 decision.** This task authorizes only the three preflight documents. No decision in this file approves implementation, credentials, target access, SQL changes, deployment or Git writes.

Read the [security preflight](PHASE2A_03_I06_SECURITY_PREFLIGHT_REPORT.md) for inspected SQL/authority/Auth evidence and the [option comparison](PHASE2A_03_I06_OPTION_COMPARISON.md) for host/driver and A-versus-D details. F/H/V/P/U retain the evidence meanings defined in the report. Recommendations below are P, supported by those cited facts and sources; missing target evidence stays U.

**Owner-review recommendation:** approve the D design direction and isolated Node reference candidate only as planning choices; separately consider the four-file offline admission-policy slice. Defer SQL executor/function coding until the gateway-trust boundary and v1 locked-fingerprint method are explicitly settled. Keep all actual connectivity and production activation unapproved.

## 1. Decisions I06-D01–D10

### I06-D01 — Credential ceiling and P05

- **Recommended selection:** D execute-only runtime login plus dedicated narrowly privileged nonlogin function owner. No service_role/authenticator/admin membership, object ownership or project-admin secret in runtime. Runtime identity and migration/operator identities remain separate.
- **Rationale:** A's narrow raw grants still permit protocol bypass. D can make only the approved operation reachable and hide the parent's lock-enabling privilege from caller SQL.
- **Security trade-off:** compromised caller can still invoke allowed operations and impersonate gateway-supplied actors unless independent attestation is added. Do not label this human identity proof. Owner must explicitly accept that gateway trust boundary or defer D pending stronger identity design.
- **Alternative rejected/deferred:** reject postgres/admin bootstrap. B is deferred to separately approved synthetic bridge testing only, with broad service-role risk; it is not the default. A remains a reduced-grant alternative only with explicit raw-location-write risk acceptance.
- **Accepted I05 SQL change:** no change now. Production D needs a new executor; cannot run literal SET service_role under execute-only login. Preserve I05 as reference.
- **New migration/provisioning:** yes later for D roles/ACL/RLS/function ownership; no password values in migrations. Exact files and operator actions need separate approval.
- **Real target/credentials:** unnecessary to approve direction; necessary to certify actual role/host ceiling, memberships/PUBLIC exposure and enforcement.
- **Approval before offline coding:** D01 selection needed for writer/adapter implementation. Four-file policy-only slice may proceed after its own scope approval without provisioning or assuming D's existence.
- **Approval before any actual connection:** explicit D01 identity ceiling and target/secret-reference/operator authority plus D03–D10 applicable gates. Never infer from planning approval.

### I06-D02 — SQL model, parent locks and function protocol

- **Recommended selection:** conditional D with direct SQL invocation and explicit outer transaction; a new private executor rather than SQL-text interception in I05. Before coding SQL, approve a non-executable interface/parity specification covering locked-property fingerprint and operation bytes, identity source and full algorithm.
- **Rationale:** exact raw A grant changes can support locking/RLS but cannot force expected-state predicates, atomic append/publish or real actor verification. New lock-only RLS may prevent P mutation, so the lock requirement alone is not a proof of impossibility.
- **Security trade-off:** definer implementation is a new high-value boundary; its owner must be nonlogin/non-BYPASSRLS/non-table-owner, caller-unreachable and narrowly granted. Defects/overloads/unsafe paths can undermine it. Raw actor input from a stolen execute caller remains a declared trust limit.
- **Alternative rejected/deferred:** no elevation of accepted invoker guards, no financial UPDATE grant, no skipped parent lock, no generic JSON writer. A's owner-scoped UPDATE USING/false WITH CHECK design may be tested only if owner elects A. No assumption that SQL JSONB matches JavaScript serialization.
- **Accepted I05 SQL change:** D replaces execution sequence in a new explicitly approved path; accepted file remains untouched. A would require literal role/context setup changes. Both require a D06 architecture-model decision; neither is a drop-in driver adapter.
- **New migration/provisioning:** yes later, additive reviewed schema/function/EXECUTE/owner policies/data rights. Existing seven migrations unchanged.
- **Real target/credentials:** no for design/golden-vector planning; yes for real privilege/RLS/PostGIS/locking/COMMIT parity qualification and catalog safety.
- **Approval before offline coding:** D02 approval plus completed parity/interface design is required for any executor/function/SQL harness code. Four-file admission policy is independent and does not close D02.
- **Approval before any actual connection:** separate target qualification authority; migration/provisioning execution additionally needs its own explicit scope. A design approval is not permission to run DDL.

### I06-D03 — Secret-isolated host

- **Recommended selection:** isolated private Node service for reference and provisional deployment, injecting only chosen restricted SQL authority and fixed public Auth configuration. Existing Lovable application remains separate.
- **Rationale:** direct sockets give a clearer disposal/affinity qualification boundary. Current repository's fetch/Cloudflare-default build does not establish an isolated Node SQL service. Edge default secret scope conflicts with the desired ceiling. See vendor-linked comparison; no actual deployed secrets inspected.
- **Security trade-off:** another private service/package and operator responsibility. Whole-process/code compromise still reaches its permitted SQL capability; function/policy safeguards and no-admin secret inventory matter.
- **Alternative rejected/deferred:** dedicated Worker/pg/Hyperdrive after origin disposal/cache/TLS/capacity proof. Supabase Edge/Deno deferred until stronger default credentials are demonstrably absent or wider compromise risk is separately accepted. No inferred platform feature removes them.
- **Accepted I05 SQL change:** none solely from host selection; D02 controls executor changes.
- **New migration/provisioning:** no host-only DB migration; later service/bindings/package/infrastructure configuration needs named approval.
- **Real target/credentials:** no for choice; actual environment capability inventory, TLS/network and operational qualification need authorized deployment/target evidence.
- **Approval before offline coding:** D03 intent sufficient for independent admission policy; actual Node/Worker/Deno packaging requires separate exact files/config authority.
- **Approval before any actual connection:** approved host/environment, secret capability ceiling and fixed target route; creating Hyperdrive configuration counts as connection activity because vendor creation attempts a target connection.

### I06-D04 — Fixed-project private Auth and revocation

- **Recommended selection:** signed-token verification plus explicit issuer/audience/role/nonanonymous-user/time/session policy, fresh online getUser on same bearer and qualified session-liveness evidence. Locked current property ownership follows admission; no Auth I/O under SQL locks.
- **Rationale:** current claims middleware and structural actor branding do not implement this policy. Signed claims alone cannot detect all revoked sessions; online behavior must be proved on selected Auth service.
- **Security trade-off:** Auth outage fails closed. Propose 30s future-iat/nbf skew, zero expiry grace, 15s remaining token lifetime with current 2s acquire/8s transaction budgets. These are candidate policy numbers, not measured guarantees. Revocation racing already admitted work may not stop its commit.
- **Alternative rejected/deferred:** decoded-only token/getSession, caller actor, arbitrary JWKS URL, shared mutable Auth header, admin getUser bypass, broad auth.sessions read and expiry-only fallback. If getUser lacks required liveness semantics, stop for a separately reviewed narrow oracle.
- **Accepted I05 SQL change:** none for admission policy/ActorVerifierPort. Keep exact three-field actor and hash bytes. Stronger SQL-side assertion or freshness checkpoints need D02 review.
- **New migration/provisioning:** none for offline policy; possible separately approved oracle/assertion design only if live evidence requires it.
- **Real target/credentials:** none for deterministic mocks; real synthetic bearer sessions/public Auth configuration needed to close signature, liveness, revocation and wrong-project tests.
- **Approval before offline coding:** explicit D04 policy and four-file scope, including numeric defaults or owner-selected alternatives. Signature/online/liveness ports remain mocks; no claims that mocked evidence is real authentication.
- **Approval before any actual connection:** exact Auth project, algorithms/key source, user/session authority and revocation experiments. An HTTP getUser/JWKS request is actual connectivity and remains prohibited now.

### I06-D05 — Target binding and permitted environments

- **Recommended selection:** one immutable server-owned manifest binds environment/project, fixed Auth issuer/key source/audience and SQL endpoint/database/login/mode/TLS/secret-version reference. Operator/control-plane attestation connects Auth and SQL identity; later read-only probes support it.
- **Rationale:** schema/database-name/user UUID/static config coincidence cannot prove same project. Existing external frontend target is not automatically an authorized synthetic target; historical local PostgreSQL is not proof of local Auth availability.
- **Security trade-off:** no convenient dynamic targets or ambient fallback; manifest changes trigger review/requalification. Test wrong-project binding only on separately authorized environments.
- **Alternative rejected/deferred:** browser DSN/actor/issuer selectors; production-configured frontend for synthetic tests; probing arbitrary endpoints; starting/resetting a local stack implicitly.
- **Accepted I05 SQL change:** none for manifest/admission validation. SQL route attestation/probes live outside accepted core; D path specified separately.
- **New migration/provisioning:** none for manifest itself; no target marker table assumed. New fixtures/users/roles need separate authority.
- **Real target/credentials:** none for synthetic manifest tests. To close P06, name primary Auth+SQL pair and second authorized wrong-project pair with operator/project mapping. Missing second target leaves that live cell NOT EXECUTED.
- **Approval before offline coding:** approve manifest schema, fixed configuration injection and fake .invalid test target only, without actual DSNs/credentials.
- **Approval before any actual connection:** exact environment/host/route/secret reference, allowlisted read-only probes, fixture/fault boundaries and cleanup custodian; no secret values in approval document.

### I06-D06 — Driver/host/route candidate and G02

- **Recommended selection:** exact candidate Node v24.18.0 + pure-JS pg@8.16.3, direct TLS, standalone per-attempt client with bounded harness concurrency. Same model is provisional deployment candidate; provider/region/runtime patch/locked dependency tree still unselected.
- **Rationale:** reviewed documented transaction/result/end interfaces and versioned source make it a concrete reference candidate. It is neither newest-version nor security/support endorsement. Pin full dependency tree/integrity later; pg's own package uses transitive ranges.
- **Security trade-off:** separate runtime and lifecycle code to qualify. Installed Node availability does not prove package compatibility, safe force-close or deployment behavior.
- **Alternative rejected/deferred:** no automatic fallback to service-role/admin, different pooler/driver, Postgres.js/ORM or HTTP SQL. Hyperdrive is a distinct route requiring separate qualification even with same pg.
- **Accepted I05 SQL change:** no driver-only change; D02 selects new execution path. Real unchanged-I05 testing via B needs separate explicit bridge permission.
- **New migration/provisioning:** none from driver choice; D01/D02 capability setup separate. New package/lock/build files require individually named approval; no dependency installation in offline four-file slice.
- **Real target/credentials:** no for candidate review. G02 closure requires selected direct/pooler target plus actual tags/type/TLS/physical lifecycle tests.
- **Approval before offline coding:** no pg implementation until exact source/test/package/lock scope, transitive/security review and APIs are approved. Admission-only slice needs no new driver.
- **Approval before any actual connection:** driver/runtime/route identity, permitted test calls and stop criteria; candidate selection alone supplies no network authority.

### I06-D07 — Completion mapping, cancellation and physical ownership

- **Recommended selection:** preserve accepted result/certainty contract. Quarantine physical generation synchronously; use invocation-owned public close APIs, bounded independent cleanup and no partial-transaction reconnect. Command-only counts normalize only after expected successful tag; exact RETURNING counts, int8/binary64/microsecond decoding required.
- **Rationale:** I05's fixed ownership guards are accepted; wrapper object identity is not socket eviction evidence. pg query_timeout alone does not cancel server work. Function return alone is not COMMIT.
- **Security trade-off:** uncertain sockets are discarded, increasing connection churn. Prefer a controlled rejection to success with unknown persistence; no application-level automatic retries.
- **Alternative rejected/deferred:** blanket null/NaN count coercion, Date-first timestamps, Promise-race-as-cancel, driver-private socket hacks and arbitrary backend termination privilege. If public bounded cleanup fails, reject candidate or redesign separately.
- **Accepted I05 SQL change:** none to its certainty logic/port. A/D setup/executor changes governed by D02; no weakening assertions for driver defaults.
- **New migration/provisioning:** no mapping migration; any server-side timeout policy/role limits require separately named operator authority.
- **Real target/credentials:** not needed to specify synthetic mappings; essential for real cancellation/affinity, genuine deferred rejection, late cleanup and lost-COMMIT tests.
- **Approval before offline coding:** named adapter files/APIs/tests later, preserving contracts; no adapter in four-file admission slice.
- **Approval before any actual connection:** approve budgets, concurrency, fault/observer scope and no-orphan cleanup criteria. Current budgets remain provisional; do not extend silently to pass.

### I06-D08 — Trusted construction, serialization and reconciliation

- **Recommended selection:** retain one authoritative TypeScript v1 serializer; approve manual synthetic intent only for first future runtime tests, derived actor fields and no provider bypass. Preserve original operation ID, expected tokens/input and receipt bytes across retry. Separately design a current-owner-authorized historical observation for unknown commits if required.
- **Rationale:** valid command shape/hash is not user authorization or provenance. Duplicate checks cannot become a way to bypass current owner/input. D's locked-fingerprint method must be proved before SQL implementation.
- **Security trade-off:** recovery may report unavailable after input change/transfer/deletion; no false certainty or old-pin publication. D parity work costs more than raw A adaptation.
- **Alternative rejected/deferred:** browser TrustedLocationCommand passthrough, fabricated provider rights, fresh-ID recovery, automatic rebase and JSONB rehash. Live provider/receipt/confirmation transport remains later scope.
- **Accepted I05 SQL change:** none now; D needs separately approved executor/parity method. Do not add session/transport fields to v1 preimage or actor shape.
- **New migration/provisioning:** D capability migration later; historical reader signature/ACL only if explicitly approved. No response ledger or audit table assumed.
- **Real target/credentials:** no for existing golden vectors/mock admission-to-builder compatibility. Yes for real unknown-outcome ground truth, changed-input reconciliation and transfer/deletion privacy.
- **Approval before offline coding:** four-file scope permits compatibility tests using existing builder/serializer and explicitly synthetic trusted mocks only; production builder, reader and executor require further named scope.
- **Approval before any actual connection:** exact synthetic intent/fixture/operation and observation/fault/cleanup allowlist. Missing history after cascade must not be labeled never committed.

### I06-D09 — Secret lifecycle, logs and incident operations

- **Recommended selection:** per-environment restricted secret binding, public Auth config, no admin fallback; operator-controlled rotate/switch/drain/revoke/terminate lifecycle. Closed allowlisted diagnostics across all sinks; no raw JWT/DSN/SQL/parameters/errors/private identifiers/addresses/coordinates/receipts/hashes in ordinary logs.
- **Rationale:** runtime compromise scope includes every reachable credential, not just the DSN chosen in code. Revoking a password/NOLOGIN does not prove established sessions stopped; existing raw SSR logging is not an acceptable new writer sink.
- **Security trade-off:** more explicit operational controls and constrained debugging. Separate operator may inspect run-owned sessions/terminate them under approval; writer gains no backend administration.
- **Alternative rejected/deferred:** VITE/private keys in source/fixtures, secret enumeration, credentials in logs, raw driver error fallbacks and rotation without draining. No new logging vendor/table installed.
- **Accepted I05 SQL change:** none; keep diagnostics projection and acknowledged-COMMIT outcome after logging/release failure.
- **New migration/provisioning:** none for policy-only code; runtime secret/role connection-limit/revocation operations later need explicit provisioning authority.
- **Real target/credentials:** none for offline canary denial tests. Actual binding capability inventory without values, sink inspection, rotation and active-session revocation need authorized target/host access.
- **Approval before offline coding:** approve mock failure sanitization and four-file scope. Future adapters must name every sink/notice handler; do not import generated admin/logger modules.
- **Approval before any actual connection:** operator/custodian, incident disable, maximum sessions/overlap, sanitized evidence retention and cleanup authority. Unbounded orphan lock or private log leak stops run.

### I06-D10 — Slice authorization, acceptance and release stop

- **Recommended selection:** approve only explicitly named slices independently. First possible code slice is four new files below. Then stop; no migration/driver/connection/endpoint follows automatically.
- **Rationale:** policy preparation remains useful and abandonable if A/D, host or adapter later fails. Writer implementation now would assume unresolved identity/parity and privileges.
- **Security trade-off:** a partial policy component is deliberately unusable as a live writer. Mock-based tests establish orchestration/denial only; they cannot close P05/P06/G02.
- **Alternative rejected/deferred:** broad “implement I06,” driver scaffolding that assumes service_role, copied serializers, public route, deployment or automatic Git checkpoint.
- **Accepted I05 SQL change:** none in next slice. Any later replacement path/core change receives separate owner instruction and independent acceptance.
- **New migration/provisioning:** none in next slice; explicitly prohibited.
- **Real target/credentials:** neither needed nor permitted in next slice. Needed only under later connectivity instruction and completed design/dependency gates.
- **Approval before offline coding:** explicit owner instruction approving exact four files, D04/D05 policy choices, mock boundaries and tests. This document is not that instruction.
- **Approval before any actual connection:** separate target/Auth/SQL/credential/operator/fixture/fault approval, even if offline tests pass. Production activation remains another independent approval after inherited gates.

## 2. What may safely be approved now, and what needs more evidence

| Proposed approval | Can be granted from present evidence? | Does not authorize |
| --- | --- | --- |
| Reject runtime admin/bootstrap credentials; disallow production B | Yes, design policy D01 | Provisioning or connection |
| Prefer D and explicitly record trusted-gateway compromise residual | Yes as conditional direction; if independent actor proof is required, defer selection | Claiming all six guarantees under runtime compromise or coding SQL before parity/identity design |
| Isolated Node reference/provisional deployment direction and exact candidate for review | Yes as candidate selection D03/D06 | Installing dependencies, choosing unreviewed transitive tree, packaging, starting service or deploying |
| Fixed Auth/target policy and proposed numeric admission limits | Yes as policy/mock inputs, with owner choices recorded | Real signature/revocation assurance or actual Auth/JWKS request |
| Four-file policy-only slice | Yes after independent review and explicit file-scope instruction | Driver, SQL executor, migration, live verifier wrapper, builder/reader, endpoint or credential access |
| D SQL-interface coding | Not yet: settle gateway attestation requirement, exact signature/owner/policies, both v1 parity methods and differential plan | Reinterpreting accepted D06 protocol or SQL JSON bytes |
| Full effective role/function/secret ceiling certification | No: new identities/actual host/catalog not inspected | Calling source-only ACL analysis a target pass |
| Any synthetic Auth/SQL connectivity | No: exact environments/operators/credentials/test limits not named or authorized | Read-only probes without approval; binding creation that connects implicitly |
| Production host/driver acceptance | No: direct socket cleanup, target TLS/types/tags/budget/log sinks and runtime isolation unqualified | Treating version existence/vendor support as an MPIA runtime pass |
| Production exposure/activation | No: P05/P06/G02 plus inherited gates still open | Endpoint, provider, deployment, main/Git actions |

No existing I06-DESIGN-01 decision is inferred accepted. This matrix proposes replacing the earlier default unchanged-core qualification preference with D production direction and a smaller independent offline policy slice; the owner may accept, reject or defer each choice.

## 3. Minimal offline slice: I06-OFFLINE-ADMISSION-01

**Conditional readiness:** a robust admission-policy slice can be specified before A-versus-D implementation is settled because it neither executes SQL nor supplies a live identity/driver. A robust writer/SQL adapter cannot yet be specified as ready for implementation. D02's locked-fingerprint/actor-attestation design and the complete driver dependency pin are blockers for that broader slice.

Create only these four new files **after approval**, with no edits to existing files:

| Proposed path | Responsibility |
| --- | --- |
| `src/server/location/target-policy.server.ts` | Pure validation/freezing of immutable nonsecret target-policy descriptor: environment/project identifiers, fixed issuer/JWKS origin/audience/algorithm and opaque SQL-target identity/TLS-route policy. Receives configuration explicitly. No DSN/password, environment reads, endpoint discovery, SDK client or active instance |
| `src/server/location/actor-admission.server.ts` | Dormant ActorVerifierPort factory with injected clock, signed-token verification, exact-token online-user confirmation and exact-session liveness interfaces. Enforces D04 claims/time/target rules, request-local context, failure sanitization and exact existing three-field actor output. All external work is delegated to trusted injected ports; no SDK/network implementation |
| `tests/phase2a03/target-policy.test.ts` | Deterministic .invalid fixed-target tests, mutation/fallback/issuer/JWKS/SQL-selector denial, immutable snapshots and no ambient configuration access |
| `tests/phase2a03/actor-admission.test.ts` | Deterministic synthetic evidence registry and clock; explicit verifier/user/session mocks, denial/failure/ordering/token-binding tests and compatibility with existing buildFrozenOperation/serializer using synthetic trusted builder fixtures |

These paths are proposed, not created by this preflight. No new README/config/package/lock/evidence JSON is included in the four-file allowance. Use existing Vitest/TypeScript binaries. If an additional file/dependency or accepted-file edit becomes necessary, stop that slice and report the concrete need.

### Explicit mock and trust boundaries

The public input is a bounded bearer-evidence value, never a claims/actor result. Trusted test code injects separate ports that: (1) return cryptographically verified-claims-shaped evidence for an exact synthetic token; (2) confirm user on that exact same token and fixed target; (3) confirm matching user/session liveness at injected time. Registry-backed mocks recognize pre-registered synthetic tokens only. Caller input cannot select a port, inject “verified” results, change the target or set userId. An empty/default production composition must not exist.

Offline tests do **not** verify a real signature or session. The claims-shaped output is trusted only because a private injected mock returns it; neither TypeScript branding nor a successful mocked function supplies real authentication. Future actual ports must use vetted signed-token verification/getUser/liveness mechanisms under separate approval. No handcrafted production JWT cryptography or test bypass may be added in this slice.

### Deterministic test expectations

- Missing/malformed/oversized evidence, actor objects, API-key-shaped input and target selectors fail without confirmation or SQL activity.
- Wrong issuer/audience/role/algorithm/key source, anonymous status, malformed UUIDs, missing session, bad exp/iat/nbf, future skew, inadequate remaining lifetime and time-boundary cases deny using injected clock.
- Failed signed-token mock prevents online-user/session calls; user/sub mismatch and dead/mismatched session deny; outage/timeout/error mocks never fall back to local claims. Same exact token and fixed target reach all necessary checks in order. No cross-request positive liveness cache.
- Independent concurrent requests cannot share/mutate actor/token/configuration. Private errors/canaries do not escape sanitized failures; no token/DSN/query/actor detail logging.
- Accepted output has exactly userId/verifiedAt/issuer. Existing buildFrozenOperation and canonical serializer receive that actor without field/hash changes; established vectors remain unchanged. No production provider-intent constructor added.
- Instrumented network/ambient-secret access fails the tests if touched. Inspect imports for no SDK/admin/browser/server entry/SQL driver/real fetch/environment/file credential readers; factory has no configured instance or application consumer.

Accept only after focused new tests, existing offline application/serializer/security regressions and root noEmit typecheck pass with accepted bytes preserved. Do not add database tests, run old database harnesses, build deployment artifacts or claim Auth/SQL qualification from these mocks. No new serializer contract/version or v1 field/order changes.

If the selected real adapter, liveness path or D parity later fails, these files can remain dormant or be abandoned without affecting application/Phase 1 behavior. They create no route, listener, background task, driver or credentials. Passing them supplies no next-step authority.

## 4. Separate later qualification and activation approvals

| Boundary | Required concrete review package before approval |
| --- | --- |
| D executor/function source | Approved D01/D02 gateway trust or independent assertion choice; exact function signatures/owner/ACL/policies, safe path, both serializer parity methods, allowed new executor/migration/test files and all v1 differential/negative cases |
| Driver/package preparation | Exact Node/pg/transitive versions/integrity, support/security review, public lifecycle APIs, complete named package/lock/config/source/test allowance. No actual secret or configured live instance |
| Actual read-only target/Auth preflight | Exact primary and wrong-project environment mapping, allowed host/route/TLS/SQL/Auth calls, approved credential references without values, operator/custodian and no-admin runtime ceiling; first connection itself explicitly authorized |
| Synthetic mutation/qualification | Approved fixtures/users/roles/functions as applicable, two-user matrix, independent observer and narrow fault scope, connection budgets, before/after protected state, cleanup/unknown-resolution plan and distinct new evidence paths. Operator authority does not transfer to runtime |
| Production activation | Independent target/privilege/Auth/liveness/driver/lock/CAS/commit/cleanup/log acceptance; clean seven-migration installation/platform/adversarial and eight T15 cases; provider/receipt/transport/CSRF/abuse as applicable; secret lifecycle/on-call/budget/release approval |

Approvals should record decision ID, selected option, owner/date, risk accepted, exact permitted files/actions, target and nonsecret credential references when applicable, required evidence, stop criteria and independent reviewer. Evidence from a different host/route/role/key policy is not transferable without reviewing the difference. No permission is requested to implement during this task; the reviewable result is the three completed documents.

## 5. Final A–G disposition and stop

| Requested decision | Final recommendation |
| --- | --- |
| A. Capability-scoped SQL identity | Reduced grants feasible in principle; complete six-guarantee database boundary not established under raw A |
| B. Restricted capability function | Conditional design feasibility; no function, migration, actor-attestation or v1 parity qualification |
| C. Production security model | Prefer D with explicit trusted-gateway residual; stricter independent actor-proof requirement blocks both current proposals |
| D. Host/driver reference readiness | Isolated Node/pg exact candidate review ready; installation/connection/runtime acceptance unapproved |
| E. Offline implementation readiness | Four-file admission-policy slice reviewable; await explicit approval. Writer/function/adapter coding blocked on additional decisions/evidence |
| F. Actual synthetic connectivity | NO-GO / NOT EXECUTED; separate authorization required |
| G. Production activation | NO-GO; all runtime and inherited release gates remain |

Existing application source, accepted SQL/tests/evidence, Git refs and index are unchanged. Only the three requested preflight documents are new untracked additions. **Stop here for independent owner review before offline implementation or any actual connectivity.**
