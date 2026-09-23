// Scenario assumptions — configuration only. No formulas live here.
// Every value is an editable default; the Scenarios tab lets the user change them.

export const SCENARIO_CONFIG_VERSION = "scenarios-v1";

export type ScenarioKey = "bear" | "base" | "bull";

export type ScenarioAssumptions = {
  /** % change applied to the base monthly rent (−10 = 10% below). */
  rentAdjustmentPercent: number;
  /** Months per year the unit is expected to be empty (0–12). */
  vacancyMonths: number;
  /** % change applied to the base annual repair reserve (25 = 25% above). */
  repairAdjustmentPercent: number;
  /** Percentage points added to the base loan interest rate. */
  interestRateAdjustmentPoints: number;
};

export const SCENARIO_LABELS: Record<ScenarioKey, string> = {
  bear: "Bear case",
  base: "Base case",
  bull: "Bull case",
};

export const SCENARIO_ORDER: ScenarioKey[] = ["bear", "base", "bull"];

export const DEFAULT_SCENARIOS: Record<ScenarioKey, ScenarioAssumptions> = {
  bear: { rentAdjustmentPercent: -10, vacancyMonths: 3, repairAdjustmentPercent: 25, interestRateAdjustmentPoints: 2 },
  base: { rentAdjustmentPercent: 0, vacancyMonths: 1, repairAdjustmentPercent: 0, interestRateAdjustmentPoints: 0 },
  // "Lower repair allowance" — assumed 10% below base; editable.
  bull: { rentAdjustmentPercent: 5, vacancyMonths: 0.5, repairAdjustmentPercent: -10, interestRateAdjustmentPoints: 0 },
};
