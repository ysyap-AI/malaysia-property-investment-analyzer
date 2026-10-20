# MPIA — Phase 2A-01 TEST-SETUP-02A root-cause review

Date: **16 October 2026 (Asia/Kuala_Lumpur)**. Diagnostic and design work only.

**Another Stage 2 attempt: BLOCKED.** The failed container requested a published database port without an explicit host address, and Docker resolved it to wildcard IPv4 and IPv6 despite the selected bridge's loopback default. That failure mechanism is verified. The reason the default was not applied is **not proven**. No verified, officially documented control was found that makes the pinned CLI's ordinary `start` explicitly bind every publication to `127.0.0.1`.

**Recommended next design path: Option B, a separately named Supabase-compatible stack with no host publications, inspected while stopped before startup.** This is a recommendation for separately authorized preparation and review, not permission to construct or start it. Its platform initialization and test-client artifacts remain prerequisites. Preserve the failed database volume as evidence. The accompanying [recovery runbook](PHASE2A_01_TEST_SETUP_02A_RECOVERY_RUNBOOK.md) is unexecuted and has explicit preparation and approval gates.

## 1. Authority and work performed

Read the [Phase 1 freeze](PHASE1_ARCHITECTURE_FREEZE.md), [Phase 2 architecture plan revision 1.0](PHASE2_ARCHITECTURE_PLAN.md), [foundation specification proposed revision 1.1](PHASE2A_01_FOUNDATION_SCHEMA_SPEC.md), [implementation checklist](PHASE2A_01_IMPLEMENTATION_CHECKLIST.md), [TEST-SETUP-01 report](PHASE2A_01_TEST_SETUP_01_REPORT.md), [TEST-SETUP-01B safety review](PHASE2A_01_TEST_SETUP_01B_SAFETY_REVIEW.md), and [failed runtime verification report](PHASE2A_01_TEST_SETUP_02_RUNTIME_VERIFICATION_REPORT.md). The failed runtime gate supersedes the earlier review's conditional startup recommendation. None of these inputs was changed.

Read-only work comprised Git/file/hash inspection, retained evidence analysis, Docker metadata reads, Windows listener/forwarding metadata, local CLI version/help, static inspection of embedded CLI text, and public vendor documentation. No Docker create/start/restart/stop/remove, volume mount, SQL, HTTP request to a local or live Supabase instance, migration, fixture, image pull, installation, upgrade, firewall/daemon change, deployment, or Git history/checkout change was performed. Only the two requested Markdown deliverables were created. Existing operational scripts were read, not executed: several would overwrite retained evidence or mutate infrastructure.

Docker/context and Windows networking reads initially failed under the sandbox and were retried with approved read-only access. Help/version calls used process-local telemetry suppression and the existing dedicated CLI home. The Go companion's `start --help` returned `unknown command`; it was not used as an alternative startup mechanism. No debug/support-ticket submission was made.

Status terms: **VERIFIED** means directly inspected within the stated scope; **DOCUMENTED** means supported by vendor material; **HYPOTHESIS** is not established; **NOT VERIFIED** never counts as passing acceptance.

## 2. Post-failure state and resumed inspection

The initial checks on 15 October matched the stopped-target record. After resumption, the refreshed metadata capture began at **16 October 03:05:35 MYT** (`2026-10-15T19:05:35Z`). Results below use that refreshed capture and its focused follow-up.

| Required condition | Result | Evidence and qualification |
|---|---|---|
| Exact branch and commit | VERIFIED | `phase2-location-intelligence`; `934ea702a2ecfdb31c530ea4a33e21a2d55e27d2` |
| No tracked application or migration changes | VERIFIED | Tracked worktree and index diffs empty. Ten pre-existing untracked documentation inputs at entry; no new implementation files. |
| Failed target has no running containers | VERIFIED | Zero target containers, including stopped containers, by target names/project identity; all-container inventory contains the original twelve Phase 1 containers. No Supabase CLI process found. |
| Target ports no longer published | VERIFIED | No Docker mapping anywhere on `55420–55429` or `8183`; zero Windows TCP listeners on those ports. Failed loopback bridge absent. |
| Phase 1 containers and volumes intact | VERIFIED for identity/configuration, with explained runtime drift | All twelve full container IDs, creation times, image IDs/tags, labels, mounts, requested/resolved ports and network selections match. All three Phase 1 volume metadata records match. No database-content audit was performed. See restart disclosure below. |
| Retained target volume identified | VERIFIED | Exact name, creation timestamp, driver and project labels in section 7; no container currently mounts it. |
| Dedicated configuration/CLI hashes unchanged | VERIFIED | All three SHA-256 values below match retained evidence; CLI pin and observed launcher version are `2.120.0`. |
| No live MPIA connection or link | Target-specific link absence VERIFIED; workspace-wide absence cannot be certified | Dedicated test project has no link/remote/credential files and no active external credential/URL references. Original repository still has pre-existing link metadata. No live connection was made by this review; absence of every unrelated process's live connection was not audited. This gate must not be described as an unconditional workspace-wide PASS. |

