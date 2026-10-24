# MPIA MVP implementation roadmap

MVP-REBASELINE-01 · 23 October 2026 · Asia/Kuala_Lumpur  
Status: concrete proposed implementation sequence; this task changes documentation only.

## Outcome and sequence

Deliver an editable synthetic financial demonstration, then sample location evidence, then an explainable presentation that customers can review. **Start with M1 implementation, not another Option D architecture review.** None of these milestones requires a database connection, SQL installation, live provider or authoritative location writer.

The [scope and living backlog](MPIA_MVP_SCOPE_AND_POST_MVP_BACKLOG.md) is the priority authority and contains the evidence review and exact repository baseline. Milestone completion requires code, focused tests and an actual browser demonstration; these documents do not complete any milestone. The three milestones are sequential slices, not instructions to perform source edits in this documentation task.

Baseline: branch `phase2-location-intelligence`, HEAD `930aa98b3355f4fe65b1fb0b4012eeaf21438ddf`, tree `46130a64a19688a15e0795fec533b7d58eabc7e2`; 415 tracked and 81 pre-existing nonignored untracked files, four tracked modifications, empty staged diff. Preserve the pending property-limit implementation and all SQL/canonical evidence. Do not reset, rewrite or silently replace the working tree with HEAD.

## M1 — Editable financial showcase session

**Backlog:** M01, M02, M07; first portion of M06.  
**Visible result:** a presenter enters a sample session, selects or creates a fictional property, applies purchase/rent/financing/expense assumptions and sees existing financial analysis respond.

### Exact scope

1. Add an explicitly separate local showcase entry/build shell using existing installed React/Vite/UI dependencies. Proposed new locations: `showcase/index.html`, `src/showcase/` and `vite.showcase.config.ts`. Keep the configuration small and explicit; these are proposed paths, not existing functionality.
2. Serve only on loopback for a presenter-led session. It contains no sign-in requirement because it exposes no account resources. It must not import the normal root, AppShell, Auth hooks, Supabase clients or property/financial API modules. The current normal root subscribes to hosted Auth; merely adding /demo beneath it is insufficient. Do not introduce a runtime URL/query toggle that disables real Auth.
3. Hold sample inputs in component/session memory only. Provide three invented presets: sufficiently complete, financially adverse, and incomplete; also a blank “New sample” action. Provide visible Reset and “Session only; reload resets changes” text. No localStorage, cloud save, persistence service, data import or real customer fields are needed.
4. Reuse the existing property/financial validation schemas and input controls. Cover project identity, asking/target price, acquisition purchase price and acquisition-cost categories, expected rent/evidence status, financing assumptions and operating-expense categories. Section-level Apply actions validate drafts before updating active analysis; unchanged/invalid drafts must not be labelled applied. Purchase price used by financing/returns remains the acquisition input, never silently copied from asking or target price.
5. Reuse the existing pure calculation/scenario/scoring/confidence/risk/recommendation modules and default configs. Introduce one small pure input-to-analysis coordinator extracted from the existing hook's orchestration if necessary; the normal hook delegates to it while retaining query loading/error gating. This is a behavior-preserving wiring change, not permission to edit engines/configs or add formulas. Prove equality before using it for demo results.
6. Reuse presentation primitives, formatting and risk display. Make a compact financial result view: yields with correct names, cash flow, cash-on-cash, break-even, default Base/Bull/Bear outputs, rule-based recommendation, confidence and missing inputs. No broad panel/data-layer rewrite or general pluggable repository framework.
7. Correct directly encountered obsolete copy in the normal landing/dashboard/property Financials views: distinguish implemented property analysis from unimplemented portfolio aggregates. In summary/scenario copy, state that the summary uses default assumptions while tab edits are temporary and separate. Do not implement aggregates or persist scenario edits to fix wording.

All fictional evidence badges are subordinate to a persistent synthetic-data banner. A preset may exercise a high-confidence branch using explicitly simulated verification, but no screen may imply actual verification of fictional rent or bank documents.

### Dependencies

Existing property/acquisition/financing/expense schemas, shared finance/scenario/scoring/risk/recommendation modules and config, installed UI/build dependencies, accepted P01–P10 fixtures and isolated local browser surface. No SQL draft or provider choice is a dependency. Recheck working-tree identity before edits; preserve accepted frozen engine behavior.

