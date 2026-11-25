/**
 * Ficha de un escenario: cómo se ve un cuarto (piso, paredes, muebles y lo que cuelga de las paredes), escrita
 * como datos. El generador (`scripts/escenarios-iso.ts`, con `npm run arte:generar`) la dibuja en isometría
 * con la misma paleta y proyección que la cocina y el living. Para un escenario nuevo basta con escribir su
 * ficha (ver `docs/escenarios.md`); si un mueble todavía no existe en el catálogo, se programa una vez y queda
 * para todos los escenarios.
 *
 * Coordenadas del cuarto (las de `components/casa/cocina/iso.ts`): piso de 0 a 10 en u y v; z es la altura
 * (las paredes miden 6,2). La pared izquierda es el plano u = 0 (corre a lo largo de v) y la derecha, el plano
 * v = 0 (corre a lo largo de u). Lo que está más cerca de u = 10 y v = 10 queda adelante.
 */
import type { CuartoId } from "../motor/tipos";

/** Colores de un volumen: arriba (a), cara izquierda (i) y cara derecha (d). */
export type Tono = { a: string; i: string; d: string };

/** Rectángulo del piso que ocupa un mueble. */
export type Base = { u0: number; u1: number; v0: number; v1: number };

export type Pared = "izq" | "der";

export type Piso =
  | { tipo: "tablas" }
  | { tipo: "baldosas"; color: string; linea: string; paso: number };

export interface Ambiente {
  piso: Piso;
  /** Color de cada pared y del zócalo. */
  paredes: { izq: string; der: string; zocalo: string };
  /** Franja baja de las paredes (azulejos del baño, friso del living), hasta la altura `alto`. */
  friso?: { color: string; linea: string; alto: number; azulejo?: number };
}

/** Lo que va en el piso. `id` es el pinyin del objeto (como `bingxiang` en la cocina): será su objeto en el motor. */
export type Mueble =
  /** Cama con la cabecera contra la pared derecha (v = 0). */
  | { tipo: "cama"; id: string; base: Base; colcha: Tono; almohada: string }
  /** Mesita de noche; encima puede llevar una lámpara o un despertador. */
  | { tipo: "velador"; id: string; base: Base; encima?: "lampara" | "despertador" }
  /** Ropero alto con dos puertas que miran hacia +u (contra la pared izquierda). */
  | { tipo: "closet"; id: string; base: Base; alto: number }
  /** Tina con ducha, en una esquina del fondo; la cortina cuelga en el borde v1. */
  | { tipo: "tina"; id: string; base: Base; cortina: string }
  /** Mueble con lavamanos contra la pared izquierda; arriba, un espejo; encima, el vaso con cepillos. */
  | { tipo: "lavamanos"; id: string; base: Base }
  /** Inodoro contra la pared izquierda. */
  | { tipo: "inodoro"; id: string; base: Base }
  /** Alfombra (plana). */
  | { tipo: "alfombra"; id: string; base: Base; color: string; borde: string }
  /** Planta alta en macetero, apoyada en (u, v). */
  | { tipo: "planta"; id: string; u: number; v: number };

/** Lo que cuelga de una pared, de `desde` a `hasta` a lo largo de ella, entre las alturas z0 y z1. */
export type Colgado =
  | { tipo: "ventana"; id: string; pared: Pared; desde: number; hasta: number; z0: number; z1: number; cortina?: string }
  | { tipo: "cuadro"; id: string; pared: Pared; desde: number; hasta: number; z0: number; z1: number; motivo: "luna" | "montana" }
  /** Repisa con frascos encima (skincare, perfumes). */
  | { tipo: "repisa"; id: string; pared: Pared; desde: number; hasta: number; z0: number; z1: number }
  /** Toallero con toalla colgando. */
  | { tipo: "toallero"; id: string; pared: Pared; desde: number; hasta: number; z0: number; z1: number; color: string };

export interface DefEscenario {
  id: CuartoId;
  /** Nombre del cuarto en hanzi (dentro de la casa no hay español). */
  nombre: string;
  ambiente: Ambiente;
  colgados: Colgado[];
  muebles: Mueble[];
}
