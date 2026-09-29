# Phase 1 F7 runtime validation correction

Date: 2026-09-28. Read `PROJECT_RULES.md` and
`docs/phase-1-focused-engine-reaudit.md`. Corrected F7 in the existing working
tree; preserved prior F1–F6 fixes and other pre-existing changes.

| Finding | Result |
| --- | --- |
| F7.A Data Confidence domain validation | PASS |
| F7.B Investment metric validation | PASS |
| F7.C Red Flag validation | PASS |
| F7.D Boolean configuration validation | PASS |

Invalid numeric evidence now loses confidence credit and is labelled
`Invalid / Unavailable`, distinct from missing evidence. Rent, costs, valuation,
loan amount and rate must be finite and nonnegative; LTV must be within 0–100;
tenure must be positive. A valid alternative loan-size field cannot conceal an
invalid supplied LTV or loan amount. Only literal `true` grants bank-quote
verification.

Successful scoring metrics must satisfy their domain before receiving points.
Negative occupancy is invalid; occupancy above 100 remains valid and adverse.
Negative net yield, cash flow and cash-on-cash returns remain valid outcomes.
Both occupancy domains are covered by the shared validator; property occupancy
does not become a new scoring category. The six-category Phase 1 allowlist is
preserved. Gross yield must also be nonnegative.

Risk rules flag invalid required fields and loan terms, and leave invalid
valuation/occupancy checks UNCHECKED. Scoring and confidence configurations
reject every nonboolean `enabled` value, including on disabled/future factors.
These are the only boolean enable/disable switches exposed by the Phase 1
engine configurations. Existing weight, total, nonfinite, phase and
recommendation protections remain covered by passing regressions.

Files changed for this correction:

- `src/lib/phase1-validation.ts`: shared numeric evidence and metric domains.
- `src/lib/scoring/data-confidence.ts`: domain checks, evidence distinction,
  strict boolean switch validation and literal bank verification.
- `src/lib/scoring/investment-score.ts`: successful metric domain and boolean checks.
- `src/lib/risk/red-flags.ts`: invalid evidence cannot clear numeric rules.
- `tests/phase1-f7-validation.test.ts`: 73 added boundary/regression cases.
- This report and `docs/phase-1-f7-validation-tests.json`.

The database runner refreshed `docs/phase-1-ownership-results.txt` and wrote its
usual `docs/phase-1-database-results.json` artifact. Existing tests, including
both independent re-audit files, were not edited by this correction. No financial
formulas, UI, AI, database schema or later-phase functionality were changed.

Validation commands and results:

| Command/check | Result |
| --- | --- |
| `node node_modules/vitest/vitest.mjs run tests/phase1-independent-reaudit.test.ts tests/phase1-independent-query-reaudit.test.ts` | PASS: 76/76, including all 15 previously failing F7 cases |
| `node node_modules/vitest/vitest.mjs run --reporter=json --outputFile=docs/phase-1-f7-validation-tests.json` | PASS: 852 total, 852 passed, 0 failed, 0 skipped, 27 files |
| All existing focused audits and previous Phase 1 tests | PASS: included in the full run; all 779 pre-existing cases pass |
| `node --test tests/security.test.mjs` with `SECURITY_AUDIT_BROWSER_ROOT=.output/public` | PASS: 6/6, including fresh built browser assets; 0 skipped |
| `node tests/run-phase1-database-audit.mjs` | PASS: schema 80/80; ownership/RLS 245/245; constraints 349/349 |
| `node node_modules/typescript/bin/tsc --noEmit` | PASS |
| `npm run build` | PASS |
| `git diff --check` and `git diff --cached --check` | PASS |

Database execution required access to the existing local Docker service outside
the sandbox. All changes rolled back: zero public tables and zero Auth users
afterwards, also zero Auth users before. This is a local database regression
run, not a production authentication audit. TypeScript uses the repository's
configured source scope; Vitest executes tests. Build warnings remain about
tsconfig-path resolution, chunk sizes, bundler options and dependency directives.
Diff checks report line-ending notices without whitespace errors.

PHASE 1 BLOCKER STATUS:
RESOLVED
