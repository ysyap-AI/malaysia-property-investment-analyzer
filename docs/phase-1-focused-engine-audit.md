# Focused Phase 1 engine audit

Audit date: 2026-09-25. Applied `PROJECT_RULES.md`.

**PHASE 1 BLOCKER STATUS: NOT RESOLVED**

All four previously absent engines now exist and execute. However, missing
acquisition evidence can still produce BUY CANDIDATE through the actual analysis
hook. Additional tests reproduce confidence, missing-rule reporting and numeric
validation defects. Engine existence is resolved; acceptance of their behavior is not.

Scope: Investment Scoring, Data Confidence, Critical Red Flags, Recommendation,
and their shared input wiring. Prior Phase 1 tests were rerun as regressions only.
No Phase 2 functionality, financial-engine changes or UI redesign was performed.

## Revision and audit method

The initial local HEAD was `be80377`, which still contained only placeholder
READMEs. Fetched and fast-forwarded to `75de594` from `origin/main` after approval
for Git metadata access. Preserved the existing uncommitted Phase 1 fixes.
This report covers that combined working copy, not the remote commit alone.

Read the four engines, their default configurations, their existing tests,
`use-property-analysis.ts`, and the display consumers. Ran the 74 existing engine
tests first: all passed. Added 46 focused audit cases to probe contracts that those
tests did not cover. The added tests assert required behavior; failures are retained
as reproducible findings, not changed into expected failures or skipped.

## Test results

Counts are executed test cases, not assertions within a case. Existing engine tests
and added audit tests are combined per module. No repeated run is counted twice.
WARNING describes limitations/findings and is not an additional test count.

| MODULE | TEST COUNT | PASS | FAIL | WARNING |
| --- | ---: | ---: | ---: | --- |
| Investment Scoring Engine | 33 | 23 | 10 | Partial contribution breakdown; numeric/configuration guards |
| Data Confidence Engine | 31 | 22 | 9 | Omitted evidence counted as complete; invalid/future configuration |
| Critical Red Flags Engine | 31 | 26 | 5 | Omitted rule inputs disappear from report; invalid threshold |
| Recommendation Engine | 19 | 14 | 5 | NaN score/confidence allows BUY; configurable evidence bypass |
| Four-engine integration | 6 | 3 | 3 | Missing acquisition cost and failed input retrieval still allow BUY |
| All prior Phase 1 application tests, 14 files | 497 | 497 | 0 | Local regression coverage; not a live browser audit |
| Prior source/browser/Git security tests | 6 | 5 | 1 | `.env` currently tracked in Git index |
| Prior database schema tests | 80 | 80 | 0 | Local rollback test only |
| Prior database ownership tests | 245 | 245 | 0 | Local rollback test only |
| Prior database constraint tests | 349 | 349 | 0 | Local rollback test only |
| **TOTAL** | **1,297** | **1,264** | **33** | **32 focused failures plus 1 security regression** |

Vitest totals: 617 cases, 585 passed, 32 failed, zero skipped. All 571 pre-existing
application/engine cases passed; 14 of the 46 new audit cases passed.

Additional checks:

- Production build: PASS; dependency directive, tsconfig-path plugin and chunk-size warnings.
- TypeScript `tsc --noEmit`: PASS. The repository tsconfig checks application source,
  not test files; Vitest executed the test files.
- `git diff --check`: PASS, with line-ending notices.
- Database cleanup: zero public tables, zero Auth users before and after.
- Lint and live production/browser authentication checks were outside this focused rerun.

## Confirmed findings

### F1 — High: missing acquisition cost still permits BUY CANDIDATE

`src/hooks/use-property-analysis.ts:39` passes the acquisition calculator's `total`
into both scenarios without requiring `status === "complete"`. A partial result
is a subtotal of known costs, not a complete investment cost.

Reproduction uses real engines through the real hook, with mocked database query
results: RM500,000 purchase, RM6,000 monthly verified rent, 80% LTV, 4% interest,
35 years, and other costs explicitly zero. Changing only renovation cost to null
still produces 100 cash-on-cash category points and BUY CANDIDATE. Confidence is
98.93, so its small completeness deduction does not prevent the result. The default
required acquisition risk fields omit renovation cost.

