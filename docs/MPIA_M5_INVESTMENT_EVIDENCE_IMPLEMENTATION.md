# M5 Investment Evidence & Assumptions - implementation

30 October 2026, Asia/Kuala_Lumpur. Worktree: `.beta-real-data.local`; branch: `beta/real-data-reliability`. Before implementation, confirmed that `edca0b862378f20f55bb92b1117d02eeb60846fd` is an ancestor of HEAD; read `AGENTS.md`, `PROJECT_RULES.md` and the approved M5 handoff.

**GO for essential local M5 MVP acceptance.** The focused Google Chrome evidence save/navigation/full-document reload/reopen journey passed on 30 October 2026 after the existing disposable Docker/Supabase services were started. Additional browser journeys remain outside the verified scope below.

## 1. Features implemented

- Four origins: user assumption, system estimate, external observation and actual checked by the user. Actual records explicitly disclaim independent MPIA authentication.
- Strict, versioned `EvidenceEntry` / `SectionEvidence` parsing: fixed section keys, bounded text, valid nonfuture calendar dates, HTTP/HTTPS URLs, attestation requirements, numeric ranges and estimate-context/fingerprint consistency.
- All 38 approved inputs: five property fields, 14 acquisition costs, five financing inputs and 14 annual operating expenses. NULL and explicit zero stay distinct. Legacy populated inputs without metadata say **Evidence not recorded**.
- Exact value binding; changed values, missing sources, malformed data and older observations produce display-only reminders. Defaults: 90 days for market/financial quotations, 365 for recurring expenses. Historical acquisition actuals do not age out. No saved amount is altered by reminders.

## 2. Data model and migration

One additive migration: `supabase/migrations/20261030000000_m5_investment_evidence.sql`.

It adds nullable `evidence_metadata jsonb` to `properties`, `acquisition_costs`, `financing` and `operating_expenses`; no tables, backfill or history infrastructure. Database CHECK validation also protects maintenance writes. M4's fixed RPC allowlists now accept metadata, retaining the ownership lock, shared revision, conflict detection, revoked direct-write bypasses and existing cascades. Evidence-only child creation is rejected.

The metadata-only API sends exactly `{ evidence_metadata }`, checks identity and the original revision, and verifies that the acknowledgment preserved amounts and assessment declarations. Combined section saves send values and evidence in one RPC. JSON acknowledgment uses structural equality. Row types support nullable evidence and legacy projections without the new column.

Applied only to `supabase_db_mpia-m4-disposable-20261029` / `http://127.0.0.1:57421`. Final local validator and RPC bodies were compared to the final migration source and match. **No remote migration or deployment.**

## 3. UI changes and main files

- `EvidenceFields.tsx`: reusable expandable editor, read-only bound amounts, source type/label/link/notes/dates, safe text rendering and compact evidence statuses beside values. Other inputs are collapsed initially.
- `SourcesAndAssumptions.tsx`: deliberate evidence-only open/save, coherent M4 snapshot baseline, fresh confirmation read, saved-source review and retained conflict/uncertain drafts. Missing sections direct the user to save financial inputs first.
- Property form and all three financial panels: evidence drafts participate in the existing value-save transaction; combined actions say **Save values and evidence**. Add a source to the draft explicitly before the combined save.
- `EvidenceSummary.tsx` and the property route: saved-only Summary card, important inputs, review counts and links to relevant tabs. Saved overview, Scores and Risk link/disclose supporting inputs without changing their rules.
- `use-investment-evidence.ts`: reuses saved-read keys without invoking calculations. `use-property-analysis.ts` explicitly strips evidence metadata before calling `analyzeProperty`.
- `investment-evidence.ts`, `evidence-draft-values.ts`, `evidence-api.ts`: model, reminders, canonical annual bindings, provenance context and persistence boundary. Existing financial APIs/controllers and the property PATCH validator were extended in place.

Legacy rent/bank-quote controls remain deliberate recorded assessment declarations. A written quote is described as an observation, not an actual payment. Evidence does not modify the declaration values or assessment policies.

## 4. M3 provenance

Explicit estimator application captures the existing rules version, exact input fingerprint and original M3 assumptions, including the separate market-value/proxy choice. Provenance is bound to the applied amount and is written only with the acquisition save. Reload restores recorded provenance and the estimator's applied context. Changed price, financing, rules or unavailable dependencies prompt review. A manually replaced amount displays a user-assumption/value-change warning while preserving the prior source as outdated context.

M3 formulas, statutory rates, Financial Core Engine A, scenarios, score/confidence configurations, red flags and recommendations were not changed.

## 5. Database and browser verification

`node tests/m5-local-database.integration.mjs` passed against the named disposable environment using synthetic Auth identities:

