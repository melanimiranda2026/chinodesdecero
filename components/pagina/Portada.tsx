"use client";
import { useEffect, useRef, useState } from "react";
import { Casa, type ControlCasa } from "@/components/casa/Casa";
import { callar } from "@/components/casa/audio/voz";
import { Puzzle } from "@/components/puzzle/Puzzle";
import { CLAVE_JUEGO, EVENTO_JUEGO, juegoInicial, type Juego } from "./juego";
import { PORTADA } from "./contenido";
import styles from "./portada.module.css";

const PESTAÑAS: { id: Juego; icono: string; hanzi: string; pinyin: string }[] = [
  { id: "cocina", icono: "🍳", hanzi: "厨房", pinyin: "chú fáng" },
  { id: "puzzle", icono: "🧩", hanzi: "拼图", pinyin: "pīn tú" },
];

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/**
 * Primera pantalla de la landing: el texto de venta y, al lado (o abajo en celular), la casa jugable
 * dentro de una ventana. Dentro de la ventana no hay español: la barra lleva 🍳 厨房 y el botón 全屏.
 */
export function Portada() {
  const casa = useRef<ControlCasa>(null);
  const ventana = useRef<HTMLDivElement>(null);
  const [grande, setGrande] = useState(false);
  const [juego, setJuego] = useState<Juego>("cocina");
  const [puzzleMontado, setPuzzleMontado] = useState(false);

  // pestaña inicial (?juego= o la última guardada) y cambios desde las tarjetas de "Elige tu juego"
  useEffect(() => {
    let guardado: string | null = null;
    try {
      guardado = localStorage.getItem(CLAVE_JUEGO);
    } catch {
      /* sin almacenamiento */
    }
    const inicial = juegoInicial(window.location.search, guardado);
    if (inicial === "puzzle") {
      setPuzzleMontado(true);
      setJuego("puzzle");
    }
    const alCambiar = (e: Event) => {
      const j = (e as CustomEvent<Juego>).detail;
      if (j === "cocina" || j === "puzzle") cambiar(j);
    };
    window.addEventListener(EVENTO_JUEGO, alCambiar);
    return () => window.removeEventListener(EVENTO_JUEGO, alCambiar);
  }, []);

  const cambiar = (j: Juego) => {
    callar();
    if (j === "puzzle") setPuzzleMontado(true);
    setJuego(j);
  };

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

      <div ref={ventana} id="juegos" className={cx(styles.ventana, grande && styles.grande)} data-ventana data-grande={grande || undefined}>
        <div className={styles.barra} data-barra>
          <span className={styles.puntos} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <div className={styles.pestanas} role="tablist">
            {PESTAÑAS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                id={`pestana-${p.id}`}
                aria-selected={juego === p.id}
                aria-controls={`juego-${p.id}`}
                className={cx(styles.pestana, juego === p.id && styles.activa)}
                onClick={() => cambiar(p.id)}
              >
                <span aria-hidden="true">{p.icono}</span> <span lang="zh">{p.hanzi}</span>{" "}
                <span className={styles.py} data-pinyin>
                  {p.pinyin}
                </span>
              </button>
            ))}
          </div>
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
          <div id="juego-cocina" role="tabpanel" aria-labelledby="pestana-cocina" data-juego="cocina" className={styles.panel} hidden={juego !== "cocina"}>
            <Casa ref={casa} />
          </div>
          {puzzleMontado && (
            <div id="juego-puzzle" role="tabpanel" aria-labelledby="pestana-puzzle" data-juego="puzzle" className={cx(styles.panel, styles.panelPuzzle)} hidden={juego !== "puzzle"}>
              <Puzzle ventana />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
