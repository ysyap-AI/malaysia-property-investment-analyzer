import { afterEach, describe, expect, it, vi } from "vitest";
import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { ACQUISITION_COST_FIELDS, calculateTotalAcquisitionCost } from "@/lib/finance/acquisition";
import {
  acquisitionCostsSchema,
  type AcquisitionCostsRecord,
} from "@/lib/property/acquisition-fields";
import {
  AcquisitionSaveError,
  createAcquisitionEditor,
  type AcquisitionAttempt,
} from "@/lib/property/acquisition-editor";

const propertyId = "synthetic-property";
function row(
  purchase_price: number | null = 100,
  property_id = propertyId,
): AcquisitionCostsRecord {
  return {
    ...acquisitionCostsSchema.parse({ purchase_price, spa_legal_fee: 0 }),
    id: "synthetic-row",
    property_id,
  } as AcquisitionCostsRecord;
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const clients: QueryClient[] = [];
afterEach(() => {
  for (const client of clients.splice(0)) client.clear();
});
function setup() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: 3 }, queries: { retry: false } },
  });
  clients.push(client);
  const save = vi
    .fn<(attempt: AcquisitionAttempt) => Promise<AcquisitionCostsRecord>>()
    .mockResolvedValue(row(200));
  // Exercise actual TanStack mutation promises, including a genuinely rejected
  // mutation and deferred settlement; this is Node lifecycle coverage, not a DOM.
  const mutation = new MutationObserver(client, { mutationFn: save, retry: false });
  const acknowledge = vi.fn(async (record: AcquisitionCostsRecord, isCurrent: () => boolean) => {
    if (isCurrent()) client.setQueryData(["acquisition-costs", propertyId], record);
  });
  const refresh = vi.fn<() => Promise<AcquisitionCostsRecord | null>>().mockResolvedValue(row(200));
  const editor = createAcquisitionEditor(propertyId, {
    save: (attempt) => mutation.mutate(attempt),
    acknowledge,
    refresh,
  });
  editor.open(row());
  return { editor, client, save, mutation, acknowledge, refresh };
}
async function dispatched() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("acquisition open draft and submitted snapshot", () => {
  it("captures an immutable baseline and keeps it separate from changed, missing and failed query state", async () => {
    const { editor, client } = setup();
    const original = row();
    editor.open(original);
    editor.change("purchase_price", "777");
    original.purchase_price = 900;
    client.setQueryData(["acquisition-costs", propertyId], row(800));
    client.setQueryData(["acquisition-costs", propertyId], null);
    await expect(
      client.fetchQuery({
        queryKey: ["acquisition-costs", propertyId],
        queryFn: async () => {
          throw new Error("failed refetch");
        },
      }),
    ).rejects.toThrow();
    expect(editor.getSnapshot().values.purchase_price).toBe("777");
    expect(editor.getSnapshot().baseline?.purchase_price).toBe(100);
    expect(Object.isFrozen(editor.getSnapshot().baseline)).toBe(true);
    editor.cancel();
    editor.open(row(800));
    expect(editor.getSnapshot().values.purchase_price).toBe(800);
  });

  it.each(["1,5", "NaN", "Infinity", "-1", "1e3", "9007199254740991"])(
    "retains invalid numeric draft %s without a write",
    async (value) => {
      const { editor, save } = setup();
      editor.change("purchase_price", value);
      await editor.submit();
      expect(editor.getSnapshot().values.purchase_price).toBe(value);
      expect(editor.getSnapshot().outcome).toBe("invalid");
      expect(editor.getSnapshot().errors.purchase_price).toBeTruthy();
      expect(save).not.toHaveBeenCalled();
    },
  );

  it("rejects aggregate overflow locally without changing financial formulas", async () => {
    const { editor, save } = setup();
    editor.change("purchase_price", "50000000000000");
    editor.change("other_cost", "50000000000000");
    await editor.submit();
    expect(editor.getSnapshot().outcome).toBe("invalid");
    expect(editor.getSnapshot().values.other_cost).toBe("50000000000000");
    expect(save).not.toHaveBeenCalled();
  });

  it("locks same-tick duplicate submissions and freezes input for a deferred promise", async () => {
    const { editor, save, acknowledge } = setup();
    const wait = deferred<AcquisitionCostsRecord>();
    save.mockReturnValueOnce(wait.promise);
    editor.change("purchase_price", "200");
    const pending = editor.submit();
    await editor.submit();
    await dispatched();
    expect(save).toHaveBeenCalledOnce();
    const attempt = save.mock.calls[0]![0];
    expect(Object.isFrozen(attempt)).toBe(true);
    expect(Object.isFrozen(attempt.values)).toBe(true);
    editor.change("purchase_price", "999");
    editor.cancel();
    expect(editor.getSnapshot().values.purchase_price).toBe("200");
    expect(editor.getSnapshot().outcome).toBe("pending");
    expect(acknowledge).not.toHaveBeenCalled();
    wait.resolve(row(200));
    await pending;
    expect(editor.getSnapshot().outcome).toBe("saved");
    expect(acknowledge).toHaveBeenCalledOnce();
  });

  it.each(["not-sent", "rejected"] as const)(
    "a genuinely rejected %s mutation settles pending and preserves the draft",
    async (outcome) => {
      const { editor, save, mutation } = setup();
      const wait = deferred<AcquisitionCostsRecord>();
      save.mockReturnValueOnce(wait.promise);
      editor.change("purchase_price", "234.50");
      const pending = editor.submit();
      await dispatched();
      wait.reject(new AcquisitionSaveError(outcome));
      await pending;
      expect(mutation.getCurrentResult().isError).toBe(true);
      expect(editor.getSnapshot().outcome).toBe(outcome);
      expect(editor.getSnapshot().values.purchase_price).toBe("234.50");
      expect(editor.getSnapshot().editing).toBe(true);
      save.mockResolvedValueOnce(row(234.5));
      await editor.submit();
      expect(save).toHaveBeenCalledTimes(2);
      expect(editor.getSnapshot().outcome).toBe("saved");
    },
  );

  it.each([new Error("sensitive SQL amount 234.50"), null, "payload"])(
    "unknown rejected promises stay uncertain and are never automatically retried (%s)",
    async (reason) => {
      const { editor, save, acknowledge, refresh } = setup();
      save.mockRejectedValueOnce(reason);
      editor.change("purchase_price", "234.50");
      await editor.submit();
      expect(editor.getSnapshot().outcome).toBe("uncertain");
      expect(editor.getSnapshot().values.purchase_price).toBe("234.50");
      expect(acknowledge).not.toHaveBeenCalled();
      expect(refresh).not.toHaveBeenCalled();
      await editor.submit();
      expect(save).toHaveBeenCalledOnce();
    },
  );

  it.each([null, undefined, { id: "wrong", property_id: "other-property" }])(
    "requires a confirmed matching returned row (%s)",
    async (result) => {
      const { editor, save, acknowledge } = setup();
      save.mockResolvedValueOnce(result as AcquisitionCostsRecord);
      await editor.submit();
      expect(editor.getSnapshot().outcome).toBe("uncertain");
      expect(acknowledge).not.toHaveBeenCalled();
    },
  );
});

