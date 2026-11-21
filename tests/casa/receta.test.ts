import { describe, expect, it } from "vitest";
import { echar, INGREDIENTES, lista, NOMBRE_INGREDIENTE, type Ingrediente } from "@/components/casa/receta/ingredientes";
import { textoHanzi } from "@/lib/silabas";

describe("receta", () => {
  it("lleva 米, 水 y 胡萝卜", () => {
    expect(INGREDIENTES).toEqual(["mi", "shui", "huluobo"]);
    expect(INGREDIENTES.map((i) => textoHanzi(NOMBRE_INGREDIENTE[i]))).toEqual(["米", "水", "胡萝卜"]);
  });

  it("echar no duplica ni cambia el conjunto original", () => {
    const vacia = new Set<Ingrediente>();
    const uno = echar(vacia, "mi");
    expect(vacia.size).toBe(0);
    expect([...uno]).toEqual(["mi"]);
    const otra = echar(uno, "mi");
    expect(otra).toBe(uno);
    expect(otra.size).toBe(1);
  });

  it("lista solo con los tres, en cualquier orden", () => {
    let en = new Set<Ingrediente>();
    expect(lista(en)).toBe(false);
    en = echar(en, "huluobo");
    expect(lista(en)).toBe(false);
    en = echar(en, "mi");
    expect(lista(en)).toBe(false);
    en = echar(en, "mi");
    expect(lista(en)).toBe(false);
    en = echar(en, "shui");
    expect(lista(en)).toBe(true);
  });
});
