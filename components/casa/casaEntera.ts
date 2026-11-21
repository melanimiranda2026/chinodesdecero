/**
 * Geometría de la casa entera (el dibujo que abre la web): los cuatro cuartos en isometría 2×2, cada uno es el
 * mismo cuadro de 1000 x 1000 unidades de su cuarto, achicado a `ESCALA_CASA`. La usan el generador de arte
 * (`scripts/arte-iso.ts`) y la entrada (`EntradaCasa`), así el dibujo y la cámara nunca se desalinean.
 *
 * El orden es el del minimapa girado en isometría: el living adelante (con la puerta de entrada), la cocina a
 * su izquierda (detrás de la puerta 厨房 del living), el baño a su derecha y el dormitorio al fondo.
 */
import { ISO, proyectar, type Punto } from "./cocina/iso";
import type { CuartoId } from "./motor/tipos";

/** Cada cuarto se dibuja a este tamaño dentro de la casa. */
export const ESCALA_CASA = 0.5;
/** Dónde cae, en la casa, la esquina del fondo del piso del dormitorio (el cuarto de atrás). */
const ORIGEN = { x: 500, y: 330 } as const;

/** Lugar de cada cuarto en la cuadrícula: `i` a lo largo de u, `j` a lo largo de v (0 atrás, 1 adelante). */
export const LUGAR_CUARTO: Record<CuartoId, { i: number; j: number }> = {
  dormitorio: { i: 0, j: 0 },
  cocina: { i: 0, j: 1 },
  bano: { i: 1, j: 0 },
  living: { i: 1, j: 1 },
};

/** Cuánto se corre el cuadro de un cuarto dentro de la casa (antes de achicarlo). */
function corrimiento(c: CuartoId): Punto {
  const { i, j } = LUGAR_CUARTO[c];
  return { x: (i - j) * ISO.lado * ISO.A, y: ((i + j) * ISO.lado * ISO.A) / 2 };
}

/** Un punto (x, y) del cuadro de 1000 x 1000 de un cuarto, en el cuadro de 1000 x 1000 de la casa. */
export function enCasa(c: CuartoId, x: number, y: number): Punto {
  const d = corrimiento(c);
  return { x: ORIGEN.x + ESCALA_CASA * (x - ISO.ox + d.x), y: ORIGEN.y + ESCALA_CASA * (y - ISO.oy + d.y) };
}

/** Un punto del piso (u, v, z) de un cuarto, en la casa. */
export const enCasaUV = (c: CuartoId, u: number, v: number, z = 0): Punto => {
  const p = proyectar(u, v, z);
  return enCasa(c, p.x, p.y);
};

/** `transform` SVG que lleva el cuadro de un cuarto a su lugar en la casa. */
export function transformCuarto(c: CuartoId): string {
  const o = enCasa(c, 0, 0);
  return `translate(${o.x} ${o.y}) scale(${ESCALA_CASA})`;
}

/** Centro y zoom que encuadran el living dentro de la casa: el mismo encuadre que el cuarto del living. */
export const CENTRO_LIVING_EN_CASA: { x: number; y: number; s: number } = { ...enCasa("living", 500, 500), s: 1 / ESCALA_CASA };

/** La puerta de entrada, en la pared de adelante a la derecha del living (u = 10), cerca de la esquina. */
export const PUERTA_ENTRADA = { u: ISO.lado, v0: 8.0, v1: 9.4, alto: 3.3 } as const;

/** Donde se paran las patas de la vaca frente a la puerta de entrada (sobre el felpudo). */
export const VACA_EN_PUERTA: Punto = enCasaUV("living", PUERTA_ENTRADA.u + 0.9, (PUERTA_ENTRADA.v0 + PUERTA_ENTRADA.v1) / 2);
/** Donde parte la vaca: afuera, en el camino hacia la puerta. */
export const VACA_AFUERA: Punto = enCasaUV("living", PUERTA_ENTRADA.u + 5.5, PUERTA_ENTRADA.v1 + 2.5);
