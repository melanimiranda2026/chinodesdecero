"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { textoHanzi } from "@/lib/silabas";
import { COLOR_TONO } from "@/lib/tonos";
import { callar, decir } from "../audio/voz";
import { ARTE_MESA } from "../arte/registro";
import { Capa, VISTA_CUARTO } from "../arte/Capa";
import { Ficha } from "./Ficha";
import { PALABRAS, srcPalabra, type Palabra } from "./palabras";
import pp from "../primer-plano/PrimerPlano.module.css";
import styles from "./Living.module.css";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/**
 * Desfase fijo por índice (px y s), igual en cada render: la cuadrícula se ve "suelta" sin `Math.random`.
 * Deriva: cada ficha empieza su vaivén en un punto distinto (retraso negativo).
 */
const desfase = (i: number): CSSProperties =>
  ({
    "--ox": `${((i * 37) % 9) - 4}px`,
    "--oy": `${((i * 53) % 11) - 5}px`,
    "--giro": `${((i * 29) % 7) - 3}deg`,
    "--retraso": `${-((i * 1.7) % 6).toFixed(2)}s`,
  }) as CSSProperties;

/**
 * La mesa del living vista desde arriba, a pantalla completa (mismo contenedor e iris que el refri):
 * las 50 palabras flotan sobre la madera. Tocar una: la vaca la dice (lenta y luego natural) y se abre su ficha.
 */
export function Mesa({
  abiertas, alAbrir, alCerrar,
}: {
  /** Ids de las palabras ya abiertas (marcadas y contadas en ⭐). */
  abiertas: readonly string[];
  /** Se tocó una palabra: guardarla como abierta. */
  alAbrir: (id: string) => void;
  /** ←: volver al living. */
  alCerrar: () => void;
}) {
  const [ficha, setFicha] = useState<Palabra | null>(null);
  const [hablando, setHablando] = useState(false);
  /** Cada secuencia lleva su número: si se tocó otra palabra, la vieja no sigue. */
  const turno = useRef(0);
  const suena = useRef(false);
  /** Cuenta las tomas dichas (lenta, natural, cada 🔊): la línea de tono se vuelve a dibujar en cada una. */
  const [toma, setToma] = useState(0);
  /** La palabra que abrió la ficha: al cerrarla, el foco vuelve ahí. */
  const origen = useRef<HTMLElement | null>(null);

  const vista = new Set(abiertas);
  const cuenta = PALABRAS.filter((p) => vista.has(p.id)).length;

  const parar = () => {
    turno.current++;
    if (suena.current) callar();
    suena.current = false;
    setHablando(false);
  };

  // al salir de la mesa no queda nada sonando
  useEffect(
    () => () => {
      turno.current++;
      if (suena.current) callar();
    },
    [],
  );

  const sonar = async (p: Palabra) => {
    parar();
    const mio = turno.current;
    const sigue = () => turno.current === mio;
    suena.current = true;
    setHablando(true);
    if (p.lento) {
      setToma((n) => n + 1);
      await decir(p.s, { src: srcPalabra(p, true), juego: "cocina" });
      if (!sigue()) return;
    }
    setToma((n) => n + 1);
    await decir(p.s, { src: srcPalabra(p), juego: "cocina" });
    if (!sigue()) return;
    suena.current = false;
    setHablando(false);
  };

  const tocar = (p: Palabra, el: HTMLElement) => {
    origen.current = el;
    setFicha(p);
    alAbrir(p.id);
    void sonar(p);
  };

  const cerrarFicha = () => {
    parar();
    setFicha(null);
    origen.current?.focus({ preventScroll: true });
  };

  return (
    <div data-testid="mesa" data-fondo="mesa-living" className={cx(pp.pp, styles.mesa)}>
      <button type="button" className={pp.cerrar} aria-label="返回" onClick={alCerrar}>
        <span aria-hidden="true">←</span>
      </button>
      <div className={styles.contador} data-contador>
        ⭐ {cuenta}/{PALABRAS.length}
      </div>

      <div className={styles.tablero}>
        <Capa capa={ARTE_MESA} vista={VISTA_CUARTO} nombre="mesa_arriba" />
        <div className={styles.rejilla}>
          {PALABRAS.map((p, i) => {
            const hz = textoHanzi(p.s);
            const abierta = vista.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                data-palabra={p.id}
                data-abierta={abierta ? "true" : undefined}
                aria-label={hz}
                className={styles.teja}
                style={desfase(i)}
                onClick={(e) => tocar(p, e.currentTarget)}
              >
                <span className={styles.tejaHz} data-largo={[...hz].length}>{hz}</span>
                <span className={styles.tejaPy}>
                  {p.s.map(([, py, t], j) => (
                    <span key={j} style={{ color: COLOR_TONO[t] }}>
                      {py}
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {ficha && <Ficha palabra={ficha} hablando={hablando} toma={toma} alRepetir={() => void sonar(ficha)} alCerrar={cerrarFicha} />}
    </div>
  );
}
