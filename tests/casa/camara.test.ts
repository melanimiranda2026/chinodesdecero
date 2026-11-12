import { enfocar, transformCSS, enPantalla, puntoJunto, limitarVaca, objetoBajo, ubicarOpciones, encuadreInicial, encuadrar, centroBase, X_VERTICAL, ZOOM_VERTICAL, apuntar } from "@/components/casa/camara";
import { PISO_LIBRE, proyectar } from "@/components/casa/cocina/iso";
import { ESTADO_INICIAL, FREGADERO, OBJETOS } from "@/components/casa/cocina/datos";

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
    // en el piso, frente al mueble: siempre dentro del piso libre
    for (const id of ["fregadero", "bingxiang", "guo", "panzi", "pingguo"] as const) {
      const p = puntoJunto(id);
      expect(limitarVaca(p.x, p.y)).toEqual(p);
    }
    expect(puntoJunto("guo")).toEqual(OBJETOS.guo.pie);
    expect(puntoJunto("fregadero").y).toBeGreaterThan(FREGADERO.y);
  });
  it("limitarVaca", () => {
    // fuera del piso: vuelve a la esquina del piso libre más cercana
    const atras = proyectar(PISO_LIBRE.min, PISO_LIBRE.min), adelante = proyectar(PISO_LIBRE.max, PISO_LIBRE.max);
    expect(limitarVaca(500, 0)).toEqual({ x: atras.x, y: atras.y });
    expect(limitarVaca(500, 2000)).toEqual({ x: adelante.x, y: adelante.y });
    // dentro del piso libre no cambia
    expect(limitarVaca(500, 600)).toEqual({ x: 500, y: 600 });
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
  it("encuadreInicial: en vertical el cuarto llena el alto, con la vaca (x=434) entera a la vista", () => {
    const c = encuadreInicial(360, 740);
    expect(c.x).toBe(X_VERTICAL);
    expect(c.x - 500 / c.s).toBeLessThanOrEqual(434 - 85); // borde izquierdo visible antes que la vaca
    expect(c.x + 500 / c.s).toBeGreaterThanOrEqual(434 + 85);
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
  it("paneo sin arrastre desde la vista completa en vertical no mueve la cámara", () => {
    const todo = { x: 500, y: 500, s: 1 };
    const v = encuadrar(todo, 360, 740);
    const b = centroBase(todo, 360, 740);
    expect(b.x).toBe(X_VERTICAL);
    const pan = { x: v.x - b.x, y: v.y - b.y };
    const w = encuadrar(todo, 360, 740, pan);
    expect(w.x).toBeCloseTo(v.x);
    expect(w.y).toBeCloseTo(v.y);
    expect(w.s).toBeCloseTo(v.s);
  });
  it("en vertical el primer plano acerca, amortiguado sobre el encuadre base", () => {
    const base = encuadreInicial(360, 740).s;
    const z = encuadrar(enfocar(600, 668, 1.9), 360, 740);
    expect(z.s).toBeCloseTo(base * (1 + 0.9 * ZOOM_VERTICAL));
    expect(z.s).toBeGreaterThan(base);
    expect(encuadrar({ x: 500, y: 500, s: 1 }, 360, 740).s).toBeCloseTo(base);
    // en cuadrado, igual que antes
    expect(encuadrar(enfocar(600, 668, 1.9), 800, 800).s).toBeCloseTo(1.9);
  });
  it("la casa apunta sin limitar; el límite lo pone la vista según su aspecto", () => {
    // cuadrado: igual que antes
    expect(encuadrar(apuntar(0, 0, 2), 800, 800)).toEqual(enfocar(0, 0, 2));
    expect(apuntar(500, 500, 0.5)).toEqual({ x: 500, y: 500, s: 1 });
    // vertical: el refri (x=100) y la vaca a su lado se encuadran contra el borde del cuarto, no en x=263
    const v = encuadrar(apuntar(100, 405, 1.9), 360, 740); // enfoque en el refri mismo
    expect(v.x).toBeCloseTo(500 / v.s);
    expect(enPantalla(v, 0, 0, 740 / 360).x).toBeCloseTo(0);
  });
});
