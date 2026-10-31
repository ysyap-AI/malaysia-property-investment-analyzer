# M3 Malaysian acquisition-cost estimator

Implemented 29 October 2026 in `.beta-real-data.local`, branch `beta/real-data-reliability`. Rule snapshot: **MY-ACQ-2026-10-29.v1**. The local checkpoint below preserves this implementation; no database changes, push or deployment.

## Delivered

The existing acquisition editor now offers **Estimate Malaysian fees**. It shows four current draft amounts alongside suggested amounts and their bases, supports selective application, and requires explicit replacement consent for populated values, including zero. Only blanks are selected initially. Manual overrides survive recalculation. Input changes recalculate suggestions, expire review/consent and flag previously applied estimates as stale. Apply changes the draft; the existing **Save acquisition costs** action persists accepted amounts. Existing rejection, uncertain-write, review and identity handling remain in place.

Pure calculations and versioned constants live in the three approved modules: `src/config/malaysian-acquisition-rules.ts`, `src/lib/finance/malaysian-acquisition-estimate.ts`, `src/lib/property/acquisition-estimate-draft.ts`. `MalaysianAcquisitionEstimator.tsx` supplies the UI within `AcquisitionCostsPanel.tsx`. Existing financial engines and scoring/scenario/risk/recommendation policies are unchanged.

## Official rules and effective periods

Sources checked on 29 October 2026. These are current planning rules, not a historical-date calculator.

