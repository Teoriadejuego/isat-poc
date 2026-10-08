const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("./helpers/app-harness.cjs");
const { headers, log, row } = require("./helpers/fixture.cjs");

function listFixture() {
  return [
    headers,
    ...[
      {
        "Usuario Id": "S01",
        Nombre: "Álex Prueba",
        uce: log("Sí"),
        ayuda: log("Nadie"),
        redes1: log("S02 (Buena relación)"),
        alone: log("Nunca"),
        fun: log("Siempre"),
        general: log("Casi siempre"),
        end: log(""),
      },
      {
        "Usuario Id": "S02",
        Nombre: "Álex Prueba",
        uce: log("No"),
        ayuda: log("S03"),
        redes1: log("S01 (Mala relación)"),
        alone: log("Siempre"),
        start: log(""),
      },
      {
        "Usuario Id": "S03",
        Nombre: "Bea Prueba",
        uce: log("No"),
        ayuda: log("Nadie"),
        redes1: log("Nadie"),
        alone: log("Casi nunca"),
      },
      {
        "Usuario Id": "S04",
        Nombre: "Cris Prueba",
        ayuda: log("S03"),
        redes1: log("Nadie"),
      },
    ].map((values) =>
      row({
        Estudio: "1",
        Curso: "PSI",
        Grupo: "A",
        dia: log("Par"),
        ...values,
      }),
    ),
  ];
}
const doc = (app) => app.window.document;
const ids = (app) =>
  Array.from(
    doc(app).querySelectorAll("[data-list-student]"),
    (el) => el.dataset.listStudent,
  );
const sort = (app, key) =>
  doc(app).querySelector(`[data-sort="${key}"]`).click();
const cell = (app, id, column) =>
  Array.from(doc(app).querySelectorAll("[data-cell-key]")).find(
    (el) => el.dataset.cellKey === JSON.stringify([id, column]),
  );
function changeElement(app, element, value) {
  element.value = value;
  element.dispatchEvent(new app.window.Event("change", { bubbles: true }));
}

test("carga y consulta son pantallas separadas; volver a datos conserva la vista", async (t) => {
  const app = createApp(t);
  assert.equal(app.get("data-screen").hidden, false);
  assert.equal(app.get("report").hidden, true);
  await app.load(listFixture());
  assert.equal(app.get("data-screen").hidden, true);
  assert.equal(app.get("report").hidden, false);
  assert.equal(doc(app).querySelectorAll('[role="tab"]').length, 3);
  app.get("tab-list").click();
  app.get("show-data").click();
  assert.equal(app.get("data-screen").hidden, false);
  assert.equal(app.get("consultation").hidden, true);
  app.get("back-consultation").click();
  assert.equal(app.get("data-screen").hidden, true);
  assert.equal(app.get("tab-list").getAttribute("aria-selected"), "true");
  assert.match(app.get("dataset-summary").textContent, /4 estudiantes/);
});

test("lista completa prioriza ayuda sin excluir encuestas incompletas y filtra por el criterio", async (t) => {
  const app = createApp(t);
  await app.load(listFixture());
  doc(app).querySelector("[data-open-list]").click();
  assert.deepEqual(ids(app), ["S01", "S03", "S02", "S04"]);
  assert.equal(cell(app, "S03", "peer").querySelector("span").textContent, "2");
  assert.equal(
    cell(app, "S04", "requested").querySelector("span").textContent,
    "No",
  );
  changeElement(app, app.get("list-scope"), "care");
  assert.deepEqual(ids(app), ["S01", "S03"]);
  app.get("search").value = "S03";
  app.get("search").dispatchEvent(new app.window.Event("input"));
  assert.deepEqual(ids(app), ["S03"]);
});

test("orden numérico en ambos sentidos, ausencias siempre al final y tres ítems separados", async (t) => {
  const app = createApp(t);
  const worker = await app.load(listFixture());
  const C = require("../src/core.js");
  const model = C.parseTable(listFixture());
  for (const g of model.groups) g.summary = C.summary(g.rows);
  [10, 2, null, 0].forEach(
    (value, i) => (model.students[i].metrics.friendsDeclared = value),
  );
  worker.emit({ type: "parsed", requestId: worker.message.requestId, model });
  app.get("tab-list").click();
  const checkbox = app.get("list-extra");
  checkbox.checked = true;
  checkbox.dispatchEvent(new app.window.Event("change", { bubbles: true }));
  sort(app, "friendsDeclared");
  assert.deepEqual(ids(app), ["S04", "S02", "S01", "S03"]);
  sort(app, "friendsDeclared");
  assert.deepEqual(ids(app), ["S01", "S02", "S04", "S03"]);
  assert.equal(
    doc(app)
      .querySelector('[data-sort="friendsDeclared"]')
      .parentElement.getAttribute("aria-sort"),
    "descending",
  );
  for (const field of ["alone", "fun", "general"])
    assert.ok(cell(app, "S01", field));
  assert.doesNotMatch(app.get("report").textContent, /Felicidad|Índice global/);
});

