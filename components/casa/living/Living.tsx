"use client";
import { memo, useEffect, useRef, useState, type Ref } from "react";
import { COLOR_TONO } from "@/lib/tonos";
import { callar } from "../audio/voz";
import { sfx } from "../audio/sonido";
import { apuntar } from "../camara";
import { CuartoMotor, type ControlCuarto } from "../motor/CuartoMotor";
import type { ProgresoCuarto } from "../motor/tipos";
import type { AlEvento } from "../useCasa";
import { LIVING } from "./cuarto";
import { Mesa } from "./Mesa";
import { MESA_LIVING } from "./lugares";
import { PALABRAS } from "./palabras";
import styles from "./Living.module.css";

const pct = (n: number) => `${n / 10}%`;

/** La vaca camina hasta la mesa (la caminata la hace el motor, después de decir 这是桌子). */
export { PASO_MS } from "../motor/useCuarto";
/** La cámara entra a la mesa; después, la mesa a pantalla completa. */
export const ZOOM_MS = 600;
/** Zoom de la cámara sobre la mesa (en vertical lo amortigua `encuadrar`). */
const ZOOM_MESA = 2.4;

type Fase = "cuarto" | "zoom" | "mesa";

const CENTRO_MESA = { x: MESA_LIVING.x + MESA_LIVING.w / 2, y: MESA_LIVING.y + MESA_LIVING.h / 2 };
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

/** Las fichas de colores sobre el tablero: dentro del mundo, bajo la zona de toque del 桌子. */
const DECORADO = (
  <svg
    data-hanzi-mesa
    aria-hidden="true"
    className={styles.sobreMesa}
    style={{ left: pct(MESA_LIVING.x), top: pct(MESA_LIVING.y), width: pct(MESA_LIVING.w), height: pct(MESA_LIVING.h) }}
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
);

/**
 * El living comedor (客厅), armado por el motor desde `LIVING`: sofá, silla, tele y la mesa. Tocar la mesa: la
 * vaca dice 这是桌子 y camina hasta ella (el motor); aquí se sorprende, la cámara entra y se abre la mesa vista
 * desde arriba. Abrir una palabra en la mesa no cuenta como ficha ganada.
 */
export const Living = memo(function Living({
  abiertas, alAbrir, activo, progreso, alCambiar, alEvento, alSalir, ref,
}: {
  abiertas: readonly string[];
  /** Se tocó una palabra en la mesa (también una ya abierta). */
  alAbrir: (id: string) => void;
  /** false: la pestaña del navegador está oculta; se sale de la mesa y no queda nada sonando. */
  activo: boolean;
  /** Progreso guardado del cuarto (objeto estable: el motor lo vuelve a leer cuando cambia). */
  progreso: ProgresoCuarto;
  alCambiar: (p: ProgresoCuarto, nuevas: string[]) => void;
  alEvento?: AlEvento;
  /** Tocar la puerta con el cuarto completo. */
  alSalir: () => void;
  /** La puerta, para el 厨房 cerrado del minimapa. */
  ref?: Ref<ControlCuarto>;
}) {
  const [fase, setFase] = useState<Fase>("cuarto");
  const faseRef = useRef<Fase>("cuarto");
  const cambiarFase = (f: Fase) => {
    faseRef.current = f;
    setFase(f);
  };
  const tiempos = useRef<ReturnType<typeof setTimeout>[]>([]);
  const limpiar = () => {
    tiempos.current.forEach(clearTimeout);
    tiempos.current = [];
  };
  useEffect(() => limpiar, []);

  /** El motor ya dijo 这是桌子 y la vaca llegó a la mesa: zoom y luego la mesa a pantalla completa. */
  const entrarALaMesa = () => {
    if (faseRef.current !== "cuarto") return;
    sfx("whoosh", "cocina"); // el nombre ya terminó: nunca encima del mandarín
    cambiarFase("zoom");
    tiempos.current.push(setTimeout(() => cambiarFase("mesa"), ZOOM_MS));
  };

  const raiz = useRef<HTMLDivElement>(null);
  const volver = () => {
    limpiar();
    cambiarFase("cuarto");
    // el foco vuelve al 桌子 (la mesa a pantalla completa se va)
    raiz.current?.querySelector<HTMLElement>('[data-objeto="zhuozi"]')?.focus({ preventScroll: true });
  };

  // pestaña oculta: se sale de la mesa (o del zoom) y se calla la voz
  useEffect(() => {
    if (activo || fase === "cuarto") return;
    limpiar();
    callar();
    cambiarFase("cuarto");
  }, [activo, fase]);

  const entra = fase !== "cuarto";

  return (
    <div ref={raiz} className={styles.living} data-living data-fase={fase}>
      <CuartoMotor
        def={LIVING}
        progreso={progreso}
        activo={activo}
        alCambiar={alCambiar}
        alEvento={alEvento}
        alSalir={alSalir}
        alAbrir={entrarALaMesa}
        ref={ref}
        camara={entra ? CAMARA_MESA : undefined}
        sorpresa={entra}
        decorado={DECORADO}
        hijos={
          fase === "mesa" ? (
            <Mesa abiertas={abiertas} alAbrir={alAbrir} alCerrar={volver} />
          ) : (
            // durante el zoom nada más se toca
            fase === "zoom" && <div className={styles.bloqueo} aria-hidden="true" />
          )
        }
      />
    </div>
  );
});
