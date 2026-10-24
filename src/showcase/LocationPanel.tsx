import { useState, type Dispatch } from "react";
import { MapPin, FlaskConical, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SampleSession, SessionAction } from "./session";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  EVIDENCE_SCENARIOS,
  SCENARIO_LABELS,
  currentLocationEvidence,
  distanceLabel,
  filterPlaces,
  type CategoryFilter,
  type LocationEvidence,
  type EvidenceScenario,
} from "./location-fixtures";

export function LocationPanel({
  session,
  dispatch,
}: {
  session: SampleSession;
  dispatch: Dispatch<SessionAction>;
}) {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const evidence = currentLocationEvidence(session);
  const { origin, fixture, status } = evidence;
  const hasFindings =
    status === "complete" || status === "partial" || status === "stale" || status === "empty";
  return (
    <Card className="location-panel" id="sample-location" aria-labelledby="location-heading">
      <CardContent className="detail-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">LOCATION RESEARCH / INVENTED EVIDENCE</p>
            <h2 id="location-heading">
              <MapPin size={18} aria-hidden="true" /> Explore the sample neighbourhood
            </h2>
          </div>
          <span className="sample-tag">SYNTHETIC ONLY</span>
        </div>
        <p className="helper">
          Context for property research. Financial scores, data confidence, yields, risks and
          recommendations do not use this evidence. No official Location Score.
        </p>
        <div className="sample-origin">
          <strong>{session.draft.property.project_name || "Unnamed synthetic sample"}</strong>
          <address>
            {[
              session.draft.property.full_address,
              session.draft.property.city,
              session.draft.property.district,
              session.draft.property.state,
              session.draft.property.postcode,
              session.draft.property.country,
            ]
              .filter(Boolean)
              .join(", ") || "Address unknown"}
          </address>
          <p className="helper">
            All address text, including the 00000 postcode, is for demonstration only. State labels
            provide sample context, not a real location claim.
          </p>
          {origin && (
            <>
              <p>{origin.description}</p>
              <small>
                Sample identity: {origin.sampleId} · Origin version: {origin.version}
              </small>
            </>
          )}
          <a
            href="#location-inputs"
            onClick={() => {
              const editor = document.getElementById("location-inputs");
              editor?.setAttribute("open", "");
              editor?.querySelector("input")?.focus();
            }}
          >
            Edit sample location inputs
          </a>
        </div>
        <div
          className={`location-state location-state-${status}`}
          role="status"
          data-testid="location-status"
          data-state={status}
        >
          <FlaskConical size={17} aria-hidden="true" />
          <p>{evidence.message}</p>
        </div>
        {status === "awaiting-origin" && (
          <div className="origin-action">
            <Button onClick={() => dispatch({ type: "acknowledge-origin" })}>
              Use this sample origin
            </Button>
            <p className="helper">
              Acknowledges an invented origin in this session only. No geographic verification or
              authoritative write.
            </p>
          </div>
        )}
        {status === "unmatched" && session.id !== "blank" && (
          <Button variant="outline" onClick={() => dispatch({ type: "restore-location" })}>
            Restore sample location inputs
          </Button>
        )}
        {origin && status !== "awaiting-origin" && (
          <p className="helper">Sample origin acknowledged · Session only</p>
        )}
        {origin && (
          <label className="fixture-select" htmlFor="evidence-example">
            Evidence example <span className="helper">(simulated states only)</span>
            <select
              id="evidence-example"
              value={session.location.scenario}
              onChange={(event) =>
                dispatch({
                  type: "evidence-scenario",
                  scenario: event.target.value as EvidenceScenario,
                })
              }
            >
              {EVIDENCE_SCENARIOS.map((scenario) => (
                <option value={scenario} key={scenario}>
                  {SCENARIO_LABELS[scenario]}
                </option>
              ))}
            </select>
          </label>
        )}
        {hasFindings && fixture && (
          <>
            <fieldset className="category-filters">
              <legend>Filter fictional nearby examples</legend>
              {(["all", ...CATEGORIES] as const).map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={category === value ? "default" : "outline"}
                  aria-pressed={category === value}
                  onClick={() => setCategory(value)}
                >
                  {CATEGORY_LABELS[value]}
                </Button>
              ))}
            </fieldset>
            <LocationFindings evidence={evidence} category={category} />
          </>
        )}
        {fixture && (
          <details className="coverage-details" open>
            <summary>Source, coverage & missing data</summary>
            <p>{fixture.source}</p>
            <p>Fixture version: {fixture.id}</p>
            <p>
              Authored {fixture.authoredOn} · Sample as-of {fixture.asOf}. These are preparation
              dates, never a live retrieval.
            </p>
            {hasFindings ? (
              <>
                <p>
                  Boundary: {fixture.coverage.radiusM.toLocaleString("en-MY")} m straight-line ·
                  Cap: {fixture.coverage.cap} examples total.{" "}
                  {status === "empty"
                    ? "Known coverage for this synthetic empty list"
                    : "Supplied categories"}
                  : {fixture.coverage.included.map((c) => CATEGORY_LABELS[c]).join(", ")}.
                </p>
                <p>
                  Missing category coverage:{" "}
                  {fixture.coverage.missing.length
                    ? fixture.coverage.missing.map((c) => CATEGORY_LABELS[c]).join(", ")
                    : "None within this invented fixture; real coverage is unknown"}
                  . {status === "partial" ? "One convenience distance is unavailable." : ""} Counts
                  describe a bounded fixture, not provider coverage or the full neighbourhood.
                </p>
              </>
            ) : (
              <p>
                No completed coverage result or amenity count is available in this state. Any
                configured boundary is not evidence of a completed search.
              </p>
            )}
          </details>
        )}
        <div className="location-limitations">
          <Info size={16} aria-hidden="true" />
          <p>
            Wholly invented, versioned fixtures; not independently verified. Straight-line metres
            are distances, not travel times. No transport service, school quality, healthcare
            suitability, market or rental-demand inference. This is context only, not an official
            assessment. Missing, failed or filtered-out evidence never proves absence of amenities.
            No map, provider connection or cloud save.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function LocationFindings({
  evidence,
  category,
}: {
  evidence: LocationEvidence;
  category: CategoryFilter;
}) {
  const { fixture, status } = evidence;
  if (!fixture) return null;
  const visible = filterPlaces(evidence.items, category);
  return (
    <>
      <p className="helper" role="status">
        {visible.length} of {evidence.items.length} supplied examples shown ·{" "}
        {CATEGORY_LABELS[category]} · Fixture counts only
      </p>
      {visible.length > 0 ? (
        <ul className="place-list">
          {visible.map((place) => (
            <li key={place.id}>
              <div className="place-heading">
                <div>
                  <span className="eyebrow">{CATEGORY_LABELS[place.category]} / SYNTHETIC</span>
                  <h3>{place.name}</h3>
                </div>
                <strong className="place-distance">{distanceLabel(place.distance)}</strong>
              </div>
              <details className="place-details">
                <summary>Evidence details for {place.name}</summary>
                <dl>
                  <div>
                    <dt>Source</dt>
                    <dd>{fixture.source}</dd>
                  </div>
                  <div>
                    <dt>Evidence identity</dt>
                    <dd>
                      {fixture.id} / {place.id}
                    </dd>
                  </div>
                  <div>
                    <dt>Authored / sample as-of</dt>
                    <dd>
                      <time dateTime={fixture.authoredOn}>{fixture.authoredOn}</time> /{" "}
                      <time dateTime={fixture.asOf}>{fixture.asOf}</time> · Fixture preparation
                      dates; no provider retrieval
                    </dd>
                  </div>
                  <div>
                    <dt>Measurement</dt>
                    <dd>
                      {distanceLabel(place.distance)}. Supplied invented grid measurement, not a
                      route. No walking or driving time inferred.
                    </dd>
                  </div>
                  <div>
                    <dt>Coverage</dt>
                    <dd>
                      1,500 m straight-line sample boundary; maximum {fixture.coverage.cap} supplied
                      examples. Unknown distances cannot establish proximity within that boundary.
                      No information beyond the boundary.
                    </dd>
                  </div>
                  <div>
                    <dt>Applicability</dt>
                    <dd>
                      Exact sample identity, origin version and all seven unmodified location
                      strings.
                    </dd>
                  </div>
                </dl>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <p className="location-empty">
          {status === "empty"
            ? "No examples in this successful, bounded synthetic fixture. This is not proof of no real nearby amenities."
            : `No supplied ${CATEGORY_LABELS[category].toLowerCase()} examples in this filter. Coverage may be missing; this is not proof of no nearby amenities.`}
        </p>
      )}
    </>
  );
}
