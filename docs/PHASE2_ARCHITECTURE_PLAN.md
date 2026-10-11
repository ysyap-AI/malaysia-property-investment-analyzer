# MPIA — PHASE 2 ARCHITECTURE PLAN

**Project:** Malaysia Property Investment Analyzer (MPIA)  
**Document:** `PHASE2_ARCHITECTURE_PLAN.md`  
**Document status:** Owner-approved architecture reconciliations; baseline architecture accepted for read-only pre-implementation validation; repository and Phase 1 freeze verification pending  
**Revision:** 1.0 (ten reconciliation decisions accepted; pre-implementation verification pending)  
**Prepared:** 2026-10-11  
**Scope:** Phase 2 Location Intelligence (2A–2F)  
**Implementation authority:** Approval of ten reconciliation decisions does not authorize migrations, application code changes, provider spending, or deployment. Next authorized step is read-only Phase 2A readiness verification and 2A-01 design planning.

> **Precedence and verification:** This plan consolidates the supplied Phase 2 handover. The actual repository, migrations, deployed Supabase configuration, and `PHASE1_ARCHITECTURE_FREEZE.md` were **not** inspected in preparing this version. Before implementation, verify the Phase 1 freeze and actual schema. If there is a conflict, stop, report it, and obtain an explicit decision. Do not silently modify the frozen Phase 1 contract.

## 1. Purpose and decision status

Phase 2 adds independent, evidence-based **Location Intelligence** for Malaysian investment properties. It evaluates accessibility, daily convenience, education, healthcare, employment access, transportation, and retail infrastructure, while exposing the supporting evidence and its limitations. It does not predict rental yields or replace Phase 1 investment advice.

Decision vocabulary:

- **FROZEN PRINCIPLE:** architectural invariant agreed in the handover; changing it requires explicit owner approval.
- **APPROVED DESIGN DIRECTION:** intended design, subject to repository/security feasibility checks.
- **DRAFT CONFIGURATION:** weights, thresholds, radii, caps, coverage limits, descriptions or rules that require benchmarking and calibration.
- **APPROVED RECONCILIATION:** one of the ten architectural issue resolutions explicitly accepted by the project owner on 2026-10-11; binding on subsequent design and implementation.
- **OPEN DESIGN DECISION:** additional recommendation not included in those ten approvals, or a detail requiring repository verification, policy/legal confirmation, or calibration. Do not claim it is approved.
- **DEFERRED:** deliberately outside current Phase 2 scope.

## 2. Protected Phase 1 boundary

Phase 1 MVP, engineering and security audits, database verification, UI regression, Git release and architecture freeze are reported complete in the handover. The integration branch is reported as `phase2-location-intelligence`; verify both claims in Git before work begins.

Phase 1 financial calculation logic, deterministic investment scoring, evidence confidence semantics, and recommendation behavior must remain unchanged. Phase 2 must not directly write Phase 1 investment scores, recommendations, historical financial results or calculation inputs. Shared property identity and existing authentication may be used through audited interfaces, but Phase 2 additions should remain append-oriented and separately permissioned. Property saving and Phase 1 analysis must succeed even when Phase 2 geocoding, APIs, processing, or scoring fail.

**Separation:** a Phase 1 Investment Score, a Phase 2 Location Assessment, and a future Phase 3 market/comparables analysis are distinct analytical outputs. There is **no combined score**.

## 3. Goals, non-goals and success criteria

**Goals:** reliable location evidence; neutral normalized facts; deterministic, versioned scoring; configurable profile weights; Malaysian context sensitivity; attributed evidence map; historical replay; low provider cost; secure multi-user isolation; graceful partial/failed states.

**Non-goals:** rental listing scraping, rental/transaction comparables, vacancy/demand inference, yield/appreciation predictions, merged investment/location score, AI score generation/override, unvalidated flood/crime/environmental scoring, arbitrary formulas, sophisticated multi-provider aggregation, live traffic scoring, persistent live exploration, portfolio-wide background refresh, advanced expat modeling, or Phase 3 market intelligence.

**Release success:** independently saved properties, no Phase 1 regression, no unauthorized cross-user reads/writes, bounded provider costs, accurately qualified score publication, deterministic fixture replay, historical evidence provenance, and clear state/quality UX.

## 4. Core modules and responsibility boundaries

| Module | Owns | Must not own |
|---|---|---|
| 1. Evidence Acquisition | Triggers, planning, provider adapters, requests, budgets, retries | Scoring decisions |
| 2. Evidence Storage | Runs, observations, canonical places, snapshots, licenses, provenance | Hidden provider-driven scores |
| 3. Evidence Normalization | Provider taxonomy mapping, place resolution, measurement representation | Profile judgments |
| 4. Evidence Freshness | Category-specific freshness/expiry and refresh eligibility | Forced deletion of history |
| 5. Location Fact Engine | Typed, neutral property-specific facts with coverage/status | Good/bad interpretations |
| 6. Scoring Configuration | Templates, user profiles, immutable rule versions, validation | Arbitrary executable formulas |
| 7. Deterministic Assessment | Fact-to-metric/domain/location calculation and reason codes | Provider I/O or AI-generated values |
| 8. Assessment Versioning | Immutable lineage, historical replay, current-valid pointers | Rewriting authoritative artifacts |

**Cross-cutting services** include location versioning, context classification, economic-node governance, maps, API orchestration, security, audit logging and cost/observability. These need not be artificially forced into one of the eight modules.

## 5. End-to-end data architecture

```text
User saves Subject Property ────────────────> Phase 1 continues independently
           │
           └─> Property location version / geocoding review
                   │
             Acquisition planner (authorization → freshness → reuse → quota)
                   │
              Provider adapters (geocode / places / routing)
                   │
             Evidence runs + source observations + attribution/license
                   │
             Canonical POI resolution + normalized observations
                   │
             Immutable Evidence Snapshot manifest (may span runs)
                   │
             Immutable Fact Set (typed facts, units, statuses, coverage)
                   │
             Immutable Context Version (detected/effective/source)
                   │
             Immutable Scoring Profile Version + Engine Version
                   │
             Deterministic Assessment + component contributions
                   │
             Transactionally publish current valid assessment pointer
                   │
             Property card / evidence map / domains / audit history
```

The assessment engine receives **normalized facts**, not vendor-specific API payloads. Map rendering reads stored snapshot items and property-specific relationships; it is not a live analytical source.

## 6. Subject locations, origins and geocoding

