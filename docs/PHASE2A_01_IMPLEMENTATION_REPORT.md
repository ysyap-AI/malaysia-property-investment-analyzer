# MPIA — Phase 2A-01 implementation report

Completed: **17 October 2026 (Asia/Kuala_Lumpur)**. Implementation and local validation began on 16 October.

**Foundation implementation complete for review. No production readiness or deployment approval is declared.** The four-table migration, database/security tests, scoped generated external-project types and updated checklist are delivered. Interactive browser regression remains NOT EXECUTED. No live database connection, production mutation, commit, push, merge, rebase or deployment was performed.

## 1. Authority and baseline

The owner's current implementation request selects `phase2-location-intelligence` at `934ea702a2ecfdb31c530ea4a33e21a2d55e27d2`, authorizes specification revision 1.1 and both support functions, and permits bounded local Supabase setup with ordinary Docker port publication. This supersedes the earlier PREP implementation/setup prohibitions and strict network-isolation prerequisite **for this local task only**. Historical readiness, decision-register and setup reports remain historical records; their old BLOCKED headings are not current implementation status.

Both authoritative documents were read and retained: [Phase 1 freeze](PHASE1_ARCHITECTURE_FREEZE.md) and [Phase 2 architecture revision 1.0](PHASE2_ARCHITECTURE_PLAN.md). The foundation specification, readiness report, decision register, checklist, prior verification reports and compiled owner-supplied SQL evidence were reviewed. The ten accepted architecture reconciliations remain binding. No future provider, semantic-registry population, scoring, PostGIS or deployment authorization is inferred.

At entry, branch and full SHA matched exactly. Tracked worktree/index changes were absent. Thirteen supplied planning/evidence Markdown files were already untracked; these were not application drift. The five historical migration files match the audited Git baseline and remain unchanged. The financial engines, effective configuration, application hooks/routes/components, existing test assertions and both architecture documents remain unchanged. The only modified tracked application file is `src/integrations/supabase/types.ts`, with 208 added lines for the four generated table definitions and no deletion of existing types.

## 2. Implemented functionality

Migration: [`20261016000000_phase2a01_foundation.sql`](../supabase/migrations/20261016000000_phase2a01_foundation.sql).

One chronological `BEGIN`/`COMMIT` migration creates exactly these four empty public tables:

- `location_provider_registry`: immutable provider/review versions; canonical, nonempty capability arrays; conservative defaults; reviewed retention/attribution/reference checks; one-way database-stamped deprecation.
- `location_fact_definitions`: all **61 full-key contracts**, each bound to its entire category, taxonomy, type, unit, method, scope, coverage, radius/duration and zero-semantics tuple. Both the guard and finite declarative CHECK enforce the mapping. Context requires the exact canonical four-label array. No registry rows are seeded.
- `location_freshness_policies`: immutable explicit policy versions; ordered, positive, safely bounded durations; no policy activation, duration seeds or clock-dependent evaluation engine.
- `property_location_intelligence_state`: optional property-keyed row with `NOT_STARTED / UNKNOWN / NOT_ASSESSED`, revision zero on insert, database audit times, immutable parent/creation identity, increment-on-update and overflow protection. Its FK uses `ON DELETE CASCADE ON UPDATE RESTRICT`.

The two new support functions are `guard_location_registry_row()` and `guard_property_location_state_row()`: SECURITY INVOKER, fixed `pg_catalog` search path, literal attachment checks, no dynamic SQL, network calls or writes to other tables. The registry guard compares every persisted field except deprecation with NULL-safe equality; it rejects deletes and every update except the first deprecation. The state guard does not intercept DELETE, so parent and Auth-user cascades remain functional.

All four tables have RLS enabled and forced, with exactly the specified authenticated SELECT policies. Authenticated users can read registries and their own state only. Anonymous users have no new-table privileges. Service role can read registries and SELECT/INSERT/UPDATE state only. Materialized object-default grants are removed from all non-owner grantees on these six new objects, including PostgreSQL 17 MAINTAIN, grant options and direct guard EXECUTE, before narrow grants are applied. Effective API privileges and column ACLs are checked. No shared default ACL, role, schema grant or Phase 1 grant is changed.

