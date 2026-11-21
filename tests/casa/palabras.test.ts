import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PALABRAS, srcPalabra, type Tecnica } from "@/components/casa/living/palabras";
import { idAudio, textoHanzi } from "@/lib/silabas";

describe("las 50 palabras de la mesa", () => {
  it("son 50, con ids únicos que coinciden con su audio", () => {
    expect(PALABRAS).toHaveLength(50);
    expect(new Set(PALABRAS.map((p) => p.id)).size).toBe(50);
    // Sin `audio`, el id es el de sus sílabas. 她 comparte la toma de 他; 水果 usa la toma ya existente (shuǐguǒ, dicha shuíguǒ).
    for (const p of PALABRAS.filter((x) => !x.audio)) expect(p.id).toBe(idAudio(p.s));
    expect(PALABRAS.filter((x) => x.audio).map((x) => [x.id, x.audio])).toEqual([["shui2_guo3", "shui3_guo3"], ["ta1_ella", "ta1"]]);
    expect(PALABRAS.filter((p) => p.audio).map((p) => p.id)).toEqual(["shui2_guo3", "ta1_ella"]);
  });
  it("cada palabra tiene su mp3 (y el lento si lo declara)", () => {
    for (const p of PALABRAS) {
      expect(existsSync(join("public", srcPalabra(p)))).toBe(true);
      if (p.lento) expect(existsSync(join("public", srcPalabra(p, true)))).toBe(true);
    }
  });
  it("usa las 8 técnicas con las cantidades del spec", () => {
    const n = (t: Tecnica) => PALABRAS.filter((p) => p.tecnica === t).length;
    expect([n("dibujo"), n("radical"), n("suma"), n("literal"), n("gratis"), n("haoMas"), n("partes"), n("igual")]).toEqual([4, 9, 9, 9, 8, 5, 4, 2]);
  });
  it("suma, literal, 好+algo y por partes traen al menos 2 piezas; radical y dibujo al menos 1", () => {
    const min: Record<Tecnica, number> = { suma: 2, literal: 2, haoMas: 2, partes: 2, radical: 1, dibujo: 1, gratis: 0, igual: 0 };
    for (const p of PALABRAS) expect(p.piezas.length).toBeGreaterThanOrEqual(min[p.tecnica]);
  });
  it("sandhi: ninguna palabra trae dos sílabas seguidas en 3.er tono", () => {
    for (const p of PALABRAS) for (let i = 1; i < p.s.length; i++) expect(p.s[i - 1][2] === 3 && p.s[i][2] === 3, p.id).toBe(false);
  });
  it("la marca de tono del pinyin coincide con el tono (color) de cada sílaba", () => {
    const tonoDe = (py: string) => {
      const n = py.normalize("NFD");
      if (n.includes("̄")) return 1;
      if (n.includes("́")) return 2;
      if (n.includes("̌")) return 3;
      if (n.includes("̀")) return 4;
      return 5;
    };
    for (const p of PALABRAS) for (const [hz, py, t] of p.s) expect(tonoDe(py), `${p.id} ${hz} ${py}`).toBe(t);
  });
  it("你好 se escribe como se dice: ní hǎo (id ni2_hao3, con la nota del sandhi)", () => {
    const nh = PALABRAS.find((p) => textoHanzi(p.s) === "你好")!;
    expect(nh.id).toBe("ni2_hao3");
    expect(nh.s.map(([, py]) => py)).toEqual(["ní", "hǎo"]);
    expect(nh.nota).toMatch(/ní hǎo/);
  });
  it("ninguna frase invita a inventar una historia", () => {
    for (const p of PALABRAS) expect(p.frase.toLowerCase()).not.toContain("inventa");
  });
  it("ejemplos fijos del spec", () => {
    const xhs = PALABRAS.find((p) => textoHanzi(p.s) === "西红柿")!;
    expect(xhs.tecnica).toBe("literal");
    expect(xhs.piezas.map((x) => x.es)).toEqual(["oeste", "rojo", "kaki"]);
    expect(xhs.frase).toContain("kaki rojo del oeste");
    expect(PALABRAS.find((p) => textoHanzi(p.s) === "好")!.piezas.map((x) => x.hz)).toEqual(["女", "子"]);
  });
});
