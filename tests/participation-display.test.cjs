const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../src/core.js");
const { createApp } = require("./helpers/app-harness.cjs");
const { headers, row, log } = require("./helpers/fixture.cjs");
const base = (id, group = "A") => ({
  "Usuario Id": id,
  Estudio: "1",
  Curso: "Control",
  Grupo: group,
  dia: log("Par"),
});
const metric = (app, title) =>
  [...app.get("report").querySelectorAll(".metric")].find(
    (card) => card.querySelector("h4").textContent === title,
  );

test("una única nota por vista con porcentaje de finalización por clase, sin confundir respuestas con finalización", async (t) => {
  const app = createApp(t);
  await app.load([
    headers,
    row({ ...base("A"), end: log("") }),
    row({ ...base("B"), start: log(""), redes1: log("A (Buena relación)") }),
    row(base("C")),
    row({ ...base("D", "B"), end: log("") }),
  ]);
  for (const tab of ["group", "list", "student", "group"]) {
    app.get("tab-" + tab).click();
    const notes = app.get("report").querySelectorAll(".participation-note");
    assert.equal(notes.length, 1);
    assert.match(
      notes[0].textContent,
      /33,3 % de la clase \(1 de 3 estudiantes\)/,
    );
    assert.match(notes[0].textContent, /encuestas en curso/);
    assert.match(notes[0].textContent, /pueden cambiar/);
  }
  app.change("class", '["1","Control","B"]');
  assert.match(
    app.get("report").querySelector(".participation-note").textContent,
    /100 % de la clase \(1 de 1 estudiante\)/,
  );
  app.get("clear").click();
  assert.equal(app.get("report").querySelector(".participation-note"), null);
});

test("respuestas parciales y de encuestas en curso aportan vínculos, reciprocidad y aciertos reales", async (t) => {
  const table = [
    headers,
    row({
      ...base("A"),
      start: log(""),
      redes1: log("B (Muy buena relación) | desconocido (Buena relación)"),
      beliefs1: log("B (Buena relación) | desconocido (Buena relación)"),
    }),
    row({ ...base("B"), start: log(""), redes1: log("A (Buena relación)") }),
    row(base("C")),
  ];
  const model = C.parseTable(table);
  assert.equal(model.students[0].quality.relations.complete, false);
  assert.equal(model.students[0].metrics.friendsDeclared, 1);
  assert.equal(model.students[0].metrics.friendsMutual, 1);
  assert.equal(model.students[0].metrics.friendCorrect, 1);
  const app = createApp(t);
  await app.load(table);
  app.get("tab-student").click();
  for (const title of [
    "Relaciones positivas declaradas",
    "Relaciones positivas recíprocas observadas",
    "Aciertos de predicciones positivas",
  ])
    assert.equal(metric(app, title).querySelector("strong").textContent, "1");
  assert.match(
    app.get("report").querySelector(".participation-note").textContent,
    /0 % de la clase/,
  );
  assert.equal(app.get("report").querySelector(".relationship-note"), null);
});

test("finalización al 100 % no convierte falta de respuestas en cero ni predicciones en errores", async (t) => {
  const table = [
    headers,
    row({ ...base("A"), end: log("") }),
    row({ ...base("B"), end: log(""), redes1: log("A (Buena relación)") }),
  ];
  const app = createApp(t);
  await app.load(table);
  app.get("tab-student").click();
  assert.match(
    app.get("report").querySelector(".participation-note").textContent,
    /100 % de la clase/,
  );
  assert.equal(
    metric(app, "Relaciones positivas recibidas observadas").querySelector(
      "strong",
    ).textContent,
    "1",
  );
  for (const title of [
    "Relaciones positivas declaradas",
    "Relaciones positivas recíprocas observadas",
    "Aciertos de predicciones positivas",
  ])
    assert.equal(
      metric(app, title).querySelector("strong").textContent,
      "Pendiente",
    );
  assert.equal(
    app.get("report").querySelectorAll(".participation-note").length,
    1,
  );
  assert.doesNotMatch(
    app.get("report").textContent,
    /No hay una respuesta propia de relaciones interpretable|No hay una respuesta de predicciones interpretable/,
  );
});

test("densidad mínima observada incorpora relaciones negativas reconocidas en una respuesta parcial", () => {
  const model = C.parseTable([
    headers,
    row({
      ...base("A"),
      redes1: log("B (Mala relación) | desconocido (Mala relación)"),
    }),
    row({ ...base("B"), redes1: log("Nadie") }),
    row(base("C")),
  ]);
  const summary = C.summary(model.groups[0].rows);
  assert.equal(summary.relationCoverage, 2);
  assert.deepEqual(summary.rejection, {
    count: 1,
    denominator: 4,
    percent: 25,
    unit: "elecciones posibles",
  });
  const empty = C.summary(
    C.parseTable([headers, row(base("A")), row(base("B"))]).groups[0].rows,
  );
  assert.equal(empty.rejection.percent, null);
  assert.equal(empty.rejection.count, null);
});
