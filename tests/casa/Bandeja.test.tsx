import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { Bandeja } from "@/components/casa/motor/Bandeja";
import { FichaGanada } from "@/components/casa/motor/FichaGanada";
import { fichaId } from "@/components/casa/motor/progreso";
import { S } from "@/lib/silabas";
import { COLOR_TONO } from "@/lib/tonos";

const PALABRAS = [S("门", "mén", "2"), S("桌子", "zhuō zi", "15"), S("灯", "dēng", "1"), S("窗", "chuāng", "1"), S("开", "kāi", "1"), S("关", "guān", "1")];
const todas = PALABRAS.map((silabas) => ({ id: fichaId(silabas), silabas }));

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

describe("Bandeja", () => {
  it("2 ganadas de 6: 2 hanzi y 4 siluetas", () => {
    render(<Bandeja fichas={[todas[0].id, todas[2].id]} todas={todas} />);
    expect(document.querySelectorAll("[data-hanzi]").length).toBe(2);
    expect(document.querySelectorAll("[data-silueta]").length).toBe(4);
    expect(screen.getByText("门")).toBeTruthy();
    expect(screen.queryByText("窗")).toBeNull();
  });

  it("el hanzi lleva el color de su tono", () => {
    render(<Bandeja fichas={[todas[0].id]} todas={todas} />);
    const hz = screen.getByText("门");
    expect(hz.style.color).toBe(hexARgb(COLOR_TONO[2]));
  });

  it("no recibe toques", () => {
    const { container } = render(<Bandeja fichas={[]} todas={todas} />);
    expect((container.firstChild as HTMLElement).getAttribute("data-bandeja")).not.toBeNull();
  });
});

function hexARgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

describe("FichaGanada", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("llama alTerminar una sola vez tras ~1,6 s", () => {
    simularMovimiento(false);
    const alTerminar = vi.fn();
    render(<FichaGanada silabas={PALABRAS[0]} alTerminar={alTerminar} />);
    expect(alTerminar).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(5000));
    expect(alTerminar).toHaveBeenCalledTimes(1);
  });

  it("gira sin movimiento reducido", () => {
    simularMovimiento(false);
    render(<FichaGanada silabas={PALABRAS[0]} alTerminar={() => {}} />);
    expect(document.querySelector("[data-gira]")).not.toBeNull();
  });

  it("con movimiento reducido no gira, pero igual termina", () => {
    simularMovimiento(true);
    const alTerminar = vi.fn();
    render(<FichaGanada silabas={PALABRAS[0]} alTerminar={alTerminar} />);
    expect(document.querySelector("[data-gira]")).toBeNull();
    act(() => void vi.advanceTimersByTime(5000));
    expect(alTerminar).toHaveBeenCalledTimes(1);
  });
});
