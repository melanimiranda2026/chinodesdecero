"use client";
import Link from "next/link";
import { registrar } from "@/components/casa/eventos";
import { CaraPieza, estiloPieza } from "@/components/puzzle/Pieza";
import { TEMAS } from "@/components/puzzle/datos";
import puzzle from "@/components/puzzle/Puzzle.module.css";
import { Adorno } from "./Adorno";
import { MINIJUEGOS } from "./contenido";
import styles from "./pagina.module.css";

const MUESTRA = TEMAS[0].frases[0]; // 我 吃 苹果

/** El centro de minijuegos: por ahora la cocina y el puzzle. Agregar un juego es agregar una tarjeta. */
export function Minijuegos() {
  return (
    <section id="minijuegos" className={styles.seccion} aria-labelledby="minijuegos-titulo">
      <div className={styles.encabezado}>
        <h2 id="minijuegos-titulo" className={styles.titulo}>
          {MINIJUEGOS.titulo}
        </h2>
        <p className={styles.bajada}>{MINIJUEGOS.bajada}</p>
      </div>
      <ul className={styles.juegos}>
        <li className={styles.juego}>
          <div className={styles.juegoVista} aria-hidden="true">
            <Adorno dibujo="vaca" tam={88} />
            <Adorno dibujo="beizi" tam={64} />
            <Adorno dibujo="pingguo" tam={56} />
          </div>
          <h3 className={styles.subtitulo}>{MINIJUEGOS.cocina.titulo}</h3>
          <p className={styles.texto}>{MINIJUEGOS.cocina.texto}</p>
          <a href="#cocina" className={styles.boton} onClick={() => registrar("abrir_minijuego", { juego: "cocina" })}>
            {MINIJUEGOS.cocina.boton}
          </a>
        </li>
        <li className={styles.juego}>
          <div className={styles.juegoVista} aria-hidden="true">
            {MUESTRA.piezas.map((p, i) =>
              i === 1 ? (
                <span key={i} className={styles.juegoHueco}>
                  <span className={`${puzzle.pieza} ${puzzle.chica} ${styles.juegoPiezaCae}`} style={estiloPieza(p)}>
                    <CaraPieza pieza={p} etapa={3} />
                  </span>
                </span>
              ) : (
                <span key={i} className={`${puzzle.pieza} ${puzzle.chica}`} style={estiloPieza(p)}>
                  <CaraPieza pieza={p} etapa={3} />
                </span>
              ),
            )}
          </div>
          <h3 className={styles.subtitulo}>{MINIJUEGOS.puzzle.titulo}</h3>
          <p className={styles.texto}>{MINIJUEGOS.puzzle.texto}</p>
          <Link href="/puzzle" className={styles.boton} onClick={() => registrar("abrir_minijuego", { juego: "puzzle" })}>
            {MINIJUEGOS.puzzle.boton}
          </Link>
        </li>
      </ul>
    </section>
  );
}
