**PHASE 1 FOCUSED RE-AUDIT**

Audit date: 2026-09-28. Applied `PROJECT_RULES.md` and read
`docs/phase-1-focused-engine-audit.md`. Independently inspected the executable
engines, configurations, shared analysis hook and display consumers. Did not read
or rely on the fixing task's implementation summary or recorded test results.

**F1-F6 are resolved in the reproduced cases. F7 is not fully resolved.**
The original numeric/configuration reproductions now pass, but 15 additional
required-behaviour tests fail on invalid numeric evidence and configuration types.
Passing the old suite does not establish that all engine inputs are validated.

This report covers the working tree based on HEAD
`96f21bd4e47fed2a3a82b460f5e84214e971d5ef`, including the already-present,
uncommitted engine fixes and staged removal of `.env` from the Git index. It is
not an assertion about the committed revision alone. Existing work was preserved.
Scope remains Investment Scoring, Data Confidence, Critical Red Flags,
Recommendation and their shared wiring. Financial and database suites were
rerun for regression protection. No production functionality was changed.

| Finding | Assessment | Independently verified result |
| --- | --- | --- |
| F1: missing acquisition evidence | RESOLVED | The hook passes total acquisition cost only when acquisition status is `complete`. Every one of the 14 omitted cost fields blocks BUY through a real query cache. Existing null/undefined cases also pass. Cash-on-cash and other acquisition-dependent results remain unavailable. |
| F2: invalid score/confidence reaches BUY | RESOLVED | Each score independently rejects NaN, positive/negative Infinity, -0.01, 100.01, null, undefined, numeric strings, booleans, objects and arrays with INSUFFICIENT DATA. Existing 0/100 boundary and threshold tests pass. |
| F3: omitted/null required evidence | RESOLVED | Explicit acquisition/operating field lists replace key counting. Existing tests cover all 14 acquisition and 14 operating fields. New tests compare complete results for all seven top-level evidence omissions and four numeric financing-field omissions against null. Missing rent cannot retain Verified status. |
| F4: contribution reconciliation | RESOLVED | Independent hand-calculated expectations pass for all 64 subsets of six metrics under both policies. Contributions summed as integer hundredths equal the rounded overall score. The complete mixed-band result is 5475 / 115 = 47.61. The former partial-score reproduction now reconciles to 100. |
| F5: missing inputs silently remove risk checks | RESOLVED | With every input null or omitted, all ten enabled default rules remain in the report: five missing-evidence flags and five UNCHECKED results. Existing targeted omissions and explicit DISABLED-state tests pass. |
| F6: cached BUY after query/refetch failure | RESOLVED | A real TanStack Query cache first produces BUY, retains its data after a rejected refetch, then the actual hook returns error/INSUFFICIENT DATA. The rendered Scores panel displays an alert and contains no BUY. Reproduced separately for property, acquisition, operating and financing queries, including successful recovery. |
| F7: all relevant runtime validation | NOT RESOLVED | Nonfinite checks and the Phase 1 allowlist now work, but finite out-of-range evidence and nonboolean configuration switches are still accepted. Details below. |

F7 remaining defects are reproducible in
`tests/phase1-independent-reaudit.test.ts:113`. Tests assert required behaviour;
they are ordinary failing tests, not skipped cases or expected failures.

1. **Invalid evidence retains maximum Data Confidence (nine failures).**
   `src/lib/scoring/data-confidence.ts:10` defines known evidence as any finite
   number. `financingKnown` at line 28 and the evaluators consequently accept
   invalid domain values. Starting from complete verified evidence, changing
   just one value to any of the following still returns **100/100**: rent -1,
   renovation cost -1, annual maintenance -1, bank valuation -1, LTV 101,
   loan amount -1 with LTV null, interest -1, tenure 0, or tenure -1.
   These values must be rejected or treated as invalid/unavailable evidence,
   rather than receiving full confidence credit. In particular, invalid loan
   terms can retain a Verified financing label. This is an engine-boundary
   failure; it does not establish that the normal validated save forms accept
   these values or that they bypass every financial calculation guard.

2. **Invalid break-even occupancy is rewarded, and invalid financing clears
   risk checks (four failures).**
   `src/lib/scoring/investment-score.ts:115` rejects nonfinite successful metrics
   but does not reject a negative financed break-even percentage. Supplying
   `{status: "ok", value: -1}` scores the occupancy category as available with
   **100 category points**. At `src/lib/risk/red-flags.ts:169`, the same -1
   occupancy clears its risk check. At line 230, LTV **101** and **-1** both
   clear financing completeness when rate and tenure are otherwise supplied.
   Require domain validation before scoring or clearing the applicable rule.
   Occupancy above 100 can be a valid adverse result and must not be confused
   with impossible negative occupancy. Negative cash flow and negative returns
   likewise remain legitimate financial outcomes. The Recommendation Engine
   separately rejects negative occupancy, so this reproduction does **not**
   demonstrate a negative-occupancy BUY bypass.

