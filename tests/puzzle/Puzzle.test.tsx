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
const registrar = vi.fn();
vi.mock("@/components/casa/eventos", () => ({ registrar: (...a: unknown[]) => registrar(...a) }));

import { decir } from "@/components/casa/audio/voz";
import { Puzzle } from "@/components/puzzle/Puzzle";
import { CLAVE_PUZZLE } from "@/components/puzzle/avance";
import { TEMAS } from "@/components/puzzle/datos";
import { nombrePieza } from "@/components/puzzle/Pieza";
import { EVENTO_AVANCE } from "@/components/casa/avance";

const avanzar = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const vasos = () => Number(screen.getByTestId("vasos").getAttribute("data-vasos"));
const guardado = () => JSON.parse(localStorage.getItem(CLAVE_PUZZLE) ?? "{}");

/** Toca las piezas de la bandeja en el orden correcto de la frase. */
async function armar(frase = TEMAS[0].frases[0]) {
  for (const p of frase.ordenes[0]) {
    const boton = document.querySelector<HTMLButtonElement>(`button[data-pieza="${p}"]`)!;
    fireEvent.click(boton);
    await avanzar(10);
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  registrar.mockClear();
  vi.mocked(decir).mockClear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("Puzzle", () => {
  it("parte en el mapa con un solo nivel abierto y 5 vasos", async () => {
    render(<Puzzle />);
    await avanzar(0);
    expect(vasos()).toBe(5);
    const piedras = screen.getAllByRole("button", { name: /El orden|Preguntas|Sí o no|Ya pasó|No lo hice|Mañana/ });
    expect(piedras.filter((b) => !(b as HTMLButtonElement).disabled)).toHaveLength(1);
  });

  it("en la etapa 1 muestra la regla, después la frase en español, y armarla hace hablar a la vaca", async () => {
    render(<Puzzle />);
    await avanzar(0);
    fireEvent.click(screen.getByRole("button", { name: "Empezar" }));
    expect(screen.getByText(TEMAS[0].regla)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /A armar/ }));
    expect(screen.getByText(`«${TEMAS[0].frases[0].espanol}»`)).toBeTruthy();

    await armar();
    await avanzar(1000);
    expect(vi.mocked(decir).mock.calls.some(([, o]) => o?.src === "/audio/puzzle/wochi_pingguo.mp3")).toBe(true);
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeTruthy();
    expect(vasos()).toBe(5);
  });

  it("una pieza mal puesta rebota y vacía un vaso", async () => {
    render(<Puzzle />);
    await avanzar(0);
    fireEvent.click(screen.getByRole("button", { name: "Empezar" }));
    fireEvent.click(screen.getByRole("button", { name: /A armar/ }));
    // 苹果 (pieza 2) no puede ir en el primer hueco
    fireEvent.click(document.querySelector<HTMLButtonElement>('button[data-pieza="2"]')!);
    await avanzar(10);
    expect(vasos()).toBe(4);
    expect(guardado().vasos.vasos).toBe(4);
    expect(document.querySelector('button[data-pieza="2"]')).toBeTruthy(); // sigue en la bandeja
  });

  it("sin vasos aparece el panel, y dejar el correo los llena una sola vez", async () => {
    localStorage.setItem(CLAVE_PUZZLE, JSON.stringify({ ganados: [], perfectos: [], vasos: { vasos: 1, desde: Date.now() }, correoLleno: false }));
    render(<Puzzle />);
    await avanzar(0);
    fireEvent.click(screen.getByRole("button", { name: "Empezar" }));
    fireEvent.click(screen.getByRole("button", { name: /A armar/ }));
    fireEvent.click(document.querySelector<HTMLButtonElement>('button[data-pieza="2"]')!);
    await avanzar(10);
    expect(vasos()).toBe(0);
    expect(screen.getByRole("dialog", { name: /se tomó toda la leche/ })).toBeTruthy();

    act(() => {
      window.dispatchEvent(new CustomEvent(EVENTO_AVANCE, { detail: { correo: "a@b.cl" } }));
    });
    expect(vasos()).toBe(5);
    expect(guardado().correoLleno).toBe(true);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("repasar un nivel ganado no gasta vasos", async () => {
    localStorage.setItem(CLAVE_PUZZLE, JSON.stringify({ ganados: ["orden-1"], perfectos: [], vasos: { vasos: 5, desde: Date.now() }, correoLleno: false }));
    render(<Puzzle />);
    await avanzar(0);
    fireEvent.click(screen.getByRole("button", { name: "El orden, Con ayuda, ganado" }));
    fireEvent.click(document.querySelector<HTMLButtonElement>('button[data-pieza="2"]')!);
    await avanzar(10);
    expect(vasos()).toBe(5);
  });

  it("en la etapa 3 no hay español en el juego: ni frase, ni roles, ni traducción", async () => {
    localStorage.setItem(
      CLAVE_PUZZLE,
      JSON.stringify({ ganados: ["orden-1", "orden-2"], perfectos: [], vasos: { vasos: 5, desde: Date.now() }, correoLleno: false }),
    );
    render(<Puzzle />);
    await avanzar(0);
    fireEvent.click(screen.getByRole("button", { name: "El orden, Solo chino" }));
    await avanzar(600);
    expect(screen.getByTestId("escena")).toBeTruthy();
    expect(document.querySelector("[data-rol]")).toBeNull();
    expect(document.querySelector("[data-glosa]")).toBeNull();
    await armar();
    await avanzar(1500);
    expect(screen.queryByText(TEMAS[0].frases[0].espanol)).toBeNull();
  });
});

describe("Puzzle sin ResizeObserver", () => {
  it("sin ResizeObserver las piezas se ven y se pueden tocar", async () => {
    const original = globalThis.ResizeObserver;
    // @ts-expect-error simula un navegador sin ResizeObserver
    delete globalThis.ResizeObserver;
    try {
      render(<Puzzle />);
      await avanzar(0);
      fireEvent.click(screen.getByRole("button", { name: "Empezar" }));
      fireEvent.click(screen.getByRole("button", { name: /A armar/ }));
      const frase = TEMAS[0].frases[0];
      for (let p = 0; p < frase.piezas.length; p++) {
        const boton = document.querySelector<HTMLButtonElement>(`button[data-pieza="${p}"]`)!;
        expect(boton.getAttribute("aria-label")).toBe(nombrePieza(frase.piezas[p]));
        expect(boton.hasAttribute("data-forma")).toBe(false);
      }
    } finally {
      globalThis.ResizeObserver = original;
    }
  });
});