**Restart disclosure:** on resumption, ten running Phase 1 containers had regenerated endpoint IDs/MAC addresses; nine also had different private container addresses. Network membership and the Phase 1 network ID were unchanged. The default `bridge` had a new ID/creation time, but its other compared configuration fields matched. Phase 1 database `StartedAt` changed from `2026-10-14T19:46:01.710531432Z` to `2026-10-15T18:33:05.597413463Z`; it remained running and healthy. Auth restart count changed from 1 to 2; vector remained in its pre-existing restart loop, with a changed counter/start time. Edge Runtime remained exited. The owner explicitly confirmed a Docker or Windows restart during the pause. This explains the runtime drift; it is not a claim that complete runtime metadata was unchanged. Rebaseline before any later execution. No restart was issued by this task.

An initial comparison reported mount differences because the retained PowerShell JSON collapses zero/single-element mount arrays to null/objects. Normalizing only this serialization shape yielded no mount differences. Actual metadata differences were not discarded.

| Protected input | SHA-256 |
|---|---|
| `.phase2a01-test.local/supabase/config.toml` | `358644615023c95d8d7a7b29395c34f53cf225de31be6a3d8b68c26bf60f9998` |
| Pinned `supabase.exe` | `1cbedd6e494581a1c1d90113660113a06798d9967d19c857127b66b8a428e836` |
| Companion `supabase-go.exe` | `fa2ba7fb02b01d98fa5a3c6d92632239b10c6974dbc42c65b698b6a479847343` |

Both executables are under `.phase2a01-test.local/tooling/npm-cache/_npx/0e23c24576954b26/node_modules/@supabase/cli-windows-x64/bin/`. The dedicated Supabase directory still contains only `.gitignore`, `config.toml`, `.temp/cli-latest` and their directory. Its CLI home contains only the existing telemetry file. Parsed configuration retains PG major 17, disabled migrations/seeds with empty path arrays, and no remotes. Name-only inherited-environment inspection found no SUPABASE/PG/DATABASE/DB_/DOCKER/proxy/tunnel overrides. A targeted parsed-value scan found no active environment lookup, hosted Supabase/database URL or populated secret field. These are bounded checks, not a profile-wide credential audit.

The original `supabase/.temp` still contains `project-ref`, `linked-project.json`, `pooler-url` and `start-secrets`. Only presence was inspected; values were neither printed nor copied. **If Task 1's no-link condition is interpreted literally across the entire workspace, it fails and the result is BLOCKED.** Do not unlink or delete those files under this task. The proposed recovery boundary requires owner acceptance of a separate unlinked target and explicit prohibition on using the original linked workdir; it does not silently waive this discrepancy.

## 3. Retained evidence and confirmed publication

All **51 entries** in `.phase2a01-test.local/runtime-verification-02/evidence-sha256.json` matched on initial and resumed checks. All **seven authoritative-reference hashes** in `reference-hashes.json` also matched. This establishes consistency with the retained manifest, not independent authenticity of the original collection. Private address/route inventories and raw CLI logs were not reproduced. A local pattern-only scan of startup logs found no `HostIp`, `PortBindings` or container-create API payload trace; it does not reconstruct a missing wire request.

| Evidence file | SHA-256 |
|---|---|
| `network-created.json` | `57ff842efd242cbc82453e45f96dae8cbc56e5fba875cc4dceb599dd72abba07` |
| `startup-containers-latest.json` | `d630bb25ff0738d8639285f8bf6587fdb18c7efe9dec569cc239cb56e44d36c9` |
| `start-child.ps1` | `ec1be60c728048425a2074a2110c1cddd923a96033cea7c67f31d114741dbd17` |
| `common.ps1` | `6902d33e5c36d1238263fd6e23e593128efc65f3db774e9395f1d94499f03508` |
| `evidence-sha256.json` | `7c6d89d4ad4ab14acaddf06814fe74b2075d6b6d76aa5e600b607721578891cb` |

