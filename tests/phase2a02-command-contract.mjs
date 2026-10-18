// Synthetic contract fixture only; not a runtime endpoint, adapter or writer.
import { createHash } from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes,'utf8').digest('hex');
export const inputFields=['project_name','full_address','city','district','state','postcode','country'];
export function propertyInputBytes(property) {
 for(const key of inputFields) if(property[key]!==null && typeof property[key]!=='string') throw Error('Missing/invalid input '+key);
 return JSON.stringify(['mpia-property-location-input-v1',...inputFields.map(key=>property[key])]);
}
export const propertyInputHash=property=>hash(propertyInputBytes(property));
export const semanticFields=['input_address','normalized_address','normalization_version','longitude','latitude',
 'coordinate_source','source_crs','provider_version_id','provider_candidate_id','retrieved_at',
 'coordinate_precision','accuracy_m','geocode_confidence','confidence_mapping_version','confirmation_status','confirmed_by','change_reason'];
export function operationBytes(command) {
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
 for(const key of ['property_id','actor_id']) if(!uuid.test(command[key]??'')) throw Error('Canonical UUID required');
 if(!/^[0-9a-f]{64}$/.test(command.property_input_hash??'')) throw Error('Input hash required');
 if(command.expected_revision!=='ABSENT' && (!Number.isSafeInteger(command.expected_revision)||command.expected_revision<0)) throw Error('Expected revision required');
 if(command.expected_current_id!==null && !uuid.test(command.expected_current_id??'')) throw Error('Expected pointer required');
 if(command.expected_revision==='ABSENT' && command.expected_current_id!==null) throw Error('ABSENT requires null pointer');
 if(!['APPEND_LOCATION'].includes(command.operation_kind)) throw Error('Unsupported operation');
 for(const key of semanticFields) {
  const value=command[key];
  const expectedType=['longitude','latitude','accuracy_m'].includes(key)?'number':'string';
  if(value===undefined || (value!==null && typeof value!==expectedType)) throw Error('Explicit typed field required: '+key);
  if(typeof value==='number' && !Number.isFinite(value)) throw Error('Nonfinite value');
 }
 for(const [key,bound] of [['longitude',180],['latitude',90]]) {
  const value=command[key];
  if(value!==null && (typeof value!=='number'||value < -bound||value > bound)) throw Error('Invalid coordinate');
 }
 if((command.longitude===null)!==(command.latitude===null)) throw Error('Coordinate pair required');
 if(command.longitude!==null && command.source_crs!=='EPSG:4326') throw Error('Unsupported CRS');
 if(command.accuracy_m!==null && (typeof command.accuracy_m!=='number'||command.accuracy_m<=0)) throw Error('Invalid accuracy');
 // Fixed-order typed JSON; JSON canonicalizes negative zero, preserves null/empty
 // and original address strings. No object-key order or delimiter ambiguity.
 return JSON.stringify(['mpia-location-command-v1',command.property_id,command.actor_id,
  command.expected_revision,command.expected_current_id,command.property_input_hash,command.operation_kind,
  ...semanticFields.map(key=>command[key])]);
}
export const operationHash=command=>hash(operationBytes(command));
