import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { build, preview } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const configFile = resolve(root, "vite.showcase.config.ts");
async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const path = resolve(directory, entry.name);
        return entry.isDirectory() ? filesUnder(path) : [path];
      }),
    )
  ).flat();
}

// Real production builds and HTTP checks, not browser execution or hosted acceptance.
for (const base of ["/", "/showcase/"]) {
  test(`static production artifact and preview at ${base}`, async () => {
    const outDir = resolve(root, base === "/" ? ".mvp-s1.local/root-build" : "dist/showcase");
    await build({ configFile, base, build: { outDir } });
    const html = await readFile(resolve(outDir, "index.html"), "utf8");
    assert.match(html, /MPIA \| Synthetic investment showcase/);
    assert.match(html, /noindex, nofollow, noarchive/);
    assert.doesNotMatch(html, /localhost|127\.0\.0\.1|\/src\/|@vite|@react-refresh/);
    const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
    assert.ok(references.some((path) => path.endsWith(".js")));
    assert.ok(references.some((path) => path.endsWith(".css")));
    assert.ok(references.some((path) => path.endsWith(".ico")));
    for (const path of references) assert.ok(path.startsWith(`${base}assets/`), path);

    const files = await filesUnder(outDir);
    assert.ok(files.every((path) => /(?:\.html|\.js|\.css|\.ico|manifest\.json)$/.test(path)));
    const scripts = await Promise.all(
      files.filter((path) => path.endsWith(".js")).map((path) => readFile(path, "utf8")),
    );
    const code = scripts.join("\n");
    // Detect a missing/erased application entry as well as unintended hosted wiring.
    for (const label of ["Meranti Court", "Senja Heights", "Rimba Residences", "Present / Print"])
      assert.ok(code.includes(label), `Missing application content: ${label}`);
    assert.doesNotMatch(
      code,
      /supabase|postgres(?:ql)?:\/\/|localhost|127\.0\.0\.1|VITE_[A-Z_]+|navigator\.sendBeacon|localStorage|sessionStorage|https?:\/\/[^\s"']*analytics/i,
    );

    const server = await preview({ configFile, base, build: { outDir }, preview: { port: 0 } });
    try {
      const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
      const page = await fetch(`${origin}${base}`);
      assert.equal(page.status, 200);
      assert.equal(await page.text(), html);
      for (const path of files) {
        const asset = relative(outDir, path).replaceAll("\\", "/");
        const response = await fetch(`${origin}${base}${asset}`);
        assert.equal(response.status, 200, asset);
        assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(path), asset);
      }
      for (const path of references) {
        const response = await fetch(`${origin}${path}`);
        const expected = path.endsWith(".js")
          ? /javascript/
          : path.endsWith(".css")
            ? /text\/css/
            : /image\//;
        assert.match(response.headers.get("content-type"), expected, path);
      }
      // No history router or blanket SPA fallback is required by this entry.
      assert.equal((await fetch(`${origin}${base}missing-file.js`)).status, 404);
      assert.equal((await fetch(`${origin}${base}nonexistent-route`)).status, 404);
    } finally {
      await new Promise((done, reject) =>
        server.httpServer.close((error) => (error ? reject(error) : done())),
      );
    }
  });
}
