/** Experimental offline reference. No application imports, I/O, or SQL facilities. */
import { createHash } from 'node:crypto';

export const VERSION = 'i06-d-canon-reference-1';
export const SIGN = 1n << 63n, MAX = 0x7fefffffffffffffn;
const MASK = SIGN - 1n, FRAC = (1n << 52n) - 1n;
const powers = [1n];
function pow10(n) {
  if (!Number.isInteger(n) || n < 0 || n > 1200) throw Error('arithmetic budget');
  while (powers.length <= n) powers.push(powers.at(-1) * 10n);
  return powers[n];
}
function check(ok, rule = 'invalid reference input') { if (!ok) throw Error(rule); }
const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
export function numberBits(value) {
  check(typeof value === 'number');
  const b = Buffer.allocUnsafe(8); b.writeDoubleBE(value); return b.readBigUInt64BE();
}
export function bitsNumber(bits) {
  const b = Buffer.allocUnsafe(8); b.writeBigUInt64BE(bits); return b.readDoubleBE();
}
function dyadic(m, e) { return e >= 0 ? { n: m << BigInt(e), d: 1n } : { n: m, d: 1n << BigInt(-e) }; }
export function rational(bits) {
  const b = bits & MASK; check(b <= MAX, 'nonfinite');
  const E = Number(b >> 52n), m = (b & FRAC) + (E ? 1n << 52n : 0n);
  return dyadic(m, E ? E - 1075 : -1074);
}
/** Actual unequal neighbor spacing at powers of two; virtual next value at overflow. */
export function interval(bits) {
  const b = bits & MASK; check(b > 0n && b <= MAX, 'nonzero finite interval');
  const E = Number(b >> 52n), f = b & FRAC, m = f + (E ? 1n << 52n : 0n);
  const e = E ? E - 1075 : -1074;
  const low = dyadic(4n * m - (E > 1 && f === 0n ? 1n : 2n), e - 2);
  const high = dyadic(4n * m + 2n, e - 2);
  return { low, high, closed: (m & 1n) === 0n, value: dyadic(m, e) };
}
function compareR(a, b) { return cmp(a.n * b.d, b.n * a.d); }
function nearest(n, d) {
  let q = n / d; const r = n % d;
  if (r * 2n > d || (r * 2n === d && (q & 1n))) q++;
  return q;
}
/** Exact nonnegative rational -> binary64, with explicit interval certificate. */
export function roundRational(n, d, negative = false) {
  check(typeof n === 'bigint' && typeof d === 'bigint' && n >= 0n && d > 0n);
  check(n.toString(2).length <= 4096 && d.toString(2).length <= 4096, 'arithmetic budget');
  if (!n) return negative ? SIGN : 0n;
  let e = n.toString(2).length - d.toString(2).length;
  if (e >= 0 ? n < (d << BigInt(e)) : (n << BigInt(-e)) < d) e--;
  if (e > 1023) throw Error('overflow');
  const unit = Math.max(-1074, e - 52);
  const m = unit >= 0 ? nearest(n, d << BigInt(unit)) : nearest(n << BigInt(-unit), d);
  let b;
  if (m === 0n) b = 0n;
  else if (unit === -1074 && m < (1n << 52n)) b = m;
  else {
    let sig = m, exponent = unit + 52;
    if (sig === (1n << 53n)) { sig >>= 1n; exponent++; }
    if (exponent > 1023) throw Error('overflow');
    b = (BigInt(exponent + 1023) << 52n) | (sig - (1n << 52n));
  }
  if (b) {
    const i = interval(b), r = { n, d }, l = compareR(r, i.low), h = compareR(r, i.high);
    check((l > 0 || (l === 0 && i.closed)) && (h < 0 || (h === 0 && i.closed)), 'rounding certificate');
  } else check(n * (1n << 1075n) <= d, 'zero interval certificate');
  return b | (negative ? SIGN : 0n);
}
/** Decimal extraction never invokes a host decimal-to-Number conversion. */
export function decimalParts(token, budget = 25) {
  check(typeof token === 'string' && token.length <= budget, 'token budget');
  const m = /^(-?)(0|[1-9][0-9]*)(?:\.([0-9]+))?(?:[eE]([+-]?[0-9]+))?$/.exec(token);
  check(m, 'number grammar');
  const expText = m[4] ?? '0'; check(expText.replace(/^[+-]/, '').length <= 4, 'exponent budget');
  let exponent = 0;
  for (const c of expText.replace(/^[+-]/, '')) exponent = exponent * 10 + c.charCodeAt(0) - 48;
  if (expText[0] === '-') exponent = -exponent;
  exponent -= (m[3] ?? '').length;
  check(exponent >= -1100 && exponent <= 1100, 'exponent budget');
  const coefficient = BigInt(m[2] + (m[3] ?? ''));
  const n = exponent >= 0 ? coefficient * pow10(exponent) : coefficient;
  const d = exponent >= 0 ? 1n : pow10(-exponent);
  return { coefficient, exponent, negative: m[1] === '-', n, d };
}
function decimalOrder({ n, d }) {
  let e = n.toString().length - d.toString().length;
  if (e >= 0 ? n < d * pow10(e) : n * pow10(-e) < d) e--;
  return e + 1;
}
function scale({ n, d }, q) { return q >= 0 ? { n, d: d * pow10(q) } : { n: n * pow10(-q), d }; }
function endpoint(r, q, lower, closed) {
  const { n, d } = scale(r, q), a = n / d, rem = n % d;
  return lower ? a + (rem || !closed ? 1n : 0n) : a - (!rem && !closed ? 1n : 0n);
}
/** Minimum digits, closest exact decimal, ties to even decimal significand. */
export function formatBits(bits) {
  check(typeof bits === 'bigint' && bits >= 0n && bits < (1n << 64n));
  const b = bits & MASK; check(b <= MAX, 'nonfinite');
  if (!b) return '0';
  const { low, high, closed, value } = interval(b);
  const minN = decimalOrder(low), maxN = decimalOrder(high);
  for (let k = 1; k <= 17; k++) {
    let best;
    for (let n = minN; n <= maxN; n++) {
      const q = n - k;
      const lo = endpoint(low, q, true, closed), hi = endpoint(high, q, false, closed);
      const a = lo > pow10(k - 1) ? lo : pow10(k - 1);
      const z = hi < pow10(k) - 1n ? hi : pow10(k) - 1n;
      if (a > z) continue;
      const v = scale(value, q);
      let s = nearest(v.n, v.d); if (s < a) s = a; if (s > z) s = z;
      const dec = q >= 0 ? { n: s * pow10(q), d: 1n } : { n: s, d: pow10(-q) };
      const diff = dec.n * value.d - value.n * dec.d;
      const distance = { n: diff < 0n ? -diff : diff, d: dec.d * value.d };
      const order = best ? compareR(distance, best.distance) : -1;
      if (order < 0 || (order === 0 && !(s & 1n) && (best.s & 1n))) best = { s, n, distance };
    }
    if (!best) continue;
    const s = best.s.toString(), n = best.n;
    let out;
    if (n >= k && n <= 21) out = s + '0'.repeat(n - k);
    else if (n > 0 && n <= 21) out = s.slice(0, n) + '.' + s.slice(n);
    else if (n > -6 && n <= 0) out = '0.' + '0'.repeat(-n) + s;
    else out = s[0] + (k > 1 ? '.' + s.slice(1) : '') + 'e' + (n - 1 >= 0 ? '+' : '-') + BigInt(Math.abs(n - 1)).toString();
    return (bits & SIGN ? '-' : '') + out;
  }
  throw Error('17-digit sufficiency violated');
}
export function parseNumeric(token, slot = 'float') {
  check(['float', 'revision', 'longitude', 'latitude', 'accuracy'].includes(slot), 'slot');
  if (slot === 'revision') {
    check(/^(0|[1-9][0-9]{0,15})$/.test(token), 'revision grammar');
    check(BigInt(token) <= 9007199254740991n, 'unsafe revision');
  }
  const decimal = decimalParts(token), bits = roundRational(decimal.n, decimal.d, decimal.negative);
  check(formatBits(bits) === token, 'noncanonical number');
  const r = rational(bits), negative = Boolean(bits & SIGN);
  if (slot === 'longitude' || slot === 'latitude') check(r.n <= BigInt(slot === 'longitude' ? 180 : 90) * r.d, 'coordinate bounds');
  if (slot === 'accuracy') check(!negative && (bits & MASK) !== 0n, 'positive accuracy');
  return { bits, ...decimal };
}

