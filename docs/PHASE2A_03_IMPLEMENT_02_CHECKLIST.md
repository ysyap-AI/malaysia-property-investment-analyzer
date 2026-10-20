# MPIA — Phase 2A-03 IMPLEMENT-02 checklist

20 October 2026, Asia/Kuala_Lumpur. **GO for independent acceptance of dormant I05 only. Runtime activation: NO-GO.**

- [x] Exact branch/HEAD verified; tracked tree and index remain unchanged.
- [x] All prior untracked paths reconcile with IMPLEMENT-01; its 381 manifest hashes plus external JSON digest verified.
- [x] All 382 entry files preserved; no preexisting source/evidence edits or deletions.
- [x] Required rules, freezes, five DESIGN-01 documents, IMPLEMENT-01 evidence, migration, synthetic writer/tests and pure contracts inspected.
- [x] Actor comes only from an injected trusted verifier; server command construction is separately injected. Synthetic test identities are labeled.
- [x] Frozen identity, expected tokens, actor, v1 payload/receipt and accepted canonical operation hash precede acquisition.
- [x] One reserved connection, explicit READ COMMITTED, fixed local role/path/timeouts, parent-before-state lock order.
- [x] Current owner/input precede replay; ABSENT differs from existing revision-zero state; exact pointer/revision checked.
- [x] Duplicate returns immutable prior version and current observation without append/repoint/restamp.
- [x] Safe bounded version allocation, immutable INSERT, pointer+revision CAS and RETURNING validation.
- [x] Authoritative success only after COMMITTED acknowledgement; known rejection/ROLLBACK tag differ from unknown COMMIT.
- [x] Cancellation/late acquisition/rollback/release/discard failures bounded; uncertain clients quarantined. No automatic retry.
- [x] Sanitized closed diagnostics, nested/aggregate/proxy/accessor errors and sync/async sink failures tested.
- [x] 110 transaction + 20 diagnostic tests pass (130 total); early new-test/type issues disclosed and corrected.
- [x] IMPLEMENT-01 249 cases; full Vitest 1,452 cases/39 files; frozen 53 exact-name/outcome parity; five legacy serializer cases pass.
- [x] Seven strict TypeScript projects, source security and production build pass. Rebuilt-browser security: 6 pass, 0 skip.
- [x] Four-module import review: no external/admin/driver import or incoming app dependency; 33 browser JS files have no core markers.
- [x] Eight implementation/test/config files plus three outcome artifacts inventoried and hashed.
- [x] No database operation, migration execution, actual Auth/provider call, Git write action or deployment. No I06 work.
- [ ] Independent owner acceptance of I05.
- [ ] Separately authorize/qualify real driver/Auth/PostgreSQL, credentials/target, cancellation/pool/COMMIT behavior in I06.
- [ ] Complete provider/receipt/transport/platform/clean-install/T15 gates before runtime exposure.

See [report](PHASE2A_03_IMPLEMENT_02_REPORT.md) and [results](phase2a03-implement02-results.json). Open items are later gates; no mock closes them.
