import { proyectar } from "./iso";
import { OBJETOS } from "./datos";

/** Escondites del gato, en orden: después de encontrarlo se va al siguiente. */
const ORDEN = ["refri", "mesa", "lajitong", "chuanghu"] as const;
export type Escondite = (typeof ORDEN)[number];

/** El escondite que sigue a `actual`; la ventana solo si está abierta. Un valor raro vuelve al refri. */
export function siguienteEscondite(actual: string, ventanaAbierta: boolean): Escondite {
  const i = ORDEN.indexOf(actual as Escondite);
  if (i < 0) return "refri";
  const sig = ORDEN[(i + 1) % ORDEN.length];
  return sig === "chuanghu" && !ventanaAbierta ? siguienteEscondite(sig, ventanaAbierta) : sig;
}

/** Se ve (la cola o, encontrado, el gato entero)? En el basurero no; en la ventana, solo abierta. */
export function gatoSeVe(mao: string, ventana: string, encontrado: boolean): boolean {
  if (encontrado) return true;
  if (mao === "lajitong") return false;
  if (mao === "chuanghu") return ventana === "abierta";
  return true;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const punto = (u: number, v: number, h: number) => {
  const p = proyectar(u, v, h);
  return { x: r1(p.x), y: r1(p.y - OBJETOS.mao.w * 0.25) };
};

/** Centro del cuadro del gato en cada escondite (unidades del cuarto). En el basurero: donde cae al saltar afuera. */
export const LUGAR_GATO: Record<Escondite, { x: number; y: number }> = {
  refri: { x: OBJETOS.mao.x, y: OBJETOS.mao.y },
  // en el piso, entre las patas de la mesa
  mesa: punto(7.0, 1.4, 0),
  // al lado del basurero, en piso libre
  lajitong: punto(9.0, 3.9, 0),
  // sentado en el alféizar (donde se posa el pájaro)
  chuanghu: punto(8.3, 0.1, 3.6),
};

export const lugarGato = (mao: string) => LUGAR_GATO[(ORDEN as readonly string[]).includes(mao) ? (mao as Escondite) : "refri"];
