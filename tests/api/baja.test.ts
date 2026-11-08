// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { supabaseFalso } from "./supabase-falso";

const falso = supabaseFalso();
vi.mock("@/lib/supabase/servidor", () => ({
  crearClienteServicio: () => falso.cliente,
  esConfiguracionFaltante: () => false,
  codigoError: () => "x",
}));

import { GET } from "@/app/baja/route";

const TOKEN = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const baja = (e: string) => GET(new Request(`https://sitio.test/baja?e=${e}`));

beforeEach(() => {
  falso.limpiar();
  falso.poner("suscriptores", { email: "a@b.cl", consentimiento: true, consentimiento_confirmado: true, token_baja: TOKEN });
  falso.poner("suscriptores", { email: "otro@b.cl", consentimiento: true, consentimiento_confirmado: true, token_baja: "x" });
});

describe("GET /baja", () => {
  it("token válido: baja el consentimiento y su confirmación, y muestra una página en español", async () => {
    const r = await baja(TOKEN);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("text/html");
    expect(await r.text()).toContain("Ya no te enviaremos novedades");
    expect(falso.fila("suscriptores", "a@b.cl")).toMatchObject({ consentimiento: false, consentimiento_confirmado: false });
    expect(falso.fila("suscriptores", "otro@b.cl")).toMatchObject({ consentimiento: true, consentimiento_confirmado: true });
  });
  it("token con otro formato → 400 sin tocar la base", async () => {
    const r = await baja("no-es-uuid");
    expect(r.status).toBe(400);
    expect(await r.text()).toContain("no es válido");
    expect(falso.operaciones).toHaveLength(0);
  });
  it("token desconocido → mismo mensaje (no revela quién está anotado)", async () => {
    const r = await baja("00000000-0000-4000-8000-000000000000");
    expect(r.status).toBe(200);
    expect(await r.text()).toContain("Ya no te enviaremos novedades");
  });
  it("si la base falla → 500 con mensaje amable", async () => {
    falso.fallar.add("suscriptores");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await baja(TOKEN);
    expect(r.status).toBe(500);
    expect(await r.text()).toContain("Inténtalo otra vez");
  });
});
