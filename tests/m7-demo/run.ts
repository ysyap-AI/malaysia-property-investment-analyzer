import { demoFixture, demoResults, DEMO_NAME } from "./fixture";
import {
  createProperty,
  getProperty,
  listProperties,
  updateProperty,
} from "@/lib/property/property-api";
import { getPropertySnapshot } from "@/lib/property/property-revision";
import { saveAcquisitionCosts } from "@/lib/property/acquisition-api";
import { saveFinancing } from "@/lib/property/financing-api";
import { saveOperatingExpenses } from "@/lib/property/operating-expenses-api";
import { saveSectionEvidence } from "@/lib/property/evidence-api";
import { saveStrategyAssumptions } from "@/lib/property/strategy-api";
import { evidenceEqual } from "@/lib/property/investment-evidence";
import type { PropertySnapshot } from "@/lib/property/property-revision";

export async function setupDemo(
  owner: string,
  options: {
    create: boolean;
    reviewedId?: string;
    beforeCreate: () => void;
    recordId: (id: string) => void;
  },
) {
  const f = demoFixture();
  const existing = (await listProperties()).filter((row) => row.project_name === DEMO_NAME);
  if (existing.length > 1)
    throw Error("Multiple demo records: review manually; no automatic selection.");
  if (!existing.length && !options.create)
    throw Error("No demo exists. Use --create explicitly once after reviewing the fixture.");
  let row = existing[0];
  if (!row) {
    options.beforeCreate(); // Durable intent receipt blocks an uncertain second INSERT.
    row = await createProperty(
      { owner, values: f.property, draft: f.property as never },
      () => true,
    );
    options.recordId(row.id);
  } else {
    options.recordId(row.id);
    const s = await getPropertySnapshot(row.id, owner);
    if (matchesDemo(s, f))
      return { id: row.id, changed: false, results: resultsFromSnapshot(s, f) };
    if (options.reviewedId !== row.id)
      throw Error(
        `Review existing synthetic record ${row.id}; use --review-existing=${row.id} to replace its demo inputs explicitly.`,
      );
    row = await updateProperty(
      { id: row.id, owner, original: row, patch: f.property, sequence: 1 },
      () => true,
    );
  }
  const id = row.id;
  let s = await getPropertySnapshot(id, owner);
  await saveSectionEvidence(s, "properties", f.propertyEvidence, owner, () => true);
  s = await getPropertySnapshot(id, owner);
  await saveFinancing(id, f.financing, () => true, s.property.revision!, f.financingEvidence);
  s = await getPropertySnapshot(id, owner);
  await saveAcquisitionCosts(
    id,
    f.acquisition,
    () => true,
    s.property.revision!,
    f.acquisitionEvidence,
  );
  s = await getPropertySnapshot(id, owner);
  await saveOperatingExpenses(
    id,
    f.operating,
    () => true,
    s.property.revision!,
    f.operatingEvidence,
  );
  s = await getPropertySnapshot(id, owner);
  await saveStrategyAssumptions(s, f.strategy, owner, () => true);
  const fresh = await getPropertySnapshot(id, owner);
  if (!matchesDemo(fresh, f) || !(await getProperty(id)))
    throw Error("Fresh reload differs. Stop and review this ID; do not recreate.");
  return { id, changed: true, results: resultsFromSnapshot(fresh, f) };
}
function resultsFromSnapshot(s: PropertySnapshot, f: ReturnType<typeof demoFixture>) {
  return demoResults({
    ...f,
    facts: {
      revision: s.property.revision!,
      acquisition: s.acquisition_costs,
      financing: s.financing,
      operating: s.operating_expenses,
      monthlyRent: s.property.expected_monthly_rent,
    },
  });
}
export function matchesDemo(s: PropertySnapshot, f = demoFixture()) {
  const matches = (record: object | null, values: object) =>
    !!record &&
    Object.entries(values).every(([key, value]) =>
      evidenceEqual((record as Record<string, unknown>)[key], value),
    );
  return (
    matches(s.property, {
      ...f.property,
      evidence_metadata: f.propertyEvidence,
      investment_strategy_assumptions: f.strategy,
    }) &&
    matches(s.acquisition_costs, { ...f.acquisition, evidence_metadata: f.acquisitionEvidence }) &&
    matches(s.financing, { ...f.financing, evidence_metadata: f.financingEvidence }) &&
    matches(s.operating_expenses, { ...f.operating, evidence_metadata: f.operatingEvidence })
  );
}
