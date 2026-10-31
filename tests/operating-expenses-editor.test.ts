import { afterEach, describe, expect, it, vi } from "vitest";
import { MutationObserver, QueryClient } from "@tanstack/react-query";
import {
  OPERATING_EXPENSE_FIELDS,
  calculateTotalAnnualOperatingExpenses,
} from "@/lib/finance/operating-expenses";
import { type OperatingExpensesRecord } from "@/lib/property/operating-expense-fields";
import {
  createOperatingExpensesEditor,
  OperatingExpensesSaveError,
  isOperatingExpensesRecord,
  type OperatingExpensesAttempt,
} from "@/lib/property/operating-expenses-editor";
import { deferred, expenseRow, propertyId } from "./operating-expenses-save-fixtures";

const clients: QueryClient[] = [];
afterEach(() => {
  clients.splice(0).forEach((client) => client.clear());
});
function setup(row: OperatingExpensesRecord | null = expenseRow()) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: 3 }, queries: { retry: false } },
  });
  clients.push(client);
  const save = vi
    .fn<(attempt: OperatingExpensesAttempt) => Promise<OperatingExpensesRecord>>()
    .mockImplementation(async (attempt) => ({ ...expenseRow(), ...attempt.values }));
  // Real mutation promises; these tests do not mount React or use a browser.
  const mutation = new MutationObserver(client, { mutationFn: save, retry: false });
  const acknowledge = vi.fn(async (record: OperatingExpensesRecord, isCurrent: () => boolean) => {
    if (isCurrent()) client.setQueryData(["operating-expenses", propertyId], record);
  });
  const refresh = vi.fn<() => Promise<OperatingExpensesRecord | null>>().mockResolvedValue(row);
  const editor = createOperatingExpensesEditor(propertyId, {
    save: (attempt) => mutation.mutate(attempt),
    acknowledge,
    refresh,
  });
  editor.open(row);
  return { editor, client, save, mutation, acknowledge, refresh };
}

