const { headers, row, log } = require("./fixture.cjs");
const code = (index) => "P" + String(index + 1).padStart(3, "0");
function relationsFixture() {
  return [
    headers,
    ...Array.from({ length: 95 }, (_, index) => {
      const responds =
        (index >= 1 && index <= 5) || (index >= 9 && index <= 40);
      const positive =
        (index >= 1 && index <= 3) || (index >= 9 && index <= 11);
      return row({
        "Usuario Id": code(index),
        Nombre:
          index === 0
            ? "Estudiante de prueba"
            : `Persona de control ${index + 1}`,
        Estudio: "Grado",
        Curso: "Control",
        Grupo: "A",
        dia: log("Par"),
        start: log(""),
        end: log(""),
        redes1: responds
          ? log(`P001 (${positive ? "Buena relación" : "Normal"})`)
          : null,
        beliefs1:
          index === 0
            ? log(
                Array.from(
                  { length: 8 },
                  (_, i) => `${code(i + 1)} (Buena relación)`,
                ).join(" | "),
              )
            : null,
        ayuda: log(
          index === 0 ? "P007" : [9, 10].includes(index) ? "P001" : "Nadie",
        ),
        uce: log("No"),
        circunstancia: index === 0 ? log("No") : null,
      });
    }),
  ];
}
module.exports = { relationsFixture };