The submitted property is a **Subject Property**, its geocoded point is the **Subject Location**, and the point used for measurement is the **Analysis Origin**. The Subject Property is **not** a POI. Canonical coordinates must be associated with a versioned property location. Material address/coordinate changes create a new location version and new analytical lineage, not an overwrite of historical geography.

Save-first flow: persist the user property using existing Phase 1 behavior; separately queue or request location resolution; require user review when geocoding is ambiguous/low-confidence; do not fabricate coordinates. Once confirmed, create acquisition work with validated coordinates. Geocode and routing/provider failures cannot roll back Phase 1 saves.

**Proposed resolution:** explicitly store coordinate source, normalized address, geocode candidate/confidence, confirmation status, coordinate system, and material-change reason; treat location changes and score-profile changes differently. A location change may require acquisition; a profile or context change must not.

## 7. Evidence runs, snapshots and provenance

An **Evidence Run** is a retrieval attempt (INITIAL_ANALYSIS, MANUAL_REFRESH, AUTO_REFRESH, LOCATION_CHANGED, RETRY, ADMIN_REPROCESS where applicable). It tracks operation scope, trigger, status (PENDING/RUNNING/COMPLETED/PARTIAL/FAILED), timing, provider request IDs, errors, cost and idempotency.

An **Evidence Snapshot** is an immutable, coherent manifest of selected observations and relationships for a specific property-location version. It can include items from different successful runs: e.g., retained transport/education from run 10 and newer healthcare from run 12. Snapshots become immutable at analytical publication. Store selected item IDs, coverage boundaries, category, observation version, attribution/license status and origin. Do not mistake an acquisition run for a snapshot.

Candidate relational entities: `location_evidence_runs`, `location_provider_requests`, `canonical_places`, `provider_place_identifiers`, `location_place_observations`, `property_place_relationships`, `location_evidence_snapshots`, `location_evidence_snapshot_items`. Provider-specific supplemental fields can be JSONB; ownership, foreign keys, measurements, authoritative scores and audit timestamps must be relational.

**Retention gate (mandatory):** a snapshot may reference permanently reproducible evidence only when the provider's legal terms permit appropriate retention. A temporary or non-persistable result must not be the sole permanent basis for an immutable official historical assessment. Retain only fields contractually permitted, preserve attribution, and apply deletion/expiry rules even to caches and backups as applicable. If the provider's license makes replay impossible, exclude that evidence from authoritative historical scoring or revise the architecture/provider choice explicitly before release. The license classification labels `PERMANENT`, `TEMPORARY_30_DAY`, `ID_ONLY_PERMANENT`, and `NO_PERSISTENCE` are policy categories, not assumptions about any particular vendor contract.

## 8. Normalization and canonical geography

Normalization maps provider taxonomies to a controlled MPIA taxonomy and canonical entities. Canonical POIs may be globally shared; property-to-POI measurement relationships remain property-specific. Deduplication should use stable provider IDs when available, supplemented by guarded name/type/coordinate matching and auditable merge decisions. Unrecognized categories remain `UNMAPPED`, with source observations preserved for reprocessing.

Keep **three different reuse mechanisms** separate: provider-request cache, canonical-place reuse, and property-analysis/evidence reuse. Cache fingerprint includes provider, operation, canonicalized area/origin, category, radius, requested fields, relevant provider/version parameters and license constraints. Never reuse incompatible coverage, units, permissions, coordinate versions or expired data as though current. Avoid duplicate in-flight requests.

**Operations:** REFRESH retrieves new provider evidence; REPROCESS applies a new normalization version to existing legally reusable observations; RECALCULATE uses existing fact sets with changed profile/context/engine version. REPROCESS may produce a new fact set without provider calls. A normalization version change requires clear lineage rather than editing the old result.

## 9. Freshness, coverage and confidence

Per-category freshness policy defines `fresh_until`/`expires_at` or an equivalent auditable age rule. Freshness states are FRESH, STALE, EXPIRED; historical evidence remains available with appropriate labeling. Policies are administrative/versioned and can vary by evidence category: rail and education may refresh less frequently than banks, convenience stores or routing facts. Exact durations are **DRAFT**, not frozen.

Keep these independent:

1. **Coverage/completeness**: extent of expected fact weight and geographic/provider search coverage that is supported.
2. **Freshness**: age of retained evidence relative to policy.
3. **Evidence confidence**: quality of sources, geocoding, observation method, routing/fallback, reliability and completeness signals.
4. **Processing status**: NOT_STARTED / GEOCODING / FETCHING_EVIDENCE / NORMALIZING / ASSESSING / READY / PARTIAL / FAILED, with STALE exposed as a freshness overlay rather than a mutually exclusive job stage (**approved reconciliation ARC-06**).
5. **Publication status**: OFFICIAL, INSUFFICIENT_EVIDENCE, DEVELOPMENT_ONLY, or HISTORICAL_OUTDATED (**approved separation under ARC-06**; exact database enums remain a design decision).

A high location score can coexist with medium confidence or partial coverage. Confidence must not be quietly added to or subtracted from the analytical score. Stale evidence cannot be labeled current, and a failed refresh must leave the prior valid result intact.

## 10. Typed Location Fact Engine

A controlled `location_fact_definitions` registry governs fact key, semantic definition, data type, unit, category, allowable measurement methods, aggregation scope, completeness requirements, and fact-definition version. No arbitrary keys invented during implementation. Store one typed value per registered fact in `normalized_location_facts` linked to an immutable `location_fact_sets` parent; permit sensible JSONB for supplementary provenance but not a JSON blob instead of typed core facts.

Fact types: proximity, counts, accessibility, coverage and context inputs. Measurement methods include straight-line metres, walking-route metres/minutes, driving-route metres/minutes. A scorer must verify units and measurement method; **never** apply time bands to a distance value. Measurement-specific fallback scoring rules are required, or the metric is unavailable.

**Proposed canonical fact-result contract:** `KNOWN_VALUE`, `KNOWN_ZERO`, `UNKNOWN`, `UNAVAILABLE`, `STALE`, plus a separate coverage/quality field. Source handover terms `VERIFIED_ZERO` and `KNOWN_ZERO` are treated as aliases until the enum is finalized. A zero is valid **only** if successful acquisition established sufficient search/routing coverage; `NO_RESULTS` is not equivalent to provider error. If a university search covered only 3 km, absence means zero **within 3 km**, not an observed nearest distance beyond 3 km.

**Critical bounding rule:** If an acquisition radius is 3 km, a scoring rule requiring a measured distance `> 3 km` cannot automatically choose a specific lower band; represent the distance as **greater than coverage bound**, and score only when every possible value produces the same result under a validated rule, otherwise mark unavailable. This also applies to capped provider result sets and pagination truncation. Result caps may invalidate exact counts unless the cap/ordering proves the requested threshold or saturation band.

