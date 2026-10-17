# MPIA — Phase 2A-01 PREP: final readiness report

Date: 13 October 2026 (Asia/Kuala_Lumpur). **Final recommendation: BLOCKED for implementation.** Catalog closure is accepted and the checkout exactly matches the audited baseline. Final design/baseline decisions, a prepared separate upgrade-test target and explicit implementation authorization remain open. No implementation has begun.

## 1. Gate outcome and authority

| Readiness dimension | Outcome | Meaning / remaining gate |
|---|---|---|
| Catalog/schema | **VERIFIED for supplied snapshot; D01 CLOSED** | Owner confirms external project and accepts Parts A/B. Behavioral tests and execution-time drift/namespace checks remain separate. |
| Architecture/design | **Ready for final review; OWNER APPROVAL REQUIRED** | Four-table boundary preserves the freeze and ten reconciliations. Proposed specification 1.1 resolves the three refinements; D02/D09/D10/D11 still require final acceptance. |
| Repository baseline | **Exact match VERIFIED; selection OWNER APPROVAL REQUIRED** | Branch/HEAD match recommended baseline, with no tracked source drift. D04 recommendation is not owner selection. Main remains unreconciled for later integration. |
| Isolated test environment | **Partially VERIFIED; overall BLOCKED** | Existing empty PG17/Auth base fits frozen Phase 1 track. Separate populated-upgrade target, fixtures and new test runners need authorized setup; D07 remains open. |
| Implementation authorization | **NOT GRANTED / OWNER APPROVAL REQUIRED** | D17: this request explicitly prohibits implementation. Even design acceptance alone cannot start it. |

Read the seven authoritative references: [Phase 1 freeze](PHASE1_ARCHITECTURE_FREEZE.md), [Phase 2 plan revision 1.0](PHASE2_ARCHITECTURE_PLAN.md), [00B verification](PHASE2A_00B_DATABASE_VERIFICATION_REPORT.md), [foundation specification](PHASE2A_01_FOUNDATION_SCHEMA_SPEC.md), [decision register](PHASE2A_00B_DECISION_REGISTER.md), [00C closure](PHASE2A_00C_VERIFICATION_CLOSURE_REPORT.md), and [compiled Q1–Q8](MPIA_OWNER_SUPPLIED_Q1_Q8_SQL_RESULTS_COMPILED.md). Also inspected AGENTS.md, PROJECT_RULES.md, migrations, client/type imports and test harness sources. Earlier 00B/00C findings retain their historical dates; this report/register advance their open statuses only where new evidence or explicit owner instruction supports closure.

The freeze protects deterministic finance, scenarios, investment scoring, confidence, red flags, recommendations, missing-versus-zero semantics, saved inputs, ownership/authentication and reproducibility. None may change through foundation implementation. Location intelligence remains separate and optional. No combined score, activation of reserved confidence factors, provider-triggered assumption changes or requirement for a state row to save/analyze a property.

## 2. D01 — catalog verification closed

**VERIFIED / CLOSED for the supplied catalog snapshot**, as expressly accepted by the owner in this PREP request. All Q1–Q8 evidence is confirmed to originate from external MPIA project **`viddikrrhogcebpbstti`**. No external database connection/query was made in PREP. Owner confirmation establishes provenance; database name `postgres` alone would not.

Compiled evidence SHA-256: `5258b0e5682a499fcaaf2666e4bbab78e96a5ccbb9df4355d623e052ad696def`. Part A's original-source hash remains in the attachment. Q1 captured **12 October 2026, 06:47:50.113779 MYT** (`2026-10-11 22:47:50.113779+00`). Follow-up result sets lack independent capture timestamps; closure does not assert no subsequent drift.

