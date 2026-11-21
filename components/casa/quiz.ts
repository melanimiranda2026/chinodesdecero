import type { EstadoCocina, ObjetoId } from "./cocina/datos";

export interface Quiz {
  rondas: ObjetoId[];
}

const FIJOS: ObjetoId[] = ["beizi", "wan", "panzi", "kuaizi", "chahu", "guo"];
export const RONDAS = 4;
/** Todo lo que el 给我 puede pedir (la manzana, solo mientras exista). */
export const OBJETOS_QUIZ: readonly ObjetoId[] = [...FIJOS, "pingguo", "kafeibei", "shouji"];

/** 4 objetos distintos para el 给我, de `OBJETOS_QUIZ` (la manzana, solo si todavía existe). */
export function crearQuiz(e: EstadoCocina, azar: () => number): Quiz {
  const pool = OBJETOS_QUIZ.filter((id) => id !== "pingguo" || e.pingguo !== "nada");
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(azar() * (i + 1)));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return { rondas: pool.slice(0, RONDAS) };
}

export function responder(q: Quiz, i: number, id: ObjetoId): "bien" | "mal" {
  return q.rondas[i] === id ? "bien" : "mal";
}
