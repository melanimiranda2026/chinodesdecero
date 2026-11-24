import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

let ruta = "/";
vi.mock("next/navigation", () => ({ usePathname: () => ruta }));

import { Menu } from "@/components/pagina/Menu";

describe("menú", () => {
  afterEach(() => {
    cleanup();
    ruta = "/";
  });

  it("tiene los enlaces con sus href: Casa en / y Puzzle en /puzzle", () => {
    render(<Menu />);
    const nav = screen.getByRole("navigation", { name: "Principal" });
    const hrefs = Array.from(nav.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/", "/", "/puzzle", "/videos", "/sobre#metodo", "/sobre"]);
    expect(screen.getByRole("link", { name: /Casa/ }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: /Puzzle/ }).getAttribute("href")).toBe("/puzzle");
  });

  it("los clics navegan normal (sin interceptar)", () => {
    render(<Menu />);
    expect(fireEvent.click(screen.getByRole("link", { name: /Puzzle/ }))).toBe(true);
  });
});
