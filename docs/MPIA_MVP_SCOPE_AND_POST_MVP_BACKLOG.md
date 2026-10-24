# MPIA MVP scope and post-MVP backlog

MVP-REBASELINE-01 · 23 October 2026 · Asia/Kuala_Lumpur  
Status: development-priority recommendation based on repository evidence; no implementation or release certification.

## Decision

Build a controlled, synthetic customer showcase around the working Phase 1 engines. Add a session-only location demonstration and an explainable presentation of the results. **Live Option D is not required for this showcase.** Keep authoritative location mutation disabled, preserve the accepted I05/I06 contracts, and move database/runtime qualification to the release boundary that actually exposes those capabilities.

The showcase must demonstrate useful decisions from entered assumptions, not claim verified market intelligence. It can meet the final journey step by presenting a labelled result; durable cloud saving is not required at boundary A. This scope does not declare the current application showcase-ready or beta-ready.

This owner-requested rebaseline changes sequencing, including the older Phase 1-only priority in PROJECT_RULES.md. It does not change frozen calculations, ownership rules, transaction semantics, evidence standards or earlier acceptance records. Historical “next step” and STOP statements describe their original tasks; the retained execution restrictions still apply to the corresponding database/runtime work.

## Evidence and current state

Reviewed [AGENTS.md](../AGENTS.md), [PROJECT_RULES.md](../PROJECT_RULES.md), the [Phase 1 freeze](PHASE1_ARCHITECTURE_FREEZE.md), [Phase 2 plan](PHASE2_ARCHITECTURE_PLAN.md), accepted reports and later corrections below, current routes/components/analysis hook, property and financial APIs, location contracts/core/admission sources, relevant tests, migration sources and latest qualification reports. This was a local source/document review. No browser, database, Auth service, provider or remote repository was contacted.

“Implemented” below means code or migration source exists. “Offline-tested” refers to retained reports, not new executions in this task. A design document is not an implemented feature.

| Capability | Evidence-based classification | Customer implication / remaining gap |
| --- | --- | --- |
| Login, signup, recovery and protected property routes | Implemented in the normal application. Auth route calls getUser; query/form isolation exists on identity change. Phase 1 reports contain historical security evidence. | Real accounts exist as a code path; current hosted Auth behavior and customer readiness were not verified here. |
| Property create/list/detail/edit/delete | Integrated application source. Current uncommitted editor changes add seven-field validation, deliberate PATCHes, retained original baseline and conflict feedback. | Useful existing workflow; not universally protected from stale writes or direct-client length bypass. |
| Acquisition costs, financing, rent and operating expenses | Integrated forms/APIs and shared pure financial engines. Child records save separately. | A working financial input path exists. Saving the parent does not atomically save all child sections; demo/beta UX must identify each section's state. |
| Returns, Base/Bull/Bear scenarios, investment score, data confidence, risks and rule-based recommendation | Integrated through use-property-analysis.ts and Summary/Scores/Risk/Scenarios panels. Deterministic engines/configs and P01–P10 fixtures exist. | Reuse these outputs. They are assumption-based analysis, not validated market forecasts. |
| Scenario customization | Implemented local state in ScenariosPanel. Shared summary analysis uses DEFAULT_SCENARIOS. | Scenario edits are temporary and do not change the summary recommendation. Summary copy implying otherwise needs correction. Persisted scenario_configs/investment_criteria are not active overrides in the shared hook. |
| Presentation polish | Partly implemented; inconsistent copy remains. Landing/dashboard say calculation modules are unimplemented; Financials calls NOI/cash-on-cash “still to come” although other views calculate them. Dashboard aggregates remain placeholders. | Correct wording and guide viewers to the property analysis. Do not invent portfolio averages to fill placeholders. |
| 2A-01 registries, freshness-policy definitions and property state | Migration/types implemented; accepted as dormant foundation with qualified historical local SQL evidence. No evidence acquisition/scoring consumer. | Invisible infrastructure, not nearby-amenity functionality. |
| 2A-02 PostGIS and immutable property-location history/pointer | Migration/types and synthetic transaction tests implemented; accepted with qualifications on the recorded local platform. | No geocoding/confirmation UI or deployed location service follows from acceptance. Full seven-migration clean install remains unverified. |
| I01–I05 canonical contracts, provider interfaces, read eligibility, transaction core and diagnostics | Implemented, offline-tested, dormant, not application-integrated. F01 alias-cleanup and G01 fake-CAS omission were subsequently closed. | Retain as protected infrastructure. Fakes are not real PostgreSQL/Auth/pool proof. |
| I06 target policy and actor admission | Implemented injected-port policy modules, accepted offline checkpoint; no concrete verifier, SQL driver, gateway or composed writer. | No live actor verification or location-write capability exists. |
| Option D restricted SQL capability | Designed; not implemented or qualified. SQL canonical/numeric parity, effective privilege isolation, actor trust, resources and completion remain unresolved. | Unnecessary for A; genuinely gated before any authoritative location writer is exposed. No service-role fallback. |
| Canonical experimental reference | Standalone Node reference/tests, not SQL/runtime integration. Earlier independent acceptance found framing failure; later framing-fix report records correction checks, not production approval. | Preserve chronology. Later reported 16-group/10,000-pattern checks do not prove SQL parity or universal numerical equivalence. |
| Property text limits | Application policy implemented/offline-tested: name 200, address 500, city/district/state/country 100, postcode 20 Unicode scalars. Entry state/postcode rules remain stricter. | Browser/API validation helps users; database enforcement is absent. Exact untouched legacy values are preserved by omission. |
| Property concurrency | Timestamp predicate implemented; no database-owned property revision deployed by this work. Same-token overwrite is explicitly demonstrated by a mock test. Financial child APIs also have separate read-then-write paths without a universal revision protocol. | A synthetic single-session presentation can proceed; real saving needs a bounded, tested integrity solution for the actual writers and child sections. |
| Corrected length/revision SQL | Additive offline artifacts in docs only; no PostgreSQL parsing/compilation/execution/installation proof. Existing client still sends timestamps, not the proposed revision envelope. | Preserve for later synthetic qualification. Do not copy into active migrations, install, discard or call them deployed. |
| Geocoding, nearby amenities, map, evidence acquisition/facts/context/location score | Provider-neutral interfaces and designs exist; no customer-facing integration, real provider adapter or completed location assessment engine. | Build a labelled fixture evidence slice first. No current coverage, provider selection or calibrated Location Score may be claimed. |
| Draft investment explanation | Existing deterministic recommendation/reasons/confidence/risks are implemented. No AI explanation service or integrated cross-module presentation report. | Template explanation is the smallest next slice; it must not modify numbers or recommendations. |
| Durable analysis snapshots, historical replay UI, report export | Designed in broader architecture; no automatic Phase 1 snapshot store or dedicated report/export workflow found. | A clearly dated print/presentation of current demo state is sufficient for A. Cloud result persistence is separate work. |

