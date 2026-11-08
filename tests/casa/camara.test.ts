import { enfocar, transformCSS, enPantalla, puntoJunto, limitarVaca, objetoBajo, ubicarOpciones, encuadreInicial, encuadrar, X_VERTICAL } from "@/components/casa/camara";
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

  it("enfocar nunca aleja más que la vista completa (s < 1 pasa a 1)", () => {
    expect(enfocar(500, 500, 0.5)).toEqual({ x: 500, y: 500, s: 1 });
  });
  it("encuadreInicial: cuadrado o apaisado es la identidad", () => {
    expect(encuadreInicial(800, 800)).toEqual({ x: 500, y: 500, s: 1 });
    expect(encuadreInicial(1280, 800)).toEqual({ x: 500, y: 500, s: 1 });
    expect(encuadreInicial(0, 0)).toEqual({ x: 500, y: 500, s: 1 });
  });
  it("encuadreInicial: en vertical el cuarto llena el alto, con la vaca (x=250) entera a la vista", () => {
    const c = encuadreInicial(360, 740);
    expect(c.x).toBe(X_VERTICAL);
    expect(c.x - 500 / c.s).toBeLessThanOrEqual(250 - 100); // borde izquierdo visible antes que la vaca
    expect(c.y).toBe(500);
    expect(c.s).toBeCloseTo(740 / 360);
  });
  it("en vertical el cuarto llena el alto exacto: borde de arriba en 0 %, de abajo en 100 %", () => {
    const a = 740 / 360;
    const c = encuadreInicial(360, 740);
    expect(enPantalla(c, 500, 0, a).y).toBeCloseTo(0);
    expect(enPantalla(c, 500, 1000, a).y).toBeCloseTo(100);
    expect(enPantalla(c, X_VERTICAL, 500, a)).toEqual({ x: 50, y: 50 });
    // el mundo mide ancho x ancho; se corre hacia arriba para que el centro quede al medio del alto
    expect(transformCSS(c, a)).toBe(`translate(${50 - (X_VERTICAL * c.s) / 10}%, ${50 * a - (500 * c.s) / 10}%) scale(${c.s})`);
  });
  it("encuadrar: en vertical nunca muestra fuera del cuarto y el paneo se limita", () => {
    const a = 740 / 360;
    const v = encuadrar({ x: 500, y: 500, s: 1 }, 360, 740, { x: -900, y: 300 });
    expect(v.s).toBeCloseTo(a);
    expect(v.x).toBeCloseTo(500 / a); // borde izquierdo del cuarto
    expect(v.y).toBeCloseTo(500); // en vertical el cuarto ya llena el alto: no hay paneo vertical
    const z = encuadrar(enfocar(100, 100, 1.9), 360, 740);
    expect(z.s).toBeGreaterThanOrEqual(a);
    expect(enPantalla(z, 0, 0, a).y).toBeLessThanOrEqual(0.0001);
    expect(enPantalla(z, 0, 0, a).x).toBeLessThanOrEqual(0.0001);
  });
  it("encuadrar: en cuadrado deja la cámara igual", () => {
    const c = enfocar(300, 300, 1.9);
    expect(encuadrar(c, 800, 800)).toEqual(c);
  });
});
