const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../src/core.js");
const N = require("../src/ego-network.js");
const { egoFixture } = require("./helpers/ego-fixture.cjs");
const { createApp } = require("./helpers/app-harness.cjs");
const { headers } = require("./helpers/fixture.cjs");
function model() {
  const m = C.parseTable(egoFixture());
  const s = m.students.find((student) => student.id === "R001");
  return {
    s,
    g: m.groups.find((group) => group.rows.includes(s)),
    students: m.students,
  };
}
test("la estrella representa declaraciones y recepciones reales, con intensidades independientes", () => {
  const { s, g, students } = model(),
    before = JSON.stringify(g),
    n = N.build(s, students);
  assert.equal(n.peers.length, 11);
  assert.equal(n.outgoing, 6);
  assert.equal(n.incoming, 9);
  for (const kind of ["positive", "negative"]) {
    assert.equal(
      n.edges.filter((e) => e.kind === kind && e.direction === "outgoing")
        .length,
      3,
    );
    assert.equal(
      n.edges.filter((e) => e.kind === kind && e.direction === "incoming")
        .length,
      kind === "positive" ? 5 : 4,
    );
  }
  const outgoing = n.edges.find(
    (e) => e.peerId === "R004" && e.direction === "outgoing",
  );
  const incoming = n.edges.find(
    (e) => e.peerId === "R004" && e.direction === "incoming",
  );
  assert.deepEqual(
    [outgoing.from, outgoing.to, outgoing.intensity],
    ["R001", "R004", 1],
  );
  assert.deepEqual(
    [incoming.from, incoming.to, incoming.intensity],
    ["R004", "R001", 2],
  );
  assert.ok(!n.peers.some((p) => ["R012", "R013"].includes(p.id)));
  assert.ok(n.peers.some((p) => p.id === "R014"));
  assert.equal(n.otherClass, 1);
  assert.equal(s.metrics.friendsReceived, 4);
  assert.equal(s.metrics.rejectionsDeclared, 3);
  assert.equal(JSON.stringify(g), before);
});
test("la reciprocidad tiene dos trayectos separados y conserva valoraciones de signo distinto", () => {
  const { s, students } = model(),
    n = N.build(s, students),
    layout = N.geometry(n);
  const pair = layout.paths.filter((e) => e.peerId === "R003");
  assert.equal(pair.length, 2);
  assert.notEqual(pair[0].path, pair[1].path);
  assert.deepEqual(pair.map((e) => e.kind).sort(), ["negative", "positive"]);
  assert.ok(
    layout.paths.find((e) => e.intensity === 2).width >
      layout.paths.find((e) => e.intensity === 1).width,
  );
  const html = N.svg(n);
  assert.equal((html.match(/marker-end=/g) || []).length, 15);
  assert.match(html, /ego-arrow-negative/);
  assert.match(html, /Muy mala relación/);
});
test("los filtros afectan solo al dibujo y no cambian el estudiante ni los recuentos originales", () => {
  const { s, students } = model();
  const n = N.build(s, students, { kind: "negative", direction: "incoming" });
  assert.equal(n.peers.length, 4);
  assert.equal(n.outgoing, 0);
  assert.equal(n.incoming, 4);
  assert.ok(
    n.edges.every(
      (e) => e.from !== s.id && e.to === s.id && e.kind === "negative",
    ),
  );
  assert.equal(N.build(s, students).edges.length, 15);
  assert.equal(s.metrics.friendsDeclared, 3);
});
test("una selección vacía tras avanzar conserva las flechas recibidas sin inventar salientes", () => {
  const table = egoFixture();
  table[1][headers.indexOf("redes1")] = null;
  const m = C.parseTable(table),
    s = m.students[0];
  const n = N.build(s, m.students);
  assert.equal(n.outgoing, 0);
  assert.equal(n.incoming, 9);
  assert.deepEqual(s.relations, []);
  assert.equal(s.quality.relations.inferredEmpty, true);
  assert.match(
    N.body(
      m.students.find((s) => s.id === "R013"),
      m.students,
    ),
    /No hay relaciones positivas o negativas registradas/,
  );
});
test("solo se muestran códigos, se escapan los textos y las redes grandes no solapan nodos", () => {
  const { s, students } = model();
  s.name = '<img src=x onerror="alert(1)">';
  students[1].name = "<script>error</script>";
  students[1].course = "<script>error</script>";
  const html = N.body(s, students);
  assert.ok(!html.includes("<img src="));
  assert.ok(!html.includes("<script>error"));
  assert.match(html, /&lt;script&gt;/);
  assert.ok(!html.includes("Ana García López"));
  const n = N.build(s, students);
  n.peers = Array.from({ length: 95 }, (_, i) => ({
    id: "P" + i,
    name: "Persona " + i,
  }));
  n.edges = [];
  const layout = N.geometry(n);
  for (let i = 0; i < layout.peers.length; i++) {
    const a = layout.peers[i];
    assert.ok(
      a.x - 71 >= 0 &&
        a.x + 71 <= layout.width &&
        a.y - 34 >= 0 &&
        a.y + 34 <= layout.height,
    );
    for (let j = i + 1; j < layout.peers.length; j++) {
      const b = layout.peers[j];
      assert.ok(Math.abs(a.x - b.x) >= 142 || Math.abs(a.y - b.y) >= 68);
    }
  }
  assert.ok(!/NaN|Infinity/.test(N.svg(n)));
});
test("la red aparece al final de los indicadores sin filtros ni tabla y conserva ampliación y enlaces", async (t) => {
  const app = createApp(t);
  await app.load(egoFixture());
  app.get("tab-student").click();
  app.change("student", "R001");
  const d = app.window.document;
  assert.equal(d.querySelectorAll(".ego-edge").length, 15);
  const extra = d.querySelector("details[data-extra-student]");
  assert.equal(extra.open, false);
  assert.equal(extra.lastElementChild.className, "ego-network");
  assert.equal(d.querySelector(".ego-network").closest("details"), extra);
  assert.equal(d.querySelector("[data-ego-filter]"), null);
  assert.equal(d.querySelector(".ego-detail"), null);
  assert.equal(d.querySelector(".ego-table"), null);
  assert.doesNotMatch(
    d.querySelector(".ego-network").textContent,
    /Consultar el detalle de las valoraciones|Solo positivas|Solo negativas|Sentido de las flechas/,
  );
  extra.open = true;
  assert.equal(app.get("student").value, "R001");
  d.querySelector('[data-ego-zoom="in"]').click();
  assert.equal(d.querySelector(".ego-stage").dataset.egoScale, "1.5");
  d.querySelector('[data-ego-zoom="fit"]').click();
  assert.equal(d.querySelector(".ego-stage").dataset.egoScale, "1");
  const peerLink = d.querySelector('a[data-network-student="R002"]');
  peerLink.dispatchEvent(
    new app.window.MouseEvent("click", { bubbles: true, cancelable: true }),
  );
  assert.equal(app.get("student").value, "R002");
  assert.match(d.querySelector("#ego-svg-title").textContent, /R002/);
  app.get("clear").click();
  assert.equal(d.querySelector(".ego-network"), null);
  assert.ok(!d.body.textContent.includes("Lucía Martín Ruiz"));
});
test("las relaciones salientes a otra clase entran y los enlaces cambian de clase y estudio", async (t) => {
  const table = egoFixture();
  table[1][headers.indexOf("redes1")] += " | R014 (Muy mala relación)";
  table[14][headers.indexOf("Estudio")] = "Otro estudio";
  const m = C.parseTable(table),
    s = m.students[0];
  const n = N.build(s, m.students);
  const pair = n.edges.filter((edge) => edge.peerId === "R014");
  assert.equal(pair.length, 2);
  assert.deepEqual(pair.map((edge) => edge.direction).sort(), [
    "incoming",
    "outgoing",
  ]);
  assert.deepEqual(pair.map((edge) => edge.kind).sort(), [
    "negative",
    "positive",
  ]);
  const app = createApp(t);
  await app.load(table);
  app.get("tab-student").click();
  app.change("student", "R001");
  const d = app.window.document;
  d.querySelector('a[data-network-student="R014"]').dispatchEvent(
    new app.window.MouseEvent("click", { bubbles: true, cancelable: true }),
  );
  assert.equal(app.get("study").value, "Otro estudio");
  assert.equal(app.get("class").value, '["Otro estudio","Educación","B"]');
  assert.equal(app.get("student").value, "R014");
  assert.match(d.querySelector("#ego-svg-title").textContent, /R014/);
  assert.equal(d.querySelectorAll(".ego-edge").length, 2);
});
test("el color de ayuda sigue la petición propia o más de dos menciones y se actualiza al cambiar de ficha", async (t) => {
  const app = createApp(t),
    table = egoFixture();
  // Internal boundary cases; they are never loaded into the delivered preview.
  table[1][headers.indexOf("uce")] = "Sí";
  table[2][headers.indexOf("ayuda")] = "R004 | R005";
  table[3][headers.indexOf("ayuda")] = "R005";
  table[6][headers.indexOf("ayuda")] = "R004 | R005";
  await app.load(table);
  app.get("tab-student").click();
  const highlighted = (id) => {
    app.change("student", id);
    return app
      .get("report")
      .querySelector(".report")
      .classList.contains("report-care");
  };
  assert.equal(highlighted("R001"), true, "Own request is enough");
  assert.equal(highlighted("R004"), false, "Two mentions do not exceed two");
  assert.equal(highlighted("R005"), true, "Three distinct mentions exceed two");
  assert.equal(highlighted("R006"), false, "No request and no mentions");
  assert.equal(
    highlighted("R001"),
    true,
    "No stale highlight after navigation",
  );
  app.get("tab-group").click();
  assert.equal(
    app.get("report").querySelector(".report-care"),
    null,
    "Group cards do not inherit individual emphasis",
  );
});
