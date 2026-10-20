# MPIA — Phase 2A-03 DESIGN-01 decision register

20 October 2026, Asia/Kuala_Lumpur. **No new decision below has owner approval yet.** The present instruction authorizes architecture review and five new documents only. Implementation requires a separate owner instruction after review. Approval of this proposal must identify the approved decisions/slices; it does not automatically approve a credential, provider, endpoint, migration, deployment or Git action.

References: [architecture](PHASE2A_03_ARCHITECTURE_REVIEW.md), [interfaces](PHASE2A_03_INTERFACE_PROPOSAL.md), [transaction](PHASE2A_03_TRANSACTION_DESIGN.md), [readiness](PHASE2A_03_IMPLEMENTATION_READINESS.md).

## 1. Already settled; do not seek or infer replacement approval

| Source / decision | Accepted constraint carried forward |
| --- | --- |
| User's requested baseline | Exact branch `phase2-location-intelligence`, HEAD `e000da794e44619f945597e83b004895e3854a71`; verified locally and against GitHub feature. No history rewrite |
| Phase 1 freeze / PROJECT_RULES | Preserve seven original tables, five migrations, deterministic engines/configuration/scenarios/scoring/confidence/risk/recommendations, evidence meanings and independent property save/analysis |
| Existing ownership | Authorize through actual `properties.user_id`, frozen invoker helper and RLS; provenance actor columns never grant access |
| 2A-01 foundation | Three append-versioned registries, optional state, exact 61 fact definitions and canonical context labels; no arbitrary new facts, seeds or active provider |
| 2A-02 D02 | One immutable history table and one nullable state pointer, current constraints/indexes/guards; no candidate/origin/job table |
| 2A-02 D03 | Pointer means latest intent, including unconfirmed/review/cleared. Confirmed and matching current seven-field fingerprint required for a usable current origin. Strict semantic append, no distance tolerance |
| 2A-02 D04 | Explicit owner confirmation, honest unknown accuracy/confidence, exact provider provenance, private actor UUIDs without mandatory Auth FK, reviewed permanent fields only |
| 2A-02 D05 | Deferred NO ACTION composite pointer FK; conditional cascade requirement demonstrated in retained real COMMIT/property/Auth tests. Do not revert to RESTRICT or weaken guards |
| 2A-02 D06 | Dormant service authority: history S/I, state S/I/U; trusted owner/input/expected/idempotency checks in one transaction. No endpoint/RPC/worker. Privileged function requires separate decision |
| 2A-02 D07 | WGS84 scalar pair, generated geography Point 4326 in extensions, partial GiST. Initial Analysis Origin equals confirmed Subject Location; Subject Property distinct from POI |
| 2A-02 D08 plus separate installation approval | Packaged PostGIS 3.3.7 enabled on exact existing local target; not blanket authority to install/upgrade elsewhere or alter Docker |
| Final acceptance / checkpoint | Local development foundation accepted with qualifications and synchronized checkpoint; production readiness remains blocked |

All ten owner-approved reconciliations retain their exact scope: ARC-01 bounded evidence; 02 method/unit-specific evaluation; 03 configured coverage before renormalization; 04 no official draft score; 05 lawful retention/replay; 06 separate processing/freshness/publication; 08 responsibility-driven table count; 09 provider-neutral provisional geocoder; 10 context anti-circularity; 11 no undefined scoreable metrics. ARC-07 and ARC-12–18 are not collectively promoted to approved status by this review.

## 2. New proposals awaiting owner review

Each entry states what is proposed, why, the preserved constraint, introduced risk, required tests, alternatives and exact approval boundary. Details in the companion documents form the reviewable proposal; the summaries do not approve it.

### P01 — Contract separation and phase boundary

**Propose:** validated primitives, discriminated provider outcomes, provider-neutral geocode/Places/routing/map ports, trusted command/result types and a server-only writer port. Implement geocode contracts/fakes in 2A-03; Places/routing/maps remain interface stubs. No adapter receives a database writer or confirmation authority.

