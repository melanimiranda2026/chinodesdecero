import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

let ruta = "/";
vi.mock("next/navigation", () => ({ usePathname: () => ruta }));
const elegirJuego = vi.fn();
vi.mock("@/components/pagina/juego", () => ({ elegirJuego: (j: string) => elegirJuego(j) }));

import { Menu } from "@/components/pagina/Menu";

describe("menú", () => {
  afterEach(() => {
    cleanup();
    elegirJuego.mockClear();
    ruta = "/";
  });

  it("tiene los enlaces con sus href", () => {
    render(<Menu />);
    const nav = screen.getByRole("navigation", { name: "Principal" });
    const hrefs = Array.from(nav.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/", "/?juego=cocina#juegos", "/?juego=puzzle#juegos", "/#metodo", "/sobre"]);
  });

  it("en / un clic en Puzzle elige el juego y no navega", () => {
    render(<Menu />);
    const a = screen.getByRole("link", { name: /Puzzle/ });
    expect(fireEvent.click(a)).toBe(false); // preventDefault
    expect(elegirJuego).toHaveBeenCalledWith("puzzle");
  });

  it("clic con ctrl deja navegar", () => {
    render(<Menu />);
    expect(fireEvent.click(screen.getByRole("link", { name: /Cocina/ }), { ctrlKey: true })).toBe(true);
    expect(elegirJuego).not.toHaveBeenCalled();
  });

  it("fuera de / no intercepta", () => {
    ruta = "/sobre";
    render(<Menu />);
    expect(fireEvent.click(screen.getByRole("link", { name: /Puzzle/ }))).toBe(true);
    expect(elegirJuego).not.toHaveBeenCalled();
  });
});
