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

import { callar, decir } from "@/components/casa/audio/voz";
import { musica, sfx } from "@/components/casa/audio/sonido";
import { Casa, CasaVista } from "@/components/casa/Casa";
import { useCasa, type AlEvento, type CasaApi } from "@/components/casa/useCasa";
import { acciones } from "@/components/casa/cocina/acciones";
import { ESTADO_INICIAL, OBJETOS } from "@/components/casa/cocina/datos";
import { CLAVE_AVANCE, cargarAvance } from "@/components/casa/avance";
import { reiniciarEventos } from "@/components/casa/eventos";
import { textoHanzi } from "@/lib/silabas";

const decirMock = vi.mocked(decir);
const sfxMock = vi.mocked(sfx);

/** Orden de lo que suena: "sfx:pop" / "voz:杯子", con la hora falsa en que empezó. */
let linea: { que: string; t: number }[] = [];

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
const momento = (que: string) => linea.find((l) => l.que === que)?.t;

beforeEach(() => {
  vi.useFakeTimers();
  linea = [];
  localStorage.clear();
  reiniciarEventos();
  decirMock.mockReset();
  decirMock.mockImplementation((s) => {
    linea.push({ que: `voz:${textoHanzi(s)}`, t: Date.now() });
    return Promise.resolve(true);
  });
  sfxMock.mockReset();
  sfxMock.mockImplementation((n) => { linea.push({ que: `sfx:${n}`, t: Date.now() }); });
  vi.mocked(musica.tocar).mockClear();
  vi.mocked(callar).mockClear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("efectos nunca encima del mandarín", () => {
  it("tocar: el pop suena y la frase empieza recién después de su duración", async () => {
    const { api } = montar();
    act(() => { void api().tocar("beizi"); });
    await avanzar(1000);
    const pop = momento("sfx:pop")!;
    const voz = momento("voz:杯子")!;
    expect(voz - pop).toBeGreaterThanOrEqual(350);
  });

  it("una acción sin primer plano (打开): el efecto y después la frase", async () => {
    const { api } = montar();
    const abrir = acciones("bingxiang", ESTADO_INICIAL)[0];
    act(() => { void api().elegir("bingxiang", abrir); });
    await avanzar(4000);
    const efecto = momento(`sfx:${abrir.sfx}`)!;
    const voz = momento(`voz:${textoHanzi(abrir.frase)}`)!;
    expect(efecto).toBeDefined();
    expect(voz - efecto).toBeGreaterThanOrEqual(350);
  });

  it("quiz: ding → 对 y boing → 不对, cada frase después de su efecto", async () => {
    const { api } = montar();
    act(() => api().empezarQuiz());
    await avanzar(800);
    const q = api().quiz!;
    await act(async () => { void api().soltarObjetoEnVaca(q.rondas[1]); await vi.advanceTimersByTimeAsync(1500); });
    expect(momento("voz:不对")! - momento("sfx:boing")!).toBeGreaterThanOrEqual(400);
    await act(async () => { void api().soltarObjetoEnVaca(q.rondas[0]); await vi.advanceTimersByTimeAsync(1500); });
    expect(momento("voz:对")! - momento("sfx:ding")!).toBeGreaterThanOrEqual(450);
  });

  it("tocar la vaca mientras habla no hace boing; callada, sí", async () => {
    let terminar!: (v: boolean) => void;
    decirMock.mockImplementation(() => new Promise<boolean>((r) => (terminar = r)));
    const { api } = montar();
    act(() => { void api().tocar("beizi"); });
    await avanzar(400); // ya habla
    act(() => api().tocarVaca());
    expect(sfxMock).not.toHaveBeenCalledWith("boing");
    await act(async () => { terminar(true); await vi.advanceTimersByTimeAsync(10); });
    act(() => api().tocarVaca());
    expect(sfxMock).toHaveBeenCalledWith("boing");
  });
});

describe("玩: salir y respaldo mudo", () => {
  it("tocar 玩 otra vez durante el quiz lo termina sin tarjeta", async () => {
    const { api } = montar();
    fireEvent.click(screen.getByRole("button", { name: "Entrar a la casa" }));
    const jugar = screen.getByRole("button", { name: "玩" });
    fireEvent.click(jugar);
    await avanzar(800);
    expect(api().quiz).not.toBeNull();
    expect(jugar.getAttribute("aria-pressed")).toBe("true");
    expect((jugar as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(jugar);
    expect(api().quiz).toBeNull();
    expect(api().globo).toBeNull();
    expect(callar).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull(); // ni método ni pronto
    expect(jugar.getAttribute("aria-pressed")).toBe("false");
  });

  it("si la voz no suena, el globo muestra lo pedido en hanzi + pinyin (sin español)", async () => {
    decirMock.mockImplementation(() => Promise.resolve(false));
    const { api } = montar();
    act(() => api().empezarQuiz());
    await avanzar(800);
    const nombre = OBJETOS[api().quiz!.rondas[0]].nombre;
    const globo = screen.getByTestId("globo");
    expect(globo.getAttribute("aria-label")).toBe("给我" + textoHanzi(nombre));
    for (const [hz, py] of nombre) {
      expect(within(globo).getByText(hz)).toBeTruthy();
      expect(within(globo).getByText(py)).toBeTruthy();
    }
    // quitando el pinyin (que lleva tildes de tono), solo quedan los hanzi: nada en español
    const copia = globo.cloneNode(true) as HTMLElement;
    copia.querySelectorAll("[data-pinyin]").forEach((n) => n.remove());
    expect(copia.textContent).toBe("给我" + textoHanzi(nombre));
  });

  it("con voz, el globo sigue mostrando solo 给我 ？", async () => {
    const { api } = montar();
    act(() => api().empezarQuiz());
    await avanzar(800);
    expect(screen.getByTestId("globo").getAttribute("aria-label")).toBe("给我？");
  });

  it("salir del quiz mientras la pregunta aún suena no deja la respuesta en el globo", async () => {
    let terminar!: (v: boolean) => void;
    decirMock.mockImplementation(() => new Promise<boolean>((r) => (terminar = r)));
    const { api } = montar();
    act(() => api().empezarQuiz());
    await avanzar(800);
    act(() => api().empezarQuiz()); // 玩 otra vez
    await act(async () => { terminar(false); await vi.advanceTimersByTimeAsync(10); });
    expect(api().quiz).toBeNull();
    expect(api().globo).toBeNull();
  });
});

describe("primer plano: ✕", () => {
  it("sale sin aplicar la acción, libera la casa y no cuenta el gesto", async () => {
    const eventos: string[] = [];
    const { api } = montar((n) => eventos.push(n));
    const comer = acciones("panzi", ESTADO_INICIAL)[0];
    let fin!: Promise<void>;
    act(() => { fin = api().elegir("panzi", comer); });
    await avanzar(1000);
    expect(api().primerPlano?.objeto).toBe("panzi");
    const cerrar = screen.getByRole("button", { name: "关" });
    expect(cerrar.getAttribute("data-pinyin")).toBe("guān");
    fireEvent.click(cerrar);
    await act(async () => { await fin; });
    expect(api().primerPlano).toBeNull();
    expect(api().ocupado).toBe(false);
    expect(api().estado.panzi).toBe("lleno");
    expect(api().posiciones).toEqual({});
    expect(eventos).not.toContain("gesto_completo");
    expect(screen.queryByTestId("primer-plano")).toBeNull();
  });
});

describe("escuchadas y música", () => {
  it("una frase que no sonó no cuenta como escuchada", async () => {
    decirMock.mockImplementation(() => Promise.resolve(false));
    render(<Casa />);
    await avanzar(10);
    fireEvent.click(screen.getByRole("button", { name: "Entrar a la casa" }));
    fireEvent.click(screen.getByRole("button", { name: "杯子" }));
    await avanzar(3000);
    expect(JSON.parse(localStorage.getItem(CLAVE_AVANCE) ?? "{}").escuchadas ?? []).toEqual([]);
  });

  it("una frase que sonó sí cuenta", async () => {
    render(<Casa />);
    await avanzar(10);
    fireEvent.click(screen.getByRole("button", { name: "Entrar a la casa" }));
    await avanzar(3000);
    expect(cargarAvance().escuchadas).toContain("ni2_hao3");
  });

  it("la música de la cocina empieza en el toque de 'Entrar a la casa'", () => {
    render(<Casa />);
    expect(musica.tocar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Entrar a la casa" }));
    expect(musica.tocar).toHaveBeenCalledWith("cocina");
  });
});
