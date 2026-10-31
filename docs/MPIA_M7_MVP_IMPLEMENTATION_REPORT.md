# MPIA — M7 MVP implementation report

31 October 2026 · Asia/Kuala_Lumpur · `.beta-real-data.local` only.

**M7 MVP accepted locally: GO.** Automated and prior live local API checks PASS. The owner has completed and accepted all six essential browser checks below, recorded as **OWNER-VERIFIED**, not Codex-observed automated browser tests. The disposable database ledger was reconciled and the exact synthetic fixture saved/reloaded in the preceding implementation task. This report is included in the single forward-only local M7 checkpoint; its final SHA and manifest are recorded in `MPIA_M7_CHECKPOINT_AND_INTEGRATION_PREPARATION.md`. No integration or remote operation is authorized by this acceptance.

## 1. Investor experience implemented

- **M7-1:** dashboard/property list have exclusive loading, error/Retry, genuine-empty/New Property, search-no-match/Clear filters and loaded states. Failed reads cannot imply zero saved properties or display an empty table beside the error. Search/status filters have accessible names.
- **M7-2:** saved overview explains Details → Acquisition → Financing → Expenses → Evidence → Analysis → Strategies. Completion cards link to the specific financial section. Financials are ordered Acquisition → Financing → Expenses. Guidance explains returning to M3 after saving financing. Target and acquisition prices remain independent; existing forms/save boundaries are retained.
- **M7-3:** evidence actions carry the exact section and input. They activate Details/Financials, use the existing revision-aware source-opening action, select the relevant field, expand its editor and focus the selector. Existing baselines/drafts and uncertain/conflict controls remain in use. Each saved strategy has a source action opening its own resale source (Keep: horizon source). Rental-source review targets the property rental input. No second evidence screen.
- **M7-4:** New Property terminology is consistent; obsolete application-shell/future-strategy copy is removed from the authenticated and sign-in layouts. Scenarios are described as rental sensitivities, Strategies as independent investment plans. Recommendation, investor preference, target suitability and source authentication remain distinct. Strategy percentage values now display `%` explicitly.
- **M7-5:** strategy editing starts with one selected plan expanded; plan selectors keep all three accessible. Sources/targets remain disclosures. Range/tax/source errors have human-readable messages, an alert summary, first-invalid-field focus and automatic disclosure expansion. NULL/zero distinctions and save/review/discard/conflict actions are preserved. Incomplete plans can still be saved, with dependent results withheld.
- **M7-6:** dashboard prioritizes real recently edited properties, New Property and View all. Unavailable aggregates/charts/placeholder insights are replaced with a short availability note; no invented portfolio totals.
- **M7-7:** source-level responsive protections add wrapping/width limits for property controls, shrinkable fieldsets/selects, long explanations and header titles. Existing contained property-table scrolling and wrapping tabs remain. **1440/390/320px usability is OWNER-VERIFIED**, not inferred from CSS or server rendering.

## 2. Main changed files

| Area | Files |
| --- | --- |
| List/dashboard states | `routes/_authenticated/dashboard.tsx`, `routes/_authenticated/properties/index.tsx`, new `components/property/PropertyListState.tsx` |
| Journey/navigation | `routes/_authenticated/properties/$id.index.tsx`, `components/property/SavedAnalysisOverview.tsx`, new `hooks/use-source-navigation.ts` |
| Existing source editors | `components/property/EvidenceSummary.tsx`, `EvidenceFields.tsx`, `SourcesAndAssumptions.tsx` |
| Strategy usability | `components/property/InvestmentStrategies.tsx`, new `lib/property/strategy-editor-validation.ts` |
| Product copy/layout | `components/layout/AppShell.tsx`, `AuthLayout.tsx` |
| Demo/reproduction | `tests/m7-demo/{fixture.ts,run.ts,setup.mjs,local-client.ts,vite.config.ts,README.md}` |
| Focused checks | `tests/m7-demo.test.ts`, `m7-demo-save.test.ts`, `m7-presentation.test.ts`, `m7-tsconfig.json` |

