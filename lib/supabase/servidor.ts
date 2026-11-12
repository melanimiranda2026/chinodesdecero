import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Falta configuración del servidor (variables de entorno). */
export class ConfiguracionFaltante extends Error {
  constructor() {
    super("configuracion");
    this.name = "ConfiguracionFaltante";
  }
}

// Las variables se leen al pedir el cliente, no al importar: `next build` no las necesita.
function leerEntorno(...nombres: string[]): string[] {
  const valores = nombres.map((n) => process.env[n]);
  if (valores.some((v) => !v)) throw new ConfiguracionFaltante();
  return valores as string[];
}

/** Cliente con service role: solo para rutas del servidor, nunca al navegador. */
export function crearClienteServicio() {
  const [url, clave] = leerEntorno("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Cliente con la sesión de la persona (cookies). */
export async function crearClienteSesion() {
  const [url, clave] = leerEntorno("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const almacen = await cookies();
  return createServerClient(url, clave, {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => almacen.set(name, value, options));
        } catch {
          // Desde un Server Component no se pueden escribir cookies; en las rutas sí.
        }
      },
    },
  });
}

export function esConfiguracionFaltante(e: unknown): boolean {
  return e instanceof ConfiguracionFaltante;
}

/**
 * Cliente sin PKCE solo para enviar el enlace mágico. Así el enlace no depende
 * de un verificador guardado en el navegador de origen y abre en cualquier dispositivo.
 */
export function crearClienteOtp() {
  const [url, clave] = leerEntorno("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, clave, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** Solo el código o el estado: el mensaje de error puede traer el correo. */
export function codigoError(e: unknown): string {
  if (e && typeof e === "object") {
    const o = e as { code?: unknown; status?: unknown; name?: unknown };
    if (typeof o.code === "string") return o.code;
    if (typeof o.status === "number") return String(o.status);
    if (typeof o.name === "string") return o.name;
  }
  return "desconocido";
}
