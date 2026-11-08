import type { FC } from "react";
import type { ObjetoId } from "../cocina/datos";
import * as P from "./placeholders/objetos";
import { CocinaCuarto } from "./placeholders/Cocina";

/**
 * REGISTRO DE ARTE. Para reemplazar un dibujo: cambia `{ tipo: "svg", … }` por
 * `{ tipo: "img", src: "/arte/cocina/<objeto>_<capa>.png" }` (o `.webp`). Ver docs/arte.md.
 * Las animaciones solo mueven capas por su nombre; nada depende del interior del dibujo.
 */
export type Capa = { tipo: "svg"; Componente: FC } | { tipo: "img"; src: string };

const svg = (Componente: FC): Capa => ({ tipo: "svg", Componente });

interface ArteObjeto {
  capas: Record<string, Capa>;
  /** Capas visibles (de atrás hacia adelante) para un estado. */
  visibles: (estado: string) => string[];
}

export const ARTE: Record<ObjetoId, ArteObjeto> = {
  bingxiang: {
    capas: { cuerpo: svg(P.BingxiangCuerpo), interior: svg(P.BingxiangInterior), puerta: svg(P.BingxiangPuerta) },
    visibles: () => ["cuerpo", "interior", "puerta"],
  },
  pingguo: {
    capas: {
      entera: svg(P.PingguoEntera), mugre: svg(P.PingguoMugre),
      mitad_izq: svg(P.PingguoMitadIzq), mitad_der: svg(P.PingguoMitadDer),
    },
    visibles: (e) =>
      e === "sucio" ? ["entera", "mugre"] : e === "limpio" ? ["entera"] : e === "cortado" ? ["mitad_izq", "mitad_der"] : [],
  },
  beizi: {
    capas: { vaso: svg(P.BeiziVaso), agua: svg(P.BeiziAgua), te: svg(P.BeiziTe), mugre: svg(P.BeiziMugre) },
    visibles: (e) =>
      e === "agua" ? ["agua", "vaso"] : e === "te" ? ["te", "vaso"] : e === "sucio" ? ["vaso", "mugre"] : ["vaso"],
  },
  panzi: {
    capas: { plato: svg(P.PanziPlato), jiaozi: svg(P.PanziJiaozi), mugre: svg(P.PanziMugre) },
    visibles: (e) => (e === "lleno" ? ["plato", "jiaozi"] : e === "sucio" ? ["plato", "mugre"] : ["plato"]),
  },
  wan: {
    capas: { bol: svg(P.WanBol), arroz: svg(P.WanArroz), mugre: svg(P.WanMugre) },
    visibles: (e) => (e === "lleno" ? ["bol", "arroz"] : e === "sucio" ? ["bol", "mugre"] : ["bol"]),
  },
  guo: {
    capas: { olla: svg(P.GuoOlla), arroz: svg(P.GuoArroz), mugre: svg(P.GuoMugre) },
    visibles: (e) => (e === "cocido" ? ["olla", "arroz"] : e === "sucio" ? ["olla", "mugre"] : ["olla"]),
  },
  chahu: { capas: { tetera: svg(P.ChahuTetera) }, visibles: () => ["tetera"] },
  kuaizi: { capas: { palillos: svg(P.KuaiziPalillos) }, visibles: () => ["palillos"] },
};

/** Piezas de los minijuegos (mismo encuadre que los objetos). */
export const ARTE_PRIMER_PLANO: Record<string, Capa> = {
  vaso_grande: svg(P.VasoGrande),
  vaso_mascara: svg(P.VasoMascara),
  olla_grande: svg(P.OllaGrande),
  trozos: svg(P.Trozos),
};

/** El cuarto completo en una sola capa de 1000x1000 unidades. */
export const FONDO_CUARTO: Record<"cocina", Capa> = { cocina: svg(CocinaCuarto) };

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
