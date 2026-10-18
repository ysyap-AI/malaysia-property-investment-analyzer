// Local synthetic acceptance only. All SQL/Docker work is asynchronous and bounded.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { RunSessions, boundedProcess, coordinateRace, observeBlocking, finalizeReport, errorDetails } from './phase2a02-transaction-runtime.mjs';
import { qualify, preservationSnapshot, fixtureCounts, canonical, sha, users } from './phase2a02-transaction-qualification.mjs';
import { writeCommand } from './phase2a02-transaction-writer.mjs';
import { fixtureSQL,userA,userB,propA,propA2,propB } from './phase2a02-location-cases.mjs';
import { propertyInputHash,semanticFields } from './phase2a02-command-contract.mjs';
import { literal as l } from './phase2a01-contract-fixtures.mjs';

const output = 'docs/phase2a02-transaction-results.json';
const historical = JSON.parse(readFileSync('docs/phase2a02-transaction-results-closure-01.json','utf8'));
const report = { date:'2026-10-18',timezone:'Asia/Kuala_Lumpur',task:'Phase 2A-02 TEST-CLOSURE-02',startedAt:new Date().toISOString(),
 status:'RUNNING',recommendation:'BLOCKED',historicalEvidence:'phase2a02-transaction-results-closure-01.json',
 results:historical.results.map(({id,name,expected,readinessIds})=>({id,name,expected,readinessIds,status:'NOT EXECUTED',actual:'Not reached'})),
 harnessErrors:[],limitation:'Synthetic SQL contract only; does not implement or prove real handler authentication. TC14 uses a temporary deferred FK; permanent-pointer integrity evidence remains separately attributable.' };
const save = value => { writeFileSync(output+'.tmp',JSON.stringify(value,null,2)+'\n'); renameSync(output+'.tmp',output); };
if (existsSync(output)) {
 const previous = JSON.parse(readFileSync(output,'utf8'));
 if (previous.task === report.task) writeFileSync(`.phase2a02-implementation.local/transaction-attempt-${Date.now()}.json`,JSON.stringify(previous,null,2)+'\n');
}
save(report);
const sessions = new RunSessions();
const sql = query => sessions.sql(query);
const write = (command,options) => writeCommand(sessions,command,options);
let before, qualified = false, fixturesAttempted = false, one, two, first, second;
const races = [];
const snapshot = async () => JSON.parse(await sql(`SELECT jsonb_build_object(
 'history',(SELECT coalesce(jsonb_agg(to_jsonb(v) ORDER BY id),'[]'::jsonb) FROM public.property_location_versions v),
 'state',(SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY property_id),'[]'::jsonb) FROM public.property_location_intelligence_state s));`));
