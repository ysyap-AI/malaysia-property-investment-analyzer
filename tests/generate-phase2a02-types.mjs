// Offline scoped generation from the verified local PostgreSQL catalog capture.
// This is a catalog-driven generator, not output from Supabase CLI/postgres-meta.
import assert from 'node:assert/strict';
import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import prettier from 'prettier';
const hash=text=>createHash('sha256').update(text).digest('hex');
const evidence='docs/phase2a02-schema-verification.json';
const verified=JSON.parse(readFileSync(evidence,'utf8'));
assert.equal(verified.status,'PASS'); assert.equal(verified.baselinePreserved,true);
for(const name of ['database','installation','commit']) {
 const report=JSON.parse(readFileSync(`docs/phase2a02-${name}-results.json`,'utf8'));
 assert.match(report.status,/^PASS/);
 assert.equal(report.target.container,verified.target.container);
}
const installation=JSON.parse(readFileSync('docs/phase2a02-installation-results.json','utf8'));
assert.equal(installation.migrationSha256,hash(readFileSync('supabase/migrations/20261017000000_phase2a02_property_locations.sql')));
const path='src/integrations/supabase/types.ts';
const baseline=execFileSync('git',['show','HEAD:'+path],{encoding:'utf8'});
const parse=text=>ts.createSourceFile('types.ts',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const key=node=>node.name?.text;
const tables=file=>file.statements.find(n=>ts.isTypeAliasDeclaration(n)&&key(n)==='Database').type.members.find(n=>key(n)==='public').type.members.find(n=>key(n)==='Tables').type;
const oldTables=tables(parse(baseline)); assert.equal(oldTables.members.length,11);
const names=['property_location_intelligence_state','property_location_versions'];
function scalar(column) {
 const mapping={uuid:'string',text:'string',timestamptz:'string',int8:'number',float8:'number',int4:'number',geography:'unknown'};
 assert.ok(Object.hasOwn(mapping,column.typeName),column.typeName);
 const type=mapping[column.typeName];
 return type+(column.nullable&&type!=='unknown'?' | null':'');
}
function table(name) {
 const columns=verified.catalog.columns.filter(c=>c.table===name);
 assert.equal(columns.length,name===names[0]?8:27);
 const shapes=['Row','Insert','Update'].map(shape=>shape+': {'+columns.map(c=>{
  const generated=!!c.generated;
  const optional=shape==='Update'||shape==='Insert'&&(c.nullable||c.default!==null||generated);
  const type=shape!=='Row'&&generated?'never':scalar(c);
  return c.name+(optional?'?':'')+': '+type;
 }).join(';')+'}');
 shapes.splice(1,0,'ComputedFields: never');
 const relationships=verified.catalog.relationships.filter(r=>r.table===name).map(r=>`{
 foreignKeyName: ${JSON.stringify(r.name)}; columns: ${JSON.stringify(r.columns)};
 isOneToOne: ${r.isOneToOne}; referencedRelation: ${JSON.stringify(r.referencedRelation)};
 referencedColumns: ${JSON.stringify(r.referencedColumns)};
 }`);
 return name+': {'+shapes.join(';')+'; Relationships: ['+relationships.join(',')+']}';
}
const formatted=await prettier.format('type Scoped = {\n'+names.map(table).join('\n')+'\n}',{parser:'typescript',semi:false,tabWidth:2,quoteProps:'as-needed'});
const content=formatted.slice(formatted.indexOf('{')+1,formatted.lastIndexOf('}')).trim();
const block=content.split('\n').map((line,i)=>i?'    '+line:line).join('\n');
const state=oldTables.members.find(n=>key(n)===names[0]);
const generated=baseline.slice(0,state.getStart())+block+baseline.slice(state.end);
const after=tables(parse(generated)); assert.equal(after.members.length,12);
const unchanged=oldTables.members.filter(n=>key(n)!==names[0]);
for(const member of unchanged) assert.equal(after.members.find(n=>key(n)===key(member)).getText(),member.getText());
const current=readFileSync(path,'utf8').replaceAll('\r\n','\n');
assert.ok(current===baseline.replaceAll('\r\n','\n')||current===generated.replaceAll('\r\n','\n'),'Refuse to overwrite unrelated type edits');
mkdirSync('.phase2a02-implementation.local',{recursive:true});
writeFileSync('.phase2a02-implementation.local/baseline-types.ts',baseline);
writeFileSync(path,generated);
const parity=`import type { Database as Old } from './baseline-types';
import type { Database as New } from '../src/integrations/supabase/types';
type Equal<A,B>=(<T>()=>T extends A?1:2) extends (<T>()=>T extends B?1:2)?true:false;
type Assert<T extends true>=T;
`+unchanged.flatMap(n=>['Row','Insert','Update','Relationships'].map(s=>`type Check_${key(n)}_${s}=Assert<Equal<Old['public']['Tables']['${key(n)}']['${s}'],New['public']['Tables']['${key(n)}']['${s}']>>;`)).join('\n')+
['Row','Insert','Update'].map(s=>`\ntype State_${s}=Assert<Equal<Old['public']['Tables']['${names[0]}']['${s}'],Omit<New['public']['Tables']['${names[0]}']['${s}'],'current_location_version_id'>>>;`).join('')+
`\ntype State_relationship=Assert<Equal<Old['public']['Tables']['${names[0]}']['Relationships'][0],Extract<New['public']['Tables']['${names[0]}']['Relationships'][number],{referencedRelation:'properties'}>>>;`;
writeFileSync('.phase2a02-implementation.local/type-parity.ts',parity);
execFileSync(process.execPath,['node_modules/typescript/bin/tsc','--noEmit','--strict','--skipLibCheck','--target','es2022','--moduleResolution','bundler','--module','esnext','.phase2a02-implementation.local/type-parity.ts'],{stdio:'pipe'});
const report={date:'2026-10-18',status:'PASS',method:'Scoped catalog-driven Supabase-compatible generation; not Supabase CLI output',source:evidence,sourceSha256:hash(readFileSync(evidence)),target:verified.target,destination:path,destinationSha256:hash(readFileSync(path)),unchangedTables:unchanged.map(key),preservedTypeContracts:44,modifiedTable:names[0],addedTable:names[1],geography:'Row unknown (includes null); Insert/Update optional never',preservedPostgrestVersion:'14.5',limitations:['Types confer no database permissions','Synthetic writer/concurrency acceptance remains unexecuted; catalog, SQL assertions and committed cascades passed']};
writeFileSync('docs/phase2a02-type-generation.json',JSON.stringify(report,null,2)+'\n');
console.log('PASS: 44 existing contracts preserved; generated history and nullable composite state pointer from verified local catalog');
