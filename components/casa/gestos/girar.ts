import type { Gesto, P } from "./tipos";

const META = 3 * 2 * Math.PI;
const ang = (p: P) => Math.atan2(p.v - 0.5, p.u - 0.5);

export function crearGirar(): Gesto {
  let previo: number | null = null;
  let total = 0;
  return {
    abajo(p) { previo = ang(p); },
    mover(p) {
      if (previo === null) return;
      const a = ang(p);
      let d = a - previo;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      previo = a;
      total += Math.abs(d);
    },
    arriba() { previo = null; },
    tic() {},
    reiniciar() { previo = null; },
    progreso: () => Math.min(1, total / META),
    listo: () => total >= META,
  };
}
