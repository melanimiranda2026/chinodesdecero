import type { CSSProperties } from "react";
import { COLOR_TONO } from "@/lib/tonos";
import { textoHanzi } from "@/lib/silabas";
import { ROLES, type Etapa, type Pieza as DatosPieza } from "./datos";
import { FormaPieza } from "./FormaPieza";
import styles from "./Puzzle.module.css";

/** Contenido de una pieza: pinyin con color de tono sobre cada hanzi; rol y glosa según la etapa. */
export function CaraPieza({ pieza, etapa }: { pieza: DatosPieza; etapa: Etapa }) {
  return (
    <>
      <FormaPieza />
      <span className={styles.silabas} lang="zh">
        {pieza.silabas.map(([hz, py, t], i) => (
          <span key={i} className={styles.sil}>
            <span className={styles.py} style={{ color: COLOR_TONO[t] }} data-pinyin>
              {py}
            </span>
            <span className={styles.hz}>{hz}</span>
          </span>
        ))}
      </span>
      {etapa < 3 && (
        <span className={styles.rol} data-rol>
          {pieza.pregunta ? `¿${ROLES[pieza.rol].etiqueta}?` : ROLES[pieza.rol].etiqueta}
        </span>
      )}
      {etapa === 1 && !pieza.pregunta && pieza.rol !== "ma" && (
        <span className={styles.glosa} data-glosa>
          {pieza.glosa}
        </span>
      )}
    </>
  );
}

export const estiloPieza = (pieza: DatosPieza): CSSProperties =>
  ({ "--fondo": pieza.pregunta ? "#ffffff" : ROLES[pieza.rol].fondo } as CSSProperties);

export const nombrePieza = (pieza: DatosPieza) => `${textoHanzi(pieza.silabas)} ${pieza.silabas.map((s) => s[1]).join(" ")}`;
