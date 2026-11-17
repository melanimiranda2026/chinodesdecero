import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("@/components/casa/audio/voz", () => ({
  decir: vi.fn(() => Promise.resolve(true)),
  callar: vi.fn(),
  desbloquearAudio: vi.fn(),
}));
vi.mock("@/components/casa/audio/sonido", () => ({
  sfx: vi.fn(),
  musica: { tocar: vi.fn(), parar: vi.fn(), bajar: vi.fn() },
}));

import { decir } from "@/components/casa/audio/voz";
import { sfx } from "@/components/casa/audio/sonido";
import { CasaVista } from "@/components/casa/Casa";
import { useCasa, type CasaApi } from "@/components/casa/useCasa";
import { acciones } from "@/components/casa/cocina/acciones";
import { ESTADO_INICIAL } from "@/components/casa/cocina/datos";
import { WO_ZUO_HAO_FAN_LE } from "@/components/casa/cocina/frases";
import { textoHanzi } from "@/lib/silabas";

const decirMock = vi.mocked(decir);
const avanzar = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const dichos = () => decirMock.mock.calls.map((c) => textoHanzi(c[0]));
/** Todo mide 100 x 100 px desde (0, 0): clientX 50 = u 0,5 en la olla. */
const en = (u: number, v: number) => ({ clientX: u * 100, clientY: v * 100, pointerId: 1 });

function montar() {
  let api!: CasaApi;
  const alEvento = vi.fn();
  function Prueba({ activo = true }: { activo?: boolean }) {
    api = useCasa(alEvento);
    return <CasaVista casa={api} activo={activo} />;
  }
  const r = render(<Prueba />);
  act(() => api.restaurar(ESTADO_INICIAL));
  return { ...r, api: () => api, alEvento, Prueba };
}

/** 做饭 en la olla vacía: la vaca va, entra la receta y dice 我做饭. */
async function abrirReceta(api: () => CasaApi) {
  const cocinar = acciones("guo", api().estado).find((a) => a.anim === "cocinar")!;
  act(() => { void api().elegir("guo", cocinar); });
  await avanzar(1000); // la vaca llega a la olla y entra la receta
  await avanzar(1000); // iris + 我做饭
  return screen.getByTestId("receta");
}

const tocar = async (receta: HTMLElement, hz: string) => {
  fireEvent.click(within(receta).getByRole("button", { name: hz }));
  await avanzar(1000);
};

