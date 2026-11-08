import { NextResponse } from "next/server";
import { codigoError, crearClienteServicio, crearClienteSesion } from "@/lib/supabase/servidor";
import { avancePendiente, esObjeto, validarAvance } from "@/components/casa/avance-validar";

const TIPOS = ["email", "magiclink"] as const;
type Tipo = (typeof TIPOS)[number];

type Usuario = { id: string; email?: string | null } | null | undefined;

type Servicio = ReturnType<typeof crearClienteServicio>;

/** Inserta el avance pendiente si la cuenta no tiene uno o tiene menos escuchadas. true si ya se puede borrar. */
async function traerPendiente(sb: Servicio, userId: string, crudo: unknown): Promise<boolean> {
  const pendiente = avancePendiente(crudo);
  if (!pendiente) return true; // no servía: se descarta
  const { data: actual, error } = await sb.from("avance").select("datos").eq("user_id", userId).maybeSingle();
  if (error) {
    console.error("callback: avance", codigoError(error));
    return false;
  }
  const cuenta = esObjeto(actual?.datos) ? validarAvance(actual.datos).escuchadas.length : -1;
  // sin fila (-1) o con menos escuchadas: gana lo que se dejó con el correo; si no, el de la cuenta
  if (cuenta >= pendiente.escuchadas.length) return true;
  const { error: e2 } = await sb
    .from("avance")
    .upsert({ user_id: userId, datos: pendiente, actualizado: new Date().toISOString() }, { onConflict: "user_id" });
  if (e2) {
    console.error("callback: avance upsert", codigoError(e2));
    return false;
  }
  return true;
}

/**
 * Tras abrir el enlace (la persona demostró que el correo es suyo):
 * - confirma el consentimiento pedido (doble opt-in);
 * - trae el avance que se dejó con el correo si la cuenta no tiene uno o tiene menos escuchadas.
 * Nunca hace fallar el ingreso: si algo falla, se registra y la persona entra igual.
 */
async function alConfirmar(user: Usuario) {
  const email = user?.email?.trim().toLowerCase();
  if (!user?.id || !email) return;
  try {
    const sb = crearClienteServicio();
    const { data: fila, error } = await sb
      .from("suscriptores")
      .select("consentimiento, avance_pendiente")
      .eq("email", email)
      .maybeSingle();
    if (error) {
      console.error("callback: suscriptor", codigoError(error));
      return;
    }
    if (!fila) return;

    const cambios: Record<string, unknown> = {};
    if (fila.consentimiento === true) cambios.consentimiento_confirmado = true;

    if (fila.avance_pendiente !== null && fila.avance_pendiente !== undefined) {
      // Si la base falla a mitad, el pendiente se conserva para el próximo enlace.
      if (await traerPendiente(sb, user.id, fila.avance_pendiente)) cambios.avance_pendiente = null;
    }

    if (Object.keys(cambios).length) {
      const { error: e4 } = await sb.from("suscriptores").update(cambios).eq("email", email);
      if (e4) console.error("callback: confirmar", codigoError(e4));
    }
  } catch (e) {
    console.error("callback: confirmar", codigoError(e));
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sitio = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  const tokenHash = url.searchParams.get("token_hash");
  const tipo = url.searchParams.get("type");
  const code = url.searchParams.get("code");

  const ir = (ruta: string) => NextResponse.redirect(new URL(ruta, sitio));

  let user: Usuario = null;
  try {
    const sb = await crearClienteSesion();
    let error: unknown = new Error("sin_parametros");
    if (tokenHash && tipo && (TIPOS as readonly string[]).includes(tipo)) {
      // Flujo entre dispositivos: no necesita nada guardado en el navegador de origen.
      let data: { user?: Usuario } | null;
      ({ data, error } = await sb.auth.verifyOtp({ type: tipo as Tipo, token_hash: tokenHash }));
      user = data?.user;
    } else if (code) {
      let data: { user?: Usuario } | null;
      ({ data, error } = await sb.auth.exchangeCodeForSession(code));
      user = data?.user;
    }
    if (error) {
      console.error("callback:", codigoError(error));
      return ir("/?enlace=fallo");
    }
  } catch (e) {
    console.error("callback:", codigoError(e));
    return ir("/?enlace=fallo");
  }
  await alConfirmar(user);
  return ir("/?bienvenida=1");
}