The reviewed creation recipe specified bridge driver, IPv4 enabled, IPv6 disabled, and these exact network options:

```text
com.docker.network.bridge.host_binding_ipv4=127.0.0.1
com.docker.network.bridge.gateway_mode_ipv4=nat
```

The saved network inspection confirms `mpia-phase2a01-loopback`, ID `d274b416ef3358dd68f53d3ad951d5aeca8e101c330432322d28cbfa2b866b8b`, local bridge scope, those exact options, `EnableIPv4=true`, `EnableIPv6=false`, and `Internal=false`, `Attachable=false`, `Ingress=false`. Labels were `com.supabase.cli.project=mpia-phase2a01-upgrade` and `mpia.review=phase2a01-test-setup-01b`. Initial membership was empty. No trusted-interface or routed/unprotected option was present. Private subnet/address values are intentionally omitted here.

The saved child script used the pinned launcher, explicit dedicated workdir and these arguments:

```text
start --network-id d274b416ef3358dd68f53d3ad951d5aeca8e101c330432322d28cbfa2b866b8b
--exclude realtime,storage-api,imgproxy,edge-runtime,logflare,vector,supavisor
--workdir <repository>/.phase2a01-test.local
```

The wrapper selected `DOCKER_CONTEXT=desktop-linux`, dedicated CLI home/cache and telemetry suppression. No per-publication address argument was supplied.

| Failed container fact | Directly observed value |
|---|---|
| Name / ID | `supabase_db_mpia-phase2a01-upgrade` / `773c4ffe208529799524543aa39100aba8e73692ecd00afe8be01c166417291c` |
| Created | `2026-10-14T20:06:39.320935052Z` |
| NetworkMode / membership | Exact network ID above; only that bridge attached |
| PublishAllPorts | `false` |
| Image | `public.ecr.aws/supabase/postgres:17.11.0.004` |
| Requested `HostConfig.PortBindings["5432/tcp"]` | One mapping: `HostIp=""`, `HostPort="55422"` |
| Resolved `NetworkSettings.Ports["5432/tcp"]` | `HostIp="0.0.0.0", HostPort="55422"` and `HostIp="::", HostPort="55422"` |
| Detection | Poll 103 at `2026-10-14T20:06:42.9575779Z`; database health still starting |

The CLI/container creation path therefore **did not request explicit loopback in the stored HostConfig**. It also did **not** store an explicit wildcard HostIp request: an empty value and `0.0.0.0` are different evidence. Docker inspect is the persisted configuration, not a packet capture proving whether an API field was explicitly empty or omitted before normalization.

Static read-only inspection of the hash-matched launcher provides supporting evidence: embedded JavaScript around byte offset `103900466` formats a publication as host-port, colon, container-port, with an optional UDP suffix; around `103901081` the create-command builder supplies those values with `-p` and supplies `--network` separately. The nearby service-creation helper uses that builder. This is consistent with an address-omitting Docker CLI publication. It is **not** a traced invocation proving every call site or the downstream Docker cause. A different embedded path contains explicit loopback publication; its presence does not establish a documented option for ordinary `start`, and it must not be adopted as an experimental workaround. No binary was patched.

Only the first database container was observed. Do not generalize its actual bindings into a measured inventory of seven services. Windows listeners at the instant of failure, exact exposure duration, packet-level reachability and successful LAN/Internet access were not captured. Wildcard Docker mappings were sufficient to fail acceptance regardless.

## 4. Cause classification and Docker findings

**Confirmed mechanism:** address-omitting publication reached the correct loopback-default bridge, but the resolved host bindings were wildcard on both families. The earlier acceptance design depended on the bridge default being honored and detected failure only after a container started. Monitoring shortened the response interval; it could not prevent initial publication.

