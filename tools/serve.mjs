import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 8892);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};
http
  .createServer((req, res) => {
    try {
      if (!["GET", "HEAD"].includes(req.method)) {
        res.writeHead(405);
        res.end();
        return;
      }
      const requested = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      const file = path.resolve(
        root,
        "." + requested + (requested.endsWith("/") ? "index.html" : ""),
      );
      if (
        !file.startsWith(root + path.sep) ||
        requested.split("/").some((x) => x.startsWith(".")) ||
        !(
          /^(\/src\/|\/vendor\/)/.test(requested) ||
          requested === "/" ||
          requested === "/index.html"
        )
      ) {
        res.writeHead(404);
        res.end();
        return;
      }
      const stat = fs.statSync(file);
      if (!stat.isFile()) throw Error();
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Content-Length": stat.size,
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        "Cache-Control": "no-store",
      });
      if (req.method === "HEAD") res.end();
      else fs.createReadStream(file).pipe(res);
    } catch {
      res.writeHead(404);
      res.end("Archivo no encontrado");
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log("ISAT local: http://127.0.0.1:" + port),
  );
