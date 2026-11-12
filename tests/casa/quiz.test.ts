import { describe, expect, it } from "vitest";
import { crearQuiz, responder } from "@/components/casa/quiz";
import { ESTADO_INICIAL } from "@/components/casa/cocina/datos";

const azarFijo = (valores: number[]) => {
  let k = 0;
  return () => valores[k++ % valores.length];
};

describe("crearQuiz", () => {
  it("da 4 objetos distintos", () => {
    const q = crearQuiz(ESTADO_INICIAL, azarFijo([0.1, 0.9, 0.5, 0.3]));
    expect(q.rondas).toHaveLength(4);
    expect(new Set(q.rondas).size).toBe(4);
  });
  it("nunca incluye pingguo si ya no está (nada)", () => {
    for (let s = 0; s < 40; s++) {
      let k = s + 1;
      const azar = () => ((k = (k * 9301 + 49297) % 233280) / 233280);
      const q = crearQuiz({ ...ESTADO_INICIAL, pingguo: "nada" }, azar);
      expect(q.rondas).not.toContain("pingguo");
      expect(q.rondas).not.toContain("bingxiang");
      expect(new Set(q.rondas).size).toBe(4);
    }
  });
  it("puede incluir pingguo cuando existe", () => {
    const visto = new Set<string>();
    for (let s = 0; s < 80; s++) {
      let k = s + 7;
      const azar = () => ((k = (k * 9301 + 49297) % 233280) / 233280);
      crearQuiz(ESTADO_INICIAL, azar).rondas.forEach((r) => visto.add(r));
    }
    expect(visto.has("pingguo")).toBe(true);
  });
});

describe("responder", () => {
  const q = { rondas: ["wan", "guo", "beizi", "panzi"] as const };
  it("bien con el objeto de la ronda", () => {
    expect(responder({ rondas: [...q.rondas] }, 1, "guo")).toBe("bien");
  });
  it("mal con otro", () => {
    expect(responder({ rondas: [...q.rondas] }, 1, "wan")).toBe("mal");
  });
});
