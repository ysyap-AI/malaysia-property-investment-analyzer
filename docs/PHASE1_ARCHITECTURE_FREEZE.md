# Phase 1 Architecture Freeze

## 1. Purpose

Phase 1 is the stable investment-analysis foundation. This document is the official architectural baseline for Phase 2: new capabilities may extend the system, but must not weaken financial correctness, evidence handling, reproducibility, or user isolation.

Freeze date: 2026-10-02 (Asia/Kuala_Lumpur).

| Baseline | Reference |
| --- | --- |
| Stable release | `v0.1-phase1` |
| Release commit | `fc498479438ae5a6cf7ad8c3f6099801e40c6e9d` — Phase 1 MVP stable release |
| Stable main / Phase 2 starting commit | `72c2b8748d6468747b9784597b8f596e030b0dfb` — Add Phase 1 release notes |
| Development branch | `phase2-location-intelligence` |

The starting commit adds only release notes to the tagged release. The working tree was clean on `main` before branch creation. The [release notes](RELEASE_NOTES_v0.1_PHASE1.md) record completed Phase 1 validation; this freeze is documentation, not a new live-system audit.

Existing investment decisions must remain reproducible from the same saved inputs, evidence statuses, engine revision, and configuration. Preserve the release tag and baseline fixtures. Any approved future engine change must identify its version and behavioral differences; it must not silently reinterpret old decisions. The seven-table baseline does not implement an analysis-snapshot store: automatic historical snapshots must not be claimed as an existing capability.

This document describes implemented boundaries. The earlier [architecture proposal](phase-1-architecture.md) and placeholder module READMEs contain planned structures that are not the released implementation. [PROJECT_RULES.md](../PROJECT_RULES.md) remains binding; this transition does not implement features or grant blanket approval for later phases.

## 2. System Architecture Overview

```text
Frontend
    |
Application Logic
    |
Business Engines
    |
Database
    |
External Services
```

This is a conceptual inventory of system layers, not a sequential request path. Application logic loads saved data through data-access modules and passes inputs into pure business engines. Engines do not call the database or external services.

| Layer | Released implementation and responsibility |
| --- | --- |
| Presentation Layer | React, TanStack Start/Router, Tailwind and shared UI components in `src/routes/` and `src/components/`. Forms collect inputs; dashboards display engine outputs, evidence, missing-data states and errors. |
| Application Logic | `src/hooks/use-property-analysis.ts` coordinates saved inputs, Base/Bull/Bear scenarios, financial results, scoring, confidence, red flags and recommendations. TanStack Query manages loading, errors and cached data. |
| Business Logic Layer | Pure TypeScript modules in `src/lib/finance/`, `scenarios/`, `scoring/`, `risk/` and `recommendations/`; explicit defaults in `src/config/`. Deterministic calculations and decisions belong here. |
| Data Layer | `src/lib/property/*-api.ts` uses the Supabase client for property and financial CRUD. PostgreSQL constraints and RLS enforce data validity and ownership. Migrations are in `supabase/migrations/`; database types are in `src/integrations/supabase/types.ts`. |
| External Integration Layer | The active application client is `src/integrations/supabase/external-client.ts`, connecting to the user-owned Supabase project for Auth and data. Future location/market providers require separate adapters; no location research provider is part of this baseline. |

Current property CRUD uses browser-side Supabase data access, rather than the server-function-only design in the original proposal. RLS is therefore an essential enforcement boundary, independent of frontend filtering. The analysis hook coordinates calculations; it must not become an alternative financial formula layer.

## 3. Phase 1 Core Engines (PROTECTED)

The following engines, their input/output contracts, validation, rounding behavior and effective configuration are frozen. A freeze permits separately reviewed correctness fixes; it does not permit incidental rewrites while adding Phase 2 features. Unknown inputs must remain explicitly unavailable, never silently become zero. Genuine entered zero and valid negative financial outcomes must retain their distinct meanings.

### Financial Calculation Engine

**Modules:** `src/lib/finance/acquisition.ts`, `operating-expenses.ts`, `financing.ts`, `returns.ts`, and `rounding.ts`; shared validation in `src/lib/phase1-validation.ts`.

Calculates acquisition costs, operating expenses, financing, rental returns, cash flow and break-even metrics. Gross rental yield, net rental yield, yield on total cost and cash-on-cash return must remain distinct metrics; none may be relabelled as capital appreciation or total investment return.

