# MPIA — Phase 2A-03 trusted transaction design

20 October 2026, Asia/Kuala_Lumpur. **PROPOSED, not implemented.** P03–P08 and P10 require owner approval as detailed in the [decision register](PHASE2A_03_DECISION_REGISTER.md). This document introduces no SQL function, role, grant, migration, browser writer or deployed handler. Read with the [verified architecture](PHASE2A_03_ARCHITECTURE_REVIEW.md) and [interface/byte contracts](PHASE2A_03_INTERFACE_PROPOSAL.md).

## 1. Trust and authentication boundary

An authoritative write requires a verified real Supabase user identity plus a fresh database ownership check. A browser `user_id`, a decoded JWT, an API publishable key, a service key, a synthetic SQL actor or a client-side protected route is not that identity.

For the eventual interactive path, recommend a request-scoped public-key Auth client configured to the **same approved project as the SQL target**, with persistence/refresh disabled. Verify the supplied user bearer token through `auth.getUser(jwt)` and validate the expected issuer/audience/expiry/user-token class using the approved verification policy. Return only a server-private actor capability. `getUser` performs a server Auth request and returns authenticated user details; this recommendation deliberately uses online user verification rather than trusting stored session JSON. It does not claim instantaneous global logout/session revocation semantics; prove the intended revocation policy separately before endpoint exposure. [Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser)

For an explicit implementation contract, obtain verified claims through the project's `auth.getClaims(jwt)` verifier as well as the online user result; require the returned `sub` equals `getUser`'s user ID, the configured issuer/audience match, expiry is valid, and token role is `authenticated`. Reject anonymous users if the approved application policy disallows them. Merely parsing the token's payload is not a claims verifier. Both checks occur outside SQL locks; actor identity comes from the verified matched user, never an input field. Test the exact installed SDK's signing-key/expiry/error behavior and fail closed on either verification failure.

Do not hold database locks during Auth network I/O. Missing, expired, malformed, wrong-project, forged, anonymous-user (where disallowed) and API/service credentials fail closed before a write transaction. If Auth is unavailable, no write. Long geocoding/review intervals require verification again at confirmation/persistence, not reliance on an old candidate receipt. The transaction binds `created_by` and `confirmed_by` to the verified actor and actual current parent owner.

The generated `requireSupabaseAuth` calls `getClaims`, but it is not an established location security boundary. Its environment target and the generated browser `auth-attacher` session source have not been proved equal to `external-client`. Keep those existing generated files unchanged in initial 2A-03. A new verifier port and target-identity validation must make the mismatch explicit. No raw JWT is passed into SQL session settings or written to location rows. No arbitrary caller-provided `SET ROLE`, table/column name or SQL fragment is permitted.

Only trusted command construction can set provider provenance or explicit confirmation. A live adapter normalizes candidates; later orchestration binds them to expiring owner/property/input/expected-state receipts. The adapter cannot allocate versions or call the writer. Provider I/O, user review, budget checks and waiting occur outside the transaction. A background worker/service identity cannot substitute for a real initiating user session in this interactive design. Durable delegated jobs require a separately approved authorization/revocation contract; none is introduced in 2A-03.

## 2. Execution mechanisms compared (P04–P06)

