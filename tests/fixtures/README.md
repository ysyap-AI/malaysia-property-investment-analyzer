# Phase 1 property fixtures

These are synthetic development inputs, not real properties, market evidence,
or database seeds. All money is MYR. Rent and instalments are monthly; operating
expenses are annual. Verification labels simulate supported Phase 1 input states.
Acquisition fees are fixed test amounts, not statutory fee estimates.

```ts
import { createPropertyFixture, createPropertyFixtures } from "./phase1-properties";
import { analyzePropertyFixture } from "./analyze-phase1-property";

const property = createPropertyFixture("P07");
const result = analyzePropertyFixture(property);
const allProperties = createPropertyFixtures();
```

Factories return fresh nested objects, so a test can modify a fixture without
affecting another test. Missing numbers remain `null`; explicit zero costs mean
known zero. The test-only analysis adapter calls the real engines and default
scoring, confidence, risk and recommendation configurations; it has no formulas
or precomputed engine outputs. Expected results live separately in tests.

| ID | Scenario and supported evidence | Expected recommendation |
| --- | --- | --- |
| P01 | Strong yield, complete financial inputs, positive base/bear cash flow | BUY CANDIDATE |
| P02 | Rent reduced to RM 1,500; negative cash flow and excessive financed break-even occupancy | REJECT |
| P03 | Assumed vacancy: base 8, bear 9, bull 7 months; lower effective rent | NEGOTIATE |
| P04 | Annual maintenance RM 24,000; poor score and excessive financed break-even occupancy | REJECT |
| P05 | Bank valuation RM 240,000 vs target price RM 300,000 | NEGOTIATE |
| P06 | Monthly rent and rent evidence missing | INSUFFICIENT DATA |
| P07 | Annual maintenance unknown, not zero | INSUFFICIENT DATA |
| P08 | Legal-risk placeholder only; same financial inputs as P01 | BUY CANDIDATE, Phase 1 financial checks only |
| P09 | Weak-location placeholder only; same financial inputs as P01 | BUY CANDIDATE, Phase 1 financial checks only |
| P10 | P01 financial numbers, but rent evidence and valuation absent and bank quote unverified; confidence 55 | WATCHLIST |

All future modules are explicitly `unavailable`, `placeholderOnly: true`, with
`evidence: null`. P08/P09 do not assert adverse findings or clearance. Their names
and placeholder metadata must not affect scores, confidence, flags or decisions.
BUY CANDIDATE still requires further due diligence; it is not legal or location
approval. P05 tests a bank-valuation shortfall, not market overpricing inferred
from nonexistent transaction comparables. P03 supplies hypothetical vacancy
assumptions, not observed rental-market weakness. P04 does not imply defects.

P03 custom vacancy settings run through the existing scenario engine. The
existing Scores/Risk analysis hook uses default scenarios, so the integration
test deliberately checks that existing behavior for P03 separately. No new
scenario persistence, hook behavior, application fixtures, or UI is introduced.

The engine suite checks fixed financial expectations, scenario ordering and
stress inputs, score changes, confidence independence, exact critical-flag sets,
missing-data propagation, recommendations, and inactive future modules. The
integration suite feeds fixture rows into the actual analysis hook with only
query responses mocked. Neither suite needs a network connection or database.

```text
npx --no-install vitest run tests/phase1-property-fixtures.test.ts tests/phase1-property-fixtures-integration.test.ts
npx --no-install tsc -p tests/fixtures/tsconfig.json
npm test
```

`npm test` runs every Vitest suite and the security tests. Live Supabase audits
are separate environment-dependent scripts documented in `tests/README.md`.
