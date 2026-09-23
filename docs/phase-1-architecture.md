# Phase 1 Architecture Proposal — Malaysia Property Investment Analyzer

No implementation code yet. This document is the proposal for review.
Scope: Phase 1 only (no maps, no external research, no AI, no PDF).

---

## 1. Frontend Architecture

**Stack (fixed by platform):** React 19 + TanStack Start (file-based routing), Tailwind v4, shadcn components.

**Route plan**
```text
/                    Landing + sign-in entry
/auth                Sign up / sign in
/properties          List of the logged-in user's properties
/properties/new      Manual property entry (multi-step form)
/properties/$id      Property dashboard (financials, scenarios, score, risks)
/properties/$id/edit Edit the saved inputs
```

**Layering rule:** UI components only *display* numbers. They never contain a
formula. Every figure shown comes from Engine A or Engine B output objects.

**Data status display:** one shared badge component renders the six statuses
(Verified, User Entered, Estimated, Listing Data, Missing / Not Verified,
AI Generated Observation). Missing values render as the words
"Missing / Not Verified", never as 0 and never as a blank.

**Plain English:** the screens are dumb display surfaces. If a number is wrong,
there is exactly one place in the codebase to fix it.

---

## 2. Backend Architecture

**Server functions** (`createServerFn`) hold all reads/writes of property data,
so the browser can never bypass validation. External HTTP endpoints are not
needed in Phase 1.

- `properties.functions.ts` — create, update, list, get, delete (auth-required)
- Validation with Zod at the boundary; a field that is absent stays `null`,
  it is never coerced to `0`.
- Financial calculation runs in pure TypeScript modules that both server and
  client can import, so results are identical wherever they run.

**Plain English:** the server is the gatekeeper for saving and loading. Maths is
plain functions with no database or network inside them, which is what makes
them testable and repeatable.

---

## 3. Database Architecture (Lovable Cloud / Postgres)

Tables (all in `public`, all with explicit GRANTs + RLS):

| Table | Purpose |
|---|---|
| `profiles` | one row per auth user (display name, created_at) |
| `properties` | identity of the property: name, address text, state, property type, tenure, built-up size, bedrooms, listing/asking price, listing URL |
| `property_financial_inputs` | purchase price, deposit %, loan rate, loan tenure, legal/stamp/valuation/renovation costs, expected monthly rent, vacancy assumption, all operating expense lines |
| `property_data_provenance` | per-field: field name, value source (verified/user/estimated/listing/missing), source note, retrieval date, confidence |
| `property_analysis_snapshots` | frozen copy of calculation + score results with the config version used, so an old report never silently changes |
| `scoring_config` | versioned thresholds and weights (see §7) |

**Rules applied:** every property row carries `user_id`; provenance is a separate
table so one property can have a different trust level per field; snapshots make
results reproducible.

**Plain English:** the property's facts, its money assumptions, and how much we
trust each fact are stored separately, so we can improve one without disturbing
the others.

---

## 4. Authentication Architecture

- Lovable Cloud auth, email + password for Phase 1 (Google can be added later).
- `_authenticated/` route subtree gate; unauthenticated visitors redirect to `/auth`.
- Enable RLS on every exposed table and scope owner policies to `authenticated`.
  Owner columns must be non-null and reference `auth.users`.
- For user-owned rows, SELECT/DELETE use `USING (auth.uid() = user_id)`;
  INSERT uses `WITH CHECK (auth.uid() = user_id)`; UPDATE uses both, so a user
  cannot read/change another owner's row or transfer their own row to that owner.
- Property child tables must check the referenced property's ownership in both
  `USING` and `WITH CHECK` as appropriate. A foreign key or client-supplied child
  `user_id` alone does not establish ownership of the parent property.
- Personal investment criteria and scenario configuration need the same owner
  protections. Property-specific configuration must also check parent ownership.
  Shared system defaults, if introduced, must not be writable by ordinary users.
- Server functions must verify the caller and query with that user's identity;
  never use a service-role client for ordinary user CRUD. Test the database
  directly as anonymous and two different authenticated users before enabling
  persistence. See `security-audit.md` for the required test matrix.
- Roles, if ever needed, go in a separate `user_roles` table with a
  `has_role()` security-definer function — never a column on `profiles`.

