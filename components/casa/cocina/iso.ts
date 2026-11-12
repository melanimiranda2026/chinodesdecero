/**
 * Geometría isométrica de la cocina. La usan el juego (dónde están las cosas) y el generador de arte
 * (`scripts/arte-iso.ts`), así el dibujo y las posiciones nunca se desalinean.
 *
 * Coordenadas del cuarto: u (a lo largo de la pared derecha, hacia abajo a la derecha),
 * v (a lo largo de la pared izquierda, hacia abajo a la izquierda) y z (altura). El piso va de 0 a 10 en u y v.
 * La pantalla es el cuadro de 1000 x 1000 unidades del cuarto (proyección 2:1).
 */
export const ISO = {
  /** px horizontales por unidad de u o v */
  A: 44,
  /** px verticales por unidad de altura */
  Z: 40,
  /** esquina del fondo, a nivel del piso */
  ox: 500,
  oy: 360,
  /** lado del piso */
  lado: 10,
  /** alto de las paredes */
  altoPared: 6.2,
} as const;

export type Punto = { x: number; y: number };

export function proyectar(u: number, v: number, z = 0): Punto {
  return { x: ISO.ox + (u - v) * ISO.A, y: ISO.oy + ((u + v) * ISO.A) / 2 - z * ISO.Z };
}

/** De la pantalla al piso (z = 0). */
export function alPiso(x: number, y: number): { u: number; v: number } {
  const d = (x - ISO.ox) / ISO.A; // u - v
  const s = (2 * (y - ISO.oy)) / ISO.A; // u + v
  return { u: (s + d) / 2, v: (s - d) / 2 };
}

/** Muebles: la vaca camina solo donde no hay (u y v entre estos límites). */
export const PISO_LIBRE = { min: 2.4, max: 9.6 } as const;

/** Muebles del cuarto (en unidades u, v, z). El generador los dibuja; el juego coloca las cosas encima. */
export const MUEBLES = {
  /** mesón con lavaplatos, contra la pared izquierda */
  mesonIzq: { u0: 0, u1: 1.7, v0: 0, v1: 5.5, alto: 2.2 },
  /** mesón con cocina, contra la pared derecha */
  mesonDer: { u0: 1.7, u1: 5.2, v0: 0, v1: 1.7, alto: 2.2 },
  /** mesa de comer, contra la pared derecha */
  mesa: { u0: 5.6, u1: 9.8, v0: 0.2, v1: 1.6, alto: 1.9 },
  /** refri (es un objeto aparte, no parte del cuarto) */
  refri: { u0: 0, u1: 1.9, v0: 6.1, v1: 8.5, alto: 5 },
  /** lavaplatos: hueco en el mesón izquierdo */
  lavaplatos: { u0: 0.35, u1: 1.35, v0: 2.3, v1: 3.7 },
  /** placa de la cocina: en el mesón derecho */
  placa: { u0: 2.3, u1: 4.1, v0: 0.3, v1: 1.4 },
} as const;

/** Punto (u, v) sobre una superficie de altura z, en pantalla. */
export const sobre = (u: number, v: number, z: number) => proyectar(u, v, z);
