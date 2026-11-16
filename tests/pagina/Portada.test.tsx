import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("@/components/casa/audio/voz", () => ({
  decir: vi.fn(() => Promise.resolve(true)),
  callar: vi.fn(),
  desbloquearAudio: vi.fn(),
}));
vi.mock("@/components/casa/audio/sonido", () => ({
  sfx: vi.fn(),
  musica: { tocar: vi.fn(), parar: vi.fn(), bajar: vi.fn() },
}));
const registrar = vi.fn();
vi.mock("@/components/casa/eventos", () => ({ registrar: (...a: unknown[]) => registrar(...a) }));

import { decir, desbloquearAudio, callar } from "@/components/casa/audio/voz";
import { CLAVE_JUEGO, EVENTO_JUEGO } from "@/components/pagina/juego";
import { musica } from "@/components/casa/audio/sonido";
import { NI_HAO } from "@/components/casa/cocina/frases";
import { Portada } from "@/components/pagina/Portada";
import { PORTADA } from "@/components/pagina/contenido";

const avanzar = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

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
  it("copia del hero: H1, subtítulo con 浸, CTAs y línea de confianza", () => {
    render(<Portada />);
    expect(screen.getByRole("heading", { level: 1, name: "Tus primeras palabras en chino, jugando" })).toBeTruthy();
    expect(PORTADA.h1).toBe("Tus primeras palabras en chino, jugando");
    expect(screen.getByTestId("subtitulo").textContent).toBe(
      "Toca, arrastra y escucha a la vaca en su cocina. Sin traducir nada: así funciona el Método Jìn 浸.",
    );
    expect(screen.getByText("Gratis · sin registrarte · funciona en tu celular")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Cómo funciona" }).getAttribute("href")).toBe("#metodo");
    expect(screen.getByRole("button", { name: /Jugar ahora/ })).toBeTruthy();
    // venta honesta
    const texto = document.body.textContent ?? "";
    expect(texto).not.toMatch(/entiendes|aprende chino en tiktok/i);
  });

  it("“Jugar ahora” arranca el juego dentro del clic: audio, música, saludo y sin tarjeta de entrada", async () => {
    const { container } = render(<Portada />);
    const ventana = container.querySelector<HTMLElement>("[data-ventana]")!;
    expect(ventana.querySelector('[data-capa="entrada"]')).toBeNull();
    const scroll = vi.fn();
    ventana.scrollIntoView = scroll;

    fireEvent.click(screen.getByRole("button", { name: /Jugar ahora/ }));
    // síncrono, dentro del gesto (iOS)
    expect(desbloquearAudio).toHaveBeenCalledTimes(1);
    expect(musica.tocar).toHaveBeenCalledWith("cocina");
    expect(registrar).toHaveBeenCalledWith("entrar");
    expect(scroll).toHaveBeenCalled();
    expect(within(ventana).queryByRole("dialog")).toBeNull();

    await avanzar(500);
    expect(vi.mocked(decir).mock.calls[0][0]).toEqual(NI_HAO);

    // un segundo clic no vuelve a saludar
    fireEvent.click(screen.getByRole("button", { name: /Jugar ahora/ }));
    await avanzar(500);
    expect(desbloquearAudio).toHaveBeenCalledTimes(1);
    expect(vi.mocked(decir).mock.calls.filter((c) => c[0] === NI_HAO)).toHaveLength(1);
  });

  it("el primer toque dentro de la ventana del juego arranca, sin tarjeta de entrada", async () => {
    const { container } = render(<Portada />);
    const ventana = container.querySelector<HTMLElement>("[data-ventana]")!;
    expect(within(ventana).queryByRole("dialog")).toBeNull();
    expect(within(ventana).queryByRole("button", { name: "Jugar" })).toBeNull();
    fireEvent.pointerDown(ventana.querySelector("[data-casa]")!);
    expect(desbloquearAudio).toHaveBeenCalledTimes(1);
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
    expect(copia.textContent).toContain("厨房");
    expect(copia.textContent ?? "").not.toMatch(/[a-záéíóúñ]{2,}/i);
    for (const el of barra.querySelectorAll("[aria-label]")) expect(el.getAttribute("aria-label")).not.toMatch(/[a-z]{2,}/i);
  });
});