Impact: invested cash is understated and missing evidence can improve the apparent
investment. Required correction: withhold acquisition-dependent returns until all
costs are known, propagate unavailable results into scoring and recommendation.
This is the same completeness contract already enforced by the existing scenario
panel; the new analysis hook bypasses it.

Tests: two failing integration cases in `property-analysis-focused-audit.test.ts`.

### F2 — High: invalid score/confidence can produce BUY CANDIDATE

`src/lib/recommendations/recommendation.ts:82` checks score only for null, and line
83 checks confidence only for null or a low value. NaN comparisons are false.
Supplying NaN investment score or NaN confidence with otherwise good financials
therefore reaches BUY CANDIDATE.

Required correction: require finite scores in 0–100 before evaluating investment
rules; invalid/unavailable evidence must not reach BUY. Invalid recommendation
thresholds also need validation. Two input tests and two configuration tests fail.
The input loops stop at their first failed assertion (NaN); their later values
are not counted as independently verified outcomes.

### F3 — High: confidence completeness depends on supplied keys, not required evidence

`src/lib/scoring/data-confidence.ts:79` counts `Object.keys(rec)`. Empty acquisition
or expense objects receive no completeness deduction. Removing a renovation key
gives 100 confidence while explicitly setting it null gives 98.93 on the same full
fixture. At line 87, omitting both loan-size properties explicitly counts loan size
as known. The rent factor at line 63 retains Verified status even with missing rent.

Required correction: assess an explicit Phase 1 field set, treat omitted and null
values consistently, and reconcile provenance labels with actual value availability.
The hook fills cost keys with nulls and supplies loan-size keys, so some of these
direct-engine omissions are prevented by that caller today; the exported engine
contract and its existing test fixtures still permit them. Five audit cases fail.

### F4 — Medium: partial score breakdown does not reconcile to overall score

`src/lib/scoring/investment-score.ts:115` calculates category weights/contributions
using all enabled weight; line 145 calculates the default partial overall score
using only available weight. With cash-on-cash unavailable and all other categories
at their top bands, the overall is 100 while displayed contribution data sums to
82.61. This is not an error in the overall weighted-average formula; it is a mismatch
between that formula and its returned explanation data.

Required correction: report effective contributions for the selected normalisation
policy, or explicitly distinguish base-weight contributions from effective ones.
One audit case fails. The ordinary mixed-band hand calculation passes: 5475/115 = 47.61.

### F5 — Medium: omitted risk inputs silently remove checks

`src/lib/risk/red-flags.ts:184`, `:205` and `:225` silently skip acquisition,
operating-cost, financing and cash-on-cash checks for undefined inputs. The report
has neither a flag nor an `unchecked` entry for those omitted inputs. This is a
documented skip convention, but it fails this audit's requirement to handle/report
missing values explicitly. Null handling and nonfinite calculated-value handling pass.

Required correction: represent omitted inputs as missing or unchecked, and make
intentional rule disabling a separate configuration choice. Four audit cases fail.
The current hook normally supplies these fields, so this is primarily an engine
contract/reporting defect.

### F6 — High: failed retrieval with cached inputs still produces a current BUY result

`src/hooks/use-property-analysis.ts:121` checks loading but ignores query errors.
When a refetch fails while prior data remains cached, the hook returns BUY CANDIDATE
without an error state for the display consumer. One integration test reproduces it.

Required correction: expose input-load failure and withhold a current recommendation
or explicitly identify the result as stale. A layout redesign is unnecessary.

### F7 — Configuration/invalid-input guards are incomplete

These cases use direct engine calls or altered configurations; they are not claims
that the shipped default UI already supplies these values:

- Scoring accepts successful metrics containing NaN/Infinity as available. NaN
  points/thresholds/coverage and overflowed total weight are not rejected. Coverage
  is rounded before its eligibility comparison, so 0.5999999 meets a 0.6 minimum.
