import { crearClienteNavegador } from "@/lib/supabase/navegador";
import { avanceInicial, esObjeto, validarAvance, type Avance, type MedallaGuardada, MAX_ESCUCHADAS } from "./avance-validar";

export {
  avanceInicial, avancePendiente, estadoValido, validarAvance, MAX_ESCUCHADAS, MAX_AVANCE_PENDIENTE,
  type Avance, type MedallaGuardada,
} from "./avance-validar";

export const CLAVE_AVANCE = "cdc.avance.v1";
/** Aviso interno (misma pestaña) de que el avance guardado cambió fuera de la casa. */
export const EVENTO_AVANCE = "cdc:avance";

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

/** Pidió que le avisemos (marcó la casilla) en este navegador. Aparte del avance: nunca viaja al servidor. */
export const CLAVE_AVISO = "cdc.aviso.v1";

export interface DetalleAvance {
  correo?: string;
  /** Marcó la casilla de novedades. */
  avisar?: boolean;
}

const avisar = (detail: DetalleAvance) => {
  try {
    window.dispatchEvent(new CustomEvent<DetalleAvance>(EVENTO_AVANCE, { detail }));
  } catch {
    /* nada */
  }
};

/** Guarda el correo (si el disco deja) y avisa a la casa, que lo guarda en memoria. `avisar`: marcó la casilla. */
export function guardarCorreo(correo: string, conAviso = false): void {
  guardarAvance({ ...cargarAvance(), correo });
  if (conAviso) {
    try {
      localStorage.setItem(CLAVE_AVISO, "1");
    } catch {
      /* en memoria igual */
    }
  }
  avisar({ correo, avisar: conAviso });
}

/** true si en este navegador ya pidió que le avisemos. */
export function cargarAviso(): boolean {
  try {
    return localStorage.getItem(CLAVE_AVISO) === "1";
  } catch {
    return false;
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
