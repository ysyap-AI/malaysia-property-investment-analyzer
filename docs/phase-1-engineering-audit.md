# PHASE 1 ENGINEERING AUDIT

Audit date: 2026-09-24. Read and applied `PROJECT_RULES.md`.

**PHASE 1 ENGINEERING STATUS: FAIL**

The implemented financial modules pass their regression tests after correction.
However, Investment Scoring, Data Confidence, Critical Red Flags, and Recommendations
have no executable engines or test suites. Their absence prevents Phase 1 acceptance.
Implementing those engines would add functionality, so they were not created during
this audit. No Phase 2, dashboard, external research, or AI functionality was added.

This report covers the active working copy, not the older isolated audit worktrees.
Relevant fixes previously left in audit patches were inspected and applied here.
Existing scenario draft handling and its tests were preserved and extended.
No commits, pushes, published-history changes, or production deployment were made.

## Module results

PASS means the implemented module passed the described local checks; it is not a
claim of production deployment or complete browser end-to-end coverage.

| Module | Status | Finding and evidence |
| --- | --- | --- |
| Authentication | WARNING | Local anonymous/two-user database isolation and cache-transition tests pass. Cache clearing now handles account changes outside the sign-out button. Successful password login, email recovery, actual browser account switching, and live production policies were not exercised in this run. |
| Property Database | WARNING | Repository schema drift corrected; local migration, ownership, relationships, and numeric constraints pass. New migrations have not been applied to production. Legacy fields and stale generated TypeScript database types remain. |
| Acquisition Costs | PASS | Exact decimal summation, invalid/overflow rejection, genuine zero versus missing, partial status, and invalid-write rejection pass. Partial subtotals no longer feed scenario total-cost returns. |
| Operating Expenses | PASS | Monthly conversion, annual storage, missing/zero distinction, safe totals and write guards pass. Incomplete expenses no longer produce apparently complete scenario returns. |
| Financing | PASS | Independent loan fixtures, zero/tiny rates, missing inputs, bank override, percentage conversion, payment rounding, and failed-write handling pass. Current form fields and numeric bounds have a tested migration. |
| Financial Calculation Engine | PASS | Shared authoritative formulas cover rent, yields, NOI, cash flow, initial cash, cash-on-cash return and both break-even measures. Decimal boundary, invalid, zero, missing and overflow tests pass. |
| Scenario Engine | PASS | Bear/base/bull delegation, percentage-point interest adjustments, missing costs, invalid adjustments, input-load failures and frozen-input non-mutation checks pass. |
| Investment Scoring Engine | FAIL | Only `src/lib/scoring/README.md` describes a plan. No configurable band/weight implementation or score tests exist. |
| Data Confidence Engine | FAIL | No confidence calculation or confidence tests exist. Status badges are labels, not a confidence engine. |
| Critical Red Flags | FAIL | Planned `riskFlags.ts` is absent. There are no deterministic flag rules or flag tests. |
| Recommendation Engine | FAIL | Only `src/lib/recommendations/README.md` describes a plan. No deterministic rule table or recommendation tests exist. |

## Critical/high findings corrected

No confirmed critical-severity exploit was reproduced. The following high-severity
integrity/security defects were corrected in the working copy.

| ID | Problem and impact | Correction | Verification |
| --- | --- | --- | --- |
| H1 | Checked-in migrations used old property names and omitted current acquisition, annual expense and financing fields. A clean installation could not persist the current forms. Numeric validity depended substantially on frontend validation. | Added property/cost reconciliation and financing/integrity migrations. Preserve existing data and unknown values; reject invalid existing values instead of guessing replacements. Add database checks for negative/non-finite/oversized numbers, percentages, tenure and property numeric bounds. | 80 schema, 349 constraint and 245 ownership checks passed against local PostgreSQL with rollback. |
| H2 | Parsers removed arbitrary commas, so `1,5` became `15`; JavaScript numeric syntax and unsafe magnitudes could be saved as financial input. | Validate decimal notation and properly grouped separators in property, acquisition, expense and financing schemas. Preserve blanks as null. | Parser regression cases cover malformed, valid, missing, zero and oversized entries. |
| H3 | Finite inputs could overflow into successful Infinity/unsafe totals; invalid cost values could serialize as null on writes. Very small positive interest rates produced wrong or infinite payments. | Applied the reviewed shared decimal arithmetic and range guards, stable amortising denominator, safe payment selection and cost/financing write guards. Only absent LTV permits entered-loan fallback. | Financial engine, financing audit, write-boundary and integrity suites pass. Example: RM450,000 at 4% for 35 years remains RM1,992.49 monthly; tiny positive rates correctly approach RM1,071.43. |
| H4 | Scenario return calculations treated a known-cost subtotal as a complete expense/acquisition total, understating costs and overstating returns. Negative base amounts combined with adjustments below -100% could become positive. Input retrieval failures were displayed as missing data. | Only complete expense/acquisition totals feed dependent scenario returns. Reject invalid scaling; show a load error when input queries fail. | Unknown-expense tests withhold all seven affected metrics; confirmed zeros remain usable. UI test verifies partial acquisition passes null to all three scenario runs. Invalid scaling and failed-query tests pass. |
| H5 | Private query cache was cleared only by the sign-out button. Cross-tab logout or account changes could leave the prior user's data/forms visible. | Subscribe at the application root, clear private queries on identity changes, discard forms by navigation after an established identity changes. Guard the session-fetch/event race and failed session loading. | Four cache tests cover logout, account switch, same-user refresh and delayed old responses. Real browser/provider flows remain untested. |
| H6 | Duplicate `test` script keys meant the default test command silently omitted security tests. Financing update could report success after updating zero rows. | Run Vitest and security tests from one default command. Require a returned financing row on both insert and update, and propagate write errors. | Default command runs both suites. Two financing persistence-error regression cases pass. |

