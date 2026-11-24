import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RelojSolar, posicionAstro, puntoCamino } from "@/components/casa/RelojSolar";

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

describe("RelojSolar: camino del sol a la luna", () => {
  it("siempre se ven el sol y la luna", () => {
    const { container } = render(<RelojSolar hora={8} hechos={0} total={7} />);
    expect(container.querySelector('[class*="sol"]')).not.toBeNull();
    expect(container.querySelector('[class*="luna"]')).not.toBeNull();
  });

  it("un punto por paso; se llenan los hechos y el avance sigue a los pasos", () => {
    const { container } = render(<RelojSolar hora={9} hechos={3} total={7} />);
    expect(container.querySelectorAll('[data-paso="hecho"]').length).toBe(3);
    expect(container.querySelectorAll('[data-paso="falta"]').length).toBe(4);
    expect(Number(screen.getByRole("img").dataset.avance)).toBeCloseTo(3 / 7, 2);
    expect(screen.getByRole("img").dataset.lleno).toBeUndefined();
  });

  it("con todo hecho el camino queda lleno y la luna se enciende", () => {
    const { container } = render(<RelojSolar hora={11} hechos={7} total={7} />);
    expect(screen.getByRole("img").dataset.lleno).toBe("true");
    expect(container.querySelector("[data-encendida]")).not.toBeNull();
  });

  it("sin pasos (la cocina, que aún no está en el motor) solo marca la hora: sin puntos", () => {
    const { container } = render(<RelojSolar hora={12} />);
    expect(container.querySelectorAll("[data-paso]").length).toBe(0);
    expect(container.querySelector("[data-encendida]")).toBeNull();
  });
});

describe("puntoCamino", () => {
  it("parte junto al sol, sube a la cima y termina junto a la luna", () => {
    expect(puntoCamino(0)).toEqual({ x: 20, y: 38 });
    expect(puntoCamino(0.5).x).toBeCloseTo(60);
    expect(puntoCamino(0.5).y).toBeCloseTo(12);
    expect(puntoCamino(1).x).toBeCloseTo(100);
  });
});
