# Properties, Acquisition Costs and Operating Expenses audit

Completed 2026-09-22 after reading `PROJECT_RULES.md`.

**0 CRITICAL issues; 3 HIGH issues fixed; 5 MEDIUM and 3 LOW issues remain.**
Only the HIGH findings were changed. No new features, UI changes, unrelated
refactoring, pushed commits or production deployment were made.

## Source and database scope

The root working copy is at the older `51a6c55` revision and contains existing
local edits. The implemented modules are in GitHub revision
`d2cc389608c821957cc0b3796712dff29caf1dcc`. Fixes are in an isolated worktree at
`.security-audit.local/implementation-audit`, on local branch
`audit/property-cost-integrity`. They remain uncommitted. Existing root edits
were preserved. `docs/property-cost-integrity.patch` contains the code/test fixes
against that latest reviewed revision, including the prior security migration.

The linked MPIA project's (`viddikrrhogcebpbstti`) column types, defaults and
constraints were read directly. Database regression tests ran against local
Supabase using the full migration chain, with rollback. This audit did not
change cloud data or create cloud users. The preceding security audit separately
verified live MPIA ownership; this run reverified the policies locally after the
schema migration. Generated migration tests require an empty local public schema
and refuse to overwrite application tables.

## All requested checks

| Check | Assessment |
| --- | --- |
| 1. Database relationships | Correct non-null UUID ownership/parent foreign keys; one acquisition and one operating row per property; ON DELETE CASCADE verified. Missing migration coverage fixed in H1. |
| 2. User ownership | Properties use `auth.uid() = user_id`; child tables use `owns_property(property_id)` with USING and WITH CHECK. Database role tests verify cross-user reads, writes, deletes, forged parents and reassignment. |
| 3. Numeric data types | Database financial values are nullable NUMERIC, counts/years INTEGER. No financial zero defaults. JavaScript precision and integer-validation limitations remain M1/M2/M4. Overflow fixed in H3. |
| 4. Currency handling | Active amounts are explicitly RM; formatting uses `en-MY`. No exchange conversion or mixed-currency computation was found. Malformed numeric parsing fixed in H2; sub-cent rounding remains M1. |
| 5. Missing-data behaviour | Blank input becomes null. Acquisition has no total without purchase price. Operating expenses have no total when all amounts are unknown. Known-only partial sums are explicitly labelled and include missing-field lists. |
| 6. Zero versus unknown | Real zero survives parsing, persistence and reloading. It is distinct from null; operating results identify confirmed zero fields. Tests cover both. |
| 7. Duplicate financial fields | Active totals enumerate each canonical field once. Legacy database fields and the financing purchase-price copy remain M3. Asking price, target price and bank valuation are intentionally different concepts. |
| 8. Annual/monthly consistency | Operating inputs explicitly annualise monthly amounts in the finance module before storage. Reloaded annual values are not annualised again by default. Expected rent is explicitly monthly in its field name. Legacy mixed-unit columns remain unused (M3). |
| 9. Calculation location | Totals and monthly-to-annual arithmetic are in `src/lib/finance`. UI components call these functions and format results; no duplicated financial formulas were found in the reviewed components. |
| 10. Input validation | Required names, enum values, postcode shape, nonnegative amounts and bounds were reviewed. H2/H3 fixed silent numeric corruption; remaining validation gaps are M2/M4. |
| 11. Automated tests | All 31 original tests retained and passed; 51 new cases added. Schema, ownership and source/bundle checks also passed. Remaining coverage limitations are M5. |

## HIGH issues fixed

### H1 — Current modules cannot be rebuilt from checked-in migrations

The two original migrations created `properties.name`/`address`, but current
code reads and writes `project_name`/`full_address` plus additional property
fields. They also omitted the current acquisition fields and every `annual_*`
operating field. The live database contained these changes, including validation
constraints, but Git did not. A clean deployment could not save the implemented
forms, and its validation differed from MPIA.

Added `20260921010000_reconcile_property_cost_columns.sql`. It renames the two
property columns while preserving values; adds the already-used columns with
matching types/defaults; and reproduces the deployed nonnegative cost and
property-enum checks. It preserves relationships, RLS, existing zeros, nulls and
legacy columns. It does not invent purchase prices or allocate legacy totals to
new categories. Conflicting old/new property column names or invalid preexisting
data cause an error instead of silently rewriting data.

Validation: migrate the original schema containing fixture records; apply the
new migration twice; verify data preservation, all 32 current financial fields,
28 negative-cost checks, 4 enum checks, uniqueness, foreign keys and cascades.
All **80 schema checks** passed. The migration was tested locally, not deployed;
MPIA already has the covered columns and constraints.

### H2 — Malformed amounts silently become different amounts

All three form parsers removed every comma before parsing. For example `1,5`
became `15`, and `12,34` became `1234`. JavaScript-specific strings such as
`0x100` and `1e3` were also accepted as financial entries. These were successful
saves, not validation errors, so unintended values could feed calculations.

The existing parsers now accept decimal notation and correctly grouped thousands
separators, and reject ambiguous input. `1,234.50`, `1234.50`, `.50`, zero and
blank input retain their intended behaviour. No UI component was changed.

Validation: regression cases cover malformed and valid entries separately for
Properties, Acquisition Costs and Operating Expenses.

### H3 — Overflow can turn a known amount into unknown during saving

Validation accepted very large finite numbers. Summing/converting these could
overflow; `JSON.stringify` converts non-finite numeric values to `null`, causing
a known entered amount to be saved as unknown. The calculation functions could
also return non-finite totals rather than an invalid result.

