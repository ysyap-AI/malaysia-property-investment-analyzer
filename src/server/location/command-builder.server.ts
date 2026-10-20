import { locationCommand } from "../../lib/location/contracts";
import type { TrustedLocationCommand, VerifiedActor } from "../../lib/location/contracts";
import { operationHash } from "../../lib/location/canonical";
import { instant, record, text, uuid } from "../../lib/location/primitives";
import type { Sha256 } from "../../lib/location/primitives";
import type { ActorVerifierPort, ServerCommandPort } from "./ports.server";

export class AuthenticationDenied extends Error {}
export type FrozenOperation = Readonly<{
  actor: VerifiedActor;
  command: TrustedLocationCommand;
  hash: Sha256;
}>;
/** Only the trusted verifier's return is considered; no actor argument is exposed.
 * Snapshot/revalidate both port outputs, freezing every nested semantic object before
 * hash/acquisition. No retry can mutate expectations, receipt, actor or operation ID. */
export async function buildFrozenOperation(
  verifier: ActorVerifierPort,
  builder: ServerCommandPort,
  evidence: unknown,
  intent: unknown,
): Promise<FrozenOperation> {
  const verified = await verifier.verify(evidence);
  if (verified === null) throw new AuthenticationDenied();
  const fields = record(verified, ["userId", "verifiedAt", "issuer"], "verifiedActor");
  const actor = Object.freeze({
    userId: uuid(fields["userId"]),
    verifiedAt: instant(fields["verifiedAt"]),
    issuer: text(fields["issuer"], "issuer", 2048, true),
  }) as VerifiedActor;
  const command = locationCommand(await builder.construct(actor, intent), actor.userId);
  const hash = await operationHash(command, actor.userId);
  return Object.freeze({ actor, command, hash });
}
