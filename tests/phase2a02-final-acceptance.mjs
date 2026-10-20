// Final acceptance only: existing pinned target; read-only catalogs and rolled-back
// temporary spatial/attachment fixtures. Never installs or reapplies a migration.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { RunSessions, errorDetails } from './phase2a02-transaction-runtime.mjs';
import { preservationSnapshot, fixtureCounts, canonical } from './phase2a02-transaction-qualification.mjs';
import { verifyTarget } from './phase2a02-local-target.mjs';

const dir = '.phase2a02-implementation.local/final-acceptance';
mkdirSync(dir, { recursive: true });
const sha = x => createHash('sha256').update(x).digest('hex');
const json = p => JSON.parse(readFileSync(p, 'utf8'));
const git = args => execFileSync('git', args, { encoding: 'utf8' }).trim();
const migration = 'supabase/migrations/20261017000000_phase2a02_property_locations.sql';
const source = readFileSync(migration, 'utf8');
const mode = process.argv[2];
assert.ok(['--offline', '--database'].includes(mode));
const report = { task: 'FINAL-ACCEPTANCE-01', mode, startedAt: new Date().toISOString(), status: 'RUNNING' };
const output = `${dir}/${mode.slice(2)}.json`;
const save = () => writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
save();
assert.equal(git(['branch', '--show-current']), 'phase2-location-intelligence');
assert.equal(git(['rev-parse', 'HEAD']), 'c9b6c4acc1879a2b84b89d3b39455f2489e4c56a');
assert.equal(git(['diff', '--cached', '--binary']), '');
const safety = json('docs/phase2a02-harness-safety-results.json');
assert.equal(safety.status, 'PASS');
for (const [path, hash] of Object.entries(safety.sourceHashes)) assert.equal(sha(readFileSync(path)), hash, path);
report.retainedSafetyHashes = 'PASS';

