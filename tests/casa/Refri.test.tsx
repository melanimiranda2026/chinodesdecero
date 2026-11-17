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

import { callar, decir } from "@/components/casa/audio/voz";
import { CasaVista } from "@/components/casa/Casa";
import { useCasa, type CasaApi } from "@/components/casa/useCasa";
import { acciones } from "@/components/casa/cocina/acciones";
import { COMIDAS, ESTADO_INICIAL, NOMBRES_COMIDA, type EstadoCocina } from "@/components/casa/cocina/datos";
import { HEN_LENG } from "@/components/casa/cocina/frases";
import { textoHanzi } from "@/lib/silabas";

const decirMock = vi.mocked(decir);
const avanzar = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const dichos = () => decirMock.mock.calls.map((c) => textoHanzi(c[0]));

function montar(estado: EstadoCocina = ESTADO_INICIAL) {
  let api!: CasaApi;
  function Prueba({ activo = true }: { activo?: boolean }) {
    api = useCasa();
    return <CasaVista casa={api} activo={activo} />;
  }
  const r = render(<Prueba />);
  act(() => api.restaurar(estado));
  return { ...r, api: () => api, Prueba };
}

/** 打开 el refri: la casa hace la animación de siempre y luego aparece el primer plano. */
async function abrirRefri(api: () => CasaApi) {
  const abrir = acciones("bingxiang", api().estado).find((a) => a.anim === "abrir")!;
  act(() => { void api().elegir("bingxiang", abrir); });
  await avanzar(4000);
  return screen.getByTestId("refri");
}