describe("Portada: pestañas", () => {
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("hay un tablist con dos pestañas y 厨房 seleccionada", () => {
    render(<Portada />);
    const lista = screen.getByRole("tablist");
    const tabs = within(lista).getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    expect(within(lista).getByRole("tab", { name: /厨房/ }).getAttribute("aria-selected")).toBe("true");
    expect(within(lista).getByRole("tab", { name: /拼图/ }).getAttribute("aria-selected")).toBe("false");
    expect(document.getElementById("juegos")).toBeTruthy();
  });

  it("clic en 拼图 muestra el puzzle, deja la casa oculta y calla la voz", () => {
    const { container } = render(<Portada />);
    expect(container.querySelector('[data-juego="puzzle"]')).toBeNull();
    vi.mocked(callar).mockClear();
    fireEvent.click(screen.getByRole("tab", { name: /拼图/ }));
    expect(callar).toHaveBeenCalled();
    expect(screen.getByRole("tab", { name: /拼图/ }).getAttribute("aria-selected")).toBe("true");
    expect(container.querySelector<HTMLElement>('[data-juego="cocina"]')!.hidden).toBe(true);
    const panel = container.querySelector<HTMLElement>('[data-juego="puzzle"]')!;
    expect(panel.hidden).toBe(false);
    expect(panel.querySelector('[aria-label="Piezas"]')).toBeTruthy();
    // volver: el puzzle sigue montado pero oculto
    fireEvent.click(screen.getByRole("tab", { name: /厨房/ }));
    expect(container.querySelector<HTMLElement>('[data-juego="cocina"]')!.hidden).toBe(false);
    expect(container.querySelector<HTMLElement>('[data-juego="puzzle"]')!.hidden).toBe(true);
  });

  it("elegir una pestaña la recuerda en localStorage y en la URL", () => {
    render(<Portada />);
    fireEvent.click(screen.getByRole("tab", { name: /拼图/ }));
    expect(localStorage.getItem(CLAVE_JUEGO)).toBe("puzzle");
    expect(window.location.search).toContain("juego=puzzle");
    localStorage.removeItem(CLAVE_JUEGO);
  });

  it("“Jugar ahora” con el puzzle activo vuelve a la cocina", () => {
    const { container } = render(<Portada />);
    fireEvent.click(screen.getByRole("tab", { name: /拼图/ }));
    fireEvent.click(screen.getByRole("button", { name: /Jugar ahora/ }));
    expect(screen.getByRole("tab", { name: /厨房/ }).getAttribute("aria-selected")).toBe("true");
    expect(container.querySelector<HTMLElement>('[data-juego="cocina"]')!.hidden).toBe(false);
    localStorage.removeItem(CLAVE_JUEGO);
  });

  it("con ?juego=puzzle arranca en el puzzle", () => {
    window.history.replaceState(null, "", "/?juego=puzzle");
    const { container } = render(<Portada />);
    expect(screen.getByRole("tab", { name: /拼图/ }).getAttribute("aria-selected")).toBe("true");
    expect(container.querySelector<HTMLElement>('[data-juego="cocina"]')!.hidden).toBe(true);
  });

  it("un CustomEvent EVENTO_JUEGO cambia la pestaña", () => {
    render(<Portada />);
    act(() => {
      window.dispatchEvent(new CustomEvent(EVENTO_JUEGO, { detail: "puzzle" }));
    });
    expect(screen.getByRole("tab", { name: /拼图/ }).getAttribute("aria-selected")).toBe("true");
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

  it("ya no está la flecha ↓ Bajar", () => {
    expect(css("components/pagina/pagina.module.css")).not.toMatch(/\.baja\b/);
    expect(css("app/page.tsx")).not.toMatch(/Bajar/);
  });
});
