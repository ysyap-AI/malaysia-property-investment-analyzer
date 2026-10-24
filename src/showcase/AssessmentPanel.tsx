import { useState } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { ACQUISITION_FIELD_LABELS } from "@/lib/property/acquisition-fields";
import { OPERATING_EXPENSE_LABELS } from "@/lib/property/operating-expense-fields";
import type { MetricResult } from "@/lib/finance/returns";
import { SCENARIO_LABELS } from "@/config/scenarios";
import { CATEGORY_LABELS, distanceLabel } from "./location-fixtures";
import type { SampleSession } from "./session";
import {
  SYNTHETIC_NOTICE,
  assessmentModel,
  captureAssessment,
  assessmentIsCurrent,
  printCapturedAssessment,
  assessmentMetric,
  type AssessmentModel,
  type CapturedAssessment,
  type Analysis,
} from "./assessment";

function Metric({
  label,
  metric,
  percent = false,
}: {
  label: string;
  metric: MetricResult;
  percent?: boolean;
}) {
  return (
    <div className="assessment-metric">
      <dt>{label}</dt>
      <dd className={metric.status === "ok" && metric.value < 0 ? "negative" : ""}>
        {assessmentMetric(metric, percent)}
      </dd>
      {metric.status !== "ok" && (
        <small>
          {metric.status === "incomplete"
            ? `Missing: ${metric.missingInputs.join(", ")}`
            : metric.reason}
        </small>
      )}
    </div>
  );
}

export function AssessmentPanel({
  session,
  analysis,
}: {
  session: SampleSession;
  analysis: Analysis | null;
}) {
  const [captured, setCaptured] = useState<CapturedAssessment | null>(null);
  const current = captured !== null && assessmentIsCurrent(captured, session);
  const refresh = () => setCaptured(captureAssessment(session, analysis));
  const present = () => {
    const next = captured ?? captureAssessment(session, analysis);
    // Commit this exact captured model before native print reads the document.
    flushSync(() => setCaptured(next));
    printCapturedAssessment(next, session, () => window.print());
  };
  return (
    <section
      id="investment-assessment"
      className="assessment-experience"
      aria-label="Investment assessment and presentation"
    >
      <div className="presentation-toolbar">
        <div>
          <h2>Customer presentation</h2>
          <p>
            Capture applied assumptions in memory, then use the browser's print preview. Reload
            clears the capture.
          </p>
        </div>
        <Button onClick={present} disabled={!analysis || (!!captured && !current)}>
          Present / Print
        </Button>
        {captured && (
          <>
            <Button variant="outline" onClick={refresh} disabled={!analysis}>
              Refresh captured assessment
            </Button>
            <Button variant="outline" onClick={() => setCaptured(null)}>
              Close presentation
            </Button>
          </>
        )}
      </div>
      <div aria-live="polite" className="capture-status">
        {captured && (
          <p>
            Captured {captureTime(captured.capturedAt)} · Session only ·{" "}
            {current ? "Matches the applied session" : "Out of date"}
          </p>
        )}
      </div>
      {!captured && (
        <div className="assessment-live">
          {analysis ? (
            <AssessmentReport model={assessmentModel(session, analysis)} />
          ) : (
            <div className="assessment-pending" role="status">
              <h2>Draft Investment Assessment — Synthetic Demonstration</h2>
              <p>{SYNTHETIC_NOTICE}</p>
              <p>
                Apply valid assumptions to review or capture an assessment. Unapplied edits are not
                current analysis.
              </p>
            </div>
          )}
        </div>
      )}
      <Presentation captured={captured} session={session} />
    </section>
  );
}

function captureTime(value: string) {
  return `${new Date(value).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "medium" })} (Asia/Kuala_Lumpur)`;
}

export function Presentation({
  captured,
  session,
}: {
  captured: CapturedAssessment | null;
  session: SampleSession;
}) {
  const current = captured !== null && assessmentIsCurrent(captured, session);
  return (
    <div
      className={`assessment-print ${current ? "capture-current" : captured ? "capture-blocked" : "capture-empty"}`}
    >
      {captured && current ? (
        <AssessmentReport model={captured.model} capturedAt={captured.capturedAt} />
      ) : (
        <div className="print-blocker" role="status">
          <h2>
            {captured ? "Presentation out of date — refresh required" : "No assessment captured"}
          </h2>
          <p>{SYNTHETIC_NOTICE}</p>
          <p>
            {captured
              ? "Session inputs, sample or location evidence changed. Previous conclusions and location findings are withheld. Apply valid assumptions, then refresh the captured assessment before presenting or printing."
              : "Use Present / Print to capture the applied session first."}
          </p>
        </div>
      )}
    </div>
  );
}

