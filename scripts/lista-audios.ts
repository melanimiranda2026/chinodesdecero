import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { idAudio, textoHanzi, type Silaba } from "../lib/silabas";
import { frasesUsadas } from "../components/casa/audio/manifiesto";
import { TEMAS } from "../components/puzzle/datos";

const raiz = process.cwd();
const pinyin = (s: Silaba[]) => s.map(([, p]) => p).join(" ");

/** Tomas de la cocina que un nativo debe escuchar (eleven_v3, Yating, 16 nov. 2026). */
const REVISAR_COCINA: Record<string, string> = {
  wo3_na2_zhe5_wan3: "nueva: 碗 tiene que bajar y subir (3.er tono)",
  wo3_na2_zhe5_pan2_zi5: "nueva: 盘 tiene que subir",
  wo3_na2_zhe5_kuai4_zi5: "nueva",
};
const filas = frasesUsadas().map((f) => {
  const id = idAudio(f);
  const archivo = `public/audio/cocina/${id}.mp3`;
  const nota = REVISAR_COCINA[id] ? ` (? nativo: ${REVISAR_COCINA[id]})` : "";
  return { archivo, hanzi: textoHanzi(f), pinyin: pinyin(f) + nota, existe: existsSync(join(raiz, archivo)) };
});

// El puzzle: audios copiados del banco del proyecto padre (nombres del banco, no idAudio).
/** Tomas nuevas del 16 nov. 2026 que un nativo debe escuchar con atención. */
const REVISAR: Record<string, string> = {
  womei_he_kafei: "咖啡 queda bajo al final de la frase",
  ni_mingtian_chi_shenme: "什 baja un poco antes de subir",
  wo_mingtian_pingguo: "明 no se ve subir en la medición",
  wo_mingtian_kafei: "明 no se ve subir en la medición",
  womei_chi_pingguo: "nueva",
};
const vistos = new Set<string>();
for (const t of TEMAS) {
  for (const f of t.frases) {
    const piezas = f.piezas.flatMap((p) => p.silabas);
    const usos: [string, Silaba[]][] = [[f.audio, piezas], ...(f.respuesta ? [[f.respuesta.audio, f.respuesta.silabas] as [string, Silaba[]]] : [])];
    for (const [audio, sil] of usos) {
      if (vistos.has(audio)) continue;
      vistos.add(audio);
      const archivo = `public/audio/puzzle/${audio}.mp3`;
      const nota = REVISAR[audio] ? ` (? nativo: ${REVISAR[audio]})` : "";
      filas.push({ archivo, hanzi: textoHanzi(sil), pinyin: pinyin(sil) + nota, existe: existsSync(join(raiz, archivo)) });
    }
  }
}

const faltan = filas.filter((f) => !f.existe).length;
const md = [
  "# Audios de la casa y del puzzle",
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
