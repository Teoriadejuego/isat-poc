const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../src/core.js");
const { createApp } = require("./helpers/app-harness.cjs");
const { headers, row, log } = require("./helpers/fixture.cjs");

const indicators = {
  loneliness: "alone",
  lowEnjoyment: "fun",
  lowUniversity: "general",
  difficulty: "difficulty",
  dropout: "dropout",
  time: "time",
  workload: "workload",
};
const report = (app) => app.get("report");
const click = (app, selector) => {
  const element = report(app).querySelector(selector);
  assert.ok(element, `Existe el control ${selector}`);
  element.click();
};
const listIds = (app) =>
  [...report(app).querySelectorAll("[data-list-student]")].map(
    (element) => element.dataset.listStudent,
  );

function indicatorFixture() {
  return [
    [...headers],
    ...[
      [
        "A01",
        "Siempre",
        "Nunca",
        "Nunca",
        "Sí",
        "Sí, alguna vez",
        "Mal",
        "Alta",
      ],
      [
        "A02",
        "Casi siempre",
        "Casi nunca",
        "Casi nunca",
        "Sí",
        "Sí, lo estoy considerando actualmente",
        "Muy mal",
        "Muy alta",
      ],
      [
        "A03",
        "Algunas veces",
        "Siempre",
        "Siempre",
        "No",
        "No",
        "Bien",
        "Adecuada",
      ],
      [
        "A04",
        "Sin clasificar",
        "Sin clasificar",
        "Sin clasificar",
        "Sin clasificar",
        "Sin clasificar",
        "Sin clasificar",
        "Sin clasificar",
      ],
      ["A05", null, null, null, null, null, null, null],
    ].map(([id, alone, fun, general, difficulty, dropout, time, workload]) =>
      row({
        "Usuario Id": id,
        Estudio: "Control",
        Curso: "Grado",
        Grupo: "A",
        dia: log("Par"),
        alone: alone === null ? null : log(alone),
        fun: fun === null ? null : log(fun),
        general: general === null ? null : log(general),
        dificultad: difficulty === null ? null : log(difficulty),
        abandono: dropout === null ? null : log(dropout),
        "Organización del tiempo": time === null ? null : log(time),
        "Carga de trabajo": workload === null ? null : log(workload),
      }),
    ),
  ];
}

test("cada indicador abre su lista y muestra la respuesta que justifica el filtro", async (t) => {
  const table = indicatorFixture();
  const group = C.parseTable(table).groups[0];
  const app = createApp(t);
  await app.load(table);
  assert.equal(
    report(app).querySelectorAll("[data-indicator-scope]").length,
    7,
  );
  for (const [key, field] of Object.entries(indicators)) {
    const expected = group.rows.filter((s) => C.indicatorMatches(s, key));
    assert.deepEqual(
      expected.map((s) => s.id),
      ["A01", "A02"],
    );
    click(app, `[data-indicator-scope="${key}"]`);
    assert.equal(app.get("tab-list").getAttribute("aria-selected"), "true");
    assert.equal(app.get("list-scope").value, "indicator:" + key);
    assert.equal(app.get("list-extra").checked, false);
    assert.deepEqual(
      [...listIds(app)].sort(),
      expected.map((s) => s.id),
    );
    const header = report(app).querySelector(`[data-sort="${field}"]`);
    assert.ok(
      header,
      "La columna del indicador está visible sin activar columnas extra",
    );
    const column = [...header.closest("tr").children].indexOf(
      header.closest("th"),
    );
    for (const student of expected) {
      const displayed = report(app).querySelector(
        `[data-list-student="${student.id}"]`,
      ).children[column].textContent;
      assert.ok(
        displayed.includes(student.responses[field]),
        "Se conserva la respuesta original",
      );
    }
    const orderedIds = listIds(app);
    click(app, `[data-care-student="${orderedIds[0]}"]`);
    assert.equal(app.get("student").value, orderedIds[0]);
    click(app, '[data-student-step="1"]');
    assert.equal(app.get("student").value, orderedIds[1]);
    assert.equal(
      report(app).querySelector('[data-student-step="1"]').disabled,
      true,
    );
    click(app, '[data-student-step="-1"]');
    assert.equal(app.get("student").value, orderedIds[0]);
    click(app, "[data-return-class]");
    assert.equal(app.get("list-scope").value, "indicator:" + key);
    assert.deepEqual(listIds(app), orderedIds);
    app.get("tab-group").click();
  }
});

test("indicadores sin casos o sin respuestas no ofrecen un enlace a casos inexistentes", async (t) => {
  const table = indicatorFixture();
  const app = createApp(t);
  await app.load([table[0], table[3], table[4], table[5]]);
  assert.equal(
    report(app).querySelectorAll("[data-indicator-scope]").length,
    0,
  );
  await app.load([table[0], table[5]]);
  assert.equal(
    report(app).querySelectorAll("[data-indicator-scope]").length,
    0,
  );
});

