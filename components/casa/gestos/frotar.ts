import { dist, type Gesto, type P } from "./tipos";

const META = 5;

export function crearFrotar(): Gesto {
  let ult: P | null = null;
  let recorrido = 0;
  return {
    abajo(p) { ult = p; },
    mover(p) {
      if (!ult) return;
      const d = dist(ult, p);
      ult = p;
      if (p.u < -0.1 || p.u > 1.1 || p.v < -0.1 || p.v > 1.1) return;
      recorrido += d;
    },
    arriba() { ult = null; },
    tic() {},
    reiniciar() { ult = null; },
    progreso: () => Math.min(1, recorrido / META),
    listo: () => recorrido >= META,
  };
}
