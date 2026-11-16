import { recargar, vasosIniciales, VASOS_MAX, type Vasos } from "./logica";

/** Avance del puzzle en este navegador (aparte del de la casa). La sincronía con la cuenta queda para después. */
export const CLAVE_PUZZLE = "cdc.puzzle.v1";

export interface AvancePuzzle {
  ganados: string[];
  /** Niveles ganados sin errores. */
  perfectos: string[];
  vasos: Vasos;
  /** Ya usó el trato "correo = vasos llenos" (una sola vez). */
  correoLleno: boolean;
}

export const avancePuzzleInicial = (ahora: number): AvancePuzzle => ({
  ganados: [],
  perfectos: [],
  vasos: vasosIniciales(ahora),
  correoLleno: false,
});

const textos = (v: unknown, max = 64): string[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && x.length <= 40))].slice(0, max) : [];

/** Lee lo guardado sin confiar en él: cualquier campo raro vuelve a su valor inicial. */
export function validarAvancePuzzle(crudo: unknown, ahora: number): AvancePuzzle {
  const base = avancePuzzleInicial(ahora);
  if (typeof crudo !== "object" || crudo === null) return base;
  const o = crudo as Record<string, unknown>;
  const v = o.vasos as Record<string, unknown> | undefined;
  const vasos =
    v && Number.isInteger(v.vasos) && Number.isFinite(v.desde)
      ? recargar({ vasos: Math.max(0, Math.min(VASOS_MAX, v.vasos as number)), desde: v.desde as number }, ahora)
      : base.vasos;
  return { ganados: textos(o.ganados), perfectos: textos(o.perfectos), vasos, correoLleno: o.correoLleno === true };
}

export function cargarAvancePuzzle(ahora = Date.now()): AvancePuzzle {
  try {
    const crudo = localStorage.getItem(CLAVE_PUZZLE);
    return crudo ? validarAvancePuzzle(JSON.parse(crudo), ahora) : avancePuzzleInicial(ahora);
  } catch {
    return avancePuzzleInicial(ahora);
  }
}

export function guardarAvancePuzzle(a: AvancePuzzle): void {
  try {
    localStorage.setItem(CLAVE_PUZZLE, JSON.stringify(a));
  } catch {
    /* sin almacenamiento: se juega igual */
  }
}
