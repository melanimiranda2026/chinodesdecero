import { NextResponse } from "next/server";
import { bytes, cuerpoGrande, MAX_CUERPO } from "@/lib/limite";
import { codigoError, crearClienteSesion, esConfiguracionFaltante } from "@/lib/supabase/servidor";

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

async function conUsuario() {
  const sb = await crearClienteSesion();
  const { data } = await sb.auth.getUser();
  return { sb, user: data?.user ?? null };
}

function fallo(e: unknown) {
  if (esConfiguracionFaltante(e)) return NextResponse.json({ error: "configuracion" }, { status: 503 });
  console.error("avance:", codigoError(e));
  return NextResponse.json({ error: "servidor" }, { status: 500 });
}

export async function GET() {
  try {
    const { sb, user } = await conUsuario();
    if (!user) return NextResponse.json({ error: "sesion" }, { status: 401 });
    const { data, error } = await sb.from("avance").select("datos").eq("user_id", user.id).maybeSingle();
    if (error) {
      console.error("avance: select", codigoError(error));
      return NextResponse.json({ error: "servidor" }, { status: 500 });
    }
    return NextResponse.json({ datos: data?.datos ?? null });
  } catch (e) {
    return fallo(e);
  }
}

export async function PUT(req: Request) {
  if (cuerpoGrande(req)) return NextResponse.json({ error: "grande" }, { status: 413 });
  try {
    const { sb, user } = await conUsuario();
    if (!user) return NextResponse.json({ error: "sesion" }, { status: 401 });
    let cuerpo: unknown;
    try {
      cuerpo = await req.json();
    } catch {
      return NextResponse.json({ error: "datos" }, { status: 400 });
    }
    const datos = esObjeto(cuerpo) ? cuerpo.datos : undefined;
    if (!esObjeto(datos) || bytes(datos) > MAX_CUERPO) {
      return NextResponse.json({ error: "datos" }, { status: 400 });
    }
    const { error } = await sb
      .from("avance")
      .upsert({ user_id: user.id, datos, actualizado: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) {
      console.error("avance: upsert", codigoError(error));
      return NextResponse.json({ error: "servidor" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fallo(e);
  }
}