test("se muestran códigos y ficha y retorno conservan búsqueda y filtro", async (t) => {
  const app = createApp(t);
  await app.load(listFixture());
  app.get("tab-list").click();
  app.get("search").value = "S0";
  app.get("search").dispatchEvent(new app.window.Event("input"));
  assert.equal(ids(app).length, 4);
  assert.doesNotMatch(app.get("report").textContent, /Álex Prueba|Bea Prueba/);
  doc(app).querySelector('[data-care-student="S02"]').click();
  assert.equal(app.get("student").value, "S02");
  assert.match(
    doc(app).querySelector(".student-care").textContent,
    /Petición propia de ayudaNo/,
  );
  assert.match(
    doc(app).querySelector("[data-return-class]").textContent,
    /lista de estudiantes/,
  );
  doc(app).querySelector("[data-return-class]").click();
  assert.equal(app.get("tab-list").getAttribute("aria-selected"), "true");
  assert.equal(app.get("search").value, "S0");
  assert.equal(ids(app).length, 4);
  assert.equal(app.window.location.hash, "");
});

test("reacciones editables y confianza neutra se mantienen al cambiar de vista y de pantalla", async (t) => {
  const app = createApp(t);
  await app.load(listFixture());
  app.get("tab-list").click();
  cell(app, "S01", "requested").click();
  assert.equal(app.get("cell-review").open, true);
  doc(app).querySelector('[data-reaction="Revisar"]').click();
  assert.equal(app.get("cell-review").open, false);
  assert.match(cell(app, "S01", "requested").textContent, /Revisar/);
  changeElement(app, doc(app).querySelector('[data-confidence="S01"]'), "0");
  app.get("show-data").click();
  app.get("back-consultation").click();
  app.get("tab-group").click();
  app.get("tab-list").click();
  assert.equal(doc(app).querySelector('[data-confidence="S01"]').value, "0");
  assert.match(cell(app, "S01", "requested").textContent, /Revisar/);
  cell(app, "S01", "requested").click();
  app.get("remove-reaction").click();
  assert.doesNotMatch(cell(app, "S01", "requested").textContent, /Revisar/);
});

test("lista sin etiqueta repetida y deslizador que distingue sin valorar de cero", async (t) => {
  const app = createApp(t);
  await app.load(listFixture());
  app.get("tab-list").click();
  assert.doesNotMatch(
    app.get("report").textContent,
    /Petición propia o ≥2 menciones/,
  );
  assert.equal(doc(app).querySelector(".list-priority"), null);
  const slider = doc(app).querySelector('[data-confidence="S01"]');
  assert.equal(slider.type, "range");
  assert.equal(slider.min, "-5");
  assert.equal(slider.max, "5");
  assert.equal(slider.step, "1");
  assert.equal(slider.getAttribute("aria-valuetext"), "Sin valorar");
  assert.equal(app.get("review-open").disabled, true);
  doc(app).querySelector('[data-confidence-action="S01"]').click();
  assert.equal(
    doc(app)
      .querySelector('[data-confidence="S01"]')
      .getAttribute("aria-valuetext"),
    "0",
  );
  assert.equal(app.get("review-open").textContent, "Mi revisión (1)");
  app.get("review-open").click();
  assert.match(app.get("review-content").textContent, /S010/);
  app.get("summary-close").click();
  doc(app).querySelector('[data-confidence-action="S01"]').click();
  assert.equal(
    doc(app)
      .querySelector('[data-confidence="S01"]')
      .getAttribute("aria-valuetext"),
    "Sin valorar",
  );
  assert.equal(app.get("review-open").disabled, true);
  changeElement(app, app.get("list-scope"), "care");
  assert.deepEqual(ids(app), ["S01", "S03"]);
});

test("arrastrar actualiza confianza sin reconstruir el control y conserva el último valor", async (t) => {
  const app = createApp(t);
  await app.load(listFixture());
  app.get("tab-list").click();
  const slider = doc(app).querySelector('[data-confidence="S01"]');
  for (const value of ["-5", "0", "5"]) {
    slider.value = value;
    slider.dispatchEvent(new app.window.Event("input", { bubbles: true }));
    assert.equal(doc(app).querySelector('[data-confidence="S01"]'), slider);
    assert.equal(
      slider.getAttribute("aria-valuetext"),
      value === "5" ? "+5" : value,
    );
    assert.equal(
      slider.closest(".confidence-control").classList.contains("is-unrated"),
      false,
    );
    assert.match(
      doc(app)
        .querySelector('[data-confidence-action="S01"]')
        .getAttribute("aria-label"),
      /Quitar/,
    );
    assert.equal(app.get("review-open").textContent, "Mi revisión (1)");
  }
  app.get("tab-group").click();
  app.get("tab-list").click();
  assert.equal(doc(app).querySelector('[data-confidence="S01"]').value, "5");
  assert.equal(
    doc(app)
      .querySelector('[data-confidence="S01"]')
      .getAttribute("aria-valuetext"),
    "+5",
  );
  await app.load(listFixture());
  app.get("tab-list").click();
  assert.equal(
    doc(app)
      .querySelector('[data-confidence="S01"]')
      .getAttribute("aria-valuetext"),
    "Sin valorar",
  );
  assert.equal(app.get("review-open").disabled, true);
});

