const { headers, row, log } = require("./fixture.cjs");
const names = [
  "Ana García López",
  "Lucía Martín Ruiz",
  "Pablo Sánchez Díaz",
  "Carmen Romero Gil",
  "Álex Navarro Mora",
  "Diego Gómez Pérez",
  "Sara Molina León",
  "Javier Ortega Sáez",
  "Elena Castro Vidal",
  "Marcos Torres Cano",
  "Marta Ramos Sanz",
  "Hugo Blanco Ríos",
  "Nerea Ortiz Rubio",
  "Daniel Vega Serrano",
];
const id = (n) => "R" + String(n).padStart(3, "0");
const relations = [
  "R002 (Muy buena relación) | R003 (Buena relación) | R004 (Mala relación) | R005 (Muy mala relación) | R006 (Buena relación) | R007 (Mala relación)",
  "R001 (Muy buena relación)",
  "R001 (Mala relación)",
  "R001 (Muy mala relación)",
  "Nadie",
  "Nadie",
  "R001 (Muy buena relación)",
  "R001 (Buena relación)",
  "R001 (Muy buena relación)",
  "R001 (Mala relación)",
  "R001 (Muy mala relación)",
  "R001 (Normal)",
  "Nadie",
  "R001 (Muy buena relación)",
];
function egoFixture() {
  return [
    headers,
    ...names.map((name, index) =>
      row({
        "Usuario Id": id(index + 1),
        "Alumno Id": index + 1001,
        Nombre: name,
        Estudio: "Grado",
        Curso: "Educación",
        Grupo: index === 13 ? "B" : "A",
        start: log(""),
        end: log(""),
        dia: log("Par"),
        redes1: log(relations[index]),
        beliefs1: index === 0 ? log("R013 (Muy buena relación)") : null,
        ayuda: log(index === 0 ? "R013" : "Nadie"),
        uce: log("No"),
        alone: log("Nunca"),
        fun: log("Siempre"),
        general: log("Casi siempre"),
      }),
    ),
  ];
}
module.exports = { egoFixture, id };
