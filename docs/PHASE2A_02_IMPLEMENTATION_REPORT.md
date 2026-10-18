# Phase 2A-02 implementation ? current acceptance status

18 October 2026, Asia/Kuala_Lumpur. **FINAL-ACCEPTANCE-01: qualified acceptance of the dormant local database implementation; GO recommendation for a development checkpoint and narrowly scoped Phase 2A-03 work after separate owner instruction; production BLOCKED.** No commit or next-phase work was performed.

TC01?TC14 are **14/14 PASS**, with two observed location lock waits and verified rollback/cleanup. The former transaction gap is closed by TEST-CLOSURE-02. FINAL-ACCEPTANCE-01 freshly verified the accepted catalog/data fingerprint, exact guard attachments and privilege paths, six bounded negative probes, and representative temporary GiST query planning. Fresh application tests (1,073), five TypeScript projects, 44 preserved type contracts, five serializer tests and five source security tests passed; the fresh built-asset test was explicitly skipped. The earlier successful build and six-check bundle security run remain retained evidence.

Clean installation of the complete seven-migration chain is **NOT VERIFIED**. Full incompatible-extension and adversarial role/attachment qualification remain partial. These are qualification risks for this dormant development checkpoint, not automatic blockers. Real handler authentication, provider behavior and T15 browser regression remain unexecuted later-phase gates. See the [final acceptance report](PHASE2A_02_FINAL_ACCEPTANCE_REPORT.md), [final checklist](PHASE2A_02_FINAL_ACCEPTANCE_CHECKLIST.md) and [current verification manifest](phase2a02-final-verification.json) for separate A?D decisions and exact checkpoint inventory.

## Historical IMPLEMENTATION-01 report and TEST-CLOSURE-02 addendum

The complete earlier text follows unchanged. Its present-tense statements, approval rejection, unexecuted transaction entries and incomplete overall acceptance describe those earlier stages; they are not the current disposition. Its original hash and the pre-audit addendum hash remain traceable in the historical and final manifests. Do not regenerate historical evidence to make it look current.

---

﻿# Phase 2A-02 IMPLEMENTATION-01 report

> **18 October 2026 ? TEST-CLOSURE-02 update:** the synthetic transaction/concurrency gap described below is now closed: H01?H06 repaired, TC01?TC14 passed, and cleanup/baseline preservation verified. See the [new closure report](PHASE2A_02_TRANSACTION_CLOSURE_REPORT.md). The body below preserves IMPLEMENTATION-01 evidence and its then-unexecuted disposition; overall final acceptance remains open for the separately listed gaps.

18 October 2026, Asia/Kuala_Lumpur. Work began 17 October.

**PostGIS and the location schema are installed and verified locally. Final acceptance remains incomplete.** The owner separately approved enabling packaged PostGIS 3.3.7 in `extensions` in the existing MPIA database. The migration passed 166 SQL assertions, populated-upgrade and migration-rollback checks, actual deferred-COMMIT rejection checks, and property/Auth cascades. Scoped types were generated from the verified local catalog. The synthetic location transaction/concurrency runner was subsequently rejected by the execution approval prompt and remains unexecuted.

No production access, provider call, new Docker environment, Git commit, push or deployment occurred. No password was needed or stored. This report supersedes the earlier PostGIS-absent disposition; historical evidence captures remain unchanged.

## Authority, target and preservation

D01–D08 and subsequent installation authorization are recorded in the [decision register](PHASE2A_02_DECISION_REGISTER.md). Branch remains `phase2-location-intelligence`, HEAD `c9b6c4acc1879a2b84b89d3b39455f2489e4c56a`, direct parent `e9b55b024263857aacafbd8d9d9158d749d9261f`. The index is unchanged. The only modified previously tracked file is `src/integrations/supabase/types.ts`; ten existing table definitions are byte-preserved, and 44 existing type contracts pass parity checks.

All seven Phase 1 tables, five Phase 1 migrations, accepted foundation migration, historical tests and frozen financial/configuration/analysis-hook sources are preserved. Installed-schema verification compared the accepted metadata/data snapshot, excluding only the explicitly approved pointer column and FK. It confirmed zero Auth fixtures and empty location history after committed cascade cleanup.

