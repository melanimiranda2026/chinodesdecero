import type { Silaba } from "@/lib/silabas";
import { HU_LUO_BO, MI, SHUI } from "../cocina/frases";

/** Lo que lleva el 米饭 de la casa: 米 + 水 + 胡萝卜. */
export type Ingrediente = "mi" | "shui" | "huluobo";

/** En el orden de la tarjeta de receta. */
export const INGREDIENTES: readonly Ingrediente[] = ["mi", "shui", "huluobo"];

/** Lo que la vaca dice al echar cada uno. */
export const NOMBRE_INGREDIENTE: Record<Ingrediente, Silaba[]> = { mi: MI, shui: SHUI, huluobo: HU_LUO_BO };

/** Echa un ingrediente a la olla. Uno repetido no cambia nada (devuelve el mismo conjunto). */
export function echar(en: Set<Ingrediente>, i: Ingrediente): Set<Ingrediente> {
  if (en.has(i)) return en;
  return new Set([...en, i]);
}

/** La olla está lista para revolver: tiene los tres. */
export function lista(en: Set<Ingrediente>): boolean {
  return INGREDIENTES.every((i) => en.has(i));
}
