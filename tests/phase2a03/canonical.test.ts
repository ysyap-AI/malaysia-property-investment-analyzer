import { expect, it } from "vitest";
import { createHash } from "node:crypto";
// Accepted historical JS fixture intentionally has no TypeScript declaration.
// @ts-expect-error -- comparison only; never imported by runtime source.
import * as legacy from "../phase2a02-command-contract.mjs";
import {
  compareOperations,
  operationBytes,
  operationHash,
  operationIdentityBytes,
  operationIdentityHash,
  propertyInputBytes,
  propertyInputHash,
} from "../../src/lib/location/canonical";
import {
  locationCommand,
  propertyInputFields,
  semanticFields,
} from "../../src/lib/location/contracts";
import { safeInt, uuid } from "../../src/lib/location/primitives";
import {
  actorId,
  command,
  digest,
  geocoded,
  operationId,
  pin,
  property,
  propertyId,
  versionId,
} from "./fixtures";

// Immutable preimages/digests from the unchanged Phase 2A-02 fixture, not computed
// expectations from this implementation. No newline/BOM. UTF-8 encoding below.
const propertyGolden =
  '["mpia-property-location-input-v1","Synthetic",null,"Kuala Lumpur",null,"WP Kuala Lumpur","50000","Malaysia"]';
const commandGolden =
  '["mpia-location-command-v1","f1000000-0000-0000-0000-000000000001","f2000000-0000-0000-0000-000000000001","ABSENT",null,"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","APPEND_LOCATION",null,null,null,101.6869,3.139,"USER_PIN","EPSG:4326",null,null,null,"USER_PIN",null,"UNKNOWN",null,"REVIEW_REQUIRED",null,"INITIAL_INPUT"]';
const numericGolden =
  '["mpia-location-command-v1","f1000000-0000-0000-0000-000000000001","f2000000-0000-0000-0000-000000000001",9007199254740991,"f4000000-0000-0000-0000-000000000001","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","APPEND_LOCATION",null,null,null,0,1e-7,"USER_PIN","EPSG:4326",null,null,null,"USER_PIN",null,"UNKNOWN",null,"REVIEW_REQUIRED",null,"METADATA_CORRECTED"]';
const unicodeProperty = {
  project_name: '"雪🏠"\n',
  full_address: "  e\u0301\\A\t",
  city: "é",
  district: "",
  state: null,
  postcode: "00000",
  country: "my",
};
const unicodeGolden =
  '["mpia-property-location-input-v1","\\"雪🏠\\"\\n","  é\\\\A\\t","é","",null,"00000","my"]';
