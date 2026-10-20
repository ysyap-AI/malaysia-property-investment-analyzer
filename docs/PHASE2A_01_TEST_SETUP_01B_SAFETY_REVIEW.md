# MPIA — Phase 2A-01 TEST-SETUP-01B safety review

Updated: **15 October 2026 (Asia/Kuala_Lumpur)** after the owner started Docker and requested a recheck. Initial host/runtime observations were collected on 14 October; the unavailable-endpoint check and successful subsequent recheck are recorded below. Review only; the proposed startup runbook was **not executed**.

**Recommendation: conditional GO for the proposed, separately approved Stage 2 base-start method.** The Docker endpoint availability blocker is cleared by the successful read-only recheck after the owner started Docker. The documented loopback bridge and PG17 feature compatibility resolve the two original design-level blockers. **Stage 2 startup still awaits explicit approval**, all runbook preflight gates, and mandatory runtime isolation/compatibility acceptance checks. The request to rerun this review check was not treated as authorization to create or start the test stack. This is not implementation GO.

No container/network/volume was created, started, stopped or removed. No database connection, SQL execution, migration, fixture, reset, image pull, tool installation, application/source change, branch operation or commit occurred. No connection to external project `viddikrrhogcebpbstti` was made. The prepared configuration and user-profile telemetry file were not modified.

## 1. Authority and evidence boundaries

Read against these authoritative inputs:

- [Phase 1 architecture freeze](PHASE1_ARCHITECTURE_FREEZE.md).
- [Phase 2 architecture plan](PHASE2_ARCHITECTURE_PLAN.md), revision 1.0.
- [Foundation schema specification](PHASE2A_01_FOUNDATION_SCHEMA_SPEC.md), proposed revision 1.1.
- [Final readiness report](PHASE2A_01_FINAL_READINESS_REPORT.md).
- [Implementation checklist](PHASE2A_01_IMPLEMENTATION_CHECKLIST.md).
- [TEST-SETUP-01 preparation report](PHASE2A_01_TEST_SETUP_01_REPORT.md).

This review supplies a safer proposed replacement for the checklist's Stage 2 command sequence. It does not change those inputs, close D07 overall test readiness, approve D02/D04/D09/D10/D11, or grant D17 implementation permission. Stage 2 creates only a fresh platform base. Applying Phase 1 migrations, creating two test users, implementing foundation objects and running mutation tests remain later, separately authorized work.

Evidence classes used here:

| Class | Meaning |
|---|---|
| Observed | Local files, executable help/version/service selection, Docker metadata or Windows network metadata read during this review. |
| Documented | Official vendor documentation supports a mechanism or database semantic; not a measurement of this stopped target. |
| Historical | SQL/catalog findings supplied by earlier reports; no new database inspection was performed. |
| Pending runtime | Requires an approved startup or later approved fixture/test execution. Never counted as PASS here. |

Initial sandbox access to Docker context and Windows networking was denied. Read-only inspection was retried with tool approval. The sandbox's apparent `default` Docker context and unavailable server were discarded as access-failure artifacts; the approved inspection confirmed `desktop-linux`. No global context switch was performed.

## 2. Inspected local baseline and final recheck

**Earlier resumed check, 15 October:** tracked/index diffs were empty; the prepared TOML hash and profile telemetry metadata/hash matched. All nine proposed PowerShell blocks parsed without syntax errors; parsing does not execute or behaviorally validate them. Docker inventory/inspect calls failed because `npipe:////./pipe/dockerDesktopLinuxEngine` was not found, temporarily blocking the resource comparison. This historical failure is superseded by the successful recheck below. The review issued no command to start/stop Docker, WSL or containers.

**Owner-requested recheck, 15 October — read-only availability and collision checks PASS:**

| Rechecked item | Result |
|---|---|
| Local Docker endpoint / versions | `desktop-linux` and its local named pipe respond; Desktop 4.91.0 (239619), Engine 29.8.0 and API 1.56 match the initial review. |
| Existing resources | Same twelve Phase 1 container IDs, same three named volumes and same network names. No Stage 2 resource or proposed loopback network exists; the exact target project-label container query is empty. |
| Phase 1 database identity | Same full container ID, Created timestamp, image ID, data-volume mount, 54322 wildcard bindings and network ID `b8522b1655af1ea2603b67cdcaf0c3085d26bdddbd67d7fba6495a61a66ea3c7`. Running and healthy; restart count 0. No database query was made. |
| Restart-related difference | Database StartedAt is now `2026-10-14T19:46:01.710531432Z` (15 October 03:46:01 MYT), consistent with the owner's Docker restart. Runtime timestamps/network endpoint identifiers are not claimed unchanged. Existing Edge Runtime remains exited; vector remains in its prior restart loop. |
| Ports | Zero TCP listeners on 55420–55429 and 8183. Current IPv4/IPv6 excluded ranges are 50000–50059, 60476–60575, 60670–60769, 60770–60869, 60870–60969 and 60970–61069; none overlaps. Reservation ranges changed across the Docker restart and were rechecked rather than assumed. |
| Forwarding / firewall | No Windows port-proxy or NetNat static mappings; connected interface IPv4/IPv6 forwarding Disabled. Firewall profiles and WSL Hyper-V policy agree with the initial findings. |
| Configuration / environment | Branch/HEAD, empty tracked/index diffs, TOML hash and both CLI executable hashes match. Dedicated project still has only config/ignore/update-marker files; CLI pin remains 2.120.0. No relevant inherited environment names were returned. User `.wslconfig` remains absent; Desktop/daemon configuration key inventories match the initial inspection. |
| Telemetry | Profile file remains 235 bytes with identical creation/last-write timestamps and SHA-256. No CLI invocation was needed for this recheck and the file was not changed. |