## 11. Context architecture

Supported MVP context labels: `URBAN_TRANSIT`, `URBAN_GENERAL`, `SUBURBAN`, `REGIONAL_LOW_TRANSIT`; `UNDETERMINED` is a failure/insufficient-context state, not a fifth scoring context. Context is an **area-character classification**, not investment quality. Detect deterministically using multiple broader-area features such as station density/mode diversity within 5 km, essential amenity density within 3 km, major retail density, economic-node accessibility and road/regional access class. Future population, density, and land-use signals are deferred.

Avoid direct circular logic: do not classify Urban Transit from only the subject property's immediate rail proximity then boost the same rail signal automatically. Define classifier feature regions, thresholds, precedence, tie handling, confidence rules and minimum qualifying feature set in a versioned context rule specification. Validate on edge-case fixtures. Classification may overlap fact sources, but must not directly use the final location score or depend on its own derived label.

Store detected context, detection confidence, effective context, source (`AUTO`, `USER_CONFIRMED`, `USER_OVERRIDE`, `ADMIN_OVERRIDE`), rule/classifier version, explanation and actor where relevant. Confirmation/override creates an immutable new context version; it triggers **RECALCULATE**, not REFRESH. `UNDETERMINED` blocks official scoring unless an authorized effective-context confirmation yields a valid alternative.

## 12. Economic node model

Employment accessibility uses curated Malaysian economic nodes (CBD, commercial/business district, industrial hub, technology hub, corridor), with tier (`TIER_1`/`TIER_2`/`TIER_3`), stable identity, geographic access target, region, effective dates, evidence of significance, and administrative change history. Count of arbitrary nearby offices is **not** an employment metric. Economic nodes are globally curated; user/property-specific travel relationships remain private.

**Proposed resolution:** the meaning of “significant node” and how tiers are weighted must be frozen as versioned config before these facts become scoreable. The economic-node dataset/version is part of the effective analytical fact provenance; amendments can trigger new derived facts without changing Phase 1.

## 13. Scoring configuration and administration

Hierarchy: protected SYSTEM TEMPLATE → optional USER PROFILE copy → immutable PROFILE VERSION. States: DRAFT, ACTIVE, ARCHIVED. Material edits to active config create a new draft version; activation validates server-side. Initial scope is the protected Malaysia Residential Standard template; user customization and additional strategy profiles are later capabilities, not prerequisites for MVP.

Versioned parameters: domain and metric weights, distance/duration/count bands, diminishing-return caps, evidence-coverage minimums, labels, context-specific weight sets, and descriptions. Developer-only: new algorithm/rule types, fact types, normalization logic, provider adapters, security/RLS, calculation mechanics and version rules. Supported initial rule types: distance threshold, duration threshold, count threshold, boolean and capped/diminishing count. No arbitrary code or user-written formulas.

Validation must reject negative/NaN/out-of-range weights, incorrect totals (100% at each aggregation level), duplicate/missing metrics, ambiguous threshold boundaries, unintended gaps, incompatible units/methods, unregistered fact keys, unsupported rules, broken fallback mapping, invalid score ranges, cyclical dependencies and inadequate coverage policy. Validate client-side for usability and **again server-side** before activation; activation and audited pointer switch occur atomically.

**Proposed resolution:** maintain exactly one ACTIVE profile version per logical profile identity per publication environment unless an explicit effective-date mechanism is designed. An existing historical assessment continues to reference its original immutable version after activation of a replacement.

## 14. Malaysia Residential Standard — DRAFT v0.1

**This entire section is calibration input, not production-approved truth.** All example weights, thresholds, search radii, score bands and caps require benchmarking. The architecture can be approved while these remain editable DRAFT data.

### 14.1 Seven scoreable domains and contextual weights

| Domain | Urban Transit | Urban General | Suburban | Regional/Low Transit |
|---|---:|---:|---:|---:|
| Public Transport Accessibility | 25% | 18% | 10% | 5% |
| Road & Regional Accessibility | 10% | 15% | 22% | 28% |
| Daily Convenience | 20% | 20% | 20% | 22% |
| Education Accessibility | 12% | 12% | 12% | 12% |
| Healthcare Accessibility | 10% | 10% | 10% | 12% |
| Employment Accessibility | 18% | 20% | 21% | 16% |
| Retail & Lifestyle | 5% | 5% | 5% | 5% |
| **Total** | **100%** | **100%** | **100%** | **100%** |

An eighth architecture domain, **Location Constraints/Risks**, remains unscored until reliable datasets exist. Restaurants, cafes, gyms, recreation, petrol stations, laundries and miscellaneous retail are context-only at launch. Map visibility never implies that an observation affected scoring.

### 14.2 Metric composition by domain

| Domain | Draft metric composition |
|---|---|
| Public Transport | Rail walking accessibility 50%; rail availability 25%; bus availability 15%; network/interchange quality 10% |
| Road | Major-road access 50%; expressway/regional access 50% |
| Daily Convenience | Essential category coverage 40%; supermarket 30%; pharmacy 15%; convenience store 15% |
| Education | School 40%; university/college 35%; international school 25% |
| Healthcare | Hospital/medical centre 75%; clinic 25% |
| Employment | Nearest significant economic node 60%; node reachability 40% |
| Retail | Nearest significant mall/retail centre 70%; retail availability 30% |

**Gap to close during model-definition work:** rail availability vs network/interchange quality, bus availability, major-road access, major mall classification, economic-node tier/significance and reachability need exact input fact and scoring-rule definitions, not just names.

### 14.3 Draft thresholds and saturation rules

Threshold semantics: each row describes an ordered **upper-bound-inclusive** band (≤), otherwise a final `>` band. No category silently substitutes walking/driving duration, route distance, or straight-line distance. Default score values shown are not certified.

