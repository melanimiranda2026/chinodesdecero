import { entrarCasa, guardarEnCocina, LIVING_COMPLETO, pasarEntrada } from "./entrar";
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

import { sfx } from "@/components/casa/audio/sonido";
import { decir, desbloquearAudio } from "@/components/casa/audio/voz";
import { Casa, CasaVista } from "@/components/casa/Casa";
import { useCasa, type AlEvento, type CasaApi, type OpcionesCasa } from "@/components/casa/useCasa";
import { ANCLAS, FREGADERO, OBJETOS, junto } from "@/components/casa/cocina/datos";
import { acciones } from "@/components/casa/cocina/acciones";
import { ESTADO_INICIAL } from "@/components/casa/cocina/datos";
import { NI_HAO } from "@/components/casa/cocina/frases";
import { textoHanzi } from "@/lib/silabas";
import { CLAVE_AVANCE, EVENTO_AVANCE, avanceInicial, type Avance } from "@/components/casa/avance";
import { reiniciarEventos } from "@/components/casa/eventos";

const decirMock = vi.mocked(decir);

/** Monta la vista real y deja el hook a mano para llamar sus funciones. */
function montar(onEvento?: AlEvento, ganchos?: OpcionesCasa) {
  const api = { current: null } as MutableRefObject<CasaApi | null>;
  function Prueba() {
    const casa = useCasa(onEvento, ganchos);
    api.current = casa;
    return <CasaVista casa={casa} />;
  }
  const r = render(<Prueba />);
  return { ...r, api: () => api.current! };
}

const avanzar = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  decirMock.mockReset();
  decirMock.mockImplementation(() => Promise.resolve(true));
});
afterEach(() => {
  vi.useRealTimers();
});

