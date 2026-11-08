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
    localStorage.setItem(CLAVE_AVANCE, JSON.stringify({ estado: { ...ESTADO_INICIAL, pingguo: "limpio" }, medallas: {}, escuchadas: [] }));
    const { unmount } = render(<Casa />);
    await avanzar(10);
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
    render(<Casa />);
    await avanzar(10);
    fireEvent.click(screen.getByRole("button", { name: "Jugar" }));
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
    // va en la tarjeta de entrada (no encima del cuarto) y se va al entrar
    expect(screen.getByRole("status").closest("[data-capa]")?.getAttribute("data-capa")).toBe("entrada");
    await avanzar(5100);
    expect(screen.getByRole("status")).toBeTruthy(); // no se esfuma antes de que lo lean
    fireEvent.click(screen.getByRole("button", { name: "Jugar" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Jugar" }));
    fireEvent.click(document.querySelector('[data-cuarto="dormitorio"]') as HTMLElement);
    expect(screen.getByRole("button", { name: "Avísame" })).toBeTruthy();
  });
});
