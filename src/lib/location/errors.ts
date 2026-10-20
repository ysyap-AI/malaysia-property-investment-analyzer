import { oneOf, positiveInt, record, requireRule, text, uuid } from "./primitives";
import type { PositiveInt, UUID } from "./primitives";

export type RetryAdvice =
  | "SAME_ID_AFTER_BACKOFF"
  | "REAUTHENTICATE_THEN_SAME_ID"
  | "RELOAD_AND_CONFIRM_NEW_ID"
  | "RECONCILE_SAME_ID"
  | "DO_NOT_RETRY";
export const locationErrorCodes = [
  "AUTHENTICATION_FAILED",
  "AUTHENTICATION_UNAVAILABLE",
  "OWNERSHIP_DENIED",
  "PROPERTY_DELETED_OR_OWNERSHIP_CHANGED",
  "VALIDATION_FAILED",
  "INPUT_CHANGED",
  "STALE_EXPECTED_STATE",
  "OPERATION_CONFLICT",
  "VERSION_LIMIT_REACHED",
  "PROVIDER_INELIGIBLE",
  "DATABASE_BUSY",
  "TRANSACTION_FAILED",
  "COMMIT_FAILED",
  "COMMIT_OUTCOME_UNKNOWN",
  "INTEGRITY_FAILURE",
] as const;
export type LocationErrorCode = (typeof locationErrorCodes)[number];
export type LocationWriteError = Readonly<{
  kind: "FAILURE";
  code: LocationErrorCode;
  retry: RetryAdvice;
  diagnosticId: UUID;
  fieldIssues: readonly Readonly<{ field: string; rule: string }>[];
}>;
export function locationFailure(
  code: LocationErrorCode,
  diagnosticId: UUID,
  transientTransaction = false,
): LocationWriteError {
  oneOf(code, locationErrorCodes, "code");
  const retry: RetryAdvice =
    code === "COMMIT_OUTCOME_UNKNOWN"
      ? "RECONCILE_SAME_ID"
      : code === "AUTHENTICATION_FAILED"
        ? "REAUTHENTICATE_THEN_SAME_ID"
        : code === "INPUT_CHANGED" ||
            code === "STALE_EXPECTED_STATE" ||
            code === "VALIDATION_FAILED"
          ? "RELOAD_AND_CONFIRM_NEW_ID"
          : code === "AUTHENTICATION_UNAVAILABLE" ||
              code === "DATABASE_BUSY" ||
              (code === "TRANSACTION_FAILED" && transientTransaction)
            ? "SAME_ID_AFTER_BACKOFF"
            : "DO_NOT_RETRY";
  return Object.freeze({
    kind: "FAILURE",
    code,
    retry,
    diagnosticId: uuid(diagnosticId),
    fieldIssues: Object.freeze([]),
  });
}
export const providerErrorCodes = [
  "TIMEOUT",
  "RATE_LIMITED",
  "QUOTA_EXCEEDED",
  "AUTH_FAILED",
  "INVALID_REQUEST",
  "PROVIDER_UNAVAILABLE",
  "INVALID_RESPONSE",
  "OUT_OF_COVERAGE",
  "CANCELLED",
  "UNSUPPORTED_CAPABILITY",
] as const;
export type ProviderErrorCode = (typeof providerErrorCodes)[number];
export type ProviderError = Readonly<{
  code: ProviderErrorCode;
  retry: "BOUNDED_BACKOFF" | "AFTER_QUOTA_RESET" | "CONFIGURATION_REQUIRED" | "NEVER";
  retryAfterSeconds: PositiveInt | null;
  diagnosticId: UUID;
}>;
export function providerError(value: unknown): ProviderError {
  const v = record(value, ["code", "retry", "retryAfterSeconds", "diagnosticId"], "providerError");
  const code = oneOf(v["code"], providerErrorCodes, "code");
  const retry =
    code === "TIMEOUT" || code === "RATE_LIMITED" || code === "PROVIDER_UNAVAILABLE"
      ? "BOUNDED_BACKOFF"
      : code === "QUOTA_EXCEEDED"
        ? "AFTER_QUOTA_RESET"
        : code === "AUTH_FAILED"
          ? "CONFIGURATION_REQUIRED"
          : "NEVER";
  requireRule(v["retry"] === retry, "retry", "code classification");
  return Object.freeze({
    code,
    retry,
    retryAfterSeconds: v["retryAfterSeconds"] === null ? null : positiveInt(v["retryAfterSeconds"]),
    diagnosticId: uuid(v["diagnosticId"]),
  });
}
/** Safe field issue construction: callers supply policy labels, never raw exceptions. */
export function fieldIssue(field: unknown, rule: unknown) {
  return Object.freeze({
    field: text(field, "field", 160, true),
    rule: text(rule, "rule", 160, true),
  });
}