- Nullable legacy reads, absent-child evidence rejection, all four section saves and reloads.
- Evidence-only saves preserve financial values, declarations and explicit zero; exactly one revision advances.
- Invalid metadata and maintenance CHECK rejection; atomic combined-save rollback.
- M3 context round trip, fingerprint validation and historical value binding.
- Competing evidence/value saves: one success, one stale conflict; stale deletion rejected.
- Cross-owner/anonymous denial, SELECT isolation, direct-write denial, fresh password sign-in/reload and child cascades.

**Chrome follow-up: focused persistence journey passed.** Used the actual application at `http://127.0.0.1:4184`, the existing synthetic local account and property `M4 Browser Persistence 20261030-01` (`21399eb4-0aaa-49d3-a79c-e2943e69459b`). No remote Supabase project was changed.

| Browser check | Observed result |
| --- | --- |
| Local account sign-in | Passed after the disposable Docker/Supabase services were healthy |
| Enter expected-rent source | External observation; label `M5 Chrome local rent observation`; URL `https://example.test/m5-chrome-rent`; observation date `2026-10-30`; synthetic advertised-rent note |
| Evidence-only save | UI acknowledged "Evidence saved and reloaded"; rent stayed RM2,200 |
| Navigate away | Opened Dashboard |
| Full-document reload | Chrome Ctrl+R on Dashboard, then reopened the property |
| Reopen and verify | Summary and Details showed External observation, the saved label/date and unchanged RM2,200 rent |
| Saved database corroboration | Fresh authenticated local snapshot matched label, URL, note, origin, bound value and date; all four sections' financial values and assessment declarations were unchanged; revision advanced exactly once, 4 -> 5 |
| Visual review | Source form, read-only amount, validation context, Save evidence action and saved Summary were inspected in the Chrome window; no responsive-device matrix is claimed |

The focused journey is complete. A subsequent attempt to inspect the expanded source record was stopped by the computer-use guard: "Computer Use has been stopped for this turn because it could not determine the current browser URL on Windows with enough confidence to enforce policy." No further browser input was attempted. Browser sign-out/sign-in, explicit cache-bypass refresh, other financial-section browser journeys and M3 browser save/reload remain unverified. M3 provenance retains its completed model/API/database qualification; these broader checks are not inferred from the rent journey.

The earlier unavailable browser connector and Firefox limitation did not prevent the successful Chrome journey above. Local before/after snapshots contain synthetic data only and remain in ignored `.m5.local`; credentials were neither added to the report nor saved to Chrome.


## 6. Tests and results

| Check | Result |
| --- | --- |
| Full offline Vitest suite | 75 files / 2,809 tests passed |
| Final focused evidence/property regressions after address/quotation refinements | 5 files / 93 passed; includes 60 new M5 tests |
| Application TypeScript and focused test TypeScript | Passed |
| ESLint on all new source modules | Passed, no warnings |
| Production build | Passed; dependency directive, tsconfig-path and bundle-size warnings |
| Security scan, including `.output/public` | Passed: six checks, zero skipped |
| Final local database integration | Passed; final function bodies match migration |
| Focused Google Chrome persistence journey | Passed: source entry/save, navigate, document reload, reopen, saved source and unchanged amount |

Tests cover all origins, URL/date/shape validation, NULL/zero, exact binding, JSON reload, metadata-only payloads, combined saves, conflicts/uncertain drafts, identity disposal, M3 provenance and reminders. Frozen-result comparison confirms unchanged financial/scenario results, investment score, confidence, red flags and recommendations after metadata-only changes.

An initial full run exposed a direct-call panel harness incompatibility from an unnecessary analysis hook; the panel now uses its normal saved-financing query. One showcase-router test also hit the existing five-second timeout under parallel load. The complete rerun passed with two workers and a 20-second test timeout; no assertions were removed. Final small refinements were checked with the focused regressions above.

## 7. MVP limits

One current source per input; no attachments, scraping, independent authentication or history. Dates are review reminders, not expiry rules. Unknown/malformed metadata is preserved and shown as unavailable; automatic destructive repair is not offered. Drafts live in the current editor and are discarded by leaving/reloading the page; conflicts and uncertain saves retain them while that editor remains open. An uncertain save is not automatically retried or declared successful from matching data.

No Git staging, commit, push or Lovable synchronization was performed. The primary worktree's pre-existing changes were retained. Existing beta untracked artifacts and the initially modified generated route file were preserved.

## 8. Browser preview and acceptance

From `.beta-real-data.local`, start the existing local-only preview configuration (uses the disposable database, not remote Supabase):

```powershell
..\node_modules\.bin\vite.cmd dev --config .m4-integration.local/vite.config.ts --host 127.0.0.1 --port 4184
```

