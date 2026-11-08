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

import { decir, desbloquearAudio } from "@/components/casa/audio/voz";
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
    expect(ventana.querySelector('[data-capa="entrada"]')).toBeTruthy();
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

  it("la tarjeta de entrada vive dentro de la ventana del juego y su botón también arranca", async () => {
    const { container } = render(<Portada />);
    const ventana = container.querySelector<HTMLElement>("[data-ventana]")!;
    const tarjeta = within(ventana).getByRole("dialog");
    fireEvent.click(within(tarjeta).getByRole("button", { name: "Jugar" }));
    expect(desbloquearAudio).toHaveBeenCalledTimes(1);
    expect(within(ventana).queryByRole("dialog")).toBeNull();
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