beforeEach(() => {
  vi.useFakeTimers();
  decirMock.mockReset();
  decirMock.mockImplementation(() => Promise.resolve(true));
  vi.mocked(callar).mockClear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("Refri en primer plano", () => {
  it("abrir el refri lo deja abierto, la casa ocupada y muestra las 13 comidas", async () => {
    const { api } = montar();
    const refri = await abrirRefri(api);
    expect(api().estado.bingxiang).toBe("abierto");
    expect(api().refri).toBe(true);
    expect(api().ocupado).toBe(true);
    const etiquetas = within(refri).getAllByRole("button").map((b) => b.getAttribute("aria-label"));
    for (const id of COMIDAS) expect(etiquetas).toContain(textoHanzi(NOMBRES_COMIDA[id]));
    expect(refri.querySelectorAll("[data-comida]")).toHaveLength(COMIDAS.length);
  });

  it("tocar 香蕉 dice 香蕉; cada tercer toque, además 很冷", async () => {
    const { api } = montar();
    const refri = await abrirRefri(api);
    decirMock.mockClear();
    const banana = within(refri).getByRole("button", { name: "香蕉" });
    fireEvent.click(banana);
    await avanzar(1000);
    expect(dichos()).toEqual(["香蕉"]);
    fireEvent.click(within(refri).getByRole("button", { name: "牛奶" }));
    await avanzar(1000);
    expect(dichos()).toEqual(["香蕉", "牛奶"]);
    fireEvent.click(banana);
    await avanzar(2000);
    expect(dichos()).toEqual(["香蕉", "牛奶", "香蕉", textoHanzi(HEN_LENG)]);
    expect(banana.getAttribute("data-rebota")).not.toBeNull();
  });

  it("✋ 拿 苹果 solo con la manzana afuera del cuarto (pingguo: nada); al tocarlo sale y la manzana vuelve sucia", async () => {
    const sin = montar();
    const r1 = await abrirRefri(sin.api);
    expect(within(r1).queryByRole("button", { name: "拿苹果" })).toBeNull();
    sin.unmount();

    const { api } = montar({ ...ESTADO_INICIAL, pingguo: "nada" });
    const refri = await abrirRefri(api);
    fireEvent.click(within(refri).getByRole("button", { name: "拿苹果" }));
    await avanzar(0);
    expect(screen.queryByTestId("refri")).toBeNull();
    await avanzar(5000);
    expect(api().estado.pingguo).toBe("sucio");
    expect(api().estado.bingxiang).toBe("abierto");
    expect(dichos()).toContain("我拿苹果");
  });

  it("✋ 拿 饺子 aparece con el plato limpio", async () => {
    const { api } = montar({ ...ESTADO_INICIAL, panzi: "limpio" });
    const refri = await abrirRefri(api);
    expect(within(refri).getByRole("button", { name: "拿饺子" })).toBeTruthy();
  });

  it("👋 关上 cierra el primer plano y la puerta; la casa queda libre", async () => {
    const { api } = montar();
    const refri = await abrirRefri(api);
    fireEvent.click(within(refri).getByRole("button", { name: "关上" }));
    await avanzar(6000);
    expect(screen.queryByTestId("refri")).toBeNull();
    expect(api().estado.bingxiang).toBe("cerrado");
    expect(api().ocupado).toBe(false);
    expect(dichos()).toContain("我关上冰箱");
  });

  it("✕ también cierra el refri y libera la casa", async () => {
    const { api } = montar();
    const refri = await abrirRefri(api);
    fireEvent.click(within(refri).getByRole("button", { name: "关" }));
    await avanzar(100);
    expect(screen.queryByTestId("refri")).toBeNull();
    expect(api().estado.bingxiang).toBe("cerrado");
    expect(api().ocupado).toBe(false);
  });

  it("al ocultarse la pestaña se cierra sin aplicar nada, se calla y la casa no queda trabada", async () => {
    const { api, rerender, Prueba } = montar();
    await abrirRefri(api);
    vi.mocked(callar).mockClear();
    rerender(<Prueba activo={false} />);
    await avanzar(100);
    expect(screen.queryByTestId("refri")).toBeNull();
    expect(api().refri).toBe(false);
    expect(api().estado.bingxiang).toBe("abierto");
    expect(api().ocupado).toBe(false);
    expect(callar).toHaveBeenCalled();
  });

  it("llegar al refri ya abierto (avance guardado) lo muestra por dentro, sin globos de opciones", async () => {
    const { api } = montar({ ...ESTADO_INICIAL, bingxiang: "abierto" });
    act(() => { void api().soltarObjetoEnVaca("bingxiang"); });
    await avanzar(3000);
    const refri = screen.getByTestId("refri");
    expect(api().opciones).toBeNull();
    expect(api().ocupado).toBe(true);
    expect(dichos()).toContain("这是冰箱");
    fireEvent.click(within(refri).getByRole("button", { name: "关上" }));
    await avanzar(6000);
    expect(screen.queryByTestId("refri")).toBeNull();
    expect(api().estado.bingxiang).toBe("cerrado");
    expect(api().ocupado).toBe(false);
  });

  it("después de 拿 (refri abierto), volver a llegar al refri lo muestra por dentro otra vez", async () => {
    const { api } = montar({ ...ESTADO_INICIAL, pingguo: "nada" });
    const r1 = await abrirRefri(api);
    fireEvent.click(within(r1).getByRole("button", { name: "拿苹果" }));
    await avanzar(8000);
    expect(api().estado.bingxiang).toBe("abierto");
    expect(api().ocupado).toBe(false);
    act(() => { void api().soltarObjetoEnVaca("bingxiang"); });
    await avanzar(3000);
    expect(screen.getByTestId("refri")).toBeTruthy();
    expect(api().opciones).toBeNull();
  });

  it("✕ calla a la vaca aunque esté diciendo el nombre de una comida", async () => {
    const { api } = montar();
    const refri = await abrirRefri(api);
    decirMock.mockImplementation(() => new Promise(() => {})); // el nombre nunca termina
    fireEvent.click(within(refri).getByRole("button", { name: "香蕉" }));
    await avanzar(500);
    expect(dichos()).toContain("香蕉");
    vi.mocked(callar).mockClear();
    fireEvent.click(within(refri).getByRole("button", { name: "关" }));
    await avanzar(100);
    expect(callar).toHaveBeenCalled();
    expect(api().globo).toBeNull();
    expect(screen.queryByTestId("refri")).toBeNull();
    expect(api().ocupado).toBe(false);
  });

  it("con la lámpara apagada el refri por dentro va a luz normal (no queda bajo la capa oscura)", async () => {
    const { api } = montar({ ...ESTADO_INICIAL, deng: "apagada" });
    const refri = await abrirRefri(api);
    const oscuro = document.querySelector("div[class*=oscuro]");
    expect(oscuro).toBeTruthy();
    // la capa oscura vive dentro del cuarto (.mundo); el primer plano, fuera
    expect(oscuro!.parentElement!.contains(refri)).toBe(false);
    expect(refri.closest("[class*=mundo]")).toBeNull();
    expect(oscuro!.contains(refri)).toBe(false);
  });

  it("sin español visible: fuera del pinyin, solo hanzi y emoji", async () => {
    const { api } = montar({ ...ESTADO_INICIAL, pingguo: "nada", panzi: "limpio" });
    const refri = await abrirRefri(api);
    fireEvent.click(within(refri).getByRole("button", { name: "香蕉" }));
    await avanzar(500);
    const copia = refri.cloneNode(true) as HTMLElement;
    copia.querySelectorAll("[data-pinyin]").forEach((n) => n.remove());
    expect(copia.textContent ?? "").not.toMatch(/[A-Za-zÁÉÍÓÚáéíóúñÑ]/);
  });
});