function comparisonFixture() {
  return [
    [...headers],
    ...[
      ["A01", "A", "A02 (Buena relación) | A03 (Muy buena relación)"],
      ["A02", "A", "Nadie"],
      ["A03", "A", "A01 (Mala relación)"],
      ["A04", "A", null],
      ["B01", "B", "B02 (Buena relación)"],
      ["B02", "B", "B01 (Muy buena relación)"],
      ["C01", "C", null],
      ["C02", "C", null],
    ].map(([id, group, relations]) =>
      row({
        "Usuario Id": id,
        Estudio: "Control",
        Curso: "Grado",
        Grupo: group,
        dia: log("Par"),
        redes1: relations === null ? null : log(relations),
      }),
    ),
  ];
}
const comparisonKeys = [
  "friendsReceived",
  "friendsDeclared",
  "rejectionsReceived",
  "rejectionsDeclared",
];
const decimal = (element) =>
  Number(element.textContent.trim().replace(",", "."));

test("la comparación usa solo datos numéricos de la clase actual y mantiene los pendientes", async (t) => {
  const table = comparisonFixture();
  const model = C.parseTable(table);
  const app = createApp(t);
  await app.load(table);
  for (const group of model.groups) {
    app.change("class", group.key);
    app.get("tab-student").click();
    for (const student of group.rows) {
      app.change("student", student.id);
      const comparison = report(app).querySelector(".class-comparison");
      assert.ok(comparison);
      assert.equal(
        comparison.querySelectorAll("[data-compare-metric]").length,
        4,
      );
      for (const key of comparisonKeys) {
        const line = comparison.querySelector(`[data-compare-metric="${key}"]`);
        const own = line.querySelector(".comparison-student");
        const average = line.querySelector(".comparison-average");
        const values = group.rows
          .map((s) => s.metrics[key])
          .filter(Number.isFinite);
        if (student.metrics[key] === null)
          assert.match(own.textContent, /Pendiente/);
        else assert.equal(decimal(own), student.metrics[key]);
        if (!values.length) assert.match(average.textContent, /Pendiente/);
        else {
          const expected =
            values.reduce((sum, n) => sum + n, 0) / values.length;
          assert.ok(
            Math.abs(decimal(average) - expected) <= 0.051,
            `${key}: la media excluye ausencias y se redondea a una cifra decimal`,
          );
        }
      }
    }
  }
});

test("los diez campos académicos permanecen en tres bloques con sus respuestas", async (t) => {
  const table = [
    [...headers],
    row({
      "Usuario Id": "ACA01",
      Estudio: "Control",
      Curso: "Grado",
      Grupo: "A",
      "Organización del tiempo": log("Regular"),
      "Carga de trabajo": log("Alta"),
      "Te has apuntado a actividades": log("Deporte"),
      dificultad: log("Sí"),
      asignaturas: log("Asignatura de prueba"),
      motivoasig: log("Motivo académico de prueba"),
      motivoasig1: log("Detalle académico de prueba"),
      abandono: log("Sí, alguna vez"),
      motivoabandono: log("Motivo de continuidad de prueba"),
      motivoabandono1: log("Detalle de continuidad de prueba"),
    }),
  ];
  const student = C.parseTable(table).students[0];
  const app = createApp(t);
  await app.load(table);
  app.get("tab-student").click();
  const blocks = [...report(app).querySelectorAll(".academic-block")];
  assert.equal(blocks.length, 3);
  for (const block of blocks)
    assert.ok(block.querySelector("h4,h5")?.textContent.trim());
  const cards = blocks.flatMap((block) => [
    ...block.querySelectorAll(".response-card"),
  ]);
  assert.equal(cards.length, 10);
  for (const field of [
    "time",
    "workload",
    "activities",
    "difficulty",
    "subjects",
    "subjectReasons",
    "subjectOther",
    "dropout",
    "dropoutReasons",
    "dropoutOther",
  ]) {
    const card = cards.find(
      (item) => item.querySelector("h4,h5,h6")?.textContent === C.FIELDS[field],
    );
    assert.ok(card, `Se conserva la pregunta ${field}`);
    assert.ok(
      card.textContent.includes(student.responses[field]),
      `Se conserva la respuesta ${field}`,
    );
  }
});

test("abrir la lista completa retira la ordenación de una columna académica que deja de verse", async (t) => {
  const app = createApp(t);
  const table = indicatorFixture();
  await app.load(table);
  click(app, '[data-indicator-scope="time"]');
  click(app, '[data-sort="time"]');
  assert.equal(
    report(app).querySelector('[data-sort="time"]').closest("th").getAttribute("aria-sort"),
    "ascending",
  );
  app.get("tab-group").click();
  click(app, "[data-open-list]");
  assert.equal(app.get("list-scope").value, "all");
  assert.equal(report(app).querySelector('[data-sort="time"]'), null);
  assert.equal(
    report(app).querySelectorAll('th[aria-sort="ascending"], th[aria-sort="descending"]').length,
    0,
  );
  assert.match(
    report(app).querySelector(".student-table caption").textContent,
    /Peticiones y menciones de ayuda primero/,
  );
  assert.deepEqual(listIds(app), C.parseTable(table).students.map((s) => s.id));
});
