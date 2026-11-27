/**
 * Geometría del living comedor (客厅). La usan el juego (dónde está la mesa, dónde se para la vaca) y el
 * generador de arte (`scripts/arte-iso.ts`), así el dibujo y las posiciones nunca se desalinean.
 * Mismo cuarto que la cocina: piso de 0 a 10 en u y v, la misma proyección (`ISO`, `proyectar`).
 */
import { proyectar, type Punto } from "../cocina/iso";
import type { DefPieza } from "../motor/tipos";

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
  /** la foto de la familia, en la pared derecha (v = 0) sobre el sofá: se ve también en el encuadre vertical del celular */
  foto: { u0: 2.7, u1: 4.2, z0: 3.5, z1: 4.8 },
  /** el cuadro de bambú, a la derecha de la foto (antes del reloj) */
  bambu: { u0: 4.65, u1: 6.65, z0: 3.0, z1: 4.7 },
} as const;

/** Silla del comedor: medio lado, alto de la madera del asiento, alto del cojín, alto del respaldo y grosor de pata. */
export const SILLA = { s: 0.46, zA: 1.0, zB: 1.12, zR: 2.95, pata: 0.11 } as const;
type Respaldo = "u-" | "u+" | "v-" | "v+";
/** Cuánto se separa el centro de cada silla del borde de la mesa (el asiento entra un poquito bajo el tablero). */
const SEP = 0.5;
const { mesa: me } = MUEBLES_LIVING;
const um = (me.u0 + me.u1) / 2, vm = (me.v0 + me.v1) / 2;
/** Las cuatro sillas, una por lado; `respaldo` es el lado del respaldo (lejos de la mesa). */
export const SILLAS_LIVING = {
  atras: { u: um, v: me.v0 - SEP, respaldo: "v-" },
  izquierda: { u: me.u0 - SEP, v: vm, respaldo: "u-" },
  adelante: { u: um, v: me.v1 + SEP, respaldo: "v+" },
  derecha: { u: me.u1 + SEP, v: vm, respaldo: "u+" },
} as const satisfies Record<string, { u: number; v: number; respaldo: Respaldo }>;
export type SillaId = keyof typeof SILLAS_LIVING;

/** Planta de la esquina (centro de la maceta). */
export const PLANTA_LIVING = { u: 9.35, v: 0.5 } as const;

const huellaSilla = (id: SillaId) => {
  const c = SILLAS_LIVING[id];
  return { u0: c.u - SILLA.s, u1: c.u + SILLA.s, v0: c.v - SILLA.s, v1: c.v + SILLA.s, alto: SILLA.zR };
};

/**
 * Los muebles con capa propia (`public/arte/living/pieza_<id>.svg`), de atrás hacia adelante, con su huella en el
 * piso: si la vaca queda detrás de uno, su capa se dibuja encima de ella. La silla de la izquierda es la del 坐.
 */
export const PIEZAS_LIVING: DefPieza[] = [
  { id: "tele", arte: "living/pieza_tele", u0: 0, u1: 0.85, v0: 1.6, v1: 4.4, alto: 3.2 },
  { id: "sofa", arte: "living/pieza_sofa", u0: 1.8, u1: 5.2, v0: 0, v1: 1.5, alto: 2.05, asientoDe: "shafa" },
  { id: "planta", arte: "living/pieza_planta", u0: PLANTA_LIVING.u - 0.4, u1: PLANTA_LIVING.u + 0.4, v0: PLANTA_LIVING.v - 0.4, v1: PLANTA_LIVING.v + 0.4, alto: 4.6 },
  { id: "silla_atras", arte: "living/pieza_silla_atras", ...huellaSilla("atras") },
  { id: "silla_izquierda", arte: "living/pieza_silla_izquierda", ...huellaSilla("izquierda"), asientoDe: "yizi" },
  { id: "mesa", arte: "living/pieza_mesa", u0: me.u0, u1: me.u1, v0: me.v0, v1: me.v1, alto: me.alto + 0.06 },
  { id: "silla_adelante", arte: "living/pieza_silla_adelante", ...huellaSilla("adelante") },
  { id: "silla_derecha", arte: "living/pieza_silla_derecha", ...huellaSilla("derecha") },
];

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
