import { render, screen, within, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const registrar = vi.fn();
vi.mock("@/components/casa/eventos", () => ({ registrar: (...a: unknown[]) => registrar(...a) }));

import { Metodo } from "@/components/pagina/Metodo";
import { Material } from "@/components/pagina/Material";
import { Siguenos } from "@/components/pagina/Siguenos";
import { Pie } from "@/components/pagina/Pie";
import { METODO, MATERIAL, TIKTOK } from "@/components/pagina/contenido";

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

  it("una tarjeta de material \"pronto\" dice Pronto y pide el correo con origen material", () => {
    expect(MATERIAL[0]).toMatchObject({ titulo: "Mazos de Anki por bloque de videos", estado: "pronto" });
    const fetch = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetch);
    render(<Material />);
    const tarjeta = screen.getByRole("article", { name: "Mazos de Anki por bloque de videos" });
    expect(within(tarjeta).getByText("Pronto")).toBeTruthy();
    const campo = within(tarjeta).getByLabelText(/tu correo/i);
    fireEvent.change(campo, { target: { value: "a@b.cl" } });
    fireEvent.submit(campo.closest("form")!);
    const body = JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.origen).toBe("material");
    vi.unstubAllGlobals();
  });

  it("síguenos lleva al perfil en otra pestaña y registra clic_tiktok", () => {
    render(<Siguenos />);
    expect(screen.getByRole("heading", { level: 2 })).toBeTruthy();
    const enlace = screen.getByRole("link", { name: /chino comprensible/i });
    expect(enlace.getAttribute("href")).toBe(TIKTOK.url);
    expect(enlace.getAttribute("target")).toBe("_blank");
    expect(enlace.getAttribute("rel")).toContain("noopener");
    fireEvent.click(enlace);
    expect(registrar).toHaveBeenCalledWith("clic_tiktok", expect.anything());
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
        <Material />
        <Siguenos />
        <Pie />
      </>,
    );
    const texto = (container.textContent ?? "").toLowerCase();
    expect(texto).not.toContain("entiendes");
    expect(texto).not.toContain("aprende chino en tiktok");
    expect(texto).not.toMatch(/síguenos|siguenos/);
  });
});
