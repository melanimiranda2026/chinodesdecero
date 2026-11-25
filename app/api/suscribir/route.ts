import { NextResponse } from "next/server";
import {
  codigoError,
  crearClienteOtp,
  crearClienteServicio,
  esConfiguracionFaltante,
} from "@/lib/supabase/servidor";
import { cuerpoGrande } from "@/lib/limite";
import { claveCorreo, claveIp, consumirLimite, ipDe, LIMITES } from "@/lib/limites";
import { avancePendiente } from "@/components/casa/avance-validar";
import { TEXTO_CONSENTIMIENTO } from "@/lib/consentimiento";
import { correoValido } from "@/lib/correo";

const sinConfiguracion = () => NextResponse.json({ error: "configuracion" }, { status: 503 });
const ok = () => NextResponse.json({ ok: true });
// Mismo cuerpo para el límite por IP y por correo: no dice cuál fue ni si el correo existe.
const muchos = () => NextResponse.json({ error: "limite" }, { status: 429 });
// El correo se guardó, pero el enlace no salió (SMTP, Supabase caído…).
const sinEnvio = () => NextResponse.json({ error: "envio" }, { status: 502 });

/** Supabase frena los envíos seguidos al mismo correo o por hora. */
function esLimiteDeEnvio(e: unknown): boolean {
  const o = (e ?? {}) as { code?: unknown; status?: unknown };
  return o.status === 429 || (typeof o.code === "string" && o.code.includes("rate_limit"));
}

export async function POST(req: Request) {
  if (cuerpoGrande(req)) return NextResponse.json({ error: "correo" }, { status: 413 });
  let cuerpo: { email?: unknown; consentimiento?: unknown; origen?: unknown; sitio?: unknown; avance?: unknown };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "correo" }, { status: 400 });
  }
  // Trampa para bots: el campo `sitio` está oculto; si viene lleno se responde ok y no se hace nada.
  if (typeof cuerpo?.sitio === "string" && cuerpo.sitio.trim() !== "") return ok();

  const email = typeof cuerpo?.email === "string" ? cuerpo.email.trim().toLowerCase() : "";
  if (!correoValido(email)) {
    return NextResponse.json({ error: "correo" }, { status: 400 });
  }
  const consentimiento = cuerpo.consentimiento === true;
  const origen = typeof cuerpo.origen === "string" ? cuerpo.origen.slice(0, 64) : null;
  const avance = avancePendiente(cuerpo.avance);

  const sitio = process.env.NEXT_PUBLIC_SITE_URL;
  if (!sitio) return sinConfiguracion();

  try {
    const servicio = crearClienteServicio();
    if (!(await consumirLimite(servicio, claveIp(ipDe(req)), LIMITES.suscribirIp))) return muchos();
    if (!(await consumirLimite(servicio, claveCorreo(email), LIMITES.suscribirCorreo))) return muchos();

    // Fila nueva, o nada si ya existe: no pisa origen ni baja el consentimiento.
    const alta = await servicio
      .from("suscriptores")
      .upsert({ email, consentimiento, origen }, { onConflict: "email", ignoreDuplicates: true });
    if (alta?.error) console.error("suscribir: alta", codigoError(alta.error));

    // Solo sube: el consentimiento pedido (queda por confirmar en /auth/callback) y el avance para el otro dispositivo.
    const cambios: Record<string, unknown> = {};
    if (consentimiento) {
      Object.assign(cambios, {
        consentimiento: true,
        consentido_en: new Date().toISOString(),
        texto_consentimiento: TEXTO_CONSENTIMIENTO,
      });
    }
    if (avance) cambios.avance_pendiente = avance;
    if (Object.keys(cambios).length) {
      const sube = await servicio.from("suscriptores").update(cambios).eq("email", email);
      if (sube?.error) console.error("suscribir: cambios", codigoError(sube.error));
    }

    // El correo ya quedó guardado; si el enlace no sale, se avisa (no se responde ok).
    try {
      const r = await crearClienteOtp().auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${sitio}/auth/callback` },
      });
      if (r?.error) {
        console.error("suscribir: enlace", codigoError(r.error));
        return esLimiteDeEnvio(r.error) ? muchos() : sinEnvio();
      }
    } catch (e) {
      if (esConfiguracionFaltante(e)) {
        console.error("suscribir: enlace", codigoError(e));
        return sinConfiguracion();
      }
      console.error("suscribir: enlace", codigoError(e));
      return sinEnvio();
    }
  } catch (e) {
    if (esConfiguracionFaltante(e)) return sinConfiguracion();
    console.error("suscribir:", codigoError(e));
  }
  return ok();
}
