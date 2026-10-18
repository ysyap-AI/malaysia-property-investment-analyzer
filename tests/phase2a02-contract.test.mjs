import { test } from 'node:test';
import assert from 'node:assert/strict';
import { propertyInputBytes,propertyInputHash,operationBytes,operationHash,semanticFields } from './phase2a02-command-contract.mjs';
const property={project_name:'Synthetic',full_address:null,city:'Kuala Lumpur',district:null,state:'WP Kuala Lumpur',postcode:'50000',country:'Malaysia'};
const command={...Object.fromEntries(semanticFields.map(key=>[key,null])),property_id:'f1000000-0000-0000-0000-000000000001',actor_id:'f2000000-0000-0000-0000-000000000001',expected_revision:'ABSENT',expected_current_id:null,property_input_hash:'a'.repeat(64),operation_kind:'APPEND_LOCATION',coordinate_source:'USER_PIN',source_crs:'EPSG:4326',longitude:101.6869,latitude:3.139,coordinate_precision:'USER_PIN',geocode_confidence:'UNKNOWN',confirmation_status:'REVIEW_REQUIRED',change_reason:'INITIAL_INPUT'};
test('property tuple exact UTF-8 bytes and null/empty distinction',()=>{
 assert.equal(propertyInputBytes(property),'["mpia-property-location-input-v1","Synthetic",null,"Kuala Lumpur",null,"WP Kuala Lumpur","50000","Malaysia"]');
 assert.notEqual(propertyInputHash(property),propertyInputHash({...property,full_address:''}));
 assert.notEqual(propertyInputHash(property),propertyInputHash({...property,city:'Kuala Lumpur '}));
 assert.throws(()=>propertyInputHash({...property,country:undefined}));
});
test('financial edits do not affect captured input hash; address edits do',()=>{
 assert.equal(propertyInputHash(property),propertyInputHash({...property,purchase_price:100,updated_at:'2099-01-01'}));
 assert.notEqual(propertyInputHash(property),propertyInputHash({...property,city:'Johor Bahru'}));
});
test('operation exact ordered bytes, independent of object order/generated fields',()=>{
 const expected='["mpia-location-command-v1","f1000000-0000-0000-0000-000000000001","f2000000-0000-0000-0000-000000000001","ABSENT",null,"'+ 'a'.repeat(64)+'","APPEND_LOCATION",null,null,null,101.6869,3.139,"USER_PIN","EPSG:4326",null,null,null,"USER_PIN",null,"UNKNOWN",null,"REVIEW_REQUIRED",null,"INITIAL_INPUT"]';
 assert.equal(operationBytes(command),expected);
 assert.equal(operationHash(command),operationHash({...Object.fromEntries(Object.entries(command).reverse()),id:'ignored',created_at:'ignored',position:'ignored'}));
 assert.notEqual(operationHash(command),operationHash({...command,expected_revision:0}));
 assert.notEqual(operationHash(command),operationHash({...command,longitude:101.687}));
});
test('semantic metadata changes affect operation identity; negative zero is canonical',()=>{
 for(const key of ['input_address','normalized_address','normalization_version','provider_candidate_id','retrieved_at','confidence_mapping_version','confirmation_status','change_reason']) {
  assert.notEqual(operationHash(command),operationHash({...command,[key]:'changed'}),key);
 }
 assert.equal(operationHash({...command,longitude:-0}),operationHash({...command,longitude:0}));
});
test('invalid/nonfinite coordinates, unsupported CRS and missing tokens fail before hashing',()=>{
 for(const patch of [{longitude:NaN},{latitude:Infinity},{latitude:-Infinity},{longitude:180.0000001},{latitude:-90.0000001},{longitude:null},{source_crs:'EPSG:3857'},{expected_revision:undefined},{expected_revision:9007199254740992},{expected_current_id:undefined},{accuracy_m:0}]) assert.throws(()=>operationHash({...command,...patch}));
 for(const [longitude,latitude] of [[180,90],[-180,-90],[0,0]]) assert.doesNotThrow(()=>operationHash({...command,longitude,latitude}));
});
