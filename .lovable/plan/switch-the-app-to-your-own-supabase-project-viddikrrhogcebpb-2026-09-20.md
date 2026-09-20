# Switch the app to your own Supabase project (viddikrrhogcebpbstti)

Point the app at your external Supabase project, recreate the full schema there, and migrate the existing data across.

## Important consequences (please read)

- The built-in Lovable Cloud database is disconnected for this app. Everything created so far (7 tables, security rules, sign-in) moves to your project.
- Lovable's managed migration tool only works against the built-in database, so the schema on your project is created by running a SQL script I prepare — you run it once in your Supabase dashboard (SQL Editor → paste → Run). This takes about 2 minutes.
- Existing user accounts cannot be moved with their passwords (passwords are never exportable). Only test accounts exist so far, so each person simply signs up again on the new database.
- Google sign-in, if added later, must be configured in your own Supabase dashboard rather than automatically.

## Steps

1. **Credentials** — You fetch two values from your Supabase dashboard (Project Settings → API): the `anon public` key and the `service_role` key. I open a secure form for you to paste them; they are stored encrypted and never appear in code. (You said you don't have them yet — this is the one thing only you can do.)

2. **Schema recreation** — I prepare a single SQL script that recreates on your project, identical to what was built and tested here:
   - Tables: `properties`, `acquisition_costs`, `operating_expenses`, `financing`, `investment_criteria`, `scenario_configs`, `profiles`
   - Access grants, Row Level Security on every table, all 28 ownership policies
   - Helper functions (`owns_property`, `handle_new_user`, `set_updated_at`) and all triggers, including automatic profile creation on sign-up
   - You run the script in your Supabase SQL Editor.

3. **App rewiring** — Update the app's connection settings (URL + anon key) to point at `viddikrrhogcebpbstti.supabase.co`. No frontend screens or logic change; no keys are ever exposed in browser code beyond the public anon key, which is safe by design.

4. **Data migration** — Export all rows currently in the Lovable Cloud database and import them into your project (via the service-role key, server-side only). Verified afterwards by comparing row counts per table.

5. **Verification** —
   - Build and typecheck clean; all routes load.
   - Sign up a fresh account, create a property with costs/expenses/financing/criteria/scenarios, confirm it saves and reloads.
   - Re-run the cross-user security test on the new database: User B cannot see, edit, or delete User A's records; signed-out access returns nothing.

## What is NOT in scope

- No financial calculations, scoring, or other Phase 1 modules — unchanged by this switch.
- No changes to screens or navigation.

## Technical details

- Secrets requested via secure form: `EXTERNAL_SUPABASE_ANON_KEY`, `EXTERNAL_SUPABASE_SERVICE_ROLE_KEY` (service key used only in server-side code for the one-time data import).
- The SQL script is delivered as a downloadable file plus inline copy-paste; nothing is executed against your project without you running it.
- Existing app code reads the connection from environment configuration, so rewiring is config-only.