export const propertyFields = ['project_name', 'full_address', 'city', 'district', 'state', 'postcode', 'country'];
export const semanticFields = ['input_address','normalized_address','normalization_version','longitude','latitude','coordinate_source','source_crs','provider_version_id','provider_candidate_id','retrieved_at','coordinate_precision','accuracy_m','geocode_confidence','confidence_mapping_version','confirmation_status','confirmed_by','change_reason'];
export function validText(value, max = Number.MAX_SAFE_INTEGER, nonblank = false) {
  check(typeof value === 'string', 'text type'); let count = 0;
  for (const scalar of value) {
    const p = scalar.codePointAt(0); check(p !== 0 && !(p >= 0xd800 && p <= 0xdfff), 'Unicode scalar'); count++;
  }
  check(count <= max && (!nonblank || /\S/u.test(value)), 'text length/nonblank'); return value;
}
const short = new Map([[8,'\\b'],[9,'\\t'],[10,'\\n'],[12,'\\f'],[13,'\\r']]);
/** Bounded temporary fragments; scalar validation is completed as the stream is consumed. */
export function* quoteParts(text) {
  check(typeof text === 'string', 'text type'); yield '"'; let block = '';
  for (const c of text) {
    const p = c.codePointAt(0); check(p !== 0 && !(p >= 0xd800 && p <= 0xdfff), 'Unicode scalar');
    block += p === 34 ? '\\"' : p === 92 ? '\\\\' : short.get(p) ?? (p < 32 ? '\\u' + BigInt(p).toString(16).padStart(4,'0') : c);
    if (block.length >= 4096) { yield block; block = ''; }
  }
  if (block) yield block; yield '"';
}
export const quote = text => [...quoteParts(text)].join('');
function* flatParts(values) {
  yield '[';
  for (let i = 0; i < values.length; i++) {
    if (i) yield ','; const v = values[i];
    if (v === null) yield 'null';
    else if (typeof v === 'string') yield* quoteParts(v);
    else if (typeof v === 'number') yield formatBits(numberBits(v));
    else throw Error('flat scalar type');
  }
  yield ']';
}
// Limits apply to individual experimental stream units, never saved field lengths.
export const STREAM_PART_CODE_UNITS = 16384, STREAM_PART_BYTES = 65536, REPEAT_UNIT_CODE_UNITS = 2048;
export function* chunks(parts, size = 4096) {
  check(Number.isSafeInteger(size) && size >= 1 && size <= 65536, 'chunk budget');
  let target = Buffer.allocUnsafe(size), used = 0;
  for (const part of parts) {
    check(typeof part === 'string' ? part.length <= STREAM_PART_CODE_UNITS :
      part instanceof Uint8Array && part.byteLength <= STREAM_PART_BYTES, 'stream input unit');
    const b = typeof part === 'string' ? Buffer.from(part, 'utf8') : part;
    let offset = 0;
    while (offset < b.length) {
      const take = Math.min(size - used, b.length - offset); target.set(b.subarray(offset, offset + take), used); used += take; offset += take;
      if (used === size) { yield target; target = Buffer.allocUnsafe(size); used = 0; }
    }
  }
  if (used) yield target.subarray(0,used);
}
export function* propertyChunks(row, size = 4096) {
  check(row && typeof row === 'object', 'row');
  const values = propertyFields.map(k => {
    check(Object.hasOwn(row,k), 'explicit property');
    const value = row[k]; // Own accessors are accepted; capture once for validation and emission.
    check(value === null || typeof value === 'string', 'property type');
    return value;
  });
  yield* chunks(flatParts(['mpia-property-location-input-v1', ...values]), size);
}
export function hashChunks(stream) {
  const h = createHash('sha256'); let bytes = 0n;
  for (const chunk of stream) { check(chunk instanceof Uint8Array, 'hash byte chunk'); h.update(chunk); bytes += BigInt(chunk.byteLength); }
  return { digest: h.digest('hex'), bytes: bytes.toString() };
}
export const propertyBytes = row => Buffer.concat([...propertyChunks(row)]);
const isUuid = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
const isHash = v => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v);
const member = (v, list) => check(list.includes(v), 'vocabulary');
export function validInstant(v) {
  check(typeof v === 'string', 'timestamp type');
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?Z$/.exec(v); check(m, 'timestamp grammar');
  const ints = m.slice(1,7).map(s => { let n=0; for(const c of s) n=n*10+c.charCodeAt(0)-48; return n; });
  const [y,mo,d,h,mi,s] = ints, leap = y%4===0 && (y%100!==0 || y%400===0);
  check(y>=1 && mo>=1 && mo<=12 && d>=1 && d<=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][mo-1] && h<24 && mi<60 && s<60, 'calendar'); return v;
}
/** Independent flat projection validation; no authentication or transaction claim. */
export function validateTuple(v) {
  check(Array.isArray(v) && v.length === 24 && v.every((_,i)=>Object.hasOwn(v,i)), 'cardinality');
  check(v[0] === 'mpia-location-command-v1' && isUuid(v[1]) && isUuid(v[2]) && isHash(v[5]) && v[6] === 'APPEND_LOCATION', 'header');
  if (v[3] === 'ABSENT') check(v[4] === null, 'absent pointer');
  else { check(typeof v[3] === 'number', 'revision type'); parseNumeric(formatBits(numberBits(v[3])), 'revision'); }
  check(v[4] === null || isUuid(v[4]), 'pointer');
  for (const [i,max] of [[7,4000],[8,4000],[9,160],[15,1000],[20,160]]) if(v[i]!==null) validText(v[i],max,true);
  const point = v[10]!==null || v[11]!==null;
  if(point) for(const [i,slot] of [[10,'longitude'],[11,'latitude']]) { check(typeof v[i]==='number', 'paired numeric coordinates'); parseNumeric(formatBits(numberBits(v[i])),slot); }
  member(v[12],['NONE','USER_PIN','GEOCODER']); member(v[13],[null,'EPSG:4326']);
  for(const i of [14,22]) check(v[i]===null || isUuid(v[i]),'uuid');
  if(v[16]!==null) validInstant(v[16]);
  member(v[17],['UNKNOWN','ROOFTOP','BUILDING','PARCEL','STREET','LOCALITY','REGION','USER_PIN']);
  if(v[18]!==null) { check(typeof v[18]==='number','accuracy type'); parseNumeric(formatBits(numberBits(v[18])),'accuracy'); }
  member(v[19],['UNKNOWN','LOW','MEDIUM','HIGH']); member(v[21],['UNCONFIRMED','REVIEW_REQUIRED','CONFIRMED','CLEARED']);
  member(v[23],['INITIAL_INPUT','ADDRESS_CHANGED','GEOCODE_SELECTED','PIN_CONFIRMED','LOCATION_CORRECTED','METADATA_CORRECTED','LOCATION_CLEARED']);
  const unknown = v[19]==='UNKNOWN' && v[20]===null;
  check((v[8]===null && v[9]===null) || (v[8]!==null && v[9]!==null && v[7]!==null), 'normalization pair');
  check(unknown || (v[19]!=='UNKNOWN' && v[20]!==null), 'confidence pair');
  check(v[14]===null ? v[15]===null && v[16]===null && unknown : v[16]!==null, 'provider pair');
  check(v[12]==='NONE' ? !point && v[13]===null && v[17]==='UNKNOWN' && v[18]===null && unknown : point && v[13]==='EPSG:4326' && (v[12]==='USER_PIN' ? v[17]==='USER_PIN' && unknown : v[17]!=='USER_PIN' && v[14]!==null), 'source combination');
  check(v[21]==='CONFIRMED' ? point && v[22]===v[2] : v[22]===null, 'confirmation actor');
  check(v[21]==='UNCONFIRMED' ? v[7]!==null && v[12]==='NONE' : v[21]==='REVIEW_REQUIRED' ? v[7]!==null || point : v[21]==='CLEARED' ? v[12]==='NONE' && [7,8,9,14,15,16].every(i=>v[i]===null) : true, 'status combination');
  check((v[23]==='LOCATION_CLEARED')===(v[21]==='CLEARED') && (v[23]!=='PIN_CONFIRMED' || v[21]==='CONFIRMED' && v[12]==='USER_PIN') && (v[23]!=='GEOCODE_SELECTED' || v[12]==='GEOCODER' && point), 'reason');
  return v;
}
export function commandTuple(c, actor) {
  exactFields(c,['serializer','propertyId','operationId','expected','propertyInput','operationKind','payload']);
  check(isUuid(c.operationId) && c.operationId !== '00000000-0000-0000-0000-000000000000', 'operation id');
  exactFields(c.propertyInput,['serializer','digest']);
  check(c.propertyInput?.serializer==='mpia-property-location-input-v1','input serializer');
  const e=c.expected;
  check(e && (e.kind==='ABSENT' || e.kind==='EXACT'),'expected kind');
  exactFields(e,e.kind==='ABSENT'?['kind']:['kind','revision','currentLocationVersionId']);
  exactFields(c.payload,semanticFields);
  return validateTuple([c.serializer,c.propertyId,actor,e.kind==='ABSENT'?'ABSENT':e.revision,e.kind==='ABSENT'?null:e.currentLocationVersionId,c.propertyInput.digest,c.operationKind,...semanticFields.map(k=>c.payload[k])]);
}
function exactFields(value,keys) {
  check(value && typeof value==='object' && [null,Object.prototype].includes(Object.getPrototypeOf(value)), 'plain object');
  check(Reflect.ownKeys(value).length===keys.length && keys.every(k=>Object.hasOwn(value,k)), 'exact fields');
  check(keys.every(k=>{const d=Object.getOwnPropertyDescriptor(value,k);return d.get===undefined && d.set===undefined;}), 'data fields');
}
export const tupleBytes = tuple => Buffer.concat([...chunks(flatParts(validateTuple(tuple)))]);
export const commandBytes = (c,actor) => tupleBytes(commandTuple(c,actor));
export function identityBytes(property,id) {
  check(isUuid(property) && isUuid(id) && id!=='00000000-0000-0000-0000-000000000000','identity');
  return Buffer.concat([...chunks(flatParts(['mpia-location-operation-identity-v1',property,id]))]);
}
/** Fatal UTF-8 decoding, explicit flat JSON tokenizer, exact lexical reserialization. */
export function decodeFlat(bytes, count) {
  check(Buffer.isBuffer(bytes) || bytes instanceof Uint8Array, 'byte input');
  const text = new TextDecoder('utf-8',{ fatal:true, ignoreBOM:true }).decode(bytes);
  let p=0; check(text[p++]==='[','root'); const values=[], tokens=[];
  while(text[p]!==']') {
    if(values.length) check(text[p++]===',','separator');
    check(values.length<count,'cardinality'); const start=p;
    if(text[p]==='"') {
      p++; let s='', ended=false;
      while(p<text.length) {
        let c=text[p++]; if(c==='"') { ended=true; break; }
        if(c==='\\') {
          const e=text[p++], escapes={'"':'"','\\':'\\','/':'/','b':'\b','f':'\f','n':'\n','r':'\r','t':'\t'};
          if(e==='u') { const h=text.slice(p,p+4); check(/^[0-9a-fA-F]{4}$/.test(h),'escape'); c=String.fromCharCode(parseInt(h,16)); p+=4; }
          else { check(Object.hasOwn(escapes,e),'escape'); c=escapes[e]; }
        } else check(c.charCodeAt(0)>=32,'raw control');
        s+=c;
      }
      check(ended,'unterminated string'); validText(s); check(quote(s)===text.slice(start,p),'noncanonical escape'); values.push(s);
    } else if(text.slice(p,p+4)==='null') { p+=4; values.push(null); }
    else {
      while(p<text.length && text[p]!==',' && text[p]!==']') p++;
      const token=text.slice(start,p), slot=count===24 ? ({3:'revision',10:'longitude',11:'latitude',18:'accuracy'}[values.length]) : undefined;
      check(slot,'numeric slot'); values.push(bitsNumber(parseNumeric(token,slot).bits));
    }
    tokens.push(text.slice(start,p));
  }
  check(text[p++]===']' && p===text.length && values.length===count,'complete flat tuple');
  return {values,tokens};
}
export function acceptWire(bytes,{ digest, actor, property, operationId, inputDigest }={}) {
  check(bytes.length<=131072,'wire size');
  if(digest!==undefined) check(isHash(digest) && createHash('sha256').update(bytes).digest('hex')===digest,'wire hash');
  if(operationId!==undefined) check(isUuid(operationId) && operationId!=='00000000-0000-0000-0000-000000000000','operation id');
  const {values,tokens}=decodeFlat(bytes,24); validateTuple(values);
  check(tupleBytes(values).equals(Buffer.from(bytes)),'wire canonicality');
  if(actor!==undefined) check(values[2]===actor,'actor binding');
  if(property!==undefined) check(values[1]===property,'property binding');
  if(inputDigest!==undefined) check(values[5]===inputDigest,'input binding');
  return {values,tokens};
}
/** Seven repeat specifications. Bounded units; no aggregate buffer or saved-text cap. */
export function* repeatPropertyParts(specs) {
  check(Array.isArray(specs) && specs.length===7,'repeat slots'); yield '["mpia-property-location-input-v1"';
  for(const spec of specs) {
    yield ',';
    if(spec===null) { yield 'null'; continue; }
    const {unit,count}=spec;
    check(typeof unit==='string' && unit.length>0 && unit.length<=REPEAT_UNIT_CODE_UNITS,'repeat unit budget');
    validText(unit); check(typeof count==='bigint' && count>=0n && count*BigInt([...unit].length)<=9007199254740991n,'repeat count');
    const escaped=quote(unit).slice(1,-1); const batch=BigInt(Math.max(1,Math.floor(16384/escaped.length)));
    const block=escaped.repeat(Number(batch)); yield '"'; let left=count;
    while(left>=batch) { yield block; left-=batch; }
    if(left) yield escaped.repeat(Number(left)); yield '"';
  }
  yield ']';
}
