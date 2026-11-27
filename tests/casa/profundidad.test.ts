import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fueraDePiezas, piezasDelante } from "@/components/casa/motor/profundidad";
import { LIVING } from "@/components/casa/living/cuarto";
import { MUEBLES_LIVING, PIEZAS_LIVING } from "@/components/casa/living/lugares";
import { alPiso, PISO_LIBRE } from "@/components/casa/cocina/iso";
import manifiesto from "@/components/casa/arte/manifiesto-arte.json";

const { mesa } = MUEBLES_LIVING;
const pie = (id: string) => {
  const o = LIVING.objetos.find((x) => x.id === id)!;
  return alPiso(o.pie.x, o.pie.y);
};

describe("delante o detrás de los muebles (living)", () => {
  it("delante de la mesa (al pie de la mesa, al entrar): ningún mueble la tapa", () => {
    expect([...piezasDelante(PIEZAS_LIVING, pie("zhuozi"))]).toEqual([]);
    expect([...piezasDelante(PIEZAS_LIVING, { u: 8.6, v: 8.8 })]).toEqual([]);
  });

  it("detrás de la mesa (bajo la foto): la mesa la tapa, y la silla de adelante también va encima de la mesa", () => {
    const d = piezasDelante(PIEZAS_LIVING, pie("zhaopian"));
    expect(d.has("mesa")).toBe(true);
    expect(d.has("silla_atras")).toBe(true);
    expect(d.has("silla_adelante")).toBe(true);
    // el sofá y la tele quedan detrás de ella
    expect(d.has("sofa")).toBe(false);
    expect(d.has("tele")).toBe(false);
  });

  it("sentada en la silla de la izquierda: la silla queda detrás y la mesa delante", () => {
    const d = piezasDelante(PIEZAS_LIVING, { u: 0, v: 0 }, "yizi");
    expect(d.has("silla_izquierda")).toBe(false);
    expect(d.has("mesa")).toBe(true);
  });

  it("sentada en el sofá: el sofá queda detrás de ella", () => {
    expect(piezasDelante(PIEZAS_LIVING, { u: 0, v: 0 }, "shafa").has("sofa")).toBe(false);
  });

  it("cada pieza tiene su dibujo en el manifiesto y en disco", () => {
    const m = manifiesto as Record<string, string>;
    for (const p of PIEZAS_LIVING) {
      expect(m[p.arte], p.arte).toBeDefined();
      expect(existsSync(join(process.cwd(), "public", m[p.arte])), p.arte).toBe(true);
    }
  });
});

describe("fueraDePiezas", () => {
  it("un punto dentro de la mesa sale por el borde más cercano, fuera de todos los muebles y en el piso libre", () => {
    const c = fueraDePiezas(PIEZAS_LIVING, { u: 6.0, v: 6.3 });
    const dentro = PIEZAS_LIVING.some((p) => c.u > p.u0 && c.u < p.u1 && c.v > p.v0 && c.v < p.v1);
    expect(dentro).toBe(false);
    expect(c.u).toBeGreaterThanOrEqual(PISO_LIBRE.min);
    expect(c.v).toBeLessThanOrEqual(PISO_LIBRE.max);
    // salió cerca (no al otro lado del cuarto)
    expect(Math.hypot(c.u - 6.0, c.v - 6.3)).toBeLessThan(2);
  });

  it("un punto libre no se mueve", () => {
    expect(fueraDePiezas(PIEZAS_LIVING, { u: 8.6, v: 8.8 })).toEqual({ u: 8.6, v: 8.8 });
  });

  it("ningún pie de objeto cae dentro de una pieza", () => {
    for (const o of LIVING.objetos) {
      const p = alPiso(o.pie.x, o.pie.y);
      const f = fueraDePiezas(PIEZAS_LIVING, p);
      expect(Math.hypot(f.u - p.u, f.v - p.v), o.id).toBeLessThan(0.01);
    }
  });

  it("el centro de la mesa ya no es un lugar donde quedarse", () => {
    const c = fueraDePiezas(PIEZAS_LIVING, { u: (mesa.u0 + mesa.u1) / 2, v: (mesa.v0 + mesa.v1) / 2 });
    expect(c.u <= mesa.u0 || c.u >= mesa.u1 || c.v <= mesa.v0 || c.v >= mesa.v1).toBe(true);
  });
});
