import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
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
import { sfx } from "@/components/casa/audio/sonido";
import { CuartoMotor } from "@/components/casa/motor/CuartoMotor";
import { ARTE_VACA_SENTADA } from "@/components/casa/arte/registro";
import { BORDE } from "@/components/casa/Vaca";
import { PASO_MS, POSE_MS } from "@/components/casa/motor/useCuarto";
import { fichaId, progresoVacio } from "@/components/casa/motor/progreso";
import type { DefCuarto, ProgresoCuarto } from "@/components/casa/motor/tipos";
import { S, textoHanzi, type Silaba } from "@/lib/silabas";

const SOFA = S("沙发", "shā fā", "11");
const SILLA = S("椅子", "yǐ zi", "35");
const MESA = S("桌子", "zhuō zi", "15");
const ZUO = S("坐", "zuò", "4");
const WO_ZUO_XIA = S("我坐下", "wǒ zuò xià", "344");

/** Cuarto chico de prueba: dos asientos con 坐 y una mesa que se abre. */
const DEF: DefCuarto = {
  id: "living",
  hora: [7, 11],
  salida: "cocina",
  objetos: [
    { id: "shafa", nombre: SOFA, zona: { x: 500, y: 300, w: 200, h: 120 }, pie: { x: 560, y: 520 }, asiento: { x: 600, y: 380 }, acciones: ["zuo"] },
    { id: "yizi", nombre: SILLA, zona: { x: 420, y: 650, w: 100, h: 100 }, pie: { x: 470, y: 820 }, acciones: ["zuo"] },
    { id: "zhuozi", nombre: MESA, zona: { x: 380, y: 450, w: 250, h: 150 }, pie: { x: 330, y: 700 }, acciones: [], abre: "mesa" },
  ],
  acciones: [{ id: "zuo", verbo: ZUO, frase: WO_ZUO_XIA, icono: "🪑", pose: "sentada" }],
};
const COMPLETO: ProgresoCuarto = { tocados: ["shafa", "yizi", "zhuozi"], logros: ["zuo@shafa", "zuo@yizi"] };

const avanzar = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

/** Monta el cuarto con el progreso guardado afuera (como lo hará Casa). */
function montar(inicial: ProgresoCuarto = progresoVacio()) {
  const alCambiar = vi.fn<(p: ProgresoCuarto, nuevas: string[]) => void>();
  const alEvento = vi.fn();
  const alSalir = vi.fn();
  const alAbrir = vi.fn();
  let setActivo: (a: boolean) => void = () => {};
  function Con() {
    const [p, setP] = useState(inicial);
    const [activo, setA] = useState(true);
    setActivo = setA;
    return (
      <CuartoMotor
        def={DEF}
        progreso={p}
        activo={activo}
        alCambiar={(n, nuevas) => {
          alCambiar(n, nuevas);
          setP(n);
        }}
        alEvento={alEvento}
        alSalir={alSalir}
        alAbrir={alAbrir}
      />
    );
  }
  const r = render(<Con />);
  return { ...r, alCambiar, alEvento, alSalir, alAbrir, desactivar: () => act(() => setActivo(false)) };
}