These are planned controls, not implemented policies. Policy command semantics
are documented in [Supabase's RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security).

**Plain English:** the database itself refuses to hand over another person's
property, even if the website code had a bug.

---

## 5. Financial Calculation Architecture (Engine A)

Location: `src/lib/finance/` — pure functions, zero React, zero database.

```text
acquisition.ts     total cash needed to acquire
loan.ts            monthly instalment, interest split
income.ts          effective gross income after vacancy
expenses.ts        total operating expenses
returns.ts         gross yield, net yield, NOI, cash flow, cash-on-cash,
                   break-even occupancy
scenarios.ts       Bear / Base / Bull by applying scenario adjustments
types.ts           input and result types
index.ts           runAnalysis(inputs, config) -> AnalysisResult
```

**Missing-input contract:** each function receives typed inputs where an unknown
is `null`. If a required input is `null`, the function returns
`{ status: "incomplete", missingFields: [...] }` instead of a number. Nothing is
defaulted to zero silently.

**Determinism:** no dates, no randomness, no network inside these functions.
Same inputs always give the same outputs.

---

## 6. Scoring Architecture (Engine B)

Location: `src/lib/scoring/` — separate folder from finance, imports finance
*results* only.

```text
metricScores.ts     score each metric against configured bands
investmentScore.ts  weighted total + category label
dataConfidence.ts   score based on provenance mix of the inputs used
riskFlags.ts        critical financial risk rules (e.g. negative cash flow,
                    break-even occupancy above threshold, over-leverage)
recommendation.ts   deterministic rule table -> recommendation text
```

Every score returns its reasoning: metric, raw value, band matched, points,
weight. AI is never involved in producing a number.

Low data confidence never inflates a score — it caps the recommendation
strength and is shown alongside it.

---

## 7. Configuration Architecture

Location: `src/config/` for defaults, `scoring_config` table for overrides.

- `finance-defaults.ts` — Malaysian defaults (stamp duty tiers, legal fee tiers,
  typical vacancy assumption) each labelled `Estimated` with a source note.
- `scoring-config.ts` — metric bands, weights, risk thresholds, scenario
  adjustment percentages, recommendation rule table.
- Every config object carries a `version`. Snapshots store the version used.

**Plain English:** thresholds live in one editable file, not buried in code, so
they can be tuned without touching formulas.

---

## 8. Testing Architecture

Vitest, colocated as `*.test.ts` next to each module.

- Unit tests per finance function with hand-worked Malaysian examples.
- Tests asserting that a `null` input yields `incomplete`, never `0`.
- Golden-file tests: a full property fixture -> expected full analysis output.
- Scoring tests: each band boundary, each risk flag, each recommendation branch.
- Rule: tests from earlier modules must keep passing before a new module lands.

---

## 9. Suggested Folder Structure

```text
src/
  config/            finance-defaults.ts, scoring-config.ts
  lib/
    finance/         Engine A (pure, tested)
    scoring/         Engine B (pure, tested)
    provenance/      status types + helpers
    properties.functions.ts   server functions
  components/
    property/        form steps, metric cards, scenario table,
                     score panel, risk list, status badge
    ui/              shadcn primitives
  routes/
    index.tsx
    auth.tsx
    _authenticated/
      properties/
        index.tsx  new.tsx  $id.tsx  $id.edit.tsx
docs/
  phase-1-architecture.md
```

---

## 10. Phase 1 Implementation Sequence

1. Design system + landing page shell.
2. Enable Lovable Cloud; auth + protected route gate.
3. Database migrations (tables, GRANTs, RLS) + provenance model.
4. Engine A finance modules **with tests** (no UI yet).
5. Manual property entry form + save/load via server functions.
6. Property dashboard showing Engine A results and data-status badges.
7. Scenario engine (Bear/Base/Bull) + scenario table UI.
8. Engine B: metric scores, investment score, data confidence.
9. Risk flags + deterministic recommendation.
10. Analysis snapshots + polish; declare Phase 1 stable.

Engine C (AI) starts only after you declare Phase 1 stable.

---

## Assumptions Made (safest interpretation)

1. Phase 1 auth is email + password only.
2. Malaysian stamp duty / legal fee defaults are labelled **Estimated** and are
   user-editable — they are not presented as verified facts.
3. No comparable/market data is stored in Phase 1; those fields will display
   **Missing / Not Verified**.
4. Currency is MYR throughout; no FX handling.
5. Scenario adjustments (rent, vacancy, expenses, interest) are configurable
   percentages, defaulting to conservative values, not fabricated market data.