Application paths above are relative to `src/`. No finance/strategy evaluator, scoring, recommendation, M3 rules, M5 evidence contract, production save API or migration was changed. No dependency changes. Pre-existing generated route-tree noise and historical untracked artifacts were retained.

## 3. Exact synthetic demonstration

Maintained recipe: [fixture](../tests/m7-demo/fixture.ts). Reproduction and preview: [short runbook](../tests/m7-demo/README.md).

`SYNTHETIC — Residensi Contoh PJ — M7 Demo` retains asking RM520,000, acquisition price RM500,000, all 14 acquisition lines totaling **RM565,250**, all 14 annual expense lines totaling **RM8,400**, rent RM3,000 and the conventional RM400,000 / 4% / 30-year loan. Existing financing gives **RM1,909.66/month**, initial investor cash **RM165,250**. All manual evidence remains visibly synthetic `user_assumption`; M3 entries use `appliedEstimateEvidence` and the real estimator fingerprint. No fictional external evidence or forced positive suitability.

| Engine result | Keep: 60 months | Flip: 12 months | Hybrid: 60 months, 6-month lead-in |
| --- | ---: | ---: | ---: |
| Hypothetical resale | No sale | RM610,000 | RM650,000 |
| Holding cash flow | RM8,420.40 | −RM31,315.92 | −RM8,079.60 |
| Remaining loan | RM361,790.09 | RM392,955.85 | RM361,790.09 |
| Final proceeds incl. acquisition-deposit refunds | No sale | RM189,088.15 | RM263,453.91 |
| Investor profit | Rental only | **−RM7,477.77** | **RM90,124.31** |
| Total cash funded | RM165,250.00 | RM193,956.26 | RM180,907.96 |
| Funded ROI / annualized IRR | Not calculated | −3.86% / −4.16% | 49.82% / 8.59% |
| Actual target suitability | Needs evidence | Needs evidence | Needs evidence |

Keep/Base monthly flow **RM140.34**, annual flow **RM1,684.08**, annual cash-on-cash **1.02%**. Separate itemized selling expenses, manual tax, identified refunds and investor targets match the handoff. Unknown Flip tax produces the qualified before-tax **RM4,522.23**; a missing selling-cost amount withholds the dependent result.

Setup uses existing revision-aware APIs, fresh snapshots and final reload comparison. Unchanged reruns make no property writes; altered/partial records require explicit reviewed-ID replacement. A durable ignored creation-intent receipt prevents silent recreation after uncertain creation. Credentials stay in process environment/memory, never Git. The setup rejects non-local network destinations. The rerun now also confirms these behaviors against the actual local Auth, snapshot/write RPCs and saved records; this is separate from browser evidence. A live-run defect in the CLI virtual-module alias was fixed with a real setup-only `local-client.ts` adapter; no production connection or financial logic changed.

## 4. Database qualification and live acceptance — PASS

On the owner-requested rerun, Docker was running but sandbox pipe access was denied. Approved execution outside the sandbox verified the exact disposable containers and gateway `127.0.0.1:57421`; no other database was modified.

- Compared all seven M4/M5/M6 function bodies against the latest applicable reviewed migration definitions, plus nullable JSONB columns, five validated evidence/strategy constraints, function ownership/search paths/security mode, effective grants, RLS, direct-UPDATE denial and PostGIS 3.3.7. The snapshot remains SECURITY INVOKER; the write RPC remains SECURITY DEFINER. Existing validator grants are consistent with the local default function grants.
- Reconciled only missing ledger versions `20261030000000` and `20261030010000`, transactionally guarded by those comparisons. Stored reviewed source statements as provenance. **No ADD COLUMN or historical migration SQL was replayed; no historical file changed.** An initial review assertion incorrectly expected the snapshot to be a definer; that transaction rolled back with no changes, and the assertion was corrected to the reviewed invoker setting before reconciliation.
- The maintained prerequisite gate then passed. Created one synthetic local Auth account and property through the maintained setup and existing revision-aware APIs. Known property ID: **`aaacbd06-6335-41b1-a1b7-2183f177867c`**. Credentials remain in session memory/environment, not Git or this report.
- Complete fixture saved and freshly reloaded with all itemized inputs, targets and evidence. Engine results reconcile to the table above. Unchanged authenticated rerun returned **`changed: false`**, without duplicate creation/writes.
- Brief live saved-data check: unknown Flip tax reloaded at revision 7 and produced qualified before-tax profit **RM4,522.23**. Blank agent cost reloaded at revision 8 and withheld dependent profit. Restored the exact original fixture through the strategy API and confirmed it at **revision 9**. Restoration checks the expected revision and saved plan; an uncertain write would stop rather than retry/recreate.
- Local preview `/login` and its loopback Supabase configuration both returned HTTP 200; the served connection override was checked for `127.0.0.1:57421`. This is HTTP verification, not browser observation.

