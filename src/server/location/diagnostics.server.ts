import { locationErrorCodes } from "../../lib/location/errors";
import type { LocationErrorCode } from "../../lib/location/errors";
import { oneOf, uuid } from "../../lib/location/primitives";
import type { UUID } from "../../lib/location/primitives";
import type { DiagnosticsPort } from "./ports.server";

export const stages = [
  "AUTH",
  "BUILD",
  "ACQUIRE",
  "BEGIN",
  "SETUP",
  "PARENT",
  "STATE",
  "PRIOR",
  "PROVIDER",
  "CREATE_STATE",
  "LATEST",
  "INSERT",
  "CAS",
  "COMMIT",
  "CLEANUP",
] as const;
export type Stage = (typeof stages)[number];
export type DiagnosticEvent = Readonly<{
  diagnosticId: UUID;
  stage: Stage;
  outcome: LocationErrorCode | "CREATED" | "DUPLICATE";
  certainty: "NOT_COMMITTED" | "UNKNOWN" | "COMMITTED";
  cleanup: "NONE" | "RELEASED" | "DISCARDED" | "FAILED";
  sqlState: SafeSqlState | null;
}>;
const safeStates = [
  "40001",
  "40P01",
  "55P03",
  "57014",
  "23503",
  "23505",
  "23514",
  "25P02",
] as const;
export type SafeSqlState = (typeof safeStates)[number];
/** Read only an own data property; never traverse messages, causes, aggregates,
 * prototypes, URLs, details or getters. Exception text is never a diagnostic. */
export function safeSqlState(error: unknown): SafeSqlState | null {
  try {
    if (typeof error !== "object" || error === null) return null;
    const value = Object.getOwnPropertyDescriptor(error, "code")?.value as unknown;
    return typeof value === "string" && (safeStates as readonly string[]).includes(value)
      ? (value as SafeSqlState)
      : null;
  } catch {
    return null;
  }
}
/** Build a fresh closed event. No raw exception can be attached by the caller.
 * A synchronous or asynchronous logging failure never controls the result. */
export function emitDiagnostic(port: DiagnosticsPort, event: DiagnosticEvent): void {
  try {
    const safe = Object.freeze({
      diagnosticId: uuid(event.diagnosticId),
      stage: oneOf(event.stage, stages, "stage"),
      outcome: oneOf(event.outcome, [...locationErrorCodes, "CREATED", "DUPLICATE"], "outcome"),
      certainty: oneOf(event.certainty, ["NOT_COMMITTED", "UNKNOWN", "COMMITTED"], "certainty"),
      cleanup: oneOf(event.cleanup, ["NONE", "RELEASED", "DISCARDED", "FAILED"], "cleanup"),
      sqlState: event.sqlState === null ? null : oneOf(event.sqlState, safeStates, "sqlState"),
    });
    void Promise.resolve(port.emit(safe)).catch(() => undefined);
  } catch {
    /* no raw logging fallback */
  }
}