const zona = (hz: string) => screen.getByRole("button", { name: hz });
const pildora = (hz = "坐") => screen.getByRole("button", { name: hz });
const vaca = (c: HTMLElement) => c.querySelector<HTMLElement>("[data-vaca]")!;
const llamadasFrase = (s: Silaba[]) => vi.mocked(decir).mock.calls.filter(([x]) => textoHanzi(x) === textoHanzi(s)).length;
const ultimo = (f: ReturnType<typeof vi.fn>) => f.mock.calls[f.mock.calls.length - 1];

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(decir).mockReset();
  vi.mocked(decir).mockImplementation(() => Promise.resolve(true));
  vi.mocked(callar).mockClear();
  vi.mocked(sfx).mockClear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("CuartoMotor", () => {
  it("tocar un objeto: lo marca tocado, gana la ficha del sustantivo y la vaca dice 这是 + nombre", async () => {
    const { alCambiar, container } = montar();
    fireEvent.click(zona("沙发"));
    expect(alCambiar).toHaveBeenCalledTimes(1);
    const [p, nuevas] = ultimo(alCambiar);
    expect(p.tocados).toEqual(["shafa"]);
    expect(nuevas).toEqual([fichaId(SOFA)]);
    expect(sfx).toHaveBeenCalledWith("pop", "cocina");
    await avanzar(400);
    expect(decir).toHaveBeenCalledWith(S("这是沙发", "zhè shì shā fā", "4411"), expect.anything());
    // la ficha ganada gira al centro y luego se guarda en la bandeja
    expect(container.querySelector("[data-ficha-ganada]")).not.toBeNull();
    // aparece la píldora del verbo, sin pinyin
    expect(pildora().textContent).toContain("坐");
    expect(pildora().textContent).not.toContain("zuò");
    // tocarlo de nuevo no gana nada nuevo
    fireEvent.click(zona("沙发"));
    expect(alCambiar).toHaveBeenCalledTimes(1);
  });

  it("hacer 坐 en un asiento y luego en el otro: la ficha 坐 se gana solo la segunda vez", async () => {
    const { alCambiar, alEvento } = montar();
    fireEvent.click(zona("沙发"));
    await avanzar(400);
    fireEvent.click(pildora());
    await avanzar(PASO_MS + POSE_MS + 100);
    let [p, nuevas] = ultimo(alCambiar);
    expect(p.logros).toEqual(["zuo@shafa"]);
    expect(nuevas).toEqual([]);
    expect(alEvento).toHaveBeenCalledWith("accion_lograda", { cuarto: "living", accion: "zuo", objeto: "shafa" });

    fireEvent.click(zona("椅子"));
    await avanzar(400);
    fireEvent.click(pildora());
    await avanzar(PASO_MS + POSE_MS + 100);
    [p, nuevas] = ultimo(alCambiar);
    expect(p.logros).toEqual(["zuo@shafa", "zuo@yizi"]);
    expect(nuevas).toEqual([fichaId(ZUO)]);
    expect(alEvento).toHaveBeenCalledWith("ficha_ganada", { cuarto: "living", ficha: fichaId(ZUO) });
  });

  it("la pose sentada llega después de que termina la frase, no antes", async () => {
    let terminar: (v: boolean) => void = () => {};
    vi.mocked(decir).mockImplementation((s) =>
      textoHanzi(s) === "我坐下" ? new Promise<boolean>((r) => { terminar = r; }) : Promise.resolve(true),
    );
    const { container, alCambiar } = montar();
    fireEvent.click(zona("沙发"));
    await avanzar(400);
    fireEvent.click(pildora());
    // la vaca camina al pie del sofá
    expect(parseFloat(vaca(container).style.left)).toBeCloseTo(56, 2);
    await avanzar(PASO_MS);
    expect(llamadasFrase(WO_ZUO_XIA)).toBe(1);
    await avanzar(1000);
    expect(vaca(container).getAttribute("data-pose")).toBeNull();
    expect(ultimo(alCambiar)[0].logros).toEqual([]);
    await act(async () => { terminar(true); });
    expect(vaca(container).getAttribute("data-pose")).toBe("sentada");
    expect(ultimo(alCambiar)[0].logros).toEqual(["zuo@shafa"]);
    await avanzar(POSE_MS);
    expect(vaca(container).getAttribute("data-pose")).toBeNull();
  });

  it("dos clics en la píldora o un toque durante la caminata: un solo logro y una sola frase", async () => {
    const { alCambiar } = montar();
    fireEvent.click(zona("沙发"));
    await avanzar(400);
    const p = pildora();
    fireEvent.click(p);
    fireEvent.click(p);
    const antes = alCambiar.mock.calls.length;
    fireEvent.click(zona("椅子")); // durante la caminata: nada
    expect(alCambiar.mock.calls.length).toBe(antes);
    await avanzar(PASO_MS + POSE_MS + 1000);
    expect(llamadasFrase(WO_ZUO_XIA)).toBe(1);
    const logros = alCambiar.mock.calls.filter(([x]) => x.logros.length > 0);
    expect(logros.length).toBe(1);
    expect(ultimo(alCambiar)[0].tocados).toEqual(["shafa"]);
  });

  it("activo pasa a false a mitad de la caminata: se calla, queda libre, sin pose y sin logro", async () => {
    const { container, alCambiar, desactivar } = montar();
    fireEvent.click(zona("沙发"));
    await avanzar(400);
    fireEvent.click(pildora());
    await avanzar(PASO_MS / 2);
    vi.mocked(callar).mockClear();
    desactivar();
    expect(callar).toHaveBeenCalled();
    await avanzar(PASO_MS + POSE_MS + 1000);
    expect(llamadasFrase(WO_ZUO_XIA)).toBe(0);
    expect(vaca(container).getAttribute("data-pose")).toBeNull();
    expect(container.querySelector("[data-cuarto-motor]")!.getAttribute("data-ocupado")).toBeNull();
    expect(alCambiar.mock.calls.every(([x]) => x.logros.length === 0)).toBe(true);
  });

  it("la puerta: cerrada hace boing y parpadea la bandeja; completa lleva a la salida; cuarto_completo una vez", async () => {
    const { alSalir, alEvento, container } = montar({ tocados: ["shafa", "yizi", "zhuozi"], logros: ["zuo@shafa"] });
    const puerta = screen.getByRole("button", { name: "厨房" });
    fireEvent.click(puerta);
    expect(alSalir).not.toHaveBeenCalled();
    expect(sfx).toHaveBeenCalledWith("boing", "cocina");
    expect(container.querySelector("[data-parpadea]")).not.toBeNull();

    fireEvent.click(zona("椅子"));
    await avanzar(400);
    fireEvent.click(pildora());
    await avanzar(PASO_MS + POSE_MS + 100);
    expect(alEvento.mock.calls.filter(([n]) => n === "cuarto_completo")).toEqual([["cuarto_completo", { cuarto: "living" }]]);
    expect(puerta.getAttribute("data-lista")).toBe("true");
    fireEvent.click(puerta);
    expect(alSalir).toHaveBeenCalledTimes(1);
    // tocar más cosas no lo vuelve a emitir
    fireEvent.click(zona("沙发"));
    await avanzar(400);
    expect(alEvento.mock.calls.filter(([n]) => n === "cuarto_completo").length).toBe(1);
  });

  it("la puerta cerrada no hace boing mientras suena el mandarín (frase o nombre), pero la bandeja parpadea igual", async () => {
    vi.mocked(decir).mockImplementation((s) =>
      textoHanzi(s) === "我坐下" ? new Promise<boolean>(() => {}) : Promise.resolve(true),
    );
    const { container } = montar();
    fireEvent.click(zona("沙发"));
    // durante la espera del pop, antes del nombre: tampoco
    fireEvent.click(screen.getByRole("button", { name: "厨房" }));
    expect(sfx).not.toHaveBeenCalledWith("boing", expect.anything());
    await avanzar(400);
    fireEvent.click(pildora());
    await avanzar(PASO_MS + 100); // la frase queda sonando
    vi.mocked(sfx).mockClear();
    fireEvent.click(screen.getByRole("button", { name: "厨房" }));
    expect(sfx).not.toHaveBeenCalledWith("boing", expect.anything());
    expect(container.querySelector("[data-parpadea]")).not.toBeNull();
    expect(vi.mocked(sfx).mock.calls.filter(([n]) => n === "boing").length).toBe(0);
  });

  it("la puerta cerrada no hace boing durante la caminata (a la mesa o a una acción), pero la bandeja parpadea", async () => {
    const { container } = montar();
    fireEvent.click(zona("桌子"));
    await avanzar(400); // dijo 这是桌子 y camina a la mesa
    expect(container.querySelector("[data-cuarto-motor]")!.getAttribute("data-ocupado")).toBe("true");
    vi.mocked(sfx).mockClear();
    fireEvent.click(screen.getByRole("button", { name: "厨房" }));
    expect(sfx).not.toHaveBeenCalledWith("boing", expect.anything());
    expect(container.querySelector("[data-parpadea]")).not.toBeNull();
  });

  it("desmontar justo después de tocar: no dice el nombre, no abre y se calla", async () => {
    const { alAbrir, unmount } = montar();
    fireEvent.click(zona("桌子"));
    vi.mocked(callar).mockClear();
    unmount();
    expect(callar).toHaveBeenCalled();
    await avanzar(1000);
    expect(llamadasFrase(S("这是桌子", "zhè shì zhuō zi", "4415"))).toBe(0);
    expect(alAbrir).not.toHaveBeenCalled();
  });

  it("con el progreso ya completo la puerta lleva a la salida y no se vuelve a emitir cuarto_completo", () => {
    const { alSalir, alEvento } = montar(COMPLETO);
    fireEvent.click(screen.getByRole("button", { name: "厨房" }));
    expect(alSalir).toHaveBeenCalledTimes(1);
    expect(alEvento).not.toHaveBeenCalledWith("cuarto_completo", expect.anything());
  });

  it("un objeto con `abre`: después de decir su nombre la vaca camina a su pie y recién ahí llama alAbrir", async () => {
    const { alAbrir, container } = montar();
    fireEvent.click(zona("桌子"));
    expect(alAbrir).not.toHaveBeenCalled();
    await avanzar(400);
    expect(llamadasFrase(S("这是桌子", "zhè shì zhuō zi", "4415"))).toBe(1);
    expect(alAbrir).not.toHaveBeenCalled();
    expect(parseFloat(vaca(container).style.left)).toBeCloseTo(33, 2);
    expect(parseFloat(vaca(container).style.top)).toBeCloseTo(70, 2);
    // caminando: otro toque no hace nada
    expect(container.querySelector("[data-cuarto-motor]")!.getAttribute("data-ocupado")).toBe("true");
    fireEvent.click(zona("沙发"));
    await avanzar(PASO_MS);
    expect(alAbrir).toHaveBeenCalledTimes(1);
    expect(alAbrir).toHaveBeenCalledWith("mesa");
    expect(llamadasFrase(SOFA)).toBe(0);
    expect(container.querySelector("[data-cuarto-motor]")!.getAttribute("data-ocupado")).toBeNull();
  });

  it("un objeto con `abre` y movimiento reducido: sin caminata, se abre apenas termina el nombre", async () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce"), media: q, addEventListener() {}, removeEventListener() {} }));
    try {
      const { alAbrir } = montar();
      fireEvent.click(zona("桌子"));
      await avanzar(400);
      expect(alAbrir).toHaveBeenCalledWith("mesa");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("activo pasa a false mientras camina hacia un objeto con `abre`: no se abre", async () => {
    const { alAbrir, desactivar, container } = montar();
    fireEvent.click(zona("桌子"));
    await avanzar(400);
    desactivar();
    await avanzar(PASO_MS + 100);
    expect(alAbrir).not.toHaveBeenCalled();
    expect(container.querySelector("[data-cuarto-motor]")!.getAttribute("data-ocupado")).toBeNull();
  });

  /** decir como el de verdad: una frase nueva corta la que suena (la anterior resuelve). */
  function vozQueCorta() {
    let actual: ((v: boolean) => void) | null = null;
    vi.mocked(decir).mockImplementation(() => {
      actual?.(true);
      return new Promise<boolean>((r) => { actual = r; });
    });
    return () => act(async () => { const r = actual; actual = null; r?.(true); });
  }
  const ZHE_SHI_ZHUOZI = S("这是桌子", "zhè shì zhuō zi", "4415");
  const ZHE_SHI_SHAFA = S("这是沙发", "zhè shì shā fā", "4411");

  it("doble toque rápido en un objeto con `abre`: dice el nombre una vez y abre recién cuando terminó", async () => {
    const terminarVoz = vozQueCorta();
    const { alAbrir } = montar();
    fireEvent.click(zona("桌子"));
    fireEvent.click(zona("桌子"));
    await avanzar(400);
    expect(llamadasFrase(ZHE_SHI_ZHUOZI)).toBe(1);
    // el nombre sigue sonando: nadie camina ni abre encima
    await avanzar(PASO_MS + 500);
    expect(alAbrir).not.toHaveBeenCalled();
    await terminarVoz();
    await avanzar(PASO_MS + 100);
    expect(alAbrir).toHaveBeenCalledTimes(1);
    expect(llamadasFrase(ZHE_SHI_ZHUOZI)).toBe(1);
  });

  it("沙发 y enseguida 桌子: solo suena el último nombre y abre una vez, sin pisarlo", async () => {
    const terminarVoz = vozQueCorta();
    const { alAbrir } = montar();
    fireEvent.click(zona("沙发"));
    fireEvent.click(zona("桌子"));
    await avanzar(400);
    expect(llamadasFrase(ZHE_SHI_SHAFA)).toBe(0);
    expect(llamadasFrase(ZHE_SHI_ZHUOZI)).toBe(1);
    await avanzar(PASO_MS + 500);
    expect(alAbrir).not.toHaveBeenCalled();
    await terminarVoz();
    await avanzar(PASO_MS + 100);
    expect(alAbrir).toHaveBeenCalledTimes(1);
  });

  it("doble toque rápido en un objeto sin `abre`: el nombre suena una sola vez y un solo pop", async () => {
    const terminarVoz = vozQueCorta();
    montar();
    fireEvent.click(zona("沙发"));
    fireEvent.click(zona("沙发"));
    await avanzar(400);
    await terminarVoz();
    await avanzar(2000);
    expect(llamadasFrase(ZHE_SHI_SHAFA)).toBe(1);
    expect(vi.mocked(sfx).mock.calls.filter(([n]) => n === "pop").length).toBe(1);
  });

  it("tocar otro objeto mientras suena un nombre con `abre`: el primero no camina ni abre", async () => {
    const terminarVoz = vozQueCorta();
    const { alAbrir } = montar();
    fireEvent.click(zona("桌子"));
    await avanzar(400);
    fireEvent.click(zona("沙发")); // corta 这是桌子
    await avanzar(PASO_MS + 500);
    expect(llamadasFrase(ZHE_SHI_SHAFA)).toBe(1);
    expect(alAbrir).not.toHaveBeenCalled();
    await terminarVoz();
    await avanzar(PASO_MS + 100);
    expect(alAbrir).not.toHaveBeenCalled();
  });

  it("cámara, sorpresa y decorado: la cámara de afuera manda, la vaca se sorprende y el decorado va en el mundo", () => {
    const r = render(
      <CuartoMotor
        def={DEF}
        progreso={progresoVacio()}
        activo
        alCambiar={() => {}}
        alSalir={() => {}}
        camara={{ x: 500, y: 500, s: 2 }}
        sorpresa
        decorado={() => ({ deco: <svg data-deco /> })}
      />,
    );
    const mundo = r.container.querySelector<HTMLElement>("[data-mundo]")!;
    expect(mundo.style.transform).toMatch(/scale\(2\)/);
    expect(mundo.querySelector("[data-deco]")).not.toBeNull();
    expect(r.container.querySelector<HTMLElement>('[data-capa="orejas"]')!.style.opacity).toBe("1");
    expect(r.container.querySelector<HTMLElement>('[data-ojos="sorpresa"]')!.style.opacity).toBe("1");
  });

  it("reloj y bandeja: hora según el progreso, una silueta por ficha que falta", () => {
    const { container } = montar({ tocados: ["shafa"], logros: [] });
    expect(container.querySelector('[role="img"][aria-label="早上"]')).not.toBeNull();
    expect(container.querySelectorAll("[data-bandeja] [data-silueta]").length).toBe(3);
    expect(container.querySelectorAll("[data-bandeja] [data-hanzi]").length).toBe(1);
  });

  it("movimiento reducido: la ficha ganada solo aparece y se desvanece (sin escala)", () => {
    const css = readFileSync(join(process.cwd(), "components/casa/motor/Motor.module.css"), "utf8");
    const reducido = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/g)].map((m) => m[1]).join("\n");
    const nombre = reducido.match(/\.ganada \{ animation: (\w+)/)?.[1];
    expect(nombre).toBeTruthy();
    const frames = css.match(new RegExp(`@keyframes ${nombre} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? "";
    expect(frames).toMatch(/opacity/);
    expect(frames).not.toMatch(/scale|transform/);
  });
  it("pistas: lo no tocado brilla (nuevo), lo tocado con acciones pendientes brilla suave y lo terminado no brilla", async () => {
    const { container } = montar({ tocados: ["yizi"], logros: [] });
    const pista = (id: string) => container.querySelector<HTMLElement>(`[data-objeto="${id}"]`)!.dataset.pista;
    expect(pista("shafa")).toBe("nuevo");
    expect(pista("zhuozi")).toBe("nuevo");
    expect(pista("yizi")).toBe("pendiente");
    fireEvent.click(zona("桌子"));
    // la mesa no tiene acciones: una vez tocada ya no brilla
    expect(pista("zhuozi")).toBeUndefined();
    fireEvent.click(zona("沙发"));
    expect(pista("shafa")).toBe("pendiente");
    await avanzar(400);
    fireEvent.click(pildora());
    await avanzar(PASO_MS + POSE_MS + 100);
    expect(pista("shafa")).toBeUndefined();
  });

  it("pistas en CSS: halo cálido que no recibe toques; con movimiento reducido no late", () => {
    const css = readFileSync(join(process.cwd(), "components/casa/motor/Motor.module.css"), "utf8");
    const halo = css.match(/\.zona\[data-pista\]::after \{([\s\S]*?)\n\}/)?.[1] ?? "";
    expect(halo).toMatch(/pointer-events: none/);
    expect(halo).toMatch(/#ffe36b|255, 227, 107/);
    expect(css).toMatch(/\.zona\[data-pista="nuevo"\]::after \{[^}]*animation/);
    const reducido = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/g)].map((m) => m[1]).join("\n");
    expect(reducido).toMatch(/\.zona\[data-pista\]::after \{ animation: none/);
  });
  it("sentada: después de la frase la vaca se sube al asiento con el dibujo sentado y luego vuelve al pie, de pie", async () => {
    let terminar: (v: boolean) => void = () => {};
    vi.mocked(decir).mockImplementation((s) =>
      textoHanzi(s) === "我坐下" ? new Promise<boolean>((r) => { terminar = r; }) : Promise.resolve(true),
    );
    const { container } = montar();
    const sentada = () => container.querySelector<HTMLImageElement>("[data-vaca] img[data-vaca-sentada]");
    const dePie = () => container.querySelector("[data-vaca] [data-capa=cuerpo]");
    fireEvent.click(zona("沙发"));
    await avanzar(400);
    fireEvent.click(pildora());
    await avanzar(PASO_MS + 100);
    // durante la frase: de pie, en el pie del sofá
    expect(parseFloat(vaca(container).style.left)).toBeCloseTo(56, 2);
    expect(sentada()).toBeNull();
    await act(async () => { terminar(true); });
    // la pose: en el asiento y con el dibujo de la vaca sentada (borde de sticker), sin las capas de pie
    expect(parseFloat(vaca(container).style.left)).toBeCloseTo(60, 2);
    expect(parseFloat(vaca(container).style.top)).toBeCloseTo(38, 2);
    expect(sentada()!.getAttribute("src")).toBe(ARTE_VACA_SENTADA);
    const borde = sentada()!.parentElement!.style.filter;
    expect(borde.match(/drop-shadow/g)?.length).toBe(BORDE.match(/drop-shadow/g)!.length);
    expect(dePie()).toBeNull();
    await avanzar(POSE_MS + 100);
    expect(vaca(container).getAttribute("data-pose")).toBeNull();
    expect(parseFloat(vaca(container).style.left)).toBeCloseTo(56, 2);
    expect(parseFloat(vaca(container).style.top)).toBeCloseTo(52, 2);
    expect(sentada()).toBeNull();
    expect(dePie()).not.toBeNull();
  });

  it("sentada sin asiento en los datos: se sienta donde está (dibujo sentado en el pie)", async () => {
    const { container } = montar();
    fireEvent.click(zona("椅子"));
    await avanzar(400);
    fireEvent.click(pildora());
    await avanzar(PASO_MS + 100);
    expect(vaca(container).getAttribute("data-pose")).toBe("sentada");
    expect(parseFloat(vaca(container).style.left)).toBeCloseTo(47, 2);
    expect(container.querySelector("[data-vaca] img[data-vaca-sentada]")).not.toBeNull();
  });

  it("pestaña oculta con la vaca sentada en el asiento: baja de pie al pie del objeto", async () => {
    const { container, desactivar } = montar();
    fireEvent.click(zona("沙发"));
    await avanzar(400);
    fireEvent.click(pildora());
    await avanzar(PASO_MS + 100);
    expect(vaca(container).getAttribute("data-pose")).toBe("sentada");
    desactivar();
    expect(vaca(container).getAttribute("data-pose")).toBeNull();
    expect(parseFloat(vaca(container).style.left)).toBeCloseTo(56, 2);
    expect(parseFloat(vaca(container).style.top)).toBeCloseTo(52, 2);
  });

  it("la ficha que gana una acción (坐 en el 2.º asiento) aparece recién cuando la vaca se paró; el logro cuenta tras la frase", async () => {
    const { container, alCambiar } = montar({ tocados: ["shafa", "yizi", "zhuozi"], logros: ["zuo@shafa"] });
    const carta = () => container.querySelector("[data-ficha-ganada]");
    fireEvent.click(zona("椅子"));
    await avanzar(400);
    fireEvent.click(pildora());
    await avanzar(PASO_MS + 100);
    // la frase terminó: el logro y la ficha ya cuentan, pero la carta no tapa la pose
    expect(vaca(container).getAttribute("data-pose")).toBe("sentada");
    expect(ultimo(alCambiar)[1]).toEqual([fichaId(ZUO)]);
    expect(carta()).toBeNull();
    await avanzar(POSE_MS - 200);
    expect(carta()).toBeNull();
    await avanzar(300);
    expect(vaca(container).getAttribute("data-pose")).toBeNull();
    expect(carta()!.getAttribute("aria-label")).toBe("坐");
    await avanzar(1700);
    expect(carta()).toBeNull();
  });

  it("pestaña oculta a mitad de la pose: la carta de la ficha se muestra una sola vez (ni se pierde ni se duplica)", async () => {
    const { container, desactivar } = montar({ tocados: ["shafa", "yizi", "zhuozi"], logros: ["zuo@shafa"] });
    // cada carta montada es un elemento nuevo: se cuentan las de 坐
    const vistas = new Set<Element>();
    const obs = new MutationObserver(() => {
      const c = container.querySelector("[data-ficha-ganada]");
      if (c?.getAttribute("aria-label") === "坐") vistas.add(c);
    });
    obs.observe(container, { childList: true, subtree: true });
    fireEvent.click(zona("椅子"));
    await avanzar(400);
    fireEvent.click(pildora());
    await avanzar(PASO_MS + 100);
    expect(container.querySelector("[data-ficha-ganada]")).toBeNull();
    desactivar();
    expect(container.querySelector("[data-ficha-ganada]")!.getAttribute("aria-label")).toBe("坐");
    await avanzar(POSE_MS + 4000);
    obs.disconnect();
    expect(container.querySelector("[data-ficha-ganada]")).toBeNull();
    expect(vistas.size).toBe(1);
  });

});
