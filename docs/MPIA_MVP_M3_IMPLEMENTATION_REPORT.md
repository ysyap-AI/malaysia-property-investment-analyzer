# MPIA MVP M3 implementation

23 October 2026 · Asia/Kuala_Lumpur · MVP-M3-IMPLEMENT-01

**M3 implementation and offline verification delivered. Browser/print acceptance: NOT TESTED.** The complete synthetic showcase is ready for the owner's final rehearsal; it is not yet fully browser/print accepted. M1 is accepted at the owner-observed showcase level, as supplied by the owner with this task. M2 implementation/offline tests passed; M2 browser acceptance remains pending owner confirmation. Historical M1/M2 reports are preserved; the living backlog records these current distinctions.

## Customer-visible result

- A direct workspace link opens the draft investment assessment: property/address, financial KPIs, unchanged financial recommendation and reasons, financial score and category contributions, scoring-band explanations of strengths/weaknesses, confidence factors, critical/other risks, missing inputs and unchecked rules.
- Default Base/Bull/Bear results and assumptions remain explicit. Unavailable results/contributions stay unavailable; explicit zero and negative results remain distinct. No formulas, thresholds, recommendation rules or score weights changed.
- Separate **Location Observations** include acknowledged fictional origin/version, attributed examples, supplied straight-line metres or missing distances, preparation/as-of dates, source/fixture/item identities, coverage bounds and limitations. Complete, partial, stale, unavailable, error, loading, known-empty, unmatched and unacknowledged states remain distinct. Synthetic observations do not establish real Malaysian market conditions or verified nearby amenities.
- Due-diligence items quote actual missing information, triggered risks, unchecked checks and financial evidence explanations, plus explicit fictional-location and synthetic-input limitations. No AI service, future-appreciation claims or independent investment conclusions.
- **Present / Print** captures the applied inputs, already-computed shared outputs, applicable location state, default assumptions and available source/config identifiers into memory, then opens native print preview. The capture shows its ISO timestamp and Kuala Lumpur time. Refresh explicitly replaces it; Close returns to the live assessment. Reload clears everything.
- Every immutable session change invalidates an existing capture, including drafts, invalid edits, Apply, evidence selection, origin acknowledgement/restoration, Reset and sample selection, even reselection of the same sample. Old report content is withheld, the capture is labelled out of date and printing is blocked until valid inputs are applied and the capture refreshed. Edited locations cannot leave prior findings visible as applicable.
- One report component renders captured screen and print content. Scoped A4 print CSS hides the editor/live report/controls, wraps long text, repeats scenario headers and avoids splitting individual risks/input entries. Browser-menu printing without a valid capture produces a synthetic-labelled blocker. Actual page flow and clipping remain unverified.

## Files changed

New: `src/showcase/assessment.ts`, `src/showcase/AssessmentPanel.tsx`, `tests/showcase-assessment.test.ts`, this report.

Existing edits: `src/showcase/Showcase.tsx` (assessment integration/link/M3 label), `src/showcase/showcase.css` (responsive assessment and print styling), `docs/MPIA_MVP_SCOPE_AND_POST_MVP_BACKLOG.md` (current acceptance distinctions and M3 evidence). No other existing file changed from task entry.

## Run the complete showcase

From the repository root, with existing installed dependencies:

```powershell
npm run build:showcase
npm run preview:showcase -- --port 4176
```

Open **http://127.0.0.1:4176/showcase/**. The default port without the override is 4174. For editing, `npm run dev:showcase` serves the same `/showcase/` path on 4174. Use an available port; do not stop an unrelated existing listener. Both surfaces bind to loopback. Synthetic sessions are ephemeral and presenter-controlled; Apply means session application, never cloud saving.

## Actual verification

| Check | Result |
| --- | --- |
| Complete application offline suite: `npx --no-install vitest run` | **47 files passed; 2,062 tests passed, 4 existing TODOs; zero failures** |
| New focused `tests/showcase-assessment.test.ts` (included above) | **58 passed**: unchanged explanations and all five recommendation categories from actual engine outputs; unavailable/zero/negative/critical cases; location states/separation; grounded checklist; clone/capture/refresh; invalidation; identical report rendering; disclosures; side-effect traps and offline rehearsal |
| Existing Phase 1 and M1/M2 suites (included above) | All pass; P01–P10, shared-coordinator parity, financial/scenario/scoring/confidence/risk/recommendation behavior and 43 M1 / 56 M2 tests retained |
| `npx --no-install tsc --noEmit` | Pass |
| `npx --no-install tsc vite.showcase.config.ts --moduleResolution bundler --module esnext --target es2022 --skipLibCheck --noEmit` | Pass |
| ESLint on new/changed showcase TypeScript and M3 tests | Pass, zero warnings |
| `npm run build` | Pass; rebuilt normal browser assets in `.output/public/` |
| `npm run build:showcase` | Pass; `dist/showcase/`; actual build isolation guard reports **79 reachable modules**, excluding Auth/Supabase/APIs/dormant location/analytics modules |
| `npm run test:security`, `SECURITY_AUDIT_BROWSER_ROOT=.output/public` | **6 passed, zero skipped**, rebuilt normal assets scanned |
| Same check, `SECURITY_AUDIT_BROWSER_ROOT=dist/showcase` | **6 passed, zero skipped**, rebuilt showcase assets scanned |
| Production loopback HTTP smoke on 4176 | `/showcase/` and its referenced JS/CSS each **HTTP 200**; temporary preview stopped |
| Actual browser interaction, keyboard, responsive layout, network trace and print preview | **NOT TESTED**: approved CUA inventory had no browsers; IAB attempt returned `Browser is not available: iab` |

