import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

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
import { sfx } from "@/components/casa/audio/sonido";
import { CuartoMotor } from "@/components/casa/motor/CuartoMotor";
import { objetoBajoVaca, PASO_MS, POSE_MS, SOLTAR_MS, VACA_INICIAL } from "@/components/casa/motor/useCuarto";
import { progresoVacio } from "@/components/casa/motor/progreso";
import type { DefCuarto, ProgresoCuarto } from "@/components/casa/motor/tipos";
import { LIVING } from "@/components/casa/living/cuarto";
import { S } from "@/lib/silabas";

/** Cuarto de prueba: un sofá y una tele que se enciende con 看. */
const DEF: DefCuarto = {
  id: "living",
  hora: [7, 11],
  salida: "cocina",
  objetos: [
    { id: "shafa", nombre: S("沙发", "shā fā", "11"), zona: { x: 500, y: 300, w: 200, h: 120 }, pie: { x: 560, y: 520 }, acciones: [] },
    { id: "dianshi", nombre: S("电视", "diàn shì", "44"), zona: { x: 150, y: 300, w: 150, h: 150 }, pie: { x: 300, y: 560 }, acciones: ["kan"], enciende: "kan" },
  ],
  acciones: [{ id: "kan", verbo: S("看", "kàn", "4"), frase: S("我看电视", "wǒ kàn diàn shì", "3444"), icono: "📺", pose: "mira" }],
};

const avanzar = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

function montar(inicial: ProgresoCuarto = progresoVacio()) {
  const alCambiar = vi.fn<(p: ProgresoCuarto, nuevas: string[]) => void>();
  function Con() {
    const [p, setP] = useState(inicial);
    return (
      <CuartoMotor
        def={DEF}
        progreso={p}
        activo
        alCambiar={(n, nuevas) => { alCambiar(n, nuevas); setP(n); }}
        alSalir={() => {}}
        decorado={({ encendidos }) => ({ tele: encendidos.includes("dianshi") ? <div data-prueba-tele /> : null })}
      />
    );
  }
  return { ...render(<Con />), alCambiar };
}

const vaca = (c: HTMLElement) => c.querySelector<HTMLElement>("[data-vaca]")!;
const agarre = (c: HTMLElement) => c.querySelector<HTMLElement>("[data-agarre]")!;

