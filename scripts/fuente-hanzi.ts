/**
 * Fuente de los hanzi: Xiaolai SC (小赖, LXGW, licencia SIL OFL 1.1).
 *
 * La fuente completa pesa ~20 MB. Este script junta todos los caracteres
 * chinos que usa la web (components, app, lib) y arma un woff2 solo con ellos
 * en `app/fuentes/xiaolai-hanzi.woff2`, más la lista en `xiaolai-caracteres.txt`
 * (un test avisa si aparece un hanzi que la fuente todavía no tiene).
 *
 * Correr con `npm run fuente` cada vez que se agreguen palabras nuevas.
 * La fuente original se baja una vez a node_modules/.cache/.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import subsetFont from "subset-font";

const URL_FUENTE = "https://github.com/lxgw/kose-font/releases/download/v3.126/Xiaolai-Regular.ttf";
const CACHE = "node_modules/.cache/xiaolai";
const ORIGEN = join(CACHE, "Xiaolai-Regular.ttf");
const SALIDA = "app/fuentes";

// Puntuación china y ASCII básico, por si un hanzi va junto a un signo.
const EXTRA = "，。？！、：；“”‘’（）…—·《》 0123456789?!.,";

export function hanziDe(texto: string): Set<string> {
  const s = new Set<string>();
  for (const c of texto) if (/[⺀-⻿㐀-鿿]/.test(c)) s.add(c);
  return s;
}

export function hanziDelProyecto(raiz = "."): Set<string> {
  const todos = new Set<string>();
  const recorrer = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const ruta = join(dir, f);
      if (statSync(ruta).isDirectory()) recorrer(ruta);
      else if (/\.(tsx?|css)$/.test(f)) for (const c of hanziDe(readFileSync(ruta, "utf8"))) todos.add(c);
    }
  };
  for (const d of ["components", "app", "lib"]) recorrer(join(raiz, d));
  return todos;
}

async function main() {
  if (!existsSync(ORIGEN)) {
    console.log("Bajando Xiaolai-Regular.ttf…");
    mkdirSync(CACHE, { recursive: true });
    const r = await fetch(URL_FUENTE);
    if (!r.ok) throw new Error(`No se pudo bajar la fuente: ${r.status}`);
    writeFileSync(ORIGEN, Buffer.from(await r.arrayBuffer()));
  }
  const hanzi = [...hanziDelProyecto()].sort();
  const woff2 = await subsetFont(readFileSync(ORIGEN), hanzi.join("") + EXTRA, { targetFormat: "woff2" });
  mkdirSync(SALIDA, { recursive: true });
  writeFileSync(join(SALIDA, "xiaolai-hanzi.woff2"), woff2);
  writeFileSync(join(SALIDA, "xiaolai-caracteres.txt"), hanzi.join("") + "\n");
  console.log(`${hanzi.length} hanzi → ${SALIDA}/xiaolai-hanzi.woff2 (${(woff2.length / 1024).toFixed(1)} KB)`);
}

if (process.argv[1]?.endsWith("fuente-hanzi.ts")) void main();