| Identity | Verified local target |
| --- | --- |
| Container | `supabase_db_mpia-phase2a01-implementation`, ID `e95ce873b90725032affcffc801147d39945beb988ac33461deedd91d59b94c6` |
| Image | `public.ecr.aws/supabase/postgres:17.11.0.004`, ID `sha256:6058a6759ab9268cff8ee70641d61f1bd75953316281b76427cf5a6b4db2eafc` |
| Volume | Sole `supabase_db_mpia-phase2a01-implementation` mount at `/var/lib/postgresql/data`, created `2026-10-16T14:23:02Z` |
| Connection | Docker `desktop-linux` named pipe; explicit `/var/run/postgresql` Unix socket; database `postgres`; no hosted URL |
| Server/extension | PostgreSQL 17.11; PostGIS 3.3.7 in `extensions`; installed separately as local `supabase_admin` |
| Application catalog | 12 public tables; 27 history columns, 8 state columns, 6 history indexes; original baseline preserved |

The [original prerequisite capture](phase2a02-prerequisite-results.json) predates installation and records absence at that time. Current evidence is the [extension installation](phase2a02-postgis-installation.json), [migration installation](phase2a02-installation-results.json), and [schema verification](phase2a02-schema-verification.json). The separate owner-created PostGIS container passed six read-only spatial smoke checks but is not the MPIA acceptance target and was not modified. Historical Docker publication observations do not certify present host/network isolation; SQL here used only the pinned socket.

## Delivered implementation

| Artifact | Behavior |
| --- | --- |
| [Transactional migration](../supabase/migrations/20261017000000_phase2a02_property_locations.sql) | Retained locally; one history table and one nullable state pointer; no seed, backfill or extension installation in application SQL |
| Immutable history | UUID/property/version/operation identity, SHA-256 fingerprints, address/normalization, provenance, confirmation and safe integer version bound |
| Spatial representation | WGS84 scalars, stored generated geography Point/SRID 4326, GiST; invalid bounds, NaN, infinity and unsupported CRS rejected before construction |
| Current pointer | Latest intent including unconfirmed/review/cleared; composite FK with deferred NO ACTION; no backward/reset-to-NULL mutation; accepted revision guard preserved |
| Security | Two invoker guards with fixed search path, parent-aware cascade deletion, FORCE RLS and owner reads, service history SELECT/INSERT only; effective/inherited/SET/ADMIN/MAINTAIN authority audited |
| [Scoped types](../src/integrations/supabase/types.ts) | History and nullable pointer/composite relationship; geography is `unknown` on reads and optional `never` on writes |
| [Test sources](../tests/PHASE2A02_README.md) | Spatial/security cases, committed cascades, populated upgrade, migration fault rollback, catalog checks, synthetic writer source and offline contracts |

The migration pins PostgreSQL 17 and PostGIS 3.3.7 in `extensions`; other versions require qualification. Its opening source-preparation comment records the original provisioning gate; SQL bytes remain exactly as installed and hashed. It never installs, relocates or upgrades an extension.

Types use a **scoped catalog-driven Supabase-compatible generator, not Supabase CLI output**. The source is the successful local catalog capture, never the older Lovable Cloud database. [Generation evidence](phase2a02-type-generation.json) records source/destination hashes and 44 preserved contracts. Strict type checks cover pointer nullability, both relationship columns, generated geography exclusion and numeric versions. Types do not grant permissions; immutability and safe numeric bounds remain SQL constraints.

## Executed results

| Check | Result / evidence |
| --- | --- |
| Extension load, SRID and library | PASS — [installation](phase2a02-postgis-installation.json) |
| Spatial, validation, immutability, RLS, grants, pointer and provenance SQL | **166 passed** — [rollback suite](phase2a02-database-results.json). 167 unique source labels; one successful FK fault assertion is rolled back with its savepoint |
| Populated Phase 1 + foundation upgrade | PASS — original metadata/data preserved, revision 7 retained, null pointer, no backfill |
| Failed migration rollback | **Three passed** — after table creation, guards/policies and grants; no leaked objects or baseline changes |
| Retained installation | PASS — empty baseline preserved; [five installation groups](phase2a02-installation-results.json) |
| Deferred FK at actual COMMIT | **Three passed** — nonexistent pointer, other-owner property and same-owner other property each fail with `23503`; pointer and trigger restored |
| Property and Auth deletion | **Two passed** — private/history/state and financial cascades; unrelated owner preserved; [commit cases](phase2a02-commit-results.json) |
| Catalog and cleanup | PASS — types/defaults/generated expression/indexes/constraints/roles/grants/guards and original baseline; zero Auth users, empty history |
| Generated types | PASS — 44 existing contract parity checks and strict location contracts |
| Application | **1,073 passed**, zero failed/pending |
| P01–P10 | **53/53 names and outcomes identical** to accepted fixture evidence |
| TypeScript | **Five checks passed**: application, fixtures, Phase 1, foundation, location |
| Serializer contracts | **Five passed** |
| Production build / source and fresh-bundle security | PASS / **six passed**; no deployment |
| Historical foundation suite | **2,340 assertion executions passed** before spatial installation; not distinct cases |
| Foundation quality follow-up | **Nine uniqueness checks and two observed lock races passed**; supplemental evidence, historical assertions untouched |