Evidence anchors and qualifications:

- [2A-01 final acceptance](PHASE2A_01_FINAL_ACCEPTANCE_REPORT.md): accepts inert four-table foundation; historical 2,340 assertion executions are not 2,340 distinct behaviors. Its uniqueness/contention limitations received [later follow-up evidence in 2A-02](PHASE2A_02_FINAL_ACCEPTANCE_REPORT.md).
- [2A-02 final acceptance](PHASE2A_02_FINAL_ACCEPTANCE_REPORT.md): retained 166 database assertions, TC01–TC14 and two observed location races; local synthetic evidence, not a live handler or hosted deployment certificate.
- [2A-03 original audit](PHASE2A_03_FOUNDATION_FINAL_ACCEPTANCE_REPORT.md) is a historical NO-GO; [correction closure](PHASE2A_03_CORRECTION_CLOSURE_REPORT.md) later accepts corrected dormant I01–I05. G02 remains open. [Offline I06 checkpoint](PHASE2A_03_I06_OFFLINE_RELEASE_01_REPORT.md) records 1,712 application passes at its own source revision.
- [Latest property implementation](PHASE2A_03_PROPERTY_LIMITS_IMPLEMENTATION_REPORT.md) and [independent source audit](PHASE2A_03_PROPERTY_LIMITS_INDEPENDENT_SOURCE_AUDIT.md): 1,905 offline passes, four TODOs; browser/REST/RLS/concurrency are not certified by those mocks. The source audit also identifies raw request-error exposure and a form test that does not actually reject a promise.
- [Independent SQL review](PHASE2A_03_PROPERTY_LIMITS_DB_INDEPENDENT_SQL_REVIEW.md) identifies Q01 capability, Q02 switched-role privilege and Q03 target-attestation gaps. [Security correction](PHASE2A_03_PROPERTY_LIMITS_DB_SECURITY_CORRECTION_REPORT.md) marks Q01/Q02 conditionally resolved/runtime untested; Q03 external attestation is required/not performed. It records 23 offline qualification tests, 1,905 application passes/four TODOs, 16 reference groups and a skipped browser-asset security check. These overlap with prior suites and are not additive new coverage.
- [Environment readiness](PHASE2A_03_PROPERTY_LIMITS_DB_SYNTHETIC_ENVIRONMENT_READINESS.md) and [execution plan](PHASE2A_03_PROPERTY_LIMITS_DB_QUALIFICATION_EXECUTION_PLAN.md): no qualified disposable target or executable transport; runner refuses execution and still plans original drafts. Corrected acceptance/locking and a separately authorized target are needed before synthetic SQL.
- [Option D interface](PHASE2A_03_I06_D_INTERFACE_SPEC.md), [PG decision](PHASE2A_03_I06_D_PG_IMPLEMENTATION_DECISION.md), [architecture recommendation](PHASE2A_03_I06_D_ARCHITECTURE_RECOMMENDATION.md), [canonical framing correction](PHASE2A_03_I06_D_CANON_FRAMING_FIX_01_REPORT.md), [concurrency/cutover decision](PHASE2A_03_PROPERTY_LIMITS_CONCURRENCY_AND_ROLLOUT_DECISION.md) and [deployment-evidence decision](PHASE2A_03_I06_D_LEGACY_DEPLOYMENT_EVIDENCE_DECISION.md) remain scoped historical/proposed evidence. No genuine historical location operations are established; verified absence is also not established. Owner-described three compliant samples/no genuine records are testimony, not a fresh inventory.

## Three release boundaries

### A — Private customer showcase

Controlled, presenter-led local demonstration is the default. Use invented sample properties, financial assumptions and clearly fictional POIs. Properly licensed real demonstration evidence is optional, with provenance/rights recorded before use. No real customer financial/property information is needed or invited.

Required acceptance:

1. Enter an explicitly labelled demonstration; select a sample or create a session-only sample, edit financial assumptions, view shared-engine outputs, review location evidence, understand the draft assessment and present it.
2. Persistent “Synthetic demonstration — not verified property/market evidence” labels in screens and printed output. Financial confidence is confidence under sample assumptions, not real-world verification.
3. No Auth/database/provider/analytics request carrying demo inputs, no authoritative location writes, and no private-account records loaded. Session state resets visibly; “Apply inputs” must not claim cloud save.
4. Preserve missing/zero/invalid distinctions, negative outcomes, metric names, rule precedence and separate score/confidence semantics. Location evidence never changes frozen financial decisions.
5. Focused browser/keyboard/responsive/print checks on the actual supported showcase surface; no silent stale or mismatched evidence. Failure in the demo location panel cannot prevent financial use.
6. Existing private-route protections remain intact. Control access through the presenter on loopback; if later hosted, use an approved access boundary and requalify the hosted build. A hidden URL or browser toggle is not access control.

The recommended isolated showcase entry is NEW work. The existing root and AppShell import the hosted Supabase client, so a new route or local URL alone cannot establish a network-free demo. See M1 in the roadmap.

Not required: real account onboarding, cloud property saving, live geocoding, paid providers, Option D, SQL installation, official Location Score, automatic history, sophisticated recovery or production scaling.

### B — Limited customer beta

The backlog label **PUBLIC BETA REQUIRED** means the minimum before accepting real customer accounts/saved data, including a limited invitation beta. It is not permission for public release.

Required acceptance:

- Real Auth and session lifecycle work on the exact intended deployment; two-user and anonymous ownership tests cover parent/financial-child CRUD, account switching, and any exposed evidence endpoint. RLS is enforced in the database.
- Reliable parent and financial-section saving: success only after acknowledged persistence; reload confirms saved values; errors/unknown outcomes do not falsely report success. Protect stale edits and overlapping create/update cases for supported writers. Qualify database length enforcement and a safe transition for unchanged legacy values.
- Corrected SQL, if used, passes independent source acceptance, exact-target/catalog security attestation, actual PostgreSQL/REST tests, observed races, rollback and resource checks. Coordinate a compatible revision client/cutover; do not attach the draft SQL to the timestamp client.
- Appropriate protection of real data: private errors/logs, HTTPS/session settings, retained access controls, bounded operations, usable deletion and a basic tested backup/restore process. No secrets in client assets.
- Focused browser coverage of supported real workflows, all applicable inherited T15 cases, deployment/schema ledger evidence, supported migration path and current source/build identity.
- Honest outputs from available assumptions/evidence. Beta may retain a separate labelled sample location panel or show location unavailable. Neither live Option D nor official location scoring is mandatory merely to offer real financial saving.

