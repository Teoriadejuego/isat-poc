"use strict";
importScripts("../vendor/xlsx.full.min.js", "core.js?v=0.9.1");
let sheets = null;
self.onmessage = function (event) {
  const { type, requestId } = event.data;
  try {
    if (type === "read") {
      sheets = null;
      let book;
      try {
        book = XLSX.read(event.data.bytes, {
          type: "array",
          cellFormula: false,
          cellHTML: false,
          cellDates: false,
          sheetRows: 10002,
        });
      } catch {
        throw Error(
          "No se pudo leer este archivo. Comprueba que sea un Excel válido, sin contraseña, y vuelve a seleccionarlo.",
        );
      }
      if (book.SheetNames.length > 20)
        throw Error("El libro supera el límite de 20 hojas.");
      let cells = 0,
        characters = 0;
      sheets = book.SheetNames.map((name) => {
        const sheet = book.Sheets[name];
        const ref = XLSX.utils.decode_range(
          sheet["!fullref"] || sheet["!ref"] || "A1",
        );
        const count = (ref.e.r + 1) * (ref.e.c + 1);
        if (ref.e.r > 10000 || ref.e.c > 199 || cells + count > 1500000)
          return { name, unsupported: true };
        cells += count;
        const rows = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: null,
          raw: true,
          blankrows: false,
        });
        for (const row of rows)
          for (const value of row)
            if (typeof value === "string") {
              characters += value.length;
              if (value.length > 50000 || characters > 10000000)
                throw Error(
                  "El libro contiene demasiado texto. Reduce las hojas o los textos antes de abrirlo.",
                );
            }
        return { name, rows };
      });
      self.postMessage({
        type: "loaded",
        requestId,
        sheets: sheets.map(({ name, unsupported }) => ({
          name,
          unsupported: !!unsupported,
        })),
      });
    } else if (type === "parse") {
      const sheet = sheets?.find(
        (s) => s.name === event.data.sheet && !s.unsupported,
      );
      if (!sheet)
        throw Error("Vuelve a seleccionar un archivo y una hoja disponibles.");
      const model = IsatCore.parseTable(sheet.rows);
      for (const group of model.groups)
        group.summary = IsatCore.summary(group.rows);
      self.postMessage({ type: "parsed", requestId, model });
    } else {
      throw Error("La operación de lectura no se reconoce.");
    }
  } catch (error) {
    if (type === "read") sheets = null;
    self.postMessage({
      type: "error",
      operation: type,
      requestId,
      error:
        error.message ||
        "No se pudo leer el archivo. Selecciona un Excel válido, sin contraseña.",
    });
  }
};
