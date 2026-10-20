// Test-only bounded local process/session lifecycle. No URLs or application imports.
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { container, psqlArgs } from './phase2a02-local-target.mjs';

export const limits = { process: 20000, query: 14000, shutdown: 2500, observe: 5000, hold: 9000, join: 20000 };
export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function deadline(promise, ms, label) {
 let timer;
 try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Error(`${label} timeout (${ms}ms)`)), ms); })]); }
 finally { clearTimeout(timer); }
}
export const outcome = promise => promise.then(value => ({ value }), error => ({ error }));
export function errorDetails(error) {
 return { name: error.name, message: error.message, sqlstate: error.sqlstate ?? error.message.match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5}):/)?.[1] ?? null,
  causes: error instanceof AggregateError ? error.errors.map(errorDetails) : undefined };
}

export function boundedProcess(file, args, { input = '', timeout = limits.process, spawnImpl = spawn } = {}) {
 return new Promise((resolve, reject) => {
  let child, stdout = '', stderr = '', settled = false, timer, stopError;
  const finish = (error, code) => {
   if (settled) return;
   settled = true; clearTimeout(timer);
   if (error || code !== 0) reject(error ?? Error(`${file} exited ${code}: ${stderr}`));
   else resolve(stdout);
  };
  try { child = spawnImpl(file, args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true }); }
  catch (error) { finish(error); return; }
  const stop = error => {
   if (stopError || settled) return;
   stopError = error;
   child.kill('SIGKILL');
   clearTimeout(timer);
   timer = setTimeout(() => finish(new AggregateError([error], `Owned process ${child.pid ?? 'unknown'} did not exit after SIGKILL`)), 1000);
  };
  timer = setTimeout(() => stop(Error(`${file} command timeout (${timeout}ms): ${stderr}`)), timeout);
  child.on('error', stop);
  child.on('close', code => finish(stopError, code));
  child.stdout.on('data', bytes => { stdout += bytes; if (stdout.length > 32 * 1024 * 1024) stop(Error('command output limit')); });
  child.stderr.on('data', bytes => { stderr += bytes; if (stderr.length > 1024 * 1024) stop(Error('command error output limit')); });
  child.stdin.on('error', stop);
  child.stdin.end(input);
 });
}
export const dockerAsync = (args, options) => boundedProcess('docker', ['--context', 'desktop-linux', ...args], options);
const literal = value => "'" + value.replaceAll("'", "''") + "'";

