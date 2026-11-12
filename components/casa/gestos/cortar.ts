import { dist, type Gesto, type P } from "./tipos";

const META = 3;
const LARGO_MIN = 0.22;

export function crearCortar(): Gesto {
  let ini: P | null = null;
  let ult: P | null = null;
  let cortes = 0;
  const fin = (p: P) => {
    if (!ini) return;
    const largo = dist(ini, p);
    const cruzaV = Math.min(ini.v, p.v) < 0.65 && Math.max(ini.v, p.v) > 0.45;
    const cruzaU = Math.min(ini.u, p.u) < 0.45 && Math.max(ini.u, p.u) > 0.55;
    if (largo > LARGO_MIN && (cruzaV || cruzaU)) cortes++;
    ini = null;
    ult = null;
  };
  return {
    abajo(p) { ini = p; ult = p; },
    mover(p) { if (ini) ult = p; },
    arriba(p) { fin(p ?? ult!); },
    tic() {},
    reiniciar() { ini = null; ult = null; },
    progreso: () => Math.min(1, cortes / META),
    listo: () => cortes >= META,
  };
}
