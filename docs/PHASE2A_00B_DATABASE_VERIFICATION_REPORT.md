# Phase 2A-00B — Database verification report

Date: 12 October 2026 (Asia/Kuala_Lumpur). Recommendation: **BLOCKED for implementation**.

This is a repository verification and proposed design, not a database deployment approval. No live SQL results were obtained in this task. The companion [foundation specification](PHASE2A_01_FOUNDATION_SCHEMA_SPEC.md) is concrete but conditional on live evidence and the decisions in the [decision register](PHASE2A_00B_DECISION_REGISTER.md).

## 1. Evidence and status rules

- **VERIFIED:** directly inspected evidence establishes the stated, bounded claim.
- **FAILED:** an executed check or readiness condition demonstrably does not meet its stated requirement.
- **NOT VERIFIED:** evidence is missing, historical only, not executed, or insufficient. This is not a proven database defect.
- **NOT APPLICABLE:** outside this task or deliberately absent from the proposed 2A-01 scope.

Read: `AGENTS.md`, `PROJECT_RULES.md`, [Phase 1 freeze](PHASE1_ARCHITECTURE_FREEZE.md), [Phase 2 plan revision 1.0](PHASE2_ARCHITECTURE_PLAN.md), all five repository migrations, generated types, active external client and property access code, database/security test procedures, and historical deployment results. The owner supplied the **Phase 2A-00 Readiness Summary Report, 12 October 2026** in this conversation. The external `PHASE2A_00_CODEX_READINESS_AUDIT_PROMPT.md` is an instruction document, not its findings. The present request authorizes these documentation files despite the earlier audit prompt's no-file-output restriction.

The supplied findings report 1,073 tests, three TypeScript checks, five source-security checks, and PostGIS 3.3.7 in `extensions`. This task independently repeated the local tests. The original PostGIS SQL result was not supplied here: distinguish the prior reported verification from current independently inspected live evidence.

## 2. Verified checkout and current main

| Item | Status | Evidence |
|---|---|---|
| Expected checkout | VERIFIED | `phase2-location-intelligence`, HEAD `934ea702a2ecfdb31c530ea4a33e21a2d55e27d2` |
| Initial working tree | VERIFIED | Clean before this task's documentation |
| Remote feature head | VERIFIED | `git ls-remote` returned the same audited SHA |
| Current remote main | VERIFIED | `4f587b8a7668df04fbfac52e8f1fb31886ae791f`, obtained from GitHub and fetched for inspection |
| Local main | VERIFIED | `72c2b8748d6468747b9784597b8f596e030b0dfb`; stale, not used as current-main evidence |
| Common ancestor | VERIFIED | `72c2b8748d6468747b9784597b8f596e030b0dfb`; feature has 3 unique commits, main 11 |
| Frozen source preservation | VERIFIED | No diff from `v0.1-phase1` to audited HEAD for `src`, `tests`, `supabase`, `package.json`, `bun.lock` |
| Branch reconciliation complete | FAILED | Branches differ and no reconciliation decision has been approved; no merge/rebase attempted |

Initial sandbox network access to GitHub failed. An approved read-only `git ls-remote` retry succeeded. `git fetch origin main` refreshed `origin/main` and `FETCH_HEAD`; it did not change HEAD, local main, the working branch, or any remote branch. This report does not claim all Git metadata stayed unchanged.

### Reconciliation inventory

