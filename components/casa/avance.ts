import { ESTADO_INICIAL, type EstadoCocina } from "./cocina/datos";
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
const MAX_ESCUCHADAS = 500;

export const avanceInicial = (): Avance => ({
  estado: { ...ESTADO_INICIAL },
  medallas: {},
  escuchadas: [],
});

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** El estado guardado solo vale si tiene exactamente las llaves y los valores conocidos; si no, el inicial. */
export function estadoValido(v: unknown): EstadoCocina {
  if (!esObjeto(v)) return { ...ESTADO_INICIAL };
  const claves = Object.keys(ESTADO_INICIAL);
  if (Object.keys(v).length !== claves.length) return { ...ESTADO_INICIAL };
  for (const k of claves) if (typeof v[k] !== "string") return { ...ESTADO_INICIAL };
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

/** Guarda el correo en el avance y avisa a la casa. */
export function guardarCorreo(correo: string): void {
  guardarAvance({ ...cargarAvance(), correo });
  try {
    window.dispatchEvent(new Event(EVENTO_AVANCE));
  } catch {
    /* nada */
  }
}

async function haySesion(): Promise<boolean> {
  try {
    const { data } = await crearClienteNavegador().auth.getSession();
    return !!data.session;
  } catch {
    return false; // sin variables en el navegador o sin red: no se sincroniza
  }
}

/** Sube el avance (sin el correo) si hay sesión. Nunca lanza. */
export async function subirAvance(a: Avance): Promise<void> {
  try {
    if (!(await haySesion())) return;
    const { correo: _correo, ...datos } = a;
    void _correo;
    await fetch("/api/avance", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ datos }),
    });
  } catch {
    /* se reintenta en el próximo cambio */
  }
}

/**
 * Al iniciar sesión: gana el avance con más `escuchadas`. Si gana el del servidor se guarda aquí
 * (con el correo local); si gana el local se sube.
 */
export async function sincronizar(a: Avance): Promise<void> {
  try {
    if (!(await haySesion())) return;
    const r = await fetch("/api/avance");
    if (r.ok) {
      const { datos } = (await r.json()) as { datos: unknown };
      if (esObjeto(datos)) {
        const remoto = validarAvance(datos);
        if (remoto.escuchadas.length > a.escuchadas.length) {
          guardarAvance({ ...remoto, correo: a.correo ?? remoto.correo });
          try {
            window.dispatchEvent(new Event(EVENTO_AVANCE));
          } catch {
            /* nada */
          }
          return;
        }
      }
    }
    await subirAvance(a);
  } catch {
    /* nada */
  }
}
