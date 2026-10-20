# MPIA — Phase 2A-01 TEST-SETUP-02A proposed Stage 2 recovery runbook

Date: **16 October 2026 (Asia/Kuala_Lumpur)**. **DESIGN ONLY — NOT EXECUTED. STARTUP BLOCKED.**

This proposes **Option B: a separate Supabase-compatible base with no host publications**. Read the [root-cause review](PHASE2A_01_TEST_SETUP_02A_ROOT_CAUSE_REVIEW.md) first. The failed CLI startup must not be repeated, and the old loopback-default recipe is not an approved fallback. No instruction below authorizes Stage 3, application SQL, synthetic fixtures, Phase 2A-01 implementation, live Supabase access, provider calls or deployment.

This runbook is independently reviewable as a procedure, but **not yet an executable release package**. The exact Compose model, upstream bootstrap revision, verification scripts and test-client artifact have deliberately not been constructed under the read-only request. Gate 0 lists what must be prepared and reviewed before any startup approval can be meaningful. Every code block below is an unexecuted future instruction, not a record of a command run during TEST-SETUP-02A.

## 1. Preconditions and exact target boundary

| Identity | Required value |
|---|---|
| Repository | `C:\Users\ysyap\AI Projects\malaysia-property-investment-analyzer` |
| Audited branch / commit | `phase2-location-intelligence` / `934ea702a2ecfdb31c530ea4a33e21a2d55e27d2` |
| Docker context / endpoint | `desktop-linux` / local `npipe:////./pipe/dockerDesktopLinuxEngine` |
| Reviewed runtime | Desktop `4.91.0 (239619)`, Engine `29.8.0`, API `1.56`, Compose `5.5.1`; any change requires review |
| New workdir | `<repository>/.phase2a01-recovery02a.local` |
| New Compose project | `mpia-phase2a01-recovery02a` |
| New network | `mpia-phase2a01-recovery02a-private` |
| New database volume | `mpia-phase2a01-recovery02a-db` |
| Additional DB configuration volume | `mpia-phase2a01-recovery02a-db-config`, only if required by the reviewed upstream bootstrap; exact use must be fixed before approval |
| Protected failed volume | `supabase_db_mpia-phase2a01-upgrade` — preserve, never attach/reuse |
| Protected Phase 1 DB | `supabase_db_malaysia-property-investment-analyzer`; ID `e7cd2cf20c5a6ce591810c5a8619b7cb8205ddd1e01596ee650fd24105df3e87` |
| Protected Phase 1 network | `supabase_network_malaysia-property-investment-analyzer`; ID `b8522b1655af1ea2603b67cdcaf0c3085d26bdddbd67d7fba6495a61a66ea3c7` |
| Allowed host publications | **None**, including loopback, IPv6, random ports, debug/admin/SMTP endpoints |

Exact proposed service/container names:

| Compose service | Container name | Internal use only |
|---|---|---|
| `db` | `mpia-phase2a01-recovery02a-db` | PG17, PostgreSQL 5432 |
| `auth` | `mpia-phase2a01-recovery02a-auth` | GoTrue 9999 |
| `rest` | `mpia-phase2a01-recovery02a-rest` | PostgREST 3000 |
| `kong` | `mpia-phase2a01-recovery02a-kong` | Gateway 8000; no host admin/TLS endpoint |
| `meta` | `mpia-phase2a01-recovery02a-meta` | Metadata 8080 |
| `studio` | `mpia-phase2a01-recovery02a-studio` | Internal UI 3000 |
| `mailpit` | `mpia-phase2a01-recovery02a-mailpit` | Internal SMTP and capture UI, exact image ports verified in preparation |
| `client` | `mpia-phase2a01-recovery02a-client` | Dedicated HTTP/verification client, no inbound listener |

