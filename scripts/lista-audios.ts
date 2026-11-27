import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { idAudio, textoHanzi, type Silaba } from "../lib/silabas";
import { frasesUsadas } from "../components/casa/audio/manifiesto";
import { TEMAS } from "../components/puzzle/datos";
import { PALABRAS, srcPalabra } from "../components/casa/living/palabras";

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
  sha1_fa1: "nueva (20 nov. 2026)",
  dian4_shi4: "nueva (20 nov. 2026)",
  kan4: "nueva (20 nov. 2026)",
  wo3_kan4_dian4_shi4: "nueva: 看 sale plano (276→302 Hz), retoma igual (20 nov. 2026)",
  zhe4_shi4_sha1_fa1: "nueva (20 nov. 2026)",
  zhe4_shi4_dian4_shi4: "nueva (20 nov. 2026)",
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
  zhao4_pian4: "nueva (26 nov. 2026)",
  zhe4_shi4_wo3: "nueva (26 nov. 2026)",
  zhe4_shi4_zhao4_pian4: "nueva (26 nov. 2026)",
  zhe4_shi4_wo3_ba4_ba5: "nueva: rápida (0,96 s), 爸爸 con 爸 bajando y 爸 neutro (26 nov. 2026)",
  zhe4_shi4_wo3_ma1_ma5: "nueva: rápida (0,96 s), 妈 tiene que quedar alto y plano (26 nov. 2026)",
  zhe4_shi4_wo3_ge1_ge5: "nueva: rápida (0,96 s), 哥 alto y plano (26 nov. 2026)",
  zhe4_shi4_wo3_jie3_jie5: "nueva: 我 + 姐 son dos 3.er tono: 我 sube (wó jiě) (26 nov. 2026)",
  zuo4: "nueva (17 nov. 2026)",
  shui3: "nueva (17 nov. 2026)",
  shui3_guo3: "nueva (17 nov. 2026)",
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

