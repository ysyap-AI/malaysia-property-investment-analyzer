// Opt-in real database qualification. This script can only target the named local sandbox.
// Run: node tests/m4-local-database.integration.mjs (Docker and local Supabase must be running).
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const container = 'supabase_db_mpia-post-m7-disposable-20261031';
const base = 'http://127.0.0.1:57521';
const args = ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-Atq', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose'];
const quote = value => "'" + String(value).replaceAll("'", "''") + "'";
function sql(statement) {
  const r = spawnSync('docker', args, { input: statement, encoding: 'utf8', timeout: 20000 });
  assert.equal(r.status, 0, r.stderr || r.error?.message);
  return r.stdout.trim();
}
const catalog = JSON.parse(sql(`SELECT json_build_object('postgis', e.extversion, 'schema', n.nspname, 'owner', pg_get_userbyid(e.extowner)) FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE extname='postgis';`));
assert.deepEqual(catalog, { postgis: '3.3.7', schema: 'extensions', owner: 'supabase_admin' });
assert.equal(sql('SELECT count(*) FROM supabase_migrations.schema_migrations;'), '8');
assert.equal(sql(`SELECT count(*) FROM pg_attribute WHERE attrelid='public.properties'::regclass AND attname='revision' AND atttypid='bigint'::regtype AND attnotnull;`), '1');
assert.equal(sql(`SELECT count(*) FROM pg_trigger WHERE tgname IN ('m4_property_revision','m4_acquisition_revision','m4_financing_revision','m4_expenses_revision') AND tgenabled='O';`), '4');
assert.equal(sql(`SELECT count(*) FROM pg_class WHERE oid IN ('public.properties'::regclass,'public.acquisition_costs'::regclass,'public.financing'::regclass,'public.operating_expenses'::regclass) AND relrowsecurity;`), '4');
assert.equal(sql(`SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename IN ('properties','acquisition_costs','financing','operating_expenses') AND roles=ARRAY['authenticated']::name[];`), '16');
for (const signature of ['public.m4_property_snapshot(uuid)', 'public.m4_write_property(uuid,bigint,text,jsonb,boolean)']) {
  assert.equal(sql(`SELECT has_function_privilege('authenticated',${quote(signature)},'EXECUTE') AND NOT has_function_privilege('anon',${quote(signature)},'EXECUTE');`), 't');
}
assert.equal(sql(`SELECT count(*) FROM pg_proc WHERE proname IN ('m4_property_revision','m4_financial_revision','m4_property_snapshot','m4_write_property') AND proowner='postgres'::regrole AND proconfig=ARRAY['search_path=pg_catalog'];`), '4');
assert.equal(sql(`SELECT extensions.st_srid(extensions.st_setsrid(extensions.st_makepoint(101.6869,3.1390),4326)::extensions.geography::extensions.geometry);`), '4326');
console.log('PASS: PostGIS catalog/objects, all eight migrations, M4 column/triggers/RLS/RPC grants', catalog);

// Read only the public legacy API key from the disposable gateway, never a remote env file.
const kong = spawnSync('docker', ['exec', 'supabase_kong_mpia-post-m7-disposable-20261031', 'cat', '/home/kong/kong.yml'], { encoding: 'utf8' });
assert.equal(kong.status, 0, kong.stderr);
const key = [...kong.stdout.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)]
  .map(match => match[0]).find(token => JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).role === 'anon');