All resources require the exact Compose project identity and an additional `mpia.review=phase2a01-test-setup-02a` label where supported. Container service labels must match this table. No aliases to Phase 1 services, `host.docker.internal`/host-gateway forwarding, socket proxies or second networks. Host-loopback inside a container refers to that container, so Auth/REST use service DNS names such as `db` and `kong`; do not copy Windows localhost URLs into inter-service connection settings.

The owner confirmed a Docker/Windows restart between the failed-attempt review and the resumed inspection. Resource identities persisted; endpoint/start-time drift is documented in the root-cause review. The future preflight must capture a fresh baseline rather than require old endpoint IDs or quietly ignore new drift.

## 2. Gate 0 — prepare an approval-ready package, separately authorized

**No resource creation or startup until all items below are concrete, hashed, reviewed and approved.** Preparation itself requires a later explicit instruction because the current request forbids construction of the alternative stack.

1. Prepare a single explicit Compose file, `compose.yaml`, in the new workdir; no inherited root configuration, automatic override, remote include, profile-dependent extra service or generated stack inferred at execution time. Prepare `.local.secrets`, bootstrap configuration, the test-client program, preflight/inspection/monitoring/cleanup scripts and read-only SQL/HTTP verification specifications. All artifacts and bind sources stay inside that new workdir, without reparse points. Create its ignore rule before secrets. Do not copy `.env`, link metadata, credentials, data or migrations from the repository or failed target.
2. Select a coherent, immutable upstream Supabase bootstrap source revision. Record each initialization file's source, hash, order and intended effect, including image-bundled initialization versus external init scripts and Auth's own schema migrations. Reconcile roles, extensions, schemas, passwords, JWT settings and gateway routing with the selected images. Distinguish **platform initialization**, permitted only during approved Stage 2 creation/start, from prohibited **application migrations/fixtures**. No invented minimal role schema, ad hoc grant repair, image rebuild or live-container patching.
3. Pin repository-qualified image digests for every service. Candidate platform tags/digests appear in the root-cause review; re-inspect local cache availability and architecture. Select and verify the client's executable and exact image digest; reusing an existing cached image is acceptable only after checking its tooling. A missing image or incompatible bootstrap blocks this package; acquisition/version changes need a separately reviewed scope. The proposed execution uses no pulls, builds or installs.
4. Fix the complete mount inventory: new DB storage at the image's verified PGDATA path, optional independently named DB configuration storage if required, and read-only bootstrap/client/config/secret mounts confined to the new directory. No anonymous persistence, Phase 1/failed volume, user-profile/root-repository mount, Docker/named-pipe socket, host device, privileged mode, host PID/IPC/network or Docker API access. Any additional required writable path must be explained and approved, not added during startup.
5. Generate new local-only credentials with suitable randomness in later authorized preparation; no production keys or upstream sample passwords. Define matching Auth/JWT/API-key/REST/gateway configuration, SMTP capture only, disabled external providers/hooks/telemetry and no outbound service dependency. Keep keys/passwords out of command lines, reports and ordinary logs. Review the test-client output filter before it handles credentials.
6. Set every service to restart policy `no`; cap resources within measured host headroom, set bounded health-check intervals/timeouts, and define readiness dependencies. No automatic startup on Desktop restart. Require only the dedicated bridge, `internal=true`, IPv4 enabled, IPv6 disabled, and proposed `com.docker.network.bridge.gateway_mode_ipv4=isolated`. Do not silently substitute NAT/routed/unprotected mode if isolated mode is unsupported. No `ports`, `publish`, `publish-all`, host networking or service-port forwarding anywhere.
7. Review an expanded Compose model **without printing interpolated secrets**. Parse in memory or retain in protected local evidence, then emit only structural assertions and redacted metadata. Examine every enabled service and every mount/network/port; removing a `ports` entry in one fragment does not prove a merged model has no publications. Review image `VOLUME`, entrypoint, command and health-check requirements as well.
8. Prepare an approval manifest containing exact files/hashes, upstream commit, image references/IDs/digests, service names, networks, volumes, binds, environment variable names, health checks, resource limits, allowed initialization, version-difference acceptance and cleanup boundaries. Include separate fresh-case plans for later synthetic tests; do not create those cases now. Validate verification scripts on static safe examples, including unexpected mappings/mounts, missing metadata, baseline IDs and malformed evidence, without a Docker startup.