test("confianza ordena ambos extremos y cero, y al quitarla pasa a las ausencias", async (t) => {
  const app = createApp(t);
  await app.load(listFixture());
  app.get("tab-list").click();
  for (const [id, value] of [
    ["S01", "-5"],
    ["S02", "0"],
    ["S03", "5"],
  ])
    changeElement(
      app,
      doc(app).querySelector(`[data-confidence="${id}"]`),
      value,
    );
  sort(app, "confidence");
  assert.deepEqual(ids(app), ["S01", "S02", "S03", "S04"]);
  sort(app, "confidence");
  assert.deepEqual(ids(app), ["S03", "S02", "S01", "S04"]);
  doc(app).querySelector('[data-confidence-action="S03"]').click();
  assert.deepEqual(ids(app), ["S02", "S01", "S03", "S04"]);
  assert.equal(doc(app).activeElement.dataset.confidence, "S03");
  assert.equal(app.get("review-open").textContent, "Mi revisión (2)");
});

test("cierre muestra revisión codificada, retira fichas y al cerrar el resumen no queda contenido", async (t) => {
  const app = createApp(t);
  await app.load(listFixture());
  app.get("tab-list").click();
  cell(app, "S01", "requested").click();
  doc(app).querySelector('[data-reaction="OK"]').click();
  changeElement(app, doc(app).querySelector('[data-confidence="S01"]'), "5");
  const form = doc(app).querySelector("[data-sheet-feedback]");
  form.elements.namedItem("rating").value = "4";
  form.elements.namedItem("comment").value =
    "Texto de prueba <img src=x onerror=alert(1)>";
  form.dispatchEvent(
    new app.window.Event("submit", { bubbles: true, cancelable: true }),
  );
  app.get("clear").click();
  assert.equal(app.get("consultation").hidden, true);
  assert.equal(app.get("student").options.length, 0);
  assert.equal(app.get("review-summary").open, true);
  assert.match(app.get("review-content").textContent, /S01/);
  assert.match(app.get("review-content").textContent, /G001/);
  assert.match(app.get("review-content").textContent, /4\/5/);
  assert.doesNotMatch(app.get("review-content").textContent, /Álex Prueba|PSI/);
  assert.equal(app.get("review-content").querySelector("img"), null);
  app.get("summary-close").click();
  assert.equal(app.get("review-content").textContent, "");
  assert.equal(app.get("review-summary").open, false);
  assert.equal(doc(app).activeElement.id, "file");
});

test("otra consulta y navegación de historial no recuperan valoraciones ni cuadros abiertos", async (t) => {
  const app = createApp(t);
  await app.load(listFixture());
  app.get("tab-list").click();
  cell(app, "S01", "requested").click();
  doc(app).querySelector('[data-reaction="Me sorprende"]').click();
  await app.load(listFixture());
  app.get("tab-list").click();
  assert.doesNotMatch(
    cell(app, "S01", "requested").textContent,
    /Me sorprende/,
  );
  cell(app, "S01", "requested").click();
  assert.match(app.get("cell-review-context").textContent, /S01/);
  assert.doesNotMatch(app.get("cell-review-context").textContent, /Álex/);
  app.window.dispatchEvent(
    new app.window.PageTransitionEvent("pagehide", { persisted: true }),
  );
  assert.equal(app.get("cell-review-context").textContent, "");
  assert.equal(app.get("cell-review").open, false);
  assert.equal(app.get("review-content").textContent, "");
  assert.equal(app.get("report").hidden, true);
});

test("paginación limita filas y buscar o reordenar vuelve a la primera página", async (t) => {
  const app = createApp(t);
  const table = [
    headers,
    ...Array.from({ length: 65 }, (_, i) =>
      row({
        "Usuario Id": "X" + String(i + 1).padStart(3, "0"),
        Curso: "PSI",
        Grupo: "A",
        Nombre: "Prueba " + (i + 1),
      }),
    ),
  ];
  await app.load(table);
  app.get("tab-list").click();
  assert.equal(ids(app).length, 50);
  doc(app).querySelector('[data-list-page="1"]').click();
  assert.equal(ids(app).length, 15);
  sort(app, "student");
  assert.equal(ids(app).length, 50);
  app.get("search").value = "X065";
  app.get("search").dispatchEvent(new app.window.Event("input"));
  assert.deepEqual(ids(app), ["X065"]);
});
