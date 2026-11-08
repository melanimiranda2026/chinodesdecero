import { acotar, type Gesto } from "./tipos";

const VEL = 0.32 / 1000;
const MIN = 0.62;
const MAX = 0.95;
/** Banda en que soltar cuenta como lleno (el vaso dibuja estas dos líneas). */
export const BANDA_LLENAR = { min: MIN, max: MAX } as const;
const TRAS_REBALSE = 0.25;

export interface Llenar extends Gesto {
  nivel(): number;
  /** true una sola vez después de un rebalse. */
  rebalso(): boolean;
}

export function crearLlenar(): Llenar {
  let apretado = false;
  let previo = 0;
  let nivel = 0;
  let rebalse = false;
  let ok = false;
  const avanzar = (t: number) => {
    if (apretado) {
      nivel += VEL * Math.max(0, t - previo);
      if (nivel > 1) {
        nivel = TRAS_REBALSE;
        rebalse = true;
      }
    }
    previo = t;
  };
  return {
    abajo(_p, t) { if (ok) return; apretado = true; previo = t; },
    mover() {},
    arriba(_p, t) {
      if (!apretado) return;
      avanzar(t);
      apretado = false;
      if (nivel >= MIN && nivel <= MAX) ok = true;
    },
    tic(t) { if (!ok) avanzar(t); },
    reiniciar() { apretado = false; },
    progreso: () => (ok ? 1 : acotar(nivel / MIN)),
    listo: () => ok,
    nivel: () => nivel,
    rebalso() {
      const r = rebalse;
      rebalse = false;
      return r;
    },
  };
}
