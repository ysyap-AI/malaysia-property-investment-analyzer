import { useReducer, type ReactNode } from "react";
import {
  Building2,
  ArrowUpRight,
  RotateCcw,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  ArrowRight,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ACQUISITION_FIELD_LABELS, ACQUISITION_SECTIONS } from "@/lib/property/acquisition-fields";
import {
  OPERATING_EXPENSE_LABELS,
  OPERATING_EXPENSE_SECTIONS,
} from "@/lib/property/operating-expense-fields";
import { displayMoney } from "@/lib/property/property-fields";
import { calculateTotalAcquisitionCost } from "@/lib/finance/acquisition";
import { calculateFinancing } from "@/lib/finance/financing";
import type { MetricResult, ReturnsResult } from "@/lib/finance/returns";
import { DEFAULT_SCENARIOS, SCENARIO_LABELS, type ScenarioKey } from "@/config/scenarios";
import { MALAYSIAN_STATES } from "@/lib/property/property-fields";
import { LocationPanel } from "./LocationPanel";
import { AssessmentPanel } from "./AssessmentPanel";
import { LOCATION_FIELDS, LOCATION_LABELS } from "./location-fixtures";
import {
  PRESETS,
  currentAnalysis,
  sessionReducer,
  startSession,
  type SampleDraft,
  type SampleSession,
  type SampleId,
  type SessionAction,
} from "./session";

const percent = (v: number | null) =>
  v === null ? "Unavailable" : `${v.toLocaleString("en-MY", { maximumFractionDigits: 2 })}%`;
function metricText(m: MetricResult, kind: "money" | "percent" = "money") {
  return m.status === "ok"
    ? kind === "money"
      ? displayMoney(m.value)
      : percent(m.value)
    : "Unavailable";
}
function isNegative(m: MetricResult) {
  return m.status === "ok" && m.value < 0;
}
function metricNote(m: MetricResult) {
  return m.status === "incomplete"
    ? `Missing: ${m.missingInputs.join(", ")}`
    : m.status === "invalid"
      ? m.reason
      : "";
}

