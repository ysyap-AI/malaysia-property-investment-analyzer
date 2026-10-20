# MPIA — I06-SECURITY-PREFLIGHT-01

20 October 2026, Asia/Kuala_Lumpur. Read-only security and runtime design preflight. **All recommendations await independent owner review.** Only this report and its two companion decision documents are authorized additions.

**Recommendation: select option D as the conditional production design direction.** Option A can reduce table privileges, but the accepted raw SQL and guards cannot enforce the complete operation protocol against a holder of that SQL identity. Neither option independently proves a human actor when an authorized gateway is compromised. Prefer an isolated Node reference environment and, provisionally, the same deployment model. Permit only the four-file, network-free admission-policy slice described in the [approval matrix](PHASE2A_03_I06_DECISION_APPROVAL_MATRIX.md) after separate approval. Production SQL implementation, connectivity and activation remain stopped.

The [option comparison](PHASE2A_03_I06_OPTION_COMPARISON.md) contains the host/driver assessment and A-versus-D comparison. Decision identifiers I06-D01–D10 retain their meanings from I06-DESIGN-01; the recommendations here refine those proposals without approving or editing them.

## 1. Separate decisions A–G

These letters identify requested verdicts, independently of the credential options A/B/D.

| Requested decision | Verdict | Evidence and limit |
| --- | --- | --- |
| A. Capability-scoped raw SQL identity | **CONDITIONALLY FEASIBLE for reduced grants; NOT SUFFICIENT for all six guarantees** | F/V: column grants and new role-specific RLS can support the statements. Parent locking needs UPDATE authority. Raw INSERT/pointer UPDATE can bypass expected-state and actor checks. No such identity is established on a target. |
| B. Restricted capability function, option D | **CONDITIONALLY FEASIBLE in design; NOT QUALIFIED** | V/P: execute-only caller and narrowly privileged nonlogin owner can hide raw DML and enforce protocol. Requires new function/RLS/ACL design, trusted gateway identity and v1 parity proof. No existing function implements it. |
| C. Production security model | **RECOMMEND D, conditional on explicit gateway-trust acceptance** | Stronger database enforcement of allowed operations. No guarantee against gateway actor impersonation after full runtime compromise. If independent actor proof under that threat is mandatory, both current proposals remain NO-GO pending a separate attestation design. |
| D. Host/driver reference readiness | **READY TO SELECT A CANDIDATE; NOT RUNTIME-QUALIFIED** | Isolated Node `v24.18.0` reference candidate with proposed exact `pg@8.16.3`; source/documented behavior fits investigation. Dependency tree, security review, TLS, disposal and target behavior are unqualified. No installation authorized. |
| E. Offline I06 implementation | **CONDITIONAL GO for admission-policy preparation only** | Four named new source/test files, injected mocks, no network/credentials/core/SQL/dependency changes. Writer/SQL-function implementation is blocked on D02 and parity design. No coding is authorized by this verdict. |
| F. Actual synthetic Auth/SQL connectivity | **NO-GO / NOT EXECUTED** | Needs target, identity, operator, fixture, fault and cleanup authorization, then target/privilege qualification. No actual Auth or SQL request in this preflight. |
| G. Production activation | **NO-GO** | P05/P06/G02 and inherited platform, clean-install, adversarial, transport, provider/receipt, T15 and operations/release gates remain open. |

F = observed local source/Git fact; H = historical accepted execution; V = current official vendor documentation or upstream source; P = proposed design/inference; U = unverified target assumption or required experiment. A vendor-supported mechanism is not an MPIA pass.

## 2. Baseline, evidence and preservation

| F: observed baseline | Value |
| --- | --- |
| Repository | `C:/Users/ysyap/AI Projects/malaysia-property-investment-analyzer` |
| Branch / HEAD | `phase2-location-intelligence` / `1dd47b6c33b96b6a43ff3a22e2b58c733738f76f` |
| Local main | `72c2b8748d6468747b9784597b8f596e030b0dfb` |
| Initial tracked/index differences | Empty |
| Initial untracked paths | Three I06-DESIGN-01 documents and three RELEASE-01 artifacts, listed below; preserved |
| Entry preservation inventory | 408 existing nonignored files hashed in memory; no additional manifest file created. Secret/environment filenames excluded by the inventory filter; none encountered in this inventory. Ignored dependency/build/scratch trees are outside this byte-preservation claim. |

Existing untracked files:

- `docs/PHASE2A_03_I06_ARCHITECTURE_REVIEW.md`
- `docs/PHASE2A_03_I06_IMPLEMENTATION_READINESS.md`
- `docs/PHASE2A_03_I06_SECURITY_DECISION_REGISTER.md`
- `docs/PHASE2A_03_RELEASE_01_GIT_CHECKPOINT_CHECKLIST.md`
- `docs/PHASE2A_03_RELEASE_01_GIT_CHECKPOINT_REPORT.md`
- `docs/phase2a03-release01-git-results.json`

Source anchors, SHA-256 of entry bytes:

| File | SHA-256 |
| --- | --- |
| Foundation migration `20261016000000_phase2a01_foundation.sql` | `33a36f5890ce75bc3d2a035482d828224fce28a4c585911539b4856e77875393` |
| Location migration `20261017000000_phase2a02_property_locations.sql` | `bebe96e843b5e8198fe6ec4e59d9091aea5bbec71a63e555e717cc645ca23e40` |
| `src/server/location/transaction.server.ts` | `e383293a75c4263697ffbe55fe032882b8f71b8a4dcc9db3d5031343c186ea65` |
| `src/integrations/supabase/types.ts` | `ffcbec32309a369926843a99ec2b1a65ad8cf0ee500b43eee982ec105ae55347` |

Evidence inspected and its authority:

| Evidence | Use and qualification |
| --- | --- |
| [AGENTS.md](../AGENTS.md), [PROJECT_RULES.md](../PROJECT_RULES.md), [Phase 1 freeze](PHASE1_ARCHITECTURE_FREEZE.md), [Phase 2 plan](PHASE2_ARCHITECTURE_PLAN.md) | F: preserve deterministic finance, actual ownership/RLS, independent save path and published history. Present explicit preflight authority permits these documents only. |
| [2A-02 acceptance](PHASE2A_02_FINAL_ACCEPTANCE_REPORT.md), [TEST-CLOSURE-02](PHASE2A_02_TRANSACTION_CLOSURE_REPORT.md), schema/transaction JSON and accepted SQL/test helpers | H: qualified local PostgreSQL 17.11/PostGIS 3.3.7, TC01–TC14, genuine deferred-COMMIT failures and observed contention; not new-driver or real-user Auth evidence. |
| [IMPLEMENT-01](PHASE2A_03_IMPLEMENT_01_REPORT.md), [IMPLEMENT-02](PHASE2A_03_IMPLEMENT_02_REPORT.md), [final audit](PHASE2A_03_FOUNDATION_FINAL_ACCEPTANCE_REPORT.md), [correction closure](PHASE2A_03_CORRECTION_CLOSURE_REPORT.md) | H/F: I01–I05 are accepted at corrected bytes. Historical F01 failure and fake G01 limitation remain historical; closure fixes their specified defects. G02 remains open. |
| [RELEASE-01 report](PHASE2A_03_RELEASE_01_GIT_CHECKPOINT_REPORT.md), checklist and JSON | H: exact 42-addition checkpoint, normal feature-only synchronization and retained acceptance. No new remote-state check here. |
| Three existing I06-DESIGN-01 documents listed above | Planning baseline only. Their B bridge and earlier Edge preference are evaluated, not inferred approved. |
| Actual migrations, canonical/contracts/core/ports/command builder, location/transaction tests, catalog query, package/build/server/Auth configuration and installed auth-js | F: actual dependency and trust boundaries. Historical catalog is interpreted using its query field order, not assumed current. |

No live grants, policies, role membership, hosted secrets, deployed Auth version, running database or endpoint were inspected. No Docker/database runner was executed. Current service-role privileges below mean **the effective accepted local capture/source baseline**, never a fresh hosted assertion.

## 3. Exact accepted SQL dependency matrix

Abbreviations: P = `public.properties`; H = `public.property_location_versions`; S = `public.property_location_intelligence_state`; R = `public.location_provider_registry`. These are capability requirements, not executable grants or migration instructions.