### Acceptance criteria

- A new local session opens without initializing hosted Auth or making any external service request, including on error/reset. Verify the actual browser network trace, not only imports.
- The three presets and blank sample work. Changes in rent, acquisition cost, interest and an expense category flow through the existing engines; no hardcoded result totals.
- Blank/unknown values remain missing, explicit zero remains zero, invalid inputs withhold dependent results, and adverse cash flow is displayed.
- Applying a section updates only that session's active inputs. Cancel/reset do not mutate real properties. Section status clearly distinguishes unapplied draft from applied session values.
- Default scenario outputs and recommendation match the existing shared path for equal inputs/configuration. Sample data alone never represents empirical scoring validation.
- Narrow desktop and mobile layouts remain usable; keyboard labels/errors work. The normal authenticated app retains its ownership/session guards and load/error behavior.

### Focused regression checks

- Run the unchanged P01–P10 fixture/integration suites and existing finance/scenario/scoring/confidence/red-flag/recommendation tests. Add parity checks around the extracted coordinator for complete, missing, zero and adverse inputs, plus required-query loading/failure; no changed fixture expectations.
- Exercise session Apply/reset/selection and field validation, including seven-field scalar limits, null versus empty and stricter state/postcode input rules. Preserve pending property-save tests.
- Verify the showcase dependency graph/bundle excludes hosted client, Auth, APIs and dormant server location code; block external network requests during a browser rehearsal and confirm no attempted cloud traffic.
- Run the existing offline Vitest suite, `npm run test:security`, application TypeScript check, showcase build and normal production build using existing dependencies. Run browser-asset security scanning against each actual rebuilt browser output; record output location and any skips. No database runners.
- Browser smoke: select preset → change rent/expense → apply → inspect financial changes → reset; repeat with incomplete inputs. Verify that the normal-app copy does not claim portfolio calculations exist.

### Deliberately excluded

Cloud saving, real account setup, all SQL/migrations, universal concurrency claims, live geocoding, location scoring, new financial rules, custom persisted scenarios, portfolio charts and a generic demo/backend abstraction. The local demo is not a preview deployment or customer beta.

## M2 — Sample location origin and nearby evidence

**Backlog:** M03 and the evidence portion of M06.  
**Visible result:** the same session shows where the sample analysis is anchored, which fictional amenities are nearby, what each measurement means and what remains unknown.

### Exact scope

1. Add a small read-only fixture evidence adapter under `src/showcase/`, selected by sample identity and explicit sample-origin version. It returns invented places, categories, measurements and states. No provider SDK, API key, network call or database object.
2. Add a location panel beside financial analysis. Display editable session address text and selected sample coordinates/origin description. Acknowledge the supplied sample origin through a labelled control: “Use this sample origin.” It is not a geocoder confirmation or authoritative location-version write.
3. Bind every fixture evidence set to the exact sample/origin and seven active location-input strings. A change to any such string invalidates the displayed applicability immediately; show “No matching sample evidence” until the original sample is explicitly restored/reselected. Financial-only edits leave it available.
4. Show an accessible category-filtered list for a bounded set of transport, convenience, education and healthcare examples. Each item exposes fictional identity, category, sample source/version, authored/as-of date, measurement value/unit/method and fixture coverage boundary. Dates describe fixture preparation, never an unperformed retrieval.
5. Include deterministic scenarios for complete sample data, partial coverage, stale data, unavailable/error and successful empty-with-known-coverage. An error or unmatched arbitrary address never means zero amenities. List counts are counts within the supplied sample, not estimates of Malaysian provider coverage.
6. Use measurements supplied by the fixture. Label straight-line metres explicitly; do not fabricate walking/driving duration or apply time rules to distance. Disclose caps/bounds and context-only use. No numerical Location Score in this milestone.
7. Show a compact location limitations block: synthetic, not independently verified, no transport-service/market/rental-demand inference, no official assessment. Keep financial score/confidence unaffected by every location state.

A map is not needed to meet this milestone. A well-attributed evidence list is the smallest useful customer-visible slice.

### Dependencies