describe("operating-expense draft and annual contract", () => {
  it("captures a copied frozen baseline and independent values/bases for all fourteen fields", () => {
    const original = expenseRow();
    const { editor } = setup(original);
    original.annual_maintenance_fee = 999;
    const baseline = editor.getSnapshot().baseline;
    expect(Object.isFrozen(baseline)).toBe(true);
    expect(baseline?.annual_maintenance_fee).toBe(100);
    OPERATING_EXPENSE_FIELDS.forEach((field, index) => {
      editor.change(field, `${index}.50`);
      editor.changeBasis(field, index % 2 ? "annual" : "monthly");
    });
    const state = editor.getSnapshot();
    expect(Object.keys(state.values)).toHaveLength(14);
    OPERATING_EXPENSE_FIELDS.forEach((field, index) => {
      expect(state.values[field]).toBe(`${index}.50`);
      expect(state.bases[field]).toBe(index % 2 ? "annual" : "monthly");
    });
    editor.open(expenseRow(888));
    expect(editor.getSnapshot()).toBe(state);
  });

  it("captures confirmed absence and never fabricates missing expenses", async () => {
    const { editor, save } = setup(null);
    expect(editor.getSnapshot().baseline).toBeNull();
    await editor.submit();
    expect(save.mock.calls[0]![0].values).toEqual(
      Object.fromEntries(OPERATING_EXPENSE_FIELDS.map((f) => [f, null])),
    );
    expect(editor.getSnapshot().outcome).toBe("saved");
  });

  it.each(["1,5", "NaN", "Infinity", "-1", "1e3", "0x100", "9007199254740991"])(
    "retains invalid text and monthly basis: %s",
    async (value) => {
      const { editor, save } = setup();
      editor.change("annual_maintenance_fee", value);
      editor.changeBasis("annual_maintenance_fee", "monthly");
      await editor.submit();
      expect(editor.getSnapshot()).toMatchObject({
        outcome: "invalid",
        values: { annual_maintenance_fee: value },
        bases: { annual_maintenance_fee: "monthly" },
      });
      expect(editor.getSnapshot().errors.annual_maintenance_fee).toBeTruthy();
      expect(save).not.toHaveBeenCalled();
    },
  );

  it.each(["annual", "monthly"] as const)(
    "rejects aggregate or conversion overflow (%s) without dispatch",
    async (basis) => {
      const { editor, save } = setup();
      editor.change("annual_maintenance_fee", "50000000000000");
      editor.changeBasis("annual_maintenance_fee", basis);
      if (basis === "annual") editor.change("annual_sinking_fund", "50000000000000");
      await editor.submit();
      expect(editor.getSnapshot().outcome).toBe("invalid");
      expect(editor.getSnapshot().values.annual_maintenance_fee).toBe("50000000000000");
      expect(save).not.toHaveBeenCalled();
    },
  );

  it("roundtrips mixed monthly/annual, blank and zero exactly once without changing the frozen engine", async () => {
    const { editor, save, refresh } = setup(null);
    editor.change("annual_maintenance_fee", " 1,234.50 ");
    editor.changeBasis("annual_maintenance_fee", "monthly");
    editor.change("annual_assessment_tax", "125.75");
    editor.change("annual_sinking_fund", "0");
    editor.changeBasis("annual_sinking_fund", "monthly");
    const values = editor.getSnapshot().values,
      bases = editor.getSnapshot().bases;
    await editor.submit();
    const submitted = save.mock.calls[0]![0].values;
    expect(submitted.annual_maintenance_fee).toBe(14814);
    expect(submitted.annual_assessment_tax).toBe(125.75);
    expect(submitted.annual_sinking_fund).toBe(0);
    expect(submitted.annual_repair_reserve).toBeNull();
    expect(calculateTotalAnnualOperatingExpenses(submitted)).toMatchObject({
      status: "partial",
      total: 14939.75,
      zeroFields: ["annual_sinking_fund"],
    });
    expect(editor.getSnapshot().values).toBe(values);
    expect(editor.getSnapshot().bases).toBe(bases);
    const saved = { ...expenseRow(), ...submitted };
    refresh.mockResolvedValueOnce(saved);
    await editor.review();
    expect(editor.getSnapshot().reviewed?.annual_maintenance_fee).toBe(14814);
    await editor.submit();
    expect(save.mock.calls[1]![0].values).toEqual(submitted);
    editor.cancel();
    editor.open(saved);
    expect(editor.getSnapshot().values.annual_maintenance_fee).toBe(14814);
    expect(Object.values(editor.getSnapshot().bases).every((basis) => basis === "annual")).toBe(
      true,
    );
    await editor.submit();
    expect(save.mock.calls[2]![0].values).toEqual(submitted);
  });

  it("freezes a complete annual attempt and synchronously rejects overlaps and pending edits", async () => {
    const { editor, save, acknowledge } = setup();
    const held = deferred<OperatingExpensesRecord>();
    save.mockReturnValueOnce(held.promise);
    editor.change("annual_maintenance_fee", "25.50");
    editor.changeBasis("annual_maintenance_fee", "monthly");
    const pending = editor.submit();
    await editor.submit();
    await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
    const attempt = save.mock.calls[0]![0];
    expect(attempt.values.annual_maintenance_fee).toBe(306);
    expect(Object.isFrozen(attempt)).toBe(true);
    expect(Object.isFrozen(attempt.values)).toBe(true);
    const locked = editor.getSnapshot();
    editor.change("annual_maintenance_fee", "999");
    editor.changeBasis("annual_maintenance_fee", "annual");
    editor.cancel();
    editor.open(null);
    await editor.review();
    expect(editor.getSnapshot()).toBe(locked);
    expect(acknowledge).not.toHaveBeenCalled();
    held.resolve(expenseRow(306));
    await pending;
    expect(editor.getSnapshot().outcome).toBe("saved");
  });
});

