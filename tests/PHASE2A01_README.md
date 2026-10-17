# Foundation database tests

These tests never accept a remote URL or Supabase project ID. They use Docker
`desktop-linux` and the verified local Unix socket of
`supabase_db_mpia-phase2a01-implementation`. The image, dedicated data volume,
local Docker endpoint, database identity, starting user/table counts, and prior
evidence are checked before test mutations. They do not read repository `.env`
or linked-project metadata. See the implementation report for setup provenance.

On the retained, installed, empty test target:

```text
node tests/run-phase2a01-database-audit.mjs --verify-installed
node tests/verify-phase2a01-schema.mjs
npx --no-install tsc -p tests/database-types/tsconfig.phase2a01.json
```

The first command runs synthetic fixtures inside a rollback transaction. The
second performs read-only catalog comparisons with specification 1.1 and the
owner-supplied external schema snapshot. The type check includes the unchanged
Phase 1 checks. TypeScript represents CHECK-constrained text as `string`; it
does not replace database validation, RLS or privileges.

The no-argument database runner requires a newly initialized, empty application
database with the exact separate container/volume identity. It performs clean
installation/rollback, populated upgrade, fault injection, exhaustive contract
and role checks, a two-connection race, fixture cleanup, a scoped post-install
rollback, and reinstall. It intentionally refuses an existing application
schema. Do not reset any existing volume to satisfy this prerequisite.

`--resume-behavior` and `--resume-concurrency` are recovery options for this
runner's failed synthetic upgrade run only. They require the previous failed
report, identical container/volume/migration hashes, exact seven-table snapshot,
and expected synthetic user/table counts. They do not adopt an unknown database.
The final report records the harness issues that required these options during
initial development.

The fixed fixture mapping is independent of the SQL migration. It inserts all
61 valid contracts and rejects each incompatible component and NULL; it then
disables only the new fact guard inside the rollback transaction to exercise
the declarative CHECK independently. Provider arrays/review/retention, immutable
history, context labels, freshness bounds, API-role SQL operations, grants,
ownership, cascades, and revisions are exercised as actual database operations.

The original Phase 1 harness is run unchanged from an audited file export with
exactly five migrations. Never run its wrapper from the six-migration working
tree or weaken its assertions. Its recorded results and the new target's results
are separate files under `docs/phase2a01-*`.

No test here establishes real-handler session/actor authorization, geographic
fact-result correctness, provider terms, scoring, interactive browser behavior,
or production deployment readiness. Those unexecuted/deferred cases are listed
explicitly in the implementation report.
