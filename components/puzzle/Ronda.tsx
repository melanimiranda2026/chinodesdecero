"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as PE } from "react";
import { callar, decir } from "@/components/casa/audio/voz";
import { sfx } from "@/components/casa/audio/sonido";
import { Vaca } from "@/components/casa/Vaca";
import { COLOR_TONO } from "@/lib/tonos";
import type { Etapa, Frase } from "./datos";
import { Escena, type CaraVaca } from "./Escena";
import { Flecha, Parlante } from "./Dibujos";
import { cabe, completa, desordenar, primerLibre, type Fila } from "./logica";
import { FormaPieza } from "./FormaPieza";
import { CaraPieza, estiloPieza, nombrePieza } from "./Pieza";
import styles from "./Puzzle.module.css";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const espera = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const CARA_BASE: CaraVaca = { ojos: "abiertos", hocico: "sonrisa", orejas: "normales" };
const UMBRAL_ARRASTRE = 6;

export interface PropsRonda {
  frase: Frase;
  etapa: Etapa;
  /** Detiene las piezas (sin vasos: el panel queda encima). */
  pausada: boolean;
  onError: () => void;
  onCompleta: () => void;
  onSiguiente: () => void;
  /** Avance del nivel: frase actual (desde 0) y total. */
  numero: number;
  total: number;
  azar?: () => number;
}

type Arrastre = { pieza: number; el: HTMLElement; x0: number; y0: number; movio: boolean; id: number };

