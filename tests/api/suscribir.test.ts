// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

type Fila = { email: string; consentimiento: boolean; origen?: string | null };
const tabla = new Map<string, Fila>();
const opciones: unknown[] = [];

// Simula upsert de Postgres: ignoreDuplicates no toca la fila; si no, mezcla solo las columnas enviadas.
const upsert = vi.fn(async (fila: Fila, op: { ignoreDuplicates?: boolean }) => {
  opciones.push(op);
  const previa = tabla.get(fila.email);
  if (!previa) tabla.set(fila.email, { ...fila });
  else if (!op.ignoreDuplicates) tabla.set(fila.email, { ...previa, ...fila });
  return { error: null };
});
const signInWithOtp = vi.fn();

vi.mock("@/lib/supabase/servidor", () => ({
  crearClienteServicio: () => ({ from: () => ({ upsert }) }),
  crearClienteOtp: () => ({ auth: { signInWithOtp } }),
  esConfiguracionFaltante: (e: unknown) => (e as Error)?.name === "ConfiguracionFaltante",
  codigoError: () => "x",
}));

import { POST } from "@/app/api/suscribir/route";

function pedir(body: unknown) {
  return POST(new Request("http://localhost/api/suscribir", { method: "POST", body: JSON.stringify(body) }));
}

beforeEach(() => {
  tabla.clear();
  opciones.length = 0;
  upsert.mockClear();
  signInWithOtp.mockReset().mockResolvedValue({ error: null });
  process.env.NEXT_PUBLIC_SITE_URL = "https://sitio.test";
});

describe("POST /api/suscribir", () => {
  it("correo inválido → 400", async () => {
    const r = await pedir({ email: "hola", consentimiento: true });
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: "correo" });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("correo válido → 200, upsert y signInWithOtp con redirect", async () => {
    const r = await pedir({ email: "  Ana@Correo.com ", consentimiento: true, origen: "casa" });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
    expect(tabla.get("ana@correo.com")).toMatchObject({ consentimiento: true, origen: "casa" });
    expect(signInWithOtp).toHaveBeenCalledTimes(1);
    expect(signInWithOtp.mock.calls[0][0]).toEqual({
      email: "ana@correo.com",
      options: { emailRedirectTo: "https://sitio.test/auth/callback" },
    });
  });

  it("el mismo correo dos veces → 200 y la fila existente conserva origen", async () => {
    const a = await pedir({ email: "a@b.cl", consentimiento: true, origen: "casa" });
    const b = await pedir({ email: "a@b.cl", consentimiento: true, origen: "otro" });
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(tabla.get("a@b.cl")).toMatchObject({ consentimiento: true, origen: "casa" });
  });

  it("consentimiento true existente no baja con false; false usa ignoreDuplicates", async () => {
    await pedir({ email: "a@b.cl", consentimiento: true });
    await pedir({ email: "a@b.cl", consentimiento: false });
    expect(tabla.get("a@b.cl")?.consentimiento).toBe(true);
    expect(opciones.at(-1)).toMatchObject({ onConflict: "email", ignoreDuplicates: true });
  });

  it("consentimiento false existente sube con true", async () => {
    await pedir({ email: "a@b.cl", consentimiento: false, origen: "casa" });
    await pedir({ email: "a@b.cl", consentimiento: true });
    expect(tabla.get("a@b.cl")).toMatchObject({ consentimiento: true, origen: "casa" });
  });

  it("si signInWithOtp lanza → 200", async () => {
    signInWithOtp.mockRejectedValue(new Error("smtp"));
    expect((await pedir({ email: "a@b.cl", consentimiento: false })).status).toBe(200);
  });

  it("correo de más de 254 caracteres → 400", async () => {
    expect((await pedir({ email: "a".repeat(250) + "@b.cl", consentimiento: true })).status).toBe(400);
  });

  it("sin NEXT_PUBLIC_SITE_URL → 503 configuracion", async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const r = await pedir({ email: "a@b.cl", consentimiento: true });
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ error: "configuracion" });
  });
});
