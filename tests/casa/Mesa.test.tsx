import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("@/components/casa/audio/voz", () => ({
  decir: vi.fn(() => Promise.resolve(true)),
  callar: vi.fn(),
  desbloquearAudio: vi.fn(),
}));

import { callar, decir } from "@/components/casa/audio/voz";
import { Mesa } from "@/components/casa/living/Mesa";
import { PALABRAS, srcPalabra, type Palabra } from "@/components/casa/living/palabras";
import { textoHanzi } from "@/lib/silabas";

const decirMock = vi.mocked(decir);
const de = (hz: string): Palabra => PALABRAS.find((p) => textoHanzi(p.s) === hz)!;
const fichas = () => screen.getByTestId("mesa").querySelectorAll<HTMLButtonElement>("[data-palabra]");
const tile = (hz: string) => screen.getByTestId("mesa").querySelector<HTMLButtonElement>(`[data-palabra="${de(hz).id}"]`)!;
const esperar = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

function montar(abiertas: readonly string[] = []) {
  const alAbrir = vi.fn();
  const alCerrar = vi.fn();
  const r = render(<Mesa abiertas={abiertas} alAbrir={alAbrir} alCerrar={alCerrar} />);
  return { ...r, alAbrir, alCerrar };
}

beforeEach(() => {
  decirMock.mockReset();
  decirMock.mockImplementation(() => Promise.resolve(true));
  vi.mocked(callar).mockClear();
});