| Metric (unit) | Upper bounds → score; final overflow band |
|---|---|
| Rail walking time (min) | ≤5:100, ≤10:90, ≤15:75, ≤20:55, ≤30:30, >30:10 |
| Rail straight-line fallback (m) | ≤400:100, ≤800:85, ≤1200:70, ≤2000:45, ≤3000:20, >3000:10 |
| Rail stations within 3 km (count) | 0:0, 1:60, 2:80, ≥3:100 |
| Major-road drive time (min) | ≤3:100, ≤5:90, ≤10:75, ≤15:55, >15:30 |
| Expressway/interchange drive time (min) | ≤5:100, ≤10:90, ≤15:75, ≤20:60, ≤30:40, >30:20 |
| Essential categories in 1 km (of 4) | 0:0, 1:35, 2:65, 3:85, 4:100 |
| Supermarket nearest (m) | ≤500:100, ≤1000:90, ≤2000:70, ≤3000:50, >3000:25 |
| Pharmacy nearest (m) | ≤500:100, ≤1000:85, ≤2000:65, ≤3000:40, >3000:20 |
| Convenience store nearest (m) | ≤300:100, ≤500:90, ≤1000:70, ≤2000:40, >2000:20 |
| School nearest (m) | ≤1000:100, ≤2000:90, ≤3000:75, ≤5000:55, >5000:25 |
| University/college nearest (m) | ≤1000:100, ≤3000:90, ≤5000:75, ≤10000:50, >10000:25 |
| International school nearest (m) | ≤2000:100, ≤5000:85, ≤10000:65, ≤15000:40, >15000:20 |
| Hospital drive time (min) | ≤5:100, ≤10:90, ≤15:75, ≤20:60, ≤30:40, >30:20 |
| Clinic nearest (m) | ≤500:100, ≤1000:90, ≤2000:70, ≤5000:50, >5000:25 |
| Nearest economic-node drive time (min) | ≤10:100, ≤20:90, ≤30:75, ≤45:55, ≤60:35, >60:15 |
| Significant nodes reachable within 30 min (count) | 0:20, 1:65, 2:85, ≥3:100 |
| Mall drive time (min) | ≤5:100, ≤10:90, ≤15:75, ≤20:60, ≤30:40, >30:20 |
| Major mall availability (count) | 0:20, 1:75, 2:90, ≥3:100 |

Alternative count saturation example (not independently a prescribed metric): supermarkets 0→0, 1→60, 2→85, ≥3→100. A missing/unavailable count never enters the zero band. If the upper bound exceeds a verified search radius, the final overflow band cannot automatically be asserted.

### 14.4 Acquisition policies (draft)

| Category | Candidate max radius | Candidate provider result cap |
|---|---:|---:|
| Convenience stores | 2 km | 20 |
| Supermarkets | 3 km | 10 |
| Pharmacies | 3 km | 10 |
| Banks/ATMs | 2 km | 10 |
| Rail stations | 3 km | 10 |
| Bus stops | 1 km | 20 |
| Schools | 5 km | 20 |
| Universities/colleges | 10 km | 15 |
| International schools | 15 km | not yet specified |
| Hospitals | 10 km | 10 |
| Clinics | 5 km | 15 |
| Major malls | 10 km | 10 |
| Economic nodes | Curated geography + routing | not yet specified |

**Important:** a straight-line radius is an acquisition boundary, **not** a proof about travel time. A hospital found only within 10 km cannot prove the nearest 30+ minute drive-time band or that no more suitable hospital exists just outside the radius. Evaluate completeness per metric and measurement method. Routing is two-stage: filter/select POIs spatially, then route only the meaningful candidates; route cap and selection bias must be recorded. For essential coverage, include banks/ATMs in the four categories while accounting for the 2 km search being sufficient for a 1 km metric.

### 14.5 Completeness and user-facing labels (draft)

- Default missing-data policy: `EXCLUDE_AND_RENORMALIZE`, but only among supported eligible metrics/domains and subject to gates.
- Candidate minimum metric-weight coverage per domain: **60%**.
- Candidate minimum effective domain-weight coverage overall: **70%**; potential additional rule: at least **4 scored domains**.
- Candidate completeness labels: ≥90% COMPLETE, ≥70% and <90% PARTIAL, <70% INSUFFICIENT.
- Candidate location labels: 90–100 Exceptional; 80–<90 Strong; 70–<80 Good; 60–<70 Moderate; 45–<60 Weak; <45 Poor. These are presentation labels, not an investment verdict.

The coverage thresholds above are not a license to fabricate data. Define denominator and behavior for inapplicable metrics before activation. Renormalized scores must visibly disclose the effective weights and coverage.

## 15. Deterministic Assessment Engine

Inputs: exact property-location version, immutable eligible evidence snapshot, typed fact set and normalization version, effective context version, immutable scoring-profile version, and assessment-engine version. No provider calls, AI inputs, dynamic clock-dependent scoring, or client-authored scores.

Procedure:

1. Validate input lineage, ownership, schema/rule compatibility, evidence retention and measurement units.
2. Resolve per-metric status and eligible measurement-specific rule; distinguish value, verified zero and missing.
3. Calculate each available metric score on 0–100 with unrounded internal numeric precision.
4. Within each domain, compute configured weight, eligible metric-weight coverage, effective renormalized weights, metric contributions, domain status and domain score if coverage gate passes.
5. Determine the applicable context weight set; calculate overall effective-domain coverage from **configured** domain weights. Exclude insufficient domains only when the global eligibility rules allow it; compute effective weights transparently.
6. Enforce valid location, snapshot, fact set, context, active profile, version compatibility, minimum coverage, required critical metrics and calculation integrity.
7. If eligible, compute base Location Score; future validated penalties are disabled unless explicitly approved. Emit deterministic reason codes, provenance references, contributions and quality descriptors.
8. Atomically persist assessment header, domains, metrics and lineage; publish current-valid pointer only when eligible and authorized. Otherwise record explicit insufficiency/failure, **not score=0**.

A score of 0 can be legitimate. No intermediate rounding; presentation rounding only. Exact tie/boundary and decimal numeric behavior must be defined in engine tests. Reason codes such as `NEAREST_RAIL_STRONG`, `RAIL_STATION_DENSITY_GOOD`, and `WALKING_ACCESS_MODERATE` are deterministic output vocabulary, not AI prose.

**Approved reconciliation ARC-03 for missing data:** effective overall domain weights are calculated only from domains passing their own minimum evidence gate. The official score must still pass overall original configured weight coverage; coverage is not calculated after renormalization, which would misleadingly turn partial data into 100%.

## 16. Immutable lineage and historical replay

Every published assessment records the exact IDs/versions of:

1. Property location version.
2. Evidence snapshot and item manifest.
3. Fact set and normalization version.
4. Location context version and classifier/rule version.
5. Scoring profile version and context weight set.
6. Assessment engine version (plus identifiable executable or archived calculation contract).

Where applicable also record economic-node dataset version, fact-definition version, attribution/licensing-policy version and scored measurement selection. Store assessment predecessor and machine-readable change causes: `EVIDENCE_CHANGE`, `NORMALIZATION_CHANGE`, `SCORING_PROFILE_CHANGE`, `ENGINE_CHANGE`, `PROPERTY_LOCATION_CHANGE`, `CONTEXT_CHANGE`; multiple causes may coexist.

