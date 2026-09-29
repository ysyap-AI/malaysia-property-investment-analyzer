**FINAL PHASE 1 ENGINE ACCEPTANCE REPORT**

Verification date: 2026-09-28.

**Phase 1 engine acceptance passes. All prior findings F1-F7 are resolved in the independently verified scope.** All 17 requested runtime reproductions pass. No production functionality was changed during this verification.

Read `PROJECT_RULES.md`, `AGENTS.md` and `docs/phase-1-focused-engine-reaudit.md`. Independently inspected the executable engines, configuration, shared analysis hook, Scores panel and Risk panel. Did not read or rely on the fixing task's summary or recorded results. Executed the existing tests afresh and added a separate 21-case acceptance suite with explicit evidence fixtures and assertions against public engine outputs.

This acceptance applies to the current working tree based on HEAD `96f21bd4e47fed2a3a82b460f5e84214e971d5ef`, including the pre-existing uncommitted fixes and staged removal of `.env` from the Git index. It does not certify HEAD without those working-tree changes. Existing work was preserved; no commits, pushes, migrations to a deployed database or deployments were performed.

| Prior finding | Result | Independently verified evidence |
| --- | --- | --- |
| F1 acquisition completeness | RESOLVED | The shared hook supplies total acquisition cost only for a `complete` acquisition result. Omission of each of the 14 cost fields blocks BUY through the real query cache. Null/undefined cases withhold acquisition-dependent yield and cash-on-cash results. |
| F2 score/confidence validation | RESOLVED | Investment Score and Data Confidence independently reject nonfinite, out-of-range and wrong-type values with INSUFFICIENT DATA. Tests cover null, undefined, numeric strings, booleans, objects and arrays, plus valid 0/100 boundaries. |
| F3 confidence evidence completeness | RESOLVED | Explicit lists cover all 14 acquisition and 14 operating fields. Missing/null/omitted evidence is not silently complete. Financing requires valid loan size, rate and positive tenure; a bank-quote label cannot make absent or invalid terms Verified. |
| F4 contribution reconciliation | RESOLVED | Independent arithmetic checks all 64 subsets of six financial metrics under both normalization policies. Contributions summed in integer hundredths equal the rounded overall score. The mixed complete example is 5475 / 115 = 47.61. |
| F5 red-flag missing evidence reporting | RESOLVED | With all inputs null or omitted, all ten enabled default rules remain represented by missing-evidence flags or UNCHECKED results. Explicitly disabled rules remain distinct. Invalid occupancy does not clear its check; invalid financing triggers its evidence rule. |
| F6 query/refetch failure handling | RESOLVED | Initial errors and loading withhold current recommendations. Real TanStack Query cache tests separately fail property, acquisition, operating and financing refetches after a BUY result. Cached data remains, but the hook returns error/INSUFFICIENT DATA and rendered Scores show an alert without BUY. Successful recovery restores the result. Both display consumers check errors before showing analysis. |
| F7 runtime domain/configuration validation | RESOLVED | All prior 15 failing re-audit cases now pass. Public-engine tests confirm numeric domains, unavailable evidence labels, financing validation, signed adverse financial results and actual-boolean configuration switches. |

**Requested reproductions**

These cases are explicitly asserted in `tests/phase1-final-acceptance.test.ts` and supported by the existing re-audit and F7 suites. Each confidence probe begins with complete evidence scoring 100, changes one input and checks the affected factor becomes Invalid / Unavailable with a deduction. Rejection here means rejection as valid evidence, not necessarily an exception from the whole confidence calculation.

| Reproduction | Observed behavior | Result |
| --- | --- | --- |
| Negative rent (-1) | Invalid / Unavailable rent evidence; no Verified credit; confidence below 100. | PASS |
| Negative acquisition cost (-1 renovation) | Acquisition evidence is invalid and loses confidence credit. | PASS |
| Negative operating expense (-1 repair reserve) | Operating evidence is invalid and loses confidence credit. | PASS |
| Negative bank valuation (-1) | Invalid / Unavailable valuation evidence; loses confidence credit. Existing risk tests leave valuation comparison UNCHECKED. | PASS |
| LTV > 100 (101) | Invalid financing despite a valid alternative loan amount; no Verified financing source; financing risk triggers. | PASS |
| LTV < 0 (-1) | Invalid financing despite a valid alternative loan amount; no Verified financing source; financing risk triggers. | PASS |
| Negative loan amount (-1) | Invalid financing even with valid LTV; no Verified financing source; financing risk triggers. | PASS |
| Negative interest (-1) | Invalid financing; no Verified financing source; financing risk triggers. | PASS |
| Tenure 0 | Invalid financing; positive tenure is required; financing risk triggers. | PASS |
| Negative tenure (-1) | Invalid financing; no Verified financing source; financing risk triggers. | PASS |
| Negative break-even occupancy (-1) | Scoring category invalid with no raw score; risk UNCHECKED; recommendation INSUFFICIENT DATA. | PASS |
| Break-even occupancy > 100 (120) | Valid available metric with zero category points and a critical calculated risk. With the risk supplied, recommendation is REJECT. | PASS |
| Negative cash flow (-1000; Bear -2000) | Valid available metrics, zero category points at these values, negative-cash-flow risk triggers. Not treated as missing. | PASS |
| Negative return (net yield -2; cash-on-cash -5) | Both remain available metrics with zero category points; low-cash-on-cash risk triggers. Not treated as missing. | PASS |
| `enabled: "false"` | Both scoring and confidence engines throw a boolean-validation error. | PASS |
| `enabled: true` | Both engines accept it; the category/factor participates normally. | PASS |
| `enabled: false` | Both engines accept it; category disabled and confidence factor inactive. | PASS |

