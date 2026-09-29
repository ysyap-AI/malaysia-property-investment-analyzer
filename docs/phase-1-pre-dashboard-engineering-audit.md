# PHASE 1 ENGINEERING AUDIT

Date: 2026-09-29. Scope: current working tree at HEAD `96f21bd4e47fed2a3a82b460f5e84214e971d5ef`, including changes already present before this audit. Read `PROJECT_RULES.md` and `AGENTS.md`. No Phase 2 functionality, new product features, schema deployment, commits, or history rewriting.

**Result: local Phase 1 engineering acceptance passes with the warnings below.** No confirmed critical or high-severity issue remains open in this audit. This is not certification of the deployed environment or exhaustive security coverage.

PASS means the reviewed implementation and relevant executed checks passed. WARNING means a documented validation gap or lower-severity technical risk remains. FAIL means an unresolved critical/high defect or a failing required executed check.

## Module results

| Module | Status | Evidence and limits |
| --- | --- | --- |
| Authentication | WARNING | Four cache-isolation tests pass, including identity changes and late responses. Protected routes call `getUser`; database ownership tests pass under actual anon/authenticated roles. Live password login, email confirmation/recovery, session expiry and preview storage are not end-to-end tested. |
| Property database | WARNING | Local migration/schema, numeric constraint, parent ownership, anonymous denial and cross-user CRUD assertions pass; cleanup verified. Current deployed schema was not queried. Generated database types remain stale and application APIs cast to untyped clients. |
| Acquisition costs | PASS | Centralized sum; explicit partial/missing/invalid results; partial subtotals excluded from return calculations. Fixed unsafe editing/saving after failed reads. |
| Operating expenses | PASS | Shared monthly-to-annual conversion; all stored expense fields annual; unknowns remain distinct from confirmed zeros. Fixed unsafe editing/saving after failed reads. |
| Financing | PASS | Independent amortization expectations, zero interest, missing terms, LTV conversion, separate bank override, debt service and invalid inputs pass. Fixed ignored acquisition-read failures and unsafe saves. |
| Financial calculation engine | PASS | Centralized returns and decimal rounding, negative cash flows, zero denominators, missing values, unsupported magnitudes and percentage/unit checks pass. No return or amortization formulas found in UI components. |
| Scenario engine | PASS | Uses the financial engine on copied inputs; tests cover base-data immutability, missing inputs, stress assumptions and bank-quote bypass when rates change. |
| Investment scoring engine | WARNING | Configured weights/bands, partial coverage and contribution reconciliation pass. Confidence is not an input. Validation does not enforce band ordering; current defaults are ordered correctly. |
| Data confidence engine | WARNING | Explicit evidence states, omitted/null equivalence, invalid inputs, completeness and future-factor exclusion pass. Confidence-band ordering is assumed rather than validated. |
| Critical red flags | PASS | Configured thresholds and explicit TRIGGERED/CLEAR/UNCHECKED/DISABLED states; tests cover missing/invalid evidence and boundary values. No unsupported location/legal evidence is fabricated. |
| Recommendation engine | PASS | Deterministic thresholds, required metrics, score/confidence validity, precedence and critical-risk blocking pass. Score and confidence remain separate decision inputs; no AI dependency. |

## High-severity fixes made in this audit

**P1-A01 — HIGH — Failed cost-record reads could lead to overwriting saved data. Fixed.**

Acquisition, operating-expense and financing panels continued to expose their editors after a failed initial query. Their local forms could therefore contain blanks. If the subsequent save-time read recovered, the API could find an existing row and update it with those blanks. Cached totals could also remain visible after failed refreshes.

The three panels now show an explicit loading/error state and withhold their editors and totals until the required reads succeed. Their mutation callbacks also reject saves while reads are loading or failed. A successful read returning no row still allows ordinary first-time entry; unknown fields retain their existing semantics.

**P1-A02 — HIGH — Financing ignored purchase-price query failures. Fixed.**

