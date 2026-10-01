# Supabase configuration repair

Date: 2026-09-30 (Asia/Kuala_Lumpur).

**SUPABASE CONFIGURATION STATUS: READY FOR PREFLIGHT.** This is configuration readiness, not authorization to deploy migrations.

## Scope and changes

- Intended project: **MPIA**, `viddikrrhogcebpbstti`.
- Old project: `fryqdijszrzqjgyyvqvg`.
- Changed `supabase/config.toml`: removed all three Git conflict markers and the stale alternative project ID; set the single `project_id` to MPIA's reference. Preserved every other parsed setting from the complete HEAD side.
- Changed ignored, untracked `.env`: aligned `SUPABASE_PROJECT_ID`, `SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, and `VITE_SUPABASE_URL`; set both publishable-key variables to the existing active MPIA client's public key. No credential values are reproduced here.
- Added this report. Existing documentation and preflight artifacts were left unchanged. The four preflight artifacts already untracked at task start remain untracked.
- Build output was regenerated locally and remains ignored. No application source or migration files changed; no database writes, schema changes, migration deployment/history repair, legacy-field removal, commit, or push occurred.

## Conflict decisions

There was one whole-file conflict: HEAD contained the full local-development configuration, while the other side contained only the old project's `project_id`. The only overlapping setting was `project_id`. Neither original value expressed the explicitly requested MPIA identifier, so it is now set to MPIA's reference. The remaining API, database, auth, storage, runtime, and other settings had no competing values and were retained. A parsed-object comparison against the HEAD side confirmed that only `project_id` changed. PostgreSQL major version 17 agrees with the existing linked-project version cache (17.6.1.155).

`project_id` is a local instance identifier, not proof of the remote deployment target; matching it to MPIA removes ambiguity. The actual saved remote link was checked separately, and a fresh CLI project listing confirmed MPIA is linked. See the [official Supabase configuration reference](https://supabase.com/docs/guides/local-development/cli/config#project_id).

## Validation

| Check | Result |
| --- | --- |
| TOML syntax | PASS, Python `tomllib`; no conflict markers or duplicate project ID. |
| Supabase CLI | Version 2.117.0 reads the repaired repository configuration. `projects list --output json` exits 0. |
| Remote target/link | Fresh CLI response: `id` and `ref` match MPIA, `name = MPIA`, `linked = true`, `status = ACTIVE_HEALTHY`. Saved `.temp/project-ref`, pooler reference, and linked-project cache agree. |
| Local CLI status | `status --output json` passes configuration parsing, then exits 1 because local Docker is unavailable. No local services were started; this is not a TOML or remote-link failure. Status payload was withheld to avoid printing local keys. |
| Environment consistency | Both browser/server IDs, URLs, and public keys match the active MPIA client; no Supabase process-environment override was found. `.env` is ignored and absent from Git's tracked files. |
| Whitespace | `git diff --check` passes. |
| TypeScript | `node node_modules/typescript/bin/tsc --noEmit` passes. |
| Production build | `npm run build` passes; non-fatal chunk-size, path-plugin, and dependency directive warnings remain. Fresh browser/server output contains MPIA and no old-project reference. |
| Application tests | `npm test`: 942 tests across 31 files pass. |
| Security tests | Six pass, zero skipped, with `SECURITY_AUDIT_BROWSER_ROOT` pointing to the fresh `.output/public` build. |
| Private secrets | None detected. Source/build regression scans pass; format/JWT-role scan of 393 file blobs reachable from all local Git refs found no private Supabase key, service-role/non-anon JWT, provider credential, or private-key material. This is a pattern scan, not a guarantee against every possible secret format. |

No credential rotation was needed. Public project IDs, Supabase URLs, and publishable keys are used in client configuration; private server variable names remain server-side references, not embedded values. No private credential values were printed.

## Complete project-reference inventory

Inventory covers first-party working files, hidden configuration, ignored local environment/CLI metadata, and historical local audit snapshots. Line numbers below are **after repair**. The old `supabase/config.toml:418` occurrence was removed; `.env:1,3,4,6` changed from the old project to MPIA. Public keys do not contain a plaintext project reference and were separately checked for consistency.

Dependencies, Git internals, and generated build output are excluded from the configuration inventory. Fresh root build output was separately checked (five MPIA occurrences in browser files and five in server files, zero old-project occurrences). Old ignored audit builds are historical derivatives of the listed snapshots, not active deployment configuration. This report's own identifiers are DOCUMENTATION. No UNKNOWN occurrences remain.

| File | Project and line(s) | Classification | Disposition |
| --- | --- | --- | --- |
| `.env` | MPIA at 1, 3, 4, 6 | LOCAL/IGNORED CONFIGURATION | Repaired IDs/URLs at lines 1, 3, 4, 6; matching public keys at lines 2, 5 (values withheld). |
| `.lovable/plan/switch-the-app-to-your-own-supabase-project-viddikrrhogcebpb-2026-09-20.md` | MPIA at 1, 22 | DOCUMENTATION | Historical evidence/plan; unchanged. |
| `.phase1-audit.local/compare-deployment-preflight.cjs` | MPIA at 43 | LOCAL/IGNORED CONFIGURATION | Ignored audit evidence, helper, or snapshot; unchanged. |
| `.phase1-audit.local/deployment-connection/supabase/.temp/linked-project.json` | MPIA at 1 | LOCAL/IGNORED CONFIGURATION | Ignored audit evidence, helper, or snapshot; unchanged. |
| `.phase1-audit.local/deployment-connection/supabase/config.toml` | MPIA at 1 | LOCAL/IGNORED CONFIGURATION | Ignored audit evidence, helper, or snapshot; unchanged. |
| `.phase1-audit.local/lint.json` | MPIA at 1 | LOCAL/IGNORED CONFIGURATION | Ignored audit evidence, helper, or snapshot; unchanged. |
| `.security-audit.local/financial-engine-audit/.env` | Old project at 1, 3, 4, 6 | STALE CONFIGURATION | Ignored historical audit snapshot; not used by the current application or deployment; unchanged. |
| `.security-audit.local/financial-engine-audit/.lovable/plan/switch-the-app-to-your-own-supabase-project-viddikrrhogcebpb-2026-09-20.md` | MPIA at 1, 22 | LOCAL/IGNORED CONFIGURATION | Ignored audit evidence, helper, or snapshot; unchanged. |
| `.security-audit.local/financial-engine-audit/src/integrations/supabase/external-config.ts` | MPIA at 2 | LOCAL/IGNORED CONFIGURATION | Ignored audit evidence, helper, or snapshot; unchanged. |
| `.security-audit.local/financial-engine-audit/supabase/config.toml` | Old project at 1 | STALE CONFIGURATION | Ignored historical audit snapshot; not used by the current application or deployment; unchanged. |
| `.security-audit.local/financing-audit/.env` | Old project at 1, 3, 4, 6 | STALE CONFIGURATION | Ignored historical audit snapshot; not used by the current application or deployment; unchanged. |
| `.security-audit.local/financing-audit/.lovable/plan/switch-the-app-to-your-own-supabase-project-viddikrrhogcebpb-2026-09-20.md` | MPIA at 1, 22 | LOCAL/IGNORED CONFIGURATION | Ignored audit evidence, helper, or snapshot; unchanged. |
| `.security-audit.local/financing-audit/src/integrations/supabase/external-config.ts` | MPIA at 2 | LOCAL/IGNORED CONFIGURATION | Ignored audit evidence, helper, or snapshot; unchanged. |
| `.security-audit.local/financing-audit/supabase/config.toml` | Old project at 1 | STALE CONFIGURATION | Ignored historical audit snapshot; not used by the current application or deployment; unchanged. |
| `.security-audit.local/implementation-audit/.env` | Old project at 1, 3, 4, 6 | STALE CONFIGURATION | Ignored historical audit snapshot; not used by the current application or deployment; unchanged. |
| `.security-audit.local/implementation-audit/.lovable/plan/switch-the-app-to-your-own-supabase-project-viddikrrhogcebpb-2026-09-20.md` | MPIA at 1, 22 | LOCAL/IGNORED CONFIGURATION | Ignored audit evidence, helper, or snapshot; unchanged. |
| `.security-audit.local/implementation-audit/docs/implementation-audit-results.json` | MPIA at 7 | LOCAL/IGNORED CONFIGURATION | Ignored audit evidence, helper, or snapshot; unchanged. |
| `.security-audit.local/implementation-audit/docs/implementation-audit.md` | MPIA at 19 | LOCAL/IGNORED CONFIGURATION | Ignored audit evidence, helper, or snapshot; unchanged. |
| `.security-audit.local/implementation-audit/src/integrations/supabase/external-config.ts` | MPIA at 2 | LOCAL/IGNORED CONFIGURATION | Ignored audit evidence, helper, or snapshot; unchanged. |
| `.security-audit.local/implementation-audit/supabase/config.toml` | Old project at 1 | STALE CONFIGURATION | Ignored historical audit snapshot; not used by the current application or deployment; unchanged. |
| `.security-audit.local/mpia-public.env` | MPIA at 1 | LOCAL/IGNORED CONFIGURATION | Ignored audit evidence, helper, or snapshot; unchanged. |
| `.security-audit.local/upstream-20260921/.env` | Old project at 1, 3, 4, 6 | STALE CONFIGURATION | Ignored historical audit snapshot; not used by the current application or deployment; unchanged. |
| `.security-audit.local/upstream-20260921/.lovable/plan/switch-the-app-to-your-own-supabase-project-viddikrrhogcebpb-2026-09-20.md` | MPIA at 1, 22 | LOCAL/IGNORED CONFIGURATION | Ignored audit evidence, helper, or snapshot; unchanged. |
| `.security-audit.local/upstream-20260921/src/integrations/supabase/external-config.ts` | MPIA at 2 | LOCAL/IGNORED CONFIGURATION | Ignored audit evidence, helper, or snapshot; unchanged. |
| `.security-audit.local/upstream-20260921/supabase/config.toml` | Old project at 1 | STALE CONFIGURATION | Ignored historical audit snapshot; not used by the current application or deployment; unchanged. |
| `.security-audit.local/upstream/.env` | Old project at 1, 3, 4, 6 | STALE CONFIGURATION | Ignored historical audit snapshot; not used by the current application or deployment; unchanged. |
| `.security-audit.local/upstream/supabase/config.toml` | Old project at 1 | STALE CONFIGURATION | Ignored historical audit snapshot; not used by the current application or deployment; unchanged. |
| `docs/implementation-audit-results.json` | MPIA at 7 | DOCUMENTATION | Historical evidence/plan; unchanged. |
| `docs/implementation-audit.md` | MPIA at 19 | DOCUMENTATION | Historical evidence/plan; unchanged. |
| `docs/security-audit-results-20260921.json` | MPIA at 3 | DOCUMENTATION | Historical evidence/plan; unchanged. |
| `docs/security-audit-results.json` | MPIA at 3 | DOCUMENTATION | Historical evidence/plan; unchanged. |
| `docs/security-audit.md` | Old project at 131, 231; MPIA at 11, 128, 209 | DOCUMENTATION | Historical evidence/plan; unchanged. |
| `docs/supabase-deployment-preflight-evidence.json` | MPIA at 2 | DOCUMENTATION | Historical evidence/plan; unchanged. |
| `docs/supabase-deployment-preflight.md` | Old project at 30; MPIA at 7, 30 | DOCUMENTATION | Historical evidence/plan; unchanged. |
| `src/integrations/supabase/external-config.ts` | MPIA at 2 | ACTIVE CONFIGURATION | Existing active Phase 1 client; unchanged. |
| `supabase/.temp/linked-project.json` | MPIA at 1 | LOCAL/IGNORED CONFIGURATION | Existing CLI link/cache; matches MPIA; unchanged. |
| `supabase/.temp/pooler-url` | MPIA at 1 | LOCAL/IGNORED CONFIGURATION | Existing CLI link/cache; matches MPIA; unchanged. |
| `supabase/.temp/project-ref` | MPIA at 1 | LOCAL/IGNORED CONFIGURATION | Existing CLI link/cache; matches MPIA; unchanged. |
| `supabase/config.toml` | MPIA at 6 | ACTIVE CONFIGURATION | Repaired project_id; previous stale reference was at line 418. |

SUPABASE CONFIGURATION STATUS:
READY FOR PREFLIGHT
