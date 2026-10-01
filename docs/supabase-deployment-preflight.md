# SUPABASE DEPLOYMENT PREFLIGHT

Date: **2026-10-01, Asia/Kuala_Lumpur**. Repository HEAD: `31890a6626deded965a2a68d07f24c0df03ec56c`.

**DEPLOYMENT READY: YES**, for the three pending repository migrations against **MPIA**, project **`viddikrrhogcebpbstti`**, based on the fresh checks below. The two recorded migrations must remain skipped. This assessment does not mean deployment was performed.

Read `PROJECT_RULES.md`, `AGENTS.md`, the previous preflight, and the configuration-repair report. Re-read all five migration files and repeated live metadata, migration-history, privilege, data-integrity and anonymous API checks. No migrations were applied, migration history repaired, application rows changed, policies changed, or legacy fields removed. No other project's database was queried. No credentials or application record contents are included in the evidence.

Fresh schema snapshot: **21:47:32 MYT** (`2026-10-01T13:47:32.962540Z`). Fresh ledger/data/privilege snapshot: **21:50:54 MYT** (`2026-10-01T13:50:54.071843Z`). Both SQL transactions explicitly used `REPEATABLE READ READ ONLY` and returned `transaction_read_only = on`. Both commands selected `--linked --project-ref viddikrrhogcebpbstti` from the repaired repository configuration and exited successfully. These are fresh results, not reused historical counts.

## Migration classifications

| Repository migration | Classification | Current evidence and deployment effect |
| --- | --- | --- |
| `20260919043352_7772cf3d-825c-4ac1-8812-fcd953b116b8.sql` | **ALREADY APPLIED — SKIP** | Recorded in the live ledger. Its seven tables, ownership policies, foreign keys, unique constraints and triggers exist, with subsequent changes accounted for. Direct replay would fail on existing objects; it is not a pending migration. |
| `20260919043419_c5274c00-7154-486e-ac66-4048fbc8df1b.sql` | **ALREADY APPLIED — SKIP** | Recorded in the live ledger. `owns_property` is security-invoker and direct execution of both trigger functions is denied to ordinary API roles. |
| `20260921000000_restrict_application_table_privileges.sql` | **SAFE TO APPLY** | Missing from the ledger, but its privilege restrictions are already effective. All 42 effective anon/authenticated TRUNCATE, REFERENCES and TRIGGER checks are false. Repeating the scoped revocations is safe and does not change rows. |
| `20260921010000_reconcile_property_cost_columns.sql` | **SAFE TO APPLY** | Missing from the ledger, but all target columns and four property enum checks already exist. Neither conditional rename executes. All 28 non-negative cost protections exist under alternative names; this file will add duplicate-equivalent checks using repository names. Fresh data passes. |
| `20260924000000_phase1_financing_integrity.sql` | **SAFE TO APPLY** | Missing from the ledger. All eight financing additions already exist with compatible definitions, but all 62 generated range-constraint names are absent. The file adds those checks. Fresh scans found zero violations across all 62 affected numeric/integer columns. |

**REQUIRES DATA REVIEW: none. BLOCKED: none among the pending migrations.** These classifications replace the previous report's replay-oriented labels for the first two files: recorded migrations are classified as already applied and skipped.

The complete live ledger contains only `20260919043352` and `20260919043419`, with 69 and three stored statements respectively. Exactly three local versions are unrecorded: `20260921000000`, `20260921010000`, `20260924000000`; no extra remote versions were found. **Missing ledger entries were not treated as proof of absent schema effects.** The current schema is ahead of its migration ledger. No history repair is needed to establish the safety findings above, and none was performed. Historical statement hashes are retained; byte-for-byte equivalence of stored statement arrays to current files is not asserted.

## Required checks