- Formulas must not change without a dedicated financial audit, explicit architecture review and regression evidence.
- The UI must never independently calculate financial outputs or duplicate formulas.
- Preserve completeness checks, input bounds and rounding. Missing required inputs withhold dependent outputs.

### Scenario Engine

**Module:** `src/lib/scenarios/scenario-engine.ts`; configuration: `src/config/scenarios.ts` (`scenarios-v1`).

Calculates Base Case, Bull Case and Bear Case using explicit rent, vacancy, expense and financing assumptions and the shared financial modules.

- Results must remain deterministic and reproducible for the same inputs and configuration.
- Assumptions must remain explicit and distinguishable from observed market facts.
- AI must not override scenario inputs or results. External provider refreshes must not silently change saved scenario assumptions.

### Investment Scoring Engine

**Module:** `src/lib/scoring/investment-score.ts`; configuration: `src/config/scoring.ts` (`scoring-v2`); shared band validation: `src/lib/scoring/band-validation.ts`.

Converts validated financial metrics into an investment score using explicit configurable bands and weights. The six active financial categories are net rental yield, gross rental yield, monthly cash flow, cash-on-cash return, break-even occupancy and financing resilience.

- Scoring must remain deterministic and configurable, with explainable contributions.
- AI must not generate or assign the investment score.
- Phase 2 location/market factors cannot silently enter the score, weights or normalization. Such changes require explicit architecture review and versioned regression evidence.

### Data Confidence Engine

**Module:** `src/lib/scoring/data-confidence.ts`; configuration: `src/config/confidence.ts` (`confidence-v2`).

Measures evidence quality and completeness, including rent provenance, acquisition and operating costs, financing evidence and bank valuation.

- Confidence is separate from the investment score: it measures confidence, not attractiveness.
- Missing or invalid evidence reduces confidence; a verification label cannot make absent or invalid values valid.
- Reserved future factors remain inactive in the Phase 1 baseline. Location/market confidence belongs to the new modules unless a reviewed integration explicitly changes this contract.

### Critical Red Flag Engine

**Module:** `src/lib/risk/red-flags.ts`; configuration: `src/config/red-flags.ts` (`red-flags-v2`).

Identifies deterministic investment risks from financial outputs and evidence, including adverse cash flow, break-even exposure, valuation gaps and missing required information.

- Flags must remain explainable, rule-based and evidence-driven.
- Missing evidence must not be reported as a passed check. Preserve missing-evidence and unchecked outcomes and distinguish them from disabled rules.
- AI or new market observations cannot silently suppress existing flags.

### Recommendation Engine

**Module:** `src/lib/recommendations/recommendation.ts`; configuration: `src/config/recommendation.ts` (`recommendation-v2`).

Generates the final recommendation from financial results, investment score, data confidence, red flags and missing required inputs.

Allowed outputs are **BUY CANDIDATE**, **NEGOTIATE**, **WATCHLIST**, **REJECT**, and **INSUFFICIENT DATA**.

- AI cannot override the recommendation.
- Gross yield alone cannot create BUY CANDIDATE. Net yield, cash flow, cash-on-cash return and financed break-even occupancy remain mandatory safeguards.
- Preserve rule precedence: insufficient data, rejection, evidence-related watchlist, negotiation, buy candidate, then watchlist fallback.
- Required data loading or query failure must withhold a current positive recommendation; stale cached inputs are not current evidence.

## 4. Phase 1 Database Architecture

The seven existing application tables are in PostgreSQL's `public` schema:

| Table | Ownership, foreign keys and unique relationships |
| --- | --- |
| `profiles` | `id` is both primary key and foreign key to `auth.users(id)`, with `ON DELETE CASCADE`: at most one profile per user. Own-row policies compare `auth.uid()` with `id`. A signup trigger creates the profile. |
| `properties` | `id` is the primary key; required `user_id` references `auth.users(id)` with cascading deletion. A user can own many properties. Policies compare `auth.uid()` with `user_id`. |
| `acquisition_costs` | `id` is the primary key; required, unique `property_id` references `properties(id)` with cascading deletion: at most one acquisition-cost row per property. Ownership is inherited from the parent property. |
| `operating_expenses` | Same required, unique property foreign key and inherited ownership: at most one operating-expense row per property, deleted with its parent. |
| `financing` | Same required, unique property foreign key and inherited ownership: at most one financing row per property, deleted with its parent. |
| `investment_criteria` | `id` is the primary key; required, unique `user_id` references `auth.users(id)` with cascading deletion: at most one criteria row per user. |
| `scenario_configs` | `id` is the primary key; required `user_id` references `auth.users(id)` with cascading deletion. `UNIQUE (user_id, scenario_name)` permits at most one named scenario per user. |