describe("Mesa vista desde arriba", () => {
  it("muestra las 50 palabras, cada una con hanzi y pinyin; el nombre es el hanzi", () => {
    montar();
    const lista = [...fichas()];
    expect(lista).toHaveLength(50);
    lista.forEach((b, i) => {
      const p = PALABRAS[i];
      const hz = textoHanzi(p.s);
      expect(b.tagName).toBe("BUTTON");
      expect(b.getAttribute("aria-label")).toBe(hz);
      expect(b.textContent).toContain(hz);
      expect(b.textContent).toContain(p.s.map(([, py]) => py).join(""));
    });
  });

  it("las abiertas llevan data-abierta y el contador sube", () => {
    montar([de("水").id, de("西红柿").id]);
    expect(tile("水").dataset.abierta).toBe("true");
    expect(tile("西红柿").dataset.abierta).toBe("true");
    expect(tile("米").dataset.abierta).toBeUndefined();
    expect(screen.getByTestId("mesa").textContent).toContain("⭐ 2/50");
  });

  it("tocar 西红柿 abre su ficha, avisa y dice la toma lenta y luego la natural", async () => {
    const { alAbrir } = montar();
    fireEvent.click(tile("西红柿"));
    expect(screen.getByRole("dialog", { name: "西红柿" })).toBeTruthy();
    expect(alAbrir).toHaveBeenCalledWith("xi1_hong2_shi4");
    await esperar();
    const pal = de("西红柿");
    expect(decirMock.mock.calls.map((c) => c[1]?.src)).toEqual([srcPalabra(pal, true), srcPalabra(pal)]);
    for (const c of decirMock.mock.calls) expect(c[1]?.juego).toBe("cocina");
  });

  it("una palabra sin toma lenta se dice una sola vez", async () => {
    const agua = de("水");
    expect(agua.lento).toBe(false);
    montar();
    fireEvent.click(tile("水"));
    await esperar();
    expect(decirMock).toHaveBeenCalledTimes(1);
    expect(decirMock.mock.calls[0][1]?.src).toBe(srcPalabra(agua));
  });

  it("tocar otra mientras suena: calla, queda una sola ficha (la nueva) y la secuencia vieja no sigue", async () => {
    let terminar!: (v: boolean) => void;
    decirMock.mockImplementationOnce(() => new Promise<boolean>((r) => { terminar = r; }));
    montar();
    fireEvent.click(tile("西红柿"));
    expect(decirMock).toHaveBeenCalledTimes(1);
    // la ficha tapa la mesa: se toca otra desde la mesa igual (p. ej. por teclado)
    fireEvent.click(tile("水"));
    expect(callar).toHaveBeenCalled();
    const dialogos = screen.getAllByRole("dialog");
    expect(dialogos).toHaveLength(1);
    expect(dialogos[0].getAttribute("aria-label")).toBe("水");
    await act(async () => { terminar(false); await Promise.resolve(); await Promise.resolve(); });
    // 西红柿 natural nunca suena después de 水
    expect(decirMock.mock.calls.map((c) => c[1]?.src)).toEqual([srcPalabra(de("西红柿"), true), srcPalabra(de("水"))]);
  });

  it("si la voz no suena (mudo), la ficha se abre igual", async () => {
    decirMock.mockImplementation(() => Promise.resolve(false));
    montar();
    fireEvent.click(tile("猫"));
    await esperar();
    expect(screen.getByRole("dialog", { name: "猫" })).toBeTruthy();
  });

  it("🔊 en la ficha la repite", async () => {
    montar();
    fireEvent.click(tile("水"));
    await esperar();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Escuchar otra vez" }));
    await esperar();
    expect(decirMock).toHaveBeenCalledTimes(2);
  });

  it("la línea de tono se vuelve a dibujar en cada toma: la lenta, la natural y cada 🔊", async () => {
    const fines: ((v: boolean) => void)[] = [];
    decirMock.mockImplementation(() => new Promise<boolean>((r) => { fines.push(r); }));
    montar();
    const linea = () => screen.getByRole("dialog").querySelector("[data-linea-tono]")!;
    fireEvent.click(tile("西红柿"));
    const lenta = linea();
    expect(lenta.getAttribute("data-activa")).toBe("true");
    await act(async () => { fines.shift()!(true); await Promise.resolve(); await Promise.resolve(); });
    expect(decirMock).toHaveBeenCalledTimes(2);
    const natural = linea();
    expect(natural.getAttribute("data-activa")).toBe("true");
    expect(natural).not.toBe(lenta);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Escuchar otra vez" }));
    expect(linea()).not.toBe(natural);
    expect(linea().getAttribute("data-activa")).toBe("true");
  });

  it("al cerrar la ficha el foco vuelve a la palabra que la abrió", () => {
    montar();
    const t = tile("西红柿");
    t.focus();
    fireEvent.click(t);
    expect(document.activeElement).toBe(screen.getByRole("dialog"));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cerrar" }));
    expect(document.activeElement).toBe(t);
    // también con Escape
    fireEvent.click(tile("水"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.activeElement).toBe(tile("水"));
  });

  it("返回 vuelve al living; con una ficha abierta, ✕ cierra solo la ficha", () => {
    const { alCerrar } = montar();
    fireEvent.click(tile("水"));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(alCerrar).not.toHaveBeenCalled();
    expect(screen.getByTestId("mesa")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "返回" }));
    expect(alCerrar).toHaveBeenCalledTimes(1);
  });

  it("Escape con una ficha abierta cierra solo la ficha", () => {
    const { alCerrar } = montar();
    fireEvent.click(tile("水"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(alCerrar).not.toHaveBeenCalled();
  });

  it("la posición de cada ficha es fija por índice (sin Math.random) y el CSS respeta reduced-motion", () => {
    const azar = vi.spyOn(Math, "random");
    const { unmount } = montar();
    const antes = [...fichas()].map((b) => b.getAttribute("style"));
    unmount();
    montar();
    expect([...fichas()].map((b) => b.getAttribute("style"))).toEqual(antes);
    expect(azar).not.toHaveBeenCalled();
    azar.mockRestore();
    const css = readFileSync(join(process.cwd(), "components/casa/living/Living.module.css"), "utf8");
    expect(css).toMatch(/\.mesa[\s\S]*prefers-reduced-motion[\s\S]*\.teja/);
  });
});
