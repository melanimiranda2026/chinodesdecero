import { acotar, type Gesto } from "./tipos";

const VEL = 0.3 / 1000;
const INICIAL = 0.8;

export interface Beber extends Gesto {
  nivel(): number;
}

export function crearBeber(): Beber {
  let apretado = false;
  let previo = 0;
  let nivel = INICIAL;
  const avanzar = (t: number) => {
    if (apretado) nivel = Math.max(0, nivel - VEL * Math.max(0, t - previo));
    previo = t;
  };
  return {
    abajo(_p, t) { if (nivel <= 0) return; apretado = true; previo = t; },
    mover() {},
    arriba(_p, t) { avanzar(t); apretado = false; },
    tic(t) { avanzar(t); },
    reiniciar() { apretado = false; },
    progreso: () => acotar(1 - nivel / INICIAL),
    listo: () => nivel <= 0,
    nivel: () => nivel,
  };
}
