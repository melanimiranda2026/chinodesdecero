import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { MutableRefObject } from "react";

vi.mock("@/components/casa/audio/voz", () => ({
  decir: vi.fn(() => Promise.resolve(true)),
  callar: vi.fn(),
  desbloquearAudio: vi.fn(),
}));
vi.mock("@/components/casa/audio/sonido", () => ({
  sfx: vi.fn(),
  musica: { tocar: vi.fn(), parar: vi.fn(), bajar: vi.fn() },
}));

import { callar } from "@/components/casa/audio/voz";
import { sfx } from "@/components/casa/audio/sonido";
import { Living, PASO_MS, ZOOM_MS } from "@/components/casa/living/Living";
import { PARADA_VACA } from "@/components/casa/living/lugares";
import { PALABRAS } from "@/components/casa/living/palabras";
import { CasaVista } from "@/components/casa/Casa";
import { useCasa, type CasaApi } from "@/components/casa/useCasa";
import { ESTADO_INICIAL } from "@/components/casa/cocina/datos";
import { acciones } from "@/components/casa/cocina/acciones";

const avanzar = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

function montar(activo = true) {
  const alAbrir = vi.fn();
  const r = render(<Living abiertas={[]} alAbrir={alAbrir} activo={activo} />);
  const rerender = (a: boolean) => r.rerender(<Living abiertas={[]} alAbrir={alAbrir} activo={a} />);
  return { ...r, alAbrir, rerender };
}
const vaca = (c: HTMLElement) => c.querySelector<HTMLElement>("[data-vaca]")!;
const mesa = (c: HTMLElement) => c.querySelector<HTMLElement>("[data-mesa]")!;
const visible = (c: HTMLElement, sel: string) => c.querySelector<HTMLElement>(sel)!.style.opacity === "1";

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(callar).mockClear();
  vi.mocked(sfx).mockClear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("Living", () => {
  it("se ve el cuarto, la vaca y la mesa con hanzi de colores decorativos", () => {
    const { container } = montar();
    expect(container.querySelector('[data-capa="cuarto_living"]')).not.toBeNull();
    expect(vaca(container)).not.toBeNull();
    const m = mesa(container);
    expect(m.getAttribute("aria-label")).toBe("桌子");
    const deco = container.querySelector<HTMLElement>("[data-hanzi-mesa]")!;
    expect(deco.getAttribute("aria-hidden")).toBe("true");
    const hz = deco.querySelectorAll("[data-hz]");
    expect(hz.length).toBeGreaterThanOrEqual(4);
    for (const h of hz) expect(h.getAttribute("fill") ?? (h as HTMLElement).style.color).toMatch(/^#/);
    expect(screen.queryByTestId("mesa")).toBeNull();
  });

  it("tocar la mesa: la vaca camina a la parada, se sorprende y tras el zoom se abre la mesa", async () => {
    const { container } = montar();
    fireEvent.click(mesa(container));
    const v = vaca(container);
    expect(parseFloat(v.style.left)).toBeCloseTo(PARADA_VACA.x / 10, 2);
    expect(parseFloat(v.style.top)).toBeCloseTo(PARADA_VACA.y / 10, 2);
    expect(visible(container, '[data-capa="orejas"]')).toBe(false);

    await avanzar(PASO_MS);
    expect(visible(container, '[data-capa="orejas"]')).toBe(true);
    expect(visible(container, '[data-ojos="sorpresa"]')).toBe(true);
    expect(screen.queryByTestId("mesa")).toBeNull();

    await avanzar(ZOOM_MS - 1);
    expect(screen.queryByTestId("mesa")).toBeNull();
    await avanzar(1);
    expect(screen.getByTestId("mesa")).toBeTruthy();
  });

  it("el zoom escala el cuarto hacia la mesa", async () => {
    const { container } = montar();
    const mundo = container.querySelector<HTMLElement>("[data-mundo]")!;
    const antes = mundo.style.transform;
    fireEvent.click(mesa(container));
    await avanzar(PASO_MS);
    expect(mundo.style.transform).not.toBe(antes);
    expect(mundo.style.transform).toMatch(/scale\((\d+(\.\d+)?)\)/);
    const s = Number(/scale\(([\d.]+)\)/.exec(mundo.style.transform)![1]);
    expect(s).toBeGreaterThan(1.5);
  });

  it("un segundo toque durante la caminata no hace nada", async () => {
    const { container } = montar();
    fireEvent.click(mesa(container));
    await avanzar(PASO_MS / 2);
    fireEvent.click(mesa(container));
    await avanzar(PASO_MS / 2 + ZOOM_MS);
    expect(screen.getByTestId("mesa")).toBeTruthy();
    // un solo paso: el segundo toque no reinicia la caminata ni suena otra vez
    expect(vi.mocked(sfx).mock.calls.filter((c) => c[0] === "pop")).toHaveLength(1);
  });

  it("cerrar la mesa vuelve al cuarto con la vaca junto a la mesa", async () => {
    const { container } = montar();
    fireEvent.click(mesa(container));
    await avanzar(PASO_MS + ZOOM_MS);
    fireEvent.click(screen.getByRole("button", { name: "返回" }));
    expect(screen.queryByTestId("mesa")).toBeNull();
    const v = vaca(container);
    expect(parseFloat(v.style.left)).toBeCloseTo(PARADA_VACA.x / 10, 2);
    expect(parseFloat(v.style.top)).toBeCloseTo(PARADA_VACA.y / 10, 2);
    expect(container.querySelector("[data-mundo]")!.getAttribute("style")).not.toMatch(/scale\(2/);
    // y se puede volver a entrar
    fireEvent.click(mesa(container));
    await avanzar(PASO_MS + ZOOM_MS);
    expect(screen.getByTestId("mesa")).toBeTruthy();
  });

  it("activo=false con la mesa abierta: se cierra y calla la voz", async () => {
    const { container, rerender } = montar();
    fireEvent.click(mesa(container));
    await avanzar(PASO_MS + ZOOM_MS);
    expect(screen.getByTestId("mesa")).toBeTruthy();
    vi.mocked(callar).mockClear();
    rerender(false);
    expect(screen.queryByTestId("mesa")).toBeNull();
    expect(callar).toHaveBeenCalled();
  });

  it("activo=false durante la caminata: no se abre la mesa después", async () => {
    const { container, rerender } = montar();
    fireEvent.click(mesa(container));
    await avanzar(PASO_MS / 2);
    rerender(false);
    await avanzar(PASO_MS + ZOOM_MS);
    expect(screen.queryByTestId("mesa")).toBeNull();
  });

  it("sin español en el cuarto", () => {
    const { container } = montar();
    expect(container.textContent ?? "").not.toMatch(/[A-Za-zÁÉÍÓÚáéíóúñÑ]{2,}/);
    for (const el of container.querySelectorAll("[aria-label]")) {
      expect(el.getAttribute("aria-label")).not.toMatch(/[A-Za-z]/);
    }
  });
});

/** La vista real de la casa con el hook a mano (como en Casa.test.tsx). */
function montarCasa(props: { palabras?: readonly string[]; alAbrirPalabra?: (id: string) => void } = {}) {
  const api = { current: null } as MutableRefObject<CasaApi | null>;
  function Prueba({ activo = true }: { activo?: boolean }) {
    const casa = useCasa();
    api.current = casa;
    return <CasaVista casa={casa} activo={activo} {...props} />;
  }
  const r = render(<Prueba />);
  return { ...r, api: () => api.current!, rerender: (activo: boolean) => r.rerender(<Prueba activo={activo} />) };
}
const ir = (cuarto: string) => fireEvent.click(document.querySelector(`[data-cuarto="${cuarto}"]`) as HTMLElement);
const enLiving = () => document.querySelector("[data-living]") !== null;
const enCocina = () => document.querySelector("[data-objeto]") !== null;

describe("Living en la casa", () => {
  it("客厅 muestra el living sin la cocina; 厨房 vuelve y la cocina conserva su estado", () => {
    const { api } = montarCasa();
    act(() => api().restaurar({ ...ESTADO_INICIAL, pingguo: "limpio" }));
    expect(enCocina()).toBe(true);
    expect(enLiving()).toBe(false);
    vi.mocked(callar).mockClear();
    ir("living");
    expect(enLiving()).toBe(true);
    expect(enCocina()).toBe(false);
    expect(callar).toHaveBeenCalled();
    expect(document.querySelector('[data-cuarto="living"]')!.getAttribute("aria-current")).toBe("true");
    vi.mocked(callar).mockClear();
    ir("cocina");
    expect(enLiving()).toBe(false);
    expect(enCocina()).toBe(true);
    expect(callar).toHaveBeenCalled();
    expect(api().estado.pingguo).toBe("limpio");
    expect(document.querySelector('[data-objeto="pingguo"]')).not.toBeNull();
  });

  it("en el living no hay 玩 ni ⤢ ni oscuridad, aunque la lámpara esté apagada; sí el minimapa", () => {
    const { api } = montarCasa();
    act(() => api().restaurar({ ...ESTADO_INICIAL, deng: "apagada" }));
    expect(document.querySelector("[data-oscura]")).not.toBeNull();
    ir("living");
    expect(screen.queryByRole("button", { name: "玩" })).toBeNull();
    expect(screen.queryByRole("button", { name: "全部" })).toBeNull();
    expect(document.querySelector("[data-oscura]")).toBeNull();
    expect(document.querySelector("div[class*=oscuro]")).toBeNull();
    expect(screen.getByRole("group", { name: "地图" })).toBeTruthy();
  });

  it("con el refri abierto el minimapa no cambia de cuarto", async () => {
    const { api } = montarCasa();
    act(() => { void api().elegir("bingxiang", acciones("bingxiang", ESTADO_INICIAL)[0]); });
    await avanzar(6000);
    expect(api().refri).toBe(true);
    ir("living");
    expect(enLiving()).toBe(false);
  });

  it("con un primer plano abierto el minimapa no cambia de cuarto", async () => {
    const { api } = montarCasa();
    act(() => { void api().soltarObjetoEnVaca("panzi"); });
    await avanzar(3000);
    fireEvent.click(within(screen.getByTestId("opciones")).getByRole("button", { name: "吃饺子" }));
    await avanzar(1000);
    expect(api().primerPlano).not.toBeNull();
    ir("living");
    expect(enLiving()).toBe(false);
  });

  it("las palabras abiertas llegan a la mesa y tocar una avisa", async () => {
    const alAbrirPalabra = vi.fn();
    const id = PALABRAS[0].id;
    const { container } = montarCasa({ palabras: [id], alAbrirPalabra });
    ir("living");
    fireEvent.click(mesa(container));
    await avanzar(PASO_MS + ZOOM_MS);
    const tile = (i: string) => screen.getByTestId("mesa").querySelector<HTMLElement>(`[data-palabra="${i}"]`)!;
    expect(tile(id).dataset.abierta).toBe("true");
    fireEvent.click(tile(PALABRAS[1].id));
    expect(alAbrirPalabra).toHaveBeenCalledWith(PALABRAS[1].id);
  });

  it("pestaña oculta en el living con una ficha abierta: la ficha se cierra (Review Focus 3)", async () => {
    const { container, rerender } = montarCasa();
    ir("living");
    fireEvent.click(mesa(container));
    await avanzar(PASO_MS + ZOOM_MS);
    fireEvent.click(screen.getByTestId("mesa").querySelector<HTMLElement>("[data-palabra]")!);
    expect(screen.getByRole("dialog")).toBeTruthy();
    rerender(false);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByTestId("mesa")).toBeNull();
  });
});