export class RunSessions {
 constructor({ process = dockerAsync, spawnImpl = spawn, timings = limits, control } = {}) {
  this.runId = 'mpia_tc02_' + randomUUID().replaceAll('-', '');
  this.sequence = 0; this.names = new Set(); this.sessions = new Set(); this.activeCalls = new Set(); this.events = [];
  this.process = process; this.spawnImpl = spawnImpl; this.timings = timings;
  this.controlOverride = control;
 }
 name() { const name = `${this.runId}_${++this.sequence}`; this.names.add(name); return name; }
 args(name, control = false) {
  return ['exec', '-i', '-e', `PGAPPNAME=${name}`, '-e', `PGOPTIONS=-c statement_timeout=${control ? 3000 : 12000} -c lock_timeout=${control ? 1500 : 10000} -c idle_in_transaction_session_timeout=${control ? 4000 : 15000}`,
   container, ...psqlArgs.slice(psqlArgs.indexOf('psql'))];
 }
 predicate(name) {
  assert.ok(this.names.has(name), 'may only target an exact registered run session');
  return `application_name=${literal(name)} AND datname='postgres' AND usename='postgres' AND client_addr IS NULL AND backend_type='client backend' AND pid<>pg_backend_pid()`;
 }
 async control(query) {
  if (this.controlOverride) return this.controlOverride(query);
  return (await this.process(this.args(this.name(), true), { input: query, timeout: 5000 })).trim();
 }
 async stopBackend(name) {
  const predicate = this.predicate(name);
  const actions = [];
  try { actions.push({ cancel: await this.control(`SELECT pg_cancel_backend(pid) FROM pg_stat_activity WHERE ${predicate};`) }); }
  catch (error) { actions.push({ cancelError: errorDetails(error) }); }
  // Terminate even an idle transaction: cancelling an idle backend does not release its locks.
  actions.push({ terminate: await this.control(`SELECT pg_terminate_backend(pid,1000) FROM pg_stat_activity WHERE ${predicate};`) });
  const remaining = await this.control(`SELECT count(*) FROM pg_stat_activity WHERE ${predicate};`);
  assert.equal(remaining, '0', `owned backend remains: ${name}`);
  this.events.push({ name, actions, remaining: 0 });
 }
 sql(query) {
  const call = this.executeSql(query);
  this.activeCalls.add(call);
  call.then(() => this.activeCalls.delete(call), () => this.activeCalls.delete(call));
  return call;
 }
 async executeSql(query) {
  const name = this.name();
  try { return (await this.process(this.args(name), { input: query, timeout: this.timings.process })).trim(); }
  catch (error) {
   try { await this.stopBackend(name); } catch (cleanup) { throw new AggregateError([error, cleanup], `SQL failure and backend cleanup failure: ${name}`); }
   throw error;
  }
 }
 session() {
  const name = this.name();
  const child = this.spawnImpl('docker', ['--context', 'desktop-linux', ...this.args(name)], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  let output = '', errors = '', pending, exited = false, exitError, closing;
  let resolveClosed;
  const closed = new Promise(resolve => { resolveClosed = resolve; });
  const fail = error => { exitError = error; pending?.reject(error); };
  child.stdout.on('data', chunk => { output += chunk; pending?.check(); });
  child.stderr.on('data', chunk => { errors += chunk; });
  child.stdin.on('error', fail);
  child.on('error', fail);
  child.on('close', code => { exited = true; fail(Error(`psql exited ${code}: ${errors}`)); resolveClosed(); });
  const db = {
   name,
   send: async (command, timeout = this.timings.query) => {
    assert.equal(pending, undefined, 'one command per session');
    if (exitError) throw exitError;
    const marker = 'READY_' + randomUUID().replaceAll('-', '');
    const start = output.length;
    const response = new Promise((resolve, reject) => {
     pending = { reject, check() { const end = output.indexOf(marker, start); if (end >= 0) resolve(output.slice(start, end).trim()); } };
     child.stdin.write(command + '\n\\echo ' + marker + '\n');
    });
    try { return await deadline(response, timeout, 'session query'); }
    catch (error) {
     // A JS timer alone is not cleanup. Server cancellation/termination is awaited.
     try { await db.abort(); } catch (cleanup) { throw new AggregateError([error, cleanup], `session shutdown failed: ${name}`); }
     throw error;
    } finally { pending = undefined; }
   },
   abort: async () => {
    try { await this.stopBackend(name); }
    finally {
     child.stdin.destroy(); child.kill('SIGKILL');
     await deadline(closed, this.timings.shutdown, `child exit ${name}`);
    }
   },
   close: () => closing ??= (async () => {
    try {
     if (!exited && !pending && !exitError) {
      await db.send('ROLLBACK;', this.timings.shutdown);
      child.stdin.end('\\q\n');
      await deadline(closed, this.timings.shutdown, 'graceful child exit');
     } else if (!exited) await db.abort();
     // Independently verify backend absence even if the Docker client already exited.
     const count = await this.control(`SELECT count(*) FROM pg_stat_activity WHERE ${this.predicate(name)};`);
     if (count !== '0') await db.abort();
    } catch (error) {
     try { await db.abort(); } catch (cleanup) { throw new AggregateError([error, cleanup], `close failed: ${name}`); }
     throw error;
    } finally { this.sessions.delete(db); }
   })(),
  };
  this.sessions.add(db);
  return db;
 }
 async finish() {
  if (!this.names.size) return { status: 'PASS', remainingSessions: 0, remainingTransactions: 0, events: [] };
  await deadline(Promise.allSettled([...this.activeCalls]), this.timings.process + 16000, 'join SQL commands');
  const results = await Promise.allSettled([...this.sessions].map(db => db.close()));
  const errors = results.filter(r => r.status === 'rejected').map(r => r.reason);
  // Includes short-lived SQL and administrative sessions. Exact names, never a broad wildcard.
  const names = [...this.names];
  const predicate = names.length ? names.map(name => `(${this.predicate(name)})`).join(' OR ') : 'false';
  let remaining;
  try {
   remaining = JSON.parse(await this.control(`SELECT coalesce(jsonb_agg(jsonb_build_object('pid',pid,'backendStart',backend_start,'name',application_name,'state',state,'xactStart',xact_start)),'[]'::jsonb) FROM pg_stat_activity WHERE ${predicate};`));
   for (const row of remaining) await this.stopBackend(row.name);
   if (remaining.length) {
    const count = await this.control(`SELECT count(*) FROM pg_stat_activity WHERE ${predicate};`);
    assert.equal(count, '0', 'test-owned sessions remain');
   }
  } catch (error) { errors.push(error); }
  if (errors.length) throw new AggregateError(errors, 'session cleanup failed');
  return { status: 'PASS', remainingSessions: 0, remainingTransactions: 0, terminated: remaining, events: this.events };
 }
}

// Entire lifetime of both writers is covered by finally, including PID acquisition/parsing.
export async function coordinateRace({ start, observe, afterAcquire = async () => {}, timings = limits }) {
 let release, signal;
 const held = new Promise(resolve => { release = resolve; });
 const acquired = new Promise(resolve => { signal = resolve; });
 const started = [];
 let evidence, failure;
 try {
  const winner = outcome(start('winner', { afterLock: async pid => { signal(pid); await deadline(held, timings.hold, 'winner hold'); } }));
  started.push(winner);
  const firstPid = await deadline(Promise.race([acquired, winner.then(result => { throw result.error ?? Error('winner ended before lock'); })]), timings.hold, 'lock acquisition');
  await deadline(afterAcquire(firstPid), timings.hold, 'after acquisition');
  let secondReady;
  const secondPidPromise = new Promise(resolve => { secondReady = resolve; });
  const loser = outcome(start('loser', { onPid: secondReady }));
  started.push(loser);
  const secondPid = await deadline(Promise.race([secondPidPromise, loser.then(result => { throw result.error ?? Error('loser ended before PID'); })]), timings.hold, 'rival PID');
  evidence = await deadline(observe(firstPid, secondPid), timings.observe + limits.process + 16000, 'blocking observation');
 } catch (error) { failure = error; }
 finally {
  release();
  const joined = await Promise.all(started.map(writer => outcome(deadline(writer, timings.join, 'writer join'))));
  const joinErrors = joined.filter(r => r.error).map(r => r.error);
  if (joinErrors.length) throw new AggregateError([...(failure ? [failure] : []), ...joinErrors], 'coordinator join failed');
 }
 if (failure) throw failure;
 const [winner, loser] = await Promise.all(started);
 if (winner.error) throw winner.error;
 return { winner: winner.value, loser, evidence };
}

export async function observeBlocking(firstPid, secondPid, sql, timeout = limits.observe) {
 assert.ok(Number.isSafeInteger(firstPid) && Number.isSafeInteger(secondPid));
 const until = Date.now() + timeout;
 while (Date.now() < until) {
  const evidence = JSON.parse(await sql(`SELECT jsonb_build_object('firstPid',${firstPid},'secondPid',${secondPid},
   'observedAt',clock_timestamp(),'blockers',pg_blocking_pids(${secondPid}),
   'waitType',(SELECT wait_event_type FROM pg_stat_activity WHERE pid=${secondPid}),
   'ungrantedLocks',(SELECT count(*) FROM pg_locks WHERE pid=${secondPid} AND NOT granted));`));
  if (evidence.blockers.includes(firstPid) && evidence.waitType === 'Lock' && evidence.ungrantedLocks > 0) return evidence;
  await delay(40);
 }
 throw Error('No observed contention; timing alone is not accepted');
}

export async function finalizeReport(report, { sessions, cleanup, verify, write }) {
 report.harnessErrors ??= [];
 let sessionsSafe = false;
 try { report.sessions = await sessions(); sessionsSafe = true; }
 catch (error) { report.harnessErrors.push({ stage: 'sessions', ...errorDetails(error) }); }
 if (sessionsSafe) {
  try { report.cleanup = await cleanup(); }
  catch (error) { report.harnessErrors.push({ stage: 'cleanup', ...errorDetails(error) }); }
 } else report.cleanup = { status: 'NOT EXECUTED', reason: 'Session shutdown not verified; no further fixture mutations' };
 try { report.preservation = await verify(); }
 catch (error) { report.harnessErrors.push({ stage: 'preservation', ...errorDetails(error) }); }
 report.summary = { total: report.results.length, pass: report.results.filter(r => r.status === 'PASS').length,
  fail: report.results.filter(r => r.status === 'FAIL').length, notExecuted: report.results.filter(r => r.status === 'NOT EXECUTED').length };
 report.status = report.harnessErrors.length || report.summary.fail ? 'FAIL' : report.summary.notExecuted ? 'NOT EXECUTED' : 'PASS';
 await write(report);
}