If authoritative location mutation is added to beta, every applicable I05/I06/runtime/rights/recovery gate becomes a prerequisite BEFORE enabling it. This rebaseline grants no exception.

### C — Later production versions

Scale measured bottlenecks; add approved providers, durable analytical history, context/fact/scoring pipelines, evidence maps, advanced recovery, specialist legacy compatibility and comprehensive operations as the product uses them.

Basic beta authorization/integrity/privacy are not deferred here. “Later” means a feature is absent until its safety requirements pass. Official location scoring requires implemented facts/lineage, rights, coverage/unit/missing-data rules and actual validation; the architecture's draft weights are not a validated scoring product.

## Smallest customer journey

| Step | Current support | Smallest safe next slice / showcase acceptance |
| --- | --- | --- |
| 1. Sign in or approved demo | Normal Auth code exists; no isolated demo. | M1: presenter-controlled isolated demo entry with conspicuous sample banner. Real Auth remains on its own protected path. |
| 2. Create/select property | Authenticated CRUD exists. | M1: select invented presets or create blank session sample; no database writes. |
| 3. Enter purchase, financing, rental, expenses | Existing forms/schemas/engines. | M1: reuse schemas and form controls in a compact session editor; show which sections were applied. Separate asking/target price from acquisition purchase price. Unknowns remain null. |
| 4. Review financial analysis | Existing Summary/Scores/Risk/Scenarios. | M1: display unchanged shared-engine results from sample inputs. Correct stale placeholder copy; label default versus temporary scenario assumptions. |
| 5. Enter/confirm location | Address text exists; no confirmed-origin workflow. | M2: select/acknowledge a sample origin for the selected preset; arbitrary address entry shows evidence unavailable until matched, never geocoded by invention. |
| 6. Nearby amenities/evidence | No integrated consumer. | M2: fixture-backed evidence list with category, measurement method/unit, sample provenance/date and bounded coverage. Map optional later. |
| 7. Explainable draft assessment | Deterministic financial recommendation/reasons exist. | M3: template explanation uses these outputs, risks and limitations; separate location observations. No new numerical score or AI call. |
| 8. Confidence/incomplete data | Financial confidence/missing-input outputs exist. | All milestones: show financial confidence separately from sample evidence coverage, stale/error/unavailable states and due-diligence checklist. |
| 9. Save or present | Cloud input saves exist; no report/snapshot workflow. | M3: presentation/print view of current session with assumptions, versions and sample labels. Durable saving and historical snapshots are excluded at A. |

## Phase 2A priority decision and contracts retained

Advance the customer-facing read-only demonstration before live location transactions. This is a separate presentation data source, not a substitute writer, fake RPC or fabricated OFFICIAL assessment. Do not create rows, pointers, confirmations or assessments in authoritative location tables. A “sample origin acknowledged” UI action is not a persisted confirmed location version.

Preserve unrestricted V1 serializers and identities, the seven original property input fields, exact bytes/receipt spelling, parent-first lock ordering, current owner/input validation before replay, duplicate inertness, expected-state semantics, atomic append/CAS, COMMIT-before-success, UNKNOWN handling and invocation-owned cleanup. Keep target binding, actor verification, least privilege, field rights and physical pool qualification as prerequisites for future activation. Demo reset/retry cannot be offered as transaction reconciliation.

The new seven-field application limits do not rewrite V1. The 6,776-byte maximum is a bounded length-policy witness, not proof of SQL feasibility, universal legacy eligibility or successful form entry for state/postcode.

Preserve these exact corrected artifacts for later synthetic qualification:

| Artifact | Raw SHA-256 / current disposition |
| --- | --- |
| [Corrected length SQL](PHASE2A_03_PROPERTY_LIMITS_DB_LENGTH_MIGRATION_CORRECTED.sql) | ceb2a6586e8502a9dc0514cae15ca577e0ae5128d19490aba32d2d1e4fe9b32c — offline, uninstalled |
| [Corrected revision SQL](PHASE2A_03_PROPERTY_LIMITS_DB_REVISION_MIGRATION_CORRECTED.sql) | d49156314182c0df7d3064aadb82c127eac115c18cd62ac495fb00ac3e8df95d — offline, uninstalled |

Original drafts, reviews, failed evidence, harness locks and existing databases remain preserved. Production architecture remains one authoritative cloud PostgreSQL database; local synthetic qualification is not a replication/synchronization architecture.

## Living backlog register

This is the single priority register. Roadmap milestones reference these IDs rather than create a second backlog. The evidence inventory above remains the historical rebaseline. Updated 23 October 2026 for MVP-S1-WEB-SHOWCASE-01: **M1 — Owner accepted. M2 — Owner accepted. M3 — Owner accepted.** The owner explicitly confirms all three milestones were manually browser/print verified in the S1 request. This supersedes pending acceptance wording in the retained [M1 report](MPIA_MVP_M1_IMPLEMENTATION_REPORT.md), [M2 report](MPIA_MVP_M2_IMPLEMENTATION_REPORT.md) and [M3 report](MPIA_MVP_M3_IMPLEMENTATION_REPORT.md); those historical reports remain unchanged. Owner acceptance is distinct from fresh S1 browser evidence: no approved browser was available during S1. **S1 — Static hosting preparation complete; GO to request hosting/destination approval; unpublished.** See the [S1 readiness report](MPIA_MVP_S1_WEB_SHOWCASE_READINESS_REPORT.md) for build commands, actual checks and remaining publication gates. The delivery owner prioritizes; future implementations must name their actual acceptance evidence.

Updated 24 October 2026 for MVP-S2-LOVABLE-INTEGRATION-02: **S2 — `/showcase` integrated into the main Lovable-targeted application; local verification passed; unpublished.** M1–M3 owner acceptance remains unchanged. The owner has selected **Lovable native Invite only** (or the plan-appropriate Custom audience) for the future published website, superseding S1's shared-password hosting recommendation. This audience applies to the **whole website**, including normal application entry pages; the current plan, audience, invitees and hosted settings remain unverified. Audience changes, invitations, publishing and Git push/merge require separate owner authorization. Supabase identity, existing protected-route guards and database RLS remain independent and preserved. Fresh S2 browser/print/network acceptance is **NOT TESTED** because no browser surface is available. See the [S2 integration report](MPIA_MVP_S2_LOVABLE_INTEGRATION_REPORT.md) for production-worker routing/isolation evidence, the local preview limitation and the publication checklist. **GO to request separate owner publication approval; hosted invitation enforcement is not established by local tests.**

