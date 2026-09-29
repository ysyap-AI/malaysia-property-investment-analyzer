# Phase 1 focused engine fixes

Date: 2026-09-28. Scope: confirmed findings F1–F7 from
`phase-1-focused-engine-audit.md`, under `PROJECT_RULES.md`.

| Finding | Result | Correction |
| --- | --- | --- |
| F1 | PASS | The property analysis hook requires acquisition status `complete`, matching the scenario contract. Partial subtotals never enter total-cost returns. Yield on Total Cost, net yield, cash-on-cash and dependent score categories become unavailable; recommendation becomes INSUFFICIENT DATA. |
| F2 | PASS | Recommendation requires finite Investment Score and Data Confidence in 0–100. Invalid inputs return INSUFFICIENT DATA; invalid configuration throws before rule evaluation. |
| F3 | PASS | Confidence assesses all 14 acquisition fields and all 14 operating fields, actual rent plus provenance, loan size plus interest and tenure, financing provenance, and bank valuation for the supported financed analysis. Omitted and null evidence are equivalent. Verified labels without actual values earn no verified credit. Future factors have no evaluator and remain unassessed. |
| F4 | PASS | The score returns its normalization policy and effective category weights/contributions. Available weights are renormalized under the default policy. Cumulative rounding reconciles two-decimal contributions to the overall score. The existing score panel shows those effective values. |
| F5 | PASS | Every rule is reported as TRIGGERED, CLEAR, UNCHECKED or explicitly DISABLED. Missing cost/financing records trigger missing-evidence rules; unavailable calculated evidence is UNCHECKED with a reason. `disabledRules` is a separate configuration choice. |
| F6 | PASS | Any required input query failure exposes an error/load state and discards cached inputs from current analysis. The hook returns INSUFFICIENT DATA and the score/risk displays show a load error. Successful retrieval restores normal analysis. |
| F7 | PASS | Runtime guards reject nonfinite metrics, invalid bands/weights/coverage/thresholds, overflowing totals and unsupported scoring categories/metrics. Coverage eligibility uses the unrounded value. BUY always requires the financial metrics used by its comparisons, even when configurable required metrics are empty. |

No Phase 2 functionality, AI functionality, financial formula changes, UI redesign,
commits, pushes or deployments were made. UI edits are limited to failure messages
and the effective scoring breakdown.

## Test results

Counts are executed cases, with repeated runs counted once.

| Suite | Total | Passed | Failed |
| --- | ---: | ---: | ---: |
| Investment Scoring, including focused audit | 33 | 33 | 0 |
| Data Confidence, including focused audit | 31 | 31 | 0 |
| Critical Red Flags, including focused audit | 31 | 31 | 0 |
| Recommendation, including focused audit | 19 | 19 | 0 |
| Four-engine hook integration, including new regressions | 26 | 26 | 0 |
| Additional engine validation/evidence/reconciliation regressions | 66 | 66 | 0 |
| All previous Phase 1 application tests | 497 | 497 | 0 |
| Database schema | 80 | 80 | 0 |
| Database ownership | 245 | 245 | 0 |
| Database constraints | 349 | 349 | 0 |
| Source, built-browser and Git security checks | 6 | 5 | 1 |
| **TOTAL** | **1,383** | **1,382** | **1** |

Vitest: **703 passed, 0 failed, 0 skipped**. All 46 original focused-audit
cases and their assertions were retained. Added 86 regression cases. Integration
tests use the real hook and engines with mocked query results, covering initial
failure, individual failed refetches with cached data, recovery, loading, and every
acquisition field omitted or null.

Older confidence fixtures described as complete supplied only four of fourteen
cost fields and omitted loan size. These now explicitly supply the required
evidence. Proportional-deduction assertions use the real fourteen-field denominator.
The older partial-bank-quote assertion now requires a missing-evidence deduction
because the requested contract prohibits verified credit for absent loan terms.
Older clean-risk fixtures now supply evidence for every enabled rule. No audit
test was removed, skipped or weakened.

Additional checks:

- TypeScript `tsc --noEmit`: PASS (repository application-source configuration).
- Production build: PASS, with existing dependency-directive, tsconfig-path plugin
  and chunk-size warnings.
- `git diff --check`: PASS, with line-ending notices.
- Database audit: local Docker only; all test transactions rolled back. Zero public
  tables and zero Auth users before/after. Docker startup was needed before rerunning.
- Source and freshly built browser credential scans: PASS.

## Remaining blocker

The sole failing test is the previously documented **R1**:
`no private environment files are already tracked`. `.env` remains in the Git index.
Its contents were not printed or changed. R1 is outside the requested F1–F7-only
implementation scope; the security test remains intact and failing.

Thus F1–F7 are resolved, but overall Phase 1 acceptance remains blocked by R1.

## Changed files

- `src/hooks/use-property-analysis.ts`: acquisition completeness and query failures.
- `src/lib/scoring/investment-score.ts`: runtime guards and effective contributions.
- `src/lib/scoring/data-confidence.ts`: evidence schema and configuration guards.
- `src/lib/risk/red-flags.ts`: validation and explicit rule outcomes.
- `src/config/red-flags.ts`: explicit optional disabled-rule configuration.
- `src/lib/recommendations/recommendation.ts`: score/configuration validation and mandatory BUY evidence.
- `src/components/property/ScoresPanel.tsx`: load error and effective breakdown.
- `src/routes/_authenticated/properties/$id.tsx`: risk load error.
- `tests/data-confidence.test.ts`, `tests/red-flags.test.ts`: corrected complete fixtures and schema-dependent assertions.
- `tests/property-analysis-focused-audit.test.ts`: retained original assertions, added integration regressions.
- `tests/engine-fixes-regressions.test.ts`: additional engine regressions.
- `docs/phase-1-engine-fixes-tests.json`: full Vitest results.
- `docs/phase-1-ownership-results.txt`: refreshed database audit output.
- This report. The database runner also rewrote `docs/phase-1-database-results.json`
  with results identical to the prior passing database run.

## Commands executed

```powershell
node node_modules/vitest/vitest.mjs run --reporter=json --outputFile=docs/phase-1-engine-fixes-tests.json
node node_modules/typescript/bin/tsc --noEmit
npm run build
node tests/run-phase1-database-audit.mjs
$env:SECURITY_AUDIT_BROWSER_ROOT = '.output/public'
node --test tests/security.test.mjs
git diff --check
```

**PHASE 1 BLOCKER STATUS: NOT RESOLVED**