// One report tree for screen and print. This component never calls an engine.
export function AssessmentReport({
  model: m,
  capturedAt,
}: {
  model: AssessmentModel;
  capturedAt?: string;
}) {
  const a = m.analysis;
  const p = m.inputs.property;
  return (
    <article className="assessment-report" aria-label="Draft investment assessment">
      <header className="assessment-title">
        <p className="eyebrow">MPIA / PROPERTY RESEARCH</p>
        <h2>Draft Investment Assessment — Synthetic Demonstration</h2>
        <p className="assessment-disclaimer">{SYNTHETIC_NOTICE}</p>
        <h3>{p.project_name}</h3>
        <address>
          {[p.full_address, p.city, p.district, p.state, p.postcode, p.country]
            .filter(Boolean)
            .join(", ") || "Address unavailable"}
        </address>
        <p>
          Sample: {m.sampleId} ·{" "}
          {capturedAt
            ? `Captured ${captureTime(capturedAt)}`
            : "Current applied session · not yet captured"}
        </p>
        {capturedAt && (
          <p>
            Capture timestamp: <time dateTime={capturedAt}>{capturedAt}</time> · Memory only; no
            cloud save
          </p>
        )}
      </header>
      <section className="assessment-section">
        <h3>Financial KPI summary</h3>
        <dl className="assessment-kpis">
          <Metric label="Gross rental yield" metric={a.returns.grossRentalYield} percent />
          <Metric label="Net rental yield" metric={a.returns.netRentalYield} percent />
          <Metric label="Monthly cash flow" metric={a.returns.monthlyCashFlow} />
          <Metric label="Annual cash flow" metric={a.returns.annualCashFlow} />
          <Metric label="Cash-on-cash return" metric={a.returns.cashOnCashReturn} percent />
          <Metric
            label="Financed break-even occupancy"
            metric={a.returns.financedBreakEvenOccupancy}
            percent
          />
        </dl>
      </section>
      <section className="assessment-section">
        <h3>Recommendation & explanation</h3>
        <p className="recommendation-label">{a.recommendation.recommendation}</p>
        <ul>
          {a.recommendation.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        <p>{a.recommendation.investment_score_context}</p>
        <p>{a.recommendation.data_confidence_context}</p>
        <p className="helper">
          Base case · Existing financial rule precedence · Simulated verification is never
          real-world verification.
        </p>
        <dl className="score-strip">
          <div>
            <dt>Financial investment score</dt>
            <dd>
              {a.invest.overall_score === null ? "Unavailable" : `${a.invest.overall_score} / 100`}
            </dd>
          </div>
          <div>
            <dt>Financial data confidence</dt>
            <dd>
              {a.confidence.score} / 100 · {a.confidence.band.label}
            </dd>
          </div>
        </dl>
        <h4>Financial strengths & weaknesses</h4>
        <p className="helper">
          The existing scoring bands explain each financial factor. Missing contributions remain
          unavailable.
        </p>
        <ul>
          {a.invest.categories
            .filter((c) => c.enabled)
            .map((c) => (
              <li key={c.key}>
                <strong>
                  {c.label} · {c.matched_band ?? "Unavailable"}
                </strong>
                <p>{c.explanation}</p>
                <p>
                  Score: {c.raw_score === null ? "Unavailable" : `${c.raw_score} / 100`} ·
                  Configured weight: {c.weight} · Contribution:{" "}
                  {c.weighted_score === null ? "Unavailable" : `${c.weighted_score} points`}
                </p>
              </li>
            ))}
        </ul>
        {a.invest.notes.map((note) => (
          <p className="helper" key={note}>
            {note}
          </p>
        ))}
      </section>
      <section className="assessment-section">
        <h3>Investment risks & confidence</h3>
        {a.redFlags.flags.length ? (
          <ul className="risk-list">
            {a.redFlags.flags.map((flag) => (
              <li key={flag.key}>
                <span className={`risk-severity ${flag.severity}`}>{flag.severity}</span>{" "}
                <strong>{flag.risk_name}</strong>
                <p>{flag.explanation}</p>
                <p>Observed sample value: {flag.actual_value}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            No financial flags triggered under these assumptions. This does not establish a
            risk-free investment.
          </p>
        )}
        <h4>Financial evidence quality · synthetic assumptions only</h4>
        <ul>
          {a.confidence.factors
            .filter((f) => f.status !== "not-available-in-phase")
            .map((f) => (
              <li key={f.key}>
                <strong>
                  {f.label} · {f.evidence_status} (simulated)
                </strong>
                <p>{f.explanation}</p>
              </li>
            ))}
        </ul>
        <h4>Missing inputs & limitations</h4>
        {a.recommendation.missing_information.length ? (
          <ul>
            {a.recommendation.missing_information.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>No required financial inputs reported missing. All evidence is still synthetic.</p>
        )}
        <ul>
          {a.redFlags.unchecked.map((rule) => (
            <li key={rule.key}>
              {rule.risk_name}: {rule.reason}
            </li>
          ))}
        </ul>
      </section>
      <section className="assessment-section">
        <h3>Default Base / Bull / Bear scenarios</h3>
        <p>
          Assumptions, not forecasts. Only the default Base case drives the financial
          recommendation.
        </p>
        <table className="assessment-scenarios">
          <thead>
            <tr>
              <th scope="col">Result / assumption</th>
              {(["base", "bull", "bear"] as const).map((k) => (
                <th scope="col" key={k}>
                  {SCENARIO_LABELS[k]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(
              [
                ["monthlyCashFlow", "Monthly cash flow", false],
                ["netRentalYield", "Net rental yield", true],
                ["cashOnCashReturn", "Cash-on-cash return", true],
              ] as const
            ).map(([key, label, percent]) => (
              <tr key={key}>
                <th scope="row">{label}</th>
                {(["base", "bull", "bear"] as const).map((k) => (
                  <td key={k}>{assessmentMetric(a.scenarios[k].returns[key], percent)}</td>
                ))}
              </tr>
            ))}
            {(
              [
                ["rentAdjustmentPercent", "Rent adjustment (%)"],
                ["vacancyMonths", "Vacancy (months/year)"],
                ["repairAdjustmentPercent", "Repair reserve adjustment (%)"],
                ["interestRateAdjustmentPoints", "Interest adjustment (points)"],
              ] as const
            ).map(([key, label]) => (
              <tr key={key}>
                <th scope="row">{label}</th>
                {(["base", "bull", "bear"] as const).map((k) => (
                  <td key={k}>{m.scenarioConfig[k][key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {(["base", "bull", "bear"] as const).map((k) => (
          <p className="helper" key={k}>
            {SCENARIO_LABELS[k]}:{" "}
            {a.scenarios[k].assumptions.bankInstalmentBypassed
              ? "Quoted instalment bypassed for the adjusted interest rate."
              : "Existing engine financing assumptions used."}
          </p>
        ))}
      </section>
      <AssessmentLocation evidence={m.location} />
      <section className="assessment-section">
        <h3>Due-diligence next steps</h3>
        <p className="helper">
          Each item follows the current missing information, financial evidence or risks, or the
          synthetic evidence limitation.
        </p>
        <ul className="diligence-list">
          {m.diligence.map((item) => (
            <li key={item.id}>
              <strong>□ {item.action}</strong>
              <p>Reason: {item.reason}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="assessment-section assessment-inputs">
        <h3>Applied assumptions & source identifiers</h3>
        <p>
          MYR unless a percentage, tenure, evidence status or location is specified. Unknown inputs
          are labelled unavailable; explicit zero remains zero.
        </p>
        {(Object.keys(m.inputs) as (keyof typeof m.inputs)[]).map((section) => (
          <div key={section}>
            <h4>
              {
                {
                  property: "Property & rent",
                  acquisition: "Acquisition costs (RM)",
                  financing: "Financing",
                  operating: "Annual operating expenses (RM)",
                }[section]
              }
            </h4>
            <dl className="assessment-input-grid">
              {Object.entries(m.inputs[section]).map(([key, value]) => (
                <div key={key}>
                  <dt>{inputLabel(section, key)}</dt>
                  <dd>
                    {value == null || value === ""
                      ? "Unavailable"
                      : typeof value === "boolean"
                        ? value
                          ? "Yes (simulated)"
                          : "No"
                        : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
        <dl className="assessment-identifiers">
          {m.identifiers.map((id) => (
            <div key={id.label}>
              <dt>{id.label}</dt>
              <dd>{id.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <footer className="assessment-disclaimer">
        {SYNTHETIC_NOTICE} Location observations do not contribute to the financial score,
        confidence, risks or recommendation. Session only; no durable report storage.
      </footer>
    </article>
  );
}

const FINANCING_LABELS: Record<string, string> = {
  loan_to_value_percent: "Loan-to-value (%)",
  loan_amount: "Explicit loan amount (RM)",
  annual_interest_rate_percent: "Annual interest rate (%)",
  loan_tenure_years: "Loan tenure (years)",
  user_provided_monthly_instalment: "Quoted monthly instalment (RM)",
  use_user_provided_instalment: "Use quoted instalment",
  bank_quote_verified: "Bank quote verified (simulated)",
};
function inputLabel(section: keyof AssessmentModel["inputs"], key: string) {
  const labels: Record<string, string> =
    section === "acquisition"
      ? ACQUISITION_FIELD_LABELS
      : section === "operating"
        ? OPERATING_EXPENSE_LABELS
        : section === "financing"
          ? FINANCING_LABELS
          : {};
  return labels[key] ?? key.replaceAll("_", " ");
}

function AssessmentLocation({ evidence: e }: { evidence: AssessmentModel["location"] }) {
  const f = e.fixture;
  const hasFindings = ["complete", "partial", "stale", "empty"].includes(e.status);
  return (
    <section className="assessment-section assessment-location" data-location-state={e.status}>
      <h3>Location Observations</h3>
      <p>
        <strong>Separate research context.</strong> Location evidence does not enter the financial
        score, financial confidence, risks or recommendation. No numerical Location Score.
      </p>
      <p className="assessment-disclaimer">
        Wholly invented examples; not independently verified. No claim about real Malaysian
        amenities, travel times, service quality, rental demand or market conditions.
      </p>
      <p>
        <strong>Evidence state: {e.status}</strong> · {e.message}
      </p>
      {e.origin && (
        <p>
          {e.origin.description} ·{" "}
          {e.fixture ? "Sample origin acknowledged" : "Sample origin not acknowledged"} ·{" "}
          {e.origin.version}
        </p>
      )}
      {hasFindings && (
        <ul>
          {e.items.map((item) => (
            <li key={item.id}>
              <strong>{item.name}</strong> · {CATEGORY_LABELS[item.category]} ·{" "}
              {distanceLabel(item.distance)}
              <p className="helper">
                {f?.id} / {item.id}
              </p>
            </li>
          ))}
        </ul>
      )}
      {f && (
        <>
          <p>
            Source: {f.source} · Fixture: {f.id}
          </p>
          <p>
            Authored {f.authoredOn} · Sample as-of {f.asOf}. Preparation dates only; no provider
            retrieval.
          </p>
          {hasFindings ? (
            <>
              <p>
                Coverage: {f.coverage.radiusM.toLocaleString("en-MY")} m straight-line boundary ·
                Maximum {f.coverage.cap} supplied examples. Categories:{" "}
                {f.coverage.included.map((c) => CATEGORY_LABELS[c]).join(", ")}.
              </p>
              <p>
                Missing category coverage:{" "}
                {f.coverage.missing.map((c) => CATEGORY_LABELS[c]).join(", ") ||
                  "None within this fixture; real coverage unknown"}
                . Unknown distances cannot establish proximity within the boundary.
              </p>
            </>
          ) : (
            <p>No completed coverage result or amenity count is available in this state.</p>
          )}
        </>
      )}
      <p className="helper">
        Supplied fictional grid measurements are distances, not walking or driving times. Missing,
        failed or empty evidence never proves absence of real amenities. No information beyond the
        fixture boundary.
      </p>
    </section>
  );
}
