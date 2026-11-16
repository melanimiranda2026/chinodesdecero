import { describe, expect, it } from "vitest";
import { caminoPieza } from "@/components/puzzle/forma";

describe("caminoPieza", () => {
  it("dibuja pestaña a la derecha y hueco a la izquierda", () => {
    const d = caminoPieza(100, 50, 8);
    expect(d.startsWith("M")).toBe(true);
    expect(d).toContain("A 8 8 0 0 1 100 33");
    expect(d).toContain("A 8 8 0 0 0 0 17");
  });

  it("reduce el radio en piezas bajas y no da NaN", () => {
    const d = caminoPieza(60, 24);
    expect(d).not.toContain("A 8 8");
    expect(d).not.toContain("NaN");
  });

  it("sin tamaño no dibuja nada", () => {
    expect(caminoPieza(0, 0)).toBe("");
  });
});
