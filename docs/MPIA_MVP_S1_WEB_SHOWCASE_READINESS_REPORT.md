# MPIA S1 — Web showcase readiness

23 October 2026 · Asia/Kuala_Lumpur · MVP-S1-WEB-SHOWCASE-01

**GO to request hosted deployment approval. Unpublished.** The isolated M1–M3 showcase builds as a static React site for `/showcase/` or `/`. The owner explicitly confirms M1, M2 and M3 are manually browser/print verified and accepted in the S1 request. The living backlog now records that acceptance; historical reports retain their original findings. Fresh S1 browser/print verification is **NOT TESTED** because the approved browser inventory was empty.

## Exact changes

| File | S1 change |
| --- | --- |
| `vite.showcase.config.ts` | Isolate Vite's HTML root to `showcase/`, set default base `/showcase/`, use an absolute `dist/showcase` output path and map `/src` to the existing shared source directory for development/build resolution. Production HTML now lands at output-root `index.html`, removing the previous nested `showcase/index.html` deployment ambiguity. Existing isolation guard, disabled dotenv/public copying, manifest, MPA mode and loopback binding retained. |
| `showcase/index.html` | Update document title/description, add no-index metadata and bundle the existing `public/favicon.ico` through Vite's asset pipeline. Keep the accepted React entry and existing CSP. No remote branding asset. |
| `tests/showcase-static.test.mjs` | Add two real production build/preview tests, one per supported base. Check complete application content, local asset paths, exact served bytes, asset MIME types, absent hosted wiring/storage/dev-port references and missing-path 404 behavior. |
| `docs/MPIA_MVP_SCOPE_AND_POST_MVP_BACKLOG.md` | Record M1–M3 owner acceptance and S1 preparation/publication status in the existing register. |
| This report | Build, hosting, access-control and verification handoff. |

No financial, fixture, component, layout or print-CSS changes. Persistent synthetic/session-only disclosures, draft gating, location acknowledgement, assessment capture expiry and native `window.print()` remain as accepted. There is no router dependency: navigation uses same-page sections and component state, so no history-route rewrite is required.

## Build and hosting instructions

Use existing installed dependencies from the repository root. Default final build:

```powershell
npm run build:showcase
npm run preview:showcase -- --port 4176
```

Open `http://127.0.0.1:4176/showcase/`. **Deployment output: `dist/showcase/`.** Deploy its contents as static files mounted at `/showcase/`: `/showcase/index.html` and `/showcase/assets/...`. The host must redirect `/showcase` to `/showcase/` and serve `index.html` for the directory. Do not add another nested `showcase` directory inside this artifact. Hosts that publish an output directory only at the origin root should use the root variant below.

For an independent site served at `/`:

```powershell
npm run build:showcase -- --base /
npm run preview:showcase -- --base / --port 4176
```

Open `http://127.0.0.1:4176/`. Publish the contents of the same `dist/showcase/` at the origin root. Each build replaces that directory; choose the base before producing the final upload. Build and preview must use the same base. The artifact left by S1 uses **`/showcase/`**. Root verification artifacts are isolated in ignored `.mvp-s1.local/root-build/`.

Use HTTPS, directory index serving and standard JS/CSS/icon MIME types. Rebuild when changing the mount; do not edit hashed asset links by hand. These commands use Vite's documented [public base-path handling](https://vite.dev/guide/build#public-base-path). Local preview is a verification tool, not the hosted production service; the deployed site requires no Node runtime, SSR, functions, database, local port or environment variables. Upload only the static output, never the repository, `.output/`, local scratch files or environment files. No domain/provider is assumed or configured.

## Controlled access recommendation

Use the chosen static host's **built-in whole-site shared-password gate over HTTPS**, enforced before serving HTML **and every asset**, including alternate production, branch and preview URLs. This is the smallest practical private customer demonstration mechanism; no React password code or credential belongs in the bundle. Share the password separately and change it when access should end. A shared password provides no per-customer identity or individual revocation.

Conventional options evaluated:

| Option | Suitability |
| --- | --- |
| Hosting-layer whole-site password gate | Recommended minimum: little application/deployment complexity, real request-level access restriction. Confirm availability on the chosen plan. |
| Hosting-layer invited-user/identity gateway | Useful for individual revocation, but more setup than this presenter-controlled synthetic showcase needs. |
| Public site with an unadvertised URL | Publicly accessible. URL secrecy and the added no-index hint are **not access control**. Does not meet a private-demo requirement. |

