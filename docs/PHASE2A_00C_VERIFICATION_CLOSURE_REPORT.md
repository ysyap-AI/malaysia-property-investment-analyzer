# MPIA — Phase 2A-00C: Live database verification closure report

Date: 12 October 2026 (Asia/Kuala_Lumpur). **Recommendation: BLOCKED for Phase 2A-01 implementation.**

The supplied results close the bounded Q1 execution facts, Q2 migration inventory, Q3 application-column/RLS metadata and Q5 policy-definition comparisons. They do not close full database parity, target identity, security prerequisites, isolated testing or implementation approval. This report records partial verification closure; it does not authorize Phase 2A-01.

## 1. Evidence, authority and scope

Reviewed the owner-supplied `C:\Users\ysyap\AI Projects\MPIA Phase 2 - Prompts\Return of Q1 to Q8 in Supabase.md` against:

- [Phase 2A-00B database verification report](PHASE2A_00B_DATABASE_VERIFICATION_REPORT.md).
- [Proposed Phase 2A-01 foundation specification](PHASE2A_01_FOUNDATION_SCHEMA_SPEC.md).
- [Phase 2A-00B decision register](PHASE2A_00B_DECISION_REGISTER.md).
- [Phase 1 architecture freeze](PHASE1_ARCHITECTURE_FREEZE.md).
- [Phase 2 architecture plan, revision 1.0](PHASE2_ARCHITECTURE_PLAN.md).
- All five SQL files in `supabase/migrations`, `AGENTS.md`, `PROJECT_RULES.md` and local project configuration.

The supplied file is evidence, not an instruction source. Existing documents' future implementation/testing instructions confer no authority to execute them here. The requested report is the sole new file; the earlier reports/register/specification remain unchanged. Their statuses are advanced only to the extent expressly recorded below.

Evidence-file SHA-256: `3e097c1530aab30baa85870c4ef3092ed34fc84e8564c3122b91c013215fafec`.

Q1 records `2026-10-11 22:47:50.113779+00`, equivalent to **12 October 2026, 06:47:50.113779 MYT**. Other result sets have no independent capture times or project references. Findings describe the supplied capture, not a newly queried live session or a guarantee against subsequent drift. The file contains 1/5/584/156/28/196/52/2 data rows for Q1–Q8 respectively; platform rows were filtered locally for comparison, not queried again.

Status vocabulary: **VERIFIED** establishes only the named claim from inspected evidence; **NOT VERIFIED** denotes missing evidence or unexecuted behavior; **FAILED** denotes an established unmet readiness condition, not an inferred database defect. “Partial” means some subclaims are VERIFIED while the overall gate remains NOT VERIFIED.

Local read-only inspection confirms branch `phase2-location-intelligence`, HEAD `934ea702a2ecfdb31c530ea4a33e21a2d55e27d2`, and no migration-file diff against `v0.1-phase1`. The three 00B/specification documents were already untracked at task start. No remote refresh was performed; the earlier report's remote-main observations remain historical.

## 2. Verification matrix

