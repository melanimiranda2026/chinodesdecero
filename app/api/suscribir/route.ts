import { NextResponse } from "next/server";
import {
  codigoError,
  crearClienteOtp,
  crearClienteServicio,
  esConfiguracionFaltante,
} from "@/lib/supabase/servidor";
import { cuerpoGrande } from "@/lib/limite";

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sinConfiguracion = () => NextResponse.json({ error: "configuracion" }, { status: 503 });

export async function POST(req: Request) {
  if (cuerpoGrande(req)) return NextResponse.json({ error: "correo" }, { status: 413 });
  let cuerpo: { email?: unknown; consentimiento?: unknown; origen?: unknown };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "correo" }, { status: 400 });
  }
  const email = typeof cuerpo?.email === "string" ? cuerpo.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !CORREO.test(email)) {
    return NextResponse.json({ error: "correo" }, { status: 400 });
  }
  const consentimiento = cuerpo.consentimiento === true;
  const origen = typeof cuerpo.origen === "string" ? cuerpo.origen.slice(0, 64) : null;

  const sitio = process.env.NEXT_PUBLIC_SITE_URL;
  if (!sitio) return sinConfiguracion();

  try {
    const servicio = crearClienteServicio();
    // Fila nueva, o nada si ya existe: no pisa origen ni baja el consentimiento.
    const alta = await servicio
      .from("suscriptores")
      .upsert({ email, consentimiento, origen }, { onConflict: "email", ignoreDuplicates: true });
    if (alta?.error) console.error("suscribir: alta", codigoError(alta.error));
    if (consentimiento) {
      // Solo sube: el upsert lleva únicamente el consentimiento, así que origen y plan no se tocan.
      const sube = await servicio
        .from("suscriptores")
        .upsert({ email, consentimiento: true }, { onConflict: "email" });
      if (sube?.error) console.error("suscribir: consentimiento", codigoError(sube.error));
    }

    try {
      const r = await crearClienteOtp().auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${sitio}/auth/callback` },
      });
      if (r?.error) console.error("suscribir: enlace", codigoError(r.error));
    } catch (e) {
      console.error("suscribir: enlace", codigoError(e));
    }
  } catch (e) {
    if (esConfiguracionFaltante(e)) return sinConfiguracion();
    console.error("suscribir:", codigoError(e));
  }
  return NextResponse.json({ ok: true });
}