| Accepted operation / dependency | Required authority and policy under non-BYPASSRLS | Observed accepted boundary / consequence for A and D |
| --- | --- | --- |
| `transactionSql.parent`: SELECT nine columns, `WHERE id=$1 FOR UPDATE` | SELECT `id,user_id,project_name,full_address,city,district,state,postcode,country`; UPDATE on at least one P column; applicable SELECT **and UPDATE USING** RLS policies | F: existing P policies target authenticated, not a new role. A needs new policies and a lock-enabling column privilege. D's owner needs them; execute-only caller does not. |
| Minimal P column UPDATE grant | Satisfies lock privilege without table-wide UPDATE. Does not grant UPDATE of other columns | P: restrict to a reviewed nonfinancial column if A is retained. `updated_at` is a candidate only: existing `set_updated_at` overwrites it on actual UPDATE, still changing Phase 1 metadata. `id`, `user_id`, seven saved inputs and finance columns are unacceptable shortcuts. No lock-only privilege exists in this grant. |
| Pointer guard's parent lock | `guard_property_location_pointer` executes `PERFORM 1 FROM P WHERE id=NEW.property_id FOR UPDATE`; SELECT id plus a P UPDATE column and SELECT/UPDATE policies | F: SECURITY INVOKER. Its postgres owner does not lend authority. Elevating only a new outer lock helper leaves this second dependency unresolved. Nonnull INSERT and changed nonnull pointer take this path; null INSERT and unchanged pointer return early. |
| H reads: prior, latest, pointer lineage | SELECT all returned version columns (listed below); pointer subquery reads property_id/id; MAX reads version_number; pointer guard orders version_number and reads id/property_id | F: no row-lock UPDATE grant on H needed. A requires owner-scoped SELECT policy; D owner needs read access/policies. |
| H append: 24 explicit INSERT columns + RETURNING | INSERT only those explicit columns; SELECT RETURNING columns; INSERT WITH CHECK and SELECT policy covering new row | F: existing service_role has SELECT/INSERT; no H UPDATE/DELETE/TRUNCATE/TRIGGER/REFERENCES/MAINTAIN or grant option in historical effective capture. A must not gain them. Appending arbitrary syntactically valid commands is still possible with raw INSERT. |
| H invoker guard | Reads R if provider_version_id nonnull; stamps created_at/confirmed_at; scalar checks; DELETE branch reads P but runtime DELETE is denied | F: no parent lock on H INSERT; no owner/input hash preimage, next-version, CAS or expected-state check in this trigger. `created_by` is not authenticated by it. |
| S read/lock | SELECT property_id,state_revision,current_location_version_id,created_at,updated_at; UPDATE on at least one S column for `FOR UPDATE OF s`; SELECT/UPDATE USING policies; H SELECT for pointer_valid | P: `current_location_version_id` UPDATE needed by CAS already supplies the S lock prerequisite. Do not grant revision/timestamp UPDATE merely because triggers write them. |
| S create | INSERT(property_id); default other fields; SELECT five RETURNING columns; INSERT WITH CHECK and SELECT policy | F: core creates revision0/null state. Raw S INSERT can create inert state independently of H. Restrict INSERT columns to prevent a caller supplying an initial pointer. Existing broad service INSERT is wider. |
| S CAS | UPDATE(current_location_version_id); SELECT property_id,state_revision,current_location_version_id and five RETURNING columns; SELECT + UPDATE USING/WITH CHECK policies | F: accepted WHERE binds property + revision + null-safe pointer; exactly one returned row/+1 required by core. Raw UPDATE authority cannot require callers to include that WHERE. |
| S guards | State guard writes revision and times in NEW, rejects identity/creation-time changes; pointer guard reads H and locks P | F: no separate client UPDATE grant needed for BEFORE-trigger assignments. Unchanged pointer still increments revision via state guard. Pointer guard requires latest existing same-property H row, not that it was appended in this transaction. |
| R eligibility | SELECT id,deprecated_at,approval_state,retention_class,reviewed_at,terms_reference,review_reference,capabilities; SELECT policy | F: core and H guard use ordinary SELECT, no R lock/write grant. Matching labels are not field-level legal permission. Initial manual-only qualification can deny all provider-derived writes. |
| Existing ownership helper, if reused | EXECUTE `public.owns_property(uuid)`, schema USAGE public/auth, EXECUTE `auth.uid()`, required P SELECT and matching P policy | F: helper is stable SECURITY INVOKER, `search_path=public`, qualified P/auth.uid references. It consumes database claim settings; it does not verify a bearer signature. New policies must not assume claim GUCs are unforgeable. |
| Schema / connection / functions | CONNECT to fixed database, USAGE relevant schemas; only required application helper EXECUTE. No schema CREATE, table ownership, TRIGGER, role administration or object replacement | F: migrations revoke direct guard EXECUTE from runtime roles and PUBLIC while attached invoker triggers operate in historical tests. Do not add guard EXECUTE as a speculative fix. Trigger attachment/creation authority is distinct from DML firing an accepted attachment. |
| Types / generated geography | Existing scalar/array types; extensions schema USAGE and geometry/geography type access as required; execution of expression/check functions under inserting identity | F: position is GENERATED ALWAYS STORED, omitted from INSERT/RETURNING. Source preflights check spatial signatures for postgres/service_role, not A/D owner. A new role requires a fresh dependency proof, even if position is not selected. |
| Spatial functions/casts | `st_makepoint(float8,float8)`, `st_setsrid(geometry,int4)`, geography(geometry), geometry(geography), st_isempty(geometry), st_isvalid(geometry), st_srid(geometry), st_ndims(geometry), all in extensions | F: exact signatures checked immutable in accepted migration. No new extension installation, ownership or blanket extensions EXECUTE implied. SRID/GiST internal support and transitive function behavior need target testing; direct spatial_ref_sys SELECT is not established as a runtime requirement. |
| Defaults / constraints / indexes / FK | Existing uuid/time defaults and scalar functions; uniqueness/PK/check/generated-index/FK execution | F: no sequence/serial in H/S, so no sequence grant proposed. No new REFERENCES needed merely to insert under an existing FK; runtime does not create FKs/indexes. FK checks are not an authorization substitute and can expose existence via errors; sanitize errors. |
| COMMIT / rollback | Same reserved transaction and explicit completion; all deferred constraints honored | F: deferred composite `(property_id,current_location_version_id)` FK can fail at COMMIT. Function return or INSERT success is provisional. |
| Fixed role setup | Current SQL literally `SET LOCAL ROLE service_role` | F: incompatible with an A identity lacking SET service_role. A must explicitly replace/remove this setup under approved core change. D caller stays execute-only; SECURITY DEFINER switches effective authority for the function, without SET ROLE inside it. |

