# MPIA — Phase 2A-01 TEST-SETUP-02 runtime verification report

Date: **15 October 2026 (Asia/Kuala_Lumpur, UTC+08:00)**.

**Recommendation: BLOCKED for Stage 3. Stage 2 failed the mandatory resolved-port isolation gate.** The first new database container published `55422` on both `0.0.0.0` and `::`, despite joining the verified bridge configured with default host binding `127.0.0.1`. Startup was interrupted immediately after detection, followed by the approved project-specific CLI stop. Cleanup and a subsequent inventory verified **zero new running containers and zero target-port listeners**. Isolation is not certified.

No SQL or HTTP health check was executed. No application migration, fixture, synthetic user, foundation object, generated type, application/UI change, production connection, provider call, deployment, branch operation or commit occurred. The only new repository-visible deliverable is this report. Local operational scripts and evidence are retained under the already ignored `.phase2a01-test.local/runtime-verification-02/` directory. Selected platform images and the new database volume remain available for diagnosis; nothing was pruned or reset.

## 1. Authority, status vocabulary and repository identity

The owner's TEST-SETUP-02 request authorized bounded local base startup, verification and target-specific failure cleanup. The controlling procedure was [TEST-SETUP-01B safety review, Section 6](PHASE2A_01_TEST_SETUP_01B_SAFETY_REVIEW.md), including its Step 8 stop command. The older checklist's generic startup command was not used. This authorization superseded the review's historical “await approval” language for this attempt only; Stage 3 and implementation remain separately gated.

Authoritative inputs were the [Phase 1 freeze](PHASE1_ARCHITECTURE_FREEZE.md), [Phase 2 architecture plan revision 1.0](PHASE2_ARCHITECTURE_PLAN.md), [foundation specification proposed revision 1.1](PHASE2A_01_FOUNDATION_SCHEMA_SPEC.md), [final readiness report](PHASE2A_01_FINAL_READINESS_REPORT.md), [implementation checklist](PHASE2A_01_IMPLEMENTATION_CHECKLIST.md), [TEST-SETUP-01 report](PHASE2A_01_TEST_SETUP_01_REPORT.md), and controlling safety review. Their SHA-256 inventory is retained in `reference-hashes.json`. The controlling review hash is `20b02a96827516ebcb0c8b71bd168e5922066305930f200ca1f9a47c20a1b2b1`.

Individual checks use **VERIFIED**, **FAILED**, **NOT VERIFIED**, or **NOT APPLICABLE**. NOT VERIFIED never counts as successful acceptance. Image metadata, historical database findings and actual runtime queries are distinguished below.

| Check | Status | Evidence |
|---|---|---|
| Repository | VERIFIED | `C:\Users\ysyap\AI Projects\malaysia-property-investment-analyzer` |
| Branch | VERIFIED | `phase2-location-intelligence`, unchanged |
| HEAD | VERIFIED | `934ea702a2ecfdb31c530ea4a33e21a2d55e27d2`, unchanged |
| Tracked worktree and index | VERIFIED | Both diffs empty before startup and after cleanup; no staging or Git history operation |
| Existing untracked inputs | VERIFIED | Nine documentation inputs at entry, including the preparation and safety-review reports; no unexpected implementation drift |
| Dedicated workdir / project | VERIFIED | `.phase2a01-test.local` / `mpia-phase2a01-upgrade` |
| CLI pin and executable version | VERIFIED | `2.120.0`; local `--version` returned this exact value |
| Launcher SHA-256 | VERIFIED | `1cbedd6e494581a1c1d90113660113a06798d9967d19c857127b66b8a428e836` |
| Companion `supabase-go.exe` SHA-256 | VERIFIED | `fa2ba7fb02b01d98fa5a3c6d92632239b10c6974dbc42c65b698b6a479847343` |
| Prepared TOML SHA-256 | VERIFIED | `358644615023c95d8d7a7b29395c34f53cf225de31be6a3d8b68c26bf60f9998`; unchanged after cleanup |

The pinned executable is at `.phase2a01-test.local/tooling/npm-cache/_npx/0e23c24576954b26/node_modules/@supabase/cli-windows-x64/bin/supabase.exe`. No tool upgrade or package re-resolution was performed.

## 2. Pre-start configuration and host gates

