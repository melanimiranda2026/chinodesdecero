import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ESCENARIOS } from "@/components/casa/escenarios";
import { ordenDeDibujo, problemasEscenario } from "@/components/casa/escenarios/validar";
import type { DefEscenario } from "@/components/casa/escenarios/tipos";

describe("fichas de escenario", () => {
  it.each(ESCENARIOS.map((e) => [e.id, e] as const))("%s está bien escrita y su dibujo existe", (id, def) => {
    expect(problemasEscenario(def)).toEqual([]);
    expect(existsSync(join(process.cwd(), "public", "arte", id, `cuarto_${id}.svg`)), "corre npm run arte:generar").toBe(true);
  });

  it("baño y dormitorio no repiten cuarto", () => {
    expect(new Set(ESCENARIOS.map((e) => e.id)).size).toBe(ESCENARIOS.length);
  });

  const base: DefEscenario = {
    id: "bano",
    nombre: "浴室",
    ambiente: { piso: { tipo: "tablas" }, paredes: { izq: "#fff", der: "#fff", zocalo: "#ccc" } },
    colgados: [],
    muebles: [],
  };

  it("avisa si un mueble se sale del piso, si dos se pisan o si un id se repite", () => {
    const p = problemasEscenario({
      ...base,
      muebles: [
        { tipo: "inodoro", id: "a", base: { u0: 9, u1: 11, v0: 0, v1: 1 } },
        { tipo: "closet", id: "b", base: { u0: 0, u1: 2, v0: 0, v1: 2 }, alto: 5 },
        { tipo: "velador", id: "b", base: { u0: 1, u1: 3, v0: 1, v1: 3 } },
      ],
    });
    expect(p.join("\n")).toMatch(/"a" se sale del piso/);
    expect(p.join("\n")).toMatch(/"b" y "b" se pisan/);
    expect(p.join("\n")).toMatch(/id "b" está repetido/);
  });

  it("una alfombra puede ir debajo de un mueble", () => {
    expect(problemasEscenario({
      ...base,
      muebles: [
        { tipo: "alfombra", id: "a", base: { u0: 1, u1: 5, v0: 1, v1: 5 }, color: "#fff", borde: "#000" },
        { tipo: "velador", id: "b", base: { u0: 2, u1: 3, v0: 2, v1: 3 } },
      ],
    })).toEqual([]);
  });

  it("avisa si algo colgado se sale de la pared", () => {
    const p = problemasEscenario({ ...base, colgados: [{ tipo: "cuadro", id: "c", pared: "der", desde: 9, hasta: 10.5, z0: 3, z1: 7, motivo: "luna" }] });
    expect(p).toHaveLength(2);
  });

  it("dibuja de atrás hacia adelante: alfombras primero, y lo de atrás antes que lo de adelante", () => {
    const orden = ordenDeDibujo([
      { tipo: "velador", id: "adelante", base: { u0: 6, u1: 7, v0: 6, v1: 7 } },
      { tipo: "alfombra", id: "alfombra", base: { u0: 1, u1: 9, v0: 1, v1: 9 }, color: "#fff", borde: "#000" },
      { tipo: "closet", id: "largo", base: { u0: 0, u1: 1.5, v0: 1, v1: 9 }, alto: 5 },
      { tipo: "velador", id: "atras", base: { u0: 3, u1: 4, v0: 0, v1: 1 } },
    ]).map((m) => m.id);
    expect(orden[0]).toBe("alfombra");
    expect(orden.indexOf("largo")).toBeLessThan(orden.indexOf("adelante"));
    expect(orden.indexOf("atras")).toBeLessThan(orden.indexOf("adelante"));
  });
});