export function Ronda({ frase, etapa, pausada, onError, onCompleta, onSiguiente, numero, total, azar }: PropsRonda) {
  const n = frase.piezas.length;
  const orden = useMemo(() => desordenar(n, azar), [frase.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [fila, setFila] = useState<Fila>(() => Array(n).fill(null));
  const [rebota, setRebota] = useState<number | null>(null);
  const [sobre, setSobre] = useState<number | null>(null);
  const [cara, setCara] = useState<CaraVaca>(CARA_BASE);
  const [fase, setFase] = useState<"armando" | "diciendo" | "lista">("armando");
  const [responde, setResponde] = useState(false);
  const [hablando, setHablando] = useState(false);

  const huecos = useRef<(HTMLDivElement | null)[]>([]);
  const arrastre = useRef<Arrastre | null>(null);
  const recienArrastro = useRef(false);
  const vivo = useRef(true);
  const filaRef = useRef(fila);
  filaRef.current = fila;

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
      callar();
    };
  }, []);

  const boca = useCallback((a: number) => {
    if (!vivo.current) return;
    setCara((c) => ({ ...c, hocico: a > 0.22 ? "abierta" : "sonrisa" }));
  }, []);

  const hablar = useCallback(
    async (audio: string) => {
      setHablando(true);
      await decir([], { src: `/audio/puzzle/${audio}.mp3`, alBoca: boca });
      if (vivo.current) setHablando(false);
    },
    [boca],
  );

  // Etapas 2 y 3: la vaca dice la frase al empezar (es la pista principal: sonido primero).
  useEffect(() => {
    if (etapa === 1) return;
    const t = setTimeout(() => void hablar(frase.audio), 450);
    return () => clearTimeout(t);
  }, [frase.id, etapa, hablar, frase.audio]);

  const terminar = useCallback(async () => {
    setFase("diciendo");
    sfx("ding");
    await espera(380);
    if (!vivo.current) return;
    setCara({ ojos: "felices", hocico: "sonrisa", orejas: "arriba", salta: true });
    await hablar(frase.audio);
    if (!vivo.current) return;
    if (frase.respuesta) {
      await espera(250);
      if (!vivo.current) return;
      setResponde(true);
      await decir([], { src: `/audio/puzzle/${frase.respuesta.audio}.mp3`, alBoca: boca });
      if (!vivo.current) return;
    }
    setCara({ ojos: "felices", hocico: "sonrisa", orejas: "arriba" });
    setFase("lista");
    onCompleta();
  }, [frase, hablar, boca, onCompleta]);

  /** Intenta poner la pieza en el hueco. true si encajó. */
  const intentar = useCallback(
    (hueco: number, pieza: number): boolean => {
      const actual = filaRef.current;
      if (hueco < 0 || !cabe(frase, actual, hueco, pieza)) {
        sfx("boing");
        setRebota(pieza);
        setCara((c) => ({ ...c, ojos: "sorpresa", orejas: "normales", salta: false }));
        setTimeout(() => vivo.current && setCara((c) => ({ ...c, ojos: "abiertos" })), 700);
        setTimeout(() => vivo.current && setRebota((r) => (r === pieza ? null : r)), 420);
        onError();
        return false;
      }
      const nueva = actual.slice();
      nueva[hueco] = pieza;
      filaRef.current = nueva;
      setFila(nueva);
      sfx("pop");
      if (completa(nueva)) void terminar();
      return true;
    },
    [frase, onError, terminar],
  );

  const huecoBajo = (x: number, y: number): number | null => {
    let mejor: number | null = null;
    let dist = Infinity;
    huecos.current.forEach((el, i) => {
      if (!el || filaRef.current[i] !== null) return;
      const r = el.getBoundingClientRect();
      const margen = 18;
      if (x < r.left - margen || x > r.right + margen || y < r.top - margen * 2 || y > r.bottom + margen * 2) return;
      const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
      if (d < dist) {
        dist = d;
        mejor = i;
      }
    });
    return mejor;
  };

  const volver = (el: HTMLElement) => {
    el.style.transition = "transform 260ms cubic-bezier(0.23, 1, 0.32, 1)";
    el.style.transform = "";
    el.classList.remove(styles.levantada);
    setTimeout(() => {
      el.style.transition = "";
    }, 280);
  };

  const bloqueada = pausada || fase !== "armando";

  const alBajar = (e: PE<HTMLButtonElement>, pieza: number) => {
    if (bloqueada || arrastre.current || e.button > 0) return; // un solo dedo a la vez
    const el = e.currentTarget;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* jsdom */
    }
    arrastre.current = { pieza, el, x0: e.clientX, y0: e.clientY, movio: false, id: e.pointerId };
  };

  const alMover = (e: PE<HTMLButtonElement>) => {
    const a = arrastre.current;
    if (!a || a.id !== e.pointerId) return;
    const dx = e.clientX - a.x0;
    const dy = e.clientY - a.y0;
    if (!a.movio && Math.hypot(dx, dy) < UMBRAL_ARRASTRE) return;
    if (!a.movio) {
      a.movio = true;
      a.el.classList.add(styles.levantada);
    }
    a.el.style.transform = `translate(${dx}px, ${dy}px) scale(1.06) rotate(-2deg)`;
    const h = huecoBajo(e.clientX, e.clientY);
    setSobre((s) => (s === h ? s : h));
  };

  const alSoltar = (e: PE<HTMLButtonElement>) => {
    const a = arrastre.current;
    if (!a || a.id !== e.pointerId) return;
    arrastre.current = null;
    setSobre(null);
    if (!a.movio) return; // fue un toque: lo resuelve onClick
    recienArrastro.current = true;
    setTimeout(() => (recienArrastro.current = false), 0);
    const h = huecoBajo(e.clientX, e.clientY);
    if (h === null) return volver(a.el); // soltó lejos de la fila: vuelve sin costo
    const ok = intentar(h, a.pieza);
    if (!ok) volver(a.el);
    else {
      a.el.style.transform = "";
      a.el.classList.remove(styles.levantada);
    }
  };

  const alCancelar = () => {
    const a = arrastre.current;
    arrastre.current = null;
    setSobre(null);
    if (a) volver(a.el);
  };

  const alTocar = (pieza: number) => {
    if (bloqueada || recienArrastro.current) return;
    intentar(primerLibre(filaRef.current), pieza);
  };

  const enFila = new Set(fila.filter((p): p is number => p !== null));
  const armada = fase !== "armando";
  const mostrarEspanol = armada && etapa === 2; // en la etapa 1 la frase en español ya está arriba

  return (
    <div className={styles.ronda} data-fase={fase}>
      <ol className={styles.progreso} aria-label={`${numero + 1} / ${total}`}>
        {Array.from({ length: total }, (_, i) => (
          <li key={i} className={cx(i < numero && styles.hecha, i === numero && styles.actual)} />
        ))}
      </ol>

      <div className={styles.pista}>
        {etapa === 1 ? (
          <div className={styles.pistaTexto}>
            <div className={styles.vacaChica}>
              <Vaca ojos={cara.ojos} hocico={cara.hocico} orejas={cara.orejas} salta={cara.salta} />
            </div>
            <p className={styles.bocadillo}>
              <span className={styles.bocadilloEtiqueta}>Arma en chino</span>
              <span className={styles.bocadilloFrase}>«{frase.espanol}»</span>
            </p>
          </div>
        ) : (
          <div className={styles.pistaEscena}>
            <Escena escena={frase.escena} cara={cara} />
            <button
              type="button"
              className={cx(styles.botonIcono, styles.escuchar, hablando && styles.sonando)}
              onClick={() => void hablar(frase.audio)}
              disabled={hablando}
              aria-label="Escuchar otra vez"
            >
              <Parlante className={styles.icono} />
            </button>
          </div>
        )}
        {responde && frase.respuesta && (
          <div className={styles.respuesta} role="status" lang="zh">
            {frase.respuesta.silabas.map(([hz, py, t], i) => (
              <span key={i} className={styles.sil}>
                <span className={styles.py} style={{ color: COLOR_TONO[t] }}>
                  {py}
                </span>
                <span className={styles.hz}>{hz}</span>
              </span>
            ))}
            {etapa < 3 && <span className={styles.respuestaEs}>{frase.respuesta.espanol}</span>}
          </div>
        )}
      </div>

      <div className={cx(styles.fila, armada && styles.filaArmada)} data-testid="fila">
        {fila.map((p, i) => (
          <div
            key={i}
            ref={(el) => {
              huecos.current[i] = el;
            }}
            className={cx(styles.hueco, sobre === i && styles.huecoSobre, p !== null && styles.huecoLleno)}
            data-hueco={i}
            style={{ animationDelay: armada ? `${i * 60}ms` : undefined }}
          >
            {p === null && <FormaPieza hueco />}
            {p !== null && (
              <div className={cx(styles.pieza, styles.encajada, frase.piezas[p].pregunta && styles.esPregunta)} style={estiloPieza(frase.piezas[p])}>
                <CaraPieza pieza={frase.piezas[p]} etapa={etapa} />
              </div>
            )}
          </div>
        ))}
      </div>

      <p className={cx(styles.traduccion, mostrarEspanol && styles.traduccionVisible)} aria-live="polite">
        {mostrarEspanol ? frase.espanol : " "}
      </p>

      <div className={styles.bandeja} aria-label="Piezas">
        {orden.map((p) =>
          enFila.has(p) ? (
            <span key={p} className={cx(styles.pieza, styles.huella)} style={estiloPieza(frase.piezas[p])} aria-hidden="true">
              <CaraPieza pieza={frase.piezas[p]} etapa={etapa} />
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={cx(styles.pieza, styles.suelta, rebota === p && styles.rebota, frase.piezas[p].pregunta && styles.esPregunta)}
              style={estiloPieza(frase.piezas[p])}
              onPointerDown={(e) => alBajar(e, p)}
              onPointerMove={alMover}
              onPointerUp={alSoltar}
              onPointerCancel={alCancelar}
              onClick={() => alTocar(p)}
              disabled={bloqueada}
              aria-label={nombrePieza(frase.piezas[p])}
              data-pieza={p}
            >
              <CaraPieza pieza={frase.piezas[p]} etapa={etapa} />
            </button>
          ),
        )}
      </div>

      <div className={styles.pie}>
        {fase === "lista" && (
          <button type="button" className={cx(styles.botonGrande, styles.aparece)} onClick={onSiguiente} aria-label="Siguiente" autoFocus>
            <Flecha className={styles.icono} />
          </button>
        )}
      </div>
    </div>
  );
}
