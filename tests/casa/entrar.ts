import { fireEvent } from "@testing-library/react";

/** El primer toque en la casa (pointerdown en captura) arranca el juego. */
export function entrarCasa() {
  const casa = document.querySelector("[data-casa]");
  if (!casa) throw new Error("no hay [data-casa]");
  fireEvent.pointerDown(casa);
}
