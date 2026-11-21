import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/components/casa/audio/sonido", () => ({ sfx: vi.fn() }));

import { sfx } from "@/components/casa/audio/sonido";
import { cuartosAbiertos, Minimapa, type Cuarto } from "@/components/casa/Minimapa";

const CUARTOS_ABIERTOS = cuartosAbiertos(true, true);

function montar(cuartoActual: Cuarto) {
  const alCambiar = vi.fn();
  const alTocarBloqueado = vi.fn();
  render(<Minimapa cuartoActual={cuartoActual} abiertos={CUARTOS_ABIERTOS} alCambiar={alCambiar} alTocarBloqueado={alTocarBloqueado} />);
  return { alCambiar, alTocarBloqueado };
}

describe("Minimapa", () => {
  it("el living siempre está abierto; la cocina, solo con el living completo y el correo", () => {
    expect(cuartosAbiertos(false, false)).toEqual(["living"]);
    expect(cuartosAbiertos(true, false)).toEqual(["living"]);
    expect(cuartosAbiertos(false, true)).toEqual(["living"]);
    expect(cuartosAbiertos(true, true)).toEqual(["cocina", "living"]);
  });

  it("desde la cocina, 客厅 está abierto y cambia de cuarto", () => {
    const { alCambiar, alTocarBloqueado } = montar("cocina");
    const b = screen.getByRole("button", { name: "客厅" });
    expect(b.getAttribute("aria-label")).not.toContain("🔒");
    expect(b.hasAttribute("data-bloqueado")).toBe(false);
    fireEvent.click(b);
    expect(alCambiar).toHaveBeenCalledWith("living");
    expect(alTocarBloqueado).not.toHaveBeenCalled();
    expect(sfx).toHaveBeenCalledWith("pop", "cocina");
  });

  it("卧室 sigue cerrado", () => {
    const { alCambiar, alTocarBloqueado } = montar("cocina");
    fireEvent.click(screen.getByRole("button", { name: /卧室/ }));
    expect(alTocarBloqueado).toHaveBeenCalledWith("dormitorio");
    expect(alCambiar).not.toHaveBeenCalled();
  });

  it("desde el living, 厨房 vuelve a la cocina", () => {
    const { alCambiar, alTocarBloqueado } = montar("living");
    fireEvent.click(screen.getByRole("button", { name: "厨房" }));
    expect(alCambiar).toHaveBeenCalledWith("cocina");
    expect(alTocarBloqueado).not.toHaveBeenCalled();
  });
});
