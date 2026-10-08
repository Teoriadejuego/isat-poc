const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("./helpers/app-harness.cjs");
const { fixture } = require("./helpers/fixture.cjs");
const { relationsFixture } = require("./helpers/relations-fixture.cjs");
const doc = (app) => app.window.document;
function clockApp(t) {
  let now = 1_000_000;
  let tick;
  const app = createApp(t, {
    setup(window) {
      window.Date.now = () => now;
      window.setInterval = (fn) => {
        tick = fn;
        return 1;
      };
    },
  });
  return {
    ...app,
    advance(ms) {
      now += ms;
    },
    tick() {
      tick();
    },
  };
}
const react = (app, value) => {
  app.change("class", '["1","PSI","A"]');
  [...doc(app).querySelectorAll("[data-cell-key]")]
    .find((el) => JSON.parse(el.dataset.cellKey)[0] === "S01")
    .click();
  doc(app).querySelector(`[data-reaction="${value}"]`).click();
};

test("resumen individual prioriza ayuda y separa detalles sin ocultar la historia", async (t) => {
  const app = createApp(t);
  await app.load(fixture());
  app.get("tab-student").click();
  app.change("class", '["1","PSI","A"]');
  app.change("student", "S01");
  const body = doc(app).querySelector(".report-body");
  assert.ok(
    body
      .querySelector(".student-care")
      .compareDocumentPosition(body.querySelector(".student-overview")) &
      app.window.Node.DOCUMENT_POSITION_FOLLOWING,
  );
  assert.equal(body.querySelector(".expanded-indicators").open, false);
  assert.equal(body.querySelectorAll(".overview-panel").length, 2);
  assert.match(
    body.querySelector(".student-overview").textContent,
    /Soledad|Disfrute|Cómo le ha ido/,
  );
  assert.doesNotMatch(
    body.querySelector(".student-overview").textContent,
    /Felicidad|\/10/,
  );
  assert.equal(body.querySelector(".story").closest("details"), null);
  assert.equal(
    body.lastElementChild.querySelector("h3").textContent,
    "Su historia",
  );
});

test("resumen conserva ausencias y explicaciones añadidas de relaciones y predicciones", async (t) => {
  const app = createApp(t);
  await app.load(relationsFixture());
  app.get("tab-student").click();
  app.change("student", "P001");
  const overview = doc(app).querySelector(".student-overview");
  assert.match(overview.textContent, /Positivas declaradas0/);
  assert.match(
    doc(app).querySelector(".participation-note").textContent,
    /no equivale a cero/,
  );
  const details = doc(app).querySelector(".expanded-indicators");
  details.open = true;
  details.dispatchEvent(new app.window.Event("toggle"));
  assert.match(details.textContent, /3de 8 verificables/);
  assert.equal(doc(app).querySelector(".story"), null);
  assert.doesNotMatch(
    doc(app).querySelector(".student-care").textContent,
    /Persona de control/,
  );
});

test("ampliación se recuerda por estudiante durante la consulta y se reinicia al sustituir", async (t) => {
  const app = createApp(t);
  await app.load(fixture());
  app.get("tab-student").click();
  app.change("class", '["1","PSI","A"]');
  app.change("student", "S01");
  const first = doc(app).querySelector(".expanded-indicators");
  first.open = true;
  first.dispatchEvent(new app.window.Event("toggle"));
  app.change("student", "S02");
  assert.equal(doc(app).querySelector(".expanded-indicators").open, false);
  app.change("student", "S01");
  assert.equal(doc(app).querySelector(".expanded-indicators").open, true);
  await app.load(fixture());
  app.get("tab-student").click();
  app.change("class", '["1","PSI","A"]');
  app.change("student", "S01");
  assert.equal(doc(app).querySelector(".expanded-indicators").open, false);
});

test("repetir reacción la retira y Mi revisión se actualiza en cualquier vista", async (t) => {
  const app = createApp(t);
  assert.equal(app.get("review-open").hidden, true);
  await app.load(fixture());
  assert.equal(app.get("review-open").disabled, true);
  app.get("tab-list").click();
  react(app, "Revisar");
  assert.equal(app.get("review-open").textContent, "Mi revisión (1)");
  react(app, "Revisar");
  assert.equal(app.get("review-open").disabled, true);
  assert.equal(doc(app).querySelectorAll(".cell-reaction").length, 0);
  react(app, "OK");
  app.get("tab-group").click();
  app.get("review-open").click();
  assert.equal(app.get("review-summary").open, true);
  assert.match(app.get("review-content").textContent, /OK/);
  assert.doesNotMatch(app.get("review-content").textContent, /Persona Prueba/);
  app.get("summary-close").click();
  app.get("show-data").click();
  assert.equal(app.get("review-open").hidden, false);
  app.get("review-open").focus();
  app.get("review-open").click();
  assert.equal(app.get("review-summary").open, true);
  app.get("summary-close").click();
  assert.equal(doc(app).activeElement.id, "review-open");
  app.get("clear").click();
  assert.equal(app.get("review-open").hidden, true);
});

