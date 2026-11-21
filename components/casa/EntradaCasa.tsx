"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Capa, VISTA_CUARTO } from "./arte/Capa";
import { ARTE_BOTON_PLAY, FONDO_CASA } from "./arte/registro";
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

type Fase = "espera" | "camina" | "zoom" | "fundido";

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
 * La primera imagen de la web: la casa entera, quieta, con la vaca afuera en el camino y el botón Play (dibujado
 * por la dueña en Krita) al centro. Play (o un toque en cualquier parte de la casa) empieza: la vaca camina hasta
 * la puerta del living y la cámara entra (al mismo encuadre que el cuarto del living). Un toque durante la
 * caminata la salta. Sin texto: la etiqueta es 家 y el botón dice 开始.
 *
 * `empezada` la arranca desde afuera (`ControlCasa.entrar()`); `alEmpezar` avisa del toque que la empieza (en la
 * casa el audio se desbloquea en su propio pointerdown/click en captura, así que no hace falta pasarlo).
 */
export function EntradaCasa({
  alTerminar,
  empezada = false,
  alEmpezar,
}: {
  alTerminar: () => void;
  empezada?: boolean;
  alEmpezar?: () => void;
}) {
  const [reducido] = useState(movimientoReducido);
  const [tocada, setTocada] = useState(false);
  const [zoom, setZoom] = useState(false);
  const empezo = empezada || tocada;
  const fase: Fase = !empezo ? "espera" : reducido ? "fundido" : zoom ? "zoom" : "camina";
  const { ref, tam } = useEscenario<HTMLDivElement>();
  const aspecto = aspectoDe(tam.w, tam.h);

  const fin = useRef(alTerminar);
  const aviso = useRef(alEmpezar);
  useEffect(() => {
    fin.current = alTerminar;
    aviso.current = alEmpezar;
  });
  const hecho = useRef(false);
  const terminar = useCallback(() => {
    if (hecho.current) return;
    hecho.current = true;
    fin.current();
  }, []);
  const avisado = useRef(false);
  const empezar = () => {
    setTocada(true);
    if (avisado.current) return;
    avisado.current = true;
    aviso.current?.();
  };

  useEffect(() => {
    if (!empezo) return;
    if (reducido) {
      const t = setTimeout(terminar, FUNDIDO_ENTRADA_MS);
      return () => clearTimeout(t);
    }
    const t1 = setTimeout(() => setZoom(true), CAMINATA_MS);
    const t2 = setTimeout(terminar, ENTRADA_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [empezo, reducido, terminar]);

  // El toque que empieza llega como pointerdown y después click: ese click no salta la entrada recién empezada.
  const tocoParaEmpezar = useRef(false);
  const abajo = () => {
    tocoParaEmpezar.current = !empezo;
    if (!empezo) empezar();
  };
  const click = () => {
    if (tocoParaEmpezar.current) {
      tocoParaEmpezar.current = false;
      return;
    }
    if (!empezo) empezar(); // teclado (Enter/Espacio en Play): click sin pointerdown
    else terminar();
  };

  // sin zoom la casa entera queda centrada (en vertical, con aire arriba y abajo); el zoom llega al living
  const camara = fase === "zoom" ? CENTRO_LIVING_EN_CASA : TODA;
  // esperando (y en el fundido) la vaca está afuera, en el camino; al caminar llega a la puerta
  const enCamino = fase === "camina" || fase === "zoom";
  const parada = enCamino ? VACA_EN_PUERTA : VACA_AFUERA;
  const vaca = {
    "--x0": pct(VACA_AFUERA.x),
    "--y0": pct(VACA_AFUERA.y),
    left: pct(parada.x),
    top: pct(parada.y),
  } as CSSProperties;

  return (
    // un toque en cualquier parte también vale (como Play, o para saltar la caminata); el teclado usa Play
    <div
      ref={ref}
      role="group"
      data-entrada
      data-fase={fase}
      aria-label="家"
      className={styles.entrada}
      style={{ "--zoom-ms": `${ZOOM_ENTRADA_MS}ms`, "--camina-ms": `${CAMINATA_MS}ms`, "--fundido-ms": `${FUNDIDO_ENTRADA_MS}ms` } as CSSProperties}
      onPointerDown={abajo}
      onClick={click}
    >
      <span className={styles.mundo} style={{ transform: transformCSS(camara, aspecto) }}>
        <Capa capa={FONDO_CASA} vista={VISTA_CUARTO} nombre="casa_entera" />
        <span data-vaca className={styles.vaca} style={vaca}>
          <span className={styles.sombra} />
          <Vaca ojos="abiertos" hocico="sonrisa" orejas="normales" />
        </span>
      </span>
      {!empezo && (
        <button type="button" className={styles.play} aria-label="开始" title="kāi shǐ" data-play>
          <span className={styles.respira}>
            {/* eslint-disable-next-line @next/next/no-img-element -- dibujo a mano de 128 px, tal cual */}
            <img src={ARTE_BOTON_PLAY} alt="" width={128} height={128} draggable={false} />
          </span>
        </button>
      )}
    </div>
  );
}
