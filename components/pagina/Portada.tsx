"use client";
import { useEffect, useRef, useState } from "react";
import { Casa, type ControlCasa } from "@/components/casa/Casa";
import { enfocarJuego } from "@/components/casa/audio/voz";
import { PORTADA } from "./contenido";
import { BotonMudo } from "./BotonMudo";
import styles from "./portada.module.css";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/**
 * Primera pantalla de la landing: la marca pequeña arriba, la casa jugable grande y al centro dentro de una
 * ventana, y debajo el h1 y la línea de confianza. Dentro de la ventana no hay español: la barra lleva 🔊 y 全屏.
 */
export function Portada() {
  const casa = useRef<ControlCasa>(null);
  const [grande, setGrande] = useState(false);

  // la casa es el único juego de la portada: su canal de audio es el enfocado
  useEffect(() => {
    enfocarJuego("cocina");
    return () => enfocarJuego(null);
  }, []);

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

  return (
    <section className={styles.hero} aria-labelledby="hero-titulo">
      <p className={styles.marca}>{PORTADA.marca}</p>

      <div className={cx(styles.ventana, grande && styles.grande)} data-ventana data-grande={grande || undefined}>
        <div className={styles.barra} data-barra>
          <span className={styles.puntos} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className={styles.relleno} aria-hidden="true" />
          <BotonMudo className={cx(styles.pantalla, styles.mudo)} />
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
          <div className={styles.panel} data-juego="cocina">
            <Casa ref={casa} activo />
          </div>
        </div>
      </div>

      <div className={styles.texto}>
        <h1 id="hero-titulo" className={styles.h1}>
          {PORTADA.h1}
        </h1>
        <p className={styles.subtitulo} data-testid="subtitulo">
          {PORTADA.subtitulo}
        </p>
        <p className={styles.confianza}>{PORTADA.confianza}</p>
      </div>
    </section>
  );
}
