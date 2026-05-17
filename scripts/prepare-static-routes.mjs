import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const docsDir = join(rootDir, "docs");
const indexPath = join(docsDir, "index.html");
const statsIndexPath = join(docsDir, "estatisticas", "index.html");
const editorIndexPath = join(docsDir, "editar-questoes", "index.html");
const validatorIndexPath = join(docsDir, "validar-questoes", "index.html");
const classroomIndexPath = join(docsDir, "sala-de-aula", "index.html");
const studyIndexPath = join(docsDir, "estudar", "index.html");
const module2IndexPath = join(docsDir, "modulo-2", "index.html");
const notFoundPath = join(docsDir, "404.html");

const indexHtml = await readFile(indexPath, "utf8");
const nestedRouteHtml = indexHtml.replaceAll("./assets/", "../assets/");

await mkdir(dirname(statsIndexPath), { recursive: true });
await mkdir(dirname(editorIndexPath), { recursive: true });
await mkdir(dirname(validatorIndexPath), { recursive: true });
await mkdir(dirname(classroomIndexPath), { recursive: true });
await mkdir(dirname(studyIndexPath), { recursive: true });
await mkdir(dirname(module2IndexPath), { recursive: true });
await writeFile(statsIndexPath, nestedRouteHtml);
await writeFile(editorIndexPath, nestedRouteHtml);
await writeFile(validatorIndexPath, nestedRouteHtml);
await writeFile(classroomIndexPath, nestedRouteHtml);
await writeFile(studyIndexPath, nestedRouteHtml);
await writeFile(module2IndexPath, nestedRouteHtml);
await writeFile(notFoundPath, indexHtml);
