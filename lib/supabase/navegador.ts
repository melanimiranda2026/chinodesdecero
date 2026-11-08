import { createBrowserClient } from "@supabase/ssr";

/** Cliente del navegador (clave anónima). Se crea al usarlo, no al importar. */
export function crearClienteNavegador() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !clave) throw new Error("configuracion");
  return createBrowserClient(url, clave);
}
