# M6 independent investment strategies — final implementation and acceptance

31 October 2026 (Asia/Kuala_Lumpur). Worktree `.beta-real-data.local`; branch `beta/real-data-reliability`. Supersedes the earlier pending-browser decision. M5 baseline: `e4b8cc3d6ee12ee5a28f161368f7b7f73e62e3e8`.

**GO for the essential local M6 checkpoint.** The owner has accepted the three remaining essential browser checks. These are OWNER-VERIFIED, not Codex-automated browser verification. This is bounded local acceptance, not production deployment qualification.

## Implementation and preserved boundaries

- The Strategies tab provides independent Keep, Flip and Hybrid assumptions, sources, investor targets, preference, results and monthly breakdowns. Preference highlights a card without selecting a winner.
- Saved, coherent property revisions drive calculations. Draft edits are excluded. Conflicts, failed fresh reads and uncertain saves retain drafts and withhold current results. Identity changes dispose drafts. Unsaved drafts do not survive leaving/reloading the editor.
- New deterministic strategy modules reuse existing acquisition totals, expenses, financing/payment selection, returns and rounding. No formulas were added to React components.
- Engine A's existing files, M3 estimator/rules, M5 production evidence contract, scenarios, scoring, risk/red flags, confidence, recommendations and historical migrations remain unchanged from M5. The analysis hook strips strategy metadata before the legacy engines. Maintained tests also compare legacy analytical outputs with/without a strategy plan.
- The only existing M5 test adjustment fixes a historical assessment-date fixture; production evidence rules and financial assertions are unchanged. Checkpoint cleanup formats two M6 type declarations only.

## Calculation conventions and limits

All 14 acquisition and 14 annual operating-expense lines must be known for complete lifecycle/equity results. Unknown is not zero; deliberate zero amounts are valid. Keep's independent partial metrics retain their actual dependencies.

Acquisition includes renovation/contingency once, funded upfront. Loans finance only the explicit acquisition purchase price, with existing LTV/payment precedence. Initial investor cash = acquisition total minus loan. Monthly amortisation includes principal and interest once, caps payoff and deducts only remaining principal at exit. Unsupported financing schedules remain unavailable.

Keep has no assumed sale, terminal value, total-investment ROI or IRR. Flip has no rental dependency. Hybrid builds its own rent-plus-sale stream after an explicit non-rental lead-in. Flat annual rent/expenses are allocated in cents over twelve-month cycles; debt and expenses continue while vacant. Horizons are 1–120 months.

Final-settled sale proceeds = entered resale minus itemised exit costs, entered disposal tax and remaining debt, plus identified refundable acquisition deposits. Tenant deposits are excluded. Unknown disposal tax permits labelled BEFORE-disposal-tax projections while withholding after-tax proceeds/suitability. Zero disposal amounts require acknowledgment. Settlement timing must be confirmed for IRR; completion-day liquidity is not calculated.

Profit sums the investor cash-flow stream. Funded cash includes initial equity and subsequent negative monthly flows; positive flows are distributions. Equity ROI uses funded cash, not just the down payment. Monthly netting is not a daily peak-funding estimate. IRR requires a supported unique negative-to-positive stream and convergence.

No automatic appreciation, rent growth, renovation uplift, RPGT classification, income-tax classification, valuation, scraping, refinancing, variable/Islamic/offset/interest-only schedules or guaranteed returns. Rental results are before personal income tax.

Suitability evaluates missing/unsupported inputs, current value-bound evidence and the investor's own targets. It does not change legacy recommendations or declare a universal winner. Planning assumptions are not independently authenticated evidence. Each nonzero selling-cost line has its own evidence binding.

## Additive migration and save boundary

`supabase/migrations/20261030010000_m6_investment_strategies.sql` adds nullable `properties.investment_strategy_assumptions jsonb`, two validation helpers, a strict CHECK and one property-column allowlist entry in the existing M4 RPC. It creates no tables, backfill or result columns. A source comparison confirms the RPC body differs from M5 only by that allowlist entry; owner checks, parent lock, revision conflict handling, M5 evidence validation and direct-write restrictions remain intact. Historical migrations are untouched.

