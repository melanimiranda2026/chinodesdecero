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
  zhuo1_zi5: "nueva (17 nov. 2026)",
  ka1_fei1_bei1: "nueva (17 nov. 2026)",
  shou3_ji1: "nueva (17 nov. 2026)",
  chuang1_hu5: "nueva (17 nov. 2026)",
  la1_ji1_tong3: "nueva (17 nov. 2026)",
  yi3_zi5: "nueva (17 nov. 2026)",
  zhe4_shi4_zhuo1_zi5: "nueva (17 nov. 2026)",
  zhe4_shi4_ka1_fei1_bei1: "nueva (17 nov. 2026)",
  zhe4_shi4_shou3_ji1: "nueva (17 nov. 2026)",
  zhe4_shi4_chuang1_hu5: "nueva (17 nov. 2026)",
  zhe4_shi4_la1_ji1_tong3: "nueva (17 nov. 2026)",
  zhe4_shi4_yi3_zi5: "nueva (17 nov. 2026)",
  gei3_wo3_ka1_fei1_bei1: "nueva (17 nov. 2026)",
  gei3_wo3_shou3_ji1: "nueva (17 nov. 2026)",
  dao4_ka1_fei1: "nueva (17 nov. 2026)",
  wo3_dao4_ka1_fei1: "nueva (17 nov. 2026)",
  da3_dian4_hua4: "nueva (17 nov. 2026)",
  wo3_da3_dian4_hua4: "nueva (17 nov. 2026)",
  guan1_deng1: "nueva (17 nov. 2026)",
  wo3_guan1_deng1: "nueva (17 nov. 2026)",
  wo3_da3_kai1_chuang1_hu5: "nueva (17 nov. 2026)",
  wo3_da3_kai1_la1_ji1_tong3: "nueva (17 nov. 2026)",
  wo3_zuo4_xia4: "nueva (17 nov. 2026)",
  wo3_chi1_wu3_fan4: "nueva (17 nov. 2026)",
  he1_ka1_fei1: "nueva (17 nov. 2026)",
  wo3_he1_ka1_fei1: "nueva (17 nov. 2026)",
  wo3_xi3_ka1_fei1_bei1: "nueva (17 nov. 2026)",
  kai1_deng1: "nueva (17 nov. 2026)",
  wo3_kai1_deng1: "nueva (17 nov. 2026)",
  wo3_guan1_shang5_chuang1_hu5: "nueva (17 nov. 2026)",
  wo3_chi1_zao3_fan4: "nueva (17 nov. 2026)",
  wo3_chi1_wan3_fan4: "nueva (17 nov. 2026)",
  niu2_nai3: "nueva (17 nov. 2026)",
  ji1_dan4: "nueva (17 nov. 2026)",
  hen3_re4: "nueva (17 nov. 2026)",
  hen2_leng3: "nueva (17 nov. 2026)",
  wei2: "nueva (17 nov. 2026)",
  wo3_zuo4_hao3_fan4_le5: "nueva (17 nov. 2026)",
  zuo4: "nueva (17 nov. 2026)",
  shui3: "nueva (17 nov. 2026)",
  mi3: "nueva (17 nov. 2026)",
  deng1: "nueva: 灯 sale plano (stability 0.7)",
  zhe4_shi4_deng1: "nueva: 灯 sube un poco (302→333 Hz)",
  mao1: "nueva: 猫 sube un poco (286→327 Hz)",
  zhe4_shi4_mao1: "nueva: cortada de 这是猫，那是猫",
  mian4_bao1: "nueva: 包 sube un poco al final",
  cao3_mei2: "nueva: cortada (traía 1,6 s de silencio)",
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