| Evidence | Closed catalog claim |
|---|---|
| Q1 | PostgreSQL 17.6; database/execution role postgres; transaction read-only on; migration ledger present. |
| Q2 | Five matching version/name records: `20260919043352_7772cf3d-825c-4ac1-8812-fcd953b116b8`, `20260919043419_c5274c00-7154-486e-ac66-4048fbc8df1b`, `20260921000000_restrict_application_table_privileges`, `20260921010000_reconcile_property_cost_columns`, `20260924000000_phase1_financing_integrity`. Ledger hashes do not certify source-byte identity. |
| Q3 | Seven public application tables, 129 matching columns: profiles, properties, acquisition_costs, operating_expenses, financing, investment_criteria, scenario_configs. Owned by postgres; RLS enabled, FORCE false. |
| Q4 + follow-up | Expected seven PKs, seven ownership/child FKs with DELETE CASCADE, five unique constraints, nonnegative and bounded financial checks and property vocabularies. Constraints are validated/nondeferrable; NULL financial inputs stay valid. Existing legacy/equivalent protections are preserved. |
| Q5 | All 28 authenticated CRUD policy definitions match, including old/new ownership checks and child use of owns_property. This verifies definitions, not two-user execution. |
| Q7 + follow-up | Matching `owns_property(uuid)` invoker body, `handle_new_user()` definer body and `set_updated_at()` invoker body/search paths. Eight enabled (`O`) application triggers: signup AFTER INSERT on auth.users plus seven BEFORE UPDATE timestamp triggers. |
| Q8 + follow-up | PostGIS 3.3.7 in extensions; postgis_topology 3.3.7 in topology; both owned by supabase_admin, nonrelocatable. No installation/relocation required or authorized. |

Disclosed differences remain recorded, not silently repaired: the additional valid nonunique `properties_user_id_updated_at_idx` is outside the five migrations; financing physical column ordering differs but name-based shape agrees. Catalog closure is accepted compatibility, not byte-for-byte identity. The four new table names/two guard names are absent from relevant supplied inventories; sequences, standalone types and excluded extension routines still need exact-name preflight before a migration is executed.

Q6 and its follow-up establish:

- `anon` and `authenticated`: non-superuser, no BYPASSRLS; no supplied membership path up to owner/service roles. Both have CRUD and MAINTAIN on existing Phase 1 tables, but no TRUNCATE/REFERENCES/TRIGGER. Existing policies target authenticated users; anon grants alone do not establish row disclosure. No Phase 1 permission changes are authorized here.
- `service_role`: non-superuser with BYPASSRLS and full existing table privileges, including MAINTAIN. `postgres`: non-superuser with BYPASSRLS and trusted owner/administrative authority. `supabase_admin` is superuser/BYPASSRLS.
- `authenticator`: login, NOINHERIT; can SET ROLE to anon/authenticated/service_role, without admin membership rights. Its direct rights are not the rights of its assumed API role.
- API roles have USAGE but no CREATE on public/auth/extensions (also topology in the external snapshot). No separate column ACLs on the seven application tables. Public-schema ownership is pg_database_owner; shared schema authority is not changed.
- Six default-ACL records for postgres/supabase_admin grant broad public table, sequence and function privileges to API roles. The `m` in existing/default table ACLs is PostgreSQL 17 MAINTAIN; the original seven-privilege query did not separately test it. New-object revocations must account for it explicitly.

The snapshot supports the proposed per-object least-privilege design without changing existing Phase 1 objects. This is a design-feasibility conclusion, not certification of new guards, deployed grants, anonymous denial or A/B isolation.

## 3. Branch decision record — BR-2A01-01

**Recommendation retained for this milestone; owner selection remains D04.** Use `phase2-location-intelligence` at **`934ea702a2ecfdb31c530ea4a33e21a2d55e27d2`**. Actual branch and HEAD match exactly. Tracked worktree/index diffs were empty at entry; five supplied PREP/evidence Markdown files were already untracked. Those documentation inputs are disclosed and are not application drift. No commit, switch, merge, rebase, cherry-pick or fetch occurred.

Read-only `git ls-remote` freshly confirmed remote feature at the same SHA and remote main at **`4f587b8a7668df04fbfac52e8f1fb31886ae791f`**; existing origin/main matched, so no remote-tracking refresh was needed. Local main remains `72c2b8748d6468747b9784597b8f596e030b0dfb`. Common ancestor is that local-main SHA; feature has 3 unique commits, main 11.

Retain this audited baseline because src/tests/supabase/package.json/bun.lock have no diff from `v0.1-phase1`, both authoritative architecture documents are present, and its external types/imports and historical regression evidence form a consistent starting point. Combining unrelated dependency/UI/type changes would broaden this narrow schema milestone and invalidate its audit scope. The baseline recommendation is not permission to create a different work branch.

