import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

// Separate entry: no TanStack root, hosted clients, env injection or analytics.
export default defineConfig({
  root: fileURLToPath(new URL("./showcase", import.meta.url)),
  // Default customer mount. For a dedicated site use --base / at build AND preview.
  base: "/showcase/",
  appType: "mpa",
  envDir: false,
  publicDir: false,
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "showcase-isolation",
      generateBundle(_options, bundle) {
        const modules = Object.values(bundle).flatMap((output) =>
          output.type === "chunk" ? Object.keys(output.modules) : [],
        );
        const prohibited = modules.filter((id) =>
          /supabase|src\/(?:routes|hooks|lib\/location)|(?:property|acquisition|financing|operating-expenses)-api|AppShell|analytics/i.test(
            id.replaceAll("\\", "/"),
          ),
        );
        if (prohibited.length)
          this.error(`Showcase contains prohibited modules: ${prohibited.join(", ")}`);
        this.info(
          `Showcase isolation: ${modules.length} reachable modules; no Auth, Supabase, API, location or analytics modules.`,
        );
      },
    },
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Share the accepted entry outside the isolated HTML root, including in dev.
      "/src": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: { host: "127.0.0.1", port: 4174, strictPort: true },
  preview: { host: "127.0.0.1", port: 4174, strictPort: true },
  build: {
    outDir: fileURLToPath(new URL("./dist/showcase", import.meta.url)),
    emptyOutDir: true,
    // Inspect the actual reachable source graph, not just bundled text.
    manifest: true,
    rollupOptions: { input: fileURLToPath(new URL("./showcase/index.html", import.meta.url)) },
  },
});