| ID / class | Item and current status | Rationale and customer impact | Risk of deferral | Prerequisite | Reactivation / completion trigger |
| --- | --- | --- | --- | --- | --- |
| M01 · MVP REQUIRED | Isolated, controlled sample session — M1 accepted at owner-observed showcase level | Makes entry and experimentation possible without real data. | Regressions could disrupt the controlled showcase. | Separate entry avoiding hosted-client initialization; synthetic presets. | Owner manually browser-verified M1. Offline isolation/reset/selection checks remain passing; no fresh browser network trace was obtained in M3. |
| M02 · MVP REQUIRED | Financial input/result journey — M1 accepted at owner-observed showcase level; offline parity passes | Shows investment value using existing calculations. | Product appears to be forms or static mockups. | M01, existing schemas and engines. | Owner manually browser-verified M1; 43 existing M1 tests and unchanged P01-P10 regressions pass again in M3. |
| M03 · MVP REQUIRED | Sample location origin and amenities evidence — M2 owner accepted | Versioned fictional origins, acknowledgement, filters, attribution and coverage/failure states demonstrate research context. | Future hosting could introduce regressions. | M01/M02; exact sample/origin/seven-string binding. | Owner confirms manual M2 browser verification in S1 request; 56 M2 tests remain passing. No fresh S1 browser network trace. |
| M04 · MVP REQUIRED | Explainable draft assessment — M3 owner accepted | Recommendation/reasons, score contributions, confidence, risks, missing information and checklist stay together; location stays separate. | Future hosting could introduce regressions. | M02/M03; unchanged shared coordinator and frozen rules. | Owner confirms manual M3 browser verification in S1 request; 58 M3 tests remain passing. |
| M05 · MVP REQUIRED | Present/print result — M3 owner accepted | In-memory capture, timestamp, inputs/config identifiers and native printing provide a labelled report. | Verify print on the final HTTPS deployment. | M04; valid applied session; refresh after changes. | Owner confirms manual print verification in S1 request. Print source/CSS preserved; fresh S1 browser/print NOT TESTED. |
| M06 · MVP REQUIRED | Supported showcase browser/keyboard/print QA — M1–M3 owner accepted | Preserves the accepted demonstration. | Deployment-specific regressions still require a final rehearsal. | Accepted showcase; exact final HTTPS destination. | Owner manual browser/print acceptance recorded in S1 request; fresh S1 browser, responsive, keyboard, network and print checks NOT TESTED. HTTP/offline checks do not replace them. |
| M07 · MVP REQUIRED | Truthful copy and output-state consistency — M1–M3 owner accepted | Synthetic disclosures, unavailable states, separation and stale-capture blocking stay explicit. | Preserve disclosures on the final deployment. | Source-verified outputs and fixture applicability rules. | Owner acceptance recorded in S1 request; offline regressions pass again in S1. |
| S1 · MVP REQUIRED | Controlled static hosting preparation — complete; unpublished | Root/subpath build, bundled assets, metadata and hosting-layer access recommendation make deployment reviewable. | Final destination/access protection must be approved and verified. | M1–M3 owner accepted; owner chooses platform and mount. | GO to request hosted deployment approval. Final HTTPS/browser/print and unauthenticated asset-denial checks remain publication gates; see S1 readiness report. |
| S2 · MVP REQUIRED | Lovable integration — owner browser/print accepted; unpublished | Main-build `/showcase` reuses M1–M3 and avoids normal Auth/query initialization. Native website invitations are the planned viewer gate. | Hosted access and deployment-specific behavior need qualification. | Separate source synchronization, publication and audience approval; existing customer-data guards remain mandatory. | Owner confirms integrated S2 browser/print walkthrough passed in S3 request, 24 October 2026. Before customer handoff: invited/uninvited hosted access, final URL network/print checks and Supabase-authenticated real routes; historical S2 report remains unchanged. |
| B01 · PUBLIC BETA REQUIRED | Real Auth/RLS/session isolation on deployment — historical evidence only | Protects each customer's records. | Unauthorized disclosure or mutation. | Exact safe synthetic Auth/API target, current schema/build. | Before any real-user beta; two-user/anonymous CRUD and identity-switch passes. |
| B02 · PUBLIC BETA REQUIRED | Database length enforcement/legacy preservation — corrected drafts only | Stops direct-write bypass while retaining existing property text. | Unsafe writer inputs, incompatible edits and policy claims. | B04; writer/data inventory; compatible patch client. | Before real saved-data beta; qualify corrected length stage and controlled cutover. |
| B03 · PUBLIC BETA REQUIRED | Authoritative concurrency for supported parent/child writers — incomplete | Prevents silent lost updates; sections save reliably. | Customer financial assumptions can be overwritten. | B04; original revision client for parent; focused child save/race solution. | Before real saved-data beta; observed competing sessions, stale rejection and child insert/update race checks. |
| B04 · PUBLIC BETA REQUIRED | SQL security/runtime qualification — blocked | Establishes that proposed controls actually work. | Static designs mistaken for data protection. | Independent corrected-artifact acceptance, Q03 attestation, approved disposable target/observer/transport and updated artifact pins. | Before installing B02/B03 controls; real PG parsing, ACL/RLS, races, rollback and resources pass. No execution in this task. |
| B05 · PUBLIC BETA REQUIRED | Reliable save UX, error privacy and basic recovery — partial | Distinguishes pending/saved/failed/conflict/uncertain; keeps drafts for review. | False success, lost edits or leaked values in errors. | B01/B03, real mutation integration tests. | Before beta; actual rejected promise, reload/roundtrip, no automatic stale merge, section-level state and safe error mapping. |
| B06 · PUBLIC BETA REQUIRED | Deployment/schema/writer history — current cloud state unknown | Binds beta to a known build and supported migration path. | Wrong database assumptions or unsafe rollout. | Authorized target evidence, ledger, writer inventory and build identity. | Before beta deployment; attested actual deployed path. Full location-chain proof required only if deploying that chain. |
| B07 · PUBLIC BETA REQUIRED | Real-workflow browser QA / inherited T15 — unexecuted | Verifies sign-in, CRUD, finance, errors and account switching. | Node mocks hide broken real interactions. | Isolated Auth/API frontend and B01–B05. | Before beta; execute all eight applicable inherited T15 cases and changed-flow cases; record inapplicable location paths explicitly. |
| B08 · PUBLIC BETA REQUIRED | Basic data protection/operations — not currently certified | Makes private real-data use supportable. | Data loss, leaked logs, abandoned account data. | Named deployment/custodian, access and retention settings. | Before beta; minimum HTTPS/session/privacy/deletion and backup/restore verification for exposed functions. |
| P01 · POST-MVP | Option D authoritative location executor — designed, on hold | Enables real persisted location intent later. | No authoritative location writes; acceptable for sample/financial beta. | Accepted strategy and P02/P03/B06; P05/P06/G02 and applicable rights/transport gates. | Only when real location writes are chosen for a release; all gates precede exposure. |
| P02 · POST-MVP | Real driver/pool/result mapping, cancellation and redaction — absent | Required for safe live I05/I06 semantics. | No runtime transaction safety certificate. | Exact supported host/driver/TLS/Auth+SQL target, least-privilege model. | Before P01 activation; normalize command tags/bigint/binary64/microseconds and prove physical affinity/quarantine/late cleanup. |
| P03 · POST-MVP | Location UNKNOWN/reconciliation recovery — not integrated | Resolves uncertain future operations without duplicates. | Cannot safely enable live transactional location workflows. | P01 design; retained frozen operation identity and authorized observation. | Before live writer exposure; lost COMMIT ACK persisted/unpersisted cases, input/owner/deletion changes. Absence at a snapshot never proves noncommit. |
| P04 · POST-MVP | Specialized legacy history/oversize/restore compatibility — conditional need | Protects discovered genuine prior operations and exceptional writers. | Affected cases may remain unavailable; no population established now. | B06 plus operation/deployment evidence; original identity custody. | If actual affected history/writers are found. Do not build a speculative legacy engine solely because absence is unverified. |
| P05 · POST-MVP | First live provider/geocoder and retained evidence — absent | Gives real nearby-place research. | Demonstration remains synthetic; no live coverage claim. | Approved narrow provider scope, field rights/attribution/retention, secrets, costs, failure handling and Malaysian benchmark. | When real evidence is required; target/auth checks and any authoritative-write gates before enabling storage. |
| P06 · POST-MVP | Facts/context/location scorer and calibration — designed only | Adds independent explainable location assessment. | No official numerical Location Score. | Implemented facts/lineage/coverage/units/context/rights, versioned rules and validation fixtures. | When official scoring is requested; approved calibration before OFFICIAL publication. Draft example weights never substitute. |
| P07 · POST-MVP | Evidence map and historical snapshots/replay UI — absent | Richer exploration and audit history. | List/presentation suffice; no durable replay promise. | Legal stored evidence, versioned snapshots and origin applicability. | User need for maps/history; preserve historical evidence and no analytic calls on pan/filter. |
| P08 · POST-MVP | Portfolio aggregates, persisted custom scenarios/profiles, AI narrative — partial placeholders/design | Extends convenience beyond one-property analysis. | Defaults and property-level presentation remain explicit. | Stable core journey; reviewed versioning/settings or AI evidence contract. | Customer demand after showcase; AI may explain only immutable authoritative outputs. |
| P09 · POST-MVP | Comprehensive operations/scaling/recovery automation — not qualified | Improves resilience under real volume. | Limited supported scale/manual operations remain. | B08 plus measured load/incidents/SLO need. | Proven operational need or broader production launch; advanced DR, alerts, performance and recovery automation. |
| P10 · POST-MVP | Multi-provider aggregation and specialized platform support — absent | Expands coverage and deployment flexibility. | Narrow supported provider/platform remains. | Working first provider/platform and measured gaps. | Actual coverage/customer/platform requirement; focused qualification rather than exhaustive speculative matrices. |
| N01 · NOT PLANNED | Fabricated market facts, yield/appreciation predictions, unsupported flood/crime/expat scoring | No defensible evidence or current product need. | No loss of a supported promise. | New evidence/methodology and explicit new scope. | Only a new approved product decision with validation; never fill missing data by invention. |
| N02 · NOT PLANNED | Combined financial/location score or AI-assigned scores/recommendations | Conflicts with frozen separation and deterministic authority. | Separate outputs remain understandable. | Explicit architecture change, versioning and dedicated validation. | Only explicit owner-approved future change; no implicit activation through demo. |
| N03 · NOT PLANNED | Weak security/transaction shortcuts or destructive cleanup to unblock showcase | Broader credentials, truncation, new-ID retries or policy bypass violate accepted contracts. | No safe customer value is lost. | None within this rebaseline. | No reactivation under present contracts. |
| N04 · NOT PLANNED | Open-ended redesign before the three implementation milestones | Adds no immediate visible value. | Narrow implementation may reveal concrete later gaps. | A specific evidenced blocker in the selected slice. | Reopen only the bounded affected decision, not a new general architecture workstream. |

