import { describe, expect, it } from "vitest";
import { idAudio } from "@/lib/silabas";
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
  it("盛饭 se graba como cheng2", () => {
    expect(ids).toContain("cheng2_fan4");
    expect(ids).toContain("wo3_cheng2_fan4");
    expect(ids.some((i) => i.includes("sheng4"))).toBe(false);
  });
});