M1 stable session identity/active inputs, fixture schema and deterministic state cases. The owner can supply properly licensed evidence later; until rights/provenance are established, use wholly invented fixture content. Do not copy provider results from old screenshots or claim current provider coverage.

### Acceptance criteria

- A sample origin and its evidence can be understood without reading architecture documents.
- Editing address/city/district/state/postcode/country/project name or selecting a different sample cannot leave old evidence looking applicable. Explicit restoration is supported without inventing a geocode result.
- Every displayed item exposes provenance, sample date and method/unit; failed/unavailable/bounded/zero states are distinct.
- Selecting categories, opening evidence details or changing financial inputs makes zero provider requests and writes no authoritative state.
- In every location failure state, financial editing and analysis continue. Investment Score, Data Confidence, flags and recommendation are unchanged for unchanged financial inputs.

### Focused regression checks

- Fixture matching and invalidation tests: each of seven location fields independently, null/empty/spacing distinction, origin/version change, sample switch and financial-only edit.
- Evidence state tests: complete/partial/stale/empty/error/unmatched; capped counts and unknown distance beyond coverage. No unavailable-to-zero conversion.
- Regression comparison of full Phase 1 outputs across all fixture location states.
- Browser keyboard/filter/detail checks, narrow layout and visible mismatch warning. Inspect network on panel open/filter/reset.
- Existing offline suite, typecheck, showcase/normal builds and rebuilt-asset security checks; no SQL or live provider tests.

### Deliberately excluded

Live geocoding/Places/routing, provider benchmarking or selection, acquisition queues, canonical POI persistence, official facts/context/Location Score, map tiles, authoritative confirmation, history/replay UI and Option D.

## M3 — Explainable draft assessment and presentation

**Backlog:** M04, M05 and final M06/M07 verification.  
**Visible result:** a customer can understand the financial conclusion and evidence limits, then present or print the same labelled result.

### Exact scope

1. Add a deterministic presentation view consuming the current M1 analysis and M2 evidence. Heading: “Draft investment assessment — synthetic demonstration.”
2. Explain the existing recommendation using its reasons, key metric values, investment-score contributions, confidence factors, critical flags and missing information. Include a short due-diligence checklist derived from actual missing/flagged items. No AI service is required.
3. Keep financial recommendation separate from a “Location observations” section. State explicitly that sample location evidence has not entered the financial score/recommendation. When input loading/validation fails, withhold affected current conclusions; never retain an apparently current positive card from an earlier valid session.
4. Clearly distinguish applied financial inputs/default scenario assumptions from any temporary scenario exploration. Do not present the editable scenario tab as a newly persisted or recommendation-driving configuration.
5. Add an on-screen presentation/print action using the browser's print capability and scoped print CSS. Capture the current applied inputs/outputs/config identifiers/sample-origin version into an in-memory presentation model when opened; mark it as captured and require refresh after changes. This is not a durable analysis store or official historical snapshot.
6. Include sample labels, captured-at time, inputs, assumptions, metric names/units, engine/config identifiers available from source, reasons, risks, evidence details, coverage, missing values and limitations in the printed result. Use the same output model as screen, without recalculating formulas in export code. No public share link or server PDF service.
7. Run the entire nine-step showcase rehearsal, including a blank/incomplete sample and an adverse case. Finish with a printable result and visible session-reset behavior.

### Dependencies

M1/M2, deterministic recommendation/scoring/confidence/flag outputs and formatter reuse. Identify actual source/config versions; do not invent a semantic engine version. Build/commit identifier can identify the implementation where no standalone engine version exists. No LLM key, provider agreement or database deployment is a dependency.

### Acceptance criteria

- A viewer can identify the conclusion, its reasons, missing data, confidence limits and next due-diligence actions.
- Explained numbers/recommendations exactly match the captured engine outputs; no merged financial/location score, new BUY condition or hidden missing evidence.
- Screen and print preserve sample status and all material adverse/missing/coverage disclosures. Long text and evidence tables do not clip or hide warnings at the supported page size.
- Changing active inputs marks an open presentation out of date until refreshed; a new capture uses the new inputs. No result is described as cloud-saved.
- Complete, adverse and incomplete journeys can be presented reliably with all external network unavailable.

