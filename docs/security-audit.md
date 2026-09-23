# Authentication and database-security audit

## Live MPIA audit (2026-09-21) — current result

**All eight requested requirements PASS after the permission fix below.** The
live database audit returned **243 PASS / 0 FAIL**. Temporary User A and User B
Auth records, trigger-created profiles and all test data were removed after
each run. A separate database request independently confirmed cleanup.
No UI or financial-calculation code was changed.

This audit tested the deployed **MPIA** project `viddikrrhogcebpbstti`, selected
by the user. Unlike the September 20 audit below, the seven application tables
already existed; they and their 28 RLS policies remained in place throughout.
Source review, application tests and a local production build used GitHub commit
`d2cc389608c821957cc0b3796712dff29caf1dcc`, extracted into an isolated directory.
The root working copy is older and contains existing edits, which were preserved.
The active authentication and property clients in the reviewed revision use MPIA.

### Requirement results

| # | Requirement | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Anonymous users cannot retrieve protected property data | PASS | Direct anon queries with known A/B fixtures returned no rows; anonymous HTTP reads also returned no rows for all seven tables. |
| 2 | User A cannot SELECT User B's properties | PASS | Direct cross-user reads returned zero rows, in both directions; legitimate owner reads succeeded. |
| 3 | User A cannot UPDATE User B's properties | PASS | Cross-user updates affected no rows; legitimate owner updates succeeded. |
| 4 | User A cannot DELETE User B's properties | PASS | Cross-user DELETE affected no rows, victim rows survived, and owner deletes worked. Excessive table-wide permissions were separately removed. |
| 5 | User A cannot INSERT child records for B's property | PASS | Acquisition costs, operating expenses and financing rejected forged parent IDs with SQLSTATE 42501, including parents without existing children. |
| 6 | Child-table security is enforced by the database | PASS | Direct SQL tested actual authenticated/anon roles, RLS, reassignment and upserts without UI filtering. |
| 7 | Sensitive credentials are absent from frontend source | PASS | Source review and automated credential-pattern checks found none in the reviewed revision. |
| 8 | No service-role key is exposed client-side | PASS | No private key values or browser imports of the admin client found; locally built browser assets also passed credential scanning. |

Profiles, investment criteria and scenario configurations also passed cross-user
SELECT/UPDATE/DELETE/INSERT and ownership-change checks. All seven tables have
RLS enabled. The owner columns are non-null and have foreign keys; the child
policies call the security-invoker `owns_property` helper. UPDATE policies check
both existing and resulting ownership. Neither API role is a superuser or has
the BYPASSRLS attribute. The only public functions found were the ownership
helper and the signup/update triggers; no public views were found.

### Finding and minimum fix

