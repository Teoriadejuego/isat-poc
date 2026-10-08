const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("./helpers/app-harness.cjs");
const { headers, row, log } = require("./helpers/fixture.cjs");
function sample() {
  return [
    headers,
    ...Array.from({ length: 54 }, (_, i) =>
      row({
        "Usuario Id": `S${String(i + 1).padStart(2, "0")}`,
        Curso: "Control",
        Grupo: "A",
        dia: log("Par"),
        uce: log(i === 3 ? "No" : "Sí"),
        ayuda: log("Nadie"),
        redes1: log("Nadie"),
        alone: log("Nunca"),
        fun: log("Siempre"),
        general: log("Siempre"),
      }),
    ),
  ];
}
const click = (app, selector) =>
  app.get("report").querySelector(selector).click();
test("buscar dentro de una ficha limita la navegación y la lista completa retira filtros anteriores", async (t) => {
  const app = createApp(t);
  await app.load(sample());
  click(app, '[data-care-scope="care"]');
  click(app, '[data-care-student="S01"]');
  app.get("search").value = "S02";
  app.get("search").dispatchEvent(new app.window.Event("input"));
  assert.equal(app.get("student").value, "S02");
  assert.equal(
    app.get("report").querySelector('[data-student-step="1"]').disabled,
    true,
  );
  assert.equal(
    app.get("report").querySelector('[data-student-step="-1"]').disabled,
    true,
  );
  app.get("tab-group").click();
  click(app, "[data-open-list]");
  assert.equal(app.get("list-scope").value, "all");
  assert.equal(app.get("search").value, "");
  assert.match(
    app.get("report").querySelector("caption").textContent,
    /54 de 54/,
  );
  click(app, '[data-list-page="1"]');
  assert.ok(app.get("report").querySelector('[data-list-student="S04"]'));
});
test("recorrido de ayuda conserva filtro, orden y página al avanzar entre fichas", async (t) => {
  const app = createApp(t);
  await app.load(sample());
  click(app, '[data-care-scope="care"]');
  assert.equal(app.get("list-scope").value, "care");
  click(app, '[data-sort="student"]');
  click(app, '[data-care-student="S03"]');
  click(app, '[data-student-step="1"]');
  assert.equal(
    app.get("student").value,
    "S05",
    "No entra quien queda fuera del filtro",
  );
  click(app, '[data-student-step="-1"]');
  assert.equal(app.get("student").value, "S03");
  click(app, "[data-return-class]");
  click(app, '[data-care-student="S51"]');
  click(app, '[data-student-step="1"]');
  assert.equal(app.get("student").value, "S52");
  click(app, "[data-return-class]");
  assert.equal(app.get("list-scope").value, "care");
  assert.equal(
    app.get("report").querySelector("[data-list-student]").dataset.listStudent,
    "S52",
  );
  click(app, '[data-care-student="S54"]');
  assert.equal(
    app.get("report").querySelector('[data-student-step="1"]').disabled,
    true,
  );
});
test("búsqueda y borradores se conservan al recorrer la lista filtrada", async (t) => {
  const app = createApp(t);
  await app.load(sample());
  app.get("tab-list").click();
  app.get("search").value = "S1";
  app.get("search").dispatchEvent(new app.window.Event("input"));
  click(app, '[data-care-student="S10"]');
  const form = app.get("report").querySelector("[data-sheet-feedback]");
  const comment = form.elements.namedItem("comment");
  comment.value = "Comentario de revisión";
  comment.dispatchEvent(new app.window.Event("input", { bubbles: true }));
  click(app, '[data-student-step="1"]');
  assert.equal(app.get("student").value, "S11");
  click(app, '[data-student-step="-1"]');
  assert.equal(
    app.get("report").querySelector('[name="comment"]').value,
    "Comentario de revisión",
  );
  click(app, "[data-return-class]");
  assert.equal(app.get("search").value, "S1");
});
test("detalle de grupo es opcional, conserva estado y se limpia al sustituir archivo", async (t) => {
  const app = createApp(t);
  await app.load(sample());
  const details = app.get("report").querySelector("[data-extra-group]");
  assert.equal(details.open, false);
  assert.equal(
    app.get("report").querySelector(".care-panel").closest("details"),
    null,
  );
  assert.equal(app.get("report").querySelectorAll(".rate-card").length, 8);
  details.open = true;
  details.dispatchEvent(new app.window.Event("toggle"));
  app.get("tab-list").click();
  app.get("tab-group").click();
  assert.equal(
    app.get("report").querySelector("[data-extra-group]").open,
    true,
  );
  await app.load(sample());
  assert.equal(
    app.get("report").querySelector("[data-extra-group]").open,
    false,
  );
  assert.equal(
    app.get("report").querySelector("article").lastElementChild.className,
    "participation-note",
  );
});
