import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

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
import { musica, sfx } from "@/components/casa/audio/sonido";
import { PrimerPlano } from "@/components/casa/primer-plano/PrimerPlano";
import { CasaVista } from "@/components/casa/Casa";
import { useCasa } from "@/components/casa/useCasa";
import { within } from "@testing-library/react";
import { acciones, type Accion, type Anim } from "@/components/casa/cocina/acciones";
import { ESTADO_INICIAL, type EstadoCocina, type ObjetoId } from "@/components/casa/cocina/datos";
import { HAO, HEN_HAO, TAI_BANG_LE } from "@/components/casa/cocina/frases";
import { textoHanzi } from "@/lib/silabas";

const decirMock = vi.mocked(decir);

const avanzar = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

function accionDe(id: ObjetoId, estado: EstadoCocina, anim: Anim): Accion {
  const a = acciones(id, estado).find((x) => x.anim === anim);
  if (!a) throw new Error(`sin ${anim} para ${id}`);
  return a;
}

function montar(id: ObjetoId, estadoObjeto: string, anim: Anim) {
  const estado = { ...ESTADO_INICIAL, [id]: estadoObjeto };
  const accion = accionDe(id, estado, anim);
  const alTerminar = vi.fn();
  const r = render(<PrimerPlano accion={accion} objeto={id} estado={estado} alTerminar={alTerminar} />);
  const pp = screen.getByTestId("primer-plano");
  return { ...r, pp, accion, alTerminar };
}

/** La zona del gesto mide 100 x 100 px desde (0, 0): clientX 50 = u 0,5. */
const en = (u: number, v: number) => ({ clientX: u * 100, clientY: v * 100, pointerId: 1 });

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame", "performance", "Date"],
  });
  decirMock.mockReset();
  decirMock.mockImplementation(() => Promise.resolve(true));
  vi.mocked(musica.tocar).mockClear();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100, x: 0, y: 0, toJSON: () => ({}),
  } as DOMRect);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** Entrada (iris + frase): después de esto el juego acepta toques. */
const entrar = () => avanzar(600);
/** Medalla + elogio + iris de salida. */
const salir = () => avanzar(2500);

