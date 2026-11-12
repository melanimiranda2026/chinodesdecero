/**
 * Lista qué archivo de arte usa el juego para cada capa. Si hay un dibujo a mano (WebP o PNG) con el mismo
 * nombre que un SVG generado, gana el dibujo: así basta con guardar `guo_olla.png` junto a `guo_olla.svg`.
 * Corre solo antes de `npm run dev` y `npm run build` (predev / prebuild). Escribe components/casa/arte/manifiesto-arte.json.
 */
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, extname, sep } from "node:path";

const RAIZ = join(process.cwd(), "public", "arte");
const PRIORIDAD = [".webp", ".png", ".svg"];
const elegidos: Record<string, string> = {};

function recorrer(dir: string) {
  for (const n of readdirSync(dir)) {
    const ruta = join(dir, n);
    if (statSync(ruta).isDirectory()) { recorrer(ruta); continue; }
    const ext = extname(n).toLowerCase();
    if (!PRIORIDAD.includes(ext)) continue;
    const clave = relative(RAIZ, ruta).split(sep).join("/").slice(0, -ext.length);
    const actual = elegidos[clave];
    if (!actual || PRIORIDAD.indexOf(ext) < PRIORIDAD.indexOf(extname(actual))) elegidos[clave] = "/arte/" + clave + ext;
  }
}
recorrer(RAIZ);
const ordenado = Object.fromEntries(Object.entries(elegidos).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(join(process.cwd(), "components", "casa", "arte", "manifiesto-arte.json"), JSON.stringify(ordenado, null, 2) + "\n");
const dibujos = Object.values(ordenado).filter((r) => !r.endsWith(".svg"));
console.log(`arte: ${Object.keys(ordenado).length} capas${dibujos.length ? `, ${dibujos.length} dibujadas a mano` : ""}`);
