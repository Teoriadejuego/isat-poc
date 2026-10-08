const test = require("node:test"),
  assert = require("node:assert/strict"),
  C = require("../src/core.js");
const { headers, row, log } = require("./helpers/fixture.cjs");
const { createApp } = require("./helpers/app-harness.cjs");
const base = (id) => ({
  "Usuario Id": id,
  Estudio: "1",
  Curso: "PSI",
  Grupo: "A",
});
const make = (records) => C.parseTable([headers, ...records.map(row)]);
function careFixture() {
  return [
    headers,
    row({
      ...base("OWN"),
      Nombre: "Persona Uno",
      uce: log("Sí"),
      start: log(""),
    }),
    row({
      ...base("PEER"),
      "Alumno Id": 1002,
      Nombre: "Persona Dos",
      uce: log("No"),
    }),
    row({ ...base("BOTH"), Nombre: "Persona Tres", uce: log("Sí") }),
    row({ ...base("SINGLE"), Nombre: "Persona Cuatro", uce: log("No") }),
    row({
      ...base("R1"),
      uce: log("Respuesta sin interpretar"),
      ayuda: log("PEER | 1002 | PEER | BOTH | SINGLE | R1 | desconocido"),
    }),
    row({ ...base("R2"), Curso: "ENF", Grupo: "B", ayuda: log("1002 | BOTH") }),
  ];
}

test("incluye petición propia o dos personas diferentes, con una sola fila por estudiante", () => {
  const model = C.parseTable(careFixture()),
    care = C.summary(model.groups.find((g) => g.course === "PSI").rows).care;
  assert.deepEqual(
    care.cases.map((s) => s.id),
    ["OWN", "PEER", "BOTH"],
  );
  assert.equal(care.selfRequests, 2);
  assert.equal(care.peerCases, 2);
  assert.equal(model.students.find((s) => s.id === "PEER").care.peerReports, 2);
  assert.equal(
    model.students.find((s) => s.id === "SINGLE").care.peerReports,
    1,
  );
  assert.equal(model.students.find((s) => s.id === "R1").care.peerReports, 0);
  assert.equal(model.students.find((s) => s.id === "OWN").status, "En curso");
});
test("un voto repetido o por alias no alcanza el umbral; la autonominación no cuenta", () => {
  const model = make([
    { ...base("A"), "Alumno Id": 101, ayuda: log("A | 101") },
    { ...base("B"), ayuda: log("A | 101 | A") },
  ]);
  assert.equal(model.students[0].care.peerReports, 1);
  assert.equal(C.summary(model.students).care.cases.length, 0);
});
test("ausencias, eventos y valores no reconocidos no se convierten en peticiones propias", () => {
  const model = make([
    { ...base("A"), uce: log(""), eayuda: log("") },
    { ...base("B"), uce: log("otra respuesta") },
  ]);
  assert.equal(model.students[0].care.requested, null);
  assert.equal(model.students[1].care.requested, null);
  assert.equal(model.students[0].care.peerReports, null);
  assert.equal(C.summary(model.students).care.cases.length, 0);
});
test("preguntas ausentes se diferencian de una lista de casos vacía con respuestas", () => {
  const absentHeaders = headers.filter((h) => !["uce", "ayuda"].includes(h));
  const model = C.parseTable([
    absentHeaders,
    absentHeaders.map((h) => base("A")[h] ?? null),
  ]);
  const care = C.summary(model.students).care;
  assert.equal(care.selfQuestionPresent, false);
  assert.equal(care.peerQuestionPresent, false);
  const answered = make([
    { ...base("A"), uce: log("No"), ayuda: log("Nadie") },
  ]);
  assert.equal(C.summary(answered.students).care.selfAnswered, 1);
});
test("cada clase contiene solo sus casos aunque reciba señalamientos de otra clase", () => {
  const model = C.parseTable(careFixture());
  assert.equal(
    C.summary(model.groups.find((g) => g.course === "ENF").rows).care.cases
      .length,
    0,
  );
  assert.equal(
    C.summary(model.groups.find((g) => g.course === "PSI").rows).care.cases
      .length,
    3,
  );
});

