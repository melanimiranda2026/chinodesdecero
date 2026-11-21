import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { MutableRefObject } from "react";
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

import { callar, decir } from "@/components/casa/audio/voz";
import { esperaDe } from "@/components/casa/audio/turnos";
import { HEN_RE, NI_HAO } from "@/components/casa/cocina/frases";
import { textoHanzi } from "@/lib/silabas";
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

  it("al cerrar la mesa el foco vuelve al botón 桌子", async () => {
    const { container } = montar();
    fireEvent.click(mesa(container));
    await avanzar(PASO_MS + ZOOM_MS);
    fireEvent.click(screen.getByRole("button", { name: "返回" }));
    expect(document.activeElement).toBe(mesa(container));
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

  it("es memo: el vapor de la cocina (cada 450 ms) no lo vuelve a pintar si sus props no cambian", () => {
    expect((Living as unknown as { $$typeof: symbol }).$$typeof).toBe(Symbol.for("react.memo"));
  });

  it("con movimiento reducido no hay caminata ni zoom animados (CSS)", () => {
    const css = readFileSync(join(process.cwd(), "components/casa/living/Living.module.css"), "utf8");
    const reducido = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/g)].map((m) => m[1]).join("\n");
    expect(reducido).toMatch(/\.living \[data-mundo\][\s\S]*transition: none !important/);
    expect(reducido).toMatch(/\.living \.vaca[\s\S]*transition: none !important/);
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

  it("cambiar de cuarto hace un fundido corto (no al cargar) y con movimiento reducido no se ve", () => {
    montarCasa();
    const fundido = () => document.querySelector<HTMLElement>("[data-fundido]");
    expect(fundido()).toBeNull();
    ir("living");
    const f1 = fundido()!;
    expect(f1).not.toBeNull();
    expect(f1.getAttribute("aria-hidden")).toBe("true");
    ir("cocina");
    // uno nuevo en cada cambio: la animación vuelve a empezar
    expect(fundido()).not.toBe(f1);
    const css = readFileSync(join(process.cwd(), "components/casa/Casa.module.css"), "utf8");
    expect(css).toMatch(/\.fundido \{[^}]*pointer-events: none/);
    expect(css).toMatch(/\.fundido \{[^}]*animation: [^;]*0\.2s/);
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{[^}]*\.fundido \{ display: none; \}/);
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

describe("Living en la casa: la voz de la cocina no se cuela", () => {
  const decirMock = vi.mocked(decir);
  const dichas = () => decirMock.mock.calls.map((c) => textoHanzi(c[0]));
  beforeEach(() => {
    decirMock.mockReset();
    decirMock.mockImplementation(() => Promise.resolve(true));
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tocar 茶壶 y pasar al 客厅 mientras suena: 很热 nunca se dice", async () => {
    montarCasa();
    let fin!: (v: boolean) => void;
    decirMock.mockImplementationOnce(() => new Promise<boolean>((r) => { fin = r; }));
    fireEvent.click(screen.getByRole("button", { name: "茶壶" }));
    await avanzar(esperaDe("pop"));
    expect(dichas()).toEqual(["茶壶"]);
    ir("living");
    await act(async () => { fin(false); });
    await avanzar(5000);
    expect(dichas()).not.toContain(textoHanzi(HEN_RE));
  });

  it("si el primer toque en la casa es 客厅, no se dice 你好", async () => {
    montarCasa();
    const b = document.querySelector('[data-cuarto="living"]') as HTMLElement;
    fireEvent.pointerDown(b);
    fireEvent.click(b);
    expect(enLiving()).toBe(true);
    await avanzar(5000);
    expect(dichas()).not.toContain(textoHanzi(NI_HAO));
  });

  it("pasar al 客厅 durante el pop: la voz de la cocina no sale", async () => {
    montarCasa();
    fireEvent.click(screen.getByRole("button", { name: "茶壶" }));
    await avanzar(10);
    ir("living");
    await avanzar(5000);
    expect(decirMock).not.toHaveBeenCalled();
  });

  it("pasar de cuarto en medio de un arrastre no deja el arrastre colgado", async () => {
    // jsdom mide 0: con un ancho real el arrastre sí mueve el vaso
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 1000, height: 1000, x: 0, y: 0, top: 0, left: 0, right: 1000, bottom: 1000, toJSON: () => ({}) } as DOMRect);
    montarCasa();
    const obj = () => document.querySelector<HTMLElement>('[data-objeto="beizi"]')!;
    fireEvent.pointerDown(obj(), { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(obj(), { clientX: 200, clientY: 200, pointerId: 1 });
    expect(obj().className).toMatch(/arrastrando/);
    ir("living");
    ir("cocina");
    expect(obj().className).not.toMatch(/arrastrando/);
    // el arrastre viejo no se come el próximo toque
    fireEvent.pointerUp(obj(), { clientX: 200, clientY: 200, pointerId: 1 });
    decirMock.mockClear();
    fireEvent.click(obj());
    await avanzar(2000);
    expect(dichas()).toContain("杯子");
  });
});
