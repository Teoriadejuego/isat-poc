import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const publicFiles = Object.freeze([
  ".nojekyll",
  "index.html",
  "src/app.css",
  "src/app.js",
  "src/core.js",
  "src/icon.svg",
  "src/parser-worker.js",
  "vendor/LICENSE-SheetJS.txt",
  "vendor/xlsx.full.min.js",
]);

async function inventory(directory, prefix = "") {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink())
      throw Error("El artefacto no admite enlaces simbólicos.");
    const relative = prefix + entry.name;
    if (entry.isDirectory())
      files.push(
        ...(await inventory(path.join(directory, entry.name), relative + "/")),
      );
    else if (entry.isFile()) files.push(relative);
    else throw Error("Entrada no admitida en el artefacto.");
  }
  return files.sort();
}

export async function verifySite(directory) {
  const actual = await inventory(directory),
    expected = [...publicFiles].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw Error(
      "El artefacto contiene archivos inesperados o le faltan recursos. No se publica.",
    );
  return actual;
}

export async function buildSite(directory = path.join(root, "public")) {
  await fs.mkdir(directory, { recursive: true });
  if (!(await fs.lstat(directory)).isDirectory())
    throw Error("La salida debe ser una carpeta regular.");
  await inventory(directory);
  for (const file of publicFiles) {
    if (file === ".nojekyll") {
      await fs.writeFile(path.join(directory, file), "");
      continue;
    }
    const source = path.join(root, file);
    if (!(await fs.lstat(source)).isFile())
      throw Error("El recurso de publicación debe ser un archivo regular.");
    await fs.mkdir(path.dirname(path.join(directory, file)), {
      recursive: true,
    });
    await fs.copyFile(source, path.join(directory, file));
  }
  return verifySite(directory);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const files = await buildSite();
  console.log(
    `Artefacto verificado: ${files.length} archivos de aplicación, sin datos de consulta.`,
  );
}