**Why / constraint:** replaces ambiguous row-shaped API inputs while satisfying provider neutrality, explicit unknown/no-results semantics and immutable authoritative lineage. Keeps Phase 1 engines and UI untouched.

**Risk:** TypeScript branding can be mistaken for runtime authorization; speculative ports can overconstrain later adapters. Keep contracts minimal, versionable and explicitly nonauthoritative.

**Test:** strict positive/negative type fixtures; runtime unknown-key/missing/null/finite/coordinate/status validation; provider fakes with timeout/rate/quota/empty/invalid response. No successful provider response can invoke persistence by itself.

**Alternative:** generated DB Insert types as request contracts are simpler but accept broad strings/generated metadata and do not express trust; reject. A full provider framework adds unnecessary infrastructure; defer.

**Approval:** required for initial 2A-03 contract slice. No approval of provider, live adapter, UI or endpoint follows.

### P02 — Preserve v1 serializer bytes; separate identity key

**Propose:** adopt exact seven-field property tuple and exact existing 17-field semantic command order; SHA-256 of compact JSON array UTF-8, lowercase hex; no Unicode/whitespace/address normalization or coordinate rounding. New portable identity tuple scopes `(property_id,operation_id)` without changing SQL. Support v1 only under current schema.

**Why / constraint:** current fixture and schema proposal establish those bytes. Changing NFC/trimming/field lists under v1 would silently reinterpret immutable fingerprint/idempotency meaning. Migration hash fields permit bare digests only and have no serializer-version column.

**Risk:** visibly equivalent Unicode/timestamp spellings can hash differently; JSON number parity can fail across languages; seven-field digests can be guessed and are private. Exact input changes can cause conservative invalidation.

**Test:** old golden bytes/digests plus composed/decomposed Unicode, emoji, escapes, null/empty/missing, field order, -0/exponents/bounds, unsafe integers, bigint decoding, timestamps and financial-only independence. Parameter binding preserves binary64 coordinates.

**Alternative:** NFC or a new canonical JSON standard needs a v2 storage/compatibility decision; no benefit justifies a schema change now. Do not use JSONB output or hash arbitrary vendor JSON.

**Approval:** required to adopt the detailed runtime contract. No new column, migration, rehash or historical fixture rewrite.

### P03 — Retry precedence and observable results

**Propose:** verify current owner/input before replay, then check operation ID/hash before new-operation expected-state checks. Exact duplicates return original immutable version, never repoint; expose observed current state, not an invented original state revision. Later separate authorized reconciliation read can identify an old committed result after input changes without making it current.

**Why / constraint:** follows actual synthetic writer owner/hash precedence and TC08 nonrepublishing behavior. History has no stored original response/revision. Explicit reconciliation addresses commit ambiguity without modifying history.

**Risk:** a retry can return INPUT_CHANGED despite an earlier successful commit; duplicate response metadata can differ as current state changes. Parent deletion erases history, limiting later certainty.

**Test:** duplicate after newer pin, address edit, transfer and deletion; conflict on changed semantic field or expected token; two simultaneous same-ID requests; original ID/pointer/revision/timestamps preserved. Historical status read cannot leak to former owner.

**Alternative:** replay before current-input check improves acknowledgement recovery but changes accepted writer ordering; require a separately named owner change, not silent adoption. Persisting original responses needs schema/retention design; defer.

**Approval:** required for precise response/error contract. Approving a reconciliation port does not authorize an endpoint or new table.

### P04 — Internal reserved-connection transaction

**Propose:** one short READ COMMITTED transaction, parent FOR UPDATE first, current owner/hash, existing state lock, duplicate lookup, exact ABSENT or revision+pointer check, append contiguous bounded version, revision-and-pointer CAS, confirmed COMMIT before success. Use parameterized queries and explicit row mapping.

**Why / constraint:** realizes accepted D06 without REST transaction assumptions or Phase 1 coupling; parent lock serializes absent-state creation and non-key edits. Existing triggers do not enforce all these requirements.

