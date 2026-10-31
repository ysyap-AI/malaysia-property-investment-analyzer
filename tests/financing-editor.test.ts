import { describe, expect, it, vi } from "vitest";
import {
  createFinancingEditor,
  FinancingSaveError,
  financingPriceContext,
  isFinancingRecord,
  type PriceContext,
} from "@/lib/property/financing-editor";
import {
  buildFinancingRow,
  financingSchema,
  type FinancingRecord,
} from "@/lib/property/financing-fields";
import { deferred, financingRecord, propertyId } from "./financing-save-fixtures";

function setup() {
  let context: PriceContext = financingPriceContext(1000, true);
  const save = vi.fn(async (attempt) => ({ ...financingRecord(), ...attempt.values }));
  const acknowledge = vi.fn(async () => {});
  const refresh = vi.fn(async (): Promise<FinancingRecord | null> => financingRecord());
  const editor = createFinancingEditor(propertyId, {
    context: () => context,
    save,
    acknowledge,
    refresh,
  });
  editor.open(financingRecord());
  return {
    editor,
    save,
    acknowledge,
    refresh,
    price: (price: unknown, available = true) => {
      context = financingPriceContext(price, available);
      editor.observeContext();
    },
  };
}
describe("financing draft lifecycle (offline promises)", () => {
  it("captures an immutable saved baseline or confirmed absence and exact independent draft", () => {
    const { editor } = setup();
    const baseline = editor.getSnapshot().baseline;
    editor.change("loan_amount", "000234.50");
    editor.change("loan_type", "Islamic");
    editor.change("financing_notes", "  exact notes  ");
    editor.change("bank_quote_verified", true);
    expect(editor.getSnapshot()).toMatchObject({
      baseline,
      values: {
        loan_amount: "000234.50",
        loan_type: "Islamic",
        financing_notes: "  exact notes  ",
        bank_quote_verified: true,
      },
    });
    expect(Object.isFrozen(baseline)).toBe(true);
    editor.cancel();
    editor.open(null);
    expect(editor.getSnapshot().baseline).toBeNull();
    expect(editor.getSnapshot().values.loan_amount).toBe("");
  });
  it("retains existing saved text spacing without inventing invalid read failures", () => {
    const { editor } = setup();
    editor.open({ ...financingRecord(), loan_type: " Other ", financing_notes: "  saved notes  " });
    expect(editor.getSnapshot().values).toMatchObject({
      loan_type: " Other ",
      financing_notes: "  saved notes  ",
    });
  });
  it.each(["1,5", "NaN", "Infinity", "1e3", "-1", "9999999999999999999"])(
    "preserves invalid numeric text %s without dispatch",
    async (value) => {
      const { editor, save } = setup();
      editor.change("loan_amount", value);
      await editor.submit();
      expect(editor.getSnapshot()).toMatchObject({
        outcome: "invalid",
        values: { loan_amount: value },
      });
      expect(save).not.toHaveBeenCalled();
    },
  );
  it("locks duplicate submissions and all changes through mutation and follow-up Review", async () => {
    const { editor, save, refresh } = setup();
    const write = deferred<FinancingRecord>();
    const read = deferred<FinancingRecord>();
    save.mockReturnValueOnce(write.promise);
    refresh.mockReturnValueOnce(read.promise);
    const pending = editor.submit();
    const attempt = save.mock.calls[0]![0];
    await editor.submit();
    editor.change("loan_amount", "999");
    editor.cancel();
    editor.adoptPrice();
    expect(save).toHaveBeenCalledOnce();
    expect(editor.getSnapshot().outcome).toBe("pending");
    expect(Object.isFrozen(attempt)).toBe(true);
    expect(Object.isFrozen(attempt.values)).toBe(true);
    write.resolve(financingRecord());
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    await editor.submit();
    editor.change("loan_amount", "999");
    expect(editor.getSnapshot().reviewing).toBe(true);
    expect(editor.getSnapshot().values.loan_amount).toBe("200");
    read.resolve(financingRecord());
    await pending;
    expect(editor.getSnapshot().outcome).toBe("saved");
  });
  it.each(["rejected", "not-sent", "uncertain"] as const)(
    "settles genuine %s rejection and retains the draft",
    async (outcome) => {
      const { editor, save } = setup();
      const write = deferred<FinancingRecord>();
      save.mockReturnValueOnce(write.promise);
      editor.change("loan_amount", "000234.50");
      const pending = editor.submit();
      write.reject(new FinancingSaveError(outcome));
      await pending;
      expect(editor.getSnapshot()).toMatchObject({ outcome, values: { loan_amount: "000234.50" } });
      if (outcome === "uncertain") {
        await editor.submit();
        expect(save).toHaveBeenCalledOnce();
      }
    },
  );
  it("keeps unknown thrown causes out of state", async () => {
    const { editor, save } = setup();
    save.mockRejectedValueOnce(new Error("SQL private amount=234.50"));
    await editor.submit();
    expect(editor.getSnapshot().outcome).toBe("uncertain");
    expect(JSON.stringify(editor.getSnapshot())).not.toContain("SQL private");
  });
  it.each([
    null,
    { id: "row" },
    { ...financingRecord(), property_id: "other" },
    financingRecord(300),
    { ...financingRecord(), bank_quote_verified: "false" },
  ])("rejects nonmatching/full malformed acknowledgements %s", async (row) => {
    const { editor, save, acknowledge } = setup();
    save.mockResolvedValueOnce(row as FinancingRecord);
    await editor.submit();
    expect(editor.getSnapshot().outcome).toBe("uncertain");
    expect(acknowledge).not.toHaveBeenCalled();
  });
  it.each(["cache", "read"])(
    "keeps confirmed writing distinct from failed %s refresh",
    async (phase) => {
      const { editor, acknowledge, refresh } = setup();
      (phase === "cache" ? acknowledge : refresh).mockRejectedValueOnce(new Error("private"));
      await editor.submit();
      expect(editor.getSnapshot()).toMatchObject({
        outcome: "saved-refresh-failed",
        baseline: financingRecord(),
      });
    },
  );
  it.each([null, financingRecord(), financingRecord(500)])(
    "Review is read-only evidence and never resolves uncertainty or replaces the draft: %s",
    async (row) => {
      const { editor, save, refresh } = setup();
      save.mockRejectedValueOnce(new FinancingSaveError("uncertain"));
      editor.change("loan_amount", "000234.50");
      await editor.submit();
      refresh.mockResolvedValueOnce(row);
      await editor.review();
      await editor.submit();
      expect(editor.getSnapshot()).toMatchObject({
        outcome: "uncertain",
        reviewed: row,
        values: { loan_amount: "000234.50" },
      });
      expect(save).toHaveBeenCalledOnce();
    },
  );
  it("failed Review retains values and pending Review locks actions", async () => {
    const { editor, refresh } = setup();
    const read = deferred<FinancingRecord>();
    refresh.mockReturnValueOnce(read.promise);
    const pending = editor.review();
    editor.cancel();
    editor.change("loan_amount", "999");
    await editor.review();
    expect(refresh).toHaveBeenCalledOnce();
    expect(editor.getSnapshot().editing).toBe(true);
    read.reject(new Error("private"));
    await pending;
    expect(editor.getSnapshot()).toMatchObject({
      review: "failed",
      values: { loan_amount: "200" },
    });
  });
  it.each(["write", "review"])(
    "discards %s late completion and Strict Mode reactivation starts clean",
    async (phase) => {
      const { editor, save, refresh, acknowledge } = setup();
      const held = deferred<FinancingRecord>();
      (phase === "write" ? save : refresh).mockReturnValueOnce(held.promise);
      const pending = phase === "write" ? editor.submit() : editor.review();
      editor.dispose();
      editor.activate();
      editor.open(null);
      held.resolve(financingRecord());
      await pending;
      expect(acknowledge).not.toHaveBeenCalled();
      expect(editor.getSnapshot()).toMatchObject({
        baseline: null,
        outcome: "idle",
        reviewed: null,
      });
    },
  );
  it("Cancel/reopen deliberately adopts the latest baseline and context", () => {
    const { editor, price } = setup();
    editor.change("loan_amount", "999");
    price(2000);
    editor.cancel();
    editor.open(financingRecord(500));
    expect(editor.getSnapshot()).toMatchObject({
      values: { loan_amount: "500" },
      context: { price: 2000 },
      contextChanged: false,
    });
  });
});