| Check | Status | Result |
|---|---|---|
| TOML structural validation | VERIFIED | Reparsed with Python `tomllib`; project ID, PG major 17, every active port and every enabled flag matched the reviewed configuration |
| Application migrations and seeds | VERIFIED | Both disabled, path arrays empty; no migration/seed directory or SQL file in the dedicated Supabase project before or after the attempt |
| Enabled services | VERIFIED | API, Auth, Studio and local SMTP testing enabled; database core retained; optional services disabled as reviewed |
| Link/credentials | VERIFIED | Dedicated project contains only `.gitignore`, `config.toml`, `.temp/cli-latest`; no `.env`, remotes, project-ref, linked-project metadata, copied keys, pooler URL or start-secrets |
| External integrations | VERIFIED | No active `env(...)`, hosted Supabase URL or database URI in parsed values; reviewed external credential fields empty and providers disabled |
| Path / CLI home | VERIFIED | No reparse point in project entries or workdir ancestors; dedicated CLI home contains only its previously disclosed telemetry file |
| Inherited target overrides | VERIFIED | Name-only scan returned no SUPABASE, PG, DATABASE, DB_, DOCKER, PROXY or TUNNEL overrides |
| Docker context / endpoint | VERIFIED | Explicit `desktop-linux`, local `npipe:////./pipe/dockerDesktopLinuxEngine` |
| Docker versions | VERIFIED | Desktop `4.91.0 (239619)`, Engine/client `29.8.0`, API `1.56`; matches review |
| Target absence | VERIFIED | No target container/network/volume by name or project label; dedicated bridge name absent before creation |
| Existing inventory | VERIFIED | Twelve Phase 1 containers, three existing named volumes, four existing networks |
| Host port availability | VERIFIED | No TCP listener on 55420–55429 or 8183 in preflight and immediately before startup |
| Reserved ports | VERIFIED | IPv4/IPv6 excluded ranges: 50000–50059, 60476–60575, 60670–60769, 60770–60869, 60870–60969, 60970–61069; no overlap |
| Forwarding inspection | VERIFIED | No Windows portproxy or NetNat static mappings; connected interfaces report forwarding disabled; no process matching the reviewed common tunnel/proxy names found |
| Windows / Desktop configuration | VERIFIED | User `.wslconfig` absent; daemon keys remain builder/experimental; no explicit Desktop network/host-binding/WSL/routing override keys found |
| Firewall observations | VERIFIED | Domain/Private/Public enabled; WSL Hyper-V policy enabled, inbound Block, loopback enabled; these observations alone do not certify reachability |
| Independent test arrangement | VERIFIED | Owner confirmed another Windows device and LAN/off-LAN access; no results were requested or used after startup failed |

The process and configuration inspections are bounded observations, not an exhaustive audit of every possible proxy or effective daemon setting. No daemon, firewall, WSL, default-bridge or Phase 1 network setting was changed.

Initial sandboxed Docker/context and Windows listener reads returned access denied. The required inspection was retried with tool-approved access outside the sandbox. A first local preflight script run then stopped because Windows PowerShell wrapped parsed network/volume arrays; correcting that evidence-script handling produced the expected counts and a complete successful preflight before any resource creation. This was not an unexplained Docker inventory change.

## 3. Dedicated network and new resource identities

The reviewed network-create command was executed with `--driver bridge --ipv4=true --ipv6=false`, labels `mpia.review=phase2a01-test-setup-01b` and `com.supabase.cli.project=mpia-phase2a01-upgrade`, and exactly these options:

```text
com.docker.network.bridge.host_binding_ipv4=127.0.0.1
com.docker.network.bridge.gateway_mode_ipv4=nat
```

