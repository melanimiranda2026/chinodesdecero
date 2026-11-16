import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hanziDelProyecto } from "../scripts/fuente-hanzi";

describe("fuente de los hanzi (Xiaolai)", () => {
  it("el woff2 recortado existe", () => {
    expect(existsSync("app/fuentes/xiaolai-hanzi.woff2")).toBe(true);
  });

  it("trae todos los hanzi que usa la web (si falla: npm run fuente)", () => {
    const enFuente = new Set(readFileSync("app/fuentes/xiaolai-caracteres.txt", "utf8").trim());
    const faltan = [...hanziDelProyecto()].filter((c) => !enFuente.has(c));
    expect(faltan).toEqual([]);
  });
});
