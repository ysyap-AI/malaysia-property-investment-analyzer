import type { analyzeProperty } from "@/lib/analysis/analyze-property";
import { SCENARIO_CONFIG_VERSION, DEFAULT_SCENARIOS } from "@/config/scenarios";
import { currentLocationEvidence, type LocationEvidence } from "./location-fixtures";
import type { Sample, SampleSession } from "./session";
import type { MetricResult } from "@/lib/finance/returns";
import { displayMoney } from "@/lib/property/property-fields";

export type Analysis = ReturnType<typeof analyzeProperty>;
export const SYNTHETIC_NOTICE =
  "Synthetic demonstration — fictional inputs and location examples; not verified property or Malaysian market evidence. No investment guarantee.";
export type DiligenceItem = { id: string; action: string; reason: string };

export function assessmentMetric(metric: MetricResult, percent = false) {
  return metric.status === "ok"
    ? percent
      ? `${metric.value.toLocaleString("en-MY", { maximumFractionDigits: 2 })}%`
      : displayMoney(metric.value)
    : "Unavailable";
}

// Explain existing evidence only. No thresholds, financial formulas or new verdicts.
export function dueDiligence(analysis: Analysis, location: LocationEvidence): DiligenceItem[] {
  return [
    ...analysis.recommendation.missing_information.map((reason, i) => ({
      id: `missing-${i}`,
      action: "Supply and verify missing information",
      reason,
    })),
    ...analysis.redFlags.flags.map((flag) => ({
      id: `risk-${flag.key}`,
      action: `Review ${flag.risk_name}`,
      reason: flag.explanation,
    })),
    ...analysis.redFlags.unchecked.map((rule) => ({
      id: `unchecked-${rule.key}`,
      action: `Complete ${rule.risk_name}`,
      reason: rule.reason,
    })),
    ...analysis.confidence.factors
      .filter(
        (factor) =>
          factor.status !== "not-available-in-phase" && factor.evidence_status !== "Verified",
      )
      .map((factor) => ({
        id: `evidence-${factor.key}`,
        action: `Verify ${factor.label}`,
        reason: factor.explanation,
      })),
    {
      id: "location",
      action: "Confirm the property's real location and nearby evidence",
      reason: `${location.message} All supplied location examples are fictional and not independently verified.`,
    },
    {
      id: "synthetic",
      action:
        "Replace synthetic assumptions with documented property evidence before making a decision",
      reason:
        "This assessment uses a labelled synthetic session, including any simulated verification statuses.",
    },
  ];
}

export type AssessmentModel = {
  sampleId: SampleSession["id"];
  inputs: Sample;
  analysis: Analysis;
  location: LocationEvidence;
  diligence: DiligenceItem[];
  scenarioConfig: typeof DEFAULT_SCENARIOS;
  identifiers: { label: string; value: string }[];
};

export function assessmentModel(session: SampleSession, analysis: Analysis): AssessmentModel {
  const location = currentLocationEvidence(session);
  return {
    sampleId: session.id,
    inputs: session.applied,
    analysis,
    location,
    diligence: dueDiligence(analysis, location),
    scenarioConfig: DEFAULT_SCENARIOS,
    identifiers: [
      {
        label: "Financial source",
        value:
          "src/lib/analysis/analyze-property.ts · existing Phase 1 engines (no standalone engine version)",
      },
      { label: "Scoring", value: analysis.invest.config_version },
      { label: "Confidence", value: analysis.confidence.config_version },
      { label: "Risk rules", value: analysis.redFlags.config_version },
      { label: "Recommendation", value: analysis.recommendation.config_version },
      { label: "Scenarios", value: SCENARIO_CONFIG_VERSION },
      {
        label: "Sample origin",
        value: location.origin?.version ?? "Unavailable / no matching origin",
      },
      {
        label: "Location fixture",
        value: location.fixture?.id ?? "Unavailable / no acknowledged fixture",
      },
    ],
  };
}

export type CapturedAssessment = {
  sourceSession: SampleSession;
  capturedAt: string;
  model: AssessmentModel;
};
export function captureAssessment(
  session: SampleSession,
  analysis: Analysis | null,
  capturedAt = new Date().toISOString(),
): CapturedAssessment | null {
  if (session.dirty || Object.keys(session.errors).length || !analysis) return null;
  return {
    sourceSession: session,
    capturedAt,
    model: structuredClone(assessmentModel(session, analysis)),
  };
}
// Reducer sessions are immutable: every edit, Apply, reset, selection and evidence
// change creates a new identity. Returning to old values cannot revive a capture.
export function assessmentIsCurrent(captured: CapturedAssessment, session: SampleSession) {
  return captured.sourceSession === session && !session.dirty;
}

export function printCapturedAssessment(
  captured: CapturedAssessment | null,
  session: SampleSession,
  print: () => void,
) {
  if (!captured || !assessmentIsCurrent(captured, session)) return false;
  print();
  return true;
}