| Resource check | Status | Observed identity |
|---|---|---|
| Bridge identity | VERIFIED | `mpia-phase2a01-loopback`; ID `d274b416ef3358dd68f53d3ad951d5aeca8e101c330432322d28cbfa2b866b8b` |
| Network creation time | VERIFIED | 15 October 04:00:55.002883719 MYT (`2026-10-14T20:00:55.002883719Z`) |
| Driver / scope / families | VERIFIED | Local bridge; IPv4 enabled; IPv6 disabled; no ingress or host networking |
| Options / labels / initial membership | VERIFIED | Exact reviewed options/labels, no trusted-interface option, zero attached containers |
| Subnet / gateway | VERIFIED | `172.19.0.0/16` / `172.19.0.1`; no overlap with existing Docker subnets or nondefault Windows unicast routes |
| Existing Docker subnet comparison | VERIFIED | Default bridge `172.17.0.0/16`, Phase 1 `172.18.0.0/16`; neither altered |
| First new container | VERIFIED | `supabase_db_mpia-phase2a01-upgrade`; ID `773c4ffe208529799524543aa39100aba8e73692ecd00afe8be01c166417291c` |
| Container creation time | VERIFIED | 15 October 04:06:39.320935052 MYT (`2026-10-14T20:06:39.320935052Z`) |
| Project/workdir labels | VERIFIED | Exact target project and dedicated workdir; CLI label represents Windows separators with doubled backslashes |
| Container network membership | VERIFIED | Only the dedicated bridge above, container IP `172.19.0.2`; NetworkMode is the exact approved network ID; PublishAllPorts=false |
| Database mount | VERIFIED | Only volume `supabase_db_mpia-phase2a01-upgrade` at `/var/lib/postgresql/data`, read/write; no Phase 1 volume, host bind or Docker socket |
| New volume identity | VERIFIED | Local driver; created `2026-10-14T20:06:37Z`; compose/Supabase project labels both `mpia-phase2a01-upgrade` |
| Full seven-component base | NOT VERIFIED | Startup stopped at the first database container; remaining six components were not observed as new containers |

The database was running with health **starting** when inspected. Platform initialization may have written to its fresh volume; completion and contents were not queried. The retained volume must not be treated as a verified clean upgrade base or silently adopted by a future attempt.

## 4. Startup, monitoring and complete resolved publication inventory

Startup used the contained wrapper from the review, the pinned local executable, explicit dedicated workdir, exact network ID, and these arguments:

```text
start --network-id d274b416ef3358dd68f53d3ad951d5aeca8e101c330432322d28cbfa2b866b8b
--exclude realtime,storage-api,imgproxy,edge-runtime,logflare,vector,supavisor
```

Process-scoped settings were SUPABASE_HOME inside the dedicated tooling directory, SUPABASE_TELEMETRY_DISABLED=true, DO_NOT_TRACK=1, SUPABASE_NO_UPDATE_NOTIFIER=1, local NPM_CONFIG_CACHE and DOCKER_CONTEXT=desktop-linux. The wrapper restores its caller's environment. A hidden child process ran the CLI while a separate loop reconciled all new container IDs against the baseline, inspected publications/mounts/network membership and checked Windows target listeners. Raw CLI output remained in the ignored local evidence directory and was not pasted into this report.

Startup began at **04:02:57.4674875 MYT**. There were 102 completed polling cycles reporting no new container/listener; the next cycle captured the first new database and failed its resolved bindings at **04:06:42.9575779 MYT**. Polling is not a continuous packet trace and does not establish the exact beginning or duration of exposure.

**Complete observed requested and resolved mappings for the new container:**

| Container port | Requested HostConfig binding | Resolved NetworkSettings binding | Status |
|---|---|---|---|
| DB `5432/tcp` | HostIp empty, HostPort `55422` | `0.0.0.0:55422` | FAILED — wildcard IPv4 |
| DB `5432/tcp` | Same single request above | `[::]:55422` | FAILED — wildcard IPv6 |

There were no other mappings in that captured container inventory. An empty requested HostIp was provisionally permitted by the review only if the resolved mapping and Windows listeners proved loopback. That condition failed. The container did use the supplied network; this evidence does **not** establish whether the root cause lies in the CLI, Docker Engine/Desktop publication handling, or another effective runtime setting.

| Allowlist surface | Status | Observed disposition |
|---|---|---|
| `127.0.0.1:55421` gateway | NOT VERIFIED | No new gateway observed before stop |
| `127.0.0.1:55422` PostgreSQL | FAILED | Actual mappings were wildcard IPv4 and IPv6 |
| `127.0.0.1:55423` Studio | NOT VERIFIED | No new Studio observed before stop |
| `127.0.0.1:55424` Mailpit | NOT VERIFIED | No new Mailpit observed before stop |
| Other configured/unexpected publications | VERIFIED, bounded observation | No additional mapping observed before stop; target listeners absent after cleanup |
| Windows listeners at the failed-container instant | NOT VERIFIED | Docker failure triggered interruption before that cycle's Windows listener query; no fabricated Windows wildcard snapshot |
| Final target publications/listeners | VERIFIED | No new container remains; zero listeners on all 55420–55429 and 8183 |

## 5. Local and independent reachability evidence