| Newer main change still unreconciled | Future integration requirement |
|---|---|
| Active external client, four property field modules and database type test import external-types.ts; main types.ts describes the separate older Cloud schema | Reconcile all imports together; verify generated types against the intended external schema. Never overwrite the active external types with Cloud types. |
| Property details route inline editing via PropertyForm/updateProperty | Test save/cancel, invalid input, query refresh, failed saves and cross-identity form/cache isolation; later address/location invalidation remains explicit. |
| Router 1.170.18 → 1.170.41, Start 1.168.32 → 1.168.60, router-plugin 1.168.23 → 1.168.42; lockfile and root ErrorComponentProps change | Run all type checks, production build, bundle security, navigation/error recovery and auth regression on the actual proposed integration tree. |
| Both architecture documents absent; tip deletes Phase 2 plan | Preserve the freeze and accepted plan revision 1.0 explicitly before integration. Deletion does not repeal their authority. Any conflict requires owner decision. |
| Main AGENTS adds external/Cloud type guidance | Reconcile guidance with actual client use; preserve existing Lovable history restrictions. |

Protected engine/configuration and supabase paths show no branch-to-branch drift in this comparison. That is not a runtime test of main. Future integration must additionally run P01–P10 financial/scenario/score/confidence/flag/recommendation fixtures unchanged, property CRUD/dashboard/missing/error states, two-user ownership/cascade tests, and the complete two-track database plan in the checklist. No integration before those gates and explicit authorization; never rewrite published Lovable history.

**Correct type file at this baseline:** `src/integrations/supabase/types.ts`, imported by external-client.ts and tests/database-types/phase1.ts. Its Git blob and main's external-types.ts are both `166d9e30735b9ddeb13165cc358ea978cd107a03`. No generated type changes now. A later reviewed generation must use the confirmed external schema or a proven equivalent isolated schema, never the unused Cloud project.

**Stop rule:** recheck branch, full SHA and tracked diff immediately before implementation. A different branch/SHA or unauthorized source/migration/type change is a BLOCKER, even if the branch name looks familiar. Do not automatically switch or reconcile it.

## 4. Final proposed scope and refinements

Exactly four initially empty public tables:

1. `location_provider_registry` — immutable provider capability/review versions.
2. `location_fact_definitions` — immutable neutral semantic versions.
3. `location_freshness_policies` — immutable age-policy versions, no durations seeded.
4. `property_location_intelligence_state` — optional per-property inert state, no backfill.

Two support functions remain subject to final review: `guard_location_registry_row()` and `guard_property_location_state_row()`, both SECURITY INVOKER, fixed pg_catalog search path, qualified references, no dynamic SQL/other-table writes or broad RPC. New constraints/indexes/RLS/grants/guards only. No new schema/role/sequence, spatial dependency or fifth table.

**Excluded:** existing Phase 1 table/function/trigger/access-policy changes; backfill; provider/fact/freshness/state seeds; geocoding; PostGIS install/upgrade/relocation; evidence acquisition/persistence; scoring; UI/application changes; provider calls and production deployment.

| Refinement | Proposed resolution and final review |
|---|---|
| Exact allowlist | Specification 8.2 binds every one of 61 literal keys to the entire category/taxonomy/type/unit/method/scope/coverage/zero/flag tuple. Special ratio/context keys have explicit tuples. Separate valid-key and valid-method checks must not admit a cross-product. D09 approval and exhaustive positive/negative fixtures required. |
| Provider review lifecycle | Approval is an immutable semantic field. UNREVIEWED/PROVISIONAL → APPROVED requires a new UUID/version and review metadata; never edit the old review. One-way deprecation withdraws old versions without changing pinned history. Version activation is explicit. D02 final review required. |
| Default privileges | Revoke materialized rights on the four tables and two functions in the same future transaction; then grant only the matrix. Include MAINTAIN, grant options, column/inherited rights and default function EXECUTE. No shared ALTER DEFAULT PRIVILEGES or Phase 1 changes. D11 final review required. |

Registry guards compare all other fields with NULL-safe equality, reject semantic UPDATE/DELETE and permit only one-way database-stamped deprecation. New versions can still INSERT with distinct UUID/logical version; uniqueness prevents collisions. Guards do not implement activation or legal retention enforcement. Row triggers do not intercept TRUNCATE or trusted-owner DDL; least-privilege grants and controlled releases are part of the contract.

