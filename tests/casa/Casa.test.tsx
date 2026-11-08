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

import { decir } from "@/components/casa/audio/voz";
import { Casa, CasaVista } from "@/components/casa/Casa";
import { useCasa, type AlEvento, type CasaApi } from "@/components/casa/useCasa";
import { ANCLAS, OBJETOS, junto } from "@/components/casa/cocina/datos";
import { acciones } from "@/components/casa/cocina/acciones";
import { ESTADO_INICIAL } from "@/components/casa/cocina/datos";
import { textoHanzi } from "@/lib/silabas";

const decirMock = vi.mocked(decir);

/** Monta la vista real y deja el hook a mano para llamar sus funciones. */
function montar(onEvento?: AlEvento) {
  const api = { current: null } as MutableRefObject<CasaApi | null>;
  function Prueba() {
    const casa = useCasa(onEvento);
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
  decirMock.mockImplementation(() => Promise.resolve(true));
});
afterEach(() => {
  vi.useRealTimers();
});

describe("Casa", () => {
  it("tocar 杯子 dice su nombre y el globo muestra 杯 y bēi", async () => {
    render(<Casa />);
    fireEvent.click(screen.getByRole("button", { name: "杯子" }));
    await avanzar(10);
    expect(decirMock).not.toHaveBeenCalled(); // primero el pop, después el mandarín
    await avanzar(400);
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

  it("si una secuencia de abrir acciones lanza, el finally libera ocupado", async () => {
    const onEvento: AlEvento = (n) => { if (n === "abrir_acciones") throw new Error("analítica caída"); };
    const { api } = montar(onEvento);
    let p!: Promise<void>;
    act(() => { p = api().soltarObjetoEnVaca("panzi"); });
    await act(async () => { await expect(p).rejects.toThrow("analítica caída"); });
    expect(api().ocupado).toBe(false);
  });

  it("si elegir lanza después del primer plano, el finally libera ocupado y cierra el primer plano", async () => {
    const onEvento: AlEvento = (n) => { if (n === "gesto_completo") throw new Error("analítica caída"); };
    const { api } = montar(onEvento);
    const comer = acciones("panzi", ESTADO_INICIAL)[0];
    let p!: Promise<void>;
    act(() => { p = api().elegir("panzi", comer); });
    const rechazo = expect(p).rejects.toThrow("analítica caída");
    await avanzar(1000);
    expect(api().primerPlano?.objeto).toBe("panzi");
    act(() => api().terminarPrimerPlano("plata"));
    await act(async () => { await rechazo; });
    expect(api().ocupado).toBe(false);
    expect(api().primerPlano).toBeNull();
  });

  it("<Casa/> atiende el rechazo de una secuencia (no queda sin atender)", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Casa onEvento={(n) => { if (n === "tocar_objeto") throw new Error("analítica caída"); }} />);
    fireEvent.click(screen.getByRole("button", { name: "杯子" }));
    await avanzar(10);
    expect(error).toHaveBeenCalledWith("[casa]", expect.any(Error));
    error.mockRestore();
  });

  it("verTodo y el botón ⤢ se ignoran mientras la casa está ocupada", async () => {
    const { api } = montar();
    act(() => { void api().soltarObjetoEnVaca("panzi"); });
    const enfocada = api().camara;
    expect(enfocada.s).toBe(1.9);
    act(() => api().verTodo());
    expect(api().camara).toEqual(enfocada);
    const alejar = screen.getByRole("button", { name: "全部" }) as HTMLButtonElement;
    expect(alejar.disabled).toBe(true);
    fireEvent.pointerDown(document.querySelector("div[class*=mundo]")!);
    expect(api().camara).toEqual(enfocada);
    await avanzar(3000);
    expect(api().ocupado).toBe(false);
    act(() => api().verTodo());
    expect(api().camara).toEqual({ x: 500, y: 500, s: 1 });
  });

  it("las anclas de los efectos viven en los datos", () => {
    expect(ANCLAS.llave).toEqual({ x: 490, y: 278 });
    expect(junto(OBJETOS.bingxiang, ANCLAS.salidaRefri)).toEqual({ x: 100, y: 300 });
    expect(junto(OBJETOS.chahu, ANCLAS.picoTetera)).toEqual({ x: 362, y: 286 });
  });

  it("no hay español dentro de la casa (fuera del pinyin)", async () => {
    const { container, api } = montar();
    fireEvent.click(screen.getByRole("button", { name: "苹果" }));
    await avanzar(400);
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
    // las tarjetas (entrada, método, pronto) son página, no casa: ahí sí hay español
    copia.querySelectorAll("[data-capa]").forEach((n) => n.remove());
    expect(copia.textContent ?? "").not.toMatch(espanol);
    for (const el of copia.querySelectorAll("[aria-label]"))
      expect(el.getAttribute("aria-label") ?? "").not.toMatch(espanol);
  });
});

