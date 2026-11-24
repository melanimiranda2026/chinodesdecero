"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Capa, VISTA_CUARTO } from "./arte/Capa";
import { FONDO_CASA } from "./arte/registro";
import { aspectoDe, transformCSS, type Camara } from "./camara";
import { CENTRO_LIVING_EN_CASA, VACA_AFUERA, VACA_EN_PUERTA } from "./casaEntera";
import { useEscenario } from "./useEscenario";
import { Vaca } from "./Vaca";
import styles from "./EntradaCasa.module.css";

/** La vaca camina por el camino hasta la puerta del living. */
export const CAMINATA_MS = 1200;
/** Después, la cámara entra al living. */
export const ZOOM_ENTRADA_MS = 800;
/** Con movimiento reducido no hay caminata ni zoom: solo un fundido. */
export const FUNDIDO_ENTRADA_MS = 300;
/** Lo que dura la entrada completa (con movimiento). */
export const ENTRADA_MS = CAMINATA_MS + ZOOM_ENTRADA_MS;

type Fase = "camina" | "zoom" | "fundido";

const TODA: Camara = { x: 500, y: 500, s: 1 };
const pct = (n: number) => `${n / 10}%`;

function movimientoReducido(): boolean {
  try {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * La primera imagen de la web: la casa entera; la vaca camina hasta la puerta del living y la cámara entra
 * (al mismo encuadre que el cuarto del living). Un toque la salta. Sin texto: la etiqueta es 家.
 */
export function EntradaCasa({ alTerminar }: { alTerminar: () => void }) {
  const [reducido] = useState(movimientoReducido);
  const [fase, setFase] = useState<Fase>(reducido ? "fundido" : "camina");
  const { ref, tam } = useEscenario<HTMLButtonElement>();
  const aspecto = aspectoDe(tam.w, tam.h);

  const fin = useRef(alTerminar);
  useEffect(() => {
    fin.current = alTerminar;
  });
  const hecho = useRef(false);
  const terminar = useCallback(() => {
    if (hecho.current) return;
    hecho.current = true;
    fin.current();
  }, []);

  useEffect(() => {
    if (reducido) {
      const t = setTimeout(terminar, FUNDIDO_ENTRADA_MS);
      return () => clearTimeout(t);
    }
    const t1 = setTimeout(() => setFase("zoom"), CAMINATA_MS);
    const t2 = setTimeout(terminar, ENTRADA_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reducido, terminar]);

  // sin zoom la casa entera queda centrada (en vertical, con aire arriba y abajo); el zoom llega al living
  const camara = fase === "zoom" ? CENTRO_LIVING_EN_CASA : TODA;
  const vaca = {
    "--x0": pct(VACA_AFUERA.x),
    "--y0": pct(VACA_AFUERA.y),
    left: pct(VACA_EN_PUERTA.x),
    top: pct(VACA_EN_PUERTA.y),
  } as CSSProperties;

  return (
    <button
      ref={ref}
      type="button"
      data-entrada
      data-fase={fase}
      aria-label="家"
      className={styles.entrada}
      style={{ "--zoom-ms": `${ZOOM_ENTRADA_MS}ms`, "--camina-ms": `${CAMINATA_MS}ms`, "--fundido-ms": `${FUNDIDO_ENTRADA_MS}ms` } as CSSProperties}
      onClick={terminar}
    >
      <span className={styles.mundo} style={{ transform: transformCSS(camara, aspecto) }}>
        <Capa capa={FONDO_CASA} vista={VISTA_CUARTO} nombre="casa_entera" />
        <span data-vaca className={styles.vaca} style={vaca}>
          <span className={styles.sombra} />
          <Vaca ojos="abiertos" hocico="sonrisa" orejas="normales" />
        </span>
      </span>
    </button>
  );
}