async function command(property=propA,actor=userA) {
 const parent=JSON.parse(await sql(`SELECT to_jsonb(p) FROM public.properties p WHERE id=${l(property)};`));
 const state=JSON.parse(await sql(`SELECT coalesce((SELECT to_jsonb(s) FROM public.property_location_intelligence_state s WHERE property_id=${l(property)}),'null'::jsonb);`));
 return {...Object.fromEntries(semanticFields.map(key=>[key,null])),property_id:property,actor_id:actor,operation_id:randomUUID(),property_input_hash:propertyInputHash(parent),
  expected_revision:state?.state_revision??'ABSENT',expected_current_id:state?.current_location_version_id??null,operation_kind:'APPEND_LOCATION',
  input_address:'Synthetic',coordinate_source:'NONE',coordinate_precision:'UNKNOWN',geocode_confidence:'UNKNOWN',confirmation_status:'UNCONFIRMED',change_reason:state?'ADDRESS_CHANGED':'INITIAL_INPUT'};
}
async function persisted(property,versionNumber,id,revision) {
 const actual=JSON.parse(await sql(`SELECT jsonb_build_object('versions',(SELECT jsonb_agg(version_number ORDER BY version_number) FROM public.property_location_versions WHERE property_id=${l(property)}),
 'historyRows',(SELECT count(*) FROM public.property_location_versions WHERE property_id=${l(property)}),
 'pointer',(SELECT current_location_version_id FROM public.property_location_intelligence_state WHERE property_id=${l(property)}),
 'revision',(SELECT state_revision FROM public.property_location_intelligence_state WHERE property_id=${l(property)}));`));
 assert.deepEqual(actual,{versions:Array.from({length:versionNumber},(_,i)=>i+1),historyRows:versionNumber,pointer:id,revision});
 return actual;
}
async function unchanged(action,matcher) {
 const prior=await snapshot();
 let rejected;
 await assert.rejects(action, error=>{ rejected=errorDetails(error); return matcher.test(error.message); });
 assert.deepEqual(await snapshot(),prior,'all history/state values including timestamps rolled back');
 return {rejection:rejected,snapshotSha256:sha(canonical(prior)),rollbackVerified:true};
}
async function runCase(id,execute) {
 const result=report.results.find(row=>row.id===id);
 result.startedAt=new Date().toISOString();
 try { result.evidence=await execute(); result.status='PASS'; result.actual='Fresh assertions completed'; }
 catch(error) { result.status='FAIL'; result.actual=error.message; result.error=errorDetails(error); throw error; }
 finally { result.finishedAt=new Date().toISOString(); save(report); }
}
try {
 report.safety=JSON.parse(readFileSync('docs/phase2a02-harness-safety-results.json','utf8'));
 assert.equal(report.safety.status,'PASS','Stage C must pass before database access');
 for (const [path,hash] of Object.entries(report.safety.sourceHashes)) assert.equal(sha(readFileSync(path)),hash,`Stage C source changed: ${path}`);
 const git = async args => (await boundedProcess('git',args)).trim();
 report.gitBefore={head:await git(['rev-parse','HEAD']),branch:await git(['branch','--show-current']),index:await git(['diff','--cached','--binary'])};
 assert.equal(report.gitBefore.head,'c9b6c4acc1879a2b84b89d3b39455f2489e4c56a');
 assert.equal(report.gitBefore.branch,'phase2-location-intelligence'); assert.equal(report.gitBefore.index,'');
 const qualification=await qualify(sql); before=qualification.before; report.target=qualification.evidence; qualified=true;
 save(report);
 fixturesAttempted=true;
 await sql('BEGIN;'+fixtureSQL+'COMMIT;');
 report.fixtureCreation=await fixtureCounts(sql);
 await runCase('TC01',async()=>{
  first=await command();
  assert.equal(first.expected_revision,'ABSENT');
  await unchanged(()=>write({...first,actor_id:userB}),/actual parent owner/);
  one=await write(first); assert.equal(one.retry,false); assert.equal(one.versionNumber,1);
  return await persisted(propA,1,one.id,1);
 });
 await runCase('TC02',async()=>{
  second=await command(); two=await write(second);
  assert.equal(two.versionNumber,2); assert.notEqual(one.id,two.id);
  return await persisted(propA,2,two.id,2);
 });
 await runCase('TC03',async()=>{
  const absent=await command(propA2),existing=await command(),results=[];
  for (const expected_revision of [undefined,null,-1,1.5,'0',9007199254740992]) results.push(await unchanged(()=>write({...absent,expected_revision}),/Expected revision required/));
  results.push(await unchanged(()=>write({...absent,expected_revision:0}),/expected revision/));
  results.push(await unchanged(()=>write({...existing,expected_revision:'ABSENT',expected_current_id:null}),/expected revision/));
  return {invalidAndWrongStateRejections:results,explicitAbsentAccepted:'TC01',exactExistingTokenAccepted:'TC02'};
 });
 await runCase('TC04',async()=>({
  staleRevision:await unchanged(()=>write({...second,operation_id:randomUUID()}),/expected revision/),
  stalePointer:await unchanged(async()=>write({...await command(),expected_current_id:one.id}),/expected current location/)
 }));
 await runCase('TC08',async()=>{
  const prior=await snapshot(),retry=await write(first);
  assert.deepEqual(retry,{id:one.id,versionNumber:1,retry:true});
  assert.deepEqual(await snapshot(),prior);
  return {retry,persisted:await persisted(propA,2,two.id,2)};
 });
 await runCase('TC09',()=>unchanged(()=>write({...first,input_address:'different'}),/same request identity/));
 await runCase('TC10',async()=>{
  const delayed=await command();
  await sql(`UPDATE public.properties SET full_address='Changed independently' WHERE id=${l(propA)};`);
  return {changedInput:await unchanged(()=>write(delayed),/current property-input hash/),stalePublication:'TC04'};
 });
 await runCase('TC11',async()=>{
  const former=await command(propB,userB);
  await sql(`UPDATE public.properties SET user_id=${l(userA)} WHERE id=${l(propB)};`);
  const ownerResult=await unchanged(()=>write(former),/actual parent owner/);
  const deleted=await command(propB,userA);
  await sql(`DELETE FROM public.properties WHERE id=${l(propB)};`);
  const deletedResult=await unchanged(()=>write(deleted),/deleted parent/);
  assert.equal(await sql(`SELECT count(*) FROM public.properties WHERE id=${l(propB)};`),'0');
  return {ownerResult,deletedResult,parentRecreated:false};
 });
 for (const [id,failAt] of [['TC12','after-insert'],['TC13','after-pointer'],['TC14','commit']]) await runCase(id,async()=>{
  const results=[];
  for (const property of [propA2,propA]) {
   const cmd=await command(property);
   const result=await unchanged(()=>write(cmd,{failAt}),failAt==='commit'?/ERROR:\s+23503:/ : /injected/);
   if(failAt==='commit') { assert.match(result.rejection.message,/tc02_deferred_fk/); assert.equal(result.rejection.sqlstate,'23503'); }
   results.push({property,wasAbsent:cmd.expected_revision==='ABSENT',...result});
  }
  return {results,commitMechanism:failAt==='commit'?'Temporary ON COMMIT DROP tables with INITIALLY DEFERRED FK; orphan accepted by INSERT, rejected by actual COMMIT; permanent guards untouched':undefined};
 });
 for (const [id,property,version] of [['TC05',propA2,1],['TC06',propA,3]]) await runCase(id,async()=>{
  const cmd=await command(property),rival={...cmd,operation_id:randomUUID()};
  const race=await coordinateRace({start:(kind,options)=>write(kind==='winner'?cmd:rival,options),observe:(a,b)=>observeBlocking(a,b,sql)});
  assert.match(race.loser.error?.message??'',/expected revision/);
  const state=await persisted(property,version,race.winner.id,version);
  races.push(race.evidence);
  return {blocking:race.evidence,winner:race.winner,loser:errorDetails(race.loser.error),persisted:state};
 });
 await runCase('TC07',async()=>{
  assert.equal(races.length,2);
  for (const evidence of races) { assert.ok(evidence.blockers.includes(evidence.firstPid)); assert.equal(evidence.waitType,'Lock'); assert.ok(evidence.ungrantedLocks>0); }
  return {races};
 });
} catch(error) {
 if (!report.results.some(row=>row.status==='FAIL')) report.harnessErrors.push({stage:qualified?'execution':'qualification',...errorDetails(error)});
} finally {
 await finalizeReport(report,{
  sessions:()=>sessions.finish(),
  cleanup:async()=>{
   if (!qualified || !fixturesAttempted) return {status:'NOT REQUIRED',reason:'No fixture writes attempted'};
   await sql(`BEGIN; DELETE FROM auth.users WHERE id IN (${users.map(l).join(',')}); COMMIT;`);
   const counts=await fixtureCounts(sql);
   assert.ok(Object.values(counts).every(count=>count===0),`fixture remnants: ${JSON.stringify(counts)}`);
   return {status:'PASS',counts};
  },
  verify:async()=>{
   if(!before) return {status:'NOT EXECUTED',reason:'Pre-test qualification did not complete'};
   const after=await preservationSnapshot(sql);
   writeFileSync('.phase2a02-implementation.local/test-closure-02-posttest.json',JSON.stringify(after,null,2)+'\n');
   assert.deepEqual(after,before,'pre-test data and complete catalog must be preserved');
   const sessionEvidence=await sessions.finish();
   const head=(await boundedProcess('git',['rev-parse','HEAD'])).trim();
   const index=(await boundedProcess('git',['diff','--cached','--binary'])).trim();
   assert.equal(head,report.gitBefore.head); assert.equal(index,report.gitBefore.index);
   return {status:'PASS',beforeSha256:sha(canonical(before)),afterSha256:sha(canonical(after)),data:after.data,
    phase1:true,phase2a01:true,phase2a02:true,postgis:true,gitHeadAndIndexPreserved:true,finalSessions:sessionEvidence};
  },
  write:value=>{ value.finishedAt=new Date().toISOString(); value.transactionClosure=value.status==='PASS'?'GO':'BLOCKED';
   value.recommendation='BLOCKED'; value.remainingAcceptanceGaps=['Separately designated clean installation','Full incompatible-extension/role/guard-attachment qualification','Representative GiST plan','Future-handler authentication and T15 browser regression']; save(value); }
 });
}
console.log(JSON.stringify({status:report.status,summary:report.summary,harnessErrors:report.harnessErrors,cleanup:report.cleanup,preservation:report.preservation?.status}));
if(report.status!=='PASS') process.exitCode=1;
