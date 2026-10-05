const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const C = require("../../src/core.js");
const root = path.resolve(__dirname, "../..");

function createApp(t) {
  const dom = new JSDOM(
    fs.readFileSync(path.join(root, "index.html"), "utf8"),
    { url: "http://localhost/", runScripts: "outside-only" },
  );
  const window = dom.window;
  const workers = [];
  class TestWorker {
    constructor(url) {
      this.url = url;
      this.terminated = false;
      this.autoParse = true;
      workers.push(this);
    }
    postMessage(message) {
      this.message = message;
      if (message.type === "parse" && this.autoParse) this.finishParse();
    }
    finishParse() {
      const message = this.message;
      try {
        const model = C.parseTable(
          this.sheets.find((s) => s.name === message.sheet)?.rows,
        );
        for (const group of model.groups) group.summary = C.summary(group.rows);
        this.emit({ type: "parsed", requestId: message.requestId, model });
      } catch (error) {
        this.emit({
          type: "error",
          operation: "parse",
          requestId: message.requestId,
          error: error.message,
        });
      }
    }
    terminate() {
      this.terminated = true;
    }
    emit(data) {
      if (data.sheets) {
        this.sheets = data.sheets;
        data = {
          type: "loaded",
          requestId: this.message.requestId,
          sheets: data.sheets.map(({ name, unsupported }) => ({
            name,
            unsupported,
          })),
        };
      }
      this.onmessage?.({ data });
    }
  }
  window.Worker = TestWorker;
  for (const file of ["src/core.js", "src/app.js"])
    window.eval(fs.readFileSync(path.join(root, file), "utf8"));
  const get = (id) => window.document.getElementById(id);
  async function selectFile(
    file = {
      name: "prueba.xlsx",
      size: 100,
      arrayBuffer: async () => new ArrayBuffer(8),
    },
  ) {
    Object.defineProperty(get("file"), "files", {
      value: file ? [file] : [],
      configurable: true,
    });
    await get("file").onchange();
    return workers.at(-1);
  }
  async function load(table) {
    const worker = await selectFile();
    worker.emit({
      sheets: [
        { name: "Users", rows: table },
        { name: "Vacia", rows: [] },
      ],
    });
    get("open").click();
    return worker;
  }
  function change(id, value) {
    get(id).value = value;
    get(id).dispatchEvent(new window.Event("change"));
  }
  t.after(() => window.close());
  return { window, get, workers, selectFile, load, change };
}
module.exports = { createApp };