// Mesa de palabras (living): copiadas, no generadas. [toma normal, toma lenta]; "cocina" = ya estaba en la web, lo demás es del proyecto de videos (../video/public/audio/).
const ORIGEN_MESA: Record<string, [string, string | null]> = {
  shui3: ["cocina", null],
  mi3: ["cocina", null],
  da4: ["facil-5/da.mp3", null],
  ping2_guo3: ["cocina", "banco/pingguo_lento.mp3"],
  cha2: ["banco/cha.mp3", null],
  hua1: ["banco/hua.mp3", null],
  cao3_mei2: ["cocina", null],
  mo2_gu5: ["cocina", null],
  chi1: ["cocina", null],
  he1: ["cocina", null],
  xi3: ["cocina", null],
  bei1_zi5: ["cocina", null],
  kuai4_zi5: ["cocina", null],
  dian4_nao3: ["facil-1/diannao.mp3", "facil-1/diannao_lento.mp3"],
  dian4_shi4: ["facil-2/dianshi.mp3", "facil-2/dianshi_lento.mp3"],
  dian4_hua4: ["facil-3/dianhua.mp3", "facil-3/dianhua_lento.mp3"],
  xiao4_hua5: ["facil-4/xiaohua.mp3", "facil-4/xiaohua_lento.mp3"],
  niu2_nai3: ["cocina", null],
  bing1_xiang1: ["cocina", null],
  shou3_ji1: ["cocina", null],
  shui3_guo3: ["cocina", null],
  ni2_hao3: ["cocina", null],
  xi1_hong2_shi4: ["cocina", "banco/xihongshi_lento.mp3"],
  xi1_gua1: ["cocina", "banco/xigua_lento.mp3"],
  hu2_luo2_bo5: ["cocina", "banco/huluobo_lento.mp3"],
  tu3_dou4: ["cocina", "banco/tudou_lento.mp3"],
  xi1_lan2_hua1: ["cocina", "banco/xilanhua_lento.mp3"],
  mian4_bao1: ["cocina", null],
  chang2_jing3_lu4: ["banco/changjinglu.mp3", "banco/changjinglu_lento.mp3"],
  mao1_tou2_ying1: ["banco/maotouying.mp3", "banco/maotouying_lento.mp3"],
  ya1_zui3_shou4: ["banco/yazuishou.mp3", "banco/yazuishou_lento.mp3"],
  ka1_fei1: ["gratis-1/kafei.mp3", "gratis-1/kafei_lento.mp3"],
  sha1_fa1: ["banco/shafa.mp3", "banco/shafa_lento.mp3"],
  bu4_ding1: ["banco/budin.mp3", "banco/budin_lento.mp3"],
  sha1_la1: ["banco/shala.mp3", "banco/shala_lento.mp3"],
  han4_bao3: ["banco/hanbao.mp3", "banco/hanbao_lento.mp3"],
  pi1_sa4: ["banco/pisa.mp3", "banco/pisa_lento.mp3"],
  ke3_le4: ["banco/kele.mp3", "banco/kele_lento.mp3"],
  qiao3_ke4_li4: ["banco/qiaokeli.mp3", "banco/qiaokeli_lento.mp3"],
  hao3_chi1: ["banco/haochi.mp3", "banco/haochi_lento.mp3"],
  hao3_he1: ["banco/haohe.mp3", "banco/haohe_lento.mp3"],
  hao3_kan4: ["banco/haokan.mp3", "banco/haokan_lento.mp3"],
  hao3_ting1: ["banco/haoting.mp3", "banco/haoting_lento.mp3"],
  hao3_wan2: ["banco/haowan.mp3", "banco/haowan_lento.mp3"],
  hao3: ["cocina", null],
  ni3: ["banco/ni.mp3", "banco/ni_lento.mp3"],
  wo3_men5: ["banco/women.mp3", "banco/women_lento.mp3"],
  mao1: ["cocina", null],
  ta1: ["banco/ta.mp3", "banco/ta_lento.mp3"],
};
const mesa = PALABRAS.flatMap((p) => {
  const [normal, lenta] = ORIGEN_MESA[p.audio ?? p.id] ?? ["?", null];
  const base = p.audio ?? p.id;
  const compartida = p.audio ? ` (también la usa ${p.id})` : "";
  const estado = (o: string) => (o === "cocina" ? (REVISAR_COCINA[base] ? `? nativo: ${REVISAR_COCINA[base]}` : "revisada") : "? nativo: copiada del proyecto de videos");
  const filas = [{ archivo: `public${srcPalabra(p)}`, origen: (normal === "cocina" ? `public/audio/cocina/${base}.mp3` : `video/${normal}`) + compartida, estado: estado(normal) }];
  if (p.lento && !p.audio) filas.push({ archivo: `public${srcPalabra(p, true)}`, origen: `video/${lenta}`, estado: "? nativo: copiada del proyecto de videos" });
  return filas.map((f) => ({ ...f, hanzi: textoHanzi(p.s), existe: existsSync(join(raiz, f.archivo)) }));
});

const faltan = filas.filter((f) => !f.existe).length + mesa.filter((f) => !f.existe).length;
const md = [
  "# Audios de la casa y del puzzle",
  "",
  `${filas.length + mesa.length - faltan} de ${filas.length + mesa.length} existen. Generado con \`npm run audios\`; no se edita a mano.`,
  "",
  "| Archivo | Hanzi | Pinyin | ¿Existe? |",
  "|---|---|---|---|",
  ...filas.map((f) => `| ${f.archivo} | ${f.hanzi} | ${f.pinyin} | ${f.existe ? "sí" : "no"} |`),
  "",
  "## Mesa de palabras",
  "",
  "Copiadas, no generadas (cero créditos). La vaca las dice en el living.",
  "",
  "| Archivo | Hanzi | Copiado de | Estado | ¿Existe? |",
  "|---|---|---|---|---|",
  ...mesa.map((f) => `| ${f.archivo} | ${f.hanzi} | ${f.origen} | ${f.estado} | ${f.existe ? "sí" : "no"} |`),
  "",
].join("\n");

mkdirSync(join(raiz, "docs"), { recursive: true });
writeFileSync(join(raiz, "docs/audios.md"), md);
console.log(`docs/audios.md: ${filas.length} frases, faltan ${faltan}.`);
process.exit(faltan ? 1 : 0);
