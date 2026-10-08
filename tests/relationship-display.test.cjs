const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../src/core.js");
const { createApp } = require("./helpers/app-harness.cjs");
const { headers, row, log } = require("./helpers/fixture.cjs");
const { relationsFixture } = require("./helpers/relations-fixture.cjs");
const base = (id) => ({
  "Usuario Id": id,
  Curso: "Control",
  Grupo: "A",
  dia: log("Par"),
});
const ownMetric = (app, title) =>
  [...app.get("report").querySelectorAll(".metric")].find(
    (card) => card.querySelector("h4").textContent === title,
  );
async function openStudent(app, table, id = "P001") {
  await app.load(table);
  app.get("tab-student").click();
  app.change("student", id);
}

test("predicciones entrantes verificables no requieren respuesta propia de relaciones", () => {
  const s = C.parseTable(relationsFixture()).students[0];
  assert.deepEqual(s.relations, []);
  assert.equal(s.metrics.friendsDeclared, 0);
  assert.equal(s.metrics.friendsMutual, 0);
  assert.equal(s.metrics.peers, 94);
  assert.equal(s.metrics.relationsCoverage, 94);
  assert.equal(s.metrics.friendsReceived, 6);
  assert.equal(s.metrics.friendPredictions, 8);
  assert.equal(s.metrics.friendEvaluable, 8);
  assert.equal(s.metrics.friendCorrect, 3);
});

test("ficha reconoce ninguna selección tras avanzar y muestra 3 de 8", async (t) => {
  const app = createApp(t);
  await openStudent(app, relationsFixture());
  assert.equal(app.get("report").querySelector(".relationship-note"), null);
  assert.match(
    app.get("report").querySelector(".participation-note").textContent,
    /no equivale a cero ni a «No»/,
  );
  const declared = ownMetric(app, "Relaciones positivas declaradas");
  assert.equal(declared.querySelector("strong").textContent, "0");
  assert.match(declared.textContent, /Buena o Muy buena/);
  const positive = ownMetric(app, "Aciertos de predicciones positivas");
  assert.equal(positive.querySelector("strong").textContent, "3");
  assert.equal(
    positive.querySelector(".metric-line span").textContent,
    "de 8 verificables",
  );
  assert.match(positive.textContent, /8 predicciones emitidas/);
  assert.doesNotMatch(positive.textContent, /pendientes de comprobación/);
  assert.match(
    app.get("report").querySelector(".prediction-intro").textContent,
    /respuestas de esas personas/,
  );
  const negative = ownMetric(app, "Aciertos de predicciones negativas");
  assert.equal(
    negative.querySelector("strong").textContent,
    "No hizo predicciones",
  );
});

test("sin respuestas para verificar muestra cero aciertos confirmados y todas pendientes", async (t) => {
  const app = createApp(t);
  await openStudent(app, [
    headers,
    row({ ...base("P001"), beliefs1: log("P002 (Buena relación)") }),
    row(base("P002")),
  ]);
  const positive = ownMetric(app, "Aciertos de predicciones positivas");
  assert.equal(positive.querySelector("strong").textContent, "0*");
  assert.match(positive.textContent, /1 predicción emitida/);
  assert.match(positive.textContent, /0 verificables/);
  assert.equal(
    positive.querySelector(".metric-line span").textContent,
    "de 0 verificables",
  );
  assert.match(positive.textContent, /1 de sus predicciones está pendiente/);
});

test("aciertos parciales positivos y negativos usan solo respuestas verificables y muestran pendientes", async (t) => {
  const app = createApp(t);
  await openStudent(app, [
    headers,
    row({
      ...base("P001"),
      start: log(""),
      beliefs1: log(
        "P002 (Buena relación) | P003 (Buena relación) | P004 (Buena relación) | P005 (Mala relación) | P006 (Mala relación)",
      ),
    }),
    row({ ...base("P002"), redes1: log("P001 (Buena relación)") }),
    row({ ...base("P003"), redes1: log("P001 (Normal)") }),
    row(base("P004")),
    row({ ...base("P005"), redes1: log("P001 (Mala relación)") }),
    row(base("P006")),
  ]);
  for (const [kind, checked] of [
    ["positivas", 2],
    ["negativas", 1],
  ]) {
    const card = ownMetric(app, `Aciertos de predicciones ${kind}`);
    assert.equal(card.querySelector("strong").textContent, "1*");
    assert.match(
      card.querySelector(".metric-line span").textContent,
      new RegExp(`de ${checked} verificable`),
    );
    const noteId = card
      .querySelector("strong")
      .getAttribute("aria-describedby");
    assert.match(
      app.get(noteId).textContent,
      /1 de sus predicciones está pendiente/,
    );
  }
  app.change("student", "P004");
  assert.equal(
    ownMetric(app, "Aciertos de predicciones positivas").querySelector("strong")
      .textContent,
    "Pendiente",
  );
});