if (mode === '--offline') {
 try {
  report.checks = [];
  const commands = [
   ['application', ['node_modules/vitest/vitest.mjs', 'run', '--reporter=json', `--outputFile=${dir}/application.json`]],
   ['typescript-app', ['node_modules/typescript/bin/tsc', '--noEmit']],
   ...['tests/fixtures/tsconfig.json', 'tests/database-types/tsconfig.json', 'tests/database-types/tsconfig.phase2a01.json', 'tests/database-types/tsconfig.phase2a02.json']
    .map(p => [p, ['node_modules/typescript/bin/tsc', '-p', p, '--noEmit']]),
   ['44-type-contracts', ['node_modules/typescript/bin/tsc', '--noEmit', '--strict', '--skipLibCheck', '--target', 'es2022', '--moduleResolution', 'bundler', '--module', 'esnext', '.phase2a02-implementation.local/type-parity.ts']],
   ['serializer', ['--test', 'tests/phase2a02-contract.test.mjs']],
   ['security', ['--test', 'tests/security.test.mjs']],
  ];
  for (const [name, args] of commands) {
   const env = { ...process.env };
   delete env.SECURITY_AUDIT_SOURCE_ROOT;
   delete env.SECURITY_AUDIT_BROWSER_ROOT;
   const result = spawnSync(process.execPath, args, { encoding: 'utf8', env, timeout: 180000, maxBuffer: 32 * 1024 * 1024, windowsHide: true });
   const log = (result.stdout ?? '') + (result.stderr ?? '') + (result.error?.stack ?? '');
   const logPath = `${dir}/${name.replaceAll('/', '_')}.log`;
   writeFileSync(logPath, log);
   report.checks.push({ name, args, exitCode: result.status, status: result.status === 0 ? 'PASS' : 'FAIL', log: logPath, sha256: sha(log) });
   save();
   console.log(`${name}: ${report.checks.at(-1).status}`);
  }
  const app = json(`${dir}/application.json`);
  report.application = { total: app.numTotalTests, passed: app.numPassedTests, failed: app.numFailedTests, pending: app.numPendingTests };
  assert.deepEqual(report.application, { total: 1073, passed: 1073, failed: 0, pending: 0 });
  const fixtures = app.testResults.filter(r => /phase1-property-fixtures(?:-integration)?\.test\.ts$/.test(r.name))
   .flatMap(r => r.assertionResults.map(a => ({ title: a.fullName, status: a.status }))).sort((a,b) => a.title.localeCompare(b.title));
  const old = json('docs/phase2a01-fixture-comparison.json').identicalAssertions.sort((a,b) => a.title.localeCompare(b.title));
  assert.deepEqual(fixtures, old);
  report.fixtures = { status: 'PASS', assertions: fixtures.length, qualification: 'Names/outcomes against unchanged frozen fixture expectations, not archived numeric-output snapshots; subset of 1073.' };
  const generation = json('docs/phase2a02-type-generation.json');
  assert.equal(sha(readFileSync(generation.source)), generation.sourceSha256);
  assert.equal(sha(readFileSync(generation.destination)), generation.destinationSha256);
  report.typeProvenance = { status: 'PASS', sourceSha256: generation.sourceSha256, destinationSha256: generation.destinationSha256 };
  assert.ok(report.checks.every(c => c.status === 'PASS'));
  report.status = 'PASS';
 } catch (e) { report.status = 'FAIL'; report.error = errorDetails(e); process.exitCode = 1; }
} else {
 const sessions = new RunSessions();
 const sql = q => sessions.sql(q);
 let before;
 try {
  report.target = verifyTarget();
  assert.equal(report.target.users, 0);
  const closure = json('docs/phase2a02-transaction-results.json');
  assert.equal(sha(readFileSync(migration)), closure.target.migrationSha256);
  before = await preservationSnapshot(sql);
  report.beforeSha256 = sha(canonical(before));
  assert.equal(report.beforeSha256, closure.preservation.afterSha256, 'full accepted closure catalog/data fingerprint');
  assert.ok(Object.values(await fixtureCounts(sql)).every(n => n === 0));
  report.acceptedClosureSnapshotMatches = true;
  report.catalog = JSON.parse(await sql(`BEGIN READ ONLY; SELECT jsonb_build_object(
   'extension',(SELECT jsonb_build_object('version',extversion,'schema',extnamespace::regnamespace::text,'owner',pg_get_userbyid(extowner)) FROM pg_extension WHERE extname='postgis'),
   'unsafeRolePaths',(SELECT coalesce(jsonb_agg(jsonb_build_array(r.rolname,o.rolname)),'[]') FROM pg_roles r CROSS JOIN pg_roles o WHERE r.rolname IN ('anon','authenticated','service_role') AND o.oid<>r.oid AND (pg_has_role(r.oid,o.oid,'SET') OR pg_has_role(r.oid,o.oid,'USAGE')) AND (o.rolsuper OR o.rolcreaterole OR o.rolcreatedb OR o.rolbypassrls OR o.rolname IN ('postgres','pg_write_all_data','pg_maintain') OR has_schema_privilege(o.oid,'public','CREATE') OR has_schema_privilege(o.oid,'auth','CREATE') OR has_schema_privilege(o.oid,'extensions','CREATE'))),
   'reachableAdmin',(SELECT count(*) FROM pg_roles r CROSS JOIN pg_auth_members m WHERE r.rolname IN ('anon','authenticated','service_role','authenticator') AND m.admin_option AND (m.member=r.oid OR pg_has_role(r.oid,m.member,'USAGE') OR pg_has_role(r.oid,m.member,'SET'))),
   'authenticatorReachable',(SELECT jsonb_agg(o.rolname ORDER BY o.rolname) FROM pg_roles o WHERE o.rolname<>'authenticator' AND (pg_has_role('authenticator',o.oid,'SET') OR pg_has_role('authenticator',o.oid,'USAGE'))),
   'publicDefiners',(SELECT coalesce(jsonb_agg(jsonb_build_array(p.proname,pg_get_functiondef(p.oid))),'[]') FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.prosecdef),
   'publicViews',(SELECT coalesce(jsonb_agg(jsonb_build_array(relname,relkind)),'[]') FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind IN ('v','m')),
   'guards',(SELECT jsonb_agg(jsonb_build_array(c.relname,t.tgname,t.tgenabled,t.tgtype,p.proname,t.tgnargs) ORDER BY c.relname,t.tgname) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_proc p ON p.oid=t.tgfoid WHERE NOT t.tgisinternal AND c.oid IN ('public.property_location_versions'::regclass,'public.property_location_intelligence_state'::regclass)),
   'invalidIndexes',(SELECT count(*) FROM pg_index WHERE indrelid IN ('public.property_location_versions'::regclass,'public.property_location_intelligence_state'::regclass) AND (NOT indisvalid OR NOT indisready)),
   'danglingPointers',(SELECT count(*) FROM public.property_location_intelligence_state s LEFT JOIN public.property_location_versions v ON (v.property_id,v.id)=(s.property_id,s.current_location_version_id) WHERE s.current_location_version_id IS NOT NULL AND v.id IS NULL),
   'historyRows',(SELECT count(*) FROM public.property_location_versions)
  ); COMMIT;`));
  assert.deepEqual(report.catalog.extension, { version:'3.3.7', schema:'extensions', owner:'supabase_admin' });
  assert.deepEqual(report.catalog.unsafeRolePaths, []);
  assert.equal(report.catalog.reachableAdmin, 0);
  assert.equal(report.catalog.invalidIndexes, 0);
  assert.equal(report.catalog.danglingPointers, 0);
  assert.deepEqual(report.catalog.guards, closure.target.attachments.guards.map(x => x.slice(0,6)));
  report.negativeChecks = [];
  async function rejects(name, query, state, message) {
   let captured;
   await assert.rejects(() => sql(query), e => { captured = errorDetails(e); return captured.sqlstate === state && e.message.includes(message); });
   report.negativeChecks.push({ name, status:'PASS', sqlstate:captured.sqlstate, expectedMessage:message });
  }
  const preflight = source.match(/DO \$preflight\$[\s\S]*?\$preflight\$;/)[0];
  await rejects('Actual unmodified preflight rejects already-installed namespace', 'BEGIN READ ONLY;'+preflight+'ROLLBACK;', '55000', 'Location namespace collision');
  await rejects('Actual unmodified preflight rejects runtime creator', 'BEGIN READ ONLY;SET LOCAL ROLE service_role;'+preflight+'ROLLBACK;', '55000', 'Requires verified postgres/BYPASSRLS');
  for (const [fn,message] of [['guard_property_location_version','Unsupported location guard attachment'],['guard_property_location_pointer','Unsupported pointer guard attachment']]) {
   for (const level of ['ROW','STATEMENT']) {
    await rejects(`${fn}: temporary wrong-schema/table ${level} attachment`, `BEGIN;
     CREATE TEMP TABLE fa_guard_probe(id integer) ON COMMIT DROP;
     CREATE TRIGGER fa_probe BEFORE INSERT ON fa_guard_probe FOR EACH ${level} EXECUTE FUNCTION public.${fn}();
     INSERT INTO fa_guard_probe VALUES(1); ROLLBACK;`, '23514', message);
   }
  }
  const db = sessions.session();
  try {
   // Mirrors only the installed scalar/generated-point expression and partial GiST.
   // No application fixtures, permanent DDL, extension or security changes.
   await db.send(`BEGIN; CREATE TEMP TABLE fa_spatial (
    id integer, longitude double precision, latitude double precision,
    position extensions.geography(Point,4326) GENERATED ALWAYS AS
     (CASE WHEN longitude IS NOT NULL AND latitude IS NOT NULL THEN extensions.st_setsrid(extensions.st_makepoint(longitude,latitude),4326)::extensions.geography(Point,4326) ELSE NULL END) STORED
   ) ON COMMIT DROP;
   CREATE INDEX fa_spatial_gist ON fa_spatial USING gist(position) WHERE position IS NOT NULL;
   INSERT INTO fa_spatial(id,longitude,latitude) SELECT i,100+(i%200)/10.0,(i/200)/10.0 FROM generate_series(0,19999) i;
   INSERT INTO fa_spatial(id) SELECT i FROM generate_series(20000,20999) i;
   ANALYZE fa_spatial;`);
   const predicate = `position IS NOT NULL AND extensions.st_dwithin(position,extensions.st_setsrid(extensions.st_makepoint(101.69,3.14),4326)::extensions.geography,15000)`;
   report.representativePlan = JSON.parse(await db.send(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT id FROM fa_spatial WHERE ${predicate};`));
   assert.match(JSON.stringify(report.representativePlan), /fa_spatial_gist/);
   const indexed = JSON.parse(await db.send(`SELECT jsonb_agg(id ORDER BY id) FROM fa_spatial WHERE ${predicate};`));
   assert.ok(indexed.length > 0 && indexed.length < 20000);
   await db.send('SET LOCAL enable_indexscan=off; SET LOCAL enable_bitmapscan=off;');
   report.sequentialPlan = JSON.parse(await db.send(`EXPLAIN (ANALYZE, FORMAT JSON) SELECT id FROM fa_spatial WHERE ${predicate};`));
   assert.match(JSON.stringify(report.sequentialPlan), /Seq Scan/);
   const sequential = JSON.parse(await db.send(`SELECT jsonb_agg(id ORDER BY id) FROM fa_spatial WHERE ${predicate};`));
   assert.deepEqual(indexed, sequential);
   report.spatial = { status:'PASS', syntheticRows:21000, nullPoints:1000, radiusMetres:15000, matchingIds:indexed, unforcedGistPlan:true, sequentialParity:true, qualification:'Temporary representative distribution; not production performance or an authenticated RLS workload.' };
   await db.send('ROLLBACK; BEGIN READ ONLY; SET LOCAL enable_seqscan=off;');
   report.installedIndexPlan = JSON.parse(await db.send(`EXPLAIN (FORMAT JSON) SELECT id FROM public.property_location_versions WHERE ${predicate};`));
   assert.match(JSON.stringify(report.installedIndexPlan), /property_location_versions_position_gist/);
   await db.send('ROLLBACK;');
  } finally { await db.close(); }
  report.status = 'PASS';
 } catch(e) { report.status = 'FAIL'; report.error = errorDetails(e); process.exitCode = 1; }
 finally {
  try {
   report.sessions = await sessions.finish();
   if (before) {
    const after = await preservationSnapshot(sql);
    report.afterSha256 = sha(canonical(after));
    assert.deepEqual(after, before);
    report.fixtureCounts = await fixtureCounts(sql);
    assert.ok(Object.values(report.fixtureCounts).every(n => n === 0));
    report.preservation = 'PASS';
   }
   report.finalSessions = await sessions.finish();
  } catch(e) { report.status='FAIL'; report.cleanupError=errorDetails(e); process.exitCode=1; }
 }
}
report.finishedAt = new Date().toISOString();
save();
console.log(JSON.stringify({ status:report.status, mode, output, error:report.error, cleanupError:report.cleanupError }));
