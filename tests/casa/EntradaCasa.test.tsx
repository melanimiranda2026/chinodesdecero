import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { CAMINATA_MS, EntradaCasa, FUNDIDO_ENTRADA_MS, ZOOM_ENTRADA_MS } from "@/components/casa/EntradaCasa";
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

describe("EntradaCasa", () => {
  it("la casa entera, la vaca camina a la puerta, zoom al living y luego alTerminar una sola vez", async () => {
    const alTerminar = vi.fn();
    const { container } = render(<EntradaCasa alTerminar={alTerminar} />);
    expect(container.querySelector('[data-capa="casa_entera"]')).not.toBeNull();
    expect(container.querySelector("[data-vaca]")).not.toBeNull();
    const raiz = container.querySelector<HTMLElement>("[data-entrada]")!;
    expect(raiz.getAttribute("data-fase")).toBe("camina");
    await avanzar(CAMINATA_MS);
    expect(raiz.getAttribute("data-fase")).toBe("zoom");
    expect(alTerminar).not.toHaveBeenCalled();
    await avanzar(ZOOM_ENTRADA_MS);
    expect(alTerminar).toHaveBeenCalledTimes(1);
    await avanzar(5000);
    expect(alTerminar).toHaveBeenCalledTimes(1);
  });

  it("un toque la salta y llama alTerminar una sola vez", async () => {
    const alTerminar = vi.fn();
    render(<EntradaCasa alTerminar={alTerminar} />);
    await avanzar(100);
    const boton = screen.getByRole("button", { name: "家" });
    fireEvent.click(boton);
    expect(alTerminar).toHaveBeenCalledTimes(1);
    fireEvent.click(boton);
    await avanzar(CAMINATA_MS + ZOOM_ENTRADA_MS + 1000);
    expect(alTerminar).toHaveBeenCalledTimes(1);
  });

  it("con movimiento reducido: sin caminata ni zoom, un fundido de ≤ 300 ms", async () => {
    simularMovimiento(true);
    const alTerminar = vi.fn();
    const { container } = render(<EntradaCasa alTerminar={alTerminar} />);
    expect(FUNDIDO_ENTRADA_MS).toBeLessThanOrEqual(300);
    expect(container.querySelector("[data-entrada]")!.getAttribute("data-fase")).toBe("fundido");
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
