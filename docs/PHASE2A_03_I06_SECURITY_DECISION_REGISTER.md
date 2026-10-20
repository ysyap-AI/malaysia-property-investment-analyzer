# MPIA — Phase 2A-03 I06 security decision register

20 October 2026, Asia/Kuala_Lumpur. **All I06 decisions below are PROPOSED / AWAITING OWNER REVIEW.** The present instruction authorizes three documents only. It approves no credential, database connection, dependency, role, grant, RLS change, function, endpoint, migration, deployment or Git write.

Read with the [architecture and evidence](PHASE2A_03_I06_ARCHITECTURE_REVIEW.md) and [implementation readiness](PHASE2A_03_I06_IMPLEMENTATION_READINESS.md). `I06-Dxx` identifiers are new decisions; they do not overwrite historical P01–P10, D01–D08 or ARC approvals.

## 1. Accepted constraints carried forward

| Authority | Continuing constraint |
| --- | --- |
| Requested baseline / RELEASE-01 | Feature branch at `1dd47b6c33b96b6a43ff3a22e2b58c733738f76f`; corrected dormant I01–I05 accepted. Preserve checkpoint and every existing evidence file |
| Phase 1 freeze / approved Phase 2 plan | Independent property save/financial analysis, deterministic engines, existing ownership/RLS and private evidence. No location failure changes financial behavior |
| 2A-01/02 acceptance | Append-only history, optional state, latest-intent pointer, exact revision/CAS, deferred composite pointer FK, permanent guards, accepted scalar/geography/PostGIS strategy |
| I01–I05 accepted source | Exact v1 hashing/fields/receipt bytes, parent-first locking, owner/input before replay, duplicate before fresh expected-state checks, one reserved transaction, no success before COMMIT, known/unknown outcome distinction |
| Correction closure | Invocation-owned cleanup and permanent object quarantine retained; fake CAS omission closed. G02 physical runtime/result behavior remains unproved |
| Present task | Design only; create exactly the three I06 Markdown documents. Do not start implementation when review is complete |

## 2. Proposed owner decisions

### I06-D01 — Credential ceiling and P05 disposition

**Recommended decision:** reject a postgres/admin bootstrap credential in every application runtime. Prefer a dedicated capability-scoped identity for production. For **synthetic I06 qualification only**, permit consideration of a dedicated NOINHERIT login with SET authority to existing service_role, no other reachable privileged roles, and no direct admin/ownership rights, if preserving current SQL is required.

**Why:** the current core literally sets service_role. A truly restricted role cannot run that exact setup without gaining service-role authority. A dedicated service-role member reduces bootstrap exposure but does not become least privilege. The historical local postgres is nonsuperuser yet still has BYPASSRLS, creation/ownership and powerful memberships; its name or role switch does not make it safe. PostgreSQL's session-user SET authority survives a role switch. [SET ROLE authority](https://www.postgresql.org/docs/17/sql-set-role.html)

**Owner must select:** qualification model B with explicit broad service-role risk acceptance; or a separate least-privilege/function design before any connection. Identify the identity administrator, permitted effective grants/memberships, secret custodian, revocation operator and exact synthetic environment. No actual login/password or membership is provisioned here.

**Blocker/evidence:** current login capability, all reachable grants/PUBLIC functions and real pooler role mapping are unknown. P05 remains OPEN until catalog evidence and the selected decision are independently reviewed. A successful connection alone cannot close it.

### I06-D02 — Least-privilege SQL changes versus unchanged-core qualification

**Recommended decision:** preserve accepted SQL for the first separately approved qualification; require a separate additive security design before production if service-role breadth is unacceptable. Do not silently replace service_role with a new role, add actor GUCs, relax RLS, elevate a trigger or grant a convenient Phase 1 UPDATE column.

**Production option A requires:** exact new roles/grants/RLS, fixed role/context setup changes and dependency privilege proofs. The raw parent SELECT FOR UPDATE and existing invoker pointer guard both need locking authority. Minimal column UPDATE is still a real mutation capability. If the owner requires zero runtime raw mutation capability on properties, select a separately reviewed capability-function design instead.

**Function option D requires:** a nonlogin least-privilege owner, restricted signature/EXECUTE, safe schema/path, no caller owner-membership, verified identity source, v1 byte parity, explicit outer transaction/COMMIT/error contract and review of all alternate call paths. Invoker RPC alone does not reduce the caller's existing table rights. A service-token function with an actor parameter does not independently authenticate that actor.

**Owner must approve separately:** permitted SQL/core changes, exact additive migration/provisioning paths and whether this replaces the D06 raw execution model. No old migration is rewritten. This decision is not an executable grant specification and does not authorize changing approved SQL now.

### I06-D03 — Host isolation, including Edge default secrets