describe("Casa: 玩 (quiz)", () => {
  const idsDeLaMock = () => decirMock.mock.calls.map((c) => textoHanzi(c[0]));

  it("la vaca dice 给我+nombre, el globo solo 给我 ？ y se responde arrastrando", async () => {
    const { api } = montar();
    act(() => api().empezarQuiz());
    await avanzar(800);
    const q = api().quiz!;
    const id = q.rondas[0];
    expect(idsDeLaMock().at(-1)).toBe("给我" + textoHanzi(OBJETOS[id].nombre));
    const globo = screen.getByTestId("globo");
    expect(globo.getAttribute("aria-label")).toBe("给我？");
    expect(globo.textContent).not.toContain(textoHanzi(OBJETOS[id].nombre));

    // incorrecto: 不对 y repite la misma ronda
    const otro = q.rondas[1];
    await act(async () => { void api().soltarObjetoEnVaca(otro); await vi.advanceTimersByTimeAsync(450); });
    expect(idsDeLaMock()).toContain("不对");
    await avanzar(600);
    expect(api().quiz!.i).toBe(0);
    expect(idsDeLaMock().at(-1)).toBe("给我" + textoHanzi(OBJETOS[id].nombre));

    // correcto: 对 y pasa a la siguiente
    await act(async () => { void api().soltarObjetoEnVaca(id); await vi.advanceTimersByTimeAsync(460); });
    expect(idsDeLaMock()).toContain("对");
    await avanzar(600);
    expect(api().quiz!.i).toBe(1);
    expect(api().quiz!.aciertos).toBe(1);
  });

  it("al terminar las 4 rondas sale la tarjeta del método y luego la de pronto", async () => {
    const { api } = montar();
    act(() => api().empezarQuiz());
    await avanzar(800);
    for (let r = 0; r < 4; r++) {
      const id = api().quiz!.rondas[r];
      await act(async () => { void api().soltarObjetoEnVaca(id); await vi.advanceTimersByTimeAsync(1100); });
    }
    await avanzar(2500);
    expect(api().quiz!.fase).toBe("fin");
    fireEvent.click(screen.getByRole("button", { name: "Entrar a la casa" }));
    expect(screen.getByText("Lo acabas de hacer")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Seguir explorando" }));
    expect(api().quiz).toBeNull();
    expect(screen.getByText("Este cuarto abre pronto. Deja tu correo y marca la casilla: te avisamos.")).toBeTruthy();
  });

  it("tocar un cuarto bloqueado del minimapa abre la tarjeta pronto", () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Entrar a la casa" }));
    fireEvent.click(screen.getByRole("button", { name: "卧室 🔒" }));
    expect(screen.getByText("Este cuarto abre pronto. Deja tu correo y marca la casilla: te avisamos.")).toBeTruthy();
  });
});

describe("Casa: quiz, guardas y tarjetas", () => {
  it("empezarQuiz se ignora mientras la casa está ocupada", async () => {
    const { api } = montar();
    act(() => { void api().soltarObjetoEnVaca("beizi"); });
    await avanzar(10); // abrirAcciones deja ocupado
    expect(api().ocupado).toBe(true);
    act(() => api().empezarQuiz());
    expect(api().quiz).toBeNull();
  });

  it("un segundo soltar durante el 对/不对 se ignora", async () => {
    const { api } = montar();
    act(() => api().empezarQuiz());
    await avanzar(800);
    const q = api().quiz!;
    await act(async () => {
      void api().soltarObjetoEnVaca(q.rondas[0]);
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(api().ocupado).toBe(true);
    const llamadas = decirMock.mock.calls.length;
    await act(async () => {
      void api().soltarObjetoEnVaca(api().quiz!.rondas[1]);
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(api().quiz!.aciertos).toBe(1);
    expect(api().quiz!.i).toBe(1);
    expect(decirMock.mock.calls.length).toBe(llamadas);
  });

  it("con una tarjeta abierta la casa queda inert y el botón 玩 no se puede usar", () => {
    const { container } = montar();
    expect(container.querySelector("[inert]")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Entrar a la casa" }));
    expect(container.querySelector("[inert]")).toBeNull();
  });
});
