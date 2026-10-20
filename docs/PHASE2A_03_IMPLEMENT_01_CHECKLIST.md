# MPIA — Phase 2A-03 IMPLEMENT-01 checklist

20 October 2026, Asia/Kuala_Lumpur. **GO for owner review/acceptance of dormant I01–I04. Runtime exposure/deployment: NO-GO.**

- [x] Branch `phase2-location-intelligence`, HEAD `e000da794e44619f945597e83b004895e3854a71`; index and tracked tree unchanged.
- [x] Entry snapshot of 366 files; zero changed/missing preexisting files, including all five DESIGN-01 documents and checkpoint report.
- [x] I01 strict primitives, Unicode/UTC/bigint rules and typed sanitized error/retry outcomes.
- [x] I02 provider-neutral geocode/Places/routing/map ports; provenance/rights/quality; strict command/payload combinations and negative type fixtures.
- [x] Test-only geocoder fake makes zero network calls; remaining provider ports remain stubs.
- [x] I03 original v1 golden bytes/digests, Unicode/number behavior, 17-field order and separate property/operation identity; no historical test/serializer edits.
- [x] Retry comparison retains operation ID, actor, original expected tokens, receipt time and payload; no retry scheduler or writer.
- [x] I04 deterministic current/historical read rules; explicit absent versus inert state; no old/new pin fallback, no clock/I/O/mutation.
- [x] New tests: 106 primitive, 81 contract/provider, 24 canonical, 38 eligibility = 249 passing cases.
- [x] Full Vitest: 1,322 pass / 0 fail / 0 skip, 37 files; all 1,073 existing cases preserved.
- [x] Frozen P01–P10: 53 pass, exact retained name/outcome parity; legacy serializer: five pass.
- [x] Six strict TypeScript projects pass; intermediate new-fixture failures disclosed and corrected.
- [x] Source security: five pass / one initial skip; rebuilt-browser scan: six pass / zero skip.
- [x] Production build passes using unchanged configuration; nonfatal bundler warnings documented.
- [x] Six-module AST import boundary and 33 built JS files reviewed; no external/server/admin/SDK imports or application consumers.
- [x] Protected Phase 1 and original five migrations match release; all preexisting files and Git index preserved.
- [x] Inventory: 16 created, zero modified, zero deleted; source/test SHA-256 in report, report/checklist SHA-256 in JSON.
- [x] Separate executed commands, counts, exit codes, environment, failures, limitations and pre/post Git status recorded in [report](PHASE2A_03_IMPLEMENT_01_REPORT.md) and [results](phase2a03-implement01-results.json).
- [x] No stage/commit/push, database/production access, provider call, migration/config change or deployment.
- [ ] Owner independently reviews and explicitly accepts IMPLEMENT-01.
- [ ] Later authorization for IMPLEMENT-02/03; no next slice started.
- [ ] Deferred real Auth/SQL/driver/COMMIT/rights/receipt/transport/platform/clean-install/T15 gates before runtime exposure.

These last open items are later acceptance/runtime gates, not claimed passes of this pure slice. Historical database evidence is retained only; no old result-generating runner was invoked. See the report for exact hashes, tests and qualifications.
