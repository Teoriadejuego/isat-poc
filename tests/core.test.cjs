const test = require("node:test"),
  assert = require("node:assert/strict"),
  C = require("../src/core.js");
const headers = [
  "Usuario Id",
  "Alumno Id",
  "Estudio",
  "Curso",
  "Grupo",
  "start",
  "end",
  "dia",
  "redes1",
  "redes2",
  "beliefs1",
  "beliefs2",
  "popular",
  "central",
  "conocidos",
  "otros",
  "eayuda",
  "ayuda",
  "circunstancia",
  "personal",
  "alone",
  "fun",
  "general",
  "uce",
  "siblings",
  "brothers",
  "sisters",
  "posicion",
  "Organización del tiempo",
  "Te has apuntado a actividades",
  "Carga de trabajo",
  "dificultad",
  "asignaturas",
  "motivoasig",
  "motivoasig1",
  "abandono",
  "motivoabandono",
  "motivoabandono1",
];
const log = (value) => "2026-10-05 09:00:00 -> " + value;
const row = (o) => headers.map((h) => o[h] ?? null);
function fixture() {
  return [
    headers,
    row({
      "Usuario Id": "S01",
      "Alumno Id": 1001,
      Estudio: 1,
      Curso: "PSI",
      Grupo: ".",
      start: log(""),
      end: log(""),
      dia: log("Par"),
      redes1: log("1002 (Muy buena relación)"),
      beliefs1: log("1002 (Buena relación)"),
      ayuda: log("1002"),
      circunstancia: log("Mi historia\n<script>alert(1)</script>"),
      alone: log("Nunca"),
      fun: log("Siempre"),
      general: log("Casi siempre"),
      dificultad: log("Sí"),
      abandono: log("Sí, alguna vez"),
      "Te has apuntado a actividades": log("Deportes | Debate"),
    }),
    row({
      "Usuario Id": "S02",
      "Alumno Id": 1002,
      Estudio: 1,
      Curso: "PSI",
      Grupo: ".",
      start: log(""),
      dia: log("Impar"),
      redes2: log("1001 (Buena relación)"),
      beliefs2: log("1001 (Muy buena relación)"),
      eayuda: log(""),
      ayuda: log("Nadie"),
      alone: log("Siempre"),
      dificultad: log("No"),
      abandono: log("No"),
    }),
    row({
      "Usuario Id": "S03",
      "Alumno Id": 1003,
      Estudio: 1,
      Curso: "ENF",
      Grupo: ".",
    }),
  ];
}
test("Par/Impar, numeric aliases, reciprocal observed ties and incoming predictions", () => {
  const m = C.parseTable(fixture()),
    s = m.students[0];
  assert.equal(m.groups.length, 2);
  assert.equal(s.metrics.friendsReceived, 1);
  assert.equal(s.metrics.friendsDeclared, 1);
  assert.equal(s.metrics.friendsMutual, 1);
  assert.equal(s.metrics.friendCorrect, 1);
  assert.equal(s.metrics.friendEvaluable, 1);
  assert.equal(s.status, "Completado");
  assert.equal(m.students[1].status, "En curso");
  assert.equal(m.students[2].status, "Sin iniciar");
});
test("señalar a otra persona no equivale a pedir ayuda para sí", () => {
  const m = C.parseTable(fixture());
  assert.equal(m.students[0].care.requested, null);
  assert.equal(m.students[1].care.peerReports, 1);
  assert.equal(m.students[2].help, null);
  const s = C.summary(m.groups.find((g) => g.course === "PSI").rows);
  assert.equal(s.care.cases.length, 0);
  assert.equal(s.care.selfRequests, null);
});
test("missing relationships never become zero incoming nominations or false prediction errors", () => {
  const t = fixture();
  t[2][headers.indexOf("redes2")] = null;
  const s = C.parseTable(t).students[0];
  assert.equal(s.metrics.friendsReceived, null);
  assert.equal(s.metrics.friendEvaluable, 0);
  assert.equal(s.metrics.friendCorrect, null);
  assert.equal(s.metrics.mutualComplete, false);
});
test("stories remain literal multiline text and are escaped for rendering", () => {
  const s = C.parseTable(fixture()).students[0];
  assert.equal(s.story, "Mi historia\n<script>alert(1)</script>");
  assert.match(C.escape(s.story), /&lt;script&gt;/);
  assert.equal(C.answer(log("")), null);
});
test("valid denominators and multiple-choice distributions", () => {
  const m = C.parseTable(fixture()),
    s = C.summary(m.groups.find((g) => g.course === "PSI").rows);
  assert.equal(s.loneliness.percent, 50);
  assert.equal(s.dropout.percent, 50);
  assert.equal(s.difficulty.percent, 50);
  assert.equal(s.distributions.activities.denominator, 1);
  assert.equal(s.distributions.activities.items.length, 2);
  assert.equal(s.distributions.activities.items[0].percent, 100);
});
test("duplicate IDs, ambiguous aliases and wrong schemas fail with useful errors", () => {
  const t = fixture();
  t[2][0] = "S01";
  assert.throws(() => C.parseTable(t), /duplicados/);
  const u = fixture();
  u[2][1] = 1001;
  assert.throws(() => C.parseTable(u), /dos estudiantes/);
  assert.throws(() => C.parseTable([["ID"], ["1"]]), /Curso/);
});
test("outside-class links and self nominations do not inflate class metrics", () => {
  const t = fixture();
  t[1][headers.indexOf("redes1")] = log(
    "1003 (Buena relación) | 1001 (Buena relación)",
  );
  const m = C.parseTable(t);
  assert.equal(m.students[0].metrics.friendsDeclared, 0);
  assert.equal(m.warnings.crossClass, 1);
  assert.equal(m.warnings.self, 1);
});
test("blank question headers and empty sheets are handled", () => {
  const t = fixture();
  t[0] = [...t[0], null];
  for (let i = 1; i < t.length; i++) t[i] = [...t[i], null];
  assert.equal(C.parseTable(t).students.length, 3);
  assert.throws(() => C.parseTable([[null]]), /no contiene/);
});
