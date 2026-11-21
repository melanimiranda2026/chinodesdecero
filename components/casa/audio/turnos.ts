import { sfx } from "./sonido";
import type { JuegoVoz } from "./motor";

/** Cuánto dura cada efecto (ms) antes de que pueda empezar el mandarín. Ajustar si cambian los archivos de /sfx. */
export const ESPERA_SFX: Record<string, number> = {
  tragos: 700,
  brillo: 500,
  ding: 450,
  boing: 400,
  golpe: 400,
};
export const ESPERA_SFX_DEFECTO = 350;

export const esperaDe = (nombre: string) => ESPERA_SFX[nombre] ?? ESPERA_SFX_DEFECTO;

/**
 * El único camino para "efecto + frase": toca el efecto, espera lo que dura y recién entonces habla.
 * Así un efecto nunca queda encima del mandarín.
 */
export async function efectoYLuegoVoz<T>(
  nombre: string,
  decirFn: () => Promise<T>,
  { ms = esperaDe(nombre), juego }: { ms?: number; juego?: JuegoVoz } = {},
): Promise<T> {
  sfx(nombre, juego);
  await new Promise<void>((r) => setTimeout(r, ms));
  return decirFn();
}
