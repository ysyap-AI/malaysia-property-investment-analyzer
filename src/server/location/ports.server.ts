import type { TrustedLocationCommand, VerifiedActor } from "../../lib/location/contracts";
import type { UUID } from "../../lib/location/primitives";
import type { DiagnosticEvent } from "./diagnostics.server";

/** Trusted injection points, not implementations. Never bind these to browser functions.
 * verify must authenticate against the approved Auth/SQL target before returning an actor.
 * A cast, decoded token, or caller-supplied actor is not verification. */
export interface ActorVerifierPort {
  verify(evidence: unknown): Promise<VerifiedActor | null>;
}
/** Construct provenance/confirmation from authorized server intent/receipts only.
 * No provider I/O, browser passthrough, or receipt implementation is supplied by I05. */
export interface ServerCommandPort {
  construct(actor: VerifiedActor, intent: unknown): Promise<TrustedLocationCommand>;
}
export type SqlValue = string | number | boolean | null;
export type SqlRow = Readonly<Record<string, unknown>>;
export type QueryResult = Readonly<{ rows: readonly SqlRow[]; rowCount: number }>;
export type CommitAcknowledgement =
  | Readonly<{ kind: "COMMITTED" }>
  | Readonly<{ kind: "REJECTED" }>
  | Readonly<{ kind: "ROLLED_BACK" }>
  | Readonly<{ kind: "UNKNOWN" }>;
export type IoOptions = Readonly<{ signal: AbortSignal; timeoutMs: number }>;
/** One reserved physical transaction connection. No pool.query/REST substitution.
 * Adapter must normalize bigint and UTC timestamps without losing microseconds;
 * preserve binary64 values, bind every value, and never log queries/parameters/errors.
 * commit resolves COMMITTED only for actual server COMMIT completion; an aborted
 * transaction's ROLLBACK tag is ROLLED_BACK. Throws/lost responses are UNKNOWN.
 * discard must synchronously quarantine the connection before its async close;
 * release must not make a failed release available for subsequent acquisition.
 * Signals/timeouts require real cancellation/close qualification in I06. */
export interface ReservedConnection {
  query(sql: string, parameters: readonly SqlValue[], options: IoOptions): Promise<QueryResult>;
  commit(options: IoOptions): Promise<CommitAcknowledgement>;
  rollback(options: IoOptions): Promise<"ROLLED_BACK">;
  release(options: IoOptions): Promise<void>;
  discard(options: IoOptions): Promise<void>;
}
export interface ConnectionPort {
  acquire(options: IoOptions): Promise<ReservedConnection>;
}
/** Synchronous, previously reviewed local policy; no external calls while locked.
 * Must approve exact provider version and every populated persisted field. Default
 * policy is deliberately not supplied. Registry labels alone confer no rights. */
export interface ProviderFieldPolicyPort {
  permits(actor: VerifiedActor, command: TrustedLocationCommand, registry: SqlRow): boolean;
}
export interface DiagnosticsPort {
  emit(event: DiagnosticEvent): void | Promise<void>;
}
export interface TransactionPorts {
  actors: ActorVerifierPort;
  commands: ServerCommandPort;
  connections: ConnectionPort;
  providerPolicy: ProviderFieldPolicyPort;
  diagnostics: DiagnosticsPort;
}
export type ExecutionOptions = Readonly<{ signal?: AbortSignal }>;
export type DiagnosticId = UUID;
