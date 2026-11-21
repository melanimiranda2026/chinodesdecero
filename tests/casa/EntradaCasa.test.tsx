import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { CAMINATA_MS, ENTRADA_MS, EntradaCasa, FUNDIDO_ENTRADA_MS, ZOOM_ENTRADA_MS } from "@/components/casa/EntradaCasa";
import { ARTE_BOTON_PLAY } from "@/components/casa/arte/registro";
import { CENTRO_LIVING_EN_CASA, enCasa } from "@/components/casa/casaEntera";

const avanzar = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

function simularMovimiento(reducido: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: reducido && q.includes("prefers-reduced-motion"),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Un toque de verdad: pointerdown y después click, en el mismo elemento. */
function tocar(el: Element) {
  fireEvent.pointerDown(el);
  fireEvent.click(el);
}
const play = () => screen.getByRole("button", { name: "开始" });

describe("EntradaCasa", () => {
  it("espera quieta con el botón Play: nada se mueve hasta tocarlo", async () => {
    const alTerminar = vi.fn();
    const { container } = render(<EntradaCasa alTerminar={alTerminar} />);
    expect(container.querySelector('[data-capa="casa_entera"]')).not.toBeNull();
    expect(container.querySelector("[data-vaca]")).not.toBeNull();
    const raiz = container.querySelector<HTMLElement>("[data-entrada]")!;
    expect(raiz.getAttribute("data-fase")).toBe("espera");
    const boton = play();
    expect(boton.tagName).toBe("BUTTON");
    expect(boton.getAttribute("title")).toBe("kāi shǐ");
    expect(boton.querySelector("img")!.getAttribute("src")).toBe(ARTE_BOTON_PLAY);
    await avanzar(ENTRADA_MS * 5);
    expect(raiz.getAttribute("data-fase")).toBe("espera");
    expect(alTerminar).not.toHaveBeenCalled();
  });

  it("Play: la vaca camina a la puerta, zoom al living y luego alTerminar una sola vez", async () => {
    const alTerminar = vi.fn();
    const alEmpezar = vi.fn();
    const { container } = render(<EntradaCasa alTerminar={alTerminar} alEmpezar={alEmpezar} />);
    const raiz = container.querySelector<HTMLElement>("[data-entrada]")!;
    tocar(play());
    expect(alEmpezar).toHaveBeenCalledTimes(1);
    expect(raiz.getAttribute("data-fase")).toBe("camina");
    expect(screen.queryByRole("button", { name: "开始" })).toBeNull();
    await avanzar(CAMINATA_MS);
    expect(raiz.getAttribute("data-fase")).toBe("zoom");
    expect(alTerminar).not.toHaveBeenCalled();
    await avanzar(ZOOM_ENTRADA_MS);
    expect(alTerminar).toHaveBeenCalledTimes(1);
    await avanzar(5000);
    expect(alTerminar).toHaveBeenCalledTimes(1);
    expect(alEmpezar).toHaveBeenCalledTimes(1);
  });

  it("con teclado (Enter/Espacio = click sin pointerdown) Play también empieza", async () => {
    const alEmpezar = vi.fn();
    const { container } = render(<EntradaCasa alTerminar={vi.fn()} alEmpezar={alEmpezar} />);
    fireEvent.click(play());
    expect(alEmpezar).toHaveBeenCalledTimes(1);
    expect(container.querySelector("[data-entrada]")!.getAttribute("data-fase")).toBe("camina");
  });

  it("mientras espera, un toque en cualquier parte de la casa también es Play", () => {
    const alEmpezar = vi.fn();
    const { container } = render(<EntradaCasa alTerminar={vi.fn()} alEmpezar={alEmpezar} />);
    tocar(container.querySelector('[data-capa="casa_entera"]')!);
    expect(alEmpezar).toHaveBeenCalledTimes(1);
    expect(container.querySelector("[data-entrada]")!.getAttribute("data-fase")).toBe("camina");
  });

  it("empezada desde afuera (ControlCasa.entrar) arranca sin tocar Play", async () => {
    const alTerminar = vi.fn();
    const { container, rerender } = render(<EntradaCasa alTerminar={alTerminar} />);
    rerender(<EntradaCasa alTerminar={alTerminar} empezada />);
    expect(container.querySelector("[data-entrada]")!.getAttribute("data-fase")).toBe("camina");
    await avanzar(ENTRADA_MS);
    expect(alTerminar).toHaveBeenCalledTimes(1);
  });

  it("el toque que empieza no la salta; uno durante la caminata sí, y alTerminar una sola vez", async () => {
    const alTerminar = vi.fn();
    const { container } = render(<EntradaCasa alTerminar={alTerminar} />);
    tocar(play());
    expect(alTerminar).not.toHaveBeenCalled();
    await avanzar(100);
    const raiz = container.querySelector("[data-entrada]")!;
    tocar(raiz);
    expect(alTerminar).toHaveBeenCalledTimes(1);
    tocar(raiz);
    await avanzar(CAMINATA_MS + ZOOM_ENTRADA_MS + 1000);
    expect(alTerminar).toHaveBeenCalledTimes(1);
  });

  it("con movimiento reducido: también espera Play; después sin caminata ni zoom, un fundido de ≤ 300 ms", async () => {
    simularMovimiento(true);
    const alTerminar = vi.fn();
    const { container } = render(<EntradaCasa alTerminar={alTerminar} />);
    expect(FUNDIDO_ENTRADA_MS).toBeLessThanOrEqual(300);
    const raiz = container.querySelector("[data-entrada]")!;
    expect(raiz.getAttribute("data-fase")).toBe("espera");
    await avanzar(1000);
    expect(alTerminar).not.toHaveBeenCalled();
    tocar(play());
    expect(raiz.getAttribute("data-fase")).toBe("fundido");
    await avanzar(FUNDIDO_ENTRADA_MS);
    expect(alTerminar).toHaveBeenCalledTimes(1);
  });

  it("el zoom final encuadra el living de la casa entera (mismo módulo que el arte)", () => {
    // el centro del dibujo del living (500, 500 de su cuadro) a zoom 1/escala
    expect(CENTRO_LIVING_EN_CASA).toEqual({ ...enCasa("living", 500, 500), s: 2 });
    for (const c of [CENTRO_LIVING_EN_CASA.x, CENTRO_LIVING_EN_CASA.y]) {
      expect(c).toBeGreaterThan(0);
      expect(c).toBeLessThan(1000);
    }
  });
});
