# Independent Financing mathematical audit

Read `PROJECT_RULES.md`. Audited source revision
`c7fbcb020153e8d1dfabb0a3ff7bd1a9526c85d3` (Added Financing module).

**All five requested cases passed before and after correction. Three additional
rounding/numerical defects were found and fixed in the Financing engine.**
The final application suite passed all 67 tests (40 existing + 27 new).

The root checkout is the older `51a6c55` application shell with existing edits.
The current implementation and fixes are in
`.security-audit.local/financing-audit`, local branch `audit/financing-math`.
Existing work, including the prior property/cost audit checkout, was preserved.
These changes are local and uncommitted; nothing was pushed or deployed.
`docs/financing-math.patch` contains the implementation correction and new tests
against the audited revision.

## FORMULA

For a fixed nominal annual percentage A, monthly payments in arrears, principal
P, and tenure Y in years:

```text
annual decimal rate = A / 100
monthly decimal rate r = A / 100 / 12
number of payments n = Y * 12
monthly repayment M = P * r / (1 - (1 + r)^(-n))    when r > 0
monthly repayment M = P / n                       when r = 0
payable monthly repayment = M rounded half up to 2 decimal places (sen)
annual debt service = selected sen-rounded monthly repayment * 12
```

This is a nominal annual rate conversion, not an effective annual yield
conversion. Unknown required inputs produce `null`, not zero. A valid bank
quote is selected only when the override switch is enabled. Without a valid
quote, an enabled override returns unavailable rather than silently falling
back. The calculated instalment remains separate.

Independent reference: use 60-digit Python Decimal arithmetic to solve
`P = M * sum((1 + r)^(-k), k=1..n)`. This discounts each monthly payment
individually; it does not import or copy the implementation under audit.

```python
from decimal import Decimal as D, getcontext, ROUND_HALF_UP
getcontext().prec = 60

def reference(principal, annual_percent, years):
    p = D(principal)
    r = D(annual_percent) / 100 / 12
    n = years * 12
    annuity_factor = sum((1 + r) ** (-k) for k in range(1, n + 1))
    exact = p / annuity_factor
    monthly = exact.quantize(D("0.01"), rounding=ROUND_HALF_UP)
    return exact, monthly, monthly * 12
```

## INPUT / EXPECTED / ACTUAL / PASS/FAIL

Amounts below are RM. Case 5 uses a **2,200.00 monthly bank quote** as an explicit
test fixture because no quote amount was supplied. Cases 3 and 4 retain the
remaining inputs from case 1. Override is disabled unless indicated.

| Case | INPUT | EXPECTED | ACTUAL before correction | ACTUAL after correction | PASS/FAIL |
| --- | --- | --- | --- | --- | --- |
| 1 | P=450,000; A=4%; Y=35 | Monthly 1,992.49; annual 23,909.88 | 1,992.49; 23,909.88 | 1,992.49; 23,909.88 | PASS |
| 2 | P=400,000; A=0%; Y=20 | Monthly 1,666.67; annual 20,000.04 | 1,666.67; 20,000.04 | 1,666.67; 20,000.04 | PASS |
| 3 | P=450,000; A missing; Y=35 | Calculated, selected and annual amounts null; rate listed as missing | Matches | Matches | PASS |
| 4 | P=450,000; A=4%; Y missing | Calculated, selected and annual amounts null; tenure listed as missing | Matches | Matches | PASS |
| 5a | Case 1 + quote 2,200; override OFF | Selected 1,992.49; annual 23,909.88; calculated 1,992.49 | Matches | Matches | PASS |
| 5b | Case 1 + quote 2,200; override ON | Selected 2,200.00; annual 26,400.00; calculated still 1,992.49 | Matches | Matches | PASS |

For case 1, `4 / 100 = 0.04`, `r = 0.003333333333...`, and `n = 420`.
The independent unrounded monthly amount is
`1992.48633464991818329890982495611909635142887492545086672609`.
For case 2, `n = 240` and the unrounded monthly amount is
`1666.666666666666...`. Annual debt service is twelve sen-rounded payments;
rounding explains the extra RM0.04 in case 2. It is not an interest charge.
A bank's final payment may adjust accumulated rounding; a final-payment
amortisation schedule is outside this module's current calculations.

## Defects reproduced and corrected