The parsers and calculators now reject values/totals outside safe integer-cent
representation. Monthly conversion marks invalid values as NaN, distinct from a
missing input's null. Both child write functions revalidate amounts immediately
before database access, including after annualisation. Thus invalid results are
rejected before serialization. Ordinary financial formulas are unchanged.

Validation: finite oversized inputs, aggregate overflow, monthly overflow,
negative/non-finite conversion, rejected API writes before database calls, and
normal monthly/annual/null/zero round trips. All passed.

## Remaining issues — unchanged as requested

| ID | Severity | Issue and impact |
| --- | --- | --- |
| M1 | MEDIUM | Sub-cent amounts are accepted and stored in unrestricted NUMERIC columns. JavaScript summation/rounding and display rounding can disagree by a sen: stored `10.075` displays as `10.08`, while the existing total rounding produces `10.07`. A consistent fractional-cent policy is still needed. H3 prevents overflow but does not change ordinary rounding. |
| M2 | MEDIUM | Property count/year schemas allow fractions, while corresponding database columns are INTEGER. A value such as bedrooms `2.5` passes form validation and then fails at the database. No silent integer conversion fix was introduced. |
| M3 | MEDIUM | Legacy acquisition fields (`legal_fees`, `stamp_duty`, `agent_fee`, `other_costs`) and old monthly/annual operating fields coexist with current fields, but current forms/calculators do not read them. `financing.purchase_price` also duplicates the acquisition purchase price without synchronization. Older values can be omitted from current known-cost summaries. No safe allocation/source-of-truth mapping was assumed. |
| M4 | MEDIUM | Database validation remains weaker than application validation for some inputs. Property monetary values lack nonnegative checks; the child `>= 0` checks do not establish finite values, a currency scale or a JavaScript-safe bound. Direct API/database clients can bypass form validation for their own rows. Ownership isolation remains intact. |
| M5 | MEDIUM | Tests do not exercise browser editing/account switching, successful HTTP persistence, or concurrent saves. Child save currently reads then inserts/updates; simultaneous first saves can encounter the UNIQUE constraint. The constraint prevents duplicates, but the user can receive a save error. Invalid child write boundaries are now covered, not every API workflow. |
| L1 | LOW | Partial-total UI text says the real total “will be higher”; unknown costs might actually be zero, making the final total unchanged. Missing fields are nevertheless explicitly disclosed. |
| L2 | LOW | Generated Supabase types describe the previous schema, so these APIs use `any` casts. This weakens compile-time detection of column/schema mistakes. Runtime database tests were added, but type regeneration was outside the permitted fix severity. |
| L3 | LOW | Existing `tests/README.md` still says tests are not implemented, despite the Vitest suite. Left unchanged under the HIGH/CRITICAL-only rule; current execution instructions are below. |

The duplicate-field warning is a schema/code finding; no private user financial
records were downloaded to determine whether particular legacy fields contain
real data. No destructive column removal or guessed data migration was performed.

## Tests executed

| Test/check | Passed | Failed |
| --- | ---: | ---: |
| Complete application suite (`npm test`) | 82 tests / 4 files | 0 |
| Local schema compatibility/integrity | 80 | 0 |
| Existing ownership regression through full migration chain | 245 | 0 |
| Source and local browser-bundle security checks | 6 | 0 |
| Production build (`npm run build`) | 1 build | 0 |
| TypeScript (`tsc --noEmit`) | Passed | 0 errors |

The first diagnostic run, before fixes, retained the original 31 passing tests
and reproduced **29 failures** in new regression cases. After fixes and further
boundary coverage, all 82 passed. No failing test was removed or weakened.
Build output contains dependency/directive/chunk-size warnings, not build errors.
Security checks scan the new worktree source and browser assets; the scanner's
two Git-hygiene checks still refer to the original root working copy.

All local database fixtures and the temporary schema were rolled back. An
independent follow-up found **0 public application tables and 0 Auth users**,
matching the empty local starting state. Cloud schema inspection was read-only.

Machine-readable evidence: `docs/implementation-audit-results.json`.

To reproduce in the isolated worktree:

```text
npm test
npm run build
node tests/build-module-schema-audit.mjs <output-schema-test.sql>
node tests/build-supabase-audit.mjs supabase/migrations <output-ownership-test.sql>
```

Run generated SQL only against an empty local Supabase public schema. Use psql
`-X -v ON_ERROR_STOP=1`; the ownership wrapper also needs `--single-transaction`.
Inspect returned result rows, not just process exit codes. The schema generator
contains its own BEGIN/ROLLBACK. Both generators reject a nonempty application
schema rather than resetting it.

## Files changed

Paths below are relative to `.security-audit.local/implementation-audit`:

- `src/lib/property/property-fields.ts`
- `src/lib/property/acquisition-fields.ts`
- `src/lib/property/operating-expense-fields.ts`
- `src/lib/property/acquisition-api.ts`
- `src/lib/property/operating-expenses-api.ts`
- `src/lib/finance/acquisition.ts`
- `src/lib/finance/operating-expenses.ts`
- `supabase/migrations/20260921010000_reconcile_property_cost_columns.sql`
- `tests/financial-input-integrity.test.ts`
- `tests/build-module-schema-audit.mjs`

Copied unchanged from the preceding security audit so this worktree's migration
chain and ownership regression are complete:

- `supabase/migrations/20260921000000_restrict_application_table_privileges.sql`
- `tests/build-supabase-audit.mjs`
- `tests/supabase-ownership.sql`

Reports are saved in the root `docs/implementation-audit.md` and
`docs/implementation-audit-results.json`, with copies in the audit worktree.
The root `docs/property-cost-integrity.patch` contains the implementation/test
changes. The build touched generated route-tree line endings only; no semantic
route-tree change is included in the patch.