| Check | Status | Evidence / limit |
|---|---|---|
| Positive loopback TCP controls, 55421–55424 | NOT VERIFIED | Not executed: mandatory binding gate failed first |
| Supplementary same-host non-loopback probes | NOT VERIFIED | Not executed; would not substitute for independent probes |
| Same-LAN/L2 IPv4 and IPv6 negative probes | NOT VERIFIED | Owner offered an independent Windows device; startup stopped before testing |
| Off-LAN public IPv6 negative probes | NOT VERIFIED | Public IPv6 present and owner reported an available vantage; no probe results collected |
| Independent path positive controls / route validation | NOT VERIFIED | No independent execution or evidence received |
| Routed Docker/WSL direct-address probes | NOT VERIFIED | No independent route established/tested; no route was installed |
| Overall isolation | FAILED | Wildcard Docker bindings are independently sufficient to reject the base |

A Windows probe script was prepared in the ignored evidence directory but never executed on an independent device. It is not test evidence. Public/transient host addresses are omitted from this report. No external reachability is asserted either way: the unsafe publication is proven, actual successful off-host access is not.

## 6. Image identities and runtime compatibility results

The selected images were inspected locally after cleanup. All report Linux/amd64. Each SHA-256 below was returned both as Docker image `Id` and as the digest portion of that image repository's `RepoDigests` entry; the equality was observed, not assumed. Registry prefix is `public.ecr.aws/supabase/`.

| Image tag | Observed image ID and repository digest (`sha256:`) | Container/runtime status |
|---|---|---|
| `postgres:17.11.0.004` | `6058a6759ab9268cff8ee70641d61f1bd75953316281b76427cf5a6b4db2eafc` | VERIFIED image identity of the one new DB; server version NOT VERIFIED |
| `gotrue:v2.197.0` | `1736a63078f5922b198c4cbe50f80ab9a2d3b54fe8b7b6cfb2e9dc5dbbc12c6b` | VERIFIED cached image metadata; no new Auth runtime observed |
| `postgrest:v16.4` | `d155c6718ed9a9f990d159a2ab7c0a3f16944dbb6d0a0344557421042acfe0df` | VERIFIED downloaded image metadata; no new REST runtime observed |
| `studio:2026.10.05-sha-94b8b06` | `d878dcd9dba73b66d1c2c19aeaf53d07704e71604d93013225be1d1c51475237` | VERIFIED image metadata; no new Studio runtime observed |
| `postgres-meta:v0.100.0` | `145325b7e39f8ef4931d6e8cfd3f6f4d655de09d72a2ccc96d9513542c2202bd` | VERIFIED image metadata; no new metadata runtime observed |
| `kong:2.8.1` | `1b53405d8680a09d6f44494b7990bf7da2ea43f84a258c59717d4539abf09f6d` | VERIFIED cached image metadata; no new gateway runtime observed |
| `mailpit:v1.31.3` | `ed9b00c609e77e99c79b93f1178255ebc271868920f2c69a8d166bd5634ed10d` | VERIFIED downloaded image metadata; no new mail runtime observed |

Mailpit selection is v1.31.3 versus Phase 1's v1.30.2. The safety review did not pin an exact proposed mail version. This metadata observation does not establish mail health or compatibility. Likewise, downloaded images are not evidence of healthy services.

The ordered runbook permits Step 7 only after isolation passes. Consequently every check below is **NOT VERIFIED**, deliberately unexecuted after the earlier failure:

| Runtime check | Status | Remaining evidence required |
|---|---|---|
| Actual PostgreSQL version / server_version_num | NOT VERIFIED | Expected 17.11 from image selection; no SQL query |
| Database/session identity and READ ONLY transaction | NOT VERIFIED | No database connection issued |
| Role attributes and memberships | NOT VERIFIED | No pg_roles/pg_auth_members query |
| BYPASSRLS and privileged-role SET/USAGE paths | NOT VERIFIED | No relationship queries; historical findings not promoted to current facts |
| Default grants, MAINTAIN implications, schema privileges | NOT VERIFIED | No ACL/schema query; no grants/defaults/roles altered |
| `auth.uid()` definition | NOT VERIFIED | No function-definition query |
| Zero Auth users | NOT VERIFIED | No count query; no test user was created by this task |
| No MPIA application tables / Phase 1 helper | NOT VERIFIED | No catalog query; no application SQL was supplied |
| No MPIA migration ledger entries | NOT VERIFIED | No catalog/ledger query; migrations remained disabled |
| Supabase Auth health and reported version | NOT VERIFIED | No `/auth/v1/health` request |
| PostgREST executable version and basic connectivity | NOT VERIFIED | No executable invocation or `/rest/v1/` request |
| Future RLS/guards/fixtures/login/concurrency behavior | NOT APPLICABLE | Stage 2 does not authorize implementation or synthetic behavior tests |

