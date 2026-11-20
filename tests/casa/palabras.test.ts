import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PALABRAS, srcPalabra, type Tecnica } from "@/components/casa/living/palabras";
import { idAudio, textoHanzi } from "@/lib/silabas";

describe("las 50 palabras de la mesa", () => {
  it("son 50, con ids únicos que coinciden con su audio", () => {
    expect(PALABRAS).toHaveLength(50);
    expect(new Set(PALABRAS.map((p) => p.id)).size).toBe(50);
    for (const p of PALABRAS) expect(p.audio ?? p.id).toBe(idAudio(p.s));
    expect(PALABRAS.filter((p) => p.audio).map((p) => p.id)).toEqual(["ta1_ella"]);
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
