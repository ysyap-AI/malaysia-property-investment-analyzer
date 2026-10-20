import {
  locationCommand,
  propertyInputFields,
  propertyLocationInputs,
  semanticFields,
} from "./contracts";
import type { LocationInputFingerprint, TrustedLocationCommand } from "./contracts";
import { operationId, sha256, text, uuid } from "./primitives";
import type { Sha256, UUID } from "./primitives";

/** Fixed arrays and ECMAScript JSON.stringify are authoritative v1 bytes. */
export function propertyInputBytes(value: unknown): string {
  const input = propertyLocationInputs(value);
  return JSON.stringify([
    "mpia-property-location-input-v1",
    ...propertyInputFields.map((key) => input[key]),
  ]);
}
/** Web Crypto keeps one UTF-8 implementation portable across browser/Node/Deno. */
export async function hashUtf8(bytes: string): Promise<Sha256> {
  text(bytes, "hashBytes", Number.MAX_SAFE_INTEGER);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(bytes));
  return sha256(
    Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join(""),
  );
}
export async function propertyInputHash(value: unknown): Promise<Sha256> {
  return hashUtf8(propertyInputBytes(value));
}
export async function propertyFingerprint(value: unknown): Promise<LocationInputFingerprint> {
  return Object.freeze({
    serializer: "mpia-property-location-input-v1",
    digest: await propertyInputHash(value),
  });
}
/** Actor is a separate server-derived argument. This validates shape, not Auth. */
export function operationBytes(value: TrustedLocationCommand, actorId: UUID): string {
  const c = locationCommand(value, uuid(actorId));
  return JSON.stringify([
    "mpia-location-command-v1",
    c.propertyId,
    actorId,
    c.expected.kind === "ABSENT" ? "ABSENT" : c.expected.revision,
    c.expected.kind === "ABSENT" ? null : c.expected.currentLocationVersionId,
    c.propertyInput.digest,
    c.operationKind,
    ...semanticFields.map((key) => c.payload[key]),
  ]);
}
export function operationHash(command: TrustedLocationCommand, actorId: UUID): Promise<Sha256> {
  return hashUtf8(operationBytes(command, actorId));
}
/** SQL retains its existing two-column key; this portable key adds no column. */
export function operationIdentityBytes(propertyId: UUID, id: UUID): string {
  return JSON.stringify(["mpia-location-operation-identity-v1", uuid(propertyId), operationId(id)]);
}
export function operationIdentityHash(propertyId: UUID, id: UUID): Promise<Sha256> {
  return hashUtf8(operationIdentityBytes(propertyId, id));
}
export type OperationComparison = "SAME_OPERATION" | "DISTINCT_OPERATION" | "OPERATION_CONFLICT";
/** Pure payload comparison only; replay still requires ownership/input checks later. */
export function compareOperations(
  a: TrustedLocationCommand,
  actorA: UUID,
  b: TrustedLocationCommand,
  actorB: UUID,
): OperationComparison {
  const bytesA = operationBytes(a, actorA),
    bytesB = operationBytes(b, actorB);
  if (
    operationIdentityBytes(a.propertyId, a.operationId) !==
    operationIdentityBytes(b.propertyId, b.operationId)
  )
    return "DISTINCT_OPERATION";
  return bytesA === bytesB ? "SAME_OPERATION" : "OPERATION_CONFLICT";
}
