import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

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

import { CasaVista } from "@/components/casa/Casa";
import { useCasa, type CasaApi, type EstadoQuiz } from "@/components/casa/useCasa";

const FIN: EstadoQuiz = { rondas: ["beizi", "wan", "panzi", "kuaizi"], i: 4, aciertos: 4, fase: "fin" };

/** La vista real con el 玩 ya terminado (como si la secuencia hubiera llegado a "fin" mientras estaba oculta). */
function Prueba({ activo, fin = true }: { activo: boolean; fin?: boolean }) {
  const api = useCasa();
  const casa: CasaApi = fin ? { ...api, quiz: FIN } : api;
  return <CasaVista casa={casa} activo={activo} />;
}

beforeEach(() => {
  vi.useFakeTimers();
  registrar.mockClear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("CasaVista en una pestaña oculta", () => {
  it("con el 玩 terminado no muestra el método, no registra ver_metodo ni mueve el foco; al verse, sí", () => {
    const fuera = document.createElement("button");
    document.body.appendChild(fuera);
    fuera.focus();
    const { rerender } = render(<Prueba activo={false} />);
    expect(screen.queryByText(/Eso es el Método Jìn/)).toBeNull();
    expect(registrar).not.toHaveBeenCalledWith("ver_metodo");
    expect(document.activeElement).toBe(fuera);

    rerender(<Prueba activo />);
    expect(screen.getByText(/Eso es el Método Jìn/)).toBeTruthy();
    expect(registrar.mock.calls.filter((c) => c[0] === "ver_metodo")).toHaveLength(1);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Seguir explorando" }));
    fuera.remove();
  });
});

describe("CasaVista: tamaño mientras está oculta", () => {
  it("el 0×0 de la pestaña oculta no cuenta: al volver no se repite el encuadre (ni el zoom)", () => {
    let tam = { w: 360, h: 640 }; // celular vertical
    const avisos: (() => void)[] = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(private cb: () => void) {
          avisos.push(() => this.cb());
        }
        observe() {}
        disconnect() {}
      },
    );
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      () => ({ width: tam.w, height: tam.h, x: 0, y: 0, top: 0, left: 0, right: tam.w, bottom: tam.h, toJSON() {} }) as DOMRect,
    );
    try {
      const { container } = render(<Prueba activo fin={false} />);
      const casa = container.querySelector<HTMLElement>("[data-casa]")!;
      const mundo = casa.querySelector<HTMLElement>("[class*=mundo]")!;
      expect(casa.hasAttribute("data-vertical")).toBe(true);
      const antes = mundo.style.transform;

      tam = { w: 0, h: 0 }; // hidden: display none
      act(() => avisos.forEach((f) => f()));
      expect(casa.hasAttribute("data-vertical")).toBe(true);
      expect(mundo.style.transform).toBe(antes);
    } finally {
      rect.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});
