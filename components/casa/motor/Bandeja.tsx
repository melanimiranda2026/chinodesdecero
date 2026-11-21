import { textoHanzi, type Silaba } from "@/lib/silabas";
import { COLOR_TONO } from "@/lib/tonos";
import styles from "./Motor.module.css";

/** Fila al pie: cada ficha ganada con su hanzi; las que faltan, como silueta. Decorativa, sin toques. */
export function Bandeja({ fichas, todas }: { fichas: string[]; todas: { id: string; silabas: Silaba[] }[] }) {
  return (
    <div className={styles.bandeja} data-bandeja>
      {todas.map(({ id, silabas }) => {
        if (!fichas.includes(id)) {
          return <span key={id} className={`${styles.ficha} ${styles.mini} ${styles.silueta}`} data-silueta aria-hidden="true" />;
        }
        const hz = textoHanzi(silabas);
        return (
          <span key={id} className={`${styles.ficha} ${styles.mini}`} role="img" aria-label={hz}>
            <span className={styles.cara}>
              <span className={styles.hz} data-largo={[...hz].length} data-hanzi>
                {silabas.map(([h, , tono], i) => (
                  <span key={i} style={{ color: COLOR_TONO[tono] }}>{h}</span>
                ))}
              </span>
            </span>
          </span>
        );
      })}
    </div>
  );
}