**Risk:** state-first bypass writers can deadlock; incorrect pool use or premature transaction callback results can violate atomicity; service authority remains trusted.

**Test:** fake connection protocol then actual parameterized driver/PostgreSQL integration; two observed first/existing-state races, stale tokens, both absent/existing rollback cases, complete row/time preservation and genuine deferred COMMIT rejection with permanent guards enabled.

**Alternative:** service-only invoker RPC could encapsulate SQL with a new EXECUTE surface; SECURITY DEFINER/revised grants could enforce stronger policy against buggy service code. Both are separate explicit decisions. Reject independent REST calls.

**Approval:** required for dormant core implementation. No RPC, new grant, role, SQL function or active write endpoint included.

### P05 — Explicit SQL credential/bootstrap boundary

**Propose:** keep existing service-role DML grants unchanged. Qualify an existing approved SQL bootstrap connection and fixed SET LOCAL ROLE service_role; never equate a service API key to a SQL password. Do not activate an adapter until actual login/SET/grant authority and credential risk are approved. A core behind an injectable connection port can proceed without credentials.

**Why / constraint:** repository has no application SQL login/pool implementation. Avoids silently changing accepted D06, RLS or roles while making the elevated trust boundary reviewable.

**Risk:** using a postgres bootstrap credential leaves owner/DDL authority reachable through RESET ROLE. SET LOCAL ROLE does not make that secret least privilege. This is a material runtime security risk, not resolved by the local synthetic harness.

**Test:** actual bootstrap/current role identity, existing SET authority, ACLs, authenticated/anonymous denial, pool reset/isolation, secret/bundle/log exclusion. Do not create memberships to force qualification to pass.

**Alternative:** recommend reviewing a restricted login and narrow membership/grants before exposure if broad bootstrap risk is unacceptable. This requires a separate security/schema task. A privileged RPC is another separate alternative. No such choice is made implicitly.

**Approval:** **explicit required decision before any real adapter is enabled**, plus separate approval of a concrete credential configuration. Baseline D06 approval alone does not authorize placing a postgres password in an application runtime. Initial contracts/core can remain dormant while this is open; production remains NO-GO.

### P06 — Runtime host and authenticated project identity

**Propose:** Deno-compatible core, preferred later Supabase Edge SQL adapter using a pinned Deno driver; direct/session connection qualification first, transaction pooler only after driver/mode proof. Request-scoped `getUser(jwt)` against the approved Auth target, with token-policy validation and actor derived server-side. No production endpoint or generated-auth repair in initial 2A-03.

**Why / constraint:** no active Edge function or SQL driver exists; Lovable wrapper's Cloudflare/fetch path is not Node TCP proof. Active browser external client differs from generated token attacher/environment clients. Correct Auth and database target binding is mandatory before privileged persistence.

**Risk:** new runtime/dependency surface, connection budgets/TLS/driver differences, Auth availability/latency and session revocation limits. Project mismatch could otherwise authorize the wrong identity.

**Test:** exact target identity, real two-user synthetic sessions, forged/expired/wrong issuer/audience/service credentials, Auth outage, token expiry during review, actual driver/runtime TLS/pool/COMMIT behavior. Mock Auth and SQL actors are not sufficient.

**Alternative:** qualify existing TanStack host TCP/bindings rather than adding an Edge host; reasonable if evidence supports it. Do not change Lovable build target to make the design appear feasible. Do not introduce an unrelated backend/queue/ORM.

**Approval:** required for host/verification direction; exact driver version, local synthetic configuration and eventual transport are separately gated. No dependency installation, Docker change or hosted test authorized by DESIGN-01.

### P07 — Commit certainty, bounded retries and cleanup

**Propose:** typed known transaction failure, known COMMIT rejection and COMMIT_OUTCOME_UNKNOWN; max two automatic transient retries after initial attempt within budget, unchanged identity/payload and full reauthorization. Proposed 2s acquire/3s lock/5s statement/8s transaction/10s idle budgets require qualification. Release only clean clients; discard uncertain ones.