Owner approval must name this completed package revision/hash, preservation of the failed volume, and the stages that may execute. An approval to investigate, to prepare files, or to resume this review does **not** authorize create/start. A future approval should explicitly include target-specific failure stop/removal, with all volumes retained, so an exposure response does not wait for another permission turn.

**No-link scope decision:** the original repository remains linked. The owner must accept that the recovery uses a separate, unlinked workdir with no live connections, while original link files remain untouched. If absolute workspace-wide link absence is required, remain BLOCKED and resolve that requirement separately. Never run Supabase CLI from the root linked project as part of recovery.

## 3. Gate 1 — read-only preflight immediately before creation

Record approved artifact hashes and repeat all checks after any pause, host restart, runtime change or relevant environment change. A metadata permission error is a failed gate, not an empty result.

1. Verify branch/HEAD, empty tracked and index diffs, five unchanged historical migration files, unchanged old CLI/TOML hashes from the root-cause review, and the approved new package hashes. Inventory untracked files and explain differences. Do not switch branches or fix drift.
2. Verify explicit local Docker context/endpoint and versions. Enumerate **all** containers, networks and volumes, not only project-filtered results. Record full IDs, creation times, image IDs/tags, labels, mounts, network attachments, requested/resolved ports, state, start time and restart count without dumping environment or raw logs. Normalize PowerShell zero/single-item arrays when comparing evidence.
3. Confirm every new name and project/review label is absent. Existing resource collision means BLOCKED, not adoption, force recreation or choosing a suffix automatically. The failed target remains absent except its retained database volume; confirm that volume's exact identity and zero attachments without mounting it.
4. Capture the fresh Phase 1 baseline: twelve container identities, three volumes, the existing network and current runtime state. Database must remain running/healthy. Record the known exited Edge Runtime and vector restart loop separately; do not repair them. An unexplained difference outside these disclosed conditions blocks execution.
5. Enumerate inherited environment **names only** before containment. Reject unexplained `COMPOSE_*`, `DOCKER_*`, SUPABASE, PG, DATABASE, DB_, proxy/tunnel and credential/endpoint overrides. Use explicit project/file/directory/env-file flags for every Compose invocation; never rely on current-directory discovery. Do not copy profile credentials.
6. Inspect new-directory contents, config values, symlinks/reparse points and secret-handling permissions. Require no remote link markers, hosted Supabase URLs, external database connection target, application SQL or production data. Review every URL and connection host in memory without printing secret-bearing values. Check that new service credentials cannot resolve to the original project.
7. Recheck Windows TCP listeners, excluded-port ranges, portproxy, NAT mappings and relevant routing/forwarding configuration. Require the old test ports `55420–55429` and `8183` unused. New stack has **zero** allocated host ports, so an unrelated listener is not permission to select another port. Compare all new listeners after creation/start, not only the old range.
8. Confirm no tunnel/proxy/configured host-network path reaches the new target. Compare planned subnet allocation with existing Docker, Windows, VPN and nondefault routes. Addresses remain in private evidence only. Arrange meaningful off-host checks for applicable LAN/IPv6/routed paths; do not change routes/firewalls or probe Phase 1 as a control.
9. Verify local availability of all pinned image digests and enough CPU/memory/disk headroom for Phase 1 plus the bounded new stack. No pulls or upgrades. Prepare the monitor and exact-ID cleanup controller before resource creation.

Representative non-mutating identity commands, for the future approved operator:

