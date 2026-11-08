// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const verifyOtp = vi.fn();
const exchangeCodeForSession = vi.fn();
vi.mock("@/lib/supabase/servidor", () => ({
  crearClienteSesion: async () => ({ auth: { verifyOtp, exchangeCodeForSession } }),
  codigoError: () => "x",
}));

import { GET } from "@/app/auth/callback/route";

const ir = (qs: string) => GET(new Request(`https://sitio.test/auth/callback${qs}`));
const destino = (r: Response) => new URL(r.headers.get("location")!).pathname + new URL(r.headers.get("location")!).search;

beforeEach(() => {
  verifyOtp.mockReset().mockResolvedValue({ error: null });
  exchangeCodeForSession.mockReset().mockResolvedValue({ error: null });
});

describe("GET /auth/callback", () => {
  it("token_hash válido → verifyOtp y /?bienvenida=1", async () => {
    const r = await ir("?token_hash=abc&type=email");
    expect(verifyOtp).toHaveBeenCalledWith({ type: "email", token_hash: "abc" });
    expect(destino(r)).toBe("/?bienvenida=1");
  });
  it("type magiclink también vale", async () => {
    await ir("?token_hash=abc&type=magiclink");
    expect(verifyOtp).toHaveBeenCalledWith({ type: "magiclink", token_hash: "abc" });
  });
  it("verifyOtp falla → /?enlace=fallo", async () => {
    verifyOtp.mockResolvedValue({ error: { code: "otp_expired" } });
    expect(destino(await ir("?token_hash=abc&type=email"))).toBe("/?enlace=fallo");
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