Use separate lineages by property, location version and logical profile identity. An assessment history record always renders its **own** historical snapshot, context and rule version, not today's POIs. `current_valid_assessment_id` and `latest_evidence_run_id` are different concepts: a failed refresh must not displace an earlier valid result. A location change may supersede the *applicability* of a prior assessment, without deleting it; never show a score from old coordinates as current for new coordinates.

**Proposed resolution:** immutability includes application-layer constraints, privileged mutation control, and database-enforced restrictions/triggers where practicable; controlled retention-policy deletion requirements take legal precedence and must be visible in audit metadata. For replay after engine changes, retain executable historical evaluators or a deterministic compatibility strategy; a version string alone does not guarantee replay.

## 17. Database architecture (logical schema, not migration SQL)

Use existing PostgreSQL/Supabase with PostGIS spatial primitives (`geography(Point,4326)` or a documented equivalent), GiST indexes, spatial radius/distance checks and provider place deduplication. Coordinate serialization may expose latitude/longitude as supporting fields.

**Proposed entity groups** (exact table count intentionally not frozen):

| Group | Candidate tables |
|---|---|
| Property/location | `property_location_versions`, `property_location_intelligence_state` |
| Evidence/provider | `location_evidence_runs`, `location_provider_requests`, `canonical_places`, `provider_place_identifiers`, `location_place_observations`, `property_place_relationships`, `location_evidence_snapshots`, `location_evidence_snapshot_items`, `location_freshness_policies` |
| Facts | `location_fact_sets`, `normalized_location_facts`, `location_fact_definitions` |
| Context | `location_context_features`, `property_location_context_versions`, context rule/version tables as needed |
| Scoring | `location_scoring_profiles`, `location_scoring_profile_versions`, `location_scoring_domain_rules`, `location_scoring_metric_rules` |
| Assessments | `location_assessments`, `location_assessment_domains`, `location_assessment_metrics` (penalties deferred) |
| Cross-cutting as needed | `malaysia_economic_nodes` with versioning, provider registry/config, acquisition budgets, admin audit, idempotency and quality policy registries |

The handover's “roughly 18–20 tables” is an indicative estimate, **not** an artificial constraint: it names 21+ tables before cross-cutting additions. Prefer explicit auditable separation to collapsing semantically different entities merely to hit a number. A schema design review must enumerate columns, key constraints, deletion/retention, indexes, triggers, tenancy, write privileges and transactional publication before any migrations.

Global/shared: canonical places, provider identifiers, fact definitions, system templates, freshness policies, curated economic nodes and provider registry. Private and property-scoped: location versions, evidence runs/snapshots, property-specific relationships, facts, contexts, user profiles and assessments. Globally shared POIs must never expose which private property/user caused acquisition.

## 18. Provider architecture and benchmarking

Separate `GeocodingProvider`, `PlacesProvider`, `RoutingProvider` and `MapProvider` interfaces; one vendor may implement several, but remain replaceable. Only backend/Edge services invoke protected provider endpoints. Provider adapters normalize operation errors including TIMEOUT, RATE_LIMITED, AUTH_FAILED, QUOTA_EXCEEDED, INVALID_REQUEST, PROVIDER_UNAVAILABLE, and a successful NO_RESULTS.

**Provider status:** Geoapify is **provisionally preferred**, **not frozen**. `Provider Benchmark P2-D1` should sample approximately 15–20 representative Malaysian locations across Klang Valley, Johor, Penang, another regional city, suburban and lower-density settings. Assess geocode quality, rail, schools, universities, healthcare, supermarkets, malls, banks, category correctness, duplicates, routing plausibility, coverage limits, pricing, attribution and contractual historical storage rights. Record pass/fail acceptance criteria **before** conducting the benchmark. Then explicitly approve or reject `Primary Provider v1 = Geoapify`.

Google Places is not designated the permanent historical evidence source under the current design because contractual restrictions may conflict with retention. Public Nominatim and public OSM tile endpoints are not production infrastructure. HERE remains a candidate; Mapbox remains viable for rendering and other appropriate licensed roles. Do not assume any vendor's license from this plan; validate current product terms with the specific account and intended APIs before storing evidence.

**Sequencing:** Phase 2A may implement provider-agnostic interfaces and a provisional geocoder; the commitment to a primary **POI evidence** provider is contingent on the 2B benchmark. If 2A depends on provider-specific geocode persistence terms, validate that narrow use earlier or keep the adapter replaceable and non-authoritative.

## 19. Acquisition, refresh and API cost policy

Before every outbound call: authenticate user/job → load property and verify access → validate operation/location version → inspect freshness and snapshot coverage → check reusable cached evidence → validate provider storage eligibility → deduplicate idempotent in-flight work → enforce per-user/property cooldowns, quotas and daily/monthly budgets → plan only necessary category calls → invoke provider adapter.

Initial analysis may auto-run once; manual, partial and eventually policy-driven refresh are explicit acquisition events. Merely opening a property, reloading, using the map, editing Phase 1 financial inputs, changing a profile or changing context **must not** trigger provider calls. Avoid routing hundreds of POIs; use spatial filters and capped meaningful candidates, document route selection and completeness, and store request fingerprints and costs.

Failed/cancelled/partial acquisitions do not overwrite authoritative evidence. Reuse only currently eligible categories; new partial snapshots may mix run versions. Refresh, reprocess and recalculate remain distinct jobs for cost and audit reporting.

## 20. User UX and evidence map

Four progressive disclosure layers:

1. **Summary:** property card with Location Score (or explicit unavailable state), label, effective context, profile, confidence, coverage/freshness badge text and updated date.
2. **Map and domains:** stored-evidence map, subject marker visually distinct, category filters, 500 m/1/3/5 km optional overlays, expandable domain contribution cards.
3. **Evidence/facts:** neutral facts, source, observed/retrieved date, verified coverage, measurement method, fallback, routing quality, scored/context-only eligibility and POI details.
4. **Methodology/audit:** profile/version, thresholds, score contributions, change causes and historical snapshots.

The MVP Map is **Evidence Mode**: only snapshot-linked POIs and property-specific facts; pan, zoom, filter and open popup must not call analytical POI/routing APIs or update scores. Map tile requests for visual rendering may occur as a separate service with its own permissions and budget. Live Explore Mode is deferred and must not be confused with official evidence.

Simple presentation states: not analyzed, locating/review location, analyzing, ready, partial, refresh recommended, historical/outdated, insufficient evidence, failed/retry. A stale or failed latest job can coexist with an older valid assessment; show both truthfully. Never render old snapshots with today's map points without explicit disclosure. Mobile/responsive and accessibility design are required in 2E.