```powershell
git branch --show-current
git rev-parse HEAD
git diff --exit-code
git diff --cached --exit-code
docker context inspect desktop-linux --format '{{.Endpoints.docker.Host}}'
docker --context desktop-linux version
docker --context desktop-linux compose version
docker --context desktop-linux ps -a --no-trunc --format '{{.ID}}|{{.Names}}|{{.Image}}|{{.Ports}}'
docker --context desktop-linux volume ls
docker --context desktop-linux network ls
```

The prepared wrapper must check **each** native-command exit code and assert values, not simply run this display list. No infrastructure change occurs during preflight.

## 4. Gate 2 — approved creation while stopped

**First infrastructure mutation. Requires Gate 0 approval and Gate 1 PASS.** Creation may allocate fresh volumes and container writable layers; it must not start a service, execute SQL or attach retained storage.

Use the approved wrapper with exact paths and a deliberately constrained process environment. Proposed create operation:

```powershell
$mpiaRecoveryRoot = 'C:\Users\ysyap\AI Projects\malaysia-property-investment-analyzer\.phase2a01-recovery02a.local'
$mpiaComposeFile = Join-Path $mpiaRecoveryRoot 'compose.yaml'
$mpiaSecretFile = Join-Path $mpiaRecoveryRoot '.local.secrets'
$mpiaComposeArgs = @(
  '--context', 'desktop-linux', 'compose',
  '--project-name', 'mpia-phase2a01-recovery02a',
  '--project-directory', $mpiaRecoveryRoot,
  '--env-file', $mpiaSecretFile, '-f', $mpiaComposeFile
)
# Execute only after the approved wrapper has asserted every preceding gate.
& docker @mpiaComposeArgs create --no-build --pull never --no-recreate `
  db auth rest kong meta studio mailpit client