The configuration tables exist, but the released shared analysis hook uses the `DEFAULT_*` configurations from `src/config/`; do not describe persisted criteria/scenario rows as active overrides in that path.

All seven tables have RLS enabled and owner-scoped policies for authenticated CRUD. SELECT/DELETE enforce `USING`; INSERT enforces `WITH CHECK`; UPDATE enforces both existing-row and new-row ownership. Child tables use `public.owns_property(property_id)`, whose final migration definition is `SECURITY INVOKER` with an explicit search path. Checking only a child ID or a client-supplied owner is insufficient.

The migration chain also preserves nullable financial inputs, nonnegative cost checks and bounded financial inputs. Reconciliation migrations retain legacy columns rather than guessing how old values map into current financial categories. Ordinary API roles are denied `TRUNCATE`, `REFERENCES` and `TRIGGER` privileges on these tables.

Phase 2 additions must preserve existing ownership rules, foreign keys, uniqueness, constraints and RLS. Prefer new location/market tables with explicit ownership and reviewed relationships. Avoid modifying Phase 1 financial tables unless justified through architecture and migration review. Never repurpose financial fields, infer missing costs or backfill unknown inputs as zero.

## 5. Authentication and Security Model

Supabase Auth provides email/password signup, login and password recovery. The active external client persists sessions and refreshes tokens automatically. `previewAuthStorage.ts` uses browser local storage and, on supported embedded Lovable preview surfaces, trusted-editor session brokering. Session material must remain private.

`src/hooks/use-auth.ts` subscribes to auth changes and loads session state. The protected route in `src/routes/_authenticated/route.tsx` validates the user through `auth.getUser()` and redirects unauthenticated visitors to `/login`. Protected routes disable SSR. `src/lib/auth-isolation.ts`, wired in the root route, clears the query cache when identity changes; leaving an existing identity triggers navigation to discard private form state.

Each property belongs to exactly one authenticated user. Database authorization uses the caller's identity and owner-scoped RLS, independently of route guards or browser filtering. Anonymous visitors may use public authentication pages but have no owner-policy access to private application records. A public Supabase key does not grant private user access.

No Phase 2 feature may bypass authentication, authorization or RLS. Ordinary user CRUD must not use a service-role identity to bypass policies. Private API keys belong in server-side configuration, never browser code, browser environment variables or committed files. New caches and provider endpoints must preserve user isolation, including logout and account switching.

## 6. Phase 2 Extension Rules

Phase 2 may add location intelligence, geocoding, maps, nearby amenities, transport analysis, schools, universities, employment centres, rental-demand indicators and external data providers, within explicitly agreed feature scope.

All such information must feed **NEW LOCATION / MARKET MODULES**, with their own evidence, confidence, timestamps and failure states. These modules may display alongside Phase 1 financial analysis and consume defined read-only interfaces. They must not directly rewrite the Financial Engine, Investment Score or Recommendation Engine without explicit architecture review. The scenario, confidence and red-flag protections in section 3 remain binding as well.

A provider response must not silently replace saved rent, purchase price, costs, financing or scenario assumptions. Any proposed flow from research into saved financial inputs needs an explicit reviewed contract, visible user choice and provenance. Existing Phase 1 fixtures must retain their outputs when location data changes or becomes unavailable.

These extension examples do not advance all later-phase work: `PROJECT_RULES.md` places rental/sale market data and automated property-data integrations in Phase 3, and AI investment interpretation in Phase 4. Rental-demand indicators are distinct from verified comparable rents or transactions. Cross-phase work requires explicit scope authorization. This freeze introduces no providers, features or schema changes.

## 7. External Data Architecture Rules

Future integrations, such as Google Maps, OpenStreetMap, property data providers and government/open datasets, require the following before adoption. These are candidate provider categories, not selected or implemented services.

- **Provider abstraction layer:** use a defined application-facing interface and provider adapters. Normalize responses and validation outside UI components; keep private credentials server-side.
- **Caching strategy:** define cache keys, expiry, refresh, invalidation and stale-data behavior. Separate user-private data from shareable public evidence and enforce ownership on private cache entries.
- **Source attribution:** retain provider, source reference, retrieval time, observation date where available and evidence status. Preserve distinctions between asking prices and transactions, and advertised rents and achieved rents.
- **Confidence scoring:** expose transparent location/market evidence-quality rules, including freshness, completeness and uncertainty. This is separate from the frozen investment score and Phase 1 confidence rules.
- **Failure handling:** define timeouts, bounded retries, rate-limit handling and explicit unavailable/error states. Do not fabricate amenities or treat a failed lookup as proof that none exist. External failures must not corrupt saved inputs or prevent independent Phase 1 analysis.

