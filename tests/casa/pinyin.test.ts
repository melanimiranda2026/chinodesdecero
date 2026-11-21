import { describe, expect, it } from "vitest";
import { acciones, estadosAlcanzables } from "@/components/casa/cocina/acciones";
import { ESTADO_INICIAL, NOMBRES_COMIDA, OBJETOS, VALORES, type ObjetoId } from "@/components/casa/cocina/datos";
import * as F from "@/components/casa/cocina/frases";
import { textoHanzi, type Silaba } from "@/lib/silabas";

/**
 * Pinyin y tonos de TODO verbo y frase alcanzable, fijados a mano (revisados contra diccionario).
 * Si cambias una frase, cambia esta tabla a conciencia: aquí se cuelan errores como 盛饭 shèng → chéng.
 * Formato: "pinyin con marcas|dígitos de tono" (tono de diccionario; el sandhi del 3.º no se escribe).
 */
const ESPERADO: Record<string, string> = {
  "倒水": "dào shuǐ|43",
  "倒茶": "dào chá|42",
  "做饭": "zuò fàn|44",
  "关上": "guān shang|15",
  "切": "qiē|1",
  "吃": "chī|1",
  "吃饭": "chī fàn|14",
  "吃饺子": "chī jiǎo zi|135",
  "喝": "hē|1",
  "喝茶": "hē chá|12",
  "我倒水": "wǒ dào shuǐ|343",
  "我倒茶": "wǒ dào chá|342",
  "我做饭": "wǒ zuò fàn|344",
  "我关上冰箱": "wǒ guān shang bīng xiāng|31511",
  "我切苹果": "wǒ qiē píng guǒ|3123",
  "我吃苹果": "wǒ chī píng guǒ|3123",
  "我吃早饭": "wǒ chī zǎo fàn|3134",
  "我吃午饭": "wǒ chī wǔ fàn|3134",
  "我吃晚饭": "wǒ chī wǎn fàn|3134",
  "倒咖啡": "dào kā fēi|411",
  "我倒咖啡": "wǒ dào kā fēi|3411",
  "喝咖啡": "hē kā fēi|111",
  "我喝咖啡": "wǒ hē kā fēi|3111",
  "我洗咖啡杯": "wǒ xǐ kā fēi bēi|33111",
  "关灯": "guān dēng|11",
  "我关灯": "wǒ guān dēng|311",
  "开灯": "kāi dēng|11",
  "我开灯": "wǒ kāi dēng|311",
  "我打开窗户": "wǒ dǎ kāi chuāng hu|33115",
  "我关上窗户": "wǒ guān shang chuāng hu|31515",
  "我打开垃圾桶": "wǒ dǎ kāi lā jī tǒng|331113",
  "坐": "zuò|4",
  "我坐下": "wǒ zuò xià|344",
  "打电话": "dǎ diàn huà|344",
  "我打电话": "wǒ dǎ diàn huà|3344",
  "我吃饺子": "wǒ chī jiǎo zi|3135",
  "我喝水": "wǒ hē shuǐ|313",
  "我喝茶": "wǒ hē chá|312",
  "我打开冰箱": "wǒ dǎ kāi bīng xiāng|33111",
  "我拿着盘子": "wǒ ná zhe pán zi|32525",
  "我拿着碗": "wǒ ná zhe wǎn|3253",
  "我拿着筷子": "wǒ ná zhe kuài zi|32545",
  "我拿苹果": "wǒ ná píng guǒ|3223",
  "我拿饺子": "wǒ ná jiǎo zi|3235",
  "我洗杯子": "wǒ xǐ bēi zi|3315",
  "我洗盘子": "wǒ xǐ pán zi|3325",
  "我洗碗": "wǒ xǐ wǎn|333",
  "我洗苹果": "wǒ xǐ píng guǒ|3323",
  "我洗锅": "wǒ xǐ guō|331",
  "我盛饭": "wǒ chéng fàn|324",
  "打开": "dǎ kāi|31",
  "拿": "ná|2",
  "拿苹果": "ná píng guǒ|223",
  "拿饺子": "ná jiǎo zi|235",
  "洗": "xǐ|3",
  "盛饭": "chéng fàn|24",
};

describe("pinyin de verbos y frases", () => {
  it("cada verbo y frase alcanzable tiene exactamente el pinyin y los tonos fijados", () => {
    const visto: Record<string, string> = {};
    const anotar = (s: Silaba[]) => {
      const valor = `${s.map(([, p]) => p).join(" ")}|${s.map(([, , t]) => t).join("")}`;
      const hz = textoHanzi(s);
      if (hz in visto) expect(visto[hz], `${hz} con dos pinyin distintos`).toBe(valor);
      visto[hz] = valor;
    };
    const ids = Object.keys(OBJETOS) as ObjetoId[];
    for (const e of estadosAlcanzables()) {
      for (const h of [8, 13, 20]) for (const id of ids) for (const a of acciones(id, e, h)) { anotar(a.verbo); anotar(a.frase); }
    }
    for (const id of ids) {
      for (const v of VALORES[id]) for (const a of acciones(id, { ...ESTADO_INICIAL, [id]: v })) { anotar(a.verbo); anotar(a.frase); }
    }
    expect(visto).toEqual(ESPERADO);
  });
  it("盛饭 es chéng fàn (servir arroz), no shèng", () => {
    expect(ESPERADO["盛饭"]).toBe("chéng fàn|24");
  });
  it("frases fijas y nombres de la comida del refri", () => {
    const val = (s: Silaba[]) => `${s.map(([, p]) => p).join(" ")}|${s.map(([, , t]) => t).join("")}`;
    expect(val(F.HEN_HAO_CHI)).toBe("hén hǎo chī|231");
    expect(val(F.HEN_RE)).toBe("hěn rè|34");
    expect(val(F.HEN_LENG)).toBe("hén lěng|23");
    expect(val(F.WEI)).toBe("wéi|2");
    expect(val(F.MAO)).toBe("māo|1");
    expect(val(F.WO_ZUO_HAO_FAN_LE)).toBe("wǒ zuò hǎo fàn le|34345");
    expect(val(F.MI)).toBe("mǐ|3");
    expect(val(F.SHUI)).toBe("shuǐ|3");
    expect(val(F.HU_LUO_BO)).toBe("hú luó bo|225");
    const n = (k: keyof typeof NOMBRES_COMIDA) => val(NOMBRES_COMIDA[k]);
    expect(n("pingguo")).toBe("píng guǒ|23");
    expect(n("xiangjiao")).toBe("xiāng jiāo|11");
    expect(n("xigua")).toBe("xī guā|11");
    expect(n("caomei")).toBe("cǎo méi|32");
    expect(n("huluobo")).toBe("hú luó bo|225");
    expect(n("xihongshi")).toBe("xī hóng shì|124");
    expect(n("tudou")).toBe("tǔ dòu|34");
    expect(n("xilanhua")).toBe("xī lán huā|121");
    expect(n("mogu")).toBe("mó gu|25");
    expect(n("niunai")).toBe("niú nǎi|23");
    expect(n("jidan")).toBe("jī dàn|14");
    expect(n("mianbao")).toBe("miàn bāo|41");
    expect(n("mi")).toBe("mǐ|3");
  });
});
