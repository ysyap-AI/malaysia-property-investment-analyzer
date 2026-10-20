import {
  semanticFields,
  locationPayload,
  propertyLocationInputs,
} from "../../lib/location/contracts";
import type {
  ConfirmationState,
  LocationWriteResult,
  LocationWriteSuccess,
  StateObservation,
} from "../../lib/location/contracts";
import { propertyInputHash } from "../../lib/location/canonical";
import { locationFailure } from "../../lib/location/errors";
import type { LocationErrorCode } from "../../lib/location/errors";
import {
  coordinates,
  decodeSqlBigint,
  instant,
  LocationValidationError,
  positiveInt,
  sha256,
  uuid,
} from "../../lib/location/primitives";
import { AuthenticationDenied, buildFrozenOperation } from "./command-builder.server";
import type { FrozenOperation } from "./command-builder.server";
import { emitDiagnostic, safeSqlState } from "./diagnostics.server";
import type { Stage, SafeSqlState } from "./diagnostics.server";
import type {
  ExecutionOptions,
  QueryResult,
  ReservedConnection,
  SqlRow,
  SqlValue,
  TransactionPorts,
} from "./ports.server";

/** Provisional only: real driver cancellation, pool affinity and limits are I06 gates. */
export const provisionalBudgets = Object.freeze({
  acquireMs: 2000,
  statementMs: 5000,
  transactionMs: 8000,
  cleanupMs: 1000,
});
const versionColumns =
  "id, property_id, version_number, operation_id, operation_hash, property_input_hash, input_address, normalized_address, normalization_version, longitude, latitude, coordinate_source, source_crs, provider_version_id, provider_candidate_id, retrieved_at, coordinate_precision, accuracy_m, geocode_confidence, confidence_mapping_version, confirmation_status, confirmed_by, change_reason, created_by, created_at, confirmed_at";
const stateColumns =
  "property_id, state_revision, current_location_version_id, created_at, updated_at";