| Main change relative to audited feature HEAD | Required handling before later integration |
|---|---|
| `external-client.ts`, four `src/lib/property/*-fields.ts` files and `tests/database-types/phase1.ts` import `external-types.ts` | Resolve the active external-project type target before any authorized type generation. Main's `external-types.ts` and audited HEAD's `types.ts` have identical Git blob `166d9e30735b9ddeb13165cc358ea978cd107a03`. |
| Main's `types.ts` instead describes older Cloud columns, including `name`/`address` | Do not infer that the live MPIA database lost columns. Main's added `AGENTS.md` instruction says data access uses `external-types.ts`; preserve that distinction if reconciled. |
| Property details route adds inline editing using existing `PropertyForm` and `updateProperty` | Recheck save/cancel, query invalidation, identity switching, and future material-address-change handling. Do not let location failure block this save path. |
| TanStack Router/Start/plugin versions and `bun.lock` changed; root error component uses `ErrorComponentProps` | Re-run typecheck, build and navigation/auth regressions on any later reconciled tree. |
| Both architecture documents absent at main's current tip; latest commit deletes the Phase 2 plan | Obtain an explicit governance decision preserving the authoritative freeze and accepted plan. Absence from main does not authorize ignoring the supplied references. |
| No diff in `supabase/`, protected engine directories or `src/config/`; tests differ only in type import | Repository parity verified for these paths, not proof of main's runtime or live database behavior. |

Recommendation: retain the audited feature baseline for this specification and reconcile main separately, with approval. Do not automatically merge, rebase, cherry-pick or regenerate types.

## 3. Live-access determination

**NOT VERIFIED — no usable approved live catalog connection established.** No Supabase SQL MCP tool is exposed; no `psql` or Supabase CLI is on PATH or in local `node_modules/.bin`; no relevant database/Supabase connection environment variables are present. Docker CLI exists, but a Docker executable is not proof of a running isolated or live target. No dependency installation or database container startup was performed.

The active project identifier in configuration/link metadata is `viddikrrhogcebpbstti`. Cached `linked-project.json` files contain identity metadata (ref/name/organization), not SQL credentials; cached pooler configuration and prior audit outputs are not proof of an authenticated session. No credential values were printed or harvested. The public browser client cannot inspect PostgreSQL catalogs, grants or migration history. The unused generated server admin client expects environment credentials and does not establish an approved backend writer or connection to the correct project.

No Supabase API, provider API or live database query was issued. Historical [deployment results](supabase-deployment-results.md), dated 1 October 2026, establish what was reported then, not current parity. Use the SQL packet below; return actual outputs before changing a live item to VERIFIED.

## 4. Database verification matrix

| Verification item | Repository/historical evidence | Current live status and required evidence |
|---|---|---|
| Applied migration history | VERIFIED: five ordered files listed below; historical deployment reports all five applied | NOT VERIFIED: Q1–Q2, complete ledger and reconciliation of unexpected/missing versions |
| Public/private tables, columns, defaults | VERIFIED: seven public Phase 1 tables and matching generated types; no private application schema in migrations | NOT VERIFIED: Q3; unknown live private schemas must not be assumed absent |
| PK/FK/unique/check constraints | VERIFIED in migration source, including cascade and numeric checks | NOT VERIFIED: Q4 with validation/deferrability and index status |
| RLS enablement and policies | VERIFIED in source: seven enabled tables, 28 authenticated CRUD policies | NOT VERIFIED: Q3/Q5; count alone cannot establish policy equivalence |
| Schema/table/column/function privileges and roles | VERIFIED: explicit authenticated CRUD and service-role grants; later scoped revocations | NOT VERIFIED: Q6/Q7 including inherited/default privileges, schema CREATE and column grants |
| Property ownership | VERIFIED in source: `properties.user_id -> auth.users.id`; child helper below | NOT VERIFIED: live constraints/policies/helper; behavioral A/B isolation belongs in isolated tests |
| Triggers/functions/security definers | VERIFIED in source: update timestamps, signup profile trigger, invoker ownership helper | NOT VERIFIED: Q7 plus locally reviewed/redacted relevant function bodies and any indirect dependencies |
| PostGIS availability, version and schema | Prior owner summary reports VERIFIED: 3.3.7 in `extensions`; repository does not install it | NOT VERIFIED independently/currently: Q8. Do not install or relocate it in 2A-01. |
| Foundation-name collisions | VERIFIED absent in repository migrations/types | NOT VERIFIED live: Q3 must include all four proposed names |
| Existing runtime Phase 2 writer | VERIFIED absent in inspected application use paths | NOT APPLICABLE as an implemented facility; authority must be approved before later activation |
| Live mutation-based checks | No mutation permitted in this task | NOT APPLICABLE here; required later in an isolated environment |

