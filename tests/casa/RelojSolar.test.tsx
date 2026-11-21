import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RelojSolar, posicionAstro } from "@/components/casa/RelojSolar";

describe("posicionAstro", () => {
  it("el sol sale a las 6 y está en lo alto a las 12", () => {
    expect(posicionAstro(6)).toEqual({ astro: "sol", t: 0 });
    expect(posicionAstro(12)).toEqual({ astro: "sol", t: 0.5 });
  });
  it("de noche es la luna, y a las 18 empieza su arco", () => {
    expect(posicionAstro(18)).toEqual({ astro: "luna", t: 0 });
    expect(posicionAstro(22).astro).toBe("luna");
    expect(posicionAstro(0).astro).toBe("luna");
    expect(posicionAstro(0).t).toBeCloseTo(0.5);
    expect(posicionAstro(5.99).astro).toBe("luna");
  });
});

describe("RelojSolar", () => {
  it.each([
    [8, "早上"],
    [12, "中午"],
    [16, "下午"],
    [21, "晚上"],
    [3, "晚上"],
  ])("a las %s h se lee %s", (hora, hanzi) => {
    render(<RelojSolar hora={hora} />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe(hanzi);
  });

  it("no tapa nada: la raíz declara pointer-events: none en su clase", () => {
    render(<RelojSolar hora={8} />);
    expect(screen.getByRole("img").className).toContain("reloj");
    const css = readFileSync(join(process.cwd(), "components/casa/RelojSolar.module.css"), "utf8");
    expect(css).toMatch(/\.reloj\s*\{[^}]*pointer-events:\s*none/);
  });
});