These results clear the endpoint-unavailable blocker and reconfirm resource identity, not complete runtime isolation or Phase 1 data integrity. No Stage 2 service exists to probe. The runbook's network-creation verification, actual resolved bindings, off-host tests, runtime versions and role/catalog checks remain pending. Repeat time-sensitive preflight immediately before an approved startup.

| Item | Observed result |
|---|---|
| Branch / HEAD | `phase2-location-intelligence` / `934ea702a2ecfdb31c530ea4a33e21a2d55e27d2` |
| Tracked worktree / index | Empty diffs. Eight pre-existing untracked documentation inputs; no implementation drift. |
| Dedicated workdir | `C:\Users\ysyap\AI Projects\malaysia-property-investment-analyzer\.phase2a01-test.local` |
| Project ID | `mpia-phase2a01-upgrade` |
| Config SHA-256 | `358644615023c95d8d7a7b29395c34f53cf225de31be6a3d8b68c26bf60f9998` — matches TEST-SETUP-01 |
| CLI version / launcher SHA-256 | `2.120.0` / `1cbedd6e494581a1c1d90113660113a06798d9967d19c857127b66b8a428e836` |
| Companion `supabase-go.exe` SHA-256 | `fa2ba7fb02b01d98fa5a3c6d92632239b10c6974dbc42c65b698b6a479847343` |
| CLI location | `tooling/npm-cache/_npx/0e23c24576954b26/node_modules/@supabase/cli-windows-x64/bin/` under the dedicated workdir |
| TOML verification | Reparsed with Python `tomllib`; project ID, PG major 17, empty disabled migrations/seeds, enabled ports and disabled optional services agree with preparation report. |
| Target files | `supabase` contains only `.gitignore`, `config.toml`, `.temp`; `.temp` contains only `cli-latest`. No remote section, migration/seed directory or copied link metadata. |
| Target Docker resources | No container, network or volume named for `mpia-phase2a01-upgrade`; proposed bridge below also absent. |

On 14 October, Track A had the same twelve container IDs as the preparation report. Its database was `e7cd2cf20c5a6ce591810c5a8619b7cb8205ddd1e01596ee650fd24105df3e87`, created `2026-09-20T06:56:02.13708995Z`, started `2026-10-13T15:19:37.338131029Z`, restart count 0. Its image ID was `sha256:3866d94d8426927e8db3f1c5d790752292bfbe27b5f1f46e199ae1b7d3c1710b`; the same dedicated volume was mounted at `/var/lib/postgresql/data`. Its published database port was 54322 on `0.0.0.0` and `::`. Gateway, Studio, mail and analytics publications also matched. Edge Runtime was exited and vector was restarting; this review did not repair either. Natural activity of existing containers is not a task-issued restart. These observations do not assert that the engine or containers remain running on 15 October.

## 3. Network isolation assessment

### 3.1 Host and runtime observations

| Layer | Evidence and limit |
|---|---|
| Docker endpoint | `desktop-linux`, `npipe:////./pipe/dockerDesktopLinuxEngine`; local Linux engine, not a remote daemon. |
| Docker versions | Desktop `4.91.0 (239619)`; client/server Engine `29.8.0`, API `1.56`; Linux amd64, kernel `6.18.33.2-microsoft-standard-WSL2`. |
| Windows / WSL | Windows build `10.0.26200.9457`; WSL `2.7.14.0`; only listed distro is the already-running `docker-desktop`, WSL2. No distro was launched by this review. |
| WSL configuration | User `.wslconfig` absent. NAT is the documented default, but absence of an override is not proof of every effective Docker Desktop/WSL forwarding path. No explicit mirrored-mode configuration was found. |
| Desktop / daemon settings | User `settings-store.json` contains no explicit network, host-binding or WSL override keys. User `.docker/daemon.json` contains only `builder` and `experimental`; no configured direct-routing/default-network/host-IP override there. Managed settings and the daemon's complete effective configuration were not exhaustively audited. |
| Windows forwarding | Connected Wi-Fi, WSL virtual adapter and loopback report IPv4/IPv6 forwarding Disabled. `netsh interface portproxy show all` and `Get-NetNatStaticMapping` returned no mappings. This does not enumerate every third-party tunnel/proxy. |
| Firewall metadata | Domain/Private/Public enabled; default inbound action reports NotConfigured. WSL Hyper-V VM setting reports Enabled=True, DefaultInboundAction=Block, LoopbackEnabled=True. These values alone do not prove effective reachability. |
| Addresses | Wi-Fi has LAN IPv4 and globally routable IPv6 addresses; WSL has a virtual adapter address. IPv6 must be checked even though the proposed Docker bridge is IPv4-only. Avoid copying transient public addresses into durable evidence. |
| Port collision check | Zero Windows TCP listeners on 55420–55429 and 8183 on both inspections. The original 14 October excluded ranges did not overlap; section 2 records the changed 15 October ranges after Docker restarted. No overlap on recheck; not a reservation. |