The H INSERT columns, in accepted bind order, are `id,property_id,version_number,operation_id,operation_hash,property_input_hash,created_by,input_address,normalized_address,normalization_version,longitude,latitude,coordinate_source,source_crs,provider_version_id,provider_candidate_id,retrieved_at,coordinate_precision,accuracy_m,geocode_confidence,confidence_mapping_version,confirmation_status,confirmed_by,change_reason`. RETURNING adds `created_at,confirmed_at` to that set, using the order in `versionColumns`; position is excluded. S RETURNING is exactly `property_id,state_revision,current_location_version_id,created_at,updated_at`.

V: row locking requires SELECT and UPDATE on at least one column; UPDATE policies' USING predicates apply to SELECT FOR UPDATE, but their WITH CHECK predicates do not apply to a plain locking SELECT. Thus a proposed UPDATE policy with an owner-scoped USING and false WITH CHECK could allow locks while denying actual UPDATE, provided no other permissive policy opens the write path. This is a **design alternative requiring target tests**, not a current policy or a reason to declare A impossible solely because of its lock grant. It also does not solve raw H/S protocol bypass. [PostgreSQL SELECT](https://www.postgresql.org/docs/17/sql-select.html), [policy command matrix](https://www.postgresql.org/docs/17/sql-createpolicy.html).

