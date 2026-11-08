export type P = { u: number; v: number };

export interface Gesto {
  abajo(p: P, t: number): void;
  mover(p: P, t: number): void;
  arriba(p: P, t: number): void;
  tic(t: number): void;
  /** Aborta el trazo/apretón actual (como pointercancel) pero conserva el progreso. */
  reiniciar(): void;
  progreso(): number;
  listo(): boolean;
}

export const dist = (a: P, b: P) => Math.hypot(a.u - b.u, a.v - b.v);
export const acotar = (x: number) => Math.min(1, Math.max(0, x));
