import { idNivel, TEMAS, type Etapa, type Frase } from "./datos";

/** Fila: qué pieza (índice en `frase.piezas`) hay en cada hueco. */
export type Fila = (number | null)[];

/** ¿Puede ir la pieza en ese hueco? Vale si algún orden válido la pone ahí y respeta lo ya colocado. */
export function cabe(frase: Frase, fila: Fila, hueco: number, pieza: number): boolean {
  if (fila[hueco] !== null) return false;
  return frase.ordenes.some((o) => o[hueco] === pieza && fila.every((p, i) => p === null || o[i] === p));
}

/** Primer hueco libre desde la izquierda (tocar una pieza la manda ahí), o -1. */
export const primerLibre = (fila: Fila) => fila.indexOf(null);

export const completa = (fila: Fila) => fila.every((p) => p !== null);

/** Desordena las piezas: nunca deja el orden correcto de entrada (salvo frases de una pieza). */
export function desordenar(n: number, azar: () => number = Math.random): number[] {
  const base = Array.from({ length: n }, (_, i) => i);
  for (let intento = 0; intento < 20; intento++) {
    const a = [...base];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.min(i, Math.floor(azar() * (i + 1)));
      [a[i], a[j]] = [a[j], a[i]];
    }
    if (n < 2 || a.some((v, i) => v !== i)) return a;
  }
  return [...base.slice(1), base[0]];
}

// ---------- vasos de leche (energía diaria) ----------

export const VASOS_MAX = 5;
export const RECARGA_MS = 4 * 60 * 60 * 1000;

export interface Vasos {
  vasos: number;
  /** Desde cuándo corre la recarga del próximo vaso (ms). Con los vasos llenos no importa. */
  desde: number;
}

export const vasosIniciales = (ahora: number): Vasos => ({ vasos: VASOS_MAX, desde: ahora });

/** Suma los vasos que se recargaron con el tiempo. Un reloj que retrocede no regala ni quita vasos. */
export function recargar(v: Vasos, ahora: number): Vasos {
  if (v.vasos >= VASOS_MAX) return { vasos: VASOS_MAX, desde: ahora };
  const desde = Math.min(v.desde, ahora);
  const n = Math.floor((ahora - desde) / RECARGA_MS);
  const vasos = Math.min(VASOS_MAX, v.vasos + n);
  return { vasos, desde: vasos >= VASOS_MAX ? ahora : desde + n * RECARGA_MS };
}

/** Un error vacía un vaso (nunca baja de 0). Con los vasos llenos, la recarga empieza ahora. */
export function gastar(v: Vasos, ahora: number): Vasos {
  const r = recargar(v, ahora);
  if (r.vasos <= 0) return r;
  return { vasos: r.vasos - 1, desde: r.vasos >= VASOS_MAX ? ahora : r.desde };
}

export function sumar(v: Vasos, n: number, ahora: number): Vasos {
  const r = recargar(v, ahora);
  const vasos = Math.min(VASOS_MAX, r.vasos + n);
  return { vasos, desde: vasos >= VASOS_MAX ? ahora : r.desde };
}

/** Milisegundos hasta el próximo vaso, o null con los vasos llenos. */
export function proximoVaso(v: Vasos, ahora: number): number | null {
  const r = recargar(v, ahora);
  if (r.vasos >= VASOS_MAX) return null;
  return Math.max(0, r.desde + RECARGA_MS - ahora);
}

export function formatoEspera(ms: number): string {
  const min = Math.ceil(ms / 60000);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min`;
}

// ---------- niveles ----------

/**
 * Dentro de un tema las etapas se abren en orden. Un tema se abre al ganar la etapa 1 del anterior
 * (quien llega del video del 没 no tiene que pasar todos los niveles).
 */
export function abierto(ganados: ReadonlySet<string>, tema: number, etapa: Etapa): boolean {
  if (etapa > 1) return ganados.has(idNivel(TEMAS[tema].id, (etapa - 1) as Etapa));
  return tema === 0 || ganados.has(idNivel(TEMAS[tema - 1].id, 1));
}

/** El primer nivel abierto y sin ganar (para "seguir"), o null si ganó todo. */
export function siguienteNivel(ganados: ReadonlySet<string>): { tema: number; etapa: Etapa } | null {
  for (const etapa of [1, 2, 3] as Etapa[]) {
    for (let t = 0; t < TEMAS.length; t++) {
      if (abierto(ganados, t, etapa) && !ganados.has(idNivel(TEMAS[t].id, etapa))) return { tema: t, etapa };
    }
  }
  return null;
}

/** El nivel que sigue a uno recién ganado: la etapa siguiente del mismo tema, o el próximo tema. */
export function despuesDe(ganados: ReadonlySet<string>, tema: number, etapa: Etapa): { tema: number; etapa: Etapa } | null {
  if (etapa < 3 && !ganados.has(idNivel(TEMAS[tema].id, (etapa + 1) as Etapa))) return { tema, etapa: (etapa + 1) as Etapa };
  if (tema + 1 < TEMAS.length && !ganados.has(idNivel(TEMAS[tema + 1].id, 1))) return { tema: tema + 1, etapa: 1 };
  return siguienteNivel(ganados);
}
