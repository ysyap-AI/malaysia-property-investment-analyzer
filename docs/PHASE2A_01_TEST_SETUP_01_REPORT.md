# MPIA — Phase 2A-01 TEST-SETUP-01 preparation report

Date: **14 October 2026 (Asia/Kuala_Lumpur)**.

**Stage 1 configuration preparation: complete, with the discrepancy below. Stage 2 startup recommendation: BLOCKED.** The isolated configuration passes structural and pinned-CLI inspection. Network isolation has not been demonstrated, and the selected CLI proposes a newer PostgreSQL patch/platform stack than Track A. No container startup, database implementation, migration, fixture, SQL query, reset, deployment or live-project connection occurred.

**Scope discrepancy:** the first `supabase init` invocation unexpectedly created `C:\Users\ysyap\.supabase\telemetry.json` (235 bytes), outside the dedicated directory. Thus this execution cannot claim that absolutely every file creation stayed within the requested boundary. No global CLI installation or persistent environment setting was made. Subsequent CLI invocations disabled telemetry and redirected CLI home locally; the external file's timestamp remained unchanged. It was not deleted or otherwise modified, because cleanup outside the authorized directory was not part of this task. Initial telemetry transmission was not independently observed; absence of such transmission is not asserted.

## 1. Authority and audited repository identity

Reviewed the Phase 1 architecture freeze, Phase 2 architecture plan revision 1.0, foundation specification proposed revision 1.1, final readiness report, implementation checklist Stage 1 and decision register. This request authorizes configuration preparation only and supersedes the earlier PREP prohibition on that specific work. It does not close design/implementation decisions or authorize Stage 2/3.

| Item | Verified value |
|---|---|
| Repository | `C:\Users\ysyap\AI Projects\malaysia-property-investment-analyzer` |
| Origin | `https://github.com/ysyap-AI/malaysia-property-investment-analyzer.git` |
| Branch | `phase2-location-intelligence` |
| Exact HEAD | `934ea702a2ecfdb31c530ea4a33e21a2d55e27d2` |
| Audited reference | BR-2A01-01 in `PHASE2A_01_FINAL_READINESS_REPORT.md` |
| Tracked working tree / index | Empty diffs at entry and after preparation |
| Branch/history operations | None; no switch, fetch, merge, rebase, commit or push |

Seven documentation inputs were already untracked: the compiled Q1–Q8 evidence, 00B database verification report, 00B decision register, 00C closure report, 01 final readiness report, 01 foundation specification and 01 implementation checklist. These are disclosed inputs, not newly introduced implementation drift. No unexpected branch, commit or tracked-file drift was found. No remote Git freshness claim is made.

## 2. CLI selection and local-directory identity

| Item | Result |
|---|---|
| Selected exact CLI | **2.120.0**, resolved from the public npm registry and confirmed by executable `--version` |
| npm / Node used | npm 12.0.1 / Node v24.18.0 |
| Registry package | `https://registry.npmjs.org/supabase/-/supabase-2.120.0.tgz` |
| npm integrity | `sha512-NF8ueHsOZMbyiFJARKbiZy9AhNtj5E5R49P+cVqlv2u/T2JpMtsvp29YgPgrIWkVUjsfhJseTmKEdckatSeWZQ==` |
| CLI executable SHA-256 | `1cbedd6e494581a1c1d90113660113a06798d9967d19c857127b66b8a428e836` |
| New local root | `C:\Users\ysyap\AI Projects\malaysia-property-investment-analyzer\.phase2a01-test.local` |
| New local project ID | `mpia-phase2a01-upgrade` |
| Configuration | `.phase2a01-test.local/supabase/config.toml` |
| Version pin | `.phase2a01-test.local/cli-version.txt` |
| Package/cache location | `.phase2a01-test.local/tooling/npm-cache` |
| Subsequent CLI home | `.phase2a01-test.local/tooling/supabase-home` |

The target directory and report did not exist at entry. The directory was created only after branch, resource and port checks. Configuration was generated from CLI defaults using explicit `--workdir .` from this new directory. No repository configuration, migrations, `.temp`, `.env`, data, keys or links were copied. The CLI and dependencies were fetched through `npm exec --package=supabase@2.120.0`; application package files and dependencies were not updated.

