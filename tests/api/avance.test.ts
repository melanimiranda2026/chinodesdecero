// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { supabaseFalso } from "./supabase-falso";

const falso = supabaseFalso();
const sesion = vi.hoisted(() => ({ user: null as { id: string } | null }));
vi.mock("@/lib/supabase/servidor", () => ({
  crearClienteSesion: async () => ({
    ...falso.cliente,
    auth: { getUser: async () => ({ data: { user: sesion.user } }) },
  }),
  esConfiguracionFaltante: () => false,
  codigoError: () => "x",
}));

import { GET, PUT } from "@/app/api/avance/route";

const datos = { estado: {}, medallas: {}, escuchadas: ["a"] };
const poner = (body: string, headers: Record<string, string> = {}) =>
  PUT(new Request("http://localhost/api/avance", { method: "PUT", headers, body }));

beforeEach(() => {
  falso.limpiar();
  sesion.user = { id: "u1" };
});

describe("/api/avance", () => {
  it("sin sesión: GET y PUT → 401", async () => {
    sesion.user = null;
    expect((await GET()).status).toBe(401);
    expect((await poner(JSON.stringify({ datos }))).status).toBe(401);
    expect(falso.operaciones).toHaveLength(0);
  });
  it("Content-Length > 64 KB → 413", async () => {
    const r = await poner("{}", { "content-length": String(64 * 1024 + 1) });
    expect(r.status).toBe(413);
  });
  it("PUT guarda los datos del usuario de la sesión", async () => {
    const r = await poner(JSON.stringify({ datos }));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
    expect(falso.fila("avance", "u1")).toMatchObject({ user_id: "u1", datos });
  });
  it("PUT con datos que no son objeto → 400", async () => {
    expect((await poner(JSON.stringify({ datos: [1] }))).status).toBe(400);
    expect((await poner("{")).status).toBe(400);
  });
  it("GET devuelve lo guardado, o null si no hay nada", async () => {
    expect(await (await GET()).json()).toEqual({ datos: null });
    falso.poner("avance", { user_id: "u1", datos });
    falso.poner("avance", { user_id: "u2", datos: { otro: 1 } });
    const r = await GET();
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ datos });
  });
});
