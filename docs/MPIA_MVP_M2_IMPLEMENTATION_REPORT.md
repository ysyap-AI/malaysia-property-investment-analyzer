# MPIA MVP M2 implementation

23 October 2026 · Asia/Kuala_Lumpur · MVP-M2-IMPLEMENT-01

**M2 source and focused offline verification delivered; browser qualification NOT TESTED.** M1's final browser acceptance remains pending. M3 is not implemented. This is a wholly synthetic, session-only research demonstration, not real market intelligence.

## Delivered behaviour

- Three fictional addresses with versioned, invented local-grid origins; no geographic coordinates or geocoding. “Use this sample origin” explicitly acknowledges the supplied origin in memory only.
- Transport, convenience, education and healthcare examples, accessible pressed-state category buttons, expandable evidence details and responsive styling using existing MPIA components.
- Each evidence set binds to sample identity, origin version and exact project name/address/city/district/state/postcode/country strings. Null, undefined, empty, spacing and case remain distinct. Any deliberate location-field edit immediately clears acknowledgement and hides old findings, before Apply. Arbitrary/blank addresses have unavailable evidence and no substituted origin.
- Restore sample location inputs preserves financial drafts but requires acknowledgement again; switching samples/reset also clears acknowledgement. Financial-only edits retain applicable evidence, including during M1's existing draft/validation gate.
- Selectable complete, partial, stale, loading, unavailable, error and successful known-empty examples. Loading is deliberately simulated until another example is selected; no asynchronous provider request is implied. Filtered-empty, known-empty and unsuccessful states have different wording. Missing distances remain unavailable, never zero.
- Per-item source/version, authored/as-of dates, fictional identity, straight-line metres, measurement method and coverage. Dates describe fixture preparation, never provider retrieval. Boundary: 1,500 m; maximum six supplied examples. Partial coverage omits education/healthcare and one distance. Counts describe the bounded fixture; real coverage and conditions remain unknown.
- Persistent synthetic disclosure plus location limits: no travel-time conversion, service/quality/market/rental-demand inference, official assessment or Location Score. Location never enters financial calculation, scoring, confidence, flags or recommendation inputs.

## Exact verification outcomes

All commands used installed dependencies; no database runners or external providers were used.

| Check | Outcome |
| --- | --- |
| `npx --no-install vitest run` | **46 files passed; 2,004 passed, 4 existing TODOs; zero failures** |
| New `tests/showcase-location.test.ts`, included above | **56 passed**: origin selection, all seven immediate invalidation paths, exact-value distinctions, identity/version mismatch, switching/restoration/reset, financial-only edits, all evidence states/recovery, filters/details/provenance/units, side-effect traps and financial independence |
| Existing M1 showcase and accepted financial regressions, included above | **43 M1 tests pass**; unchanged P01–P10 fixtures and financial/scenario/scoring/confidence/risk/recommendation regressions pass |
| `npx --no-install tsc --noEmit` | Pass |
| Showcase config TypeScript (`tsc vite.showcase.config.ts --moduleResolution bundler --module esnext --target es2022 --skipLibCheck --noEmit`) | Pass |
| ESLint on `src/showcase/*.ts`, `src/showcase/*.tsx`, new test | Pass |
| `npm run build` | Pass; browser assets rebuilt in `.output/public/` |
| `npm run build:showcase` | Pass; `dist/showcase/`; build isolation checks **77 reachable modules**, excluding Auth/Supabase/APIs/dormant `src/lib/location`/analytics |
| `npm run test:security`, `SECURITY_AUDIT_BROWSER_ROOT=.output/public` | **6 passed, zero skipped**, rebuilt normal assets scanned |
| Same security check, `SECURITY_AUDIT_BROWSER_ROOT=dist/showcase` | **6 passed, zero skipped**, rebuilt showcase assets scanned |
| Production HTTP smoke on loopback port 4175 | `/showcase/`, referenced JS and CSS each **HTTP 200**; temporary preview stopped |
| Actual browser interaction, keyboard, responsive layout and browser network trace | **NOT TESTED**: browser inventory empty; attempting IAB returned `Browser is not available: iab`. HTTP/SSR tests are not browser evidence |