State guard validates only INSERT/UPDATE, immutable property_id/created_at and database-controlled revision/timestamps; it has **no DELETE guard**. Existing owner-authorized property deletion must cascade to state without new child DELETE grants. Future immutable evidence/location FKs need their own deletion/retention review. PostgreSQL runs row triggers on FK actions, so a blanket state DELETE guard would obstruct the required cascade. [PostgreSQL trigger semantics](https://www.postgresql.org/docs/17/sql-createtrigger.html).

Revision increments alone do not enforce compare-and-swap: callers must use expected revision and require exactly one affected row. Test two concurrent connections, stale updates and overflow. No future pointers or READY/OFFICIAL states can be stored now; absence means unstarted.

## 5. Security contract and its limits

Accepted **for readiness evaluation** per owner instruction:

| Identity | Three global registries | Property state |
|---|---|---|
| PUBLIC / anon | No privileges | No privileges |
| authenticated | SELECT only, nonsecret versions | SELECT only via actual property ownership |
| service_role | SELECT only | SELECT / INSERT / UPDATE only |
| release/migration postgres | Controlled version INSERT / one-way deprecation under guards; trusted owner authority | Trusted owner authority |

RLS ENABLED plus proposed FORCE RLS on all four. Exactly one authenticated SELECT policy per table; registries USING true, state USING public.owns_property(property_id). No browser state writes, user mutation policies, broad write RPC or changes to Phase 1 policies. Deny runtime DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN/grant escalation on all four; registry INSERT/UPDATE additionally denied.

**FORCE assessment:** with verified BYPASSRLS, both postgres and service_role bypass even forced RLS. A non-bypass owner would be subject to it. Therefore service registry read-only behavior depends on revoking write privileges, and state ownership for service writes must be enforced by the application. Ordinary authenticated reads use RLS plus the verified invoker helper. Referential integrity is a separate enforcement path. [PostgreSQL 17 row security](https://www.postgresql.org/docs/17/ddl-rowsecurity.html).

Guard revocation must preserve owner ability to create triggers, then deny API direct EXECUTE. Trigger attachment requires table TRIGGER and function EXECUTE for the creator; ordinary triggered DML must be positively tested after function revocation. Guards still enforce row invariants during authorized bypass-role DML, unless a trusted administrator disables them. Exact implementation behavior remains untested. [PostgreSQL CREATE TRIGGER](https://www.postgresql.org/docs/17/sql-createtrigger.html).

PostgreSQL 17 ALL table rights include MAINTAIN. Revoke all default-created new-object rights and grant options before narrow grants, without editing shared defaults. Inspect effective role/column grants afterward; stop if meeting the matrix would require changing a shared role or Phase 1 authority. UUID keys require no sequence grants. [PostgreSQL 17 privileges](https://www.postgresql.org/docs/17/ddl-priv.html).

Before **every future service-role write**, a separately reviewed handler/job must verify the session/service identity, resolve the originating actor, prove actual current property ownership atomically with persistence (parent lock or equivalent owner predicate), allowlist server-computed fields, check expected revision and eventual location version, and fail closed on deleted/transferred parents or stale jobs. Use a server-only external-project connection with no inherited browser session, parameterized statements, idempotent retries and safe audit metadata. Client user_id/property_id or possession of a service key is insufficient. A REST preflight read followed by an unrelated privileged write does not prove atomic authorization. D16 real-handler tests remain later work; no such handler/RPC is introduced here.

## 6. Isolated environment inspection

Only non-mutating Docker metadata and SELECTs in explicit READ ONLY transactions were run. Sandbox-blocked reads were retried after tool approval. No container/service was started, stopped or reset by this task. Docker reported these containers already running at inspection; earlier Windows service status was Stopped, so that status alone was not used to infer engine availability.

| Item | Observed result |
|---|---|
| Docker context | desktop-linux, local Windows named pipe `npipe:////./pipe/dockerDesktopLinuxEngine`; no remote Docker endpoint |
| Database container | `supabase_db_malaysia-property-investment-analyzer`, running/healthy |
| Image | `public.ecr.aws/supabase/postgres:17.6.1.155`; image ID `sha256:3866d94d8426927e8db3f1c5d790752292bfbe27b5f1f46e199ae1b7d3c1710b` |
| Storage/network | Dedicated same-name local Docker volume at `/var/lib/postgresql/data`; network `supabase_network_malaysia-property-investment-analyzer` |
| Published database port | Host 54322 → container 5432, bound to `0.0.0.0` and `::`; local container, not loopback-only exposure |
| SQL identity | Database postgres, user postgres, server 17.6, transaction_read_only on; Docker exec uses local Unix socket |
| Application/ledger state | No public or supabase_migrations tables/views returned; Phase 1 is not applied; auth.users aggregate count **0**; no application/user records retrieved |
| Auth base | auth.uid() exists, reads request.jwt.claim.sub / request.jwt.claims; core role flags match external snapshot |
| Security prerequisites | Six broad defaults and API public/auth/extensions USAGE/no CREATE match. Authenticator SET ROLE/no inheritance matches. Local postgres additionally belongs to supabase_functions_admin; do not claim byte-identical full platform roles. |
| PostGIS | Absent locally; not needed for 2A-01. Separate spatial readiness before 2A-02. |
| Stack health | DB/Auth/REST available; edge runtime exited, vector restarting. Those are not required for SQL foundation tests; this is not a fully healthy future Edge deployment environment. |
| CLI access | Docker and Node/npm on PATH; no psql or Supabase CLI on PATH or Supabase shim in node_modules/.bin. Container psql is usable. |

This is an isolated local **empty Auth/database base**, not a populated test-ready upgrade environment. No real application data or Auth users exist in the inspected scope; this is not an audit of all platform storage. All-interface bindings mean network isolation/firewall assumptions must be reviewed before adding synthetic fixtures or running browser tests. No production connection strings or real-user data are needed.

Keep Track A's exact hardcoded container empty for the frozen harness. Build Track B separately from synthetic data, with Phase 1 applied before the proposed upgrade. The [checklist](PHASE2A_01_IMPLEMENTATION_CHECKLIST.md) provides the unexecuted setup plan and authorization boundary. Creation/startup, Phase 1 application and synthetic fixtures are mutating setup; the current request requires approval before any of them. Do not run reset or migration tests as part of PREP.

D07 readiness closes through an authorized, verified separate target and a reviewed executable fixture/test preparation plan. New migration tests are acceptance gates after the migration is authored under D17; they are not a circular requirement to test a nonexistent migration before authoring it. Setup approval must state whether it covers base creation only or also Phase 1/fixture preparation; any fixture DML needs its concrete artifact reviewed before execution.

## 7. Reconciliation traceability and deferred work

| Binding reconciliation | Foundation treatment / later validation |
|---|---|
| ARC-01 bounded evidence | No fabricated exact values/zeros; bounds/coverage tests with acquisition/facts in 2B/2C. |
| ARC-02 method-specific fallback | Exact tuples and canonical metres/seconds; later scorer checks 2C/2D. |
| ARC-03 coverage before renormalization | No score now; configured-weight gates 2D/2F. |
| ARC-04 no premature official v1.0 | No score configuration/activation now; production calibration/sign-off 2F. |
| ARC-05 lawful retention/replay | Immutable review metadata; actual terms, retention/purge and replay gates later 2B/2F. |
| ARC-06 state separation | Three independent inert state columns; later operational/freshness/publication expansion. |
| ARC-08 responsibility-driven tables | Exactly four for this slice, no arbitrary cap on later schema. |
| ARC-09 provisional provider | No provider seed/selection; geocoder narrow review later 2A, provider benchmark/freeze 2B. |
| ARC-10 context circularity | Reserved context output cannot feed itself; classifier fixtures 2C/2F. |
| ARC-11 unresolved metrics | Reserved keys confer no score eligibility; semantic/taxonomy contracts before use. |

ARC-07 refinements still require D09 acceptance; other unapproved ARC items are not promoted to approved. D12–D16 remain at their explicit later milestones in the register. Future location versions, evidence persistence, policy durations and scoring validation do not expand 2A-01 or block empty-table design merely because they are deferred.

## 8. Validation and handoff

Executed in PREP: repository/hash/diff/import comparisons; local read-only container/catalog inspection; documentation checks; `npm test` — **33 files / 1,073 tests passed**, plus **5 source-security checks passed, 1 browser-bundle check skipped**. This application suite performs no migration test and is not database security evidence.

Not executed: Phase 1 database harness, new migrations/fixtures, clean/upgrade/rollback/A/B/concurrency/cascade tests, type generation, fresh TypeScript checks, production build or browser/UI regression. Historical 00B type checks remain historical. All required post-implementation tests and separate track expectations are defined in the checklist; no skipped/unimplemented test is a PASS.

Produced only this readiness report, the implementation checklist, updated decision register and strictly scoped proposed specification corrections. The seven-table live database, five migrations, application sources, generated types, Git branches/index/history and authoritative architecture documents are unchanged. No provider calls, deployment, database grants/policies/functions or data modifications were made.

**Stop here.** Owner decisions are D02/D04/D09/D10/D11, bounded isolated-environment setup under D07, and later D17 implementation authorization. Request setup approval against the concrete checklist before executing it. This report is not final implementation GO.
