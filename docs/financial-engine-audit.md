# Independent Phase 1 Financial Engine Audit

Read `PROJECT_RULES.md`. Audited revision
`f4f8e0a241fbf668ce02d41a19b096580961a177` (Built Phase 1 calc engine).
Audit date: 2026-09-24. All amounts in this report are synthetic RM test
fixtures; they are not market evidence or financial advice.

**FINANCIAL ENGINE STATUS: PASS after corrections, for the audited local engine.**

The root checkout is still the older `51a6c55` application shell. Corrections
are local and uncommitted in `.security-audit.local/financial-engine-audit`,
branch `audit/financial-engine`. Existing root edits and prior audit worktrees
were preserved. Nothing was merged, pushed or deployed. The accompanying
`financial-engine.patch` contains the production and test changes against the
audited revision. No scenario, scoring or UI functionality was implemented.

The three subtraction definitions in the request are interpreted as:
NOI = effective annual rent minus annual operating expenses;
monthly cash flow = NOI / 12 minus monthly instalment;
annual cash flow = NOI minus annual debt service.

## Formula evidence

All implementation functions below are in `src/lib/finance/returns.ts`.
Inputs appear in each function's argument order. `incomplete` means a null
value with named missing inputs; `invalid` means a null value with a reason.
Percentages are percentage points: `6` means **6%**, not 0.06%.
Each formula has normal, boundary and missing-data rows. The automated suite
additionally tests **every argument** independently as null and undefined,
negative inputs where disallowed, non-finite values, wrong runtime types and
oversized values. The full 66-row machine-readable matrix is in
`financial-engine-results.json`.

| FORMULA | IMPLEMENTATION FUNCTION | INPUT | EXPECTED RESULT | ACTUAL RESULT | PASS/FAIL |
| --- | --- | --- | --- | --- | --- |
| Potential Annual Rent (normal) | `potentialAnnualRent` | `[2500]` | 30000 | 30000 | PASS |
| Potential Annual Rent (boundary) | `potentialAnnualRent` | `[0]` | 0 | 0 | PASS |
| Potential Annual Rent (missing) | `potentialAnnualRent` | `[null]` | incomplete | incomplete | PASS |
| Effective Annual Rent (normal) | `effectiveAnnualRent` | `[2500,11]` | 27500 | 27500 | PASS |
| Effective Annual Rent (boundary) | `effectiveAnnualRent` | `[2500,0]` | 0 | 0 | PASS |
| Effective Annual Rent (missing) | `effectiveAnnualRent` | `[null,11]` | incomplete | incomplete | PASS |
| Gross Rental Yield (%) (normal) | `grossRentalYield` | `[30000,500000]` | 6 | 6 | PASS |
| Gross Rental Yield (%) (boundary) | `grossRentalYield` | `[30000,0]` | invalid | invalid | PASS |
| Gross Rental Yield (%) (missing) | `grossRentalYield` | `[null,500000]` | incomplete | incomplete | PASS |
| Yield on Total Cost (%) (normal) | `yieldOnTotalCost` | `[30000,550000]` | 5.45 | 5.45 | PASS |
| Yield on Total Cost (%) (boundary) | `yieldOnTotalCost` | `[30000,0]` | invalid | invalid | PASS |
| Yield on Total Cost (%) (missing) | `yieldOnTotalCost` | `[null,550000]` | incomplete | incomplete | PASS |
| Net Operating Income (normal) | `netOperatingIncome` | `[27500,6000]` | 21500 | 21500 | PASS |
| Net Operating Income (boundary) | `netOperatingIncome` | `[0,6000]` | -6000 | -6000 | PASS |
| Net Operating Income (missing) | `netOperatingIncome` | `[null,6000]` | incomplete | incomplete | PASS |
| Net Rental Yield (%) (normal) | `netRentalYield` | `[21500,550000]` | 3.91 | 3.91 | PASS |
| Net Rental Yield (%) (boundary) | `netRentalYield` | `[-5500,550000]` | -1 | -1 | PASS |
| Net Rental Yield (%) (missing) | `netRentalYield` | `[null,550000]` | incomplete | incomplete | PASS |
| Monthly Cash Flow (normal) | `monthlyCashFlow` | `[21500,1500]` | 291.67 | 291.67 | PASS |
| Monthly Cash Flow (boundary) | `monthlyCashFlow` | `[0,1500]` | -1500 | -1500 | PASS |
| Monthly Cash Flow (missing) | `monthlyCashFlow` | `[null,1500]` | incomplete | incomplete | PASS |
| Annual Cash Flow (normal) | `annualCashFlow` | `[21500,18000]` | 3500 | 3500 | PASS |
| Annual Cash Flow (boundary) | `annualCashFlow` | `[0,18000]` | -18000 | -18000 | PASS |
| Annual Cash Flow (missing) | `annualCashFlow` | `[null,18000]` | incomplete | incomplete | PASS |
| Cash-on-Cash Return (%) (normal) | `cashOnCashReturn` | `[3500,100000]` | 3.5 | 3.5 | PASS |
| Cash-on-Cash Return (%) (boundary) | `cashOnCashReturn` | `[3500,0]` | invalid | invalid | PASS |
| Cash-on-Cash Return (%) (missing) | `cashOnCashReturn` | `[null,100000]` | incomplete | incomplete | PASS |
| Property-Level Break-Even Occupancy (%) (normal) | `propertyBreakEvenOccupancy` | `[6000,30000]` | 20 | 20 | PASS |
| Property-Level Break-Even Occupancy (%) (boundary) | `propertyBreakEvenOccupancy` | `[36000,30000]` | 120 | 120 | PASS |
| Property-Level Break-Even Occupancy (%) (missing) | `propertyBreakEvenOccupancy` | `[null,30000]` | incomplete | incomplete | PASS |
| Financed Break-Even Occupancy (%) (normal) | `financedBreakEvenOccupancy` | `[6000,18000,30000]` | 80 | 80 | PASS |
| Financed Break-Even Occupancy (%) (boundary) | `financedBreakEvenOccupancy` | `[6000,30000,30000]` | 120 | 120 | PASS |
| Financed Break-Even Occupancy (%) (missing) | `financedBreakEvenOccupancy` | `[null,18000,30000]` | incomplete | incomplete | PASS |