The financing panel read only `data` from the acquisition query. While that request was pending or failed, saving could calculate with an unavailable purchase price and persist null derived amounts, or use a stale cached price without disclosing the read failure. Financing now checks both acquisition and financing loading/error states before showing results or accepting a save.

Sixteen new regression tests use a real TanStack Query cache and render the actual panels. They cover failed reads with and without cached rows, pending reads, mutation rejection without API calls, and successful empty-record reads. The initial reproduction had 12 failing cases and four passing positive controls; the fixed suite passes all 16. These resolved reproduction failures are not failures in the final acceptance totals.

## Audit checklist

| Requested check | Finding |
| --- | --- |
| 1. Incorrect formulas | No new high/critical formula defect found. Independent fixed financial expectations and boundary suites pass. |
| 2. Duplicate financial formulas | Return, loan and expense calculations call shared finance functions. |
| 3. Financial formulas inside UI | None found for the reviewed financial metrics. UI percentage formatting is presentation. |
| 4. Missing converted silently to zero | Financial unknowns remain null/unavailable. Known-cost subtotals are labelled partial and excluded from complete return calculations. Explicit scoring policy `missing-as-zero` concerns score contributions, not financial inputs, and is disclosed. |
| 5. Percentage errors | LTV/rates use percentage points; scenario rate changes use percentage-point adjustments; yield/occupancy results are percentages. Covered by tests. |
| 6. Monthly/annual errors | Expense entry annualizes once; rent uses occupied months; annual debt service uses 12 rounded monthly payments. Covered by tests. |
| 7. Incorrect loans | Amortization uses stable `log1p`/`expm1`, with zero-interest and missing-input cases. RM450,000 at 4% for 35 years produces RM1,992.49 monthly and RM23,909.88 annually. |
| 8. Scenarios modifying base data | No database writes in the scenario engine. Frozen-input and scenario regression checks pass. |
| 9. Hard-coded scoring rules | Business thresholds/weights are in configuration files. Phase 1 metric allowlists and evaluator structure are intentionally code-defined. Band-order validation remains a warning. |
| 10. Score mixed with confidence | Separate engines, result fields and displays. Recommendations evaluate them separately. |
| 11. AI in deterministic decisions | No AI calls or AI-assigned scores/recommendations in reviewed engine paths. |
| 12. User-data isolation | RLS tested locally using two fixture identities and anon/authenticated roles; caches clear on identity changes. No confirmed isolation vulnerability found. |
| 13. Database constraints | Migrations enforce foreign keys, one child record per property, numeric ranges and relevant enumerations; local assertions pass. Deployment parity remains unverified. |
| 14. Frontend-only security | Ownership is enforced in PostgreSQL with RLS, independently of frontend filtering. |
| 15. Missing error handling | Fixed the high-severity financial read/save paths. Lower-severity unexpected-auth-rejection handling remains below. |
| 16. Missing test coverage | Added panel read/save regressions. Authentication integration gaps are explicitly listed below; no numerical coverage percentage is claimed. |
| 17. Regression failures | None in final run; TypeScript and build pass. |
| 18. Unnecessary duplicated logic | Scenario input assembly is repeated in the analysis hook and scenario panel. Some parsing/rounding helpers are duplicated. No unrelated consolidation performed. |

## Tests executed

Final acceptance totals count each final test/assertion once, excluding repeated baseline, reproduction and focused runs.

| Suite/check | Run | Passed | Failed |
| --- | ---: | ---: | ---: |
| Vitest: 31 files, all application suites | 942 | 942 | 0 |
| Source and rebuilt browser security tests | 6 | 6 | 0 |
| Local database migration/schema assertions | 80 | 80 | 0 |
| Local database ownership/security assertions | 245 | 245 | 0 |
| Local database constraint assertions | 349 | 349 | 0 |
| **Total tests and database assertions** | **1,622** | **1,622** | **0** |

There are **948 application/security test cases plus 674 SQL assertions**, with no final skipped/pending tests. TypeScript, production build and `git diff --check` also passed; these commands are not counted as test cases. Local database cleanup reported zero public tables and zero auth users, matching the initial zero users.