### Migration inventory and expected final behavior

| Version / file suffix | Expected effect |
|---|---|
| `20260919043352_7772cf3d-825c-4ac1-8812-fcd953b116b8.sql` | Seven tables, ownership FKs, unique child rows, authenticated CRUD policies, timestamp/signup functions and triggers |
| `20260919043419_c5274c00-7154-486e-ac66-4048fbc8df1b.sql` | Replaces `owns_property(uuid)` with SECURITY INVOKER; revokes direct public/anon/authenticated execution on signup/timestamp functions |
| `20260921000000_restrict_application_table_privileges.sql` | Revokes TRUNCATE/REFERENCES/TRIGGER from PUBLIC, anon, authenticated on seven tables |
| `20260921010000_reconcile_property_cost_columns.sql` | Renames property identifiers/address, adds current fields, preserves legacy fields and nullable unknowns, validates nonnegative costs and property enums |
| `20260924000000_phase1_financing_integrity.sql` | Current financing fields, 62 bounded numeric checks, no inferred financial values |

`profiles.id`, `properties.user_id`, `investment_criteria.user_id`, and `scenario_configs.user_id` reference `auth.users.id` with cascading deletion. Each of `acquisition_costs`, `operating_expenses`, and `financing` has its own UUID PK and required UNIQUE `property_id -> properties.id ON DELETE CASCADE`. Criteria are unique by user; scenarios by `(user_id, scenario_name)`.

Property policies compare `auth.uid() = user_id`. Child policies call `public.owns_property(property_id)`, whose final definition performs `EXISTS` on `public.properties` matching both ID and `auth.uid()`, is STABLE, SECURITY INVOKER, and sets `search_path = public`. UPDATE policies check both old and new ownership. No team-sharing/transfer model is established.

`public.handle_new_user()` is SECURITY DEFINER, sets `search_path = public`, creates the user's profile and is invoked after insertion on `auth.users`. `public.set_updated_at()` is an invoker trigger function attached to all seven tables. Their direct execution is revoked from ordinary roles in the second migration. Live ownership, search paths and EXECUTE grants still need verification.

## 5. Owner SQL verification packet — metadata only

Run on the **MPIA external project `viddikrrhogcebpbstti`**, not the unused Lovable Cloud database. Use the SQL Editor with an authorized catalog-reading identity. Run each numbered block in one submission; transaction control is read-only and makes no schema/data changes. Return all result sets (including empty sets, errors and total counts); SQL Editor truncation is not completion. Confirm the project ref and execution time separately. Do not return property/user rows, JWTs, connection strings, passwords, migration statement text, or secret-bearing function source.

Queries have not been executed against a database in this task. A denied catalog query means NOT VERIFIED, not PASS. Q1 checks whether Q2's relation exists; skip Q2 and report the result if absent. Other blocks may run independently. Catalog expressions are metadata; review locally for any unusual embedded secret before returning results.

### Q1 — identity and ledger existence

```sql
BEGIN TRANSACTION READ ONLY;
SELECT current_database() AS database_name, current_user AS execution_role,
       current_setting('server_version') AS server_version,
       current_setting('transaction_read_only') AS read_only,
       statement_timestamp() AS captured_at,
       to_regclass('supabase_migrations.schema_migrations') AS migration_ledger;
ROLLBACK;
```

Return the row plus project ref from the dashboard. Database name alone cannot distinguish Supabase projects.

### Q2 — complete migration ledger, without migration SQL

```sql
BEGIN TRANSACTION READ ONLY;
SELECT version, name, cardinality(statements) AS statement_count,
       md5(array_to_string(statements, E'\n')) AS ledger_statements_md5
FROM supabase_migrations.schema_migrations ORDER BY version;
ROLLBACK;
```

