# Synthetic M7 demo — local only

Run from `.post-m7-integration.local` on `integration/post-m7-local-20261031`. The sole recipe is [fixture.ts](fixture.ts), derived from the accepted M6/M7 handoff. All property, rent, resale, tax, fee and investor-target records are invented. Nothing is real market evidence or a bank/legal/tax assessment.

## Prerequisites and database gate

Use the separately named disposable project **`mpia-post-m7-disposable-20261031`**, gateway **`http://127.0.0.1:57521`**. Dependencies are available in the parent worktree. No remote URL or service credential is accepted by this setup.

For a fresh environment, run the maintained phase qualification in this order (Docker Desktop and the cached images are required):

```powershell
node tests/post-m7-local-setup.mjs --start
node tests/post-m7-local-setup.mjs --through-m4
node tests/m4-local-database.integration.mjs
node tests/post-m7-legacy.integration.mjs --seed
node tests/post-m7-local-setup.mjs --through-m5
node tests/m5-local-database.integration.mjs
node tests/post-m7-local-setup.mjs --through-m6
node tests/m6-local-database.integration.mjs
node tests/post-m7-legacy.integration.mjs
node tests/m7-demo/setup.mjs
```

`--start` refuses existing container names/volumes and provisions PostgreSQL 17.11 / PostGIS 3.3.7 in `extensions`, owned by `supabase_admin`. It reuses only the older disposable M4 container's reviewed image bootstrap command; that container must exist. It never copies its volume, data, ledger or credentials. Random new credentials remain in process/container memory. Database/Auth/REST use an internal network; only Kong joins a host bridge and publishes `127.0.0.1:57521`. No images are pulled.

The ten migrations run unchanged in chronological order. M4/M5 scripts retain their phase-specific assertions by running before the next migration; M6 compares final live function bodies. The local legacy test seeds pre-M5 nullable rows, then checks them after M6. An existing ledger must match the approved prefix exactly. Already-applied phases refuse replay. `--resume-bootstrap` is only for an interrupted bootstrap containing the sole DB container and no application schema/ledger; it cannot resume a partially migrated environment.

The demo's read-only gate checks the named gateway/port, migration ledger, revision/evidence/strategy columns, required functions, RLS and denied authenticated direct property UPDATE. Its inventory and creation-intent receipts are ignored local files. This gate supplements the full chain qualification above; it does not certify a remote deployment.

## Create once, then reuse

After the gate passes and the environment review above is complete, set a synthetic account email (`m7-demo@example.test`) and a unique password of at least 12 characters in process environment variables `M7_DEMO_EMAIL` and `M7_DEMO_PASSWORD`. Enter the password privately; do not save it in a command file, report or Git. No customer account may be used.

```powershell
# First run only: explicitly create a synthetic local Auth user and property.
node tests/m7-demo/setup.mjs --apply --signup --create
# Subsequent runs: sign in, use the known ID, and make no writes if unchanged.
node tests/m7-demo/setup.mjs --apply
```

Each financial/evidence/strategy save uses the existing revision-aware APIs and a fresh snapshot. Final values are reloaded and checked; output contains the property ID and engine results, never credentials. The ignored owner-specific receipt records creation intent **before** INSERT. An uncertain creation blocks automatic recreation. Known IDs survive partial setup; a changed or partial record requires deliberate review, followed by `--apply --review-existing=<known-id>`. Never delete a receipt merely to bypass an uncertain result. Review the synthetic owner's list/snapshot first. Do not repeat `--signup` after an uncertain signup. Two simultaneous creation attempts cannot overwrite the intent receipt.

Review dates use the actual Kuala Lumpur run date. A later-day rerun asks for review before updating the dated assumptions. It does not pretend that sources were independently reverified. No service-role credential is used; the public anon gateway key is obtained in memory from this named local stack only.

## Local preview and short acceptance journey

```powershell
node tests/m7-demo/setup.mjs --preview
```

Open **`http://127.0.0.1:5177`**, sign in with the synthetic account, and open the printed property ID from Dashboard. This maintained preview config supplies only the fixed disposable URL and its public anon key. It fails closed if local configuration is absent. **Do not use the normal `npm run dev` for this demo: checked-in normal connection settings target remote Supabase.** Stop this preview with Ctrl+C. Clear the password environment variable after the session.

One concise acceptance pass: Dashboard → New Property (save a separate clearly synthetic property to check first use) → Details → Acquisition → Financing → Expenses → Summary evidence review links → Summary/Scenarios/Scores/Risk → Strategies. On the maintained demo, inspect source labels, open each strategy's sources/targets, save a deliberate edit, reload and confirm it remains. Restore through the reviewed-ID setup action. Check all tabs, long explanations, amount units, expanded sources and save/review/discard at **1440, 390 and 320px**. Horizontally scroll the contained property table to View/Edit. Verify failed list reads show Retry and searching with no matches offers Clear filters.

Optional missing-data demonstration: in Flip set disposal tax to Unknown (amount stays NULL), save and verify before-tax profit RM4,522.23 with after-tax suitability withheld. Blank one selling-cost field to withhold sale results. Restore through the reviewed-ID setup action. An explicit zero remains different from blank.

## Reconciliation and automated checks

Acquisition RM565,250; annual expenses RM8,400; loan RM400,000 at 4%/30 years; instalment RM1,909.66; initial investor cash RM165,250. The fixture retains all 14 acquisition and 14 expense lines, separate selling-cost/tax/refund records and investor targets.

| Saved plan | Keep (60 months) | Flip (12 months) | Hybrid (60 months; 6-month lead-in) |
| --- | ---: | ---: | ---: |
| Hypothetical resale | No sale | RM610,000 | RM650,000 |
| Holding cash flow | RM8,420.40 | −RM31,315.92 | −RM8,079.60 |
| Final proceeds including deposit refunds | No sale | RM189,088.15 | RM263,453.91 |
| Investor profit | Rental only | **−RM7,477.77** | **RM90,124.31** |
| Funded equity ROI / annualized IRR | Not a sale measure | −3.86% / −4.16% | 49.82% / 8.59% |
| Actual suitability | Needs evidence | Needs evidence | Needs evidence |

Keep/Base annual flow RM1,684.08, monthly equivalent RM140.34 and annual cash-on-cash 1.02%. Horizons and rental-only/sale returns are distinct measures. No guaranteed return, automatic tax determination or forced positive suitability.

Preserved evidence nuance: the exact handoff captures M3 `loanAmount: null` (LTV derives the loan), while the existing financing save builder stores derived `loan_amount: 400000`. M5 compares that stored context literally, so the four applied system-estimate sources show **“review calculation context”**. Amounts still reconcile. The fixture retains the requested fingerprint; it does not silently rewrite provenance or weaken frozen evidence rules. A deliberate estimator review/reapplication uses the currently saved context and therefore differs from the exact fixture's captured inputs.

```powershell
..\node_modules\.bin\vitest.cmd run tests/m7-demo.test.ts tests/m7-demo-save.test.ts tests/m7-presentation.test.ts --maxWorkers=1 --testTimeout=20000
..\node_modules\.bin\tsc.cmd --noEmit -p tests/m7-tsconfig.json
```

Fixture/engine reconciliation and mocked revision/save/reload orchestration are automated. Actual local persistence, RLS behavior and browser usability require the qualified disposable stack and browser; mocks do not establish those results.
