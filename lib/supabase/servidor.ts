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
