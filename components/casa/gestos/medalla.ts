import type { Anim } from "../cocina/acciones";

export type Medalla = "oro" | "plata" | "bronce";
export type TipoGesto = "cortar" | "frotar" | "llenar" | "beber" | "girar" | "morder";

export function medalla(segundos: number): Medalla {
  return segundos < 5 ? "oro" : segundos < 9 ? "plata" : "bronce";
}

export const GESTO_DE: Partial<Record<Anim, TipoGesto>> = {
  cortar: "cortar",
  lavar: "frotar",
  llenar: "llenar",
  servirTe: "llenar",
  beber: "beber",
  comer: "morder",
};

/** 做饭 no es un gesto suelto: lo hace la receta (echar 米 + 水 + 胡萝卜 y revolver con `crearGirar`). */
export const esReceta = (anim: Anim) => anim === "cocinar";
