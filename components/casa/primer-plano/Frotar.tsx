import type { CSSProperties } from "react";
import { DibujoObjeto } from "../arte/DibujoObjeto";
import type { ObjetoId } from "../cocina/datos";
import styles from "./PrimerPlano.module.css";

export type Burbuja = { k: number; u: number; v: number; s: number };

/** 洗: la capa `mugre` se desvanece con el avance (variable CSS `--limpio`); la espuma sigue al dedo. */
export function Frotar({
  id, estado, limpio, espuma, fin,
}: { id: ObjetoId; estado: string; limpio: number; espuma: Burbuja[]; fin: boolean }) {
  return (
    <div className={styles.pieza} style={{ "--limpio": limpio } as CSSProperties}>
      <DibujoObjeto id={id} estado={estado} claseCapa={(n) => (n === "mugre" ? styles.mugre : "")} />
      {espuma.map((b) => (
        <div
          key={b.k}
          className={styles.espuma}
          style={{ width: `${b.s}%`, height: `${b.s}%`, left: `${b.u * 100 - b.s / 2}%`, top: `${b.v * 100 - b.s / 2}%`, opacity: fin ? 0 : 1 }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