## 7. Phase 1 preservation

The complete before/after comparison verified **all twelve existing containers**: full IDs, names, creation times, image tags/IDs, labels, mounts, requested/resolved ports, NetworkMode, PublishAllPorts and complete network attachments were identical. All existing network configuration identities and all three existing volume metadata records also matched. No Phase 1 container was stopped, repaired, upgraded or used for SQL/HTTP control testing.

| Phase 1 component | Unchanged full container ID | Status |
|---|---|---|
| Studio | `aba4786d814b11ff5c894971ac4c3c0acc02ed70d835006eba9de684c283adcb` | VERIFIED |
| Metadata | `09c1832bc68ad0e732e433bc44d3b857f9adb1268fbc6606a78f9aeca4e3668c` | VERIFIED |
| Edge Runtime | `cca968226b3ed9cac3a68d3f665f3e10349f5988fcd2c42c53f7a4ae09d4cf61` | VERIFIED; remained exited |
| Storage | `fce371e5253cc9585883708c9814bc724acfc379bcfbaadc6fc36ef1723c3835` | VERIFIED |
| REST | `cca30aa2c2df411427ecd1baea6add76b6f8d306728f774cb315cb9c265d36c5` | VERIFIED |
| Realtime | `b599eb67a6795615a8d19c03c87bc67e4412c258c455a44ba82577de60bcf083` | VERIFIED |
| Mail | `536df25a91916b4390063bdb0c1b1c08ca66f681d8a8d521c3adc1f5704fb437` | VERIFIED |
| Auth | `9cfb24ddc33e17f81f3abf0b2cd6246bdc9b97b6b6a23cb57dc85944ed73c00f` | VERIFIED; restart count remained 1 |
| Kong | `9d311d834f1c0bd55c4489fe36ebeeb10bb5bc61b90a3130046d72b6f72deede` | VERIFIED |
| Vector | `00deb7329aa915d22d95f01714442218c2995cc6d7ac238acb84159294fbb671` | VERIFIED structural preservation; existing restart loop continued |
| Analytics | `da52059060c43ae1f4516037c63c169dac87db752ddecc3c1ee5847397716041` | VERIFIED |
| Database | `e7cd2cf20c5a6ce591810c5a8619b7cb8205ddd1e01596ee650fd24105df3e87` | VERIFIED; running/healthy, restart count 0 |

Database image ID remains `sha256:3866d94d8426927e8db3f1c5d790752292bfbe27b5f1f46e199ae1b7d3c1710b`; data volume remains `supabase_db_malaysia-property-investment-analyzer` at `/var/lib/postgresql/data`. Its StartedAt remains `2026-10-14T19:46:01.710531432Z`. Existing wildcard 54322 bindings and network `b8522b1655af1ea2603b67cdcaf0c3085d26bdddbd67d7fba6495a61a66ea3c7` remain unchanged.

Only vector's StartedAt and restart count changed during this task's baseline interval (21 → 28), consistent with its previously documented automatic restart loop; its structural fields and network attachments matched. Other runtime fields matched. This is metadata preservation evidence, **not a new Phase 1 row-level integrity audit**.

External project `viddikrrhogcebpbstti` was not contacted. No login/link, remote CLI operation, production credential copying, external database connection or provider request was issued. Its current contents were not audited.

## 8. Failure response and final resource state

At **04:06:42.9575779 MYT**, the monitor rejected the database's wildcard mappings. It terminated the task's own startup process tree so the CLI could not keep creating services, then invoked the same contained pinned CLI with:

```text
stop --project-id mpia-phase2a01-upgrade
--network-id d274b416ef3358dd68f53d3ad951d5aeca8e101c330432322d28cbfa2b866b8b
```

The CLI returned successful target-specific stop with backup enabled. No `--all`, `--no-backup`, prune, reset, compose down, direct volume deletion or fallback Docker stop was used.