assert.ok(key, 'Disposable anon gateway key');
async function request(path, token, body, method = 'POST', extra = {}) {
  const r = await fetch(base + path, { method, headers: { apikey: key, Authorization: `Bearer ${token || key}`, 'Content-Type': 'application/json', ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const text = await r.text();
  return { status: r.status, data: text ? JSON.parse(text) : null };
}
const suffix = randomUUID().slice(0, 8);
const password = `M4-local-${randomUUID()}!`;
async function signup(label) {
  const email = `m4-${label}-${suffix}@example.test`;
  const r = await request('/auth/v1/signup', null, { email, password });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.ok(r.data.access_token, 'Synthetic signup returns real Auth token');
  return { email, id: r.data.user.id, token: r.data.access_token };
}
const a = await signup('owner');
const b = await signup('other');
console.log('PASS: two synthetic Supabase Auth identities');
const rpc = (user, name, body) => request('/rest/v1/rpc/' + name, user?.token, body);
async function create(name = 'M4 local synthetic') {
  const r = await request('/rest/v1/properties', a.token, { user_id: a.id, project_name: `${name} ${suffix}`, target_purchase_price: 490000, notes: '', expected_monthly_rent: null }, 'POST', { Prefer: 'return=representation' });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.equal(r.data[0].revision, 1);
  return r.data[0].id;
}
async function snapshot(id, user = a) {
  const r = await rpc(user, 'm4_property_snapshot', { p_id: id });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return r.data;
}
async function write(id, rev, table, values, del = false, user = a) {
  return rpc(user, 'm4_write_property', { p_id: id, p_revision: rev, p_table: table, p_values: values, p_delete: del });
}
async function success(id, rev, table, values) {
  const r = await write(id, rev, table, values);
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.revision, rev + 1);
  return r.data;
}
function conflict(r) { assert.equal(r.status, 409, JSON.stringify(r.data)); assert.equal(r.data.code, 'PT409'); }
const id = await create();
let s = await snapshot(id);
assert.equal(s.acquisition_costs, null);
assert.equal(s.financing, null);
assert.equal(s.operating_expenses, null);
await success(id, 1, 'properties', { notes: '', asking_price: 0 });
conflict(await write(id, 1, 'properties', { notes: 'stale' }));
await success(id, 2, 'acquisition_costs', { purchase_price: 500000, spa_legal_fee: 0, valuation_fee: null });
await success(id, 3, 'financing', { loan_amount: 400000, annual_interest_rate_percent: 4, loan_tenure_years: 30, user_provided_monthly_instalment: 0, use_user_provided_instalment: false, financing_notes: '', down_payment: null });
await success(id, 4, 'operating_expenses', { annual_maintenance_fee: 0, annual_sinking_fund: null });
for (const table of ['acquisition_costs', 'financing', 'operating_expenses']) {
  const field = { acquisition_costs: 'valuation_fee', financing: 'down_payment', operating_expenses: 'annual_sinking_fund' }[table];
  conflict(await write(id, 4, table, { [field]: 1 }));
}
conflict(await write(id, 4, 'properties', {}, true));
assert.equal((await snapshot(id)).property.revision, 5);
console.log('PASS: parent/three financial saves, exact revision increments, stale edits and stale deletion');

// Test SELECT RLS against every populated child as well as parent/RPC access.
for (const table of ['properties', 'acquisition_costs', 'financing', 'operating_expenses']) {
  const filter = table === 'properties' ? 'id' : 'property_id';
  const other = await request(`/rest/v1/${table}?${filter}=eq.${id}&select=*`, b.token, undefined, 'GET');
  assert.equal(other.status, 200); assert.deepEqual(other.data, []);
  const anon = await request(`/rest/v1/${table}?${filter}=eq.${id}&select=*`, null, undefined, 'GET');
  if (anon.status === 200) assert.deepEqual(anon.data, []);
  else assert.ok([401, 403].includes(anon.status), JSON.stringify(anon));
}
assert.equal(await snapshot(id, b), null);
conflict(await write(id, 5, 'properties', { notes: 'other owner' }, false, b));
conflict(await write(id, 5, 'properties', {}, true, b));
for (const [table, field] of [['acquisition_costs', 'valuation_fee'], ['financing', 'down_payment'], ['operating_expenses', 'annual_sinking_fund']]) {
  conflict(await write(id, 5, table, { [field]: 1 }, false, b));
}
for (const name of ['m4_property_snapshot', 'm4_write_property']) {
  const body = name.endsWith('snapshot') ? { p_id: id } : { p_id: id, p_revision: 5, p_table: 'properties', p_values: { notes: 'anonymous' } };
  const r = await rpc(null, name, body); assert.ok([401, 403].includes(r.status));
}
const forged = await request('/rest/v1/properties', b.token, { user_id: a.id, project_name: 'forged' });
assert.equal(forged.status, 403);
const anonymousCreate = await request('/rest/v1/properties', null, { user_id: a.id, project_name: 'anonymous' });
assert.equal(anonymousCreate.status, 401);
console.log('PASS: real ownership RLS, anonymous table/RPC denial, forged owner denial');

for (const table of ['properties', 'acquisition_costs', 'financing', 'operating_expenses']) {
  const filter = table === 'properties' ? 'id' : 'property_id';
  const field = { properties: 'notes', acquisition_costs: 'valuation_fee', financing: 'down_payment', operating_expenses: 'annual_sinking_fund' }[table];
  for (const method of ['PATCH', 'DELETE']) {
    const r = await request(`/rest/v1/${table}?${filter}=eq.${id}`, a.token, method === 'PATCH' ? { [field]: null } : undefined, method);
    assert.equal(r.status, 403, JSON.stringify(r));
  }
  if (table !== 'properties') {
    const r = await request('/rest/v1/' + table, a.token, { property_id: id, [field]: 0 });
    assert.equal(r.status, 403);
  }
}
for (const values of [{ revision: 99 }, { user_id: b.id }, { id: randomUUID() }]) {
  const r = await write(id, 5, 'properties', values); assert.equal(r.status, 400); assert.equal(r.data.code, '22023');
}
assert.equal((await snapshot(id)).property.revision, 5);
console.log('PASS: direct REST bypass denied for all write methods and RPC identity/revision injection denied');

// Exact persistence through sign-out, password sign-in, and refresh via real Auth.
assert.equal((await request('/auth/v1/logout', a.token, {})).status, 204);
let login = await request('/auth/v1/token?grant_type=password', null, { email: a.email, password });
assert.equal(login.status, 200); a.token = login.data.access_token;
const refreshed = await request('/auth/v1/token?grant_type=refresh_token', null, { refresh_token: login.data.refresh_token });
assert.equal(refreshed.status, 200); a.token = refreshed.data.access_token;
s = await snapshot(id);
assert.equal(s.property.target_purchase_price, 490000); assert.equal(s.property.asking_price, 0);
assert.equal(s.property.expected_monthly_rent, null); assert.equal(s.property.notes, '');
assert.equal(s.acquisition_costs.purchase_price, 500000); assert.equal(s.acquisition_costs.spa_legal_fee, 0); assert.equal(s.acquisition_costs.valuation_fee, null);
assert.equal(s.financing.user_provided_monthly_instalment, 0); assert.equal(s.financing.down_payment, null); assert.equal(s.financing.financing_notes, '');
assert.equal(s.operating_expenses.annual_maintenance_fee, 0); assert.equal(s.operating_expenses.annual_sinking_fund, null);
await success(id, 5, 'acquisition_costs', { valuation_fee: 0 });
await success(id, 6, 'acquisition_costs', { valuation_fee: null });
await success(id, 7, 'financing', { down_payment: 0 });
await success(id, 8, 'financing', { down_payment: null });
await success(id, 9, 'operating_expenses', { annual_sinking_fund: 0 });
await success(id, 10, 'operating_expenses', { annual_sinking_fund: null });
console.log('PASS: real sign-out/sign-in/token refresh/reload; blank, NULL and zero remain distinct on create and update');

// Independent transactions use the same real Auth UUIDs and database role as PostgREST.
function call(id, rev, table, values, del = false) {
  return `SELECT public.m4_write_property(${quote(id)}::uuid,${rev},${quote(table)},${quote(JSON.stringify(values))}::jsonb,${del});`;
}
function transaction(statement) {
  return `BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub', ${quote(a.id)}, true); ${statement} COMMIT;`;
}
async function race(id, first, second) {
  const p = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
  let output = '', error = '';
  const done = new Promise((resolve, reject) => {
    p.on('error', reject); p.on('close', code => resolve({ code, output, error }));
  });
  p.stdout.on('data', chunk => { output += chunk; }); p.stderr.on('data', chunk => { error += chunk; });
  p.stdin.end(transaction(`${first} SELECT 'M4_LOCK_HELD'; SELECT pg_sleep(2);`));
  const deadline = Date.now() + 15000;
  while (!output.includes('M4_LOCK_HELD')) {
    assert.ok(Date.now() < deadline, 'First transaction acquired lock');
    if (p.exitCode !== null) throw new Error(error);
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  const loser = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
  let loserError = '';
  loser.stderr.on('data', chunk => { loserError += chunk; });
  const lost = new Promise((resolve, reject) => { loser.on('error', reject); loser.on('close', code => resolve(code)); });
  loser.stdin.end(transaction(second));
  // Observe a real lock wait, rather than assuming requests overlapped.
  let waiting = false;
  while (p.exitCode === null) {
    if (sql("SELECT count(*) FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE '%m4_write_property%';") !== '0') { waiting = true; break; }
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  assert.ok(waiting, 'Competing transaction actually waited on database lock');
  assert.equal((await done).code, 0, error);
  assert.notEqual(await lost, 0);
  assert.match(loserError, /PT409/);
}
for (const table of ['acquisition_costs', 'financing', 'operating_expenses']) {
  const childId = await create('Concurrent first child');
  const field = { acquisition_costs: 'valuation_fee', financing: 'down_payment', operating_expenses: 'annual_sinking_fund' }[table];
  await race(childId, call(childId, 1, table, { [field]: 0 }), call(childId, 1, table, { [field]: 99 }));
  assert.equal(sql(`SELECT count(*) FROM public.${table} WHERE property_id=${quote(childId)};`), '1');
  const state = await snapshot(childId); assert.equal(state.property.revision, 2); assert.equal(state[table][field], 0);
  assert.equal((await write(childId, 2, 'properties', {}, true)).status, 200);
}
console.log('PASS: concurrent first creation for all three child tables; observed lock waits, one success/one PT409');
for (const saveFirst of [true, false]) {
  const raceId = await create('Delete save race');
  const save = call(raceId, 1, 'acquisition_costs', { purchase_price: 500000 });
  const del = call(raceId, 1, 'properties', {}, true);
  await race(raceId, saveFirst ? save : del, saveFirst ? del : save);
  const state = await snapshot(raceId);
  if (saveFirst) {
    assert.equal(state.property.revision, 2); assert.equal(state.acquisition_costs.purchase_price, 500000);
    assert.equal((await write(raceId, 2, 'properties', {}, true)).status, 200);
  } else assert.equal(state, null);
  assert.equal(sql(`SELECT count(*) FROM public.acquisition_costs WHERE property_id=${quote(raceId)};`), '0');
}
console.log('PASS: both delete-versus-save lock orders, no orphan or parent recreation');

// Privileged maintenance writes also increment parent revision; rollback stays atomic.
sql(`BEGIN; UPDATE public.financing SET down_payment=0 WHERE property_id=${quote(id)}; COMMIT;`);
assert.equal((await snapshot(id)).property.revision, 12);
sql(`BEGIN; UPDATE public.financing SET down_payment=1 WHERE property_id=${quote(id)}; ROLLBACK;`);
assert.equal((await snapshot(id)).property.revision, 12);
sql(`BEGIN; DELETE FROM public.financing WHERE property_id=${quote(id)}; COMMIT;`);
assert.equal((await snapshot(id)).property.revision, 13);
await success(id, 13, 'financing', { down_payment: null });
assert.equal((await write(id, 14, 'properties', {}, true)).status, 200);
assert.equal(await snapshot(id), null);
for (const table of ['acquisition_costs', 'financing', 'operating_expenses']) {
  assert.equal(sql(`SELECT count(*) FROM public.${table} WHERE property_id=${quote(id)};`), '0');
}
conflict(await write(id, 14, 'acquisition_costs', { purchase_price: 500000 }));
console.log('PASS: maintenance update/delete triggers, transaction rollback, three FK cascades and post-delete save denial');
console.log('ALL ESSENTIAL M4 REAL DATABASE CHECKS PASSED');