A safety gate attached to a deferred capability is mandatory when that capability is activated. It is not an MVP blocker while that capability stays absent.

## Current repository baseline and preservation

### S3 acceptance and local checkpoint boundary — 24 October 2026

The owner confirms **M1, M2, M3 and integrated S2 browser/print walkthroughs passed** in MVP-S3-GIT-CHECKPOINT-01. These are owner-browser-accepted milestones. Earlier reports retain their original test results and pending wording as historical evidence; this update does not claim a fresh agent browser walkthrough or hosted acceptance.

S3 authorizes one verified local MVP checkpoint only. Preserve the existing Phase 1 engines/configurations/tests, canonical V1/I05/I06 contracts, Auth/RLS guards and all excluded work. Include the shared seven-field entry validation and its pure policy dependency needed by the accepted showcase; leave unrelated property-save PATCH/concurrency helpers, API/form changes, SQL, canonical experiments and Phase 2 qualification material outside the commit. No database operation or Option D activation is authorized.

The source branch is `phase2-location-intelligence`; local remote configuration points to `ysyap-AI/malaysia-property-investment-analyzer`. README describes historical synchronization through `main`, but **Lovable's current live synchronization/publication branch is UNKNOWN** without current platform evidence. Local refs are cached observations, not fresh GitHub state. Source synchronization must preserve Lovable UI/UX changes and requires separate approval after branch confirmation and diff review. No push, fetch, pull, merge, publish, invitation or audience change is authorized by S3.