if ($LASTEXITCODE -ne 0) { throw 'Creation failed; enter target-specific failure cleanup.' }
```

The package does not yet exist; this block was not run. `create` is distinct from `start`; both the official documentation and installed Compose help support the stated creation controls. Do not replace it with `up`, `run`, `--force-recreate`, `--remove-orphans` or an automatic retry. [Compose create](https://docs.docker.com/reference/cli/docker/compose/create/).

Immediately reconcile all resources against preflight and journal full new IDs, exact names, labels, creation times and hashes. Require exactly the eight approved service containers, one new network and only the approved new volume list. Inspect stopped containers before proceeding:

| Surface | Mandatory acceptance |
|---|---|
| State | Created/stopped; none has run. Missing/ambiguous state blocks. |
| Requested publication | `HostConfig.PortBindings` null/empty, with **no entries**; `PublishAllPorts=false`. Reject even explicit loopback mappings. |
| Resolved publication | No nonempty `NetworkSettings.Ports` binding list. Exposed internal ports with null mappings are acceptable; empty HostIp in a mapping is not. Stopped metadata is preliminary and must be rechecked running. |
| Network | Only the exact newly recorded network; bridge/local, Internal true, IPv4 true, IPv6 false, approved isolated gateway option, no trusted-interface/routed/unprotected option. No default/host/Phase 1 network. |
| Mounts | Exact manifest; fresh named DB volume(s) and approved new-directory binds only; no old/Phase 1/anonymous storage or Docker socket. |
| Image/configuration | Exact approved image IDs/digests, commands, entrypoints, health checks, restart policy no, privilege and resource limits. No unapproved external target. |
| Membership | Only approved target IDs; no unrelated or Phase 1 member. Resolve subnet/routing conflicts privately before startup. |
| Host effects | Zero target publications/listeners; no unexplained new listener, changed portproxy/NAT rule or Phase 1 metadata. |

`Config.ExposedPorts`, a container's `0.0.0.0` internal listen address, and a host publication are different concepts. Internal service listening on its container interface is necessary for the client; it is acceptable only with the no-publication and network gates satisfied. No “fix bindings after start” step exists.

## 5. Gate 3 — bounded startup and exposure monitoring

Start only the already-created, identity-verified containers, using their **full IDs from the creation journal**. Do not discover an arbitrary name at the moment of execution. The controller must re-inspect ID/name/labels/image/mounts/network before each start and abort on changes. Start DB first, then internal mail/Auth/REST as their reviewed dependencies become ready, then gateway/metadata/Studio, and finally the client. The exact dependency order and readiness timeouts must be fixed in the approved package; no service may require an external download or Phase 1 connection.

For each verified ID the proposed primitive is `docker --context desktop-linux start <verified-new-full-ID>`. Full IDs are assigned only after Gate 2; placeholders are not executable approval. Starting these services authorizes only their reviewed **platform** initialization. Never run application migration/seed commands or the Supabase CLI to “complete” an uncertain bootstrap.

Run a host-side monitor, with no socket mount inside any container, from before the first start until final acceptance/cleanup. Observe Docker events and reconcile all-container snapshots at a bounded interval (proposed one second), checking every new resource and every host publication. Record actual sampling times and gaps. Windows listener snapshots, network membership and Phase 1 health comparisons supplement Docker metadata. Capture only sanitized fields; logs, environment, tokens, private addresses and SQL results containing private information stay out of published reports.

Any requested/resolved binding, unexpected listener, extra network/mount/container, unsafe credentials, wrong image, failed readiness, lost monitor, resource pressure impacting Phase 1, or inability to inspect stops further starts and triggers section 8. Monitoring is a secondary detector; **the primary prevention is the approved absence of publication requests and verification before start**. A polling interval cannot prove zero transient exposure.

After services are healthy, repeat every Gate 2 check against the running state. Inspect all mappings over TCP and UDP and all HostIp families, not merely the old target ports. Verify no member has another network or a forwarding process.

For independent reachability evidence:

- Use the internal client as the positive control for required DB/Auth/REST/gateway connectivity. Windows loopback success is **not** expected for this design.
- From the Windows host and an authorized same-LAN device, verify that the old reserved host ports remain unreachable. Where applicable, include public IPv6/off-LAN and existing routed Docker/WSL paths with route-valid positive controls. No target addresses or secrets in public evidence.
- Do not scan or use Phase 1 publications as positive controls. Do not publish a temporary port, install a route or change firewall settings to make a test possible. Use an already authorized independent control endpoint or network diagnostic that is outside Phase 1.
- A timeout on an unroutable path is inconclusive, and an HTTP 401/403 or PostgreSQL authentication rejection means reachable. Treat unexpected off-host access or an unresolved applicable route as BLOCKED. A direct-container path with demonstrably no applicable route may be recorded NOT APPLICABLE with evidence; it is not a successful negative probe.

No-publication is an objectively inspectable gate. It does not promise isolation from privileged local Docker administrators or replace analysis of unexpected host routing. If the shared Desktop cannot demonstrate the agreed boundary, stop and propose a separately approved disposable isolated VM; do not modify this host globally.

## 6. Gate 4 — runtime PostgreSQL, Auth and REST verification

Only after Gate 3 passes. These checks are **future, unexecuted** and must be in the approved verification package. SQL here means read-only catalog/identity checks on the new DB; service startup itself has already performed the separately approved platform initialization.

### Database identity and platform prerequisites

Re-inspect the journaled DB ID and verify name, labels, image, exact new volume and network immediately before `exec`. Use `psql -X -w`, `ON_ERROR_STOP=1`, explicit database/user and an explicitly verified in-container Unix socket directory. Do not rely on inherited PGHOST or a default connection URL. Proposed socket directory is `/var/run/postgresql`; confirm it against the selected image before approval. No password prompt fallback or TCP/cloud target is allowed.

```powershell
# Both variables must come from the verified package/journal, not user input or name guessing.
$mpiaReadOnlySql | docker --context desktop-linux exec -i $mpiaVerifiedDbId `
  psql -X -w -h /var/run/postgresql -U postgres -d postgres -v ON_ERROR_STOP=1
if ($LASTEXITCODE -ne 0) { throw 'Base SQL verification failed; do not repair roles or reset.' }
```

