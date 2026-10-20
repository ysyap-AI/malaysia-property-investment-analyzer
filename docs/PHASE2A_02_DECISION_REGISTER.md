# MPIA — Phase 2A-02 decision register

17 October 2026 (Asia/Kuala_Lumpur). **IMPLEMENTATION-01 owner decisions recorded before implementation.** The owner explicitly authorized local source development, database implementation and testing, subject to the gates below. No commit, push, production access or deployment is authorized.

## IMPLEMENTATION-01 approval record (supersedes historical OPEN statuses below)

| ID | Owner decision | Execution condition |
| --- | --- | --- |
| D01 | APPROVED documentation-only baseline `c9b6c4acc1879a2b84b89d3b39455f2489e4c56a` | Verified branch `phase2-location-intelligence`, HEAD and direct parent `e9b55b024263857aacafbd8d9d9158d749d9261f`; no reset/history rewrite. |
| D02 | APPROVED one immutable history table, one nullable state pointer, reviewed constraints/indexes and two invoker guards | Preserve all seven Phase 1 tables, five historical migrations and accepted foundation migration; no additional domain tables. |
| D03 | APPROVED latest-intent pointer, strict semantic versioning, no distance tolerance | Future origin requires CONFIRMED and matching current property-input fingerprint; Phase 1 saving stays independent. |
| D04 | APPROVED reviewed provenance/status fields, explicit owner confirmation, unknown accuracy/confidence, private actor UUIDs without mandatory Auth FKs | Preserve provider provenance; field-specific storage rights must be reviewed before runtime ingestion. No provider selected or seeded. |
| D05 | CONDITIONALLY APPROVED deferred NO ACTION composite pointer FK | Actual property/Auth cascades, history-delete denial, cross-property/commit integrity and unchanged financial cascades must pass. Any failure stops the affected implementation; no constraint weakening or Phase 1 trigger workaround. |
| D06 | APPROVED dormant service-role boundary | No runtime endpoint/RPC/worker. Future backend must verify identity/owner/fingerprint/expected tokens/idempotency and append/update atomically in one transaction. A privileged function requires a separate decision. |
| D07 | APPROVED WGS84 scalars, SRID 4326, generated extensions.geography(Point,4326), GiST | Reject invalid/unsupported coordinates before construction. Initial origin equals confirmed Subject Location. |
| D08 | APPROVED read-only local catalog inspection only until spatial prerequisites are established | Verify exact existing container/image/volume/database and Unix socket. If PostGIS is absent, report available versions, continue safe source preparation and mark spatial execution BLOCKED. Installation/upgrade requires separate approval; no new Docker environment. |

The remainder preserves the DESIGN-01 decision rationale and original review state as historical context. Its OPEN labels and implementation stop point are superseded by this explicit owner instruction; D05 execution evidence and D08 installation authority are not inferred from design approval.

Companions: [architecture review](PHASE2A_02_ARCHITECTURE_REVIEW.md), [exact schema proposal](PHASE2A_02_SCHEMA_PROPOSAL.md), [implementation readiness](PHASE2A_02_IMPLEMENTATION_READINESS.md).

## 1. Decisions needed before schema implementation