/** Every identifier is fixed source text. Only data values become bound parameters. */
export const transactionSql = Object.freeze({
  begin: "BEGIN ISOLATION LEVEL READ COMMITTED",
  setup: Object.freeze([
    "SET LOCAL ROLE service_role",
    "SET LOCAL search_path = pg_catalog",
    "SET LOCAL lock_timeout = '3s'",
    "SET LOCAL statement_timeout = '5s'",
    "SET LOCAL idle_in_transaction_session_timeout = '10s'",
  ]),
  parent:
    "SELECT id, user_id, project_name, full_address, city, district, state, postcode, country FROM public.properties WHERE id = $1 FOR UPDATE",
  state: `SELECT s.property_id, s.state_revision, s.current_location_version_id, s.created_at, s.updated_at, (s.current_location_version_id IS NULL OR EXISTS (SELECT 1 FROM public.property_location_versions v WHERE v.property_id = s.property_id AND v.id = s.current_location_version_id)) AS pointer_valid FROM public.property_location_intelligence_state s WHERE s.property_id = $1 FOR UPDATE OF s`,
  prior: `SELECT ${versionColumns} FROM public.property_location_versions WHERE property_id = $1 AND operation_id = $2`,
  provider:
    "SELECT id, deprecated_at, approval_state, retention_class, reviewed_at, terms_reference, review_reference, capabilities FROM public.location_provider_registry WHERE id = $1",
  createState: `INSERT INTO public.property_location_intelligence_state (property_id) VALUES ($1) RETURNING ${stateColumns}`,
  latest:
    "SELECT coalesce(max(version_number), 0) AS latest FROM public.property_location_versions WHERE property_id = $1",
  insert: `INSERT INTO public.property_location_versions (id, property_id, version_number, operation_id, operation_hash, property_input_hash, created_by, input_address, normalized_address, normalization_version, longitude, latitude, coordinate_source, source_crs, provider_version_id, provider_candidate_id, retrieved_at, coordinate_precision, accuracy_m, geocode_confidence, confidence_mapping_version, confirmation_status, confirmed_by, change_reason) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24) RETURNING ${versionColumns}`,
  cas: `UPDATE public.property_location_intelligence_state SET current_location_version_id = $2 WHERE property_id = $1 AND state_revision = $3 AND current_location_version_id IS NOT DISTINCT FROM $4 RETURNING ${stateColumns}`,
});
class ProtocolFault extends Error {
  constructor(readonly code: LocationErrorCode) {
    super(code);
  }
}
class Interrupted extends Error {}
function isErrorType<T extends Error>(
  error: unknown,
  type: new (...args: never[]) => T,
): error is T {
  try {
    return error instanceof type;
  } catch {
    return false;
  }
}
function check(ok: boolean, code: LocationErrorCode = "INTEGRITY_FAILURE"): asserts ok {
  if (!ok) throw new ProtocolFault(code);
}
function rows(result: QueryResult, max = 1): readonly SqlRow[] {
  check(
    Array.isArray(result.rows) &&
      Number.isSafeInteger(result.rowCount) &&
      result.rowCount >= 0 &&
      result.rowCount === result.rows.length &&
      result.rowCount <= max,
  );
  return result.rows;
}
function one(result: QueryResult): SqlRow {
  const list = rows(result);
  check(list.length === 1);
  return list[0]!;
}
function state(row: SqlRow, propertyId: string): StateObservation {
  check(uuid(row["property_id"]) === propertyId);
  instant(row["created_at"]);
  instant(row["updated_at"]);
  return Object.freeze({
    revision: decodeSqlBigint(row["state_revision"]),
    currentLocationVersionId:
      row["current_location_version_id"] === null ? null : uuid(row["current_location_version_id"]),
  });
}
// SQL timestamps represent instants; original lexical receipt bytes remain in the
// frozen operation hash, not reconstructed from PostgreSQL's timestamp rendering.
function microseconds(value: unknown): bigint {
  const time = instant(value);
  const base = time.replace(/(?:\.\d+)?Z$/, "Z");
  const fraction = /\.(\d+)Z$/.exec(time)?.[1] ?? "";
  return BigInt(Date.parse(base)) * 1000n + BigInt(fraction.padEnd(6, "0"));
}
function version(row: SqlRow, op: FrozenOperation): LocationWriteSuccess["version"] {
  const { command: c, actor, hash } = op;
  check(
    uuid(row["property_id"]) === c.propertyId &&
      uuid(row["operation_id"]) === c.operationId &&
      sha256(row["operation_hash"]) === hash &&
      uuid(row["created_by"]) === actor.userId &&
      sha256(row["property_input_hash"]) === c.propertyInput.digest,
  );
  const payload = locationPayload(
    Object.fromEntries(semanticFields.map((key) => [key, row[key]])),
    actor.userId,
  );
  for (const key of semanticFields) {
    const actual = payload[key],
      expected = c.payload[key];
    check(
      key === "retrieved_at" && actual !== null && expected !== null
        ? microseconds(actual) === microseconds(expected)
        : actual === expected,
    );
  }
  const createdAt = instant(row["created_at"]);
  if (payload.retrieved_at !== null)
    check(microseconds(payload.retrieved_at) <= microseconds(createdAt));
  let confirmation: ConfirmationState;
  if (payload.confirmation_status === "CONFIRMED") {
    const confirmedAt = instant(row["confirmed_at"]);
    check(microseconds(confirmedAt) === microseconds(createdAt));
    confirmation = Object.freeze({
      kind: "CONFIRMED",
      coordinates: coordinates({
        crs: payload.source_crs,
        longitude: payload.longitude,
        latitude: payload.latitude,
      }),
      confirmedBy: actor.userId,
      confirmedAt,
    });
  } else {
    check(row["confirmed_at"] === null);
    confirmation =
      payload.confirmation_status === "CLEARED"
        ? Object.freeze({ kind: "CLEARED", coordinates: null })
        : payload.confirmation_status === "UNCONFIRMED"
          ? Object.freeze({
              kind: "UNCONFIRMED",
              inputAddress: payload.input_address!,
              coordinates: null,
            })
          : Object.freeze({
              kind: "REVIEW_REQUIRED",
              inputAddress: payload.input_address,
              coordinates:
                payload.longitude === null
                  ? null
                  : coordinates({
                      crs: payload.source_crs,
                      longitude: payload.longitude,
                      latitude: payload.latitude,
                    }),
            });
  }
  return Object.freeze({
    id: uuid(row["id"]),
    propertyId: c.propertyId,
    versionNumber: positiveInt(decodeSqlBigint(row["version_number"])),
    propertyInputHash: c.propertyInput.digest,
    confirmation,
    createdAt,
  });
}