The tracked `.env` also caused the baseline security suite to fail. Removed it
from the Git index with permission while preserving the local file and published
history. Its variable names identify project URLs/IDs and public publishable keys;
this audit did not establish a private-key leak. No credential values are in this report.

## All requested audit checks

| # | Check | Result |
| ---: | --- | --- |
| 1 | Incorrect formulas | Loan stability, safe arithmetic and payment rounding corrected. Financial examples and boundary tests pass. |
| 2 | Duplicate financial formulas | No duplicate return/loan formulas found in active UI. Shared decimal arithmetic replaces repeated rounding implementations. |
| 3 | Formulas inside UI | Current property panels call finance/scenario functions. Input parsing and formatting remain in UI; no loan, return, expense-sum or yield formula was found there. |
| 4 | Missing silently converted to zero | Corrected partial-cost scenario consumption. Empty input remains null; confirmed zero remains distinct. Partial subtotals are still explicitly labelled in cost panels. |
| 5 | Percentage errors | LTV and interest use percent/100; scenario rate changes use percentage points. Tested 90% LTV and +2 points on 4% giving 6%. No active scoring percentages exist to audit. |
| 6 | Monthly/annual errors | Annual expense conversion and annual debt service are explicit engine operations. Bank payments round before annualisation. Round-trip tests prevent double annualisation. |
| 7 | Loan calculations | Normal, zero-rate, tiny-rate, missing-rate/tenure, invalid principal, invalid selection and bank-quote cases pass. |
| 8 | Scenario modifying base data | Frozen base inputs/configuration survive repeated runs in both orders. No database writes occur in the scenario engine. |
| 9 | Hard-coded scoring configuration | FAIL: scoring absent. Settings thresholds are explicitly labelled placeholders and do not affect results. Scenario defaults are in `src/config/scenarios.ts`. |
| 10 | Investment Score mixed with Confidence | No executable mixing found because neither engine exists. `investment_criteria.weight_data_confidence` is a future design risk; it must not become an investment-score weight. |
| 11 | AI in scoring/recommendations | No active AI calculation, scoring or recommendation path found. Missing deterministic engines are not counted as passing functionality. |
| 12 | User-data isolation | Database roles tested for anonymous and two owners, reads/writes/deletes, forged ownership, reassignment and upserts. Client cache isolation corrected. Production not reverified. |
| 13 | Missing database constraints | Current financial column/range gaps corrected and tested. Parent FKs, unique child rows, owner references and cascades retained. |
| 14 | Frontend-only security | Ownership is enforced by database RLS, including child ownership checks. Numeric constraints now also protect direct database/API writes after migration. |
| 15 | Missing error handling | Corrected failed scenario loads, session loading/races, reported sign-out errors, invalid financial writes and zero-row financing writes. Remaining UI/network coverage is listed below. |
| 16 | Missing test coverage | Added/recovered financial, financing, authentication, persistence, scenario and database tests. Four required engines and all their tests are absent. |
| 17 | Regression failures | Final runnable suites have zero failures. Missing-suite command fails with “No test files found”; lint fails. Build and TypeScript pass. |
| 18 | Unnecessary duplicated logic | Shared rounding fixed as part of arithmetic integrity. Repeated form parsing, data access and legacy columns remain lower-severity maintenance issues; no unrelated rewrite performed. |

## Tests and verification

Final counts are distinct executed test cases/database assertions, not the sum of
repeated runs. Build, lint, typecheck, cleanup queries and missing-suite attempts
are reported separately. Historical audit results are not included.

| Final suite | Passed | Failed |
| --- | ---: | ---: |
| Vitest application regressions, 14 files | 497 | 0 |
| Source, browser bundle and Git security | 6 | 0 |
| Property/cost schema compatibility and integrity | 80 | 0 |
| Full migration chain and anonymous/two-user ownership | 245 | 0 |
| Financial database constraints and financing field compatibility | 349 | 0 |
| **Total executed** | **1,177** | **0** |

Scoring, confidence, red-flag and recommendation suites: **0 runnable tests**.
The explicit four-suite attempt exited 1 with “No test files found.” This is
missing coverage/functionality, not four executed assertions.

