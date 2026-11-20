"use client";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { COLOR_TONO } from "@/lib/tonos";
import { callar } from "../audio/voz";
import { sfx } from "../audio/sonido";
import { FondoCuarto } from "../arte/Capa";
import { apuntar, aspectoDe, encuadrar, transformCSS, type Camara } from "../camara";
import { proyectar } from "../cocina/iso";
import { Vaca } from "../Vaca";
import { Mesa } from "./Mesa";
import { MESA_LIVING, PARADA_VACA } from "./lugares";
import { PALABRAS } from "./palabras";
import cs from "../Casa.module.css";
import styles from "./Living.module.css";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const pct = (n: number) => `${n / 10}%`;

/** La vaca camina hasta la mesa. */
export const PASO_MS = 900;
/** La cámara entra a la mesa; después, la mesa a pantalla completa. */
export const ZOOM_MS = 600;
/** Zoom de la cámara sobre la mesa (en vertical lo amortigua `encuadrar`). */
const ZOOM_MESA = 2.4;

type Fase = "cuarto" | "camina" | "zoom" | "mesa";

/** Donde la vaca espera al entrar: en el piso, adelante y a la derecha de la mesa (u 8.6, v 8.8). */
const VACA_INICIAL = (() => {
  const p = proyectar(8.6, 8.8);
  return { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 };
})();

const CENTRO_MESA = { x: MESA_LIVING.x + MESA_LIVING.w / 2, y: MESA_LIVING.y + MESA_LIVING.h / 2 };
const VER_TODO: Camara = { x: 500, y: 500, s: 1 };
const CAMARA_MESA = apuntar(CENTRO_MESA.x, CENTRO_MESA.y, ZOOM_MESA);

/** Unas pocas palabras chiquitas sobre la mesa (decorativas): posición en % del tablero, color por tono. */
const SOBRE_LA_MESA = [
  { i: 0, x: 22, y: 34 },
  { i: 6, x: 50, y: 22 },
  { i: 12, x: 78, y: 34 },
  { i: 18, x: 32, y: 64 },
  { i: 24, x: 64, y: 62 },
  { i: 30, x: 50, y: 44 },
]
  .filter(({ i }) => PALABRAS[i])
  .map(({ i, x, y }) => {
    const p = PALABRAS[i];
    // un hanzi por ficha (el primero): desde lejos se lee mejor, y cada ficha lleva el color de su tono
    const [hz, , tono] = p.s[0];
    return { id: p.id, hz, color: COLOR_TONO[tono], x, y };
  });

/**
 * El living comedor (客厅): el cuarto, la vaca y la mesa con fichas de colores encima. Tocar la mesa: la vaca
 * camina hasta ella, se sorprende (orejas arriba), la cámara entra y se abre la mesa vista desde arriba.
 */
export function Living({
  abiertas, alAbrir, activo,
}: {
  abiertas: readonly string[];
  alAbrir: (id: string) => void;
  /** false: la pestaña del puzzle está a la vista; se sale de la mesa y no queda nada sonando. */
  activo: boolean;
}) {
  const [fase, setFase] = useState<Fase>("cuarto");
  const [vaca, setVaca] = useState(VACA_INICIAL);
  const tiempos = useRef<ReturnType<typeof setTimeout>[]>([]);
  const limpiar = () => {
    tiempos.current.forEach(clearTimeout);
    tiempos.current = [];
  };
  useEffect(() => limpiar, []);

  // Tamaño real del escenario (en celular vertical deja de ser cuadrado), como en la cocina.
  const raiz = useRef<HTMLDivElement>(null);
  const [tam, setTam] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const medir = () => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return; // oculta (display none): se ignora
      setTam((t) => (t.w === r.width && t.h === r.height ? t : { w: r.width, h: r.height }));
    };
    medir();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // la transición de la cámara se enciende un cuadro después de la primera medida (sin animar el encuadre vertical)
  const [medido, setMedido] = useState(false);
  useEffect(() => {
    if (medido || tam.w === 0) return;
    const id = requestAnimationFrame(() => setMedido(true));
    return () => cancelAnimationFrame(id);
  }, [medido, tam.w]);

  const aspecto = aspectoDe(tam.w, tam.h);
  const entra = fase === "zoom" || fase === "mesa";
  const vista = encuadrar(entra ? CAMARA_MESA : VER_TODO, tam.w, tam.h);

  const irALaMesa = () => {
    if (fase !== "cuarto") return;
    sfx("pop", "cocina");
    setVaca(PARADA_VACA);
    setFase("camina");
    tiempos.current.push(
      setTimeout(() => {
        sfx("whoosh", "cocina");
        setFase("zoom");
      }, PASO_MS),
      setTimeout(() => setFase("mesa"), PASO_MS + ZOOM_MS),
    );
  };

  const volver = () => {
    limpiar();
    setFase("cuarto");
  };

  // pestaña oculta: se sale de la mesa (o de la caminata) y se calla la voz
  useEffect(() => {
    if (activo || fase === "cuarto") return;
    limpiar();
    callar();
    setFase("cuarto");
  }, [activo, fase]);

  const estiloVaca: CSSProperties = {
    left: pct(vaca.x),
    top: pct(vaca.y),
    transition: `left ${PASO_MS}ms ease-in-out, top ${PASO_MS}ms ease-in-out`,
  };
  const llego = fase === "zoom" || fase === "mesa";

  return (
    <div ref={raiz} className={styles.living} data-living data-fase={fase}>
      <div
        data-mundo
        className={cs.mundo}
        style={{
          transform: transformCSS(vista, aspecto),
          transition: medido ? `transform ${ZOOM_MS}ms cubic-bezier(0.45, 0.05, 0.25, 1)` : "none",
        }}
      >
        <FondoCuarto cuarto="living" />

        <button
          type="button"
          data-mesa
          aria-label="桌子"
          className={styles.zonaMesa}
          style={{ left: pct(MESA_LIVING.x), top: pct(MESA_LIVING.y), width: pct(MESA_LIVING.w), height: pct(MESA_LIVING.h) }}
          onClick={irALaMesa}
        >
          <svg
            data-hanzi-mesa
            aria-hidden="true"
            className={styles.sobreMesa}
            viewBox={`0 0 ${MESA_LIVING.w} ${MESA_LIVING.h}`}
          >
            {SOBRE_LA_MESA.map((f, k) => {
              const x = (f.x / 100) * MESA_LIVING.w;
              const y = (f.y / 100) * MESA_LIVING.h;
              return (
                <g key={f.id} className={styles.fichaChica} style={{ animationDelay: `${-k * 0.9}s` }}>
                  <rect x={x - 17} y={y - 15} width={34} height={30} rx={7} className={styles.fichaFondo} />
                  <text data-hz x={x} y={y + 1} fill={f.color} className={styles.fichaHz}>
                    {f.hz}
                  </text>
                </g>
              );
            })}
          </svg>
        </button>

        <div data-vaca role="img" aria-label="牛" className={cx(cs.vaca, styles.vaca)} style={estiloVaca}>
          <div className={cs.sombra} />
          <Vaca ojos={llego ? "sorpresa" : "abiertos"} hocico="punto" orejas={llego ? "arriba" : "normales"} salta={fase === "zoom"} />
        </div>
      </div>

      {fase === "mesa" && <Mesa abiertas={abiertas} alAbrir={alAbrir} alCerrar={volver} />}
    </div>
  );
}
