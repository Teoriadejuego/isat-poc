const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "..");
test("single-file entry has no key, example, sign-in or external trackers", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.equal((html.match(/type="file"/g) || []).length, 1);
  assert.doesNotMatch(
    html,
    /https?:\/\/|formspree|PBIS_DEMO|type="password"|llave/i,
  );
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /lang="es"/);
});
test("data remains in memory, stories are escaped and view clears on file changes", () => {
  const js = fs.readFileSync(path.join(root, "src/app.js"), "utf8");
  assert.doesNotMatch(
    js,
    /localStorage|sessionStorage|indexedDB|fetch\(|sendBeacon|XMLHttpRequest/,
  );
  assert.match(js, /E\(s\.story/);
  assert.match(js, /pagehide/);
  assert.match(js, /function removeModel/);
  assert.match(js, /worker\?\.terminate/);
});
test("el artefacto contiene solo los once recursos públicos, incluida la red, y rechaza extras", async (t) => {
  const { buildSite, verifySite, publicFiles } =
    await import("../tools/build-site.mjs");
  const qa = path.join(root, ".qa");
  assert.equal(publicFiles.length, 11);
  assert.ok(publicFiles.includes("src/ego-network.js"));
  assert.ok(publicFiles.includes("src/ego-network.css"));
  fs.mkdirSync(qa, { recursive: true });
  const directory = fs.mkdtempSync(path.join(qa, "staging-"));
  assert.deepEqual(
    (await buildSite(directory)).sort(),
    [...publicFiles].sort(),
  );
  fs.writeFileSync(
    path.join(directory, "datos.xlsx"),
    "marcador sintético, sin datos",
  );
  await assert.rejects(() => verifySite(directory), /inesperados/);
});
test("Pages instala dependencias fijadas y verifica el artefacto antes de publicarlo", () => {
  const workflow = fs.readFileSync(
    path.join(root, ".github/workflows/pages.yml"),
    "utf8",
  );
  assert.match(workflow, /pnpm install --frozen-lockfile --ignore-scripts/);
  assert.match(workflow, /node tools\/build-site\.mjs/);
  assert.match(workflow, /path: public/);
});