The [S3 checkpoint report](MPIA_MVP_S3_GIT_CHECKPOINT_REPORT.md) is a separate local handoff artifact, deliberately excluded from the single checkpoint so it can record the actual resulting commit SHA and final preservation results without rewriting that commit. This backlog update is finalized before the checkpoint. The report records isolated verification, exact included/excluded files, remaining local changes and GO/NO-GO for requesting synchronization authorization.

The appendix records the exact local starting Git state and raw identities of all pre-existing modified/untracked inputs. HEAD alone does not describe this checkout. No fresh remote/deployment state is inferred from local refs or historical push reports.

### Baseline identity

| Observation | Exact local value |
| --- | --- |
| Repository | C:/Users/ysyap/AI Projects/malaysia-property-investment-analyzer |
| Review date | 23 October 2026, client timezone Asia/Kuala_Lumpur |
| Branch | phase2-location-intelligence |
| HEAD | 930aa98b3355f4fe65b1fb0b4012eeaf21438ddf |
| Parent | 1dd47b6c33b96b6a43ff3a22e2b58c733738f76f |
| HEAD tree | 46130a64a19688a15e0795fec533b7d58eabc7e2 |
| Local main | 72c2b8748d6468747b9784597b8f596e030b0dfb |
| Staged diff | Empty |
| Entry inventory | 415 tracked + 81 nonignored untracked = 496 existing paths |
| Tracked modifications | Four, listed below; no tracked deletion |
| Index raw SHA-256 | 6226d72300334fc08a5ee20f8e2369c1f82ef22a38607518affa8d80cfc717dc |
| Full entry raw-file manifest SHA-256 | 7fc70597c15da9bf41237d23b746aa457f85385500a886e7ae641eae75bda216 |

Manifest definition: union of read-only `git ls-files -z` and `git ls-files --others --exclude-standard -z`, unique repository-relative slash paths sorted by JavaScript default ordinal order. Each line is lowercase raw-byte SHA-256, two ASCII spaces, path, LF; UTF-8 without BOM, with final LF. All 496 hashes were captured in memory for final preservation comparison. Ignored dependencies/build/scratch, private environments and Git internals are outside the file inventory; index identity is recorded separately.

HEAD/tree plus the four modified file hashes and complete 81-path untracked inventory below distinguish this working baseline from its committed tree. Hashes include line endings. The two new rebaseline documents were absent at entry and are excluded from this baseline to avoid self-reference.

### Existing modified tracked files

```text
68b2c5451faba5e1a6228f492abb3a4b002c1e46a26aaa138f3dca619f44d9ab  src/components/property/PropertyForm.tsx
302e70eb08bf1f23140d2feb520b98547288da701f61fbc4529e2a7e48c9a9b3  src/lib/property/property-api.ts
d31b5f11bc778709e3cfee410d6cfe032e5661e895cde41ed8e067637f25da48  src/lib/property/property-fields.ts
1f150d24fae8b779e6fdbf384e98764ceeb465a0cbd45d86528531bff0a3eebb  src/routes/_authenticated/properties/$id.edit.tsx
```

### Existing nonignored untracked files

All listed entries already existed before this task. Their “untracked” status is not a completion or acceptance verdict.

