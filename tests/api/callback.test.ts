// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabaseFalso } from "./supabase-falso";

const falso = supabaseFalso();
const verifyOtp = vi.fn();
const exchangeCodeForSession = vi.fn();
vi.mock("@/lib/supabase/servidor", () => ({
  crearClienteSesion: async () => ({ auth: { verifyOtp, exchangeCodeForSession } }),
  crearClienteServicio: () => falso.cliente,
  codigoError: () => "x",
}));

import { GET } from "@/app/auth/callback/route";
import { ESTADO_INICIAL } from "@/components/casa/cocina/datos";

const ir = (qs: string) => GET(new Request(`https://sitio.test/auth/callback${qs}`));
const destino = (r: Response) => new URL(r.headers.get("location")!).pathname + new URL(r.headers.get("location")!).search;
const USER = { id: "u1", email: "Ana@B.cl" };
const avance = (escuchadas: string[]) => ({ estado: ESTADO_INICIAL, medallas: {}, escuchadas });
const conToken = () => ir("?token_hash=abc&type=email");

beforeEach(() => {
  falso.limpiar();
  verifyOtp.mockReset().mockResolvedValue({ data: { user: USER }, error: null });
  exchangeCodeForSession.mockReset().mockResolvedValue({ data: { user: USER }, error: null });
});

describe("GET /auth/callback", () => {
  it("token_hash válido → verifyOtp y /?bienvenida=1", async () => {
    const r = await conToken();
    expect(verifyOtp).toHaveBeenCalledWith({ type: "email", token_hash: "abc" });
    expect(destino(r)).toBe("/?bienvenida=1");
  });
  it("type magiclink también vale", async () => {
    await ir("?token_hash=abc&type=magiclink");
    expect(verifyOtp).toHaveBeenCalledWith({ type: "magiclink", token_hash: "abc" });
  });
  it("verifyOtp falla → /?enlace=fallo y no toca suscriptores", async () => {
    falso.poner("suscriptores", { email: "ana@b.cl", consentimiento: true });
    verifyOtp.mockResolvedValue({ data: { user: null }, error: { code: "otp_expired" } });
    expect(destino(await conToken())).toBe("/?enlace=fallo");
    expect(falso.fila("suscriptores", "ana@b.cl")?.consentimiento_confirmado).toBeUndefined();
  });
  it("type fuera de email/magiclink → no verifica y falla", async () => {
    const r = await ir("?token_hash=abc&type=recovery");
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(destino(r)).toBe("/?enlace=fallo");
  });
  it("code como respaldo", async () => {
    const r = await ir("?code=zzz");
    expect(exchangeCodeForSession).toHaveBeenCalledWith("zzz");
    expect(destino(r)).toBe("/?bienvenida=1");
  });
  it("sin parámetros → fallo", async () => {
    expect(destino(await ir(""))).toBe("/?enlace=fallo");
  });
});

describe("callback: doble opt-in", () => {
  it("con consentimiento pedido lo confirma (correo en minúsculas)", async () => {
    falso.poner("suscriptores", { email: "ana@b.cl", consentimiento: true });
    await conToken();
    expect(falso.fila("suscriptores", "ana@b.cl")?.consentimiento_confirmado).toBe(true);
  });
  it("sin consentimiento no confirma nada", async () => {
    falso.poner("suscriptores", { email: "ana@b.cl", consentimiento: false });
    await conToken();
    expect(falso.fila("suscriptores", "ana@b.cl")?.consentimiento_confirmado).toBeUndefined();
  });
  it("si la base falla, la persona entra igual", async () => {
    falso.poner("suscriptores", { email: "ana@b.cl", consentimiento: true });
    falso.fallar.add("suscriptores");
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(destino(await conToken())).toBe("/?bienvenida=1");
  });
});

describe("callback: avance entre dispositivos", () => {
  it("sin fila de avance: inserta el pendiente y lo borra", async () => {
    falso.poner("suscriptores", { email: "ana@b.cl", consentimiento: false, avance_pendiente: avance(["a", "b"]) });
    await conToken();
    expect(falso.fila("avance", "u1")?.datos).toEqual(avance(["a", "b"]));
    expect(falso.fila("suscriptores", "ana@b.cl")?.avance_pendiente).toBeNull();
  });
  it("la cuenta tiene menos escuchadas: gana el pendiente", async () => {
    falso.poner("avance", { user_id: "u1", datos: avance(["a"]) });
    falso.poner("suscriptores", { email: "ana@b.cl", consentimiento: false, avance_pendiente: avance(["a", "b"]) });
    await conToken();
    expect(falso.fila("avance", "u1")?.datos).toEqual(avance(["a", "b"]));
  });
  it("la cuenta tiene igual o más escuchadas: no se pisa, y el pendiente se borra", async () => {
    falso.poner("avance", { user_id: "u1", datos: avance(["x", "y"]) });
    falso.poner("suscriptores", { email: "ana@b.cl", consentimiento: false, avance_pendiente: avance(["a", "b"]) });
    await conToken();
    expect(falso.fila("avance", "u1")?.datos).toEqual(avance(["x", "y"]));
    expect(falso.fila("suscriptores", "ana@b.cl")?.avance_pendiente).toBeNull();
  });
  it("valida la forma: lo desconocido se descarta y el estado imposible vuelve al inicial", async () => {
    falso.poner("suscriptores", {
      email: "ana@b.cl",
      consentimiento: false,
      avance_pendiente: { estado: { beizi: "lava" }, medallas: { cortar: "diamante" }, escuchadas: ["a", 3], correo: "z@z.cl", extra: 1 },
    });
    await conToken();
    expect(falso.fila("avance", "u1")?.datos).toEqual(avance(["a"]));
  });
  it("pendiente que no es objeto: no inserta y lo borra", async () => {
    falso.poner("suscriptores", { email: "ana@b.cl", consentimiento: false, avance_pendiente: "basura" });
    await conToken();
    expect(falso.fila("avance", "u1")).toBeUndefined();
    expect(falso.fila("suscriptores", "ana@b.cl")?.avance_pendiente).toBeNull();
  });
  it("si falla leer el avance de la cuenta, el pendiente se conserva para otro intento", async () => {
    falso.poner("suscriptores", { email: "ana@b.cl", consentimiento: true, avance_pendiente: avance(["a"]) });
    falso.fallar.add("avance");
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(destino(await conToken())).toBe("/?bienvenida=1");
    const f = falso.fila("suscriptores", "ana@b.cl");
    expect(f?.avance_pendiente).toEqual(avance(["a"]));
    expect(f?.consentimiento_confirmado).toBe(true);
  });
  it("el flujo con code también trae el avance", async () => {
    falso.poner("suscriptores", { email: "ana@b.cl", consentimiento: false, avance_pendiente: avance(["a"]) });
    await ir("?code=zzz");
    expect(falso.fila("avance", "u1")?.datos).toEqual(avance(["a"]));
  });
});
