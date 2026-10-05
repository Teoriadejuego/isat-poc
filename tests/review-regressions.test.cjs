const test = require("node:test"),
  assert = require("node:assert/strict"),
  C = require("../src/core.js");
const { headers, row, log } = require("./helpers/fixture.cjs");
const base = (id) => ({
  "Usuario Id": id,
  Curso: "PSI",
  Grupo: "A",
  dia: log("Par"),
});
const make = (records) => C.parseTable([headers, ...records.map(row)]);

test("carga de trabajo Muy baja es una respuesta válida de la escala", () => {
  const m = make([
    { ...base("A"), "Carga de trabajo": log("Muy baja") },
    { ...base("B"), "Carga de trabajo": log("Alta") },
  ]);
  const summary = C.summary(m.students);
  assert.equal(summary.workload.denominator, 2);
  assert.equal(summary.workload.percent, 50);
  assert.equal(m.warnings.academic, 0);
});

test("visitar apoyo no equivale a contestar; sin selección permanece ausente", () => {
  const m = make([{ ...base("A"), eayuda: log(""), start: log("") }]);
  assert.equal(m.students[0].hasSupport, null);
  assert.equal(m.students[0].help, null);
  assert.equal(C.summary(m.students).support.denominator, 0);
});
test("bienestar respeta sentidos opuestos sin generar una escala global", () => {
  const m = make([
    {
      ...base("A"),
      alone: log("Siempre"),
      fun: log("Nunca"),
      general: log("Casi nunca"),
    },
    {
      ...base("B"),
      alone: log("Nunca"),
      fun: log("Siempre"),
      general: log("Casi siempre"),
    },
    { ...base("C"), alone: log("Dato inesperado") },
  ]);
  const s = C.summary(m.students);
  assert.equal(s.loneliness.percent, 50);
  assert.equal(s.lowEnjoyment.percent, 50);
  assert.equal(s.lowUniversity.percent, 50);
  for (const field of ["loneliness", "lowEnjoyment", "lowUniversity"])
    assert.equal(s[field].denominator, 2);
  assert.equal(C.frequency("__proto__"), null);
});
test("categorías académicas no reconocidas no reducen artificialmente las tasas", () => {
  const m = make([
    {
      ...base("A"),
      abandono: log("Sí, alguna vez"),
      "Organización del tiempo": log("Mal"),
      "Carga de trabajo": log("Alta"),
    },
    {
      ...base("B"),
      abandono: log("Otra categoría"),
      "Organización del tiempo": log("Otra categoría"),
      "Carga de trabajo": log("Otra categoría"),
    },
  ]);
  const s = C.summary(m.students);
  for (const field of ["dropout", "time", "workload"]) {
    assert.equal(s[field].denominator, 1);
    assert.equal(s[field].percent, 100);
  }
  assert.equal(m.students[1].responses.time, "Otra categoría");
});
test("cada opción de multiselección se cuenta una vez por persona", () => {
  const s = C.summary(
    make([
      {
        ...base("A"),
        "Te has apuntado a actividades": log(
          "Deportes | deportes | Deportes | Debate",
        ),
      },
    ]).students,
  );
  assert.deepEqual(
    s.distributions.activities.items.map((x) => [x.count, x.percent]),
    [
      [1, 100],
      [1, 100],
    ],
  );
});
test("una relación ilegible no convierte una predicción en error comprobado", () => {
  const m = make([
    {
      ...base("A"),
      redes1: log("B (Buena relación)"),
      beliefs1: log("B (Buena relación)"),
    },
    {
      ...base("B"),
      redes1: log("A (Categoría inesperada) | C (Buena relación)"),
    },
    { ...base("C"), redes1: log("Nadie") },
  ]);
  assert.equal(m.students[0].metrics.friendEvaluable, 0);
  assert.equal(m.students[0].metrics.friendCorrect, null);
  assert.equal(m.students[0].metrics.mutualComplete, false);
});
test("conflictos entre alias se excluyen de igual forma en ambos órdenes", () => {
  for (const input of [
    "B (Buena relación) | 2 (Mala relación)",
    "2 (Mala relación) | B (Buena relación)",
  ]) {
    const m = make([
      { ...base("A"), redes1: log(input) },
      { ...base("B"), "Alumno Id": 2 },
    ]);
    assert.equal(m.students[0].metrics.friendsDeclared, null);
    assert.equal(m.students[0].metrics.rejectionsDeclared, null);
    assert.equal(m.warnings.conflicts, 1);
  }
});
test("autonominación excluida conserva evidencia de respuesta", () => {
  const m = make([
    { ...base("A"), redes1: log("A (Buena relación)") },
    { ...base("B") },
  ]);
  assert.equal(m.students[0].metrics.friendsDeclared, 0);
  assert.deepEqual(m.students[0].relations, []);
});
test("una ruta ambigua no mezcla relaciones y predicciones de dos recorridos", () => {
  const m = make([
    {
      ...base("A"),
      dia: null,
      redes2: log("B (Mala relación)"),
      beliefs1: log("B (Buena relación)"),
      beliefs2: log("B (Mala relación)"),
    },
    { ...base("B") },
  ]);
  assert.equal(m.students[0].relations, null);
  assert.equal(m.students[0].predictions, null);
  assert.equal(m.warnings.routes, 1);
});
test("cabeceras exactas tienen prioridad sobre instrucciones parecidas", () => {
  const table = [
    ["Aviso organización", ...headers],
    [
      "Instrucciones",
      ...row({ ...base("A"), "Organización del tiempo": log("Mal") }),
    ],
  ];
  assert.equal(C.parseTable(table).students[0].responses.time, "Mal");
});

test("una categoría con sufijo inesperado no se acepta como relación válida", () => {
  const m = make([
    { ...base("A"), redes1: log("B (Buena relación inesperada)") },
    { ...base("B") },
  ]);
  assert.equal(m.students[0].relations, null);
  assert.equal(m.warnings.categories, 1);
});

test("un vínculo reconocido permite verificar una predicción dentro de una lista parcial", () => {
  const m = make([
    { ...base("A"), beliefs1: log("B (Buena relación)") },
    {
      ...base("B"),
      redes1: log("A (Buena relación) | desconocido (Mala relación)"),
    },
  ]);
  assert.equal(m.students[0].metrics.friendEvaluable, 1);
  assert.equal(m.students[0].metrics.friendCorrect, 1);
  assert.equal(m.students[1].quality.relations.complete, false);
});
