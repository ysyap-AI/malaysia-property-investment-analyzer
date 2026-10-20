import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { sql } from './phase2a02-local-target.mjs';
import { RunSessions, observeBlocking as observe } from './phase2a02-transaction-runtime.mjs';
const sessions = new RunSessions();
export const session = () => sessions.session();
export const observeBlocking = (firstPid, secondPid) => observe(firstPid, secondPid, query => sessions.sql(query));

export async function proveContention() {
 const user=randomUUID(),property=randomUUID(),results=[];
 sql(`BEGIN; INSERT INTO auth.users(id,email) VALUES('${user}','quality-${user}@example.invalid');
 INSERT INTO public.properties(id,user_id,project_name) VALUES('${property}','${user}','Synthetic lock fixture');
 INSERT INTO public.property_location_intelligence_state(property_id) VALUES('${property}'); COMMIT;`);
 try {
  for(const firstCreation of [false,true]) {
   // Parent remains; only remove state by rolling back the first-creation fixture
   // on a different property, never by granting runtime DELETE.
   const p=firstCreation?randomUUID():property;
   if(firstCreation) sql(`INSERT INTO public.properties(id,user_id,project_name) VALUES('${p}','${user}','Synthetic first writer');`);
   const a=session(),b=session();
   try {
    const firstPid=Number(await a.send('SELECT pg_backend_pid();'));
    const secondPid=Number(await b.send('SELECT pg_backend_pid();'));
    const update=`WITH changed AS (UPDATE public.property_location_intelligence_state SET state_revision=0 WHERE property_id='${p}' AND state_revision=0 RETURNING *) SELECT count(*) FROM changed;`;
    const winner=await a.send(`BEGIN; SET LOCAL ROLE service_role;
      ${firstCreation?`SELECT id FROM public.properties WHERE id='${p}' FOR UPDATE; INSERT INTO public.property_location_intelligence_state(property_id) VALUES('${p}');`:''}
      ${update}`);
    assert.equal(winner.split(/\r?\n/).at(-1),'1');
    const waiting=b.send(`BEGIN; SET LOCAL ROLE service_role;
      ${firstCreation?`SELECT id FROM public.properties WHERE id='${p}' FOR UPDATE;`:''}
      ${firstCreation?`SELECT count(*) FROM public.property_location_intelligence_state WHERE property_id='${p}';`:update}`);
    // Attach rejection handler immediately while coordinator observes the wait.
    const observedPromise=waiting.then(value=>({value}),error=>({error}));
    const evidence=await observeBlocking(firstPid,secondPid);
    await a.send('COMMIT;');
    const outcome=await observedPromise;
    if(outcome.error) throw outcome.error;
    assert.equal(outcome.value.split(/\r?\n/).at(-1),firstCreation?'1':'0');
    await b.send('ROLLBACK;');
    assert.equal(sql(`SELECT state_revision FROM public.property_location_intelligence_state WHERE property_id='${p}'`),'1');
    results.push({case:firstCreation?'parent lock serializes first-state creation':'competing expected-revision updates',firstPid,secondPid,evidence,winner:1,loser:firstCreation?'observed existing state; ABSENT command rejected':'zero changed rows'});
   } finally { await Promise.all([a.close(),b.close()]); }
  }
 } finally { sql(`DELETE FROM auth.users WHERE id='${user}';`); }
 return results;
}
