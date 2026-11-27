/**
 * La familia de la vaquita en la foto del living: quién es, dónde está y lo que se dice al tocarlo. Son cinco: los
 * papás, el hermano, la hermana y la vaquita misma (sin adorno, entre los dos): ella no es ni el hermano ni la
 * hermana, así queda sin género.
 */
import { S, type Silaba } from "@/lib/silabas";
import { ZHE_SHI } from "../cocina/frases";

const WO = S("我", "wǒ", "3");

export type Adorno = "corbata" | "flor" | "gorra" | "moño";

export interface Pariente {
  id: string;
  nombre: Silaba[];
  /** Centro en % del ancho de la foto y ancho de la vaca (también en %): en fila, en la foto apaisada. */
  x: number;
  ancho: number;
  /** En la foto vertical (celular): dos filas, los papás atrás y los hermanos adelante. x, ancho y alto del piso en %. */
  vertical: { x: number; ancho: number; abajo: number };
  /** Sin adorno: la vaquita, igual que en el resto del juego. */
  adorno?: Adorno;
  /** Un poco de color propio (el papá más tostado, la hermana más rosada). */
  tono?: string;
}

/** La familia, de izquierda a derecha: los papás en las puntas y más grandes; al medio, los hermanos y la vaquita. */
export const FAMILIA: Pariente[] = [
  { id: "baba", nombre: S("爸爸", "bà ba", "45"), x: 15, ancho: 31, vertical: { x: 28, ancho: 52, abajo: 38 }, adorno: "corbata" },
  { id: "gege", nombre: S("哥哥", "gē ge", "15"), x: 33, ancho: 24, vertical: { x: 17, ancho: 36, abajo: 3 }, adorno: "gorra" },
  { id: "wo", nombre: WO, x: 50, ancho: 21, vertical: { x: 50, ancho: 32, abajo: 2 } },
  { id: "jiejie", nombre: S("姐姐", "jiě jie", "35"), x: 67, ancho: 24, vertical: { x: 83, ancho: 36, abajo: 3 }, adorno: "moño", tono: "saturate(1.15)" },
  { id: "mama", nombre: S("妈妈", "mā ma", "15"), x: 85, ancho: 31, vertical: { x: 72, ancho: 52, abajo: 38 }, adorno: "flor" },
];

/** Lo que dice la vaquita al tocar a cada uno: 这是我妈妈; al tocarse a sí misma, 这是我. */
export const fraseDe = (p: Pariente): Silaba[] => (p.id === "wo" ? [...ZHE_SHI, ...WO] : [...ZHE_SHI, ...WO, ...p.nombre]);