describe("Casa", () => {
  it("tocar 杯子 dice su nombre y el globo muestra 杯 y bēi", async () => {
    guardarEnCocina();
    render(<Casa />);
    await pasarEntrada();
    entrarCasa();
    await avanzar(4000); // pasa el saludo
    decirMock.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "杯子" }));
    await avanzar(10);
    expect(decirMock).not.toHaveBeenCalled(); // primero el pop, después el mandarín
    await avanzar(400);
    expect(decirMock).toHaveBeenCalled();
    expect(decirMock.mock.calls[0][0]).toEqual(OBJETOS.beizi.nombre);
    // la voz de la casa dice de qué juego es (en la portada, la pestaña oculta no suena)
    expect(decirMock.mock.calls[0][1]?.juego).toBe("cocina");
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
    // 打开 deja el refri abierto y su primer plano esperando (la casa sigue ocupada); ✕ lo cierra
    expect(api().estado.bingxiang).toBe("abierto");
    expect(api().refri).toBe(true);
    act(() => api().elegirRefri(null));
    await act(async () => { await fin.catch(() => {}); });
    expect(api().ocupado).toBe(false);
    expect(api().estado.bingxiang).toBe("cerrado");
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
    guardarEnCocina();
    render(<Casa onEvento={(n) => { if (n === "tocar_objeto") throw new Error("analítica caída"); }} />);
    await pasarEntrada();
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
    // la llave sale del dibujo isométrico (u 0.75, v 3, altura 3.05) y cae sobre el lavaplatos
    expect(ANCLAS.llave).toEqual({ x: 401, y: 320.5 });
    expect(ANCLAS.llave.y).toBeLessThan(FREGADERO.y);
    expect(junto(OBJETOS.chahu, ANCLAS.picoTetera)).toEqual({ x: OBJETOS.chahu.x + 24, y: OBJETOS.chahu.y - 6 });
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
    entrarCasa();
    expect(screen.getByText("Lo acabas de hacer")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Seguir explorando" }));
    expect(api().quiz).toBeNull();
    expect(screen.getByText("Este cuarto abre pronto. Deja tu correo y marca la casilla: te avisamos.")).toBeTruthy();
  });

  it("tocar un cuarto bloqueado del minimapa abre la tarjeta pronto", () => {
    montar();
    entrarCasa();
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
    expect(container.querySelector("[inert]")).toBeNull();
    entrarCasa();
    fireEvent.click(screen.getByRole("button", { name: "卧室 🔒" }));
    expect(container.querySelector("[inert]")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(container.querySelector("[inert]")).toBeNull();
  });

  it("se puede tocar un objeto sin apretar Jugar", async () => {
    montar();
    expect(screen.queryByRole("button", { name: "Jugar" })).toBeNull();
    expect(document.querySelector('[data-capa="entrada"]')).toBeNull();
    decirMock.mockClear();
    const objeto = screen.getByRole("button", { name: "杯子" });
    fireEvent.pointerDown(objeto); // el mismo toque arranca la casa y llega al objeto
    fireEvent.click(objeto);
    await avanzar(3000);
    expect(decirMock.mock.calls.some((c) => c[0] === OBJETOS.beizi.nombre)).toBe(true);
  });

  it("primer click (teclado) en 杯子: gana el objeto, el saludo se salta", async () => {
    guardarEnCocina();
    render(<Casa />);
    await pasarEntrada();
    fireEvent.click(screen.getByRole("button", { name: "杯子" }));
    await avanzar(1000);
    const llamadas = decirMock.mock.calls.map((c) => c[0]);
    expect(llamadas[llamadas.length - 1]).toEqual(OBJETOS.beizi.nombre);
    expect(llamadas).not.toContainEqual(NI_HAO);
    const globo = screen.getByTestId("globo");
    expect(within(globo).getByText("杯")).toBeTruthy();
    expect(within(globo).getByText("bēi")).toBeTruthy();
    await avanzar(3000);
    expect(decirMock.mock.calls.map((c) => c[0])).not.toContainEqual(NI_HAO);
  });

  it("primer toque (pointerdown + click en el mismo instante) en 杯子: gana el objeto", async () => {
    guardarEnCocina();
    render(<Casa />);
    await pasarEntrada();
    const o = screen.getByRole("button", { name: "杯子" });
    fireEvent.pointerDown(o);
    fireEvent.click(o);
    await avanzar(1000);
    const llamadas = decirMock.mock.calls.map((c) => c[0]);
    expect(llamadas[llamadas.length - 1]).toEqual(OBJETOS.beizi.nombre);
    expect(llamadas).not.toContainEqual(NI_HAO);
    expect(within(screen.getByTestId("globo")).getByText("杯")).toBeTruthy();
  });

  it("primer toque en el piso vacío: la vaca saluda 你好", async () => {
    guardarEnCocina();
    render(<Casa />);
    await pasarEntrada();
    entrarCasa();
    await avanzar(1000);
    expect(decirMock.mock.calls[0][0]).toEqual(NI_HAO);
  });

  it("con teclado (click sin pointerdown) también entra: audio y saludo", async () => {
    decirMock.mockClear();
    vi.mocked(desbloquearAudio).mockClear();
    montar();
    fireEvent.click(screen.getByRole("button", { name: "杯子" }));
    expect(desbloquearAudio).toHaveBeenCalledTimes(1);
    await avanzar(3000);
    expect(decirMock.mock.calls.length).toBeGreaterThan(0);
  });

  it("el primer toque desbloquea el audio y la vaca saluda, una sola vez", async () => {
    vi.mocked(desbloquearAudio).mockClear();
    montar();
    entrarCasa();
    entrarCasa();
    expect(desbloquearAudio).toHaveBeenCalledTimes(1);
    await avanzar(600);
    expect(decirMock.mock.calls.length).toBeGreaterThan(0); // la vaca saluda
  });
});

