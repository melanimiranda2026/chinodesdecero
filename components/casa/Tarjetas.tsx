"use client";
import { useEffect, useRef, type ReactNode } from "react";
import styles from "./Casa.module.css";

export type CapaTarjeta = "entrada" | "metodo" | "pronto";

interface Props {
  capa: CapaTarjeta | null;
  /** Pidió que le avisemos (marcó la casilla): la tarjeta "pronto" cambia de texto. */
  anotado: boolean;
  /** Mensaje del enlace del correo (bueno o vencido): se lee en la tarjeta de entrada. */
  aviso?: string | null;
  /** Hueco del formulario de correo (lo llena la Task 12). */
  formulario?: ReactNode;
  alEntrar: () => void;
  alSeguir: () => void;
  alCerrar: () => void;
}

/**
 * Las tarjetas son página, no casa: aquí sí hay español. Viven dentro de la ventana del juego
 * (posición absoluta en el marco) y solo tapan el juego, no el resto de la landing.
 */
export function Tarjetas({ capa, anotado, aviso, formulario, alEntrar, alSeguir, alCerrar }: Props) {
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
    // La entrada se pinta al cargar la landing: no le roba el foco (ni el scroll) al hero.
    // Las demás aparecen por algo que se hizo en el juego: el foco va a su botón, sin mover la página.
    if (capa !== "entrada") principal.current?.focus({ preventScroll: true });
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || capa === "entrada") return; // la entrada no se cierra con Escape
      if (capa === "metodo") ultimos.current.alSeguir();
      else ultimos.current.alCerrar();
    };
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("keydown", alTeclear);
      if (previo?.isConnected) previo.focus(); // al cerrar, el foco vuelve a donde estaba
    };
  }, [capa]);

  if (!capa) return null;

  return (
    <div className={styles.capa} data-capa={capa}>
      {capa === "entrada" && (
        <div className={styles.tarjeta} role="dialog" aria-labelledby="t-titulo">
          <small className={styles.chica}>chino desde cero</small>
          <div className={styles.grande}>浸</div>
          <svg width="120" height="34" viewBox="0 0 120 34" aria-hidden="true" className={styles.tonoLinea}>
            <path d="M8 6 L112 28" stroke="#3A6FD6" strokeWidth="6" strokeLinecap="round" fill="none" />
          </svg>
          <h2 id="t-titulo">Método Jìn</h2>
          <p>Sumérgete. Toca, arrastra, escucha.</p>
          {aviso && (
            <p role="status" className={styles.avisoEntrada}>
              {aviso}
            </p>
          )}
          <button ref={principal} type="button" className={styles.principal} onClick={alEntrar}>
            <span aria-hidden="true">▶ </span>Jugar
          </button>
        </div>
      )}

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