## 21. Admin UX and governance

Backend-enforced Admin Console candidates: Scoring Profiles, Context Rules, Freshness Policies, Economic Nodes, Provider Operations and Test Fixtures. Admin may edit allowed DRAFT weights/bands/caps and activate validated versions, curate nodes and change controlled policies; high-impact actions log actor, entity, old/new versions and timestamp. Normal users may view their own evidence/history, request permitted refresh, confirm/override permitted context and select allowed profiles; custom-user profile creation is deferred.

Separate privilege to **edit drafts** from privilege to **activate production policy** when feasible. Expose validation issues in UI but trust server-side validation. Privileged provider credentials and Supabase service-role/secret keys never reach browser code.

## 22. Trust boundaries, RLS and security

RLS on private Phase 2 entities must authorize through actual property ownership/access rights, using existing Phase 1 schema **after verification**, not assumed column names. Include `property_id` where it materially simplifies auditable authorization. Verify nested links and snapshot-item joins do not leak another user's POIs/relations/assessments. Shared global place records may expose legitimate geography only, never owner linkage or private trigger metadata.

Browser can request analysis, view authorized evidence, edit allowed drafts and submit profile/context selection; browser cannot author final scores, authoritative facts, snapshots, confidence, immutable assessment versions or canonical evidence. Server owns provider operations, normalization, facts, classification, config activation, scoring and persistence. Enforce least privilege on all API/Edge functions, typed input validation, rate limiting, CSRF/session protections as applicable and parameterized queries.

Protect provider tokens, JWTs, auth headers and secret-containing URLs from logs. Use transactional authoritative artifact writes and compare-and-swap or equivalent locking for current-pointer changes. One logical in-flight run per equivalent fingerprint; safe retries use idempotency keys. Multi-user positive/negative tests, tampering and attempted score/update denial are release blockers.

## 23. State and failure recovery matrix

| Failure | Safe behavior | Invalid behavior |
|---|---|---|
| Geocoding uncertain/fails | Property saved; location review; no guessed origin | Blocking Phase 1 save |
| POI API fails | Preserve successful categories; mark failed scope unavailable; PARTIAL run | Interpret failure as zero POIs |
| Successful empty POI result | Verified zero only to proven search coverage | Assume absence beyond coverage |
| Routing fails | Explicit allowed method-specific fallback with quality penalty to **confidence**, or missing metric | Fabricate time or apply time thresholds to metres |
| Normalization unmapped | Keep observation UNMAPPED; later reprocess | Force false category |
| Context uncertain | UNDETERMINED or explicit authorized confirmation | Silent Urban General default |
| Invalid profile draft | Reject activation; keep existing ACTIVE | Break production rules |
| Assessment fails | Explicit failed/insufficient state; keep prior valid pointer | Publish synthetic score 0 |
| Persistence/partial write fails | Rollback transaction; safe retry | Partially published assessment |
| Refresh fails | Retain current valid assessment plus latest-run error | Replace it with failure |
| Expired/licensed-out evidence | Label historical or exclude from eligible replay/score | Misrepresent as fresh/permanently retained |

Distinguish **operational run status**, **fact status**, **freshness**, **confidence**, and **published assessment eligibility** in storage and APIs; the UI may consolidate them for clarity without conflating meanings.

## 24. Testing and release gate design

Required testing: frozen Phase 1 engine/database/UI fixtures; migration rollback and ownership preservation; RLS two-user positive/negative; protected-data/score tamper denial; provider rate-limit/quota/auth/timeout simulations; missing vs verified zero; incomplete search bounds; fallback unit and threshold enforcement; place deduplication; cache correctness; partial refresh and immutable snapshot composition; context circularity/override; score bounds/determinism/renormalization and zero vs missing; historical replay; concurrency/idempotency; transactional current pointer; license/attribution; budget enforcement; typecheck/build and responsive/accessibility regression.

**Validation before scoring v1.0:** (a) Malaysian provider benchmark at ~15–20 diverse locations; (b) face-validity sample of ~20 deliberately different properties across the four contexts; (c) ±5 percentage-point major-weight sensitivity checks with normalized totals, tracking score/ranking movement; (d) adversarial scenarios: excellent rail/poor others, no rail but excellent roads/jobs, many POIs but poor access, good location with incomplete evidence, and strong regional non-rail location. Write expected behavior *before* tests. Once v1.0 is approved, freeze exact numeric fixtures for regression.

**Replay acceptance:** given the exact historical location, snapshot, fact set, context, scoring rules and engine implementation, the computed metric/domain/overall results and deterministic reason codes match the stored authoritative result (within an explicitly documented numeric representation rule; aim for exact repeatability). Provider calls must not be required for replay.

## 25. Phase 2 implementation roadmap and audit gates

### 2A-00 — Read-only architecture readiness gate (NEXT STEP)

Verify `PHASE1_ARCHITECTURE_FREEZE.md` against the actual repository, current migrations/schema, ownership/RLS model, Git branch and immutable Phase 1 regression baseline. Map expected Phase 2 tables to existing naming/conventions and report collisions or extension constraints. Produce a gap matrix and a proposed `2A-01` schema change set **without applying migrations, committing code, installing extensions, changing settings, or calling paid providers**. Explicitly check how ARC-06 state separation and ARC-08 responsibility-driven table count affect the 2A schema. Any mismatches are decision items, not permission to alter Phase 1.

### 2A — Location Foundation

Deliver logical schema/migrations, spatial extension, property location versioning, fact registry skeleton, freshness policies, provider registry, canonical-place foundation, location current-state record, server-side geocoder interface, credential isolation and initial RLS. **No full POI intelligence or score.** Gate: 2A-00 readiness accepted; Phase 1 regression unchanged; property saving independent; geocoding confirmation works; spatial and location-version tests; multi-user isolation; secrets and build pass. Small Codex tasks: 2A-01 database foundation, 2A-02 PostGIS/location versioning, 2A-03 interfaces, 2A-04 geocoding, 2A-05 RLS/security, 2A-06 audit.

### 2B — Evidence Acquisition and Normalization

Deliver run/request persistence, provisional Places adapter, provider benchmark P2-D1, source observations, taxonomy, canonical place dedup, cache fingerprints and license/attribution metadata. Gate: category boundaries, zero vs failure, dedup, partial error handling, retention/license eligibility (ARC-05), bounded radius/capped results (ARC-01), cost accounting, Malaysian coverage benchmark and explicit provider approval (ARC-09), Phase 1 tests. **Do not freeze a vendor before benchmark acceptance.**

