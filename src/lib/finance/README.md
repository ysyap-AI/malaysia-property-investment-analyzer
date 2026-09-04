# Engine A — Financial Calculations (not implemented)

Reserved for Phase 1 step 4. Pure TypeScript, no React, no database, no network.

Planned modules: `acquisition.ts`, `loan.ts`, `income.ts`, `expenses.ts`,
`returns.ts`, `scenarios.ts`, `types.ts`, `index.ts`.

Contract: unknown inputs are `null` and never coerced to `0`; a missing required
input returns `{ status: "incomplete", missingFields: [...] }`.