```text
06c9caee56d171b830cc41536a8d13eb80bab27b2a1ae08d20a70e60c62d5941  docs/PHASE2A_03_I06_D_ARCHITECTURE_OPTIONS.md
7b6b8bfaec42e2ab0a2d3206016ad3103ae18464fa2e7621f16b38776aa5508d  docs/PHASE2A_03_I06_D_ARCHITECTURE_RECOMMENDATION.md
2a86343b757fe2cc07284762e6365481bb8d6eb57b5d0dac5599db772dc31089  docs/PHASE2A_03_I06_D_CANONICAL_EDGE_CASE_MATRIX.md
e439486900bfa174a8af3171649d54b52647c1a7c76260f31c483b8424e92259  docs/PHASE2A_03_I06_D_CANONICAL_IMPLEMENTATION_READINESS.md
f6d667fc408668f006a260d1f0f39f34e3968e3841808073150d28569b28e21c  docs/PHASE2A_03_I06_D_CANONICAL_STRATEGY.md
4c78d8aa9fd647d4f76356a65fc06b4d103b03fbd452af2823223119a5d1dcdb  docs/PHASE2A_03_I06_D_CANON_CORRECTION_01_INDEPENDENT_ACCEPTANCE.md
0d9e117ae9c6630a3d98052e8ca3c08c4131e7a8cc688eb4465f920bcc133584  docs/PHASE2A_03_I06_D_CANON_CORRECTION_01_REPORT.md
c0060c31f21a283fa6ca104d972abbe26e9ec08617cae6bacf69d91284caf1d7  docs/PHASE2A_03_I06_D_CANON_FRAMING_FIX_01_REPORT.md
507f2e99f0917209a2d20b8634f6354d321729f7b14a9459e1febf7456db834e  docs/PHASE2A_03_I06_D_CANON_POC_01_INDEPENDENT_AUDIT.md
6805ff108e9f970ca54b8f4bf77d76d80381fccbaf855a36d042bed10c07dc65  docs/PHASE2A_03_I06_D_CANON_POC_01_REPORT.md
c99c3d0efeddd8ff56cfb685258ae14664ee25b6c46cde38472d08129b158824  docs/PHASE2A_03_I06_D_INTERFACE_SPEC.md
468ba5564ee7aa3ff640f36334098a4d754b9b1434e1dcf809f19558bd077a94  docs/PHASE2A_03_I06_D_LEGACY_DEPLOYMENT_EVIDENCE_DECISION.md
cdc1b281680d35250d693d601ba3997655263081205fb115e4f6dd550d8eb2f8  docs/PHASE2A_03_I06_D_PG_CAPABILITY_SECURITY_MATRIX.md
bb4a3d7fe82e1809c6afd164b2244c686fc7dcedf6bc9c3c35f750cc37b70bbe  docs/PHASE2A_03_I06_D_PG_FEASIBILITY_REPORT.md
2cdca1efce409118a2a9832778501f575f305bb5de1803446d1e9639a9114d66  docs/PHASE2A_03_I06_D_PG_IMPLEMENTATION_DECISION.md
057d473eaba63b949fd8c5f5105117356bd6d91b082a3d9e2c20a03ee2c75080  docs/PHASE2A_03_I06_D_PLATFORM_AND_TRUST_DECISIONS.md
e650291e7656313f0dbf1380ac8e09188cd777ef8767c4fda3fef27491782b43  docs/PHASE2A_03_I06_D_PROPERTY_INPUT_LIMITS_COMPATIBILITY_MATRIX.md
d0d0f8baaba3153092de879aaa99f2c5bc7ebba2491a24125964dbfc916f33d4  docs/PHASE2A_03_I06_D_PROPERTY_INPUT_LIMITS_IMPACT_REPORT.md
18d3647dda376c64f4783ab1f239d3a22a93fea7988e1b82533cfdd4e1544f86  docs/PHASE2A_03_I06_D_PROPERTY_INPUT_LIMITS_RECOMMENDATION.md
0575dd00d1dcf48d426f0efe51d607209c9b22f335f9baa10e57a6a492120b50  docs/PHASE2A_03_I06_D_PROPERTY_INVENTORY_EXECUTION_APPROVAL.md
9eb58c2cfecc35c8395421a8910456f657ae333552fd022d9093d03126029b91  docs/PHASE2A_03_I06_D_PROPERTY_INVENTORY_PRESERVATION_MANIFEST.md
95ab9eafb57921e7c8423b6f1786405cfb4a46fb4a88013d03a2733b9dd166bb  docs/PHASE2A_03_I06_D_PROPERTY_INVENTORY_QUERY_REVIEW.md
8cf31dbfd6f9c7d1a1732b19e321a68ae37334acc3653e501c06f188ac2436bc  docs/PHASE2A_03_I06_D_PROPERTY_INVENTORY_SQL_DRAFT.sql
ee7ca0ab0b59adcebd3721d42ecb8d3fdce237becc476239cca1fd5be1e61c93  docs/PHASE2A_03_I06_D_PROPERTY_LIMITS_CONTRACT_DECISION.md
64e08207587ba126eda801c9edc748ccdee2de602ac948f44e3eaf0a8f2ec882  docs/PHASE2A_03_I06_D_PROPERTY_LIMITS_LEGACY_TRANSITION_PLAN.md
8c3a6cbb6344f1dc97e053b809e20ac3d84d57f81097313c88587e512049500b  docs/PHASE2A_03_I06_D_PROPERTY_LIMITS_ROLLOUT_PREFLIGHT_REPORT.md
05c9c0e4ae1fb68b85e719248ecc3ff0ce978a911128aa81135afafdc5f28c5e  docs/PHASE2A_03_I06_D_SECURITY_AND_READINESS.md
e84f06bce05a9fced8e6bbc85ecb67b1f23f6f952d1c0946da9e85687d2e9c95  docs/PHASE2A_03_I06_D_V1_PARITY_MATRIX.md
1bfb9528037c62286c88e72ab31f076e01c172852864ffa7ae483dcdcd64853c  docs/PHASE2A_03_I06_OFFLINE_RELEASE_01_CHECKLIST.md
54e191ac80b41d19497e16b52d3ed33262caeec23cfe2d4d1586dade6ea0cacf  docs/PHASE2A_03_I06_OFFLINE_RELEASE_01_REPORT.md
f775b3196a268ce7bf7fc90100ae45c772224a35b076a778f3ac9756e6a5bb07  docs/PHASE2A_03_PROPERTY_LIMITS_CONCURRENCY_AND_ROLLOUT_DECISION.md
65ee58f7f7c23902db20786ccd5e637fed11527e9e70d34a97eac0f6ac0b061e  docs/PHASE2A_03_PROPERTY_LIMITS_DATABASE_ENFORCEMENT_DESIGN.md
527cdad8180a5300e707a7321c8ab2eda7c83d1abae28a52cd9e4d563c9cb14e  docs/PHASE2A_03_PROPERTY_LIMITS_DB_DRAFT_ACCEPTANCE_REPORT.md
3bd90c678a5947720b73dfe8eeae703382ee79fcde1fc1ccdd92029e8f0392f8  docs/PHASE2A_03_PROPERTY_LIMITS_DB_INDEPENDENT_SQL_REVIEW.md
ceb2a6586e8502a9dc0514cae15ca577e0ae5128d19490aba32d2d1e4fe9b32c  docs/PHASE2A_03_PROPERTY_LIMITS_DB_LENGTH_MIGRATION_CORRECTED.sql
4c01c9df017f90ea068d0577020bb44cb76ff510dcbed19b28eb2f7d937b3dc7  docs/PHASE2A_03_PROPERTY_LIMITS_DB_LENGTH_MIGRATION_DRAFT.sql
0a40c53d076243942b3baa0313a0c8afade078d2e8b236a509c62c68206fcc1e  docs/PHASE2A_03_PROPERTY_LIMITS_DB_MIGRATION_SECURITY_REVIEW.md
0e317660dd2559e0e17576026112ff75e757ac64eee36f683b8b4318c25f5ac1  docs/PHASE2A_03_PROPERTY_LIMITS_DB_QUALIFICATION_EXECUTION_PLAN.md
d49156314182c0df7d3064aadb82c127eac115c18cd62ac495fb00ac3e8df95d  docs/PHASE2A_03_PROPERTY_LIMITS_DB_REVISION_MIGRATION_CORRECTED.sql
2252b5d130af5e3d72f3f0a9bebcfd2ca69e12891e309d625da928d74eb8b9cc  docs/PHASE2A_03_PROPERTY_LIMITS_DB_REVISION_MIGRATION_DRAFT.sql
95393adb8baa8128465298689caea766a3213198aeeacbc122b57a40bc4fd93c  docs/PHASE2A_03_PROPERTY_LIMITS_DB_SECURITY_CORRECTION_CHECKLIST.md
ea2703a66834d4525a5cbc597e418bc48db34a1454c75365bc27ca4a94d8dc13  docs/PHASE2A_03_PROPERTY_LIMITS_DB_SECURITY_CORRECTION_REPORT.md
146f9c15f60cd83be0798fb0aa616a9024366d58d896690cc0ed435f0d1199cc  docs/PHASE2A_03_PROPERTY_LIMITS_DB_SYNTHETIC_ENVIRONMENT_READINESS.md
2e1c33638e4132e865252c20c0580926c2c6d2df358c73299c292969ba26c476  docs/PHASE2A_03_PROPERTY_LIMITS_DB_SYNTHETIC_TEST_PLAN.md
2d6e9a23fb56f74963a96df147dcac42e8996ba2c71f1c2e71db358bfa171433  docs/PHASE2A_03_PROPERTY_LIMITS_IMPLEMENTATION_CHECKLIST.md
afa0b845696e9848c87f84a28fd9d28445f2c50f2694725b9f18b0b5ec659e36  docs/PHASE2A_03_PROPERTY_LIMITS_IMPLEMENTATION_REPORT.md
67b6129af6903f8facb0381c276ff442516d5261e124d7ad1d0c6070a5b83103  docs/PHASE2A_03_PROPERTY_LIMITS_INDEPENDENT_SOURCE_AUDIT.md
5abcc792c9ac7b18fe3433e3e275ec46c75983cfc7895abb31e541e596501763  docs/phase2a03-i06-d-canon-correction01-independent-acceptance.json
3206011f27d116e8fab9df9632670ed3381f282883e10c955b0a68125a1df54a  docs/phase2a03-i06-d-canon-correction01-results.json
f5e6a84b8d68921aa9bddad5649d489ff8b7db9c9f840d30db47017529c4a5cc  docs/phase2a03-i06-d-canon-framing-fix01-results.json
38e3c8cb36f2e9205010c9eca6ecf156c89cca1fab827dc9c196bf716a0c260d  docs/phase2a03-i06-d-canon-poc01-independent-audit.json
51f96a18e0739ee36e50aac4b7909329034e98b121c33c9c77cde7f5666d76bd  docs/phase2a03-i06-d-canon-poc01-results.json
47407b97f5746403d5bc8d0be43f1efa7efec39b0c760fb020c3e308de7f05de  docs/phase2a03-i06-offline-release01-results.json
c298103dd21f550450faa3011eb1b0f68c75397c7391f8633672bdf4f9b00819  src/lib/property/property-save-policy.ts
bc16f16babdab9b46f4a8da744335b96c01cad42022d63da0272c70e1825929e  src/lib/property/property-save-validation.ts
7410909c436f4552be816d28d2dd6c87647843e1029291b87e538e9ab9bccd14  tests/phase2a03/canon-poc/reference-model.mjs
54c4be46caca92075b4ae6199fe9ea2fa4382362907d130b12d8773e9d4ff247  tests/phase2a03/canon-poc/reference-model.test.mjs
fcb6e5ccfa22f458fc6b543fd78544de61ec126ce51e9adf174d6dfcd1900e31  tests/phase2a03/property-limits-db-qualification/README.md
0d3c0eccb3eb99349fed2ce4d4a9104f4cb4efdbc2b895eb72630867e670561a  tests/phase2a03/property-limits-db-qualification/SECURITY_CORRECTION_README.md
a40a94c0c15cb82fa09e420097fc222e74e8b088a2324197dc316e57b4436928  tests/phase2a03/property-limits-db-qualification/artifact-lock.json
93c503c8d5ac946736eed14f0f883bc347a42eb26bd86e4a67e7a229db745e89  tests/phase2a03/property-limits-db-qualification/campaign.mjs
fd1e5d3bf57c925577152ea8de60d82d4bf49798137a43803dfd916247b171fe  tests/phase2a03/property-limits-db-qualification/environment.proposal.json
bbca12f22c0f8691425c04e87dd0f3eefc7011c230f19567fe368e5e1c83be69  tests/phase2a03/property-limits-db-qualification/fixtures.sql
9d6959cdc41bda229e55e4d8c973523306d22daa0e46feedc5ed2f8b5e0930b9  tests/phase2a03/property-limits-db-qualification/offline.test.mjs
77dcbd81ae01ab8f197e1257cbb41c32af19b5b38248a293103a65d85d87e3ac  tests/phase2a03/property-limits-db-qualification/preservation-baseline.json
bc6dfe1dc36500c030d4e3bc70f597bb23f4345f0713c80ae44e6ef2e454c100  tests/phase2a03/property-limits-db-qualification/runner.mjs
f130ab18f8755b97600cd2f28519d093ff0f555eb9128b44b24d82a46ea5bdd9  tests/phase2a03/property-limits-db-qualification/safety.mjs
f72adbdef6040826e07c8dd0d6fe3e734fd729938495ce124c649b85c3b6c639  tests/phase2a03/property-limits-db-qualification/scaffold.sql
6875af4c79f53f6f728cd4fa5bd59b60319a75400460ae6425d38462a8d5d3f1  tests/phase2a03/property-limits-db-qualification/scenarios.mjs
2b8094b5c61b7a4c7d016f3d5245eeca8de81c784aa1e20fc40e6c7695ecbfcb  tests/phase2a03/property-limits-db-qualification/security-correction-baseline.json
ecfa38f8a5eba74c0367fdcc67237bc809598e38744c2202510c93381fb2c854  tests/phase2a03/property-limits-db-qualification/security-correction-comparison.json
a574d61b059493351a42964f0fdea1442b89c85a4d1a4c5039aacfd706ec2052  tests/phase2a03/property-limits-db-qualification/security-correction-generate.mjs
4c47efa8fd8b475e96f07bd793592af098963c7d22b19ee19b8a7983a3b7d835  tests/phase2a03/property-limits-db-qualification/security-correction-receipt.json
c859b40374159f7e4e2eab1358264e1e01b75aecfd21155c3f0e32e567dbe660  tests/phase2a03/property-limits-db-qualification/security-correction.test.mjs
bdebcfba3a56bf3c6c92dfbd73e29b6684c0c57c0025cfa72616b9dbfb821ddd  tests/phase2a03/property-limits-db-qualification/security-effective-role-check.sql
81a73162de5d47db6fdd0fdc712c6a428a1f9c4e74f0b01305ed8d76dacb9465  tests/phase2a03/property-limits-db-qualification/security-negative-cases.mjs
9111628488b4c196ee71333a4ad2b162eaf0230f4a1a337e895ed4f962a634a0  tests/phase2a03/property-limits-db-qualification/security-role-assessment.sql
1ccd5d0600f5d77423feb87a59d4cff45825bd284a7ea4c37b377fd8dfce6463  tests/phase2a03/property-limits-db-qualification/verification-receipt.json
dee1b2a94d780a7e444b8d6da7890beba51ed8dba56b60ee8f2eb773b48bf291  tests/property-save-api.test.ts
f0a0a25499ee7ab3e431a043188ba04c0bf48c40b766da60356ad1c7cacf3625  tests/property-save-form.test.ts
634fa2081da7b4ccf4e943d730a3d20e8c39c87d229a44c74ddc5099b1aa3c5a  tests/property-save-policy.test.ts
```

### Verification boundary

This task creates only this document and [the implementation roadmap](MPIA_MVP_IMPLEMENTATION_ROADMAP.md). Final validation compares every pre-existing inventory file's raw hash, HEAD/branch/tree, local branch refs and index with the captured baseline; the only permitted status additions are these two documents. No source edits, database connection, SQL execution, dependency installation, Git mutation or deployment is part of the task. No remote/deployed state was freshly verified.