**Why / constraint:** prevents premature success and double application following a lost acknowledgement; fulfills genuine deferred-constraint COMMIT handling and prior bounded-harness lessons.

**Risk:** ambiguous results require reconciliation; overly short budgets cause avoidable failures, cancellation may not release server locks, and cleanup errors can hide the primary result.

**Test:** real COMMIT rejection, simulated and integration-tested lost acknowledgement, pool/lock timeout, aborted transaction completion, rollback failure, process loss, cancellation release, duplicate recovery and concurrent instance isolation. Known committed results survive later logging/release failure.

**Alternative:** automatic new-ID retries are rejected. Unbounded retries/long transactions increase contention and cost. A durable operation ledger may help later but needs separate schema/lifecycle review.

**Approval:** required for error/retry contract; operational numeric defaults remain proposed until measured on the selected target.

### P08 — Provenance/rights gate and candidate receipts

**Propose:** provider-neutral registry-version/adapter/precision/confidence/rights metadata and normalized errors now; no numeric confidence mapping or live provider. Later encrypted/opaque server receipt binds actor/property/hash/state/request/candidate/expiry. Only reviewed permanent eligible fields may enter existing history. No result fingerprint implementation yet.

**Why / constraint:** satisfies ARC-05/09, accepted provenance and explicit confirmation; provider results are untrusted and must not author versions. Unknown/empty/provider failures must remain distinct.

**Risk:** registry labels alone are not field rights; concurrent withdrawal is not serialized by existing guard; private data in receipts/caches can leak. A content hash cannot detect edit-away-and-back chronology.

**Test:** synthetic provider normalization, confidence unknown vs source accuracy, receipt tampering/expiry/cross-user/property/replay, delayed responses, provider disable/deprecation, retention refusal and log redaction. Live provider gates stay closed until actual policy/adapter tests exist.

**Alternative:** persisting every raw result/candidate requires new schema and retention obligations; reject now. Signed-only address-bearing receipts need separate privacy justification. New registry row locks/grants are not introduced.

**Approval:** required for interface direction; exact provider, field rights, receipt storage/key/TTL, revocation/purge/transfer rules and budget are **deferred blocking decisions before 2A-04 ingestion**.

### P09 — Pure current/historical origin eligibility

**Propose:** deterministic evaluator over a coherent authorized joined snapshot. Latest intent remains separate from usable origin; require exact pointer/property lineage, confirmation, valid coordinates and current v1 input match. Historical mode resolves only its original pinned version, separately authorized and labeled.

**Why / constraint:** accepted D03/D07, independent Phase 1 address saves and exact analysis lineage; no implicit old-origin fallback or newer-pin historical recomputation.

**Risk:** inconsistent multi-request/cached input can yield a wrong decision; snapshot can become stale immediately. Consumers may confuse derived applicability with processing/freshness/publication.

**Test:** absent/inert state, all four confirmation statuses, changed address/project name, financial-only edits, broken/cross-property pointer, stale cached mixtures, historical confirmed/review/cleared/missing rows, and zero provider calls/mutations. Subsequent write always rechecks tokens.

**Alternative:** changing Phase 1 save to synchronously require Phase 2 or adding triggers violates independence; reject. A confirmed-only pointer conflicts with accepted latest-intent meaning.

**Approval:** required for exact API/result contract; accepted conceptual rule is not reopened. No existing hook/UI/data API modification needed in the initial slice.

### P10 — Evidence separation, observability and release gates

**Propose:** sanitized allowlisted diagnostics, no raw rows/parameters/errors through console/APM, privacy-aware correlation, and separate unit/type/PostgreSQL/real Auth/browser/platform pass gates. Preserve all historical sources/reports; create new future test artifacts.

**Why / constraint:** sensitive addresses/JWTs/keys must not leak; synthetic TC01–TC14 cannot establish authenticated runtime security. Existing runners overwrite evidence and pin older HEADs.