Normal build retains warnings about large chunks, ignored `inlineDynamicImports` and module directives; no build failed. All checks used existing dependencies. No SQL/database qualification campaign or external service was run.

Financial/location separation is structural: the shared coordinator receives only applied financial/property inputs; the assessment receives its existing output and the independent M2 evidence result. Tests compare the full financial output across every evidence scenario. Recommendation labels/reasons and contributions are displayed directly; the report renderer never calls a calculation engine. The snapshot deep-clones the supplied output rather than recalculating it. Capture expiry follows immutable session identity, so returning to identical text cannot silently revive old evidence. The same report model and renderer produce captured screen and print content.

Network/storage/geolocation/beacon APIs were trapped during offline session/capture/render/state/rehearsal checks with zero calls. Existing recursive source isolation and the rebuilt-module guard also pass. This supports absence of Auth/database/provider/analytics imports and writes; it is not a browser network trace or live database-security qualification.

## Final demonstration rehearsal

| Journey step | Actual M3 evidence |
| --- | --- |
| 1. Open synthetic showcase | Offline component rendering plus production HTTP 200; no actual browser |
| 2. Select A/B/C or create blank | Existing session tests and new offline rehearsal |
| 3. Edit and Apply financial assumptions | Offline valid/invalid/draft tests and rehearsal |
| 4. Review KPIs and default scenarios | Engine comparisons and report rendering |
| 5. Acknowledge fictional location origin | M2 binding tests and M3 rehearsal |
| 6. Explore examples, attribution and limitations | Existing M2 filter/detail tests and new report-state tests |
| 7. Review recommendation and explanation | Actual outputs for all five existing categories, reasons and contributions |
| 8. Inspect risks, confidence and due diligence | Adverse/incomplete/blank cases and grounded-item assertions |
| 9. Open presentation and print preview | Capture/report/refresh/stale-blocking and native-print callback tested offline; actual preview NOT TESTED |

No journey step was exercised in an actual browser during M3. The owner's earlier M1 browser verification is accepted testimony, not a newly observed M3 rehearsal.

Manual acceptance: run the showcase above at desktop and about 390 px widths, using keyboard navigation and a preserved Network log with external origins blocked. Repeat the nine steps for A (favorable assumptions), B (negative returns/critical risks), C (missing data) and blank. For A, change rent and Apply, acknowledge origin, filter the four amenity categories and inspect source details, then follow **Review draft assessment & presentation** and use **Present / Print**. Inspect A4 and normal desktop print preview for the same values, all warnings, missing states, scenario headings, source dates and readable page breaks. Cancel preview; the captured report remains available on screen. Repeat print for B/C. Synthetic labels must survive with background printing off.

After a capture, independently edit financial assumptions and each of the seven location fields. Before Apply, old report findings must disappear and printing must be disabled; invalid inputs must prevent refresh. Apply valid changes and explicitly Refresh; address changes must show no matching evidence. Restore/acknowledge again, exercise partial/stale/error/loading/unavailable/empty evidence, and confirm every evidence change expires the capture. Reset, switch samples, reselect the same sample and reload; verify expiry/reset and absence of old findings. No attempted Auth/database/provider/analytics traffic is expected; local static assets are expected. M2 acceptance still requires owner confirmation after that browser rehearsal.

## Preservation and readiness

Entry and final branch: `phase2-location-intelligence`; HEAD: `930aa98b3355f4fe65b1fb0b4012eeaf21438ddf`; staged diff empty. Raw SHA-256 comparison covered **511 existing tracked/untracked files**: **508 byte-identical**, with exactly the three intended existing-file edits listed above; no existing file removed. All eleven pre-existing tracked modifications remain byte-identical to entry. Frozen Phase 1 engines/configs/fixtures, shared coordinator, canonical contracts, SQL drafts and historical reports are preserved. Baseline and check logs reside in ignored `.mvp-m3.local/`.

No Git stage, commit, push, reset, rebase or merge; no new dependency, migration, Auth integration, cloud save, external storage, live provider, Location Score, Option D activation or deployment. Available config versions and source paths identify the report's rules; no standalone financial-engine semantic version is invented. Session captures are not durable historical replay records.

**M3 verdict:** working implementation and offline verification complete; browser/print acceptance pending. **Overall showcase verdict:** all three customer-facing milestones implemented; M1 owner-observed accepted; ready for the final controlled rehearsal, with M2 browser confirmation and M3 browser/print acceptance still outstanding. This is a synthetic presentation, not a real-data beta or market-qualified investment assessment.