test("guía accesible abre y cierra por Escape sin retirar datos y devuelve foco", async (t) => {
  const app = createApp(t);
  app.get("help-open").focus();
  app.get("help-open").click();
  assert.equal(app.get("help-dialog").open, true);
  assert.equal(doc(app).activeElement.id, "help-close");
  assert.match(
    app.get("help-dialog").textContent,
    /al menos dos\s+personas\s+distintas/,
  );
  app
    .get("help-dialog")
    .dispatchEvent(new app.window.Event("cancel", { cancelable: true }));
  assert.equal(doc(app).activeElement.id, "help-open");
  await app.load(fixture());
  app.change("class", '["1","PSI","A"]');
  app.get("help-open").click();
  app.get("help-close").click();
  assert.equal(app.get("consultation").hidden, false);
  assert.equal(app.get("student").options.length, 2);
});

test("aviso al minuto final permite continuar y caduca exactamente a los quince minutos", async (t) => {
  const app = clockApp(t);
  await app.load(fixture());
  app.advance(14 * 60_000 - 1);
  app.tick();
  assert.equal(app.get("idle-warning").hidden, true);
  app.advance(1);
  app.tick();
  assert.equal(app.get("idle-warning").hidden, false);
  app.get("idle-continue").click();
  assert.equal(app.get("idle-warning").hidden, true);
  app.advance(15 * 60_000 - 1);
  app.tick();
  assert.equal(app.get("consultation").hidden, false);
  app.advance(1);
  app.tick();
  assert.equal(app.get("consultation").hidden, true);
  assert.equal(app.get("student").options.length, 0);
  assert.equal(app.workers.at(-1).terminated, true);
  assert.match(app.get("status").textContent, /15 minutos sin actividad/);
});

test("actividad normal renueva el plazo pero no rescata una consulta ya caducada", async (t) => {
  const app = clockApp(t);
  await app.load(fixture());
  app.advance(14 * 60_000);
  doc(app).dispatchEvent(new app.window.Event("keydown"));
  app.advance(60_000);
  app.tick();
  assert.equal(app.get("consultation").hidden, false);
  app.advance(14 * 60_000);
  doc(app).dispatchEvent(new app.window.Event("pointerdown"));
  assert.equal(app.get("consultation").hidden, true);
  assert.equal(app.get("back-consultation").hidden, true);
});

test("volver a una pestaña caducada retira datos, valoraciones, guía y cuadros abiertos", async (t) => {
  const app = clockApp(t);
  await app.load(fixture());
  app.get("tab-list").click();
  react(app, "OK");
  app.get("review-open").click();
  app.advance(15 * 60_000);
  Object.defineProperty(doc(app), "hidden", {
    value: false,
    configurable: true,
  });
  doc(app).dispatchEvent(new app.window.Event("visibilitychange"));
  assert.equal(app.get("review-summary").open, false);
  assert.equal(app.get("review-content").textContent, "");
  assert.equal(app.get("review-open").hidden, true);
  assert.equal(app.get("file").value, "");
  assert.doesNotMatch(
    app.get("report").textContent,
    /Persona Prueba|Historia sintética/,
  );
});

test("resumen tras cierre manual también caduca y no conserva códigos ni comentarios", async (t) => {
  const app = clockApp(t);
  await app.load(fixture());
  app.get("tab-list").click();
  react(app, "Me sorprende");
  app.get("clear").click();
  assert.equal(app.get("review-summary").open, true);
  assert.match(app.get("review-content").textContent, /S01/);
  app.advance(15 * 60_000);
  app.tick();
  assert.equal(app.get("review-summary").open, false);
  assert.equal(app.get("review-content").textContent, "");
});

test("archivo leído sin abrir fichas se retira por inactividad y el lector antiguo no lo restaura", async (t) => {
  const app = clockApp(t);
  const worker = await app.selectFile();
  worker.emit({ sheets: [{ name: "Users", rows: fixture() }] });
  app.advance(15 * 60_000);
  app.tick();
  assert.equal(worker.terminated, true);
  assert.equal(app.get("open").disabled, true);
  assert.equal(app.get("sheet").options.length, 0);
  worker.emit({ sheets: [{ name: "Users", rows: fixture() }] });
  assert.equal(app.get("open").disabled, true);
});