The new directory has its own `.gitignore` containing `*`, intentionally keeping all local configuration/tooling out of ordinary Git status and accidental commits without editing the repository ignore file. CLI init also generated `supabase/.gitignore` and `supabase/.temp/cli-latest`. The latter is an update-check marker, not a remote link or the version authority; use `cli-version.txt`.

The initial sandboxed npm query failed with EACCES. It was retried with approved network access and a directory-local cache. Docker and Windows port inspection likewise required approved read-only access. After init, sandboxed CLI help/version calls exposed the attempted profile telemetry write; those failed calls did not perform database work. Subsequent calls succeeded with process-scoped settings:

```powershell
# Settings for any separately authorized future invocation from the new root.
$env:SUPABASE_HOME = Join-Path (Get-Location).Path 'tooling/supabase-home'
$env:SUPABASE_TELEMETRY_DISABLED = 'true'
$env:DO_NOT_TRACK = '1'
$env:SUPABASE_NO_UPDATE_NOTIFIER = '1'
# Keep npm's cache in ./tooling/npm-cache and pin --package=supabase@2.120.0.
# Always supply --workdir explicitly; no startup is authorized by this report.
```

The unexpected profile file's creation and last-write times were both `2026-10-13T16:08:04Z` (14 October, 00:08:04 MYT), unchanged at final inspection. Its contents were not copied into the test project or report.

## 3. Configuration changes and validation

The final file was parsed with Python's standard-library `tomllib`; edits were matched by exact section/key, with an assertion that every planned key was found. The saved UTF-8 file was independently re-read and its values asserted. A first post-write read used Windows' default encoding and failed; the explicit UTF-8 rerun passed. No successful validation is inferred merely from textual replacement.

| Setting / group | Final configuration and purpose |
|---|---|
| `project_id` | `mpia-phase2a01-upgrade`; distinct from existing repository/Track A identity |
| `db.major_version` | **17**; default Postgres engine, empty `orioledb_version` |
| `db.seed` | `enabled = false`, `sql_paths = []` |
| `db.migrations` | `enabled = false`, `schema_paths = []`; extra guard for base-only preparation |
| Enabled services | Database, API gateway/PostgREST, Auth, Studio/metadata dependency, local SMTP testing service |
| Disabled optional services | Realtime, Storage, Storage S3 protocol, Storage vector, Storage analytics, Edge Runtime, Analytics, database pooler |
| Experimental schema diff | `experimental.pgdelta.enabled = false`; not needed for base preparation |
| External credentials | Studio OpenAI key, Twilio token, Apple secret and four experimental S3 settings are empty literal strings; default `env(...)` references removed from active values |
| External integrations | OAuth providers, third-party Auth, Solana, OAuth server and SMS provider disabled; no external SMTP configuration active |
| MFA | Phone and TOTP enrollment/verification disabled; no active external MFA integration |
| Local auth redirects | `http://127.0.0.1:3000`, additional `https://127.0.0.1:3000`; these URLs do not launch or publish an application |
| Studio API host | `http://127.0.0.1`; does not establish Docker bind isolation |
| Network settings | API TLS disabled; database network-restriction management disabled, generated allow-all CIDR defaults retained. These are not proof of host access control. |

Email/password signup remains enabled for a future synthetic local Auth base. Local SMTP captures test mail; no external email delivery credentials are configured. Application migrations must be explicitly reviewed and re-enabled in a separately authorized later stage; the checklist's Stage 3 commands should not be followed blindly with this disabled setting. No SQL files or application tables were prepared.

All parsed port keys matched the inventory below exactly, were unique and differed from Track A. All parsed `enabled` flags and URL fields were enumerated; active configuration had no `env(...)` reference, hosted Supabase URL, database connection URI or populated credential field. Commented vendor examples in the generated template are inactive.

Final config SHA-256: **`358644615023c95d8d7a7b29395c34f53cf225de31be6a3d8b68c26bf60f9998`**.

## 4. Complete configured host-port inventory

**Actual new published ports: none.** No new containers exist. These are planned/configured host ports, not verified running bindings.

