const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../src/core.js");
const { createApp } = require("./helpers/app-harness.cjs");
const { headers, row, log } = require("./helpers/fixture.cjs");
const doc = (app) => app.window.document;
const ids = (app) =>
  [...doc(app).querySelectorAll("[data-list-student]")]
    .map((el) => el.dataset.listStudent)
    .sort();
const change = (app, el, value) => {
  el.value = value;
  el.dispatchEvent(new app.window.Event("change", { bubbles: true }));
};
function matrixFixture() {
  return [
    headers,
    ...[
      { id: "A", own: "Sí", help: "B | C | E" },
      { id: "B", own: "Sí", help: "C" },
      { id: "C", own: "No", help: "B" },
      { id: "D", own: "No", help: "E" },
      { id: "E", own: null, help: "Nadie" },
      { id: "F", own: "No", help: "Nadie" },
    ].map((s) =>
      row({
        "Usuario Id": s.id,
        Curso: "Control",
        Grupo: "A",
        dia: log("Par"),
        uce: s.own === null ? null : log(s.own),
        ayuda: log(s.help),
        redes1: log("Nadie"),
      }),
    ),
  ];
}
test("volver a abrir el mismo cuestionario conserva vista, filtro, búsqueda y revisión", async (t) => {
  const app = createApp(t);
  const worker = await app.load(matrixFixture());
  app.get("tab-list").click();
  change(app, app.get("list-scope"), "care");
  app.get("search").value = "B";
  app.get("search").dispatchEvent(new app.window.Event("input"));
  change(app, doc(app).querySelector('[data-confidence="B"]'), "0");
  const request = worker.message.requestId;
  app.get("show-data").click();
  assert.match(app.get("open").textContent, /Volver a las fichas/);
  app.get("open").click();
  assert.equal(
    worker.message.requestId,
    request,
    "No reparse or reset of the same model",
  );
  assert.equal(app.get("tab-list").getAttribute("aria-selected"), "true");
  assert.equal(app.get("list-scope").value, "care");
  assert.equal(app.get("search").value, "B");
  assert.deepEqual(ids(app), ["B"]);
  assert.equal(doc(app).querySelector('[data-confidence="B"]').value, "0");
  assert.equal(app.get("review-open").textContent, "Mi revisión (1)");
});
test("las cuatro celdas y las ausencias abren exactamente su lista sin cambiar recuentos", async (t) => {
  const app = createApp(t);
  await app.load(matrixFixture());
  const expected = {
    ownOnly: ["A"],
    both: ["B"],
    peerOnly: ["C"],
    neither: ["D", "F"],
    missing: ["E"],
  };
  const classValue = app.get("class").value;
  const matrix = doc(app).querySelector(".care-matrix table").textContent;
  for (const [scope, people] of Object.entries(expected)) {
    doc(app).querySelector(`[data-care-scope="${scope}"]`).click();
    assert.equal(app.get("tab-list").getAttribute("aria-selected"), "true");
    assert.equal(app.get("list-scope").value, scope);
    assert.equal(app.get("class").value, classValue);
    assert.deepEqual(ids(app), people);
    const link = doc(app).querySelector("[data-care-student]");
    link.click();
    assert.equal(app.get("student").value, people[0]);
    doc(app).querySelector("[data-return-class]").click();
    assert.deepEqual(ids(app), people);
    app.get("tab-group").click();
    assert.equal(
      doc(app).querySelector(".care-matrix table").textContent,
      matrix,
    );
  }
  assert.equal(
    C.careSummary(C.parseTable(matrixFixture()).students).cases.length,
    4,
  );
});
test("celdas sin datos o con cero no ofrecen enlaces que aparenten casos", async (t) => {
  const app = createApp(t);
  await app.load([
    headers,
    row({ "Usuario Id": "A", Curso: "Control", Grupo: "A", uce: log("Sí") }),
  ]);
  assert.equal(doc(app).querySelectorAll(".care-matrix td button").length, 0);
  assert.match(
    doc(app).querySelector(".care-matrix table").textContent,
    /Sin datos/,
  );
  doc(app).querySelector('[data-care-scope="missing"]').click();
  assert.deepEqual(ids(app), ["A"]);
  assert.equal(
    C.careCategory({ requested: true, peerReports: null }),
    "missing",
  );
});
test("borradores se conservan por vista sin guardar, incluir en resumen ni interpretar HTML", async (t) => {
  const app = createApp(t);
  await app.load(matrixFixture());
  app.get("tab-list").click();
  let form = doc(app).querySelector("[data-sheet-feedback]");
  change(app, form.elements.namedItem("rating"), "4");
  const comment = "Pendiente <img src=x onerror=alert(1)>";
  form.elements.namedItem("comment").value = comment;
  form.elements
    .namedItem("comment")
    .dispatchEvent(new app.window.Event("input", { bubbles: true }));
  assert.match(
    form.querySelector(".feedback-note").textContent,
    /Cambios pendientes/,
  );
  assert.equal(app.get("review-open").disabled, true);
  app.get("tab-group").click();
  assert.equal(doc(app).querySelector('[name="comment"]').value, "");
  app.get("tab-list").click();
  form = doc(app).querySelector("[data-sheet-feedback]");
  assert.equal(form.elements.namedItem("rating").value, "4");
  assert.equal(form.elements.namedItem("comment").value, comment);
  assert.equal(doc(app).querySelector(".sheet-feedback").open, true);
  assert.equal(doc(app).querySelector(".sheet-feedback img"), null);
  form.dispatchEvent(
    new app.window.Event("submit", { bubbles: true, cancelable: true }),
  );
  assert.equal(app.get("review-open").textContent, "Mi revisión (1)");
  form.elements.namedItem("comment").value = "Cambios que no he guardado";
  form.elements
    .namedItem("comment")
    .dispatchEvent(new app.window.Event("input", { bubbles: true }));
  app.get("review-open").click();
  assert.match(app.get("review-content").textContent, /Pendiente <img/);
  assert.doesNotMatch(
    app.get("review-content").textContent,
    /Cambios que no he guardado/,
  );
  app.get("summary-close").click();
  app.get("clear").click();
  app.get("summary-close").click();
  await app.load(matrixFixture());
  app.get("tab-list").click();
  assert.equal(doc(app).querySelector('[name="comment"]').value, "");
  assert.equal(app.get("list-scope").value, "all");
  assert.equal(app.get("review-open").disabled, true);
});
test("los borradores individuales no se confunden al cambiar de estudiante y se retiran al sustituir", async (t) => {
  const app = createApp(t);
  await app.load(matrixFixture());
  app.get("tab-student").click();
  app.change("student", "A");
  const form = doc(app).querySelector("[data-sheet-feedback]");
  form.elements.namedItem("comment").value = "Borrador de una ficha";
  form.elements
    .namedItem("comment")
    .dispatchEvent(new app.window.Event("input", { bubbles: true }));
  app.change("student", "B");
  assert.equal(doc(app).querySelector('[name="comment"]').value, "");
  app.change("student", "A");
  assert.equal(
    doc(app).querySelector('[name="comment"]').value,
    "Borrador de una ficha",
  );
  await app.selectFile();
  assert.equal(doc(app).querySelector('[name="comment"]'), null);
  assert.equal(app.get("review-content").textContent, "");
});
test("frecuencias válidas se normalizan y respuestas desconocidas siguen visibles y fuera de las tasas", async (t) => {
  const table = [
    headers,
    row({
      "Usuario Id": "A",
      Curso: "Control",
      Grupo: "A",
      alone: log("Muchísimo"),
      fun: log("Casi Nunca"),
      uce: log("Quizás"),
      abandono: log("No"),
    }),
  ];
  const model = C.parseTable(table),
    s = model.students[0],
    a = C.summary(model.students);
  assert.equal(s.responses.alone, "Muchísimo");
  assert.equal(s.responses.fun, "Casi nunca");
  assert.equal(s.care.requested, null);
  assert.equal(model.warnings.responses, 2);
  assert.deepEqual(a.loneliness, {
    count: null,
    denominator: 0,
    percent: null,
  });
  assert.equal(a.lowEnjoyment.count, 1);
  assert.equal(a.lowEnjoyment.denominator, 1);
  const app = createApp(t);
  await app.load(table);
  assert.match(app.get("consultation-quality").textContent, /2 incidencias/);
  app.get("tab-student").click();
  assert.match(
    doc(app).querySelector(".student-overview").textContent,
    /Muchísimo/,
  );
});
test("la lectura inicial tiene límite y no admite un resultado tardío tras caducar", async (t) => {
  let expire, finish;
  const app = createApp(t, {
    setup: (w) => {
      w.setTimeout = (f) => {
        expire = f;
        return 1;
      };
      w.clearTimeout = () => {};
    },
  });
  const pending = app.selectFile({
    name: "control.xlsx",
    size: 100,
    arrayBuffer: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  assert.equal(
    typeof expire,
    "function",
    "Timeout begins before arrayBuffer resolves",
  );
  expire();
  assert.match(app.get("error").textContent, /tardado demasiado/);
  finish(new ArrayBuffer(8));
  await pending;
  assert.equal(
    app.workers.length,
    0,
    "Late bytes cannot restore the abandoned read",
  );
  assert.equal(app.get("open").disabled, true);
  assert.equal(app.get("consultation").hidden, true);
});
test("opciones múltiples se muestran separadas, sin duplicados ni HTML ejecutable", async (t) => {
  const app = createApp(t);
  await app.load([
    headers,
    row({
      "Usuario Id": "A",
      Curso: "Control",
      Grupo: "A",
      "Te has apuntado a actividades": log(
        "Deportes | Deportes | Teatro <img src=x>",
      ),
      motivoasig: log("Organización | Comprensión"),
    }),
  ]);
  app.get("tab-student").click();
  const cards = [...doc(app).querySelectorAll(".response-card")];
  const activities = cards.find(
    (el) => el.querySelector("h4").textContent === "Actividades universitarias",
  );
  assert.deepEqual(
    [...activities.querySelectorAll("li")].map((el) => el.textContent),
    ["Deportes", "Teatro <img src=x>"],
  );
  assert.equal(activities.querySelector("img"), null);
  assert.doesNotMatch(activities.textContent, /\|/);
});