As one verified example, [Netlify's official documentation](https://docs.netlify.com/manage/security/secure-access-to-sites/password-protection/) supports a shared password and protection across production and previews; it currently requires an eligible Pro/Enterprise plan, with UI differences by plan. This is an example capability, not a selected provider or purchase authorization. Verify the exact plan and protection scope before approval. No hosting account was accessed and no password was inspected or created.

## Actual verification

| Check | Result |
| --- | --- |
| Full offline application suite: `npx --no-install vitest run` | **47 files passed; 2,062 tests passed; 4 existing TODOs; zero failures.** Includes unchanged P01–P10 financial fixtures, M1 43 tests, M2 56 tests and M3 58 tests. |
| `npx --no-install tsc --noEmit` | Pass. |
| `npx --no-install tsc vite.showcase.config.ts --moduleResolution bundler --module esnext --target es2022 --skipLibCheck --noEmit` | Pass on final config. |
| ESLint on showcase config and new static test | Pass, zero warnings. |
| `npm run build:showcase` | Pass; output-root HTML, local hashed JS/CSS/favicon and `.vite/manifest.json`. Build guard: **79 reachable modules**, with no prohibited Auth, Supabase, API, dormant location or analytics imports. |
| `npm run build` | Pass; normal browser assets rebuilt at `.output/public/`. Existing large-chunk, ignored `inlineDynamicImports` and module-directive warnings remain. No deployment command run. |
| `npm run test:security`, `SECURITY_AUDIT_BROWSER_ROOT=.output/public` | **6 passed; zero skips/failures.** Rebuilt normal browser assets scanned. |
| Same security command with `SECURITY_AUDIT_BROWSER_ROOT=dist/showcase` | **6 passed; zero skips/failures.** Final subpath artifact scanned. |
| Same security command with `SECURITY_AUDIT_BROWSER_ROOT=.mvp-s1.local/root-build` | **6 passed; zero skips/failures.** Root artifact scanned. |
| `node --test tests/showcase-static.test.mjs` | **2 passed; zero failures/skips.** Real root/subpath builds and Vite production previews; all five output files verified byte-for-byte over HTTP, correct HTML JS/CSS/icon paths and MIME types, missing assets/routes return 404. Both include actual React application content. Temporary previews stopped. |
| Separate development smoke | Pass: default `/showcase/` HTML resolves the transformed React entry containing `createRoot`; temporary server stopped. |
| Actual S1 browser interaction, keyboard/mobile layout, network trace and print preview | **NOT TESTED.** Approved CUA inventory returned `apps: []`, `browsers: []`. Owner's M1–M3 acceptance is retained as owner testimony, not new S1 browser evidence. |
| Final hosted HTTPS/access gate | **NOT TESTED / not deployed.** No actual destination exists in this task. |

Production bundle checks and the accepted recursive source/side-effect tests support isolation: no normal authenticated application initialization, Supabase/PostgreSQL, provider, analytics, remote calculation or storage dependency. Synthetic data and captures remain in React session memory; reload clears them. Only the local static resources are needed. Credential-pattern scanners passed without exposing values; private environment/credential files were not opened. These checks are not a browser network trace or a database audit. Local HTTP success does not establish that a final hosted website works.

## Preservation and publication gates

Entry/final branch `phase2-location-intelligence`; HEAD `930aa98b3355f4fe65b1fb0b4012eeaf21438ddf`. Staged diff empty; index entries unchanged. Entry inventory included eleven existing tracked modifications and extensive untracked implementation/review work. Raw SHA-256 comparison of **515 existing noncredential source/document/config files** found **512 byte-identical** and exactly three intentional edits: showcase config, showcase HTML and living backlog. No existing file was removed. All eleven pre-existing tracked modifications remain byte-identical, including `package.json`. Baseline/check logs are in ignored `.mvp-s1.local/`.

Frozen formulas, scoring/recommendation thresholds, configuration, financial fixtures, shared coordinator, canonical V1 serializers, dormant I05/I06 contracts, location migrations, corrected length/revision SQL and historical M1–M3 reports are byte-identical. No new dependency, SQL execution, database/Supabase/Auth connection, real property storage change, credential inspection, hosting account access, publish, DNS change or Git stage/commit/push/reset/merge/rebase occurred.

Before publication, the owner must approve the platform, exact destination/base path and hosting-layer protection/plan. After that separately authorized deployment, verify HTTPS and reject unauthenticated requests for HTML, JS, CSS and icon on every exposed hostname. Confirm valid-password access and disable host-injected analytics/tracking. Host logging/access sessions are infrastructure behavior, separate from the application's memory-only synthetic inputs; do not enter real customer data.

Manual checks at the exact final HTTPS URL: reload and follow section links; exercise A/B/C and blank; edit/apply financial inputs, invalid/missing/zero cases, reset and reload; acknowledge origin, filter/details, address invalidation and all evidence states; capture, edit to expire, refresh and print. Check desktop and approximately 390 px layout, keyboard navigation, preserved Network log with no Auth/database/provider/analytics attempts, and A4 print for complete/adverse/incomplete cases with synthetic labels, warnings and readable page breaks. Cancel print preview without sending a physical print job.

**S1 verdict: GO for requesting hosted deployment approval; NO-GO for claiming a published, access-qualified customer link.** No implementation blocker remains for that approval request. Final hosting selection/access enforcement and destination-specific browser/print acceptance remain outstanding; no publication was attempted.