| Service / use | Host port | Enabled / publication expectation |
|---|---:|---|
| API gateway / REST / Auth routes | 55421 | Enabled; shared API entry point |
| PostgreSQL | 55422 | Core database; expected database publication |
| Studio | 55423 | Enabled; local administrative UI |
| Local SMTP testing web UI | 55424 | Enabled; captured-mail UI |
| Shadow database | 55420 | Reserved for later diff operations; not a normal base-start service |
| Analytics | 55427 | Disabled; no intended publication |
| Pooler | 55429 | Disabled; no intended publication |
| Edge inspector | 8183 | Edge Runtime disabled; no intended publication |
| Optional SMTP / POP3 | 55425 / 55426 | Commented out; not active TOML settings |
| Application redirect target | 3000 | URL reference only; no app or port publication created |

Auth, PostgREST and metadata dependencies have no additional configured host-port keys. Runtime-internal ports, container names, hidden/default publications and actual HostIp bindings must be reconciled against Docker inspect after separately authorized startup; they cannot be certified by a stopped configuration. Disabled services must remain absent, and unexpected publications are a stop condition.

`Get-NetTCPConnection -State Listen` returned **zero** listeners for 55420–55429 and 8183, both before preparation and in the final recheck. IPv4 and IPv6 excluded TCP ranges were 5357, 50000–50059, 60475–60574, 60575–60674, 60675–60774, 60775–60874 and 60875–60974; no proposed port overlaps. This is a point-in-time collision check, not a reservation.

## 5. Docker checks and Phase 1 preservation

Docker context was explicitly `desktop-linux`, endpoint `npipe:////./pipe/dockerDesktopLinuxEngine`. No remote Docker endpoint was selected. All-container, all-volume and all-network inventories were inspected before and after preparation, including stopped containers.

No container, volume or network matched `mpia-phase2a01-upgrade`; the expected future database name `supabase_db_mpia-phase2a01-upgrade` was absent. Existing local volumes were only `supabase_db_malaysia-property-investment-analyzer`, `supabase_edge_runtime_malaysia-property-investment-analyzer` and `supabase_storage_malaysia-property-investment-analyzer`. Networks were bridge/host/none and `supabase_network_malaysia-property-investment-analyzer`. Inventories were unchanged.

| Phase 1 database property | Identical at entry and final inspection |
|---|---|
| Name | `supabase_db_malaysia-property-investment-analyzer` |
| Container ID | `e7cd2cf20c5a6ce591810c5a8619b7cb8205ddd1e01596ee650fd24105df3e87` |
| Created | `2026-09-20T06:56:02.13708995Z` |
| Started | `2026-10-13T15:19:37.338131029Z` |
| State / restart count | Running, healthy / 0 |
| Image tag | `public.ecr.aws/supabase/postgres:17.6.1.155` |
| Image ID | `sha256:3866d94d8426927e8db3f1c5d790752292bfbe27b5f1f46e199ae1b7d3c1710b` |
| Data volume | Same-name local volume mounted at `/var/lib/postgresql/data`, unchanged |
| Port binding | Host 54322 to container 5432; published on `0.0.0.0` and `::` |

The same 12 existing container IDs remained present. Studio, metadata, storage, REST, realtime, mail, Auth, gateway, analytics and DB remained running; Edge Runtime remained exited and vector remained in its pre-existing automatic restart loop. The task issued no start/stop/restart/exec/container mutation. Natural activity of already-running services is not claimed to have stopped. No fresh database content/row-count audit was performed: prior reports' empty-schema/user-count findings remain historical evidence, not a new claim.

## 6. CLI validation and version discrepancy

`supabase services --workdir .` completed successfully with the pinned CLI and returned empty remote-version fields. Selected relevant local images were:

| Component | CLI-selected version (not pulled or started) |
|---|---|
| PostgreSQL | **17.11.0.004** |
| Auth | v2.197.0 |
| PostgREST | v16.4 |
| Studio | 2026.10.05-sha-94b8b06 |
| Postgres metadata | v0.100.0 |

This satisfies PostgreSQL **major 17** configuration, but does not reproduce Track A's 17.6 image or the supplied external 17.6 snapshot. Other component versions also differ. Pinning the CLI does not certify image digests, runtime role/default-privilege parity or test equivalence. Review this patch/platform difference before Stage 2; no silent CLI downgrade or unsupported image override was attempted.

Read-only `supabase status --workdir .`, explicitly using desktop-linux, returned `linked_project: null` and `StatusDbInspectError: No such container: supabase_db_mpia-phase2a01-upgrade`. Exit 1 was expected because startup is prohibited. This proves the CLI resolved the dedicated local identity without a link; it is not a running-stack health pass. No config-validation subcommand exists in this CLI's `config` help; its diff/pull/push operations were not used.