3. **Configuration switches lack runtime type validation (two failures).**
   `validateScoringConfig` at `src/lib/scoring/investment-score.ts:62` and the
   confidence validator at `src/lib/scoring/data-confidence.ts:144` accept
   `enabled: "false"` supplied across the runtime configuration boundary.
   JavaScript treats the nonempty string as true, so the category/factor still
   participates. Require actual boolean switches and reject invalid types.
   These are deliberate malformed-configuration probes; the shipped defaults
   contain proper booleans. TypeScript annotations do not validate external
   runtime values.

The other requested boundaries hold in this re-audit:

- Only six implemented financial categories are scored. Injected location,
  transport, amenities, rental-market and legal categories are rejected. Future
  confidence factors remain unassessed with zero contribution even if enabled
  or relabelled as Phase 1. No Phase 2 functionality was introduced.
- Investment Score remains separate from Data Confidence. Changing evidence
  quality changes confidence without changing Investment Score. Extra
  confidence fields cannot influence the scoring function.
- These engines and their input wiring have no AI call or override path.
  Injected AI score/recommendation properties cannot change deterministic
  outcomes. A deterministic rejection remains REJECT.
- Gross yield alone returns INSUFFICIENT DATA, including with the configurable
  required-metric list emptied and minimum return thresholds relaxed. Net yield,
  cash flow, cash-on-cash and break-even values remain mandatory for BUY.

Executed results are below. Counts are test cases, not assertions or matrix
iterations. Baseline and repeated runs are not counted twice in the total.

| Suite/check | Cases | Passed | Failed |
| --- | ---: | ---: | ---: |
| Existing Phase 1 application regressions, 14 files | 497 | 497 | 0 |
| Existing four-engine unit suites | 74 | 74 | 0 |
| Existing focused audit suites, including added hook regressions | 66 | 66 | 0 |
| Existing fix regression suite | 66 | 66 | 0 |
| New independent engine re-audit | 58 | 43 | 15 |
| New independent query-cache/hook/render re-audit | 18 | 18 | 0 |
| **Vitest subtotal, 26 files** | **779** | **764** | **15** |
| Security: source, fresh browser build and Git/environment checks | 6 | 6 | 0 |
| Local database schema regressions | 80 | 80 | 0 |
| Local database ownership/RLS regressions | 245 | 245 | 0 |
| Local database constraint regressions | 349 | 349 | 0 |
| **Total** | **1,459** | **1,444** | **15** |

All **703 pre-existing Vitest cases pass**, both before and after the new tests.
Reviewed existing test changes: completeness fixtures now supply the explicit
required fields and loan size; changed deductions reflect the full field count;
Verified financing no longer credits missing terms. The original focused
reproductions were retained. No existing assertion was weakened by this audit.

Production build: **PASS**, exit 0. Remaining warnings concern the redundant
tsconfig-path plugin, large chunks, bundler options and dependency directives.
TypeScript `tsc --noEmit`: **PASS**, exit 0. The repository tsconfig covers
application/configuration source, not test files; Vitest executes the latter.
`git diff --check`: **PASS**, with line-ending notices. Vitest has zero skipped
cases; security has zero skipped cases, including the built-browser scan.

The earlier tracked-environment-file security failure is resolved in the
current Git index: `.env` is staged for removal and the security check passes.
No environment values were printed. This does not erase historical Git data.
Database tests used the existing local Docker runner after sandbox escalation,
rolled back all test changes, and left zero public tables and zero Auth users
(also zero before). This is not a fresh production/live authentication audit.
Query tests use the real cache and server-rendered React output with a stubbed
external database client; they verify settled fetch failures, not a live
browser/network session or intermediate retry timing.

Created two test files named above and this report. Evidence artifacts:

- `docs/phase-1-focused-reaudit-baseline-tests.json`: the 703-case starting run.
- `docs/phase-1-independent-reaudit-tests.json`: the 76 new cases alone.
- `docs/phase-1-focused-reaudit-tests.json`: final combined 779-case run.
- `docs/phase-1-focused-reaudit-build.txt`: production build output.
- `docs/phase-1-focused-reaudit-typescript.txt`: compiler output (empty on success).
- `docs/phase-1-focused-reaudit-security.txt`: six passing security checks.
- `docs/phase-1-focused-reaudit-database.txt`: database totals and cleanup.

The existing database runner also refreshed `docs/phase-1-database-results.json`
and `docs/phase-1-ownership-results.txt`. No source fixes, migrations, commits,
pushes or deployments were made. The 15 failures remain available for correction
and a subsequent verification run.

Reproduce from the repository root:

```powershell
node node_modules/vitest/vitest.mjs run tests/phase1-independent-reaudit.test.ts tests/phase1-independent-query-reaudit.test.ts
node node_modules/vitest/vitest.mjs run --reporter=json --outputFile=docs/phase-1-focused-reaudit-tests.json
npm run build
$env:SECURITY_AUDIT_BROWSER_ROOT = '.output/public'
node --test tests/security.test.mjs
node node_modules/typescript/bin/tsc --noEmit
node tests/run-phase1-database-audit.mjs
git diff --check
```

Vitest intentionally exits 1 while the documented F7 defects remain. Build,
TypeScript, security and database checks exit 0.

PHASE 1 BLOCKER STATUS:
NOT RESOLVED