Docker Desktop forwards published ports through its Windows backend, so a Linux bridge inspection alone is insufficient. Check the Windows listener and actual off-host path too. Docker supports explicit loopback publications; its default publication is broad. [Docker Desktop networking](https://docs.docker.com/desktop/features/networking/).

WSL NAT localhost forwarding and Windows port proxies are separate from Docker publication. Mirrored networking can enable direct LAN access and has distinct Hyper-V firewall behavior. If networking mode, VPN, adapters or forwarding settings change, revalidate isolation. `localhostForwarding`, `hostAddressLoopback` and `ignoredPorts` are not replacements for restricting published bindings; no WSL configuration change is proposed. [Microsoft WSL networking](https://learn.microsoft.com/en-us/windows/wsl/networking), [WSL configuration](https://learn.microsoft.com/en-us/windows/wsl/wsl-config).

### 3.2 Selected mechanism: dedicated loopback bridge

Create one **new project-specific user-defined bridge**, `mpia-phase2a01-loopback`, with `com.docker.network.bridge.host_binding_ipv4=127.0.0.1`, IPv4 enabled, IPv6 disabled and NAT gateway mode. Pass its inspected ID explicitly to the pinned CLI's `start --network-id`. This changes only a newly created network; it does not alter the daemon, global Desktop defaults, firewall or Track A.

Supabase's official local-development guide explicitly documents a separate network with that loopback option and `start --network-id`. The actual 2.120.0 executable's help confirms the flag. No supported per-service host-bind address was found in the prepared TOML or `start` help. [Supabase local development](https://supabase.com/docs/guides/local-development).

Docker documents the bridge option as the default for publications that omit a host address. An explicit wildcard publication can override that default, so runtime inspection remains essential. NAT is required; reject routed/nat-unprotected modes and trusted-host-interface exceptions. Engine 29.8.0 is newer than the documented pre-28 localhost/L2 exposure issue. [Docker port publication](https://docs.docker.com/engine/network/port-publishing/), [bridge driver options](https://docs.docker.com/engine/network/drivers/bridge/).

**Evidence limit:** the exact CLI tag's attempted public source URL returned 404; this review did not verify every compiled container-create path. Support is established by official instructions and the pinned executable's flag, not a claim that its code guarantees every HostIp. The network option, resolved container publications, Windows listeners and off-host probes must agree before accepting the base. Do not silently proceed if the CLI ignores/replaces the supplied network.

This is an inbound LAN/external isolation design, not an egress firewall or protection against a local Docker administrator. Local processes and members of the same bridge can reach the services. No Phase 1 or unrelated container may join it. No public tunnel, reverse proxy, port forwarding, host networking or shared network is permitted. A bridge named “local” or marked `--internal` by itself is not evidence of safe host publication.

### 3.3 Publication inventory and allowlist

All publications below are **proposed**, not observed new listeners. The only accepted resolved bindings are four TCP mappings on **127.0.0.1**. An unexpected IPv6 binding, even `::1`, requires review because this plan deliberately selects IPv4 loopback only.

| Service / surface | Proposed host port → container port | Required disposition |
|---|---|---|
| API gateway (Kong), REST/Auth routes | 55421 → 8000/tcp | Enabled, loopback only. Auth and REST are reachable through this gateway. |
| Database | 55422 → 5432/tcp | Enabled, loopback only. |
| Studio | 55423 → 3000/tcp | Enabled, loopback only; privileged administrative surface. |
| Mailpit local mail UI | 55424 → 8025/tcp | Enabled, loopback only; captured mail may contain login links. CLI may retain `inbucket` in the container name. |
| Mail SMTP / POP3 | 55425 / 55426 if enabled | Commented out; no host publications permitted. Internal SMTP is not the same as publishing SMTP to Windows. |
| Shadow database | 55420 | Reserved; no shadow/diff operation or publication in Stage 2. |
| Analytics / Logflare | 55427 | Disabled; absent. |
| Pooler / Supavisor | 55429 | Disabled; absent, including any additional session/transaction ports. |
| Edge Runtime / inspector | 8183, and any runtime/debug publication | Disabled; absent. |
| Auth (GoTrue) | Internal 9999/tcp | Enabled; no direct host publication. |
| PostgREST | Internal 3000/tcp | Enabled; no direct host publication. |
| Postgres metadata | Internal 8080/tcp | Enabled Studio dependency; no direct host publication. |
| Realtime, Storage API, imgproxy, vector | Internal component ports only if enabled | Disabled/excluded; no new container or publication permitted. Storage S3/vector/analytics features disabled too. |
| Gateway TLS/admin/status/debug, REST admin, DB ancillary endpoints | No host port allocated | No hidden/default/random publication accepted, including gateway 8443/8001/8444 or any TLS companion. TLS is disabled. |
| Application redirect URL | 3000 | URL only; no application launch or publication authorized. |

The container-side ports for enabled publishers are the expected mappings, to be reconciled against the selected images at startup. `Config.ExposedPorts` and bare `docker ps` entries such as `9999/tcp` do not themselves mean a host port is published. Inspect **every** actual mapping, not only known port numbers; any additional mapping is a stop condition.

`studio.api_url`, `auth.site_url`, redirect URLs and displayed localhost database URLs do not restrict HostIp. `db.network_restrictions` is disabled with generated allow-all CIDRs; do not treat that setting as local Docker ingress enforcement or change it as a substitute for binding control.

### 3.4 Alternative if binding support fails

If the bridge cannot be verified or Desktop publishes broadly, stop the new stack and mark Stage 2 BLOCKED. Do not use the ordinary default-network startup as a fallback.

A separately reviewed alternative is a dedicated Compose stack on an internal bridge with **no `ports:` entries for any service**, no host network, no Docker-socket mount and no shared Phase 1 volumes. Run SQL checks through the exact new database container's Unix socket and run Auth/REST HTTP checks from a dedicated test client on that same bridge. Omit Studio/mail UI publications; the browser path is not needed for base catalog checks. Reproduce the CLI-selected PG17/Auth/REST initialization, roles, keys and versions before claiming equivalence. This alternative is not implemented or authorized here and is not a generic PostgreSQL container substituted for Supabase.

If host/WSL routing remains uncertain even without publications, use a separately approved disposable VM with no external virtual NIC during testing and run its test client internally. Neither alternative may reuse Track A's data or alter host-global security settings.

## 4. PostgreSQL and Supabase compatibility

### 4.1 Actual comparison

`services --workdir <dedicated-root>` with the pinned CLI and containment settings reconfirmed these selected versions; remote-version fields were empty. No image was pulled or started.

| Component | Existing Track A | Proposed Stage 2 | Assessment |
|---|---|---|---|
| PostgreSQL image | `public.ecr.aws/supabase/postgres:17.6.1.155` | `supabase/postgres:17.11.0.004` | PG17 minor/packaging difference; fresh separate volume only. |
| SQL server version | 17.6, historical SQL evidence | Expected 17.11; not queried | Image tag alone does not establish `server_version_num`. |
| CLI | Existing Track A creator version not re-established | 2.120.0, local executable confirmed | Do not run this CLI against Track A to align versions. |
| Auth / GoTrue | `v2.197.0`, observed image tag | `v2.197.0` | Same tag, not yet proven same digest/configuration. |
| PostgREST | `v14.5`, observed image tag | `v16.4` | Material runtime change; retain explicit REST/JWT acceptance tests. |
| Studio / metadata | `2026.08.24-sha-8ec45b2` / `v0.99.0` | `2026.10.05-sha-94b8b06` / `v0.100.0` | Admin tooling differs; not a schema-semantics guarantee. |
| Gateway / mail | Kong `2.8.1`, Mailpit `v1.30.2` observed | Not enumerated by this `services` output | Record actual tags, image IDs/digests and mappings after startup; no exact-version assertion here. |

**Compatibility conclusion:** no identified PG17 feature requires downgrading to 17.6. Keep the CLI-selected stack and test its concrete behavior. PostgreSQL's 17.11 release notes identify a minor release with fixes and no dump/restore requirement within 17.X; that does not certify Supabase image initialization, roles, extensions or behavior as identical. This task proposes a fresh base, not an in-place patch upgrade or reuse of Track A storage. [PostgreSQL 17.11 release notes](https://www.postgresql.org/docs/17/release-17-11.html).

### 4.2 Requirement-by-requirement assessment

| Requirement | Confirmed/documented compatibility | Runtime evidence still required |
|---|---|---|
| PG17 DDL, types and CHECKs | PG17 supports the required UUID, text/arrays, integer/bigint, timestamptz, PK/UNIQUE/FK, CHECK and PL/pgSQL trigger features. No PostGIS dependency for 2A-01. CHECK accepts true or NULL, so NULL rejection must be explicit. | Later migration: all 61 exact tuples, NULL/array/duplicate cases, bounds/overflow, timestamps and FK/cascade behavior. No new DDL exists or was executed here. |
| RLS and FORCE RLS | FORCE subjects an ordinary owner to RLS; superuser/BYPASSRLS still bypass. RLS does not replace table privileges or constrain all whole-table operations. | Confirm role flags first; later inspect policy commands/roles and `relrowsecurity`/`relforcerowsecurity`, plus allowed and denied operations under actual API roles. |
| Membership and BYPASSRLS | Membership has ADMIN/INHERIT/SET options. Role attributes such as BYPASSRLS are not ordinary inherited object grants, but ability to SET ROLE to a privileged role is an escalation path. | Inspect all membership edges and transitive SET/inheritance paths. `authenticator` must be LOGIN/NOINHERIT and able to assume API roles without admin rights; anon/authenticated must have no path to owner/service/admin authority. |
| Defaults and MAINTAIN | PG17 includes MAINTAIN (`m`). Broad default ACLs can materialize new-object privileges. Revoke all new-object rights/grant options transactionally, then grant the exact matrix; no shared default-ACL change. | Compare creator-specific defaults, effective inherited/column rights and grant options. Later explicitly test MAINTAIN denial and no PUBLIC/API leakage on four tables/two guards. Do not require exactly six ACL rows if a newer platform has additional records; explain their effect. |
| Trigger functions / EXECUTE | CREATE TRIGGER requires creator TRIGGER plus function EXECUTE. Restricted direct function invocation and attached trigger execution are separate checks. Existing Phase 1 already revokes direct EXECUTE on helper triggers. | Later demonstrate permitted DML still fires both invoker guards after revocation, invalid DML fails, runtime cannot attach triggers, and direct EXECUTE ACL is absent. A trigger-return-type RPC error alone is not proof of the intended ACL. |
| `owns_property` / `auth.uid()` | Repository's final helper is SQL/STABLE/SECURITY INVOKER, queries `public.properties`, compares owner to `auth.uid()`, and fixes search_path to public. Historical Auth base supports request claim settings. | Stage 2 checks `auth.uid()` definition and role/schema access. `owns_property` should be absent before Phase 1 application. Later recheck helper definition and positive A/B ownership controls. |
| Synthetic two-user tests | Frozen SQL harness sets both `request.jwt.claims` and `request.jwt.claim.sub`, then SET LOCAL ROLE authenticated and asserts actual role/subject; anon clears the subject. This remains a valid SQL-level approach on PG17. | Separate later Auth-created A/B users and actual signed-token REST tests are needed. SQL claim injection does not test password login, signing/JWKS, expiry or REST claim propagation. Do not run the hardcoded Track A wrapper on populated B. |

Database semantic sources: [PG17 constraints](https://www.postgresql.org/docs/17/ddl-constraints.html), [row security](https://www.postgresql.org/docs/17/ddl-rowsecurity.html), [role membership](https://www.postgresql.org/docs/17/role-membership.html), [privileges](https://www.postgresql.org/docs/17/ddl-priv.html), [CREATE TRIGGER](https://www.postgresql.org/docs/17/sql-createtrigger.html).

Historical expected core flags: anon/authenticated are non-superuser/NOBYPASSRLS; service_role and postgres are non-superuser/BYPASSRLS; supabase_admin is superuser/BYPASSRLS. Service_role's registry read-only contract therefore depends on ACLs, not FORCE RLS. Its later state writes still need actor/ownership checks in the authorized backend. No shared role should be “repaired” to make the new stack look like a snapshot.

PostgREST 16 documents JWT validation and per-request role switching, including continued but deprecated support for the older role-claim path syntax. Supabase Auth provides JWT issuance and user management; neither component's presence proves the new combination's successful authentication. Confirm local Auth migrations/health, REST version and DB connectivity, claim extraction, issuer/audience/signing agreement and schema cache behavior. No precise version support matrix for this exact packaged combination was independently established; CLI selection is integration intent, not an executed compatibility test. [PostgREST authentication](https://docs.postgrest.org/en/stable/references/auth.html), [Supabase Auth upstream](https://github.com/supabase/auth).

Two-user fixture creation and login must wait for later authorization. Use synthetic `example.invalid` identities and no real mail/provider credentials. A and B each need own-row positive controls, reciprocal cross-user denials, anonymous denial, stale/missing/invalid-token checks and isolated client sessions. Claims-only SQL tests and real JWT/REST tests complement each other. Stage 2 must finish with zero Auth users and no public application tables.

## 5. Telemetry containment

The original init unexpectedly created `C:\Users\ysyap\.supabase\telemetry.json`, 235 bytes, outside the dedicated directory. Creation UTC is `2026-10-13T16:08:04.0094852Z`; last-write UTC is `2026-10-13T16:08:04.0115057Z` (14 October 00:08:04 MYT). This matches the earlier report to its recorded precision. It was neither deleted nor modified. Its contents/identifier are not reproduced here.

This review's CLI `--version`, `start --help`, `stop --help` and local `services` calls all used process-scoped `SUPABASE_HOME=<dedicated-root>/tooling/supabase-home`, `SUPABASE_TELEMETRY_DISABLED=true`, `DO_NOT_TRACK=1`, and `SUPABASE_NO_UPDATE_NOTIFIER=1`. The profile file metadata remained unchanged; a read-only hash was also compared during review. The directory-local CLI home already contains a telemetry file, so disabled telemetry does not imply no local bookkeeping file.

Future invocations must use the wrapper below, including failure cleanup. It calls the already cached exact executable directly, avoiding an npm resolution/install step, and retains a local npm cache setting defensively. No persistent user/machine environment changes are proposed. Abort on inherited access tokens, database targets, alternate service hostnames, remote Docker overrides or an unexpected profile/home; do not print their values. Do not use `--create-ticket`, login/link, remote config commands or debug logs containing credentials.

These controls and unchanged metadata establish invocation/file containment evidence. They do not establish that the first init sent nothing or provide a packet-level zero-telemetry attestation for this review. Docker Desktop telemetry is separate and was not reconfigured.

## 6. Proposed Stage 2 startup runbook — DO NOT EXECUTE NOW

This is an ordered operator runbook with explicit review gates, not an unattended paste-and-run script. Approval must cover creating the dedicated network, pulling CLI-selected images as needed, initializing only this fresh Supabase platform base, the bounded read-only checks below, and stopping only newly created target containers if a gate fails. Platform initialization necessarily writes its own database/Auth catalogs; application migrations, fixtures and resets remain excluded.

### Step 1 — Bind the approved identity and check drift

From the repository root, establish exact paths and inspect branch, HEAD, tracked/index diff and untracked files. Stop on any unexplained difference; do not switch branches or modify Git.

```powershell
$ErrorActionPreference = 'Stop'
$mpiaRepo = 'C:\Users\ysyap\AI Projects\malaysia-property-investment-analyzer'
$mpiaTestRoot = Join-Path $mpiaRepo '.phase2a01-test.local'
$mpiaProject = 'mpia-phase2a01-upgrade'
$mpiaNetworkName = 'mpia-phase2a01-loopback'
$mpiaDbName = 'supabase_db_mpia-phase2a01-upgrade'
$mpiaCliDir = Join-Path $mpiaTestRoot 'tooling/npm-cache/_npx/0e23c24576954b26/node_modules/@supabase/cli-windows-x64/bin'
$mpiaCli = Join-Path $mpiaCliDir 'supabase.exe'
git -C $mpiaRepo branch --show-current
git -C $mpiaRepo rev-parse HEAD
git -C $mpiaRepo status --short
git -C $mpiaRepo diff --exit-code
if ($LASTEXITCODE -ne 0) { throw 'Tracked drift' }
git -C $mpiaRepo diff --cached --exit-code
if ($LASTEXITCODE -ne 0) { throw 'Index drift' }
Get-FileHash -LiteralPath $mpiaCli
Get-FileHash -LiteralPath (Join-Path $mpiaCliDir 'supabase-go.exe')
Get-FileHash -LiteralPath (Join-Path $mpiaTestRoot 'supabase/config.toml')
```

Require the identities/hashes in section 2. Reparse TOML and reconcile every enabled service/port against section 3.3. Preserve disabled/empty migrations and seeds. Reject any `.env`, SQL/migration/seed, `remotes`, `project-ref`, `linked-project.json`, `pooler-url`, `start-secrets`, copied keys/credentials or reparse-point path in the dedicated project. Check the local CLI home for unexpected credentials without printing them. No parent-directory configuration lookup is allowed.

Before setting containment variables, enumerate relevant environment **names only** and review unexpected entries. Reject inherited SUPABASE_ACCESS_TOKEN, database/PG target variables, SUPABASE_SERVICES_HOSTNAME, DOCKER_HOST and unreviewed SUPABASE/DOCKER overrides. Inspect process/system forwarding tools and confirm no public tunnel/reverse proxy is forwarding the proposed ports. Reconfirm Windows/WSL networking facts and arrange a second device on the same LAN for Step 6; inability to obtain meaningful off-host evidence blocks acceptance of the running base.

Use this wrapper for every proposed Supabase invocation. It restores the caller's environment even on failure.

```powershell
function Invoke-MpiaLocalCli {
  param([string[]]$CliArgs)
  $mpiaEnv = @{
    SUPABASE_HOME = (Join-Path $mpiaTestRoot 'tooling/supabase-home')
    SUPABASE_TELEMETRY_DISABLED = 'true'
    DO_NOT_TRACK = '1'
    SUPABASE_NO_UPDATE_NOTIFIER = '1'
    NPM_CONFIG_CACHE = (Join-Path $mpiaTestRoot 'tooling/npm-cache')
    DOCKER_CONTEXT = 'desktop-linux'
  }
  $mpiaSavedEnv = @{}
  foreach ($mpiaKey in $mpiaEnv.Keys) {
    $mpiaSavedEnv[$mpiaKey] = [Environment]::GetEnvironmentVariable($mpiaKey, 'Process')
  }
  try {
    foreach ($mpiaKey in $mpiaEnv.Keys) {
      [Environment]::SetEnvironmentVariable($mpiaKey, $mpiaEnv[$mpiaKey], 'Process')
    }
    & $mpiaCli @CliArgs --workdir $mpiaTestRoot
    if ($LASTEXITCODE -ne 0) { throw 'Pinned local CLI command failed' }
  } finally {
    foreach ($mpiaKey in $mpiaSavedEnv.Keys) {
      [Environment]::SetEnvironmentVariable($mpiaKey, $mpiaSavedEnv[$mpiaKey], 'Process')
    }
  }
}
Invoke-MpiaLocalCli -CliArgs @('--version')
Invoke-MpiaLocalCli -CliArgs @('services')
```

### Step 2 — Check target absence, ports and Phase 1 baseline

Read `docker context inspect desktop-linux` and `docker --context desktop-linux version`. Require the local named-pipe endpoint and reviewed Engine/Desktop versions. A changed runtime requires re-review of network assumptions.

```powershell
docker --context desktop-linux ps -a --no-trunc --format '{{.ID}}|{{.Names}}|{{.Image}}|{{.Ports}}'
docker --context desktop-linux volume ls
docker --context desktop-linux network ls
Get-NetTCPConnection -State Listen |
  Where-Object { $_.LocalPort -in (55420..55429 + 8183) }
netsh interface ipv4 show excludedportrange protocol=tcp
netsh interface ipv6 show excludedportrange protocol=tcp
netsh interface portproxy show all
```

Require zero target resources by both names and labels, no proposed network name, no target container with any alternate name, no relevant listener/reservation and no forwarding entry. Capture all existing IDs plus Phase 1 image IDs, Created/StartedAt, restart counts, mounts, ports and network attachments into protected local evidence; omit container environment/secret output. Do not adopt an existing target or auto-select another port. Metadata/permission errors fail preflight. Recheck ports immediately before startup because there is no reservation.

### Step 3 — Create and verify only the dedicated network

**First proposed mutating command; approval required.** Do not execute until Steps 1–2 pass.

```powershell
$mpiaNetworkId = docker --context desktop-linux network create `
  --driver bridge --ipv4=true --ipv6=false `
  --label 'mpia.review=phase2a01-test-setup-01b' `
  --label 'com.supabase.cli.project=mpia-phase2a01-upgrade' `
  --opt 'com.docker.network.bridge.host_binding_ipv4=127.0.0.1' `
  --opt 'com.docker.network.bridge.gateway_mode_ipv4=nat' `
  $mpiaNetworkName
if ($LASTEXITCODE -ne 0) { throw 'Network creation failed; do not start' }
$mpiaNetworkId = $mpiaNetworkId.Trim()
docker --context desktop-linux network inspect $mpiaNetworkId
```

Require the exact returned ID/name, local bridge driver, IPv4 enabled/IPv6 disabled, loopback option, NAT, empty Containers and expected label. Reject trusted-host-interface options, routed/unprotected modes or unexpected global direct-routing overrides. Check the allocated subnet for collisions with existing Docker/Windows/VPN routes. If effective routing or network options cannot be established, do not start containers; use the alternative review path. Do not modify the default bridge or existing Supabase network.

### Step 4 — Start only the isolated base, with immediate monitoring

Have a second terminal ready for Step 5 and the fail-closed action. Record the pre-start container IDs and begin observing newly created project containers while startup runs; do not wait for the full CLI health timeout to investigate a wildcard binding. No synthetic users/data may exist during this verification window.

```powershell
Invoke-MpiaLocalCli -CliArgs @(
  'start', '--network-id', $mpiaNetworkId,
  '--exclude', 'realtime,storage-api,imgproxy,edge-runtime,logflare,vector,supavisor'
)
```

The explicit exclusions reinforce the disabled TOML flags. DB, Kong, Auth, PostgREST, metadata, Studio and Mailpit are the expected base components. No `--ignore-health-check`, unqualified `supabase start`, experimental stack command, reset, link or root-workdir startup is permitted. The CLI may download images and initialize platform schemas in the fresh volume; it must not apply application SQL. Keep startup credentials off the report/terminal transcript and within the ignored local directory if captured.

### Step 5 — Inspect every new container before database/Auth checks

Immediately enumerate by exact project label, then reconcile against **all** new IDs since preflight to catch unlabeled/unexpected containers. Each intended container must have the correct project and workdir identity. Do not dump `.Config.Env`.

```powershell
$mpiaNewIds = @(docker --context desktop-linux ps -aq `
  --filter 'label=com.supabase.cli.project=mpia-phase2a01-upgrade')
if ($LASTEXITCODE -ne 0 -or $mpiaNewIds.Count -eq 0) { throw 'Missing target containers' }
foreach ($mpiaId in $mpiaNewIds) {
  docker --context desktop-linux inspect $mpiaId --format `
    '{{.Id}}|{{.Name}}|{{.Created}}|{{.Config.Image}}|{{.Image}}|{{json .Config.Labels}}|{{json .State}}|{{json .Mounts}}|{{.HostConfig.NetworkMode}}|{{.HostConfig.PublishAllPorts}}|{{json .HostConfig.PortBindings}}|{{json .NetworkSettings.Ports}}|{{json .NetworkSettings.Networks}}'
  if ($LASTEXITCODE -ne 0) { throw 'Container inspection failed' }
}
docker --context desktop-linux network inspect $mpiaNetworkId
Get-NetTCPConnection -State Listen |
  Where-Object { $_.LocalPort -in (55420..55429 + 8183) } |
  Select-Object LocalAddress, LocalPort, OwningProcess
```

Require all of the following, checked while starting and again when healthy:

- Exactly the intended base components, no optional/unexpected containers; every target joins only the reviewed network. No host/container/shared network mode and `PublishAllPorts=false`.
- Resolved `.NetworkSettings.Ports` equals the four mappings in section 3.3, each HostIp `127.0.0.1`. Other exposed ports have null/no publication. Empty HostIp in the *requested* `.HostConfig.PortBindings` can mean “use network default”; accept only if resolved mappings and Windows listeners prove loopback. Any explicit wildcard request is a stop condition even if another layer appears to block it.
- Windows IPv4 listeners are loopback only; no wildcard, LAN, VPN or IPv6 listener. If Windows reports cannot be reconciled with Docker's view, stop rather than declaring a pass.
- New database uses its own named volume at `/var/lib/postgresql/data`. No Track A volume, root linked project, user-profile secret directory or Docker socket mounted. Any host bind must resolve inside the dedicated test root (allowing Desktop's translated mount path only after validating its source). Inspect all created volumes' labels/names too.
- Record actual image tag, image ID and available RepoDigests, health and role of every container. Record unexpected versions and stop for material DB/Auth/REST divergence. An image tag is not a digest.
- No pre-existing container identity/mount/network/publication changed. Resource starvation, port collisions, failed health or unexpected mounts invoke Step 8; do not repair/restart Phase 1.

### Step 6 — Validate reachability from outside the host

First establish positive local TCP connectivity to 127.0.0.1:55421–55424. Then test every current non-loopback host address from the host as a supplementary check. Do not mistake those same-host tests for an off-host result.

From a separate authorized device on the **same LAN/L2 segment**, attempt TCP connections to the Windows machine's current LAN IPv4 and each reachable IPv6 address for all 55420–55429 and 8183. For example, in that device's PowerShell:

```powershell
# Set this to the reviewed Windows host address, never a Supabase cloud hostname.
$mpiaTargetAddress = '<current Windows LAN IPv4 or IPv6 address>'
foreach ($mpiaPort in (55420..55429 + 8183)) {
  Test-NetConnection -ComputerName $mpiaTargetAddress -Port $mpiaPort `
    -InformationLevel Detailed
}
```

Repeat for relevant VPN/routed interfaces and, where the host has public IPv6 or an existing public forwarding path, from an authorized off-LAN vantage point. Never create a new public forwarding rule to run the test. If a route to the Docker/WSL container subnet already exists, test discovered container addresses and internal service ports too. No new routes are to be installed.

Expected: local positive controls succeed; **every off-host target-port attempt fails**. Record source/vantage, target address family/interface, time, port, result and route limitations in private evidence. Validate the testing device's path using an already-authorized reachable endpoint or existing network diagnostic; client isolation or an unroutable address makes negative results inconclusive. Do not probe unrelated hosts or Phase 1 services as control targets. HTTP 401/403 or PostgreSQL authentication rejection counts as **reachable/exposed**, not isolated. If off-host testing is unavailable/inconclusive, do not certify or retain the base as ready: stop the new stack and report BLOCKED.

### Step 7 — Minimal runtime database/Auth checks after isolation passes

Only the exact newly verified database container ID may be used. Resolve it from `supabase_db_mpia-phase2a01-upgrade`, then recheck its project label, network and fresh volume against Step 5. Execute through the local Unix socket, without a URL or password and without touching Track A:

```powershell
$mpiaVerifiedDbId = docker --context desktop-linux inspect $mpiaDbName --format '{{.Id}}'
if ($LASTEXITCODE -ne 0) { throw 'Target database missing' }
# After identity verification, submit the read-only SQL block below via stdin:
$mpiaReadOnlySql | docker --context desktop-linux exec -i $mpiaVerifiedDbId `
  psql -X -U postgres -d postgres -v ON_ERROR_STOP=1
if ($LASTEXITCODE -ne 0) { throw 'Base SQL checks failed' }
```

Set `$mpiaReadOnlySql` to the following reviewed text using a PowerShell single-quoted here-string. The assignment and execution are future steps only:

```sql
BEGIN READ ONLY;
SET LOCAL statement_timeout = '10s';
SELECT current_database(), current_user, session_user,
       current_setting('server_version'), current_setting('server_version_num'),
       current_setting('transaction_read_only');
SELECT rolname, rolsuper, rolbypassrls, rolinherit, rolcanlogin,
       rolcreaterole, rolcreatedb
FROM pg_roles ORDER BY rolname;
SELECT member_role.rolname AS member, parent_role.rolname AS granted_role,
       m.admin_option, m.inherit_option, m.set_option
FROM pg_auth_members m
JOIN pg_roles member_role ON member_role.oid = m.member
JOIN pg_roles parent_role ON parent_role.oid = m.roleid
ORDER BY 1, 2;
SELECT r.rolname AS api_role, p.rolname AS privileged_role,
       pg_has_role(r.oid, p.oid, 'USAGE') AS inherited_access,
       pg_has_role(r.oid, p.oid, 'SET') AS can_set_role
FROM pg_roles r CROSS JOIN pg_roles p
WHERE r.rolname IN ('anon','authenticated')
  AND (p.rolsuper OR p.rolbypassrls OR p.rolcreaterole
       OR p.rolname IN ('postgres','supabase_admin','service_role'));
SELECT pg_get_userbyid(d.defaclrole) AS creator,
       n.nspname, d.defaclobjtype, d.defaclacl
FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
ORDER BY 1, 2, 3;
SELECT r.rolname, n.nspname,
       has_schema_privilege(r.oid,n.oid,'USAGE') AS usage,
       has_schema_privilege(r.oid,n.oid,'CREATE') AS create_privilege
FROM pg_roles r CROSS JOIN pg_namespace n
WHERE r.rolname IN ('anon','authenticated','service_role')
  AND n.nspname IN ('public','auth','extensions');
SELECT pg_get_functiondef('auth.uid()'::regprocedure);
SELECT count(*) AS auth_users FROM auth.users;
SELECT n.nspname, c.relname, c.relkind
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname IN ('public','supabase_migrations')
  AND c.relkind IN ('r','p','v','m','f') ORDER BY 1,2;
SELECT to_regprocedure('public.owns_property(uuid)') AS phase1_helper;
ROLLBACK;
```

Expected: database postgres, user postgres, read-only on, actual PG17.11 consistent with selected image; zero Auth users; no public application relations/application migration ledger; Phase 1 helper absent. Explain any platform-created object before continuing. Compare roles/default ACLs/schema authority and `auth.uid()` against section 4 and the historical readiness evidence. Do not execute DDL, create a probe user/table, change grants or “normalize” roles. A mismatch is review evidence, not permission to repair.

For Auth/REST, use only the verified gateway `http://127.0.0.1:55421` and local credentials retained privately from this new stack. GET `/auth/v1/health` and record its reported version/health; supply the new local anon API key if gateway authentication requires it. Confirm Auth tag/digest and health agree with v2.197.0. Resolve the exact new REST container ID and use its installed `postgrest --version` (the image command is expected at `/bin/postgrest`) to confirm v16.4. A GET `/rest/v1/` with the new local anon key should reach PostgREST and its empty-base schema without DB/JWT configuration errors. Do not echo tokens/keys or create users to make this health check pass. An auth challenge alone does not establish Auth health; an empty schema alone does not establish RLS.

Base SQL/HTTP checks cannot certify the future table policies, guards, MAINTAIN revocations, A/B fixtures or REST login flow. Those remain explicit later acceptance tests.

### Step 8 — Fail closed and preserve other targets

Any collision, wildcard/non-loopback/extra publication, unexplained network/mount, wrong identity, unexpected credentials/link, failed health/version/role check, inconclusive external probe or inability to inspect stops progression. Interrupt the startup process so it cannot continue creating containers; do not assume Ctrl-C alone removed them. Then use the same contained CLI wrapper, with the explicit local project ID:

```powershell
Invoke-MpiaLocalCli -CliArgs @(
  'stop', '--project-id', 'mpia-phase2a01-upgrade',
  '--network-id', $mpiaNetworkId
)
```

Never use `stop --all`, `--no-backup`, `docker compose down` from the repository, prune/reset or volume deletion. If the CLI cleanup fails, enumerate only IDs absent from the pre-start baseline that have the exact target label/name/workdir and belong to the new network; stop those exact verified IDs with `docker --context desktop-linux stop <verified-new-ID>`. No broad filter may be piped straight to a stop command. Unknown ownership means halt and request review, not stop someone else's resource. Retain volumes and redacted evidence for diagnosis.

Re-enumerate all containers and listeners to prove no new target remains running or published. Recompare Phase 1 IDs, image IDs, StartedAt, mounts, ports and networks; account for its pre-existing vector restart loop separately. Do not modify Phase 1 to restore the new test. If cleanup cannot remove exposure using only verified new resources, report the unresolved exposure immediately and keep the task BLOCKED; do not change global firewall/daemon settings.

### Step 9 — Record acceptance and stop at the Stage 2 boundary

Only if all gates pass, record exact images/digests, server/Auth/REST versions, role/ACL findings, project/network/volume identities, resolved bindings, local positive controls, off-host failures with limitations, and preserved Phase 1 metadata. Recheck branch/HEAD/config hashes, link absence and profile telemetry size/time/hash. Avoid secrets and user data in evidence.

The external project remains untouched by construction: no login/link, remote project flags, external URL, copied credential or remote CLI operation is in this runbook. This is not a fresh audit of that project's contents. Leave migrations/seeds disabled and zero synthetic users; stop work after documenting the base. Stage 3/fixtures, Phase 2A-01 implementation and any deployment still require separate explicit approval.

## 7. Disposition

| Review issue | Disposition |
|---|---|
| Supported binding mechanism | Resolved at design level: documented dedicated bridge option plus pinned CLI network flag. No TOML change essential. |
| Windows/WSL effective reachability | Pending approved startup and mandatory binding/listener/off-host verification; failure is BLOCKED. |
| PG17.6 vs PG17.11 | No feature incompatibility identified for 2A-01; retain selected fresh PG17.11 base and frozen Track A. No downgrade, image override or storage reuse. |
| Auth/REST/platform parity | Auth tag matches; REST/admin tooling differ. Exact role/grant/JWT behavior and image digests require runtime/later test evidence. |
| Telemetry discrepancy | Preserved and disclosed; future invocations contained by explicit wrapper. No profile-file cleanup or zero-transmission claim. |
| Configuration changes | None made or required in prepared TOML. Only proposed new network creation and mandatory `--network-id`/exclusion invocation arguments. |
| Docker availability / resource identity recheck | **PASS on owner-requested 15 October recheck.** Endpoint responds and resource identities match. Database start time changed consistently with the owner-reported Docker restart; no task-issued container operation or DB access. |
| Stage 2 recommendation / execution | **Conditional GO for this gated base-start method; await explicit startup approval.** Repeat time-sensitive preflight, verify the new network, and pass runtime isolation/compatibility gates. |
| Phase 2A-01 implementation | Still BLOCKED / not authorized. |

Only this safety-review document was added. The runbook has not been executed.