**FAIL before fix; PASS after fix: excessive table-wide privileges.** Both
`anon` and `authenticated` had `TRUNCATE`, `REFERENCES` and `TRIGGER` on all seven
tables: 42 grants beyond normal application CRUD. PostgreSQL explicitly excludes
TRUNCATE and REFERENCES from RLS protection. A SQL execution path running as
either role could therefore exercise these privileges outside row ownership
checks; TRUNCATE could erase other users' data. No arbitrary-SQL RPC or app route
exposing TRUNCATE was found, so this is a confirmed database-permission weakness,
not a demonstrated anonymous HTTP exploit. See the
[PostgreSQL row-security documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

Applied [the scoped permission migration](../supabase/migrations/20260921000000_restrict_application_table_privileges.sql)
to MPIA using the administrative CLI connection. It revokes only those three
privileges on the seven named tables from PUBLIC, anon and authenticated. Existing
CRUD privileges, RLS policies, service-role access and application data remain.
No TRUNCATE was executed: regression tests inspect effective privileges using
`has_table_privilege`. Default grants for future tables were not changed; the
same restriction must be considered when introducing another protected table.

The migration file was executed directly with `supabase db query --file`, not
through a broad `db push`; it was not added to the remote migration ledger by
that command. It is idempotent and can be incorporated into the normal migration
history. The file is saved locally; no Git commit or push was made.

### Validation and cleanup

| Check | Result |
| --- | --- |
| Baseline database audit | 201 passed; 42 excessive-permission checks failed |
| Database audit after fix | 243 passed; 0 failed |
| Source and local browser-bundle security checks | 6 passed |
| Existing application regression tests | 31 passed across 3 Vitest files |
| Production build of reviewed source | Passed; dependency/chunk-size build warnings only |
| Live anonymous table HTTP checks | 7 passed |
| Live Auth missing/invalid bearer token checks | Rejected with HTTP 401/403 |
| Independent cleanup | 0 fixture Auth users, profiles, properties, criteria or scenarios remaining |
| Independent permission/schema check | 0 excessive grants; 7 tables and 28 policies preserved |

The database test creates two temporary Auth records per run, verifies the signup
trigger creates their profiles, and exercises both A-to-B and B-to-A attacks.
There were two runs (four temporary user IDs in total). Tests use `SET LOCAL ROLE`
and explicit request subjects; positive controls verify each user's normal CRUD
works. A subtransaction rollback removes fixtures even after assertion failures,
and eight in-script checks verify removal, including all three child tables.
The independent follow-up checks the exact four temporary IDs from both runs.

Retained evidence: [all results, SQL hashes and independent cleanup](security-audit-results-20260921.json).
The updated [SQL regression script](../tests/supabase-ownership.sql) supports both
the original `properties.name` column and deployed `project_name`, and adds the
42 privilege checks. The [credential scanner](../tests/security.test.mjs) now also
accepts an explicit browser-build directory. Two bundled-library false positives
(a Realtime event name and a variable-only template) were investigated and covered
by scanner regression cases; secret-value detection remains enabled.

### Warnings and limits

- **WARNING — authentication flow coverage:** missing/invalid tokens and the
  Auth-to-profile trigger were tested. The temporary database users had no
  passwords or sessions. Password sign-in, confirmation emails, password reset,
  token refresh and browser/multiple-tab account switching were not exercised.
  The protected route calls `getUser`; database isolation does not rely on it.
- **WARNING — remaining connection drift:** active auth and property operations
  use MPIA, but the legacy generated client and server-function auth attacher
  retain the previous connection path. No active server functions consuming that
  path were found. This remains an alignment concern before adding such endpoints.
- **WARNING — migration drift:** the live schema includes renamed/added property
  and expense fields absent from the two upstream migration files. The live
  policies were tested directly; this audit does not certify rebuilding the full
  current schema from those files.
- Source/bundle PASS means no credentials detected in the reviewed source and
  locally built assets. It does not certify the separately deployed Lovable
  bundle, dashboard secrets, all Git history, or all possible secret formats.

Files changed in this audit: the new privilege migration,
`tests/supabase-ownership.sql`, `tests/security.test.mjs`, `tests/README.md`,
`docs/security-audit.md`, and `docs/security-audit-results-20260921.json`.
Earlier audit results below are historical and do not describe today's deployment.

---

## Completed two-user database audit (2026-09-20)

**203 database assertions passed; 0 failed. Temporary User A and User B profiles,
Auth users and all fixture records were removed. Independent cleanup verification
also passed. No UI or application-policy changes were required.**

The user explicitly selected the linked cloud project **MPIA**,
`viddikrrhogcebpbstti`. Access was through the user's authenticated Supabase CLI.
The selected project had zero public application tables and zero Auth users.
The local Docker database was also empty. The previously reviewed app source
points to a different project, `fryqdijszrzqjgyyvqvg`.

To test the actual repository policies, both migrations from source commit
`420dc449eeb311e3bacf45b5fe760f4021209337` were applied **temporarily inside a
rollback block** in the selected cloud database. The audit created two dummy
`auth.users` rows and verified that the signup trigger created both profiles.
It seeded properties, all three child tables, criteria and scenarios. Every
authorization assertion then ran under the ordinary `authenticated` or `anon`
database role with the corresponding user identity, rather than an admin role.

**Scope warning:** these results verify the supplied migrations on real Supabase
PostgreSQL. They do not certify a permanent deployment: the selected project's
schema was empty before testing and was restored to that state afterward.
The app still points to a different cloud project. No permanent migration,
connection change, UI change or deployment was made as part of this audit.

### Requirement results for the tested schema

| # | Requirement | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Anonymous users cannot retrieve protected property data | PASS | Known fixtures existed; anon could retrieve zero rows from all seven tables. |
| 2 | User A cannot SELECT User B's properties | PASS | Tested both A-to-B and B-to-A, including all child/configuration/profile tables. |
| 3 | User A cannot UPDATE User B's properties | PASS | Cross-user updates affected zero rows; owner updates succeeded. |
| 4 | User A cannot DELETE User B's properties | PASS | Cross-user deletes affected zero rows; victim records remained and owner deletes succeeded. |
| 5 | User A cannot INSERT children under B's property | PASS | All three child-table inserts against the other owner's empty parent were rejected with SQLSTATE 42501. |
| 6 | Database enforces child ownership | PASS | Direct SQL under ordinary roles enforced RLS, including child reassignment and cross-user upserts. |
| 7 | No sensitive credentials in frontend source | PASS | Five source-security checks passed against the working tree and the reviewed GitHub snapshot; source-review scope only. |
| 8 | No client-side service-role key | PASS | No private key values or admin-client UI imports found in reviewed source; deployed bundle not inspected. |

Investment criteria, scenario configuration and profiles passed their own
cross-user read/update/delete/insert and owner-change tests. Property ownership
transfer was denied. Positive controls confirmed that both users could perform
their own legitimate CRUD operations, preventing a deny-all database from
producing a misleading pass.

No ownership vulnerability was found in the tested migrations, so no policy fix
was justified. **WARNING:** password sign-in, email confirmation, reset-password
and browser session flows were not exercised with these transactional users.
The fixture users had no passwords or sessions; the audit checked the Auth-to-
profile trigger and database authorization using verified role/subject setup.
Prior read-only Auth endpoint checks on the other project are historical below.

### Cleanup verification

The tests explicitly deleted each user's own child rows, criteria, scenarios,
profiles and properties as positive controls. A subtransaction rollback then
removed both Auth users and every remaining fixture. The outer rollback removed
the temporary application schema, functions and Auth signup trigger.

All 10 cleanup assertions passed. Auth user count was **0 before and 0 after**.
A separate, subsequent cloud database request confirmed:

| Independent post-test check | Remaining |
| --- | ---: |
| The two exact temporary Auth user IDs | 0 |
| Public application tables (including profiles) | 0 |
| Temporary application functions | 0 |
| Temporary profile-creation trigger | 0 |

The two temporary IDs were `90e77170-aba4-48fb-b448-9949c93e9606` and
`c22ddecf-c736-49de-ae90-12ebb5f01ce2`. No working passwords or private credentials
were created, stored in the report, or printed.

### Test evidence and reproducibility

[Machine-readable results](security-audit-results.json) retain all 203 assertions,
the tested project and source revision, executed SQL hash and independent cleanup
results. The run included 63 positive controls, 7 anonymous reads, 21 anonymous
mutations, 42 cross-user reads/updates/deletes, 14 forged inserts, 14 ownership
changes, 10 cross-user upserts, 14 victim-integrity checks, 7 RLS checks, the
profile-trigger check and 10 cleanup checks.

`tests/build-supabase-audit.mjs` generated the transaction wrapper from the two
actual repository migrations and `tests/supabase-ownership.sql`. The wrapper
refuses to run on an existing application schema and rolls back schema changes
even if an assertion or setup fails. It was executed with:

```text
npx --no-install supabase db query --linked --project-ref viddikrrhogcebpbstti --file .security-audit.local/cloud-ownership.sql --output json
```

`node --test tests/security.test.mjs`: **5 passed**, repeated with the source
scan targeting `.security-audit.local/upstream`: **5 passed**. JavaScript syntax
checks and `git diff --check` passed. Build/lint remain unavailable without the
application dependencies; no frontend implementation changed.

Files changed for this completion: `tests/build-supabase-audit.mjs`,
`tests/supabase-ownership.sql`, `tests/README.md`, `docs/security-audit.md` and
`docs/security-audit-results.json`. Existing local edits and the user's new
Supabase configuration were preserved. No commits or pushes were made.

---

## Earlier re-audit of the connected app project (historical, 2026-09-20)

This section supersedes the original checkout-only assessment below. GitHub
now contains the Supabase implementation at commit
`420dc449eeb311e3bacf45b5fe760f4021209337`, while the working tree still has the
older preview. The new commit was fetched and reviewed in the ignored directory
`.security-audit.local/upstream`; no UI files in the working tree were replaced.
The connected project is `fryqdijszrzqjgyyvqvg`.

### Findings from the new implementation

- Supabase email/password authentication is implemented. Protected routes call
  `auth.getUser()` and redirect unauthenticated users. The server middleware
  verifies JWT claims and uses the caller's token with the public client key.
- Both migrations were reviewed. All seven tables enable RLS and limit policies
  to `authenticated`. Properties, investment criteria and scenario configurations
  compare `auth.uid()` with non-null `user_id`; profiles compare with `id`.
  UPDATE has both `USING` and `WITH CHECK`, and INSERT has `WITH CHECK`.
- Child tables (`acquisition_costs`, `operating_expenses`, `financing`) call
  `owns_property(property_id)` for reads/writes. The second migration changes
  this helper to `SECURITY INVOKER`; it checks the parent owner's ID and respects
  the parent's RLS. No obvious cross-user policy gap was found in these files.
- Signup creates profiles through a trigger. The trigger helpers have a fixed
  search path and direct execution is revoked from ordinary users.
- The frontend key in the new `.env` is a publishable key. The file contains
  project IDs, URLs and public keys only. The server admin client reads its key
  from `SUPABASE_SERVICE_ROLE_KEY`; no admin-client imports were found in UI
  files. No actual private credential or service-role JWT was detected.
- Property, investment-criteria and scenario UI persistence is still largely
  placeholder code; profiles are connected to their actual table.

### Live checks actually executed

Using only the project's public key (no service-role bypass):

| Live request | Observed result |
| --- | --- |
| Auth settings | HTTP 200; email authentication enabled, signup enabled, email confirmation required |
| Anonymous SELECT on profiles | HTTP 200, zero rows |
| Anonymous SELECT on properties | HTTP 200, zero rows |
| Anonymous SELECT on acquisition_costs | HTTP 200, zero rows |
| Anonymous SELECT on operating_expenses | HTTP 200, zero rows |
| Anonymous SELECT on financing | HTTP 200, zero rows |
| Anonymous SELECT on investment_criteria | HTTP 200, zero rows |
| Anonymous SELECT on scenario_configs | HTTP 200, zero rows |
| Auth user endpoint, missing token | HTTP 401 |
| Auth user endpoint, invalid token | HTTP 403 |

Requests did not print returned record contents or credentials. Empty results
alone do not prove RLS is effective: there were no known test fixtures to serve
as positive controls. Applied database policy metadata has not been inspected.

### Current requirement results

| # | Requirement | Result |
| --- | --- | --- |
| 1 | Anonymous users cannot retrieve protected property data | WARNING: live query returned no rows; seeded positive control pending |
| 2 | User A cannot SELECT User B's properties | WARNING: source policies appear correct; live two-user test pending |
| 3 | User A cannot UPDATE User B's properties | WARNING: source policies appear correct; live two-user test pending |
| 4 | User A cannot DELETE User B's properties | WARNING: source policies appear correct; live two-user test pending |
| 5 | User A cannot INSERT children under B's property | WARNING: source policies check parent ownership; live test pending |
| 6 | Database enforces child ownership | WARNING: implementation now exists; live effective policies/two-user test pending |
| 7 | No sensitive credentials in frontend source | PASS within source-review scope |
| 8 | No client-side service-role key | PASS within source-review scope; deployed bundle not inspected |

Personal criteria, scenario configuration and profile ownership are covered by
the reviewed policies but still require the live two-user test. The earlier
FAIL for missing child policies no longer describes this new source version.

### Temporary users and cleanup status

No temporary Auth accounts, profiles or property records have been created in
the live project. Administrative access was unavailable: the Supabase integration
was offered, but at the last check it was not installed/connected in this session;
no local administrative credentials or signed-in browser were available. The
user selected connecting the Supabase integration. Ordinary signup was not used
because it requires email confirmation and would not provide account-deletion
authority. No cleanup is currently necessary.

`tests/supabase-ownership.sql` is prepared for an administrative SQL connection.
It creates two temporary Auth users and trigger-generated profiles inside a
rollback block; switches to the real `authenticated` and `anon` roles; checks
both A-to-B and B-to-A CRUD, forged owner/parent IDs, owner changes, child
reassignment, upserts, criteria/configuration and positive controls; then rolls
back the fixtures and checks that all their accounts and rows are gone.
**This SQL script has not been executed or validated against a database yet.**
It tests database authorization, not password login or frontend session flows.

### Executed tests and changes for this re-audit

- Five source-security tests passed against the working tree and again with the
  source scan pointed at the new isolated GitHub snapshot. Git exclusion checks
  still refer to the working repository, not to the snapshot's tracked `.env`.
- `tests/supabase-preflight.mjs` ran the seven live anonymous table queries and
  the two missing/invalid-token requests reported above; exit code 0.
- No policy repair was made: none was justified by the source evidence so far.
- Added `tests/supabase-ownership.sql` and `tests/supabase-preflight.mjs`;
  updated `tests/security.test.mjs`, `tests/README.md` and this report.
- Build/lint remain unavailable without application dependencies. No UI code
  was modified and no changes were pushed.

---

## Original checkout-only audit (historical)

Audit date: 2026-09-20. Source baseline: `main`, commit `51a6c55`.
Read `PROJECT_RULES.md` before reviewing. No UI files were changed.

## Conclusion and scope

This checkout is a public application preview, not an implemented authenticated
property application. No Supabase dependency, client, project configuration,
SQL migrations, tables, RLS policies, database calls, or property CRUD server
functions exist in the reviewed tree. No database connection was available or
used. No live Supabase settings, users, grants, policies, or deployed bundles
were inspected. The absence of database code here says nothing about the
security of a separately deployed database.

No actual credential exposure or cross-user data exploit was identified in
this checkout. Authentication and database isolation cannot be certified.
Building a new database and authentication system would be a separate feature,
not a minimum repair to an existing policy. No speculative migrations were added.

PASS means the check passed within the stated scope. WARNING means the
requirement could not be verified. FAIL means a required control is demonstrably
absent; it does not imply that a live exploit was reproduced.

## Requested requirements

| # | Requirement | Result | Evidence and limitation |
| --- | --- | --- | --- |
| 1 | Anonymous users cannot retrieve protected property data | WARNING | Routes are public but display only the four hard-coded sample records in `src/lib/placeholder-data.ts`. No protected data source exists to test. |
| 2 | User A cannot SELECT User B's properties | WARNING | No real users, property table, queries or RLS policies exist in this checkout. |
| 3 | User A cannot UPDATE User B's properties | WARNING | No persisted properties or update endpoint exists. A two-user database test could not run. |
| 4 | User A cannot DELETE User B's properties | WARNING | No persisted properties or delete endpoint exists. A two-user database test could not run. |
| 5 | User A cannot INSERT children under User B's property | WARNING | No child tables or insert endpoints exist. Parent ownership could not be tested. |
| 6 | Child-table security is enforced by the database | FAIL | No database-enforced child ownership implementation is present. The required control remains unimplemented. |
| 7 | Sensitive credentials are absent from frontend source | PASS | Source review and pattern checks found no credentials in `src`, `public`, `vite.config.ts` or `package.json`. This is not an exhaustive secret scan or a deployed-bundle audit. |
| 8 | No service-role key is exposed client-side | PASS | No Supabase client/key configuration, service-role JWT or Supabase secret key was found in reviewed source. Deployment environment injection was not inspected. |

## Findings, impact and changes

### Authentication and ownership are not implemented (unresolved)

`src/routes/login.tsx`, `signup.tsx` and `forgot-password.tsx` explicitly say
authentication is not connected. Their submit buttons are disabled and handlers
only prevent form submission. There is no authenticated route guard or verified
server identity. `src/start.ts` installs CSRF middleware, which does not establish
identity or property ownership.

`src/routes/index.tsx`, `properties/index.tsx` and `properties/$id.tsx` read sample
data from a frontend module. This data is public by design; no private user
records were found. `analysis/new.tsx` does not save anything.

Investment criteria in `src/routes/settings.tsx` are local placeholder defaults
with a disabled Save button. Scenario analysis is a placeholder section in the
property page; `src/config/README.md` says configuration is not implemented.
Neither personal criteria nor scenario configuration has persisted ownership.

Impact: the requested isolation guarantees do not exist yet. Connecting real
property records without adding verified authentication and database policies
would make confidentiality and integrity depend on the new implementation.
Public preview pages are not themselves evidence of a real-data breach.

### Environment files were not excluded from Git (fixed; preventive)

The original `.gitignore` ignored `*.local`, but not `.env` or `.env.production`.
These files can contain database passwords and private API keys. They could
therefore be accidentally committed. No such files were already tracked.

Change: ignore `.env` and `.env.*` at all directory levels, while permitting
`.env.example` containing placeholders. Tests check both root and nested paths
and reject tracked private environment files. Git exclusions do not prevent
force-adding secrets or exposing secrets through build-time variables.

### Proposed RLS instructions were incomplete (documentation corrected)

The architecture proposal specified `USING` for all four CRUD operations.
INSERT requires `WITH CHECK`, and UPDATE must constrain the resulting row as
well as the existing row. The proposal also omitted how child rows establish
ownership through their parent and how personal criteria/configuration is
isolated. These were documentation gaps, not deployed policy vulnerabilities.

Change: corrected the proposal to cover command-specific checks, authenticated
roles, non-null owners, parent ownership and user-owned configuration. This
guidance does not replace migrations or runtime verification. See
[Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security).

Secret and service-role credentials belong only on a trusted backend; ordinary
user operations should retain the caller's identity so RLS applies. Public keys
are not private credentials. See
[Supabase API key documentation](https://supabase.com/docs/guides/getting-started/api-keys).

## Verification performed

- Reviewed authentication forms, route definitions, SSR/start middleware,
  property data paths, criteria/scenario placeholders, build configuration,
  dependencies, tracked files and architecture documentation.
- Searched the working source tree for auth/database integrations, ownership
  fields, policies, keys, JWTs, passwords, network calls and server functions.
  No existing SQL or executable application tests were present.
- `npm test`: 5 tests passed, 0 failed, 0 skipped. Covers synthetic secret
  detection, public-key handling, source scanning, Git exclusions and absence
  of tracked private environment files. No application dependencies required.
- `git diff --check`: passed.
- `npm run lint`: could not run because dependencies are not installed
  (`eslint` not found).
- `npm run build`: could not run because dependencies are not installed
  (`vite` not found).
- Database authorization tests: not run; schema, authentication integration and
  a test database are absent. Source scanning is not evidence that RLS works.

## Required database verification when the implementation is available

Use an isolated test database with migrations applied, two authenticated users
A and B, and an anonymous client. Perform requests directly through the Data
API or SQL under the actual `anon`/`authenticated` roles, bypassing the UI.
Privileged credentials may seed fixtures, but must not perform the assertions.

1. Confirm A and B can each create, read, update and delete their own records.
   Positive controls prevent a broken or deny-all database from falsely passing.
2. Anonymous requests must not return any private properties, children, personal
   investment criteria or scenario configuration, and must not mutate them.
3. A's list, ID lookup and nested reads must exclude B's properties and children.
4. A's UPDATE and DELETE against B's property must leave it unchanged. Check
   persisted state as B; a successful response with zero affected rows is valid.
5. A cannot insert a property with B's owner ID or change A's owner ID to B.
6. For every child table, A cannot insert against B's property, even if supplying
   A's own child owner ID; cannot reparent a child to B; and cannot read, update,
   delete or upsert B's children. Check both old and proposed parent ownership.
7. Repeat cross-user CRUD and owner-change checks for personal investment
   criteria and scenario configuration. Property-linked configuration must also
   validate the referenced parent. Ordinary users cannot alter shared defaults.
8. Inspect effective grants and every applicable policy for permissive rules;
   audit views, RPC functions and server endpoints for paths that bypass RLS.
9. Verify missing, invalid and expired sessions are rejected by protected server
   functions, and logout ends authenticated access. Test direct URLs as well.
10. Inspect deployment environment variable names and the generated client bundle
    for private credentials. Never paste working credentials into test output.

## Files changed

- `.gitignore`: exclude private environment files.
- `package.json`: dependency-free security test commands.
- `tests/security.test.mjs`: credential and Git-exclusion regression checks.
- `tests/README.md`: commands, scope and limitations.
- `docs/phase-1-architecture.md`: correct planned ownership/RLS guidance.
- `docs/security-audit.md`: findings, results and outstanding database tests.