| Check | Fresh result |
| --- | --- |
| 1. Supabase CLI configuration parses | **PASS.** CLI 2.117.0 consumed the repaired configuration. Local `status --output json` reached the container lookup for `supabase_db_viddikrrhogcebpbstti`; its exit 1 means that local container does not exist, not a parse failure. Both remote query commands exited 0. |
| 2. Repository linked to MPIA | **PASS.** `.temp/project-ref` is `viddikrrhogcebpbstti`; linked-project cache names MPIA and agrees with the pooler reference. Config `project_id`, both local environment IDs/URLs/public keys, and the active external client agree. No Supabase process-environment overrides were present. Remote SQL explicitly targeted this reference. |
| 3. Current migration history | **PASS.** Two recorded versions and three pending versions, as detailed above. |
| 4. Current live schema | **PASS.** All 129 expected columns match name, type, nullability and default. Seven application tables; no extra public tables or views. |
| 5. Current constraints | **PASS with documented drift.** All 55 existing constraints are validated. The pending SQL adds 28 duplicate-equivalent cost checks and 62 named range checks. |
| 6. Current RLS policies | **PASS.** RLS enabled on all seven tables; exactly 28 authenticated ownership policies, with expressions checked. |
| 7. Current grants/privileges | **PASS.** Authenticated CRUD retained; all 42 ordinary-role TRUNCATE/REFERENCES/TRIGGER checks denied; direct trigger-function execution denied. |
| 8. Existing rows versus pending constraints | **PASS.** All 62 range and four enum violation counts are zero. Bounded-range scans also establish compatibility with all 28 non-negative cost checks. |
| 9. Ownership/foreign-key integrity | **PASS.** All 19 null-owner/parent, orphan and duplicate checks are zero. |
| 10. Legacy-field population | **PASS.** All 16 retained legacy financial fields have zero non-null values, including explicit zero. |
| 11. Destructive operations in pending migrations | **PASS.** Manual review of all pending statements and dynamic SQL found no row rewriting/deletion, object dropping, truncation or destructive type conversion. |

The previously reported configuration and target-ambiguity blockers are resolved. No isolated replacement configuration was used for this preflight. `project_id` is a local identifier; the saved remote link and explicit remote query target were verified separately.

## Schema, constraints and security details

| Table | Expected/live columns | Current rows |
| --- | ---: | ---: |
| `profiles` | 5 / 5 | 2 |
| `properties` | 34 / 34 | 3 |
| `acquisition_costs` | 22 / 22 | 1 |
| `operating_expenses` | 26 / 26 | 1 |
| `financing` | 19 / 19 | 1 |
| `investment_criteria` | 13 / 13 | 0 |
| `scenario_configs` | 10 / 10 | 0 |

No column is missing, extra or differently defined. `properties.project_name` and `full_address` exist; `name` and `address` do not. All 19 property, 11 acquisition, 14 operating-expense and eight financing additions already exist. Financial numeric fields remain nullable without zero defaults. The two financing flags are non-null booleans defaulting to false.

All seven primary keys, seven foreign keys and five uniqueness constraints match the ownership model and are validated. Each acquisition/expense/financing child is unique by property, criteria are unique by user, and scenario names are unique within a user. All four property enum checks match the migration values. No same-name, wrong-definition check was found among the checks the pending SQL would skip.

All 28 existing `acq_*_non_negative` and `opex_*_non_negative` definitions were compared with the intended expressions. The reconciliation migration checks names, so it will add redundant checks without removing these protections. All 62 generated range checks are absent by their expected names: 11 properties, 18 acquisition, 22 operating expenses and 11 financing. Four older financing checks remain compatible; they overlap some new checks but do not collectively provide their complete coverage and upper bounds.

The aggregate range scan uses the migration's exact bounds: LTV/deposit percentages 0–100, interest rates 0–30, loan years 1–50, room/car counts 0–50, floors 1–200, built-up area at least 1, lease expiry 1900–3000, completion year 1900–2100, and the general financial bound 0–90071992547409.91. NULL stays allowed. PostgreSQL bounded comparisons reject NaN/infinities. The live numeric/integer column inventory matches the 62 scanned columns.

All 15 live indexes are valid and ready. The additional `properties_user_id_updated_at_idx` is compatible and preserved. Seven update triggers and the signup/profile trigger are present and enabled.