describe("confirmed saves, refreshes and uncertainty review", () => {
  it("acknowledges the returned row before a deferred follow-up read settles", async () => {
    const { editor, client, refresh } = setup();
    const wait = deferred<AcquisitionCostsRecord | null>();
    refresh.mockReturnValueOnce(wait.promise);
    const pending = editor.submit();
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(editor.getSnapshot().outcome).toBe("saved");
    expect(editor.getSnapshot().reviewing).toBe(true);
    expect(editor.getSnapshot().baseline?.purchase_price).toBe(200);
    expect(client.getQueryData(["acquisition-costs", propertyId])).toEqual(row(200));
    wait.reject(new Error("read failure"));
    await pending;
    expect(editor.getSnapshot().outcome).toBe("saved-refresh-failed");
    expect(editor.getSnapshot().values.purchase_price).toBe(200);
    expect(editor.getSnapshot().reviewing).toBe(false);
  });

  it("a cache update failure remains a confirmed save with failed refresh", async () => {
    const { editor, acknowledge } = setup();
    acknowledge.mockRejectedValueOnce(new Error("cache failure"));
    await editor.submit();
    expect(editor.getSnapshot().outcome).toBe("saved-refresh-failed");
    expect(editor.getSnapshot().baseline?.purchase_price).toBe(200);
  });

  it("a deliberate successful review clears a previous post-save refresh failure", async () => {
    const { editor, refresh } = setup();
    refresh.mockRejectedValueOnce(new Error("read failure"));
    await editor.submit();
    expect(editor.getSnapshot().outcome).toBe("saved-refresh-failed");
    await editor.review();
    expect(editor.getSnapshot().outcome).toBe("saved");
    expect(editor.getSnapshot().review).toBe("available");
  });

  it.each([row(234.5), row(999), null])(
    "review is evidence only, retains uncertain draft and never replays (%s)",
    async (result) => {
      const { editor, save, refresh } = setup();
      save.mockRejectedValueOnce(new AcquisitionSaveError("uncertain"));
      editor.change("purchase_price", "234.50");
      await editor.submit();
      refresh.mockResolvedValueOnce(result);
      await editor.review();
      expect(editor.getSnapshot().review).toBe("available");
      expect(editor.getSnapshot().reviewed).toEqual(result);
      expect(editor.getSnapshot().values.purchase_price).toBe("234.50");
      expect(editor.getSnapshot().baseline?.purchase_price).toBe(100);
      expect(editor.getSnapshot().outcome).toBe("uncertain");
      await editor.submit();
      expect(save).toHaveBeenCalledOnce();
    },
  );

  it("failed review retains uncertainty and permits another deliberate read", async () => {
    const { editor, save, refresh } = setup();
    save.mockRejectedValueOnce(new AcquisitionSaveError("uncertain"));
    await editor.submit();
    refresh.mockRejectedValueOnce(new Error("failed read"));
    await editor.review();
    expect(editor.getSnapshot().outcome).toBe("uncertain");
    expect(editor.getSnapshot().review).toBe("failed");
    await editor.review();
    expect(editor.getSnapshot().review).toBe("available");
    expect(save).toHaveBeenCalledOnce();
  });

  it("blank and entered zero remain distinct in the submitted and acknowledged values", async () => {
    const { editor, save, refresh } = setup();
    const saved = row(null);
    save.mockResolvedValueOnce(saved);
    refresh.mockResolvedValueOnce(saved);
    editor.change("purchase_price", "");
    editor.change("spa_legal_fee", "0");
    await editor.submit();
    const submitted = save.mock.calls[0]![0].values;
    expect(submitted.purchase_price).toBeNull();
    expect(submitted.spa_legal_fee).toBe(0);
    expect(calculateTotalAcquisitionCost(submitted).status).toBe("incomplete");
    expect(editor.getSnapshot().values.purchase_price).toBe("");
    expect(editor.getSnapshot().values.spa_legal_fee).toBe(0);
    expect(calculateTotalAcquisitionCost(row(0)).status).toBe("partial");
    expect(
      calculateTotalAcquisitionCost(Object.fromEntries(ACQUISITION_COST_FIELDS.map((f) => [f, 0])))
        .status,
    ).toBe("complete");
  });
});

