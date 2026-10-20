# MPIA — Phase 2A-01 TEST-SETUP-02B preparation report

16 October 2026 (Asia/Kuala_Lumpur). **BLOCKED for authorizing stopped-resource creation and startup. Preparation only; no Stage 3 or Phase 2A-01 implementation.**

The local candidate package is prepared under `.phase2a01-recovery02a.local`, with static safety checks, official initialization references, client tooling evidence and future acceptance specifications. It is an auditable **blocked candidate**, not an executable approved release. Read [the approval manifest](../.phase2a01-recovery02a.local/PHASE2A_01_TEST_SETUP_02B_APPROVAL_MANIFEST.md), [bootstrap review](../.phase2a01-recovery02a.local/BOOTSTRAP_REVIEW.md) and [future acceptance specification](../.phase2a01-recovery02a.local/RUNTIME_ACCEPTANCE.md). The unchanged [02A runbook](PHASE2A_01_TEST_SETUP_02A_RECOVERY_RUNBOOK.md) remains authoritative.

## Decision and material blockers

**Resumed baseline disclosure:** the owner separately confirmed Windows/Docker restarted during the usage-limit pause. Original twelve container IDs and four volumes remain; ten running Phase 1 containers have changed start times/network endpoints and the default bridge was recreated. The comparison normalizes only those identified restart effects, with original snapshots retained; other configuration, memberships, ports, mounts, images and labels remain strict checks. The DB is healthy and retained failed volume unattached. No restart was issued by this task. This confirmation does not authorize recovery execution.

1. **Headroom:** initial host capture had 942,844 KiB free physical memory (~921 MiB); the resumed capture had only 394,048 KiB (~385 MiB), against candidate memory limits totaling **2,816 MiB**. Docker VM reports 3,777,642,496 bytes total, not free. Safe headroom for Phase 1 plus this stack is not established. CPU limits total 2.5; disk capacity was available. No Docker/WSL settings were changed.
2. **Bootstrap/service compatibility:** immutable PG/Auth source bytes are verified against cached images, but the selected official self-hosted configuration uses Envoy and different image versions. Its full stack cannot be substituted for the runbook's Kong-based candidate. The proposed restricted Kong configuration, version differences, disabled-service dependencies, all health executables and exact final catalog/extension/ACL expectations still require review. Source provenance is not runtime equivalence.
3. **REST readiness and catalog acceptance:** REST has no verified bundled HTTP health executable; its candidate readiness is client-mediated and must be enforced by the released controller. The DB probe explicitly targets TCP 127.0.0.1; the pinned entrypoint's temporary bootstrap server is socket-only, so it cannot falsely satisfy this probe. Final TCP readiness still does not establish exact initialized-catalog equivalence.
4. **Credentials:** placeholders only. No synthetic secret values were needed for static review. Restricted ACLs, generation provenance, matching JWTs/API keys and generated gateway/client configs must be established and resealed before runtime readiness. Current validator intentionally rejects replacing placeholders without a revised reviewed contract.
5. **Execution tooling:** the package includes a read-only observer prototype, publication assertions and tested exact-ID cleanup planner. It does not release a complete event/listener/Phase 1 monitor plus mutation controller. Full runtime command/env/resource checks, automatic authorized failure stop and exact acceptance expected sets remain open. Creation cannot be approved on the assumption these will be improvised later.
6. **Approval and runtime evidence:** no creation/startup approval exists. Isolated gateway mode is accepted by Compose syntax; Engine/Desktop behavior, independent reachability, running health/catalog/JWT checks remain unexecuted. No less restrictive network fallback is permitted.

These are not resolved by approving the current hash. Address the blocking preparation/design gaps and issue a new sealed candidate first; the owner can then separately authorize stopped creation and later startup/platform initialization/target-only cleanup. No change was made to the original runbook to hide a design conflict.

## Protected baseline and authority

Read all eight required references: Phase 1 freeze; Phase 2 architecture plan revision 1.0; foundation specification proposed 1.1; final readiness report; implementation checklist; failed runtime verification; both 02A deliverables. Exact reference hashes are in `evidence/repository-before.json` and the sealed inventory. Their application implementation examples were not executed.

- Branch `phase2-location-intelligence`, HEAD `934ea702a2ecfdb31c530ea4a33e21a2d55e27d2`; no branch/history/index operations or commits.
- Five historical migration files match HEAD Git blobs; SHA-256 captured before/after. Zero tracked/index changes. Twelve pre-existing untracked documents were preserved; only this report is newly repository-visible.
- The recovery directory was created, then its self-contained `.gitignore` containing `*` was written **before any other generated artifact**. `git check-ignore` confirmed coverage. Root `.gitignore` was not changed. The requested approval manifest is inside this ignored directory to honor the instruction that only the preparation report be repository-visible.
- Original Supabase link files were inspected by names/stat metadata only, never read for values/copied/invoked/removed. Recovery has no Supabase CLI workdir/link, application migration copy, production data or existing volume attachment. Protected old TOML and both CLI binary hashes match the 02A review; neither executable was invoked.
- Docker context is desktop-linux at the exact local named pipe. Desktop 4.91.0 (239619), Engine/client 29.8.0, API1.56 and Compose5.5.1 match the review.

<!-- PRESERVATION_RESULT -->

**Preservation PASS** between `2026-10-15T19:26:27.1131734Z` and `2026-10-16T14:01:29.2397781Z`. The original twelve container IDs and four volumes remain; the Phase 1 network identity remains and the DB is running/healthy. Historical container structure matched the initial 02B snapshot. No recovery resources exist. Stable configuration/membership preservation passed after accounting for the owner-confirmed Windows/Docker restart during the usage-limit pause; only recorded start-time/counter/endpoint/default-bridge recreation effects were normalized. Original snapshots remain intact. The pre-existing vector loop is separately disclosed. The vector loop is separately recorded (restart counter 38→13); its known behavior does not excuse other runtime drift. Host comparison recorded 30 added and 32 removed listener identities; this does not certify host-wide stability and remains a fresh-execution review gate. No recovery resources exist.

<!-- /PRESERVATION_RESULT -->

Metadata preservation is not a database row-level audit. No database was queried. The retained failed volume remains `supabase_db_mpia-phase2a01-upgrade`, created `2026-10-14T20:06:37Z`, local driver and original project labels, with zero attachments. Its contents remain unknown. No recovery container/network/volume exists. Both host snapshots show zero old test-port listeners (55420–55429 and 8183), zero NAT static mappings and zero connected forwarding interfaces. Addresses/routes/listener inventories remain only in ignored evidence. Unrelated host listener drift is documented privately and is not attributed to nonexistent recovery resources.

## Provenance, images and client

