import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("@/components/casa/audio/voz", () => ({
  decir: vi.fn(() => Promise.resolve(true)),
  callar: vi.fn(),
  desbloquearAudio: vi.fn(),
  enfocarJuego: vi.fn(),
}));
vi.mock("@/components/casa/audio/sonido", () => ({
  sfx: vi.fn(),
  musica: { tocar: vi.fn(), parar: vi.fn(), bajar: vi.fn() },
}));
const registrar = vi.fn();
vi.mock("@/components/casa/eventos", () => ({ registrar: (...a: unknown[]) => registrar(...a) }));

import { callar, decir, desbloquearAudio, enfocarJuego } from "@/components/casa/audio/voz";
import { musica } from "@/components/casa/audio/sonido";
import { Portada } from "@/components/pagina/Portada";
import { PORTADA } from "@/components/pagina/contenido";
import { guardarEnCocina, pasarEntrada } from "../casa/entrar";

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(decir).mockClear();
  vi.mocked(desbloquearAudio).mockClear();
  vi.mocked(musica.tocar).mockClear();
  registrar.mockClear();
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.style.overflow = "";
});

describe("Portada: hero", () => {
  it("copia del hero: H1, subtítulo y línea de confianza, sin botones extra", () => {
    render(<Portada />);
    expect(screen.getByRole("heading", { level: 1, name: "Tus primeras palabras en chino, jugando" })).toBeTruthy();
    expect(PORTADA.h1).toBe("Tus primeras palabras en chino, jugando");
    expect(screen.getByTestId("subtitulo").textContent).toBe("Toca, arrastra, escucha y explora con la vaca.");
    expect(screen.getByText("Gratis · funciona en tu celular")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Cómo funciona" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Jugar ahora/ })).toBeNull();
    // venta honesta
    const texto = document.body.textContent ?? "";
    expect(texto).not.toMatch(/entiendes|aprende chino en tiktok/i);
  });

  it("el primer toque dentro de la ventana del juego arranca, sin tarjeta de entrada", async () => {
    // con correo y el living completo: tras la casa entera se ve la cocina (con su 玩)
    guardarEnCocina();
    const { container } = render(<Portada />);
    const ventana = container.querySelector<HTMLElement>("[data-ventana]")!;
    expect(within(ventana).queryByRole("dialog")).toBeNull();
    expect(within(ventana).queryByRole("button", { name: "Jugar" })).toBeNull();
    fireEvent.pointerDown(ventana.querySelector("[data-casa]")!);
    expect(desbloquearAudio).toHaveBeenCalledTimes(1);
    await pasarEntrada();
    localStorage.clear();
    // el minimapa y el 玩 también están dentro
    expect(within(ventana).getByRole("button", { name: "玩" })).toBeTruthy();
    fireEvent.click(within(ventana).getByRole("button", { name: "卧室 🔒" }));
    expect(within(ventana).getByRole("dialog")).toBeTruthy();
  });

  it("la barra de la ventana no tiene español", () => {
    const { container } = render(<Portada />);
    const barra = container.querySelector<HTMLElement>("[data-barra]")!;
    const copia = barra.cloneNode(true) as HTMLElement;
    copia.querySelectorAll("[data-pinyin]").forEach((n) => n.remove());
    expect(copia.textContent ?? "").not.toMatch(/[a-záéíóúñ]{2,}/i);
    for (const el of barra.querySelectorAll("[aria-label]")) expect(el.getAttribute("aria-label")).not.toMatch(/[a-z]{2,}/i);
  });
  it("la barra trae el botón 🔊 para silenciar a la vaca, junto al 全屏", () => {
    const { container } = render(<Portada />);
    const barra = container.querySelector<HTMLElement>("[data-barra]")!;
    const mudo = within(barra).getByRole("button", { name: "静音" });
    expect(mudo.getAttribute("aria-pressed")).toBe("false");
    expect(within(barra).getByRole("button", { name: "全屏" })).toBeTruthy();
  });
});

describe("Portada: la portada es la casa", () => {
  it("no hay pestañas ni botón del puzzle, y no se monta el puzzle", () => {
    const { container } = render(<Portada />);
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("button", { name: /拼图/ })).toBeNull();
    expect(container.querySelector('[data-juego="puzzle"]')).toBeNull();
    expect(container.querySelector("[data-casa]")).toBeTruthy();
  });

  it("la marca va antes del juego y el h1 después", () => {
    const { container } = render(<Portada />);
    const marca = screen.getByText(PORTADA.marca);
    const ventana = container.querySelector("[data-ventana]")!;
    const h1 = screen.getByRole("heading", { level: 1 });
    const antes = Node.DOCUMENT_POSITION_PRECEDING;
    expect(ventana.compareDocumentPosition(marca) & antes).toBeTruthy();
    expect(ventana.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("la confianza ya no dice 'sin registrarte' y nada visible dice 'chino desde cero'", () => {
    render(<Portada />);
    expect(PORTADA.confianza).toBe("Gratis · funciona en tu celular");
    expect(PORTADA.confianza).not.toMatch(/sin registrarte/i);
    expect(document.body.textContent ?? "").not.toMatch(/chino desde cero|chino comprensible/i);
  });

  it("pestaña del navegador oculta: la casa deja de estar activa y la voz se corta; al volver sigue jugable", async () => {
    let estado: DocumentVisibilityState = "visible";
    const desc = Object.getOwnPropertyDescriptor(Document.prototype, "visibilityState");
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => estado });
    try {
      render(<Portada />);
      await pasarEntrada();
      fireEvent.click(screen.getByRole("button", { name: "沙发" }));
      vi.mocked(callar).mockClear();
      estado = "hidden";
      act(() => { document.dispatchEvent(new Event("visibilitychange")); });
      expect(callar).toHaveBeenCalled();
      estado = "visible";
      act(() => { document.dispatchEvent(new Event("visibilitychange")); });
      vi.mocked(decir).mockClear();
      fireEvent.click(screen.getByRole("button", { name: "椅子" }));
      await act(async () => { await vi.advanceTimersByTimeAsync(400); });
      expect(decir).toHaveBeenCalled();
    } finally {
      delete (document as { visibilityState?: unknown }).visibilityState;
      if (desc) Object.defineProperty(Document.prototype, "visibilityState", desc);
    }
  });

  it("la casa es el juego enfocado: enfocarJuego('cocina') al montar y null al desmontar", () => {
    vi.mocked(enfocarJuego).mockClear();
    const { unmount } = render(<Portada />);
    expect(enfocarJuego).toHaveBeenLastCalledWith("cocina");
    unmount();
    expect(enfocarJuego).toHaveBeenLastCalledWith(null);
  });
});

describe("Portada: 全屏", () => {
  it("expande la ventana a toda la pantalla, bloquea el scroll y vuelve", () => {
    const { container } = render(<Portada />);
    const ventana = container.querySelector<HTMLElement>("[data-ventana]")!;
    const boton = screen.getByRole("button", { name: "全屏" });
    expect(boton.querySelector("[data-pinyin]")?.textContent).toBe("quán píng");
    expect(ventana.hasAttribute("data-grande")).toBe(false);

    fireEvent.click(boton);
    expect(ventana.hasAttribute("data-grande")).toBe(true);
    expect(ventana.className).toMatch(/grande/);
    expect(boton.getAttribute("aria-pressed")).toBe("true");
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.click(boton);
    expect(ventana.hasAttribute("data-grande")).toBe(false);
    expect(ventana.className).not.toMatch(/grande/);
    expect(boton.getAttribute("aria-pressed")).toBe("false");
    expect(document.body.style.overflow).toBe("");
  });
});

describe("Portada: CSS del marco", () => {
  const css = (f: string) => readFileSync(join(process.cwd(), f), "utf8");
  const regla = (texto: string, sel: string) => texto.match(new RegExp(`(^|\\n)${sel.replace(".", "\\.")}\\s*\\{([^}]*)\\}`))?.[2] ?? "";

  it("las tarjetas van absolutas dentro del marco, no fijas a la pantalla", () => {
    const casa = css("components/casa/Casa.module.css");
    expect(regla(casa, ".capa")).toMatch(/position:\s*absolute/);
    expect(casa).not.toMatch(/position:\s*fixed/);
    // la casa toma el tamaño del contenedor (no de la pantalla) y mide por contenedor
    expect(regla(casa, ".casa")).toMatch(/container-type:\s*size/);
    expect(regla(casa, ".casa")).not.toMatch(/100svh|100vh/);
    expect(casa).not.toMatch(/@media \(orientation/);
  });

  it("los saltos a #juegos, #metodo y las secciones quedan debajo del menú fijo", () => {
    expect(regla(css("app/globals.css"), "html")).toMatch(/scroll-padding-top:\s*var\(--alto-menu\)/);
  });

  it("ya no está la flecha ↓ Bajar", () => {
    expect(css("components/pagina/pagina.module.css")).not.toMatch(/\.baja\b/);
    expect(css("app/page.tsx")).not.toMatch(/Bajar/);
  });
});

describe("Portada: CSS de escritorio", () => {
  const css = readFileSync(join(process.cwd(), "components/pagina/portada.module.css"), "utf8");
  it("la ventana se centra y usa casi todo el alto, sin pestañas", () => {
    expect(css).toMatch(/min\(92vw, 82svh\)|min\(92vw, 82vh\)/);
    expect(css).not.toMatch(/\.pestana/);
  });

  it("sin restos del puzzle en la portada (el puzzle vive solo en /puzzle)", () => {
    expect(css).not.toMatch(/\.panelPuzzle/);
  });
});
