// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabaseFalso } from "./supabase-falso";

const falso = supabaseFalso();
const signInWithOtp = vi.fn();

vi.mock("@/lib/supabase/servidor", () => ({
  crearClienteServicio: () => falso.cliente,
  crearClienteOtp: () => ({ auth: { signInWithOtp } }),
  esConfiguracionFaltante: (e: unknown) => (e as Error)?.name === "ConfiguracionFaltante",
  codigoError: () => "x",
}));

import { POST } from "@/app/api/suscribir/route";
import { claveCorreo, claveIp } from "@/lib/limites";
import { ESTADO_INICIAL } from "@/components/casa/cocina/datos";

function pedir(body: unknown, ip = "1.2.3.4") {
  return POST(
    new Request("http://localhost/api/suscribir", {
      method: "POST",
      headers: { "x-forwarded-for": `${ip}, 10.0.0.1` },
      body: JSON.stringify(body),
    }),
  );
}
const fila = (email: string) => falso.fila("suscriptores", email);
const avance = { estado: ESTADO_INICIAL, medallas: { cortar: "oro" }, escuchadas: ["ni2_hao3", "bei1_zi5"] };

beforeEach(() => {
  falso.limpiar();
  signInWithOtp.mockReset().mockResolvedValue({ error: null });
  process.env.NEXT_PUBLIC_SITE_URL = "https://sitio.test";
});

describe("POST /api/suscribir", () => {
  it("correo inválido → 400", async () => {
    const r = await pedir({ email: "hola", consentimiento: true });
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: "correo" });
    expect(falso.operaciones).toHaveLength(0);
  });

  it("correo válido → 200, alta y signInWithOtp con redirect", async () => {
    const r = await pedir({ email: "  Ana@Correo.com ", consentimiento: true, origen: "casa" });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
    expect(fila("ana@correo.com")).toMatchObject({ consentimiento: true, origen: "casa" });
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
    expect(fila("a@b.cl")).toMatchObject({ consentimiento: true, origen: "casa" });
  });

  it("consentimiento true existente no baja con false; false usa ignoreDuplicates", async () => {
    await pedir({ email: "a@b.cl", consentimiento: true });
    await pedir({ email: "a@b.cl", consentimiento: false });
    expect(fila("a@b.cl")?.consentimiento).toBe(true);
    const ultima = falso.operaciones.filter((o) => o.tabla === "suscriptores").at(-1);
    expect(ultima).toMatchObject({ op: "upsert", opciones: { onConflict: "email", ignoreDuplicates: true } });
  });

  it("consentimiento false existente sube con true", async () => {
    await pedir({ email: "a@b.cl", consentimiento: false, origen: "casa" });
    await pedir({ email: "a@b.cl", consentimiento: true });
    expect(fila("a@b.cl")).toMatchObject({ consentimiento: true, origen: "casa" });
  });

  it("con consentimiento guarda la versión del texto y la hora, sin confirmarlo (doble opt-in)", async () => {
    await pedir({ email: "a@b.cl", consentimiento: true });
    const f = fila("a@b.cl")!;
    expect(f.texto_consentimiento).toBe("v1-2026-11");
    expect(typeof f.consentido_en).toBe("string");
    expect(f.consentimiento_confirmado).toBeUndefined(); // solo /auth/callback lo confirma
  });

  it("sin consentimiento no guarda versión ni hora", async () => {
    await pedir({ email: "a@b.cl", consentimiento: false });
    expect(fila("a@b.cl")?.texto_consentimiento).toBeUndefined();
    expect(fila("a@b.cl")?.consentido_en).toBeUndefined();
  });

  it("guarda el avance (sin correo) como avance_pendiente, validado", async () => {
    await pedir({ email: "a@b.cl", consentimiento: false, avance: { ...avance, correo: "x@y.cl", raro: 1 } });
    expect(fila("a@b.cl")?.avance_pendiente).toEqual({
      estado: ESTADO_INICIAL,
      medallas: { cortar: "oro" },
      escuchadas: ["ni2_hao3", "bei1_zi5"],
    });
  });

  it("un avance que no es objeto se ignora", async () => {
    await pedir({ email: "a@b.cl", consentimiento: false, avance: [1, 2] });
    expect(fila("a@b.cl")?.avance_pendiente).toBeUndefined();
  });

  it("trampa: con el campo oculto `sitio` lleno → 200 y no hace nada", async () => {
    const r = await pedir({ email: "a@b.cl", consentimiento: true, sitio: "http://spam" });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
    expect(falso.operaciones).toHaveLength(0);
    expect(falso.rpc).not.toHaveBeenCalled();
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("límites: usa claves con hash por IP (5/h) y por correo (3/h), nunca en claro", async () => {
    await pedir({ email: "A@b.cl", consentimiento: false }, "9.9.9.9");
    const [ip, correo] = falso.rpc.mock.calls.map((c) => c[1]);
    expect(ip).toEqual({ p_clave: claveIp("9.9.9.9"), p_max: 5, p_segundos: 3600 });
    expect(correo).toEqual({ p_clave: claveCorreo("a@b.cl"), p_max: 3, p_segundos: 3600 });
    expect(String(ip.p_clave)).toMatch(/^ip:[0-9a-f]{64}$/);
    expect(String(correo.p_clave)).toMatch(/^email:[0-9a-f]{64}$/);
    expect(JSON.stringify(falso.rpc.mock.calls)).not.toContain("9.9.9.9");
    expect(JSON.stringify(falso.rpc.mock.calls)).not.toContain("a@b.cl");
  });

  it("sobre el límite → 429 con cuerpo genérico, sin alta ni enlace", async () => {
    falso.rpc.mockResolvedValue({ data: false, error: null });
    const r = await pedir({ email: "a@b.cl", consentimiento: true });
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ error: "limite" });
    expect(fila("a@b.cl")).toBeUndefined();
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("límite por correo (la IP pasa) → mismo 429 genérico", async () => {
    falso.rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: false, error: null });
    const r = await pedir({ email: "a@b.cl", consentimiento: true });
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ error: "limite" });
  });

  it("si la función de límites falla (p. ej. sin migrar), deja pasar", async () => {
    falso.rpc.mockResolvedValue({ data: null, error: { code: "42883" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await pedir({ email: "a@b.cl", consentimiento: false })).status).toBe(200);
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