## 7. Link, credentials and data isolation

The existing repository contains `.temp/project-ref`, `linked-project.json`, `pooler-url` and `start-secrets`. Only filenames/presence were inspected for this task, without printing or copying their values. None appears in the new project. The new `.temp` contains only the generated CLI update marker. There is no new `remotes` configuration, `.env`, SQL file, migration/seed file, data dump, signing-key file or copied user data. No symlinks were found in the new directory.

No relevant SUPABASE/PG/DATABASE/DOCKER/NPM_CONFIG process environment variable was present in the initial name-only inspection, and no root `.env*` file was listed. This is not an audit or removal of user-profile credential stores. Subsequent CLI home isolation avoids intentionally reusing profile state; future operations must retain it and recheck inherited credentials/overrides. No login, link, remote config operation, database URL command, live query or connection to `viddikrrhogcebpbstti` was made.

Local package-cache contents are downloaded tooling, not application/user data. Future locally generated test credentials must remain local and must not be pasted into evidence. This preparation does not yet create or attest to runtime secrets.

## 8. Network exposure and remaining issues

1. **Startup isolation remains BLOCKED.** Configured localhost URLs do not restrict Docker listeners. Existing Track A already exposes 54321/54322/54323/54324/54327 on all IPv4/IPv6 interfaces. The new stack may likewise publish broadly. Windows Domain/Private/Public firewall profiles were enabled, but `DefaultInboundAction` reported `NotConfigured`; effective Docker/WSL/rule-level reachability and LAN exclusion were not established. No firewall/global Docker change was made. A reviewed isolation mechanism and verification plan are required before startup; do not equate distinct ports or enabled firewall profiles with loopback-only access.
2. **Review CLI/platform compatibility.** PG17 major matches, but 17.11 versus 17.6 and other image differences must be accepted or resolved through a separately reviewed configuration revision. Runtime roles, grants, image digests and empty-base checks remain future Stage 2 validation.
3. **Telemetry boundary discrepancy remains recorded.** Initial CLI init created the profile telemetry file. Do not claim perfectly directory-contained execution. Further CLI work must preserve disabled telemetry and the dedicated CLI home. No outside-directory cleanup was attempted.
4. **Stage 2 authorization is absent.** This request explicitly stops after Stage 1. Recheck repository identity, exact CLI/config hashes, links/environment overrides, ports, resources and isolation before a separately authorized startup. D07 overall test readiness and D17 implementation permission remain open; no decision register was edited.

## 9. Verification summary and final disposition

| Check | Outcome |
|---|---|
| Exact branch/commit and tracked/index drift | PASS |
| Target absent before creation; isolated identity | PASS |
| Parsed TOML, every port/enable flag, seed/migration guards | PASS after explicit UTF-8 re-read |
| CLI executable version and local service resolution | PASS |
| New target status / no remote link | Expected absent-container result; no startup |
| Resource collision and listening/reserved port checks | PASS at inspection time |
| Phase 1 container metadata and Docker inventories | Unchanged; no DB query or mutation |
| Config credential/link/data inspection | PASS within stated file/config scope |
| Existing read-only `node --test tests/security.test.mjs` | 5 passed, 0 failed, 1 skipped (built browser assets) |
| Application build/full regression/database harness | Not run for this configuration-only task; no generated build artifacts or database work authorized |
| All file creation confined to new root/report | **FAIL: unintended profile telemetry file**, disclosed above |
| Effective network isolation / running publications | Unproven; startup blocked |

Delivered configuration and support files reside only under the new root, with the explicit telemetry exception. This report is the only new repository-visible document. Existing application source, migrations, generated types, documentation inputs and Phase 1 configuration were not edited.

**Final recommendation: BLOCKED for Stage 2 startup.** Stage 1 configuration is prepared and validated for review; no automatic continuation is authorized. Stop here.

Reference: Supabase's [CLI configuration documentation](https://supabase.com/docs/guides/local-development/cli/config) describes the generated project identity and local configuration; the [CLI reference](https://supabase.com/docs/reference/cli/supabase-init) describes initialization. Release-specific findings above use the actual pinned executable, generated TOML and local observations rather than assuming current documentation exactly matches the release.