| Mechanism | Feasibility / trade-off | Recommendation |
| --- | --- | --- |
| Multiple `supabase-js` REST calls | Each request has its own database transaction; cannot hold parent lock across calls or atomically append/publish | Reject for authoritative write |
| Existing `client.server.ts` admin HTTP client | Has service authority but no reserved SQL connection or multi-call transaction primitive | Not a transaction mechanism |
| Internal SQL core with reserved connection | Ordinary PostgreSQL BEGIN/COMMIT, parameterized statements, exact lock order, explicit COMMIT result; matches accepted D06 | **Recommend**, dormant and injectable first |
| TanStack/Nitro server with SQL driver | Could work on a qualified TCP-capable host; current Cloudflare/fetch build paths and no driver/binding do not establish compatibility | Keep as alternative; no Lovable target/configuration change |
| Supabase Edge Deno SQL adapter | Deno raw SQL client support is documented; existing Supabase platform avoids a new application server. No such function/pool is installed here | Preferred eventual host, separately qualified; no HTTP entry point in initial work |
| Narrow service-only SECURITY INVOKER RPC | Could encapsulate a transaction using existing service DML permissions, with outer PostgREST request committing it; needs new function/EXECUTE and exposure review | Separate explicit D06 replacement decision; not default |
| SECURITY DEFINER RPC / dedicated restricted writer role | Could enforce CAS even against buggy raw service writers and reduce effective authority with revised grants | Separate schema/grant/function-owner/security decision; outside current approval |
| Generic SQL RPC, browser-callable privileged writer | Broad attack surface, actor spoofing and unexpected API exposure | Reject |

Supabase documents raw Postgres clients in Edge Functions, including an explicitly acquired/released Deno client. This establishes an available platform pattern, not compatibility of this repository's particular deployment or credentials. [Edge SQL connection guidance](https://supabase.com/docs/guides/functions/connect-to-postgres)

