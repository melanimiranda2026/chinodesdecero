import { ESTADO_INICIAL, type EstadoCocina } from "./cocina/datos";
import { estadosAlcanzables } from "./cocina/acciones";
import { crearClienteNavegador } from "@/lib/supabase/navegador";

export type MedallaGuardada = "oro" | "plata" | "bronce";

export interface Avance {
  estado: EstadoCocina;
  medallas: Partial<Record<string, MedallaGuardada>>;
  escuchadas: string[];
  correo?: string;
}

export const CLAVE_AVANCE = "cdc.avance.v1";
/** Aviso interno (misma pestaña) de que el avance guardado cambió fuera de la casa. */
export const EVENTO_AVANCE = "cdc:avance";

const MEDALLAS = ["oro", "plata", "bronce"];
export const MAX_ESCUCHADAS = 500;

export const avanceInicial = (): Avance => ({
  estado: { ...ESTADO_INICIAL },
  medallas: {},
  escuchadas: [],
});

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const claveEstado = (e: Record<string, unknown>) =>
  Object.keys(ESTADO_INICIAL)
    .map((k) => String(e[k]))
    .join("|");
let alcanzables: Set<string> | null = null;

/** El estado guardado solo vale si tiene exactamente las llaves y es uno de los estados alcanzables; si no, el inicial. */
export function estadoValido(v: unknown): EstadoCocina {
  if (!esObjeto(v)) return { ...ESTADO_INICIAL };
  const claves = Object.keys(ESTADO_INICIAL);
  if (Object.keys(v).length !== claves.length) return { ...ESTADO_INICIAL };
  for (const k of claves) if (typeof v[k] !== "string") return { ...ESTADO_INICIAL };
  alcanzables ??= new Set(estadosAlcanzables().map(claveEstado));
  if (!alcanzables.has(claveEstado(v))) return { ...ESTADO_INICIAL };
  return { ...(v as EstadoCocina) };
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
  const a: Avance = { estado: estadoValido(v.estado), medallas, escuchadas };
  if (typeof v.correo === "string" && v.correo) a.correo = v.correo;
  return a;
}

export function cargarAvance(): Avance {
  try {
    const crudo = localStorage.getItem(CLAVE_AVANCE);
    if (!crudo) return avanceInicial();
    return validarAvance(JSON.parse(crudo));
  } catch {
    return avanceInicial();
  }
}

export function guardarAvance(a: Avance): void {
  try {
    localStorage.setItem(CLAVE_AVANCE, JSON.stringify(a));
  } catch {
    /* sin almacenamiento: se juega igual */
  }
}

const avisar = (correo?: string) => {
  try {
    window.dispatchEvent(new CustomEvent(EVENTO_AVANCE, { detail: { correo } }));
  } catch {
    /* nada */
  }
};

/** Guarda el correo (si el disco deja) y avisa a la casa, que lo guarda en memoria. */
export function guardarCorreo(correo: string): void {
  guardarAvance({ ...cargarAvance(), correo });
  avisar(correo);
}

async function haySesion(): Promise<boolean> {
  try {
    const { data } = await crearClienteNavegador().auth.getSession();
    return !!data.session;
  } catch {
    return false; // sin variables en el navegador o sin red: no se sincroniza
  }
}

/** Sube el avance (sin el correo) si hay sesión. Nunca lanza; true si el servidor lo aceptó. */
export async function subirAvance(a: Avance): Promise<boolean> {
  try {
    if (!(await haySesion())) return false;
    const { correo: _correo, ...datos } = a;
    void _correo;
    const r = await fetch("/api/avance", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ datos }),
    });
    return r.ok;
  } catch {
    return false; // se reintenta en el próximo cambio
  }
}

export type ResultadoSync =
  | { tipo: "sin-sesion" }
  | { tipo: "fallo" }
  /** Gana el servidor (también en empate): hay que adoptarlo. */
  | { tipo: "remoto"; avance: Avance }
  /** Gana lo local: el servidor está vacío o tiene menos escuchadas. */
  | { tipo: "subir" };

/**
 * Compara con la cuenta SIN escribir nada. Solo `subir` autoriza a subir, y únicamente si el GET
 * salió bien y el servidor está vacío o el local tiene estrictamente más escuchadas.
 * `sucio`: hubo cambios reales aquí; si no los hubo, un servidor con datos nunca se pisa.
 */
export async function sincronizar(a: Avance, sucio = false): Promise<ResultadoSync> {
  try {
    if (!(await haySesion())) return { tipo: "sin-sesion" };
    const r = await fetch("/api/avance");
    if (!r.ok) return { tipo: "fallo" };
    const { datos } = (await r.json()) as { datos: unknown };
    if (!esObjeto(datos)) return { tipo: "subir" }; // servidor vacío
    const remoto = validarAvance(datos);
    if (sucio && a.escuchadas.length > remoto.escuchadas.length) return { tipo: "subir" };
    return { tipo: "remoto", avance: { ...remoto, correo: a.correo ?? remoto.correo } };
  } catch {
    return { tipo: "fallo" };
  }
}

const ORDEN: Record<MedallaGuardada, number> = { bronce: 1, plata: 2, oro: 3 };

/**
 * Une lo local con lo del servidor cuando hubo cambios locales durante el GET.
 * El estado de la cocina es del servidor salvo que el estado mismo haya cambiado aquí.
 */
export function fusionar(local: Avance, remoto: Avance, estadoCambio: boolean): Avance {
  const medallas: Avance["medallas"] = { ...remoto.medallas };
  for (const [k, m] of Object.entries(local.medallas)) {
    const r = medallas[k];
    if (m && (!r || ORDEN[m] > ORDEN[r])) medallas[k] = m;
  }
  const a: Avance = {
    estado: estadoCambio ? local.estado : remoto.estado,
    medallas,
    escuchadas: [...new Set([...remoto.escuchadas, ...local.escuchadas])].slice(0, MAX_ESCUCHADAS),
  };
  const correo = local.correo ?? remoto.correo;
  if (correo) a.correo = correo;
  return a;
}