All policies are authenticated SELECT/INSERT/UPDATE/DELETE ownership policies. Profiles constrain `id = auth.uid()`; properties, criteria and scenarios constrain `user_id = auth.uid()`; children use `owns_property(property_id)`. INSERT checks new ownership, and UPDATE checks both existing and resulting ownership. No additional permissive policy exists.

`owns_property` is security-invoker with `search_path=public` and checks the parent owner. `handle_new_user` remains security-definer for signup. Anon/authenticated cannot directly execute `handle_new_user` or `set_updated_at`. Both ordinary API roles lack superuser and RLS-bypass privileges; service-role bypass and administrative table privileges remain expected.

Anon and authenticated retain table-level CRUD grants; RLS restricts row access. All 42 effective anon/authenticated TRUNCATE/REFERENCES/TRIGGER privileges are false. Service-role privileges are preserved. Fresh anonymous GET requests returned zero rows on all seven tables, and missing/invalid auth tokens returned 401/403 respectively. These read-only checks do not substitute for a two-user write test; no users or fixtures were created.

## Data compatibility and legacy population

The fresh administrative scan covered all rows and returned **108 aggregate checks**: seven row counts, 62 range checks, four enum checks, 16 legacy-population checks and 19 ownership/uniqueness checks. Every violation/population count is zero. No API pagination or anonymous visibility was used to determine these counts.

| Table | Legacy fields checked with `IS NOT NULL` |
| --- | --- |
| `acquisition_costs` | `legal_fees`, `stamp_duty`, `agent_fee`, `other_costs` |
| `operating_expenses` | `management_fee_monthly`, `maintenance_monthly`, `sinking_fund_monthly`, `quit_rent_annual`, `assessment_annual`, `insurance_annual`, `utilities_monthly`, `other_monthly` |
| `financing` | `purchase_price`, `deposit_percent`, `deposit_amount`, `interest_rate_percent` |

No financial backfill or conversion is required by this snapshot. Shared current fields, such as valuation/renovation/furnishing costs and loan amount, were not incorrectly labelled legacy. NULL inputs remain unknown. Fresh catalog sections, ledger hashes, aggregate counts, privileges and indexes match the earlier evidence apart from snapshot times; this does not assert that individual row values have never changed.

## Pending operations and practical limits

No pending file contains INSERT/UPDATE/DELETE of application rows, TRUNCATE, DROP TABLE, DROP COLUMN, or type conversions. `REVOKE TRUNCATE` removes a privilege; it does not truncate a table. Pending operations consist of scoped privilege revocations, guarded column additions, guarded property-column renames, added checks, and API schema-reload notifications. All legacy columns remain.

The rename branches and added-column defaults do not execute against this schema because their target columns already exist. No current application value change is expected. Existing checks are preserved. Direct replay of the initial migration would fail on existing objects and must remain skipped.

Constraint additions require validation and table locks. No migration execution, lock-contention test, or rolled-back live DDL/fixture test was performed. Concurrent data/schema changes after this snapshot can alter readiness; repeat affected checks if deployment is delayed or data changes. Generated TypeScript database types remain an existing maintenance warning, not a missing-live-column finding.

## Validation and retained evidence

- Fresh `npm test`: **942 application tests across 31 files and six security checks passed**, zero failures/skips. Browser security checks used the existing `.output/public` build; no new build was required for report-only work.
- Both fresh read-only SQL queries succeeded; all 108 aggregate checks completed.
- Nine fresh anonymous/auth-token API checks passed.
- Column, constraint-expression, ownership-policy-expression, privilege and configuration comparisons passed.
- `git diff --check` passed. No application code, migrations or configuration were changed during this preflight; the user's existing configuration repair remains intact. No commit or push was made.

Updated artifacts: this report and [machine-readable evidence](supabase-deployment-preflight-evidence.json). Existing reviewed [metadata SQL](supabase-deployment-preflight-metadata.sql) and [ledger/data SQL](supabase-deployment-preflight-data.sql) were rerun unchanged. Evidence includes full schema/security metadata, aggregate counts, migration file hashes, live ledger hashes, API outcomes and fresh target/configuration verification.

DEPLOYMENT READY: YES
