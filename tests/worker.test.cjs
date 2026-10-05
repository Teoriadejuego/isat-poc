const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm");
const X = require("../vendor/xlsx.full.min.js");
const { fixture } = require("./helpers/fixture.cjs");
const root = path.resolve(__dirname, "..");
function bytes(tables) {
  const book = X.utils.book_new();
  for (const [name, table] of Object.entries(tables))
    X.utils.book_append_sheet(book, X.utils.aoa_to_sheet(table), name);
  return X.write(book, { type: "array", bookType: "xlsx", bookSST: true });
}
function worker() {
  const messages = [],
    context = vm.createContext({
      self: { postMessage: (m) => messages.push(structuredClone(m)) },
      TextDecoder,
      TextEncoder,
      Uint8Array,
      ArrayBuffer,
    });
  context.importScripts = (...files) => {
    for (const file of files)
      vm.runInContext(
        fs.readFileSync(path.resolve(root, "src", file.split("?")[0]), "utf8"),
        context,
      );
  };
  vm.runInContext(
    fs.readFileSync(path.join(root, "src/parser-worker.js"), "utf8"),
    context,
  );
  const send = (data) => {
    context.incoming = data;
    vm.runInContext("self.onmessage({data:incoming})", context, {
      timeout: 5000,
    });
    return messages.at(-1);
  };
  return { send, messages };
}
test("lector real devuelve solo hojas; prepara modelo y resúmenes sin devolver filas crudas", () => {
  const w = worker(),
    loaded = w.send({
      type: "read",
      requestId: 1,
      bytes: bytes({ Users: fixture() }),
    });
  assert.equal(loaded.type, "loaded");
  assert.equal(loaded.sheets[0].name, "Users");
  assert.equal("rows" in loaded.sheets[0], false);
  const parsed = w.send({ type: "parse", requestId: 2, sheet: "Users" });
  assert.equal(parsed.type, "parsed");
  assert.equal(parsed.model.students.length, 3);
  assert.equal(parsed.model.groups[0].summary.n, 1);
  assert.equal(parsed.requestId, 2);
});
test("hoja vacía y códigos duplicados fallan antes de generar fichas parciales", () => {
  const table = fixture();
  table[2][0] = "S01";
  const w = worker();
  w.send({
    type: "read",
    requestId: 1,
    bytes: bytes({ Users: table, Vacia: [] }),
  });
  assert.match(
    w.send({ type: "parse", requestId: 2, sheet: "Users" }).error,
    /duplicados/,
  );
  assert.match(
    w.send({ type: "parse", requestId: 3, sheet: "Vacia" }).error,
    /no contiene/,
  );
});
test("lector respeta 20 hojas, 200 columnas y 10.000 registros", () => {
  const w = worker();
  const twenty = Object.fromEntries(
    Array.from({ length: 20 }, (_, i) => ["H" + i, [["Texto"], ["Prueba"]]]),
  );
  assert.equal(
    w.send({ type: "read", requestId: 1, bytes: bytes(twenty) }).type,
    "loaded",
  );
  twenty.Extra = [["Texto"]];
  assert.match(
    w.send({ type: "read", requestId: 2, bytes: bytes(twenty) }).error,
    /20 hojas/,
  );
  const columns = (n) => [
    Array.from({ length: n }, (_, i) => "C" + i),
    Array(n).fill("dato"),
  ];
  assert.equal(
    w.send({
      type: "read",
      requestId: 3,
      bytes: bytes({ Users: columns(200) }),
    }).sheets[0].unsupported,
    false,
  );
  assert.equal(
    w.send({
      type: "read",
      requestId: 4,
      bytes: bytes({ Users: columns(201) }),
    }).sheets[0].unsupported,
    true,
  );
  const rows = (n) => [
    ["ID"],
    ...Array.from({ length: n }, (_, i) => [String(i)]),
  ];
  assert.equal(
    w.send({ type: "read", requestId: 5, bytes: bytes({ Users: rows(10000) }) })
      .sheets[0].unsupported,
    false,
  );
  assert.equal(
    w.send({ type: "read", requestId: 6, bytes: bytes({ Users: rows(10001) }) })
      .sheets[0].unsupported,
    true,
  );
});
test("una hoja sobredimensionada no impide leer otra válida y se limita el texto", () => {
  const w = worker(),
    loaded = w.send({
      type: "read",
      requestId: 1,
      bytes: bytes({ Grande: [Array(201).fill("dato")], Users: fixture() }),
    });
  assert.equal(loaded.sheets[0].unsupported, true);
  assert.equal(loaded.sheets[1].unsupported, false);
  const largeText = [
    ["Texto"],
    ...Array.from({ length: 501 }, () => ["x".repeat(20000)]),
  ];
  assert.match(
    w.send({ type: "read", requestId: 2, bytes: bytes({ Users: largeText }) })
      .error,
    /demasiado texto/,
  );
  assert.equal(
    w.send({ type: "parse", requestId: 3, sheet: "Users" }).type,
    "error",
  );
});
