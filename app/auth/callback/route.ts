import { NextResponse } from "next/server";
import { crearClienteSesion } from "@/lib/supabase/servidor";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const sitio = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  if (code) {
    try {
      const sb = await crearClienteSesion();
      const { error } = await sb.auth.exchangeCodeForSession(code);
      if (error) console.error("callback:", error.code ?? error.message);
    } catch (e) {
      console.error("callback:", e instanceof Error ? e.message : String(e));
    }
  }
  return NextResponse.redirect(new URL("/?bienvenida=1", sitio));
}