The approved SQL must use `BEGIN READ ONLY`, a short statement timeout, and `ROLLBACK`. At minimum verify:

| Check | Required outcome / blocker |
|---|---|
| Session identity | Database postgres; expected migration role/session role; read-only on; `inet_client_addr()` null proves Unix socket. |
| Runtime version | `server_version_num` in PG17; exact patch matches approved image expectation, recorded as runtime evidence. |
| Roles | Expected `postgres`, `supabase_admin`, `authenticator`, `anon`, `authenticated`, `service_role` and Auth roles; compare superuser/BYPASSRLS/LOGIN/INHERIT/CREATEROLE/CREATEDB attributes to accepted baseline. |
| Memberships | Record `admin_option`, `inherit_option`, `set_option`; use `pg_has_role(...,'USAGE')` and `'SET'` for effective paths, especially ordinary API roles to privileged identities. No unexplained escalation path. |
| ACLs and schema authority | Compare default ACLs by creator/schema/object type, schema USAGE/CREATE, grant options and effective inherited permissions. Explicitly account for PG17 MAINTAIN in later object grants. No ALTER ROLE/GRANT/REVOKE/default-privilege repair. |
| Auth claim function | Compare full `auth.uid()` definition, owner, security mode/search path and claim semantics; no stub substitute. Review relevant Auth roles/schema migration state. |
| Empty application base | Zero Auth users; no Phase 1 public tables/helper, foundation tables/guards, application ledger entries or fixtures. Inventory all public/platform objects and explain expected platform-owned exceptions. |
| Application ledger | Check namespace/relation existence before querying a ledger. If present, inspect version identifiers only; none of the five Phase 1 or any candidate application migration may be applied. Do not infer ledger emptiness solely from the absence of public tables. |
| Platform initialization | Expected schemas/extensions and platform migration versions match the reviewed bootstrap. No partially initialized or generic PG base accepted. |

Expected Phase 1 application migration identifiers are `20260919043352`, `20260919043419`, `20260921000000`, `20260921010000` and `20260924000000`; all remain unapplied in this Stage 2 base. Platform migrations are a different inventory and must not be mistaken for MPIA migration execution.

Minimal identity SQL to incorporate in the later approved package:

```sql
BEGIN READ ONLY;
SET LOCAL statement_timeout = '10s';
SELECT current_database(), current_user, session_user,
       current_setting('server_version'), current_setting('server_version_num'),
       current_setting('transaction_read_only'), inet_client_addr() IS NULL AS unix_socket;
SELECT rolname, rolsuper, rolbypassrls, rolinherit, rolcanlogin, rolcreaterole, rolcreatedb
FROM pg_roles ORDER BY rolname;
SELECT member_role.rolname AS member, parent_role.rolname AS granted_role,
       m.admin_option, m.inherit_option, m.set_option
FROM pg_auth_members m
JOIN pg_roles member_role ON member_role.oid = m.member
JOIN pg_roles parent_role ON parent_role.oid = m.roleid
ORDER BY 1, 2;
SELECT pg_get_functiondef('auth.uid()'::regprocedure);
SELECT count(*) AS auth_users FROM auth.users;
SELECT n.nspname, c.relname, c.relkind
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'supabase_migrations')
  AND c.relkind IN ('r', 'p', 'v', 'm', 'f') ORDER BY 1, 2;
SELECT to_regprocedure('public.owns_property(uuid)') AS phase1_helper;
ROLLBACK;
```

This sample is not the complete ACL/equivalence assertion suite. Gate 0 must supply that suite and expected results before execution approval; a successful exit without reviewed assertions is not a pass.

### Auth and REST through the isolated client

