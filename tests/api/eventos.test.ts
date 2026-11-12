// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const insert = vi.fn();
const rpc = vi.fn();
vi.mock("@/lib/supabase/servidor", () => ({
  crearClienteServicio: () => ({ from: () => ({ insert }), rpc }),
  esConfiguracionFaltante: () => false,
  codigoError: () => "x",
}));

import { POST } from "@/app/api/eventos/route";
import { NOMBRES_EVENTO } from "@/lib/eventos-nombres";

function pedir(body: unknown) {
  return POST(new Request("http://localhost/api/eventos", { method: "POST", body: JSON.stringify(body) }));
}
const ev = (nombre = "entrar", datos?: unknown) => ({ nombre, datos });

beforeEach(() => {
  insert.mockReset().mockResolvedValue({ error: null });
  rpc.mockReset().mockResolvedValue({ data: true, error: null });
});

describe("POST /api/eventos", () => {
  it("la lista blanca trae los once nombres", () => {
    expect([...NOMBRES_EVENTO]).toEqual([
      "entrar", "tocar_objeto", "abrir_acciones", "gesto_completo", "quiz_inicio", "quiz_completo",
      "ver_metodo", "tocar_bloqueado", "dejar_correo", "clic_tiktok", "descargar_material",
    ]);
  });
  it("lote válido → 204 e inserta", async () => {
    const r = await pedir({ sesion: "s1", eventos: [ev("entrar"), ev("tocar_objeto", { id: "x" })] });
    expect(r.status).toBe(204);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0]).toHaveLength(2);
  });
  it("51 eventos → 400", async () => {
    const r = await pedir({ sesion: "s1", eventos: Array.from({ length: 51 }, () => ev()) });
    expect(r.status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });
  it("50 eventos → 204", async () => {
    const r = await pedir({ sesion: "s1", eventos: Array.from({ length: 50 }, () => ev()) });
    expect(r.status).toBe(204);
  });
  it("nombre fuera de la lista → 400", async () => {
    const r = await pedir({ sesion: "s1", eventos: [ev("hackear")] });
    expect(r.status).toBe(400);
  });
  it("sesión vacía o larga → 400", async () => {
    expect((await pedir({ sesion: "", eventos: [ev()] })).status).toBe(400);
    expect((await pedir({ sesion: "x".repeat(65), eventos: [ev()] })).status).toBe(400);
  });
  it("datos que no son objeto o pesan más de 2 KB → 400", async () => {
    expect((await pedir({ sesion: "s", eventos: [ev("entrar", [1])] })).status).toBe(400);
    expect((await pedir({ sesion: "s", eventos: [ev("entrar", "texto")] })).status).toBe(400);
    expect((await pedir({ sesion: "s", eventos: [ev("entrar", { a: "x".repeat(2100) })] })).status).toBe(400);
  });
  it("datos se miden en bytes (acentos cuentan doble)", async () => {
    expect((await pedir({ sesion: "s", eventos: [ev("entrar", { a: "ñ".repeat(1100) })] })).status).toBe(400);
  });
  it("Content-Length > 64 KB → 413 sin leer el cuerpo", async () => {
    const r = await POST(
      new Request("http://localhost/api/eventos", {
        method: "POST",
        headers: { "content-length": String(64 * 1024 + 1) },
        body: "{}",
      }),
    );
    expect(r.status).toBe(413);
  });
  it("lote vacío o JSON roto → 400", async () => {
    expect((await pedir({ sesion: "s", eventos: [] })).status).toBe(400);
    const r = await POST(new Request("http://localhost/api/eventos", { method: "POST", body: "{" }));
    expect(r.status).toBe(400);
  });
  it("120 lotes por minuto por IP: sobre el límite → 429 sin insertar", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    const r = await POST(
      new Request("http://localhost/api/eventos", {
        method: "POST",
        headers: { "x-forwarded-for": "5.6.7.8" },
        body: JSON.stringify({ sesion: "s", eventos: [ev()] }),
      }),
    );
    expect(r.status).toBe(429);
    expect(insert).not.toHaveBeenCalled();
    const args = rpc.mock.calls[0][1];
    expect(args).toMatchObject({ p_max: 120, p_segundos: 60 });
    expect(args.p_clave).toMatch(/^ip:[0-9a-f]{64}$/);
  });
  it("evento quiz_inicio se acepta", async () => {
    expect((await pedir({ sesion: "s", eventos: [ev("quiz_inicio")] })).status).toBe(204);
  });
});
