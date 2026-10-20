# MPIA — Phase 2A-03 foundation final acceptance checklist

20 October 2026, Asia/Kuala_Lumpur. See [report](PHASE2A_03_FOUNDATION_FINAL_ACCEPTANCE_REPORT.md) and [JSON evidence](phase2a03-foundation-final-verification.json). Checked means the scoped audit action completed, not that every boundary passed.

- [x] Exact branch/HEAD/parent, separate GitHub main and matching remote feature HEAD checked read-only.
- [x] Empty initial index/tracked diff; 33 initial untracked paths reconciled as 1 + 5 + 16 + 11.
- [x] Rules, freezes, Phase 2A-02 checkpoint/acceptance, five design documents and both implementation evidence sets reviewed.
- [x] Actual ten source modules, eight test/helper files and three type-fixture/config paths reviewed.
- [x] 393 entry files and accepted manifest hashes preserved; no historical evidence overwritten.
- [x] Five original and two Phase 2 migrations, generated types and 22 protected source/configuration paths unchanged.
- [x] Prior 67-path checkpoint reconciled to 65 surviving files and two historical relocation deletions.
- [x] v1 bytes/hashes, seven input fields, 17 semantic fields, immutable identity, null/empty/Unicode/number behavior verified.
- [x] SQL statements/INSERT bindings/CAS compared with actual accepted migrations and trigger definitions.
- [x] Trusted injection, owner/input/replay precedence, version limits, COMMIT certainty and diagnostics reviewed.
- [x] Standard application suite: 1,452 pass / 0 fail / 0 skip; I01–I04 subset 249; I05 subset 130 (110 transaction, 20 diagnostics).
- [x] Legacy serializer: five pass; frozen P01–P10: 53 pass with retained name/outcome parity. Counts overlap.
- [x] All seven strict TypeScript projects and production build pass, exit 0.
- [x] Source security five pass / one expected browser skip; rebuilt-browser security six pass / zero skip, exit 0.
- [x] 132-file AST graph: 44 confined edges, zero outside consumers/dependencies or forbidden calls in location modules.
- [x] 33 rebuilt browser JS files have no selected location/SQL markers; bounded credential checks pass.
- [x] Separate audit probe exposes F01: active-object rejection discards another invocation's connection. One fail / one pass, exit 1; failure retained.
- [x] Fake CAS predicate omission and real driver command-count/timestamp/COMMIT mapping limitations disclosed.
- [x] Exact 36-path candidate manifest, rationale, action and 35 embedded raw hashes supplied; JSON self-hash externally anchored at delivery.
- [x] Only three nonignored audit artifacts added; index, accepted source/tests and tracked files unchanged.
- [x] No database connection, I06, migration, driver/credential provisioning, Docker/Lovable/config edit, stage, commit, push or deploy.
- [ ] A — Entire I01–I05 consolidated acceptance: **NO-GO** pending F01 correction/re-audit. I01–I04 remain GO for dormant development.
- [ ] B — Accepted-foundation development checkpoint at these bytes: **NO-GO** pending F01 and independent review; no staging authorized.
- [ ] C — I06 execution/activation: **NO-GO** pending F01, P05/P06 and real runtime/driver/Auth qualification.
- [ ] D — Production release: **NO-GO**; runtime/security/provider/transport/clean-install/platform/T15/release prerequisites open.
- [ ] Correct/review reservation ownership cleanup and add concurrent active-object regression in a separately authorized source task.
- [ ] Approve credential authority, common Auth/SQL target and exact driver/host/packaging/TLS/pool behavior before I06 activation.
- [ ] Demonstrate actual PostgreSQL locking/CAS/rollback/deferred-COMMIT/replay and real two-user authenticated security.
- [ ] Complete provider rights/receipts/reconciliation/transport, all eight T15 cases and production operational gates in their designated scopes.

Stop after audit and these three artifacts. Await independent review and separate Git checkpoint authorization. No fix is silently included.