test("la matriz cruza Sí/No con el umbral de dos y no convierte ausencias en No", () => {
  const model = make([
    { ...base("A"), uce: log("Sí"), ayuda: log("D | C") },
    { ...base("B"), uce: log("Sí"), ayuda: log("D | E") },
    { ...base("C"), uce: log("No"), ayuda: log("B | E") },
    { ...base("D"), uce: log("No"), ayuda: log("B") },
    { ...base("E") },
    { ...base("F"), uce: log("No"), ayuda: log("Nadie") },
  ]);
  const care = C.careSummary(model.students);
  assert.deepEqual(care.matrix, {
    ownOnly: 1,
    both: 1,
    peerOnly: 1,
    neither: 2,
    known: 5,
    missing: 1,
    pendingHigh: 1,
    pendingLow: 0,
  });
  assert.equal(care.peerAny, 4);
  assert.equal(care.peerCases, 3);
  assert.deepEqual(
    care.cases.map((s) => s.id),
    ["A", "B", "D", "E"],
  );
});

test("recuentos y matriz son el primer bloque y diferencian las cuatro combinaciones", async (t) => {
  const app = createApp(t);
  await app.load(careFixture());
  app.change("class", '["1","PSI","A"]');
  assert.equal(
    app.window.document.querySelector(".report-body").firstElementChild
      .className,
    "care-panel",
  );
  assert.match(
    app.window.document.querySelector(".care-stats").textContent,
    /Han pedido ayuda/,
  );
  const table = app.window.document.querySelector(".care-matrix table");
  assert.equal(table.querySelectorAll("tbody td").length, 6);
  assert.equal(table.querySelector(".matrix-both strong").textContent, "1");
  assert.equal(table.querySelector(".matrix-own strong").textContent, "1");
  assert.match(table.textContent, /0 o 1 persona/);
  assert.match(table.textContent, /2 o más personas/);
  assert.match(
    app.window.document.querySelector(".care-matrix-note").textContent,
    /1 sin respuesta propia/,
  );
});
test("enlace abre la ficha exacta, limpia búsqueda y permite volver a la misma clase", async (t) => {
  const app = createApp(t);
  await app.load(careFixture());
  app.change("class", '["1","PSI","A"]');
  app.get("search").value = "filtro previo";
  const links = [
    ...app.window.document.querySelectorAll("[data-care-student]"),
  ];
  assert.equal(links.length, 3);
  const link = links.find((a) => a.dataset.careStudent === "PEER");
  assert.equal(link.getAttribute("href"), "#report");
  link.click();
  assert.equal(app.get("tab-student").getAttribute("aria-selected"), "true");
  assert.equal(app.get("student").value, "PEER");
  assert.equal(app.get("search").value, "");
  assert.equal(
    app.window.document.querySelector(".report-hero h2").textContent,
    "PEER",
  );
  assert.equal(app.window.document.activeElement.id, "report");
  assert.match(
    app.window.document.querySelector(".student-care").textContent,
    /2 personas indican/,
  );
  assert.doesNotMatch(
    app.get("report").textContent,
    /referente de apoyo|Personas a quienes acudir/,
  );
  app.window.document.querySelector("[data-return-class]").click();
  assert.equal(app.get("tab-group").getAttribute("aria-selected"), "true");
  assert.equal(app.get("class").value, '["1","PSI","A"]');
  assert.equal(app.window.location.hash, "");
});
test("el listado escapa nombres y códigos, y desaparece al cerrar o sustituir", async (t) => {
  const app = createApp(t);
  const malicious = 'ID" data-evil="1';
  await app.load([
    headers,
    row({
      ...base(malicious),
      Nombre: "<img src=x onerror=alert(1)>",
      uce: log("Sí"),
    }),
  ]);
  const link = app.window.document.querySelector("[data-care-student]");
  assert.equal(link.dataset.careStudent, malicious);
  assert.equal(link.hasAttribute("data-evil"), false);
  assert.equal(app.window.document.querySelector(".care-panel img"), null);
  await app.selectFile();
  assert.equal(app.window.document.querySelector(".care-panel"), null);
  app.get("clear").click();
  assert.equal(app.get("student").options.length, 0);
});
