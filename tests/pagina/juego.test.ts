import { afterEach, describe, expect, it, vi } from "vitest";
import { EVENTO_JUEGO, elegirJuego, juegoInicial } from "@/components/pagina/juego";

afterEach(() => vi.restoreAllMocks());

describe("juegoInicial", () => {
  it("prioriza ?juego= válido, luego lo guardado, luego cocina", () => {
    expect(juegoInicial("?juego=puzzle", null)).toBe("puzzle");
    expect(juegoInicial("?juego=xyz", "puzzle")).toBe("puzzle");
    expect(juegoInicial("", "basura")).toBe("cocina");
    expect(juegoInicial("", null)).toBe("cocina");
  });
});

describe("elegirJuego", () => {
  it("no lanza si localStorage falla y despacha el evento", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    const oyente = vi.fn();
    window.addEventListener(EVENTO_JUEGO, oyente);
    expect(() => elegirJuego("puzzle")).not.toThrow();
    expect(oyente).toHaveBeenCalledTimes(1);
    expect((oyente.mock.calls[0][0] as CustomEvent).detail).toBe("puzzle");
    expect(window.location.search).toBe("?juego=puzzle");
    window.removeEventListener(EVENTO_JUEGO, oyente);
    window.history.replaceState(null, "", "/");
  });
});