Re-inspect the client ID, its sole network membership and no-publication/no-socket/no-Phase-1-mount properties. Execute only the reviewed test program inside that container. Verify service DNS resolves within the approved network without printing private addresses. Use internal `http://kong:8000/auth/v1/health` and `http://kong:8000/rest/v1/`, plus direct service health as a diagnostic where approved. Do not follow redirects to external hosts.

Supply only the newly generated local API key from the client's private in-container configuration; never embed it in `docker exec` arguments or echo HTTP headers/bodies containing credentials. Record status, expected response shape, Auth's reported version and redacted errors. Confirm actual REST executable version using its verified installed command or documented version mechanism; an image tag alone is insufficient. Verify gateway routes, REST authenticator connectivity, exposed schema configuration and JWT verification configuration agree. Health failure, database/JWT mismatch or an unexplained auth challenge blocks acceptance.

**No signup/login/user creation, token-session mutation, SQL fixtures or DML in this stage.** Zero-user health and empty REST schema checks do not prove A/B JWT authorization or RLS. Later separately approved synthetic tests must use real local Auth-issued tokens, both positive and negative ownership cases, anon denial, service-role limits, invalid/expired tokens, grant/MAINTAIN and inherited-role assertions, cascade/concurrency/rollback, clean-chain and populated-upgrade cases. Approve their exact fixtures and cleanup first. Keep Track A's existing harness unchanged and use a separately reviewed Track B runner.

## 7. Gate 5 — preservation and acceptance evidence

Recompare all pre-existing containers, networks and volume metadata to the **fresh Gate 1 baseline**. Require no changes to full IDs, images, creation metadata, mounts, publications, labels, network selection or stable options. Record runtime health/start/restart changes; only the explicitly recorded pre-existing vector behavior may be treated as expected. A new restart or resource-pressure effect during the attempt blocks acceptance even if a service later recovers. Do not issue Phase 1 SQL/HTTP checks or restart it.

Recheck the failed volume's metadata and zero attachments; original configuration/CLI/input hashes; new package hashes; Git branch/HEAD and empty tracked/index diffs; target link absence; no new external target/credential reference; zero host publication/listener changes. Record image/runtime versions, platform initialization inventory, catalog/ACL findings, client health checks, off-host evidence/limitations, all resources and monitor gaps. Keep secrets, private addresses and raw logs local and excluded from Git.

A future successful Stage 2 may leave only the explicitly approved base running with restart policy no, no application schema and zero synthetic users, **if its approval expressly permits retention**. Otherwise follow approved target-only shutdown. In either case stop work and issue a Stage 2 result; readiness does not authorize Stage 3.

## 8. Exact target-specific failure cleanup

These are future bounded actions that must be expressly included in the startup approval. No cleanup was executed in TEST-SETUP-02A.

1. Stop issuing new starts. Interrupt only this attempt's recorded orchestration process if one remains; identify it by recorded PID/start time, never kill every Docker/Supabase process. Leave the read-only monitor active. Preserve sanitized failure evidence promptly without delaying response to a verified exposure.
2. Build the cleanup set from the **creation journal**, reconciling it with all IDs absent from Gate 1. For every candidate, require full ID absent from the pre-existing baseline, creation during this approved attempt, exact project and review labels, expected service/name and recorded creation identity. Labels or a name prefix alone are insufficient. Never pipe a broad name/label query directly into stop/remove.
3. An unsafe network/mount/publication on a positively identified new target is a reason to stop it, not a reason to withhold cleanup until it passes isolation. Unknown ownership is different: do not stop an unverified container; report the unresolved exposure and obtain targeted owner direction. No global shutdown/firewall fallback.
4. Stop only those verified new full IDs. Preferred order is client/Studio/metadata/gateway, then Auth/REST/mail, and DB last; prioritize any positively identified publisher immediately. For each ID use `docker --context desktop-linux stop --time 10 <verified-new-full-ID>`, check exit status and re-inspect. Bounded Docker stop may terminate the target process after its grace period; this must be covered by the startup approval.
5. If stop fails, keep BLOCKED and report exactly which target remains running/published. Do not escalate to daemon shutdown, broad kill, prune or Phase 1 changes. Do not claim cleanup success from an interrupted controller or a missing CLI success message.
6. Once stopped and evidence is captured, revalidate each same ID and remove **only its container**, with `docker --context desktop-linux rm <verified-stopped-new-full-ID>`. No `-v` and no force removal. Never remove or reset volumes. Remove the newly created network by its journaled full ID only after exact name/labels match and membership is empty: `docker --context desktop-linux network rm <verified-empty-new-network-ID>`. If unknown members exist, leave it and report BLOCKED; do not disconnect them.
7. Retain all new volumes and bootstrap/configuration evidence; initialization may have written data even during a failed start. Record their names/creation times/labels and zero attachments. Do not silently reuse these volumes for the next attempt; that requires a new disposition decision and normally another distinct clean identity.
8. Re-enumerate all containers, ports/listeners, networks and volumes. Require zero running/published new target resources and no lingering unexpected host listener; recompare Phase 1 metadata and the protected failed volume. Report remaining stopped resources or cleanup failures precisely. No broad `compose down`, `supabase stop --all`, reset, prune, volume removal or global change is permitted.