// Module-wide guard prevents a broken injected pool from reissuing uncertain clients
// across calls/factories. Real pool eviction/close still requires I06 qualification.
const quarantined = new WeakSet<ReservedConnection>();
const reserved = new WeakMap<ReservedConnection, symbol>();

/** Dormant factory only. No configured instance, credentials, driver or endpoint.
 * One attempt per call; all automatic retries deliberately disabled. */
export function createDormantTransactionCore(ports: TransactionPorts) {
  return Object.freeze({
    async execute(
      evidence: unknown,
      intent: unknown,
      options: ExecutionOptions = {},
    ): Promise<LocationWriteResult> {
      const diagnosticId = uuid(globalThis.crypto.randomUUID());
      let stage: Stage = "AUTH",
        failureStage: Stage = stage;
      let certainty: "NOT_COMMITTED" | "UNKNOWN" | "COMMITTED" = "NOT_COMMITTED";
      let cleanup: "NONE" | "RELEASED" | "DISCARDED" | "FAILED" = "NONE";
      let sqlState: SafeSqlState | null = null;
      let connection: ReservedConnection | undefined;
      const owner = Symbol("transaction invocation");
      const owns = (client: ReservedConnection) => reserved.get(client) === owner;
      const forget = (client: ReservedConnection) => {
        if (owns(client)) reserved.delete(client);
      };
      let began = false,
        clean = false,
        unsafe = false;
      let deadline = Number.POSITIVE_INFINITY;
      let result: LocationWriteResult;
      const io = new AbortController();
      const close = async (client: ReservedConnection, discard: boolean) => {
        if (!owns(client)) return;
        if (discard) quarantined.add(client);
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            discard
              ? client.discard({
                  signal: controller.signal,
                  timeoutMs: provisionalBudgets.cleanupMs,
                })
              : client.release({
                  signal: controller.signal,
                  timeoutMs: provisionalBudgets.cleanupMs,
                }),
            new Promise<never>((_, reject) => {
              timer = setTimeout(() => {
                controller.abort();
                reject(new Interrupted());
              }, provisionalBudgets.cleanupMs);
            }),
          ]);
          cleanup = discard ? "DISCARDED" : "RELEASED";
        } catch {
          cleanup = "FAILED";
          if (!discard) await close(client, true);
        } finally {
          if (timer !== undefined) clearTimeout(timer);
        }
      };
      const wait = async <T>(
        start: (signal: AbortSignal, timeoutMs: number) => Promise<T>,
        maxMs: number,
        signal: AbortSignal | null | undefined = options.signal,
        independent = false,
      ): Promise<T> => {
        if (signal?.aborted) throw new Interrupted();
        const timeoutMs = independent ? maxMs : Math.min(maxMs, deadline - performance.now());
        if (timeoutMs <= 0) throw new Interrupted();
        let timer: ReturnType<typeof setTimeout> | undefined;
        let abort: (() => void) | undefined;
        const controller = independent ? new AbortController() : io;
        try {
          return await Promise.race([
            Promise.resolve().then(() => start(controller.signal, timeoutMs)),
            new Promise<never>((_, reject) => {
              abort = () => {
                unsafe = true;
                controller.abort();
                reject(new Interrupted());
              };
              signal?.addEventListener("abort", abort, { once: true });
              timer = setTimeout(abort, timeoutMs);
            }),
          ]);
        } finally {
          if (timer !== undefined) clearTimeout(timer);
          if (abort) signal?.removeEventListener("abort", abort);
        }
      };
      const query = async (at: Stage, sql: string, parameters: readonly SqlValue[] = []) => {
        stage = at;
        return wait(
          (signal, timeoutMs) =>
            connection!.query(sql, Object.freeze([...parameters]), { signal, timeoutMs }),
          provisionalBudgets.statementMs,
        );
      };
      try {
        // Auth/command work is outside SQL locks. Authentication outage is sanitized.
        const op = await wait(
          () =>
            buildFrozenOperation(
              ports.actors,
              {
                construct: (actor, input) => {
                  stage = "BUILD";
                  return ports.commands.construct(actor, input);
                },
              },
              evidence,
              intent,
            ),
          provisionalBudgets.acquireMs,
        );
        const { command: c, actor } = op;
        stage = "ACQUIRE";
        let acquisitionExpired = false;
        try {
          connection = await wait(async (signal, timeoutMs) => {
            const client = await ports.connections.acquire({ signal, timeoutMs });
            // Receiving an alias grants no lifecycle authority. Claim synchronously,
            // before yielding, including on late acquisition and across factories.
            check(!reserved.has(client), "TRANSACTION_FAILED");
            reserved.set(client, owner);
            if (acquisitionExpired || signal.aborted) {
              try {
                await close(client, true);
              } finally {
                forget(client);
              }
              throw new Interrupted();
            }
            connection = client;
            return client;
          }, provisionalBudgets.acquireMs);
        } catch (error) {
          acquisitionExpired = true;
          throw error;
        }
        check(!quarantined.has(connection), "TRANSACTION_FAILED");
        deadline = performance.now() + provisionalBudgets.transactionMs;
        stage = "BEGIN";
        // Failed BEGIN has uncertain session state; only discard is safe.
        unsafe = true;
        rows(await query("BEGIN", transactionSql.begin), 0);
        began = true;
        unsafe = false;
        for (const sql of transactionSql.setup) rows(await query("SETUP", sql), 0);
        const parents = rows(await query("PARENT", transactionSql.parent, [c.propertyId]));
        check(parents.length === 1, "PROPERTY_DELETED_OR_OWNERSHIP_CHANGED");
        const parent = parents[0]!;
        check(uuid(parent["id"]) === c.propertyId);
        check(uuid(parent["user_id"]) === actor.userId, "OWNERSHIP_DENIED");
        check(
          (await propertyInputHash(propertyLocationInputs(parent))) === c.propertyInput.digest,
          "INPUT_CHANGED",
        );
        const states = rows(await query("STATE", transactionSql.state, [c.propertyId]));
        let observed: StateObservation | null =
          states.length === 0 ? null : state(states[0]!, c.propertyId);
        if (states.length) check(states[0]!["pointer_valid"] === true);
        const prior = rows(
          await query("PRIOR", transactionSql.prior, [c.propertyId, c.operationId]),
        );
        let selected: LocationWriteSuccess["version"], disposition: "CREATED" | "DUPLICATE";
        if (prior.length) {
          check(
            prior[0]!["operation_hash"] === op.hash && prior[0]!["created_by"] === actor.userId,
            "OPERATION_CONFLICT",
          );
          check(observed !== null && observed.currentLocationVersionId !== null);
          selected = version(prior[0]!, op);
          disposition = "DUPLICATE";
        } else {
          check(
            observed === null
              ? c.expected.kind === "ABSENT"
              : c.expected.kind === "EXACT" &&
                  c.expected.revision === observed.revision &&
                  c.expected.currentLocationVersionId === observed.currentLocationVersionId,
            "STALE_EXPECTED_STATE",
          );
          if (c.payload.provider_version_id !== null) {
            const registryRows = rows(
              await query("PROVIDER", transactionSql.provider, [c.payload.provider_version_id]),
            );
            const registry = registryRows[0];
            check(
              registry !== undefined &&
                registry["id"] === c.payload.provider_version_id &&
                registry["deprecated_at"] === null &&
                ["PROVISIONAL", "APPROVED"].includes(String(registry["approval_state"])) &&
                registry["retention_class"] === "PERMANENT" &&
                registry["reviewed_at"] !== null &&
                typeof registry["terms_reference"] === "string" &&
                registry["terms_reference"].length > 0 &&
                typeof registry["review_reference"] === "string" &&
                registry["review_reference"].length > 0 &&
                Array.isArray(registry["capabilities"]) &&
                registry["capabilities"].includes("GEOCODING"),
              "PROVIDER_INELIGIBLE",
            );
            instant(registry["reviewed_at"]);
            check(ports.providerPolicy.permits(actor, c, registry), "PROVIDER_INELIGIBLE");
          }
          if (observed === null) {
            observed = state(
              one(await query("CREATE_STATE", transactionSql.createState, [c.propertyId])),
              c.propertyId,
            );
            check(observed.revision === 0 && observed.currentLocationVersionId === null);
          }
          const latest = decodeSqlBigint(
            one(await query("LATEST", transactionSql.latest, [c.propertyId]))["latest"],
          );
          check(
            latest < Number.MAX_SAFE_INTEGER && observed.revision < Number.MAX_SAFE_INTEGER,
            "VERSION_LIMIT_REACHED",
          );
          check(c.payload.change_reason !== "INITIAL_INPUT" || latest === 0, "VALIDATION_FAILED");
          const id = uuid(globalThis.crypto.randomUUID());
          const inserted = one(
            await query("INSERT", transactionSql.insert, [
              id,
              c.propertyId,
              latest + 1,
              c.operationId,
              op.hash,
              c.propertyInput.digest,
              actor.userId,
              ...semanticFields.map((key) => c.payload[key]),
            ]),
          );
          selected = version(inserted, op);
          check(selected.id === id && selected.versionNumber === latest + 1);
          const updated = state(
            one(
              await query("CAS", transactionSql.cas, [
                c.propertyId,
                id,
                observed.revision,
                observed.currentLocationVersionId,
              ]),
            ),
            c.propertyId,
          );
          check(
            updated.revision === observed.revision + 1 && updated.currentLocationVersionId === id,
          );
          observed = updated;
          disposition = "CREATED";
        }
        check(observed !== null);
        const provisional: LocationWriteSuccess = Object.freeze({
          kind: "COMMITTED",
          disposition,
          operationId: c.operationId,
          version: selected,
          observedState: observed,
          versionIsObservedCurrent: observed.currentLocationVersionId === selected.id,
        });
        stage = "COMMIT";
        // From invocation until explicit acknowledgement, cancellation/loss is ambiguous.
        const ack = await wait((signal, timeoutMs) => {
          certainty = "UNKNOWN";
          unsafe = true;
          return connection!.commit({ signal, timeoutMs });
        }, provisionalBudgets.statementMs);
        if (ack.kind === "COMMITTED") {
          certainty = "COMMITTED";
          clean = true;
          unsafe = false;
          result = provisional;
        } else if (ack.kind === "REJECTED" || ack.kind === "ROLLED_BACK") {
          certainty = "NOT_COMMITTED";
          unsafe = false;
          clean = ack.kind === "ROLLED_BACK";
          throw new ProtocolFault("COMMIT_FAILED");
        } else throw new ProtocolFault("COMMIT_OUTCOME_UNKNOWN");
      } catch (error) {
        // Stage is updated inside awaited callbacks as well as this lexical block.
        const failedAt = stage as Stage;
        const failedCertainty = certainty as "NOT_COMMITTED" | "UNKNOWN" | "COMMITTED";
        failureStage = failedAt;
        sqlState = safeSqlState(error);
        let code: LocationErrorCode =
          failedCertainty === "UNKNOWN"
            ? "COMMIT_OUTCOME_UNKNOWN"
            : isErrorType(error, ProtocolFault)
              ? error.code
              : failedAt === "AUTH"
                ? isErrorType(error, AuthenticationDenied)
                  ? "AUTHENTICATION_FAILED"
                  : "AUTHENTICATION_UNAVAILABLE"
                : isErrorType(error, LocationValidationError) && failedAt === "BUILD"
                  ? "VALIDATION_FAILED"
                  : sqlState === "55P03" || sqlState === "57014" || isErrorType(error, Interrupted)
                    ? "DATABASE_BUSY"
                    : "TRANSACTION_FAILED";
        if (
          connection &&
          owns(connection) &&
          began &&
          !unsafe &&
          !clean &&
          failedCertainty === "NOT_COMMITTED"
        ) {
          try {
            // Cleanup has its own bounded budget, independent of caller cancellation.
            const rollback = await wait(
              (signal, timeoutMs) => connection!.rollback({ signal, timeoutMs }),
              provisionalBudgets.cleanupMs,
              null,
              true,
            );
            check(rollback === "ROLLED_BACK");
            clean = true;
          } catch {
            unsafe = true;
          }
        }
        // Row decoder failures are integrity errors, never external validation advice.
        if (
          isErrorType(error, LocationValidationError) &&
          failedAt !== "BUILD" &&
          failedAt !== "AUTH" &&
          failedCertainty !== "UNKNOWN"
        )
          code = "INTEGRITY_FAILURE";
        result = locationFailure(
          code,
          diagnosticId,
          clean && (sqlState === "40001" || sqlState === "40P01"),
        );
      }
      if (connection && owns(connection)) {
        try {
          await close(connection, unsafe || !clean || quarantined.has(connection));
        } finally {
          forget(connection);
        }
      }
      emitDiagnostic(ports.diagnostics, {
        diagnosticId,
        stage: result.kind === "COMMITTED" ? "COMMIT" : failureStage,
        outcome: result.kind === "COMMITTED" ? result.disposition : result.code,
        certainty,
        cleanup,
        sqlState,
      });
      return result;
    },
  });
}
