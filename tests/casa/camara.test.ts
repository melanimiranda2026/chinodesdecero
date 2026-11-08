import { enfocar, transformCSS, enPantalla, puntoJunto, limitarVaca, objetoBajo, ubicarOpciones } from "@/components/casa/camara";
import { ESTADO_INICIAL, OBJETOS } from "@/components/casa/cocina/datos";

describe("camara", () => {
  it("enfocar limita el centro al cuarto", () => {
    const c = enfocar(0, 0, 2);
    expect(c.x).toBe(250);
    expect(c.y).toBe(250);
  });
  it("vista completa es identidad", () => {
    expect(transformCSS(enfocar(500, 500, 1))).toBe("translate(0%, 0%) scale(1)");
  });
  it("enPantalla centra el punto enfocado", () => {
    expect(enPantalla(enfocar(500, 500, 1), 500, 500)).toEqual({ x: 50, y: 50 });
  });
  it("puntoJunto", () => {
    expect(puntoJunto("fregadero")).toEqual({ x: 450, y: 560 });
    expect(puntoJunto("bingxiang")).toEqual({ x: 270, y: 580 });
    expect(puntoJunto("guo")).toEqual({ x: 741, y: 560 });
    expect(puntoJunto("panzi")).toEqual({ x: 430, y: 860 });
  });
  it("limitarVaca", () => {
    expect(limitarVaca(0, 0)).toEqual({ x: 80, y: 520 });
    expect(limitarVaca(2000, 2000)).toEqual({ x: 920, y: 990 });
  });
  it("objetoBajo ignora estado nada", () => {
    const o = OBJETOS.pingguo;
    const vaca = { x: o.x, y: o.y + 90 };
    expect(objetoBajo(vaca, ESTADO_INICIAL)).toBe("pingguo");
    expect(objetoBajo(vaca, { ...ESTADO_INICIAL, pingguo: "nada" })).toBeNull();
  });
  it("ubicarOpciones del refri con zoom 1.9 queda dentro de limites", () => {
    const c = enfocar(OBJETOS.bingxiang.x, OBJETOS.bingxiang.y, 1.9);
    const p = ubicarOpciones(c, "bingxiang", 3);
    expect(p).toHaveLength(3);
    for (const q of p) {
      expect(q.x).toBeGreaterThanOrEqual(16);
      expect(q.x).toBeLessThanOrEqual(84);
      expect(q.y).toBeGreaterThanOrEqual(12);
      expect(q.y).toBeLessThanOrEqual(90);
    }
    const v = ubicarOpciones(c, "bingxiang", 3, true);
    for (const q of v) expect(q.x).toBeGreaterThanOrEqual(12);
  });
});