Ignored local receipts: `.m7-demo.local/{live-schema-review.json,schema-comparison.json,ledger-reconciliation.json,qualification.json,live-acceptance.json}`. No customer data, remote operations or fresh historical RLS/concurrency campaign. RLS/grants were inventoried; prior accepted M6 ownership qualification remains distinct from this short M7 save/reload pass.

## 5. Owner-manual browser acceptance ? PASS

The owner reports completing and accepting all six essential M7 checks. Each result is **OWNER-VERIFIED**, not Codex-observed and not an automated browser test:

1. Dashboard, property list and synthetic property open correctly.
2. Complete property, financial, evidence, analysis and strategy navigation works.
3. Source-review navigation and strategy validation focus work.
4. Keep / Flip / Hybrid results reconcile and evidence limitations remain visible.
5. Saved edits survive navigation, document reload and reopening.
6. Desktop 1440px, mobile 390px and narrow mobile 320px remain usable.

Earlier Codex Chrome access failed (browser host unavailable; native fallback approval timed out). Those earlier tool failures remain historical context, not an outstanding blocker to the owner's manual acceptance. No new browser automation or database campaign was run for the checkpoint. Two-session browser conflict UI remains separately unverified.

## 6. Verification results

| Check | Result / evidence type |
| --- | --- |
| Focused changed behavior + retained M5/M6 checks | **PASS: 102 tests / 8 files**, automated |
| Full existing regression plus M7 | **PASS: 2,876 tests / 81 files**, `vitest run --maxWorkers=1 --testTimeout=20000` |
| Application TypeScript | **PASS**, `tsc --noEmit` |
| M7 source/test/setup TS and M6 source/tests | **PASS**, `tsc --noEmit -p tests/m7-tsconfig.json` and `tests/strategies-tsconfig.json` |
| Setup JavaScript syntax | **PASS**, `node --check tests/m7-demo/setup.mjs` |
| Production build | **PASS**, `vite build`; dependency-directive, configuration and bundle-size warnings remain |
| Source and freshly built-browser security | **PASS: 6 tests, zero skipped**; `SECURITY_AUDIT_BROWSER_ROOT=.output/public` |
| Changed application semantic lint | **PASS**, formatting rule excluded to avoid unrelated existing formatting debt |
| Changed whitespace / frozen engine and migration paths / Git index | **PASS**: no added whitespace errors; frozen paths unchanged; nothing staged |
| Refreshed setup/API-focused tests after adapter fix | **PASS: 27 tests / 4 files**, plus M7 TypeScript and setup JavaScript syntax |
| Real local persistence and Auth | **PASS** — exact fixture, fresh reload, unchanged rerun, unknown-tax/missing-cost checks and restoration; RLS/grants inspected, prior M6 ownership checks retained |
| Actual browser journey/responsive acceptance | **NOT RUN** — Chrome host unavailable; native fallback app approval timed out |

Automated coverage checks exact evidence callback destinations, list states/actions, first-invalid paths and disclosure/focus helper behavior. It also checks cent-level reconciliation, NULL/zero/unknown-tax treatment, JSON reload equality, unchanged legacy calculation/recommendation outputs, and mocked revision-aware setup/reload/idempotence. The automated mocks do not prove browser rendering; actual local persistence is separately verified in section 4. Routine logs are ignored under `.m7-demo.local/`.

