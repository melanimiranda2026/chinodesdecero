import { act, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { ENTRADA_MS } from "@/components/casa/EntradaCasa";
import { CLAVE_AVANCE, avanceInicial, type Avance } from "@/components/casa/avance";
import { LIVING } from "@/components/casa/living/cuarto";
import type { ProgresoCuarto } from "@/components/casa/motor/tipos";

/** El primer toque en la casa (pointerdown en captura) arranca el juego. */
export function entrarCasa() {
  const casa = document.querySelector("[data-casa]");
  if (!casa) throw new Error("no hay [data-casa]");
  fireEvent.pointerDown(casa);
}

/**
 * Toca el Play de la casa entera (es el primer toque: desbloquea el audio) y deja pasar la entrada
 * (puerta → zoom). Si la entrada ya empezó (otro toque antes), solo espera. Con relojes falsos.
 */
export async function pasarEntrada() {
  if (!document.querySelector("[data-entrada]")) throw new Error("no hay casa entera");
  const play = document.querySelector("[data-entrada] [data-play]");
  if (play) {
    fireEvent.pointerDown(play);
    fireEvent.click(play);
  }
  await act(async () => { await vi.advanceTimersByTimeAsync(ENTRADA_MS); });
}

/** El living completo: todo tocado y todo logrado. */
export const LIVING_COMPLETO: ProgresoCuarto = {
  tocados: LIVING.objetos.map((o) => o.id),
  logros: LIVING.objetos.flatMap((o) => o.acciones.map((a) => `${a}@${o.id}`)),
};

/**
 * Deja guardado un avance con correo y el living completo: al cargar, tras la entrada, la casa abre en la
 * cocina. `extra` se mezcla encima (estado, escuchadas, ...).
 */
export function guardarEnCocina(extra: Partial<Avance> = {}) {
  const a: Avance = { ...avanceInicial(), correo: "vaca@ejemplo.com", cuartos: { living: LIVING_COMPLETO }, ...extra };
  localStorage.setItem(CLAVE_AVANCE, JSON.stringify(a));
}