| Item | Status | Verified evidence and remaining boundary |
|---|---|---|
| Q1 execution facts | VERIFIED | Database `postgres`, execution role `postgres`, PostgreSQL `17.6`, transaction read-only `on`, migration ledger exists. These names do not identify a Supabase project. |
| Intended external project | NOT VERIFIED | Local `supabase/config.toml` identifies `viddikrrhogcebpbstti`; supplied outputs contain no dashboard project ref. Owner must confirm all outputs came from that external project, not Lovable Cloud or a clone. |
| Q2 migration inventory | VERIFIED | Exactly five versions and names match the five frozen files, in order; no missing/extra ledger entry in the supplied result. Counts/hashes are ledger metadata, not deployed-definition or file-hash equivalence. |
| Q3 seven application tables | VERIFIED for column and table flags | All 129 column names, types, nullability and defaults agree with the final migration definitions. All seven are ordinary `public` tables owned by `postgres`, RLS enabled and not forced. No identity/generated columns or relation options reported. Full table compatibility still needs Q4/Q7. |
| Q4 indexes | VERIFIED with disclosed difference | 15 public indexes returned, all valid/ready: expected 7 PK indexes, 5 unique indexes, 2 explicit baseline indexes, plus 1 additional property index. Constraint attachment/validation cannot be inferred solely from index names. |
| Q4 constraints | NOT VERIFIED | Only the index result was supplied. PK/FK/UNIQUE/CHECK definitions, validation, deferrability, inheritance and referential actions are missing. Packet 1. |
| Q5 RLS policy definitions | VERIFIED | All 28 names, tables, commands, authenticated role targets, permissive flags, USING and WITH CHECK expressions match source. No extra policies in the supplied set. Helper implementation and actual A/B isolation remain unverified. |
| Q6 effective table privileges | VERIFIED for seven queried privileges | 196 rows cover 4 roles × 7 tables × 7 privileges; summary below. RLS applicability and schema access are separate. PostgreSQL 17 MAINTAIN was not queried. |
| Q6 remaining security metadata | NOT VERIFIED | Role attributes/membership options, schema/table/column ACL provenance, defaults and effective schema access are absent. Packet 2. |
| Q7 public function security metadata | VERIFIED | Three expected public non-extension functions have the expected owner, security mode, volatility and search path; direct API EXECUTE results detailed below. |
| Q7 bodies and trigger wiring | NOT VERIFIED | No definitions or trigger result set returned. Source hashes cannot replace body review. Packet 3. |
| Q8 installation/version | VERIFIED | `installed_version`, not just `default_version`, is `3.3.7` for both `postgis` and `postgis_topology`. |
| Q8 extension schema/owner | NOT VERIFIED | The `pg_extension` result is missing. Prior “extensions” assertion remains unconfirmed. Packet 4. |
| Four proposed table names | VERIFIED absent from returned table/view inventory | No `location_provider_registry`, `location_fact_definitions`, `location_freshness_policies` or `property_location_intelligence_state` in Q3; no matching index name in Q4. Q3 excludes sequences and standalone types, so unrestricted object-name clearance is NOT VERIFIED. |
| PostgreSQL/PostGIS version compatibility | VERIFIED at documented version level | PostgreSQL 17 matches local major version; PostGIS 3.3.7 release notes explicitly add PostgreSQL 17 support. Actual later spatial migrations, extension access and runtime behavior are NOT VERIFIED. |
| No Phase 1 modification required | VERIFIED as proposed design boundary; live feasibility NOT VERIFIED | The four-table design needs no alteration of existing tables/functions/grants. Missing constraints/helper/ACL evidence prevents a definitive live-readiness conclusion. |
| Isolated migration/isolation testing | NOT VERIFIED | No disposable target or new database tests demonstrated; live catalog evidence does not close D07. |
| Branch/governance/implementation approval | OPEN / BLOCKED | D04/D06 historical failures and unapproved scope/security decisions persist; no reconciliation or implementation authorized. |

## 3. Confirmed repository comparisons

### 3.1 Migration inventory

| Version | Repository / ledger name | Returned statement count |
|---|---|---:|
| `20260919043352` | `7772cf3d-825c-4ac1-8812-fcd953b116b8` | 69 |
| `20260919043419` | `c5274c00-7154-486e-ac66-4048fbc8df1b` | 3 |
| `20260921000000` | `restrict_application_table_privileges` | 1 |
| `20260921010000` | `reconcile_property_cost_columns` | 6 |
| `20260924000000` | `phase1_financing_integrity` | 3 |

Ledger MD5 values were received and retained in the source evidence. They were not compared to file SHA-256 or interpreted as proof that migrations ran unchanged. Applied definitions remain the decisive comparison.

### 3.2 Columns and policies

| Table | Columns | Policy predicate | Matched protections |
|---|---:|---|---|
| `profiles` | 5 | `auth.uid() = id` | Authenticated CRUD; ID required, no generated ID default |
| `properties` | 34 | `auth.uid() = user_id` | Required `user_id` and `project_name`; current address/status fields |
| `acquisition_costs` | 22 | `public.owns_property(property_id)` | Required property link; current and legacy cost columns preserved |
| `operating_expenses` | 26 | `public.owns_property(property_id)` | Required property link; annual and legacy monthly fields preserved |
| `financing` | 19 | `public.owns_property(property_id)` | Required property link; current/legacy fields and two required false-default booleans |
| `investment_criteria` | 13 | `auth.uid() = user_id` | Required user link; nullable configuration inputs |
| `scenario_configs` | 10 | `auth.uid() = user_id` | Required user and scenario name |