All requested named suites ran: authentication/security, financing, financial-engine, scenario, scoring, confidence, red-flag and recommendation tests. Their focused audits, regression suites, property fixtures and integration checks ran too.

Commands:

```text
npx --no-install vitest run --reporter=json --outputFile=docs/phase-1-pre-dashboard-tests.json
SECURITY_AUDIT_BROWSER_ROOT=.output/public node --test tests/security.test.mjs
node tests/run-phase1-database-audit.mjs
npx --no-install tsc --noEmit
npm run build
git diff --check
```

The security environment-variable notation above is shell-neutral documentation; PowerShell used `$env:SECURITY_AUDIT_BROWSER_ROOT`. The database runner initially failed inside the sandbox and passed on the approved elevated retry. It used the local Docker database and rolled back its temporary schema/fixtures; it did not deploy migrations. PowerShell logs may label npm's stderr notices as `NativeCommandError`; the TypeScript/build process exit codes were both zero, with no TypeScript diagnostics.

Evidence: [application results](phase-1-pre-dashboard-tests.json), [initial reproduction](phase-1-pre-dashboard-reproduction.json), [security output](phase-1-pre-dashboard-security.txt), [database results](phase-1-database-results.json), [ownership output](phase-1-ownership-results.txt), [TypeScript output](phase-1-pre-dashboard-typescript.txt), [build output](phase-1-pre-dashboard-build.txt).

## Untested critical functions and remaining risks

- **Live authentication integration is untested here:** `signInWithPassword`, `signUp` plus email confirmation, `resetPasswordForEmail`, password `updateUser`, actual token expiry/refresh and cross-tab browser behavior. Cache isolation and database role enforcement are tested, but are not substitutes for these flows.
- **No direct behavioral tests found for** the `useAuth` session/event race, generated `requireSupabaseAuth` token middleware, or `brokeredPreviewStorage` postMessage trust/timeout paths. The active property APIs use the external Supabase client and database RLS. These additional integration surfaces were inspected, not certified through execution.
- **Deployment parity:** current remote policies, constraints, auth redirect settings and deployed browser assets were not checked. Historical audit reports were not counted as fresh proof. The security scan covers this local build and known credential patterns, not all historical secrets or dependencies.
- **MEDIUM — configuration assumptions:** scoring and confidence band selection takes the first matching band. Finite but misordered custom bands can produce misleading classifications. Current committed defaults are correctly ordered. Confidence deductions are absolute points from 100, so custom weight edits require deliberate calibration. No configuration editor or other new feature was added.
- **MEDIUM — unexpected authentication exceptions:** login/signup/recovery/reset handlers handle returned Supabase errors but lack `try/finally` around unexpected promise rejection, which can leave their busy state set until reload. No authorization bypass was found; left unchanged under the critical/high-only fix policy.
- **LOW — maintenance:** stale generated database types and repeated scenario-input mapping reduce compile-time protection against future schema/wiring drift. Existing tests mitigate this; no unrelated refactor performed.
- **LOW — build warnings:** existing bundler notices about dependency module directives, bundle size and redundant tsconfig-path tooling remain. The production build exits successfully.

The named financial engines have normal/boundary/missing/zero/invalid-input tests. This review does not claim every branch or every possible numeric combination is covered. Full browser interaction, concurrent multi-tab edits and external-service fault injection were not exercised.

## Files changed by this audit

Application changes are limited to `src/components/property/AcquisitionCostsPanel.tsx`, `OperatingExpensesPanel.tsx` and `FinancingPanel.tsx`. Added `tests/cost-panel-read-safety.test.ts` and this report, plus the `phase-1-pre-dashboard-*` test/build/security evidence files. The existing database runner refreshed `docs/phase-1-database-results.json` and `docs/phase-1-ownership-results.txt`. Earlier working-tree source changes were retained and audited, not attributed to this pass.

PHASE 1 ENGINEERING STATUS: PASS