### 2C — Evidence Lifecycle, Facts and Context

Deliver snapshots/manifests, freshness, typed fact sets, routing candidate optimizer, context area features and classifier, context overrides, refresh/reprocess/recalculate orchestration and replayable evidence/fact records. **No official Location Score.** Gate: deterministic facts; known-zero/unknown correct; bounded acquisition semantics (ARC-01); measurement-specific fallback facts (ARC-02); area-level context anti-circularity fixtures (ARC-10); partial snapshot immutability; context determinism/override no provider calls; Phase 1 regression.

### 2D — Scoring Configuration and Assessment

Deliver profile/version schema, Admin draft editor and activation validation, rule evaluators, metric/domain aggregation, context weighting, assessment lineage/persistence, reason codes and historical replay. Seed **Malaysia Residential Standard Draft v0.1**, not a certified production v1.0. Gate: deterministic and bounded scores; zero vs insufficiency; domain-plus-overall coverage BEFORE renormalization (ARC-03); measurement-specific fallback rules (ARC-02); unresolved metrics cannot become active (ARC-11); no intermediate rounding; no provider calls on profile/context changes; immutable ACTIVE version; browser write denial; Phase 1 regression.

**Approved reconciliation ARC-04:** use a development/test activation state or environment restriction so an unvalidated Draft v0.1 cannot be mistaken for a public production-approved scoring model. The user-facing official launch depends on 2F calibration/approval.

### 2E — Location Intelligence UX

Deliver property summary, full Location page, stored-evidence map, filters/overlays and POI popups, domain cards, quality/confidence and freshness, refresh/context controls, evidence browser, basic history, responsive/accessibility. Gate: historical maps use historical snapshots; map activity cannot acquire evidence or alter official state; clear partial/stale/error/insufficient displays; Phase 1 UI regression.

### 2F — Hardening, Calibration and Release

Perform security/RLS audit, provider failures/quota/cost test, Malaysian benchmark follow-up, face-validity/sensitivity/adversarial tests, exact deterministic fixtures, Phase 1 full regression, Phase 2 architecture compliance audit, license review, approved scoring v1.0 promotion (if qualified), architecture freeze and release candidate. Only after all gates pass may `phase2-location-intelligence` merge to `main`. **ARC-04: do not publish v0.1 draft scores as official during 2D/2E; 2F calibration and explicit approval must precede v1.0 production activation.**

**Git workflow:** verify existing integration branch first; use short-lived `phase2a-location-foundation` through `phase2f-hardening` work branches, each merged only after its audit gate. Do not introduce a second unrelated mainline or silently alter protected Phase 1 files.

## 26. Lovable and Codex division of work

Lovable focuses on view layout, visual styling, responsive behavior, maps/cards/filters and Admin form UX. Codex owns schema/migrations, RLS, PostGIS, provider adapters, Edge/server functions, normalization, facts/context, calculation/versioning, authoritative contracts, tests and audits. UI generation **must not** redefine backend contracts or calculate authoritative values in the browser.

After meaningful Lovable changes, audit routes, changed API contracts, Phase 1 files, database calls, business logic placement, RLS assumptions, exposed provider calls/keys, typechecks/build and Phase 1 UI flows. Every narrow Codex task begins by reading the accepted `PHASE1_ARCHITECTURE_FREEZE.md` and `PHASE2_ARCHITECTURE_PLAN.md`. If requirements conflict, **STOP and report the precise conflict rather than inventing a fix**.

## 27. Architecture invariants

| ID | Non-negotiable invariant |
|---|---|
| INV-01 | Phase 2 never changes Phase 1 financial calculation behavior. |
| INV-02 | Location Score calculation is deterministic. |
| INV-03 | AI cannot produce, alter or override scores. |
| INV-04 | Vendor-specific raw observations never enter the scorer directly. |
| INV-05 | Missing/unavailable/out-of-coverage is never silently represented as zero. |
| INV-06 | Authoritative historical artifacts are immutable, subject to enforceable lawful retention requirements. |
| INV-07 | Profile edits/recalculation do not require external refresh. |
| INV-08 | Context confirmation/override does not require external refresh. |
| INV-09 | Map interactions cannot mutate official evidence or assessment. |
| INV-10 | Protected analytical provider requests execute server-side. |
| INV-11 | Browser clients cannot author authoritative scores. |
| INV-12 | Assessments trace exact location, snapshot, facts, context, profile and engine versions. |
| INV-13 | Phase 2 failure cannot invalidate Phase 1. |
| INV-14 | Current-valid, latest-attempt, stale and historical states are distinguishable. |
| INV-15 | Provider retention, permission and attribution rules are centrally enforced. |
| INV-16 (clarification) | A measurement is never evaluated against rules for a different measurement unit/method. |
| INV-17 (clarification) | Neither search-radius limits nor result caps silently imply complete absence. |
| INV-18 (clarification) | No provisional scoring configuration is promoted to production without calibration gates. |
| INV-19 (clarification) | Official scores require both per-domain and overall coverage eligibility before renormalization. |
| INV-20 (clarification) | New location versions never inherit an old-location assessment as current. |

## 28. Architecture reconciliation register

The handover is broadly internally consistent. **ARC-01, ARC-02, ARC-03, ARC-04, ARC-05, ARC-06, ARC-08, ARC-09, ARC-10 and ARC-11 are OWNER-APPROVED on 2026-10-11.** Remaining register entries are additional design clarifications, not automatically approved. Acceptance of a rule does not certify provider terms, scoring calibration, or repository compatibility.