describe("Casa: objetos nuevos", () => {
  const dichas = () => decirMock.mock.calls.map((c) => textoHanzi(c[0]));
  const despues = (a: string, b: string) => {
    const l = dichas();
    const i = l.lastIndexOf(a);
    expect(i, `dijo ${a}`).toBeGreaterThanOrEqual(0);
    expect(l.slice(i + 1), `${b} después de ${a}`).toContain(b);
  };

  it("apagar la lámpara oscurece el escenario y encenderla lo aclara", async () => {
    const { api } = montar();
    expect(document.querySelector("[data-oscura]")).toBeNull();
    act(() => { void api().elegir("deng", acciones("deng", api().estado)[0]); });
    await avanzar(4000);
    expect(api().estado.deng).toBe("apagada");
    const oscuro = document.querySelector("[data-oscura]");
    expect(oscuro).toBeTruthy();
    expect(oscuro!.className).toMatch(/escenario/);
    act(() => { void api().elegir("deng", acciones("deng", api().estado)[0]); });
    await avanzar(4000);
    expect(api().estado.deng).toBe("encendida");
    expect(document.querySelector("[data-oscura]")).toBeNull();
  });

  it("durante el 玩 la cocina no está oscura aunque la lámpara esté apagada", async () => {
    const { api } = montar();
    act(() => api().restaurar({ ...ESTADO_INICIAL, deng: "apagada" }));
    expect(document.querySelector("[data-oscura]")).toBeTruthy();
    expect(document.querySelector("div[class*=oscuro]")).toBeTruthy();
    act(() => api().empezarQuiz());
    await avanzar(800);
    expect(api().quiz).not.toBeNull();
    expect(document.querySelector("[data-oscura]")).toBeNull();
    expect(document.querySelector("div[class*=oscuro]")).toBeNull();
  });

  it("el pájaro se queda posado mientras la ventana está abierta y vuelve a entrar al reabrirla", async () => {
    const { api } = montar();
    const pajaro = () => document.querySelector("[data-objeto='chuanghu'] [data-capa='pajaro']");
    act(() => { void api().elegir("chuanghu", acciones("chuanghu", api().estado)[0]); });
    await avanzar(10000);
    expect(api().estado.chuanghu).toBe("abierta");
    expect(pajaro()).toBeTruthy();
    act(() => { void api().elegir("chuanghu", acciones("chuanghu", api().estado)[0]); });
    await avanzar(4000);
    expect(api().estado.chuanghu).toBe("cerrada");
    expect(pajaro()).toBeNull();
    act(() => { void api().elegir("chuanghu", acciones("chuanghu", api().estado)[0]); });
    await avanzar(1500);
    const nuevo = pajaro();
    expect(nuevo).toBeTruthy();
    await avanzar(8000);
    expect(pajaro()).toBe(nuevo); // ningún temporizador viejo lo saca
  });

  it("tocar la cola del gato (en el refri): 猫, encontrar_gato y a los 3 s se va a la mesa", async () => {
    const eventos: string[] = [];
    const { api } = montar((n) => { eventos.push(n); });
    const gato = screen.getByRole("button", { name: "猫" });
    expect(gato.querySelector("[data-capa='cola']")).toBeTruthy();
    expect(gato.querySelector("[data-capa='gato']")).toBeNull();
    fireEvent.click(gato);
    await avanzar(600);
    expect(dichas()).toContain("猫");
    expect(eventos).toContain("encontrar_gato");
    expect(screen.getByRole("button", { name: "猫" }).querySelector("[data-capa='gato']")).toBeTruthy();
    expect(api().estado.mao).toBe("refri");
    await avanzar(3000);
    expect(api().estado.mao).toBe("mesa");
    expect(screen.getByRole("button", { name: "猫" }).querySelector("[data-capa='cola']")).toBeTruthy();
  });

  it("con el gato en el basurero no se ve; al abrir el tarro sale", async () => {
    const { api } = montar();
    act(() => api().restaurar({ ...ESTADO_INICIAL, mao: "lajitong" }));
    expect(screen.queryByRole("button", { name: "猫" })).toBeNull();
    act(() => { void api().elegir("lajitong", acciones("lajitong", api().estado)[0]); });
    await avanzar(1800);
    expect(screen.getByRole("button", { name: "猫" }).querySelector("[data-capa='gato']")).toBeTruthy();
    await avanzar(4000);
    despues("我打开垃圾桶", "猫"); // 猫 después de la frase de la acción
    expect(api().estado.mao).toBe("refri"); // la ventana está cerrada: se salta chuanghu
  });

  it("comer el arroz a las 8: 我吃早饭 y luego 很好吃", async () => {
    const { api } = montar(undefined, { hora: () => 8 });
    act(() => api().restaurar({ ...ESTADO_INICIAL, wan: "lleno" }));
    act(() => { void api().soltarObjetoEnVaca("wan"); });
    await avanzar(3000);
    fireEvent.click(within(screen.getByTestId("opciones")).getByRole("button", { name: "吃饭" }));
    await avanzar(1500); // abre el primer plano
    await avanzar(1500); // el primer plano dice la frase al entrar
    expect(api().primerPlano?.objeto).toBe("wan");
    expect(dichas()).toContain("我吃早饭");
    expect(dichas()).not.toContain("很好吃");
    act(() => api().terminarPrimerPlano("oro"));
    await avanzar(3000);
    despues("我吃早饭", "很好吃");
  });

  it("tocar la tetera: 茶壶 y luego 很热", async () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "茶壶" }));
    await avanzar(3000);
    despues("茶壶", "很热");
  });

  it("un toque rápido mientras suena la tetera no pone el pop encima del mandarín", async () => {
    montar();
    decirMock.mockImplementation(() => new Promise((r) => setTimeout(() => r(true), 2000))); // el mandarín dura
    fireEvent.click(screen.getByRole("button", { name: "茶壶" }));
    await avanzar(500); // ya pasó el pop y la vaca está diciendo 茶壶
    expect(sfx).toHaveBeenCalledWith("pop", "cocina");
    vi.mocked(sfx).mockClear();
    decirMock.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "猫" }));
    await avanzar(10);
    expect(sfx).not.toHaveBeenCalledWith("pop", expect.anything());
    await avanzar(3000);
    expect(dichas()).toContain("猫");
  });

  it("beber café es la animación de la casa (sin primer plano): 我喝咖啡 y luego 很热", async () => {
    const { api } = montar();
    act(() => api().restaurar({ ...ESTADO_INICIAL, kafeibei: "cafe" }));
    act(() => { void api().elegir("kafeibei", acciones("kafeibei", api().estado)[0]); });
    await avanzar(800);
    expect(api().primerPlano).toBeNull();
    await avanzar(4000);
    expect(api().estado.kafeibei).toBe("sucio");
    despues("我喝咖啡", "很热");
  });

  it("beber té (primer plano): 我喝茶 y, al terminar, 很热; el agua no", async () => {
    const { api } = montar();
    act(() => api().restaurar({ ...ESTADO_INICIAL, beizi: "te" }));
    act(() => { void api().elegir("beizi", acciones("beizi", api().estado)[0]); });
    await avanzar(1500);
    await avanzar(1500);
    expect(api().primerPlano?.accion.anim).toBe("beber");
    act(() => api().terminarPrimerPlano("oro"));
    await avanzar(3000);
    despues("我喝茶", "很热");

    decirMock.mockClear();
    act(() => api().restaurar({ ...ESTADO_INICIAL, beizi: "agua" }));
    act(() => { void api().elegir("beizi", acciones("beizi", api().estado)[0]); });
    await avanzar(1500);
    await avanzar(1500);
    act(() => api().terminarPrimerPlano("oro"));
    await avanzar(3000);
    expect(dichas()).toContain("我喝水");
    expect(dichas()).not.toContain("很热");
  });

  it("llamar por teléfono: 我打电话 y luego 喂", async () => {
    const { api } = montar();
    act(() => { void api().elegir("shouji", acciones("shouji", api().estado)[0]); });
    await avanzar(6000);
    despues("我打电话", "喂");
    expect(api().ocupado).toBe(false);
    expect(api().posiciones.shouji).toBeUndefined();
  });

  it("sentarse: la vaca queda sentada un rato y luego se para", async () => {
    const { api } = montar();
    act(() => { void api().elegir("yizi", acciones("yizi", api().estado)[0]); });
    await avanzar(1500);
    expect(api().cara.sentada).toBe(true);
    await avanzar(4000);
    expect(api().cara.sentada).toBe(false);
    expect(api().ocupado).toBe(false);
  });
});