### Focused regression checks

- Explanation cases for each existing recommendation label, unavailable investment score, low confidence, critical flags, missing inputs, zero and negative values. Compare against actual engine output objects.
- Verify that location mismatch/failure changes only location text; no arithmetic or recommendation mutations.
- Model capture/refresh/reset and screen/print value parity; print-preview inspection of supported desktop page size plus narrow on-screen layout.
- Final unchanged P01–P10, full offline suite, typecheck, normal/showcase builds and rebuilt-browser security scans. Record existing warnings and skipped checks accurately.
- Rehearse entry → select/create sample → edit/apply finance → analysis → sample origin → amenities → explanation → confidence/limits → present. Check keyboard navigation, errors and reset.

### Deliberately excluded

AI-generated advice, new scoring rules, score calibration claims, official verified location assessment, durable report database, cloud exports/share links, investor/market predictions, real-user beta, deployment and transaction recovery activation.

## After the showcase: bounded beta work

Do not start these instead of M1–M3. When real saved-data beta is commissioned, use the single backlog register in this order:

| Work boundary | Required outcome |
| --- | --- |
| Establish the actual deployment and supported writers (B01/B06) | Exact Auth/API/database/build/ledger identity; current ownership policies and parent/child writer inventory. Historical local acceptance is supporting evidence, not today's cloud state. |
| Qualify corrected property controls (B02–B04) | Independent corrected SQL acceptance and Q03 catalog gate; approved disposable synthetic target/observer/transport; PG17 compile/runtime, privileges, RLS, legacy-byte preservation, two-session races, rollback and limits. Preserve originals; new runner pins must explicitly select accepted corrected bytes. |
| Integrate reliable saving (B03/B05) | Fetch original database revision; send changed fields plus that original expectation; private conflict/error mapping; preserve draft; require reload/review after conflict; reject old timestamp-only clients after controlled cutover. Qualify child-section create/update races without rewriting financial formulas. |
| Qualify the exposed beta (B07/B08) | Applicable eight T15 cases, two-user/anonymous tests, data privacy, basic backup/restore and release evidence. Migrations/deployments require their own concrete authorized scope; this roadmap installs nothing. |

The property revision is separate from location state revision. Do not replace one with the other. Do not reread a fresh revision and attach it to a stale draft, or deploy strict revision SQL while the editor still sends only updated_at.

A financial beta may launch with location unavailable or a distinct sample demonstration. If the product chooses real location writes, reactivate P01–P03 and applicable P04–P07 gates before that exposure. A feature flag alone does not qualify the writer.

## Preserved location and recovery obligations

No milestone alters I05/I06, hashes, operation identity, locked owner/input checks, replay order, append/CAS atomicity, explicit COMMIT certainty or invocation-owned connection lifecycle. Actual driver normalization/physical eviction, target/actor security, licensing and authorized UNKNOWN recovery remain mandatory before live use.

The [deployment-evidence decision](PHASE2A_03_I06_D_LEGACY_DEPLOYMENT_EVIDENCE_DECISION.md) distinguishes unknown history from proven genuine history. Do not assume zero prior operations from dormant source, an empty local target or three owner-described samples. Do not commission a full legacy executor without an established need either. Future lost-acknowledgement cases remain real requirements even for a first bounded writer.

The corrected length/revision migrations remain in docs with their original drafts and review trail. No execution or deletion is part of this restart. Their qualification does not depend on activating location tables; preserve one authoritative production database, with isolated local targets only for development tests.

## Delivery and verification discipline

Each future milestone should deliver working code and focused evidence for its named slice. Use existing dependencies; any missing environment capability must be reported specifically rather than expanding into a general redesign. Do not relax financial fixtures, RLS, current recommendation gating or transaction contracts to make a demo pass.

For this documentation task, verification is limited to local baseline capture, source/report reconciliation, document/link checks, and raw before/after preservation. Application tests/build/browser/SQL were not rerun: no application behavior changes, and build/test artifact generation is unnecessary for these two Markdown deliverables. Retained results remain explicitly historical.

Completion of this task is exactly the two rebaseline documents. Next development action is **M1: implement the isolated editable financial showcase session**, followed by M2 and M3.

