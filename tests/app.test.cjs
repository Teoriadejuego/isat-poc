const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("./helpers/app-harness.cjs");
const { fixture } = require("./helpers/fixture.cjs");

test("una tasa positiva muy pequeña no se presenta como cero", async (t) => {
  const app = createApp(t);
  await app.load(fixture());
  const worker = app.workers.at(-1);
  const message = worker.message;
  const C = require("../src/core.js"),
    model = C.parseTable(fixture());
  for (const group of model.groups) {
    group.summary = C.summary(group.rows);
    group.summary.rejection = {
      count: 1,
      denominator: 5000,
      percent: 0.02,
      unit: "elecciones posibles",
    };
  }
  worker.emit({ type: "parsed", requestId: message.requestId, model });
  assert.match(app.get("report").textContent, /<0,1 %/);
});

test("cierre elimina fichas, etiquetas personales, filtros y archivo de consulta", async (t) => {
  const app = createApp(t);
  await app.load(fixture());
  app.get("tab-student").click();
  app.change("class", '["1","PSI","A"]');
  app.get("search").value = "Persona";
  app.get("search").dispatchEvent(new app.window.Event("input"));
  assert.match(app.get("student").textContent, /Persona Prueba/);
  app.get("clear").click();
  assert.equal(app.get("consultation").hidden, true);
  for (const id of ["student", "class", "study", "sheet"])
    assert.equal(app.get(id).options.length, 0);
  assert.equal(app.get("search").value, "");
  assert.doesNotMatch(
    app.get("report").textContent,
    /Persona Prueba|Historia sintética/,
  );
  assert.equal(app.get("filename").textContent, "Ningún archivo seleccionado");
});

test("se puede cancelar antes de abrir y un lector antiguo no restaura la consulta", async (t) => {
  const app = createApp(t);
  const worker = await app.selectFile();
  assert.equal(app.get("clear").hidden, false);
  app.get("clear").click();
  assert.equal(worker.terminated, true);
  worker.emit({ sheets: [{ name: "Users", rows: fixture() }] });
  assert.equal(app.get("open").disabled, true);
  assert.equal(app.get("sheet").options.length, 0);
  assert.equal(app.get("consultation").hidden, true);
});

test("sustitución invalida nombres anteriores y cancelación funciona tras error de hoja", async (t) => {
  const app = createApp(t);
  await app.load(fixture());
  app.get("tab-student").click();
  app.change("class", '["1","PSI","A"]');
  await app.selectFile({
    name: "nuevo.xlsx",
    size: 100,
    arrayBuffer: async () => new ArrayBuffer(8),
  });
  assert.equal(app.get("student").options.length, 0);
  assert.equal(app.get("consultation").hidden, true);
  app.workers
    .at(-1)
    .emit({ sheets: [{ name: "Users", rows: [["Texto"], ["Sintético"]] }] });
  app.get("open").click();
  assert.notEqual(app.get("error").textContent, "");
  assert.equal(app.get("clear").hidden, false);
  app.get("clear").click();
  assert.equal(app.get("sheet").options.length, 0);
});

test("pagehide retira también el informe y los nombres antes de entrar en historial", async (t) => {
  const app = createApp(t);
  await app.load(fixture());
  app.get("tab-student").click();
  app.change("class", '["1","PSI","A"]');
  app.window.dispatchEvent(
    new app.window.PageTransitionEvent("pagehide", { persisted: true }),
  );
  assert.equal(app.get("student").options.length, 0);
  assert.equal(app.get("consultation").hidden, true);
  assert.doesNotMatch(
    app.get("report").textContent,
    /Historia sintética|Persona Prueba/,
  );
});