describe("financing purchase-price context", () => {
  it.each([2000, null, undefined, NaN, -1, Infinity])(
    "latches changed price/availability (%s) until deliberate available adoption",
    async (price) => {
      const h = setup();
      h.editor.change("loan_amount", "000234.50");
      h.price(price);
      await h.editor.submit();
      expect(h.save).not.toHaveBeenCalled();
      expect(h.editor.getSnapshot()).toMatchObject({
        contextChanged: true,
        context: { price: 1000 },
        values: { loan_amount: "000234.50" },
      });
      if (price === null) {
        h.editor.adoptPrice();
        expect(h.editor.getSnapshot().contextChanged).toBe(true);
      }
      h.price(1000);
      await h.editor.submit();
      expect(h.save).not.toHaveBeenCalled();
      h.editor.adoptPrice();
      await h.editor.submit();
      expect(h.save).toHaveBeenCalledOnce();
    },
  );
  it("does not manufacture availability from stale acquisition data after read errors", async () => {
    const h = setup();
    h.price(1000, false);
    h.editor.adoptPrice();
    await h.editor.submit();
    expect(h.editor.getSnapshot().contextChanged).toBe(true);
    expect(h.save).not.toHaveBeenCalled();
  });
  it("vetoes dispatch after a context change without invalidating the current outcome", async () => {
    const h = setup();
    const held = deferred<FinancingRecord>();
    h.save.mockReturnValueOnce(held.promise);
    const pending = h.editor.submit();
    const attempt = h.save.mock.calls[0]![0];
    h.price(2000);
    expect(attempt.isCurrent()).toBe(true);
    expect(attempt.canDispatch()).toBe(false);
    held.reject(new FinancingSaveError("not-sent"));
    await pending;
    expect(h.editor.getSnapshot()).toMatchObject({ outcome: "not-sent", contextChanged: true });
  });
  it("a dispatched attempt uses its immutable adopted LTV price even after drift", async () => {
    const h = setup();
    h.editor.change("loan_to_value_percent", "90");
    const held = deferred<FinancingRecord>();
    h.save.mockReturnValueOnce(held.promise);
    const pending = h.editor.submit();
    const attempt = h.save.mock.calls[0]![0];
    h.price(2000);
    expect(attempt.values.loan_amount).toBe(900);
    expect(attempt.context.price).toBe(1000);
    held.resolve({ ...financingRecord(), ...attempt.values });
    await pending;
    expect(h.editor.getSnapshot()).toMatchObject({
      outcome: "saved",
      contextChanged: true,
      context: { price: 1000 },
    });
    await h.editor.submit();
    expect(h.save).toHaveBeenCalledOnce();
  });
  it.each([null, 0])(
    "confirmed missing price/entered zero retains existing null and zero semantics (%s)",
    async (price) => {
      const h = setup();
      h.editor.cancel();
      h.price(price);
      h.editor.open(null);
      h.editor.change("loan_amount", "0");
      h.editor.change("annual_interest_rate_percent", "0");
      h.editor.change("loan_tenure_years", "10");
      await h.editor.submit();
      expect(h.save.mock.calls[0]![0].values).toMatchObject({
        loan_amount: 0,
        calculated_monthly_instalment: 0,
        down_payment: price,
      });
    },
  );
  it.each([true, false])(
    "preserves LTV priority, quoted/calculated selection and evidence (%s)",
    async (quote) => {
      const h = setup();
      h.editor.change("loan_to_value_percent", "90");
      h.editor.change("loan_amount", "123");
      h.editor.change("user_provided_monthly_instalment", "0");
      h.editor.change("use_user_provided_instalment", quote);
      h.editor.change("bank_quote_verified", true);
      await h.editor.submit();
      expect(h.save.mock.calls[0]![0].values).toEqual(
        buildFinancingRow(
          financingSchema.parse({
            ...h.editor.getSnapshot().values,
            loan_amount: "123",
          }),
          1000,
        ),
      );
      expect(h.save.mock.calls[0]![0].values).toMatchObject({
        loan_amount: 900,
        user_provided_monthly_instalment: 0,
        use_user_provided_instalment: quote,
        bank_quote_verified: true,
      });
    },
  );
  it("requires a valid full record", () => {
    expect(isFinancingRecord(financingRecord(), propertyId)).toBe(true);
  });
});
