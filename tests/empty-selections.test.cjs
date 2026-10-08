const test = require("node:test"),
  assert = require("node:assert/strict");
const C = require("../src/core.js");
const { headers, row, log } = require("./helpers/fixture.cjs");
const { createApp } = require("./helpers/app-harness.cjs");
const base = (id) => ({
  "Usuario Id": id,
  Curso: "Control",
  Grupo: "A",
  dia: log("Par"),
});
const parse = (records) =>
  C.parseTable([headers, ...records.map((s) => row({ ...base(s.id), ...s }))]);
test("vacío tras avanzar significa ninguna selección, preservando la procedencia", () => {
  const s = parse([{ id: "A", personal: log("Una historia") }]).students[0];
  for (const field of [
    "relations",
    "predictions",
    "popularChoice",
    "connectorChoice",
    "contacts",
    "help",
  ])
    assert.deepEqual(s[field], []);
  assert.equal(s.outsideCount, 0);
  assert.equal(s.raw.help, null);
  assert.equal(s.quality.help.inferredEmpty, true);
  assert.equal(s.responses.uce, "No");
  assert.equal(s.quality.uce.inferredNo, true);
});
test("no infiere vacíos por eventos de visita, finalización sola o metadatos", () => {
  for (const extra of [
    { eayuda: log("") },
    { end: log("") },
    { Nombre: "Texto" },
    { start: log("") },
  ]) {
    const s = parse([{ id: "A", ...extra }]).students[0];
    assert.equal(s.help, null);
    assert.equal(s.relations, null);
  }
});
test("respeta orden Par/Impar y no depende del orden de las columnas", () => {
  const rows = [
    { ...base("A"), dia: log("Impar"), beliefs2: log("B (Buena relación)") },
    { ...base("B"), dia: log("Impar"), redes2: log("A (Buena relación)") },
  ];
  const table = [headers, ...rows.map(row)];
  for (const input of [table, table.map((r) => [...r].reverse())]) {
    const [a, b] = C.parseTable(input).students;
    assert.equal(a.relations, null);
    assert.deepEqual(b.predictions, []);
    assert.equal(a.metrics.friendCorrect, 1);
  }
});
test("no convierte errores, columna ausente ni ruta ambigua en ninguna selección", () => {
  const s = parse([
    { id: "A", ayuda: log("no resuelve"), personal: log("Respuesta") },
  ]).students[0];
  assert.equal(s.help, null);
  assert.equal(s.quality.help.complete, false);
  const table = [
    [...headers],
    ...[{ ...base("A"), personal: log("Texto") }].map(row),
  ];
  const index = headers.indexOf("ayuda");
  table.forEach((r) => r.splice(index, 1));
  assert.equal(C.parseTable(table).students[0].help, null);
  const unknown = parse([{ id: "A", dia: null, personal: log("Texto") }])
    .students[0];
  assert.equal(unknown.relations, null);
});
test("la fila pendiente completa el total de menciones y abre sus fichas", async (t) => {
  const app = createApp(t);
  await app.load([
    headers,
    ...[
      { ...base("A"), uce: log("Sí"), ayuda: log("C") },
      { ...base("B"), uce: log("No"), ayuda: log("C") },
      { ...base("C") },
    ].map(row),
  ]);
  const report = app.get("report");
  assert.equal(
    report.querySelector(".matrix-pending td:last-child strong").textContent,
    "1",
  );
  report.querySelector('[data-care-scope="pendingHigh"]').click();
  assert.equal(app.get("list-scope").value, "pendingHigh");
  assert.equal(
    report.querySelector("[data-list-student]").dataset.listStudent,
    "C",
  );
  assert.equal(report.querySelectorAll("[data-list-student]").length, 1);
});
