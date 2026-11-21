import type { Silaba } from "@/lib/silabas";
import { COLOR_TONO } from "@/lib/tonos";
import styles from "./Living.module.css";

// Misma línea de tono que los videos (video/src/LineaTono.tsx): niveles 1 (bajo) a 5 (alto), como Chao.
// Cada sílaba es un trazo del color fijo de su tono; mientras la vaca habla se dibuja de izquierda a derecha.

const ALTO = 60;
const PARTE = 80;
const MARGEN = 8;
/** Nivel 5 → 10 % del alto; nivel 1 → 90 %. */
const nivel = (n: number) => (0.1 + ((5 - n) / 4) * 0.8) * ALTO;

/** Puntos [x 0..1 dentro de la sílaba, nivel] del contorno de la sílaba i (el 3.º antes de un neutro no sube). */
export function contorno(s: Silaba[], i: number): [number, number][] {
  const tono = s[i][2];
  const siguiente = s[i + 1]?.[2];
  switch (tono) {
    case 1:
      return [[0, 5], [1, 5]];
    case 2:
      return [[0, 3], [1, 5]];
    case 3:
      return siguiente === 5 ? [[0, 2], [1, 1]] : [[0, 2], [0.45, 1], [1, 4]];
    case 4:
      return [[0, 5], [1, 1]];
    default:
      return [[0, 3], [0.3, 3]];
  }
}

/** Segundos que tarda en dibujarse cada sílaba. */
const POR_SILABA = 0.38;

/** `vez`: número de la toma; al cambiar, la línea se vuelve a dibujar desde el principio. */
export function LineaTono({ s, activa, vez = 0 }: { s: Silaba[]; activa: boolean; vez?: number }) {
  const ancho = MARGEN * 2 + PARTE * s.length;
  return (
    <svg
      // la clave cambia al empezar a hablar y en cada toma (lenta, natural, 🔊): la animación vuelve a empezar
      key={activa ? `habla-${vez}` : "quieta"}
      className={styles.lineaTono}
      data-linea-tono
      data-activa={activa}
      viewBox={`0 ${-MARGEN} ${ancho} ${ALTO + MARGEN * 2}`}
      style={{ maxWidth: `${s.length * 96}px` }}
      aria-hidden="true"
      focusable="false"
    >
      {[1, 5].map((n) => (
        <line key={n} x1={MARGEN} x2={ancho - MARGEN} y1={nivel(n)} y2={nivel(n)} className={styles.guia} />
      ))}
      {s.map((sil, i) => {
        const d = contorno(s, i)
          .map(([x, n], k) => `${k ? "L" : "M"} ${(MARGEN + PARTE * (i + 0.1 + x * 0.8)).toFixed(1)} ${nivel(n).toFixed(1)}`)
          .join(" ");
        return (
          <path
            key={i}
            d={d}
            data-tono={sil[2]}
            stroke={COLOR_TONO[sil[2]]}
            pathLength={1}
            className={styles.trazo}
            style={{ animationDelay: `${i * POR_SILABA}s`, animationDuration: `${POR_SILABA}s` }}
          />
        );
      })}
    </svg>
  );
}
