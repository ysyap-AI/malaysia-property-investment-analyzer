# Scenario Engine review

Reviewed 2026-09-24 after reading `PROJECT_RULES.md`.
Source revision: `be80377` (Implemented Phase 1 scenario engine), plus the local
correction and regression tests described below. The clean local `main` was
fast-forwarded from `ab241a0` to the published implementation. No history was
rewritten; audit changes remain uncommitted and were not pushed or deployed.

**Scenario review: PASS for all nine requested checks, after one UI correction.**

## Verification

| Check | Status | Evidence |
| --- | --- | --- |
| 1. No duplicate Bear/Base/Bull financial formulas | PASS | All three use the same `runScenario`. It adjusts inputs and delegates expense, financing and return calculations. The UI calls the acquisition engine for its input total. |
| 2. All scenarios call the authoritative financial engine | PASS | Tests spy on `calculateTotalAnnualOperatingExpenses`, `calculateFinancing` and `calculateReturns` for each scenario, check their inputs, and compare every return metric with direct engine calls. |
| 3. Assumptions isolated from formulas | PASS | Defaults are in `src/config/scenarios.ts`; transformations are in `adjustAssumptions`; financial formulas remain under `src/lib/finance`. |
| 4. Bear rent adjustment | PASS | Synthetic RM2,000 monthly rent becomes RM1,800 with the default -10%. |
| 5. Bull rent adjustment | PASS | Synthetic RM2,000 monthly rent becomes RM2,100 with the default +5%. |
| 6. Vacancy reflected in occupied months | PASS | Bear/Base/Bull use 9/11/11.5 occupied months for 3/1/0.5 months vacancy. Tests also cover zero vacancy, full-year vacancy, fractional months and out-of-range values. |
| 7. Interest adjustments in percentage points | PASS | 4% + 2 points becomes 6%; +0.5 becomes 4.5%; -0.5 becomes 3.5%; -4 becomes 0%. Changed rates bypass a bank instalment override and recalculate financing. Negative adjusted rates do not produce cash flow. |
| 8. Original property inputs preserved | PASS | Repeated runs in both scenario orders leave frozen base inputs, nested expense and financing inputs, and configuration unchanged. The panel has read queries and local assumption state, with no save calls. |
| 9. Existing Phase 1 financial tests | PASS | All 94 existing financial and financing tests pass. |

## Confirmed defect and correction

Clearing an assumption or entering nonnumeric text updated the visible input
but left the previous numeric setting in effect. The panel continued displaying
results based on an assumption that no longer matched the field.

`ScenariosPanel.tsx` now marks such fields invalid, explains the problem, and
withholds the affected scenario's metrics until valid input is supplied.
Other scenarios continue to display their results. No financial formulas or
scenario defaults were changed.

Five rendered-component regressions failed before the correction and pass
after it: empty input, whitespace, text, an unfinished minus sign, and Infinity.
An additional control verifies that valid default results still render.
These are component rendering tests with mocked query data and draft state,
not an authenticated browser or database integration test.

## Tests and checks executed

The root initially had no installed dependencies. Existing local dependencies
were reused through an ignored `node_modules` directory junction. No dependency
manifest or lockfile was modified. Vitest version: 5.0.1; Node: 24.18.0.

| Command / suite | Result |
| --- | --- |
| `npm test -- tests/acquisition-cost.test.ts tests/operating-expenses.test.ts tests/returns.test.ts tests/financing.test.ts` | PASS: 94 existing tests (85 financial, 9 financing) |
| Same suites plus `tests/scenarios.test.ts`, before audit edits | PASS: 108 tests, including 14 existing scenario tests |
| `npm test -- tests/scenario-panel.test.ts tests/scenario-audit.test.ts`, before correction | FAIL: 5 stale-result regressions; 21 tests passed |
| Same command, after correction | PASS: 26 tests |
| `npm test`, after correction | PASS: 144 tests in 8 files, including 40 scenario tests |
| `node node_modules/typescript/bin/tsc --noEmit` | PASS |
| `npm run build` | PASS with bundler warnings |
| `git diff --check` | PASS |
| `npm run test:security`, before changes | FAIL: 4 passed, 1 failed, 1 skipped; `.env` is already tracked |

## Remaining warnings

- **FAIL, pre-existing and outside this scenario correction:** the security
  suite rejects the tracked `.env` file. The source credential-pattern scan
  passed; the browser-asset scan was skipped because no browser root was
  supplied. No environment values were printed or changed.
- **WARNING:** the existing financial engine permits partial acquisition and
  operating-expense totals. Scenario results can therefore omit unknown costs;
  the panel explicitly warns about missing lines. Treat such results as
  provisional. This review does not certify them as complete cost estimates.
- **WARNING:** scenario edits are local to the page and reset on reload, as the
  UI states. They do not overwrite stored property inputs.
- **WARNING:** the build reports a large client bundle, redundant path-resolution
  tooling, and dependency module-directive warnings. It completed successfully.
- Earlier financial-audit fixes in separate audit worktrees were not merged by
  this review. Passing the tests in this checkout does not certify those
  separate changes or every possible financial edge case.

## Files changed

- `src/components/property/ScenariosPanel.tsx`: suppress stale results for invalid drafts.
- `tests/scenario-audit.test.ts`: 20 independent scenario checks.
- `tests/scenario-panel.test.ts`: 6 rendered-component regressions and controls.
- `docs/scenario-engine-audit.md`: this report.
