// Seed at M4, then verify after M5/M6: genuine pre-metadata nullable rows.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
const db="supabase_db_mpia-post-m7-disposable-20261031";
const owner="b0700000-0000-4000-8000-000000000001";
const id="b0700000-0000-4000-8000-000000000002";
function sql(text) {
  const r=spawnSync("docker",["exec","-i",db,"psql","-U","postgres","-d","postgres","-XAtq","-v","ON_ERROR_STOP=1"],{input:text,encoding:"utf8",timeout:20000});
  assert.equal(r.status,0,r.stderr);return r.stdout.trim();
}
if(process.argv.includes("--seed")) {
  assert.equal(sql("SELECT count(*) FROM supabase_migrations.schema_migrations"),"8");
  sql(`BEGIN;
    INSERT INTO auth.users(id,email) VALUES('${owner}','post-m7-legacy@example.test');
    INSERT INTO public.properties(id,user_id,project_name,country,asking_price,expected_monthly_rent,notes)
      VALUES('${id}','${owner}','SYNTHETIC pre-M5 nullable legacy',NULL,NULL,NULL,'');
    INSERT INTO public.acquisition_costs(property_id,purchase_price,valuation_fee) VALUES('${id}',NULL,NULL);
    INSERT INTO public.financing(property_id,loan_amount,down_payment) VALUES('${id}',NULL,NULL);
    INSERT INTO public.operating_expenses(property_id,annual_maintenance_fee,annual_sinking_fund) VALUES('${id}',NULL,NULL);
    COMMIT;`);
  console.log("PASS: seeded nullable property/three child records before M5/M6");
} else {
  assert.equal(sql("SELECT count(*) FROM supabase_migrations.schema_migrations"),"10");
  const snapshot=()=>JSON.parse(sql(`BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='${owner}'; SELECT public.m4_property_snapshot('${id}'); COMMIT;`));
  const s=snapshot();
  assert.equal(s.property.country,null);assert.equal(s.property.asking_price,null);assert.equal(s.property.notes,"");
  assert.equal(s.property.expected_monthly_rent,null);assert.equal(s.property.investment_strategy_assumptions,null);
  for(const table of ["property","acquisition_costs","financing","operating_expenses"]) assert.equal(s[table].evidence_metadata,null);
  assert.equal(s.acquisition_costs.purchase_price,null);assert.equal(s.financing.loan_amount,null);assert.equal(s.operating_expenses.annual_maintenance_fee,null);
  sql(`BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='${owner}'; SELECT public.m4_write_property('${id}',${s.property.revision},'properties','{"city":"Ipoh"}'); COMMIT;`);
  const next=snapshot();assert.equal(next.property.revision,s.property.revision+1);assert.equal(next.property.city,"Ipoh");
  for(const table of ["acquisition_costs","financing","operating_expenses"]) assert.deepEqual(next[table],s[table]);
  sql(`BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='${owner}'; SELECT public.m4_write_property('${id}',${next.property.revision},'properties','{}',true); COMMIT;`);
  for(const table of ["acquisition_costs","financing","operating_expenses"]) assert.equal(sql(`SELECT count(*) FROM public.${table} WHERE property_id='${id}'`),"0");
  console.log("PASS: pre-M5 nullable records survive full chain, owner snapshot/PATCH preserve nulls, revision advances and deletion cascades");
}
