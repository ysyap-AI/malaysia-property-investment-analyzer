import type { ScoreCategoryConfig } from "@/config/scoring";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** First-match minimums must descend strictly so every band is reachable. */
export function validateMinimumScoreBands(bands: unknown): string[] {
  if (!Array.isArray(bands) || bands.length === 0) return ["must be a nonempty array"];
  const errors: string[] = [];
  let previous = Infinity;
  for (const band of bands) {
    if (!isRecord(band) || !isFiniteNumber(band["minScore"]) || band["minScore"] < 0 || band["minScore"] > 100) {
      errors.push("thresholds must be finite numbers between 0 and 100");
      continue;
    }
    if (band["minScore"] >= previous) errors.push("thresholds must be strictly descending (no duplicates or unreachable bands)");
    previous = band["minScore"];
  }
  return errors;
}

/** Bounds describe first-match cutoffs, not independently overlapping ranges. */
export function validateCategoryBands(cat: Pick<ScoreCategoryConfig, "direction" | "bands">): string[] {
  if (!Array.isArray(cat.bands) || cat.bands.length === 0) return ["must be a nonempty array"];
  if (cat.direction !== "higher-is-better" && cat.direction !== "lower-is-better") return ["invalid scoring direction"];
  const errors: string[] = [];
  const higher = cat.direction === "higher-is-better";
  let previousThreshold = higher ? Infinity : -Infinity;
  let previousPoints = Infinity;
  for (const [index, band] of cat.bands.entries()) {
    if (!isRecord(band)) {
      errors.push("each band must be an object");
      continue;
    }
    if (!isFiniteNumber(band.points) || band.points < 0 || band.points > 100) {
      errors.push("points must be finite numbers between 0 and 100");
    } else {
      if (band.points > previousPoints) errors.push("points must not increase as bands become less favorable");
      previousPoints = band.points;
    }
    const threshold = higher ? band.atLeast : band.atMost;
    const opposite = higher ? band.atMost : band.atLeast;
    if (opposite !== undefined) errors.push(`only ${higher ? "atLeast" : "atMost"} bounds are allowed for this direction`);
    if (threshold === undefined) {
      if (index !== cat.bands.length - 1) errors.push("an unbounded fallback is only allowed last");
    } else if (!isFiniteNumber(threshold)) {
      errors.push("thresholds must be finite numbers");
    } else {
      if (higher ? threshold >= previousThreshold : threshold <= previousThreshold)
        errors.push(`thresholds must be strictly ${higher ? "descending" : "ascending"} (no duplicates or unreachable bands)`);
      previousThreshold = threshold;
    }
  }
  return errors;
}
