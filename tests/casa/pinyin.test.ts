import { describe, expect, it } from "vitest";
import { acciones, estadosAlcanzables } from "@/components/casa/cocina/acciones";
import { OBJETOS, type ObjetoId } from "@/components/casa/cocina/datos";
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
  "我吃饭": "wǒ chī fàn|314",
  "我吃饺子": "wǒ chī jiǎo zi|3135",
  "我喝水": "wǒ hē shuǐ|313",
  "我喝茶": "wǒ hē chá|312",
  "我打开冰箱": "wǒ dǎ kāi bīng xiāng|33111",
  "我拿盘子": "wǒ ná pán zi|3225",
  "我拿碗": "wǒ ná wǎn|323",
  "我拿筷子": "wǒ ná kuài zi|3245",
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
    for (const e of estadosAlcanzables()) {
      for (const id of Object.keys(OBJETOS) as ObjetoId[]) for (const a of acciones(id, e)) { anotar(a.verbo); anotar(a.frase); }
    }
    expect(visto).toEqual(ESPERADO);
  });
  it("盛饭 es chéng fàn (servir arroz), no shèng", () => {
    expect(ESPERADO["盛饭"]).toBe("chéng fàn|24");
  });
});
