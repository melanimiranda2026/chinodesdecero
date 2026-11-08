import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/components/casa/audio/voz", () => ({
  decir: vi.fn(() => Promise.resolve()),
  desbloquearAudio: vi.fn(),
}));
vi.mock("@/components/casa/audio/sonido", () => ({
  sfx: vi.fn(),
  musica: { tocar: vi.fn(), parar: vi.fn(), volumen: vi.fn(), bajar: vi.fn() },
}));
const sesion = vi.hoisted(() => ({ hay: true }));
vi.mock("@/lib/supabase/navegador", () => ({
  crearClienteNavegador: () => ({
    auth: { getSession: async () => ({ data: { session: sesion.hay ? { user: {} } : null } }) },
  }),
}));

import { Casa } from "@/components/casa/Casa";
import { CLAVE_AVANCE, cargarAvance } from "@/components/casa/avance";
import { ESTADO_INICIAL } from "@/components/casa/cocina/datos";
import { reiniciarEventos } from "@/components/casa/eventos";

const avanzar = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const estadoLimpio = { ...ESTADO_INICIAL, pingguo: "limpio" };
const remotoCon = (escuchadas: string[], estado = estadoLimpio) => ({ datos: { estado, medallas: {}, escuchadas } });
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status });
const local = (a: object) =>
  localStorage.setItem(CLAVE_AVANCE, JSON.stringify({ estado: ESTADO_INICIAL, medallas: {}, escuchadas: [], ...a }));

/** fetch falso: GET /api/avance devuelve `get()`; los PUT se guardan. `retraso` frena solo el GET. */
function red(get: () => Response, retraso?: () => Promise<void>) {
  const puts: unknown[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
    const u = String(url);
    if (u === "/api/avance" && init?.method === "PUT") {
      puts.push(JSON.parse(init.body as string));
      return new Response('{"ok":true}');
    }
    if (u === "/api/avance") {
      await retraso?.();
      return get();
    }
    return new Response(null, { status: 204 });
  });
  return puts;
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  sessionStorage.clear();
  reiniciarEventos();
  sesion.hay = true;
  window.history.replaceState(null, "", "/");
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("sincronizacion con la cuenta", () => {
  it("sesion + local vacio + remoto con datos: gana el remoto y no hay PUT", async () => {
    const puts = red(() => json(remotoCon(["a", "b"])));
    render(<Casa />);
    await avanzar(3000);
    expect(cargarAvance().estado.pingguo).toBe("limpio");
    expect(cargarAvance().escuchadas).toEqual(["a", "b"]);
    expect(puts).toEqual([]);
  });
  it("GET 500: no se sube nada, ni siquiera tras un cambio local", async () => {
    const puts = red(() => json({ error: "servidor" }, 500));
    render(<Casa />);
    await avanzar(100);
    fireEvent.click(screen.getByRole("button", { name: "Entrar a la casa" }));
    fireEvent.click(screen.getByRole("button", { name: "杯子" }));
    await avanzar(3000);
    expect(cargarAvance().escuchadas.length).toBeGreaterThan(0);
    expect(puts).toEqual([]);
  });
  it("empate de escuchadas: se queda el remoto", async () => {
    local({ escuchadas: ["y"] });
    const puts = red(() => json(remotoCon(["x"])));
    render(<Casa />);
    await avanzar(3000);
    expect(cargarAvance().escuchadas).toEqual(["x"]);
    expect(puts).toEqual([]);
  });
  it("solo restaurar (remoto igual al local) no sube", async () => {
    local({ estado: estadoLimpio, escuchadas: ["a"] });
    const puts = red(() => json(remotoCon(["a"])));
    render(<Casa />);
    await avanzar(3000);
    expect(puts).toEqual([]);
  });
  it("remoto vacio y local con avance: sube", async () => {
    local({ estado: estadoLimpio, escuchadas: ["a"] });
    const puts = red(() => json({ datos: null }));
    render(<Casa />);
    await avanzar(3000);
    expect(puts.length).toBe(1);
  });
  it("sin sesion no consulta ni sube", async () => {
    sesion.hay = false;
    const puts = red(() => json(remotoCon(["a"])));
    render(<Casa />);
    await avanzar(3000);
    expect(puts).toEqual([]);
    expect(cargarAvance().escuchadas).toEqual([]);
  });
  it("un cambio local durante el GET se conserva", async () => {
    let soltar!: () => void;
    red(() => json(remotoCon(["r"])), () => new Promise<void>((r) => (soltar = r)));
    render(<Casa />);
    await avanzar(10);
    fireEvent.click(screen.getByRole("button", { name: "Entrar a la casa" }));
    await avanzar(600); // el saludo suma ni2_hao3 mientras el GET sigue pendiente
    await act(async () => {
      soltar();
      await vi.advanceTimersByTimeAsync(50);
    });
    await avanzar(3000);
    expect(cargarAvance().escuchadas).toContain("ni2_hao3");
  });
  it("el resultado que llega tras desmontar se ignora", async () => {
    let soltar!: () => void;
    red(() => json(remotoCon(["r"])), () => new Promise<void>((r) => (soltar = r)));
    const { unmount } = render(<Casa />);
    await avanzar(10);
    unmount();
    await act(async () => {
      soltar();
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(cargarAvance().escuchadas).toEqual([]);
  });
});

describe("guardado al desmontar y correo en memoria", () => {
  it("desmontar guarda lo pendiente (<500 ms)", async () => {
    sesion.hay = false;
    const { unmount } = render(<Casa />);
    await avanzar(10);
    fireEvent.click(screen.getByRole("button", { name: "Entrar a la casa" }));
    await avanzar(450); // el saludo ya sumo una escuchada, el debounce no vencio
    expect(cargarAvance().escuchadas).toEqual([]);
    unmount();
    expect(cargarAvance().escuchadas).toContain("ni2_hao3");
  });
  it("anotado pasa a true tras el alta aunque el almacenamiento este bloqueado", async () => {
    sesion.hay = false;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ ok: true }));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    render(<Casa />);
    await avanzar(10);
    fireEvent.click(screen.getByRole("button", { name: "Entrar a la casa" }));
    fireEvent.click(document.querySelector('[data-cuarto="dormitorio"]') as HTMLElement);
    fireEvent.change(screen.getByLabelText("Tu correo"), { target: { value: "a@b.cl" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Avísame" }));
      await vi.advanceTimersByTimeAsync(10);
    });
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    fireEvent.click(document.querySelector('[data-cuarto="dormitorio"]') as HTMLElement);
    expect(screen.getByText("Ya estás anotada/o. Te avisamos cuando abra.")).toBeTruthy();
  });
});
