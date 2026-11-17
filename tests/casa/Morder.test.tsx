import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { Morder } from "@/components/casa/primer-plano/Morder";

const visible = (el: Element) => !(el.getAttribute("class") ?? "").includes("sinCapa");

describe("comer en primer plano", () => {
  it("el plato no se muerde ni desaparece: solo la comida lleva la máscara", () => {
    const { container } = render(<Morder id="panzi" estado="lleno" mordidas={[{ u: 0.5, v: 0.5, r: 20 }]} comido />);
    const recipiente = container.querySelector("[data-recipiente]")!;
    const comida = container.querySelector("[data-mordidas]")!;
    expect([...recipiente.querySelectorAll("[data-capa='plato']")].some(visible)).toBe(true);
    expect([...comida.querySelectorAll("[data-capa='plato']")].some(visible)).toBe(false);
    expect([...comida.querySelectorAll("[data-capa='jiaozi']")].some(visible)).toBe(true);
    expect((recipiente as HTMLElement).style.maskImage ?? "").toBe("");
  });

  it("detrás del vaso al lavarlo no hay un círculo (parecía un plato)", () => {
    const css = readFileSync("components/casa/primer-plano/PrimerPlano.module.css", "utf-8");
    expect(css).toMatch(/\.mesa \{[^}]*display: none/);
    expect(css).toMatch(/\.pp\[data-fondo="agua"\] \.mesa \{[^}]*aspect-ratio: 4 \/ 3/);
  });
});
