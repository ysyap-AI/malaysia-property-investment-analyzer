/** SYNTHETIC ONLY: in-memory protocol fake, no PostgreSQL/RLS/Auth/concurrency proof. */
import { vi } from "vitest";
import { locationCommand, semanticFields } from "../../src/lib/location/contracts";
import type { TrustedLocationCommand, VerifiedActor } from "../../src/lib/location/contracts";
import { propertyFingerprint } from "../../src/lib/location/canonical";
import {
  createDormantTransactionCore,
  transactionSql,
} from "../../src/server/location/transaction.server";
import type {
  CommitAcknowledgement,
  IoOptions,
  QueryResult,
  ReservedConnection,
  SqlRow,
  SqlValue,
  TransactionPorts,
} from "../../src/server/location/ports.server";
import type { DiagnosticEvent } from "../../src/server/location/diagnostics.server";
import { actorId, command, property, propertyId, time } from "./fixtures";

export function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
export type FakeStore = {
  parent: Record<string, unknown> | null;
  state: Record<string, unknown> | null;
  versions: Record<string, unknown>[];
};
export type Entry = {
  kind: string;
  sql?: string;
  parameters?: readonly SqlValue[];
  signal?: AbortSignal;
  timeoutMs?: number;
};
const answer = (list: readonly SqlRow[]): QueryResult => ({ rows: list, rowCount: list.length });
export const stateRow = (
  revision: number | string | bigint = 0,
  pointer: string | null = null,
) => ({
  property_id: propertyId,
  state_revision: revision,
  current_location_version_id: pointer,
  created_at: time,
  updated_at: time,
});
export class SyntheticConnection implements ReservedConnection {
  transcript: Entry[] = [];
  failures = new Map<string, unknown>();
  overrides = new Map<string, QueryResult>();
  hooks = new Map<string, () => Promise<void> | void>();
  ack: CommitAcknowledgement = { kind: "COMMITTED" };
  unknownApplied = false;
  active: FakeStore | null = null;
  registry: SqlRow = {};
  constructor(public store: FakeStore) {}
  async step(kind: string, options: IoOptions, sql?: string, parameters?: readonly SqlValue[]) {
    this.transcript.push({
      kind,
      signal: options.signal,
      timeoutMs: options.timeoutMs,
      ...(sql === undefined ? {} : { sql }),
      ...(parameters === undefined ? {} : { parameters: structuredClone(parameters) }),
    });
    await this.hooks.get(kind)?.();
    if (this.failures.has(kind)) throw this.failures.get(kind);
  }
  async query(
    sql: string,
    parameters: readonly SqlValue[],
    options: IoOptions,
  ): Promise<QueryResult> {
    const setupIndex = transactionSql.setup.indexOf(sql);
    const kind =
      setupIndex >= 0
        ? `setup${setupIndex}`
        : Object.entries(transactionSql).find(([, text]) => text === sql)?.[0];
    if (!kind) throw new Error("Synthetic fake received unexpected SQL");
    await this.step(kind, options, sql, parameters);
    const override = this.overrides.get(kind);
    if (override) return override;
    if (kind === "begin") {
      this.active = structuredClone(this.store);
      return answer([]);
    }
    const data = this.active!;
    switch (kind) {
      case "parent":
        return answer(data.parent === null ? [] : [data.parent]);
      case "state":
        return answer(
          data.state === null
            ? []
            : [
                {
                  ...data.state,
                  pointer_valid:
                    data.state["current_location_version_id"] === null ||
                    data.versions.some(
                      (v) =>
                        v["id"] === data.state!["current_location_version_id"] &&
                        v["property_id"] === propertyId,
                    ),
                },
              ],
        );
      case "prior":
        return answer(
          data.versions.filter(
            (v) => v["property_id"] === parameters[0] && v["operation_id"] === parameters[1],
          ),
        );
      case "provider":
        return answer([this.registry]);
      case "createState":
        data.state = stateRow();
        return answer([data.state]);
      case "latest":
        return answer([
          {
            latest: data.versions
              .reduce(
                (max, row) =>
                  BigInt(row["version_number"] as string) > max
                    ? BigInt(row["version_number"] as string)
                    : max,
                0n,
              )
              .toString(),
          },
        ]);
      case "insert": {
        const row = {
          id: parameters[0],
          property_id: parameters[1],
          version_number: String(parameters[2]),
          operation_id: parameters[3],
          operation_hash: parameters[4],
          property_input_hash: parameters[5],
          created_by: parameters[6],
          ...Object.fromEntries(semanticFields.map((key, index) => [key, parameters[index + 7]])),
          created_at: time,
          confirmed_at: parameters[21] === "CONFIRMED" ? time : null,
        };
        data.versions.push(row);
        return answer([row]);
      }
      case "cas": {
        // Only these explicit bindings are modeled; this is not SQL/constraint execution.
        if (
          data.state?.["property_id"] !== parameters[0] ||
          data.state?.["state_revision"] === undefined ||
          BigInt(data.state["state_revision"] as string) !== BigInt(parameters[2] as number) ||
          data.state["current_location_version_id"] !== parameters[3]
        )
          return answer([]);
        data.state = {
          ...data.state,
          state_revision: String(BigInt(parameters[2] as number) + 1n),
          current_location_version_id: parameters[1],
        };
        return answer([data.state]);
      }
      default:
        return answer([]);
    }
  }
  async commit(options: IoOptions): Promise<CommitAcknowledgement> {
    if (this.unknownApplied && this.active) Object.assign(this.store, structuredClone(this.active));
    await this.step("commit", options);
    if (this.ack.kind === "COMMITTED" && this.active)
      Object.assign(this.store, structuredClone(this.active));
    if (this.ack.kind === "COMMITTED" || this.ack.kind === "ROLLED_BACK") this.active = null;
    return this.ack;
  }
  async rollback(options: IoOptions): Promise<"ROLLED_BACK"> {
    await this.step("rollback", options);
    this.active = null;
    return "ROLLED_BACK";
  }
  async release(options: IoOptions): Promise<void> {
    await this.step("release", options);
  }
  async discard(options: IoOptions): Promise<void> {
    await this.step("discard", options);
    this.active = null;
  }
}
export async function syntheticHarness() {
  const store: FakeStore = {
    parent: { ...property, id: propertyId, user_id: actorId },
    state: null,
    versions: [],
  };
  let client = new SyntheticConnection(store);
  const evidence = Object.freeze({ syntheticEvidence: true });
  const actor = Object.freeze({
    userId: actorId,
    verifiedAt: time,
    issuer: "synthetic:test-only",
  }) as VerifiedActor;
  const actors = new WeakMap<object, VerifiedActor>([[evidence, actor]]);
  const input = locationCommand(
    { ...command(), propertyInput: await propertyFingerprint(property) },
    actorId,
  );
  const events: DiagnosticEvent[] = [];
  const ports: TransactionPorts = {
    actors: {
      verify: vi.fn(async (value) =>
        typeof value === "object" && value !== null ? (actors.get(value) ?? null) : null,
      ),
    },
    // Controlled synthetic constructor only; this is NOT a browser/production builder.
    commands: { construct: vi.fn(async (_actor, value) => value as TrustedLocationCommand) },
    connections: {
      acquire: vi.fn(async (options) => {
        await client.step("acquire", options);
        return client;
      }),
    },
    providerPolicy: { permits: vi.fn(() => false) },
    diagnostics: {
      emit: vi.fn((event) => {
        events.push(event);
      }),
    },
  };
  const core = createDormantTransactionCore(ports);
  return {
    store,
    ports,
    core,
    evidence,
    actor,
    actors,
    input,
    events,
    get client() {
      return client;
    },
    replaceClient() {
      client = new SyntheticConnection(store);
      return client;
    },
    run(value: unknown = input, options: { signal?: AbortSignal } = {}) {
      return core.execute(evidence, value, options);
    },
  };
}
