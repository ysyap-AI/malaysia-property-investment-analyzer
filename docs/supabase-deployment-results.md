# MPIA deployment results

**LIVE DATABASE STATUS: PASS**

Deployed on 2026-10-01 to **MPIA**, project **`viddikrrhogcebpbstti`** only. Post-deployment snapshots completed at 22:26 MYT. Read `PROJECT_RULES.md`, `AGENTS.md`, and the successful deployment preflight before proceeding.

## Migrations

Applied these approved pending repository migrations in chronological order using Supabase CLI 2.117.0's normal migration mechanism:

1. `20260921000000_restrict_application_table_privileges.sql`
2. `20260921010000_reconcile_property_cost_columns.sql`
3. `20260924000000_phase1_financing_integrity.sql`

All succeeded. The CLI command used `db push --linked --project-ref viddikrrhogcebpbstti --skip-vault --yes`. A preceding dry run listed exactly these three files. No seeds, custom roles, vault updates, resets, force commands, history repair, application data manipulation, table drops, column removals or weakened constraints were performed.

The following recorded migrations were **skipped**, and their stored statement counts and hashes remain unchanged:

- `20260919043352_7772cf3d-825c-4ac1-8812-fcd953b116b8.sql`
- `20260919043419_c5274c00-7154-486e-ac66-4048fbc8df1b.sql`

The ledger now contains exactly these five repository versions. The three newly applied entries contain 1, 6 and 3 statements respectively. No migration-history entries were fabricated.

## Preflight refresh

The working reconciliation migration had changed since the successful preflight. Its current SHA-256 is `3ca76ec520e23ab297f0687e5d384405d7ccb36523923d33a7c6a12822a3f6b5`; the preflight recorded `b196b5ba2df20b5d97aecccd4ef5028395d502c59e5f807b14d1b314918f075c`. The other four file hashes match that preflight.

Reviewed the existing change and revalidated its safety before deployment. It reuses validated, equivalent non-negative checks by canonical expression, and fails if an expected name conflicts without equivalent protection. Fresh live checks confirmed all 28 exact equivalent expressions, validation status and inheritance scope. The revised file therefore remains **SAFE TO APPLY** and adds no redundant cost checks. No migration source was edited during this deployment.

Fresh read-only schema, ledger, privilege and data snapshots matched the successful preflight. All 108 aggregate checks passed: seven row counts and zero violations across 62 numeric bounds, four enums, 16 legacy-field population checks and 19 ownership/uniqueness checks. The report's older prediction of 28 duplicate checks is superseded by the reviewed working-file change.

## Post-deployment verification

| Check | Result |
| --- | --- |
| Migration ledger | PASS: exactly five repository versions; original two entries unchanged. |
| Table/column parity | PASS: seven tables, 129 columns; names, types, nullability and defaults unchanged and matching the verified preflight. |
| Numeric constraints | PASS: all 62 new bounded checks present, validated and matched to the exact intended bounds. |
| Existing constraints | PASS: all original 55 constraints preserved, including original check identities; 117 validated constraints in total. |
| RLS | PASS: enabled on all seven application tables. |
| Ownership policies | PASS: exactly 28 authenticated CRUD policies; each USING/WITH CHECK expression matches the repository ownership rules. UPDATE checks both existing and resulting ownership. |
| Roles, functions, grants | PASS: ordinary roles cannot bypass RLS; `owns_property` remains security-invoker; direct trigger-function execution denied. All 42 ordinary-role TRUNCATE/REFERENCES/TRIGGER privileges denied; authenticated CRUD retained. |
| Anonymous denial | PASS: seven live API reads returned no rows; missing/invalid authentication returned 401/403. Seven SQL role checks also returned no visible rows. |
| Authenticated ownership | PASS: 21 read-only role checks, covering both existing users and a nonexistent subject across seven tables. Each visible ID set exactly matched the administrative owner-filtered set. |
| Application-row preservation | PASS: row counts, aggregate content hashes, and hashes of physical tuple versions/locations are identical before and after. |
| Ownership integrity | PASS: all 19 null-owner/parent, orphan and duplicate checks remain zero. |
| Legacy fields | PASS: all retained; the 16 legacy-population checks remain zero. |
| Indexes/triggers | PASS: definitions and enabled/valid states unchanged. |

Row fingerprints bracket deployment at `2026-10-01T14:20:17.838762Z` and `2026-10-01T14:26:04.198408Z`. They cover all application columns and rows without exporting record contents. Auth user count remains two.

| Table | Before | After |
| --- | ---: | ---: |
| profiles | 2 | 2 |
| properties | 3 | 3 |
| acquisition_costs | 1 | 1 |
| operating_expenses | 1 | 1 |
| financing | 1 | 1 |
| investment_criteria | 0 | 0 |
| scenario_configs | 0 | 0 |

Ownership checks used read-only transactions and existing users. No live INSERT/UPDATE/DELETE fixtures, account creation, password-login or browser-authentication tests were run. Write ownership rules were verified through exact policy expressions, effective privileges, role attributes and function definitions; they were not exercised by modifying live rows. Empty criteria/scenario tables have policy verification but no positive existing-row visibility control. Fingerprints demonstrate unchanged snapshots, not continuous monitoring of unrelated concurrent activity.

## Tests and artifacts

- `npm test`, with `SECURITY_AUDIT_BROWSER_ROOT=.output/public`: **942 application tests across 31 files and six security checks passed**, zero failures/skips.
- Fresh read-only live metadata, data, preservation and ownership checks passed.
- Nine anonymous/auth-token API checks passed.
- `git diff --check` passed.

Added this report and [machine-readable deployment evidence](supabase-deployment-results.json). The evidence contains before/after metadata, aggregate fingerprints, migration hashes, full ledger summaries and live API outcomes. Supporting scripts/logs are retained in ignored `.deployment-audit.local/`. Existing working-tree changes and prior preflight artifacts were preserved. No commit or push was made.

LIVE DATABASE STATUS:
PASS
