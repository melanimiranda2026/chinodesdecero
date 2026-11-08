import { NextResponse } from "next/server";
import { codigoError, crearClienteSesion } from "@/lib/supabase/servidor";

const TIPOS = ["email", "magiclink"] as const;
type Tipo = (typeof TIPOS)[number];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sitio = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  const tokenHash = url.searchParams.get("token_hash");
  const tipo = url.searchParams.get("type");
  const code = url.searchParams.get("code");

  const ir = (ruta: string) => NextResponse.redirect(new URL(ruta, sitio));

  try {
    const sb = await crearClienteSesion();
    let error: unknown = new Error("sin_parametros");
    if (tokenHash && tipo && (TIPOS as readonly string[]).includes(tipo)) {
      // Flujo entre dispositivos: no necesita nada guardado en el navegador de origen.
      ({ error } = await sb.auth.verifyOtp({ type: tipo as Tipo, token_hash: tokenHash }));
    } else if (code) {
      ({ error } = await sb.auth.exchangeCodeForSession(code));
    }
    if (error) {
      console.error("callback:", codigoError(error));
      return ir("/?enlace=fallo");
    }
  } catch (e) {
    console.error("callback:", codigoError(e));
    return ir("/?enlace=fallo");
  }
  return ir("/?bienvenida=1");
}