function legacyCommand(c = command(), actor = actorId) {
  return {
    property_id: c.propertyId,
    actor_id: actor,
    expected_revision: c.expected.kind === "ABSENT" ? "ABSENT" : c.expected.revision,
    expected_current_id: c.expected.kind === "ABSENT" ? null : c.expected.currentLocationVersionId,
    property_input_hash: c.propertyInput.digest,
    operation_kind: c.operationKind,
    ...c.payload,
  };
}
it("original property golden bytes/hash match legacy and independent Node crypto", async () => {
  expect(propertyInputBytes(property)).toBe(propertyGolden);
  expect(legacy.propertyInputBytes(property)).toBe(propertyGolden);
  expect(await propertyInputHash(property)).toBe(
    "152c2a8b92faa9c3068e31fbb888ce29d29633eaa5fd5ffab5abc33924f9db8c",
  );
  expect(createHash("sha256").update(propertyGolden, "utf8").digest("hex")).toBe(
    await propertyInputHash(property),
  );
});
it("original operation golden bytes/hash match legacy", async () => {
  expect(operationBytes(command(), actorId)).toBe(commandGolden);
  expect(legacy.operationBytes(legacyCommand())).toBe(commandGolden);
  expect(await operationHash(command(), actorId)).toBe(
    "9351efbe0ee938e2189e8750b2fa6d84d84537695906ecff3a13daf2c540c4a4",
  );
});
it("fixed Unicode/escape UTF-8 golden retains original codepoints", async () => {
  expect(propertyInputBytes(unicodeProperty)).toBe(unicodeGolden);
  expect(legacy.propertyInputBytes(unicodeProperty)).toBe(unicodeGolden);
  expect(await propertyInputHash(unicodeProperty)).toBe(
    "8884b7e5214b93f40819cf46e61bd3629ee8a22a5e0b7de40fb670d50a776b04",
  );
  expect(new TextEncoder().encode(propertyInputBytes(unicodeProperty))).toEqual(
    new TextEncoder().encode(unicodeGolden),
  );
});
it("fixed numeric vector: max revision, -0 and exponent notation", async () => {
  const c = locationCommand(
    {
      ...command({ ...pin, longitude: -0, latitude: 1e-7, change_reason: "METADATA_CORRECTED" }),
      expected: {
        kind: "EXACT",
        revision: Number.MAX_SAFE_INTEGER,
        currentLocationVersionId: versionId,
      },
    },
    actorId,
  );
  expect(operationBytes(c, actorId)).toBe(numericGolden);
  expect(legacy.operationBytes(legacyCommand(c))).toBe(numericGolden);
  expect(await operationHash(c, actorId)).toBe(
    "2719f818047ec9ab6dd077bdf94b73afb00605134cec2ddec183db7c2ad27dd4",
  );
});
it("all 17 populated semantic fields keep their accepted exact positions", async () => {
  const c = locationCommand(
    {
      ...command({
        ...geocoded,
        input_address: ' A\n"B" ',
        normalized_address: "N",
        normalization_version: "n1",
        longitude: 101.6869123456789,
        latitude: 3.13900000000001,
        provider_candidate_id: "Opaque CASE",
        retrieved_at: "2026-10-20T01:02:03Z",
        coordinate_precision: "BUILDING",
        accuracy_m: 1e-7,
        geocode_confidence: "HIGH",
        confidence_mapping_version: "m1",
        confirmation_status: "CONFIRMED",
        confirmed_by: actorId,
      }),
      expected: { kind: "EXACT", revision: 7, currentLocationVersionId: null },
    },
    actorId,
  );
  const golden =
    '["mpia-location-command-v1","f1000000-0000-0000-0000-000000000001","f2000000-0000-0000-0000-000000000001",7,null,"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","APPEND_LOCATION"," A\\n\\"B\\" ","N","n1",101.6869123456789,3.13900000000001,"GEOCODER","EPSG:4326","f5000000-0000-0000-0000-000000000001","Opaque CASE","2026-10-20T01:02:03Z","BUILDING",1e-7,"HIGH","m1","CONFIRMED","f2000000-0000-0000-0000-000000000001","GEOCODE_SELECTED"]';
  expect(operationBytes(c, actorId)).toBe(golden);
  expect(legacy.operationBytes(legacyCommand(c))).toBe(golden);
  expect(JSON.parse(golden).slice(7)).toEqual(semanticFields.map((key) => c.payload[key]));
  expect(await operationHash(c, actorId)).toBe(
    "d4be2f35605a40346a55a3fd30ab127eadc6b711ce2335165c65bcee628533a9",
  );
  expect(await operationHash(c, actorId)).toBe(legacy.operationHash(legacyCommand(c)));
});
it.each(propertyInputFields)("changing stored %s invalidates fingerprint", async (key) => {
  expect(await propertyInputHash({ ...property, [key]: `${property[key] ?? ""}changed` })).not.toBe(
    await propertyInputHash(property),
  );
});
it("no trimming, normalization, country defaults or null/empty collapsing", async () => {
  const variants = [null, "", " ", "Malaysia", "malaysia", " Malaysia", "é", "e\u0301"];
  const hashes = await Promise.all(
    variants.map((country) => propertyInputHash({ ...property, country })),
  );
  expect(new Set(hashes).size).toBe(variants.length);
  expect(
    await propertyInputHash({
      ...property,
      purchase_price: 1,
      updated_at: "2099",
      id: "ignored",
      notes: "ignored",
    }),
  ).toBe(await propertyInputHash(property));
});
it("property missing/malformed text is rejected before JSON", () => {
  for (const value of [undefined, 1, "\ud800", "\0"])
    expect(() => propertyInputBytes({ ...property, city: value })).toThrow();
});
it("object order and generated data do not enter the preimage", () => {
  const c = command();
  expect(operationBytes(Object.fromEntries(Object.entries(c).reverse()) as typeof c, actorId)).toBe(
    commandGolden,
  );
  // Stricter new boundary rejects generated keys; historical fixture still ignores them.
  expect(
    legacy.operationBytes({
      ...legacyCommand(),
      id: "ignored",
      created_at: "ignored",
      position: "ignored",
    }),
  ).toBe(commandGolden);
  for (const field of [
    "id",
    "position",
    "version_number",
    "created_at",
    "confirmed_at",
    "operation_hash",
  ])
    expect(() => locationCommand({ ...c, [field]: "untrusted" }, actorId)).toThrow();
});
it("identity tuple fixed bytes/hash and separate from payload hash", async () => {
  expect(operationIdentityBytes(propertyId, operationId)).toBe(
    '["mpia-location-operation-identity-v1","f1000000-0000-0000-0000-000000000001","f3000000-0000-0000-0000-000000000001"]',
  );
  expect(await operationIdentityHash(propertyId, operationId)).toBe(
    "fc0e997c519f23716f1d16c84eaf55373ff2b967a3245439d7a22ae60d4af8a1",
  );
  const c = command(),
    otherId = { ...c, operationId: versionId };
  expect(await operationHash(c, actorId)).toBe(await operationHash(otherId, actorId));
  expect(compareOperations(c, actorId, otherId, actorId)).toBe("DISTINCT_OPERATION");
  expect(compareOperations(c, actorId, { ...c, propertyId: versionId }, actorId)).toBe(
    "DISTINCT_OPERATION",
  );
});
it("retry keeps operation, actor, expected tokens, receipt time and full payload", () => {
  const c = command(geocoded),
    before = JSON.stringify(c);
  expect(compareOperations(c, actorId, c, actorId)).toBe("SAME_OPERATION");
  for (const other of [
    command({ ...geocoded, retrieved_at: "2026-10-20T01:02:03Z" }),
    command({ ...geocoded, provider_candidate_id: "different" }),
    {
      ...c,
      expected: { kind: "EXACT" as const, revision: safeInt(0), currentLocationVersionId: null },
    },
    {
      ...c,
      propertyInput: { ...c.propertyInput, digest: digest.replace("a", "b") as typeof digest },
    },
  ])
    expect(compareOperations(c, actorId, other, actorId)).toBe("OPERATION_CONFLICT");
  expect(compareOperations(c, actorId, c, uuid("f2000000-0000-0000-0000-000000000002"))).toBe(
    "OPERATION_CONFLICT",
  );
  expect(JSON.stringify(c)).toBe(before);
  expect(Object.isFrozen(c.payload)).toBe(true);
  expect(Object.isFrozen(c.expected)).toBe(true);
});
it.each([0, -0, 1e-7, 1e-8, 101.12345678901234, 180, -180])(
  "binary64 parity at longitude %s",
  (longitude) => {
    const c = command({ ...pin, longitude });
    expect(operationBytes(c, actorId)).toBe(legacy.operationBytes(legacyCommand(c)));
  },
);