Do not directly embed external API calls inside UI components. UI code requests application services and renders normalized results and status; adapters own provider-specific requests and error handling.

## Phase 2 Scoring Integration Philosophy

Phase 2 may introduce independent evidence modules within explicitly agreed scope, such as:

- Location Quality Score
- Connectivity Score
- Amenity Score
- Education Accessibility Score
- Employment Accessibility Score
- Rental Demand Indicator Score

These scores must initially remain separate from the Financial Calculation Engine, Investment Score, Data Confidence Engine and Recommendation Engine. Their evidence quality belongs to the new location/market modules; it must not activate reserved Phase 1 confidence factors or change existing decision rules.

**Phase 2 evidence enriches analysis. It does not silently modify existing investment decisions.** The scenario and red-flag protections in section 3 also remain binding.

Any future integration between a Location Score and the Investment Score requires:

- Documented scoring methodology.
- Proposed weighting changes, including their effect on existing contributions and normalization.
- Historical/backtesting evidence where available, with unavailable evidence and limitations recorded explicitly.
- Regression testing against existing Phase 1 fixtures.
- Architecture review approval before integration.
- Versioned scoring configuration.

Future combined scores, if introduced, must have separate versioning from their component scores. For example, **Investment Score v2**, **Location Score v1** and **Combined Property Score v1** would each identify a distinct score and version. These are illustrative names, not newly implemented scores or replacements for the released `scoring-v2` configuration.

Existing Phase 1 decisions must remain reproducible from their original inputs, evidence statuses, engine revision and configuration. An approved combined score must identify its component versions and methodology; it must not silently reinterpret saved Phase 1 decisions. The baseline still has no automatic analysis-snapshot store.

## Phase 2 Location and Market Data Architecture Rules

External intelligence data must remain separate from Phase 1 financial data and should not be stored directly inside Phase 1 financial tables. The two data categories serve different purposes:

| Phase 1 Financial Data | Phase 2 Location/Market Data |
| --- | --- |
| User entered | Externally sourced |
| Property specific | Provider attributed |
| Investment calculation input | Evidence based |
| Relatively stable saved assumptions | Frequently changing observations |
| Ownership controlled | Requires timestamps and may have uncertainty; ownership and access controls still apply |

The recommended separation pattern is:

```text
properties
    |
    +-- location_profiles
            |
            +-- location_evidence
                    |
                    +-- provider_results
```

This is an architectural recommendation only. No Phase 2 schema is being created by this document. The proposed names describe logical separation, not approved tables, cardinalities or access policies. Any future schema requires architecture and migration review and must preserve the ownership, constraints and RLS protections in sections 4 and 5.

Phase 2 must not:

- Repurpose financial columns.
- Store external provider data inside acquisition costs.
- Overwrite user-entered assumptions.
- Replace missing financial inputs with external estimates.
- Silently modify Phase 1 calculations.

Any external evidence that influences investment analysis must have source attribution, a retrieval timestamp, an evidence status, a confidence level and failure state handling. Missing or uncertain evidence must remain visible; provider results do not become verified financial inputs merely because they were retrieved successfully. Any proposed user-directed transfer into saved inputs remains subject to the explicit reviewed contract, visible user choice and provenance requirements in section 6.

These rules govern future data separation without advancing later-phase scope. Rental/sale market data and automated property-data integrations remain Phase 3 work unless explicitly authorized, as required by `PROJECT_RULES.md` and section 6.

## External Provider Operational and Cost Governance

External integrations require documented operational controls before implementation, in addition to the provider abstraction, evidence and security requirements already defined in this freeze.

### API Cost Control

Each future provider must define its pricing model, request limits, expected usage volume, cost per analysis and caching opportunities. Document the assumptions behind usage and cost estimates so the proposed integration can be reviewed before adoption.

### Request Management

Each future integration must define when API calls occur, which refreshes are user-triggered versus automatic, how duplicate requests are prevented and the batching strategy where applicable. Refresh behavior must respect provider limits and the approved usage assumptions.

### Caching Strategy

Providers require documented cache keys, expiry rules, refresh rules, invalidation rules and stale-data handling. Cached data must preserve its source, retrieval date, ownership rules and confidence status. Reading a cached result must not present it as newly retrieved evidence. Private cache entries must retain user isolation through logout and account switching.

