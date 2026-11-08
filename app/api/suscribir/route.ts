import { NextResponse } from "next/server";
import { crearClienteServicio, crearClienteSesion, esConfiguracionFaltante } from "@/lib/supabase/servidor";

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function describir(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export async function POST(req: Request) {
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

  try {
    const servicio = crearClienteServicio();
    // El consentimiento solo sube: si ya era true, un false no lo baja.
    const previo = await servicio.from("suscriptores").select("consentimiento").eq("email", email).maybeSingle();
    const final = consentimiento || previo?.data?.consentimiento === true;
    const { error } = await servicio
      .from("suscriptores")
      .upsert({ email, consentimiento: final, origen }, { onConflict: "email" });
    if (error) console.error("suscribir: upsert", error.code ?? error.message);

    try {
      const sesion = await crearClienteSesion();
      const sitio = process.env.NEXT_PUBLIC_SITE_URL ?? "";
      const r = await sesion.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${sitio}/auth/callback` },
      });
      if (r?.error) console.error("suscribir: enlace", r.error.code ?? r.error.message);
    } catch (e) {
      console.error("suscribir: enlace", describir(e));
    }
  } catch (e) {
    if (esConfiguracionFaltante(e)) return NextResponse.json({ error: "configuracion" }, { status: 503 });
    console.error("suscribir:", describir(e));
  }
  return NextResponse.json({ ok: true });
}