Return every row. Compare versions/names against all five files. A ledger entry does not prove the deployed definitions match the repository. The MD5 fingerprints detect changes between captured ledgers; they are **not** repository file SHA-256 hashes or proof of byte-equivalent SQL. Resolve differences using Q3–Q7 and, if necessary, owner-local statement comparison without exporting SQL literals.

### Q3 — tables, views, columns, ownership, RLS and collisions

```sql
BEGIN TRANSACTION READ ONLY;
SELECT n.nspname AS schema_name, c.relname, c.relkind,
       pg_get_userbyid(c.relowner) AS owner,
       c.relrowsecurity, c.relforcerowsecurity, c.reloptions,
       a.attnum, a.attname, format_type(a.atttypid,a.atttypmod) AS data_type,
       a.attnotnull, a.attidentity, a.attgenerated,
       pg_get_expr(d.adbin,d.adrelid) AS default_expression
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
LEFT JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
WHERE n.nspname NOT IN ('pg_catalog','information_schema')
  AND n.nspname !~ '^pg_(toast|temp)'
  AND c.relkind IN ('r','p','v','m','f')
ORDER BY n.nspname,c.relname,a.attnum;
ROLLBACK;
```

This includes public, private and other schemas so unexpected security-relevant objects are visible. Return metadata only; prioritize complete public/private/application-schema rows and flag any omitted platform schema. No values from those tables are selected. Review unexpected views/functions as possible RLS bypass paths before accepting parity.

### Q4 — constraints and indexes

```sql
BEGIN TRANSACTION READ ONLY;
SELECT n.nspname AS schema_name, c.relname, k.conname, k.contype,
       k.convalidated, k.condeferrable, k.condeferred, k.connoinherit,
       pg_get_constraintdef(k.oid,true) AS definition
FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname NOT IN ('pg_catalog','information_schema')
  AND n.nspname !~ '^pg_(toast|temp)'
ORDER BY n.nspname,c.relname,k.conname;
SELECT n.nspname AS schema_name, c.relname, x.relname AS index_name,
       i.indisunique, i.indisprimary, i.indisvalid, i.indisready,
       pg_get_indexdef(i.indexrelid) AS definition
FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid
JOIN pg_class x ON x.oid=i.indexrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname NOT IN ('pg_catalog','information_schema')
  AND n.nspname !~ '^pg_(toast|temp)'
ORDER BY n.nspname,c.relname,x.relname;
ROLLBACK;
```

Return both sets. Compare definitions, referenced schemas, cascade actions, uniqueness and validation, not only constraint names/counts. Missing Phase 1 protections are blockers; do not repair them in this task.

### Q5 — all RLS policies

```sql
BEGIN TRANSACTION READ ONLY;
SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
FROM pg_policies ORDER BY schemaname,tablename,policyname;
ROLLBACK;
```

Return the full policy set. Extra permissive policies can widen access even when all expected policies exist. Compare with Q3's enabled/forced flags.

### Q6 — role attributes, memberships, ACLs and effective API privileges

```sql
BEGIN TRANSACTION READ ONLY;
SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolbypassrls
FROM pg_roles ORDER BY rolname;
SELECT pg_get_userbyid(roleid) AS granted_role,
       pg_get_userbyid(member) AS member_role,admin_option
FROM pg_auth_members ORDER BY 1,2;
SELECT nspname,pg_get_userbyid(nspowner) AS owner,nspacl
FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' ORDER BY nspname;
SELECT n.nspname,c.relname,c.relkind,c.relacl,a.attname,a.attacl
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
LEFT JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0
  AND NOT a.attisdropped AND a.attacl IS NOT NULL
WHERE n.nspname NOT IN ('pg_catalog','information_schema')
  AND n.nspname !~ '^pg_(toast|temp)'
  AND c.relkind IN ('r','p','v','m','f','S') ORDER BY 1,2,5;
SELECT pg_get_userbyid(d.defaclrole) AS creator,
       n.nspname,d.defaclobjtype,d.defaclacl
FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
ORDER BY 1,2,3;
SELECT r.rolname,n.nspname,
       has_schema_privilege(r.oid,n.oid,'USAGE') AS can_use,
       has_schema_privilege(r.oid,n.oid,'CREATE') AS can_create
FROM pg_roles r CROSS JOIN pg_namespace n
WHERE r.rolname IN ('anon','authenticated','service_role','authenticator')
  AND n.nspname NOT IN ('pg_catalog','information_schema')
  AND n.nspname !~ '^pg_(toast|temp)' ORDER BY 1,2;
SELECT r.rolname,n.nspname,c.relname,p.privilege,
       has_table_privilege(r.oid,c.oid,p.privilege) AS allowed
FROM pg_roles r CROSS JOIN pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),
                   ('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(privilege)
WHERE r.rolname IN ('anon','authenticated','service_role','authenticator')
  AND n.nspname IN ('public','private') AND c.relkind IN ('r','p','v','m','f')
ORDER BY 1,2,3,4;
ROLLBACK;
```