## 7. Remaining defects/limitations

One preserved evidence-context nuance is source-observed and tested: handoff M3 inputs capture manual `loanAmount: null`, while the existing financing save builder stores derived `loan_amount: 400000`. Frozen M5 context comparison therefore labels those four estimates **“System estimate - review calculation context.”** Amounts reconcile. The fixture retains the exact requested fingerprint; no automatic provenance rewrite or evidence-rule change was introduced. Deliberate estimator reapplication uses the current saved principal context and changes that captured input. See runbook.

The local setup loader defect was fixed and the prior full real setup/reload completed. The owner has now accepted the essential browser journey and responsive checks. No remote rollout or two-session browser-conflict acceptance is claimed.

## 8. Demo decision and remaining integration gates

**Local demo GO:** prior local database/API results and the six owner-manual checks satisfy the accepted M7 MVP checkpoint. The preserved M3 context reminder remains visible; evidence contracts and estimator fingerprints remain unchanged.

**Integration:** source is ready for review, not integration/deployment acceptance. A separately authorized integration must reconcile the primary worktree's four overlapping code edits, curate accepted M1–M7 changes without historical artifacts, then qualify the live target's schema/data/RLS/Auth and coordinated RPC-compatible rollout. Remote compatibility and browser conflict UI remain unverified. The accepted handoff's integration sequence still applies.

Checkpoint starts from accepted M6 **`0e622b14af11e466170c421e6e55ddc2313c73f3`** on `beta/real-data-reliability`; M6 ancestry passed. Primary HEAD is `b23e753a7d34da2cedf792fe841bc6e69ec04b20`, with five pre-existing tracked modifications. Final M7 SHA, exact committed paths and primary-preservation verification belong to the post-commit preparation report. No primary edits, push, merge, deployment, remote migration or Lovable synchronization.

## 9. Local preview instructions

From `.beta-real-data.local`, follow the [runbook](../tests/m7-demo/README.md). Run `node tests/m7-demo/setup.mjs` for the read-only prerequisite gate; after qualification, use its explicit synthetic `--apply --signup --create` first-run flow, then `node tests/m7-demo/setup.mjs --preview`. Open **http://127.0.0.1:5177** and sign in with the synthetic account. Subsequent unchanged setup uses `--apply` only. **No preview server is currently running. Do not use ordinary `npm run dev` for the demo: its normal connection targets remote Supabase.**

## 10. Fresh lightweight M7 checkpoint verification

31 October 2026, beta worktree only. No implementation source changes were needed during checkpoint review.

- PASS: focused M7 tests, **13 tests / 3 files**, `vitest run tests/m7-demo.test.ts tests/m7-demo-save.test.ts tests/m7-presentation.test.ts --maxWorkers=1 --testTimeout=20000`.
- PASS: application TypeScript (`tsc --noEmit`), M7 source/test/setup TypeScript (`-p tests/m7-tsconfig.json`), retained strategy TypeScript (`-p tests/strategies-tsconfig.json`), and `node --check tests/m7-demo/setup.mjs`.
- PASS: production `vite build`; existing configuration, dependency directive and large-bundle warnings remain.
- PASS: `SECURITY_AUDIT_BROWSER_ROOT=.output/public node --test tests/security.test.mjs`, **6 tests, zero skipped**, source and fresh built-browser scanning.
- The previously accepted **2,876-test / 81-file** regression result is retained as prior evidence, not rerun or represented as newly observed.
- Review confirms no changes to Engine A, M3 estimator/rules, M5 evidence contracts, M6 strategy engines, scenario/scoring/confidence/risk/red-flag/recommendation policies, production write APIs or historical migrations since M6. The setup-only adapter fails without explicit in-memory initialization; setup supplies a fixed loopback client and denies other fetch origins; preview has a fixed loopback override and fails without local configuration.
- Staged whitespace, exact-path and sensitive-file review must pass before the checkpoint is created; final outcomes are recorded in the post-commit preparation report. Generated route-tree noise and unrelated untracked artifacts remain excluded.