**Recommended decision:** qualify an isolated host that exposes only the selected SQL identity and public Auth configuration. Prefer an isolated Node reference runtime for initial driver evidence; evaluate a separate Cloudflare Worker/pg/Hyperdrive service for eventual hosting without changing the Lovable application's current build target. Deno remains a candidate if its hard cleanup and logging gates pass.

**Material qualification:** Supabase documents database/admin credentials available by default inside Edge Functions. A custom low-privilege DSN does not bound arbitrary-code-execution damage while those stronger credentials remain reachable. This is a change to the earlier *preference*, not a modification to existing architecture files. [Edge secret availability](https://supabase.com/docs/guides/functions/secrets)

**Owner must choose:** secret-isolated host; or explicit whole-project authority risk acceptance for Edge after reviewing actual secret scope; or a platform configuration independently proving stronger credentials unavailable. The latter is an unproved possibility, not assumed supported. No existing Lovable configuration, Worker binding or Edge entry point is authorized.

**Closure evidence:** exact host/runtime/compatibility version, available-secret capability inventory without values, packaging/import proof, connection budgets and operator ownership. Installed local Node tests do not establish hosted isolation.

### I06-D04 — Fixed-project user authentication and revocation policy (P06)

**Recommended decision:** a new private request-scoped verifier uses fixed-project getClaims plus getUser on the same exact bearer, explicit issuer/audience/algorithm/time/user/session policy, matched user UUID, nonanonymous user restriction and online session-liveness evidence. No browser actor, stored session JSON, generic API key or decoded token is trusted.

Reject revoked credentials known at admission; do not silently accept them until JWT expiry if the target cannot establish liveness. A target that does not enforce the required policy through getUser needs a separately approved narrow session oracle or remains NO-GO. Do not grant broad auth.sessions SELECT or use an admin key to make the verifier convenient. Supabase describes a session_id check for sensitive sign-out enforcement; target semantics still require experiments. [Session enforcement](https://supabase.com/docs/guides/auth/sessions)

**Owner must confirm:** exact permitted issuer/audience/signing policy; nonanonymous/MFA policy if additional assurance is desired; intended logout/global logout/session/user/key-revocation meanings; maximum admission age/clock skew and token remaining lifetime. Recommended boundary is fresh verification at admission plus current locked ownership, with a bounded transaction. Revocation racing an already admitted transaction is a documented residual, not instantaneous revocation-at-COMMIT.

**Scope:** no existing Auth route, client, generated middleware, token attacher or configuration is modified. New verifier behavior is privately tested first. P06 remains OPEN until real synthetic users, expired/forged/wrong-project/revoked sessions and failure cases pass.

### I06-D05 — Auth/SQL target attestation and authorized test environments

**Recommended decision:** one immutable server-owned manifest binds environment/project, Auth issuer/JWKS/audience, SQL endpoint/database/login/mode/TLS, secret version and accepted schema/core hashes. An operator/control-plane attestation establishes the project mapping; SQL and TLS probes later check it. No caller-selected target or fallback environment.

**Owner must name:** primary nonproduction Auth+DB pair, a second authorized wrong-project pair, synthetic-user authority, allowed fixture writes, exact protected baseline, allowed network-fault/observer operations, cleanup custodian and incident contact. If only one target is approved, wrong-project SQL testing is NOT_EXECUTED and P06 cannot be declared fully closed.

Static external project ref/config.toml equality, current_database, same user UUID or matching migrations are insufficient project proof. Existing external browser configuration is not approved for synthetic execution. Retained custom local PostgreSQL evidence does not prove local Auth/JWKS/Edge services exist. No database or Auth request is made by this review.

### I06-D06 — Exact driver, host and connection route (G02)

**Recommended decision:** owner selects one pinned candidate/version and host for a private qualification slice. node-postgres is the preferred reference candidate because its documented transaction/result/destructive-release interfaces fit the port; Deno @db/postgres is a second candidate with explicit decoder/logging/close blockers. This is a recommendation, not an installation or final driver selection.

First qualify direct/session mode when available. Qualify transaction pooling separately with backend affinity, no session-state assumptions, exact prepared/pipeline policy and no nested poolers. A Cloudflare route additionally needs a cache-disabled binding and proxy/origin TLS/cancel tests. Supabase shared pooler warnings for Postgres.js must not be ignored or copied as Hyperdrive configuration advice. [Supabase Postgres.js limits](https://supabase.com/docs/guides/database/postgres-js), [Cloudflare driver requirements](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/)

**Approval record must name:** runtime and exact package/version/integrity, transitive lock source, permitted dependency/config file changes, endpoint mode, TLS verification, region/concurrency budget, chosen cancellation/discard strategy and packaging method. No dependency is installed now; no broad version range or documentation sample is automatically adopted.

### I06-D07 — Result mapping, cancellation and physical ownership

**Recommended decision:** preserve the accepted port and require its implementation to prove command-only empty/zero results, exact row/count agreement, bigint bounds, binary64 fidelity, microsecond UTC strings and typed COMMIT/ROLLBACK/rejection/unknown outcomes. Map only allowlisted own SQLSTATE fields for diagnostics. Do not weaken accepted tests/core checks to accept a driver default.

The adapter must reserve a physical connection/generation, not merely a JS wrapper. Quarantine it synchronously before asynchronous close; late acquisition/release/cancel must not affect another borrower. No automatic reconnect may resume a partial transaction on another backend. A JS timeout and core WeakSet are insufficient cancellation/eviction proof.

**Owner must approve after evidence:** measured timeout/cleanup budgets and exact public driver APIs. If no bounded force-close is available, reject that candidate or review an alternative host/driver. No vendored driver patch, internal socket hack or privilege widening is authorized by this decision. G02 stays OPEN until the real matrix passes.

### I06-D08 — Trusted command construction and replay/reconciliation scope

**Recommended decision:** initial qualification implements a private synthetic manual-intent builder only; real user verification still required. No raw command passthrough or provider-derived intent. Preserve original operation, actor, expected tokens, input hash and semantic receipt across retry; reauthenticate each invocation. Never generate another ID to recover unknown COMMIT.

The initial builder derives actor fields from the verified result, and saved inputs/tokens from the authorized captured intent. A later transport must validate server binding rather than trust browser envelopes. Provider receipt authority/rights and confirmation workflow remain 2A-04.

**Reconciliation decision:** qualification must demonstrate same-ID execution recovery and a private read-only historical observation under current-owner authorization. After input changes, execution still returns INPUT_CHANGED; the separate observation must not republish. Transfer/deletion reveals nothing; missing history after cascade means unavailable, not “never committed.” This is a proposed new private capability, not an existing endpoint. Owner approval must name its files and access policy; otherwise changed-input reconciliation remains a reported gate.

### I06-D09 — Secret lifecycle, diagnostics and incident controls

**Recommended decision:** server-only per-environment credentials; controlled secret rotation/draining/revocation; no project-admin fallback. Closed diagnostic projection across driver, HTTP/Auth, pool, runtime, DB logs and APM. No raw errors, parameters, JWTs, DSNs, addresses/coordinates, receipts, user/property IDs or hashes in general logs.

**Owner/operator decisions:** secret owner, rotation interval/event triggers, audit access/retention, emergency disable, existing-session termination authority and response to failed cleanup. Session lifetime and active-connection revocation must be observed experimentally; revoking a password alone does not promise current sockets disappear. Do not grant the writer backend-termination authority.

**Acceptance:** inject synthetic private canaries at every error/notice/decoder/log sink, inspect all authorized sinks and assert no leak. Failure is a stop condition even if the transaction tests pass. Known COMMIT remains committed after release/log failure. No new logging platform/audit table is proposed in this slice.

### I06-D10 — Implementation/release authorization and stop point

**Recommended decision:** authorize named slices independently after independent review, with explicit permitted files, dependency changes, synthetic target/credential authority and pass/stop conditions. Approval of design direction alone is insufficient for database operations. Qualification evidence cannot authorize an endpoint, live provider or deployment.

**Current verdict:** CONDITIONAL GO for preparation of a narrowly scoped dormant qualification implementation **after** the applicable decisions and separate instruction. NO-GO for real connectivity under the present task; P05/P06/G02 remain open. NO-GO for runtime exposure/production until credential ceiling, target/revocation, real PostgreSQL/pool/logging and inherited platform/T15/transport/provider gates pass.

**Required next artifact outside this task:** an owner instruction specifying selected option/host/driver/test targets and exact slice. Do not edit these existing sources or begin that work automatically. No staging/commit/push follows design completion.

## 3. Decision closure checklist

Each approval must record: decision ID, owner/date, selected option, rationale, risk accepted, permitted files/actions, named nonproduction target and credential reference **without value**, required evidence and independent reviewer. A rejected option stays documented; it is not worked around through an elevated credential.

| Gate | Minimum decisions | Additional closure |
| --- | --- | --- |
| Dormant verifier/adapter code preparation | D01–D08, D10 as applicable to selected slice | Exact dependency/file authority; no configured live instance |
| Any actual Auth/SQL qualification | D01, D03–D10 | Explicit target/fixture/network/cleanup authorization, safe preflight and verified role/host ceiling |
| Replacing current SQL/grants/RLS with A/C/D | D02 plus D01/D04/D05 | Separate security/schema/function review; additive migration authority; full contract regression |
| Exposing interactive writer | All relevant decisions | Real matrix, transport/receipt/rights/abuse controls and current source/bundle audit |
| Production | All above plus inherited gates | Clean installation/platform/adversarial/T15, operations/release approval; independent review |

No owner decision has been inferred from “Please resume.” That message resumes this design-only task. The three completed documents are the reviewable result; implementation remains stopped.