describe("Casa: la entrada y la puerta del living", () => {
  const enLiving = () => document.querySelector("[data-living]") !== null;
  const enCocina = () => document.querySelector('[data-objeto="beizi"]') !== null;
  /** La puerta del living (el minimapa también tiene un 厨房). */
  const puerta = () => document.querySelector<HTMLElement>("[data-puerta]")!;
  const guardar = (a: Partial<Avance>) => localStorage.setItem(CLAVE_AVANCE, JSON.stringify({ ...avanceInicial(), ...a }));
  const LIVING_SIN_UNA_SILLA = { tocados: LIVING_COMPLETO.tocados, logros: LIVING_COMPLETO.logros.filter((l) => l !== "zuo@yizi") };
  /** Hace 坐 en la silla: lo único que le falta a LIVING_SIN_UNA_SILLA. */
  const sentarseEnLaSilla = async () => {
    fireEvent.click(screen.getByRole("button", { name: "椅子" }));
    await avanzar(400);
    fireEvent.click(screen.getByRole("button", { name: "坐" }));
    await avanzar(5000);
  };

  beforeEach(() => {
    localStorage.clear();
    reiniciarEventos();
  });

  it("sin avance: primero la casa entera, luego el living; en el minimapa la cocina está cerrada", async () => {
    render(<Casa />);
    expect(document.querySelector("[data-entrada]")).not.toBeNull();
    expect(enLiving()).toBe(false);
    expect(enCocina()).toBe(false);
    await pasarEntrada();
    expect(document.querySelector("[data-entrada]")).toBeNull();
    expect(enLiving()).toBe(true);
    expect(document.querySelector('[data-cuarto="cocina"]')!.getAttribute("data-bloqueado")).toBe("true");
    expect(document.querySelector('[data-cuarto="living"]')!.getAttribute("aria-current")).toBe("true");
    // el reloj solar del living (lo pone el motor)
    expect(document.querySelectorAll('[role="img"][aria-label="早上"]').length).toBe(1);
  });

  it("avance antiguo con correo y el living completo: tras la entrada, la cocina con su reloj a mediodía (Review Focus 1)", async () => {
    guardarEnCocina();
    render(<Casa />);
    await pasarEntrada();
    expect(enCocina()).toBe(true);
    expect(enLiving()).toBe(false);
    expect(document.querySelector('[data-cuarto="cocina"]')!.getAttribute("data-bloqueado")).toBeNull();
    expect(screen.getByRole("img", { name: "中午" })).toBeTruthy();
  });

  it("avance antiguo con correo y el living vacío: living; al completarlo la puerta lleva a la cocina sin pedir correo (Review Focus 1)", async () => {
    guardar({ correo: "vaca@ejemplo.com", cuartos: { living: LIVING_SIN_UNA_SILLA } });
    const eventos: string[] = [];
    render(<Casa onEvento={(n) => { eventos.push(n); }} />);
    await pasarEntrada();
    expect(enLiving()).toBe(true);
    // a medio living la cocina sigue cerrada en el minimapa
    expect(document.querySelector('[data-cuarto="cocina"]')!.getAttribute("data-bloqueado")).toBe("true");
    await sentarseEnLaSilla();
    expect(eventos).toContain("cuarto_completo");
    expect(document.querySelector('[data-cuarto="cocina"]')!.getAttribute("data-bloqueado")).toBeNull();
    fireEvent.click(puerta());
    expect(document.querySelector('[data-capa="salida"]')).toBeNull();
    expect(eventos).toContain("salir_cuarto");
    expect(eventos).not.toContain("pedir_correo_salida");
    expect(enCocina()).toBe(true);
    expect(document.querySelector("[data-fundido]")).not.toBeNull();
  });

  it("living completo sin correo: la puerta abre la capa salida; al dejar el correo se cierra y pasa a la cocina (Review Focus 4)", async () => {
    guardar({ cuartos: { living: LIVING_COMPLETO } });
    const eventos: string[] = [];
    render(<Casa onEvento={(n) => { eventos.push(n); }} />);
    await pasarEntrada();
    expect(enLiving()).toBe(true);
    fireEvent.click(puerta());
    expect(eventos).toContain("pedir_correo_salida");
    const capa = document.querySelector('[data-capa="salida"]')!;
    expect(capa).not.toBeNull();
    expect(within(capa as HTMLElement).getByText("Guarda tu avance para seguir a la cocina")).toBeTruthy();
    expect(within(capa as HTMLElement).getByRole("textbox")).toBeTruthy();
    expect(enLiving()).toBe(true);
    // el formulario avisa con el correo apenas el servidor lo acepta, sin esperar que confirme el enlace
    act(() => { window.dispatchEvent(new CustomEvent(EVENTO_AVANCE, { detail: { correo: "vaca@ejemplo.com" } })); });
    expect(document.querySelector('[data-capa="salida"]')).toBeNull();
    expect(enCocina()).toBe(true);
    expect(enLiving()).toBe(false);
  });

  it("living completo: si /api/suscribir falla (503), el correo válido igual abre la cocina (nunca sin salida)", async () => {
    guardar({ cuartos: { living: LIVING_COMPLETO } });
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response('{"error":"configuracion"}', { status: 503 }));
    render(<Casa />);
    await pasarEntrada();
    fireEvent.click(puerta());
    const capa = document.querySelector('[data-capa="salida"]') as HTMLElement;
    fireEvent.change(within(capa).getByRole("textbox"), { target: { value: "vaca@ejemplo.com" } });
    await act(async () => {
      fireEvent.submit(capa.querySelector("form")!);
      await avanzar(10);
    });
    expect(f).toHaveBeenCalled();
    expect(document.querySelector('[data-capa="salida"]')).toBeNull();
    expect(enCocina()).toBe(true);
    f.mockRestore();
  });

  it("un toque salta la entrada: es el primer toque (audio) y, si queda en la cocina, la vaca saluda 你好", async () => {
    vi.mocked(desbloquearAudio).mockClear();
    guardarEnCocina();
    render(<Casa />);
    await avanzar(10);
    fireEvent.click(document.querySelector<HTMLElement>("[data-entrada]")!);
    expect(desbloquearAudio).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[data-entrada]")).toBeNull();
    expect(enCocina()).toBe(true);
    await avanzar(1000);
    expect(decirMock.mock.calls.map((c) => c[0])).toContainEqual(NI_HAO);
  });

  it("saltar la entrada hacia el living: la vaca de la cocina no saluda", async () => {
    render(<Casa />);
    await avanzar(10);
    fireEvent.click(document.querySelector<HTMLElement>("[data-entrada]")!);
    expect(enLiving()).toBe(true);
    await avanzar(1000);
    expect(decirMock.mock.calls.map((c) => c[0])).not.toContainEqual(NI_HAO);
  });

  it("la capa salida se puede cerrar sin dejar el correo: se sigue en el living", async () => {
    guardar({ cuartos: { living: LIVING_COMPLETO } });
    render(<Casa />);
    await pasarEntrada();
    fireEvent.click(puerta());
    fireEvent.click(within(document.querySelector('[data-capa="salida"]') as HTMLElement).getByRole("button", { name: "Cerrar" }));
    expect(document.querySelector('[data-capa="salida"]')).toBeNull();
    expect(enLiving()).toBe(true);
  });

  const cocinaMapa = () => document.querySelector<HTMLElement>('[data-cuarto="cocina"]')!;
  const TEXTO_PRONTO = "Este cuarto abre pronto. Deja tu correo y marca la casilla: te avisamos.";

  it("厨房 cerrado en el minimapa desde el living: boing y la bandeja parpadea, sin tarjeta pronto", async () => {
    render(<Casa />);
    await pasarEntrada();
    entrarCasa();
    vi.mocked(sfx).mockClear();
    fireEvent.click(cocinaMapa());
    expect(screen.queryByText(TEXTO_PRONTO)).toBeNull();
    expect(vi.mocked(sfx).mock.calls.filter(([n]) => n === "boing").length).toBe(1);
    expect(document.querySelector("[data-parpadea]")).not.toBeNull();
    expect(enLiving()).toBe(true);
  });

  it("厨房 cerrado en el minimapa mientras suena el nombre: sin boing, la bandeja parpadea igual", async () => {
    render(<Casa />);
    await pasarEntrada();
    entrarCasa();
    fireEvent.click(screen.getByRole("button", { name: "沙发" }));
    vi.mocked(sfx).mockClear();
    fireEvent.click(cocinaMapa());
    expect(vi.mocked(sfx).mock.calls.filter(([n]) => n === "boing").length).toBe(0);
    expect(document.querySelector("[data-parpadea]")).not.toBeNull();
    expect(screen.queryByText(TEXTO_PRONTO)).toBeNull();
  });

  it("living completo sin correo: 厨房 en el minimapa abre la capa salida, no la de pronto", async () => {
    guardar({ cuartos: { living: LIVING_COMPLETO } });
    render(<Casa />);
    await pasarEntrada();
    fireEvent.click(cocinaMapa());
    expect(document.querySelector('[data-capa="salida"]')).not.toBeNull();
    expect(screen.queryByText(TEXTO_PRONTO)).toBeNull();
  });

  it("卧室 y 浴室 cerrados desde el living siguen abriendo la tarjeta pronto", async () => {
    render(<Casa />);
    await pasarEntrada();
    fireEvent.click(screen.getByRole("button", { name: "卧室 🔒" }));
    expect(screen.getByText(TEXTO_PRONTO)).toBeTruthy();
  });
});