For every table SELECT/DELETE use USING, INSERT uses WITH CHECK, and UPDATE uses both old/new-row checks. Schema qualification omitted by catalog deparsing of `owns_property` is not treated as drift. Binding/body safety still depends on Q7 and schema ACLs.

The comparison reconstructed final columns from initial CREATE TABLE definitions, property renames and subsequent ADD COLUMN clauses. It compared each name/type/null/default, not just counts. Financial numeric inputs remain nullable without zero defaults. `country`, rent verification, property status and analysis status defaults match `Malaysia`, `missing`, `prospect`, `not_started`. UUID and timestamp defaults match source. Financing's physical column order differs from a fresh application of the final ADD COLUMN list; `IF NOT EXISTS` permits previously present columns. Name-based shape matches; physical ordering is not byte-for-byte parity or a reason to reorder a frozen table.

### 3.3 Index and missing-constraint reconciliation

The additional live index is:

`public.properties_user_id_updated_at_idx`: nonunique B-tree on `public.properties (user_id, updated_at DESC)`, valid and ready.

It is not declared in the five frozen migrations. It does not change ownership, uniqueness or column semantics and is not an identified foundation blocker. Record it as an unexplained additive index, not exact index parity; its provenance remains unverified. Do not drop it or add a retrospective migration in this task.

Packet 1 must establish the expected seven PKs, seven ownership/child FKs and five UNIQUE constraints. Four FKs reference `auth.users(id)` (`profiles.id`, `properties.user_id`, `investment_criteria.user_id`, `scenario_configs.user_id`); three child `property_id` FKs reference `public.properties(id)`. Frozen FKs specify ON DELETE CASCADE, implicit ON UPDATE NO ACTION, MATCH SIMPLE, and nondeferrable behavior. Do not confuse that with the proposed new state's ON UPDATE RESTRICT.

Also compare the 28 nonnegative-cost protections (equivalent validated legacy names are allowed), four property vocabulary checks, and 62 numeric-range protections: 11 properties, 18 acquisition, 22 operating, 11 financing. Inspect actual expressions and validation, including finite/bounded ranges; a plausible constraint name or ledger entry is insufficient. NULL financial values must remain permitted. Full seven-table constraint compatibility is **NOT VERIFIED**.

## 4. Security observations and ownership-helper assessment

### 4.1 Received effective privileges

These results are identical across all seven Phase 1 tables:

| Role | SELECT / INSERT / UPDATE / DELETE | TRUNCATE / REFERENCES / TRIGGER |
|---|---|---|
| `anon` | All true | All false |
| `authenticated` | All true | All false |
| `authenticator` | All false | All false |
| `service_role` | All true | All true |