export function Showcase({ initialSample = "attractive" }: { initialSample?: SampleId }) {
  const [session, dispatch] = useReducer(sessionReducer, initialSample, startSession);
  const analysis = currentAnalysis(session);
  const errorCount = Object.keys(session.errors).length;
  return (
    <div className="showcase">
      <div className="demo-banner">
        <FlaskConical size={15} aria-hidden="true" />
        <strong>Synthetic Demonstration — No Real Property or Market Data</strong>
        <span>Fictional properties & assumptions · Not verified property or market evidence</span>
      </div>
      <header className="showcase-header">
        <a className="brand" href="#main">
          <span className="brand-icon">
            <Building2 size={22} />
          </span>
          <span>
            MPIA<small>PROPERTY INVESTMENT ANALYZER</small>
          </span>
        </a>
        <div className="session-label">
          <span className="status-dot" /> Session only · No cloud saving
        </div>
      </header>
      <main id="main" className="showcase-main">
        <div className="page-heading">
          <div>
            <p className="eyebrow">INVESTMENT WORKSPACE / M3 SHOWCASE</p>
            <h1>Explore the property. Understand the evidence.</h1>
            <p>Financial assumptions and sample location research, with their limits in view.</p>
            <p>
              Example properties, locations and nearby amenities are fictional. Use invented inputs
              only; do not enter confidential information.
            </p>
            <a className="assessment-link" href="#investment-assessment">
              Review draft assessment & presentation
            </a>
          </div>
          <Button variant="outline" onClick={() => dispatch({ type: "reset" })}>
            <RotateCcw size={16} />
            Reset sample
          </Button>
        </div>
        <section aria-labelledby="samples-heading" className="samples-section">
          <div className="section-heading">
            <h2 id="samples-heading">Choose a fictional property</h2>
            <span>Changes stay in this session. Reload resets the demonstration.</span>
          </div>
          <div className="preset-grid">
            {PRESETS.map((preset, i) => (
              <button
                key={preset.id}
                className={`preset ${session.id === preset.id ? "selected" : ""}`}
                aria-pressed={session.id === preset.id}
                onClick={() => dispatch({ type: "select", id: preset.id })}
              >
                <span className={`preset-icon preset-${i}`}>
                  <Building2 size={25} />
                </span>
                <span>
                  <small>{preset.category}</small>
                  <strong>{preset.name}</strong>
                  <span>{preset.description} · Synthetic</span>
                </span>
                <ArrowUpRight size={17} />
              </button>
            ))}
            <button
              className={`preset new-sample ${session.id === "blank" ? "selected" : ""}`}
              onClick={() => dispatch({ type: "select", id: "blank" })}
            >
              <Plus size={22} />
              <strong>New blank sample</strong>
              <span>Start with unknown values</span>
            </button>
          </div>
        </section>
        <div className="workspace-grid">
          <aside className="editor-panel">
            <div className="editor-heading">
              <SlidersHorizontal size={18} />
              <h2>Financial assumptions</h2>
            </div>
            <p className="helper">
              Amounts in MYR. Leave unknown values blank; enter 0 only for an explicit zero cost.
            </p>
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                dispatch({ type: "apply" });
              }}
            >
              <details open>
                <summary>
                  01 <span>Property & rental</span>
                </summary>
                <div className="field-grid">
                  <Field
                    session={session}
                    dispatch={dispatch}
                    section="property"
                    field="project_name"
                    label="Project name"
                    text
                    wide
                  />
                  <Field
                    session={session}
                    dispatch={dispatch}
                    section="property"
                    field="asking_price"
                    label="Asking price (RM)"
                  />
                  <Field
                    session={session}
                    dispatch={dispatch}
                    section="property"
                    field="target_purchase_price"
                    label="Target price (RM)"
                  />
                  <Field
                    session={session}
                    dispatch={dispatch}
                    section="acquisition"
                    field="purchase_price"
                    label="Acquisition purchase price (RM)"
                    wide
                  />
                  <p className="field-hint wide">
                    Returns and financing use the acquisition price. Asking and target prices stay
                    separate.
                  </p>
                  <Field
                    session={session}
                    dispatch={dispatch}
                    section="property"
                    field="expected_monthly_rent"
                    label="Monthly rental income (RM)"
                  />
                  <Field
                    session={session}
                    dispatch={dispatch}
                    section="property"
                    field="bank_valuation"
                    label="Bank valuation (RM)"
                  />
                  <label className="wide" htmlFor="rent-evidence">
                    Simulated rent evidence
                    <select
                      id="rent-evidence"
                      value={session.draft.property.rent_verification_status}
                      onChange={(e) =>
                        dispatch({
                          type: "edit",
                          section: "property",
                          field: "rent_verification_status",
                          value: e.target.value,
                        })
                      }
                    >
                      <option value="user-entered">User entered (synthetic)</option>
                      <option value="estimated">Estimated (synthetic)</option>
                      <option value="listing-data">Listing data (simulated)</option>
                      <option value="verified">Verified (simulated only)</option>
                      <option value="missing">Missing / Not Verified</option>
                    </select>
                  </label>
                </div>
              </details>
              <details>
                <summary>
                  02 <span>Acquisition costs</span>
                </summary>
                <p className="helper">
                  One-off costs in RM. All categories must be known for total-cost returns.
                </p>
                {ACQUISITION_SECTIONS.filter((s) => s.title !== "Purchase").map((s) => (
                  <fieldset key={s.title}>
                    <legend>{s.title}</legend>
                    <div className="field-grid">
                      {s.fields.map((field) => (
                        <Field
                          key={field}
                          session={session}
                          dispatch={dispatch}
                          section="acquisition"
                          field={field}
                          label={`${ACQUISITION_FIELD_LABELS[field]} (RM)`}
                        />
                      ))}
                    </div>
                  </fieldset>
                ))}
              </details>
              <details>
                <summary>
                  03 <span>Financing</span>
                </summary>
                <p className="helper">
                  Enter loan amount or LTV. LTV takes precedence when both are entered. Clear LTV to
                  use an explicit loan amount.
                </p>
                <div className="field-grid">
                  {[
                    ["loan_to_value_percent", "Loan-to-value (%)"],
                    ["loan_amount", "Explicit loan amount (RM)"],
                    ["annual_interest_rate_percent", "Annual interest rate (%)"],
                    ["loan_tenure_years", "Loan tenure (years)"],
                    ["user_provided_monthly_instalment", "Quoted monthly instalment (RM)"],
                  ].map(([field, label]) => (
                    <Field
                      key={field!}
                      session={session}
                      dispatch={dispatch}
                      section="financing"
                      field={field!}
                      label={label!}
                    />
                  ))}
                  <Check
                    session={session}
                    dispatch={dispatch}
                    field="use_user_provided_instalment"
                    label="Use quoted instalment"
                  />
                  <Check
                    session={session}
                    dispatch={dispatch}
                    field="bank_quote_verified"
                    label="Simulate verified bank quote"
                  />
                </div>
              </details>
              <details>
                <summary>
                  04 <span>Operating expenses</span>
                </summary>
                <p className="helper">Every expense below is annual, in RM.</p>
                {OPERATING_EXPENSE_SECTIONS.map((s) => (
                  <fieldset key={s.title}>
                    <legend>{s.title}</legend>
                    <div className="field-grid">
                      {s.fields.map((field) => (
                        <Field
                          key={field}
                          session={session}
                          dispatch={dispatch}
                          section="operating"
                          field={field}
                          label={`${OPERATING_EXPENSE_LABELS[field]} (RM/year)`}
                        />
                      ))}
                    </div>
                  </fieldset>
                ))}
              </details>
              <details id="location-inputs">
                <summary>
                  05 <span>Sample location inputs</span>
                </summary>
                <p className="helper">
                  Fictional address text only. Editing any location field or the project name
                  immediately clears the sample-origin acknowledgement. Arbitrary addresses have no
                  evidence.
                </p>
                <div className="field-grid">
                  {LOCATION_FIELDS.filter(
                    (field) => field !== "project_name" && field !== "state",
                  ).map((field) => (
                    <Field
                      key={field}
                      session={session}
                      dispatch={dispatch}
                      section="property"
                      field={field}
                      label={LOCATION_LABELS[field]}
                      text
                      wide={field === "full_address" || field === "country"}
                    />
                  ))}
                  <label className="wide" htmlFor="property.state">
                    State (sample context)
                    <select
                      id="property.state"
                      value={session.draft.property.state ?? ""}
                      aria-invalid={!!session.errors["property.state"]}
                      aria-describedby={
                        session.errors["property.state"] ? "property.state-error" : undefined
                      }
                      onChange={(e) =>
                        dispatch({
                          type: "edit",
                          section: "property",
                          field: "state",
                          value: e.target.value,
                        })
                      }
                    >
                      <option value="">Unknown</option>
                      {MALAYSIAN_STATES.map((state) => (
                        <option key={state}>{state}</option>
                      ))}
                    </select>
                    {session.errors["property.state"] && (
                      <span className="field-error" id="property.state-error">
                        {session.errors["property.state"]}
                      </span>
                    )}
                  </label>
                </div>
              </details>
              <div className="apply-bar">
                <p role="status">
                  {errorCount
                    ? `${errorCount} field(s) need attention. Open the marked sections below.`
                    : session.dirty
                      ? "Unapplied changes · Results withheld"
                      : "Applied to this session only"}
                </p>
                {errorCount > 0 && (
                  <ul className="validation-summary" role="alert">
                    {Object.entries(session.errors).map(([path, error]) => (
                      <li key={path}>
                        <a
                          href={`#${path}`}
                          onClick={() => {
                            const el = document.getElementById(path);
                            el?.closest("details")?.setAttribute("open", "");
                            setTimeout(() => el?.focus(), 0);
                          }}
                        >
                          {path.split(".")[1]?.replaceAll("_", " ")}: {error}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                <Button type="submit" className="w-full">
                  Apply assumptions <ArrowRight size={16} />
                </Button>
                <span className="helper">Applies all sections together. Nothing is saved.</span>
              </div>
            </form>
          </aside>
          <div className="results-panel" aria-live="polite" aria-atomic="false">
            <LocationPanel key={session.id} session={session} dispatch={dispatch} />
            <div className="result-heading">
              <div>
                <p className="eyebrow">FINANCIAL OVERVIEW</p>
                <h2>
                  {session.dirty ? "Review your changes" : session.applied.property.project_name}
                </h2>
              </div>
              <span className="sample-tag">SYNTHETIC</span>
            </div>
            {analysis ? (
              <Results analysis={analysis} session={session} />
            ) : (
              <Card>
                <CardContent className="pending-results">
                  <SlidersHorizontal size={30} />
                  <h3>Apply assumptions to refresh the analysis</h3>
                  <p>
                    {errorCount
                      ? "Correct the highlighted inputs, then apply again."
                      : "Your inputs have changed. Results and recommendations are withheld until you apply a valid set of assumptions."}
                  </p>
                </CardContent>
              </Card>
            )}
            <p className="showcase-footnote">
              <ShieldCheck size={15} />
              Powered by the existing MPIA financial engines. Assumption-based results; no market
              forecast or investment guarantee.
            </p>
          </div>
        </div>
      </main>
      <AssessmentPanel session={session} analysis={analysis} />
    </div>
  );
}

function Field({
  session,
  dispatch,
  section,
  field,
  label,
  text,
  wide,
}: {
  session: SampleSession;
  dispatch: React.Dispatch<SessionAction>;
  section: keyof SampleDraft;
  field: string;
  label: string;
  text?: boolean;
  wide?: boolean;
}) {
  const id = `${section}.${field}`;
  const value = (session.draft[section] as Record<string, unknown>)[field];
  const error = session.errors[id];
  return (
    <label className={wide ? "wide" : ""} htmlFor={id}>
      {label}
      <Input
        id={id}
        type="text"
        inputMode={text ? "text" : "decimal"}
        autoComplete="off"
        placeholder={text && field === "project_name" ? "Fictional project name" : "Unknown"}
        value={value == null ? "" : String(value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => dispatch({ type: "edit", section, field, value: e.target.value })}
      />
      {error && (
        <span className="field-error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </label>
  );
}
function Check({
  session,
  dispatch,
  field,
  label,
}: {
  session: SampleSession;
  dispatch: React.Dispatch<SessionAction>;
  field: "use_user_provided_instalment" | "bank_quote_verified";
  label: string;
}) {
  return (
    <label className="check-field wide">
      <input
        type="checkbox"
        checked={session.draft.financing[field]}
        onChange={(e) =>
          dispatch({ type: "edit", section: "financing", field, value: e.target.checked })
        }
      />
      {label} (synthetic)
    </label>
  );
}

function Results({
  analysis: a,
  session,
}: {
  analysis: NonNullable<ReturnType<typeof currentAnalysis>>;
  session: SampleSession;
}) {
  const r = a.returns;
  const acquisition = calculateTotalAcquisitionCost(session.applied.acquisition);
  const financing = calculateFinancing({
    ...session.applied.financing,
    purchase_price: session.applied.acquisition.purchase_price,
  });
  const metrics: {
    key: keyof ReturnsResult;
    label: string;
    kind: "money" | "percent";
    note: string;
  }[] = [
    {
      key: "monthlyCashFlow",
      label: "Monthly cash flow",
      kind: "money",
      note: "After operating costs & financing",
    },
    {
      key: "netRentalYield",
      label: "Net rental yield",
      kind: "percent",
      note: "NOI relative to total acquisition cost",
    },
    {
      key: "grossRentalYield",
      label: "Gross rental yield",
      kind: "percent",
      note: "Potential annual rent / purchase price",
    },
    {
      key: "cashOnCashReturn",
      label: "Cash-on-cash return",
      kind: "percent",
      note: "Annual cash flow / initial cash invested",
    },
  ];
  return (
    <>
      <div className="kpi-grid">
        {metrics.map((m, i) => (
          <Card key={m.key} className={i === 0 ? "primary-kpi" : ""}>
            <CardContent className="kpi">
              <span>{m.label}</span>
              <strong className={isNegative(r[m.key]) ? "negative" : ""} data-testid={m.key}>
                {metricText(r[m.key], m.kind)}
              </strong>
              <small>{metricNote(r[m.key]) || m.note}</small>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="recommendation-card">
        <CardContent>
          <div className="section-heading">
            <h3>Rule-based recommendation</h3>
            <span className="helper">Base case · Default rules</span>
          </div>
          <div className="recommendation-label" data-testid="recommendation">
            {a.recommendation.recommendation}
          </div>
          <ul>
            {a.recommendation.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <div className="score-strip">
            <div>
              <span>Investment score</span>
              <strong>
                {a.invest.overall_score === null
                  ? "Unavailable"
                  : `${a.invest.overall_score} / 100`}
              </strong>
              <small>Financial attractiveness</small>
            </div>
            <div>
              <span>Data confidence</span>
              <strong>{a.confidence.score} / 100</strong>
              <small>Quality of synthetic assumptions only</small>
            </div>
          </div>
          <p className="helper">
            Simulated verification never represents real-world verified evidence. Scores and
            confidence are separate.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="detail-card">
          <h3>Investment breakdown</h3>
          <dl className="breakdown-grid">
            <Detail
              label="Total acquisition cost"
              value={
                acquisition.status === "complete"
                  ? displayMoney(acquisition.total)
                  : "Unavailable · incomplete costs"
              }
            />
            <Detail
              label="Monthly loan instalment"
              value={
                financing.instalmentInUse.amount === null
                  ? "Unavailable"
                  : displayMoney(financing.instalmentInUse.amount)
              }
            />
            <Detail label="Annual cash flow" value={metricText(r.annualCashFlow)} />
            <Detail label="Net operating income (NOI)" value={metricText(r.netOperatingIncome)} />
            <Detail label="Yield on total cost" value={metricText(r.yieldOnTotalCost, "percent")} />
            <Detail
              label="Financed break-even occupancy"
              value={metricText(r.financedBreakEvenOccupancy, "percent")}
            />
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="detail-card">
          <div className="section-heading">
            <h3>How resilient is this investment?</h3>
            <span className="helper">Default scenarios</span>
          </div>
          <div className="scenario-scroll">
            <table>
              <caption>Assumptions, not forecasts. Recommendation uses the base case.</caption>
              <thead>
                <tr>
                  <th scope="col">Metric / assumption</th>
                  {(["bear", "base", "bull"] as ScenarioKey[]).map((key) => (
                    <th scope="col" key={key}>
                      {SCENARIO_LABELS[key]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["monthlyCashFlow", "Monthly cash flow", "money"],
                    ["netRentalYield", "Net rental yield", "percent"],
                    ["cashOnCashReturn", "Cash-on-cash return", "percent"],
                  ] as const
                ).map(([metric, label, kind]) => (
                  <tr key={metric}>
                    <th scope="row">{label}</th>
                    {(["bear", "base", "bull"] as ScenarioKey[]).map((key) => (
                      <td
                        key={key}
                        className={isNegative(a.scenarios[key].returns[metric]) ? "negative" : ""}
                      >
                        {metricText(a.scenarios[key].returns[metric], kind)}
                      </td>
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
                  <tr className="assumption-row" key={key}>
                    <th scope="row">{label}</th>
                    {(["bear", "base", "bull"] as ScenarioKey[]).map((s) => (
                      <td key={s}>{DEFAULT_SCENARIOS[s][key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <div className="evidence-grid">
        <Card>
          <CardContent className="detail-card">
            <h3>
              Risk indicators <span className="count">{a.redFlags.flags.length}</span>
            </h3>
            {a.redFlags.flags.length === 0 ? (
              <p className="helper">
                No flags triggered under these synthetic assumptions. This is not a complete
                due-diligence assessment.
              </p>
            ) : (
              <ul className="risk-list">
                {a.redFlags.flags.map((flag) => (
                  <li key={flag.key}>
                    <span className={`risk-severity ${flag.severity}`}>{flag.severity}</span>
                    <strong>{flag.risk_name}</strong>
                    <p>{flag.explanation}</p>
                  </li>
                ))}
              </ul>
            )}
            {a.redFlags.unchecked.length > 0 && (
              <>
                <h4>Checks awaiting evidence</h4>
                <ul>
                  {a.redFlags.unchecked.map((rule) => (
                    <li key={rule.key}>
                      {rule.risk_name}: {rule.reason}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="detail-card">
            <h3>Confidence & missing information</h3>
            <p className="helper">
              Confidence measures the entered sample evidence, not market certainty.
            </p>
            <ul className="confidence-list">
              {a.confidence.factors
                .filter((f) => f.status !== "not-available-in-phase")
                .map((f) => (
                  <li key={f.key}>
                    <strong>{f.label}</strong>
                    <span>{f.evidence_status} · Synthetic</span>
                    <p>{f.explanation}</p>
                  </li>
                ))}
            </ul>
            {a.recommendation.missing_information.length > 0 && (
              <>
                <h4>Needed for this analysis</h4>
                <ul>
                  {a.recommendation.missing_information.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