Normal fixtures describe rent of RM2,500/month, 11 occupied months, purchase
price RM500,000, fully known acquisition cost RM550,000, fully known operating
expenses RM6,000/year, monthly payment RM1,500, debt service RM18,000/year and
initial cash RM100,000. Initial cash is independently verified as RM50,000 down
payment plus RM50,000 acquisition costs beyond the purchase price.

## Discrepancies and minimum corrections

| Finding | Before | Correction and regression evidence |
| --- | --- | --- |
| Decimal and negative rounding | `round2(10.075)` = 10.07; `round2(-10.075)` = -10.07. A RM0.43 rent times 10.5 months gives 4.51 instead of 4.52. Initial cash 1.005 + 2.01 gives 3.01 instead of 3.02. | Shared exact decimal arithmetic for addition, subtraction, multiplication and division; round each resulting metric to two decimals, ties away from zero. Acquisition/expense totals use the same policy. Literal cases and 3,000 integer-reference boundary comparisons pass. |
| Bank-quote payment and annual debt disagree | Enabled quote 2,200.005 is selected unrounded; annual debt = 26,400.06 despite the payment displaying 2,200.01. | Select the payable sen-rounded quote, then annualise it. Selected payment = 2,200.01 and annual debt = 26,400.12. The separately calculated instalment remains 1,992.49. End-to-end engine tests check all four financed metrics with override on/off. |
| Very small positive interest is numerically unstable | RM450,000 at 0.000000000001% for 35 years gives 1,005.27 rather than 1,071.43; a still smaller positive rate can produce Infinity. | Algebraically equivalent `-expm1(-n * log1p(r))` denominator preserves precision near zero. Zero interest and both tiny-rate regressions pass. No rate assumptions were added. |
| Invalid values are confused with missing values | NaN/Infinity and strings in returns inputs are classified as missing. Invalid monthly expense conversion returns null. | Only null/undefined mean missing in the returns guard. Other invalid values are rejected. Monthly expense conversion preserves an invalid signal for the expense guard. Every formula argument is tested. |
| Unsafe result range | A finite tiny denominator can produce `{status: "ok", value: Infinity}`; finite large costs can overflow or lose a sen. | Check input/output ranges, safe integer cents and the conversion back to JavaScript numbers. Unrepresentable results are invalid/null, never successful non-finite metrics. Sum, product and ratio regressions pass. |
| Negative financing/fallback validation | The selector accepts a negative calculated payment; the orchestrator accepts a negative entered principal; an invalid LTV can fall back as though it were missing. | Reject invalid selected payments/principal. Only absent LTV permits entered-principal fallback. Missing/invalid enabled bank quotes remain unavailable, with no silent fallback. Valid zero quotes remain zero. |
| Invalid amounts can be saved as unknown | The cost save functions do not validate engine inputs; a NaN/Infinity becomes null during JSON serialization. | Both cost save functions call their authoritative engine guard before any database access. Ten write-boundary tests cover invalid values, annual conversion overflow and aggregate overflow. No database schema or UI change was needed. |

The new arithmetic helper is internal to Engine A and adds no dependency or
public metric. It preserves decimal input values through the basic arithmetic,
then returns the existing numeric result type. It does not introduce a second
copy of any business formula. Positive-interest amortisation still uses stable
floating-point logarithms/exponentials, with sen-rounded output; this audit does
not certify an individual bank's final-payment amortisation schedule.

## All requested checks