Preflight rejects table/type/function-name collisions, an unexpected migration identity, missing ownership/RLS prerequisites, a changed frozen ownership helper and unsafe API role/schema privileges. The new property FK necessarily creates PostgreSQL's internal referential-integrity dependency triggers on its parent; no existing Phase 1 application trigger/function/policy is rewritten.

No evidence collection, geocoder, provider call, seed/backfill, location scoring, UI, financial-engine change or PostGIS installation/relocation was added.

## 3. Verified local test boundary

| Item | Verified target |
| --- | --- |
| Docker endpoint | `desktop-linux`, local Windows named pipe `npipe:////./pipe/dockerDesktopLinuxEngine` |
| New project/container | `mpia-phase2a01-implementation` / `supabase_db_mpia-phase2a01-implementation` |
| Container ID | `e95ce873b90725032affcffc801147d39945beb988ac33461deedd91d59b94c6` |
| Fresh data volume | `supabase_db_mpia-phase2a01-implementation`, local driver, created `2026-10-16T14:23:02Z` |
| Image | `public.ecr.aws/supabase/postgres:17.11.0.004`, digest `sha256:6058a6759ab9268cff8ee70641d61f1bd75953316281b76427cf5a6b4db2eafc` |
| SQL execution | Database `postgres`, user `postgres`, PostgreSQL 17.11, local Unix socket (`inet_server_addr()` NULL) |
| Initial application state | Zero public tables and zero Auth users |
| Local publication | Database host port 56422, ordinary IPv4/IPv6 wildcard bindings accepted by the current owner request |
| CLI | Existing cached Supabase 2.120.0; separate unlinked workdir `.phase2a01-implementation.local` |

Only the bounded database/Auth setup was started; unrelated Supabase services were excluded. No production configuration or credentials were copied. Configuration was checked for remote/project references; inherited database/Supabase credential variables were removed from CLI child processes. Migration/tests use no connection URL or hosted project ID. Tests pin the inspected immutable container ID and volume and reject unexpected starting state. Only synthetic `example.invalid` identities and properties were used.

The failed `supabase_db_mpia-phase2a01-upgrade` volume was not mounted, reused, deleted or replaced. Existing Phase 1 containers/volumes were not reset, replaced or removed. The original empty PostgreSQL 17.6 database was used only by its unmodified, rollback-based Phase 1 harness after verifying container/image/volume identity and zero tables/users. Its empty state was verified again afterward.

The fresh local target is PostgreSQL 17.11, while the accepted external catalog snapshot and frozen harness are 17.6. Matching role semantics and all relevant public column contracts were verified; this is not a claim of byte-identical entire Supabase platform catalogs. PostGIS is absent locally and irrelevant to these nonspatial tables. External-only nonunique index and physical column-order differences remain disclosed and untouched.

Final retained test target: eleven empty application tables, zero Auth users, four empty new tables. Synthetic behavior fixtures were rolled back; committed concurrency/upgrade fixtures were explicitly removed through their synthetic Auth-user cascade. Containers/volumes are retained for review, with no destructive cleanup.

## 4. Tests passed

Detailed evidence: [database results](phase2a01-database-results.json), [schema verification](phase2a01-schema-verification.json), [frozen database results](phase2a01-phase1-database-results.json), [ownership output](phase2a01-phase1-ownership-results.txt), [fixture comparison](phase2a01-fixture-comparison.json), [type provenance](phase2a01-type-generation.json), and [final verification/source manifest](phase2a01-final-verification.json). Migration hashes are recorded in database results. Original working-file byte hashes remain unchanged; Git comparison accounts for the checkout's CRLF versus stored LF line endings. Reproduction boundaries and commands are in [the test README](../tests/PHASE2A01_README.md).

