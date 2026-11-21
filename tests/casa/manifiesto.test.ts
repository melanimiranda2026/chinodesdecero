import { describe, expect, it } from "vitest";
import { idAudio, textoHanzi } from "@/lib/silabas";
import { frasesUsadas } from "@/components/casa/audio/manifiesto";
import { OBJETOS_QUIZ } from "@/components/casa/quiz";
import { OBJETOS } from "@/components/casa/cocina/datos";
import { GEI_WO } from "@/components/casa/cocina/frases";

describe("frasesUsadas", () => {
  const ids = frasesUsadas().map(idAudio);
  it("incluye las frases clave", () => {
    for (const id of ["wo3_he1_shui3", "zhe4_shi4_bei1_zi5", "gei3_wo3_wan3", "tai4_bang4_le5", "ni2_hao3"]) {
      expect(ids).toContain(id);
    }
  });
  it("no repite ids", () => {
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("给我 solo para los objetos del 玩 (no 给我冰箱)", () => {
    expect(ids).not.toContain("gei3_wo3_bing1_xiang1");
    const gei = ids.filter((i) => i.startsWith("gei3_wo3_"));
    expect(gei).toHaveLength(OBJETOS_QUIZ.length);
    for (const id of OBJETOS_QUIZ) expect(ids).toContain(idAudio([...GEI_WO, ...OBJETOS[id].nombre]));
  });
  it("incluye las frases de la cocina grande", () => {
    const hz = frasesUsadas().map(textoHanzi);
    for (const t of ["很好吃", "很热", "很冷", "我做好饭了", "香蕉", "喂", "猫", "米", "水", "胡萝卜", "我吃早饭", "我吃午饭", "我吃晚饭", "我倒咖啡", "我关灯", "我开灯", "我打开窗户", "我关上窗户", "我打开垃圾桶", "我坐下", "我打电话", "这是猫", "给我咖啡杯", "给我手机"])
      expect(hz, t).toContain(t);
  });
  it("盛饭 se graba como cheng2", () => {
    expect(ids).toContain("cheng2_fan4");
    expect(ids).toContain("wo3_cheng2_fan4");
    expect(ids.some((i) => i.includes("sheng4"))).toBe(false);
  });
});
