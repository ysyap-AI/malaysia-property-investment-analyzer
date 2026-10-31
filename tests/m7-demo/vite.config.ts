// Opt-in local preview. Missing configuration fails closed; there is no remote fallback.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
const publicKey = process.env["M7_LOCAL_ANON_KEY"];
if (!publicKey)
  throw Error("Start with node tests/m7-demo/setup.mjs --preview after local qualification.");
export default defineConfig({
  tanstackStart: { server: { entry: "server" } },
  vite: {
    server: { host: "127.0.0.1", port: 5177, strictPort: true },
    plugins: [
      {
        name: "m7-disposable-local-supabase",
        enforce: "pre",
        resolveId(source, importer) {
          if (
            source === "./external-config" &&
            importer
              ?.replaceAll("\\", "/")
              .endsWith("/src/integrations/supabase/external-client.ts")
          )
            return "\0m7-local-config";
          return null;
        },
        load(id) {
          if (id === "\0m7-local-config")
            return `export const EXTERNAL_SUPABASE_URL = 'http://127.0.0.1:57521'; export const EXTERNAL_SUPABASE_ANON_KEY = ${JSON.stringify(publicKey)};`;
          return null;
        },
      },
    ],
  },
});
