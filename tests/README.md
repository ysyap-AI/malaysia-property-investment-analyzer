# Tests

Run `npm test` or `npm run test:security` with Node.js 22+ and Git. These checks
require no installed application dependencies. They scan source, public assets
and build configuration for common credential patterns, test the scanner with
synthetic secrets and public keys, and verify environment-file Git exclusions.
Failures report file paths and credential categories, never credential values.

These are source checks only. They do not prove database isolation, inspect a
deployed bundle, or replace an exhaustive secret scan. Set
`SECURITY_AUDIT_SOURCE_ROOT` to scan a separate source checkout; Git exclusion
checks continue to use this working repository. See `docs/security-audit.md`
for the current backend audit status and the pinned source revision.

Set `SECURITY_AUDIT_BROWSER_ROOT` to the locally built `.output/public` directory
to also scan browser assets. This test explicitly skips when no build directory
is supplied. On 2026-09-21, all six checks passed against source revision
`d2cc389608c821957cc0b3796712dff29caf1dcc` and its local production build. That
revision's own `npm test` passed all 31 Vitest tests; `npm run build` also passed.

## Live Supabase checks

`supabase-preflight.mjs` makes read-only requests with a public key. Supply
`SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` through the environment or an ignored
environment file, then run `node tests/supabase-preflight.mjs`. It reports HTTP
statuses and row counts without printing credentials or record contents. Empty
anonymous results alone do not prove isolation when no known fixtures exist.

`supabase-ownership.sql` is a database regression script, executed successfully
against the deployed MPIA database on 2026-09-21: **243 passing assertions**
after applying the scoped table-privilege migration. Both before/after A/B runs
cleaned up their users and profiles; a separate query verified the exact IDs
were absent. The new checks inspect effective TRUNCATE/REFERENCES/TRIGGER grants
without executing destructive operations. See `docs/security-audit-results-20260921.json`.
It was also run on 2026-09-20 through the empty-schema wrapper below. Run the **whole
file in one transaction/request** through an
administrative SQL connection against the actual migrated application database.
For psql, use `--single-transaction -X -v ON_ERROR_STOP=1 -f tests/supabase-ownership.sql`.
It creates two temporary `auth.users` and their profiles, runs assertions under
the `anon` and `authenticated` database roles, and rolls back all fixture changes
before checking cleanup. Inspect every result; the script returns FAIL rows
instead of stopping at the first failed security assertion. An execution error
is not a pass. A failed cleanup check must be investigated before reporting
completion. Password login/browser session tests are separate from this SQL test.

For an empty database only, `build-supabase-audit.mjs` generates a wrapper that
temporarily applies the real repository migrations, runs the ownership script,
then rolls back the entire schema and verifies cleanup. Example:

```text
node tests/build-supabase-audit.mjs <migration-directory> .security-audit.local/cloud-ownership.sql
npx --no-install supabase db query --linked --project-ref <confirmed-project-ref> --file .security-audit.local/cloud-ownership.sql --output json
```

This is migration verification, not deployment. The wrapper rejects a nonempty
application schema. The completed MPIA run returned 203 passing assertions;
`docs/security-audit-results.json` records them and the independent follow-up
cleanup query. A CLI exit code of zero alone is insufficient: inspect the result
rows for failures. No permanent tables or policies remain after this wrapper.

## Planned application tests

Reserved for Phase 1 step 4 onward. Vitest, unit tests colocated as `*.test.ts`
next to each finance/scoring module; cross-module golden-file fixtures live here.

Planned coverage: hand-worked Malaysian examples per finance function, `null`
inputs yielding `incomplete` (never `0`), scoring band boundaries, risk flags,
recommendation branches.
