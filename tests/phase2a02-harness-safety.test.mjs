// Stage C: no Docker/database use. Exercise real lifecycle code with controlled faults.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { boundedProcess,RunSessions,coordinateRace,finalizeReport,delay } from './phase2a02-transaction-runtime.mjs';

const results=[];
const check=(name,fn)=>test(name,async()=>{
 const started=Date.now();
 try { await fn(); results.push({name,status:'PASS',elapsedMs:Date.now()-started}); }
 catch(error) { results.push({name,status:'FAIL',message:error.message}); throw error; }
});
const timings={process:100,query:25,shutdown:40,observe:80,hold:100,join:150};
function fakeChild() {
 const child=new EventEmitter();
 child.stdout=new EventEmitter(); child.stderr=new EventEmitter(); child.stdin=new EventEmitter();
 child.stdin.write=()=>true; child.stdin.end=()=>{}; child.stdin.destroy=()=>{};
 child.killed=false;
 child.kill=()=>{ child.killed=true; queueMicrotask(()=>child.emit('close',1)); return true; };
 return child;
}
check('S01 command timeout kills the owned process and explicitly fails',async()=>{
 const child=fakeChild(),start=Date.now();
 await assert.rejects(boundedProcess('fake',[],{spawnImpl:()=>child,timeout:25}),/command timeout/);
 assert.equal(child.killed,true); assert.ok(Date.now()-start<1000);
});
check('S02 query timeout cancels, terminates and verifies only the exact owned backend',async()=>{
 const child=fakeChild(),queries=[];
 const manager=new RunSessions({spawnImpl:()=>child,timings,control:async query=>{queries.push(query);return query.includes('count(*)')?'0':'t';}});
 const db=manager.session();
 await assert.rejects(db.send('SELECT blocked();'),/session query timeout/);
 await db.close();
 assert.equal(child.killed,true);
 assert.ok(queries.some(q=>q.includes('pg_cancel_backend')));
 assert.ok(queries.some(q=>q.includes('pg_terminate_backend(pid,1000)')));
 assert.ok(queries.every(q=>q.includes(`application_name='${db.name}'`)&&q.includes("usename='postgres'")&&q.includes('client_addr IS NULL')));
 assert.throws(()=>manager.predicate('unrelated'),/exact registered/);
 assert.equal(manager.sessions.size,0);
});
check('S03 blocked ROLLBACK has a finite shutdown and explicit failure',async()=>{
 const child=fakeChild();
 const manager=new RunSessions({spawnImpl:()=>child,timings,control:async query=>query.includes('count(*)')?'0':'t'});
 await assert.rejects(manager.session().close(),/session query timeout/);
 assert.equal(child.killed,true); assert.equal(manager.sessions.size,0);
});
async function raceFault(stage) {
 let winnerJoined=false,loserJoined=false,finishWinner;
 const winnerDone=new Promise(resolve=>{finishWinner=resolve;});
 const started=[];
 await assert.rejects(coordinateRace({timings,
  start:async(kind,options)=>{
   started.push(kind);
   if(kind==='winner') { try { await options.afterLock(101); return 'won'; } finally {winnerJoined=true;finishWinner();} }
   options.onPid(202); await winnerDone; loserJoined=true; throw Error('stale');
  },
  afterAcquire:async()=>{if(stage==='parse') JSON.parse('bad JSON');},
  observe:async()=>{throw Error('blocking observation failed');}
 }),stage==='parse'?/JSON/:/blocking observation/);
 assert.equal(winnerJoined,true);
 assert.equal(loserJoined,stage!=='parse');
 assert.deepEqual(started,stage==='parse'?['winner']:['winner','loser']);
}
check('S04 failure after acquisition before release always releases and joins winner',()=>raceFault('parse'));
check('S05 blocking-observation failure joins both writers before returning',()=>raceFault('observe'));
check('S06 PID acquisition failure is reported without a hanging acquisition promise',async()=>{
 await assert.rejects(coordinateRace({timings,start:async()=>{throw Error('PID acquisition failed');},observe:async()=>{}}),/PID acquisition failed/);
});
check('S07 missing lock handshake is bounded and the started writer is joined',async()=>{
 let joined=false;
 await assert.rejects(coordinateRace({timings:{...timings,hold:20},start:async()=>{await delay(40);joined=true;},observe:async()=>{}}),/lock acquisition timeout/);
 assert.equal(joined,true);
});
check('S08 cleanup failure remains a harness failure in the written partial report',async()=>{
 let saved,verified=false;
 const report={results:[{id:'TC01',status:'PASS'},{id:'TC02',status:'NOT EXECUTED'}]};
 await finalizeReport(report,{sessions:async()=>({status:'PASS'}),cleanup:async()=>{throw Error('cleanup refused');},verify:async()=>{verified=true;return {status:'PASS'};},write:async r=>{saved=structuredClone(r);}});
 assert.equal(verified,true);assert.equal(saved.status,'FAIL');assert.equal(saved.summary.pass,1);assert.equal(saved.summary.notExecuted,1);
 assert.equal(saved.harnessErrors[0].stage,'cleanup');
});
check('S09 unverified session shutdown stops fixture cleanup but still writes evidence',async()=>{
 let deleted=false,saved;
 await finalizeReport({results:[{id:'TC01',status:'NOT EXECUTED'}]},{sessions:async()=>{throw Error('owned session 123 remains');},cleanup:async()=>{deleted=true;},verify:async()=>({status:'NOT EXECUTED'}),write:async r=>{saved=r;}});
 assert.equal(deleted,false);assert.equal(saved.status,'FAIL');assert.equal(saved.cleanup.status,'NOT EXECUTED');
 assert.match(saved.harnessErrors[0].message,/session 123/);
});
check('S10 actual local subprocess timeout leaves the event loop responsive',async()=>{
 let ticked=false;const timer=setTimeout(()=>{ticked=true;},30);
 try { await assert.rejects(boundedProcess(process.execPath,['-e','setInterval(()=>{},1000)'],{timeout:150}),/command timeout/); }
 finally { clearTimeout(timer); }
 assert.equal(ticked,true);
});
check('S11 termination failure cannot be mistaken for a clean session',async()=>{
 const child=fakeChild();
 const manager=new RunSessions({spawnImpl:()=>child,timings,control:async()=>{throw Error('control unavailable');}});
 await assert.rejects(manager.session().send('SELECT blocked();'),/session shutdown failed/);
 assert.equal(child.killed,true);
 await assert.rejects(manager.finish(),/session cleanup failed/);
});
after(()=>{
 const files=['tests/run-phase2a02-transactions.mjs','tests/phase2a02-transaction-runtime.mjs','tests/phase2a02-transaction-writer.mjs',
  'tests/phase2a02-transaction-qualification.mjs','tests/phase2a02-catalog-query.mjs','tests/phase2a02-contention.mjs','tests/phase2a02-local-target.mjs',
  'tests/phase2a02-harness-safety.test.mjs','tests/phase2a02-command-contract.mjs','tests/phase2a02-location-cases.mjs','tests/phase2a02-baseline-snapshot.mjs','tests/phase2a01-contract-fixtures.mjs','tests/phase2a02-sql-helpers.mjs'];
 const sourceHashes=Object.fromEntries(files.map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')]));
 writeFileSync('docs/phase2a02-harness-safety-results.json',JSON.stringify({stage:'C',status:results.length===11&&results.every(r=>r.status==='PASS')?'PASS':'FAIL',databaseCommands:0,results,sourceHashes},null,2)+'\n');
});
