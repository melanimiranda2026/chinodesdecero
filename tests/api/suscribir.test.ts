// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const upsert = vi.fn();
const signInWithOtp = vi.fn();
const maybeSingle = vi.fn();

vi.mock("@/lib/supabase/servidor", () => ({
  crearClienteServicio: () => ({
    from: () => ({
      upsert,
      select: () => ({ eq: () => ({ maybeSingle }) }),
    }),
  }),
  crearClienteSesion: async () => ({ auth: { signInWithOtp } }),
}));

import { POST } from "@/app/api/suscribir/route";

function pedir(body: unknown) {
  return POST(
    new Request("http://localhost/api/suscribir", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  upsert.mockReset().mockResolvedValue({ error: null });
  signInWithOtp.mockReset().mockResolvedValue({ error: null });
  maybeSingle.mockReset().mockResolvedValue({ data: null, error: null });
});

describe("POST /api/suscribir", () => {
  it("correo inválido → 400", async () => {
    const r = await pedir({ email: "hola", consentimiento: true });
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: "correo" });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("correo válido → 200, upsert y signInWithOtp", async () => {
    const r = await pedir({ email: "  Ana@Correo.com ", consentimiento: true, origen: "casa" });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0][0]).toMatchObject({ email: "ana@correo.com", consentimiento: true, origen: "casa" });
    expect(signInWithOtp).toHaveBeenCalledTimes(1);
    expect(signInWithOtp.mock.calls[0][0].email).toBe("ana@correo.com");
  });

  it("el mismo correo dos veces → 200 las dos", async () => {
    const a = await pedir({ email: "a@b.cl", consentimiento: true });
    const b = await pedir({ email: "a@b.cl", consentimiento: true });
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
  });

  it("si signInWithOtp lanza → 200", async () => {
    signInWithOtp.mockRejectedValue(new Error("smtp"));
    const r = await pedir({ email: "a@b.cl", consentimiento: false });
    expect(r.status).toBe(200);
  });

  it("si ya tenía consentimiento true, false no lo baja", async () => {
    maybeSingle.mockResolvedValue({ data: { consentimiento: true }, error: null });
    await pedir({ email: "a@b.cl", consentimiento: false });
    expect(upsert.mock.calls[0][0].consentimiento).toBe(true);
  });

  it("correo de más de 254 caracteres → 400", async () => {
    const r = await pedir({ email: "a".repeat(250) + "@b.cl", consentimiento: true });
    expect(r.status).toBe(400);
  });
});
