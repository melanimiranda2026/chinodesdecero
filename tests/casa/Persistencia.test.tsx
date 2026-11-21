import { entrarCasa, guardarEnCocina, pasarEntrada } from "./entrar";
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

import { Casa } from "@/components/casa/Casa";
import { CLAVE_AVANCE, cargarAvance } from "@/components/casa/avance";
import { ESTADO_INICIAL } from "@/components/casa/cocina/datos";
import { reiniciarEventos } from "@/components/casa/eventos";
import { PASO_MS, ZOOM_MS } from "@/components/casa/living/Living";
import { esperaDe } from "@/components/casa/audio/turnos";
import { fichaId } from "@/components/casa/motor/progreso";
import { S } from "@/lib/silabas";
import { PALABRAS } from "@/components/casa/living/palabras";

const avanzar = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  sessionStorage.clear();
  reiniciarEventos();
  window.history.replaceState(null, "", "/");
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Casa con avance", () => {
  it("restaura el estado guardado y lo ignora si la forma es desconocida", async () => {
    // con correo y el living completo: tras la entrada se ve la cocina
    guardarEnCocina({ estado: { ...ESTADO_INICIAL, pingguo: "limpio" }, medallas: {}, escuchadas: [] });
    const { unmount } = render(<Casa />);
    await pasarEntrada();
    expect(document.querySelector('[data-objeto="pingguo"]')).toBeTruthy();
    // guardado sin cambios: el estado restaurado sigue ahí tras el debounce
    await avanzar(600);
    expect(cargarAvance().estado.pingguo).toBe("limpio");
    unmount();
    localStorage.setItem(CLAVE_AVANCE, JSON.stringify({ estado: { pingguo: "limpio" }, medallas: {}, escuchadas: [] }));
    render(<Casa />);
    await avanzar(600);
    expect(cargarAvance().estado).toEqual(ESTADO_INICIAL);
  });

  it("cuenta lo que dice la vaca, sin repetir, y guarda tras ~500 ms", async () => {
    guardarEnCocina();
    render(<Casa />);
    await pasarEntrada();
    entrarCasa();
    fireEvent.click(screen.getByRole("button", { name: "杯子" }));
    await avanzar(100);
    expect(cargarAvance().escuchadas).toEqual([]); // aún no pasó el debounce
    await avanzar(2000);
    const primeras = cargarAvance().escuchadas;
    expect(primeras.length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "杯子" }));
    await avanzar(2500);
    expect(cargarAvance().escuchadas).toEqual(primeras);
  });

  it("?enlace=fallo muestra el aviso y limpia la URL", async () => {
    window.history.replaceState(null, "", "/?enlace=fallo");
    render(<Casa />);
    await avanzar(10);
    expect(screen.getByRole("status").textContent).toBe("Ese enlace ya no funciona. Pide uno nuevo dejando tu correo otra vez.");
    expect(window.location.search).toBe("");
    // va arriba, dentro de la casa (no en una tarjeta de entrada)
    expect(screen.getByRole("status").closest("[data-casa]")).toBeTruthy();
    expect(document.querySelector("div[data-capa]")).toBeNull();
    await avanzar(5100);
    expect(screen.getByRole("status")).toBeTruthy(); // no se esfuma antes de que lo lean
    entrarCasa();
    expect(screen.getByRole("status")).toBeTruthy(); // entrar no lo quita
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("el aviso se cierra solo a los 8 s", async () => {
    window.history.replaceState(null, "", "/?bienvenida=1");
    render(<Casa />);
    await avanzar(7000);
    expect(screen.getByRole("status")).toBeTruthy();
    await avanzar(1500);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("?bienvenida=1 muestra el aviso de cuenta", async () => {
    window.history.replaceState(null, "", "/?bienvenida=1");
    render(<Casa />);
    await avanzar(10);
    expect(screen.getByRole("status").textContent).toBe("¡Listo! Tu avance quedó guardado en esta cuenta.");
    expect(window.location.search).toBe("");
  });

  it("la tarjeta pronto lleva el formulario de correo", async () => {
    render(<Casa />);
    await pasarEntrada();
    entrarCasa();
    fireEvent.click(document.querySelector('[data-cuarto="dormitorio"]') as HTMLElement);
    expect(screen.getByRole("button", { name: "Avísame" })).toBeTruthy();
  });

  it("abrir una palabra en la mesa la guarda en avance.palabras sin repetir; al recargar sale marcada", async () => {
    const id = PALABRAS[2].id;
    const abrirMesa = async () => {
      fireEvent.click(document.querySelector('[data-cuarto="living"]') as HTMLElement);
      fireEvent.click(document.querySelector('[data-objeto="zhuozi"]') as HTMLElement);
      await avanzar(esperaDe("pop") + PASO_MS + ZOOM_MS);
    };
    const tile = () => screen.getByTestId("mesa").querySelector<HTMLElement>(`[data-palabra="${id}"]`)!;
    const { unmount } = render(<Casa />);
    await pasarEntrada();
    entrarCasa();
    await abrirMesa();
    fireEvent.click(tile());
    await avanzar(600);
    expect(cargarAvance().palabras).toEqual([id]);
    expect(JSON.parse(localStorage.getItem(CLAVE_AVANCE)!).palabras).toEqual([id]);
    expect(tile().dataset.abierta).toBe("true");
    fireEvent.click(tile());
    await avanzar(600);
    expect(cargarAvance().palabras).toEqual([id]);
    unmount();

    render(<Casa />);
    await pasarEntrada();
    entrarCasa();
    await abrirMesa();
    expect(tile().dataset.abierta).toBe("true");
  });

  it("tocar 桌子 en el living guarda el cuarto y la ficha; al recargar sigue tocado (abrir una palabra no suma fichas)", async () => {
    const zhuozi = fichaId(S("桌子", "zhuō zi", "15"));
    const { unmount } = render(<Casa />);
    await pasarEntrada();
    entrarCasa();
    fireEvent.click(document.querySelector('[data-cuarto="living"]') as HTMLElement);
    fireEvent.click(document.querySelector('[data-objeto="zhuozi"]') as HTMLElement);
    await avanzar(esperaDe("pop") + PASO_MS + ZOOM_MS);
    fireEvent.click(screen.getByTestId("mesa").querySelector<HTMLElement>("[data-palabra]")!);
    await avanzar(600);
    const a = cargarAvance();
    expect(a.cuartos.living?.tocados).toEqual(["zhuozi"]);
    expect(a.fichas).toEqual([zhuozi]);
    unmount();

    render(<Casa />);
    await pasarEntrada();
    entrarCasa();
    fireEvent.click(document.querySelector('[data-cuarto="living"]') as HTMLElement);
    // ya tocado: la bandeja lo muestra ganado
    expect(document.querySelectorAll("[data-bandeja] [data-hanzi]").length).toBe(1);
  });
});
