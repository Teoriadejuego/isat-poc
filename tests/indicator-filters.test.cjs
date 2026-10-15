const test = require("node:test"),
  assert = require("node:assert/strict"),
  C = require("../src/core.js");
const { headers, row, log } = require("./helpers/fixture.cjs");

const keys = [
  "loneliness",
  "lowEnjoyment",
  "lowUniversity",
  "difficulty",
  "dropout",
  "time",
  "workload",
];
const fields = [
  "alone",
  "fun",
  "general",
  "dificultad",
  "abandono",
  "Organización del tiempo",
  "Carga de trabajo",
];
function record(id, answers, group = "A") {
  return row({
    "Usuario Id": id,
    Estudio: "ISAT",
    Curso: "PSI",
    Grupo: group,
    ...Object.fromEntries(
      fields.map((field, i) => [
        field,
        answers[i] == null ? null : log(answers[i]),
      ]),
    ),
  });
}
function fixture() {
  return C.parseTable([
    headers,
    record("A1", [
      "Siempre",
      "Nunca",
      "Casi nunca",
      "Sí",
      "Sí, alguna vez",
      "Mal",
      "Alta",
    ]),
    record("A2", [
      "Casi siempre",
      "Nunca",
      "Siempre",
      "No",
      "No",
      "Bien",
      "Muy alta",
    ]),
    record("A3", [
      "Nunca",
      "Casi nunca",
      "Nunca",
      "No",
      "Sí, varias veces",
      "Regular",
      "Adecuada",
    ]),
    record("A4", [
      "Algunas veces",
      "Siempre",
      "Algunas veces",
      "Sí",
      "No",
      "Muy mal",
      "Alta",
    ]),
    record(
      "A5",
      fields.map(() => "Respuesta no reconocida"),
    ),
    record("A6", []),
    record(
      "B1",
      [
        "Siempre",
        "Nunca",
        "Nunca",
        "Sí",
        "Sí, lo estoy considerando actualmente",
        "Mal",
        "Alta",
      ],
      "B",
    ),
    record("B2", [], "B"),
  ]);
}

test("cada filtro abre exactamente los casos contados por su indicador y conserva la base válida", () => {
  const model = fixture(),
    rows = model.groups.find((g) => g.group === "A").rows,
    summary = C.summary(rows),
    expected = {
      loneliness: ["A1", "A2"],
      lowEnjoyment: ["A1", "A2", "A3"],
      lowUniversity: ["A1", "A3"],
      difficulty: ["A1", "A4"],
      dropout: ["A1", "A3"],
      time: ["A1", "A4"],
      workload: ["A1", "A2", "A4"],
    };
  for (const key of keys) {
    const matches = rows.filter((s) => C.indicatorMatches(s, key));
    assert.deepEqual(
      matches.map((s) => s.id),
      expected[key],
      key,
    );
    assert.equal(matches.length, summary[key].count, key);
    assert.equal(summary[key].denominator, 4, key);
    assert.equal(summary[key].percent, (100 * expected[key].length) / 4, key);
  }
});

test("soledad usa las frecuencias altas y disfrute y experiencia universitaria las bajas", () => {
  const answers = [
    "Nunca",
    "Casi nunca",
    "Algunas veces",
    "Casi siempre",
    "Siempre",
  ];
  answers.forEach((answer, i) => {
    const student = {
      responses: { alone: answer, fun: answer, general: answer },
    };
    assert.equal(C.indicatorMatches(student, "loneliness"), i >= 3, answer);
    assert.equal(C.indicatorMatches(student, "lowEnjoyment"), i <= 1, answer);
    assert.equal(C.indicatorMatches(student, "lowUniversity"), i <= 1, answer);
  });
});

test("ausencias y categorías no reconocidas no coinciden ni aumentan denominadores", () => {
  const rows = fixture().students.filter((s) => ["A5", "A6"].includes(s.id)),
    summary = C.summary(rows);
  for (const key of keys) {
    assert.equal(
      rows.some((s) => C.indicatorMatches(s, key)),
      false,
      key,
    );
    assert.equal(C.indicatorMatches({ responses: {} }, key), false, key);
    assert.equal(C.indicatorMatches(null, key), false, key);
    assert.deepEqual(
      summary[key],
      { count: null, denominator: 0, percent: null },
      key,
    );
  }
});

test("el filtro no mezcla las clases y cada lista coincide con su resumen", () => {
  const model = fixture();
  for (const group of model.groups) {
    const summary = C.summary(group.rows);
    for (const key of keys) {
      const matches = group.rows.filter((s) => C.indicatorMatches(s, key));
      assert.equal(
        matches.length,
        summary[key].count,
        `${group.group}: ${key}`,
      );
      assert.ok(matches.every((s) => s.group === group.group));
      if (group.group === "B")
        assert.deepEqual(
          matches.map((s) => s.id),
          ["B1"],
        );
    }
  }
});

test("las respuestas válidas no adversas conservan un cero observado y un denominador", () => {
  const rows = C.parseTable([
    headers,
    record("SAFE", [
      "Nunca",
      "Siempre",
      "Siempre",
      "No",
      "No",
      "Muy bien",
      "Muy baja",
    ]),
  ]).students;
  const summary = C.summary(rows);
  for (const key of keys) {
    assert.equal(C.indicatorMatches(rows[0], key), false, key);
    assert.deepEqual(
      summary[key],
      { count: 0, denominator: 1, percent: 0 },
      key,
    );
  }
});

test("una clave de filtro desconocida no coincide con ningún estudiante", () => {
  const s = fixture().students[0];
  for (const key of ["unknown", "__proto__", "constructor", null, undefined])
    assert.equal(C.indicatorMatches(s, key), false);
});
