import { describe, expect, it } from "vitest";
import { S } from "@/lib/silabas";
import { completo, fichaId, fichasDe, falta, horaDe, lograr, progresoVacio, tocar, todasLasFichas } from "@/components/casa/motor/progreso";
import type { DefCuarto } from "@/components/casa/motor/tipos";

const z = { x: 0, y: 0, w: 100, h: 100 };
const pie = { x: 0, y: 0 };
const A = S("沙发", "shā fā", "11");
const B = S("椅子", "yǐ zi", "35");
const C = S("电视", "diàn shì", "44");
const ZUO = S("坐", "zuò", "4");
const KAN = S("看", "kàn", "4");

const PRUEBA: DefCuarto = {
  id: "living",
  hora: [7, 11],
  salida: "cocina",
  objetos: [
    { id: "a", nombre: A, zona: z, pie, acciones: ["zuo"] },
    { id: "b", nombre: B, zona: z, pie, acciones: ["zuo"] },
    { id: "c", nombre: C, zona: z, pie, acciones: ["kan"] },
  ],
  acciones: [
    { id: "zuo", verbo: ZUO, frase: S("我坐下", "wǒ zuò xià", "344"), icono: "🪑", pose: "sentada" },
    { id: "kan", verbo: KAN, frase: S("我看电视", "wǒ kàn diàn shì", "3444"), icono: "📺", pose: "mira" },
  ],
};

describe("progreso del cuarto", () => {
  it("tocar es idempotente", () => {
    const p = tocar(tocar(progresoVacio(), "a"), "a");
    expect(p.tocados).toHaveLength(1);
  });
  it("lograr es idempotente", () => {
    const p = lograr(lograr(progresoVacio(), "zuo", "a"), "zuo", "a");
    expect(p.logros).toEqual(["zuo@a"]);
  });
  it("fichasDe: el sustantivo al tocar; el verbo solo cuando se logra en todos los objetos que lo ofrecen", () => {
    let p = tocar(progresoVacio(), "a");
    expect(fichasDe(PRUEBA, p)).toEqual([fichaId(A)]);
    p = lograr(p, "zuo", "a");
    expect(fichasDe(PRUEBA, p)).not.toContain(fichaId(ZUO));
    p = lograr(p, "zuo", "b");
    expect(fichasDe(PRUEBA, p)).toContain(fichaId(ZUO));
  });
  it("todasLasFichas: sustantivos y verbos en orden", () => {
    expect(todasLasFichas(PRUEBA)).toEqual([A, B, C, ZUO, KAN].map(fichaId));
  });
  it("falta y completo", () => {
    expect(falta(PRUEBA, progresoVacio())).toEqual({ objetos: ["a", "b", "c"], logros: ["zuo@a", "zuo@b", "kan@c"] });
    expect(completo(PRUEBA, progresoVacio())).toBe(false);
    let p = progresoVacio();
    for (const o of ["a", "b", "c"]) p = tocar(p, o);
    for (const [a, o] of [["zuo", "a"], ["zuo", "b"]]) p = lograr(p, a, o);
    expect(completo(PRUEBA, p)).toBe(false);
    p = lograr(p, "kan", "c");
    expect(completo(PRUEBA, p)).toBe(true);
  });
  it("horaDe: del inicio al final", () => {
    expect(horaDe(PRUEBA, progresoVacio())).toBe(7);
    let p = progresoVacio();
    for (const o of ["a", "b", "c"]) p = tocar(p, o);
    const mitad = horaDe(PRUEBA, p);
    expect(mitad).toBeGreaterThan(7);
    expect(mitad).toBeLessThan(11);
    for (const [a, o] of [["zuo", "a"], ["zuo", "b"], ["kan", "c"]]) p = lograr(p, a, o);
    expect(horaDe(PRUEBA, p)).toBe(11);
  });
});
