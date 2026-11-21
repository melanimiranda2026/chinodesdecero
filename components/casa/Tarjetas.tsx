"use client";
import { useEffect, useRef, type ReactNode } from "react";
import styles from "./Casa.module.css";

export type CapaTarjeta = "metodo" | "pronto";

interface Props {
  capa: CapaTarjeta | null;
  /** Pidió que le avisemos (marcó la casilla): la tarjeta "pronto" cambia de texto. */
  anotado: boolean;
  /** Hueco del formulario de correo (lo llena la Task 12). */
  formulario?: ReactNode;
  alSeguir: () => void;
  alCerrar: () => void;
}

/**
 * Las tarjetas son página, no casa: aquí sí hay español. Viven dentro de la ventana del juego
 * (posición absoluta en el marco) y solo tapan el juego, no el resto de la landing.
 */
export function Tarjetas({ capa, anotado, formulario, alSeguir, alCerrar }: Props) {
  const principal = useRef<HTMLButtonElement>(null);

  // Los callbacks vienen en línea y cambian en cada render: se guardan en una ref
  // para que el foco y el teclado dependan solo de la capa.
  const ultimos = useRef({ alSeguir, alCerrar });
  useEffect(() => {
    ultimos.current = { alSeguir, alCerrar };
  });

  useEffect(() => {
    if (!capa) return;
    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Las tarjetas aparecen por algo que se hizo en el juego: el foco va a su botón, sin mover la página.
    principal.current?.focus({ preventScroll: true });
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (capa === "metodo") ultimos.current.alSeguir();
      else ultimos.current.alCerrar();
    };
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("keydown", alTeclear);
      // al cerrar, el foco vuelve a donde estaba (no si quedó en una pestaña oculta)
      if (previo?.isConnected && !previo.closest("[hidden]")) previo.focus();
    };
  }, [capa]);

  if (!capa) return null;

  return (
    <div className={styles.capa} data-capa={capa}>
      {capa === "metodo" && (
        <div className={styles.tarjeta} role="dialog" aria-modal="true" aria-labelledby="t-titulo">
          <div className={styles.grande} style={{ fontSize: 56 }}>
            浸 jìn
          </div>
          <h2 id="t-titulo">Lo acabas de hacer</h2>
          <p>
            Nadie te tradujo nada: <b>escuchaste, viste y tocaste</b>, y lo reconociste. Así se aprende un idioma de verdad:
            sonido primero, significado por la imagen, y repetir jugando.
          </p>
          <p>Eso es el Método Jìn: sumergirte en chino de a poquito.</p>
          <button ref={principal} type="button" className={styles.principal} onClick={alSeguir}>
            Seguir explorando
          </button>
        </div>
      )}

      {capa === "pronto" && (
        <div className={styles.tarjeta} role="dialog" aria-modal="true" aria-labelledby="t-titulo">
          <div style={{ fontSize: 54 }} aria-hidden="true">
            🔒
          </div>
          <h2 id="t-titulo">Pronto</h2>
          <p>
            {anotado
              ? "Ya estás anotada/o. Te avisamos cuando abra."
              : "Este cuarto abre pronto. Deja tu correo y marca la casilla: te avisamos."}
          </p>
          {!anotado && formulario}
          <button ref={principal} type="button" className={styles.principal} onClick={alCerrar}>
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}
