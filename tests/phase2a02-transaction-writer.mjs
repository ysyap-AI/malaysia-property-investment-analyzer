// Synthetic D06 contract; no runtime handler or trusted authentication implementation.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { propertyInputHash,operationHash,semanticFields } from './phase2a02-command-contract.mjs';
import { insert,literal as l } from './phase2a01-contract-fixtures.mjs';

export async function writeCommand(sessions,command,{afterLock,onPid,failAt}={}) {
 const db=sessions.session();
 let primaryError;
 try {
  const pid=Number(await db.send('SELECT pg_backend_pid();'));
  assert.ok(Number.isSafeInteger(pid));
  onPid?.(pid);
  await db.send('BEGIN; SET LOCAL ROLE service_role;');
  const parentText=await db.send(`SELECT to_jsonb(p) FROM public.properties p WHERE id=${l(command.property_id)} FOR UPDATE;`);
  assert.ok(parentText,'deleted parent');
  const parent=JSON.parse(parentText);
  assert.equal(parent.user_id,command.actor_id,'actual parent owner');
  assert.equal(propertyInputHash(parent),command.property_input_hash,'current property-input hash');
  await afterLock?.(pid);
  const hash=operationHash(command);
  const recorded=await db.send(`SELECT jsonb_build_object('id',id,'operation_hash',operation_hash,'version_number',version_number) FROM public.property_location_versions WHERE property_id=${l(command.property_id)} AND operation_id=${l(command.operation_id)};`);
  if(recorded) {
   const prior=JSON.parse(recorded);
   assert.equal(prior.operation_hash,hash,'same request identity requires same payload');
   await db.send('ROLLBACK;');
   return {id:prior.id,versionNumber:prior.version_number,retry:true}; // never republish an older operation
  }
  const stateText=await db.send(`SELECT to_jsonb(s) FROM public.property_location_intelligence_state s WHERE property_id=${l(command.property_id)} FOR UPDATE;`);
  const state=stateText?JSON.parse(stateText):null;
  assert.equal(command.expected_revision,state?state.state_revision:'ABSENT','expected revision');
  assert.equal(command.expected_current_id,state?.current_location_version_id??null,'expected current location');
  if(!state) await db.send(`INSERT INTO public.property_location_intelligence_state(property_id) VALUES(${l(command.property_id)});`);
  const latest=BigInt(await db.send(`SELECT coalesce(max(version_number),0)::text FROM public.property_location_versions WHERE property_id=${l(command.property_id)};`));
  assert.ok(latest<9007199254740991n,'safe version bound');
  assert.ok(command.change_reason!=='INITIAL_INPUT'||latest===0n,'INITIAL_INPUT only for first version');
  const row={...Object.fromEntries(semanticFields.map(key=>[key,command[key]])),id:randomUUID(),property_id:command.property_id,
   version_number:Number(latest+1n),operation_id:command.operation_id,operation_hash:hash,property_input_hash:command.property_input_hash,created_by:command.actor_id};
  await db.send(insert('property_location_versions',row)+';');
  if(failAt==='after-insert') throw Error('injected after insert');
  const changed=await db.send(`WITH updated AS(UPDATE public.property_location_intelligence_state SET current_location_version_id=${l(row.id)} WHERE property_id=${l(command.property_id)} AND state_revision=${state?.state_revision??0} RETURNING *) SELECT count(*) FROM updated;`);
  assert.equal(changed,'1','CAS must publish exactly one row');
  if(failAt==='after-pointer') throw Error('injected after pointer');
  if(failAt==='commit') {
   // Transaction-local tables only: leave every permanent guard/constraint enabled.
   await db.send(`RESET ROLE;
    CREATE TEMP TABLE tc02_commit_parent(id integer PRIMARY KEY) ON COMMIT DROP;
    CREATE TEMP TABLE tc02_commit_child(id integer CONSTRAINT tc02_deferred_fk REFERENCES tc02_commit_parent(id) DEFERRABLE INITIALLY DEFERRED) ON COMMIT DROP;
    INSERT INTO tc02_commit_child VALUES(1);`);
  }
  await db.send('COMMIT;');
  return {id:row.id,versionNumber:row.version_number,retry:false};
 } catch(error) { primaryError=error; throw error; }
 finally {
  try { await db.close(); }
  catch(cleanup) { throw new AggregateError([...(primaryError?[primaryError]:[]),cleanup],'writer cleanup failed'); }
 }
}