Plans atomically store assumptions, strategy evidence, targets, preference, restrictions and confirmations at the shared property revision. Saving requires current identity, a valid baseline, exact acknowledgment and a fresh property read. Matching cached data cannot confirm a save; a later matching read cannot prove an uncertain attempt committed.

Previously applied only to the named disposable local database `supabase_db_mpia-m4-disposable-20261029`, gateway `http://127.0.0.1:57421`. No database migration was run for this checkpoint.

## Acceptance ledger

| Check | Status and attribution |
| --- | --- |
| Automated finance/strategy regressions | PASS; freshly rerun for checkpoint |
| Real local database, RLS and concurrency | PASS; prior M6 integration qualification reviewed, not rerun |
| Codex-observed browser strategy editing/saving | PASS; prior actual Chrome observation and local DB corroboration reviewed |
| Full browser reload/reopen preserves assumptions, targets and evidence | PASS — OWNER-VERIFIED, owner-reported |
| Missing essential values and unknown disposal tax correctly unavailable/qualified | PASS — OWNER-VERIFIED, owner-reported |
| Strategies usable at desktop and narrow/mobile widths | PASS — OWNER-VERIFIED, owner-reported |
| Two-session browser conflict interface | Not visually verified; API/database tests do not substitute |
| Remote Supabase / production deployment | Not tested |

Prior database qualification covered actual save/reload, new Auth-session reload, exact revision advancement, unchanged financial inputs, strict invalid-plan rejection/atomic rollback, cross-owner/anonymous and direct-write denial, RLS isolation, and exactly one winner for concurrent strategy/value and strategy/M5-evidence writes.

Prior actual Chrome observations covered sign-in, separate cards, draft exclusion, explicit acceptance, saved revision acknowledgment and independent results. At revision 11, saved Keep horizon/occupancy were 48/10, annual cash flow RM18,000 and holding cash flow RM72,000; Flip resale RM620,000 and legal fees RM3,500 produced profit RM62,500; Hybrid profit remained RM137,800. A separate local snapshot corroborated these stored values and unchanged financial sections. Codex's attempted reload was stopped by the browser URL-policy guard; the owner's subsequent manual confirmations close the three essential gaps. No new browser campaign was run.

## Fresh checkpoint checks

Run from the beta worktree using the existing parent `node_modules/.bin` tools:

| Command/check | Result |
| --- | --- |
| `vitest run tests/strategies.test.ts tests/strategy-api.test.ts tests/strategy-ui.test.ts tests/investment-evidence.test.ts --maxWorkers=1 --testTimeout=20000` | 85 passed / 4 files, including 54 M6 tests |
| `vitest run --maxWorkers=1 --testTimeout=20000` | 2,863 passed / 78 files |
| `tsc --noEmit` | PASS |
| `tsc --noEmit -p tests/strategies-tsconfig.json` | PASS |
| `vite build` | PASS; dependency-directive, configuration and bundle-size warnings remain |
| `SECURITY_AUDIT_BROWSER_ROOT=<beta>/.output/public node --test tests/security.test.mjs` | 6 passed, zero skipped; source and built browser assets scanned |
| M6 source ESLint | PASS after two formatting-only corrections |
| Property route ESLint with only `prettier/prettier` disabled | PASS; existing route formatting is not claimed clean |

No tests, financial formulas or assertions were weakened. The broad formatting-enabled lint attempt exposed existing route formatting; the checkpoint deliberately avoids unrelated reformatting. The maintained real-DB test remains opt-in and local-only. Local credentials, disposable configuration, screenshots, browser caches, generated route output, build output and verification logs are excluded from the commit.

## Checkpoint trace

The local commit containing this report is the M6 implementation checkpoint. Its full SHA and exact file manifest are recorded after commit creation in `docs/MPIA_M6_CHECKPOINT_AND_M7_HANDOFF.md`, avoiding a self-referential commit hash. No M7 implementation is included. No push, merge, rebase, deployment, remote migration, Lovable synchronization, archive or backup workflow is authorized or performed by this task.
