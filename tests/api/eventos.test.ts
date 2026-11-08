// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const insert = vi.fn();
vi.mock("@/lib/supabase/servidor", () => ({
  crearClienteServicio: () => ({ from: () => ({ insert }) }),
  crearClienteSesion: async () => ({}),
}));

import { POST } from "@/app/api/eventos/route";
import { NOMBRES_EVENTO } from "@/lib/eventos-nombres";

function pedir(body: unknown) {
  return POST(new Request("http://localhost/api/eventos", { method: "POST", body: JSON.stringify(body) }));
}
const ev = (nombre = "entrar", datos?: unknown) => ({ nombre, datos });

beforeEach(() => insert.mockReset().mockResolvedValue({ error: null }));

describe("POST /api/eventos", () => {
  it("la lista blanca trae los diez nombres", () => {
    expect([...NOMBRES_EVENTO]).toEqual([
      "entrar", "tocar_objeto", "abrir_acciones", "gesto_completo", "quiz_completo",
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
  it("lote vacío o JSON roto → 400", async () => {
    expect((await pedir({ sesion: "s", eventos: [] })).status).toBe(400);
    const r = await POST(new Request("http://localhost/api/eventos", { method: "POST", body: "{" }));
    expect(r.status).toBe(400);
  });
});
