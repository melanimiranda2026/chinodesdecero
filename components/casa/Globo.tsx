import type { Silaba } from "@/lib/silabas";
import { textoHanzi } from "@/lib/silabas";
import { COLOR_TONO } from "@/lib/tonos";
import styles from "./Casa.module.css";

/** Globo de la vaca: cada sílaba con su pinyin (color de tono) encima del hanzi. Vive en coordenadas de pantalla (%). */
export function Globo({ silabas, x, y }: { silabas: Silaba[]; x: number; y: number }) {
  return (
    <div
      className={styles.globo}
      style={{ left: `${x}%`, top: `${y}%` }}
      data-testid="globo"
      role="status"
      aria-label={textoHanzi(silabas)}
    >
      <div className={styles.linea}>
        {silabas.map(([hz, py, t], i) => (
          <div key={i} className={styles.sil}>
            <span className={styles.py} style={{ color: COLOR_TONO[t] }} data-pinyin>
              {py}
            </span>
            <span className={styles.hz} data-texto>
              {hz}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