**Risk:** driver/server/APM logging can leak data despite safe application logs; overclaiming coverage can expose a dormant privilege boundary prematurely. Too little diagnostic detail can hamper investigation.

**Test:** nested exception/log sink redaction and commit certainty, production bundle/source secret tests, two-user alternate-path denial, all listed regression/security/cleanup gates with explicit skips. Qualify database logging configuration before live ingestion.

**Alternative:** logging complete commands/raw vendor errors is rejected; use diagnostic IDs and restricted investigation tooling. No new logging service/audit table is necessary in 2A-03.

**Approval:** required for implementation/release test policy. Does not close clean-install, platform, provider, T15 or production gates merely by listing them.

## 3. Precisely unresolved conflicts and qualifications

| Item | Status / consequence |
| --- | --- |
| Local main older than remote main | Verified preexisting state, already disclosed by checkpoint. No reset/merge needed for this branch review |
| Older design OPEN/BLOCKED text versus accepted implementation | Historical labels superseded only by explicit approval/final acceptance; do not edit older files or claim their unexecuted tests passed |
| Test README/closure lists representative GiST plan as open | Final acceptance later supplies a representative plan. Treat as historical lag, retain unchanged; not a new production/RLS performance benchmark |
| No hash-version column | Preserve v1 only; any future NFC/field/precision change blocks until separately reviewed compatibility storage exists |
| Broad SQL bootstrap versus least privilege | Open P05 deployment blocker, not silently solved by SET ROLE or by creating a new role |
| Generated versus external Auth client wiring | Open P06 runtime blocker; no proof that current server function tokens belong to the active database project |
| Withdrawal/transfer/receipt durability | Open before live provider/confirmation workflow; no raw candidate persistence or assumed perpetual storage rights |
| Raw service bypass writer | Accepted dormant limitation. Full enforcement against buggy privileged callers requires a separate function/grant design |

## 4. Deferred decisions and earliest gate

| Decision | Assigned phase / gate |
| --- | --- |
| Exact provisional geocoder, normalizer/confidence mapping and field permissions | 2A-04 before any live call/persistence; provider freeze remains 2B benchmark |
| Candidate receipt storage/encryption keys/expiry, consent and request lifecycle | 2A-04 before confirmation transport; no job table now |
| Provider withdrawal/purge and former-owner provenance privacy | Before relevant provider data or transfer capability is exposed; no weakening history guards without approved design |
| More processing/freshness/publication states and UI errors | 2A-04 supporting behavior plus separate additive schema review; not 2A-03 |
| Least-privilege login/new grants/service-only RPC | Separate P05/security design before runtime activation if selected; comprehensive audit in 2A-05 |
| Durable delegated worker authorization/job scheduling | Separate feature task before workers; no implicit service-user impersonation |
| Full clean installation and hostile platform/role/attachment matrix | 2A-06 / deployment qualification on separately approved target |
| All eight T15 browser cases | 2A-06/release on safely configured synthetic frontend/API/Auth environment |
| Canonical places, request cache/fingerprint/ledger, POI/routing provider adapters | 2B; no premature schema/vendor choice |
| Facts, contexts, evidence reuse across metadata corrections | 2C; exact lineage before reuse |
| Assessment/profile publication and historical engine replay | 2D–2F, preserving accepted ARC gates and separate Investment Score |
| Alternate entrance/origin, CRS transforms or spatial tolerance | Separate design before those measurements; default remains confirmed Subject Location |
| Concrete maps/historical evidence UI | 2E; no UI/UX work in DESIGN-01 |
| Serializer v2 / universal operation result ledger | Only when a demonstrated need justifies separate immutable storage/migration compatibility review |

**Owner review recommendation:** approve P01/P02/P03/P04/P07/P09/P10 for narrowly scoped dormant foundations if acceptable; approve P06/P08 as directions with their later gates; explicitly resolve P05 before authorizing a real SQL adapter. Then issue a separate implementation instruction naming slices. No decision in this register is executed by creating it.