The PostgreSQL17.11.0.004 tag resolves to [`supabase/postgres@cf90815413819eb057a9916c1598692c160ebeb4`](https://github.com/supabase/postgres/tree/cf90815413819eb057a9916c1598692c160ebeb4). Auth2.197.0 resolves to [`supabase/auth@4eee58f296d9698a1c2c0ae14d7a0b379c7622d3`](https://github.com/supabase/auth/tree/4eee58f296d9698a1c2c0ae14d7a0b379c7622d3). The image Dockerfile pins [Docker Library's entrypoint at 6edb0a8c](https://github.com/docker-library/postgres/blob/6edb0a8c4def40c371514b34aef9037ec82d9110/17/alpine3.23/docker-entrypoint.sh). Exact URLs/Git blob IDs/SHA-256 are stored per downloaded file; none is fetched at future startup.

**136/136 selected embedded bootstrap/Auth migration files match official source bytes.** This was established by exporting already cached images with `docker image save`, checking archive config/layer digests and hashing selected files without extracting/executing code. No image pull, build, package installation, container or mounted volume was needed. Local source-consistency proof does not replace signed upstream release attestation or runtime verification.

The full ordered source manifest is `bootstrap-order.json`. The official entrypoint initializes fresh PGDATA; bundled migrate.sh runs init scripts as postgres, migrations as supabase_admin, then optional postinit; Auth default command runs its own 75 migration files before serving. Only three unmodified external official SQL files are candidate mounts: webhooks, JWT-expiry setting and role-password setting. The complete image-bundled chain is retained as references. No substitute roles or fabricated platform schema were written. Auth/storage/realtime/functions schemas in image bootstrap are platform objects, not MPIA application migrations.

The self-hosted source revision [`3fc8af387ec4dfb449510828a938e1f6e57a9575`](https://github.com/supabase/supabase/blob/3fc8af387ec4dfb449510828a938e1f6e57a9575/docker/docker-compose.yml) uses different service versions and Envoy. Its legacy Kong wrapper references a different entrypoint path and its routes include excluded services; these are **reference-only**, not mounted. A small candidate Kong JSON permits only internal Auth health and REST GET/HEAD. That proposal needs compatibility review. No Envoy service was silently substituted.

<!-- IMAGE_TABLE -->

| Service | Tag (reference only) | Pinned repository digest |
| --- | --- | --- |
| db | postgres:17.11.0.004 | public.ecr.aws/supabase/postgres@sha256:6058a6759ab9268cff8ee70641d61f1bd75953316281b76427cf5a6b4db2eafc |
| auth | gotrue:v2.197.0 | public.ecr.aws/supabase/gotrue@sha256:1736a63078f5922b198c4cbe50f80ab9a2d3b54fe8b7b6cfb2e9dc5dbbc12c6b |
| rest | postgrest:v16.4 | public.ecr.aws/supabase/postgrest@sha256:d155c6718ed9a9f990d159a2ab7c0a3f16944dbb6d0a0344557421042acfe0df |
| kong | kong:2.8.1 | public.ecr.aws/supabase/kong@sha256:1b53405d8680a09d6f44494b7990bf7da2ea43f84a258c59717d4539abf09f6d |
| meta | postgres-meta:v0.100.0 | public.ecr.aws/supabase/postgres-meta@sha256:145325b7e39f8ef4931d6e8cfd3f6f4d655de09d72a2ccc96d9513542c2202bd |
| studio | studio:2026.10.05-sha-94b8b06 | public.ecr.aws/supabase/studio@sha256:d878dcd9dba73b66d1c2c19aeaf53d07704e71604d93013225be1d1c51475237 |
| mailpit | mailpit:v1.31.3 | public.ecr.aws/supabase/mailpit@sha256:ed9b00c609e77e99c79b93f1178255ebc271868920f2c69a8d166bd5634ed10d |
| client | postgres-meta:v0.100.0 | public.ecr.aws/supabase/postgres-meta@sha256:145325b7e39f8ef4931d6e8cfd3f6f4d655de09d72a2ccc96d9513542c2202bd |


<!-- /IMAGE_TABLE -->

Every reference above was verified in local RepoDigests, Linux/amd64. No cached image declares extra VOLUME paths. The client reuses the metadata image with explicit `/usr/local/bin/node`, read-only filesystem, no inbound listener and Node built-ins only. Its archived amd64 ELF executable and all inspected archive-layer/config digests were verified; NODE_VERSION metadata declares22.23.3. Actual runtime version/module operation remains unexecuted. No curl/npm installation is assumed. PostgREST health/version tooling, Auth wget, Mailpit readyz and other image health probes need final source/tooling acceptance; no executable was launched to test them.

Phase 1 differences: PG17.6.1.155→17.11.0.004; REST14.5→16.4; meta0.99.0→0.100.0; Studio2026.08.24→2026.10.05; Mailpit1.30.2→1.31.3. Auth2.197.0/Kong2.8.1 match Phase 1. Broad defaults, PG17 MAINTAIN, postgres/service-role BYPASSRLS, effective SET/USAGE memberships and newer privileged-role/extension changes require explicit acceptance; no grant/role repair is authorized. The source-derived final auth.uid body must be checked after Auth migrations. PostGIS is not added or required for 2A-01.

## Static model, mounts and credential handling

Eight exact services: db/auth/rest/kong/meta/studio/mailpit/client, under project `mpia-phase2a01-recovery02a`. Only network `mpia-phase2a01-recovery02a-private`: bridge, internal=true, IPv4=true, IPv6=false, isolated IPv4 gateway mode, no implicit default network. Docker documents isolated mode as requiring an internal bridge; exact Desktop behavior remains a future check. [Docker gateway modes](https://docs.docker.com/engine/network/port-publishing/#gateway-modes).

No ports/publication, host networking, host socket, device, Phase 1 network/volume, failed volume, external network, build, pull or restart. Exact source-policy comparison rejects unapproved fields/entrypoints/services/env values, including IPv6/random/loopback publication. Every bind is explicit, read-only, create_host_path=false, confined to this directory and checked for symlinks/reparse points. Resolved Compose is parsed only in memory in a constrained child environment; reports never contain interpolated credentials. `RECOVERY_STAGE2_APPROVAL` is required to resolve Compose; the validator supplies a static-only sentinel solely to its config child process. This is an operational guard, not a security boundary against someone deliberately bypassing the package.

Named storage: fresh db volume at `/var/lib/postgresql/data`; fresh db-config at `/etc/postgresql-custom` for upstream key/config persistence. DB mounts official webhooks/jwt/roles SQL and read-only verification SQL. Kong mounts local declarative JSON. Client mounts its program and anon-only JSON. Client/Mailpit have bounded 16MiB /tmp tmpfs. Remaining writable container layers support bundled entrypoints/process/log files; review before runtime. Resource limits, health settings, dependencies, environment variable **names**, exact bind paths and entrypoints are listed in the approval manifest/model. DB retains only five documented bootstrap capabilities; all services drop ALL first, no privilege escalation, no privileged mode. Mailpit handles internal SMTP only; signup/email/phone/anonymous providers disabled in candidate Auth configuration.

`.local.secrets` contains explicit PLACEHOLDER values. No real credential values were generated, printed or reused. Private source archives/evidence are ignored but not represented as a secret vault. The credential contract requires owner/SYSTEM-restricted DACLs verified before future CSPRNG generation, matching JWT signatures/roles and resealing all changed configs. No file-security guarantee is claimed for real secrets that do not yet exist. Candidate config has no production/hosted database targets; official source-reference text is not active configuration.

## Validation performed and limits

<!-- TEST_RESULTS -->

**78 static tests passed, 0 failed/skipped**, plus **8/8 negative tests on the actual resolved Compose model**. Cases cover wildcard/loopback/IPv6/random publications, default/host/Phase1 networks, socket/named-pipe mounts, failed/anonymous volumes, remote targets/credential overrides, services/images/entrypoints/caps/build/pulls, missing metadata/files, malformed evidence, protected IDs/cleanup ownership, and HTTP response/redirect/target filtering. No test contacted a database or live HTTP service.

Compose config validation: **PASS**, eight services, one network, IPv6=false, isolated gateway mode and **zero requested host publications**. No resolved model or secret value was printed. Tests do not establish runtime isolation or release completeness.

<!-- /TEST_RESULTS -->

The package's PowerShell scripts were syntax-parsed; no SQL parser/server execution was used. SQL/runtime result sets are specifications, not observed outcomes. Initial Docker/Windows/network reads were blocked by the sandbox and retried with approved read-only access. Early collector/config validation errors (optional Docker fields and Windows plugin lookup environment) were fixed; successful evidence was captured afterward, and failed reads were never counted as empty inventories.

All tools used for infrastructure were metadata/image-save/config reads. No create/up/start/restart/run/exec/stop/rm/network-create/volume-create/load/pull/build was invoked. No application tests requiring databases, migration/fixture scripts, provider calls, live project connections, deployment, firewall/WSL/daemon changes or generated TypeScript changes occurred. Source downloads contacted public GitHub only; no external Supabase project was contacted.

## Gate 0 reconciliation

| 02A Gate 0 item | Prepared and statically verified | Prepared, requiring runtime verification | Blocked / owner decision |
|---|---|---|---|
| 1: directory, Compose, artifacts, no links/copies | Ignore-first directory; explicit JSON-compatible YAML; local SQL/client/preflight/inspection/integrity/cleanup-planner artifacts | Bind translation and restricted secret access in Desktop | Full released controller/monitor missing; credentials are placeholders |
| 2: immutable bootstrap/order/equivalence | Official PG/Auth revisions; 136 byte matches; ordered hash manifest; unmodified external SQL; no fabricated schema | Actual initialized catalog/roles/ACLs/extensions/auth.uid and migration ledger | Mixed image/gateway source-set review and exact expected final catalogs incomplete |
| 3: cached pinned images/client | Seven repository-qualified digests reused across eight services; amd64; Node binary/layer checks | Runtime tool/version/health checks | Other image health tool assumptions and joint compatibility unresolved; no acquisitions allowed at startup |
| 4: complete mounts/persistence | Two named volumes, seven file binds; no image VOLUME declarations; explicit tmpfs; no old mounts | New volume identities, ownership, actual mount paths/caps | Review startup writable paths and permissions; no automatic additions |
| 5: fresh credentials/config/offline | Placeholder-only exact contract; internal targets; no copied credentials; filtered client | Actual Auth/REST/gateway JWT agreement, provider/telemetry suppression | ACL/generation/reseal and complete version-specific external dependency audit required |
| 6: no restart, bounds/dependencies/isolation | No ports; restart no; limits; internal IPv4 isolated model; explicit dependency graph | Engine isolated-mode behavior; final-server readiness; health/resource pressure | Insufficient demonstrated memory headroom; initialization readiness/controller unresolved |
| 7: expanded Compose model | Exact resolved comparison and unsafe-mutation tests; no secrets printed; image entrypoint/command/volumes inspected | Full stopped/running actual model reconciliation | Full effective runtime env/command/cap/limit acceptance still needs release integration |
| 8: manifest, test examples, future cases/cleanup | Sealed file hashes; resource/image/mount/env inventory; static positive/negative tests; fresh-case specifications | Journal IDs, monitor/reachability evidence and target cleanup rehearsal | Owner must review a corrected package, name its hash and explicitly authorize stages/cleanup/retention; no approval inferred |

## Runtime acceptance still required

The prepared `verify.sql` covers PG17/session/socket/read-only identity, core role attributes, effective membership/BYPASSRLS, schema/default privileges and MAINTAIN, auth.uid definition, zero users, all public objects and guarded ledger checks. Some core conditions assert failure via psql exit; complete role/default/extension/platform-ledger equivalence still lacks approved expected sets. Query success alone is insufficient. No query ran.

The internal client defines direct/gateway Auth and REST health, shape/version/empty-application checks, no redirects and filtered output; actual REST executable version must be verified separately. Runtime must also demonstrate zero requested/resolved publications, correct isolated network and mounts, independent path-valid reachability results, preserved Phase 1/failed volume and working journal-based cleanup. These all remain NOT EXECUTED.

Cleanup is currently a tested pure plan generator: full new IDs absent from protected baseline, exact name/labels/creation window and network membership; positively identified publishers prioritized; stop→verify stopped→container removal→empty-network reinspection/removal; **retain every volume**. It neither executes cleanup nor authorizes it. Future synthetic clean-chain/populated-upgrade/failure/concurrency cases need separate new identities, reviewed fixtures and permission. No Stage 3/implementation authority follows from Stage 2 acceptance.

## Exact artifact inventory and approval seal

<!-- SEAL_SUMMARY -->

Candidate `02b-candidate-1`: **BLOCKED**. Machine manifest SHA-256 `75998fd02c0eeb1b985164c8b02ba56000265af6b4954ea3d72d1fa56aba3e72`; 263 sealed files. Approval manifest SHA-256 `37df25dcde27397e6886c1ce3b9e71c848bc9b3d800229cce3440feaa94b3ab1`. The two manifests plus the sealed files yield 265 local files in the exact inventory below. Cached image archives total 512,743,424 bytes and contain public images only, never existing volumes or production data.

<!-- /SEAL_SUMMARY -->

All paths below are relative to `.phase2a01-recovery02a.local`. The machine manifest seals package/evidence files; the approval manifest binds that manifest hash; this report records both hashes. This avoids recursive self-hashing. This report is outside the execution package and does not claim a hash of itself inside itself. The approval manifest and machine manifest are individually hashed below but excluded from the machine manifest's own file list. A separately recorded report hash is available from `Get-FileHash` if required for transfer. Any edit invalidates the corresponding seal and requires review.

<!-- ARTIFACT_TABLE -->

| Path | Bytes | SHA-256 |
| --- | --- | --- |
| .gitignore | 3 | 45549a9ffd9963f855d72829e978a31c05b82894b14b1d8fbdd43083b20c2d86 |
| .local.secrets | 242 | 39e576371eec8060ce07ffe153a08dbedbae142dc69f6bf7ff06ae94124add96 |
| BOOTSTRAP_REVIEW.md | 11305 | b4d2bcfa1cb415f75995940af4b4b439cc8ccf2639fa8c44e8f37a8f85eb621d |
| CREDENTIAL_CONTRACT.md | 2732 | 511392f419e79a5af6fd1272f024403e097e54f34a111f91b49a2ad46ffdedaf |
| PHASE2A_01_TEST_SETUP_02B_APPROVAL_MANIFEST.md | 12144 | 37df25dcde27397e6886c1ce3b9e71c848bc9b3d800229cce3440feaa94b3ab1 |
| README.md | 2847 | 9f983830e4c0598f1fcc17a7c4280787b93eec16fa811e3c5f93086a166cc49f |
| RUNTIME_ACCEPTANCE.md | 8404 | 7863bee239f5312588492442cfee8789609ad7fac7983035fb45d3dc63b4b9d7 |
| artifact-manifest.json | 54439 | 75998fd02c0eeb1b985164c8b02ba56000265af6b4954ea3d72d1fa56aba3e72 |
| audit-repository.mjs | 3037 | d972f469db26bfce07bd206e6106de0a369f65b05f072c1f8a713d3109e00308 |
| bootstrap-order.json | 81933 | 77055ff5123b6492908b39fbdd7e5fc1b983318331225058f858e00c817ea8d1 |
| cleanup-plan.mjs | 3569 | 7e15141e4b3d5f7dd0eaeecaec626415995d18cae26eee7c3a18c34357b991f1 |
| cleanup-tests.mjs | 2179 | 89c2d6705e451d26d312a87bf22b6eed21f59e8f892a45b5f9c27d717737f4f6 |
| client-image.tar | 114417152 | 5ec36a47532983b82bb36775013784dc0f8f883dd5f7774cd97f62c76e9f3a1b |
| client.mjs | 2764 | 7a8c827535236cfd2bc002bdcb3e23b75a7a6837c4289333f2b61609136ced57 |
| compare-preservation.py | 4755 | b3a55df2edd5901378450243d0f3e1f30f29e3a075d9de6126df5fb85422c90f |
| compose.yaml | 17968 | 9ac60e426ad7713ba1d01ca8fc70b34b0b833b2338ed9b109f8a32b036e003f0 |
| config/client.json | 115 | 6fcc9aa3deb07acb8b0f7c761f4e2f2d67d0444267f24bc7240868d74b5469f2 |
| config/kong.json | 1317 | ab317b1f5d3cfcbfccf52a6998789eb89a73ea676ce9a3fd49d2e2fae946f22d |
| download-sources.py | 2691 | 5d715f901923a020289bb891bb78f088ac5bcf142d8355dac0ea5f7da2fd7071 |
| evidence/after.json | 110739 | e7ef3b24a328853dd9db8c4ca3824b4506227ce7368977b696abae51437702a9 |
| evidence/before.json | 110739 | 3820945f0cc8d7f46c727421947142268067968439abe5bbdc4b91343cbb1a4a |
| evidence/bootstrap-image-comparison.json | 60287 | 98bc883ad6715a2c62234e856bb2d516365cc4841a151f90b0149e1f60d2fbc1 |
| evidence/client-tooling.json | 2341 | f36642b142747471191965e021c04f39dc9f64aefe3d80944d712ba20389736d |
| evidence/compose-diagnostic.txt | 114 | b5179e172723b82ec88f811360826432bbd8bcb85328740a296b42c0dbbed509 |
| evidence/compose-validation.jsonl | 223 | 24abe351d2e8c0dfe338a10816f59903aaa82b2efb1af1dbe48ab798ff66d2da |
| evidence/host-after.json | 26449 | 7031a2d558fff151c6853bee326e9f434ea711a3e9fb4d9b32ed44fd09da6b25 |
| evidence/host-before.json | 26449 | ffba9230460a9567b4072f50cea6dca1fe93937556f60424f7603ba0a6a80441 |
| evidence/host-comparison.json | 3895 | 7282c4a17dc800ebe3f441ab8c355381cb8dee7b4df917edc376bcdca8023f0f |
| evidence/host-preflight.json | 26043 | 5c7f5af57f8122af328713786ea65dd8fab44bec4f9dafe52b2f176e6aaaa7b4 |
| evidence/owner-restart-confirmation.json | 488 | 7b0d88e7da881e425069a952b0f1e5d8f2845dce2e68abde99dd09bcbc09dad8 |
| evidence/powershell-syntax.json | 314 | 8344f40db453ec0efc6e04cce352d381afdbfeba0099848c84ef0873c717f89f |
| evidence/preflight.json | 110739 | 57cd51a1efaf659b8afa1a506ae78be06d2de1861fe4e47871ebeacfdf7633e7 |
| evidence/preservation.json | 8222 | adaeffd1babd917a389fd1a25f800674d2bec69dc0588bcbbc7cba2b881e538c |
| evidence/repository-after.json | 4300 | 395d89915408cbeb89d6edace83ca0ef554fd1338bdbf12bb58eb62e4c8fc45f |
| evidence/repository-before.json | 4240 | 72c48e6eed252f33f0a0feaf5681243f3a302d82e40b95038536dbf584decfbd |
| evidence/repository-resumed.json | 4300 | 395d89915408cbeb89d6edace83ca0ef554fd1338bdbf12bb58eb62e4c8fc45f |
| evidence/static-tests.tap | 9935 | 833a36b00901e0be1a8e208a5ac92b2750596d81cc5531c9a3f25f1480fc5817 |
| evidence/test-results.json | 179 | 5d07a3f9d1d762b809ad55abd339ae6b040398c1c18fd563b702f6ef91f28437 |
| execution-manifest.json | 3803 | 69803a09bee0cebb0ac8fdbfb8825ab9835a4306a4233ee8967db3a6dcafab49 |
| fetch-provenance.ps1 | 1160 | 53ff37765f28fb9318520732cc5eee988b94a52928c44134a289394d21d8c793 |
| finalize-package.py | 16504 | a2aca2060c623276b3fe7c7231b43431b071e4dd19aaaa17515a6dd0c78e4c38 |
| inspect-bootstrap-images.py | 2675 | dc76e817d13134c3e001810f1b45e434d1156fb15709559529738ac829bae927 |
| inspect-client-image.py | 2186 | 1cd9a7d4bb1d6d2f358e4e86413302d7d70d9eed635e7a8dd8689f3614df389d |
| inspect-host.ps1 | 2185 | 306c17288614982cb21956a0b6754885b25c04fdacd253b7ed8e366ed2e24c68 |
| inspect-resources.ps1 | 6244 | e5b51aea5a872917ca80c95ef0cc63919f2a61ed4507c72f3635e7a4afae0262 |
| monitor.mjs | 2321 | ed3da96977c23f05d864308df22bf208b91ed14fc63c2c96a38dad70e35e891f |
| platform-images.tar | 398326272 | d9fc85c934a1798791dd02bba915ba142c36d3ccab1f987c014bf7ef105cf487 |
| policy/client.json | 115 | 6fcc9aa3deb07acb8b0f7c761f4e2f2d67d0444267f24bc7240868d74b5469f2 |
| policy/kong.json | 1317 | ab317b1f5d3cfcbfccf52a6998789eb89a73ea676ce9a3fd49d2e2fae946f22d |
| policy/model.json | 17968 | 9ac60e426ad7713ba1d01ca8fc70b34b0b833b2338ed9b109f8a32b036e003f0 |
| preflight.ps1 | 808 | 341241d0fbd0aeb39663920c0c8f30573d7eb5d06cf687e3de6836c81b891f6b |
| prepare-model.py | 9748 | fe0b1850922968534fb6edd5f0e02980a028c2c095677a162547920b210f873b |
| run-static-tests.mjs | 983 | fe690f5d5aa25b52da713ffc7eb11d1d9a951c6671b4ca8cda3a60a14117f6a0 |
| runtime-policy-tests.mjs | 1164 | 343546731e7025c816cf4b028974360092e2e6ee3004d5429facc612a9ec6981 |
| runtime-policy.mjs | 2874 | 828cf919a86b2338872d6e6fda30c954201af5c5d475239722738a702b58a391 |
| static-tests.mjs | 4953 | 37848ada9a32a6224b66cb1e71b55a205f4eabcb1e1404fe36cec04e05b3e4f0 |
| upstream/auth/files/Dockerfile | 959 | 382271a57f2c9887652641d1a8c1c297b8da7b0839a6062565f39ddbdbde5ac3 |
| upstream/auth/files/cmd/migrate_cmd.go | 2673 | 9a80dde9aba8e9b3a8d42d2abde5d931f87d5372b31196063967ff326f84acc5 |
| upstream/auth/files/cmd/root_cmd.go | 1913 | f34168215f44a044e3c838694a7282faa508cd5c0596bd533a437a972bf9eeaf |
| upstream/auth/files/cmd/serve_cmd.go | 5870 | 86a19a36523bb568c9853eeedf01ac34a9bb3d9ce80b9599d38defe325526ff7 |
| upstream/auth/files/internal/conf/configuration.go | 53831 | b27faebba541f907b23d2ce2dcab8c4679b5ce49cf1fcee007778f1b53230773 |
| upstream/auth/files/migrations/00_init_auth_schema.up.sql | 3771 | 4c3ab2565f2836d8fa0a54fd9d153facaee0c4c6258fa0a794c93446ddc10f71 |
| upstream/auth/files/migrations/20210710035447_alter_users.up.sql | 772 | b87f889d4839b7e092f186ad244f3f5294ab5c0f50ef2feb40cab1307be8c9cd |
| upstream/auth/files/migrations/20210722035447_adds_confirmed_at.up.sql | 212 | 32499502e5d57594d2373e6f00d7b436a9b275c85b889680913f00d6ebc3ae73 |
| upstream/auth/files/migrations/20210730183235_add_email_change_confirmed.up.sql | 666 | 88da41a1dbae8077a26a4811c4d80b925162e5423c803467d3bff78407b4d995 |
| upstream/auth/files/migrations/20210909172000_create_identities_table.up.sql | 623 | 4c2d6a94d34d34f98f1fa83537a0068f4813e49a19cfc2fd4e9199e5a941cc84 |
| upstream/auth/files/migrations/20210927181326_add_refresh_token_parent.up.sql | 1096 | 73fb1d320fb85e231e322d0da6184adcda838c755a2b3f1e0894c249a59ba4e3 |
| upstream/auth/files/migrations/20211122151130_create_user_id_idx.up.sql | 161 | 0fbc4d8b62329aa444ea5820eef86e32a57a709964a2c65bc0463083b7130b02 |
| upstream/auth/files/migrations/20211124214934_update_auth_functions.up.sql | 823 | abf8d29849e04db2b6a84ea9c8c58daafdabdd3e3520051efb9ec362f4679992 |
| upstream/auth/files/migrations/20211202183645_update_auth_uid.up.sql | 311 | a70a3afa97c67fbb31aacbea496da0d01b9a809dc4b861f3187cb7e3ba5fda2d |
| upstream/auth/files/migrations/20220114185221_update_user_idx.up.sql | 241 | 89eb7cb7f44efcbf48ed854faca0347dea80cebff1693a8dc532d581729de0cd |
| upstream/auth/files/migrations/20220114185340_add_banned_until.up.sql | 136 | 8aea70090fdeeafc4bbf206a799551e3f7bce0e6749d8c7cc8033e983e750e38 |
| upstream/auth/files/migrations/20220224000811_update_auth_functions.up.sql | 895 | 5b72022d73e64a8e474d2122ac42f299bb7ce4d59755cdcc78e72abfe5d47dc0 |
| upstream/auth/files/migrations/20220323170000_add_user_reauthentication.up.sql | 272 | 5fb66f473dd37e7141c5165254a6706cae3d2cab3632b92fb0f8f7cb58f7655d |
| upstream/auth/files/migrations/20220429102000_add_unique_idx.up.sql | 1420 | 4f9ce72459f72a601c4901eed0d4f5b9e9731c31f8d643736a118739c29538ee |
| upstream/auth/files/migrations/20220531120530_add_auth_jwt_function.up.sql | 644 | 91d2d5e47f19e65a63ec411f6cbb18755ec1792cb4249694dc261ef59cc78a10 |
| upstream/auth/files/migrations/20220614074223_add_ip_address_to_audit_log.postgres.up.sql | 163 | 0e2cbe2fc509b97f27803c04e723215c3944a7f84c043dd8f7cd7118c199a5dc |
| upstream/auth/files/migrations/20220811173540_add_sessions_table.up.sql | 1109 | 840c19639d972143bc3fc05a16e77da45c076edcba229c94b019a2db1f0eb192 |
| upstream/auth/files/migrations/20221003041349_add_mfa_schema.up.sql | 2825 | c8c52b388e13c77062d54036884b1e2e1716a6712ea1f1d0cdd07de5451cb605 |
| upstream/auth/files/migrations/20221003041400_add_aal_and_factor_id_to_sessions.up.sql | 263 | 3ed43e2a1392b28d4295265199265b2d9be22d005c597367db5613f95b304ab1 |
| upstream/auth/files/migrations/20221011041400_add_mfa_indexes.up.sql | 728 | 32ab5cd482674c98fd5926e7c0995fc216d2cc2b1ff77554b6c45b4bd758dd6f |
| upstream/auth/files/migrations/20221020193600_add_sessions_user_id_index.up.sql | 105 | 7b33e11e8092ea07d2f4e899558b46e0a5573f0c43a56532f1f640c2c7eb7802 |
| upstream/auth/files/migrations/20221021073300_add_refresh_tokens_session_id_revoked_index.up.sql | 139 | 63887b7bd3045561c4930575d4fa324fc9090630193989a9736dd84328d1ec55 |
| upstream/auth/files/migrations/20221021082433_add_saml.up.sql | 4474 | af0bbfdb64dd32f512712f45b44e0dce4e9af8ce7874e01c3a804f95eeb3a387 |
| upstream/auth/files/migrations/20221027105023_add_identities_user_id_idx.up.sql | 120 | 1e7c07b825b2ee8bdfe8fee06588525b97f3771efc6c365c7057c0f7abfbd30a |
| upstream/auth/files/migrations/20221114143122_add_session_not_after_column.up.sql | 304 | 7bf30a94308028f0c8140166e9a6f3d77356daa1147e5740a27cc983e39b854c |
| upstream/auth/files/migrations/20221114143410_remove_parent_foreign_key_refresh_tokens.up.sql | 111 | 5e804d7c82e0e6dca6f72e2350951e87714f6890fe63c2388dcbfa9aea687f2f |
| upstream/auth/files/migrations/20221125140132_backfill_email_identity.up.sql | 683 | 60cfea2750a2c79c0d69bb3a08edee0efb830c12212cac0ffdb5d44937c2839d |
| upstream/auth/files/migrations/20221208132122_backfill_email_last_sign_in_at.up.sql | 364 | c8487fa68eac6f0b4133f1a3fec950b3d8f9782a6c4be52e3b3155646b2a70bf |
| upstream/auth/files/migrations/20221215195500_modify_users_email_unique_index.up.sql | 1256 | 0a2cdcd4101a418ec7b482800327fc90238b498db01a657dbbeefdba8b8f3866 |
| upstream/auth/files/migrations/20221215195800_add_identities_email_column.up.sql | 943 | 3ddff50750549b790eecbeac2194966ca98354564f4fba537cda70d96b575d39 |
| upstream/auth/files/migrations/20221215195900_remove_sso_sessions.up.sql | 141 | f79ad2aaaa4f748836595a9ef10b3df0234e53032c339f0c74e3181271af1801 |
| upstream/auth/files/migrations/20230116124310_alter_phone_type.up.sql | 719 | 4f01441b120a5c06a1bd844fcdb77094ee428987418f4c3b68bcbd36b3e6d345 |
| upstream/auth/files/migrations/20230116124412_add_deleted_at.up.sql | 148 | 144a735e50373686e04d0cd3d46b997262162dda14965870342f65cd0b5a7845 |
| upstream/auth/files/migrations/20230131181311_backfill_invite_identities.up.sql | 622 | f88443609f6d15d3d1bff00e69a6c7a455fa331cb30747c8448d5e219729a2df |
| upstream/auth/files/migrations/20230322519590_add_flow_state_table.up.sql | 971 | cc19edd9bf9dc333381a5843c440a28cca3f492eba3ed77f0bc052df371d15f6 |
| upstream/auth/files/migrations/20230402418590_add_authentication_method_to_flow_state_table.up.sql | 399 | 8f10e836a25f85ccdac620c36f871effc84e7d6020bd38fd002ddd119847fd84 |
| upstream/auth/files/migrations/20230411005111_remove_duplicate_idx.up.sql | 79 | cc1b7b8a172693abafa64d0273240fa8181fdf5dde565e15b94adb38ec40c2e9 |
| upstream/auth/files/migrations/20230508135423_add_cleanup_indexes.up.sql | 566 | 89d4747491836d2bc33cc340029624d88ed9cf7e32574c3a9fbbe2431a27b5c8 |
| upstream/auth/files/migrations/20230523124323_add_mfa_challenge_cleanup_index.up.sql | 172 | af534c2184d12d00bef8fbd8b593f5a4c8b3297854bd205fb4e3bcdba9d6ca56 |
| upstream/auth/files/migrations/20230818113222_add_flow_state_to_relay_state.up.sql | 198 | cc6587385b84deba61c31e0749eb8064f9cdf5aa6db5239713fa31966de4f2dd |
| upstream/auth/files/migrations/20230914180801_add_mfa_factors_user_id_idx.up.sql | 109 | 844c575a40f9609987638bb29716deaaad3b9c1c1e8c399204d870018f867684 |
| upstream/auth/files/migrations/20231027141322_add_session_refresh_columns.up.sql | 213 | d4aa51107599c755003464121d4c0d99e617543bfee9a816fd76df0b399aafe0 |
| upstream/auth/files/migrations/20231114161723_add_sessions_tag.up.sql | 101 | e32711d98cd7c3f5920ca2a79df9c597433dac1b7e8b56df7b0becb96319d147 |
| upstream/auth/files/migrations/20231117164230_add_id_pkey_identities.up.sql | 1002 | 8822b2807b672d38b212618193efdb6fc2cf787e564a495940c1a8844155d7b0 |
| upstream/auth/files/migrations/20240115144230_remove_ip_address_from_saml_relay_state.up.sql | 317 | 9e104ca8b63695f6427ff057b5b7801ef7e4cc3baf32d4289e61b0015128d651 |
| upstream/auth/files/migrations/20240214120130_add_is_anonymous_column.up.sql | 273 | e36f403a8aad16ccbcc44e1d4198cf21451a906b45ceaedb74bfcd28e79caf21 |
| upstream/auth/files/migrations/20240306115329_add_issued_at_to_flow_state.up.sql | 138 | bf1f44b3cb07768436f31c74baabfd2f39c738609aff8b21cfa5a432abcc8a99 |
| upstream/auth/files/migrations/20240314092811_add_saml_name_id_format.up.sql | 130 | 282677b538df87612bef2780d25b08508980648e3e33e6a90f8602d35d4e96bf |
| upstream/auth/files/migrations/20240427152123_add_one_time_tokens_table.up.sql | 1683 | bfc4d6e779ce15c0e9170d1ab149b431108f2085a5aa4663d4288158348f3693 |
| upstream/auth/files/migrations/20240612123726_enable_rls_update_grants.up.sql | 3148 | 4339a09e7c90d7a46d2527097bc47c382300d72faaec901a8792319bd9a28f10 |
| upstream/auth/files/migrations/20240729123726_add_mfa_phone_config.up.sql | 498 | b273758317267b6b4d126489ba93550c8d0e0584e52c08b3cc101de6fe1b857c |
| upstream/auth/files/migrations/20240802193726_add_mfa_factors_column_last_challenged_at.up.sql | 134 | 0e5aa195cf80e377cdca00b4e01e2c82769c03dc9ffb487dce8891944bc014dd |
| upstream/auth/files/migrations/20240806073726_drop_uniqueness_constraint_on_phone.up.sql | 910 | 41b86596488620d17e513354fa9ffda041214d9014dc34e46f68d42019d1c2ee |
| upstream/auth/files/migrations/20241009103726_add_web_authn.up.sql | 345 | 4efc5df9a393ce28ef639f1523a1dbc018066daddca7fb58d2bf02214e532bd0 |
| upstream/auth/files/migrations/20250717082212_add_disabled_to_sso_providers.up.sql | 317 | 4b3b6073f80799f41370cbba6706a1ea8770803746f7662ee0f82e72740af4bb |
| upstream/auth/files/migrations/20250731150234_add_oauth_clients_table.up.sql | 1446 | 33651d28b6ea6aa1cd84b5d50cdf8181cfb9fb314b76670554bef58dbf69c168 |
| upstream/auth/files/migrations/20250804100000_add_oauth_authorizations_consents.up.sql | 4279 | 64b4730434c00864a069404a636bc2281c3920fab451517b138e6f6f056d986f |
| upstream/auth/files/migrations/20250901200500_add_oauth_client_type.up.sql | 702 | e986446884eb9b5b0f26dd667385a31da8291f8748a543669cd960c405835d1b |
| upstream/auth/files/migrations/20250903112500_remove_oauth_client_id_column.up.sql | 549 | fb2df11538de2c165560c3b6bdae3d4da543a3ac136f8a0e6dc4fbd56d223c30 |
| upstream/auth/files/migrations/20250904133000_add_oauth_client_id_to_session.up.sql | 567 | 3c4b49f787b54d4e09b48b4500226b59edc73e3f60826538e9e3552db9542faf |
| upstream/auth/files/migrations/20250925093508_add_last_webauthn_challenge_data.up.sql | 391 | 0d1df54678aadbd03777c82e3d9e4a917717d806e884a6c69f3c0206c1963017 |
| upstream/auth/files/migrations/20251007112900_add_session_refresh_token_columns.up.sql | 583 | 030486cbfbd1b3cc95f029eb45d33270c22706fe33249a04240dccffc656ce2e |
| upstream/auth/files/migrations/20251104100000_add_nonce_to_oauth_authorizations.up.sql | 341 | 830c36f9e0fd02a278e361be02fb1121ff472f3f3514f108b55ff3bc52ed122d |
| upstream/auth/files/migrations/20251111201300_add_scopes_to_sessions.up.sql | 509 | ed17a54ec423ca409b384e26805ec7e10b346a22573f5729f9580126b9715271 |
| upstream/auth/files/migrations/20251201000000_add_oauth_client_states_table.up.sql | 619 | c0d1ef106dfc6b6aaf7d2ef3a7f0f723fb5b416d3e7ca5c2bc2f69e998ec8547 |
| upstream/auth/files/migrations/20260115000000_add_flow_state_oauth_context.up.sql | 913 | d32bfb5fd5add82dbb72b8b4007aee6ba75950392399ea659cea295328e3d01d |
| upstream/auth/files/migrations/20260121000000_add_token_endpoint_auth_method.up.sql | 1008 | 835b50dd682d8f5ffdadedf178d4d77ddf2b03597743f7c07df48389bc61dacf |
| upstream/auth/files/migrations/20260219120000_add_custom_oauth_providers.up.sql | 5240 | 94deeedce0822faac2c6f36c00591da9c2b8ad9530ba7b51ad75c083e9c77deb |
| upstream/auth/files/migrations/20260302000000_add_passkeys.up.sql | 2201 | b86a89a447ea91d77fe452b3c0584783f533a0cb7e23f85e62fb1ea12c23031e |
| upstream/auth/files/migrations/20260625000000_add_custom_claims_allowlist.up.sql | 398 | 6fe5c9be092ce6d4c577d137b58b04d00dbbfa71462636d8d6f7b91b1ca440f2 |
| upstream/auth/files/migrations/20260821000000_add_scim_users.up.sql | 3036 | 306bd1e7fb017ff092c23892479aa5276159fddcaca2ec137412939e365efd35 |
| upstream/auth/files/migrations/20260821010000_add_scim_tokens.up.sql | 1838 | 26ba18f30879470c9a072dc17ffebb5fbfbc74c21fea04ceb59698467138d2ba |
| upstream/auth/files/migrations/20260824000000_add_recovery_codes_factor_type.up.sql | 191 | cb8614c41cfe831b22c3eb972b104f417e81fdab5972948cc06a2323fca8b77c |
| upstream/auth/files/migrations/20260824000001_add_recovery_codes_tables.up.sql | 1188 | 164b783002f178746e92eca36ec24a70cf3c70ea9553920b6a9869907f17f006 |
| upstream/auth/files/migrations/20260831180000_add_expires_at_to_one_time_tokens.up.sql | 151 | 36417f03a1b9496d1f7e365350c07809308305634f6b464aae0760e9e9ae7029 |
| upstream/auth/source.json | 118 | c86e42db0da92a2f6f4cb93ecdaec17b4554b31987ab34a4e48ce1e9178ad021 |
| upstream/auth/tree.json | 258908 | d06edc910a7eba80e56e839e6c41d06aa4053d48b2df022624e1ac44c842d3cc |
| upstream/docker-library-entrypoint.sh | 14040 | 1a6ff568c79cb847cffc4172b22a1f501cef05001b0b09751f48323683fb64a2 |
| upstream/files.json | 110999 | 3c607374763f130869f962a0bbc49b5df304ca76c0d97ab66803eff7b9ed2a50 |
| upstream/platform/files/docker/docker-compose.yml | 21304 | 46b00ea67dfa4bb0360ab0cd0eb8fdae914a6e77c2e75e1ab49f55ff6ae35c09 |
| upstream/platform/files/docker/volumes/api/kong-entrypoint.sh | 3752 | aacdadade6adde6284163ea79e0d88decce0276796ae4749a15f018d56eda933 |
| upstream/platform/files/docker/volumes/api/kong.yml | 14142 | c55d3f8064560188b12f2bdd0aa01ced36cd6cab3734b539c01604977b33ddc9 |
| upstream/platform/files/docker/volumes/db/_supabase.sql | 83 | 9dce462adc04137d6afabcf28efa60a6c355270a4b32d7af58891ac4eb964c5f |
| upstream/platform/files/docker/volumes/db/init/data.sql | 0 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| upstream/platform/files/docker/volumes/db/jwt.sql | 98 | c1d3f5c01e44646c2e533c5a1c111821cc49cb5a4c2534e08cddad61d8fb0339 |
| upstream/platform/files/docker/volumes/db/logs.sql | 144 | f0463ce5030907acef49326d2bffd36002df0718035071be7c99bd7fc897c63d |
| upstream/platform/files/docker/volumes/db/pooler.sql | 144 | df97ebe148d94cfb92a5e37ebf972dfd496be195f0915ecf14396b2cf50efecb |
| upstream/platform/files/docker/volumes/db/realtime.sql | 117 | 7e9e442e7fc4dae05544c07b67bede37a00d84644304dfce4d937134cb4c8f88 |
| upstream/platform/files/docker/volumes/db/roles.sql | 379 | 3ad717b225daa38aa982da26750f35641eb404e1eb5e69a763c22236ab96c1b2 |
| upstream/platform/files/docker/volumes/db/webhooks.sql | 9070 | 05a61316b899374253891cbba66ce073d9273f33983c3f47961eda3aa26c2823 |
| upstream/platform/source.json | 126 | 8eec7eedae45b29ca829fd381f0d1bbb371fe557e5b26144a5eaf920dc395607 |
| upstream/platform/tree.json | 9549821 | d14f94a6e239e4a7cd95b3d2885845d1782329ae5ce22a2890cdb9cd2cb59e6e |
| upstream/postgres/files/Dockerfile-17 | 8081 | 4eff99fc93e2c4957d2a866249602f28c3f270f4d9cf775e0be1659e0ba26ff3 |
| upstream/postgres/files/ansible/files/pgbouncer_config/pgbouncer_auth_schema.sql | 632 | 494270a846feefa9a9e1462496b1bb707e617341a12344cbe9f3d2e8d8a0aac8 |
| upstream/postgres/files/ansible/files/pgsodium_getkey_urandom.sh.j2 | 208 | 359296e6e9d3ceb2f110e10f4f7c43d878b3bf339b4cd67a6c1b9b02d2044e43 |
| upstream/postgres/files/ansible/files/postgresql_config/conf.d/auto_explain.conf | 36 | e935ea7f9e0ef48878eaff3ac261488b587a7079c11103b9cbab555e26dae2d0 |
| upstream/postgres/files/ansible/files/postgresql_config/conf.d/custom_overrides.conf | 0 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| upstream/postgres/files/ansible/files/postgresql_config/conf.d/generated_optimizations.conf | 0 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| upstream/postgres/files/ansible/files/postgresql_config/conf.d/pg_cron.conf | 32 | 273180cbdb9ee3e492b53fe939c073ba5810d92304fa98c9b834de275f5820a1 |
| upstream/postgres/files/ansible/files/postgresql_config/conf.d/pg_net.conf | 29 | 410e5fe9de7ac7d9522969991d1431a972fcb3e1c0e3fbd9e597ba38acc0d77b |
| upstream/postgres/files/ansible/files/postgresql_config/coredump-storage.conf | 106 | 69554c2c6aa5a21b580185be3f484e22f678cf7fc6f163bba2852c122c2dcfb5 |
| upstream/postgres/files/ansible/files/postgresql_config/coredump.conf | 29 | 1cc7a35b470bd61440a591198846319f80b8e7fec5d62fa932d426302cf5e5e9 |
| upstream/postgres/files/ansible/files/postgresql_config/custom_read_replica.conf | 218 | fc6032dc3b63baabde3ceaa31a3288d0b5e8dadfc09b9e623eb2daa57d395120 |
| upstream/postgres/files/ansible/files/postgresql_config/custom_walg.conf | 463 | b991d795d99f63c958c5ecabbbf70dcaac66a0ce34a07ef341dd4ba02590dc92 |
| upstream/postgres/files/ansible/files/postgresql_config/disable-coredumps-by-default.conf | 29 | 6ef1f024b21539b587bc9329c0339202e6132c82aaebab5892d50283b1e6002f |
| upstream/postgres/files/ansible/files/postgresql_config/pg_hba.conf.j2 | 4558 | a925911753f4975548eb4079177441c886aa22b6dd69f2b0cff98f779fb0b66a |
| upstream/postgres/files/ansible/files/postgresql_config/pg_ident.conf.j2 | 1883 | 479445a89591d0ed50a39d204f8bb4a6b87649bc7e46f62fe5d96cad5f674e96 |
| upstream/postgres/files/ansible/files/postgresql_config/postgresql-csvlog.conf | 1359 | feed4e5782e6813fc24a205448fa0214197e5cf7af82a9a447fd11bf44c1b96b |
| upstream/postgres/files/ansible/files/postgresql_config/postgresql-jsonlog.conf | 1487 | fb52436b002c8ee3520a8590c5d7e55b1e86866d39445d96d43d31b43ae9bca7 |
| upstream/postgres/files/ansible/files/postgresql_config/postgresql-stdout-log.conf | 159 | 13234da982ee3033d4141e860621cdff1035a18fd687f2725ef4d4e0f50ecf5a |
| upstream/postgres/files/ansible/files/postgresql_config/postgresql.conf.j2 | 28337 | b53df59195ccdb09cacfadb5b07c2ad2bbce18082f4e8a6916876c964eaee1f9 |
| upstream/postgres/files/ansible/files/postgresql_config/postgresql.service | 846 | 87068269c24a7379f9294d737b5e9900822def01037e7ae4135a0074e620a512 |
| upstream/postgres/files/ansible/files/postgresql_config/sbpostgres_apparmor | 6787 | d31f04ec4130a609c3530dca6766d222650c8a01d7df3f4957c77499c9d904dc |
| upstream/postgres/files/ansible/files/postgresql_config/supautils.conf.j2 | 5066 | 6a5907c52ef1502de6a3fc49e6282ae7b4fbd37c8a9286044ed4e5d53bacd3ce |
| upstream/postgres/files/ansible/files/postgresql_config/tmpfiles.postgresql.conf | 249 | 3dc45d63dfdd472dd833d9fac357bf55cf17b039b912ee4fb5f487a7eb850a0b |
| upstream/postgres/files/ansible/files/postgresql_config/tmpfiles.walg.conf | 92 | ce9ec98f037ff5ba96caed375ec3730b5646333bb767d5252e90d54e9af21d40 |
| upstream/postgres/files/ansible/files/postgresql_extension_custom_scripts/amcheck/after-create.sql | 620 | c45abb389389d2a8682959200064f64f2d701cf053a688e15a16c46ab6ebef9f |
| upstream/postgres/files/ansible/files/postgresql_extension_custom_scripts/before-create.sql | 3783 | 0af3a3f42de779deab4f2feb64fadcd84a5548fcd627d3045197647d9eb6deb6 |
| upstream/postgres/files/ansible/files/postgresql_extension_custom_scripts/dblink/after-create.sql | 573 | 7180651a06f3af3ab4ce683e1aaeb2f8dfeb008f51cde3b86bce632bec097ec1 |
| upstream/postgres/files/ansible/files/postgresql_extension_custom_scripts/pg_cron/after-create.sql | 745 | 6aa9560b9d7288c4689174edf5149b4c3a35afcdb4b0eb3bfd00af4b0521fbae |
| upstream/postgres/files/ansible/files/postgresql_extension_custom_scripts/pg_repack/after-create.sql | 247 | 76ef452c4c0e1b50dec6b62172f4f021282950b81a09082865cadf2669214a33 |
| upstream/postgres/files/ansible/files/postgresql_extension_custom_scripts/pg_tle/after-create.sql | 31 | b1a25ca2a5641a8283131b1b7b10f23ca19926801bd61ae92f978631c8dfec0c |
| upstream/postgres/files/ansible/files/postgresql_extension_custom_scripts/pgmq/after-create.sql | 5077 | 9c37e22f172310f099652d3bba09a26231461238b668d6521dc8ffd879335e2b |
| upstream/postgres/files/ansible/files/postgresql_extension_custom_scripts/pgsodium/after-create.sql | 752 | 978152f7a93d0eab0abf3cf654ed8b4d28a702352d2a60719ccf3475475cf651 |
| upstream/postgres/files/ansible/files/postgresql_extension_custom_scripts/pgsodium/before-create.sql | 204 | 4692a2a606b3ef378b91fb200bd62fa4cd39d66fb7184bb3ab641c0866faff87 |
| upstream/postgres/files/ansible/files/postgresql_extension_custom_scripts/postgis_tiger_geocoder/after-create.sql | 924 | ed9b18bc428c6996e021303352666237b0795ae903d898736daf74bc49c8358f |
| upstream/postgres/files/ansible/files/postgresql_extension_custom_scripts/postgres_fdw/after-create.sql | 80 | 85818625e2169c62be624f214fb480619c724df079ad29d038b7f02e3132ea9f |
| upstream/postgres/files/ansible/files/postgresql_extension_custom_scripts/supabase_vault/after-create.sql | 1067 | dc925bf6b92cbd9d8501d0476fc0c87a12bc0c1e43dd64e26bad67ef41f1133a |
| upstream/postgres/files/ansible/files/stat_extension.sql | 114 | a12e0eb4192d188e0dc5058e888ec981c1fd619d5542235d5b692ea0a1d751b2 |
| upstream/postgres/files/ansible/files/walg_helper_scripts/wal_change_ownership.sh | 1026 | a7617d76ab9a93233a5b3872b5a423228e21e7e5e0c8d5361e1f1eb8200e0fb1 |
| upstream/postgres/files/ansible/files/walg_helper_scripts/wal_fetch.sh | 386 | c95048769a3d88a91a36da1d654e37a9401408d2ca96f652fb0c1da5baaa5f2e |
| upstream/postgres/files/docker/pgctld/orioledb-postgresql.conf.tmpl | 10619 | 9430ae5564d66338da43a849f7e55a6dc14a622dd4ded541c663856e91a3268d |
| upstream/postgres/files/docker/pgctld/pgctld-wrapper.sh | 1528 | 8c456da7e349ef59bd87335a121a2d42ebb895ab8894ef6a6a3d0c3361d600f7 |
| upstream/postgres/files/docker/pgctld/postgresql.conf.tmpl | 10185 | 6f4c22fdc0cf047db9b7f9d70306b9ff7fbc02850e0e6726e0535db260e66093 |
| upstream/postgres/files/migrations/README.md | 5662 | 5f1b209913e9344b385837cfe76f9e50913bd38ff14f814f1eff2283b781d1af |
| upstream/postgres/files/migrations/db/init-scripts/00000000000000-initial-schema.sql | 2761 | 84588fff60ff3cadcd361c820fe502052f4c5fd5aa273740e0690c5ee59ec813 |
| upstream/postgres/files/migrations/db/init-scripts/00000000000001-auth-schema.sql | 4547 | 65a4a55ba3248716eb4946a8677be41c94bc90eafaa22c0eb95b09908f96fa4f |
| upstream/postgres/files/migrations/db/init-scripts/00000000000002-storage-schema.sql | 912 | 1071677a0f0a57e35dc7cb62aeae4fd5417b2e9b7e58be5fd212749dff357f02 |
| upstream/postgres/files/migrations/db/init-scripts/00000000000003-post-setup.sql | 4782 | f38552008ac577b3e65fbcab784a612b72d079f6695871c84b045a1a921f7096 |
| upstream/postgres/files/migrations/db/init-scripts/README.md | 323 | 9f9d3306727cca8561912551bc98d78042e0dae2c74f89601e113317cbb87522 |
| upstream/postgres/files/migrations/db/migrate.sh | 2941 | eb6a57848a73dfbc3b8e40edbadcc7a933f1099ac62cef8c138a18115655b745 |
| upstream/postgres/files/migrations/db/migrations/10000000000000_demote-postgres.sql | 930 | 581edb76cba2aaf848585be462d07bff7182aa6c638f9365f08dd0c1fb1142ab |
| upstream/postgres/files/migrations/db/migrations/20211115181400_update-auth-permissions.sql | 1249 | bbaa44bc707538e6c67ae8c71a386c41e136cd30fcde563db39c9d0fbde9bdcb |
| upstream/postgres/files/migrations/db/migrations/20211118015519_create-realtime-schema.sql | 122 | 1d6cd4858a0fa50bf910bfd6c11a3436941a5fecdc4bdc02b9b067e8e0b7f566 |
| upstream/postgres/files/migrations/db/migrations/20211122051245_update-realtime-permissions.sql | 335 | 9fd431e8f1a3fc0f2e1e427d4f526562c1fe8627e12302974215373885b5254b |
| upstream/postgres/files/migrations/db/migrations/20211124212715_update-auth-owner.sql | 701 | 9698f481ad9cb159df6cefd5cc4b94f4b9db0eda475317aaa057b1e9a54409e0 |
| upstream/postgres/files/migrations/db/migrations/20211130151719_update-realtime-permissions.sql | 426 | 6b5d190c93b35a2f804703ed7872946b51fded3272bed0ef9a6585187b0dc2b4 |
| upstream/postgres/files/migrations/db/migrations/20220118070449_enable-safeupdate-postgrest.sql | 102 | 2bffffbf1e5a677ef8c8cbba9afc5a66bc77113ee9b2e2b4d2a56629a381cea4 |
| upstream/postgres/files/migrations/db/migrations/20220126121436_finer-postgrest-triggers.sql | 1897 | 85dc26173d7254490d0c20389bc7e3ac7f7752b872c99bb714167cb01b231312 |
| upstream/postgres/files/migrations/db/migrations/20220224211803_fix-postgrest-supautils.sql | 393 | 744ed5c5ae1527c6c73ad4214c11d903eafdc5803eb69183b3b3325b7a65c5bc |
| upstream/postgres/files/migrations/db/migrations/20220317095840_pg_graphql.sql | 5613 | 31f5b997cba8d74936203a78613b5bda9b51e339c6c14f80c203440f82e95cf9 |
| upstream/postgres/files/migrations/db/migrations/20220321174452_fix-postgrest-alter-type-event-trigger.sql | 1911 | 674bfe11a9cb828c55ca7c9e00d4f4edcbcb0003d956d8866c9563810e7f0f0e |
| upstream/postgres/files/migrations/db/migrations/20220322085208_gotrue-session-limit.sql | 112 | ab2f834addee3115c96edddda927ef9f5d8641c3939d2be82b8ce1e890cf4921 |
| upstream/postgres/files/migrations/db/migrations/20220404205710_pg_graphql-on-by-default.sql | 4993 | 02ef3e3e6c03032a6ccb828ef1e1b297d9b34ad1947a673756c3c95dd86a01d1 |
| upstream/postgres/files/migrations/db/migrations/20220609081115_grant-supabase-auth-admin-and-supabase-storage-admin-to-postgres.sql | 403 | ff540703d411416925a21553bead344a9cebdec4cb0e53fb93f99973874f1e59 |
| upstream/postgres/files/migrations/db/migrations/20220613123923_pg_graphql-pg-dump-perms.sql | 2712 | ab244687d0123859d9d9c6a79b34897e8cdd8f1698bdccd1bef7f7e0ced82334 |
| upstream/postgres/files/migrations/db/migrations/20220713082019_pg_cron-pg_net-temp-perms-fix.sql | 2993 | 143d6e664f2f508f76964fbaaa018c6ee262464c8c7a881201ae56e025787c94 |
| upstream/postgres/files/migrations/db/migrations/20221028101028_set_authenticator_timeout.sql | 87 | 393dd66aee71a99d3956c6c6655e3c010afe9bd3f9a819b03746850ba70f9680 |
| upstream/postgres/files/migrations/db/migrations/20221103090837_revoke_admin.sql | 74 | 8fff945cd6f11ab68b2f300c64d43a38ef69d61987aaf596a1d00bfa225234e8 |
| upstream/postgres/files/migrations/db/migrations/20221207154255_create_pgsodium_and_vault.sql | 1996 | cb8877c69b6913153776b865093e85768053daed283dec6835fdac728978d76c |
| upstream/postgres/files/migrations/db/migrations/20230201083204_grant_auth_roles_to_postgres.sql | 85 | b06d2bdfe4d60e9e2183c2296511a4b83d97cebb71cb2d714cd863081990857e |
| upstream/postgres/files/migrations/db/migrations/20230224042246_grant_extensions_perms_for_postgres.sql | 594 | 9e1e777fb8317dcccdb88ead19201a5670c890fa69dfc51c8d7b369229c3ca8d |
| upstream/postgres/files/migrations/db/migrations/20230306081037_grant_pg_monitor_to_postgres.sql | 62 | 5d80fb49faaf96712ecb23896a36a03122ca352b5046ab8480fee914a054cdec |
| upstream/postgres/files/migrations/db/migrations/20230327032006_grant_auth_roles_to_supabase_storage_admin.sql | 98 | 9f8985b3676ff2c3709b3193736e17fcfd20264953eba7dcbc94056ea26bac0e |
| upstream/postgres/files/migrations/db/migrations/20230529180330_alter_api_roles_for_inherit.sql | 279 | e78a67f8e6ae847765a80898824d404ab370daa3d6f6dbf61ea6d9e0a69144f3 |
| upstream/postgres/files/migrations/db/migrations/20231013070755_grant_authenticator_to_supabase_storage_admin.sql | 148 | 48d9feb2734125f79eb67bd0522fee9ad3916888172c7023a84241260687620f |
| upstream/postgres/files/migrations/db/migrations/20231017062225_grant_pg_graphql_permissions_for_custom_roles.sql | 2967 | 1833af7170c97bc444cfe9f823be73d3ff3f9b18e47c2ee1181ff33a1fbbb673 |
| upstream/postgres/files/migrations/db/migrations/20231020085357_revoke_writes_on_cron_job_from_postgres.sql | 1781 | 6c37208218a84c3ab40e5e0369b86d31a6ddc56fbfe95c03800776b3fa9ce4b7 |
| upstream/postgres/files/migrations/db/migrations/20231130133139_set_lock_timeout_to_authenticator_role.sql | 82 | 5d2cc80fdb26cbda32d8398bf8486cccc4e2f6b911b5719f146d0167551f6a00 |
| upstream/postgres/files/migrations/db/migrations/20240124080435_alter_lo_export_lo_import_owner.sql | 231 | 1060763d9f69d39c5027c632aa634b3b8d9d021dd7150f6efdbe1d9d7679e655 |
| upstream/postgres/files/migrations/db/migrations/20240606060239_grant_predefined_roles_to_postgres.sql | 86 | 11b87064890ffe3f3d14336b712c310966d09458c5eef7203e7251cc9156f59e |
| upstream/postgres/files/migrations/db/migrations/20241031003909_create_orioledb.sql | 300 | 119405b66ee3c57cb81849e0cb20423ca059d9f54a4ef8607313ff4db48c8082 |
| upstream/postgres/files/migrations/db/migrations/20241215003910_backfill_pgmq_metadata.sql | 2746 | 4220830feda72a98a2ec804a6ef9250507ca22cd4ccf4f17a0036c4d771e6adf |
| upstream/postgres/files/migrations/db/migrations/20250205060043_disable_log_statement_on_internal_roles.sql | 200 | 720d2ecb3ae5d43eb8d0e071fa489dec472d54ff27e4fa46f8d17c8070cbb13f |
| upstream/postgres/files/migrations/db/migrations/20250205144616_move_orioledb_to_extensions_schema.sql | 690 | 9ea55607791aa8c8b55982cee9f006129149e3f4e10bd320bfedcbeb945e5230 |
| upstream/postgres/files/migrations/db/migrations/20250218031949_pgsodium_mask_role.sql | 683 | 24cf783d3c039d90a67225eef1fbfe688fda8b3fd88610bea59abc6590db3382 |
| upstream/postgres/files/migrations/db/migrations/20250220051611_pg_net_perms_fix.sql | 3133 | 7e700959a7583b857a5738c71777682e509f4414272390f20ac5d86f999ae6c1 |
| upstream/postgres/files/migrations/db/migrations/20250312095419_pgbouncer_ownership.sql | 164 | fd95765def92461de68b550eb65587babd9944cee142cac0bec4df3c277adec8 |
| upstream/postgres/files/migrations/db/migrations/20250402065937_alter_internal_event_triggers_owner_to_supabase_admin.sql | 302 | 1197d727fb7a8ddf8a61c992ff5698d81a5e908e677cc3a4d835b079aeacb8f1 |
| upstream/postgres/files/migrations/db/migrations/20250402093753_grant_subscription_to_postgres_16_and_above.sql | 247 | 8232eb5b1d0d9e0e45dd58d18083f3dd03f0bd792cfa16ee0ec5e05ae2cb2a97 |
| upstream/postgres/files/migrations/db/migrations/20250417190610_update_pgbouncer_get_auth.sql | 630 | c7a26bdcb8b48941bbe5ead7c347a06b9261f7a461abeeea0bfe129f20625745 |
| upstream/postgres/files/migrations/db/migrations/20250421084701_revoke_admin_roles_from_postgres.sql | 794 | 77679a5c54d2baccc445d79d3b66429181d37937c1c05627742d205e580441f6 |
| upstream/postgres/files/migrations/db/migrations/20250605172253_grant_with_admin_to_postgres_16_and_above.sql | 340 | 1daa645828b02f85325a563c6a0b3d81e15e729fa3de442c8cdf9e43c174acf8 |
| upstream/postgres/files/migrations/db/migrations/20250623125453_tmp_grant_storage_tables_to_postgres_with_grant_option.sql | 559 | 1289f81f7111147fc334fa44ec00c31c871f5ba325c16cc205646ff07507cf04 |
| upstream/postgres/files/migrations/db/migrations/20250709135250_grant_storage_schema_to_postgres_with_grant_option.sql | 196 | b0b7091cb8bddfb3c9c6794f3b2a70ecf3b51b1827d79bdbc4f34d4331937641 |
| upstream/postgres/files/migrations/db/migrations/20250710151649_supabase_read_only_user_default_transaction_read_only.sql | 106 | 7d2d0e770b5198f5bbc571210a1afaf03ed6421d3cfeee85c694832f2582dc19 |
| upstream/postgres/files/migrations/db/migrations/20251001204436_predefined_role_grants.sql | 331 | 46b35cd58c43d73d58242a3dfeb8a8c31b0a4981a7a609b043361dd304cfe886 |
| upstream/postgres/files/migrations/db/migrations/20251105172723_grant_pg_reload_conf_to_postgres.sql | 117 | d46bb05f79fc895f0a50b8a42e8507136c367bb67c03d7080ae7fd21680abc38 |
| upstream/postgres/files/migrations/db/migrations/20251121132723_correct_search_path_pgbouncer.sql | 707 | 27293b64d94e42e3d4f2410c914c38a059f9df7bc5e287cf76c055e3bf822119 |
| upstream/postgres/files/migrations/db/migrations/20260211120934_supabase_privileged_role.sql | 258 | ebbb7a055ecf767568d6e9035f32f93397922e43ecabd0c588593ec3f8c5974f |
| upstream/postgres/files/migrations/db/migrations/20260413000000_fix-authenticator-session-preload-libraries.sql | 339 | eee2f692ec9b1b9fea425b616761d5f6369b9c70148e58eaa186d3638d6efcbe |
| upstream/postgres/files/migrations/db/migrations/20260421000000_pg_graphql-off-by-default.sql | 68 | 17e120888bec3a4131959e39012c2a68b0eb0206805f4aa624cca8d9b6c1fb0b |
| upstream/postgres/files/migrations/db/migrations/20260421000001_rescope_pg_graphql_access_trigger.sql | 1726 | c9c3986d040d8f2545c5faf97ce57804408bf2465105cb8c7c6a6dcea8ec6535 |
| upstream/postgres/files/migrations/db/migrations/20260730000000_revoke_trigger_on_cron_tables_from_postgres.sql | 2164 | 22422fd6d7ef1ef888b3c89adb15cc895989ad482a2ce21b7113675066dca71b |
| upstream/postgres/files/migrations/schema-17.sql | 21380 | 1ad2a3687cc7bc41bae14fc807a7d09dc23e5cfb5331941a18269b402b318692 |
| upstream/postgres/files/nix/packages/cli-config/pg_hba.conf.template | 417 | 9afe34714ea1ae33eb5c1c93c6fb2e5066eeacc60b12c2aab803e37ba5eb53e3 |
| upstream/postgres/files/nix/packages/cli-config/pg_ident.conf.template | 91 | 95e7e75eca99aaea5fb14d1646e6a652f3ee717e44f6b0cb6d6f75c73e01927d |
| upstream/postgres/files/nix/packages/cli-config/pgsodium_getkey.sh | 314 | d10b8448bc6848a7169fbaf3b30875e41db37a2141245a3d67b00ca1f2cb08fb |
| upstream/postgres/files/nix/packages/cli-config/postgresql.conf.template | 1328 | 9a0db69d4591757f74a7aadf95429216c8fb43bda6e9441cd752d7e7b4864358 |
| upstream/postgres/files/nix/packages/cli-config/supabase-postgres-init.sh | 4938 | 8dc30e07d8bc00220548583e649fd9bfc31ea314e66fbb9ec6980180cee601c0 |
| upstream/postgres/source.json | 126 | b558c36007bcfdd598060af0e6d95b1f2611c826688bd410a76c4d9fd1448c23 |
| upstream/postgres/tree.json | 463440 | c4a50ee884d4d5e960ff6262974f65a32b4df66c13c7a2d10d5ee635d09eee51 |
| validate.mjs | 8386 | f6b587925acd5840bb038a96b6834da8d8c1dcd85453a6e6c2508e3dac9ec70c |
| verify.sql | 6016 | 0dd48985161dac26f92f91aa8f276ff41a44710a14a471bd10ee384a6d8f0cd4 |


<!-- /ARTIFACT_TABLE -->

**STOP: no Docker resource creation or startup. No implementation. Await explicit owner instruction only after the documented preparation blockers are resolved and a revised package is reviewable.**