Docker documents network defaults for publications without a host address and explicit loopback publication as a separate mechanism. Consequently, **empty HostIp alone is not proof that the CLI explicitly overrode the bridge default**. Under the documented behavior, the network setting should matter. The unexplained default-resolution step remains the root-cause gap. Docker also documents IPv6-to-IPv4 publication under applicable proxy/default-address conditions; an IPv4-only container bridge does not by itself prohibit an IPv6 host binding. [Docker port publication](https://docs.docker.com/engine/network/port-publishing/).

| Explanation | Classification / evidence needed |
|---|---|
| Wrong bridge selected | Contradicted by captured NetworkMode and sole membership matching the created ID. |
| Explicit wildcard stored in CLI request | Contradicted by captured HostConfig; empty address was stored. Raw create payload/process trace is unavailable. |
| Engine/Desktop ignored or transformed the per-network default | Plausible; fits the mismatch, but no exact-version trace or approved reproducer isolates the responsible layer. |
| Network name versus full ID handling differs | Unverified hypothesis. Official example passes a name; failed attempt used a full ID. Membership was correct, so changing the argument is not a proven fix. |
| Another effective daemon/Desktop setting or publication path intervened | Unverified. Limited user configuration inspection cannot exclude all managed/runtime settings. |
| IPv6 bridge disablement should prevent IPv6 host publication | Invalid assumption; host publication and bridge addressing are separate. Exact proxy configuration for this failed event was not established. |
| Windows firewall caused the wildcard Docker mappings | Unsupported. Firewall reachability does not explain or repair the captured binding configuration. |

The endpoint is the local `desktop-linux` named pipe. Observed Desktop is **4.91.0 (239619)**, Engine/client **29.8.0**, API **1.56**, Linux/amd64 under WSL2; Compose is **5.5.1**. User daemon JSON exposed only `builder`/`experimental` keys; no relevant explicit Desktop network/binding/WSL/routing override was found; user `.wslconfig` was absent. This does not establish the complete effective daemon configuration. Refreshed checks found zero portproxy entries, NetNat static mappings or connected interfaces with forwarding enabled. No global settings were changed.

Desktop's backend handles host port forwarding in addition to the Linux network layer, so bridge metadata is not a complete Windows exposure test. [Docker Desktop networking](https://docs.docker.com/desktop/features/networking/).

Minimum evidence to prove a deeper cause: exact-release source/build provenance for the executed path, a secret-free record of the actual Docker create arguments/API request, and Engine/Desktop evidence identifying which default was selected. Any reproduction must be separately approved in a safe environment; do not repeat the failed publication on this workstation to obtain it.

## 5. Option A — corrected ordinary CLI startup

The actual `2.120.0` launcher help exposes `--network-id`, exclusions and health-check controls, but no explicit host-IP/publication flag. The prepared TOML has service port numbers, not an active host-bind key. `SUPABASE_SERVICES_HOSTNAME` concerns service reachability from the caller; it is not established as a bind control. URLs such as `studio.api_url` and `auth.site_url` are likewise not host publication settings. [CLI reference](https://supabase.com/docs/reference/cli/introduction), [configuration reference](https://supabase.com/docs/guides/local-development/cli/config).

Supabase's official guidance still documents the custom bridge loopback-default recipe. It does not demonstrate explicit HostIp for every service in this exact local binary/runtime. Attempts to retrieve the exact public tag/source through browsing did not yield verifiable release source; newer/current documentation cannot close that gap. [Local development guidance](https://supabase.com/docs/guides/local-development).

| Requirement | Option A assessment |
|---|---|
| Explicit `127.0.0.1` for every required publisher | NOT VERIFIED; no documented pinned-version control found. |
| Prevent wildcard IPv4 and IPv6 before exposure | NOT VERIFIED; repeating the failed network-default assumption is unacceptable. |
| Preserve standard Supabase initialization | Ordinary CLI is the strongest starting point, but startup did not complete. |
| Avoid unsupported image/container patching | Possible only if a supported control is established; binary edits, Docker command shims and post-start binding edits are rejected. |
| Avoid global Docker/firewall changes | Required; daemon defaults/firewall changes are outside scope and affect Phase 1. |
| Independently test before full startup | No documented ordinary-start create-only/publication-preview gate found. Static request tests would help but cannot establish runtime resolution. |

**Option A is BLOCKED, not proven impossible.** Reopen only with release-specific official support and evidence covering DB, gateway, Studio, mail and every additional publisher. A later disposable test must use a reviewed containment boundary, fresh identities and no failed volume. A corrected explicit request, all resolved bindings, Windows listeners and independent reachability checks would all be mandatory. Do not substitute a different CLI version, experimental stack command or network name without review.

## 6. Option B — no-host-publication Supabase-compatible base

Propose a dedicated internal Docker bridge, no host network mode, and **no `ports` entries or publish flags on any service**. Database inspection uses the verified new DB container's Unix socket; HTTP checks use a dedicated client on the same private network. `expose`/image `EXPOSE` metadata is not host publication. Compose supports internal networks and separate create/start stages, allowing stopped containers to be inspected first. [Compose services](https://docs.docker.com/reference/compose-file/services/), [internal networks](https://docs.docker.com/reference/compose-file/networks/), [create](https://docs.docker.com/reference/cli/docker/compose/create/), [start](https://docs.docker.com/reference/cli/docker/compose/start/).

Proposed scope is DB, Auth, REST, Kong gateway, metadata, Studio, local mail capture and one test client. All eight use only the new network. No Phase 1 network/volume, Docker socket/engine API access, production data/credentials, host forwarding alias, external SMTP/OAuth/provider or application migration is allowed. Studio/mail remain internal; this stage does not provide a Windows browser UI. An internal bridge with isolated IPv4 gateway mode is proposed to remove the bridge's host-facing address as well; validate support and inspect it before any start. It is not a security boundary against a Docker administrator. [Gateway isolation behavior](https://docs.docker.com/engine/network/port-publishing/).

**Platform fidelity is achievable in principle, not yet certified.** Supabase documents self-hosting, but the current upstream Compose example is not the failed CLI stack: observed upstream versions and gateway selection differ, and its database service includes platform initialization files and additional configuration storage. Copying that example, deleting ports and changing the PostgreSQL tag would not prove equivalence. Pin and review a coherent upstream initialization revision and explain every difference from the selected local stack. Do not hand-create a few roles on a generic PostgreSQL image or patch a running container to imitate Supabase. [Self-hosting guide](https://supabase.com/docs/guides/self-hosting/docker), [upstream Compose source inspected](https://raw.githubusercontent.com/supabase/supabase/master/docker/docker-compose.yml).

The required equivalence contract includes PG17 runtime, platform schemas/extensions and initialization order, `auth.users`, `auth.uid()`/claim interpretation, Auth schema migrations, migration-owner authority, authenticator role switching, anon/authenticated/service roles, memberships, BYPASSRLS, default ACLs including PG17 MAINTAIN, schema privileges, JWT signing/verification agreement, gateway API-key routes, and local SMTP behavior. Startup may initialize platform data; application SQL remains disabled. PostgREST must connect as the intended authenticator, not an owner/service bypass identity. [PostgREST authentication](https://docs.postgrest.org/en/stable/references/auth.html), [PG17 row security](https://www.postgresql.org/docs/17/ddl-rowsecurity.html), [role membership](https://www.postgresql.org/docs/17/role-membership.html), [Auth configuration](https://supabase.com/docs/guides/self-hosting/auth/config).

The retained image inventory supplies candidate tags/digests, not current running-version evidence:

| Component | Candidate tag | Retained digest, `sha256:` prefix omitted |
|---|---|---|
| PostgreSQL | `17.11.0.004` | `6058a6759ab9268cff8ee70641d61f1bd75953316281b76427cf5a6b4db2eafc` |
| Auth | `v2.197.0` | `1736a63078f5922b198c4cbe50f80ab9a2d3b54fe8b7b6cfb2e9dc5dbbc12c6b` |
| PostgREST | `v16.4` | `d155c6718ed9a9f990d159a2ab7c0a3f16944dbb6d0a0344557421042acfe0df` |
| Studio | `2026.10.05-sha-94b8b06` | `d878dcd9dba73b66d1c2c19aeaf53d07704e71604d93013225be1d1c51475237` |
| Metadata | `v0.100.0` | `145325b7e39f8ef4931d6e8cfd3f6f4d655de09d72a2ccc96d9513542c2202bd` |
| Kong | `2.8.1` | `1b53405d8680a09d6f44494b7990bf7da2ea43f84a258c59717d4539abf09f6d` |
| Mailpit | `v1.31.3` | `ed9b00c609e77e99c79b93f1178255ebc271868920f2c69a8d166bd5634ed10d` |

Recheck repository-qualified digests and initialization compatibility before approving them. The client image/entrypoint is unresolved; a separate client container may reuse a reviewed cached image with suitable tooling, but that capability must be verified. No image acquisition is authorized now. PG17.11 versus historical 17.6 and REST v16.4 versus Phase 1 v14.5 remain explicit compatibility differences.

Later synthetic tests must cover genuine Auth-issued A/B JWTs through the gateway/REST path, reciprocal ownership denial with positive controls, grant/MAINTAIN denial, service-role limits, cascades, clean-chain and populated-upgrade preservation, and concurrency/rollback. Direct owner SQL or health endpoints cannot establish these results. A separate reviewed Track B runner is required; the hardcoded Track A harness cannot simply be redirected or weakened. Host-browser login/UI, OAuth, Storage, Realtime, Edge and provider behavior are not certified by this base. Later browser testing needs its own reviewed internal test-client arrangement.

## 7. Retained volume disposition

**Preserve `supabase_db_mpia-phase2a01-upgrade` as diagnostic evidence.** Verified local driver/scope; created `2026-10-14T20:06:37Z`; labels `com.docker.compose.project=mpia-phase2a01-upgrade` and `com.supabase.cli.project=mpia-phase2a01-upgrade`; options null; no attached container. Its metadata matches the failed-attempt final inventory. Contents are unknown and may include partial platform initialization. It was not mounted, read through PostgreSQL, reset, reused, copied or deleted.

The proposed recovery uses project `mpia-phase2a01-recovery02a`, independently named storage and a new workdir. These names were absent during the refreshed audit. Preservation needs no destructive action. Alternative removal requires separate explicit approval naming this exact failed volume, then identity/ownership/attachment checks, retained diagnostic evidence and target-specific cleanup verification. Removal is neither recommended nor authorized here; no reset/removal command is supplied.

## 8. Comparison, remaining approvals and decision

| Criterion | A: ordinary CLI with explicit loopback | B: no host publication |
|---|---|---|
| Isolation assurance | Unverified supported control; failed default recipe cannot be reused | Stronger inspectable design: no requested mappings, stopped inspection before start, internal network; runtime gates still required |
| Supabase fidelity | Standard CLI initialization advantage | Requires reviewed upstream bootstrap, exact configuration and catalog/JWT parity evidence |
| Reproducibility | CLI hashes pinned; unresolved runtime behavior | Image digests, initialization/config hashes and explicit resource manifest can be pinned |
| Complexity | Lower if a supported fix exists | Higher preparation and verification burden |
| Risk to Phase 1 | Shared Engine; another broad publication possible | Shared Engine/resource pressure remains, but no shared network/storage or host ports |
| Test coverage | Potential local browser/API/DB paths after isolation | DB/Auth/REST and later RLS/upgrade tests; host-browser path not provided |
| Unsupported dependency | No acceptable fix established; shims/patches rejected | Avoidable with coherent official initialization; custom approximation would invalidate equivalence |
| Owner approvals | Proven fix, safe bounded test, fresh target, then startup | Preparation package, equivalence/version scope, exact resources/cleanup, then startup |

Required before another attempt:

1. Accept the dedicated-target interpretation of the no-link boundary while preserving the original linked repository. If workspace-wide unlinking is required, treat it as a separate task; do not proceed here.
2. Authorize preparation only of Option B's pinned Compose/bootstrap/client/verification package in its new directory. Review exact artifact hashes and initialization provenance before authorizing resource creation or startup. This task has not constructed that stack.
3. Accept or resolve PG/Auth/REST parity differences and document the future synthetic-test boundary. A health-only result cannot close D07.
4. Approve the exact future resource list, create-without-start gate, startup sequence, monitoring and target-specific failure cleanup. Preserve the failed volume; any later deletion requires its own approval.
5. Repeat time-sensitive checks against a fresh owner-accepted post-restart Phase 1 baseline.

**Current decision: BLOCKED for another Stage 2 attempt.** Option B is the preferred recovery design, but neither option is ready for execution today. Stage 3, fixtures, Phase 2A-01 implementation/D17, live-project work and deployment remain unauthorized; D07 overall readiness remains open. This review does not change any decision register.

Verification performed: existing read-only `node --test tests/security.test.mjs` returned **5 passed, 0 failed, 1 skipped** (built browser assets). That skip remains NOT VERIFIED. No build, full application regression, runtime DB/Auth/REST test or fixture test was run for these documentation-only deliverables. Hash and metadata checks establish only the facts expressly reported above.

Deliverable validation: local Markdown links resolve, fenced blocks are balanced, and all three proposed PowerShell blocks parse without syntax errors; none was executed. Targeted credential/private-address pattern checks found no matches in these two documents. Final Git inspection still showed empty tracked/index diffs, exactly the five historical migration files, and only these two new deliverables beyond the ten existing untracked documentation inputs. All 51 retained evidence hashes still matched. These checks do not behaviorally validate the proposed runbook.