Open `http://127.0.0.1:4184`. Use a disposable local account; the existing synthetic account details remain only in the ignored `.m4-integration.local/browser-synthetic-user.json`. Do not use production credentials for this preview.

Open a synthetic saved property -> Details -> Sources & assumptions -> Review / edit sources -> Record or edit a source. Choose expected rent; enter an external observation, source label, `https://example.test/m5`, notes and today's observation date. Select **Save evidence**. Navigate away, reload the document, reopen the property and verify the source and unchanged amount. Repeat a combined acquisition value/evidence save and confirm any applied M3 source survives reload. Sign out/sign in if checking identity disposal.

**Decision: GO for essential local M5 MVP acceptance.** The required focused Chrome persistence journey and visual inspection now pass, alongside the existing model/API/database, regression, TypeScript, build and security checks. This is bounded local acceptance; the additional browser checks listed in section 5 and remote/production qualification are not claimed. No source changes, migrations, staging, commits, push or deployment were needed for this Chrome follow-up. Local preview HTTP returned 200 at the URL above.


## 9. M5 local checkpoint verification

30 October 2026, Asia/Kuala_Lumpur. Reviewed the exact M5 implementation, nullable-column migration, maintained tests and final acceptance report above. Verified HEAD is M4 `edca0b862378f20f55bb92b1117d02eeb60846fd`, descended from M3 `68e002d7f0211b21fbd299e2990a62298d7d9d2a`; M1/M2 ancestry is retained. The checkpoint is one forward-only local commit on `beta/real-data-reliability`.

Fresh checks: focused evidence/property edit/delete Vitest **5 files / 147 passed**; full Vitest with one worker and unchanged timeouts **75 files / 2,809 passed**; application TypeScript and focused M5 test TypeScript **passed**; production build **passed** with existing dependency/configuration/chunk warnings; security against source and `.output/public` **6 passed, zero skipped**; diff whitespace check **passed** after two line-ending-only corrections. No calculation or test assertions were changed.

Exact diff comparison to M4 found no changes in `src/lib/finance`, `src/lib/analysis`, `src/lib/scenarios`, `src/lib/scoring`, `src/lib/risk`, `src/lib/recommendations` or `src/config`. M5 metadata is stripped at the production analysis boundary; the M5 regression also compares analytical results before/after metadata-only edits.

Local database and focused Chrome persistence acceptance in section 5 were reviewed, not rerun for this lightweight checkpoint. Their stated limits remain. The primary Lovable-linked worktree retains its pre-existing branch/HEAD, index and file changes; status, tracked diff and existing untracked-file hashes were checked against the task baseline. No push, merge, rebase, deployment, remote migration or Lovable synchronization.

Only the following **35 files** belong to this checkpoint. Generated route output, local settings/credentials, screenshots, caches, test output and unrelated earlier artifacts are excluded. The commit containing this section is the M5 checkpoint; resolve it with `git log -1 --format=%H -- docs/MPIA_M5_INVESTMENT_EVIDENCE_IMPLEMENTATION.md`. Its exact hash is recorded in the separate M6 architecture deliverable.

```text
docs/MPIA_M5_INVESTMENT_EVIDENCE_IMPLEMENTATION.md
src/components/property/AcquisitionCostsPanel.tsx
src/components/property/EvidenceFields.tsx
src/components/property/EvidenceSummary.tsx
src/components/property/FinancingPanel.tsx
src/components/property/MalaysianAcquisitionEstimator.tsx
src/components/property/OperatingExpensesPanel.tsx
src/components/property/PropertyEditSession.tsx
src/components/property/PropertyForm.tsx
src/components/property/PropertySummaryDashboard.tsx
src/components/property/SavedAnalysisOverview.tsx
src/components/property/SourcesAndAssumptions.tsx
src/hooks/use-investment-evidence.ts
src/hooks/use-property-analysis.ts
src/hooks/use-saved-draft-disclosure.ts
src/integrations/supabase/types.ts
src/lib/property/acquisition-api.ts
src/lib/property/acquisition-editor.ts
src/lib/property/evidence-api.ts
src/lib/property/evidence-draft-values.ts
src/lib/property/financial-confirmation.ts
src/lib/property/financing-api.ts
src/lib/property/financing-editor.ts
src/lib/property/investment-evidence.ts
src/lib/property/operating-expenses-api.ts
src/lib/property/operating-expenses-editor.ts
src/lib/property/property-api.ts
src/lib/property/property-fields.ts
src/lib/property/property-save-validation.ts
src/routes/_authenticated/properties/$id.index.tsx
supabase/migrations/20261030000000_m5_investment_evidence.sql
tests/evidence-save.test.ts
tests/evidence-ui.test.ts
tests/investment-evidence.test.ts
tests/m5-local-database.integration.mjs
```