| Suggestion | Confirmed rule and basis | Effective period / source |
| --- | --- | --- |
| Transfer duty | On the higher of consideration and market value: RM1/RM100 for first RM100k; RM2/RM100 for next RM400k; RM3/RM100 for next RM500k; RM4/RM100 above RM1m. Each fractional RM100 counts as a whole unit within its band. No extra minimum imposed. | Current bands effective 1 January 2019 (Finance Act 2018); [MOF Budget 2019, Appendix 9](https://www.mof.gov.my/portal/arkib/budget/2019/bs19.pdf), confirmed by [HASiL Stamp Act consolidation, item 32(a), printed pp86–87](https://www.hasil.gov.my/wp-content/uploads/20240101-akta-setem-1949-akta-378.pdf). |
| SPA legal fee | First Schedule Table A: 1.25% of first RM500k, minimum RM500; 1% of next RM7m. Above RM7.5m the excess is negotiated, so the entire suggestion is unavailable. Consideration **or** adjudicated value is at solicitor discretion under rule 1; MVP explicitly uses purchase price, not the higher-of rule for duty. | [SRO 2023, P.U.(A) 207, Malaysian Bar Circular 185/2023](https://www.malaysianbar.org.my/cms/upload_files/document/Circular%20No%20185-2023.pdf), effective 15 July 2023; First Schedule, printed pp33–35. Repeals SRO 2005, with order 9 preserving earlier commenced business. |
| Loan legal fee | Third Schedule Table A, same 1.25%/1% bands and RM500 minimum, on the amount secured/financed. Principal instrument only. Above RM7.5m unavailable because negotiation is required. | Same SRO, effective 15 July 2023; Third Schedule, printed pp38–40. |
| Loan stamp duty | Principal conventional MYR housing-loan instrument: RM5 per RM1,000 or part. Item 22(1)(a) points to charge/mortgage duty; item 27(a)(iii) supplies the rate. No additional RM10 minimum in this provision. Auxiliary instruments excluded. | [HASiL Stamp Act consolidation](https://www.hasil.gov.my/wp-content/uploads/20240101-akta-setem-1949-akta-378.pdf), printed pp80–84. Confirmed in force as at 1 January 2024 and retained in this current snapshot; this is a verified applicability date, not a claim that the rate originated in 2024. |

Relevant amendments/current checks: [Finance Act 2025, Act 874, ss25–29](https://www.hasil.gov.my/wp-content/uploads/Akta-Kewangan-2025-Akta-874.pdf) takes effect on 1 January 2026. Section 29 introduces item 32(ab) for certain foreign residential buyers; it does not replace citizen item 32(a). Those buyers are unsupported. [Bar Circular 024/2026](https://www.malaysianbar.org.my/cms/upload_files/document/Circular%20No%20024-2026.pdf), dated 20 January 2026, reiterates discounts under SRO order 6. The MVP uses full scale without discount. SRO allows up to 25% discount for the relevant Table A fees; it does not make that discount automatic.

For transfer implementing a sale under a duly stamped SPA, s12A(b) fixes market value at SPA execution. Enter the appropriate market value manually; the app does not obtain JPPH/Collector valuation. Blank market value makes duty unavailable unless the user explicitly chooses purchase price as a provisional proxy. A supplied invalid/zero market value never silently falls back to price. The actual assessment may be higher.

Stamp-duty upward units are statutory. No separate legal-fee rounding rule was found in the SRO: legal-fee totals use the existing decimal arithmetic to the nearest sen (half away from zero), an application money convention disclosed here, not an invented statutory rule. For example, RM500,000.50 produces RM6,250.01 legal fees. Purchase price must be positive; unknown, invalid and zero bases do not produce guessed fees.

## Supported cases and limitations

The user must confirm a Malaysian citizen buying alone as an individual, residential subsale in Peninsular Malaysia, issued individual/strata title. Financing must be explicitly cash or a conventional MYR housing loan. Cash explicitly suggests zero for both loan fees. A missing or zero loan never implies cash. Loan suggestions reuse `calculateFinancing`, with saved LTV taking precedence and applied to the acquisition draft price; otherwise the saved entered loan amount is used. Missing, failed, fetching or unresolved financing withholds loan suggestions. Save financing changes separately first; unsaved financing drafts are not used. A saved non-conventional loan type makes the transaction unsupported.

Unsupported cases are disclosed in the editor: non-citizens, companies, joint buyers, Sabah/Sarawak, commercial property, developer/HDA purchases, auctions, gifts/inheritance, unissued titles, Islamic/foreign-currency financing, refinancing and special loan/security structures. Historical transactions are outside this MVP. No supported-scope confirmation means no estimate.

Prominent exclusions: **SST/service tax, legal disbursements, first-home exemptions, remissions, incentives and negotiated discounts**. Valuation fees, registration, searches, consent, subsidiary loan documents and every other unmodelled cost stay manual. Blank costs remain unknown, so accepting these four estimates does not automatically complete all acquisition costs. Legal fees are full principal-instrument scale estimates, not all-inclusive bills. Actual solicitor quotations and duty assessments govern.

Only cost amounts are saved through the existing acquisition table/API. Scope, market-value assumption, rule provenance and stale markers exist in the open editor only; reopening starts a new estimation review. No durable estimate history or automatic rule updates. Stale warnings request review but do not silently change draft values or prohibit a deliberate manual save.

## Tests and outcomes

- All source tests: **69 files / 2,669 tests passed**, including **51 new estimator tests** and the existing acquisition draft/panel/API suites.
- New tests cover statutory band edges, minima, fractional upward units, decimal legal rounding, invalid/missing/zero inputs, cash, conventional financing, LTV precedence, unsupported cases, negotiated fees, manual/zero protection, stale inputs and existing save/review/uncertain-write behavior.
- Application TypeScript, targeted estimator-test TypeScript, scoped ESLint and production build pass. All **6 security checks** pass, including rebuilt browser assets. Build retains existing dependency/configuration warnings (including chunk size and module directives). Final focused rerun: **129 tests passed**.
- Focused browser runner `node tests/browser/m3-acquisition/execute.mjs`: **5 journey/check groups passed**, using the production panel with the existing synthetic in-memory acquisition transport. Covers estimate → replacement consent → draft apply → price change/staleness → manual override → save → reopen exact values, plus cash and uncertain-save handling. Desktop/390px/320px have no horizontal overflow; no page errors or external requests. This verifies application behavior, not a live Supabase write.
- Screenshots and the small browser result file are local only in ignored `.m3-acquisition.local/`. No historical browser campaign or evidence archive was created.

## Practical preview

Run from `.beta-real-data.local`:

```powershell
npx --no-install vite build --config vite.guided-acquisition-fixture.config.ts
node tests/browser/m3-acquisition/preview.mjs
```

Open **http://127.0.0.1:4189/**. This reuses the labelled synthetic acquisition fixture; records live only in memory and reload resets them. No sign-in or real database is needed. Stop with Ctrl+C. The browser journey runner starts and stops its own server on the same port; stop the manual preview before running it.

1. Click **Edit costs**, then **Estimate Malaysian fees**. Confirm the supported transaction.
2. Choose **Conventional MYR housing loan**. Enter market value **610000**, then **Calculate fee suggestions**. The fixture price is RM600,000 and its saved entered loan is RM500,000: transfer duty RM12,300, SPA RM7,250, loan legal RM6,250, loan duty RM2,500.
3. The fixture's existing SPA zero remains unchecked. Select it to see the replacement confirmation. Confirm, then **Apply selected estimates**. No save has occurred yet.
4. Use **Advanced mode** to see all cost inputs. Change purchase price to **650000** and observe stale warnings. Refresh suggestions; populated/manual amounts stay unchecked. Select and confirm any replacements deliberately.
5. Click **Save acquisition costs**. After confirmation, **Cancel** closes the draft; the saved breakdown displays accepted amounts. Reopen **Edit costs** to verify them.

In the normal application, use the same flow under an existing property's acquisition costs. Save and confirm any financing changes first. Production preview remains available through the project's usual `npm run dev` workflow; no deployment was performed.

## Local M3 checkpoint and M4 handoff — 29 October 2026

Reviewed `AGENTS.md` and `PROJECT_RULES.md`. Starting HEAD is `5e838f5ddf881ae7baeb135a6741cd09a1ea8cce`, directly following M1/M2 evidence checkpoint `feeb91ae64f60d62303a0eeb571ee9084b51ce78` and source checkpoint `89296bc582e3eb4268cacee0cf73ce5c830eca9d`; all are verified ancestors. The index was initially empty. This checkpoint is one forward-only local commit; obtain its ID with `git log -1 --format=%H -- docs/MPIA_M3_ACQUISITION_ESTIMATOR.md`.

Exactly twelve paths belong to the checkpoint:

- Source: `src/components/property/AcquisitionCostsPanel.tsx`, `src/components/property/MalaysianAcquisitionEstimator.tsx`, `src/config/malaysian-acquisition-rules.ts`, `src/lib/finance/malaysian-acquisition-estimate.ts`, `src/lib/property/acquisition-estimate-draft.ts`.
- Tests/fixture: `tests/malaysian-acquisition-estimate.test.ts`, `tests/browser/m3-acquisition/execute.mjs`, `tests/browser/m3-acquisition/preview.mjs`, `tests/browser/guided-acquisition/readiness-adapter.ts`, `tests/browser/guided-acquisition/serve.mjs`, `vite.guided-acquisition-fixture.config.ts`.
- Report: this document.

The fixture changes supply a conventional saved loan, allow the four new estimator modules, and permit three inert official-source links; existing network restrictions remain. Original financial engines, rounding, scoring, scenarios, risks, recommendations, existing policy configuration, migrations, generated database types and dependency manifests/locks are unchanged. The estimator adds its own versioned rules without changing those policies.

Fresh checkpoint verification:

| Check | Result |
| --- | --- |
| Focused estimator/acquisition/editor/API/panel/readiness/transport suites | 7 files / **156 tests passed** |
| Full offline regression: `node ../node_modules/vitest/vitest.mjs run --maxWorkers=2` | 69 files / **2,669 tests passed** |
| TypeScript, no emit or incremental output | Application, guided-acquisition fixture and estimator test passed |
| Scoped ESLint; syntax checks on both M3 browser scripts | Passed |
| `npm run build` | Passed; existing dependency/configuration/chunk warnings remain |
| `node --test tests/security.test.mjs`, browser root `.output/public` | **6 passed; zero skips** |

The initial unrestricted offline run, concurrent with TypeScript, hit four 5-second timeouts in three files. The complete rerun with two workers passed without changing assertions, timeouts or source. Build-generated route changes were line endings only; original raw bytes were restored. New check logs/configuration stay ignored in `.m3-checkpoint.local/`. The browser results above are retained implementation evidence, not a newly executed browser campaign; no historical browser campaigns or archival procedures were rerun.

The primary Lovable-linked worktree remains on `phase2-location-intelligence` at `b23e753a7d34da2cedf792fe841bc6e69ec04b20`. Its dirty status and SHA-256 identities of existing modified/untracked files were captured for comparison; its index is also checked unchanged before completion. Original M1/M2 evidence, excluded generators, ignored evidence/tooling and historical Git objects remain in place. No push, merge, rebase, deployment or Lovable synchronization is part of this checkpoint.

### Minimum M4 work

1. **Establish one working development database journey.** Confirm the intended Supabase Auth/project/schema and applied migrations using synthetic records and two test accounts. Existing source has ownership RLS, unique child `property_id` and cascading deletion; deployed enforcement has not been verified here. Prove anonymous and other-user reads/writes/deletes fail at the database.
2. **Keep saving and loading explicit.** Reuse current draft preservation, identity fences, no automatic write retry, uncertain-outcome review and fresh-read confirmation. Validate acquisition reads and returned submitted values consistently with financing/expenses. After confirmed saves, refresh list/detail/analysis views; prove hard reload and sign-out/sign-in return exact saved values, including blanks and zeros. Preserve the separate property target price and acquisition purchase price with their existing explicit calculation bases.
3. **Close the database concurrency gap.** Parent edits/deletes currently compare `updated_at` only. Financial APIs reread existence and then update by row ID without an editor-baseline revision, allowing a stale page to overwrite newer amounts. Introduce a small database-owned revision contract captured with the originally loaded data; perform conditional writes and deletion atomically against that expectation. A shared property revision, advanced transactionally by parent and child writes, is one compact solution that also prevents stale deletion after financial changes. Never attach a freshly read revision to an old draft; conflicts preserve the draft and require reload/review. Preserve unique-child handling for concurrent first saves and ensure a child save racing deletion cannot recreate an orphan.
4. **Prove one persistent end-to-end journey.** Sign in, create property, save acquisition/financing/expenses, navigate list/detail/edit and analysis, hard reload, sign out/in, reopen exact values, then delete the test property and confirm child removal. Add focused two-page stale edit/delete and simultaneous child-create checks, plus identity-switch/other-user denial and response-loss review. Keep financial formulas and existing missing-data gating frozen.

No M3 code blocker prevents starting M4. Persistent end-to-end acceptance requires an identified accessible development Supabase target, two test identities, and confirmed schema/RLS; these were not exercised by this local checkpoint. M4 needs the bounded concurrency migration/API work above. It does not need location activation, a queue, event sourcing, generic synchronization infrastructure or archival redesign. M4 implementation and database changes are not included here.
