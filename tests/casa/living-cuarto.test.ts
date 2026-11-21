import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { idAudio } from "@/lib/silabas";
import { LIVING } from "@/components/casa/living/cuarto";
import { MUEBLES_LIVING } from "@/components/casa/living/lugares";
import { ZHE_SHI } from "@/components/casa/cocina/frases";
import { alPiso, PISO_LIBRE } from "@/components/casa/cocina/iso";
import { limitarVaca } from "@/components/casa/camara";

const choca = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe("LIVING", () => {
  it("las acciones de cada objeto existen y los ids son únicos", () => {
    const ids = LIVING.acciones.map((a) => a.id);
    for (const o of LIVING.objetos) for (const a of o.acciones) expect(ids, `${o.id}:${a}`).toContain(a);
    expect(new Set(LIVING.objetos.map((o) => o.id)).size).toBe(LIVING.objetos.length);
  });
  it("cada zona se puede tocar (>= 60 unidades por lado)", () => {
    for (const o of LIVING.objetos) {
      expect(o.zona.w, `${o.id} w`).toBeGreaterThanOrEqual(60);
      expect(o.zona.h, `${o.id} h`).toBeGreaterThanOrEqual(60);
    }
  });
  it("las zonas no se pisan", () => {
    const os = LIVING.objetos;
    for (let i = 0; i < os.length; i++)
      for (let j = i + 1; j < os.length; j++) expect(choca(os[i].zona, os[j].zona), `${os[i].id} / ${os[j].id}`).toBe(false);
  });
  it("cada pie cae en el piso libre, no dentro de un mueble", () => {
    const huellas = [MUEBLES_LIVING.sofa, MUEBLES_LIVING.muebleTele, MUEBLES_LIVING.mesa];
    for (const o of LIVING.objetos) {
      const { u, v } = alPiso(o.pie.x, o.pie.y);
      expect(u, `${o.id} u`).toBeGreaterThanOrEqual(PISO_LIBRE.min - 0.05);
      expect(u, `${o.id} u`).toBeLessThanOrEqual(PISO_LIBRE.max + 0.05);
      expect(v, `${o.id} v`).toBeGreaterThanOrEqual(PISO_LIBRE.min - 0.05);
      expect(v, `${o.id} v`).toBeLessThanOrEqual(PISO_LIBRE.max + 0.05);
      for (const m of huellas) expect(u >= m.u0 && u <= m.u1 && v >= m.v0 && v <= m.v1, `${o.id} dentro de un mueble`).toBe(false);
      const l = limitarVaca(o.pie.x, o.pie.y);
      expect(Math.hypot(l.x - o.pie.x, l.y - o.pie.y), `${o.id} limitarVaca`).toBeLessThan(1);
    }
  });
  it("cada audio que el living dice existe en disco", () => {
    const ids = [
      ...LIVING.objetos.flatMap((o) => [idAudio(o.nombre), idAudio([...ZHE_SHI, ...o.nombre])]),
      ...LIVING.acciones.flatMap((a) => [idAudio(a.verbo), idAudio(a.frase)]),
    ];
    for (const id of ids) expect(existsSync(join(process.cwd(), "public/audio/cocina", `${id}.mp3`)), id).toBe(true);
  });
});