Pre-start creation failure follows the same identity checks and removes only positively identified stopped resources; there is nothing to shut down if no container ran. The failed original project is never included in the recovery cleanup set.

## 9. Retained volume handling

Leave `supabase_db_mpia-phase2a01-upgrade` untouched throughout preparation, execution and cleanup. Its creation timestamp is `2026-10-14T20:06:37Z`; driver local; both compose/Supabase project labels name `mpia-phase2a01-upgrade`. Check metadata and attachments only. Never infer empty contents from container absence or metadata equality.

Any optional later removal is a separate owner-approved operation naming that exact volume, with identity/ownership/attachment verification and evidence retention. Neither preservation of the old volume nor creation of a new clean target implies permission to delete it. No command in this runbook deletes any volume.

## 10. Final GO / BLOCKED criteria

| Gate | GO requires | Current status |
|---|---|---|
| Preparation | Complete, coherent pinned bootstrap/Compose/client/assertion package, no-host-publication model validated | NOT PREPARED; intentionally outside this task |
| Authorization | Owner-approved package hash, exact resources/startup/cleanup/retention scope and dedicated no-link interpretation | NOT GRANTED |
| Preflight | Fresh identities, collision absence, unchanged protected inputs, safe environment, available pinned images, Phase 1 baseline | Historical audit available; repeat before execution |
| Stopped inspection | Exact resources and zero requested mappings; dedicated verified internal network and fresh storage | NOT EXECUTED |
| Running isolation | Zero requested/resolved mappings/listeners; verified membership/mounts and applicable independent path evidence | NOT EXECUTED |
| Platform compatibility | Actual PG17/Auth/REST versions, bootstrap/catalog/role/ACL/JWT configuration match accepted contract | NOT EXECUTED |
| Empty base | Zero users/application objects/ledger entries, no migration/fixture execution | NOT EXECUTED |
| Preservation | Phase 1 and retained failed volume unchanged from fresh preflight, all changes explained | NOT EXECUTED for recovery |
| Failure response | Verified target-only cleanup succeeds on any failure; remaining exposure explicitly reported | Designed only |

Any missing mandatory evidence, unexplained drift or unsupported dependency yields **BLOCKED**. Do not convert an unexecuted check to PASS because the design seems safe. Option A remains blocked unless a separate review establishes an officially supported explicit-binding method for the pinned CLI and verifies all services before another full startup.

**Current recommendation: BLOCKED for another Stage 2 attempt; prefer separately authorized Option B preparation next.** The diagnostic report and this proposed runbook complete TEST-SETUP-02A. Stop here and await explicit owner instruction; Stage 3, synthetic-test execution and Phase 2A-01 implementation remain unauthorized.