**Preferred concrete later adapter:** Deno `@db/postgres` (exact release to be pinned/approved in the implementation slice), sequential parameterized queries on a single acquired client. Qualify a direct connection or session-pooler connection first. For serverless scaling, a transaction-pooler connection is an option only after exact driver/pooler tests prove backend affinity from BEGIN through COMMIT, no unsupported named prepared statements, no query pipelining and reliable failure handling. A server-side transaction pooler can reserve a backend for the transaction; it does not make independent REST calls transactional. Supabase distinguishes direct/session/transaction connections and their session/prepared-statement limitations. [Connection methods](https://supabase.com/docs/guides/database/connecting-to-postgres)

Do not select Postgres.js merely from a generic example: current Supabase guidance flags default pipelining incompatibilities with its shared transaction pooler and says disabling it via `max_pipeline: 0` breaks `sql.begin()`. That specific combination needs qualification or a different driver/mode. Do not copy the workaround blindly. [Supabase Postgres.js guidance](https://supabase.com/docs/guides/database/postgres-js)

No assumption is made about a hosted connection hostname, password, network route, IPv4/IPv6 availability or pooler user mapping. No credentials were inspected. These are implementation preconditions, not reasons to change Docker or use production now.

## 3. Database identity, grants and credential risk (P05)

The accepted application DML role remains `service_role`: history SELECT/INSERT, state SELECT/INSERT/UPDATE, registries SELECT; ordinary owners SELECT their location rows only. FORCE RLS does not constrain BYPASSRLS. This is an explicitly trusted authoritative backend exception; existing browser Phase 1 CRUD remains user-scoped through RLS.

A Supabase service API key is **not a PostgreSQL login password**. Existing grants do not prove `service_role` can log in to a direct/pooler connection. To preserve the no-new-grant baseline, the proposed adapter would use a separately approved, server-only existing SQL bootstrap identity with already verified SET ROLE authority, then issue fixed `SET LOCAL ROLE service_role` immediately after BEGIN. The local test harness uses `postgres`; an eventual `postgres` login/DSN must be explicitly reviewed, never inferred from that harness or accepted automatically from environment variables.

This is P05's important risk: a `postgres` bootstrap credential retains owner/DDL power even after SET LOCAL ROLE; compromised code could RESET ROLE. The application boundary therefore is not least-privilege credential isolation. **Do not deploy on this basis without explicit credential-risk approval or a separately approved restricted login design.** Initial 2A-03 can implement the core against a connection port and remain disabled while P05 qualification is unresolved. A restricted login plus narrow grants/membership may be preferable before exposure, but creating it is a separate security/schema task, not a hidden new grant here.

Qualify the actual bootstrap `session_user`, effective `current_user`, service BYPASSRLS attributes, property SELECT/UPDATE needed for FOR UPDATE, history/state/registry ACLs, schema/type/spatial access and safe role memberships. Any missing permission stops adapter qualification; do not silently add it. New SECURITY DEFINER objects/EXECUTE grants or change to raw-write privileges require a new approval. Guard functions remain invokers, schema-qualified, fixed-path and unavailable for direct runtime execution.

`SET LOCAL ROLE` scopes the effective role to the transaction. It requires authorized role membership/SET authority and does not reduce the credential's underlying trust. Do not use session-wide SET ROLE on a shared pool. [PostgreSQL SET ROLE](https://www.postgresql.org/docs/17/sql-set-role.html)

## 4. Connection lifecycle and limits (P04/P07)

Acquire one client from a bounded adapter pool; do not call `pool.query` independently for transaction statements. Reserve it for the full transaction. Prefer one connection per warm function instance initially, bounded acquisition queue, and aggregate concurrency limits appropriate to the actual database budget. A module-level pool is reusable infrastructure only; no request actor/token/command can be held in global mutable state. If the target Edge lifecycle does not safely support reuse, qualify bounded per-invocation connect/close instead, without changing transaction semantics.

Every statement uses parameter binding, including IDs, addresses, timestamps and hashes; identifiers/roles are literal server constants. No string-built SQL from browser/provider input. Use an explicit row mapper for number/string/bigint/timestamp results; fail closed on invalid casts. Enforce TLS with validated server identity on hosted connections; never log a DSN. Local synthetic qualification uses only the separately designated test target, not an arbitrary environment default.

Proposed local development starting budgets, subject to measurement: 2-second pool acquisition, 3-second lock wait, 5-second per statement, 8-second application transaction deadline and 10-second idle-in-transaction timeout. Configure database limits transaction-locally before locks; request deadlines must leave time for COMMIT/error handling and cleanup. These are proposed operational defaults, not current deployed settings. A JS timeout alone does not cancel SQL or release locks.

On failure before commit: await bounded ROLLBACK when the connection is usable; on uncertain connection/rollback failure, destroy/discard that client, never return an open or unknown transaction to the pool. Cancel/close through supported driver behavior, and qualify server-side lock/session release. Do not port the test harness's privileged backend-termination API into a public handler. Track cleanup failure without replacing a known committed result with a misleading rollback claim. If COMMIT was acknowledged, connection release failure is an operational incident, not evidence the committed row vanished.

Supabase Edge functions have finite memory/time/CPU/idle limits; no transaction may wait for user review, provider responses or durable background scheduling. The exact account/runtime limits must be checked before activation; no long-lived worker or unbounded retry is proposed. [Edge platform limits](https://supabase.com/docs/guides/functions/limits)

## 5. Transaction algorithm (P03/P04)

This is pseudocode, not executable SQL or a new stored procedure. All values below are validated bound parameters. `command.expected` is never rewritten in response to contention. Authentication and initial command validation have already completed outside locks.

```text
verify approved Auth/database target identity and obtain VerifiedActor
build/freeze full v1 semantic command; derive actor fields server-side
validate operation UUID, expected tokens, coordinates, metadata and all limits
compute operation_hash from existing v1 bytes (not supplied by caller)
acquire/reserve one SQL client
BEGIN ISOLATION LEVEL READ COMMITTED
SET LOCAL ROLE service_role  -- fixed role; approved bootstrap authority required
set transaction-local timeouts and fixed safe search path

parent := SELECT explicit needed property columns
          FROM public.properties WHERE id = :property_id FOR UPDATE
if missing: abort PROPERTY_DELETED_OR_OWNERSHIP_CHANGED
if parent.user_id != VerifiedActor.userId: abort OWNERSHIP_DENIED
actualInputHash := v1 fingerprint of the seven current saved parent fields
if actualInputHash != command.propertyInput.digest: abort INPUT_CHANGED

state := SELECT explicit state columns
         FROM public.property_location_intelligence_state
         WHERE property_id = :property_id FOR UPDATE
-- Parent lock serializes absence as well as existence; no row-lock on a gap assumed.

prior := SELECT immutable version fields
         FROM public.property_location_versions
         WHERE property_id = :property_id AND operation_id = :operation_id
if prior exists:
    compare prior.operation_hash to trusted computed hash
    require prior.created_by == VerifiedActor.userId
    if unequal: abort OPERATION_CONFLICT
    validate/return-map prior row and observed state; fail closed on corrupt lineage
    COMMIT  -- no insert, UPDATE, revision increment, timestamp restamp or repoint
    await confirmed COMMIT response
    return COMMITTED / DUPLICATE with prior version and observed current state

if state absent:
    require command.expected == ABSENT
else:
    require expected == EXACT
    require state.state_revision == expected.revision
    require state.current_location_version_id IS NOT DISTINCT FROM expected.pointer
if mismatch: abort STALE_EXPECTED_STATE

if provider-derived new data:
    recheck exact provider version and reviewed field policy without row-lock grant
    -- database INSERT guard independently checks its statement snapshot
    -- no claim of concurrent withdrawal serialization

if state absent:
    INSERT state(property_id) with NULL pointer; read database revision 0
latest := SELECT coalesce(max(version_number),0) for this property
require latest and resulting version fit 1..9007199254740991
require state revision has capacity for one UPDATE
require INITIAL_INPUT only when latest == 0
allocate new version UUID and latest+1; derive created_by/confirmed_by from actor
INSERT history with operation_id/hash, property_input_hash and all semantic fields
    -- exclude generated geography; guards stamp created_at/confirmed_at
    RETURNING authoritative inserted row

UPDATE state SET current_location_version_id = :inserted_id
WHERE property_id = :property_id
  AND state_revision = :locked_revision   -- 0 for newly inserted state
  AND current_location_version_id IS NOT DISTINCT FROM :locked_pointer
RETURNING state_revision, current_location_version_id, timestamps
require exactly one returned row and revision advanced exactly once
construct provisional result from RETURNING values; do not emit success
COMMIT
await explicit successful COMMIT and normal transaction completion
return COMMITTED / CREATED with inserted row and observed state

on precommit failure: bounded ROLLBACK/discard; no partial result
on known COMMIT rejection: classify COMMIT_FAILED; verify abort/cleanup
on lost COMMIT acknowledgement: classify COMMIT_OUTCOME_UNKNOWN; discard client
finally: release only clean client, otherwise destroy; record sanitized cleanup state
```

Use explicit column lists rather than generic `to_jsonb(p)` in the runtime to avoid fetching unrelated financial/private data. Compute the fingerprint in the application using the locked row and exact serializer bytes, not PostgreSQL JSONB rendering. Do not write the Phase 1 property or financial tables, even to “touch” timestamps.

Lock order is **parent property → existing state → immutable history reads/insertion → pointer update**. The history/provider FK checks may take their normal internal locks; do not add registry FOR SHARE/UPDATE locks. Service has registry SELECT only, and row-locking SELECT requires additional privilege. Any future multi-property operation must lock parents in a documented stable order or remain unsupported. All writers of this state, including future workers, must obey parent-first ordering; an arbitrary service caller still can violate it. Database triggers/uniqueness are backstops, not proof of full trusted behavior.

READ COMMITTED is intentional: after waiting on a parent lock the command rechecks the actual updated/deleted row. FOR KEY SHARE would not protect independent non-key address/owner edits. Holding the parent's FOR UPDATE lock prevents other transactions modifying/deleting it until the location transaction ends; later edits can still invalidate applicability immediately after commit. [PostgreSQL row locking](https://www.postgresql.org/docs/17/explicit-locking.html)

## 6. Deferred constraints, COMMIT and replay

Do not disable the semantic pointer guard or change the accepted deferred composite FK. `SET CONSTRAINTS ... IMMEDIATE` can force a pending check earlier, but does not substitute for COMMIT handling. Keep the accepted timing by default; all errors, including deferred checks at transaction completion, must reach the caller as failures. [PostgreSQL deferred constraint checks](https://www.postgresql.org/docs/17/sql-set-constraints.html)

An INSERT/UPDATE RETURNING result is provisional. The adapter cannot resolve `execute` successfully when the transaction callback finishes; it must wait until the driver's outer transaction promise/COMMIT acknowledgement confirms success. Raw-driver COMMIT handling must also detect an aborted transaction ending as ROLLBACK rather than assuming every nonthrow response is a successful commit. Qualify the exact driver's completion signal.

An explicit server error at COMMIT (e.g. deferred FK `23503`) establishes no successful write in that attempt. A network disconnect after sending COMMIT may instead mean the write committed but the acknowledgement was lost. Never assert rollback from a socket timeout alone. Reauthenticate and retry **the identical original operation identity and payload**: a committed prior row yields DUPLICATE, an absent row may execute after locks/rechecks, and a still-running original transaction is serialized by parent locking. Use bounded backoff, not a fresh operation ID.

The existing writer rechecks actual current input before duplicate lookup. Preserve this behavior: an address change can produce INPUT_CHANGED even when an earlier ambiguous operation committed. Propose a later separate authorized reconciliation read scoped to property/operation and recorded actor; it may report the original immutable historical version without asserting current applicability. It does not republish or accept a new location. This read must reauthorize current parent ownership on a coherent snapshot and reveal nothing after transfer/deletion. No new endpoint or table is created now. The absence of an operation after parent deletion is not proof that it never committed before deletion; return unavailable, not historical certainty.

No command receipt/result revision is stored separately. Duplicate results therefore include the original version and **current observed** revision/pointer, not a fabricated original revision. After a later command the original version may be historical. Two semantically identical requests with different operation IDs are separate operations; expected-state checks prevent unintended concurrent publication, but global “exactly once intent” is not claimed.

## 7. Concurrency and failure scenarios

| Scenario | Required outcome / proof |
| --- | --- |
| Two first writers, both ABSENT | Parent serializes them; winner creates revision 0 then publishes revision 1/version 1. Loser sees existing state and fails stale; no second row |
| Two new writers, same exact state | One publishes; other sees changed revision/pointer and rolls back. No silent rebasing or last-write-wins |
| Two identical retries, same operation ID | Winner commits; second finds matching immutable row after parent lock and returns DUPLICATE, no extra revision |
| Same ID, changed payload/expected tokens/actor | Conflict, no insertion/repoint. Never upsert-update immutable history |
| Retry of old operation after a newer pin | With matching current input, original version returned as historical; current pointer/time/revision unchanged |
| Address changed before lock or while waiting | Hash computed after lock detects edit; delayed geocoder result rejected |
| Financial-only parent edit | May serialize briefly because same row; hash unchanged, expected state still determines acceptance; no location invalidation from `updated_at` |
| Ownership transferred before/waiting for lock | Actual new owner differs; former actor denied, even for duplicate lookup |
| Ownership transfer attempted while transaction holds parent | Transfer waits; write is authorized at its lock/commit interval. Later visibility follows actual owner; no perpetual access for historical actor |
| Property deleted before lock | Missing parent, fail closed; never recreate parent/state from delayed job |
| Deletion waits behind writer | Writer commits, then delete cascades history/state; successful response can subsequently refer to deleted data, not a perpetual existence guarantee |
| Cancellation/error after append or after pointer update | Whole transaction rolls back history/state/revision/timestamps; release locks, no response with partial success |
| Deferred COMMIT rejection | Return COMMIT_FAILED only after known rejection, prove complete rollback including absent-state creation |
| Lost COMMIT response | Outcome unknown, same-ID reconciliation; do not generate another command |
| State revision/version ceiling | Stop before insert/update; no overflow or wraparound. Exact successful duplicate can still be read without increment |
| Foreign-property pointer or arbitrary geography input | Runtime validation rejects; actual pair FK/generated-column/guard enforcement remains independently tested |
| Provider withdrawn before ingestion statement | Recheck/guard deny new insert. Withdrawal racing the statement is not serialized by current grants; live feature remains gated until revocation policy is approved |
| Parent edited away and back to identical seven values | Hash is again equal; intervening unsaved history is not detected by the schema. Receipt expiry/request binding and expected state limit delayed work; do not claim a monotonic address-edit counter exists |

The last case is an intentional limitation of content fingerprints. A monotonically increasing input epoch would require a separately approved Phase 1/schema contract change and is not silently introduced. Strictly requiring detection of every intermediate edit is a new owner decision, not an existing property of the hash.

## 8. Error mapping, observability and retry limits (P07/P10)

SQLSTATE mapping must use the statement stage and allowlisted constraint identity, not raw message text. `23503`, `23505` and `23514` have several meanings; do not map every constraint error to stale revision or safe retry. A unique conflict after correct parent serialization may indicate a bypass writer or defect; rollback, perform bounded same-ID reconciliation, then report INTEGRITY_FAILURE if unresolved. `40P01`/`40001` are retryable only after known abort; `55P03`/`57014` require cleanup and stage-aware handling. Transport errors around COMMIT are ambiguous regardless of retry library defaults.

Recommend at most two automatic transient retries after the initial attempt, with jitter/backoff within an overall request budget. Every attempt reauthorizes and repeats the entire transaction with unchanged command/ID/tokens. Do not retry validation, ownership, changed input, stale state, conflicting identity, ineligible provider, permanent integrity failure or known constraint COMMIT rejection automatically. Provider retries are separately budgeted outside SQL and do not mint new location operations. A stale/corrected intent requires reload and explicit confirmation with a new ID.

Use allowlisted structured events: stage, diagnostic/correlation ID, outcome code, operation kind, created/duplicate, duration, lock/acquisition wait, retry count, SQLSTATE/allowlisted constraint, commit certainty and cleanup status. Use random correlation IDs or keyed opaque identifiers for production correlation; raw property/user/operation IDs are private and must be minimized/access-controlled. Do not log hashes as anonymized addresses: seven-field hashes are guessable and sensitive.

Never log addresses/coordinates, SQL parameters, commands/rows, provider request URLs/raw bodies, JWTs/auth headers, DSNs, provider/API credentials, candidate receipts or tokens. Database driver/server logging and APM breadcrumbs must be reviewed as well as application logging: bind parameters and constraint detail can expose rejected rows. Map driver exceptions to sanitized errors inside the core before they can reach `src/server.ts`/`src/start.ts` console handlers. Log scrubber fault tests must include nested causes, aggregates and cleanup errors. No raw errors in HTTP responses. A logging outage cannot change a known commit into an apparent rollback or trigger a fresh operation ID.

## 9. Required qualification and operational limits

Before any adapter activation, prove target identity, actual connection route/TLS, approved credential/SET authority, effective service grants, exact installed schema/guards/PostGIS, backend affinity and driver mapping, concurrent connection behavior, timeouts/rollback/discard, commit success/rejection/ambiguity and pooled identity isolation. Use synthetic local Auth and the approved test database only; the current production-configured frontend must not be used for synthetic login/CRUD.

The core can be unit-tested with a fake reserved connection in 2A-03, but that is not PostgreSQL transaction proof. New actual PostgreSQL tests must use parameterized real driver statements and unchanged permanent guards. Existing TC01–TC14 are retained synthetic contract evidence, not proof of the future adapter, `getUser` verification, real tokens, transport CSRF or runtime secret exclusion. Driver integration, two-user real sessions and later endpoint audit are separate gates.

This design adds no persistence for job durability, operation receipts, original response revisions or provider requests. It promises append-only history plus idempotent operation recovery while the parent/history remain and the actor is authorized, not universal exactly-once delivery or crash-proof external workflows. More infrastructure is deferred until a reviewed feature requires it.