### Failure Handling

Provider failure must result in an explicit unavailable state, with bounded retry handling where appropriate. Never fabricate data or assume that missing results mean negative evidence. Preserve the distinction between an unsuccessful lookup and a successful lookup with no matching results; external failures must not alter saved inputs or prevent independent Phase 1 analysis.

### Security

Private provider credentials must remain server-side. They must never appear in browser code, be committed to Git or be exposed through client environment variables. Provider endpoints and caches remain subject to the authentication, authorization and ownership protections in section 5.

## 8. AI Usage Rules

AI may summarize findings, explain results, generate reports and assist user interpretation when separately authorized for the relevant phase. These permissions describe boundaries, not an AI implementation in this release.

AI must not calculate financial metrics, assign an investment score, override a recommendation or hide missing evidence. It must not invent transactions, rents, occupancy, amenities, legal verification or other supporting facts. AI explanations must refer to authoritative engine outputs and attributed evidence; generated observations must remain distinguishable from verified facts.

## 9. Testing Requirements Going Forward

Every Phase 2 feature must maintain the following coverage and add relevant tests for its new behavior:

| Test category | Required protection |
| --- | --- |
| Unit tests | Deterministic financial, scenario, scoring, confidence, flag and recommendation behavior; normal, boundary, missing, zero and invalid-input cases. Test new provider normalization and confidence rules. |
| Integration tests | Saved inputs through the shared analysis path and UI consumers; loading/error/refetch handling; provider success, failure, stale cache and recovery. |
| Security tests | Secret exclusion, authentication, authorization, session/cache isolation and anonymous denial. Source/bundle scans do not replace database isolation tests. |
| Database tests | Ownership across two users, child-parent authorization, CRUD policies, constraints, uniqueness, migration compatibility and fixture cleanup for affected schemas. |
| Regression tests | All existing Phase 1 suites and fixed P01-P10 fixtures remain passing; changing location/market evidence alone cannot change frozen financial decisions. |

Run `npm test` for the existing Vitest and security suites; see [tests/README.md](../tests/README.md) and [fixture documentation](../tests/fixtures/README.md). Run `npx --no-install tsc --noEmit` and `npm run build`. To include rebuilt browser assets in security verification, set `SECURITY_AUDIT_BROWSER_ROOT` to `.output/public` before running `npm run test:security`.

For database changes, follow the documented environment-specific audit procedure. `node tests/run-phase1-database-audit.mjs` requires the designated local Docker database with an empty public schema, runs transactional tests and writes audit artifacts. Do not run its empty-schema workflow against an existing production schema. Record failures, skips, environment and cleanup; local checks must not be represented as fresh production verification.

The Phase 1 regression suite must continue passing. Do not delete failing tests to accept a feature. Protected-engine changes require dedicated audit evidence in addition to general suite success.

## 10. Phase 2 Development Checklist

Before merging a Phase 2 feature into `main`:

- [ ] Confirm feature scope and architecture review, including compliance with this freeze and any explicitly approved protected-engine change.
- [ ] Complete security review: authentication, authorization, RLS, credentials, provider endpoints and cache isolation.
- [ ] Complete database migration review; record explicitly when no migration is involved. Preserve ownership, constraints, existing data and compatible application behavior.
- [ ] Run relevant unit, integration, security, database and regression tests; keep all Phase 1 regressions passing and document any unexecuted checks.
- [ ] Verify TypeScript and a production build, and scan the rebuilt browser assets.
- [ ] Verify UI regression behavior for financial outputs, evidence labels, missing data, provider failure and user switching.
- [ ] Record input/configuration versions and before/after evidence for approved decision-affecting changes so earlier analyses remain reproducible.
- [ ] Update documentation with provider contracts, attribution, failure handling and known limitations.
- [ ] Location/market data remains separated from Phase 1 financial data.
- [ ] External providers have documented attribution, cost, caching and failure behaviour.
- [ ] New scores do not silently modify Investment Score.
- [ ] Any scoring integration has versioned methodology and regression evidence.
- [ ] Existing Phase 1 fixtures produce unchanged results when external data is unavailable.
- [ ] Keep `main` working and preserve `v0.1-phase1`. Do not force-push or rebase, amend or squash already-pushed commits; connected-branch pushes sync to Lovable, as required by [AGENTS.md](../AGENTS.md).

Phase 2 development can begin on `phase2-location-intelligence` under these boundaries. This document freezes the Phase 1 architecture; it does not implement Phase 2.
