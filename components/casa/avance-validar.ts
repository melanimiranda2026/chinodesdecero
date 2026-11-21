import { ACOPLADOS, ESTADO_INICIAL, VALORES, type EstadoCocina, type ObjetoId } from "./cocina/datos";
import { estadosAlcanzables } from "./cocina/acciones";
import { PALABRAS } from "./living/palabras";
import { LIVING } from "./living/cuarto";
import { todasLasFichas } from "./motor/progreso";
import type { CuartoId, DefCuarto, ProgresoCuarto } from "./motor/tipos";
import { bytes, MAX_CUERPO } from "@/lib/limite";

/** Validación pura del avance: la usan el navegador y el servidor (sin clientes de Supabase). */

export type MedallaGuardada = "oro" | "plata" | "bronce";

export interface Avance {
  estado: EstadoCocina;
  medallas: Partial<Record<string, MedallaGuardada>>;
  escuchadas: string[];
  /** Ids de PALABRAS abiertas, sin repetir, en el orden en que se abrieron. */
  palabras: string[];
  /** Progreso de cada cuarto del motor (solo los que tienen ficha registrada). */
  cuartos: Partial<Record<CuartoId, ProgresoCuarto>>;
  /** Ids de fichas ganadas, sin repetir, en el orden en que se obtuvieron. */
  fichas: string[];
  correo?: string;
}

/** Fichas de datos de los cuartos del motor que ya existen. */
const DEFS: Partial<Record<CuartoId, DefCuarto>> = { living: LIVING };

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const unicos = (l: string[], validos: Set<string>) => [...new Set(l.filter((x) => validos.has(x)))];

/** Valida el progreso de cada cuarto contra su ficha: ids de objeto o logro inexistentes se descartan, y un cuarto sin ficha también. */
export function cuartosValidos(v: unknown): Avance["cuartos"] {
  const r: Avance["cuartos"] = {};
  if (!esObjeto(v)) return r;
  for (const [id, def] of Object.entries(DEFS) as [CuartoId, DefCuarto][]) {
    const p = v[id];
    if (!esObjeto(p)) continue;
    const logros = new Set(def.objetos.flatMap((o) => o.acciones.map((a) => `${a}@${o.id}`)));
    r[id] = { tocados: unicos(strings(p.tocados), new Set(def.objetos.map((o) => o.id))), logros: unicos(strings(p.logros), logros) };
  }
  return r;
}

const IDS_FICHAS = new Set(Object.values(DEFS).flatMap((d) => (d ? todasLasFichas(d) : [])));

/** Une listas de ids de fichas: solo fichas de cuartos registrados, sin repetir, en el orden visto. */
export const unirFichas = (...listas: unknown[][]): string[] => unicos(listas.flatMap(strings), IDS_FICHAS);

const MEDALLAS = ["oro", "plata", "bronce"];
export const MAX_ESCUCHADAS = 500;

const IDS_PALABRAS = new Set(PALABRAS.map((p) => p.id));

/** Une listas de ids de palabras: solo ids de PALABRAS, sin repetir, en el orden visto, con tope. */
export const unirPalabras = (...listas: unknown[][]): string[] =>
  [...new Set(listas.flat().filter((x): x is string => typeof x === "string" && IDS_PALABRAS.has(x)))].slice(0, PALABRAS.length);

export const avanceInicial = (): Avance => ({
  estado: { ...ESTADO_INICIAL },
  medallas: {},
  escuchadas: [],
  palabras: [],
  cuartos: {},
  fichas: [],
});

export const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const claveEstado = (e: Record<string, unknown>) => ACOPLADOS.map((k) => String(e[k])).join("|");
let alcanzables: Set<string> | null = null;

/**
 * Los 8 objetos de siempre solo valen si son un estado alcanzable (se validan juntos; si no, el inicial de los 8).
 * Cada objeto nuevo vale si su valor está en VALORES, si no vuelve a su inicial. Llaves desconocidas se descartan;
 * un avance de antes (solo los 8) conserva su estado y los nuevos toman el inicial.
 */
export function estadoValido(v: unknown): EstadoCocina {
  const e: EstadoCocina = { ...ESTADO_INICIAL };
  if (!esObjeto(v)) return e;
  if (ACOPLADOS.every((k) => typeof v[k] === "string")) {
    alcanzables ??= new Set(estadosAlcanzables().map(claveEstado));
    if (alcanzables.has(claveEstado(v))) for (const k of ACOPLADOS) e[k] = v[k] as string;
  }
  for (const k of Object.keys(ESTADO_INICIAL) as ObjetoId[]) {
    if (ACOPLADOS.includes(k)) continue;
    if (typeof v[k] === "string" && VALORES[k].includes(v[k])) e[k] = v[k];
  }
  return e;
}

/** Normaliza cualquier cosa leída del disco o del servidor; lo desconocido se descarta. */
export function validarAvance(v: unknown): Avance {
  if (!esObjeto(v)) return avanceInicial();
  const medallas: Avance["medallas"] = {};
  if (esObjeto(v.medallas)) {
    for (const [k, m] of Object.entries(v.medallas)) {
      if (typeof m === "string" && MEDALLAS.includes(m)) medallas[k] = m as MedallaGuardada;
    }
  }
  const escuchadas = Array.isArray(v.escuchadas)
    ? [...new Set(v.escuchadas.filter((x): x is string => typeof x === "string" && x.length > 0 && x.length < 80))].slice(0, MAX_ESCUCHADAS)
    : [];
  const palabras = Array.isArray(v.palabras) ? unirPalabras(v.palabras) : [];
  const a: Avance = {
    estado: estadoValido(v.estado), medallas, escuchadas, palabras,
    cuartos: cuartosValidos(v.cuartos), fichas: unirFichas(strings(v.fichas)),
  };
  if (typeof v.correo === "string" && v.correo) a.correo = v.correo;
  return a;
}

/** Tope del avance que viaja con el correo (deja lugar al resto del cuerpo de 64 KB). */
export const MAX_AVANCE_PENDIENTE = MAX_CUERPO - 4 * 1024;

/** El avance sin el correo, si es un objeto y cabe en el tope; si no, null. */
export function avancePendiente(v: unknown): Omit<Avance, "correo"> | null {
  if (!esObjeto(v) || bytes(v) > MAX_AVANCE_PENDIENTE) return null;
  const { correo: _c, ...datos } = validarAvance(v);
  void _c;
  return datos;
}
