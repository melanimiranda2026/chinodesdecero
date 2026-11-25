/**
 * Geometría del living comedor (客厅). La usan el juego (dónde está la mesa, dónde se para la vaca) y el
 * generador de arte (`scripts/arte-iso.ts`), así el dibujo y las posiciones nunca se desalinean.
 * Mismo cuarto que la cocina: piso de 0 a 10 en u y v, la misma proyección (`ISO`, `proyectar`).
 */
import { proyectar, type Punto } from "../cocina/iso";

/** Muebles del living (en unidades u, v, z). */
export const MUEBLES_LIVING = {
  /** mesa de comedor, al centro del cuarto (lleva 4 sillas, una por lado) */
  mesa: { u0: 4.4, u1: 7.6, v0: 4.2, v1: 6.6, alto: 1.9, grosor: 0.15 },
  /** sofá 沙发, con el respaldo contra la pared derecha */
  sofa: { u0: 1.8, u1: 5.2, v0: 0, v1: 1.5 },
  /** mueble de la tele 电视, contra la pared izquierda */
  muebleTele: { u0: 0, u1: 0.85, v0: 1.6, v1: 4.4, alto: 1.2 },
  /** alfombra bajo la mesa y las sillas */
  alfombra: { u0: 3.1, u1: 8.9, v0: 3.0, v1: 7.8 },
  /** la tele sobre su pie: caja de u0 a u1; su vidrio (en la cara u = u1) va `marco` hacia adentro de cada borde */
  tele: { u0: 0.26, u1: 0.4, v0: 2.0, v1: 4.0, z0: 1.55, z1: 3.2, marco: 0.1 },
} as const;

const m = MUEBLES_LIVING.mesa;
/** Las 8 esquinas del tablero, en pantalla. */
const esquinas: Punto[] = [m.u0, m.u1].flatMap((u) =>
  [m.v0, m.v1].flatMap((v) => [m.alto - m.grosor, m.alto].map((z) => proyectar(u, v, z))),
);
const r1 = (n: number) => Math.round(n * 10) / 10;
const xs = esquinas.map((p) => p.x), ys = esquinas.map((p) => p.y);

/**
 * El tablero de la mesa en unidades del cuarto (cuadro de 1000 x 1000): x, y es la esquina de arriba a la
 * izquierda del rectángulo que lo encierra. Zona de toque y centro del zoom.
 */
export const MESA_LIVING = {
  x: r1(Math.min(...xs)),
  y: r1(Math.min(...ys)),
  w: r1(Math.max(...xs) - Math.min(...xs)),
  h: r1(Math.max(...ys) - Math.min(...ys)),
} as const;

/** Dónde se para la vaca (sus patas) al ir a la mesa: en el piso, a la izquierda, sin taparla. */
const parada = proyectar(m.u0 - 1.2, m.v1 + 1.0);
export const PARADA_VACA = { x: r1(parada.x), y: r1(parada.y) } as const;
