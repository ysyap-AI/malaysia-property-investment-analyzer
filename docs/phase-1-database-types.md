# Phase 1 Supabase database types

Regenerated on 2026-10-01 directly from the deployed MPIA public schema
(`viddikrrhogcebpbstti`) using the installed Supabase CLI 2.117.0:

```text
supabase gen types typescript --project-id viddikrrhogcebpbstti --schema public
```

The successful command's stdout was saved as UTF-8 to
`src/integrations/supabase/types.ts`. Generation read the live schema; it did not
apply migrations or write application records. The generated output covers all
seven public tables, their 129 columns, relationships, and `owns_property`.
Legacy columns remain represented exactly as deployed. Do not hand-edit this file.

## Application changes

- The property, acquisition, operating-expense and financing API modules now use
  the existing `createClient<Database>` client directly. All four
  `SupabaseClient<any, "public", any>` escape hatches were removed.
- Their record types derive from generated `Tables<...>` types. Acquisition,
  operating-expense and financing results no longer need assertions.
- Form input types still come from the existing Zod schemas. The typed client
  checks their insert/update payloads against the generated schema, preserving
  current form validation and required fields.
- Queries, filters, ordering, insert-versus-update logic, validation, error
  handling, RLS, financial formulas and UI behavior are unchanged.

## Remaining type boundaries

No first-party Phase 1 database API requires an untyped client.

`property-api.ts` retains result assertions for one field:
`rent_verification_status`. The generated type is `string | null` because this
is a TEXT column with a CHECK constraint, not a PostgreSQL enum. The application
record narrows it to `RentVerificationStatus | null`, matching the verified
`properties_rent_verification_status_check` constraint and the existing analysis
engine input. This is a compile-time assertion, not added runtime validation;
it depends on that database constraint remaining in place. All other property
fields retain generated types and nullability.

`src/lib/auth-isolation.ts` still uses `SupabaseClient["auth"]` without a database
generic. It accepts only the schema-independent Auth interface and cannot perform
database queries; it is not an untyped database client. The corresponding auth
test mock has the same intentionally schema-independent type. Existing generic
tuple/form assertions and generated router casts are unrelated to database access.

## Verification

| Check | Result |
| --- | --- |
| `node node_modules/typescript/bin/tsc --noEmit` | PASS |
| `node node_modules/typescript/bin/tsc --noEmit -p tests/database-types/tsconfig.json` | PASS |
| `node node_modules/typescript/bin/tsc --noEmit -p tests/fixtures/tsconfig.json` | PASS |
| `node node_modules/vitest/vitest.mjs run` | PASS: all 942 tests in 31 files |
| `npm run build` | PASS |
| `npm run test:security`, with `SECURITY_AUDIT_BROWSER_ROOT=.output/public` | PASS: all six checks, including built browser assets; no skips |
| `git diff --check` | PASS |

The new compile-only checks in `tests/database-types/phase1.ts` verify API result
types, payload compatibility, and nullable status handling. Expected compilation
errors cover nonexistent tables, missing ownership/parent IDs, an obsolete column,
incorrect financial value types, and a null nonnullable financing flag. Run their
dedicated TypeScript command above; Vitest does not execute these checks.

The build reported non-fatal large-chunk, plugin and dependency directive warnings.
No live write tests were needed for these application type changes. Existing
deployment evidence and other working-tree changes were preserved.