| ID | Priority | Handover tension / gap | Resolution / decision gate |
|---|---|---|---|
| ARC-01 (APPROVED) | HIGH | Several nearest-distance scoring bands require evidence beyond acquisition radius | Use bounded/unknown result semantics; expand searches or revise exact score eligibility after benchmark |
| ARC-02 (APPROVED) | HIGH | Walking, driving and straight-line fallbacks lack complete corresponding scoring curves | Define method-specific approved rule sets; never use time curve for distance; otherwise unavailable |
| ARC-03 (APPROVED) | HIGH | `EXCLUDE_AND_RENORMALIZE` can inflate sparse scores | Enforce configured-weight domain and overall coverage gates first, then publish effective weights |
| ARC-04 (APPROVED) | HIGH | 2D draft score vs 2F v1.0 approval | No production approval before 2F calibration; use development-only assessment until then |
| ARC-05 (APPROVED) | HIGH | Permanent historical replay vs restrictive data licenses | Legal review and centrally enforced retention; reject ineligible source facts from authoritative replay |
| ARC-06 (APPROVED) | MEDIUM | STALE appears beside processing stages | Separate process state from freshness overlay and publication status |
| ARC-07 | MEDIUM | KNOWN_ZERO / VERIFIED_ZERO and VERIFIED status variants | Define canonical typed status and separate acquisition coverage metadata |
| ARC-08 (APPROVED) | MEDIUM | Estimated 18–20 tables vs larger table enumeration | Do not cap schema count; document exact DDL at 2A schema gate |
| ARC-09 (APPROVED) | MEDIUM | 2A geocoding precedes 2B primary-provider benchmark | Build interchangeable provisional adapter; gate provider freeze in 2B |
| ARC-10 (APPROVED) | MEDIUM | Context uses some features also relevant to scoring | Broader-area feature design, classifier precedence and circularity fixtures |
| ARC-11 (APPROVED) | MEDIUM | No detailed definition for key submetrics (bus, interchange, roads, employment tier) | Define metric-to-fact contract and calibrated rules before scorer activation |
| ARC-12 | MEDIUM | Historical replay depends on old engine behavior, not just version ID | Retain replay-capable engine artifact or compatibility evaluator, with deterministic fixture tests |
| ARC-13 | MEDIUM | Provider cap can turn observed limited list into false exact count | Record truncation/completeness and eligible count-saturation threshold |
| ARC-14 | MEDIUM | Old current-valid pointer may refer to old property coordinates | Scope pointer by property/location/profile; mark superseded location historical |
| ARC-15 | MEDIUM | Evidence confidence calculation is conceptual | Define a separate versioned evidence-quality policy, inputs and UI categories; never infer from score |
| ARC-16 | MEDIUM | Context rule/profile activation and data governance authorization unspecified | Set role enforcement, approval/audit and atomic activation contracts before Admin release |
| ARC-17 | LOW | Threshold boundary and numeric precision not fully defined | Ordered inclusive bands, typed units, decimal precision and explicit tie-handling tests |
| ARC-18 | LOW | Basic UX and full historical map behavior scope ambiguous | Implement minimum historical snapshot view in 2E; advanced comparison deferred |

## 29. Open decisions and sign-off checklist

Before **2A-01 implementation**: conduct read-only verification of the actual Phase 1 freeze, live repository schema and ownership relationships, existing migrations, auth model, Git branch, and test baseline. The ten approved reconciliations are binding; settle any remaining unapproved schema/authorization/geocode details by explicit design review. This is a readiness gate, **not authorization to modify the repository**.

Before **2B provider freeze**: approve measurable benchmark pass criteria, review binding licensing/retention terms, set provider budget and storage policy, validate Malaysian categorization and completeness semantics.

Before **2D score activation**: finalize metric-to-fact mapping, missing/NA/verified-zero semantics, measurement-specific fallback rules, critical-domain eligibility, economic nodes and context classifier, precision/rounding and development-only publication behavior.

Before **2F release**: approve provider v1, Malaysia Residential Standard v1.0 only if calibrated, replay evidence, RLS/security gates, operating budgets, documented exceptions, all regression results and architecture freeze. If any unresolved high-priority gap persists, withhold official production scoring.

## 30. Approved reconciliation acceptance and verification matrix

| Approved ID | Binding decision | Mandatory verification |
|---|---|---|
| ARC-01 | Out-of-radius measurements are unknown/bounded, not presumed worst-band | Fact fixtures for radii, pagination and truncation in 2B/2C |
| ARC-02 | Measurement-specific scoring/fallback rules; no distance-as-time conversion | Unit/method mismatch tests in 2C/2D |
| ARC-03 | Per-domain and overall configured-weight eligibility before renormalization | Sparse-data/adversarial score fixtures in 2D/2F |
| ARC-04 | Draft scoring capability in 2D is not official v1.0 publication | Environment/status gating; 2F calibration sign-off |
| ARC-05 | Authoritative retained/replayable evidence must be licensing-compliant | Vendor terms and purge/retention/replay scenarios in 2B/2F |
| ARC-06 | Processing, freshness and publication states are distinct | 2A schema/API contract and 2E status presentation tests |
| ARC-08 | No arbitrary 18–20 table limit; schemas follow narrow ownership boundaries | 2A-00 inventory and 2A-01 migration design |
| ARC-09 | 2A may use provisional geocoder; vendor approval is gated in 2B | Provider interface tests and P2-D1 benchmark report |
| ARC-10 | Area-level context features and circularity protection | 2C classifier fixtures and 2F adversarial calibration |
| ARC-11 | Incompletely defined metrics are not silently scoreable | Metric registry traceability audit before 2D activation |

**Approval scope:** This acceptance resolves ten architecture-policy issues, not the concrete provider contract, draft numeric weights, unresolved metrics, new schema DDL, remaining ARC entries or Phase 1 repository facts. The next step is read-only readiness verification.

## 31. Release, architecture freeze and future change control

The ten resolved design points are **accepted** while profile weights remain **DRAFT** and calibrated through controlled immutable versions. Final code/database implementation still requires task-sized prompts and audits. Store the accepted document in the repository root (or established architecture-docs location) alongside the Phase 1 freeze reference. Record accepted revision/commit and change log. On 2F approval, create Phase 2 freeze/release notes and only then merge the validated integration branch into `main`.

Changes to FROZEN PRINCIPLES require explicit owner authorization; adjustments to scoring thresholds and weights require a validated draft/activation lifecycle but do not require new provider calls. Changes to algorithm types, normalization, fact semantics, security or licensing require design review, version bump and appropriate replay/regression tests. Third-party terms and actual deployed migrations are external source-of-truth checks, not facts established by this handover.

---

### Implementation instruction to include in every future Codex prompt

> Read `PHASE1_ARCHITECTURE_FREEZE.md` and the approved `PHASE2_ARCHITECTURE_PLAN.md` fully before modifying code. Preserve Phase 1 behavior, immutable versioning, RLS, provider constraints and deterministic scoring. Implement only the specifically authorized narrow task, run its gate tests and report changed files/results. If any requirement conflicts with either approved architecture document or the actual repository state, **STOP without implementing the conflicting part**, describe the conflict and propose choices for owner approval. Do not silently invent new schema, scores, algorithms or provider-retention permissions.

**Next authorized activity (no implementation):** run the read-only `Phase 2A-00 — Repository & Phase 1 Freeze Verification` audit, reconcile findings, then prepare the narrow `Phase 2A-01 — Database Foundation` implementation specification for separate approval. Do not execute 2A-01 before that authorization.