**Anon has effective CRUD table privileges, while every received application policy targets authenticated users.** Table grants do not bypass RLS. Assuming anon is neither a bypass/owner identity nor able to assume one, and has no applicable inherited policy role, enabled RLS provides default denial: SELECT/UPDATE/DELETE affect no eligible rows and INSERT is rejected. Those role assumptions and live behavior are **NOT VERIFIED**. PostgreSQL separately evaluates table privileges and row policies; superusers/BYPASSRLS and normally table owners are exceptions. [PostgreSQL 17 row security](https://www.postgresql.org/docs/17/ddl-rowsecurity.html).

The frozen privilege migration revokes TRUNCATE/REFERENCES/TRIGGER and deliberately preserves CRUD; it does not revoke anon CRUD. Therefore this is not evidence of failure to apply that migration. Without ACL/default/membership evidence, the source of anon's grants is unknown. They leave security dependent on correct RLS and increase exposure if a later policy or privileged path is unsafe. Do not describe them as proven anonymous data access, and do not automatically alter Phase 1 grants.

All Phase 1 owners are `postgres`, with FORCE RLS false, consistent with source. That does not establish ordinary-role bypass or require changing Phase 1 to FORCE RLS. Authenticator's false privilege results describe its current effective rights, not roles it can switch to. Q6 must expose transitive membership and PostgreSQL 17 `inherit_option`/`set_option`, not merely `rolinherit` and `admin_option`. [PostgreSQL 17 membership catalog](https://www.postgresql.org/docs/17/catalog-pg-auth-members.html).

For the **new** tables, per-object privilege restriction remains a feasible design direction: authenticated SELECT only; service SELECT-only registries and SELECT/INSERT/UPDATE state; no PUBLIC/anon privileges; trusted release ownership; enabled/forced RLS. Feasibility is not yet verified. Confirm service-role BYPASSRLS rather than assume it from its name, and inspect inherited owner/administrative authority, schema CREATE, defaults, column grants and MAINTAIN. RLS cannot enforce a read-only registry against a bypass role that retains write grants. No global defaults, shared memberships or Phase 1 privileges may be changed to make this design fit; such a requirement is a stop condition for separate review.

### 4.2 Three relevant functions

| Function | Received metadata | Unresolved evidence |
|---|---|---|
| `public.owns_property(uuid)` | `postgres`; SECURITY INVOKER; STABLE; `search_path=public`; not leakproof; PUBLIC/anon/authenticated/service EXECUTE allowed | Actual SQL body, argument/return definition, and caller behavior |
| `public.handle_new_user()` | `postgres`; SECURITY DEFINER; VOLATILE; `search_path=public`; anon/authenticated EXECUTE false, service true; no PUBLIC EXECUTE in ACL | Body and AFTER INSERT trigger on `auth.users` |
| `public.set_updated_at()` | `postgres`; SECURITY INVOKER; VOLATILE; `search_path=public`; anon/authenticated EXECUTE false, service true; no PUBLIC EXECUTE in ACL | Body and seven BEFORE UPDATE row triggers |

The final frozen ownership-helper body returns EXISTS over `public.properties p` where `p.id = _property_id AND p.user_id = auth.uid()`. **From that repository definition**, an authenticated caller with required access gets true only for a visible property whose owner equals its auth UID; another owner's, nonexistent or NULL property ID yields false. No UID cannot satisfy the equality. Invoker mode uses caller permissions and underlying property RLS; insufficient schema/table/function privileges can produce an error instead of false. Even a privileged caller must satisfy the explicit UID predicate; the helper is not a replacement for backend actor validation.

This is verified source reasoning, **not verification of the live body or an executed behavioral test**. The supplied `source_md5` values cannot reveal missing ownership predicates or indirect calls. PUBLIC EXECUTE on an invoker Boolean helper alone is not a demonstrated privilege escalation.

Expected timestamp behavior is `NEW.updated_at = now(); RETURN NEW` on every Phase 1 table before each row UPDATE. Expected signup behavior inserts `(NEW.id, metadata full_name, NEW.email)` into profiles, with ON CONFLICT(id) DO NOTHING, after each auth user INSERT. Direct EXECUTE restrictions do not themselves prove trigger wiring or disable normal trigger invocation. Require enabled state, timing, events, row scope, WHEN, arguments and called function. A writable searched schema is a security concern for these functions, especially the definer; schema trust remains unverified. Do not rewrite existing functions to resolve this evidence gap.

## 5. Architecture compatibility assessment

**Compatible in the inspected design and metadata; not yet ready for implementation.** The foundation uses four empty, separately permissioned tables and two new invoker guards. It preserves financial columns, nullable unknowns, property ownership and the existing helper. No Phase 1 backfill, save trigger, provider call, scoring change or state prerequisite is needed. This follows the freeze and the plan's separate location-evidence architecture.

Q3 contains only the seven Phase 1 public tables and no proposed foundation table/view. Q4 contains no colliding index name; Q7's public non-extension inventory contains only the three existing functions, not the two proposed guards. These close collisions within the received inventories. Complete namespace clearance, including standalone types/sequences and extension-owned routines excluded by Q7, remains **NOT VERIFIED** and requires a narrowly scoped preflight in a separately authorized implementation task. No second broad catalog dump is requested here.

PostgreSQL `17.6` agrees with local `major_version = 17` and supplies the foundation's built-in UUID generator. No UUID extension is required by the proposed `pg_catalog.gen_random_uuid()` default. [PostgreSQL 17 UUID functions](https://www.postgresql.org/docs/17/functions-uuid.html).

Installed PostGIS `3.3.7` is not inherently incompatible with PostgreSQL 17: its official 3.3.7 change list explicitly includes PostgreSQL 17 support. This closes the version-level compatibility question, not installation health or successful later migrations. The release page has an inconsistent introductory version label; this assessment uses its specifically labeled 3.3.7 changes. [PostGIS 3.3.7 release notes](https://postgis.net/2024/09/PostGIS-3.3.7/).

The plan's later geography(Point,4326), GiST and distance/radius work remains conditional on discovered extension schema, ownership/access, and isolated spatial tests. No spatial SQL was executed; no future migration exists here to validate. `postgis_topology` installation does not create a topology dependency for 2A-01. PostGIS is not a dependency of the four nonspatial foundation tables, and this task neither installs, upgrades nor relocates it.

No inspected finding establishes a need to modify existing Phase 1 tables/functions for 2A-01. The stronger claim that the live environment can implement the exact specification without any existing-object change remains **NOT VERIFIED** until constraints, helper/triggers and effective authority are reconciled. If those reveal a defect, stop and review it separately.

## 6. Updated decision status

The owner-approved decisions remain **ARC-01, ARC-02, ARC-03, ARC-04, ARC-05, ARC-06, ARC-08, ARC-09, ARC-10 and ARC-11**, accepted on 11 October 2026 as recorded in plan revision 1.0. They govern bounded evidence, method-specific facts, coverage gates, deferred production scores, lawful retention, separate states, responsibility-based tables, provisional providers, context independence and unresolved metric contracts. No additional approval is inferred from supplying metadata.

| Decision | 00C status | Closure / remaining gate |
|---|---|---|
| D01 live parity | PARTIAL; overall NOT VERIFIED | Close Q1 facts, Q2 inventory, Q3 columns/flags and Q5 definitions. Keep project identity, constraints, role/ACL context and Q7 bodies/wiring open. Disclose extra index. |
| D02 exact implementation scope | NOT VERIFIED / approval open | Four empty tables, two guards and exact implementation deliverables remain a proposal. This review is not scope approval. |
| D03 backend/configuration authority | NOT VERIFIED / approval open | Phase 1 service effective grants now evidenced; role attributes and project identity still missing. Release-only registry writes and future atomic owner-checked backend writes require explicit acceptance. |
| D04 branch baseline/reconciliation | OPEN; prior FAILED condition not closed | Local feature HEAD unchanged. No remote/main re-audit or reconciliation; owner baseline decision still required. |
| D05 external type destination | NOT VERIFIED / decision open | Metadata does not select `types.ts` versus `external-types.ts`; depends on D04 and confirmed external project. No regeneration. |
| D06 architecture-reference preservation | OPEN; prior FAILED condition not closed | No new evidence that main retains authoritative documents; no branch action. |
| D07 isolated database target | NOT VERIFIED | Live metadata is not a disposable test environment or clean-install/upgrade/A/B test. Remains a separate gate. |
| D08 PostGIS | PARTIAL | Close installed 3.3.7 and documented PostgreSQL 17 compatibility. Schema/owner/access still unverified; packet 4 plus scoped schema ACLs. Reproducibility/spatial tests remain before 2A-02. |
| D09 vocabulary/taxonomy refinements | NOT VERIFIED / approval open | Exact finite vocabulary, seconds, knowledge/freshness representation and ARC-07 refinements not approved by metadata. |
| D10 inert state skeleton | NOT VERIFIED / approval open | Exact NOT_STARTED / UNKNOWN / NOT_ASSESSED contract and no future pointers still require acceptance. |
| D11 least-privilege prerequisites | PARTIAL; overall NOT VERIFIED | Owners/RLS flags, seven effective privileges and function metadata received. Role ancestry, schemas/defaults/columns, complete helper safety and precise new-object matrix remain open. No Phase 1 grant changes authorized. |
| D12 provider approval | OPEN, later population/use gate | Empty registries remain proposed; no vendor approval or provider activity. |
| D13 freshness/policy activation | OPEN | Version/pinning recommendation and later actual durations/activation approval remain distinct. |
| D14 later metric contracts | OPEN | No change to unresolved semantics or ARC-11 restrictions. |
| D15 historical pointers/replay | OPEN | Later scope/FKs/lawful history and executable replay still require design. |
| D16 real backend writer | NOT VERIFIED / future gate | No handler or transactional actor authorization demonstrated; table ACLs do not establish it. |
| D17 implementation authorization | NOT GRANTED | Remains blocked by applicable evidence, approvals, baseline and test-target gates; separate explicit instruction required. |

## 7. Outstanding evidence and compact owner SQL packet

**Project confirmation, without another SQL dump:** Confirm that Q1–Q8 were run in the Supabase dashboard project with ref **`viddikrrhogcebpbstti`**, the MPIA external project. Provide the nonsecret dashboard project ref/name and capture time for the follow-up packet, and disclose any intervening schema/security changes. Database name `postgres`, a matching ledger and a role called `postgres` cannot prove project identity. No credentials, JWTs, connection strings, user/property rows or provider payloads are needed.

Run the following **four numbered blocks** only on the confirmed project in an authorized SQL Editor session. Each is metadata-only, wrapped in a read-only transaction, and produces **one result set**, avoiding loss of earlier SELECT results. Return complete results, explicit empty results and errors. A denied query or truncated output stays NOT VERIFIED. The packets are supplied for the owner; none was executed in this task.

Packet 2 consolidates the missing security sets into labeled JSON rows; it does not repeat the 196 effective-table rows. Packet 3 returns definitions as text, not instructions to execute. Review function/trigger definitions locally before sharing: redact only secrets/personal literal values, label every redaction and preserve predicates, object names, argument types, timing and control flow. Do not claim automated secret sanitization. If a redaction prevents semantic comparison, the affected behavior remains NOT VERIFIED.

### 1. Q4 — constraints on the seven application tables

```sql
BEGIN TRANSACTION READ ONLY;
SELECT n.nspname AS schema_name, c.relname, k.conname, k.contype,
       k.convalidated, k.condeferrable, k.condeferred, k.connoinherit,
       rn.nspname AS referenced_schema, rc.relname AS referenced_table,
       k.confupdtype AS update_action, k.confdeltype AS delete_action,
       k.confmatchtype AS match_type,
       CASE WHEN k.conindid <> 0 THEN k.conindid::regclass::text END
         AS supporting_index,
       pg_get_constraintdef(k.oid, true) AS definition
FROM pg_constraint k
JOIN pg_class c ON c.oid = k.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_class rc ON rc.oid = k.confrelid
LEFT JOIN pg_namespace rn ON rn.oid = rc.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('profiles','properties','acquisition_costs',
                   'operating_expenses','financing',
                   'investment_criteria','scenario_configs')
ORDER BY c.relname, k.contype, k.conname;
ROLLBACK;
```

FK action codes: `a` NO ACTION, `r` RESTRICT, `c` CASCADE, `n` SET NULL, `d` SET DEFAULT; match `s` SIMPLE. Non-FK action fields are not applicable. This deliberately does not repeat the received index inventory.

### 2. Q6 — scoped roles, memberships, ACLs, defaults and schema access

```sql
BEGIN TRANSACTION READ ONLY;
WITH RECURSIVE
app AS (
  SELECT c.* FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('profiles','properties','acquisition_costs',
                     'operating_expenses','financing',
                     'investment_criteria','scenario_configs')
),
ns AS (
  SELECT * FROM pg_namespace
  WHERE nspname IN ('public','auth','extensions')
     OR oid IN (SELECT extnamespace FROM pg_extension
                WHERE extname IN ('postgis','postgis_topology'))
),
defaults AS (
  SELECT d.* FROM pg_default_acl d
  WHERE d.defaclnamespace = 0
     OR d.defaclnamespace = (SELECT oid FROM pg_namespace WHERE nspname='public')
),
seed(oid) AS (
  SELECT oid FROM pg_roles
  WHERE rolname IN ('anon','authenticated','service_role','authenticator',
                    'postgres','supabase_auth_admin',current_user)
  UNION SELECT relowner FROM app
  UNION SELECT nspowner FROM ns
  UNION SELECT defaclrole FROM defaults
),
ancestry(oid) AS (
  SELECT oid FROM seed
  UNION
  SELECT m.roleid FROM pg_auth_members m JOIN ancestry a ON a.oid=m.member
),
result AS (
  SELECT 'role_attributes'::text AS section, r.rolname::text AS object,
         jsonb_build_object('superuser',r.rolsuper,'inherit',r.rolinherit,
           'create_role',r.rolcreaterole,'create_database',r.rolcreatedb,
           'login',r.rolcanlogin,'bypass_rls',r.rolbypassrls) AS metadata
  FROM pg_roles r JOIN ancestry a ON a.oid=r.oid
  UNION ALL
  SELECT 'membership', pg_get_userbyid(m.member)::text,
         jsonb_build_object('granted_role',pg_get_userbyid(m.roleid),
           'grantor',pg_get_userbyid(m.grantor),'admin',m.admin_option,
           'inherit',m.inherit_option,'set_role',m.set_option)
  FROM pg_auth_members m JOIN ancestry a ON a.oid=m.member
  UNION ALL
  SELECT 'schema_acl', n.nspname::text,
         jsonb_build_object('owner',pg_get_userbyid(n.nspowner),
                            'acl',n.nspacl)
  FROM ns n
  UNION ALL
  SELECT 'table_acl', c.relname::text,
         jsonb_build_object('owner',pg_get_userbyid(c.relowner),
                            'acl',c.relacl)
  FROM app c
  UNION ALL
  SELECT 'column_acl', c.relname::text || '.' || a.attname::text,
         jsonb_build_object('acl',a.attacl)
  FROM app c JOIN pg_attribute a ON a.attrelid=c.oid
  WHERE a.attnum>0 AND NOT a.attisdropped AND a.attacl IS NOT NULL
  UNION ALL
  SELECT 'column_acl_summary', 'seven_application_tables',
         jsonb_build_object('explicit_column_acl_count',count(*))
  FROM app c JOIN pg_attribute a ON a.attrelid=c.oid
  WHERE a.attnum>0 AND NOT a.attisdropped AND a.attacl IS NOT NULL
  UNION ALL
  SELECT 'default_privilege', pg_get_userbyid(d.defaclrole)::text,
         jsonb_build_object('schema',COALESCE(n.nspname::text,'GLOBAL'),
                            'object_type',d.defaclobjtype,'acl',d.defaclacl)
  FROM defaults d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
  UNION ALL
  SELECT 'default_privilege_summary', 'public_and_global',
         jsonb_build_object('row_count',count(*)) FROM defaults
  UNION ALL
  SELECT 'effective_schema_access', r.rolname::text || '.' || n.nspname::text,
         jsonb_build_object('usage',has_schema_privilege(r.oid,n.oid,'USAGE'),
                            'create',has_schema_privilege(r.oid,n.oid,'CREATE'))
  FROM pg_roles r CROSS JOIN ns n
  WHERE r.rolname IN ('anon','authenticated','service_role','authenticator',
                      'postgres','supabase_auth_admin',current_user)
)
SELECT section, object, metadata FROM result ORDER BY section, object, metadata::text;
ROLLBACK;
```

Membership traversal includes reachable parent roles even where inheritance is disabled, so SET ROLE paths can be reviewed. BYPASSRLS/superuser attributes are not automatically inherited like ordinary object grants; analyze the returned options and actual assumable identity. NULL ACL means PostgreSQL defaults, not “no privilege”; zero column ACL rows means no separate column ACLs, not absence of table-derived column rights. All global/public default creators are included to avoid assuming which identity will create future objects. This is narrowly scoped application/security metadata, not a platform table/function dump. Unexpected custom grantees or indirect dependencies require targeted review, not an automatic PASS.

### 3. Q7 — relevant definitions and trigger wiring

```sql
BEGIN TRANSACTION READ ONLY;
WITH f AS (
  SELECT p.* FROM pg_proc p
  WHERE p.oid IN (to_regprocedure('public.owns_property(uuid)'),
                  to_regprocedure('public.handle_new_user()'),
                  to_regprocedure('public.set_updated_at()'))
),
tr AS (
  SELECT t.*, n.nspname, c.relname
  FROM pg_trigger t
  JOIN pg_class c ON c.oid=t.tgrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE NOT t.tgisinternal
    AND ((n.nspname='public' AND c.relname IN
           ('profiles','properties','acquisition_costs','operating_expenses',
            'financing','investment_criteria','scenario_configs'))
         OR (n.nspname='auth' AND c.relname='users')
         OR t.tgfoid IN (SELECT oid FROM f))
),
result AS (
  SELECT 'function_definition'::text AS section,
         f.oid::regprocedure::text AS object,
         jsonb_build_object('language',l.lanname,
           'return_type',pg_get_function_result(f.oid),
           'definition',pg_get_functiondef(f.oid)) AS metadata
  FROM f JOIN pg_language l ON l.oid=f.prolang
  UNION ALL
  SELECT 'trigger_wiring', format('%I.%I.%I',t.nspname,t.relname,t.tgname),
         jsonb_build_object('enabled',t.tgenabled,
           'function',t.tgfoid::regprocedure::text,
           'argument_count',t.tgnargs,
           'definition',pg_get_triggerdef(t.oid,true))
  FROM tr t
  UNION ALL
  SELECT 'summary','relevant_objects',
         jsonb_build_object('function_count',(SELECT count(*) FROM f),
                            'trigger_count',(SELECT count(*) FROM tr))
)
SELECT section, object, metadata FROM result ORDER BY section, object;
ROLLBACK;
```

Expected baseline: three functions and eight noninternal application triggers (seven timestamp triggers and `on_auth_user_created`), normally `tgenabled = 'O'`. Additional platform triggers on `auth.users` may appear and must be distinguished from application drift. The trigger definition exposes events/timing/row scope/arguments; redact locally if needed before returning. Internal FK triggers are covered by constraint metadata in packet 1. Unexpected functions called by returned definitions remain NOT VERIFIED pending a narrow follow-up; no platform-wide source dump is requested.

### 4. Q8 — installed PostGIS extension schema and ownership

```sql
BEGIN TRANSACTION READ ONLY;
SELECT e.extname, e.extversion, n.nspname AS extension_schema,
       pg_get_userbyid(e.extowner) AS owner, e.extrelocatable
FROM pg_extension e
JOIN pg_namespace n ON n.oid=e.extnamespace
WHERE e.extname IN ('postgis','postgis_topology')
ORDER BY e.extname;
ROLLBACK;
```

Return both rows or explicit absence/error. Reconcile against received installed version `3.3.7`; do not rerun the available-extension listing. Schema/access evidence supports later design qualification but does not execute PostGIS or certify future spatial migrations.

## 8. Validation performed and final gate

Performed local, read-only comparisons of the supplied Markdown tables with all five migration definitions: migration version/name equality; all 129 column definitions; all 28 policy definitions; public index inventory; role/privilege matrix completeness; function metadata; and name absence within returned inventories. Checked frozen migration preservation and report SQL/Markdown structure. No live query, function invocation, migration replay, DDL/DML test or spatial operation was run. The SQL packet was statically reviewed, not database-executed.

Application tests/build/type generation were not rerun for this report-only task. The 00B test results remain historical evidence, not new 00C results. Database and application acceptance tests remain required under a separately authorized implementation task; no production mutation-based test is appropriate here.

**Final recommendation: BLOCKED.** To reconsider readiness, obtain project confirmation and packets 1–4, reconcile any discrepancies, resolve the complete namespace preflight at the appropriate gate, record explicit scope/security/vocabulary/state approvals, choose the source/type baseline and architecture-document preservation path, and demonstrate a disposable database test target. Metadata closure does not close branch reconciliation, isolated testing or D17. D08's later spatial tests remain a 2A-02 gate rather than an invented spatial dependency of 2A-01.

Only this report was created. No application/source/migration edits, database access or changes, permission changes, Git branch/index/history/remote updates, merges, deployments or location-provider calls were made. Public PostgreSQL/PostGIS documentation was read to check database semantics and version compatibility. Stop here: **Phase 2A-01 implementation is not authorized.**
