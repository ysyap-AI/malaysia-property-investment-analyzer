import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

// Run after npm run build. Exercise the unchanged Lovable/Nitro Cloudflare
// artifact via real loopback HTTP, without credentials or external services.
// This proves server routing/asset delivery, not browser hydration or invitations.
test("main production worker: showcase direct entry, refresh, assets and protected shells", async () => {
  const browserAssets = resolve(".output/public");
  const originalFetch = globalThis.fetch;
  const attempted = [];
  globalThis.fetch = (...args) => {
    attempted.push(String(args[0]));
    throw new Error("Production worker attempted external network access");
  };
  let server;
  try {
    const { default: worker } = await import("../.output/server/index.mjs");
    const assets = {
      async fetch(request) {
        const path = new URL(request.url).pathname;
        const file = resolve(browserAssets, `.${path}`);
        assert.ok(file.startsWith(`${browserAssets}\\`) || file.startsWith(`${browserAssets}/`));
        try {
          const body = await readFile(file);
          const type = path.endsWith(".js")
            ? "text/javascript"
            : path.endsWith(".css")
              ? "text/css"
              : "image/x-icon";
          return new Response(body, { headers: { "content-type": type } });
        } catch {
          return new Response("Not found", { status: 404 });
        }
      },
    };
    server = createServer(async (req, res) => {
      try {
        const request = new Request(`http://127.0.0.1${req.url}`, { headers: req.headers });
        const response = await worker.fetch(request, { ASSETS: assets }, { waitUntil() {} });
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer()));
      } catch (error) {
        res.writeHead(500);
        res.end(String(error));
      }
    });
    await new Promise((done) => server.listen(0, "127.0.0.1", done));
    const origin = `http://127.0.0.1:${server.address().port}`;
    for (const path of ["/showcase", "/showcase", "/showcase/", "/showcase?refresh=1"]) {
      const response = await originalFetch(`${origin}${path}`);
      assert.equal(response.status, 200, path);
      const html = await response.text();
      assert.match(response.headers.get("content-type"), /text\/html/);
      for (const text of [
        "Synthetic Demonstration — No Real Property or Market Data",
        "Meranti Court",
        "Senja Heights",
        "Rimba Residences",
        "Present / Print",
        "No cloud saving",
        "nearby amenities are fictional",
        "do not enter confidential information",
        "noindex, nofollow, noarchive",
      ])
        assert.ok(html.includes(text), `${path}: ${text}`);
      const references = [
        ...new Set(
          [...html.matchAll(/(?:href|src)="(\/assets\/[^"?#]+)"/g)].map((match) => match[1]),
        ),
      ];
      assert.ok(
        references.some((path) => /showcase.*\.css$/.test(path)),
        "route-owned stylesheet",
      );
      assert.ok(
        references.some((path) => path.endsWith(".js")),
        "hydration scripts/preloads",
      );
      for (const asset of references) {
        const response = await originalFetch(`${origin}${asset}`);
        assert.equal(response.status, 200, asset);
        assert.match(
          response.headers.get("content-type"),
          asset.endsWith(".css") ? /text\/css/ : /javascript/,
        );
        assert.deepEqual(
          Buffer.from(await response.arrayBuffer()),
          await readFile(resolve(browserAssets, `.${asset}`)),
        );
      }
    }
    const landing = await (await originalFetch(`${origin}/`)).text();
    assert.match(landing, /href="\/showcase"/);
    assert.match(landing, /Sign in/);
    for (const path of [
      "/properties",
      "/properties/new",
      "/properties/synthetic-id",
      "/properties/synthetic-id/edit",
      "/dashboard",
      "/profile",
      "/settings",
    ]) {
      const response = await originalFetch(`${origin}${path}`);
      assert.equal(response.status, 200, path);
      const html = await response.text();
      // Protected routes have SSR disabled: only a shell may be returned.
      // Client getUser/redirect is separately exercised by Vitest, never bypassed.
      assert.ok(!html.includes("Meranti Court"), path);
      assert.ok(!html.includes("Synthetic Demonstration — No Real Property or Market Data"), path);
      assert.ok(!html.includes('href="/assets/showcase'), path);
    }
    assert.deepEqual(attempted, []);
  } finally {
    globalThis.fetch = originalFetch;
    if (server) {
      server.closeAllConnections();
      await new Promise((done, reject) =>
        server.close((error) => (error ? reject(error) : done())),
      );
    }
  }
});
