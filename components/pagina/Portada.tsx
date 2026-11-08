"use client";
import { useEffect, useRef, useState } from "react";
import { Casa, type ControlCasa } from "@/components/casa/Casa";
import { PORTADA } from "./contenido";
import styles from "./portada.module.css";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/**
 * Primera pantalla de la landing: el texto de venta y, al lado (o abajo en celular), la casa jugable
 * dentro de una ventana. Dentro de la ventana no hay español: la barra lleva 🍳 厨房 y el botón 全屏.
 */
export function Portada() {
  const casa = useRef<ControlCasa>(null);
  const ventana = useRef<HTMLDivElement>(null);
  const [grande, setGrande] = useState(false);

  // 全屏: la ventana llena la pantalla (CSS, sin la API de pantalla completa: iOS) y la página no se mueve debajo.
  useEffect(() => {
    if (!grande) return;
    const body = document.body.style.overflow;
    const html = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = body;
      document.documentElement.style.overflow = html;
    };
  }, [grande]);

  const jugar = () => {
    // todo dentro del clic: desbloquear el audio de iOS, música de la cocina y el saludo
    casa.current?.entrar();
    ventana.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  };

  return (
    <section className={styles.hero} aria-labelledby="hero-titulo">
      <div className={styles.texto}>
        <p className={styles.marca}>{PORTADA.marca}</p>
        <h1 id="hero-titulo" className={styles.h1}>
          {PORTADA.h1}
        </h1>
        <p className={styles.subtitulo} data-testid="subtitulo">
          {PORTADA.subtitulo}
          <span className={styles.sub2}>
            {" "}
            {PORTADA.subtitulo2}{" "}
            <span className={styles.jin} lang="zh">
              浸
              <svg viewBox="0 0 120 34" aria-hidden="true" className={styles.jinLinea}>
                <path d="M8 6 L112 28" stroke="#3A6FD6" strokeWidth="9" strokeLinecap="round" fill="none" />
              </svg>
            </span>
            .
          </span>
        </p>
        <div className={styles.botones}>
          <button type="button" className={styles.jugar} onClick={jugar}>
            <span aria-hidden="true">▶</span>
            {PORTADA.jugar}
          </button>
          <a href="#metodo" className={styles.como}>
            {PORTADA.comoFunciona}
          </a>
        </div>
        <p className={styles.confianza}>{PORTADA.confianza}</p>
      </div>

      <div ref={ventana} className={cx(styles.ventana, grande && styles.grande)} data-ventana data-grande={grande || undefined}>
        <div className={styles.barra} data-barra>
          <span className={styles.puntos} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className={styles.titulo}>
            <span aria-hidden="true">🍳</span> <span lang="zh">厨房</span>{" "}
            <span className={styles.py} data-pinyin>
              chú fáng
            </span>
          </span>
          <button
            type="button"
            className={styles.pantalla}
            aria-label="全屏"
            aria-pressed={grande}
            title="全屏 quán píng"
            onClick={() => setGrande((g) => !g)}
          >
            <span aria-hidden="true">{grande ? "✕" : "⛶"}</span>
            <span className={styles.oculto} data-pinyin>
              quán píng
            </span>
          </button>
        </div>
        <div className={styles.marco}>
          <Casa ref={casa} />
        </div>
      </div>
    </section>
  );
}