The existing F7 suite additionally probes every cost field, nonfinite values, incorrect numeric types, LTV endpoints 0/100, entered zero costs/rates/loan amounts and nonboolean switches in every category/factor.

The new verifier initially expected numeric REJECT at exactly 120% occupancy and exactly RM -1,000 cash flow without supplying red flags. Inspection of the actual configuration and documented strict comparisons proved those two test expectations incorrect: the numeric rejection rules are above 120 and below -1,000. The verifier's tests were corrected to assert NEGOTIATE at those exact isolated boundaries, REJECT below -1,000, and REJECT when the actual critical occupancy flag is supplied. No production code or existing test was changed to obtain these results.

**Other acceptance boundaries**

| Requirement | Result | Evidence |
| --- | --- | --- |
| Investment Score separate from Data Confidence | PASS | Changing rent evidence changes confidence without changing Investment Score, including through the real analysis hook. Injected confidence properties cannot affect scoring. Recommendations consume the two scores separately. |
| No active Phase 2 categories | PASS | Only six implemented financial categories are scored. Unsupported location/transport/amenities/market/legal scoring categories are rejected. All five future confidence factors remain inactive with zero weight/contribution even when enabled and relabelled Phase 1. |
| AI cannot change scoring or recommendations | PASS | The inspected engine and hook path contains no AI call or override. Injected AI score/recommendation fields do not change deterministic outputs; a REJECT remains REJECT. |
| Gross yield alone cannot produce BUY CANDIDATE | PASS | Gross yield alone produces INSUFFICIENT DATA even with an empty configured required-metric list and relaxed return thresholds. Net yield, cash flow, cash-on-cash and financed occupancy remain mandatory. |

**Executed checks**

| Check | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Existing Vitest regression suite, 27 files | 852 | 0 | 0 |
| New independent final acceptance suite, 1 file | 21 | 0 | 0 |
| Vitest total, 28 files | 873 | 0 | 0 |
| Security: source, fresh browser assets, Git/environment checks | 6 | 0 | 0 |
| Local database schema | 80 | 0 | 0 |
| Local database ownership/RLS | 245 | 0 | 0 |
| Local database constraints | 349 | 0 | 0 |
| **Total distinct test cases/checks** | **1,553** | **0** | **0** |

Counts are test cases, not individual assertions or matrix iterations. Repeated runs are not counted twice. The 852 existing tests include all 779 cases from the prior re-audit and 73 F7 validation cases. All 15 previously failing cases pass in this run.

- TypeScript `tsc --noEmit`: PASS, exit 0. The repository tsconfig covers application/configuration source; test files are executed by Vitest, not included in that compiler check.
- Production `npm run build`: PASS, exit 0. Nonblocking notices remain for the redundant tsconfig-path plugin, large chunks and an ignored bundler option.
- `git diff --check`: PASS. Git emitted line-ending notices, not whitespace errors.
- Database runner: PASS after Docker access was approved following sandbox denial. Its transactions rolled back; cleanup reports zero public tables and zero Auth users, with zero Auth users before the run.
- Security includes the new `.output/public` bundle with no skipped scan. The staged `.env` index removal passes the tracked-environment-file check; this does not remove historical Git content.

Verification limits: database checks exercise the existing local Docker database runner and migrations under rollback, not deployed production authentication. Query tests use the real cache and server-rendered React with the external database client stubbed; they cover settled failures and recovery, not a live browser/network session or intermediate retry timing. Security checks are the repository's regression scans plus local database ownership checks, not an exhaustive penetration test. Acceptance is limited to the requested Phase 1 engines and reproduced contracts.

**Artifacts and reproduction**

Created this report, `tests/phase1-final-acceptance.test.ts`, and the following fresh evidence files:

- `docs/phase-1-final-acceptance-tests.json`
- `docs/phase-1-final-acceptance-build.txt`
- `docs/phase-1-final-acceptance-typescript.txt` (empty on success)
- `docs/phase-1-final-acceptance-security.txt`
- `docs/phase-1-final-acceptance-database.txt`

The existing database runner refreshed `docs/phase-1-database-results.json` and `docs/phase-1-ownership-results.txt`. No production source, configuration, migration or pre-existing test was edited by this verification.

```powershell
node node_modules/vitest/vitest.mjs run --reporter=json --outputFile=docs/phase-1-final-acceptance-tests.json
node node_modules/typescript/bin/tsc --noEmit
npm run build
$env:SECURITY_AUDIT_BROWSER_ROOT = '.output/public'
node --test tests/security.test.mjs
node tests/run-phase1-database-audit.mjs
git diff --check
```

PHASE 1 BLOCKER STATUS: RESOLVED
