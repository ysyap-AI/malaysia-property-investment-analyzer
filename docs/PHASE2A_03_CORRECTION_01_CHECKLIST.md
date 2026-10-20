# MPIA — Phase 2A-03 CORRECTION-01 checklist

20 October 2026, Asia/Kuala_Lumpur. GO for independent review of corrected dormant I05; owner acceptance pending. See [report](PHASE2A_03_CORRECTION_01_REPORT.md) and [results](phase2a03-correction01-results.json).

- [x] Expected branch/HEAD; 360 tracked + 36 untracked entry paths reconciled; empty tracked/index diffs and identical index entries.
- [x] 396 entry files hashed before editing; accepted IMPLEMENT and FINAL-AUDIT hashes reconciled.
- [x] Rules/freezes, five design documents, both implementation evidence sets, final audit, actual source/ports/fake/tests inspected.
- [x] Original portable reproduction/config unchanged and hashes verified before source edit.
- [x] Baseline F01 reproduced exactly: acquire/discard, one failed probe, exit 1; failure preserved.
- [x] Unique invocation token and atomic ownership claim; foreign aliases reject before obtaining lifecycle authority.
- [x] Owner-only rollback/release/discard and conditional claim removal, including late acquisition and asynchronous cleanup.
- [x] Claims retained through acknowledged/bounded cleanup; permanent quarantine blocks unsafe object reuse after exceptions/timeouts.
- [x] Original repaired two-probe run passed before fake correction; unchanged final F01 passes.
- [x] Original final G01 observation's expected failure retained/disclosed: old rowCount 1 assertion now receives correct zero.
- [x] Fake CAS validates property binding; new zero-row/no-mutation negative and correct-order positive case pass; production SQL unchanged.
- [x] 20 deterministic new regressions pass; no arbitrary sleeps; all 130 previous protocol/redaction cases retained.
- [x] Pending COMMIT never yields early success; UNKNOWN/REJECTED/ROLLED_BACK/COMMITTED certainty, rollback and cleanup regressions pass.
- [x] Full application 1,472/0/0; protocol subset 150/0/0 (130 transaction, 20 redaction).
- [x] I01–I04 249/0/0; frozen P01–P10 53/0/0; five accepted serializer cases pass.
- [x] Exact prior/current full case-name/status comparison: zero removed or changed prior successful outcomes.
- [x] All seven strict TypeScript projects pass; production build and three-file formatting check pass.
- [x] Source security 5 pass/1 expected browser skip; rebuilt-browser security 6 pass/0 skip.
- [x] 132-file AST boundary audit: 44 confined edges; no outside consumers/dependencies/selected forbidden calls; 33 browser JS files without selected markers.
- [x] Phase 1 protected paths, seven migrations, generated types, all I01–I04 files, design/accepted evidence, ports/auth/routes/build configuration preserved.
- [x] Exactly three authorized source/test files modified, three correction artifacts created, 393 other entry files unchanged; no deletions/unexpected paths.
- [x] Before/after SHA-256, exact baseline/final inventories, commands/times/outcomes/failures/limitations recorded in JSON.
- [x] Historical FINAL-AUDIT-01 reports/JSON and scratch failure evidence preserved.
- [x] No database, driver/credential provisioning, I06, endpoint, migration, Git write operation or deployment; local/uncommitted.
- [ ] Independent owner review and explicit corrected-I05 acceptance.
- [ ] Separately authorized Git checkpoint, if desired; none performed here.
- [ ] I06 real driver/Auth/target/credential/physical pool/PostgreSQL concurrency qualification.
- [ ] Provider/receipt/transport/reconciliation, clean installation/platform/T15/operational release gates before production.

Open items are future owner/runtime/release gates, not uncompleted authorized correction work. Stop for independent owner review.