/** Tres vueltas y algo con el dedo alrededor del centro de la olla. */
function revolver(receta: HTMLElement) {
  const punto = (a: number) => en(0.5 + 0.4 * Math.cos(a), 0.5 + 0.4 * Math.sin(a));
  fireEvent.pointerDown(receta, punto(0));
  for (let i = 1; i <= 4 * 36; i++) fireEvent.pointerMove(receta, punto((i * 2 * Math.PI) / 36));
  fireEvent.pointerUp(receta, punto(0));
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame", "performance", "Date"],
  });
  decirMock.mockReset();
  decirMock.mockImplementation(() => Promise.resolve(true));
  vi.mocked(sfx).mockClear();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100, x: 0, y: 0, toJSON: () => ({}),
  } as DOMRect);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("La receta (做饭)", () => {
  it("做饭 abre la receta (no el primer plano de girar) con 米 + 水 + 胡萝卜 y sin español", async () => {
    const { api } = montar();
    const receta = await abrirReceta(api);
    expect(screen.queryByTestId("primer-plano")).toBeNull();
    expect(api().ocupado).toBe(true);
    expect(dichos()).toContain("我做饭");
    const tarjeta = within(receta).getByTestId("tarjeta-receta");
    expect(tarjeta.textContent).toContain("米");
    expect(tarjeta.textContent).toContain("水");
    expect(tarjeta.textContent).toContain("胡萝卜");
    // el pinyin va coloreado por tono
    const py = tarjeta.querySelectorAll("[data-pinyin] span");
    expect(py.length).toBeGreaterThanOrEqual(5);
    for (const s of py) expect((s as HTMLElement).style.color).not.toBe("");
    // fuera del pinyin, ninguna letra latina
    let texto = receta.textContent ?? "";
    for (const p of receta.querySelectorAll("[data-pinyin]")) texto = texto.split(p.textContent ?? "").join("");
    expect(texto).not.toMatch(/[A-Za-zÁÉÍÓÚáéíóúñÑ]/);
  });

  it("tocar 胡萝卜, 米 y 水 dice cada nombre (pop antes) y marca ✓; antes de los tres no hay cuchara", async () => {
    const { api } = montar();
    const receta = await abrirReceta(api);
    decirMock.mockClear();
    const tarjeta = within(receta).getByTestId("tarjeta-receta");
    expect(within(tarjeta).queryAllByText("✓")).toHaveLength(0);

    await tocar(receta, "胡萝卜");
    expect(dichos()).toEqual(["胡萝卜"]);
    expect(vi.mocked(sfx)).toHaveBeenCalledWith("pop", "cocina");
    expect(within(tarjeta).queryAllByText("✓")).toHaveLength(1);
    expect(screen.queryByTestId("cuchara")).toBeNull();

    await tocar(receta, "米");
    expect(screen.queryByTestId("cuchara")).toBeNull();
    await tocar(receta, "水");
    expect(dichos()).toEqual(["胡萝卜", "米", "水"]);
    expect(within(tarjeta).queryAllByText("✓")).toHaveLength(3);
    expect(screen.getByTestId("cuchara")).toBeTruthy();
    expect(api().estado.guo).toBe("vacio");
  });

  it("echar uno repetido no hace nada", async () => {
    const { api } = montar();
    const receta = await abrirReceta(api);
    decirMock.mockClear();
    await tocar(receta, "米");
    vi.mocked(sfx).mockClear();
    await tocar(receta, "米");
    expect(dichos()).toEqual(["米"]);
    expect(vi.mocked(sfx)).not.toHaveBeenCalledWith("pop", "cocina");
  });

  it("arrastrar un ingrediente hasta la olla también lo echa", async () => {
    const { api } = montar();
    const receta = await abrirReceta(api);
    decirMock.mockClear();
    const mi = within(receta).getByRole("button", { name: "米" });
    fireEvent.pointerDown(mi, { clientX: 10, clientY: 95, pointerId: 2 });
    fireEvent.pointerMove(mi, { clientX: 40, clientY: 60, pointerId: 2 });
    fireEvent.pointerUp(mi, { clientX: 50, clientY: 50, pointerId: 2 });
    fireEvent.click(mi);
    await avanzar(1000);
    expect(dichos()).toEqual(["米"]);
    expect(receta.querySelector('[data-en-olla="mi"]')).not.toBeNull();
  });

  it("con los tres y revolver completo: 我做好饭了, se cierra y 锅 queda cocido (gesto_completo)", async () => {
    const { api, alEvento } = montar();
    const receta = await abrirReceta(api);
    for (const hz of ["米", "水", "胡萝卜"]) await tocar(receta, hz);
    decirMock.mockClear();
    revolver(receta);
    await avanzar(4000);
    expect(dichos()).toContain(textoHanzi(WO_ZUO_HAO_FAN_LE));
    expect(screen.queryByTestId("receta")).toBeNull();
    expect(api().estado.guo).toBe("cocido");
    expect(alEvento).toHaveBeenCalledWith("gesto_completo", { anim: "cocinar", medalla: expect.any(String) });
    // sigue el flujo de siempre: 盛饭
    await avanzar(3000);
    expect(api().ocupado).toBe(false);
    expect(api().opciones?.lista.map((a) => textoHanzi(a.verbo))).toContain("盛饭");
  });

  it("revolver antes de tener los tres no cuenta", async () => {
    const { api } = montar();
    const receta = await abrirReceta(api);
    await tocar(receta, "米");
    revolver(receta);
    await avanzar(4000);
    expect(screen.getByTestId("receta")).toBeTruthy();
    expect(api().estado.guo).toBe("vacio");
  });

  it("✕ a mitad: la olla sigue vacía y la casa queda libre", async () => {
    const { api } = montar();
    const receta = await abrirReceta(api);
    await tocar(receta, "米");
    await tocar(receta, "水");
    fireEvent.click(within(receta).getByRole("button", { name: "关" }));
    await avanzar(1000);
    expect(screen.queryByTestId("receta")).toBeNull();
    expect(api().estado.guo).toBe("vacio");
    expect(api().ocupado).toBe(false);
  });

  it("pestaña oculta con la receta abierta: se cierra sin cocinar y la casa no queda trabada", async () => {
    const { api, rerender, Prueba } = montar();
    const receta = await abrirReceta(api);
    await tocar(receta, "米");
    rerender(<Prueba activo={false} />);
    await avanzar(1000);
    expect(screen.queryByTestId("receta")).toBeNull();
    expect(api().estado.guo).toBe("vacio");
    expect(api().ocupado).toBe(false);
  });
});