| ID | Exact decision requested | Recommendation and consequence | Alternative / trade-off | Status |
| --- | --- | --- | --- | --- |
| D01 — source baseline | Accept `c9b6c4acc1879a2b84b89d3b39455f2489e4c56a` on `phase2-location-intelligence` as the design/implementation baseline, acknowledging it is the documentation-only direct child of requested `e9b55b024263857aacafbd8d9d9158d749d9261f` | Proceed later from this verified descendant; Phase 1 and accepted implementation are identical. Recheck HEAD before any authorized implementation | Owner may name another reviewed checkout; no reset, switch or history repair is performed here | **OPEN — blocks implementation** |
| D02 — structural scope | Approve the one history table, one state pointer, exact columns/constraints/indexes and two additional invoker guards described in schema §§1–7 | Reuse accepted state, keep Phase 1 tables and original migration files unchanged. No extra candidate/current/origin/audit tables, seeds or backfill | Separate current table adds coordination duplication; Phase 1 columns require compelling justification not found here | **OPEN — blocks implementation** |
| D03 — current meaning and materiality | Approve pointer to latest location intent, including unconfirmed/review/cleared; only CONFIRMED + matching property-input hash is an eligible origin. Approve strict append-on-semantic-change and no distance tolerance | Unresolved new address immediately withholds old-location applicability; preserves an honest history. Phase 1 saves stay independent. Metadata changes conservatively produce a new version | Confirmed-only pointer would need an additional pending-intent/revision relationship to avoid treating old geography as current. A material-distance tolerance needs calibrated rules | **OPEN — blocks implementation** |
| D04 — provenance and confirmation | Approve schema vocabularies, explicit owner confirmation for every usable point, unknown accuracy/confidence defaults, permanent permitted provider fields only, and provenance UUIDs without Auth FKs | No automatic confidence threshold. A manual point is user-confirmed, not verified rooftop. Retain provider provenance when confirming provider results. Old actor deletion cannot block a transferred property's history | Auto-confirm high-confidence matches requires approved mapping/threshold and cases. Auth actor FKs require an explicit transferred-property deletion/retention policy | **OPEN — blocks implementation** |
| D05 — deletion action/timing | Approve `ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED` on the state-to-location pair FK instead of literal RESTRICT, combined with no runtime history DELETE and parent-aware history deletion guard | Resolve possible cascade ordering conflict without Phase 1 trigger changes. Property/Auth deletion can remove both children; standalone history deletion remains prohibited. Must prove behavior in local tests before acceptance | Retain literal RESTRICT only with an explicitly designed, tested cascade ordering mechanism; do not assume default trigger order. Additional orchestration/Phase 1 hooks would expand scope | **OPEN — blocks implementation; explicit narrow departure from foundation wording** |
| D06 — backend transaction boundary | Accept the preserved service trust model: service may INSERT history and INSERT/UPDATE state, with owner/current/input/revision checks enforced in a mandatory single trusted transaction; no runtime endpoint in 2A-02 | Keeps accepted 2A-01 grants and no new RPC/role. Types and grants alone do not enforce CAS. 2A-03/04 handler tests required before runtime use | Require all publication via a service-only transactional function, revoke raw pointer mutation appropriately, and separately review function ownership/grants. This is stronger against buggy privileged callers but changes the accepted direct-write boundary | **OPEN — blocks implementation** |
| D07 — spatial/origin representation | Approve WGS84 scalar inputs plus generated `extensions.geography(Point,4326)`, GiST, and initial Analysis Origin equal to the confirmed Subject Location | No dual writable points; no entrance snapping or alternate origin silently substituted. Unsupported CRS rejected; no projection tooling | Geometry-only requires explicit units/transformation policy. Separate entrance/origin versions need a later reviewed entity and provenance contract | **OPEN — blocks implementation** |
| D08 — test prerequisite disposition | Approve a separate read-only local catalog qualification and, only if absence is confirmed, a narrowly scoped local PostGIS preparation task with exact extension version/schema/authority | Current local SQL status is NOT VERIFIED because the read-only execution was declined. Historical report says absent. Reuse verified existing target only if suitable; no new Docker environment in this task | A separately authorized suitable spatial environment may be designated. Do not use production or another stack merely because it already runs | **OPEN — blocks spatial implementation validation** |

The owner can approve D02–D07 as the complete proposed design, but D05 must be visible in that approval because it changes a specific prior recommendation. D01 and D08 require explicit baseline/environment disposition. A design approval is still distinct from a subsequent task authorizing code/migration implementation.

## 2. Conflicts and why they are not silently resolved

**Checkpoint mismatch (D01):** the requested exact SHA is not current HEAD. The one intervening commit contains eight reports only. Continuing this documentation review is safe; claiming the expected SHA matches would be inaccurate.

**RESTRICT versus cascading parent deletion (D05):** the accepted foundation explicitly asks 2A-02 to design this interaction. A pointer from one cascading child to another introduces a dependency that can conflict with immediate RESTRICT. Deferred NO ACTION is a proposed solution, supported by PostgreSQL semantics, but it has not been tested here and is not already approved. This is the only identified reason to revisit that narrow foundation direction. All other accepted foundation decisions are preserved.

**Phase 1 address independence versus current canonical location (D03):** a separate location write cannot be made mandatory in the Phase 1 save transaction. Therefore the proposal checks a fingerprint of actual current location-input fields whenever determining Phase 2 applicability, and appends a new intent through an explicit later command. No implicit geocoding on page open or financial save. Omitting this read contract would leave an old point misleadingly current after an independently saved address change.

**Local PostGIS assumption (D08):** the external catalog's installed extension and the local image version do not prove a working local spatial database. No installation, automatic upgrade or switch to another test stack is authorized by this proposal.

## 3. Deferred decisions with explicit gates