| Defect / INPUT | EXPECTED | ACTUAL before | ACTUAL after | PASS/FAIL |
| --- | --- | --- | --- | --- |
| Half-sen rounding: P=2,418; A=0%; Y=20; exact M=10.075 | Monthly 10.08; annual 120.96 | Monthly 10.07; annual 120.84 | Monthly 10.08; annual 120.96 | FAIL -> PASS |
| Very small positive rate: P=450,000; A=0.000000000001%; Y=35 | Monthly 1,071.43 | 1,005.27 | 1,071.43 | FAIL -> PASS |
| Smaller positive rate: P=450,000; A=0.00000000000001%; Y=35 | Monthly 1,071.43 | Infinity | 1,071.43 | FAIL -> PASS |
| Sub-sen quote: case 1 + quote 2,200.005; override ON | Selected 2,200.01; annual 26,400.12 | Selected raw 2,200.005 (displayed 2,200.01); annual 26,400.06 | Selected 2,200.01; annual 26,400.12 | FAIL -> PASS |

1. **Half-sen rounding:** the existing `Number.EPSILON` adjustment is too small
   at some magnitudes. Binary multiplication puts `10.075 * 100` below the half
   boundary, causing a one-sen understatement. Decimal exponent shifting now
   precedes half-up rounding. The helper remains inside the Financing engine.
2. **Small positive interest rates:** `1 + r` and subtraction from one lose
   precision near zero, and can yield a zero denominator. Replaced the
   denominator with `-Math.expm1(-n * Math.log1p(r))`, which evaluates the same
   amortising formula while retaining precision. The explicit zero-rate branch
   remains. These extremely small rates are boundary tests, not typical quotes.
3. **Bank-quote rounding:** the schema accepts sub-sen quotes. The selected
   amount previously used unrounded input for annualisation while the UI
   displayed two decimals. Selection now rounds to sen before annualisation.
   The original entered quote remains unchanged in the saved row, alongside
   the separately calculated instalment.

## Requested audit checks

| Check | Evidence | Result |
| --- | --- | --- |
| Annual-to-monthly interest | A/100/12; case 1 independently evaluated | PASS |
| Percentage conversion | 4 -> 0.04; 90% LTV on 500,000 -> 450,000 | PASS |
| Payment periods | 35 years -> 420; 20 years -> 240; positive-rate and zero-rate fixtures | PASS |
| Zero interest | P/n; explicit zero survives form parsing and is distinct from blank | PASS |
| Rounding | Sen-rounded payments; half-sen and fractional bank-quote regressions | PASS after fixes |
| Annual debt service | 12 selected payments, including bank override and zero/missing states | PASS after fixes |
| Bank override selection | Switch on/off; missing, negative, non-finite and zero quotes; incomplete calculated inputs | PASS |
| Preservation of calculated instalment | Exact calculation retained on selection, row building and form reload | PASS |

## Tests and changes

Only production file changed:
`.security-audit.local/financing-audit/src/lib/finance/financing.ts`.
New regression tests:
`.security-audit.local/financing-audit/tests/financing-audit.test.ts`.
Root artifacts: this report and `docs/financing-math.patch`.

| Command/check | Result |
| --- | --- |
| Original `npm test` in audit checkout | 40 passed |
| New audit tests before fixing implementation | 63 passed, 4 failed; the original 40 remained passing |
| Final `npm test` in audit checkout | 67 passed across 5 files; 0 failures |
| `node node_modules/typescript/bin/tsc --noEmit` | PASS |
| `npm run build` in audit checkout | PASS; dependency/directive/chunk-size warnings |
| Root `npm test` | 5 passed; browser-assets check skipped without a supplied build |
| Existing root security suite against audited source and built browser assets | 6 passed; 0 skipped |

Installed dependencies were reused through a local directory junction; no
package manifest or lockfile changes were required. No existing test was
removed or weakened. Re-run the application suite with `npm test` from the audit
checkout. The new fixtures execute the actual engine and form/row converters.

No failures remain in these checks. This is a mathematical and local integration
audit, not certification against an actual bank repayment schedule. Save/reload
coverage tests the row/form transformations; live database writes and browser
interaction were not exercised. Separate SQL ownership/schema tests were not
rerun because this change does not touch database access or schema. The audit
does not establish arbitrary-precision correctness for unbounded input sizes.