Return all seven sets. If Q3 identifies another application schema, repeat the final effective-privileges SELECT with that literal schema added. ACLs include PUBLIC grants; NULL ACLs use defaults and do not mean no access. Role membership and column grants must also be considered. Do not select `pg_authid` or role configuration values that could contain secrets. Inspect any additional inherited custom role with authority over application objects.

### Q7 — triggers and non-extension functions

```sql
BEGIN TRANSACTION READ ONLY;
SELECT n.nspname,c.relname,t.tgname,t.tgenabled,t.tgisinternal,
       t.tgfoid::regprocedure AS function_signature,
       md5(encode(t.tgargs,'hex')) AS trigger_args_md5
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname NOT IN ('pg_catalog','information_schema')
  AND n.nspname !~ '^pg_(toast|temp)' ORDER BY 1,2,3;
SELECT n.nspname,p.oid::regprocedure AS signature,
       pg_get_userbyid(p.proowner) AS owner,p.prokind,p.prosecdef,
       p.provolatile,p.proleakproof,p.proacl,
       (SELECT array_agg(setting) FROM unnest(p.proconfig) setting
         WHERE setting LIKE 'search_path=%') AS search_path,
       md5(p.prosrc) AS source_md5,
       has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS user_execute,
       has_function_privilege('service_role',p.oid,'EXECUTE') AS service_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname NOT IN ('pg_catalog','information_schema')
  AND n.nspname !~ '^pg_(toast|temp)'
  AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass
    AND d.objid=p.oid AND d.deptype='e')
ORDER BY 1,2;
ROLLBACK;
```

Return both sets. In the dashboard, additionally inspect and return **secret-redacted definitions** of `owns_property(uuid)`, `handle_new_user()`, `set_updated_at()`, their triggers (timing/events/WHEN), application views, and any unexpected application/security-definer routine or function reached by a policy/trigger. Include indirect callees and extension routines if referenced. Do not execute those routines. Metadata hashes alone cannot verify function behavior. If a relevant body cannot be safely supplied, its behavior remains NOT VERIFIED; do not replace review with a hash match claim. Redactions must retain authorization logic and object names needed for review.

### Q8 — extension installation and availability

```sql
BEGIN TRANSACTION READ ONLY;
SELECT e.extname,e.extversion,n.nspname AS extension_schema,
       pg_get_userbyid(e.extowner) AS owner,e.extrelocatable
FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace
ORDER BY e.extname;
SELECT name,default_version,installed_version
FROM pg_available_extensions WHERE name IN ('postgis','postgis_topology');
ROLLBACK;
```

Return both sets, including empty results. An available extension is not an installed extension. The prior summary's expected installed result is `postgis / 3.3.7 / extensions`; a different current result requires review, not automatic relocation or installation.

### Evidence acceptance

Q1–Q8 plus relevant reviewed definitions, explicit project confirmation and capture time are required. The reviewer must compare them to repository semantics and document every mismatch. Do not treat seven tables, 28 policies or five ledger entries alone as a pass. Multi-user write behavior remains a separate isolated-test gate even after catalog parity passes. No production data or fixture writes are required for this packet.

## 6. Testing and isolated database strategy