| ID | Decision | Earliest required gate / default in this proposal |
| --- | --- | --- |
| L01 | Concrete normalizer and provider-confidence mapping, serializer fixtures | 2A-03 contract review before persisting normalized/mapped outputs; no invented scale or automatic HIGH confirmation |
| L02 | Transient candidate-token storage, expiry, replay prevention, retry/job durability and per-user request limits | 2A-03 interfaces / 2A-04 before live geocoding. Do not persist raw candidate arrays here |
| L03 | Field-specific geocoder storage/attribution permission and provider configuration selection | Before any geocoder persistence in 2A-04. Registry PERMANENT label alone is insufficient; provider benchmark/freeze remains 2B |
| L04 | Additional processing states, geocode error/retry representation and confirmation UI | 2A-04, with real behavior and tests. 2A-02 keeps foundation statuses inert; no READY/FRESH/OFFICIAL |
| L05 | Alternate routing entrance/origin, transformation CRS and numerical spatial tolerances | Before alternate measurement support. Initial origin equals subject point; pin future measurement method/library/normalization versions |
| L06 | Evidence reuse for metadata-only changes and profile-scoped assessment current pointers | 2B–2D lineage review; no old-location assessment is automatically current |
| L07 | Lawful erasure/retention revocation, former-owner provenance privacy, future historical child cascade graph | Before relevant retained provider/evidence or transfer capability is exposed; immutability is not permission to retain prohibited data |
| L08 | Canonical-place foundation scheduling | Separate narrow phase task when its requirements are established; not an extra table in 2A-02 |
| L09 | Deployment, current external preflight and operational rollback | Separate deployment authorization after audit; never implied by Git synchronization or design approval |

L01–L09 do not authorize later features. Where a required contract is unresolved, keep that runtime operation disabled, rather than inserting placeholders as authoritative data.

## 4. Accepted decisions not reopened

The ten reconciliations ARC-01,02,03,04,05,06,08,09,10,11 remain binding, with traceability in architecture §4. Phase 1 financial engines and evidence meanings, four-table foundation, append-versioned provider/fact/freshness registries, controlled fact vocabulary, separate statuses, inherited property ownership, state revision behavior and browser write denial remain intact. This review does not select a vendor, alter scoring, populate registries or change the earlier foundation acceptance.

IMPLEMENTATION-01 follow-up, 18 October 2026: **T15 remains OPEN.** The registry uniqueness and lock-contention quality gaps are addressed by separately attributable executed supplemental tests in [phase2a01-quality-followup-results.json](phase2a01-quality-followup-results.json): six independent `23505` failures with three valid nondeprecated controls, plus two coordinated races with observed blocking PIDs and ungranted locks. Historical assertions and reports remain unchanged. This does not prove location-version concurrency, which requires PostGIS. Earlier aggregate-count and non-exhaustive attachment qualifications remain valid.

## 5. Current implementation result

**18 October installation approval:** the owner explicitly replied “Yes, please enable it and proceed” to enabling packaged PostGIS 3.3.7 in `extensions` inside the existing MPIA database and running the prepared tests. Installation then succeeded through the pinned local Unix socket using `supabase_admin`. D08's installation prerequisite is satisfied on that exact target. The separate owner-created PostGIS container was not modified.

**D05 execution condition demonstrated locally:** the spatial suite passed history-delete denial and pointer containment; actual COMMIT tests rejected nonexistent, cross-owner and same-owner-other-property pointers with 23503. Authenticated parent deletion and Auth-user deletion committed successfully, including history, state and existing financial children. No mandatory cascade test failed and no constraint/Phase 1 trigger was weakened. See [committed evidence](phase2a02-commit-results.json) and [SQL results](phase2a02-database-results.json).

The application migration is retained locally. Populated upgrade, three failed-migration rollbacks and the installed baseline comparison passed. Scoped types were generated from the verified local catalog with 44 old contracts preserved. Types are not permission evidence.

**Final acceptance remains open.** The latest synthetic location transaction/concurrency command was rejected at execution approval before it ran; it was not retried. Clean installation and full adversarial preflight/attachment coverage remain outstanding. T15 and real future-handler security remain open. The report contains exact executed/unexecuted outcomes.

Earlier DESIGN-01 OPEN labels and pre-installation findings above are historical. Current evidence supersedes them only where tests actually passed. No runtime endpoint, provider integration, Git commit/push, production access or deployment was authorized by these local results. Git checkpoint, synchronization and final acceptance remain separate owner-approved milestones.

See the [implementation report](PHASE2A_02_IMPLEMENTATION_REPORT.md) and [verification manifest](phase2a02-verification-manifest.json).

