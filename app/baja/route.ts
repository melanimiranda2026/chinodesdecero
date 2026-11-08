import { codigoError, crearClienteServicio, esConfiguracionFaltante } from "@/lib/supabase/servidor";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pagina(titulo: string, texto: string, status: number) {
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${titulo} · Chino desde cero</title>
<style>body{margin:0;min-height:100svh;display:grid;place-items:center;background:#FFF6E6;color:#4A2A1C;font-family:system-ui,sans-serif;padding:16px}
main{max-width:420px;text-align:center;border:3px solid #4A2A1C;border-radius:18px;padding:24px;background:#fff}
h1{font-size:1.4rem;margin:0 0 12px}p{line-height:1.5}a{color:#3A6FD6;font-weight:700}</style></head>
<body><main><h1>${titulo}</h1><p>${texto}</p><p><a href="/">Volver a la casa</a></p></main></body></html>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

/** /baja?e=<token_baja>: deja de enviar novedades a ese correo (consentimiento y confirmación en false). */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("e") ?? "";
  if (!UUID.test(token)) {
    return pagina("Enlace no válido", "Este enlace para darte de baja no es válido. Usa el que viene al final de nuestros correos.", 400);
  }
  try {
    const { error } = await crearClienteServicio()
      .from("suscriptores")
      .update({ consentimiento: false, consentimiento_confirmado: false })
      .eq("token_baja", token);
    if (error) {
      console.error("baja:", codigoError(error));
      return pagina("No pudimos darte de baja", "Algo falló de nuestro lado. Inténtalo otra vez en un rato.", 500);
    }
  } catch (e) {
    if (!esConfiguracionFaltante(e)) console.error("baja:", codigoError(e));
    return pagina("No pudimos darte de baja", "Algo falló de nuestro lado. Inténtalo otra vez en un rato.", 503);
  }
  // Mismo mensaje exista o no el token: no revela qué correos están anotados.
  return pagina("Listo", "Ya no te enviaremos novedades. Tu avance sigue guardado.", 200);
}