describe("expense outcomes, review and lifetime", () => {
  it.each(["not-sent", "rejected"] as const)(
    "settles a real rejected %s promise preserving exact draft and permitting deliberate correction",
    async (outcome) => {
      const { editor, save, mutation } = setup();
      const held = deferred<OperatingExpensesRecord>();
      save.mockReturnValueOnce(held.promise);
      editor.change("annual_maintenance_fee", "0234.50");
      editor.changeBasis("annual_maintenance_fee", "monthly");
      const pending = editor.submit();
      await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
      held.reject(new OperatingExpensesSaveError(outcome));
      await pending;
      expect(mutation.getCurrentResult().isError).toBe(true);
      expect(editor.getSnapshot()).toMatchObject({
        outcome,
        values: { annual_maintenance_fee: "0234.50" },
        bases: { annual_maintenance_fee: "monthly" },
      });
      await editor.submit();
      expect(save).toHaveBeenCalledTimes(2);
      expect(editor.getSnapshot().outcome).toBe("saved");
    },
  );

  it.each([new Error("private SQL payload"), null, "payload"])(
    "unknown rejection stays uncertain without retry/replay (%s)",
    async (reason) => {
      const { editor, save, acknowledge } = setup();
      save.mockRejectedValueOnce(reason);
      await editor.submit();
      await editor.submit();
      editor.changeBasis("annual_maintenance_fee", "monthly");
      editor.change("annual_maintenance_fee", "200");
      await editor.submit();
      expect(editor.getSnapshot().outcome).toBe("uncertain");
      expect(save).toHaveBeenCalledOnce();
      expect(acknowledge).not.toHaveBeenCalled();
    },
  );

  it.each([
    null,
    undefined,
    expenseRow(101),
    expenseRow(100, "other"),
    { ...expenseRow(), annual_sinking_fund: null },
    { ...expenseRow(), annual_repair_reserve: undefined },
  ])("requires a complete valid row with every submitted annual amount (%s)", async (row) => {
    const { editor, save, acknowledge } = setup();
    save.mockResolvedValueOnce(row as OperatingExpensesRecord);
    await editor.submit();
    expect(editor.getSnapshot().outcome).toBe("uncertain");
    expect(acknowledge).not.toHaveBeenCalled();
  });

  it.each([null, expenseRow(100), expenseRow(500)])(
    "separate Review cannot resolve uncertainty or replace draft (%s)",
    async (reviewed) => {
      const { editor, save, refresh } = setup();
      editor.change("annual_maintenance_fee", "025.50");
      editor.changeBasis("annual_maintenance_fee", "monthly");
      save.mockRejectedValueOnce(new OperatingExpensesSaveError("uncertain"));
      await editor.submit();
      const snapshot = editor.getSnapshot();
      refresh.mockResolvedValueOnce(reviewed);
      await editor.review();
      expect(editor.getSnapshot().reviewed).toEqual(reviewed);
      expect(editor.getSnapshot().values).toBe(snapshot.values);
      expect(editor.getSnapshot().bases).toBe(snapshot.bases);
      expect(editor.getSnapshot().baseline).toBe(snapshot.baseline);
      await editor.submit();
      expect(save).toHaveBeenCalledOnce();
      expect(editor.getSnapshot().outcome).toBe("uncertain");
    },
  );

  it("keeps uncertainty on failed/malformed Review and disables all operations during deferred Review", async () => {
    const { editor, save, refresh } = setup();
    save.mockRejectedValueOnce(new OperatingExpensesSaveError("uncertain"));
    await editor.submit();
    const held = deferred<OperatingExpensesRecord | null>();
    refresh.mockReturnValueOnce(held.promise);
    const pending = editor.review(),
      locked = editor.getSnapshot();
    editor.changeBasis("annual_maintenance_fee", "monthly");
    editor.change("annual_maintenance_fee", "999");
    editor.cancel();
    await editor.submit();
    await editor.review();
    expect(editor.getSnapshot()).toBe(locked);
    held.reject(new Error("private read"));
    await pending;
    expect(editor.getSnapshot()).toMatchObject({
      outcome: "uncertain",
      review: "failed",
      reviewing: false,
    });
    refresh.mockResolvedValueOnce({ id: "bad" } as OperatingExpensesRecord);
    await editor.review();
    expect(editor.getSnapshot().review).toBe("failed");
  });

  it.each(["cache", "refresh"])(
    "retains confirmation when %s fails and permits fresh Review",
    async (stage) => {
      const { editor, acknowledge, refresh, save } = setup();
      if (stage === "cache") acknowledge.mockRejectedValueOnce(new Error("private cache"));
      else refresh.mockRejectedValueOnce(new Error("private read"));
      await editor.submit();
      expect(editor.getSnapshot()).toMatchObject({
        outcome: "saved-refresh-failed",
        baseline: expenseRow(),
        reviewing: false,
      });
      await editor.review();
      expect(editor.getSnapshot().outcome).toBe("saved");
      expect(save).toHaveBeenCalledOnce();
    },
  );

  it("confirms before a held refresh settles while retaining pending controls and submitted basis", async () => {
    const { editor, refresh, client } = setup();
    const held = deferred<OperatingExpensesRecord | null>();
    refresh.mockReturnValueOnce(held.promise);
    editor.change("annual_maintenance_fee", "10");
    editor.changeBasis("annual_maintenance_fee", "monthly");
    const pending = editor.submit();
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(editor.getSnapshot()).toMatchObject({
      outcome: "saved",
      reviewing: true,
      baseline: { annual_maintenance_fee: 120 },
      values: { annual_maintenance_fee: "10" },
      bases: { annual_maintenance_fee: "monthly" },
    });
    expect(client.getQueryData(["operating-expenses", propertyId])).toMatchObject({
      annual_maintenance_fee: 120,
    });
    held.resolve(expenseRow(999));
    await pending;
    expect(editor.getSnapshot().values.annual_maintenance_fee).toBe("10");
    expect(editor.getSnapshot().reviewed?.annual_maintenance_fee).toBe(999);
  });

  it.each(["save-success", "save-failure", "review", "cache"])(
    "disposal invalidates late %s even after reactivation",
    async (stage) => {
      const { editor, save, refresh, acknowledge } = setup();
      const held = deferred<OperatingExpensesRecord>();
      if (stage.startsWith("save")) save.mockReturnValueOnce(held.promise);
      else if (stage === "review") refresh.mockReturnValueOnce(held.promise);
      else acknowledge.mockReturnValueOnce(held.promise.then(() => {}));
      const pending = stage === "review" ? editor.review() : editor.submit();
      await vi.waitFor(() =>
        expect(
          stage === "review" ? refresh : stage === "cache" ? acknowledge : save,
        ).toHaveBeenCalledOnce(),
      );
      editor.dispose();
      editor.activate();
      editor.open(expenseRow(555));
      if (stage === "save-failure") held.reject(new Error("private late rejection"));
      else held.resolve(expenseRow());
      await pending;
      expect(editor.getSnapshot()).toMatchObject({
        outcome: "idle",
        values: { annual_maintenance_fee: 555 },
      });
      if (stage.startsWith("save")) expect(acknowledge).not.toHaveBeenCalled();
    },
  );

  it.each([NaN, Infinity, -1, 1e14, "100", undefined])(
    "rejects unsafe/incomplete returned amounts (%s)",
    (amount) => {
      expect(
        isOperatingExpensesRecord({ ...expenseRow(), annual_cleaning_cost: amount }, propertyId),
      ).toBe(false);
    },
  );
});