See [regressions](phase2a02-regression-results.json), [fixture comparison](phase2a02-fixture-comparison.json), [foundation results](phase2a02-foundation-regression-results.json), [quality follow-up](phase2a01-quality-followup-results.json), and [manifest](phase2a02-verification-manifest.json). Earlier rollback-result `notExecuted` entries are scoped to that runner; later installation, cascade and type evidence supersedes those specific omissions.

Three earlier harness attempts failed and were corrected or rerun: the FK fault fixture needed valid pending constraints flushed before temporarily disabling its new pointer trigger; inventory comparison needed identical sorting instead of SQL/JavaScript locale differences; and the catalog verifier's zero-user guard ran while cascade fixtures were active. The corrected rollback suite and post-cleanup catalog verification passed. No application constraint or Phase 1 trigger was weakened. No mandatory cascade test failed.

## Acceptance coverage and remaining work

| Readiness cases | Current disposition |
| --- | --- |
| L01–L04 | Positive spatial/version/SRID/generated/index checks and coordinate rejection passed. Full incompatible-extension/attachment fault matrix and representative GiST query-plan exercise remain open |
| L05–L09 | Identity, immutability, pointer containment, grants/RLS and role catalog checks passed. Exhaustive adversarial inherited-role/attachment/definer escape qualification is not claimed |
| L10–L12 | SQL revision/identity constraints and serializer checks passed. **Synthetic writer, delayed retry and two location contention races NOT EXECUTED**: execution approval rejected |
| L13–L14 | Property/Auth financial/private cascades and owner-read transfer behavior passed. Stale former-owner writer remains in unexecuted transaction suite |
| L15–L18 | Incomplete/review/cleared states, invalid combinations, provider eligibility snapshots, history and old-pair lookup passed. Future normalizer/origin/provenance runtime integration deferred |
| L19 | Populated upgrade and retained installation passed. **Clean installation NOT EXECUTED**: no separately designated clean database; no new environment or volume reset |
| L20 | Three migration fault rollbacks and three deferred-COMMIT failures passed. Writer failures after append/pointer remain unexecuted |
| L21–L22 | Scoped types, original contracts and application/financial regressions passed |
| L23 / T15 | Future-handler security and interactive browser regression OPEN. No runtime handler exists; production-configured frontend was not opened against synthetic users |

The latest `node tests/run-phase2a02-transactions.mjs` request was rejected by the execution approval prompt before execution. No alternate path or retry was used. [Transaction disposition](phase2a02-transaction-results.json) records zero assertions. This is an execution restriction, not a database failure. Earlier foundation races do not prove location concurrency. A requested read of an old postgres-meta container was also rejected and not retried; types use the already verified catalog.

**D05's required database conditions are demonstrated locally. Overall acceptance remains open**, primarily for synthetic location transaction/concurrency execution, clean installation and remaining adversarial coverage. Git checkpoint, synchronization and deployment remain separate owner-approved milestones.

## Required future backend transaction

Use one server-only PostgreSQL driver connection for a short READ COMMITTED transaction. Verify the actual session/JWT through trusted Auth first; use parameterized statements and acknowledge success only after COMMIT.

1. Lock the actual parent `FOR UPDATE`, verify current owner and recompute property-input fingerprint under that lock.
2. Reauthorize retries, compare the fixed-order operation hash, and return matching historical outcome without repointing. Reject changed payloads under the same operation identity.
3. Lock/read state; require explicit ABSENT or exact expected revision/current UUID. Reject stale, transferred or deleted-parent commands.
4. Allocate a bounded version under the parent lock, append history, and update the pointer with an expected-revision predicate requiring one row.
5. Roll back append/pointer/revision together on any failure, including deferred COMMIT failure. Fetch provider data outside the lock and recheck ownership/input/tokens when publishing.

The synthetic source models this but has not run. Independent Supabase REST calls do not meet this contract. SQL alone does not authenticate actors, verify supplied expected tokens or cryptographic hashes, allocate contiguous versions for arbitrary service writes, or establish legal provider rights. No endpoint, worker, privileged RPC or new dependency was introduced.

Future origin eligibility requires confirmed status and a matching current input fingerprint. Provider confirmation must preserve provenance; PERMANENT labels do not prove field-specific storage rights. Provider guards check eligibility snapshots without serializing concurrent administrative deprecation. Retention, withdrawal/purge and transfer privacy remain future runtime obligations.

Logs/generated fixtures are in ignored `.phase2a02-implementation.local/`; reviewable evidence is in `docs/`. Hashes provide local integrity evidence, not signed independent attestation.