| Check | Actual result |
| --- | --- |
| Clean installation | PASS: five frozen migrations plus foundation; eleven tables, zero new rows; full transaction rollback restores empty schema |
| Populated upgrade | PASS: synthetic A/B data in all seven Phase 1 tables, then foundation only; exact canonical rows/columns/defaults/constraints/indexes/policies/ACLs/functions and eight frozen application triggers preserved |
| Atomic failure | PASS: injected errors after table creation, after policies, and after grants roll back all foundation objects while preserving committed Phase 1 data/metadata |
| Foundation behavior/security | **2,340 assertions PASS, zero failed** in final rollback suite; initial 2,334-case suite plus six explicit context-label cases |
| Full fact contracts | PASS: all 61 valid tuples, every changed tuple component, required-component NULLs, unknown keys, method/unit/taxonomy/flag/coverage/zero mismatches; all 61 checked again with the fact guard disabled inside rollback to test CHECK enforcement independently |
| Provider/freshness validation | PASS: capability shape/duplicates/NULL/unsupported labels; immutable approval history; review/retention/attribution constraints; temporal/numeric/version/text boundaries; valid temporary-retention endpoints and maximum freshness transport bound |
| Permissions | PASS: actual anon/authenticated/service-role SQL reads and denied mutations/upserts/deletes/truncation/DDL/direct guard calls; effective SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN and grant-option matrix; no grant escalation |
| Ownership/cascades | PASS: both users' positive own reads, unfiltered and explicit-ID cross-owner exclusion, denied own/other writes, denied other-parent deletion; owner-parent deletion cascades state and financial children; Auth-user cascade succeeds |
| State behavior | PASS: inert defaults, FK/PK violations, identity/creation-time immutability, server-controlled time/revision, unsupported status/score fields, stale expected-revision zero-row result and atomic overflow rejection |
| Actual concurrency | PASS: two independent database connections; a detected lock holder commits one expected-revision update, competing writer returns zero rows |
| Post-install rollback | PASS: remove only new tables/functions in disposable target, preserve Phase 1, then reinstall foundation with zero new rows |
| Exact schema | PASS: 53 new columns/types/nullability/defaults; four PKs, three registry unique constraints, one cascade/restrict FK, seven indexes, four SELECT policies, RLS/FORCE, invoker guards and effective role-membership checks |
| External-schema fidelity | PASS: all 129 Phase 1 public column names/types/nullability match supplied external Q3 evidence; all 28 original generated Row/Insert/Update/Relationships contracts compare equal |
| Frozen Phase 1 database harness | **1,186 PASS, zero failed**: schema 80, reconciliation 512, ownership 245, constraints 349; zero tables/users after rollback |
| Application regression | **33 files / 1,073 tests PASS**, including existing security, ownership-boundary, missing-data and financial fixtures |
| P01–P10 before/after | **53 assertions PASS in each tree**, with identical assertion names/statuses using the audited export and implementation tree; fixture expectations and source unchanged |
| TypeScript | PASS: application, frozen fixtures, original database-types checks, plus new Phase 2A-01 compile-only checks after the scoped type update |
| Production build | PASS; no deployment performed |
| Fresh bundle security | **6 PASS, zero skipped**, explicitly scanning rebuilt `.output/public` |

P01–P10 recommendation expectations remain: P01 BUY CANDIDATE; P02 REJECT; P03 NEGOTIATE; P04 REJECT; P05 NEGOTIATE; P06/P07 INSUFFICIENT DATA; P08/P09 BUY CANDIDATE with inactive future placeholders; P10 WATCHLIST. These are unchanged frozen synthetic fixtures, not new investment advice or location findings.

The original Phase 1 harness ran from a `git archive` export of the audited commit with exactly five migrations. Its assertions were not changed to accept Phase 2. Generated harness evidence was copied into distinct `phase2a01-*` files rather than overwriting historical evidence.

## 5. Failures encountered and resolved

No unresolved executed schema/application test failures remain. During test development:

