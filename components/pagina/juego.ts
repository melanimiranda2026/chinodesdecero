export type Juego = "cocina" | "puzzle";

export const EVENTO_JUEGO = "cdc:juego";
export const CLAVE_JUEGO = "cdc:juego";

const esJuego = (v: string | null | undefined): v is Juego => v === "cocina" || v === "puzzle";

/** Qué juego abre la ventana: ?juego= válido, si no el último guardado, si no la cocina. */
export function juegoInicial(search: string, guardado: string | null): Juego {
  const url = new URLSearchParams(search).get("juego");
  if (esJuego(url)) return url;
  if (esJuego(guardado)) return guardado;
  return "cocina";
}

/** Recuerda la pestaña: localStorage y ?juego= (manteniendo el hash). No avisa ni hace scroll. */
export function recordarJuego(j: Juego): void {
  try {
    localStorage.setItem(CLAVE_JUEGO, j);
  } catch {
    /* sin almacenamiento: la página funciona igual */
  }
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("juego", j);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  } catch {
    /* ignorar */
  }
}

/** Cambia de pestaña desde cualquier parte de la página: recuerda, avisa y lleva a la ventana. */
export function elegirJuego(j: Juego): void {
  recordarJuego(j);
  window.dispatchEvent(new CustomEvent<Juego>(EVENTO_JUEGO, { detail: j }));
  document.getElementById("juegos")?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
}