test("cero explícito y recuentos parciales de relaciones tienen mensajes distintos", async (t) => {
  const app = createApp(t);
  await openStudent(app, [
    headers,
    row({ ...base("P001"), redes1: log("Nadie"), beliefs1: log("Nadie") }),
    row({
      ...base("P002"),
      redes1: log("P001 (Normal) | no-identificable (Buena relación)"),
      beliefs1: log("P001 (Normal) | no-identificable (Buena relación)"),
    }),
  ]);
  assert.equal(app.get("report").querySelector(".relationship-note"), null);
  assert.equal(
    ownMetric(app, "Relaciones positivas declaradas").querySelector("strong")
      .textContent,
    "0",
  );
  assert.equal(
    ownMetric(app, "Aciertos de predicciones positivas").querySelector("strong")
      .textContent,
    "No hizo predicciones",
  );
  app.change("student", "P002");
  assert.equal(app.get("report").querySelector(".relationship-note"), null);
  assert.equal(
    ownMetric(app, "Relaciones positivas declaradas").querySelector("strong")
      .textContent,
    "0",
  );
  assert.equal(
    ownMetric(app, "Aciertos de predicciones positivas").querySelector("strong")
      .textContent,
    "Pendiente",
  );
});

test("ayuda individual muestra el número sin identidades entrantes ni salientes", async (t) => {
  const app = createApp(t);
  await openStudent(app, relationsFixture());
  const care = app.get("report").querySelector(".student-care");
  assert.equal(care.querySelectorAll(".response-value")[1].textContent, "2");
  assert.equal(care.querySelector("details"), null);
  assert.doesNotMatch(
    care.textContent,
    /Persona de control|P007|P010|P011|Personas que este estudiante considera/,
  );
  assert.equal(app.get("report").querySelector(".care-outgoing"), null);
  app.get("report").querySelector("[data-return-class]").click();
  assert.ok(app.get("report").querySelector('[data-care-student="P001"]'));
});

test("historias cortas se filtran por letras y por respuesta, sin sumar No y Sí", () => {
  for (const answer of [
    null,
    "",
    "No",
    "Sí",
    "   abc  ",
    "123456",
    "a. b. c.",
  ]) {
    const m = C.parseTable([
      headers,
      row({
        ...base("A"),
        circunstancia: answer === null ? null : log(answer),
        personal: log("Sí"),
      }),
    ]);
    assert.equal(m.students[0].story, null, `Respuesta corta: ${answer}`);
  }
  const s = C.parseTable([
    headers,
    row({
      ...base("A"),
      circunstancia: log("No"),
      personal: log("¡Árbol!\nMi historia."),
    }),
  ]).students[0];
  assert.equal(s.story, "¡Árbol!\nMi historia.");
});

test("historia desaparece y vuelve al cambiar estudiante con umbral exacto de cuatro letras", async (t) => {
  const app = createApp(t);
  await openStudent(app, [
    headers,
    row({ ...base("P001"), circunstancia: log("No") }),
    row({ ...base("P002"), circunstancia: log("¡Álex!") }),
    row({ ...base("P003"), circunstancia: log("¿Sí?") }),
  ]);
  assert.equal(app.get("report").querySelector(".story"), null);
  assert.doesNotMatch(
    app.get("report").textContent,
    /Su historia|Circunstancias personales compartidas/,
  );
  app.change("student", "P002");
  assert.equal(app.get("report").querySelector(".story").textContent, "¡Álex!");
  assert.equal(
    app
      .get("report")
      .querySelector(".report-body > .section-panel:last-child h3").textContent,
    "Su historia",
  );
  app.change("student", "P003");
  assert.equal(app.get("report").querySelector(".story"), null);
});