- PowerShell treated the CLI's startup stderr as a terminating error. Inspection showed no new target resources; a process wrapper captured output safely and startup succeeded after fresh collision checks.
- Initial synthetic upgrade fixtures used incorrect Phase 1 column names. Corrected them to `project_name` and `annual_maintenance_fee`; the failed transaction rolled back.
- A PowerShell-added UTF-8 BOM at the beginning of fixture SQL caused a parser error. The runner strips that marker; no partial fixture transaction persisted.
- The concurrency observer initially used synchronous polling and searched a prior statement rather than the sleeping connection. It was corrected to await asynchronous queries and identify an explicit connection application name; the actual two-writer test then passed.
- The supplied Markdown catalog parser initially selected wrong field offsets. Corrected offsets yielded the verified 129-column equality; no schema was changed to make the comparison pass.
- Formatting expanded two compile-only negative fixtures, moving their expected errors away from the TypeScript directive. The directives were moved to the exact rejected fields and the type check rerun; no type assertion was weakened.

Failed/interrupted attempts were not counted as passing evidence. The runner's guarded resume path checked exact container, volume and preserved synthetic Phase 1 snapshot before continuing. Final behavior checks ran again on the empty installed schema. Build warnings about dependency directives, large bundles and existing plugin configuration were non-fatal; dependencies and application configuration were not changed.

## 6. Types and scope

The cached CLI generated types with `gen types typescript --local --schema public` against the separate verified local schema. Generation did not use the older Lovable Cloud database or a remote connection. Type-relevant fidelity was established by the schema comparison and 28 compile-time equality checks against the existing seven-table external types.

Only the four generated table nodes were added to [`src/integrations/supabase/types.ts`](../src/integrations/supabase/types.ts). Original table nodes remain byte-for-byte unchanged, including relationships. Existing helpers, `owns_property`, and external `PostgrestVersion: "14.5"` remain intact. New generator output includes `ComputedFields: never` for the added tables. No unrelated application types were regenerated. CHECK-constrained text remains `string` in generated types; SQL is the vocabulary/security enforcement boundary.

## 7. Not executed, limits and deployment readiness

| Item | Status and reason |
| --- | --- |
| Interactive Phase 1 browser/UI/auth flow matrix (T15) | **NOT EXECUTED.** Database ownership, application tests and build do not establish live browser signup/login/logout/account-switch/CRUD/dashboard behavior. No browser was connected to the production-configured application. This remains a release-validation gap. |
| Real backend actor/session/job authorization (S07–S08) | **DEFERRED / NOT EXECUTED.** No handler/job exists in this milestone. Before service writes are exposed, prove actor identity, atomic current ownership/location checks, field allowlisting and stale-job/idempotency rules. |
| Fact-result persistence/coverage/classifier/freshness engines (later F cases) | **DEFERRED / NOT EXECUTED.** Only registry contracts exist here. No runtime radius, nearest-bound, pagination, unknown-category, temporal-boundary or context-circularity engine is claimed as tested. |
| Production/remote migration and current catalog drift check | **NOT EXECUTED; not authorized.** Accepted historical external evidence is not a fresh production preflight. |
| PostGIS/spatial/provider/score readiness | **OUT OF SCOPE / NOT EXECUTED.** No installation, provider calls, terms approval, registry population or scoring activation. |

FORCE RLS does not constrain postgres/service-role BYPASSRLS. Grants restrict service operations; later handlers must establish actor authorization. The state trigger increments revision but cannot prove the caller supplied an expected-revision predicate; that remains a mandatory caller contract. Owners can disable guards or use DDL/TRUNCATE; this is controlled administrative authority, not tamper-proof storage. Reference text is length/nonblank checked, while secret-bearing references and genuine provider/taxonomy review require release review before any future registry population.

The implementation is available for review and further authorized validation. **Do not deploy based on this report alone.** Before any separately authorized production migration, recheck current target identity, migration history, namespace collisions, ownership helper/roles/memberships/schema/default/effective privileges and applicable browser regression. Do not change shared Phase 1 privileges or roles to force compatibility. Ordinary local port publication was accepted for local development; no independent off-host isolation claim is made.

Stop point reached: implementation deliverables and report only. Production migration/deployment, commits/pushes, provider use and future phase implementation remain separate decisions.