test("ficha individual sin familia, historia al final y estado de encuesta destacado", async (t) => {
  const app = createApp(t);
  await app.load(fixture());
  app.get("tab-student").click();
  app.change("class", '["1","PSI","A"]');
  app.change("student", "S01");
  assert.equal(
    app.window.document.querySelector(".survey-status").textContent,
    "Encuesta completada",
  );
  assert.doesNotMatch(
    app.get("report").textContent,
    /Contexto familiar|Número de hermanos|Número de hermanas|Posición entre/,
  );
  assert.equal(
    app.window.document.querySelector("#report .section-panel:last-child h3")
      .textContent,
    "Su historia",
  );
  assert.equal(
    app.window.document.querySelector(
      "#report .section-panel:last-child .section-number",
    ).textContent,
    "04",
  );
  assert.equal(app.window.document.querySelector(".story img"), null);
  app.change("student", "S02");
  assert.equal(
    app.window.document.querySelector(".survey-status").textContent,
    "Encuesta en curso",
  );
  app.change("class", '["1","ENF","B"]');
  assert.equal(
    app.window.document.querySelector(".survey-status").textContent,
    "Sin inicio registrado",
  );
});

test("grupo distingue tres sentidos de bienestar y muestra estados de participación", async (t) => {
  const app = createApp(t);
  await app.load(fixture());
  app.change("class", '["1","PSI","A"]');
  const report = app.get("report").textContent;
  assert.match(report, /Poco disfrute con sus amistades/);
  assert.match(report, /Experiencia universitaria poco positiva/);
  assert.match(report, /Nunca o casi nunca/);
  assert.match(report, /Completadas/);
  assert.match(report, /En curso/);
  assert.match(report, /Sin inicio registrado/);
  assert.match(report, /Peticiones y menciones de ayuda/);
  assert.doesNotMatch(report, /Identifican a quién acudir/);
});

test("la preparación se cancela y su respuesta tardía no vuelve a mostrar historias", async (t) => {
  const app = createApp(t),
    worker = await app.selectFile();
  worker.emit({ sheets: [{ name: "Users", rows: fixture() }] });
  worker.autoParse = false;
  app.get("open").click();
  assert.equal(app.get("sheet").disabled, true);
  assert.match(app.get("clear").textContent, /Cancelar preparación/);
  app.get("clear").click();
  worker.finishParse();
  assert.equal(app.get("consultation").hidden, true);
  assert.equal(app.get("student").options.length, 0);
  assert.doesNotMatch(app.get("report").textContent, /Historia sintética/);
});

test("cancelar mientras se lee el archivo impide iniciar un Worker tardío", async (t) => {
  const app = createApp(t);
  let finish;
  const pending = app.selectFile({
    name: "prueba.xlsx",
    size: 100,
    arrayBuffer: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  assert.equal(app.get("clear").hidden, false);
  app.get("clear").click();
  finish(new ArrayBuffer(8));
  await pending;
  assert.equal(app.workers.length, 0);
  assert.equal(app.get("open").disabled, true);
});

test("teclado cambia pestañas, búsqueda anuncia resultados y cierre devuelve foco", async (t) => {
  const app = createApp(t);
  await app.load(fixture());
  assert.equal(app.window.document.activeElement.id, "tab-group");
  app.get("tab-group").dispatchEvent(
    new app.window.KeyboardEvent("keydown", {
      key: "ArrowRight",
      bubbles: true,
    }),
  );
  assert.equal(app.get("tab-list").getAttribute("aria-selected"), "true");
  assert.equal(app.window.document.activeElement.id, "tab-list");
  app
    .get("tab-list")
    .dispatchEvent(
      new app.window.KeyboardEvent("keydown", {
        key: "ArrowRight",
        bubbles: true,
      }),
    );
  assert.equal(app.get("tab-student").getAttribute("aria-selected"), "true");
  assert.equal(app.window.document.activeElement.id, "tab-student");
  assert.equal(app.get("report").tabIndex, 0);
  app.get("search").value = "sin coincidencias";
  app.get("search").dispatchEvent(new app.window.Event("input"));
  assert.equal(app.get("student").options.length, 0);
  assert.match(app.get("view-announcement").textContent, /No hay estudiantes/);
  app.get("clear").click();
  assert.equal(app.window.document.activeElement.id, "file");
});