/** Arrastra la vaca para que sus patas terminen en (x, y): el mundo mide 1000 px, así 1 px = 1 unidad. */
function arrastrarA(c: HTMLElement, x: number, y: number) {
  const dx = x - VACA_INICIAL.x, dy = y - VACA_INICIAL.y;
  fireEvent.pointerDown(agarre(c), { pointerId: 1, clientX: 0, clientY: 0 });
  fireEvent.pointerMove(agarre(c), { pointerId: 1, clientX: dx / 2, clientY: dy / 2 });
  fireEvent.pointerMove(agarre(c), { pointerId: 1, clientX: dx, clientY: dy });
  fireEvent.pointerUp(agarre(c), { pointerId: 1, clientX: dx, clientY: dy });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(decir).mockReset();
  vi.mocked(decir).mockImplementation(() => Promise.resolve(true));
  vi.mocked(sfx).mockClear();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    { width: 1000, height: 1000, x: 0, y: 0, top: 0, left: 0, right: 1000, bottom: 1000, toJSON: () => ({}) } as DOMRect,
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("objetoBajoVaca", () => {
  it("el cuerpo de la vaca (sobre sus patas) cae en la zona del objeto, con margen", () => {
    expect(objetoBajoVaca(DEF, { x: 600, y: 430 })).toBe("shafa");
    expect(objetoBajoVaca(DEF, { x: 220, y: 500 })).toBe("dianshi");
    expect(objetoBajoVaca(DEF, { x: 900, y: 900 })).toBeNull();
  });
  it("en el living de verdad, soltarla frente a la tele o al sofá los encuentra", () => {
    const tele = LIVING.objetos.find((o) => o.id === "dianshi")!;
    const sofa = LIVING.objetos.find((o) => o.id === "shafa")!;
    expect(objetoBajoVaca(LIVING, { x: tele.zona.x + tele.zona.w / 2, y: tele.zona.y + tele.zona.h })).toBe("dianshi");
    expect(objetoBajoVaca(LIVING, { x: sofa.zona.x + sofa.zona.w / 2, y: sofa.zona.y + sofa.zona.h })).toBe("shafa");
  });
});

describe("tomar a la vaca", () => {
  it("soltarla sobre un objeto: va a su pie y es como tocarlo (nombre y ficha)", async () => {
    const { container, alCambiar } = montar();
    arrastrarA(container, 600, 430);
    expect(alCambiar.mock.calls.at(-1)![0].tocados).toEqual(["shafa"]);
    expect(vaca(container).style.left).toBe("56%");
    expect(vaca(container).style.top).toBe("52%");
    await avanzar(400);
    expect(decir).toHaveBeenCalledWith(S("这是沙发", "zhè shì shā fā", "4411"), expect.anything());
  });

  it("mientras se arrastra, sigue al dedo sin transición y el objeto de abajo brilla", () => {
    const { container } = montar();
    const dx = 600 - VACA_INICIAL.x, dy = 430 - VACA_INICIAL.y;
    fireEvent.pointerDown(agarre(container), { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(agarre(container), { pointerId: 1, clientX: dx, clientY: dy });
    expect(vaca(container).dataset.arrastrando).toBe("true");
    expect(vaca(container).style.transition).toBe("none");
    expect(screen.getByRole("button", { name: "沙发" }).className).toMatch(/brilla/);
  });

  it("soltarla en el piso: se queda ahí, sin tocar nada", async () => {
    // fuera del piso libre vuelve adentro
    const otro = montar();
    arrastrarA(otro.container, 990, 990);
    await avanzar(SOLTAR_MS);
    expect(parseFloat(vaca(otro.container).style.left)).toBeLessThan(99);
    otro.unmount();

    const { container, alCambiar } = montar();
    arrastrarA(container, 560, 700);
    await avanzar(SOLTAR_MS);
    expect(alCambiar).not.toHaveBeenCalled();
    expect(vaca(container).style.left).toBe("56%");
    expect(vaca(container).style.top).toBe("70%");
  });

  it("un toque sin arrastre no la mueve", () => {
    const { container, alCambiar } = montar();
    fireEvent.pointerDown(agarre(container), { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(agarre(container), { pointerId: 1, clientX: 2, clientY: 3 });
    expect(alCambiar).not.toHaveBeenCalled();
    expect(vaca(container).style.left).toBe(`${VACA_INICIAL.x / 10}%`);
  });

  it("mientras hace una acción no se puede tomar", async () => {
    const { container } = montar({ tocados: ["dianshi"], logros: [] });
    fireEvent.click(screen.getByRole("button", { name: "电视" }));
    await avanzar(400);
    fireEvent.click(screen.getByRole("button", { name: "看" }));
    expect(agarre(container).dataset.libre).toBeUndefined();
  });
});

describe("la tele se enciende con 看", () => {
  it("se enciende recién al terminar la frase, con su sonido, y queda encendida", async () => {
    let terminar: (v: boolean) => void = () => {};
    const { container } = montar({ tocados: ["dianshi"], logros: [] });
    fireEvent.click(screen.getByRole("button", { name: "电视" }));
    await avanzar(400);
    vi.mocked(decir).mockImplementation(() => new Promise((r) => { terminar = r; }));
    vi.mocked(sfx).mockClear();
    fireEvent.click(screen.getByRole("button", { name: "看" }));
    await avanzar(PASO_MS);
    // la vaca está diciendo 我看电视: ni sonido ni tele todavía
    expect(container.querySelector("[data-prueba-tele]")).toBeNull();
    expect(sfx).not.toHaveBeenCalledWith("tele", "cocina");
    await act(async () => terminar(true));
    expect(container.querySelector("[data-prueba-tele]")).not.toBeNull();
    expect(sfx).toHaveBeenCalledWith("tele", "cocina");
    await avanzar(POSE_MS + 100);
    expect(container.querySelector("[data-prueba-tele]")).not.toBeNull();
  });
});