### Executed now at audited HEAD

| Check | Status | Result |
|---|---|---|
| `npm test` | VERIFIED | 1,073 tests / 33 files passed; five security checks passed, one browser-build check skipped |
| `npx --no-install tsc --noEmit` | VERIFIED | Exit 0 |
| `npx --no-install tsc -p tests/fixtures/tsconfig.json` | VERIFIED | Exit 0 |
| `npx --no-install tsc -p tests/database-types/tsconfig.json` | VERIFIED | Exit 0 |
| `git diff --check` | VERIFIED | No whitespace errors |
| Fresh production build, browser asset scan and UI checks | NOT VERIFIED | Not executed; no application change and old build output is not fresh evidence |
| Database migration/fixture tests | NOT VERIFIED | Deliberately not run: scripts contain DDL/DML even when rolled back |
| Live database parity | NOT VERIFIED | No current outputs obtained |

Node was v24.18.0 and npm 12.0.1. Existing installed dependencies were used; no packages installed. Test PASS does not imply production isolation PASS.

### Required after separately approved 2A-01 implementation

Use a disposable local Supabase/PostgreSQL 17 environment, or an explicitly designated isolated Supabase test project if Docker is unavailable. Match the verified live major version, Supabase Auth roles/functions, defaults and relevant grants; do not infer these from local config alone. No production clone containing property/user data. Use synthetic users A/B and synthetic properties. Confirm hostname/project/container identity and empty disposable target before migrations. Do not use a linked production reset/push/test command.

Run two tracks: (1) existing Phase 1 suite on its designated empty-public-schema Docker container, and (2) a separate disposable upgrade fixture applying the five Phase 1 migrations, synthetic Phase 1 rows, then proposed 2A-01 migration. Assert preservation of every Phase 1 object, row and expected output; inspect all security test result rows, not merely exit status. Also test a clean full migration chain. Later PostGIS tests belong to 2A-02.

`node tests/run-phase1-database-audit.mjs` hardcodes `supabase_db_malaysia-property-investment-analyzer`, requires an empty public schema, and writes audit reports. It is not a production verifier and must not be run blindly on an already migrated database. Its migration wrapper picks up all migration files, so review compatibility with four additional empty tables before execution; preserve all original Phase 1 assertions. Use a separate fixture harness for the populated upgrade test and four-table isolation tests; never weaken the empty-schema guard.

Run the frozen `npm test`, all three TypeScript commands above, then `npm run build`; set `SECURITY_AUDIT_BROWSER_ROOT=.output/public` and run `npm run test:security` against the freshly built bundle. No test/fixture expectation changes merely to get a pass. Preserve P01–P10 financial outputs, scenarios, confidence, red flags and recommendations; P08/P09 placeholders remain non-influential. Record exact baseline and implementation SHAs, counts, failures/skips, environment and fixture cleanup. Verify login/logout/account switching, property create/edit/delete, saved assumptions, financial dashboard and missing/error states. With the new tables empty or inaccessible, Phase 1 must continue normally. No provider calls are necessary.

Test rollback only in the disposable target, including interrupted migration atomicity and recovery with Phase 1 data intact. Any later production rollback needs a separately reviewed plan; dropping populated evidence/configuration is not an automatic rollback strategy.

## 7. Readiness recommendation

**BLOCKED.** Local code preservation and regression checks pass. Current live ledger/schema/ownership/grants/functions have not been inspected, the prior PostGIS result needs its original/current evidence attached, concrete scope/security choices need acceptance, branch reconciliation needs a decision, and an isolated database target has not been demonstrated.

GO can be recommended only after the evidence packet is reviewed with discrepancies resolved, the four-table specification and blocking decisions are accepted, and the isolated test target is confirmed. Even a GO recommendation does not authorize implementation; await a separate explicit 2A-01 instruction.

Only the three requested documentation artifacts were created. No migrations, DDL/DML, application changes, generated types, branches, commits, merges, rebases, provider calls or deployments were made. Git remote-tracking metadata was refreshed as disclosed above.