V: generated expressions evaluate after BEFORE triggers; expression-function authority follows invoker/definer semantics. Qualification must test the new effective role, not infer success from service_role. [Generated columns](https://www.postgresql.org/docs/17/ddl-generated-columns.html), [trigger execution order](https://www.postgresql.org/docs/17/trigger-definition.html).

V/F: distinguish type-USAGE checks in the accepted migration's prerequisite audit from per-query enforcement. PostgreSQL type USAGE principally controls creating dependent schema objects; it does not gate every value of an existing column appearing in a query. Runtime schema lookup and expression-function/cast permissions still matter. The new caller/owner must be tested against the existing generated expression and checks; do not invent broad type/extension privileges or treat type-USAGE revocation as a complete runtime barrier. [PostgreSQL privilege semantics](https://www.postgresql.org/docs/17/ddl-priv.html).

## 4. Existing authority, PUBLIC and escalation paths

F/H: original Phase 1 migration explicitly grants ALL to service_role on all seven application tables, including properties and financial children. The ordinary-role restriction migration revokes dangerous privileges from PUBLIC/anon/authenticated, not service_role. Location migrations deliberately narrow their new objects and verify effective grants, including inherited rights/grant options. This does **not** make service_role narrow across the project.

H: `phase2a02-schema-verification.json` catalog roles use `(name,super,bypassrls,createrole,createdb)`: service_role is `(false,true,false,false)` and postgres `(false,true,true,true)`. Historical P/H/S owners are postgres; H/S FORCE RLS are true, with runtime SELECT authenticated, H SELECT/INSERT service_role and S SELECT/INSERT/UPDATE service_role. Pointer/history guards are postgres-owned **invokers**, `search_path=pg_catalog`, with ACL `postgres=X/postgres`. These facts are historical, not hosted role certification. FORCE RLS does not constrain a BYPASSRLS role. [PostgreSQL RLS](https://www.postgresql.org/docs/17/ddl-rowsecurity.html).

H: captured memberships show authenticator can SET anon/authenticated/service_role, with INHERIT false/ADMIN false; postgres has much broader memberships including service_role, authenticator, read-all-data and signal-backend. The capture does not establish LOGIN/password/connection-limit facts. Do not equate a Supabase service API key with a SQL password.

P/U: A or D caller/owner must have no superuser/BYPASSRLS/CREATEROLE/CREATEDB/replication power, grant/admin options, table ownership, authenticated/service/authenticator membership, or transitive SET route to a more powerful identity. Nonlogin D owner must be unreachable by caller membership and own only the capability functions, not application tables/schemas. NOINHERIT alone does not remove SET authority; SET LOCAL does not sandbox session_user and RESET can recover session authority. [SET ROLE](https://www.postgresql.org/docs/17/sql-set-role.html), [membership/grant rules](https://www.postgresql.org/docs/17/sql-grant.html).

P/U: a later authorized catalog review must enumerate database CONNECT/TEMP, schema USAGE/CREATE, every reachable application view/function/procedure and definer owner, column/table/default ACLs, role INHERIT/SET/ADMIN closure and ownership. Include auth/storage/extensions and alternate overloads/search paths. PostgreSQL does not have a per-role deny overriding PUBLIC privileges; adding a restricted role does not remove PUBLIC EXECUTE or shared schema rights. If a hazardous PUBLIC capability exists, separately review a targeted additive hardening change; never claim narrowness from the new role's explicit grants alone. Harmless pg_catalog functions and catalog visibility remain; the objective is denial of unrelated application capabilities, not literal inability to call any PostgreSQL function. The current evidence is not a complete project-wide reachable-function inventory.

No runtime schema CREATE/TEMP is functionally needed by the normal protocol; defer any TEMP fault-injection rights to a separate test operator. No reader/writer role should gain backend termination authority for convenient cleanup. Existing invoker guards stay invokers; changing their owner alone would not supply missing privileges. No guard or Phase 1 helper is elevated here.

## 5. Can option A supply the six guarantees?

Two threat levels must be distinguished. T1 is an untrusted browser/request against an intact private verifier, builder and transaction core. T2 is arbitrary SQL by a stolen runtime SQL credential or code execution in that runtime. A grant boundary should survive T2 for finance and protocol permissions; a shared server-asserted actor is not independent human authentication under T2.

| Guarantee | A with exact new grants/RLS, intact gateway (T1) | Database enforcement under raw-credential compromise (T2) |
| --- | --- | --- |
| 1. No financial data changes | Achievable in design | Potentially enforceable: no financial table/column writes, parent identity/input/delete denied, audited indirect paths. Parent lock-only RLS design above may deny actual P updates. Not proved against a target/PUBLIC inventory. |
| 2. No cross-user location mutation | Current locked owner check plus new owner RLS can enforce request policy | **Not independently guaranteed** by a caller-writable actor GUC/auth.uid or actor parameter. Stolen shared SQL identity can impersonate a claim. Per-human authenticated DB identity or independent signed assertion would be a different design. |
| 3. No arbitrary history rewrite | Existing rows protected by no UPDATE/DELETE/TRUNCATE plus invoker guard | Existing-row immutability can be enforced, assuming no escalation/P delete/DDL. But raw INSERT still permits fabricated history, skipped version numbers and made-up hashes/created_by. Distinguish overwrite denial from valid operation admission. |
| 4. No unauthorized current-pointer change | Core CAS and ownership check work for compliant calls | **Not enforced as a complete protocol.** UPDATE privilege can omit expected revision/pointer predicates, republish the latest existing version or issue same-pointer UPDATE to increment revision. Guard prevents null reset/backward/cross-property pointer, not all unauthorized changes. |
| 5. No reachable privilege escalation | Conditional on complete inventory and target tests | Not established by present files. Explicit/PUBLIC/transitive/definer/schema/default-ACL paths must be audited; no unsafe existing path is invented. |
| 6. No dependence on client-supplied actor | Achievable at browser boundary through private verifier | Raw SQL created_by/context is still a runtime assertion. Grants, hash syntax and auth.uid alone cannot prove a bearer was verified. |

P: an A identity can be useful if the owner explicitly accepts a trusted-application protocol and location-wide compromise radius. It cannot be described as the database permitting **only approved location-version operations**. Enforcing that requires new database protocol logic or authenticated per-user capability, moving beyond A's simple grant/RLS adaptation. A locking helper alone is insufficient.

Option B remains a **temporary synthetic qualification bridge only**: dedicated login allowed SET service_role preserves I05 setup, but admits broad financial/application authority through that role. No current bridge exists or is authorized. Reject postgres/admin bootstrap for runtime, even if code immediately SET LOCAL service_role.

## 6. Option D: concrete boundary and remaining design work

P: prefer a fixed SQL capability called over a reserved direct SQL connection, with an explicit outer READ COMMITTED transaction. Execute-only login receives only CONNECT/USAGE and EXECUTE on approved exact capability signatures; it has no P/H/S/R raw access. A dedicated nonlogin, non-BYPASSRLS, non-table-owner function owner holds the matrix's narrow data rights and applicable policies. Its real parent UPDATE lock authority is hidden from caller SQL. Invoker triggers execute within that definer's effective authority and retain their accepted checks.

The capability must perform, in order: establish trusted actor context from the admitted private gateway; lock P; compare locked current owner and seven saved inputs; lock S if present; validate current-pointer lineage; check prior operation; on duplicate validate original actor/hash and return original version plus observed state without writes; otherwise enforce ABSENT/EXACT revision and pointer; apply provider field rights or reject provider data; create inert S if needed; allocate bounded next version; append H; exact pointer CAS and +1 result; return provisional rows. Caller must not be able to skip steps, choose SQL/target/schema or request a generic row mutation. No internal COMMIT, autonomous transaction, swallowed partial failure or policy activation.

V/P: use fully qualified objects and safe `search_path` with `pg_temp` explicitly last, only trusted nonwritable schemas ahead of it, no dynamic caller SQL, no unreviewed overloads. Create function and revoke default PUBLIC EXECUTE atomically; grant only approved caller signatures. Caller cannot alter/replace/own function or SET its owner. Keep migration/operator authority outside runtime. [PostgreSQL SECURITY DEFINER guidance](https://www.postgresql.org/docs/17/sql-createfunction.html).

**Actor trust is explicit:** the proposed function takes actor identity only from the private verified-gateway path; the end-user request has no actor selector. Binding a UUID argument to a locked property's owner prevents mistakes by an intact gateway, not impersonation by a stolen execute-only credential. Same is true of a GUC. No production approval should imply the database verified a JWT. If the owner requires resistance to forged actor input from an authorized SQL caller, require a separately designed independently verified assertion or trusted JWT-to-DB gateway; its verifier, key freshness, session binding, target binding and replay controls must be qualified. No existing suitable primitive is established. A public service-key RPC with actor_id is rejected.

**V1 parity is a blocking design gate before writing the capability.** I05 currently computes the locked-row fingerprint in TypeScript; moving all locking/checks into SQL changes that implementation boundary. SQL JSON/JSONB rendering is not assumed to reproduce ECMAScript JSON.stringify escaping, Unicode, binary64 formatting, -0 and null/empty rules. Approve and prove both locked-property fingerprint and full operation preimage methods with accepted golden/adversarial vectors. A gateway-supplied hash alone does not prove the locked inputs or canonical preimage. Passing canonical bytes plus typed fields is only a candidate until byte-to-field binding and canonicality are proved; parsing/re-emitting JSONB is insufficient. Preserve original retrieved_at spelling in hash even where SQL timestamps compare equal instants.

D therefore requires a **new private executor and additive migration**, not an adapter pretending to run the current sequence. Preserve I05 core as the parity reference; do not intercept/rewrite its SQL strings to call a function. A later owner instruction must explicitly approve the replacement execution path and accepted D06 model change. Existing migrations remain immutable. See comparison for deployment route and tests.

## 7. Smallest private verifier and revocation policy

F: installed supabase-js/auth-js are 2.116.0. Source `GoTrueClient.getClaims` verifies signature/expiry or uses getUser fallback; its asymmetric branch does not add MPIA's exact issuer/audience policy. Current generated middleware requires sub after getClaims. Existing token attacher uses the generated client, while active browser external configuration is separately fixed. No current location writer is wired. `client.server.ts` is a privileged HTTP admin client, not an SQL transaction adapter. None of those modules is changed.

P: the smallest acceptable private verifier has one immutable server-owned manifest, request-local Auth client, explicit policy evaluator and fail-closed online confirmation. It exposes the existing ActorVerifierPort, not a public auth endpoint:

1. Fix environment/project ref, HTTPS Auth origin, exact issuer/JWKS origin, audience, signing algorithm allowlist, SQL endpoint/database/login/mode/TLS and operator attestation of Auth-to-SQL mapping. A shared database name, matching UUIDs or migration hashes do not establish project identity. No caller-selected DSN, jku/x5u URL, issuer or JWKS override; no fallback to ambient admin configuration.
2. Accept one bounded bearer token as evidence, not decoded claims, an actor object, stored session JSON or an API key. Use a request-scoped client with no storage/persistence/auto-refresh. No refresh token or admin secret is needed. Verify the exact token's signature with the fixed project key source and expiry checking enabled. Prefer an approved asymmetric ES256/RS256 target; legacy symmetric online verification requires separate selection, not possession of a JWT signing secret. [getClaims](https://supabase.com/docs/reference/javascript/auth-getclaims).
3. After successful verification enforce exact issuer; audience exactly `authenticated` (or the explicitly approved audience-set rule); role exactly authenticated; canonical nonzero UUID sub and session_id; finite integer iat/exp, valid nbf when present, ordered times and exp after admission window. Reject anonymous users, alg none/algorithm confusion, unknown key and future/expired claims. Propose at most 30s future-iat/nbf skew, no expiry grace, and at least 15s remaining lifetime at admission for present budgets; these numeric choices need owner/qualification approval. Fail on malformed or missing policy data, not metadata-based exceptions.
4. Call fixed-project `getUser(exactSameToken)` and require success, user.id=sub and nonanonymous user status. Neither getSession nor local decoding is sufficient. Auth/network errors deny before SQL acquisition, with no raw error logging. No positive authorization/session cache between operations. [getUser](https://supabase.com/docs/reference/javascript/auth-getuser).
5. Require session-liveness evidence for this exact user/session/token on the selected service. A successful getUser may supply it **only after that target's required revocation behavior passes qualification**. Otherwise stop and separately design a narrow liveness oracle; do not grant broad auth.sessions SELECT or add an admin key. Recheck expiry/remaining lifetime using the clock after all online checks, stamp verifiedAt locally, retain target/session/expiry context privately and return only existing `{userId,verifiedAt,issuer}`. Do not extend the actor object or v1 hash fields.
6. Bound admission-to-reservation/transaction time, reauthenticate every attempt, and never refresh/rebase a command silently. With current 2s acquire/8s transaction budgets, the proposed 15s remaining-lifetime floor leaves margin, but real scheduling/driver bounds still need proof. Auth is outside SQL locks; locked current ownership/input checks occur before history/replay. If a chosen policy needs another freshness checkpoint unsupported by I05, obtain an explicit executor/core decision first.

### Revocation evidence, without overstating guarantees

| Case | What existing documented interface can establish (V) | What remains U / qualification |
| --- | --- | --- |
| Forged signature, unknown key, wrong issuer/audience/role/project, expired token | Fixed signature/key verification plus explicit policy rejects these; getUser online confirmation supplements it | Actual configured key/issuer/algorithm, negative tests and bounded JWKS refresh/cache behavior |
| Local/global/other-session sign-out | Sign-out invalidates affected refresh sessions; access JWT signature alone remains valid until expiry. Session documentation links session_id to auth.sessions existence | Which scopes remove this session, when getUser rejects its old bearer, deployed Auth behavior and propagation bounds |
| Session row removed | Vendor documents absence of matching session row as sign-out evidence; advanced server guidance describes getUser for server-side session termination detection | getUser response contract does not expose a raw session record/explicit liveness attestation. Prove absent-session rejection on selected target; no arbitrary-session DB access implied |
| Deleted or banned user | getUser retrieves authenticated user online; current upstream Auth authentication source loads user/session and rejects banned users | Actual deleted/banned-user and old-token outcomes on deployed version. Upstream master is source evidence, not a pinned deployed contract |
| Refresh token revoked/reused/rotated | Refresh-token lifecycle is distinct from access-token validity | Do not infer every refresh invalidation revokes an issued access JWT; test the required event and session_id behavior |
| Session maximum lifetime, inactivity or single-session settings | Documented session controls exist; enforcement/cleanup can be delayed or tied to refresh | Exact plan/config, getUser vs refresh enforcement and maximum accepted admission delay |
| Signing-key removal/rotation | Signature policy uses only fixed trusted current key sources | Old-key overlap, local/CDN JWKS cache lifetime and online rejection; rotation alone is not instantaneous rejection |
| Ownership transfer/deletion after Auth | Locked P row provides current ownership authorization | Real transfer/delete races, no former-owner historical disclosure |
| Revocation after admission | No promise of instant cancellation | Already admitted bounded transaction may commit. Stricter revocation-at-COMMIT needs a separately coordinated design |

Vendor sources for this table: [signOut](https://supabase.com/docs/reference/javascript/auth-signout), [sessions](https://supabase.com/docs/guides/auth/sessions), [advanced server Auth guidance](https://supabase.com/docs/guides/auth/server-side/advanced-guide), [current upstream Auth authentication](https://raw.githubusercontent.com/supabase/auth/master/internal/api/auth.go). The documentary statements support a testable online path; none closes P06 for MPIA. All real revocation cells are NOT EXECUTED here.

## 8. Qualification needed before a writer can be accepted

P: later evidence must distinguish tests of the unchanged I05 reference from the proposed D executor. Mock success is not PostgreSQL privilege evidence. Existing 2A-02 runners may overwrite accepted artifacts or rely on postgres; use them as source references, not an automatically authorized I06 runner.

| Gate | Required observations |
| --- | --- |
| Privilege closure | Actual session_user/current_user/LOGIN and role options; complete PUBLIC/default/column/function/membership closure; caller denied raw P/H/S/R, financial tables, owner SET, DDL and alternate capability signatures; no reachable admin secrets |
| RLS and invoker dependencies | New owner/role positive and negative SELECT/lock/INSERT/UPDATE RETURNING; false WITH CHECK lock-only experiment if A revisited; all accepted guards stay enabled/invoker; generated spatial expression succeeds without blanket grants |
| Forged input | Browser actor/created_by/confirmed_by/target/provenance selectors rejected; wrong user/property; manual-only policy; separate arbitrary execute-caller actor-forgery test records the gateway trust residual rather than claiming denial |
| Protocol and v1 | Golden/adversarial bytes for both serializers; exact semantic fields/receipt spelling; ABSENT versus inert zero/null; safe integer limits; no-op revision abuse denied by capability; contiguous version; exact CAS; duplicate before fresh-token check and after owner/input checks |
| Real races | Parent-first two first-writers, stale competitors, same-ID twins/conflicts; address/finance-only edit, transfer/delete; observer proves actual backend blocking, not elapsed sleep alone |
| Commit/rollback/reconciliation | Genuine COMMIT and aborted-COMMIT ROLLBACK tags; real deferred rejection; loss before/after server commit, process death; independent persisted truth; same-ID recovery without new ID/repoint; changed-input/transfer/delete limitations retained |
| Host/driver | Real backend affinity, cancellation/hard close and lock disappearance within approved bounds, late acquire/release/abort races, physical-generation quarantine; microsecond/bigint/float8/tag/row-count/TLS mapping |
| Privacy/operations | Synthetic private canaries across Auth/driver/pool/notices/DB/proxy/APM sinks; no raw tokens/DSNs/SQL/parameters/private rows/errors; connection budget, rotation/drain/revoke, cleanup and recovery owner |

Known COMMIT remains committed after cleanup/log failure. A thrown/lost COMMIT stays UNKNOWN even if an error has SQLSTATE 23503; only a completed, qualified server rejection is REJECTED. Do not turn a function's returned success into COMMITTED before outer COMMIT. Changed saved inputs can block execution replay; a later current-owner-authorized historical observation is separate, cannot republish, and missing history after cascade is not proof of never committed.

## 9. Fresh offline verification and final stop

| Check executed in this preflight | Result |
| --- | --- |
| `node node_modules/vitest/vitest.mjs run --no-cache` | Exit 0; 39 files, 1,472 passed, zero failed/skipped |
| `node --test tests/phase2a02-contract.test.mjs tests/security.test.mjs` | Exit 0; 10 passed, zero failed, one expected built-browser-root skip |
| `node node_modules/typescript/bin/tsc --noEmit` | Exit 0; no diagnostics |
| Entry-file SHA-256 comparison after document creation | 408 existing nonignored files unchanged, zero missing or mismatched |
| Git preservation | Same branch/HEAD/local main; tracked/index diffs empty; six preexisting untracked paths unchanged; exactly the three requested new documents added |

No build, seven-project expansion, browser interaction, database/Auth/driver/host test, extension installation or current remote verification was performed. RELEASE-01's build/platform evidence remains historical. Existing suites were run using installed binaries without report-file output or dependency installation; no acceptance evidence was regenerated.

No secrets/environment values were inspected, credentials accessed, users/roles/grants/functions/policies created, endpoint started, deployment attempted or Git write performed. Application source, migrations, tests, configuration, dependencies and existing evidence retain entry bytes. New document files necessarily appear as untracked additions; “Git unchanged” here means refs, index and existing-file state are preserved.

**Stop for independent owner review of these three documents.** Selection of a design, approval of the four-file offline slice, any target connection, migration/provisioning, and production exposure are separate decisions. No approval is inferred from existing planning documents.
