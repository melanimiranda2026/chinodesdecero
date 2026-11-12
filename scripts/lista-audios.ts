import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { idAudio, textoHanzi, type Silaba } from "../lib/silabas";
import { frasesUsadas } from "../components/casa/audio/manifiesto";

const raiz = process.cwd();
const pinyin = (s: Silaba[]) => s.map(([, p]) => p).join(" ");

const filas = frasesUsadas().map((f) => {
  const archivo = `public/audio/cocina/${idAudio(f)}.mp3`;
  return { archivo, hanzi: textoHanzi(f), pinyin: pinyin(f), existe: existsSync(join(raiz, archivo)) };
});

const faltan = filas.filter((f) => !f.existe).length;
const md = [
  "# Audios de la casa",
  "",
  `${filas.length - faltan} de ${filas.length} existen. Generado con \`npm run audios\`; no se edita a mano.`,
  "",
  "| Archivo | Hanzi | Pinyin | ¿Existe? |",
  "|---|---|---|---|",
  ...filas.map((f) => `| ${f.archivo} | ${f.hanzi} | ${f.pinyin} | ${f.existe ? "sí" : "no"} |`),
  "",
].join("\n");

mkdirSync(join(raiz, "docs"), { recursive: true });
writeFileSync(join(raiz, "docs/audios.md"), md);
console.log(`docs/audios.md: ${filas.length} frases, faltan ${faltan}.`);
process.exit(faltan ? 1 : 0);
