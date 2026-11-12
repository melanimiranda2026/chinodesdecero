import { crearCortar } from "@/components/casa/gestos/cortar";
import { crearFrotar } from "@/components/casa/gestos/frotar";
import { crearLlenar } from "@/components/casa/gestos/llenar";
import { crearBeber } from "@/components/casa/gestos/beber";
import { crearGirar } from "@/components/casa/gestos/girar";
import { crearMorder } from "@/components/casa/gestos/morder";
import { medalla, GESTO_DE } from "@/components/casa/gestos/medalla";

describe("cortar", () => {
  it("3 cortes largos que cruzan la franja central", () => {
    const g = crearCortar();
    for (let i = 0; i < 3; i++) {
      expect(g.listo()).toBe(false);
      g.abajo({ u: 0.2 + i * 0.1, v: 0.2 }, 0);
      g.mover({ u: 0.2 + i * 0.1, v: 0.5 }, 1);
      g.arriba({ u: 0.2 + i * 0.1, v: 0.8 }, 2);
    }
    expect(g.listo()).toBe(true);
    expect(g.progreso()).toBe(1);
  });
  it("un trazo corto no cuenta", () => {
    const g = crearCortar();
    g.abajo({ u: 0.5, v: 0.45 }, 0);
    g.arriba({ u: 0.5, v: 0.55 }, 1);
    expect(g.progreso()).toBe(0);
  });
  it("un trazo largo fuera de la franja central no cuenta", () => {
    const g = crearCortar();
    g.abajo({ u: 0.1, v: 0.05 }, 0);
    g.arriba({ u: 0.2, v: 0.35 }, 1);
    expect(g.progreso()).toBe(0);
  });
});

describe("frotar", () => {
  it("suma recorrido hasta 5", () => {
    const g = crearFrotar();
    g.abajo({ u: 0, v: 0.5 }, 0);
    for (let i = 0; i < 4; i++) g.mover({ u: i % 2 ? 0 : 1, v: 0.5 }, 1);
    expect(g.listo()).toBe(false);
    g.mover({ u: 1, v: 0.5 }, 1);
    expect(g.listo()).toBe(true);
  });
  it("reiniciar a mitad conserva el recorrido pero corta el trazo", () => {
    const g = crearFrotar();
    g.abajo({ u: 0, v: 0.5 }, 0);
    g.mover({ u: 1, v: 0.5 }, 1);
    const antes = g.progreso();
    expect(antes).toBeCloseTo(0.2);
    g.reiniciar();
    g.mover({ u: 0, v: 0.5 }, 2);
    expect(g.progreso()).toBeCloseTo(antes);
    g.abajo({ u: 0, v: 0.5 }, 3);
    g.mover({ u: 1, v: 0.5 }, 4);
    expect(g.progreso()).toBeCloseTo(0.4);
  });
  it("ignora movimiento fuera de la zona", () => {
    const g = crearFrotar();
    g.abajo({ u: 2, v: 2 }, 0);
    g.mover({ u: 3, v: 3 }, 1);
    expect(g.progreso()).toBe(0);
  });
});

describe("llenar", () => {
  it("soltar con el nivel en [0.62, 0.95] completa", () => {
    const g = crearLlenar();
    g.abajo({ u: 0.5, v: 0.5 }, 0);
    g.tic(1000);
    expect(g.nivel()).toBeCloseTo(0.32);
    g.arriba({ u: 0.5, v: 0.5 }, 2500);
    expect(g.nivel()).toBeCloseTo(0.8);
    expect(g.listo()).toBe(true);
  });
  it("mantener 4 s rebalsa", () => {
    const g = crearLlenar();
    g.abajo({ u: 0.5, v: 0.5 }, 0);
    g.tic(4000);
    expect(g.rebalso()).toBe(true);
    expect(g.rebalso()).toBe(false);
    expect(g.nivel()).toBeCloseTo(0.25);
    expect(g.listo()).toBe(false);
  });
  it("soltar en 0.5 no completa", () => {
    const g = crearLlenar();
    g.abajo({ u: 0.5, v: 0.5 }, 0);
    g.arriba({ u: 0.5, v: 0.5 }, 1562.5);
    expect(g.nivel()).toBeCloseTo(0.5);
    expect(g.listo()).toBe(false);
  });
  it("sin apretar el nivel no sube", () => {
    const g = crearLlenar();
    g.tic(5000);
    expect(g.nivel()).toBe(0);
  });
});

describe("beber", () => {
  it("baja 0.3/s desde 0.8 y termina en <= 0", () => {
    const g = crearBeber();
    g.abajo({ u: 0.5, v: 0.5 }, 0);
    g.tic(1000);
    expect(g.nivel()).toBeCloseTo(0.5);
    expect(g.listo()).toBe(false);
    g.tic(2700);
    expect(g.listo()).toBe(true);
    expect(g.progreso()).toBe(1);
  });
  it("soltar detiene el descenso; reiniciar suelta y conserva el nivel", () => {
    const g = crearBeber();
    g.abajo({ u: 0.5, v: 0.5 }, 0);
    g.arriba({ u: 0.5, v: 0.5 }, 1000);
    g.tic(5000);
    expect(g.nivel()).toBeCloseTo(0.5);
    g.abajo({ u: 0.5, v: 0.5 }, 6000);
    g.reiniciar();
    g.tic(9000);
    expect(g.nivel()).toBeCloseTo(0.5);
  });
});

describe("girar", () => {
  const en = (a: number) => ({ u: 0.5 + 0.4 * Math.cos(a), v: 0.5 + 0.4 * Math.sin(a) });
  it("3 vueltas completan", () => {
    const g = crearGirar();
    g.abajo(en(0), 0);
    const pasos = 3 * 36;
    for (let i = 1; i <= pasos; i++) g.mover(en((i * 2 * Math.PI) / 36), i);
    expect(g.listo()).toBe(true);
  });
  it("ir y volver media vuelta suma como recorrido", () => {
    const g = crearGirar();
    g.abajo(en(0), 0);
    for (let i = 1; i <= 18; i++) g.mover(en((i * Math.PI) / 18), i);
    for (let i = 17; i >= 0; i--) g.mover(en((i * Math.PI) / 18), 40 - i);
    expect(g.progreso()).toBeCloseTo(2 * Math.PI / (6 * Math.PI));
  });
});

describe("morder", () => {
  it("6 mordiscos dentro de la zona", () => {
    const g = crearMorder();
    g.abajo({ u: 1.5, v: 0.5 }, 0);
    for (let i = 0; i < 5; i++) g.abajo({ u: 0.5, v: 0.5 }, i);
    expect(g.listo()).toBe(false);
    g.abajo({ u: 0.2, v: 0.8 }, 9);
    expect(g.listo()).toBe(true);
  });
});

describe("medalla y GESTO_DE", () => {
  it("umbrales", () => {
    expect(medalla(4.9)).toBe("oro");
    expect(medalla(5)).toBe("plata");
    expect(medalla(8.9)).toBe("plata");
    expect(medalla(9)).toBe("bronce");
    expect(medalla(30)).toBe("bronce");
  });
  it("mapa de gestos", () => {
    expect(GESTO_DE.servirTe).toBe("llenar");
    expect(GESTO_DE.cocinar).toBe("girar");
    expect(GESTO_DE.tomar).toBeUndefined();
  });
});
