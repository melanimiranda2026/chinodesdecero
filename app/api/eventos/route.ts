import { NextResponse } from "next/server";
import { NOMBRES_EVENTO } from "@/lib/eventos-nombres";
import { bytes, cuerpoGrande } from "@/lib/limite";
import { codigoError, crearClienteServicio, esConfiguracionFaltante } from "@/lib/supabase/servidor";
import { claveIp, consumirLimite, ipDe, LIMITES } from "@/lib/limites";

const MAX_LOTE = 50;
const MAX_DATOS = 2048;
const nombresValidos = new Set<string>(NOMBRES_EVENTO);

const mala = () => NextResponse.json({ error: "eventos" }, { status: 400 });
const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export async function POST(req: Request) {
  if (cuerpoGrande(req)) return NextResponse.json({ error: "grande" }, { status: 413 });
  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return mala();
  }
  if (!esObjeto(cuerpo)) return mala();
  const { sesion, eventos } = cuerpo;
  if (typeof sesion !== "string" || sesion.length === 0 || sesion.length > 64) return mala();
  if (!Array.isArray(eventos) || eventos.length === 0 || eventos.length > MAX_LOTE) return mala();

  const filas: { sesion: string; nombre: string; datos: Record<string, unknown> | null }[] = [];
  for (const e of eventos) {
    if (!esObjeto(e) || typeof e.nombre !== "string" || !nombresValidos.has(e.nombre)) return mala();
    let datos: Record<string, unknown> | null = null;
    if (e.datos !== undefined && e.datos !== null) {
      if (!esObjeto(e.datos)) return mala();
      if (bytes(e.datos) > MAX_DATOS) return mala();
      datos = e.datos;
    }
    filas.push({ sesion, nombre: e.nombre, datos });
  }

  try {
    const servicio = crearClienteServicio();
    if (!(await consumirLimite(servicio, claveIp(ipDe(req)), LIMITES.eventosIp))) {
      return NextResponse.json({ error: "limite" }, { status: 429 });
    }
    const { error } = await servicio.from("eventos").insert(filas);
    if (error) {
      console.error("eventos: insert", codigoError(error));
      return NextResponse.json({ error: "servidor" }, { status: 500 });
    }
  } catch (e) {
    if (esConfiguracionFaltante(e)) return NextResponse.json({ error: "configuracion" }, { status: 503 });
    console.error("eventos:", codigoError(e));
    return NextResponse.json({ error: "servidor" }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}