describe("property, identity and attempt lifetime", () => {
  it.each(["resolve", "reject"] as const)(
    "ignores late %s after disposal and discards private draft",
    async (settlement) => {
      const { editor, save, acknowledge, refresh } = setup();
      const wait = deferred<AcquisitionCostsRecord>();
      save.mockReturnValueOnce(wait.promise);
      editor.change("purchase_price", "123456");
      const pending = editor.submit();
      await dispatched();
      const attempt = save.mock.calls[0]![0];
      editor.dispose();
      expect(attempt.isCurrent()).toBe(false);
      expect(editor.getSnapshot().baseline).toBeNull();
      expect(editor.getSnapshot().values.purchase_price).toBe("");
      if (settlement === "resolve") wait.resolve(row(200));
      else wait.reject(new Error("late private failure"));
      await pending;
      expect(editor.getSnapshot().active).toBe(false);
      expect(acknowledge).not.toHaveBeenCalled();
      expect(refresh).not.toHaveBeenCalled();
    },
  );

  it("old attempts cannot contaminate a new editor generation, including Strict Mode reactivation", async () => {
    const { editor, save, acknowledge } = setup();
    const old = deferred<AcquisitionCostsRecord>();
    save.mockReturnValueOnce(old.promise);
    const pending = editor.submit();
    await dispatched();
    editor.dispose();
    editor.activate();
    editor.open(row(300));
    editor.change("purchase_price", "345");
    old.resolve(row(200));
    await pending;
    expect(editor.getSnapshot().values.purchase_price).toBe("345");
    expect(editor.getSnapshot().baseline?.purchase_price).toBe(300);
    expect(acknowledge).not.toHaveBeenCalled();
    await editor.submit();
    expect(acknowledge).toHaveBeenCalledOnce();
  });

  it("ignores a late review from a preceding property/editor lifetime", async () => {
    const { editor, refresh } = setup();
    const wait = deferred<AcquisitionCostsRecord | null>();
    refresh.mockReturnValueOnce(wait.promise);
    const pending = editor.review();
    editor.dispose();
    editor.activate();
    editor.open(row(400));
    wait.resolve(row(200));
    await pending;
    expect(editor.getSnapshot().baseline?.purchase_price).toBe(400);
    expect(editor.getSnapshot().review).toBe("none");
  });
});