- Confidence has no weight validation: negative weights can produce scores above
  100 and nonfinite weights can produce NaN. Enabling the future legal factor
  credits its full 20-point contribution without legal evidence or an evaluator.
- Scoring has no runtime metric/group allowlist. An externally supplied location
  metric can be scored despite lacking a Phase 1 implementation. Its TypeScript
  type and shipped defaults exclude it; the audit deliberately crosses that boundary.
- A NaN negative-cash-flow threshold is accepted and fabricates that flag for
  positive cash flow instead of rejecting the configuration.
- Empty recommendation required-metric configuration plus zero minimum net yield
  and cash-on-cash thresholds lets null financial results pass JavaScript comparisons.
  A gross-yield-only fixture then returns BUY CANDIDATE. Default configuration
  correctly returns INSUFFICIENT DATA for gross-yield-only input.

Required correction: validate numeric ranges and finite totals, enforce supported
Phase 1 categories, reject or ignore unavailable future factors, and require finite
financials used in BUY comparisons regardless of the configurable required list.

### R1 — Separate prior-suite regression: tracked environment file

The security suite passes source and freshly built browser credential scans but
fails its tracked-environment-file check because `.env` is in the current Git index.
No credential values were printed. The focused audit did not change its tracking
state or contents. This remains outside the four-engine implementation findings.

## Requested criteria assessment

| Engine | Verified | Failed or qualified |
| --- | --- | --- |
| Investment Scoring | Executable pure engine; configurable weights/bands; deterministic; no AI; missing results remain null by default; explicit missing-as-zero policy; shipped categories use Phase 1 finance only; overall ordinary arithmetic correct | F1 input integration, F4 breakdown, F7 numeric/configuration guards |
| Data Confidence | Executable pure engine; default valid-input scores in 0–100; evidence quality/completeness deductions; distinct verified/estimated/listing/missing rent; independent of Investment Score; deterministic | F3 evidence omissions; F7 range and future-factor configuration |
| Critical Red Flags | Ten deterministic Phase 1 rules; configurable thresholds/severities; explicit null/invalid calculated evidence; no shipped legal/location/market-risk fabrication | F5 omitted inputs; F7 invalid threshold |
| Recommendation | Exactly BUY CANDIDATE, NEGOTIATE, WATCHLIST, REJECT, INSUFFICIENT DATA; deterministic; no AI override path; consumes finance/score/confidence/flags; default low-confidence/missing gates and gross-yield-only guard pass | F1/F6 real integration; F2 invalid scores; F7 configurable evidence bypass |

The shipped default confidence configuration lists future factors only as disabled
and unassessed; it does not claim legal/location/market verification. Score fit bands
(`strong`, `moderate`, `weak`, `poor`) are financial-fit descriptors, separate from
the Recommendation Engine's five allowed decision outputs.

## Artifacts and reproduction

New files from this audit:

- `tests/scoring-focused-audit.test.ts`
- `tests/confidence-focused-audit.test.ts`
- `tests/red-flags-focused-audit.test.ts`
- `tests/recommendation-focused-audit.test.ts`
- `tests/property-analysis-focused-audit.test.ts`
- `docs/phase-1-focused-baseline-tests.json`
- `docs/phase-1-focused-tests.json`
- This report.

The existing local database runner refreshed `docs/phase-1-database-results.json`
and `docs/phase-1-ownership-results.txt`. It rolls back all database test changes.
The earlier full audit report and unrelated working modules were not edited.
No implementation fixes, commits, pushes or deployments were made by this audit.

```powershell
node node_modules/vitest/vitest.mjs run --reporter=json --outputFile=docs/phase-1-focused-tests.json
npm run build
$env:SECURITY_AUDIT_BROWSER_ROOT = '.output/public'
node --test tests/security.test.mjs
node node_modules/typescript/bin/tsc --noEmit
node tests/run-phase1-database-audit.mjs
```

The Vitest and security commands intentionally currently exit nonzero because the
documented defects remain unresolved. Passing prior tests and successful compilation
do not override the focused audit failures.

**PHASE 1 BLOCKER STATUS: NOT RESOLVED**