describe("PrimerPlano", () => {
  it("✕ (关 guān) sale sin medalla; tocarlo no cuenta como gesto", async () => {
    const estado = { ...ESTADO_INICIAL };
    const accion = accionDe("panzi", estado, "comer");
    const alTerminar = vi.fn();
    const alCancelar = vi.fn();
    render(<PrimerPlano accion={accion} objeto="panzi" estado={estado} alTerminar={alTerminar} alCancelar={alCancelar} />);
    await entrar();
    const cerrar = screen.getByRole("button", { name: "关" });
    expect(cerrar.getAttribute("data-pinyin")).toBe("guān");
    fireEvent.pointerDown(cerrar, en(0.5, 0.5));
    fireEvent.click(cerrar);
    expect(alCancelar).toHaveBeenCalledTimes(1);
    await salir();
    expect(alTerminar).not.toHaveBeenCalled();
    expect(screen.getByTestId("primer-plano").dataset.fase).toBe("juega");
  });

  it("al terminar el gesto el ✕ desaparece, y el elogio empieza después del ding", async () => {
    const estado = { ...ESTADO_INICIAL };
    const accion = accionDe("panzi", estado, "comer");
    const tiempos: Record<string, number> = {};
    vi.mocked(sfx).mockImplementation((n) => { tiempos[n] ??= performance.now(); });
    decirMock.mockImplementation((s) => {
      if (s === TAI_BANG_LE) tiempos.elogio = performance.now();
      return Promise.resolve(true);
    });
    render(<PrimerPlano accion={accion} objeto="panzi" estado={estado} alTerminar={vi.fn()} alCancelar={vi.fn()} />);
    const pp = screen.getByTestId("primer-plano");
    await entrar();
    for (let i = 0; i < 6; i++) {
      fireEvent.pointerDown(pp, en(0.5, 0.5));
      fireEvent.pointerUp(pp, en(0.5, 0.5));
    }
    await avanzar(10);
    expect(screen.queryByRole("button", { name: "关" })).toBeNull();
    await salir();
    expect(tiempos.elogio - tiempos.ding).toBeGreaterThanOrEqual(450);
  });

  it("al entrar dice la frase de la acción y toca la pista del gesto", async () => {
    const { accion } = montar("panzi", "lleno", "comer");
    await entrar();
    expect(decirMock.mock.calls[0][0]).toEqual(accion.frase);
    expect(musica.tocar).toHaveBeenCalledWith("g-morder");
  });

  it("morder: 6 toques en menos de 5 s → alTerminar('oro') y dice 太棒了", async () => {
    const { pp, alTerminar } = montar("panzi", "lleno", "comer");
    await entrar();
    for (let i = 0; i < 6; i++) {
      fireEvent.pointerDown(pp, en(0.5, 0.5));
      fireEvent.pointerUp(pp, en(0.5, 0.5));
      await avanzar(200);
    }
    await salir();
    expect(alTerminar).toHaveBeenCalledTimes(1);
    expect(alTerminar).toHaveBeenCalledWith("oro");
    expect(decirMock.mock.calls.some(([s]) => s === TAI_BANG_LE)).toBe(true);
  });

  it("morder lento (> 9 s) da bronce y dice 好; los toques antes de la frase no cuentan", async () => {
    const { pp, alTerminar } = montar("panzi", "lleno", "comer");
    fireEvent.pointerDown(pp, en(0.5, 0.5)); // todavía en la entrada
    await entrar();
    for (let i = 0; i < 6; i++) {
      await avanzar(1700);
      fireEvent.pointerDown(pp, en(0.5, 0.5));
    }
    await salir();
    expect(alTerminar).toHaveBeenCalledWith("bronce");
    expect(decirMock.mock.calls.some(([s]) => s === HAO)).toBe(true);
    expect(decirMock.mock.calls.some(([s]) => s === HEN_HAO)).toBe(false);
  });

  it("frotar: pointercancel a mitad del trazo y luego un trazo nuevo → alTerminar una sola vez", async () => {
    const { pp, alTerminar } = montar("panzi", "sucio", "lavar");
    await entrar();
    fireEvent.pointerDown(pp, en(0.1, 0.5));
    for (let i = 1; i <= 3; i++) fireEvent.pointerMove(pp, en(i % 2 ? 0.9 : 0.1, 0.5)); // 2,4 de 5
    fireEvent.pointerCancel(pp, en(0.1, 0.5));
    // después del cancel, mover sin apoyar de nuevo no frota
    for (let i = 0; i < 20; i++) fireEvent.pointerMove(pp, en(i % 2 ? 0.9 : 0.1, 0.5));
    await avanzar(100);
    expect(pp.dataset.fase).toBe("juega");
    expect(alTerminar).not.toHaveBeenCalled();

    fireEvent.pointerDown(pp, en(0.1, 0.5));
    for (let i = 0; i < 30; i++) fireEvent.pointerMove(pp, en(i % 2 ? 0.9 : 0.1, 0.5));
    fireEvent.pointerUp(pp, en(0.1, 0.5));
    await salir();
    // más frotes después de terminar no vuelven a llamar
    fireEvent.pointerDown(pp, en(0.1, 0.5));
    for (let i = 0; i < 30; i++) fireEvent.pointerMove(pp, en(i % 2 ? 0.9 : 0.1, 0.5));
    await salir();
    expect(alTerminar).toHaveBeenCalledTimes(1);
  });

  it("llenar: mantener 4 s rebalsa y no termina", async () => {
    const { pp, alTerminar } = montar("beizi", "vacio", "llenar");
    await entrar();
    fireEvent.pointerDown(pp, en(0.5, 0.5));
    await avanzar(4000);
    fireEvent.pointerUp(pp, en(0.5, 0.5));
    await salir();
    expect(pp.dataset.fase).toBe("juega");
    expect(alTerminar).not.toHaveBeenCalled();
  });

  it("llenar: mantener ~2,3 s y soltar → termina", async () => {
    const { pp, alTerminar } = montar("beizi", "vacio", "llenar");
    await entrar();
    fireEvent.pointerDown(pp, en(0.5, 0.5));
    await avanzar(2300);
    fireEvent.pointerUp(pp, en(0.5, 0.5));
    await salir();
    expect(alTerminar).toHaveBeenCalledTimes(1);
    expect(alTerminar).toHaveBeenCalledWith("oro");
  });

  it("el cartel muestra el verbo en hanzi y no hay texto en español", async () => {
    const { pp, accion } = montar("pingguo", "limpio", "cortar");
    await entrar();
    const hz = pp.querySelector("[data-texto]");
    expect(hz?.textContent).toBe(textoHanzi(accion.verbo));
    // fuera del pinyin, ninguna letra latina
    let texto = pp.textContent ?? "";
    for (const [, py] of accion.verbo) texto = texto.split(py).join("");
    expect(texto).not.toMatch(/[A-Za-zÁÉÍÓÚáéíóúñÑ]/);
  });

  it("al desmontarse vuelve la música de la cocina", async () => {
    const { unmount } = montar("guo", "vacio", "cocinar");
    await entrar();
    expect(musica.tocar).toHaveBeenCalledWith("g-girar");
    unmount();
    expect(musica.tocar).toHaveBeenLastCalledWith("cocina");
  });
  it("si decir rechaza, el juego igual empieza y termina", async () => {
    decirMock.mockImplementation(() => Promise.reject(new Error("sin audio")));
    const { pp, alTerminar } = montar("panzi", "lleno", "comer");
    await entrar();
    expect(pp.dataset.fase).toBe("juega");
    for (let i = 0; i < 6; i++) fireEvent.pointerDown(pp, en(0.5, 0.5));
    await salir();
    expect(alTerminar).toHaveBeenCalledWith("oro");
  });

  it("en la casa: 吃饺子 se juega en el primer plano y después el plato ofrece 洗", async () => {
    const alEvento = vi.fn();
    let elegir!: ReturnType<typeof useCasa>["elegir"];
    function Prueba() {
      const casa = useCasa(alEvento);
      elegir = casa.elegir;
      return <CasaVista casa={casa} />;
    }
    render(<Prueba />);
    const comer = accionDe("panzi", ESTADO_INICIAL, "comer");
    act(() => { void elegir("panzi", comer); });
    await avanzar(1000);
    await entrar();
    const pp = screen.getByTestId("primer-plano");
    expect(pp.dataset.gesto).toBe("morder");
    for (let i = 0; i < 6; i++) fireEvent.pointerDown(pp, en(0.5, 0.5));
    await salir();
    await avanzar(3000);
    expect(screen.queryByTestId("primer-plano")).toBeNull();
    const siguientes = within(screen.getByTestId("opciones")).getAllByRole("button");
    expect(siguientes.map((b) => b.getAttribute("aria-label"))).toEqual(["洗"]);
    expect(alEvento).toHaveBeenCalledWith("gesto_completo", { anim: "comer", medalla: "oro" });
  });
});