| Check | Result and evidence |
| --- | --- |
| 1. Mathematical implementation | PASS. All 11 requested definitions use the correct numerator, denominator and subtraction. Supporting initial-cash calculations are also tested. |
| 2. Units | PASS. Rent and instalment inputs are monthly RM; NOI, expenses, debt service and annual cash flow are annual RM; prices and cash invested are RM; occupancy is months, inclusive 0–12. Fractional expected months are supported. |
| 3. Percentage conversion | PASS. All six ratios multiply by 100 exactly once. Loan LTV/rate inputs separately use percentage-to-decimal conversion. |
| 4. Monthly versus annual | PASS. Potential rent uses 12 months; effective rent uses occupied months; monthly cash flow divides annual NOI by 12. Debt service uses 12 selected payable instalments. Explicit monthly expense conversion occurs in Engine A. |
| 5. Rounding | PASS after fixes. Results use two decimals and symmetric half-up rounding (ties away from zero). Ordinary inputs and half-sen, decimal-sum, fractional-occupancy and loss cases pass. |
| 6. Division by zero | PASS. Every zero ratio denominator yields invalid/null; no Infinity, fabricated zero or capped return. Zero numerator with a positive denominator is valid. |
| 7. Missing data | PASS. Null/undefined stay unavailable, required inputs are named, and missing dependencies propagate. Missing financing does not become cash-purchase financing. Independent property-level metrics remain available. |
| 8. Financing override | PASS after fixes. Selected source, sen rounding, annualisation and downstream results agree; calculated repayment is preserved; enabled missing/invalid quote has no fallback. A confirmed zero quote is valid. |
| 9. Negative values | PASS after fixes. Negative rents/costs/debt/divisors and occupancy outside 0–12 are invalid. Negative NOI, yields and cash flows remain legitimate results. Break-even above 100% is retained. |
| 10. Formula duplication | PASS. The requested business formulas exist once in `returns.ts`; `calculateReturns` calls them. Shared arithmetic replaces four duplicated rounding implementations. |
| 11. Logic in UI components | PASS. Source search and review of the property, financing and cost panels found display/entry code calling engine functions. No requested financial formula is implemented in React. |

Monthly and annual cash flow are rounded independently. For the normal fixture,
monthly cash flow is 291.67 and annual cash flow is 3,500.00. Multiplying the
rounded monthly display by 12 yields 3,500.04; this is an expected display-rounding
difference. The annual formula correctly uses annual NOI minus annual debt.

The acquisition and operating-expense modules retain their explicit `partial`
status for known-only subtotals. A partial subtotal is not a complete cost and
must not substantiate a final return. `calculateReturns` accepts scalar inputs;
the caller must supply fully known totals or null and must pass monthly/annual
payments from the same `calculateFinancing` result. There is currently **no
application caller of `calculateReturns`**. Tests compose these engines directly;
adding dashboard/save integration would be new functionality and was excluded.

## Validation

| Check | Result |
| --- | --- |
| Original application suite | 104 passed across 5 files |
| First expanded suite before fixes | 202 passed; 142 failed out of 344 tests, reproducing defects; all original tests retained |
| Final complete application suite | 358 passed across 7 files; 0 failed; includes 254 new tests and 3,000 integer-reference comparisons |
| TypeScript (`tsc --noEmit`) | PASS |
| Production build (`npm run build`) | PASS; dependency/directive/chunk-size warnings only |
| Root existing suite | 5 passed; browser scan skipped when no build was specified |
| Existing security suite against audited source and built browser assets | 6 passed; no skips |
| `git diff --check` in audit worktree | PASS |

Test evidence: `financial-engine-before.json`, `financial-engine-tests.json`,
`financial-engine-results.json`. Build log: `financial-engine-build.log`.
No test was removed or weakened. Tests exercise the real engine modules and
mock the database only for rejection-before-write checks. Live database and
browser workflows were not exercised; this is a mathematical engine audit.
Earlier security/property audit findings and deployment status are separate.

To reproduce, run from `.security-audit.local/financial-engine-audit`:

```powershell
$env:FINANCIAL_AUDIT_REPORT = '../../docs/financial-engine-results.json'
npm test
node node_modules/typescript/bin/tsc --noEmit
npm run build
```

Installed dependencies were reused from the existing local dependency directory.
No package manifest or lockfile changes were required. The build regenerated
route-tree line endings only; that generated file is excluded from the patch.

## Files changed

Paths relative to the isolated audit worktree:

- `src/lib/finance/returns.ts`: formula arithmetic, validation and safe outputs.
- `src/lib/finance/rounding.ts`: shared exact decimal arithmetic and rounding.
- `src/lib/finance/financing.ts`: selected payment, stable interest calculation and validation.
- `src/lib/finance/acquisition.ts`: exact summation and range validation.
- `src/lib/finance/operating-expenses.ts`: exact summation/conversion and invalid-value handling.
- `src/lib/property/acquisition-api.ts`: reject invalid costs before saving.
- `src/lib/property/operating-expenses-api.ts`: reject invalid expenses before saving.
- `tests/financial-engine-audit.test.ts`: formula matrix and numerical/integration regressions.
- `tests/financial-write-boundary.test.ts`: invalid-write regressions.

Root deliverables are this report, the four evidence/log files listed above,
and `financial-engine.patch`. The fixes are reviewable locally and are not yet
part of the connected branch or deployed application.

FINANCIAL ENGINE STATUS:
PASS