| Cleanup check | Status | Final observation |
|---|---|---|
| Startup interruption and explicit project stop | VERIFIED | Target-only stop completed successfully |
| New target container | VERIFIED | Removed; final container set is the original twelve only |
| Dedicated bridge | VERIFIED | Removed by the approved CLI stop; original four networks remain |
| New database volume | VERIFIED | Retained as `supabase_db_mpia-phase2a01-upgrade`; total volumes now four |
| New running containers / target listeners | VERIFIED | Both zero at 04:06:52.5304700 MYT; reconfirmed in final metadata capture at approximately 04:07:38 MYT |
| Images | VERIFIED | Retained locally; no image deletion/prune |
| Configuration, links and application SQL | VERIFIED | TOML/executable hashes unchanged; dedicated Supabase file inventory unchanged; no link or SQL introduced |
| User-profile telemetry metadata | VERIFIED | Same 235 bytes, creation/write timestamps and SHA-256 before/after |
| Packet-level zero telemetry | NOT VERIFIED | Not measured; process containment and unchanged file metadata are the actual evidence |

Profile telemetry creation/write times remain `2026-10-13T16:08:04.0094852Z` and `2026-10-13T16:08:04.0115057Z`; SHA-256 `513cf8b43fd7a858bd0e74bba861b471ac36a86997576eb762a2bc13e5bf74e0`. No profile telemetry file was edited or removed.

## 9. Evidence and verification limits

Redacted structured evidence and operational scripts are under `.phase2a01-test.local/runtime-verification-02/`, covered by the pre-existing directory ignore rule. Key evidence files:

| Evidence | Purpose |
|---|---|
| `input-hashes.json`, `config-validation.json`, `cli-version-observed.txt`, `cli-services.txt` | Exact CLI/configuration and selected versions |
| `containers-before.json`, `networks-before.json`, `volumes-before.json` | Pre-start Phase 1 baseline |
| `network-created.json`, `network-pass.json`, `network-id.txt` | New bridge identity/options/subnet verification |
| `startup-process.json`, `monitor-timeline.jsonl`, `startup-containers-latest.json`, `startup-failure.json` | Startup timing and exact failing requested/resolved bindings |
| `cleanup-result.json`, `containers-after-cleanup.json` | Successful fail-closed disposition |
| `containers-final.json`, `networks-final.json`, `volumes-final.json`, `listeners-final.json` | Final resource inventory and listener absence |
| `selected-images.json`, `preservation-comparison.json`, `final-identity.json` | Image/digest inventory, Phase 1 comparison, final hashes/branch |
| `telemetry-before.json`, `telemetry-after.json`, `reference-hashes.json` | Telemetry metadata and authoritative-input identity |

Private host-address/route inventories and raw CLI logs remain local and ignored. Raw logs are not safe-to-publish evidence. Empty-list evidence files may be absent because the PowerShell serializer received no pipeline objects; the successful gate/result records and final full inventories establish the corresponding empty results. No absence of a file alone is used as a pass.

Existing read-only source-security suite: `node --test tests/security.test.mjs` — **5 passed, 0 failed, 1 skipped**. The skipped built-browser-assets check is **NOT VERIFIED**. No build, database harness, fixture test, application migration or generated type operation was run. PowerShell operational scripts were syntax-parsed before startup; configuration and subnet assertions passed. These checks do not certify database security or network isolation.

## 10. Remaining gaps and Stage 3 decision

**Stage 3: BLOCKED.** The documented default-host-binding mechanism did not produce the required resolved bindings in this exact runtime. No adjustment, default-network fallback or restart was attempted after the mandatory failure.

Before another Stage 2 attempt, separately review the actual publication behavior and a concrete corrected startup method or the safety review's proposed no-host-publication alternative. Neither alternative was implemented here. Any future attempt must explicitly address the retained target volume and repeat collision/preflight gates; it must not silently reuse or delete that volume.

All local positive controls, independent LAN/off-LAN path-validated negative tests, actual PostgreSQL/Auth/REST versions, role/membership/BYPASSRLS checks, default ACLs/schema privileges, `auth.uid()`, zero-user assertion and empty application/ledger assertion remain open. PG17.11 versus historical PG17.6 and REST v16.4 versus Phase 1 v14.5 compatibility remain unverified at runtime. No shared-role/grant repair is authorized by these gaps.

D07 overall test readiness remains open. Stage 3 migration preparation, synthetic fixtures, Phase 2A-01 implementation and deployment require separate explicit authorization. Work stops at this report and the verified stopped target state.