The baseline had 144 passing application tests, 4 passing security tests,
1 failing security test (tracked `.env`) and 1 skipped bundle scan. The final
security run supplied `.output/public` and had no skips. No failing test was
removed. The original normal-case scenario fixture was corrected to explicitly
set unrelated expense lines to zero; omitted lines mean unknown under the rules.

Additional checks:

- Production build: PASS, with dependency/directive and chunk-size warnings.
- TypeScript `tsc --noEmit`: PASS.
- `git diff --check`: PASS.
- Lint: FAIL, 11,946 errors and 6 warnings at the recorded lint run: 11,937
  Prettier errors, 8 explicit-any errors and 1 prefer-const error. This includes
  extensive untouched UI/generated code and audit code; it is not a claim that
  all findings predate this audit. Broad formatting/refactoring was not performed.
- Local SQL tests roll back schema and fixture changes. Independent cleanup
  compares total Auth users before/after and checks no public application tables remain.
- Production migrations and live authentication/ownership were not exercised.

Evidence: `phase-1-baseline-tests.json`, `phase-1-tests.json`,
`phase-1-database-results.json`, and `phase-1-ownership-results.txt` in this folder.
Detailed lint output is in ignored `.phase1-audit.local/lint.json`.

Reproduce:

```powershell
npm run build
$env:SECURITY_AUDIT_BROWSER_ROOT = '.output/public'
npm test
npx tsc --noEmit
node tests/run-phase1-database-audit.mjs
```

The database runner targets only the named local Docker Supabase container,
requires an empty public schema and rolls changes back. It never deploys migrations.

## Untested critical functions and remaining risks

1. **Acceptance blockers:** investment score calculation/configuration, confidence
   aggregation, critical-risk detection and recommendation rules are unimplemented
   and untested. Future tests must cover boundaries, missing evidence, configurable
   rules, score/confidence separation, determinism and recommendation limits.
2. **Deployment:** the two new migrations are locally tested only. Production may
   contain incompatible values; migrations deliberately fail rather than silently
   rewrite them. Apply and verify through the project's deployment process.
3. **Authentication coverage:** successful password login, recovery email/password
   update, expired/revoked sessions, actual multi-tab interaction and the preview
   authentication broker were not exercised end to end. Database RLS tests do not
   establish those flows.
4. **Legacy data:** old aggregate/monthly financial fields and the old financing
   purchase-price/interest fields remain alongside canonical fields. Their meaning
   cannot safely be reallocated automatically. Existing populated legacy rows need
   an explicit reconciliation decision; current forms do not consume those fields.
5. **Validation/maintenance:** generated Supabase types are stale, APIs use `any`,
   and some property count/year form inputs allow fractions that PostgreSQL INTEGER
   rejects. Some database text/enumeration validation is weaker than form validation.
6. **Persistence/UI:** concurrent first saves can hit unique constraints. Full
   browser editing, successful HTTP persistence and all exceptional network paths
   lack automated coverage. The monthly-expense preview still has a separate parser;
   malformed values are rejected on save but preview validation can differ.
7. **Financial contracts:** the returns orchestrator accepts monthly and annual debt
   separately and assumes they agree; the current scenario caller derives both from
   Financing. Scenario adjustments use floating-point scaling before entering the
   decimal finance engine. Partial subtotals remain informational, not full totals.
8. **Quality gate:** repository lint is not clean. No numerical or test pass should
   be read as a lint pass or as certification of all production behavior.

## Files changed

- `package.json`: include security in the default tests; remove duplicate script key.
- `.env`: removed from tracking; local file preserved.
- `src/lib/finance/{acquisition,operating-expenses,financing,returns,rounding}.ts`:
  authoritative arithmetic, safe ranges and loan corrections.
- `src/lib/property/{property-fields,acquisition-fields,operating-expense-fields,financing-fields}.ts`:
  numeric parsing guards.
- `src/lib/property/{acquisition-api,operating-expenses-api,financing-api}.ts`:
  write guards and financing write error handling.
- `src/lib/scenarios/scenario-engine.ts`, `src/components/property/ScenariosPanel.tsx`:
  completeness, scaling and input-load handling.
- `src/lib/auth-isolation.ts`, `src/routes/__root.tsx`, `src/hooks/use-auth.ts`,
  `src/components/layout/AppShell.tsx`: account-transition isolation and auth errors.
- `supabase/migrations/20260921010000_reconcile_property_cost_columns.sql` and
  `20260924000000_phase1_financing_integrity.sql`: existing-form schema and constraints.
- Added tests: `authentication.test.ts`, `financial-engine-audit.test.ts`,
  `financial-input-integrity.test.ts`, `financial-write-boundary.test.ts`,
  `financing-audit.test.ts`, `phase1-regressions.test.ts`,
  `build-module-schema-audit.mjs`, `phase1-database.sql`, `run-phase1-database-audit.mjs`.
- Updated `tests/scenarios.test.ts` and the existing uncommitted
  `tests/scenario-panel.test.ts`; retained `tests/scenario-audit.test.ts` unchanged.
- This report and the four Phase 1 evidence files listed above.

**PHASE 1 ENGINEERING STATUS: FAIL**
