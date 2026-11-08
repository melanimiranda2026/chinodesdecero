import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { MutableRefObject } from "react";

vi.mock("@/components/casa/audio/voz", () => ({
  decir: vi.fn(() => Promise.resolve()),
  desbloquearAudio: vi.fn(),
}));
vi.mock("@/components/casa/audio/sonido", () => ({
  sfx: vi.fn(),
  musica: { tocar: vi.fn(), parar: vi.fn(), volumen: vi.fn(), bajar: vi.fn() },
}));

import { decir } from "@/components/casa/audio/voz";
import { Casa, CasaVista } from "@/components/casa/Casa";
import { useCasa, type CasaApi } from "@/components/casa/useCasa";
import { OBJETOS } from "@/components/casa/cocina/datos";
import { acciones } from "@/components/casa/cocina/acciones";
import { ESTADO_INICIAL } from "@/components/casa/cocina/datos";
import { textoHanzi } from "@/lib/silabas";

const decirMock = vi.mocked(decir);

/** Monta la vista real y deja el hook a mano para llamar sus funciones. */
function montar() {
  const api = { current: null } as MutableRefObject<CasaApi | null>;
  function Prueba() {
    const casa = useCasa();
    api.current = casa;
    return <CasaVista casa={casa} />;
  }
  const r = render(<Prueba />);
  return { ...r, api: () => api.current! };
}

const avanzar = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

beforeEach(() => {
  vi.useFakeTimers();
  decirMock.mockReset();
  decirMock.mockImplementation(() => Promise.resolve());
});
afterEach(() => {
  vi.useRealTimers();
});

describe("Casa", () => {
  it("tocar 杯子 dice su nombre y el globo muestra 杯 y bēi", async () => {
    render(<Casa />);
    fireEvent.click(screen.getByRole("button", { name: "杯子" }));
    await avanzar(10);
    expect(decirMock).toHaveBeenCalled();
    expect(decirMock.mock.calls[0][0]).toEqual(OBJETOS.beizi.nombre);
    const globo = screen.getByTestId("globo");
    expect(within(globo).getByText("杯")).toBeTruthy();
    expect(within(globo).getByText("bēi")).toBeTruthy();
  });

  it("盘子: 吃饺子 con primer plano resuelto deja el plato sucio y solo ofrece 洗", async () => {
    const { api } = montar();
    act(() => { void api().soltarObjetoEnVaca("panzi"); });
    await avanzar(3000);
    const opciones = screen.getByTestId("opciones");
    const boton = within(opciones).getByRole("button", { name: "吃饺子" });
    expect(api().camara.s).toBe(1.9);

    fireEvent.click(boton);
    await avanzar(1000);
    expect(api().primerPlano?.objeto).toBe("panzi");
    expect(api().ocupado).toBe(true);

    act(() => api().terminarPrimerPlano("oro"));
    await avanzar(3000);
    expect(api().primerPlano).toBeNull();
    expect(api().estado.panzi).toBe("sucio");
    const siguientes = within(screen.getByTestId("opciones")).getAllByRole("button");
    expect(siguientes.map((b) => b.getAttribute("aria-label"))).toEqual(["洗"]);
    expect(api().ocupado).toBe(false);
  });

  it("si decir rechaza, elegir igual libera ocupado (Review Focus 1)", async () => {
    decirMock.mockImplementation(() => Promise.reject(new Error("sin audio")));
    const { api } = montar();
    const abrir = acciones("bingxiang", ESTADO_INICIAL)[0];
    expect(textoHanzi(abrir.verbo)).toBe("打开");
    let fin!: Promise<void>;
    act(() => { fin = api().elegir("bingxiang", abrir); });
    expect(api().ocupado).toBe(true);
    await avanzar(6000);
    await act(async () => { await fin.catch(() => {}); });
    expect(api().ocupado).toBe(false);
    expect(api().estado.bingxiang).toBe("abierto");
  });

  it("abrir las acciones con decir que rechaza también libera ocupado", async () => {
    decirMock.mockImplementation(() => Promise.reject(new Error("sin audio")));
    const { api } = montar();
    act(() => { void api().soltarObjetoEnVaca("beizi"); });
    await avanzar(3000);
    expect(api().ocupado).toBe(false);
    expect(api().opciones?.id).toBe("beizi");
  });

  it("mientras está ocupada, tocar un objeto no hace nada", async () => {
    const { api } = montar();
    act(() => { void api().soltarObjetoEnVaca("panzi"); });
    expect(api().ocupado).toBe(true);
    decirMock.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "杯子" }));
    expect(decirMock).not.toHaveBeenCalled();
    await avanzar(3000);
  });

  it("verTodo cierra las opciones y vuelve a la cámara completa", async () => {
    const { api } = montar();
    act(() => { void api().soltarObjetoEnVaca("panzi"); });
    await avanzar(3000);
    act(() => api().verTodo());
    expect(api().camara).toEqual({ x: 500, y: 500, s: 1 });
    expect(screen.queryByTestId("opciones")).toBeNull();
  });

  it("no hay español dentro de la casa (fuera del pinyin)", async () => {
    const { container, api } = montar();
    fireEvent.click(screen.getByRole("button", { name: "苹果" }));
    await avanzar(10);
    act(() => { void api().soltarObjetoEnVaca("beizi"); });
    await avanzar(3000);
    expect(screen.getByTestId("opciones")).toBeTruthy();

    const textos = [...container.querySelectorAll<HTMLElement>("[data-texto]")];
    expect(textos.length).toBeGreaterThan(0);
    const espanol = /[áéíóúñ]|\b(el|la|de|que)\b/i;
    for (const n of textos) expect(n.textContent ?? "").not.toMatch(espanol);

    // Todo el texto visible, quitando los nodos de pinyin, tampoco tiene español.
    const copia = container.cloneNode(true) as HTMLElement;
    copia.querySelectorAll("[data-pinyin]").forEach((n) => n.remove());
    expect(copia.textContent ?? "").not.toMatch(espanol);
    for (const el of copia.querySelectorAll("[aria-label]"))
      expect(el.getAttribute("aria-label") ?? "").not.toMatch(espanol);
  });
});
