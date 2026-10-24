# MPIA MVP M1 implementation

23 October 2026 · MVP-M1-IMPLEMENT-01

**Decision: implementation delivered and offline checks pass; final M1 browser acceptance remains pending.** M2 location evidence and M3 presentation/export are not implemented. No database, Auth service, provider or analytics connection was used for this task.

## Customer functionality

- Separate local React/Vite showcase with a persistent synthetic-data banner and session-only/no-cloud-saving labels.
- Three fictional presets: Meranti Court (favorable assumptions), Senja Heights (financial stress), Rimba Residences (incomplete information); New blank sample and Reset sample.
- Editable name, separate asking/target/acquisition prices, rent and simulated evidence, bank valuation, every acquisition-cost category, financing and every annual expense category. Uses the existing validation schemas and UI controls.
- Apply validates all sections together. Any draft immediately withholds results; validation failures keep the draft, identify errors and provide links that open/focus affected fields. Successful Apply affects React memory only.
- Shared-engine yield/cash-flow/return KPIs, acquisition total, instalment, NOI, break-even occupancy, default Base/Bull/Bear assumptions/results, investment score, separate confidence, risks, unchecked rules, missing information and recommendation reasons.
- Unknowns stay null; explicit zero is distinct; negative cash flow remains visible. LTV takes precedence over explicit loan amount, matching the existing engine; the editor explains clearing LTV to use the amount.
- Existing obsolete financial-analysis placeholders and summary/scenario wording corrected. Portfolio aggregates remain unavailable.

## Launch

From the repository root, using existing installed dependencies:

```powershell
npm run dev:showcase
```

Open **http://127.0.0.1:4174/showcase/** (the trailing `/showcase/` matters).

For the production artifact:

```powershell
npm run build:showcase
npm run preview:showcase
```

Open the same URL. Stop the development server before starting preview on the same port. Both bind to loopback; this is a presenter-controlled local demonstration. Reload returns to preset A; Reset restores the currently selected preset, or a fresh blank sample.

## Verification

| Check | Actual outcome |
| --- | --- |
| Full offline `npx vitest run` | 45 files; 1,948 passed, 4 existing TODOs; zero failures |
| New showcase tests (included above) | 43 passed: selection/blank/reset, edits/Apply, rent/cost/financing/expense propagation, missing vs zero, invalid drafts, schema boundaries, adverse/unavailable rendering, parity and isolation |
| Existing Phase 1 fixtures and financial regressions | Pass without changed fixtures, engines, thresholds or expected outputs |
| `npx tsc --noEmit` | Pass; includes normal and showcase application source |
| Separate TypeScript check of `vite.showcase.config.ts` | Pass (`--moduleResolution bundler --module esnext --target es2022 --skipLibCheck --noEmit`) |
| ESLint on new/changed analysis and showcase TypeScript | Pass |
| `npm run build:showcase` | Pass; `dist/showcase/`, entry `showcase/index.html` |
| `npm run build` | Pass; normal browser output `.output/public/`; existing bundler warnings about chunk size, tsconfig-paths plugin and module directives remain |
| `npm run test:security`, `SECURITY_AUDIT_BROWSER_ROOT=.output/public` | 6 passed, zero skipped; actual rebuilt normal browser assets scanned |
| Same security check, `SECURITY_AUDIT_BROWSER_ROOT=dist/showcase` | 6 passed, zero skipped; actual rebuilt showcase assets scanned |
| Local HTTP serving | Production HTML and both referenced assets return 200; development HTML and transformed React entry return 200. This is not browser execution evidence. |
| Browser interaction, keyboard, responsive layout and network trace | **NOT TESTED**: browser inventory was empty; opening the in-app browser returned `Browser is not available: iab`. No installed Playwright package was available; no dependency was added. |

## Parity and isolation evidence

`src/lib/analysis/analyze-property.ts` extracts the original hook's input-to-engine orchestration. The normal hook still owns its four queries and loading/error gating; it passes unavailable inputs after any required query fails or loads. Existing integration/query regression tests pass, including withholding cached positive recommendations and recovery.

P01–P10 compare the extracted coordinator against the unchanged independent fixture coordinator for complete, adverse, missing and zero cases: exact returns, scenarios, investment score, confidence, risks and recommendation equality. The comparison uses default scenarios, as the normal hook always does; existing fixture tests also retain their custom-scenario coverage.

The showcase's reachable source graph test excludes hosted clients, Auth hooks/routes, property APIs, location code and side-effect calls. A production build guard inspects actual bundled module IDs: **73 reachable modules**, with no prohibited Auth/Supabase/API/location/analytics modules. dotenv loading and public asset copying are disabled. HTML restricts external connections/resources through CSP; inline scripts are allowed for Vite's development preamble. SSR and session actions execute with network/storage APIs trapped: zero calls. These checks support source/build isolation; an actual blocked-network browser trace is still required and is not claimed.

## Changed files

- New: `showcase/index.html`, `vite.showcase.config.ts`, `src/showcase/{main.tsx,Showcase.tsx,session.ts,showcase.css}`, `src/lib/analysis/analyze-property.ts`, `tests/showcase.test.ts`, this report.
- Modified: `package.json` (three scripts only), `src/hooks/use-property-analysis.ts`, `src/routes/index.tsx`, `src/routes/_authenticated/dashboard.tsx`, `src/routes/_authenticated/properties/$id.index.tsx`, `src/components/property/PropertySummaryDashboard.tsx`, `src/components/property/ScenariosPanel.tsx` and M1 dispositions in the existing MVP backlog. The five presentation files receive copy-only changes.

## Preservation

Baseline matched branch `phase2-location-intelligence` and HEAD `930aa98b3355f4fe65b1fb0b4012eeaf21438ddf`: **415 tracked / 83 untracked files**, including the two roadmap documents. Raw SHA-256 capture covered all 498 files. After implementation, 490 are byte-identical; the eight intended existing-file edits are exactly those listed above, including the backlog. All four pre-existing tracked modifications and the other 82 existing untracked files remain byte-identical. No files were removed; frozen engines/configuration, fixtures, location contracts and all SQL evidence remain unchanged.

HEAD/branch are unchanged and the staged diff remains empty. No stage, commit, push, reset, rebase or merge was performed. Ignored `.mvp-m1.local/` contains preservation/check logs, not deliverable documentation. No new dependencies or migrations were introduced.

## Remaining acceptance and limitations

Before declaring full M1 acceptance, run the local browser rehearsal at desktop and narrow/mobile widths: select each preset; edit/apply rent, acquisition cost, interest and expense; verify changed values; test explicit loan amount after clearing LTV; enter an invalid value and confirm results disappear; clear rent to verify unavailable results; inspect adverse cash flow, risks and recommendation; create blank; Reset; reload. Use keyboard navigation and error links. In browser developer tools, preserve the Network log, block external origins, and verify no attempted Auth/database/provider/analytics traffic during these actions. Local static assets and development HMR are expected; production preview needs only local static assets.

The implementation is ready for that rehearsal, with offline financial correctness and bundle isolation verified. Browser execution/layout and zero attempted external browser requests remain unverified, so backlog M01/M06 closure and final M1 acceptance are pending. State is intentionally ephemeral; there is no cash-purchase mode beyond existing financing semantics, custom scenario editor, cloud saving, location evidence, export, live-market verification or beta/deployment certification.