The full financial output objects are equal across every location state for each preset. An applied arbitrary-address edit changes only echoed property metadata; all engine outputs remain equal. M1 still withholds current financial results while any assumptions are unapplied or invalid. Network, storage, geolocation and beacon APIs were trapped during session/render/filter/state/reset checks: zero calls. Existing recursive source-graph and rebuilt-module guards include the new imports; they do not prove a browser network trace.

Normal build warnings remain about tsconfig-paths, large chunks, ignored inlineDynamicImports and module directives. Neither build failed. Default port 4174 was already occupied; the smoke test used 4175 without stopping the existing listener.

## Browser acceptance steps still required

Run `npm run build:showcase`, then `npm run preview:showcase -- --port 4175`; open **http://127.0.0.1:4175/showcase/**. Use desktop and approximately 390 px widths, keyboard navigation and a preserved Network log with external origins blocked.

1. Select A; verify synthetic labels and address; acknowledge the origin. Filter all four categories and open each evidence detail. Check readable distances, dates, source and coverage without clipping or horizontal page overflow.
2. Change each of the seven location fields independently, including project name. Before Apply, findings must disappear with “No matching sample evidence.” Restore/reselect and explicitly acknowledge again; manually returning the original text must not silently restore acknowledgement. Arbitrary addresses and a blank sample must have no invented origin.
3. Change/apply rent, costs, financing and expenses. Matching location evidence must stay applicable; financial results must follow the existing engines. Invalid financial inputs must withhold financial results while leaving matching location evidence available.
4. Exercise every Evidence example. Partial coverage must disclose missing categories/distance; a healthcare filter must explain its empty list. Stale dates stay historical. Loading/error/unavailable must not show a successful count. Known-empty must disclose bounded synthetic coverage and avoid real-world absence claims. Return to complete.
5. Switch A/B/C, reset and reload; check acknowledgements clear and old-property findings disappear. Repeat M1's complete/adverse/incomplete/blank financial rehearsal from its report. Verify zero attempted Auth/database/provider/analytics traffic throughout; local static assets are expected.

## Preservation and remaining scope

Entry branch `phase2-location-intelligence`, HEAD `930aa98b3355f4fe65b1fb0b4012eeaf21438ddf`. Raw SHA-256 baseline covered **507 existing tracked/untracked files**. Final comparison: **503 byte-identical**; only the intended existing `src/showcase/Showcase.tsx`, `session.ts`, `showcase.css` and living MVP backlog changed. No existing file was removed; the Git index, branch and HEAD are unchanged. Existing tracked modifications, accepted financial fixtures, engines/configuration, canonical contracts, migration drafts and M1 report are preserved. Check logs/manifests are in ignored `.mvp-m2.local/`.

New files: `src/showcase/location-fixtures.ts`, `src/showcase/LocationPanel.tsx`, `tests/showcase-location.test.ts` and this report. No new dependencies, database connections/migrations, authoritative writes, Option D activation, deployment or Git commit/push/reset/merge occurred. No map or live location capability is provided. Staleness and coverage are deterministic fixture scenarios, not live freshness/coverage assessments.

**Remaining M3 dependencies:** qualify M1/M2 in an actual browser; consume existing financial reasons/contributions/confidence/risks/missing information and separately attributed location observations in a labelled draft assessment; capture current inputs/outputs/config identifiers/origin version in memory with out-of-date/refresh handling; implement scoped presentation/print rendering and verify screen/print parity plus the complete nine-step rehearsal. Those are future work; no AI/provider/database service is needed. The [living backlog](MPIA_MVP_SCOPE_AND_POST_MVP_BACKLOG.md) records M03 implementation with browser acceptance pending and leaves M04/M05 open.
