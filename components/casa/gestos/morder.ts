import type { Gesto } from "./tipos";

const META = 6;

export function crearMorder(): Gesto {
  let n = 0;
  return {
    abajo(p) { if (p.u >= 0 && p.u <= 1 && p.v >= 0 && p.v <= 1) n++; },
    mover() {},
    arriba() {},
    tic() {},
    reiniciar() {},
    progreso: () => Math.min(1, n / META),
    listo: () => n >= META,
  };
}
