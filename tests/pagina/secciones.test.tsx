import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const registrar = vi.fn();
vi.mock("@/components/casa/eventos", () => ({ registrar: (...a: unknown[]) => registrar(...a) }));

import { Metodo } from "@/components/pagina/Metodo";
import { Pie } from "@/components/pagina/Pie";
import { Sobre } from "@/components/pagina/Sobre";
import { METODO, TIKTOK } from "@/components/pagina/contenido";

describe("secciones de la página", () => {
  beforeEach(() => registrar.mockClear());

  it("el método muestra su título y sus tres ideas", () => {
    render(<Metodo />);
    expect(screen.getByRole("heading", { name: "Cómo funciona el Método Jìn" })).toBeTruthy();
    expect(METODO.ideas.map((i) => i.titulo)).toEqual([
      "Escuchas primero",
      "La imagen te dice qué significa",
      "Repites jugando",
    ]);
    for (const i of METODO.ideas) expect(screen.getByRole("heading", { name: i.titulo })).toBeTruthy();
  });

  it("el pie enlaza a TikTok en otra pestaña", () => {
    render(<Pie />);
    const t = screen.getByRole("link", { name: "TikTok" });
    expect(t.getAttribute("href")).toBe(TIKTOK.url);
    expect(t.getAttribute("target")).toBe("_blank");
  });

  it("el pie tiene su título y el formulario de correo", () => {
    render(<Pie />);
    expect(screen.getByRole("heading", { level: 2 })).toBeTruthy();
    expect(screen.getByLabelText(/tu correo/i)).toBeTruthy();
  });

  it("el texto de la página no dice \"entiendes\" ni \"aprende chino en TikTok\"", () => {
    const { container } = render(
      <>
        <Metodo />
        <Pie />
      </>,
    );
    const texto = (container.textContent ?? "").toLowerCase();
    expect(texto).not.toContain("entiendes");
    expect(texto).not.toContain("aprende chino en tiktok");
    expect(texto).not.toMatch(/anki/);
  });
});


describe("Sobre nosotros", () => {
  it("muestra título, correo mailto y enlace a TikTok, sin prometer aprender en TikTok", () => {
    const { container } = render(<Sobre />);
    expect(screen.getByRole("heading", { name: "Sobre nosotros" })).toBeTruthy();
    const mail = screen.getByRole("link", { name: "niu@chinoconlavaca.com" });
    expect(mail.getAttribute("href")).toBe("mailto:niu@chinoconlavaca.com");
    expect(screen.getByRole("link", { name: "Síguenos en TikTok" }).getAttribute("href")).toBe(TIKTOK.url);
    expect(screen.getByRole("link", { name: "Jugar ahora" }).getAttribute("href")).toBe("/");
    expect(container.textContent?.toLowerCase()).not.toContain("aprende chino en tiktok");
    // el método vive aquí ahora (el menú enlaza a /sobre#metodo)
    expect(container.querySelector("#metodo")).toBeTruthy();
    expect(container.textContent?.toLowerCase()).not.toContain("chino desde cero");
  });
});

describe("TikTok", () => {
  it("el nombre de la cuenta de TikTok solo vive en TIKTOK (enlace), con su pendiente anotado", async () => {
    const { readFileSync } = await import("node:fs");
    expect(readFileSync("components/pagina/contenido.ts", "utf-8")).toMatch(/PENDIENTE: la dueña confirma la cuenta oficial y su @ \(spec §11\.1\)/);
  });
});

describe("portada corta", () => {
  it("la portada es solo el juego y el pie: sin elige tu juego, método, material ni síguenos", async () => {
    const { readFileSync } = await import("node:fs");
    const page = readFileSync("app/page.tsx", "utf-8");
    expect(page).not.toMatch(/Minijuegos|Metodo|Material|Siguenos/);
    expect(page).toMatch(/<Portada \/>/);
    expect(page).toMatch(/<Pie \/>/);
  });
});
