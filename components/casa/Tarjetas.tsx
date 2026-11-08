"use client";
import { useEffect, useRef, type ReactNode } from "react";
import styles from "./Casa.module.css";

export type CapaTarjeta = "entrada" | "metodo" | "pronto";

interface Props {
  capa: CapaTarjeta | null;
  /** Ya dejó su correo: la tarjeta "pronto" cambia de texto. */
  anotado: boolean;
  /** Hueco del formulario de correo (lo llena la Task 12). */
  formulario?: ReactNode;
  alEntrar: () => void;
  alSeguir: () => void;
  alCerrar: () => void;
}

/** Las tarjetas viven fuera de la casa: aquí sí hay español. Son diálogos modales. */
export function Tarjetas({ capa, anotado, formulario, alEntrar, alSeguir, alCerrar }: Props) {
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
    principal.current?.focus();
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
        <div className={styles.tarjeta} role="dialog" aria-modal="true" aria-labelledby="t-titulo">
          <small className={styles.chica}>chino desde cero</small>
          <div className={styles.grande}>浸</div>
          <svg width="120" height="34" viewBox="0 0 120 34" aria-hidden="true" className={styles.tonoLinea}>
            <path d="M8 6 L112 28" stroke="#3A6FD6" strokeWidth="6" strokeLinecap="round" fill="none" />
          </svg>
          <h1 id="t-titulo">Método Jìn</h1>
          <p>Sumérgete. Toca, arrastra, escucha.</p>
          <button ref={principal} type="button" className={styles.principal} onClick={alEntrar}>
            Entrar a la casa
          </button>
        </div>
      )}

      {capa === "metodo" && (
        <div className={styles.tarjeta} role="dialog" aria-modal="true" aria-labelledby="t-titulo">
          <div className={styles.grande} style={{ fontSize: 56 }}>
            浸 jìn
          </div>
          <h1 id="t-titulo">Lo acabas de hacer</h1>
          <p>
            Nadie te tradujo nada: <b>escuchaste, viste y tocaste</b>, y lo reconociste. Así aprende el cerebro un idioma:
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
          <h1 id="t-titulo">Pronto</h1>
          <p>
            {anotado
              ? "Ya estás anotada/o. Te avisamos cuando abra."
              : "Este cuarto abre pronto. Deja tu correo y te avisamos."}
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
