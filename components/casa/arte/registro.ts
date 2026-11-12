import type { FC } from "react";
import type { ObjetoId } from "../cocina/datos";
import * as P from "./placeholders/objetos";
import manifiesto from "./manifiesto-arte.json";

/**
 * REGISTRO DE ARTE. Cada capa es un archivo en public/arte/cocina/<objeto>_<capa>.svg (generado por
 * `npm run arte:generar`). Para cambiar un dibujo, guarda un PNG o WebP con el mismo nombre al lado del SVG:
 * el manifiesto (`npm run arte`, corre solo antes de dev y build) elige el dibujo a mano. Ver docs/arte.md.
 * Las animaciones solo mueven capas por su nombre; nada depende del interior del dibujo.
 */
export type Capa = { tipo: "svg"; Componente: FC } | { tipo: "img"; src: string };

const svg = (Componente: FC): Capa => ({ tipo: "svg", Componente });

const MANIFIESTO = manifiesto as Record<string, string>;
/** Capa de un archivo de public/arte/ (`cocina/guo_olla`): el dibujo a mano si existe, si no el SVG generado. */
export function arte(clave: string): Capa {
  const src = MANIFIESTO[clave];
  if (!src) throw new Error(`Falta el arte "${clave}" en public/arte/ (corre npm run arte:generar)`);
  return { tipo: "img", src };
}

interface ArteObjeto {
  capas: Record<string, Capa>;
  /** Capas visibles (de atrás hacia adelante) para un estado. */
  visibles: (estado: string) => string[];
}

const capasDe = (id: ObjetoId, nombres: string[]) =>
  Object.fromEntries(nombres.map((n) => [n, arte(`cocina/${id}_${n}`)])) as Record<string, Capa>;

export const ARTE: Record<ObjetoId, ArteObjeto> = {
  bingxiang: {
    capas: capasDe("bingxiang", ["cuerpo", "interior", "puerta"]),
    visibles: () => ["cuerpo", "interior", "puerta"],
  },
  pingguo: {
    capas: capasDe("pingguo", ["entera", "mugre", "mitad_izq", "mitad_der"]),
    visibles: (e) =>
      e === "sucio" ? ["entera", "mugre"] : e === "limpio" ? ["entera"] : e === "cortado" ? ["mitad_izq", "mitad_der"] : [],
  },
  beizi: {
    capas: capasDe("beizi", ["vaso", "agua", "te", "mugre"]),
    visibles: (e) =>
      e === "agua" ? ["agua", "vaso"] : e === "te" ? ["te", "vaso"] : e === "sucio" ? ["vaso", "mugre"] : ["vaso"],
  },
  panzi: {
    capas: capasDe("panzi", ["plato", "jiaozi", "mugre"]),
    visibles: (e) => (e === "lleno" ? ["plato", "jiaozi"] : e === "sucio" ? ["plato", "mugre"] : ["plato"]),
  },
  wan: {
    capas: capasDe("wan", ["bol", "arroz", "mugre"]),
    visibles: (e) => (e === "lleno" ? ["bol", "arroz"] : e === "sucio" ? ["bol", "mugre"] : ["bol"]),
  },
  guo: {
    capas: capasDe("guo", ["olla", "arroz", "mugre"]),
    visibles: (e) => (e === "cocido" ? ["olla", "arroz"] : e === "sucio" ? ["olla", "mugre"] : ["olla"]),
  },
  chahu: { capas: capasDe("chahu", ["tetera"]), visibles: () => ["tetera"] },
  kuaizi: { capas: capasDe("kuaizi", ["palillos"]), visibles: () => ["palillos"] },
};

/** Piezas de los minijuegos (mismo encuadre que los objetos). */
export const ARTE_PRIMER_PLANO: Record<string, Capa> = {
  vaso_grande: svg(P.VasoGrande),
  vaso_mascara: svg(P.VasoMascara),
  olla_grande: svg(P.OllaGrande),
  trozos: svg(P.Trozos),
};

/** El cuarto completo (isométrico) en una sola capa de 1000x1000 unidades, sin los objetos. */
export const FONDO_CUARTO: Record<"cocina", Capa> = { cocina: arte("cocina/cuarto_cocina") };

/**
 * Capas de la vaca (todas del mismo cuadrado y centro que el cuerpo). Se cambian por nombre; PNG o WebP.
 * Los nombres de ojos y hocico son las expresiones que usa la casa.
 */
export const ARTE_VACA = {
  cuerpo: "/vaca/vaca_cuerpo.webp",
  orejas: "/vaca/vaca_cuerpo_orejas.webp",
  ojos: {
    abiertos: "/vaca/vaca_ojos_abiertos.webp",
    cerrados: "/vaca/vaca_ojos_cerrados.webp",
    felices: "/vaca/vaca_ojos_felices.webp",
    izquierda: "/vaca/vaca_ojos_izquierda.webp",
    sorpresa: "/vaca/vaca_ojos_sorpresa.webp",
  },
  hocico: {
    punto: "/vaca/vaca_hocico_punto.webp",
    o: "/vaca/vaca_hocico_o.webp",
    abierta: "/vaca/vaca_hocico_abierta.webp",
    sonrisa: "/vaca/vaca_hocico_sonrisa.webp",
    neutra: "/vaca/vaca_hocico_neutra.webp",
  },
} as const;
